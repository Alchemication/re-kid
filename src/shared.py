"""Copy the shared game scripts (``shared/``) into every game that loads them.

A game's page loads its scripts from its own folder, so each folder is complete
on its own: it opens from disk, its unit tests load it, and the site publishes
it unchanged. The source of a shared script is kept once, in ``shared/``; each
game that loads it gets a copy with a header saying where to edit it.

Example:
    for copy in sync(): print(copy.path)
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from config import GAME_PAGE, GAMES_DIR, SHARED_DIR, SHARED_HEADER, WORLDS_DIR

SCRIPT_SRC = re.compile(r'<script src="([^"/]+)"')
"""A script the page loads from its own folder."""


@dataclass(frozen=True)
class Copy:
    """One shared script as one game should have it."""

    path: Path
    text: str

    @property
    def current(self) -> bool:
        """Whether the game's file already matches."""
        return self.path.is_file() and self.path.read_text() == self.text


def copies(worlds: Path = WORLDS_DIR, shared: Path = SHARED_DIR) -> list[Copy]:
    """Every copy the games need: each shared script each game's page loads."""
    sources = {p.name: p.read_text() for p in sorted(shared.glob("*.js"))}
    found = []
    for page in sorted(worlds.glob(f"*/{GAMES_DIR}/*/{GAME_PAGE}")):
        for name in SCRIPT_SRC.findall(page.read_text()):
            if name in sources:
                text = SHARED_HEADER.format(name=name) + sources[name]
                found.append(Copy(page.parent / name, text))
    return found


def sync(worlds: Path = WORLDS_DIR, shared: Path = SHARED_DIR) -> list[Copy]:
    """Write the copies that are missing or out of date; return those written."""
    written = [c for c in copies(worlds, shared) if not c.current]
    for c in written:
        c.path.write_text(c.text)
    return written
