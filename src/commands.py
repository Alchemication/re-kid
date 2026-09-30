"""Subcommand handlers for main.py.

Each handler takes the parsed argparse namespace and returns a process exit
code. Research itself happens in Claude Code sessions; these commands inspect
and check what the research produced.
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

from config import AUDIO_DIR, EPISODES_FILE, INTRO_FILE, INTRO_LOOPS_FILE, REPO_ROOT
from schema.breakdown import Breakdown
from schema.common import Claim, Status
from schema.episode import EpisodeCatalogue
from schema.loops import LoopSet
from schema.world import SourceRegistry, WorldDossier
from worlds import WorldReport, dump_model, list_worlds, validate_world, world_dir

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
    "loops": LoopSet,
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


def cmd_audio(args: argparse.Namespace) -> int:
    """Measure a clip against the intro breakdown and cut one loop per beat."""
    from rich.console import Console
    from rich.table import Table

    from audio import AudioError, prepare

    report = validate_world(args.world)
    if report.intro is None:
        for error in report.errors:
            logger.error(error)
        logger.error(
            "No valid %s for %s. Write the intro breakdown first.",
            INTRO_FILE,
            args.world,
        )
        return 1

    media = Path(args.media)
    out = world_dir(args.world) / AUDIO_DIR / "intro"
    try:
        analysis, loops = prepare(media, report.intro, out)
    except AudioError as exc:
        logger.error("%s", exc)
        return 1

    def fmt(value: float | None) -> str:
        return "—" if value is None else f"{value:.2f}"

    table = Table()
    table.add_column("beat", no_wrap=True)
    for header in ("window s", "loop s", "beats", "loop len s", "peak hit s", "dB"):
        table.add_column(header)
    for loop in loops:
        length = (
            loop.loop_end_s - loop.loop_start_s
            if loop.loop_start_s is not None and loop.loop_end_s is not None
            else None
        )
        table.add_row(
            loop.beat_id,
            f"{loop.window_start_s:.1f}–{loop.window_end_s:.1f}",
            f"{fmt(loop.loop_start_s)}–{fmt(loop.loop_end_s)}",
            str(loop.loop_beats or "—"),
            fmt(length),
            fmt(loop.peak_onset_s),
            fmt(loop.mean_loudness_db),
        )
    console = Console()
    console.print(
        f"Measured, not heard: tempo ≈ {analysis.tempo_bpm} BPM, "
        f"{len(analysis.beat_times)} beats, {len(analysis.onset_times)} onsets."
    )
    console.print(table)
    print(f"Loops, 4x previews, spectrograms and analysis.json in {out}")
    print("Play each previews/*-x4.wav: does it repeat cleanly, and what do you hear?")
    return 0


def cmd_listen(args: argparse.Namespace) -> int:
    """Walk the intro beat by beat: hear loops, nudge them, note what you hear."""
    import sys

    from audio import AudioError, prepare, read_report, render_loop
    from listen import Session, initial_loops, run

    if not sys.stdin.isatty():
        logger.error("`listen` is interactive — run it in a terminal.")
        return 1
    report = validate_world(args.world)
    if report.intro is None:
        for error in report.errors:
            logger.error(error)
        logger.error("No valid %s for %s.", INTRO_FILE, args.world)
        return 1

    base = world_dir(args.world)
    out = base / AUDIO_DIR / "intro"
    existing = report.intro_loops
    if args.media:
        media = Path(args.media).resolve()
    elif existing is not None:
        media = REPO_ROOT / existing.source
    else:
        logger.error(
            "Pass the intro clip the first time, e.g. `main.py listen %s "
            "worlds/%s/media/intro/1972-kosmonauta.mp4`.",
            args.world,
            args.world,
        )
        return 1
    source = (
        str(media.relative_to(REPO_ROOT))
        if media.is_relative_to(REPO_ROOT)
        else str(media)
    )
    if existing is not None and existing.source != source:
        logger.error(
            "%s was made from %s, not %s. Loop times only fit their own clip: "
            "pass that clip, or delete the loops file to start again.",
            INTRO_LOOPS_FILE,
            existing.source,
            source,
        )
        return 1

    try:
        analysis_path = out / "analysis.json"
        measured = None
        if analysis_path.is_file():
            try:
                measured_media, analysis, proposals = read_report(analysis_path)
                measured = measured_media.resolve()
            except (KeyError, TypeError, ValueError):
                measured = None  # stale or damaged report: measure again
        if measured != media:
            print("Measuring the clip (first run takes a few seconds)…")
            analysis, proposals = prepare(media, report.intro, out)
        loops = existing or initial_loops(proposals, report.intro.id, source)
        if existing is None:
            dump_model(loops, base / INTRO_LOOPS_FILE)
        for loop in loops.loops:  # previews always match the saved loop points
            render_loop(media, loop.start_s, loop.end_s, out, loop.beat_id)
        session = Session(
            breakdown=report.intro,
            breakdown_path=base / INTRO_FILE,
            loops=loops,
            loops_path=base / INTRO_LOOPS_FILE,
            analysis=analysis,
            proposals=proposals,
            media=media,
            out=out,
            observer=args.by,
        )
        run(session)
    except AudioError as exc:
        logger.error("%s", exc)
        return 1

    approved = sum(loop.approved for loop in session.loops.loops)
    heard = sum(b.sound.status == Status.OBSERVED for b in session.breakdown.beats)
    print(
        f"{approved}/{len(session.loops.loops)} loops approved, "
        f"{heard}/{len(session.breakdown.beats)} beats with notes. "
        f"Saved to {INTRO_LOOPS_FILE} and {INTRO_FILE}."
    )
    return 0


def cmd_schema(args: argparse.Namespace) -> int:
    """Print the JSON Schema of a research file type."""
    print(json.dumps(_SCHEMAS[args.kind].model_json_schema(), indent=2))
    return 0
