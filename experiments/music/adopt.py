"""Bring the takes Adam kept (picks.json) into the yard: copy each, as made,
into games/yard/tunes/<part>/<n>.mp3 and write tunes.yaml with what each was
made from (the wording as sent, the model, its song id). A take's part is its
piece's (pieces.py "now"). Rewrites the list from the picks, so a take
dropped from the keeps drops out. Then `main.py tunes reksio` packs them.

Run: python3 adopt.py [--skip FILE ...]   (FILE as on the board, e.g. siblings/12.mp3)
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from generate import OUT, manifest
from pieces import PIECES, STYLE

YARD = Path(__file__).parents[2] / "worlds/reksio/games/yard"
SOURCE = (
    "Made with ElevenLabs Music (text to music, Starter plan, which allows"
    " commercial use) and picked by ear by Adam on the music board"
    " (experiments/music). Our own tunes, inspired by the era, not copied"
    " from the cartoon."
)
HEADER = """\
# Recorded music for the yard (schema.tunes.TuneSet), packed into
# game/tunes.js by `main.py tunes`. music.js plays a random take of a part
# when it comes: the morning as he wakes, a phrase now and then after
# something new, the lullaby at evening. The takes are in tunes/, as made;
# written by experiments/music/adopt.py from Adam's picks on the music board.
"""


def quoted(text: str) -> str:
    return "'" + text.replace("'", "''") + "'"


def sent(piece: dict, c: dict) -> str:
    """What the take was made from, as sent."""
    if c.get("from"):
        return f"Composition plan conditioned on experiments/music {c['from']} ({c['strength']}): {c['prompt']}"
    return f"{c['prompt']} {STYLE}" if piece.get("style", True) else c["prompt"]


def main(args: list[str]) -> None:
    skip = set(args[args.index("--skip") + 1 :]) if "--skip" in args else set()
    picks = json.loads((Path(__file__).parent / "picks.json").read_text())["picks"]
    known = {
        c["file"]: (name, c) for name, p in manifest().items() for c in p["candidates"]
    }
    parts: dict[str, list[tuple[dict, dict]]] = {
        "morning": [],
        "phrase": [],
        "lullaby": [],
    }
    for pick in picks:
        if pick.get("verdict") != "keep" or pick["file"] in skip:
            continue
        name, c = known[pick["file"]]
        parts[PIECES[name]["now"][0]].append((PIECES[name], c))
    shutil.rmtree(YARD / "tunes", ignore_errors=True)
    lines = [HEADER.rstrip(), f"source: {quoted(SOURCE)}", "tunes:"]
    for part, takes in parts.items():
        if not takes:
            continue
        lines += [f"- id: {part}", "  takes:"]
        for i, (piece, c) in enumerate(takes, 1):
            file = f"{part}/{i:02d}.mp3"
            (YARD / "tunes" / part).mkdir(parents=True, exist_ok=True)
            shutil.copy(OUT / c["file"], YARD / "tunes" / file)
            lines += [
                f"  - file: {file}",
                f"    prompt: {quoted(sent(piece, c))}",
                f"    model: {c.get('model', c['source'])}",
            ]
            if c.get("song"):
                lines.append(f"    song: {c['song']}")
            print(f"{file} <- {c['file']}")
    (YARD / "tunes.yaml").write_text("\n".join(lines) + "\n")
    print("Now: uv run python main.py tunes reksio")


if __name__ == "__main__":
    main(sys.argv[1:])
