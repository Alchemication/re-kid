"""Pack a game's recorded sound effects into one script the page can load from disk.

Reads the game's ``effects.yaml`` and the takes in its ``effects/`` folder,
and for each take: trims the silence at the start (so a sound lands with what
makes it), makes it mono, rolls off the lows and highs and adds a touch of
saturation (the retro recipe Adam picked by ear), brings it to one loudness
and encodes a small MP3. Everything goes into ``effects.js`` as base64, as
``samples.js``: browsers won't load audio files into Web Audio from a
``file://`` page.

Example:
    packed = build(effect_set, game_dir / "effects")
    write_js(packed, effect_set.source, game_dir / "game/effects.js")
"""

from __future__ import annotations

import base64
import json
import re
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from config import (
    EFFECT_BITRATE,
    EFFECT_HIGHPASS_HZ,
    EFFECT_LOUDNESS_DB,
    EFFECT_LOWPASS_HZ,
    EFFECT_MAX_SECONDS,
    EFFECT_OUT_RATE,
    EFFECT_PEAK_DB,
    EFFECT_SATURATION,
)
from samples import SampleError, run_ffmpeg
from schema.effects import EffectSet

FADE_S = 0.08  # the fade where a too-long take is cut


@dataclass
class Packed:
    """One packed take, as the game sees it."""

    effect: str
    file: str
    gain_db: float  # what levelling did to it
    data: bytes


def retro() -> list[str]:
    """The retro recipe's ffmpeg filters (mono, the lows and highs rolled off,
    a touch of saturation), shared by the game's effects and its music."""
    return [
        "aformat=channel_layouts=mono",
        f"highpass=f={EFFECT_HIGHPASS_HZ}",
        f"lowpass=f={EFFECT_LOWPASS_HZ}",
        f"asoftclip=type=tanh:param={EFFECT_SATURATION}",
    ]


def recipe() -> str:
    """The ffmpeg filters every effect take goes through before levelling."""
    keep = EFFECT_MAX_SECONDS
    return ",".join(
        [
            "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.01",
            f"atrim=0:{keep}",
            f"afade=t=out:st={keep - FADE_S}:d={FADE_S}",
            *retro(),
        ]
    )


def levels(src: Path, chain: str) -> tuple[float, float]:
    """Mean and peak loudness (dB) of a take after the filters in ``chain``."""
    try:
        done = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-i",
                str(src),
                "-af",
                f"{chain},volumedetect",
                "-f",
                "null",
                "-",
            ],
            capture_output=True,
            text=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise SampleError(
            f"could not measure {src.name}: {exc} — is ffmpeg installed?"
        ) from exc
    mean = re.search(r"mean_volume: (-?[\d.]+) dB", done.stderr)
    peak = re.search(r"max_volume: (-?[\d.]+) dB", done.stderr)
    if not (mean and peak):
        raise SampleError(
            f"{src.name}: no sound left after trimming — pick another take"
        )
    return float(mean.group(1)), float(peak.group(1))


def level_gain(mean: float, peak: float, target: float = EFFECT_LOUDNESS_DB) -> float:
    """dB to bring a take to the ``target`` loudness without its peak clipping."""
    return min(target - mean, EFFECT_PEAK_DB - peak)


def prepare(
    src: Path, out: Path, chain: str, target: float = EFFECT_LOUDNESS_DB
) -> float:
    """Write the game's version of one take to ``out`` (the filters in
    ``chain``, then levelled to ``target``); the gain it was given (dB)."""
    gain = level_gain(*levels(src, chain), target)
    run_ffmpeg(
        [
            "-i",
            str(src),
            "-af",
            f"{chain},volume={gain:.2f}dB",
            "-ar",
            str(EFFECT_OUT_RATE),
            "-b:a",
            EFFECT_BITRATE,
            str(out),
        ]
    )
    return gain


def build(effect_set: EffectSet, folder: Path) -> list[Packed]:
    """Prepare every take in the set, read from ``folder``."""
    missing = [
        t.file
        for e in effect_set.effects
        for t in e.takes
        if not (folder / t.file).is_file()
    ]
    if missing:
        raise SampleError(
            f"takes not found in {folder}: {missing} — check effects.yaml"
        )
    packed = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, (effect, take) in enumerate(
            (e, t) for e in effect_set.effects for t in e.takes
        ):
            out = Path(tmp) / f"{i}.mp3"
            gain = prepare(folder / take.file, out, recipe())
            packed.append(Packed(effect.id, take.file, gain, out.read_bytes()))
    return packed


def write_js(packed: list[Packed], effect_set: EffectSet, out: Path) -> Path:
    """Write ``effects.js``: a global EFFECTS of {sound: {gain, steady?,
    overlaps?, takes: [base64 mp3]}} (steady and overlaps only where set)."""
    effects = {e.id: e for e in effect_set.effects}
    table: dict[str, dict[str, object]] = {}
    for p in packed:
        e = effects[p.effect]
        entry = table.setdefault(
            p.effect,
            {
                "gain": e.gain,
                **({"steady": True} if e.steady else {}),
                **({"overlaps": True} if e.overlaps else {}),
                "takes": [],
            },
        )
        entry["takes"].append(base64.b64encode(p.data).decode("ascii"))
    out.parent.mkdir(parents=True, exist_ok=True)
    header = (
        "// Generated by `main.py effects` from effects.yaml — do not edit.\n"
        f"// {effect_set.source}\n"
        "/* exported EFFECTS */\n"
    )
    out.write_text(
        header + "const EFFECTS = " + json.dumps(table) + "\n", encoding="utf-8"
    )
    return out
