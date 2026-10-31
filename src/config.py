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

SHARED_DIR = REPO_ROOT / "shared"
"""Game scripts every game may use (the clock and debug tools first). Each game
gets a copy of the ones its page loads (``main.py shared``), so a game folder
stays complete on its own: it opens from disk, and the site publishes it as it
is (.github/workflows/pages.yml)."""

SHARED_HEADER = (
    "// Copied from shared/{name} by `main.py shared` — edit that, not this.\n"
)
"""The first line of a game's copy of a shared script, so nobody edits the copy."""

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

EFFECTS_NAME = "effects.yaml"
"""A game's recorded sound effects inside its folder (``schema.effects.EffectSet``):
the takes picked by ear for each sound, and what each was made from."""

EFFECTS_DIR = "effects"
"""Where the picked takes are kept, as made, inside a game folder (committed):
the packing recipe can change without making them again."""

EFFECTS_JS = "game/effects.js"
"""Where ``main.py effects`` writes the packed effects inside a game folder (a
script, as ``SAMPLES_JS``, so a ``file://`` page can load them)."""

EFFECT_OUT_RATE = 22_050
"""Sample rate of packed effects. Part of the retro recipe Adam picked by ear
over a clean one (2026-10-12): a lower rate softens the top, as old film sound."""

EFFECT_BITRATE = "48k"
"""MP3 bitrate of packed effects, mono: about 7 KB a take at this rate."""

EFFECT_HIGHPASS_HZ = 120
"""Lows below this are rolled off (the retro recipe: thin, like a 1970s
soundtrack; small speakers can't play them anyway)."""

EFFECT_LOWPASS_HZ = 6_500
"""Highs above this are rolled off (the retro recipe)."""

EFFECT_SATURATION = 0.6
"""How hard the takes are softly clipped (ffmpeg asoftclip tanh), 0 to 1: a
touch of tape warmth (the retro recipe)."""

EFFECT_LOUDNESS_DB = -18.0
"""Mean loudness every take is brought to, so takes of one sound match and the
game sets each sound's level once (``gain``). Measured as a mean, not with
loudnorm: that needs about 3 s of sound, and most takes are under 2."""

EFFECT_PEAK_DB = -1.0
"""A take is never made louder than this at its peak: a sharp one (a bonk)
ends quieter than its mean target rather than clipping."""

EFFECT_MAX_SECONDS = 4.0
"""Longer takes are cut, with a short fade: no effect in the game needs more,
and a long tail would overlap the next."""

TUNES_NAME = "tunes.yaml"
"""A game's recorded music inside its folder (``schema.tunes.TuneSet``): the
takes picked by ear for each part of the day, and what each was made from."""

TUNES_DIR = "tunes"
"""Where the picked music takes are kept, as made, inside a game folder
(committed): the packing recipe can change without making them again."""

TUNES_JS = "game/tunes.js"
"""Where ``main.py tunes`` writes the packed music inside a game folder (a
script, as ``EFFECTS_JS``, so a ``file://`` page can load it)."""

TUNE_LOUDNESS_DB = -20.0
"""Mean loudness every music take is brought to, so takes of a part match
and music.js sets the music's level once. A little under the effects'
(``EFFECT_LOUDNESS_DB``): the music sits under what happens."""

TUNE_FADE_S = 1.5
"""Every take fades out over its last this many seconds: generated takes
stop where their length was asked to end, often mid-phrase."""

TUNE_MAX_SECONDS = 30.0
"""Longer takes are cut (then faded): a phrase is heard now and then, not a
song, and each second is about 6 KB in the page."""

PITCH_TOLERANCE_CENTS = 60
"""How far a sample's measured pitch may sit from the nearest semitone before
it is reported. Plucked and struck notes drift a little; more than this
suggests a wrong file."""

DOWNLOAD_TIMEOUT_S = 60
"""Upper bound for downloading one sample file."""

BARK_CLIP = "audio/intro/marks/bark.wav"
"""Adam's bark mark, cut by ``main.py mark``, inside a world directory: the
original barks the game's bark is made from."""

BARKS_JS = f"games/{DEFAULT_GAME}/game/barks.js"
"""Where ``main.py barks`` writes the cut barks inside a world directory: in
the first game's folder, as every shared part until a second game needs it.
The original recording, committed and published with the game (Adam's call,
2026-10-14: a private POC for one child; generated barks didn't come close).
Games fall back to a synthesised bark without it."""

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

PLAY_STUB = "re-kid-play.html"
"""``main.py play`` with flags writes this tiny page to the system temp folder
and opens it; it forwards to the game with the flags in its address. Opening a
``file://`` address with a ``?query`` directly loses the query on macOS."""

BUG_REPORT_DIR = Path.home() / "Downloads"
"""Where a game's bug reports land: the browser saves them as downloads, and
this is every major browser's default download folder."""

BUG_REPORT_GLOB = "*-bug-*.json"
"""A game's bug report file name: ``<game>-bug-<time>.json`` (debug.js)."""

BUG_REPORT_VERSION = 1
"""The report shape ``main.py replay`` reads; matches ``REPORT_VERSION`` in the
game's ``debug.js``."""

REPLAY_LAST_S = 10
"""How much of the run-up to a bug report the replay photographs: long enough
to see how the trouble started, short enough to look through."""

REPLAY_EVERY_MS = 500
"""One replay screenshot this often: a gesture's poses last a few hundred ms,
so this catches each one without a flood of frames."""

REPLAY_PROGRESS_EVERY_MS = 5000
"""How often a replay says how far it has got: it plays in real time, so a
long play would otherwise sit silent for minutes."""

REPLAY_SHEET_COLUMNS = 5
"""Frames per row on the replay's contact sheet."""

REPLAY_SHEET_WIDTH = 384
"""Each frame's width on the contact sheet, in pixels: small enough for a whole
sheet to be read at once, big enough to see Reksio's pose."""

LOOK_DIR = REPO_ROOT / "looks"
"""Where ``main.py look`` saves its frames, unless told otherwise: in the
repository (gitignored), so a session can read them straight back."""

LOOK_GAMES = {
    "yard": {
        "api": "yardGame",
        "hero": "#rk-bob",
        "flags": {"seed": "1", "still": "", "rain": "0", "creatures": "", "film": "0"},
        "ready": None,
        "free": "true",
    },
    "meadow": {
        "api": "meadowGame",
        "hero": ".mole-body",
        "flags": {"seed": "1", "still": "", "film": "0"},
        "ready": "meadowGame.perform('wake')",
        "free": "meadowGame.state().awake && !meadowGame.state().busy",
    },
}
"""What ``main.py look`` needs to know of each game. ``api``: its game object
(state, trace). ``hero``: what ``--close`` cuts around. ``flags``: the play it
opens unless told otherwise: seeded, the hero moving only when asked, without
the old-print look (its grain and dust would read as flaws in the drawing),
and for the yard dry and with no creatures; the same play every time, so only
what is looked at moves. ``ready``: what wakes him first (the mole sleeps until
a tap; Reksio's still play starts awake). ``free``: true once he is done; the
meadow's taps are intents, not promises, so a step ends when this holds."""

LOOK_EVERY_MS = 350
"""One look screenshot this often: a gag's beats (a freeze, a tug, a pop) are
a few hundred ms each, and a replay's 500 ms steps over some of them."""

LOOK_MAX_S = 90
"""A look stops photographing after this long even if what it watches hasn't
ended: longer than any gag (the bowl takes about 25 s), and a hung one shows."""

LOOK_SIZE = (1280, 720)
"""The page a look opens, in CSS pixels: a laptop's window, the size the
game's browser tests use."""

LOOK_CLOSE = (480, 320)
"""With ``--close``, each frame is cut to this much around the hero (CSS px, at
the default size): Reksio, the bird on his head and what he holds or eyes fill
it, as a zoomed-in still would; 640x400 left him small on the sheet."""
