"""Shared paths and tunables.

Every path and limit lives here as a named constant with a docstring saying why
it has that value. Nothing is inlined at its point of use.

Example:
    from config import WORLDS_DIR
"""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
"""Repository root, resolved from this file so commands work from any cwd."""

WORLDS_DIR = REPO_ROOT / "worlds"
"""One subdirectory per cartoon world, named by the world's id."""

WORLD_FILE = "world.yaml"
"""Series-level dossier inside a world directory (``schema.world.WorldDossier``)."""

SOURCES_FILE = "sources.yaml"
"""Source registry inside a world directory (``schema.world.SourceRegistry``)."""

YAML_LINE_WIDTH = 100_000
"""Effectively no wrapping: one paragraph stays one line, so diffs stay readable."""
