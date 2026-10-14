"""re-kid — research and build small games from childhood cartoons.

Subcommands:
    list      List worlds with their claim status mix.
    validate  Check world files against the schema and each other.
    show      Print a world's claims with provenance.
    episodes  Print a world's episode catalogue as a table.
    mark      Open the local tool for marking sounds in the intro.
    play      Open a game in the browser (default: the yard).
    replay    Replay a game's bug report and photograph the run-up to it.
    look      Play a gag and photograph it as it runs (frames, contact sheet).
    samples   Download and pack a game's instrument samples into samples.js.
    effects   Trim, level and pack a game's picked sound effects into effects.js.
    tunes     Level and pack a game's picked music takes into tunes.js.
    barks     Cut the marked original barks into barks.js for the games.
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

    uv run python main.py play reksio --debug --seed 42
        The same play every time, with the state overlay and a "report a
        bug" button (Ctrl+Shift+B works in any play). --still: Reksio only
        moves when asked, for trying one gesture or gag on its own.

    uv run python main.py replay
        Replays the newest bug report in ~/Downloads in Chrome: same seed,
        same inputs at the same times. Saves a screenshot every 0.5 s of the
        last 10 s, a contact sheet, and how the replayed state compares.

    uv run python main.py look reksio --flags props=bowl --close \
            --before "yardGame.use('bowl')" --watch "yardGame.use('bowl', true)"
        Opens a seeded, still play (only what you ask moves), eats the bowl
        empty, then photographs the next use (the bowl stuck on his head)
        every 350 ms until it ends, cut close around Reksio. Saves frames,
        a contact sheet and look.json (frame times, trace, events) in
        looks/latest/. --for 20 without --watch photographs the play as it
        goes; --size 844x390 is a phone on its side.

    uv run python main.py samples reksio yard
        Downloads the samples listed in games/yard/samples.yaml (CC0
        libraries), measures their pitch and packs them into samples.js.

    uv run python main.py effects reksio yard
        Takes the sound effects picked by ear (games/yard/effects.yaml, the
        takes in games/yard/effects/), trims the silence at their start,
        levels them, rolls off lows and highs with a touch of saturation
        (the retro recipe) and packs them into effects.js. The game plays a
        random take of a sound each time, instead of its synthesised one.

    uv run python main.py tunes reksio yard
        Takes the music picked by ear (games/yard/tunes.yaml, the takes in
        games/yard/tunes/), fades out their ends, puts them through the
        effects' retro recipe, levels them and packs them into tunes.js. The
        game plays a random take of a part when it comes: the morning, a
        phrase now and then, the lullaby.

    uv run python main.py barks reksio
        Cuts the barks Adam marked (audio/intro/marks/bark.wav) apart and
        packs them into games/yard/game/barks.js. The games play them a
        little higher and quicker each time; without the file they use a
        synthesised bark. The original recording, shipped with the game.

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
    cmd_effects,
    cmd_episodes,
    cmd_list,
    cmd_look,
    cmd_mark,
    cmd_play,
    cmd_replay,
    cmd_samples,
    cmd_schema,
    cmd_show,
    cmd_tunes,
    cmd_validate,
)
from config import (
    DEFAULT_GAME,
    LOOK_EVERY_MS,
    LOOK_SIZE,
    OBSERVER,
    REPLAY_EVERY_MS,
    REPLAY_LAST_S,
)
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
    p_play.add_argument(
        "--debug", action="store_true", help="State overlay and bug button"
    )
    p_play.add_argument(
        "--seed", type=int, help="Replay this play (printed in the console)"
    )
    p_play.add_argument(
        "--still", action="store_true", help="Reksio moves only when asked"
    )

    p_replay = sub.add_parser("replay", help="Replay a game's bug report")
    p_replay.add_argument(
        "report",
        metavar="REPORT",
        nargs="?",
        help="Report file (default: newest in ~/Downloads)",
    )
    p_replay.add_argument(
        "--last",
        type=float,
        default=REPLAY_LAST_S,
        help=f"Seconds to photograph (default: {REPLAY_LAST_S})",
    )
    p_replay.add_argument(
        "--every",
        type=int,
        default=REPLAY_EVERY_MS,
        help=f"ms between frames (default: {REPLAY_EVERY_MS})",
    )
    p_replay.add_argument(
        "--out", help="Folder for the frames (default: next to the report)"
    )

    p_look = sub.add_parser("look", help="Photograph a gag as it runs")
    p_look.add_argument("world", metavar="WORLD")
    p_look.add_argument(
        "game",
        metavar="GAME",
        nargs="?",
        default=DEFAULT_GAME,
        help=f"Game folder under games/ (default: {DEFAULT_GAME})",
    )
    p_look.add_argument(
        "--flags",
        default="",
        help="Page flags over the default seeded still play, e.g. 'props=bowl&rain=1'",
    )
    p_look.add_argument(
        "--before",
        action="append",
        default=[],
        metavar="JS",
        help="Set-up step to await first (repeatable), e.g. \"yardGame.use('bowl')\"",
    )
    p_look.add_argument(
        "--watch", metavar="JS", help="What to photograph until it ends"
    )
    p_look.add_argument(
        "--for",
        dest="seconds",
        type=float,
        help="Seconds to photograph (the most, with --watch)",
    )
    p_look.add_argument(
        "--every",
        type=int,
        default=LOOK_EVERY_MS,
        help=f"ms between frames (default: {LOOK_EVERY_MS})",
    )
    p_look.add_argument(
        "--size",
        default=f"{LOOK_SIZE[0]}x{LOOK_SIZE[1]}",
        help="Page size WIDTHxHEIGHT in CSS px (default: %(default)s)",
    )
    p_look.add_argument(
        "--close", action="store_true", help="Cut each frame close around Reksio"
    )
    p_look.add_argument("--out", help="Folder for the frames (default: looks/latest)")

    p_samples = sub.add_parser("samples", help="Pack a game's instrument samples")
    p_samples.add_argument("world", metavar="WORLD")
    p_samples.add_argument(
        "game",
        metavar="GAME",
        nargs="?",
        default=DEFAULT_GAME,
        help=f"Game folder under games/ (default: {DEFAULT_GAME})",
    )

    p_effects = sub.add_parser("effects", help="Pack a game's picked sound effects")
    p_effects.add_argument("world", metavar="WORLD")
    p_effects.add_argument(
        "game",
        metavar="GAME",
        nargs="?",
        default=DEFAULT_GAME,
        help=f"Game folder under games/ (default: {DEFAULT_GAME})",
    )

    p_tunes = sub.add_parser("tunes", help="Pack a game's picked music takes")
    p_tunes.add_argument("world", metavar="WORLD")
    p_tunes.add_argument(
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
        "replay": cmd_replay,
        "look": cmd_look,
        "samples": cmd_samples,
        "effects": cmd_effects,
        "tunes": cmd_tunes,
        "barks": cmd_barks,
        "schema": cmd_schema,
    }
    return dispatch[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
