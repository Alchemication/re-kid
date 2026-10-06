"""Reading bug reports for ``main.py replay`` (the replay itself runs in the
browser tests)."""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

import replay
from config import BUG_REPORT_VERSION
from replay import ReplayError

GAME = (
    Path(__file__).resolve().parent.parent / "worlds/reksio/games/yard/game/index.html"
)


def report(**overrides: object) -> dict:
    """The smallest report that loads."""
    data = {
        "version": BUG_REPORT_VERSION,
        "description": "he froze",
        "at": 5000,
        "seed": 3,
        "replayUrl": f"{GAME.as_uri()}?props=trap&seed=3",
        "viewport": {"width": 1280, "height": 720},
        "inputs": [{"t": 1000, "intent": "go to trap"}],
        "state": {"busy": False},
    }
    data.update(overrides)
    return data


def write(tmp_path: Path, data: dict, name: str = "yard-bug-1.json") -> Path:
    path = tmp_path / name
    path.write_text(json.dumps(data))
    return path


class TestLoadReport:
    def test_loads_a_good_report(self, tmp_path: Path) -> None:
        assert replay.load_report(write(tmp_path, report()))["seed"] == 3

    def test_rejects_another_version(self, tmp_path: Path) -> None:
        with pytest.raises(ReplayError, match="Save a new report"):
            replay.load_report(write(tmp_path, report(version=BUG_REPORT_VERSION + 1)))

    def test_rejects_missing_inputs(self, tmp_path: Path) -> None:
        data = report()
        del data["inputs"]
        with pytest.raises(ReplayError, match="'inputs'"):
            replay.load_report(write(tmp_path, data))

    def test_rejects_broken_json(self, tmp_path: Path) -> None:
        path = tmp_path / "yard-bug-1.json"
        path.write_text("{nope")
        with pytest.raises(ReplayError, match="Can't read"):
            replay.load_report(path)

    def test_loads_a_report_saved_on_the_site(self, tmp_path: Path) -> None:
        url = "https://alchemication.github.io/re-kid/reksio/yard/?seed=3"
        assert replay.load_report(write(tmp_path, report(replayUrl=url)))["seed"] == 3

    def test_rejects_a_site_game_this_repo_lacks(self, tmp_path: Path) -> None:
        url = "https://example.org/re-kid/reksio/nosuchgame/?seed=3"
        with pytest.raises(ReplayError, match="isn't here"):
            replay.load_report(write(tmp_path, report(replayUrl=url)))

    def test_rejects_a_game_page_from_another_machine(self, tmp_path: Path) -> None:
        data = report(replayUrl="file:///elsewhere/index.html?seed=3")
        with pytest.raises(ReplayError, match="machine that saved it"):
            replay.load_report(write(tmp_path, data))


class TestLatestReport:
    def test_picks_the_newest(self, tmp_path: Path) -> None:
        old = write(tmp_path, report(), "yard-bug-old.json")
        new = write(tmp_path, report(), "yard-bug-new.json")
        os.utime(old, (1, 1))
        assert replay.latest_report(tmp_path) == new

    def test_ignores_other_downloads(self, tmp_path: Path) -> None:
        (tmp_path / "holiday.json").write_text("{}")
        with pytest.raises(ReplayError, match="Ctrl\\+Shift\\+B"):
            replay.latest_report(tmp_path)


class TestLocalPage:
    def test_a_file_report_keeps_its_page(self) -> None:
        assert replay.local_page(GAME.as_uri() + "?seed=1") == GAME

    def test_a_file_path_with_spaces(self) -> None:
        assert replay.local_page("file:///a%20b/index.html") == Path("/a b/index.html")

    def test_a_site_report_maps_to_this_repo(self) -> None:
        for url in [
            "https://alchemication.github.io/re-kid/reksio/yard/?seed=1",
            "https://alchemication.github.io/re-kid/reksio/yard/index.html?seed=1",
            "http://localhost:8000/reksio/yard/",
        ]:
            assert replay.local_page(url) == GAME, url

    def test_a_site_address_without_a_game(self) -> None:
        with pytest.raises(ReplayError, match="which game"):
            replay.local_page("https://alchemication.github.io/")


class TestReplayHelpers:
    def test_url_keeps_the_flags_and_adds_debug(self) -> None:
        url = replay.replay_url(report())
        assert "props=trap" in url and "seed=3" in url and "debug=" in url

    def test_url_of_a_site_report_is_the_local_page(self) -> None:
        site = "https://alchemication.github.io/re-kid/reksio/yard/?seed=3&rain=1"
        url = replay.replay_url(report(replayUrl=site))
        assert url.startswith(GAME.as_uri() + "?")
        assert "seed=3" in url and "rain=1" in url

    def test_url_pins_the_layout_of_an_old_report(self) -> None:
        layout = {
            "props": ["berries", "trap"],
            "creatures": ["fly"],
            "flowers": True,
            "rain": False,
            "fruit": "apple",
        }
        url = replay.replay_url(
            report(replayUrl=f"{GAME.as_uri()}?seed=3", layout=layout)
        )
        for flag in [
            "props=berries%2Ctrap",
            "creatures=fly",
            "flowers=1",
            "rain=0",
            "fruit=apple",
        ]:
            assert flag in url, flag

    def test_flags_in_the_report_win_over_its_layout(self) -> None:
        site = f"{GAME.as_uri()}?seed=3&props=bowl"
        url = replay.replay_url(report(replayUrl=site, layout={"props": ["tap"]}))
        assert "props=bowl" in url and "props=tap" not in url

    def test_differences_skip_what_always_drifts(self) -> None:
        recorded = {"busy": False, "camX": 10, "done": ["bowl"]}
        replayed = {"busy": True, "camX": 12, "done": ["bowl"]}
        assert replay.differences(recorded, replayed) == {"busy": [False, True]}

    def test_no_contact_sheet_without_frames(self, tmp_path: Path) -> None:
        assert replay.contact_sheet([], tmp_path / "sheet.jpg") is None
