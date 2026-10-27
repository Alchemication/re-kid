"""Make candidate music with ElevenLabs (text to music), for the board.

Each piece in pieces.py: each wording (plus STYLE, unless the piece says
not), on each of the piece's models, TAKES takes. A piece with seeds grows
from takes Adam kept instead: a composition plan conditioned on each seed,
at each of its strengths, the wording as its style. Every take is stored at
ElevenLabs for inpainting, and its song id kept, so a keep can later seed
spin-offs (a composition plan's conditioning_ref). Writes
out/<piece>/<n>.mp3 and adds them to out/manifest.js. The key comes from the
sound experiment's generate_eleven.py (ELEVENLABS_API_KEY in the project's
.env). Standard library only: run it with any Python 3.

Run: python3 generate.py [--test] [piece ...]
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "sound"))
from generate_eleven import API, RETRIES, credits_used, key
from pieces import NEGATIVE, PIECES, STYLE

OUT = Path(__file__).parent / "out"
MODEL = "music_v2_5"  # the newest music model (2026-10), for pieces that name none
TAKES = int(
    os.environ.get("TAKES", "3")
)  # takes of each wording: enough to hear the spread
PARALLEL = int(
    os.environ.get("PARALLEL", "2")
)  # calls at once: the plan allows 2 (2026-10-27: 3 got 429s on the new key)


def body(
    piece: dict, prompt: str, model: str, seed: dict | None, strength: str | None
) -> dict:
    """The request for one take: a plain prompt, or, for a piece grown from a
    kept take (seed), a one-section composition plan conditioned on it."""
    common = {"model_id": model, "store_for_inpainting": True}
    if seed is None:
        return common | {
            "prompt": wording(piece, prompt),
            "music_length_ms": int(piece["seconds"] * 1000),
            "force_instrumental": True,
        }
    chunk = {
        "text": "[Instrumental]",
        "duration_ms": int(piece["seconds"] * 1000),
        "positive_styles": ["instrumental", prompt],
        "negative_styles": NEGATIVE,
        "conditioning_ref": {
            "song_id": seed["song"],
            "range": {"start_ms": 0, "end_ms": seed["ms"]},
        },
        "condition_strength": strength,
    }
    return common | {"composition_plan": {"chunks": [chunk]}}


def generate(request: dict) -> tuple[bytes, str | None]:
    """One take: its audio, and its song id at ElevenLabs."""
    req = urllib.request.Request(
        API + "/v1/music?output_format=mp3_44100_128",
        data=json.dumps(request).encode(),
        headers={"xi-api-key": key(), "Content-Type": "application/json"},
        method="POST",
    )
    for attempt in range(RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return r.read(), r.headers.get("song-id")
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


def wording(piece: dict, prompt: str) -> str:
    """What is sent: the wording, with the shared style unless the piece opts out."""
    return f"{prompt} {STYLE}" if piece.get("style", True) else prompt


def manifest() -> dict:
    path = OUT / "manifest.js"
    if not path.exists():
        return {}
    return json.loads(
        path.read_text().removeprefix("window.PIECES = ").rstrip().removesuffix(";")
    )


def save(found: dict) -> None:
    (OUT / "manifest.js").write_text(
        f"window.PIECES = {json.dumps(found, indent=1)};\n"
    )


def main(args: list[str]) -> None:
    OUT.mkdir(exist_ok=True)
    before = credits_used()
    if "--test" in args:
        started = time.time()
        piece = PIECES["morning"]
        audio, song = generate(body(piece, piece["prompts"][0], MODEL, None, None))
        (OUT / "test.mp3").write_bytes(audio)
        print(
            f"ok: {len(audio)} bytes, song {song}, in {time.time() - started:.0f} s; credits used {before} -> {credits_used()}"
        )
        return
    names = [a for a in args if not a.startswith("-")] or list(PIECES)
    found = manifest()
    # the board in pieces.py's order
    found = {n: found.pop(n) for n in PIECES if n in found} | found
    save(found)
    jobs = []  # each take still to make: its piece, wording, model, seed and strength
    for name in names:
        piece = PIECES[name]
        entry = found.setdefault(name, {"candidates": []})
        entry.update(
            {
                "for": piece["for"],
                "now": piece.get("now", []),
                "world": piece.get("world", "reksio"),
            }
        )
        done = {
            (
                c["prompt"],
                c.get("model", c["source"]),
                c.get("from"),
                c.get("strength"),
                c["seed"],
            )
            for c in entry["candidates"]
        }
        jobs += [
            {
                "name": name,
                "wording": w,
                "prompt": prompt,
                "model": model,
                "seed": seed,
                "strength": strength,
                "take": take,
            }
            for w, prompt in enumerate(piece["prompts"], 1)
            for model in piece.get("models", [MODEL])
            for seed in piece.get("seeds", [None])
            for strength in piece.get("strengths", [None])
            for take in range(1, piece.get("takes", TAKES) + 1)
            if (prompt, model, seed and seed["from"], strength, take) not in done
        ]
    print(f"{len(jobs)} to make, {PARALLEL} at a time", flush=True)
    started = time.time()
    with ThreadPoolExecutor(PARALLEL) as pool:
        running = {
            pool.submit(
                generate,
                body(
                    PIECES[j["name"]], j["prompt"], j["model"], j["seed"], j["strength"]
                ),
            ): j
            for j in jobs
        }
        for future in as_completed(running):
            j = running[future]
            name = j["name"]
            try:
                audio, song = future.result()
            except RuntimeError as e:
                print(f"{name} {j['model']} failed: {e}", flush=True)
                continue
            folder = OUT / name
            folder.mkdir(parents=True, exist_ok=True)
            file = folder / f"{len(list(folder.glob('*.mp3'))) + 1:02d}.mp3"
            file.write_bytes(audio)
            found[name]["candidates"].append(
                {
                    "file": str(file.relative_to(OUT)),
                    "source": "eleven",
                    "model": j["model"],
                    "song": song,
                    "prompt": j["prompt"],
                    "wording": j["wording"],
                    "seed": j["take"],
                }
                | (
                    {"from": j["seed"]["from"], "strength": j["strength"]}
                    if j["seed"]
                    else {}
                )
            )
            save(found)  # after each, so a stop loses nothing
            print(
                f"{name} {file.stem} {j['model']} {j['strength'] or ''}: {j['prompt'][:50]}",
                flush=True,
            )
    print(
        f"done in {time.time() - started:.0f} s; credits used {before} -> {credits_used()}"
    )


if __name__ == "__main__":
    main(sys.argv[1:])
