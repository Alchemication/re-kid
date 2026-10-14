"""Bring every take to the same loudness, so the board compares tunes, not
volumes (louder sounds better to the ear), in two versions: as made, and
through the effects' retro recipe (mono, 22 kHz, lows under 120 Hz and highs
over 6.5 kHz rolled off, a touch of saturation: config.EFFECT_*), which Adam
preferred on every sound effect. Writes out/<version>/<piece>/<n>.mp3 and
notes them in out/manifest.js as each candidate's "level" and "retro"; the
board plays those. Takes as made stay in out/<piece>/. Standard library and
ffmpeg only.

Run: python3 level.py
"""

from __future__ import annotations

import subprocess

from generate import OUT, manifest, save

LOUDNESS = -20  # LUFS: about where the game's music sits under the effects
PEAK = -1.5  # dBTP: never clip
NORM = f"loudnorm=I={LOUDNESS}:TP={PEAK}:LRA=11"
# version -> ffmpeg filters and output rate; retro as the effects' (config.EFFECT_*)
VERSIONS = {
    "level": (NORM, 44100),
    "retro": (
        f"aformat=channel_layouts=mono,highpass=f=120,lowpass=f=6500,asoftclip=type=tanh:param=0.6,{NORM}",
        22050,
    ),
}


def main() -> None:
    found = manifest()
    for piece in found.values():
        for c in piece["candidates"]:
            for version, (filters, rate) in VERSIONS.items():
                src = OUT / c["file"]
                dst = OUT / version / c["file"]
                if not dst.exists():
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    subprocess.run(
                        [
                            "ffmpeg",
                            "-v",
                            "error",
                            "-y",
                            "-i",
                            str(src),
                            "-af",
                            filters,
                            "-ar",
                            str(rate),
                            "-b:a",
                            "160k",
                            str(dst),
                        ],
                        check=True,
                    )
                c[version] = str(dst.relative_to(OUT))
    save(found)
    print(
        f"levelled {sum(len(p['candidates']) for p in found.values())} takes to {LOUDNESS} LUFS, as made and retro"
    )


if __name__ == "__main__":
    main()
