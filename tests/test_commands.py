"""Command helpers that touch the file system."""

from __future__ import annotations

import argparse
from pathlib import Path

import pytest

import commands
from config import WORLDS_DIR


class TestPlay:
    def test_game_page_path(self) -> None:
        expected = WORLDS_DIR / "reksio" / "games" / "yard" / "game" / "index.html"
        assert commands.game_page("reksio", "yard") == expected

    def test_reksio_yard_game_exists(self) -> None:
        assert commands.game_page("reksio", "yard").is_file()

    def test_missing_game_explains(
        self,
        monkeypatch: pytest.MonkeyPatch,
        tmp_path: Path,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        monkeypatch.setattr(commands, "world_dir", lambda world_id: tmp_path / world_id)
        assert commands.cmd_play(argparse.Namespace(world="nowhere", game="yard")) == 1
        assert "No game at" in caplog.text


class TestPlayFlags:
    def test_no_flags_no_query(self) -> None:
        assert (
            commands.play_query(argparse.Namespace(world="reksio", game="yard")) == ""
        )

    def test_flags_become_the_query(self) -> None:
        args = argparse.Namespace(seed=42, debug=True, still=True)
        assert commands.play_query(args) == "?seed=42&debug=&still="

    def test_seed_zero_is_kept(self) -> None:
        assert (
            commands.play_query(argparse.Namespace(seed=0, debug=False, still=False))
            == "?seed=0"
        )

    def test_stub_forwards_to_the_url(self, tmp_path: Path) -> None:
        url = 'file:///x/index.html?seed=1&debug="'
        stub = commands.play_stub(url, tmp_path).read_text()
        assert 'url=file:///x/index.html?seed=1&debug=%22"' in stub
