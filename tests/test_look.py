"""``main.py look``: the page it opens, its arguments, and a short look in
Chrome (browser-marked)."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import pytest

import commands
from config import LOOK_CLOSE
from look import LookError, close_clip, look_game, look_url, parse_size

ROOT = Path(__file__).resolve().parent.parent


def flags(url: str) -> dict[str, list[str]]:
    return parse_qs(urlsplit(url).query, keep_blank_values=True)


class TestLookUrl:
    def test_opens_the_seeded_still_play(self) -> None:
        q = flags(look_url("reksio", "yard"))
        assert q["seed"] == ["1"] and "still" in q and q["rain"] == ["0"]

    def test_a_flag_given_replaces_the_default_not_sits_beside_it(self) -> None:
        q = flags(look_url("reksio", "yard", "rain=1&rain-at=3&props=bowl"))
        assert q["rain"] == ["1"], (
            "the game reads the first rain: two would hide this one"
        )
        assert q["rain-at"] == ["3"] and q["props"] == ["bowl"]

    def test_a_leading_question_mark_is_fine(self) -> None:
        assert flags(look_url("reksio", "yard", "?seed=7"))["seed"] == ["7"]

    def test_says_what_to_do_about_an_unknown_game(self) -> None:
        with pytest.raises(LookError, match="main.py list"):
            look_url("reksio", "nope")

    def test_each_game_opens_its_own_play(self) -> None:
        q = flags(look_url("krtek", "meadow"))
        assert q["seed"] == ["1"] and "still" in q and "rain" not in q

    def test_says_what_to_do_about_a_game_it_doesnt_know(self) -> None:
        with pytest.raises(LookError, match="LOOK_GAMES"):
            look_game("nope")


class TestParseSize:
    def test_reads_width_and_height(self) -> None:
        assert parse_size("844x390") == (844, 390)
        assert parse_size("844X390") == (844, 390)

    @pytest.mark.parametrize("bad", ["844", "wide", "0x390", "844x-1", "1x2x3"])
    def test_rejects_anything_else(self, bad: str) -> None:
        with pytest.raises(LookError, match="WIDTHxHEIGHT|positive"):
            parse_size(bad)


class TestCloseClip:
    def test_centres_on_him(self) -> None:
        clip = close_clip({"x": 600, "y": 400, "width": 80, "height": 200}, (1280, 720))
        assert (clip["width"], clip["height"]) == LOOK_CLOSE
        assert clip["x"] + clip["width"] / 2 == 640

    @pytest.mark.parametrize("x", [-200, 0, 1250, 2000])
    def test_stays_inside_the_page(self, x: int) -> None:
        clip = close_clip({"x": x, "y": 650, "width": 80, "height": 200}, (1280, 720))
        assert 0 <= clip["x"] <= 1280 - clip["width"]
        assert 0 <= clip["y"] <= 720 - clip["height"]

    def test_never_bigger_than_a_small_page(self) -> None:
        clip = close_clip({"x": 100, "y": 100, "width": 40, "height": 90}, (400, 200))
        assert clip["width"] <= 400 and clip["height"] <= 200


class TestCmdLook:
    def test_needs_something_to_look_at(self, caplog: pytest.LogCaptureFixture) -> None:
        args = argparse.Namespace(
            world="reksio", game="yard", flags="", before=[], watch=None, seconds=None,
            every=350, size="1280x720", close=False, out=None,
        )  # fmt: skip
        assert commands.cmd_look(args) == 1
        assert "--watch" in caplog.text and "--for" in caplog.text


def run_look(
    out: Path, *args: str, game: tuple[str, ...] = ("reksio",)
) -> subprocess.CompletedProcess:
    """`main.py look` in its own process: the browser tests' session already
    holds Playwright, and a second one can't start alongside it."""
    return subprocess.run(
        [sys.executable, str(ROOT / "main.py"), "look", *game, "--out", str(out),
         "--size", "800x450", "--every", "150", *args],
        capture_output=True, text=True, timeout=120, check=False,
    )  # fmt: skip


@pytest.mark.browser
class TestLookInChrome:
    def test_photographs_a_gesture_until_it_ends(self, tmp_path: Path) -> None:
        run = run_look(
            tmp_path,
            "--close",
            "--before",
            "Reksio.sniff(1)",
            "--watch",
            "Reksio.hop(40, 1)",
        )
        assert run.returncode == 0, run.stdout + run.stderr
        record = json.loads((tmp_path / "look.json").read_text())
        assert record["ended"] and not record["failed"] and not record["errors"]
        assert len(record["frames"]) >= 2
        assert all(
            (tmp_path / "frames" / f["file"]).is_file() for f in record["frames"]
        )
        assert [f["t"] for f in record["frames"]] == sorted(
            f["t"] for f in record["frames"]
        )
        assert record["state"]["reksio"]["pose"] == "stand"

    def test_reports_a_step_that_throws(self, tmp_path: Path) -> None:
        run = run_look(tmp_path, "--watch", "Promise.reject(new Error('no such gag'))")
        assert run.returncode == 1
        assert "no such gag" in run.stdout

    def test_says_what_to_do_about_a_broken_setup_step(self, tmp_path: Path) -> None:
        run = run_look(tmp_path, "--before", "yardGame.nope()", "--for", "1")
        assert run.returncode == 1
        assert "browser console" in run.stderr

    def test_wakes_the_mole_and_waits_until_he_is_free(self, tmp_path: Path) -> None:
        run = run_look(
            tmp_path, "--close", "--watch", "meadowGame.perform('sniff')",
            game=("krtek", "meadow"),
        )  # fmt: skip
        assert run.returncode == 0, run.stdout + run.stderr
        record = json.loads((tmp_path / "look.json").read_text())
        assert record["ended"] and not record["failed"] and not record["errors"]
        assert len(record["frames"]) >= 4, "a sniff takes seconds: it waited for him"
        assert record["state"]["awake"] and not record["state"]["busy"]
