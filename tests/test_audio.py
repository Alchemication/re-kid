"""Audio measurements: loop proposals, and a real run on a synthetic click track."""

from __future__ import annotations

import shutil
import wave
from pathlib import Path

import pytest

from audio import (
    AudioAnalysis,
    analyse,
    cut_clip,
    extract_wav,
    propose_loops,
    repeat_clip,
)
from schema.breakdown import Breakdown
from tests.conftest import beat, minimal_breakdown

needs_ffmpeg = pytest.mark.skipif(
    shutil.which("ffmpeg") is None, reason="ffmpeg not installed"
)


def _analysis(
    beat_times: list[float], onsets: list[tuple[float, float]]
) -> AudioAnalysis:
    return AudioAnalysis(
        duration_s=20,
        tempo_bpm=120,
        beat_times=beat_times,
        onset_times=[t for t, _ in onsets],
        onset_strengths=[s for _, s in onsets],
        frame_times=[0.0, 1.0, 2.0],
        loudness_db=[-20.0, -10.0, -30.0],
    )


def _breakdown(*windows: tuple[float, float]) -> Breakdown:
    beats = [beat(f"b{i}", lo, hi) for i, (lo, hi) in enumerate(windows)]
    return Breakdown.model_validate(minimal_breakdown() | {"beats": beats})


class TestProposeLoops:
    grid: tuple[float, ...] = tuple(round(0.5 * i, 2) for i in range(40))  # 120 BPM

    def test_longest_group_that_fits(self) -> None:
        (loop,) = propose_loops(_breakdown((0.0, 5.0)), _analysis(list(self.grid), []))
        assert (loop.loop_start_s, loop.loop_end_s, loop.loop_beats) == (0.0, 4.0, 8)

    def test_falls_back_to_shorter_group(self) -> None:
        (loop,) = propose_loops(_breakdown((0.0, 2.2)), _analysis(list(self.grid), []))
        assert (loop.loop_start_s, loop.loop_end_s, loop.loop_beats) == (0.0, 2.0, 4)

    def test_loop_needs_closing_beat(self) -> None:
        # Exactly 2 grid points is one beat: too short for the smallest group.
        (loop,) = propose_loops(_breakdown((0.0, 0.7)), _analysis(list(self.grid), []))
        assert loop.loop_start_s is None and loop.loop_beats == 0

    def test_loop_stays_inside_window(self) -> None:
        (loop,) = propose_loops(_breakdown((1.2, 4.9)), _analysis(list(self.grid), []))
        assert loop.loop_start_s == 1.5
        assert loop.loop_end_s is not None and loop.loop_end_s <= 4.9

    def test_peak_onset_is_strongest_in_window(self) -> None:
        onsets = [(0.4, 9.0), (1.1, 2.0), (1.6, 5.0), (3.0, 99.0)]
        (loop,) = propose_loops(
            _breakdown((1.0, 2.0)), _analysis(list(self.grid), onsets)
        )
        assert loop.peak_onset_s == 1.6

    def test_no_onsets_or_frames_in_window(self) -> None:
        (loop,) = propose_loops(
            _breakdown((10.0, 10.2)), _analysis(list(self.grid), [])
        )
        assert loop.peak_onset_s is None
        assert loop.mean_loudness_db is None


@needs_ffmpeg
class TestOnRealAudio:
    """Runs ffmpeg and librosa on a generated 120 BPM click track."""

    @pytest.fixture
    def clicks(self, tmp_path: Path) -> Path:
        import numpy as np

        sr = 22_050
        signal = np.zeros(sr * 16, dtype=np.float32)
        # 50 ms decaying noise bursts, like a drum hit: enough for a beat tracker.
        rng = np.random.default_rng(0)
        n = int(0.05 * sr)
        hit = (rng.uniform(-1, 1, n) * np.exp(-np.linspace(0, 8, n))).astype(np.float32)
        for i in range(32):
            start = int(i * 0.5 * sr)
            signal[start : start + n] += 0.8 * hit
        path = tmp_path / "clicks.wav"
        with wave.open(str(path), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes((signal * 32000).astype(np.int16).tobytes())
        return path

    def test_tempo_and_onsets(self, clicks: Path, tmp_path: Path) -> None:
        analysis = analyse(extract_wav(clicks, tmp_path / "out" / "clip.wav"))
        assert analysis.duration_s == pytest.approx(16, abs=0.1)
        assert analysis.tempo_bpm == pytest.approx(120, rel=0.05)
        assert len(analysis.onset_times) >= 28

    def test_cut_and_repeat(self, clicks: Path, tmp_path: Path) -> None:
        clip = cut_clip(clicks, 1.0, 3.0, tmp_path / "loop.wav")
        preview = repeat_clip(clip, tmp_path / "loop-x4.wav")
        with wave.open(str(clip)) as w:
            clip_s = w.getnframes() / w.getframerate()
        with wave.open(str(preview)) as w:
            preview_s = w.getnframes() / w.getframerate()
        assert clip_s == pytest.approx(2.0, abs=0.05)
        assert preview_s == pytest.approx(8.0, abs=0.1)

    def test_missing_media_says_what_to_do(self, tmp_path: Path) -> None:
        from audio import AudioError

        with pytest.raises(AudioError, match="download the clip first"):
            extract_wav(tmp_path / "nope.mp4", tmp_path / "clip.wav")
