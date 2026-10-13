"""Bring the takes Adam kept on the board into the game.

Reads picks.json (saved from the board), copies every kept take of a source
into the game's effects/ folder, and rewrites its effects.yaml (keeping each
sound's gain and the file's header and source line). Then run
`main.py effects <world> <game>` to pack them.

Run: python3 adopt.py [picks.json] [--source eleven] [--game ../../worlds/reksio/games/yard]
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "out"


def arg(args: list[str], name: str, default: str) -> str:
    return args[args.index(name) + 1] if name in args else default


def main(args: list[str]) -> None:
    picks_file = Path(
        next((a for a in args if a.endswith(".json")), HERE / "picks.json")
    )
    source = arg(args, "--source", "eleven")
    game = Path(
        arg(args, "--game", str(HERE / "../../worlds/reksio/games/yard"))
    ).resolve()
    yaml_path = game / "effects.yaml"
    text = yaml_path.read_text()
    head = text.split("\neffects:", 1)[0] + "\neffects:\n"
    # each sound's own settings (gain, steady), kept as they are
    settings = dict(
        re.findall(r"- id: (\w+)\n((?:  (?!takes:)\w+: [^\n]*\n)*)  takes:", text)
    )
    order = re.findall(
        r"- id: (\w+)", text
    )  # keep the sounds in the order they are listed

    picks = json.loads(picks_file.read_text())["picks"]
    kept: dict[str, list[dict]] = {}
    for p in picks:
        if p["source"] == source and p["verdict"] == "keep":
            kept.setdefault(p["sound"], []).append(p)
    order += [s for s in kept if s not in order]

    lines = []
    for sound in order:
        takes = sorted(kept.get(sound, []), key=lambda p: p["file"])
        if not takes:
            continue
        lines.append(f"- id: {sound}")
        if settings.get(sound):
            lines.append(settings[sound].rstrip("\n"))
        lines.append("  takes:")
        for p in takes:
            name = Path(p["file"]).name
            (game / "effects" / sound).mkdir(parents=True, exist_ok=True)
            shutil.copy(OUT / p["file"], game / "effects" / sound / name)
            prompt = p["prompt"].replace("'", "''")
            lines.append(f"  - file: {sound}/{name}\n    prompt: '{prompt}'")
        print(f"{sound}: {len(takes)} takes")
    yaml_path.write_text(head + "\n".join(lines) + "\n")


if __name__ == "__main__":
    main(sys.argv[1:])
