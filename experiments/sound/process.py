"""Make game-ready versions of kept takes, two recipes to compare by ear.

Both recipes trim the silence at the start (so a bonk lands with the apple)
and bring every take to the same loudness (louder sounds better to the ear,
so an A/B must be level). Then:
- clean: mono, as the game would pack it;
- retro: mono at a low sample rate, the highs rolled off, a touch of
  saturation: closer to a 1970s soundtrack, maybe.

Writes out/<recipe>/<sound>/<n>.mp3 and adds them to out/manifest.js as
sources "clean" and "retro". Standard library and ffmpeg only.

Run: python3 process.py
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

OUT = Path(__file__).parent / "out"
TARGET_DB = -18.0  # mean loudness of every take: room left for peaks
PEAK_DB = -1.0  # never clip
# One take Adam kept for each sound (picks of 2026-10-12): the first keep.
KEPT = {
    "boing": "eleven/boing/19.mp3",
    "splash": "eleven/splash/01.mp3",
    "bonk": "eleven/bonk/22.mp3",
    "rustle": "eleven/rustle/03.mp3",
    "buzz": "eleven/buzz/01.mp3",
    "yawn": "eleven/yawn/02.mp3",
    "snore": "eleven/snore/03.mp3",
    "sneeze": "eleven/sneeze/08.mp3",
    "munch": "eleven/munch/04.mp3",
    "lap": "eleven/lap/06.mp3",
    "sniff": "eleven/sniff/03.mp3",
    "yelp": "eleven/yelp/07.mp3",
    "howl": "eleven/howl/07.mp3",
}
TRIM = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.01"
RECIPES = {
    "clean": {"filters": [], "rate": 44100, "bitrate": "64k"},
    "retro": {
        # tape-ish: lows and highs rolled off, a little warmth, lower rate
        "filters": [
            "highpass=f=120",
            "lowpass=f=6500",
            "asoftclip=type=tanh:param=0.6",
        ],
        "rate": 22050,
        "bitrate": "48k",
    },
}


def ffmpeg(*args: str) -> str:
    done = subprocess.run(
        ["ffmpeg", "-hide_banner", "-y", *args],
        capture_output=True,
        text=True,
        check=True,
    )
    return done.stderr


def mean_db(filters: str, src: Path) -> tuple[float, float]:
    """Mean and peak loudness (dB) of src after filters."""
    err = ffmpeg("-i", str(src), "-af", f"{filters},volumedetect", "-f", "null", "-")
    mean = float(re.search(r"mean_volume: (-?[\d.]+) dB", err).group(1))
    peak = float(re.search(r"max_volume: (-?[\d.]+) dB", err).group(1))
    return mean, peak


def main() -> None:
    found = json.loads(
        (OUT / "manifest.js")
        .read_text()
        .removeprefix("window.CANDIDATES = ")
        .rstrip()
        .removesuffix(";")
    )
    for recipe, r in RECIPES.items():
        for sound, src in KEPT.items():
            chain = ",".join([TRIM, "aformat=channel_layouts=mono", *r["filters"]])
            mean, peak = mean_db(chain, OUT / src)
            gain = min(TARGET_DB - mean, PEAK_DB - peak)
            dst = OUT / recipe / sound / Path(src).name
            dst.parent.mkdir(parents=True, exist_ok=True)
            ffmpeg(
                "-i",
                str(OUT / src),
                "-af",
                f"{chain},volume={gain:.2f}dB",
                "-ar",
                str(r["rate"]),
                "-b:a",
                r["bitrate"],
                str(dst),
            )
            entry = found[sound]
            entry["candidates"] = [
                c for c in entry["candidates"] if c["file"] != str(dst.relative_to(OUT))
            ]
            entry["candidates"].append(
                {
                    "file": str(dst.relative_to(OUT)),
                    "source": recipe,
                    "prompt": f"{recipe} version of {src}",
                    "wording": "-",
                    "seed": "-",
                }
            )
            print(f"{recipe} {sound}: {dst.stat().st_size // 1024} KB, {gain:+.1f} dB")
    (OUT / "manifest.js").write_text(
        f"window.CANDIDATES = {json.dumps(found, indent=1)};\n"
    )


if __name__ == "__main__":
    main()
