"""Make candidate sound effects with ElevenLabs (text to sound effects), for the board.

The same sounds and wordings as generate_moss.py (sounds.py), TAKES takes
each. Writes out/eleven/<sound>/<n>.mp3 and adds them to out/manifest.js. The
key comes from ELEVENLABS_API_KEY, in the environment or the project's .env.
Standard library only: run it with any Python 3.

Calls run PARALLEL at a time; only the main thread writes files and the
manifest, so the board's list has one writer. --style NAME adds a style to
each sound's first wording (STYLES), as its own labelled wording.

Sounds in VOICES (Krtek's voice) are made only when named.

Each run's takes go in a folder on the board (--folder NAME, else the day
and the sounds made), so Adam can see only what is new.

Run: python3 generate_eleven.py [--test] [--style NAME] [--folder NAME] [sound ...]
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, date, datetime
from pathlib import Path

from sounds import SOUNDS, VOICES

OUT = Path(__file__).parent / "out"
ENV = Path(__file__).parents[2] / ".env"
API = "https://api.elevenlabs.io"
TAKES = int(
    os.environ.get("TAKES", "3")
)  # takes of each wording (3, as for MOSS, is enough to hear the spread)
PROMPT_INFLUENCE = 0.5  # 0 to 1: higher follows the wording more closely, with less variety (API default 0.3)
PARALLEL = 4  # calls at once: the plan caps concurrent requests, and a 429 is retried
RETRIES = 5
# Styles added to a wording, to hear whether naming the cartoon (or its era)
# changes anything. Labels show on the board as the wording.
STYLES = {
    "Reksio": ", in the style of the Polish cartoon Reksio (1970s)",
    "1970s": ", 1970s Eastern European hand-drawn cartoon sound effect, played on orchestral instruments, warm vintage tape sound",
}


def key() -> str:
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"]
    for line in ENV.read_text().splitlines() if ENV.exists() else []:
        name, _, value = line.partition("=")
        if name.strip().removeprefix("export ").strip() == "ELEVENLABS_API_KEY":
            return value.strip().strip("'\"")
    sys.exit("No ELEVENLABS_API_KEY: put it in the project's .env")


def call(path: str, body: dict | None = None) -> bytes:
    req = urllib.request.Request(
        API + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"xi-api-key": key(), "Content-Type": "application/json"},
        method="POST" if body is not None else "GET",
    )
    for attempt in range(RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if (
                e.code == 429 and attempt < RETRIES - 1
            ):  # too many at once: wait and try again
                time.sleep(2 * (attempt + 1))
                continue
            raise RuntimeError(
                f"ElevenLabs said {e.code}: {e.read().decode()[:500]}"
            ) from None
    raise RuntimeError("unreachable")


def credits_used() -> int | None:
    """Credits used so far this period (to see what a batch costs)."""
    sub = json.loads(call("/v1/user/subscription"))
    return sub.get("character_count")


def manifest() -> dict:
    path = OUT / "manifest.js"
    if not path.exists():
        return {}
    return json.loads(
        path.read_text().removeprefix("window.CANDIDATES = ").rstrip().removesuffix(";")
    )


def save(found: dict) -> None:
    (OUT / "manifest.js").write_text(
        f"window.CANDIDATES = {json.dumps(found, indent=1)};\n"
    )


def generate(prompt: str, seconds: float) -> bytes:
    return call(
        "/v1/sound-generation?output_format=mp3_44100_128",
        {
            "text": prompt,
            "duration_seconds": max(0.5, seconds),
            "prompt_influence": PROMPT_INFLUENCE,
        },
    )


def today() -> date:
    """Today, where the run is (the folder's day)."""
    return datetime.now(UTC).astimezone().date()


def next_take(where: Path) -> Path:
    """The next numbered take's file in a sound's (or piece's) directory."""
    where.mkdir(parents=True, exist_ok=True)
    return where / f"{len(list(where.glob('*.mp3'))) + 1:02d}.mp3"


def folder_of(args: list[str], names: list[str]) -> str:
    """The run's folder on the board: --folder NAME, else the day and what was made."""
    if "--folder" in args:
        return args[args.index("--folder") + 1]
    shown = ", ".join(names[:3]) + (f" +{len(names) - 3}" if len(names) > 3 else "")
    return f"{today():%d %b}: {shown}"


def main(args: list[str]) -> None:
    before = credits_used()
    if "--test" in args:
        audio = generate(SOUNDS["splash"]["prompts"][2], SOUNDS["splash"]["seconds"])
        (OUT / "eleven-test.mp3").write_bytes(audio)
        after = credits_used()
        print(f"ok: {len(audio)} bytes; credits used {before} -> {after}")
        return
    style = args[args.index("--style") + 1] if "--style" in args else None
    given = {style, args[args.index("--folder") + 1] if "--folder" in args else None}
    names = [a for a in args if not a.startswith("-") and a not in given] or list(
        SOUNDS
    )
    folder = folder_of(args, names)
    found = manifest()
    jobs = []  # (name, wording label, prompt, take): everything still to make
    for name in names:
        sound = {**SOUNDS, **VOICES}[name]
        entry = found.setdefault(name, {"for": sound["for"], "candidates": []})
        entry["for"] = sound["for"]
        entry["world"] = sound.get("world", "reksio")  # the board's world filter
        done = {
            (c["prompt"], c["seed"])
            for c in entry["candidates"]
            if c["source"] == "eleven"
        }
        wordings = (
            [(style, sound["prompts"][0] + STYLES[style])]
            if style
            else list(enumerate(sound["prompts"], 1))
        )
        jobs += [
            (name, w, prompt, take)
            for w, prompt in wordings
            for take in range(1, TAKES + 1)
            if (prompt, take) not in done
        ]
    print(f"{len(jobs)} to make, {PARALLEL} at a time", flush=True)
    started = time.time()
    with ThreadPoolExecutor(PARALLEL) as pool:
        running = {
            pool.submit(generate, prompt, {**SOUNDS, **VOICES}[name]["seconds"]): (
                name,
                w,
                prompt,
                take,
            )
            for name, w, prompt, take in jobs
        }
        for future in as_completed(running):
            name, w, prompt, take = running[future]
            try:
                audio = future.result()
            except RuntimeError as e:
                print(f"{name} failed: {e}", flush=True)
                continue
            file = next_take(OUT / "eleven" / name)
            file.write_bytes(audio)
            found[name]["candidates"].append(
                {
                    "file": str(file.relative_to(OUT)),
                    "source": "eleven",
                    "prompt": prompt,
                    "wording": w,
                    "seed": take,  # no seed in the API: the take's number
                    "folder": folder,
                    "made": today().isoformat(),
                }
            )
            save(found)  # after each, so a stop loses nothing
            print(f"{name} {file.stem}: {prompt[:60]}", flush=True)
    print(
        f"done in {time.time() - started:.0f} s; credits used {before} -> {credits_used()}"
    )


if __name__ == "__main__":
    main(sys.argv[1:])
