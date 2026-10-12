"""Even out the candidates' loudness (RMS to TARGET_DB, peaks capped), keeping the originals in out/raw/.

Run: .venv-moss/bin/python normalise.py
"""

import shutil
import wave
from pathlib import Path

import numpy as np

OUT = Path(__file__).parent / "out"
TARGET_DB = -20.0  # loud enough to hear the detail, with room for peaks
PEAK_DB = -1.0  # never clip

for f in sorted(OUT.glob("moss/*/*.wav")):
    raw = OUT / "raw" / f.relative_to(OUT)
    if not raw.exists():
        raw.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(f, raw)
    with wave.open(str(raw)) as w:
        params = w.getparams()
        d = (
            np.frombuffer(w.readframes(params.nframes), dtype=np.int16).astype(float)
            / 32768
        )
    rms = np.sqrt((d**2).mean()) or 1e-9
    gain = min(
        10 ** (TARGET_DB / 20) / rms, 10 ** (PEAK_DB / 20) / (abs(d).max() or 1e-9)
    )
    with wave.open(str(f), "wb") as w:
        w.setparams(params)
        w.writeframes((np.clip(d * gain, -1, 1) * 32767).astype(np.int16).tobytes())
    print(f"{f.relative_to(OUT)} {20 * np.log10(gain):+.1f} dB")
