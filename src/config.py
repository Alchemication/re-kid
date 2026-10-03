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
"""Generated audio files inside a world directory: measurements,
spectrograms, and each mark's cut clip. Gitignored — it holds cuts of copyrighted
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

INTRO_MEDIA_DIR = "media/intro"
"""Intro clips inside a world directory (gitignored). ``main.py mark`` picks the
one whose name contains the intro's reference episode, e.g. ``kosmonauta``."""

MARK_UI_DIR = REPO_ROOT / "src" / "mark_ui"
"""The marking tool's page and its vendored libraries, served as static files."""

MARK_HOST = "127.0.0.1"
"""Loopback only: the marking tool serves copyrighted media and writes research
files, so it must never be reachable from other machines."""

MARK_PORT = 8765
"""First port ``main.py mark`` tries; it moves up if the port is busy. Any free
high port would do; this one is easy to remember."""

MARK_PORT_TRIES = 20
"""How many ports above ``MARK_PORT`` to try before giving up."""

OBSERVER = "adam"
"""Default ``observed_by`` for marks saved in ``main.py mark``. The project has
one listener; pass ``--by`` to record someone else."""

MARK_CLIPS_DIR = "marks"
"""Folder under the intro's audio output holding one clip per mark,
``audio/intro/marks/<mark id>.wav``, kept in step with the marks on every save."""
