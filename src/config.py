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

EPISODES_FILE = "episodes/index.yaml"
"""Episode catalogue inside a world directory (``schema.episode.EpisodeCatalogue``).

Optional until a world reaches that stage; the ``episodes/`` folder will also hold
per-episode breakdowns, so the catalogue is its index."""

INTRO_FILE = "intro.yaml"
"""Breakdown of the title sequence inside a world directory
(``schema.breakdown.Breakdown``). It sits at the world's top level, not under
``episodes/``, because the same intro opens many episodes."""

AUDIO_DIR = "audio"
"""Generated audio analysis inside a world directory: WAVs, cut clips,
spectrograms, measurements. Gitignored — it holds cuts of copyrighted
recordings and is rebuilt from the media by ``audio.measure``."""

AUDIO_SAMPLE_RATE = 22_050
"""librosa's default analysis rate. Enough for tempo and onsets (nothing
musical happens above 11 kHz that the measurements use), and half the work of
44.1 kHz. Cut clips keep the source's own rate; only analysis is resampled."""


FFMPEG_TIMEOUT_S = 120
"""Upper bound for one ffmpeg call. Intro clips take about a second; this only
catches a hung process."""

SPECTROGRAM_SIZE = "800x300"
"""Width x height of each breakdown beat's spectrogram PNG: wide enough to show
half-second detail over a 3–8 s window, small enough to read several at once."""
