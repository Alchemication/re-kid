"""Measure a clip's audio against a breakdown, and cut candidate loops.

This is measurement, not listening. It finds the beat grid, the onsets and the
loudness, lines them up with a breakdown's beats, and proposes one loop per beat
as a whole number of detected beats. Its output is a set of numbers and
audio/image files for a person to check by ear. Nothing here is written into
research files: rhythm and sound claims need a listener (see CLAUDE.md).

ffmpeg does the file work (extracting, cutting, spectrograms); librosa does the
measurements and is imported lazily because it is slow to load.

Example:
    analysis = analyse(extract_wav(media, out_dir / "clip.wav"))
    loops = propose_loops(breakdown, analysis)
"""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path

from config import (
    AUDIO_SAMPLE_RATE,
    FFMPEG_TIMEOUT_S,
    LOOP_BEAT_COUNTS,
    LOOP_PREVIEW_REPEATS,
    SPECTROGRAM_SIZE,
)
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


@dataclass
class LoopProposal:
    """A suggested loop for one breakdown beat, snapped to the beat grid."""

    beat_id: str
    window_start_s: float
    window_end_s: float
    loop_start_s: float | None
    loop_end_s: float | None
    loop_beats: int
    peak_onset_s: float | None
    mean_loudness_db: float | None


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


def propose_loops(breakdown: Breakdown, analysis: AudioAnalysis) -> list[LoopProposal]:
    """One loop per breakdown beat: the longest whole group of detected beats
    (from ``LOOP_BEAT_COUNTS``) that fits inside the beat's window."""
    proposals = []
    for beat in breakdown.beats:
        lo, hi = beat.start_s, beat.end_s
        grid = [t for t in analysis.beat_times if lo <= t <= hi]
        start = end = None
        count = 0
        for n in LOOP_BEAT_COUNTS:
            if len(grid) > n:  # n beats need n + 1 grid points to close the loop
                start, end, count = grid[0], grid[n], n
                break
        window_onsets = [
            (s, t)
            for t, s in zip(analysis.onset_times, analysis.onset_strengths, strict=True)
            if lo <= t <= hi
        ]
        levels = [
            db
            for t, db in zip(analysis.frame_times, analysis.loudness_db, strict=True)
            if lo <= t <= hi
        ]
        proposals.append(
            LoopProposal(
                beat_id=beat.id,
                window_start_s=lo,
                window_end_s=hi,
                loop_start_s=start,
                loop_end_s=end,
                loop_beats=count,
                peak_onset_s=max(window_onsets)[1] if window_onsets else None,
                mean_loudness_db=round(sum(levels) / len(levels), 1)
                if levels
                else None,
            )
        )
    return proposals


def cut_clip(media: Path, start_s: float, end_s: float, out: Path) -> Path:
    """Cut [start_s, end_s) of the media's audio to WAV at its own sample rate."""
    out.parent.mkdir(parents=True, exist_ok=True)
    _ffmpeg(
        [
            "-i",
            str(media),
            "-ss",
            f"{start_s:.3f}",
            "-to",
            f"{end_s:.3f}",
            "-vn",
            str(out),
        ]
    )
    return out


def repeat_clip(clip: Path, out: Path) -> Path:
    """Write ``clip`` played ``LOOP_PREVIEW_REPEATS`` times back to back."""
    out.parent.mkdir(parents=True, exist_ok=True)
    _ffmpeg(["-stream_loop", str(LOOP_PREVIEW_REPEATS - 1), "-i", str(clip), str(out)])
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


def write_report(
    analysis: AudioAnalysis, loops: list[LoopProposal], media: Path, out: Path
) -> Path:
    """Save measurements and loop proposals as JSON, marked as unheard."""
    data = {
        "media": str(media),
        "note": "Measurements only. Nobody has listened to these loops yet.",
        "analysis": asdict(analysis),
        "loops": [asdict(p) for p in loops],
    }
    out.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return out


def read_report(path: Path) -> tuple[Path, AudioAnalysis, list[LoopProposal]]:
    """Load what ``write_report`` saved: the media it measured, and the results."""
    data = json.loads(path.read_text(encoding="utf-8"))
    return (
        Path(data["media"]),
        AudioAnalysis(**data["analysis"]),
        [LoopProposal(**p) for p in data["loops"]],
    )


def loop_paths(out: Path, beat_id: str) -> tuple[Path, Path]:
    """Where a beat's loop WAV and its repeated preview live under ``out``."""
    return out / "loops" / f"{beat_id}.wav", out / "previews" / f"{beat_id}-x4.wav"


def render_loop(
    media: Path, start_s: float, end_s: float, out: Path, beat_id: str
) -> Path:
    """Cut one loop and its preview. Returns the preview path."""
    loop, preview = loop_paths(out, beat_id)
    return repeat_clip(cut_clip(media, start_s, end_s, loop), preview)


def prepare(
    media: Path, breakdown: Breakdown, out: Path
) -> tuple[AudioAnalysis, list[LoopProposal]]:
    """Measure the clip, propose loops, and write every output file under ``out``:
    ``clip.wav``, ``analysis.json``, ``loops/``, ``previews/``, ``spectrograms/``."""
    analysis = analyse(extract_wav(media, out / "clip.wav"))
    loops = propose_loops(breakdown, analysis)
    for loop in loops:
        spectrogram(
            media,
            loop.window_start_s,
            loop.window_end_s,
            out / "spectrograms" / f"{loop.beat_id}.png",
        )
        if loop.loop_start_s is not None and loop.loop_end_s is not None:
            render_loop(media, loop.loop_start_s, loop.loop_end_s, out, loop.beat_id)
    write_report(analysis, loops, media, out / "analysis.json")
    return analysis, loops
