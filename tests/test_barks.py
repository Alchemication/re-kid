"""Tests for cutting the marked barks apart and packing them for the games."""

from __future__ import annotations

import base64
import json
from pathlib import Path

import numpy as np
import pytest
import soundfile

from barks import BarkError, build, cut, split, write_js
from config import BARK_PEAK

SR = 22_050


def burst(seconds: float, freq: float = 600.0, level: float = 0.5) -> np.ndarray:
    """A loud tone, standing in for a bark."""
    t = np.arange(int(seconds * SR)) / SR
    return (level * np.sin(2 * np.pi * freq * t)).astype(np.float32)


def silence(seconds: float) -> np.ndarray:
    return np.zeros(int(seconds * SR), dtype=np.float32)


class TestSplit:
    def test_two_barks_with_a_gap(self) -> None:
        y = np.concatenate(
            [silence(0.05), burst(0.18), silence(0.08), burst(0.15), silence(0.1)]
        )
        segments = split(y, SR)
        assert len(segments) == 2
        (a1, b1), (a2, _) = segments
        assert b1 <= a2  # in order, not overlapping
        assert abs(a1 / SR - 0.05) < 0.03
        assert abs(a2 / SR - 0.31) < 0.03

    def test_silence_has_no_barks(self) -> None:
        assert split(silence(0.5), SR) == []

    def test_empty_clip_has_no_barks(self) -> None:
        assert split(np.zeros(0, dtype=np.float32), SR) == []

    def test_short_click_is_not_a_bark(self) -> None:
        y = np.concatenate(
            [silence(0.1), burst(0.2), silence(0.1), burst(0.01), silence(0.1)]
        )
        assert len(split(y, SR)) == 1

    def test_quiet_hum_under_barks_is_not_a_bark(self) -> None:
        y = np.concatenate([burst(0.2), burst(0.2, level=0.02), burst(0.2)])
        assert len(split(y, SR)) == 2


class TestCut:
    def test_each_bark_is_faded_and_scaled(self) -> None:
        y = np.concatenate([silence(0.05), burst(0.2, level=0.3), silence(0.05)])
        (bark,) = cut(y, SR, split(y, SR))
        assert abs(np.abs(bark).max() - BARK_PEAK) < 1e-3
        assert abs(bark[0]) < 1e-3 and abs(bark[-1]) < 1e-3

    def test_source_is_left_alone(self) -> None:
        y = burst(0.2, level=0.3)
        before = y.copy()
        cut(y, SR, [(0, len(y))])
        assert np.array_equal(y, before)


class TestWriteJs:
    def test_round_trip(self, tmp_path: Path) -> None:
        wav = tmp_path / "x.wav"
        soundfile.write(wav, burst(0.1), SR)
        out = write_js([wav.read_bytes()], tmp_path / "audio" / "barks.js")
        text = out.read_text()
        assert "/* exported BARKS */" in text
        data = json.loads(text.split("const BARKS = ", 1)[1])
        assert base64.b64decode(data[0])[:4] == b"RIFF"


class TestBuild:
    def test_packs_the_barks(self, tmp_path: Path) -> None:
        clip = tmp_path / "bark.wav"
        soundfile.write(
            clip, np.concatenate([burst(0.18), silence(0.08), burst(0.15)]), SR
        )
        assert build(clip, tmp_path / "barks.js") == 2
        assert (tmp_path / "barks.js").is_file()

    def test_missing_clip_says_what_to_do(self, tmp_path: Path) -> None:
        with pytest.raises(BarkError, match="main.py mark"):
            build(tmp_path / "bark.wav", tmp_path / "barks.js")

    def test_silent_clip_is_an_error(self, tmp_path: Path) -> None:
        clip = tmp_path / "bark.wav"
        soundfile.write(clip, silence(0.5), SR)
        with pytest.raises(BarkError, match="No bark"):
            build(clip, tmp_path / "barks.js")
        assert not (tmp_path / "barks.js").exists()
