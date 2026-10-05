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


GAMES_DIR = "games"
"""Games inside a world directory, one folder each: ``games/<game>/``."""

BRIEF_NAME = "brief.yaml"
"""A game's brief inside its folder (``schema.brief.GameBrief``)."""

GAME_PAGE = "game/index.html"
"""A game's page inside its folder: static HTML with plain scripts, so it opens
straight from disk with no server."""

DEFAULT_GAME = "yard"
"""The game ``main.py play`` opens when none is named: the one being built."""

SAMPLE_LIBRARIES = {
    "vsco2ce": "https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/",
    "vcsl": "https://raw.githubusercontent.com/sgossner/VCSL/master/",
}
"""Where sample files are downloaded from. Both are Versilian Studios libraries
released as CC0 (public domain): VSCO-2 Community Edition (a chamber orchestra)
and the Versilian Community Sample Library (percussion and odd instruments).
CC0 lets the game bundle them with no conditions."""

SAMPLES_NAME = "samples.yaml"
"""A game's sample list inside its folder (``schema.samples.SampleSet``)."""

SAMPLES_JS = "game/samples.js"
"""Where ``main.py samples`` writes the packed samples inside a game folder. A
script rather than audio files, because browsers refuse to load audio data
from ``file://`` pages but do run local scripts."""

SAMPLE_CACHE_DIR = "audio/sample-cache"
"""Downloaded originals inside a world directory (gitignored with the rest of
``audio/``), so rebuilding doesn't download again."""

SAMPLE_OUT_RATE = 32_000
"""Sample rate of packed samples. Enough for the brightest instruments used
(glockenspiel, xylophone: little above 12 kHz) at two-thirds the size of 48 kHz."""

SAMPLE_BITRATE = "64k"
"""MP3 bitrate of packed samples, mono. Short plucked and struck notes stay
clean at this rate, and fifty of them pack into well under 1 MB."""

PITCH_TOLERANCE_CENTS = 60
"""How far a sample's measured pitch may sit from the nearest semitone before
it is reported. Plucked and struck notes drift a little; more than this
suggests a wrong file."""

DOWNLOAD_TIMEOUT_S = 60
"""Upper bound for downloading one sample file."""

BARK_CLIP = "audio/intro/marks/bark.wav"
"""Adam's bark mark, cut by ``main.py mark``, inside a world directory: the
original barks the game's bark is made from."""

BARKS_JS = "audio/barks.js"
"""Where ``main.py barks`` writes the cut barks inside a world directory. Under
the gitignored ``audio/`` folder, because they are the original recording: they
stay on this machine and never reach the repository. Games load it with a
relative script tag and fall back to a synthesised bark without it."""

BARK_THRESHOLD = 0.15
"""A bark is where the loudness (RMS) is above this fraction of the clip's
loudest moment. The bark clip is two quick barks with a short gap; 0.15 splits
them cleanly while keeping each one's soft tail."""

BARK_MIN_S = 0.05
"""Louder stretches shorter than this are clicks, not barks, and are dropped."""

BARK_PAD_S = 0.015
"""Kept before and after each bark, so its attack and tail aren't clipped."""

BARK_FADE_S = 0.008
"""Fade in and out on each cut bark, so it starts and ends without a click."""

BARK_PEAK = 0.9
"""Each bark is scaled so its loudest sample reaches this (full scale = 1)."""
