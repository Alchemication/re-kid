"""Recorded effects: the effects.yaml schema, the yard's picks, and packing."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest
from pydantic import ValidationError

from config import EFFECT_LOUDNESS_DB, EFFECT_OUT_RATE, EFFECT_PEAK_DB
from effects import Packed, build, level_gain, write_js
from samples import SampleError
from schema.effects import Effect, EffectSet
from worlds import load_model

ROOT = Path(__file__).resolve().parents[1]
YARD = ROOT / "worlds/reksio/games/yard"

needs_ffmpeg = pytest.mark.skipif(
    shutil.which("ffmpeg") is None, reason="ffmpeg not installed"
)


def _effect(**extra: object) -> dict:
    data = {"id": "splash", "takes": [{"file": "splash/01.mp3", "prompt": "a splash"}]}
    data.update(extra)
    return data


class TestSchema:
    def test_valid(self) -> None:
        EffectSet.model_validate({"source": "made", "effects": [_effect()]})

    def test_sound_listed_twice(self) -> None:
        with pytest.raises(ValidationError, match="sounds listed twice"):
            EffectSet.model_validate(
                {"source": "made", "effects": [_effect(), _effect()]}
            )

    def test_take_listed_twice(self) -> None:
        take = {"file": "a.mp3", "prompt": "p"}
        with pytest.raises(ValidationError, match="takes listed twice"):
            Effect.model_validate(_effect(takes=[take, take]))

    def test_needs_a_take(self) -> None:
        with pytest.raises(ValidationError):
            Effect.model_validate(_effect(takes=[]))

    def test_id_is_a_sound_name(self) -> None:
        with pytest.raises(ValidationError):
            Effect.model_validate(_effect(id="Splash-1"))

    def test_steady_has_one_take(self) -> None:
        two = [
            {"file": "splash/01.mp3", "prompt": "a"},
            {"file": "splash/02.mp3", "prompt": "b"},
        ]
        with pytest.raises(ValidationError, match="a steady sound plays one take"):
            Effect.model_validate(_effect(steady=True, takes=two))
        Effect.model_validate(_effect(steady=True))

    def test_gain_positive(self) -> None:
        with pytest.raises(ValidationError):
            Effect.model_validate(_effect(gain=0))


class TestYardEffects:
    """The yard's picks: valid, every take there, every sound one sound.js has."""

    @pytest.fixture
    def effects(self) -> EffectSet:
        return load_model(YARD / "effects.yaml", EffectSet)

    def test_every_take_is_there(self, effects: EffectSet) -> None:
        missing = [
            t.file
            for e in effects.effects
            for t in e.takes
            if not (YARD / "effects" / t.file).is_file()
        ]
        assert not missing

    def test_no_take_left_unlisted(self, effects: EffectSet) -> None:
        listed = {t.file for e in effects.effects for t in e.takes}
        on_disk = {
            str(p.relative_to(YARD / "effects"))
            for p in (YARD / "effects").rglob("*.mp3")
        }
        assert on_disk == listed, "a take on disk the game never plays, or listed twice"

    def test_every_sound_is_one_sound_js_has(self, effects: EffectSet) -> None:
        """A misspelt id would pack takes the game never plays."""
        text = (YARD / "game/sound.js").read_text()
        names = set(
            re.findall(r"^    (?:/\*\*.*\*/\s*)?([a-z][a-zA-Z]*)\(", text, re.MULTILINE)
        )
        voice = re.search(r"HIS_VOICE = \[([^\]]+)\]", text).group(1)
        names |= set(re.findall(r"'(\w+)'", voice))
        unknown = [e.id for e in effects.effects if e.id not in names]
        assert not unknown, f"not sounds in sound.js: {unknown}"

    def test_packed_script_is_up_to_date(self, effects: EffectSet) -> None:
        """effects.js holds exactly the listed sounds and takes: rebuild it with
        `main.py effects` after changing effects.yaml."""
        text = (YARD / "game/effects.js").read_text()
        table = json.loads(text.split("const EFFECTS = ", 1)[1])
        assert {k: len(v["takes"]) for k, v in table.items()} == {
            e.id: len(e.takes) for e in effects.effects
        }
        assert {k: v["gain"] for k, v in table.items()} == {
            e.id: e.gain for e in effects.effects
        }


class TestLevelling:
    def test_quiet_take_brought_up_to_the_target(self) -> None:
        assert level_gain(mean=-30.0, peak=-20.0) == pytest.approx(
            EFFECT_LOUDNESS_DB + 30
        )

    def test_sharp_take_stops_at_its_peak(self) -> None:
        """A bonk: its peak would clip before its mean reached the target."""
        gain = level_gain(mean=-30.0, peak=-3.0)
        assert gain == pytest.approx(EFFECT_PEAK_DB + 3)
        assert gain < EFFECT_LOUDNESS_DB + 30


def _tone(path: Path, seconds: float = 1.0, silence: float = 0.3) -> None:
    """A stereo tone after `silence` seconds of nothing, as a take might start."""
    subprocess.run(
        [
            "ffmpeg",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"anullsrc=r=44100:cl=stereo:d={silence}",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=440:duration={seconds}:sample_rate=44100",
            "-filter_complex",
            "[1]volume=0.5,aformat=channel_layouts=stereo[t];[0][t]concat=n=2:v=0:a=1",
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


def _mean_db(path: Path) -> float:
    """Mean loudness of a file as it is (not through the recipe again)."""
    err = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
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


@needs_ffmpeg
class TestPacking:
    def test_takes_are_trimmed_mono_retro_and_level(self, tmp_path: Path) -> None:
        (tmp_path / "boing").mkdir()
        _tone(tmp_path / "boing/01.mp3")
        effect_set = EffectSet.model_validate(
            {
                "source": "test",
                "effects": [
                    {"id": "boing", "takes": [{"file": "boing/01.mp3", "prompt": "p"}]}
                ],
            }
        )
        [packed] = build(effect_set, tmp_path)
        out = tmp_path / "out.mp3"
        out.write_bytes(packed.data)
        info = _probe(out)
        assert info["channels"] == 1
        assert int(info["sample_rate"]) == EFFECT_OUT_RATE
        assert info["duration"] < 1.15, "the silence at the start was kept"
        mean = _mean_db(out)
        assert abs(mean - EFFECT_LOUDNESS_DB) < 2.5
        assert packed.gain_db > 0, "a quiet take is brought up"

    def test_missing_take_says_which(self, tmp_path: Path) -> None:
        effect_set = EffectSet.model_validate({"source": "t", "effects": [_effect()]})
        with pytest.raises(SampleError, match="splash/01.mp3"):
            build(effect_set, tmp_path)


class TestScript:
    def test_effects_js_shape(self, tmp_path: Path) -> None:
        effect_set = EffectSet.model_validate(
            {"source": "Made for a test.", "effects": [_effect(gain=0.5)]}
        )
        out = write_js(
            [
                Packed("splash", "splash/01.mp3", 3.0, b"ab"),
                Packed("splash", "x.mp3", 0.0, b"cd"),
            ],
            effect_set,
            tmp_path / "effects.js",
        )
        text = out.read_text()
        assert "/* exported EFFECTS */" in text and "Made for a test." in text
        table = json.loads(text.split("const EFFECTS = ", 1)[1])
        assert table == {"splash": {"gain": 0.5, "takes": ["YWI=", "Y2Q="]}}

    def test_a_steady_sound_says_so(self, tmp_path: Path) -> None:
        effect_set = EffectSet.model_validate(
            {"source": "Made for a test.", "effects": [_effect(steady=True)]}
        )
        out = write_js(
            [Packed("splash", "splash/01.mp3", 0.0, b"ab")],
            effect_set,
            tmp_path / "e.js",
        )
        table = json.loads(out.read_text().split("const EFFECTS = ", 1)[1])
        assert table == {"splash": {"gain": 1.0, "steady": True, "takes": ["YWI="]}}
