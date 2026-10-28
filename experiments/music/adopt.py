"""Bring the takes Adam kept (picks.json) into their games: copy each, as
made, into games/<game>/tunes/<part>/<n>.mp3 and write tunes.yaml with what
each was made from (the wording as sent, the model, its song id). A take's
game is its piece's world's (GAMES), its part the piece's (pieces.py `part`,
`parts` by wording, else the first of `now`), and a piece's `season` makes
its takes that season's own (tunes/<part>-<season>/). Rewrites a game's list from the
picks, so a take dropped from the keeps drops out. Then `main.py tunes`
packs them.

Run: python3 adopt.py [--world ID] [--also FILE ...] [--skip FILE ...]
  (FILE as on the board, e.g. siblings/12.mp3; --also takes a maybe too)
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from generate import OUT, manifest
from pieces import PIECES, STYLE

WORLDS = Path(__file__).parents[2] / "worlds"
GAMES = {"reksio": "yard", "krtek": "meadow"}  # the game each world's music goes to
SOURCE = (
    "Made with ElevenLabs Music (text to music, Starter plan, which allows"
    " commercial use) and picked by ear by Adam on the music board"
    " (experiments/music). Our own tunes, inspired by the era, not copied"
    " from the cartoon."
)
HEADERS = {
    "reksio": """\
# Recorded music for the yard (schema.tunes.TuneSet), packed into
# game/tunes.js by `main.py tunes`. music.js plays a random take of a part
# when it comes: the morning as he wakes, a phrase now and then after
# something new, the lullaby at evening. The takes are in tunes/, as made;
# written by experiments/music/adopt.py from Adam's picks on the music board.
""",
    "krtek": """\
# Recorded music for the meadow (schema.tunes.TuneSet), packed into
# game/tunes.js by `main.py tunes`. music.js plays a random take of a part
# when it comes: the meadow's theme as he wakes, the theme's moods in an
# encounter (curious, sad, happy), the cricket's fiddle from dusk. The takes
# are in tunes/, as made; written by experiments/music/adopt.py from Adam's
# picks on the music board (worlds/krtek/MUSIC_DIRECTION.md).
""",
}
ORDER = ["morning", "phrase", "curious", "sad", "happy", "lullaby"]


def quoted(text: str) -> str:
    return "'" + text.replace("'", "''") + "'"


def sent(piece: dict, c: dict) -> str:
    """What the take was made from, as sent."""
    if c.get("from"):
        return f"Composition plan conditioned on experiments/music {c['from']} ({c['strength']}): {c['prompt']}"
    return f"{c['prompt']} {STYLE}" if piece.get("style", True) else c["prompt"]


def flag(args: list[str], name: str) -> list[str]:
    """The values after --name, up to the next flag."""
    if name not in args:
        return []
    rest = args[args.index(name) + 1 :]
    return rest[
        : next((i for i, a in enumerate(rest) if a.startswith("--")), len(rest))
    ]


def part_of(piece: dict, c: dict) -> str:
    """Which part of the game's music a take of this piece becomes."""
    if "parts" in piece:
        return piece["parts"][c["wording"] - 1]
    return piece.get("part") or piece["now"][0]


def main(args: list[str]) -> None:
    skip, also = set(flag(args, "--skip")), set(flag(args, "--also"))
    only = flag(args, "--world")
    picks = json.loads((Path(__file__).parent / "picks.json").read_text())["picks"]
    known = {
        c["file"]: (name, c) for name, p in manifest().items() for c in p["candidates"]
    }
    games: dict[str, dict[tuple[str, str | None], list[tuple[dict, dict]]]] = {
        w: {} for w in GAMES if not only or w in only
    }
    for pick in picks:
        kept = pick.get("verdict") == "keep" or pick["file"] in also
        if not kept or pick["file"] in skip:
            continue
        name, c = known[pick["file"]]
        piece = PIECES[name]
        world = piece.get("world", "reksio")
        if world in games:
            slot = (part_of(piece, c), piece.get("season"))
            games[world].setdefault(slot, []).append((piece, c))
    for world, parts in games.items():
        game = WORLDS / world / "games" / GAMES[world]
        shutil.rmtree(game / "tunes", ignore_errors=True)
        lines = [HEADERS[world].rstrip(), f"source: {quoted(SOURCE)}", "tunes:"]
        for (part, season), takes in sorted(
            parts.items(), key=lambda s: (ORDER.index(s[0][0]), s[0][1] or "")
        ):
            folder = f"{part}-{season}" if season else part
            lines.append(f"- id: {part}")
            if season:
                lines.append(f"  season: {season}")
            lines.append("  takes:")
            for i, (piece, c) in enumerate(takes, 1):
                file = f"{folder}/{i:02d}.mp3"
                (game / "tunes" / folder).mkdir(parents=True, exist_ok=True)
                shutil.copy(OUT / c["file"], game / "tunes" / file)
                lines += [
                    f"  - file: {file}",
                    f"    prompt: {quoted(sent(piece, c))}",
                    f"    model: {c.get('model', c['source'])}",
                ]
                if c.get("song"):
                    lines.append(f"    song: {c['song']}")
                print(f"{world}: {file} <- {c['file']}")
        (game / "tunes.yaml").write_text("\n".join(lines) + "\n")
        print(f"Now: uv run python main.py tunes {world} {GAMES[world]}")


if __name__ == "__main__":
    main(sys.argv[1:])
