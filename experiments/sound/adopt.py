"""Bring the takes Adam kept on the board into a game.

Reads picks.json (saved from the board) and, for each sound named, copies its
kept takes of a source into the game's effects/ folder and writes its entry
in effects.yaml (keeping the sound's gain and other settings). Every other
entry stays as it is: a run brings in the sounds just picked, never the
whole history of keeps (a take once left out stays out). A sound belongs to
one world (sounds.py `world`, Reksio's if unset), and only to that world's
games: each world keeps its own sounds. Then run `main.py effects <world>
<game>` to pack them.

Run: python3 adopt.py SOUND ... [picks.json] [--source eleven] [--game ../../worlds/reksio/games/yard]
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

from sounds import SOUNDS, VOICES

HERE = Path(__file__).parent
OUT = HERE / "out"


def arg(args: list[str], name: str, default: str) -> str:
    return args[args.index(name) + 1] if name in args else default


def world_of(sound: str) -> str:
    """The world a sound belongs to."""
    return {**SOUNDS, **VOICES}.get(sound, {}).get("world", "reksio")


def entry(sound: str, settings: str, takes: list[dict], game: Path) -> str:
    """A sound's entry in effects.yaml, its takes copied into effects/."""
    lines = [f"- id: {sound}"]
    if settings:
        lines.append(settings.rstrip("\n"))
    lines.append("  takes:")
    for p in takes:
        name = Path(p["file"]).name
        (game / "effects" / sound).mkdir(parents=True, exist_ok=True)
        shutil.copy(OUT / p["file"], game / "effects" / sound / name)
        prompt = p["prompt"].replace("'", "''")
        lines.append(f"  - file: {sound}/{name}\n    prompt: '{prompt}'")
    return "\n".join(lines) + "\n"


def main(args: list[str]) -> None:
    values = {args[i + 1] for i, a in enumerate(args[:-1]) if a.startswith("--")}
    picks_file = Path(
        next((a for a in args if a.endswith(".json")), HERE / "picks.json")
    )
    names = [
        a
        for a in args
        if not a.startswith("--") and not a.endswith(".json") and a not in values
    ]
    if not names:
        sys.exit("Name the sounds to bring in, e.g. python3 adopt.py pat whoosh")
    source = arg(args, "--source", "eleven")
    game = Path(
        arg(args, "--game", str(HERE / "../../worlds/reksio/games/yard"))
    ).resolve()
    world = game.parents[1].name
    strangers = [n for n in names if world_of(n) != world]
    if strangers:
        sys.exit(
            f"{strangers} belong to another world, not {world}: each world keeps"
            " its own sounds. Pass --game for their world's game."
        )
    yaml_path = game / "effects.yaml"
    text = yaml_path.read_text()
    head, body = text.split("\neffects:\n", 1)
    blocks = {
        re.match(r"- id: (\w+)", b).group(1): b
        for b in re.split(r"(?m)^(?=- id: )", body)
        if b.strip()
    }

    picks = json.loads(picks_file.read_text())["picks"]
    for sound in names:
        takes = sorted(
            (
                p
                for p in picks
                if p["sound"] == sound
                and p["source"] == source
                and p["verdict"] == "keep"
            ),
            key=lambda p: p["file"],
        )
        if not takes:
            sys.exit(f"{sound}: no kept takes in {picks_file.name} — pick some first")
        old = blocks.get(sound, "")
        settings = re.search(r"\n((?:  (?!takes:)\w+: [^\n]*\n)*)  takes:", old)
        shutil.rmtree(game / "effects" / sound, ignore_errors=True)
        blocks[sound] = entry(sound, settings.group(1) if settings else "", takes, game)
        print(f"{sound}: {len(takes)} takes")
    yaml_path.write_text(head + "\neffects:\n" + "".join(blocks.values()))


if __name__ == "__main__":
    main(sys.argv[1:])
