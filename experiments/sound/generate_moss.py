"""Make candidate sound effects with MOSS-SoundEffect (MLX), for the board.

A proof of concept: a few of the yard's effects, a few wordings each, a few
seeds each. Writes out/moss/<sound>/<n>.wav and adds them to out/manifest.js,
which board.html reads (a script, so the page works straight from disk).

Run: .venv-moss/bin/python generate_moss.py [sound ...]
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import mlx.core as mx
import mlx_speech
from mlx_speech.audio import write_wav
from sounds import SOUNDS

OUT = Path(__file__).parent / "out"
SEEDS = [1, 2, 3]  # three takes of each wording: enough to hear the spread


def manifest() -> dict:
    path = OUT / "manifest.js"
    if not path.exists():
        return {}
    text = (
        path.read_text().removeprefix("window.CANDIDATES = ").rstrip().removesuffix(";")
    )
    return json.loads(text)


def save(found: dict) -> None:
    (OUT / "manifest.js").write_text(
        f"window.CANDIDATES = {json.dumps(found, indent=1)};\n"
    )


def main(names: list[str]) -> None:
    lock = (
        OUT / "generating.lock"
    )  # one run at a time: two would each hold the model (7 GB) and write over each other
    try:
        lock.parent.mkdir(exist_ok=True)
        lock.touch(exist_ok=False)
    except FileExistsError:
        sys.exit(f"Another run is going (or one crashed): check, then delete {lock}")
    try:
        run(names)
    finally:
        lock.unlink()


def run(names: list[str]) -> None:
    started = time.time()
    model = mlx_speech.tts.load("moss-sound-effect")
    print(f"loaded in {time.time() - started:.0f} s")
    found = manifest()
    for name in names or list(SOUNDS):
        sound = SOUNDS[name]
        folder = OUT / "moss" / name
        folder.mkdir(parents=True, exist_ok=True)
        entry = found.setdefault(name, {"for": sound["for"], "candidates": []})
        entry["for"] = sound["for"]
        done = {(c["prompt"], c["seed"]) for c in entry["candidates"]}
        n = len(
            list(folder.glob("*.wav"))
        )  # new takes are added after the ones already picked from
        for prompt in sound["prompts"]:
            for seed in SEEDS:
                if (prompt, seed) in done:
                    continue
                n += 1
                mx.random.seed(seed)
                t = time.time()
                out = model.generate(prompt, duration_seconds=sound["seconds"])
                file = folder / f"{n:02d}.wav"
                write_wav(str(file), out.waveform, sample_rate=out.sample_rate)
                entry["candidates"].append(
                    {
                        "file": str(file.relative_to(OUT)),
                        "source": "moss",
                        "prompt": prompt,
                        "wording": sound["prompts"].index(prompt) + 1,
                        "seed": seed,
                    }
                )
                print(
                    f"{name} {n:02d} ({time.time() - t:.1f} s): {prompt[:50]}",
                    flush=True,
                )
        save(found)
    print(f"done in {(time.time() - started) / 60:.1f} min")


if __name__ == "__main__":
    main(sys.argv[1:])
