"""Measure music the same way in a film's scene and in our takes, so a take
can be held up against the moment it is for before Adam listens.

For each file (optionally a stretch of it, file@start-end in seconds): the
pulse (librosa's beat tracker, which may read double or half), notes a
second (onsets), the likeliest key, the pitch range of the main line, and
how far its notes sit from the nearest semitone (a rough "out of tune").
These are leads for the wording and for Adam, never claims about how
something sounds (CLAUDE.md: Claude can't hear).

Run: uv run python experiments/music/measure.py worlds/krtek/media/buldozer.mp4@78-106 experiments/music/out/cricket/*.mp3
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

import librosa
import numpy as np

RATE = 22050  # enough for a melody's pitch and onsets, and quick
LOW_HZ, HIGH_HZ = 150, 2000  # where a melody line sits (G3 to B6): below is bass
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
# Krumhansl-Kessler key profiles (major, minor), for the likeliest key
MAJOR = np.array(
    [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
)
MINOR = np.array(
    [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
)


def load(spec: str) -> np.ndarray:
    """The audio of file or file@start-end, mono at RATE."""
    path, _, span = spec.partition("@")
    cut = []
    if span:
        start, end = (float(x) for x in span.split("-"))
        cut = ["-ss", str(start), "-t", str(end - start)]
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "clip.wav"
        subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-y",
                *cut,
                "-i",
                path,
                "-vn",
                "-ac",
                "1",
                "-ar",
                str(RATE),
                str(wav),
            ],
            check=True,
        )
        y, _ = librosa.load(wav, sr=RATE, mono=True)
    return y


def key(y: np.ndarray) -> str:
    """The key whose profile best matches the clip's pitch classes."""
    chroma = librosa.feature.chroma_cqt(y=y, sr=RATE).mean(axis=1)
    fits = [
        (np.corrcoef(np.roll(profile, k), chroma)[0, 1], f"{NOTES[k]} {mode}")
        for profile, mode in ((MAJOR, "major"), (MINOR, "minor"))
        for k in range(12)
    ]
    return max(fits)[1]


def measure(spec: str) -> str:
    """One line of measurements for a file or a stretch of one."""
    y = load(spec)
    seconds = len(y) / RATE
    tempo, _ = librosa.beat.beat_track(y=y, sr=RATE)
    onsets = librosa.onset.onset_detect(y=y, sr=RATE, units="time")
    f0, voiced, _ = librosa.pyin(y, fmin=LOW_HZ, fmax=HIGH_HZ, sr=RATE)
    hz = f0[voiced & ~np.isnan(f0)]
    line = f"{spec}: {seconds:.0f} s, pulse {float(np.atleast_1d(tempo)[0]):.0f}, {len(onsets) / seconds:.1f} notes/s, {key(y)}"
    if len(hz):
        cents = 1200 * np.log2(hz / 440)
        off = cents - np.round(cents / 100) * 100
        low, mid, high = (
            librosa.hz_to_note(np.percentile(hz, p)) for p in (10, 50, 90)
        )
        line += f", melody {low}–{high} (mostly {mid}), off the semitone ±{off.std():.0f} c (overall {off.mean():+.0f} c)"
    return line


if __name__ == "__main__":
    for spec in sys.argv[1:]:
        print(measure(spec), flush=True)
