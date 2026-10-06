"""Subcommand handlers for main.py.

Each handler takes the parsed argparse namespace and returns a process exit
code. Research itself happens in Claude Code sessions; these commands inspect
and check what the research produced.
"""

from __future__ import annotations

import argparse
import json
import logging
from collections.abc import Callable
from pathlib import Path

from config import (
    AUDIO_DIR,
    BARK_CLIP,
    BARKS_JS,
    BUG_REPORT_DIR,
    EPISODES_FILE,
    GAME_PAGE,
    GAMES_DIR,
    INTRO_FILE,
    INTRO_MEDIA_DIR,
    MARK_CLIPS_DIR,
    MARK_HOST,
    MARK_PORT,
    MARK_PORT_TRIES,
    PLAY_STUB,
    REPLAY_PROGRESS_EVERY_MS,
    SAMPLE_CACHE_DIR,
    SAMPLES_JS,
    SAMPLES_NAME,
)
from schema.breakdown import Breakdown
from schema.brief import GameBrief
from schema.common import Claim, Status
from schema.episode import EpisodeCatalogue
from schema.world import SourceRegistry, WorldDossier
from worlds import WorldReport, list_worlds, validate_world, world_dir

logger = logging.getLogger(__name__)

_STATUS_STYLE = {
    Status.VERIFIED: "green",
    Status.SOURCED: "cyan",
    Status.OBSERVED: "blue",
    Status.INTERPRETATION: "yellow",
    Status.UNKNOWN: "red",
}

_SCHEMAS = {
    "world": WorldDossier,
    "sources": SourceRegistry,
    "episodes": EpisodeCatalogue,
    "intro": Breakdown,
    "brief": GameBrief,
}


def _format_counts(report: WorldReport) -> str:
    return ", ".join(
        f"{report.status_counts[s]} {s}" for s in Status if report.status_counts[s]
    )


def cmd_list(args: argparse.Namespace) -> int:
    """List worlds with their title and claim status mix."""
    from rich.console import Console
    from rich.table import Table

    ids = list_worlds()
    if not ids:
        logger.info("No worlds yet. Create worlds/<id>/world.yaml to add one.")
        return 0
    table = Table("id", "title", "country", "claims", "valid")
    for world_id in ids:
        report = validate_world(world_id)
        title = report.dossier.title if report.dossier else "?"
        country = report.dossier.country if report.dossier else "?"
        valid = "[red]no[/red]" if report.errors else "[green]yes[/green]"
        table.add_row(world_id, title, country, _format_counts(report), valid)
    Console().print(table)
    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    """Validate the named worlds (default: all). Exit 1 if any has errors."""
    ids = args.worlds or list_worlds()
    if not ids:
        logger.error("No worlds found under worlds/. Nothing to validate.")
        return 1
    failed = False
    for world_id in ids:
        report = validate_world(world_id)
        for warning in report.warnings:
            print(f"{world_id}: warning: {warning}")
        for error in report.errors:
            print(f"{world_id}: error: {error}")
        if report.errors:
            failed = True
            print(f"{world_id}: FAILED ({len(report.errors)} errors)")
        else:
            print(f"{world_id}: ok ({_format_counts(report)})")
    return 1 if failed else 0


def cmd_show(args: argparse.Namespace) -> int:
    """Print a world's claims, optionally filtered by status or path prefix."""
    from rich.console import Console
    from rich.markup import escape

    report = validate_world(args.world)
    if report.dossier is None:
        for error in report.errors:
            logger.error(error)
        logger.error("Fix the errors above (see `main.py validate %s`).", args.world)
        return 1

    console = Console()
    wanted = {Status(s) for s in args.status} if args.status else set(Status)
    claims: list[tuple[str, Claim]] = [
        (path, claim)
        for _, path, claim in report.iter_all_claims()
        if claim.status in wanted and path.startswith(args.section or "")
    ]
    console.print(f"[bold]{escape(report.dossier.title)}[/bold] ({args.world})")
    for path, claim in claims:
        style = _STATUS_STYLE[claim.status]
        refs = f" [dim]\\[{', '.join(claim.sources)}][/dim]" if claim.sources else ""
        by = f" [dim]by {escape(claim.observed_by)}[/dim]" if claim.observed_by else ""
        console.print(
            f"\n[bold]{escape(path)}[/bold] [{style}]{claim.status}[/{style}]{refs}{by}"
        )
        console.print(escape(claim.text))
    if report.dossier.open_questions and not args.status and not args.section:
        console.print("\n[bold]Open questions[/bold]")
        for question in report.dossier.open_questions:
            console.print(f"- {escape(question)}")
    return 0


def cmd_episodes(args: argparse.Namespace) -> int:
    """Print a world's episode catalogue as a table, one row per episode."""
    from rich.console import Console
    from rich.table import Table

    report = validate_world(args.world)
    if report.catalogue is None:
        for error in report.errors:
            logger.error(error)
        logger.error(
            "No valid episode catalogue for %s. Fill worlds/%s/%s, then run "
            "`main.py validate %s`.",
            args.world,
            args.world,
            EPISODES_FILE,
            args.world,
        )
        return 1

    episodes = report.catalogue.episodes
    if args.online:
        episodes = [e for e in episodes if e.watch_url]
    table = Table("#", "year", "title", "directors", "min", "record")
    table.add_column("watch", overflow="fold")
    for e in episodes:
        style = _STATUS_STYLE[e.record.status]
        table.add_row(
            str(e.number),
            str(e.year),
            e.title,
            ", ".join(e.directors),
            str(e.runtime_min or "?"),
            f"[{style}]{e.record.status}[/{style}]",
            e.watch_url or "",
        )
    Console().print(table)
    return 0


def _intro_media(world_id: str, reference: str) -> Path | None:
    """The one intro clip whose name contains the reference episode's short
    name (``reksio-kosmonauta`` → ``*kosmonauta*``), or None."""
    short = reference.removeprefix(f"{world_id}-")
    found = sorted((world_dir(world_id) / INTRO_MEDIA_DIR).glob(f"*{short}*.mp4"))
    return found[0] if len(found) == 1 else None


def cmd_mark(args: argparse.Namespace) -> int:
    """Open the local marking tool for the world's intro, until Ctrl+C."""
    import webbrowser

    from audio import AudioError, measure, read_analysis
    from mark import Session, make_server

    report = validate_world(args.world)
    if report.intro is None or report.dossier is None:
        for error in report.errors:
            logger.error(error)
        logger.error(
            "Fix %s first (see `main.py validate %s`).", INTRO_FILE, args.world
        )
        return 1
    intro = report.intro
    media = Path(args.media).resolve() if args.media else None
    media = media or _intro_media(args.world, intro.reference_episode)
    if media is None or not media.is_file():
        logger.error(
            "No intro clip found. Pass one, e.g. `main.py mark %s "
            "worlds/%s/%s/1972-kosmonauta.mp4` (see PROJECT_PLAN.md to download it).",
            args.world,
            args.world,
            INTRO_MEDIA_DIR,
        )
        return 1

    out = world_dir(args.world) / AUDIO_DIR / "intro"
    try:
        analysis = None
        if (out / "analysis.json").is_file():
            try:
                measured, analysis = read_analysis(out / "analysis.json")
                if measured.resolve() != media:
                    analysis = None
            except (KeyError, TypeError, ValueError):
                analysis = None  # stale or damaged: measure again
        if analysis is None:
            print("Measuring the clip (first run only, a few seconds)…")
            analysis = measure(media, intro, out)
    except AudioError as exc:
        logger.error("%s", exc)
        return 1

    session = Session(
        world=args.world,
        world_title=report.dossier.title,
        title=intro.title,
        breakdown=intro,
        breakdown_path=world_dir(args.world) / INTRO_FILE,
        analysis=analysis,
        media=media,
        observer=args.by,
        clips_dir=out / MARK_CLIPS_DIR,
    )
    for problem in session.sync_clips():
        logger.error("Clip not cut: %s", problem)
    server = None
    for port in range(MARK_PORT, MARK_PORT + MARK_PORT_TRIES):
        try:
            server = make_server(session, MARK_HOST, port)
            break
        except OSError:
            continue
    if server is None:
        logger.error(
            "Ports %d–%d are all busy. Close other copies of `main.py mark`.",
            MARK_PORT,
            MARK_PORT + MARK_PORT_TRIES - 1,
        )
        return 1

    url = f"http://{MARK_HOST}:{server.server_address[1]}/"
    print(f"Marking tool: {url}")
    print(f"Saving to {session.breakdown_path}; clips to {session.clips_dir}.")
    print("Press Ctrl+C here to stop.")
    if not args.no_open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

    print(
        f"\n{len(session.breakdown.marks)} marks in {INTRO_FILE}; "
        f"clips in {session.clips_dir}."
    )
    return 0


def game_page(world_id: str, game: str) -> Path:
    """A game's page in a world (it may not exist)."""
    return world_dir(world_id) / GAMES_DIR / game / GAME_PAGE


def play_query(args: argparse.Namespace) -> str:
    """The game page's ``?query`` for the debugging flags given (or "")."""
    from urllib.parse import urlencode

    flags = {}
    if getattr(args, "seed", None) is not None:
        flags["seed"] = str(args.seed)
    if getattr(args, "debug", False):
        flags["debug"] = ""
    if getattr(args, "still", False):
        flags["still"] = ""
    return f"?{urlencode(flags)}" if flags else ""


def play_stub(url: str, folder: Path) -> Path:
    """Write a page that forwards to `url` (see ``config.PLAY_STUB``)."""
    stub = folder / PLAY_STUB
    safe = url.replace('"', "%22")
    stub.write_text(
        f'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url={safe}">'
        f'<a href="{safe}">{safe}</a>\n'
    )
    return stub


def cmd_play(args: argparse.Namespace) -> int:
    """Open one of the world's games in the browser."""
    import tempfile
    import webbrowser

    page = game_page(args.world, args.game)
    if not page.is_file():
        found = sorted(
            p.parent.parent.name
            for p in (world_dir(args.world) / GAMES_DIR).glob(f"*/{GAME_PAGE}")
        )
        logger.error(
            "No game at %s. Games with a page: %s.", page, ", ".join(found) or "none"
        )
        return 1
    url = page.resolve().as_uri() + play_query(args)
    print(f"Opening {url}")
    if "?" in url:
        webbrowser.open(play_stub(url, Path(tempfile.gettempdir())).as_uri())
    else:
        webbrowser.open(url)
    return 0


def replay_progress() -> Callable[[float, float], None]:
    """A progress line for a replay, rewritten in place, no more often than
    REPLAY_PROGRESS_EVERY_MS."""
    shown = [-1e9]

    def show(now_s: float, total_s: float) -> None:
        if (now_s - shown[0]) * 1000 < REPLAY_PROGRESS_EVERY_MS and now_s < total_s:
            return
        shown[0] = now_s
        print(f"\r  {now_s:5.0f} s of {total_s:.0f} s", end="", flush=True)

    return show


def cmd_replay(args: argparse.Namespace) -> int:
    """Replay a game's bug report and photograph the run-up to it."""
    from replay import ReplayError, latest_report, load_report, replay

    try:
        path = Path(args.report) if args.report else latest_report(BUG_REPORT_DIR)
        report = load_report(path)
        out = Path(args.out) if args.out else path.with_suffix("")
        total = report["at"] / 1000
        print(f"Replaying {path}: {report.get('description')!r}")
        print(
            f"  {len(report['inputs'])} inputs over {total:.1f} s (seed {report.get('seed')})"
        )
        print(
            f"  It plays back in real time in a hidden Chrome: about {total / 60:.0f} min."
            f" Photos start {args.last:g} s before the report."
        )
        result = replay(report, out, args.last, args.every, progress=replay_progress())
        print()
    except ReplayError as e:
        logger.error("%s", e)
        return 1
    print(
        f"  {len(result.frames)} frames of the last {args.last:g} s in {out / 'frames'}"
    )
    if result.sheet:
        print(f"  contact sheet: {result.sheet}")
    else:
        print("  no contact sheet (install ffmpeg for one)")
    if result.differences:
        print(
            "  the replay went differently (real-clock drift, or the bug is timing-dependent):"
        )
        for key, (was, now) in result.differences.items():
            print(f"    {key}: recorded {was!r}, replayed {now!r}")
    else:
        print("  the replay ended in the recorded state")
    for e in result.errors:
        print(f"  error during replay: {e.splitlines()[0]}")
    print(f"  details: {out / 'replay.json'}")
    return 0


def cmd_samples(args: argparse.Namespace) -> int:
    """Download, measure and pack a game's instrument samples into samples.js."""
    from pydantic import ValidationError

    from samples import SampleError, build, note_name, problems, write_js
    from schema.samples import SampleSet
    from worlds import load_model

    game = world_dir(args.world) / GAMES_DIR / args.game
    path = game / SAMPLES_NAME
    if not path.is_file():
        logger.error(
            "No %s in %s. List the game's samples there first.", SAMPLES_NAME, game
        )
        return 1
    try:
        sample_set = load_model(path, SampleSet)
    except ValidationError as exc:
        logger.error("%s is not valid: %s", path, exc)
        return 1
    print("Downloading, trimming and measuring samples…")
    try:
        packed = build(sample_set, world_dir(args.world) / SAMPLE_CACHE_DIR)
    except SampleError as exc:
        logger.error("%s", exc)
        return 1
    for p in packed:
        pitch = (
            f"{note_name(p.midi):>4} {p.off_cents:+4.0f}c"
            if p.midi is not None
            else "  one-shot "
        )
        print(
            f"  {p.instrument:10} {pitch}  {len(p.data) // 1024:>3} KB  {Path(p.file).name}"
        )
    out = write_js(packed, sample_set.licence, game / SAMPLES_JS)
    print(f"Wrote {out} ({out.stat().st_size // 1024} KB, {len(packed)} samples).")
    for problem in problems(packed):
        logger.warning("Pitch far from a semitone: %s", problem)
    return 0


def cmd_schema(args: argparse.Namespace) -> int:
    """Print the JSON Schema of a research file type."""
    print(json.dumps(_SCHEMAS[args.kind].model_json_schema(), indent=2))
    return 0


def cmd_barks(args: argparse.Namespace) -> int:
    """Cut the marked original barks into a local script the games play from."""
    from barks import BarkError, build

    root = world_dir(args.world)
    try:
        count = build(root / BARK_CLIP, root / BARKS_JS)
    except BarkError as exc:
        logger.error("%s", exc)
        return 1
    print(
        f"Wrote {root / BARKS_JS} ({count} barks). It is the original recording: "
        "it stays on this machine (audio/ is gitignored)."
    )
    return 0
