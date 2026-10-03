"""Measure a clip's audio and cut pieces of it.

This is measurement, not listening. It finds the beat grid, the onsets and the
loudness, and cuts clips and spectrograms for a person (or Claude, for the
images) to check. Nothing here is written into research files: rhythm and sound
claims need a listener (see CLAUDE.md).

ffmpeg does the file work (extracting, cutting, spectrograms); librosa does the
measurements and is imported lazily because it is slow to load.

Example:
    analysis = measure(media, breakdown, out_dir)
"""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path

from config import AUDIO_SAMPLE_RATE, FFMPEG_TIMEOUT_S, SPECTROGRAM_SIZE
from schema.breakdown import Breakdown


class AudioError(RuntimeError):
    """A tool is missing or failed; the message says what to do."""


@dataclass
class AudioAnalysis:
    """Measurements of one clip. Times in seconds from the clip's start."""

    duration_s: float
    tempo_bpm: float
    beat_times: list[float]
    onset_times: list[float]
    onset_strengths: list[float]
    frame_times: list[float]
    loudness_db: list[float]


def _ffmpeg(args: list[str]) -> None:
    """Run ffmpeg quietly; raise AudioError with its message on failure."""
    exe = shutil.which("ffmpeg")
    if exe is None:
        raise AudioError("ffmpeg not found — install it with `brew install ffmpeg`.")
    try:
        subprocess.run(
            [exe, "-loglevel", "error", "-y", *args],
            check=True,
            capture_output=True,
            text=True,
            timeout=FFMPEG_TIMEOUT_S,
        )
    except subprocess.CalledProcessError as exc:
        raise AudioError(f"ffmpeg failed: {exc.stderr.strip()}") from exc
    except subprocess.TimeoutExpired as exc:
        raise AudioError(
            f"ffmpeg took over {FFMPEG_TIMEOUT_S} s and was stopped."
        ) from exc


def extract_wav(media: Path, wav: Path) -> Path:
    """Write the media's audio as mono WAV at the analysis rate. Returns wav."""
    if not media.is_file():
        raise AudioError(
            f"{media} not found — download the clip first (PROJECT_PLAN.md)."
        )
    wav.parent.mkdir(parents=True, exist_ok=True)
    _ffmpeg(
        ["-i", str(media), "-vn", "-ac", "1", "-ar", str(AUDIO_SAMPLE_RATE), str(wav)]
    )
    return wav


def analyse(wav: Path) -> AudioAnalysis:
    """Measure tempo, beat grid, onsets and loudness of a WAV file."""
    import librosa
    import numpy as np

    y, sr = librosa.load(wav, sr=AUDIO_SAMPLE_RATE, mono=True)
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
    envelope = librosa.onset.onset_strength(y=y, sr=sr)
    onset_frames = librosa.onset.onset_detect(onset_envelope=envelope, sr=sr)
    rms = librosa.feature.rms(y=y)[0]
    return AudioAnalysis(
        duration_s=round(len(y) / sr, 3),
        tempo_bpm=round(float(np.atleast_1d(tempo)[0]), 1),
        beat_times=[round(float(t), 3) for t in beats],
        onset_times=[
            round(float(t), 3) for t in librosa.frames_to_time(onset_frames, sr=sr)
        ],
        onset_strengths=[round(float(envelope[f]), 3) for f in onset_frames],
        frame_times=[round(float(t), 3) for t in librosa.times_like(rms, sr=sr)],
        loudness_db=[round(float(20 * np.log10(v + 1e-9)), 1) for v in rms],
    )


def cut_clip(media: Path, start_s: float, end_s: float, out: Path) -> Path:
    """Cut [start_s, end_s) of the media's audio to WAV at its own sample rate."""
    out.parent.mkdir(parents=True, exist_ok=True)
    _ffmpeg(
        [
            "-i", str(media),
            "-ss", f"{start_s:.3f}",
            "-to", f"{end_s:.3f}",
            "-vn", str(out),
        ]
    )  # fmt: skip
    return out


def spectrogram(media: Path, start_s: float, end_s: float, out: Path) -> Path:
    """Render a spectrogram PNG of [start_s, end_s) of the media's audio."""
    out.parent.mkdir(parents=True, exist_ok=True)
    _ffmpeg(
        [
            "-ss", f"{start_s:.3f}",
            "-to", f"{end_s:.3f}",
            "-i", str(media),
            "-lavfi", f"showspectrumpic=s={SPECTROGRAM_SIZE}:legend=1",
            str(out),
        ]
    )  # fmt: skip
    return out


def write_analysis(analysis: AudioAnalysis, media: Path, out: Path) -> Path:
    """Save measurements as JSON, with the media they were taken from."""
    data = {
        "media": str(media),
        "note": "Measurements only, not listening.",
        "analysis": asdict(analysis),
    }
    out.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return out


def read_analysis(path: Path) -> tuple[Path, AudioAnalysis]:
    """Load what ``write_analysis`` saved: the media it measured, and the results."""
    data = json.loads(path.read_text(encoding="utf-8"))
    return Path(data["media"]), AudioAnalysis(**data["analysis"])


def measure(media: Path, breakdown: Breakdown, out: Path) -> AudioAnalysis:
    """Measure the clip and write ``analysis.json`` and one spectrogram per
    breakdown beat (``spectrograms/<beat id>.png``) under out. The WAV extracted
    for measuring is deleted afterwards."""
    wav = extract_wav(media, out / "clip.wav")
    try:
        analysis = analyse(wav)
    finally:
        wav.unlink(missing_ok=True)
    for beat in breakdown.beats:
        spectrogram(
            media, beat.start_s, beat.end_s, out / "spectrograms" / f"{beat.id}.png"
        )
    write_analysis(analysis, media, out / "analysis.json")
    return analysis
