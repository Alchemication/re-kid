"""Fast checks on the games: their JS unit tests, and the conventions that keep
a bug reproducible (seeded randomness, no silently swallowed errors)."""

from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
GAMES = sorted(p.parent for p in ROOT.glob("worlds/*/games/*/game/index.html"))
GAME_IDS = [f"{g.parents[2].name}/{g.parent.name}" for g in GAMES]
MAX_LINES = 1000  # CLAUDE.md: keep source files under ~1000 lines
# Randomness that may stay unseeded: audio texture (noise, which bark sample),
# which never changes what happens in a play.
UNSEEDED_OK = {"debug.js", "sound.js"}
# Generated files, not ours to check.
GENERATED = {"samples.js"}


def scripts(game: Path) -> list[Path]:
    """The game's own scripts (not generated ones)."""
    return [p for p in sorted(game.glob("*.js")) if p.name not in GENERATED]


class TestUnit:
    """The JS unit tests (node:test) next to each game."""

    @pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")
    @pytest.mark.parametrize("game", GAMES, ids=GAME_IDS)
    def test_node_tests_pass(self, game: Path) -> None:
        tests = sorted((game.parent / "tests").glob("*.test.js"))
        if not tests:
            pytest.skip("no JS unit tests for this game")
        run = subprocess.run(
            ["node", "--test", *map(str, tests)],
            check=False,
            capture_output=True,
            text=True,
            cwd=ROOT,
        )
        assert run.returncode == 0, run.stdout[-4000:] + run.stderr[-2000:]


class TestConventions:
    """Rules from CLAUDE.md that a test can check."""

    @pytest.mark.parametrize("game", GAMES, ids=GAME_IDS)
    def test_randomness_is_seeded(self, game: Path) -> None:
        bad = [
            f"{p.name}:{i}"
            for p in scripts(game)
            if p.name not in UNSEEDED_OK
            for i, line in enumerate(p.read_text().splitlines(), 1)
            if "Math.random" in line
        ]
        assert not bad, f"use a Debug.random stream, not Math.random: {bad}"

    @pytest.mark.parametrize("game", GAMES, ids=GAME_IDS)
    def test_no_error_is_swallowed_silently(self, game: Path) -> None:
        empty = re.compile(
            r"catch\s*\(\s*\(\s*\w*\s*\)\s*=>\s*\{\s*\}\s*\)|catch\s*(\(\w*\))?\s*\{\s*\}"
        )
        bad = []
        for p in scripts(game):
            lines = p.read_text().splitlines()
            for i, line in enumerate(lines):
                if empty.search(line) and "//" not in line and "//" not in lines[i - 1]:
                    bad.append(f"{p.name}:{i + 1}")
        assert not bad, (
            f"use Debug.ignoreCut, or say on the line why ignoring is safe: {bad}"
        )

    @pytest.mark.parametrize("game", GAMES, ids=GAME_IDS)
    def test_page_loads_every_script_debug_first(self, game: Path) -> None:
        html = (game / "index.html").read_text()
        loaded = re.findall(r'<script src="([^"]+)"', html)
        local = [s for s in loaded if "/" not in s]
        assert local[0] == "debug.js", "debug.js must load first: the others use it"
        missing = [p.name for p in game.glob("*.js") if p.name not in local]
        assert not missing, f"not loaded by index.html: {missing}"

    @pytest.mark.parametrize("game", GAMES, ids=GAME_IDS)
    def test_files_stay_small(self, game: Path) -> None:
        big = [
            f"{p.name} ({n})"
            for p in scripts(game)
            if (n := len(p.read_text().splitlines())) > MAX_LINES
        ]
        assert not big, f"split these: {big}"
