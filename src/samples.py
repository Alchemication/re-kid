"""Pack a game's instrument samples into one script the page can load from disk.

Reads the game's ``samples.yaml``, downloads each file once into a cache, then
for each: converts to mono, trims leading silence, cuts to ``max_seconds`` with
a fade, normalises loudness and encodes a small MP3. Pitched samples have their
real pitch measured (library file names are not reliable about octaves), and
that measured note is what the game plays from. Everything goes into
``samples.js`` as base64, because browsers won't load audio files into Web
Audio from a ``file://`` page.

Example:
    report = build(sample_set, cache_dir, out_js)
"""

from __future__ import annotations

import base64
import json
import shutil
import subprocess
import tempfile
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from config import (
    DOWNLOAD_TIMEOUT_S,
    FFMPEG_TIMEOUT_S,
    PITCH_TOLERANCE_CENTS,
    SAMPLE_BITRATE,
    SAMPLE_LIBRARIES,
    SAMPLE_OUT_RATE,
)
from schema.samples import Instrument, SampleSet

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


class SampleError(RuntimeError):
    """A download, conversion or measurement failed; the message says what to do."""


@dataclass
class Packed:
    """One packed sample, as the game sees it."""

    instrument: str
    file: str
    midi: float | None  # measured pitch, None for unpitched sounds
    off_cents: float | None  # distance from the nearest semitone
    data: bytes


def note_name(midi: float) -> str:
    """'A#4' style name of the nearest semitone."""
    n = round(midi)
    return f"{NOTE_NAMES[n % 12]}{n // 12 - 1}"


def fetch(library: str, path: str, cache: Path) -> Path:
    """The cached copy of a library file, downloading it if needed."""
    if library not in SAMPLE_LIBRARIES:
        raise SampleError(
            f"unknown library {library!r} — use one of {sorted(SAMPLE_LIBRARIES)}"
        )
    target = cache / library / path
    if target.is_file():
        return target
    url = SAMPLE_LIBRARIES[library] + urllib.parse.quote(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        with urllib.request.urlopen(url, timeout=DOWNLOAD_TIMEOUT_S) as res:
            data = res.read()
    except OSError as exc:
        raise SampleError(
            f"could not download {url}: {exc} — check the path in samples.yaml"
        ) from exc
    target.write_bytes(data)
    return target


def _ffmpeg(args: list[str]) -> None:
    exe = shutil.which("ffmpeg")
    if exe is None:
        raise SampleError("ffmpeg not found — install it with `brew install ffmpeg`.")
    try:
        subprocess.run(
            [exe, "-loglevel", "error", "-y", *args],
            check=True,
            capture_output=True,
            text=True,
            timeout=FFMPEG_TIMEOUT_S,
        )
    except subprocess.CalledProcessError as exc:
        raise SampleError(f"ffmpeg failed: {exc.stderr.strip()}") from exc


def prepare(src: Path, inst: Instrument, workdir: Path) -> tuple[Path, Path]:
    """Mono, trimmed, faded, normalised: a WAV to measure and an MP3 to pack."""
    fade = 0.12
    keep = inst.max_seconds
    chain = (
        "silenceremove=start_periods=1:start_threshold=-50dB,"
        f"atrim=0:{keep},afade=t=out:st={max(0.0, keep - fade)}:d={fade},"
        f"loudnorm=I=-20:TP=-2:LRA=11,volume={inst.gain}"
    )
    wav = workdir / f"{src.stem}.prepared.wav"  # never the source's own name
    mp3 = workdir / f"{src.stem}.prepared.mp3"
    _ffmpeg(
        [
            "-i",
            str(src),
            "-ac",
            "1",
            "-ar",
            str(SAMPLE_OUT_RATE),
            "-af",
            chain,
            str(wav),
        ]
    )
    _ffmpeg(["-i", str(wav), "-ac", "1", "-b:a", SAMPLE_BITRATE, str(mp3)])
    return wav, mp3


def measure_pitch(wav: Path) -> float:
    """Median pitch (as a MIDI number) over the clearest part of the note."""
    import librosa
    import numpy as np

    y, sr = librosa.load(wav, sr=None, mono=True, duration=1.2)
    f0, voiced, _ = librosa.pyin(
        y, fmin=librosa.note_to_hz("C1"), fmax=librosa.note_to_hz("C8"), sr=sr
    )
    good = f0[voiced & ~np.isnan(f0)]
    if good.size == 0:
        raise SampleError(
            f"{wav.name}: no clear pitch found — mark the instrument pitched: false "
            "or pick another file"
        )
    return float(librosa.hz_to_midi(np.median(good)))


def build(sample_set: SampleSet, cache: Path) -> list[Packed]:
    """Download, prepare and measure every sample in the set."""
    packed = []
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        for inst in sample_set.instruments:
            for path in inst.files:
                src = fetch(inst.library, path, cache)
                wav, mp3 = prepare(src, inst, work)
                midi = off = None
                if inst.pitched:
                    midi = measure_pitch(wav)
                    off = (midi - round(midi)) * 100
                packed.append(Packed(inst.id, path, midi, off, mp3.read_bytes()))
    return packed


def problems(packed: list[Packed]) -> list[str]:
    """Samples whose measured pitch is far from any semitone."""
    return [
        f"{p.instrument}: {Path(p.file).name} measures {note_name(p.midi)} "
        f"{p.off_cents:+.0f} cents"
        for p in packed
        if p.off_cents is not None and abs(p.off_cents) > PITCH_TOLERANCE_CENTS
    ]


def write_js(packed: list[Packed], licence: str, out: Path) -> Path:
    """Write ``samples.js``: a global SAMPLES of {instrument: [{midi, data}]}."""
    table: dict[str, list[dict[str, object]]] = {}
    for p in packed:
        entry: dict[str, object] = {"data": base64.b64encode(p.data).decode("ascii")}
        if p.midi is not None:
            entry["midi"] = round(p.midi, 2)
        table.setdefault(p.instrument, []).append(entry)
    for notes in table.values():
        notes.sort(key=lambda e: e.get("midi", 0))
    out.parent.mkdir(parents=True, exist_ok=True)
    header = (
        "// Generated by `main.py samples` from samples.yaml — do not edit.\n"
        f"// {licence}\n"
        "/* exported SAMPLES */\n"
    )
    out.write_text(
        header + "const SAMPLES = " + json.dumps(table) + "\n", encoding="utf-8"
    )
    return out
