"""The shared game scripts and each game's copies of them (src/shared.py)."""

from __future__ import annotations

from pathlib import Path

from config import SHARED_HEADER
from shared import copies, sync


def make_game(worlds: Path, world: str, game: str, scripts: list[str]) -> Path:
    """A game folder whose page loads the given scripts."""
    folder = worlds / world / "games" / game / "game"
    folder.mkdir(parents=True)
    tags = "".join(f'<script src="{s}"></script>\n' for s in scripts)
    (folder / "index.html").write_text(f"<!doctype html>\n{tags}")
    return folder


class TestCopies:
    def test_every_game_that_loads_a_shared_script_gets_it(
        self, tmp_path: Path
    ) -> None:
        shared = tmp_path / "shared"
        shared.mkdir()
        (shared / "debug.js").write_text("const Clock = 1\n")
        a = make_game(tmp_path / "worlds", "a", "one", ["debug.js", "own.js"])
        b = make_game(tmp_path / "worlds", "b", "two", ["own.js"])
        found = copies(tmp_path / "worlds", shared)
        assert [c.path for c in found] == [a / "debug.js"]
        assert (
            found[0].text == SHARED_HEADER.format(name="debug.js") + "const Clock = 1\n"
        )
        assert not (b / "debug.js").exists()

    def test_scripts_from_elsewhere_are_not_shared_ones(self, tmp_path: Path) -> None:
        shared = tmp_path / "shared"
        shared.mkdir()
        (shared / "debug.js").write_text("x\n")
        make_game(tmp_path / "worlds", "a", "one", ["../lib/debug.js"])
        assert copies(tmp_path / "worlds", shared) == []


class TestSync:
    def test_writes_missing_and_stale_copies_only(self, tmp_path: Path) -> None:
        shared = tmp_path / "shared"
        shared.mkdir()
        (shared / "debug.js").write_text("v1\n")
        game = make_game(tmp_path / "worlds", "a", "one", ["debug.js"])
        assert len(sync(tmp_path / "worlds", shared)) == 1
        assert sync(tmp_path / "worlds", shared) == []
        (game / "debug.js").write_text("edited by hand\n")
        assert len(sync(tmp_path / "worlds", shared)) == 1
        assert (game / "debug.js").read_text().endswith("v1\n")

    def test_the_repos_copies_are_current(self) -> None:
        stale = [str(c.path) for c in copies() if not c.current]
        assert not stale, f"run `main.py shared`: {stale}"
