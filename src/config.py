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
"""Generated audio analysis inside a world directory: WAVs, loop cuts,
spectrograms, measurements. Gitignored — it holds cuts of copyrighted
recordings and is rebuilt by ``main.py audio``."""

AUDIO_SAMPLE_RATE = 22_050
"""librosa's default analysis rate. Enough for tempo and onsets (nothing
musical happens above 11 kHz that the measurements use), and half the work of
44.1 kHz. Loop cuts keep the source's own rate; only analysis is resampled."""

LOOP_BEAT_COUNTS = (8, 4, 2)
"""Loop lengths to try, in detected beats, longest first. Phrases in the theme
most likely run in groups of 2, 4 or 8 beats, and a loop that is a whole group
repeats without a hiccup. The proposal takes the longest that fits the gag's
window. A guess until Adam hears the loops."""

FFMPEG_TIMEOUT_S = 120
"""Upper bound for one ffmpeg call. Intro clips take about a second; this only
catches a hung process."""

SPECTROGRAM_SIZE = "800x300"
"""Width x height of each beat's spectrogram PNG: wide enough to show
half-second detail over a 3–8 s window, small enough to read several at once."""

LOOP_PREVIEW_REPEATS = 4
"""How many times each loop plays back to back in its preview WAV. Three seams
are enough to hear whether it repeats cleanly, without needing a player that
loops."""

INTRO_LOOPS_FILE = "games/intro/loops.yaml"
"""Loop choices for the intro game inside a world directory
(``schema.loops.LoopSet``). Tracked, unlike ``AUDIO_DIR``: it records a
person's listening decisions, which cannot be regenerated."""

OBSERVER = "adam"
"""Default ``observed_by`` for notes typed in ``main.py listen``. The project
has one listener; pass ``--by`` to record someone else."""

PLAYERS = (("afplay",), ("ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet"))
"""Audio players tried in order by ``main.py listen``. afplay ships with macOS;
ffplay comes with ffmpeg elsewhere."""

GRAPH_ROWS = 3
"""Height of the ASCII loudness graph in text rows. With 8 block heights per
row that is 24 levels: enough to see hits and quiet gaps, small enough to leave
room for the beat's text on one screen."""

GRAPH_MAX_WIDTH = 96
"""Widest the graph gets, in columns. For a 2–7 s beat that is 15–50 ms per
column, finer than the beat grid (about 0.42 s), so beats never share a column."""

GRAPH_FLOOR_DB = -50.0
"""Loudness always drawn as an empty column, however quiet the beat. The intro's
quietest stretch measures about -40 dB, so real silence stays blank."""

GRAPH_RANGE_DB = 30.0
"""Loudness span of the graph, down from the beat's loudest moment. The intro's
music moves within about 8 dB; a fixed -50 dB floor drew it as a solid block.
30 dB shows accents and dips while keeping a loud hit the tallest column."""
