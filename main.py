"""re-kid — research and build small games from childhood cartoons.

Subcommands:
    list      List worlds with their claim status mix.
    validate  Check world files against the schema and each other.
    show      Print a world's claims with provenance.
    episodes  Print a world's episode catalogue as a table.
    mark      Open the local tool for marking sounds in the intro.
    play      Open a game in the browser (default: the yard).
    samples   Download and pack a game's instrument samples into samples.js.
    barks     Cut the marked original barks into a local script for the games.
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

    uv run python main.py show reksio --section episodes[reksio-wybawca]
        One catalogued episode: its record and synopsis claims.

    uv run python main.py show reksio --section intro
        The title sequence, beat by beat.

    uv run python main.py episodes reksio --online
        Episodes the studio has uploaded: year, directors, length, link.

    uv run python main.py mark reksio
        Opens a page in the browser: the intro video with its waveform,
        spectrogram, moments and beat grid. Drag to select a sound, name it,
        note what you hear, answer each moment's sound question. Everything
        saves to intro.yaml as you go, and each mark's clip is kept up to
        date in audio/intro/marks/<id>.wav. Ctrl+C stops the tool.

    uv run python main.py play reksio
        Opens the yard game (a static page, no server needed).

    uv run python main.py samples reksio yard
        Downloads the samples listed in games/yard/samples.yaml (CC0
        libraries), measures their pitch and packs them into samples.js.

    uv run python main.py barks reksio
        Cuts the barks Adam marked (audio/intro/marks/bark.wav) apart and
        packs them into audio/barks.js. The games play them a little higher
        and quicker each time; without the file they use a synthesised bark.
        The file is the original recording, so it stays local (gitignored).

    uv run python main.py schema world
        JSON Schema for world.yaml (also: sources, episodes, intro, brief).
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from commands import (
    cmd_barks,
    cmd_episodes,
    cmd_list,
    cmd_mark,
    cmd_play,
    cmd_samples,
    cmd_schema,
    cmd_show,
    cmd_validate,
)
from config import DEFAULT_GAME, OBSERVER
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

    p_episodes = sub.add_parser("episodes", help="Print the episode catalogue")
    p_episodes.add_argument("world", metavar="WORLD")
    p_episodes.add_argument(
        "--online", action="store_true", help="Only episodes with an official upload"
    )

    p_mark = sub.add_parser("mark", help="Mark sounds in the intro (browser)")
    p_mark.add_argument("world", metavar="WORLD")
    p_mark.add_argument(
        "media",
        metavar="MEDIA",
        nargs="?",
        help="Intro clip; found automatically under media/intro/ if omitted",
    )
    p_mark.add_argument(
        "--by", default=OBSERVER, help=f"Who is listening (default: {OBSERVER})"
    )
    p_mark.add_argument("--no-open", action="store_true", help="Don't open the browser")

    p_play = sub.add_parser("play", help="Open a game in the browser")
    p_play.add_argument("world", metavar="WORLD")
    p_play.add_argument(
        "game",
        metavar="GAME",
        nargs="?",
        default=DEFAULT_GAME,
        help=f"Game folder under games/ (default: {DEFAULT_GAME})",
    )

    p_samples = sub.add_parser("samples", help="Pack a game's instrument samples")
    p_samples.add_argument("world", metavar="WORLD")
    p_samples.add_argument(
        "game",
        metavar="GAME",
        nargs="?",
        default=DEFAULT_GAME,
        help=f"Game folder under games/ (default: {DEFAULT_GAME})",
    )

    p_barks = sub.add_parser("barks", help="Pack the marked barks for the games")
    p_barks.add_argument("world", metavar="WORLD")

    p_schema = sub.add_parser("schema", help="Print JSON Schema")
    p_schema.add_argument(
        "kind", choices=["world", "sources", "episodes", "intro", "brief"]
    )

    args = parser.parse_args()
    dispatch = {
        "list": cmd_list,
        "validate": cmd_validate,
        "show": cmd_show,
        "episodes": cmd_episodes,
        "mark": cmd_mark,
        "play": cmd_play,
        "samples": cmd_samples,
        "barks": cmd_barks,
        "schema": cmd_schema,
    }
    return dispatch[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
