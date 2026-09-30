"""Interactive listening pass: one screen per breakdown moment, with sound.

On screen, a breakdown's beats are called "moments", and "beat" always means a
musical beat (the pulse the loop snaps to). The two used to share a name, which
made the screen hard to read.

For each moment it shows what happens on screen, the open sound question, and an
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
import time
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

from audio import AudioAnalysis, LoopProposal, cut_clip, loop_paths, render_loop
from config import (
    GRAPH_FLOOR_DB,
    GRAPH_MAX_WIDTH,
    GRAPH_RANGE_DB,
    GRAPH_ROWS,
    LISTEN_REFRESH_S,
    LOOP_PREVIEW_REPEATS,
    PLAYERS,
)
from schema.breakdown import Breakdown
from schema.common import Claim, Status
from schema.loops import LoopChoice, LoopSet
from worlds import dump_model

if TYPE_CHECKING:
    from rich.console import Group
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
    playhead: float | None = None,
    segment: tuple[float, float] | None = None,
) -> list[str]:
    """Draw [lo, hi] as text rows: playhead, loudness, markers, time axis.

    The playhead row holds a ``▼`` above the moment now playing (blank when
    nothing plays, so the layout never jumps). Marker row: ``|`` detected beat,
    ``▲`` strongest hit, ``[`` ``]`` loop ends, ``─`` inside the loop. Below
    it, ``═`` marks ``segment`` (the moment), useful when the view is wider.
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

    def col(t: float) -> int | None:
        return min(int((t - lo) / span * cols), cols - 1) if lo <= t <= hi else None

    head = [" "] * cols
    if playhead is not None and (c := col(playhead)) is not None:
        head[c] = "▼"
    rows = ["".join(head)]
    for r in range(GRAPH_ROWS - 1, -1, -1):
        rows.append("".join(BLOCKS[max(0, min(8, level - r * 8))] for level in levels))

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

    moment = [" "] * cols
    if segment is not None:
        for c in range(cols):
            t = lo + (c + 0.5) * span / cols
            if segment[0] <= t <= segment[1]:
                moment[c] = "═"
    rows.append("".join(moment))

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


@dataclass
class Playing:
    """What is playing: a stretch of the clip, possibly repeated."""

    label: str
    start_s: float
    end_s: float
    repeats: int


def playhead(playing: Playing, elapsed_s: float) -> tuple[float, int] | None:
    """Clip time now playing and which pass (from 1), or None once finished."""
    length = playing.end_s - playing.start_s
    if length <= 0 or elapsed_s < 0 or elapsed_s >= length * playing.repeats:
        return None
    return playing.start_s + elapsed_s % length, int(elapsed_s // length) + 1


class Player:
    """Plays one file at a time in the background; a new play stops the last.

    Remembers what it is playing and when it started, so the screen can draw a
    playhead. The position is computed from the clock, not read from the
    player, so it can drift by the player's start-up delay (tens of ms).
    """

    def __init__(self) -> None:
        self.command = next(
            (list(cmd) for cmd in PLAYERS if shutil.which(cmd[0])), None
        )
        self.proc: subprocess.Popen[bytes] | None = None
        self.playing: Playing | None = None
        self.started = 0.0

    def play(self, path: Path, playing: Playing) -> None:
        """Start playing ``path``, stopping whatever was playing."""
        self.stop()
        if self.command is None:
            raise RuntimeError("No audio player found — install ffmpeg (for ffplay).")
        self.proc = subprocess.Popen(
            [*self.command, str(path)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        self.playing = playing
        self.started = time.monotonic()

    def position(self) -> tuple[float, int] | None:
        """(clip time, pass) now playing, or None if stopped or finished."""
        if self.playing is None or self.proc is None or self.proc.poll() is not None:
            return None
        return playhead(self.playing, time.monotonic() - self.started)

    def stop(self) -> None:
        """Stop playback, if any."""
        if self.proc is not None and self.proc.poll() is None:
            self.proc.terminate()
        self.proc = None
        self.playing = None


ARROWS = {"[C": "right", "[D": "left", "[A": "up", "[B": "down"}
"""Escape sequences (after ESC) of the arrow keys."""


def read_key(timeout_s: float) -> str | None:
    """Read one keypress, or None after ``timeout_s``. The terminal must already
    be in cbreak mode (see ``run``). Arrow keys come back as 'left'/'right'/..."""
    import select

    ready, _, _ = select.select([sys.stdin], [], [], timeout_s)
    if not ready:
        return None
    ch = sys.stdin.read(1)
    if ch == "\x1b":
        return ARROWS.get(sys.stdin.read(2), "esc")
    return ch


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
    ("prev", "previous moment", ("left", "up")),
    ("next", "next moment", ("right", "down", "\r", "\n")),
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
"""Actions that do nothing on a moment without a loop."""


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


LEGEND = "▼ playing now   | musical beat   [ ] loop   ▲ loudest hit   ═ this moment"
"""Key to the graph's symbols, shown under it."""


def progress_strip(session: Session, current: int) -> str:
    """One cell per moment: ▸ here, number, ✓ loop approved, ✎ note saved."""
    approved = {x.beat_id for x in session.loops.loops if x.approved}
    cells = []
    for n, beat in enumerate(session.breakdown.beats):
        here = "▸" if n == current else " "
        tick = "✓" if beat.id in approved else "·"
        note = "✎" if beat.sound.status == Status.OBSERVED else " "
        cells.append(f"{here}{n + 1}{tick}{note}")
    return " ".join(cells)


def now_playing(player: Player) -> str:
    """One line saying what is playing and where, or how to start."""
    position = player.position()
    if player.playing is None or position is None:
        return "■ Nothing playing — space plays the loop, w the whole stretch."
    t, n = position
    passes = (
        f" · pass {n}/{player.playing.repeats}" if player.playing.repeats > 1 else ""
    )
    return f"▶ {player.playing.label}{passes} · {t:.2f} s"


def _screen(
    session: Session, i: int, player: Player, message: str, width: int
) -> Group:
    """Everything shown for moment ``i``, as one rich renderable."""
    from rich.console import Group
    from rich.text import Text

    beat = session.breakdown.beats[i]
    loop = _loop_for(session, beat.id)
    peak = next(
        (p.peak_onset_s for p in session.proposals if p.beat_id == beat.id), None
    )
    position = player.position()
    heard = beat.sound.status == Status.OBSERVED
    parts: list[object] = [
        Text.assemble(
            (f"Moment {i + 1}/{len(session.breakdown.beats)}  {beat.id}", "bold"),
            (f"  {beat.start_s:.1f}–{beat.end_s:.1f} s of the clip", "dim"),
        ),
        Text(
            progress_strip(session, i) + "    ✓ loop approved  ✎ note saved",
            style="dim",
        ),
        Text(""),
        Text.assemble(("On screen  ", "bold"), beat.action.text),
    ]
    if beat.on_screen_text is not None:
        parts.append(Text(beat.on_screen_text.text, style="dim"))
    parts += [
        Text(""),
        Text.assemble(
            (
                "You heard  " if heard else "Listen for  ",
                "bold green" if heard else "bold",
            ),
            beat.sound.text,
        ),
        Text(""),
    ]
    view_lo, view_hi = graph_view(beat.start_s, beat.end_s, loop)
    rows = render_graph(
        session.analysis,
        view_lo,
        view_hi,
        (loop.start_s, loop.end_s) if loop else None,
        peak,
        width,
        playhead=position[0] if position else None,
        segment=(beat.start_s, beat.end_s),
    )
    parts.append(Text(rows[0], style="bold yellow"))
    parts += [Text(r) for r in rows[1:]]
    parts.append(Text(LEGEND, style="dim"))
    parts.append(Text(""))
    parts.append(Text(now_playing(player), style="bold yellow" if position else "dim"))
    if loop is None:
        parts.append(Text("This moment has no loop.", style="yellow"))
    else:
        state = ("approved ✓", "green") if loop.approved else ("not approved yet", "")
        parts.append(
            Text.assemble(
                f"Loop {loop.start_s:.2f}–{loop.end_s:.2f} s · {loop.beats} beats · "
                f"{loop.end_s - loop.start_s:.2f} s · ",
                state,
            )
        )
    parts += [Text(""), _help_table()]
    if message:
        parts += [Text(""), Text(message, style="cyan")]
    return Group(*parts)


def graph_view(
    start_s: float, end_s: float, loop: LoopChoice | None
) -> tuple[float, float]:
    """Time span to draw: the moment, widened to show the whole loop."""
    if loop is None:
        return start_s, end_s
    return min(start_s, loop.start_s), max(end_s, loop.end_s)


def _loop_for(session: Session, beat_id: str) -> LoopChoice | None:
    return next((x for x in session.loops.loops if x.beat_id == beat_id), None)


def run(session: Session) -> None:
    """The interactive loop. Needs a real terminal.

    The terminal stays in cbreak mode (keys arrive without Enter) except while
    a note is typed. The screen redraws every ``LISTEN_REFRESH_S`` so the
    playhead moves; ``rich.live`` redraws in place, without flicker.
    """
    import termios
    import tty

    from rich.console import Console
    from rich.live import Live

    console = Console()
    player = Player()
    beats = session.breakdown.beats
    fd = sys.stdin.fileno()
    cooked = termios.tcgetattr(fd)
    i = 0
    message = ""
    tty.setcbreak(fd)
    live = Live(console=console, screen=True, auto_refresh=False)
    live.start()
    try:
        while True:
            width = min(GRAPH_MAX_WIDTH, console.width - 2)
            live.update(_screen(session, i, player, message, width), refresh=True)
            key = read_key(LISTEN_REFRESH_S)
            if key is None:
                continue
            message = ""
            beat = beats[i]
            loop = _loop_for(session, beat.id)
            action = KEYMAP.get(key)
            if action is None:
                message = "That key does nothing — the shortcuts are listed above."
            elif action in NEEDS_LOOP and loop is None:
                message = "This moment has no loop."
            elif action == "quit":
                return
            elif action in ("next", "prev"):
                player.stop()
                i = min(i + 1, len(beats) - 1) if action == "next" else max(i - 1, 0)
            elif action == "stop":
                player.stop()
            elif action == "play":
                player.play(
                    loop_paths(session.out, beat.id)[1],
                    Playing("loop ×4", loop.start_s, loop.end_s, LOOP_PREVIEW_REPEATS),
                )
            elif action == "window":
                window = cut_clip(
                    session.media,
                    beat.start_s,
                    beat.end_s,
                    session.out / "windows" / f"{beat.id}.wav",
                )
                player.play(
                    window, Playing("whole stretch", beat.start_s, beat.end_s, 1)
                )
            elif action in ("start-earlier", "start-later", "end-earlier", "end-later"):
                edge, direction = action.split("-")
                moved = nudge(
                    loop,
                    session.analysis.beat_times,
                    edge,
                    -1 if direction == "earlier" else 1,
                )
                if moved == loop:
                    message = "Can't move that way — the loop needs at least one beat."
                else:
                    _replace_loop(session, moved)
                    preview = render_loop(
                        session.media, moved.start_s, moved.end_s, session.out, beat.id
                    )
                    player.play(
                        preview,
                        Playing(
                            "loop ×4", moved.start_s, moved.end_s, LOOP_PREVIEW_REPEATS
                        ),
                    )
                    message = (
                        f"Loop {edge} moved 1 beat {direction}; playing the new loop. "
                        "Press a when it sounds right."
                    )
            elif action == "approve":
                _replace_loop(session, loop.model_copy(update={"approved": True}))
                message = f"Loop approved and saved to {session.loops_path.name}."
            elif action == "note":
                player.stop()
                live.stop()
                termios.tcsetattr(fd, termios.TCSADRAIN, cooked)
                try:
                    console.print(
                        f"\n[bold]Moment {i + 1}: {beat.id}.[/bold] What do you hear? "
                        "Type, then Enter to save. Empty cancels."
                    )
                    if heard := beat.sound.status == Status.OBSERVED:
                        console.print(
                            f"[dim]Replaces your earlier note: {beat.sound.text}[/dim]"
                        )
                    note = input("> ").strip()
                finally:
                    tty.setcbreak(fd)
                    live.start()
                if note:
                    session.breakdown = with_note(
                        session.breakdown, beat.id, note, session.observer
                    )
                    dump_model(session.breakdown, session.breakdown_path)
                    message = f"Note saved to {session.breakdown_path.name}."
                else:
                    message = "No note saved." + (
                        " Your earlier note is kept." if heard else ""
                    )
    finally:
        player.stop()
        live.stop()
        termios.tcsetattr(fd, termios.TCSADRAIN, cooked)


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
