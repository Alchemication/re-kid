"""re-kid — research and build small games from childhood cartoons.

Subcommands:
    list      List worlds with their claim status mix.
    validate  Check world files against the schema and each other.
    show      Print a world's claims with provenance.
    schema    Print the JSON Schema for a research file type.

Examples:
    uv run python main.py list
        One row per world: title, country, claims by status, validity.

    uv run python main.py validate
        Validate every world. Exit 1 on any error.

    uv run python main.py validate reksio
        Validate one world.

    uv run python main.py show reksio --status unknown
        What we still don't know about Reksio.

    uv run python main.py show reksio --section sound
        Everything under the sound section, all statuses.

    uv run python main.py schema world
        JSON Schema for world.yaml (also: sources).
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from commands import cmd_list, cmd_schema, cmd_show, cmd_validate
from schema.common import Status


def main() -> int:
    """Entry point: parse CLI args and dispatch to the subcommand handler."""
    logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stderr)

    parser = argparse.ArgumentParser(
        description=__doc__.split("\n\n")[0],
        epilog=__doc__.split("\n\n", 1)[1],
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list", help="List worlds")

    p_validate = sub.add_parser("validate", help="Validate world files")
    p_validate.add_argument("worlds", nargs="*", metavar="WORLD", help="World ids")

    p_show = sub.add_parser("show", help="Print a world's claims")
    p_show.add_argument("world", metavar="WORLD")
    p_show.add_argument(
        "--status",
        action="append",
        choices=[s.value for s in Status],
        help="Only claims with this status (repeatable)",
    )
    p_show.add_argument(
        "--section", metavar="PATH", help="Only claims under this path prefix"
    )

    p_schema = sub.add_parser("schema", help="Print JSON Schema")
    p_schema.add_argument("kind", choices=["world", "sources"])

    args = parser.parse_args()
    dispatch = {
        "list": cmd_list,
        "validate": cmd_validate,
        "show": cmd_show,
        "schema": cmd_schema,
    }
    return dispatch[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
