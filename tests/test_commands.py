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
