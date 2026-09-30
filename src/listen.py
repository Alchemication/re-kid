"""Interactive listening pass: one screen per breakdown beat, with sound.

For each beat it shows what happens on screen, the open sound question, and an
ASCII loudness graph with the beat grid, the proposed loop and the strongest
hit. Single keys play the loop or the original stretch, nudge the loop by one
detected beat, approve it, or record what the listener heard.

What the listener types becomes an ``observed`` sound claim in the breakdown
(``observed_by`` the listener). Loop choices go to a ``LoopSet`` file. Both are
saved on every change, so quitting never loses work.

The pure parts (graph, loop nudging, notes) are separate from the terminal loop
so they can be tested without a terminal.

Example:
    rows = render_graph(analysis, 17.0, 19.0, loop=(17.02, 18.6), peak=18.18)
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

from audio import AudioAnalysis, LoopProposal, cut_clip, loop_paths, render_loop
from config import (
    GRAPH_FLOOR_DB,
    GRAPH_MAX_WIDTH,
    GRAPH_RANGE_DB,
    GRAPH_ROWS,
    PLAYERS,
)
from schema.breakdown import Breakdown
from schema.common import Claim, Status
from schema.loops import LoopChoice, LoopSet
from worlds import dump_model

if TYPE_CHECKING:
    from rich.table import Table

BLOCKS = " ▁▂▃▄▅▆▇█"
"""Partial block characters, empty to full, for the graph's columns."""


def render_graph(
    analysis: AudioAnalysis,
    lo: float,
    hi: float,
    loop: tuple[float, float] | None,
    peak: float | None,
    width: int = GRAPH_MAX_WIDTH,
) -> list[str]:
    """Draw loudness over [lo, hi] as text rows, then a marker row and an axis.

    Marker row: ``|`` detected beat, ``▲`` strongest hit, ``[`` ``]`` loop ends,
    ``─`` inside the loop.
    """
    span = hi - lo
    cols = max(width, 10)
    frames = list(zip(analysis.frame_times, analysis.loudness_db, strict=True))
    peaks: list[float | None] = [None] * cols
    for t, db in frames:
        if lo <= t < hi:
            c = min(int((t - lo) / span * cols), cols - 1)
            peaks[c] = db if peaks[c] is None else max(peaks[c], db)
    for c, value in enumerate(peaks):
        if value is None:  # column narrower than the frame hop: use nearest frame
            mid = lo + (c + 0.5) * span / cols
            peaks[c] = (
                min(frames, key=lambda f: abs(f[0] - mid))[1]
                if frames
                else GRAPH_FLOOR_DB
            )
    values = [v if v is not None else GRAPH_FLOOR_DB for v in peaks]
    top = max(values)
    floor = max(GRAPH_FLOOR_DB, top - GRAPH_RANGE_DB)
    levels = [
        0 if db <= floor else round((db - floor) / (top - floor) * GRAPH_ROWS * 8)
        for db in values
    ]
    rows = []
    for r in range(GRAPH_ROWS - 1, -1, -1):
        rows.append("".join(BLOCKS[max(0, min(8, level - r * 8))] for level in levels))

    def col(t: float) -> int | None:
        return min(int((t - lo) / span * cols), cols - 1) if lo <= t <= hi else None

    marks = [" "] * cols
    if loop is not None:
        a, b = col(loop[0]), col(loop[1])
        if a is not None and b is not None:
            for c in range(a + 1, b):
                marks[c] = "─"
    for t in analysis.beat_times:
        c = col(t)
        if c is not None and marks[c] in " ─":
            marks[c] = "|"
    if peak is not None and (c := col(peak)) is not None:
        marks[c] = "▲"
    if loop is not None:
        for t, ch in ((loop[0], "["), (loop[1], "]")):
            if (c := col(t)) is not None:
                marks[c] = ch
    rows.append("".join(marks))

    left, mid, right = f"{lo:.1f}s", f"{(lo + hi) / 2:.1f}s", f"{hi:.1f}s"
    axis = [" "] * cols
    for text, start in (
        (left, 0),
        (mid, cols // 2 - len(mid) // 2),
        (right, cols - len(right)),
    ):
        axis[start : start + len(text)] = text
    rows.append("".join(axis))
    return rows


def initial_loops(
    proposals: list[LoopProposal], breakdown_id: str, source: str
) -> LoopSet:
    """Turn measured proposals into an unapproved LoopSet."""
    return LoopSet(
        breakdown=breakdown_id,
        source=source,
        loops=[
            LoopChoice(
                beat_id=p.beat_id,
                start_s=p.loop_start_s,
                end_s=p.loop_end_s,
                beats=p.loop_beats,
            )
            for p in proposals
            if p.loop_start_s is not None and p.loop_end_s is not None
        ],
    )


def nudge(loop: LoopChoice, grid: list[float], edge: str, step: int) -> LoopChoice:
    """Move one end of a loop by ``step`` detected beats. Stays on the grid,
    keeps at least one beat, and un-approves the loop. Unchanged if blocked."""
    points = sorted(grid)
    if not points:
        return loop

    def index(t: float) -> int:
        return min(range(len(points)), key=lambda i: abs(points[i] - t))

    a, b = index(loop.start_s), index(loop.end_s)
    if edge == "start":
        a += step
    else:
        b += step
    if a < 0 or b >= len(points) or b <= a:
        return loop
    return LoopChoice(
        beat_id=loop.beat_id,
        start_s=points[a],
        end_s=points[b],
        beats=b - a,
        approved=False,
    )


def with_note(
    breakdown: Breakdown, beat_id: str, note: str, observer: str
) -> Breakdown:
    """Return a copy of the breakdown whose beat ``sound`` claim is the note."""
    data = breakdown.model_dump()
    for beat in data["beats"]:
        if beat["id"] == beat_id:
            beat["sound"] = Claim(
                text=note, status=Status.OBSERVED, observed_by=observer
            ).model_dump()
    return Breakdown.model_validate(data)


class Player:
    """Plays one file at a time in the background; a new play stops the last."""

    def __init__(self) -> None:
        self.command = next(
            (list(cmd) for cmd in PLAYERS if shutil.which(cmd[0])), None
        )
        self.proc: subprocess.Popen[bytes] | None = None

    def play(self, path: Path) -> None:
        """Start playing ``path``, stopping whatever was playing."""
        self.stop()
        if self.command is None:
            raise RuntimeError("No audio player found — install ffmpeg (for ffplay).")
        self.proc = subprocess.Popen(
            [*self.command, str(path)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    def stop(self) -> None:
        """Stop playback, if any."""
        if self.proc is not None and self.proc.poll() is None:
            self.proc.terminate()
        self.proc = None


def read_key() -> str:
    """Read one keypress without Enter. Arrow keys come back as 'left'/'right'."""
    import termios
    import tty

    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setcbreak(fd)
        ch = sys.stdin.read(1)
        if ch == "\x1b":
            seq = sys.stdin.read(2)
            return {"[C": "right", "[D": "left", "[A": "up", "[B": "down"}.get(
                seq, "esc"
            )
        return ch
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)


@dataclass
class Session:
    """Everything the interactive loop reads and writes."""

    breakdown: Breakdown
    breakdown_path: Path
    loops: LoopSet
    loops_path: Path
    analysis: AudioAnalysis
    proposals: list[LoopProposal]
    media: Path
    out: Path
    observer: str


KEYS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("play", "play loop ×4", (" ",)),
    ("window", "play whole stretch", ("w",)),
    ("stop", "stop playing", ("s",)),
    ("start-earlier", "loop start 1 beat earlier", ("[",)),
    ("start-later", "loop start 1 beat later", ("]",)),
    ("end-earlier", "loop end 1 beat earlier", ("-",)),
    ("end-later", "loop end 1 beat later", ("=",)),
    ("approve", "approve loop", ("a",)),
    ("note", "note what you hear", ("n",)),
    ("prev", "previous beat", ("left", "up")),
    ("next", "next beat", ("right", "down", "\r", "\n")),
    ("quit", "quit (all saved)", ("q",)),
)
"""(action, label, keys) — the one list both the key handling and the on-screen
help come from, so no key works without being shown."""

KEYMAP = {key: action for action, _, keys in KEYS for key in keys}
"""Key as returned by ``read_key`` → action name."""

KEY_NAMES = {
    " ": "space",
    "left": "←",
    "right": "→",
    "up": "↑",
    "down": "↓",
    "\r": "enter",
    "\n": "enter",
}
"""How special keys are written in the help."""

NEEDS_LOOP = frozenset(
    {"play", "start-earlier", "start-later", "end-earlier", "end-later", "approve"}
)
"""Actions that do nothing on a beat without a loop."""


def key_help() -> list[tuple[str, str]]:
    """(keys as shown, label) for every action, in ``KEYS`` order."""
    rows = []
    for _, label, keys in KEYS:
        shown = list(dict.fromkeys(KEY_NAMES.get(k, k) for k in keys))
        rows.append((" ".join(shown), label))
    return rows


def _help_table(columns: int = 3) -> Table:
    """All shortcuts as a compact rich grid, ``columns`` pairs per row."""
    from rich.table import Table

    grid = Table.grid(padding=(0, 1))
    for _ in range(columns):
        grid.add_column(style="bold cyan", justify="right", no_wrap=True)
        grid.add_column(no_wrap=True)
    rows = key_help()
    for start in range(0, len(rows), columns):
        chunk = rows[start : start + columns]
        cells = [cell for pair in chunk for cell in pair]
        grid.add_row(*cells, *[""] * (2 * columns - len(cells)))
    return grid


def run(session: Session) -> None:
    """The interactive loop. Needs a real terminal."""
    from rich.console import Console
    from rich.markup import escape

    console = Console()
    player = Player()
    beats = session.breakdown.beats
    peaks = {p.beat_id: p.peak_onset_s for p in session.proposals}
    i = 0
    message = ""
    try:
        while True:
            beat = session.breakdown.beats[i]
            loop = next((x for x in session.loops.loops if x.beat_id == beat.id), None)
            console.clear()
            console.print(
                f"[bold]{i + 1}/{len(beats)}  {beat.id}[/bold]  "
                f"[dim]{beat.start_s:.1f}–{beat.end_s:.1f} s[/dim]"
            )
            console.print(f"\n[bold]On screen[/bold]  {escape(beat.action.text)}")
            if beat.on_screen_text is not None:
                console.print(f"[dim]{escape(beat.on_screen_text.text)}[/dim]")
            heading = (
                "You heard" if beat.sound.status == Status.OBSERVED else "Listen for"
            )
            console.print(f"\n[bold]{heading}[/bold]  {escape(beat.sound.text)}\n")
            loop_span = (loop.start_s, loop.end_s) if loop else None
            width = min(GRAPH_MAX_WIDTH, console.width - 2)
            for row in render_graph(
                session.analysis,
                beat.start_s,
                beat.end_s,
                loop_span,
                peaks.get(beat.id),
                width,
            ):
                console.print(escape(row), highlight=False)
            if loop is None:
                console.print("\n[yellow]No loop fits this beat.[/yellow]")
            else:
                state = "[green]approved[/green]" if loop.approved else "not approved"
                console.print(
                    f"\nLoop {loop.start_s:.2f}–{loop.end_s:.2f} s, "
                    f"{loop.beats} beats, {loop.end_s - loop.start_s:.2f} s — {state}"
                )
            console.print()
            console.print(_help_table())
            if message:
                console.print(f"\n[cyan]{escape(message)}[/cyan]")
            message = ""

            key = read_key()
            action = KEYMAP.get(key)
            if action is None:
                message = "Not a shortcut — the keys are listed below the graph."
            elif action in NEEDS_LOOP and loop is None:
                message = "This beat has no loop."
            elif action == "quit":
                return
            elif action == "next":
                i = min(i + 1, len(beats) - 1)
            elif action == "prev":
                i = max(i - 1, 0)
            elif action == "stop":
                player.stop()
            elif action == "play":
                player.play(loop_paths(session.out, beat.id)[1])
            elif action == "window":
                window = cut_clip(
                    session.media,
                    beat.start_s,
                    beat.end_s,
                    session.out / "windows" / f"{beat.id}.wav",
                )
                player.play(window)
            elif action in ("start-earlier", "start-later", "end-earlier", "end-later"):
                edge, direction = action.split("-")
                step = -1 if direction == "earlier" else 1
                moved = nudge(loop, session.analysis.beat_times, edge, step)
                if moved == loop:
                    message = "Can't move that way."
                else:
                    _replace_loop(session, moved)
                    preview = render_loop(
                        session.media,
                        moved.start_s,
                        moved.end_s,
                        session.out,
                        beat.id,
                    )
                    player.play(preview)
            elif action == "approve":
                _replace_loop(session, loop.model_copy(update={"approved": True}))
                message = "Loop approved."
            elif action == "note":
                player.stop()
                console.print(
                    "\n[bold]What do you hear?[/bold] (Enter to save, empty to cancel)"
                )
                note = input("> ").strip()
                if note:
                    session.breakdown = with_note(
                        session.breakdown, beat.id, note, session.observer
                    )
                    dump_model(session.breakdown, session.breakdown_path)
                    message = f"Saved to {session.breakdown_path.name}."
    finally:
        player.stop()


def _replace_loop(session: Session, loop: LoopChoice) -> None:
    """Swap in a changed loop and save the LoopSet."""
    session.loops = session.loops.model_copy(
        update={
            "loops": [
                loop if x.beat_id == loop.beat_id else x for x in session.loops.loops
            ]
        }
    )
    dump_model(session.loops, session.loops_path)
