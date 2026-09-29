"""Subcommand handlers for main.py.

Each handler takes the parsed argparse namespace and returns a process exit
code. Research itself happens in Claude Code sessions; these commands inspect
and check what the research produced.
"""

from __future__ import annotations

import argparse
import json
import logging

from schema.common import Claim, Status
from schema.world import SourceRegistry, WorldDossier
from worlds import WorldReport, iter_claims, list_worlds, validate_world

logger = logging.getLogger(__name__)

_STATUS_STYLE = {
    Status.VERIFIED: "green",
    Status.SOURCED: "cyan",
    Status.OBSERVED: "blue",
    Status.INTERPRETATION: "yellow",
    Status.UNKNOWN: "red",
}

_SCHEMAS = {"world": WorldDossier, "sources": SourceRegistry}


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
        for path, claim in iter_claims(report.dossier)
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


def cmd_schema(args: argparse.Namespace) -> int:
    """Print the JSON Schema of a research file type."""
    print(json.dumps(_SCHEMAS[args.kind].model_json_schema(), indent=2))
    return 0
