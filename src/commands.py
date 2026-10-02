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

from config import (
    AUDIO_DIR,
    EPISODES_FILE,
    INTRO_FILE,
    INTRO_MEDIA_DIR,
    MARK_CLIPS_DIR,
    MARK_HOST,
    MARK_PORT,
    MARK_PORT_TRIES,
)
from schema.breakdown import Breakdown
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

    from audio import AudioError, cut_clip, measure, read_analysis
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
        title=f"{report.dossier.title} — {intro.title}",
        breakdown=intro,
        breakdown_path=world_dir(args.world) / INTRO_FILE,
        analysis=analysis,
        media=media,
        observer=args.by,
    )
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
    print(f"Saving to {session.breakdown_path}. Press Ctrl+C here to stop.")
    if not args.no_open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

    marks = session.breakdown.marks
    clips = out / MARK_CLIPS_DIR
    if clips.is_dir():
        for stale in clips.glob("*.wav"):
            stale.unlink()
    try:
        for mark in marks:
            cut_clip(media, mark.start_s, mark.end_s, clips / f"{mark.id}.wav")
    except AudioError as exc:
        logger.error("Marks are saved, but cutting their clips failed: %s", exc)
        return 1
    print(f"\n{len(marks)} marks saved in {INTRO_FILE}; clips in {clips}.")
    return 0


def cmd_schema(args: argparse.Namespace) -> int:
    """Print the JSON Schema of a research file type."""
    print(json.dumps(_SCHEMAS[args.kind].model_json_schema(), indent=2))
    return 0
