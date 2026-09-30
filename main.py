"""re-kid — research and build small games from childhood cartoons.

Subcommands:
    list      List worlds with their claim status mix.
    validate  Check world files against the schema and each other.
    show      Print a world's claims with provenance.
    episodes  Print a world's episode catalogue as a table.
    audio     Measure an intro clip and cut one candidate loop per beat.
    listen    Walk the intro beat by beat: hear loops, nudge them, take notes.
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

    uv run python main.py audio reksio worlds/reksio/media/intro/1972-kosmonauta.mp4
        Tempo, beats and hits of the intro, lined up with intro.yaml; writes
        loops, spectrograms and analysis.json to worlds/reksio/audio/intro/.
        Measurements only — a person still has to listen.

    uv run python main.py listen reksio worlds/reksio/media/intro/1972-kosmonauta.mp4
        Interactive, one screen per intro moment: ASCII loudness graph with a
        moving playhead, loop playback (afplay/ffplay), a progress strip,
        single-key loop nudging and approval. Notes
        you type become observed sound claims in intro.yaml; loop choices go
        to games/intro/loops.yaml. Later runs can drop the clip path.

    uv run python main.py schema world
        JSON Schema for world.yaml (also: sources, episodes, intro, loops).
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from commands import (
    cmd_audio,
    cmd_episodes,
    cmd_list,
    cmd_listen,
    cmd_schema,
    cmd_show,
    cmd_validate,
)
from config import OBSERVER
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

    p_audio = sub.add_parser("audio", help="Measure an intro clip, cut loops")
    p_audio.add_argument("world", metavar="WORLD")
    p_audio.add_argument(
        "media",
        metavar="MEDIA",
        help="Intro clip (video or audio) timed like intro.yaml's reference episode",
    )

    p_listen = sub.add_parser("listen", help="Interactive listening pass")
    p_listen.add_argument("world", metavar="WORLD")
    p_listen.add_argument(
        "media",
        metavar="MEDIA",
        nargs="?",
        help="Intro clip; needed on the first run only",
    )
    p_listen.add_argument(
        "--by", default=OBSERVER, help=f"Who is listening (default: {OBSERVER})"
    )

    p_schema = sub.add_parser("schema", help="Print JSON Schema")
    p_schema.add_argument(
        "kind", choices=["world", "sources", "episodes", "intro", "loops"]
    )

    args = parser.parse_args()
    dispatch = {
        "list": cmd_list,
        "validate": cmd_validate,
        "show": cmd_show,
        "episodes": cmd_episodes,
        "audio": cmd_audio,
        "listen": cmd_listen,
        "schema": cmd_schema,
    }
    return dispatch[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
