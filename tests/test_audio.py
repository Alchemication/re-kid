"""Audio measurements, run for real on a synthetic click track."""

from __future__ import annotations

import shutil
import wave
from pathlib import Path

import pytest

from audio import analyse, cut_clip, extract_wav, measure, read_analysis
from schema.breakdown import Breakdown
from tests.conftest import beat, minimal_breakdown

needs_ffmpeg = pytest.mark.skipif(
    shutil.which("ffmpeg") is None, reason="ffmpeg not installed"
)


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

    def test_cut(self, clicks: Path, tmp_path: Path) -> None:
        clip = cut_clip(clicks, 1.0, 3.0, tmp_path / "piece.wav")
        with wave.open(str(clip)) as w:
            assert w.getnframes() / w.getframerate() == pytest.approx(2.0, abs=0.05)

    def test_measure_writes_analysis_and_spectrograms(
        self, clicks: Path, tmp_path: Path
    ) -> None:
        beats = [beat("first", 0, 4), beat("second", 4, 8)]
        breakdown = Breakdown.model_validate(minimal_breakdown() | {"beats": beats})
        analysis = measure(clicks, breakdown, tmp_path / "out")
        media, loaded = read_analysis(tmp_path / "out" / "analysis.json")
        assert (media, loaded) == (clicks, analysis)
        assert (tmp_path / "out" / "spectrograms" / "first.png").is_file()
        assert (tmp_path / "out" / "spectrograms" / "second.png").is_file()

    def test_missing_media_says_what_to_do(self, tmp_path: Path) -> None:
        from audio import AudioError

        with pytest.raises(AudioError, match="download the clip first"):
            extract_wav(tmp_path / "nope.mp4", tmp_path / "clip.wav")
