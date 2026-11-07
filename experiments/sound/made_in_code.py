"""What each game's sounds are for, read from the comment above each in its sound.js, for the page
that plays the sounds made in code (made_in_code.html: a page opened from disk can't read a script as
text, so this writes the comments into out/made_in_code.js).

Standard library only: run it with any Python 3, again after a game's sound.js changes (the page
works without it, with no descriptions).

Run: python3 made_in_code.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
GAMES = {
    "krtek": ROOT / "worlds/krtek/games/meadow/game/sound.js",
    "reksio": ROOT / "worlds/reksio/games/yard/game/sound.js",
}
# a doc comment, then the function it is for: `function name(` (the meadow) or `name(` (the yard's object)
DOC = re.compile(r"/\*\*(.*?)\*/\s*(?:function\s+)?(\w+)\s*\(", re.DOTALL)


def docs(path: Path) -> dict[str, str]:
    """Each function's doc comment in one line, by its name."""
    found = {}
    for text, name in DOC.findall(path.read_text()):
        lines = [line.strip().lstrip("*").strip() for line in text.strip().splitlines()]
        found[name] = " ".join(line for line in lines if line)
    return found


def main() -> None:
    out = HERE / "out"
    out.mkdir(exist_ok=True)
    data = {world: docs(path) for world, path in GAMES.items()}
    (out / "made_in_code.js").write_text(
        f"window.MADE_IN_CODE_DOCS = {json.dumps(data, indent=1, ensure_ascii=False)}\n"
    )
    print(f"{sum(map(len, data.values()))} descriptions -> out/made_in_code.js")


if __name__ == "__main__":
    main()
