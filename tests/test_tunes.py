"""Recorded music: the tunes.yaml schema, each game's picks, and packing."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest
from pydantic import ValidationError

from config import EFFECT_OUT_RATE, TUNE_LOUDNESS_DB, TUNE_MAX_SECONDS
from samples import SampleError
from schema.tunes import Tune, TuneSet
from tunes import Packed, build, write_js
from worlds import load_model

ROOT = Path(__file__).resolve().parents[1]
GAMES = [ROOT / "worlds/reksio/games/yard", ROOT / "worlds/krtek/games/meadow"]

needs_ffmpeg = pytest.mark.skipif(
    shutil.which("ffmpeg") is None, reason="ffmpeg not installed"
)


def _tune(**extra: object) -> dict:
    data = {
        "id": "phrase",
        "takes": [{"file": "phrase/01.mp3", "prompt": "a tune", "model": "music_v1"}],
    }
    data.update(extra)
    return data


class TestSchema:
    def test_valid(self) -> None:
        TuneSet.model_validate({"source": "made", "tunes": [_tune()]})

    def test_part_listed_twice(self) -> None:
        with pytest.raises(ValidationError, match="parts listed twice"):
            TuneSet.model_validate({"source": "made", "tunes": [_tune(), _tune()]})

    def test_take_listed_twice(self) -> None:
        take = {"file": "a.mp3", "prompt": "p", "model": "m"}
        with pytest.raises(ValidationError, match="takes listed twice"):
            Tune.model_validate(_tune(takes=[take, take]))

    def test_needs_a_take(self) -> None:
        with pytest.raises(ValidationError):
            Tune.model_validate(_tune(takes=[]))

    def test_only_parts_music_js_plays(self) -> None:
        """A misspelt part would pack takes the game never plays."""
        with pytest.raises(ValidationError):
            Tune.model_validate(_tune(id="evening"))

    def test_take_says_its_model(self) -> None:
        with pytest.raises(ValidationError):
            Tune.model_validate(_tune(takes=[{"file": "a.mp3", "prompt": "p"}]))


@pytest.mark.parametrize("game", GAMES, ids=[g.name for g in GAMES])
class TestGameTunes:
    """A game's tunes.yaml against its tunes/ folder, music.js and tunes.js."""

    @pytest.fixture
    def tunes(self, game: Path) -> TuneSet:
        return load_model(game / "tunes.yaml", TuneSet)

    def test_every_take_is_there(self, game: Path, tunes: TuneSet) -> None:
        missing = [
            t.file
            for tune in tunes.tunes
            for t in tune.takes
            if not (game / "tunes" / t.file).is_file()
        ]
        assert not missing, f"listed in tunes.yaml but not in tunes/: {missing}"

    def test_no_take_left_unlisted(self, game: Path, tunes: TuneSet) -> None:
        listed = {t.file for tune in tunes.tunes for t in tune.takes}
        found = {
            str(p.relative_to(game / "tunes")) for p in (game / "tunes").rglob("*.mp3")
        }
        assert found <= listed, f"in tunes/ but not in tunes.yaml: {found - listed}"

    def test_every_part_is_one_music_js_plays(self, game: Path, tunes: TuneSet) -> None:
        text = (game / "game/music.js").read_text()
        known = set(
            re.findall(
                r"'(\w+)'", re.search(r"const PARTS = \[([^\]]*)\]", text).group(1)
            )
        )
        unknown = [t.id for t in tunes.tunes if t.id not in known]
        assert not unknown, f"parts music.js doesn't play: {unknown}"

    def test_packed_script_is_up_to_date(self, game: Path, tunes: TuneSet) -> None:
        """tunes.js holds exactly the listed parts and takes: rebuild it with
        `main.py tunes` after changing tunes.yaml."""
        text = (game / "game/tunes.js").read_text()
        table = json.loads(text.split("const TUNES = ", 1)[1])
        assert {k: len(v) for k, v in table.items()} == {
            t.id: len(t.takes) for t in tunes.tunes
        }


def _tone(path: Path, seconds: float) -> None:
    """A steady stereo tone, as a take that stops dead at its end."""
    subprocess.run(
        [
            "ffmpeg",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=440:duration={seconds}:sample_rate=44100",
            "-af",
            "volume=0.1,aformat=channel_layouts=stereo",
            str(path),
        ],
        check=True,
    )


def _probe(path: Path) -> dict:
    out = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=channels,sample_rate:format=duration",
            "-of",
            "json",
            str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    data = json.loads(out.stdout)
    return {**data["streams"][0], "duration": float(data["format"]["duration"])}


def _mean_db(path: Path, start: float = 0.0, length: float = 99.0) -> float:
    """Mean loudness of part of a file, as it is."""
    err = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-ss",
            str(start),
            "-t",
            str(length),
            "-i",
            str(path),
            "-af",
            "volumedetect",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
        check=True,
    ).stderr
    return float(re.search(r"mean_volume: (-?[\d.]+) dB", err).group(1))


def _set(file: str) -> TuneSet:
    return TuneSet.model_validate(
        {
            "source": "test",
            "tunes": [
                {
                    "id": "phrase",
                    "takes": [{"file": file, "prompt": "p", "model": "m"}],
                }
            ],
        }
    )


@needs_ffmpeg
class TestPacking:
    def test_takes_are_mono_retro_level_and_fade_out(self, tmp_path: Path) -> None:
        _tone(tmp_path / "a.mp3", 4.0)
        [packed] = build(_set("a.mp3"), tmp_path)
        out = tmp_path / "out.mp3"
        out.write_bytes(packed.data)
        info = _probe(out)
        assert info["channels"] == 1
        assert int(info["sample_rate"]) == EFFECT_OUT_RATE
        assert abs(info["duration"] - 4.0) < 0.15, "the take kept its length"
        assert abs(_mean_db(out, 0.5, 1.0) - TUNE_LOUDNESS_DB) < 2.5
        assert _mean_db(out, 3.8, 0.2) < _mean_db(out, 1.0, 1.0) - 10, (
            "the end did not fade out"
        )

    def test_long_take_is_cut(self, tmp_path: Path) -> None:
        _tone(tmp_path / "a.mp3", TUNE_MAX_SECONDS + 3)
        [packed] = build(_set("a.mp3"), tmp_path)
        out = tmp_path / "out.mp3"
        out.write_bytes(packed.data)
        assert _probe(out)["duration"] < TUNE_MAX_SECONDS + 0.2

    def test_missing_take_says_which(self, tmp_path: Path) -> None:
        with pytest.raises(SampleError, match="b.mp3"):
            build(_set("b.mp3"), tmp_path)


class TestScript:
    def test_tunes_js_shape(self, tmp_path: Path) -> None:
        tune_set = TuneSet.model_validate(
            {"source": "Made for a test.", "tunes": [_tune()]}
        )
        out = write_js(
            [
                Packed("phrase", "phrase/01.mp3", 3.0, b"ab"),
                Packed("phrase", "phrase/02.mp3", 0.0, b"cd"),
            ],
            tune_set,
            tmp_path / "tunes.js",
        )
        text = out.read_text()
        assert "/* exported TUNES */" in text and "Made for a test." in text
        assert json.loads(text.split("const TUNES = ", 1)[1]) == {
            "phrase": ["YWI=", "Y2Q="]
        }
