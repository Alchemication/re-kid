"""The yard, played in the installed Chrome: every gesture, left-alone move, thing
and creature chase on its own, then the same cut short by a tap.

Each test opens a seeded, still play (`?seed=1&still`: Reksio does nothing
unless asked), does one thing, and checks that it ends, that Reksio is free
and standing again, and that nothing was reported: no console error, no broken
rule (debug.js). Real time, so slow: `uv run pytest -m browser -n 8`.

Adding a gesture, move, thing or creature? Add it to the tables here too;
test_every_*_is_tested fails until you do.
"""

from __future__ import annotations

import json
import subprocess
import sys
from collections.abc import Iterator
from itertools import pairwise
from pathlib import Path

import pytest

pytestmark = pytest.mark.browser
playwright = pytest.importorskip("playwright.sync_api")

ROOT = Path(__file__).resolve().parent.parent
YARD = ROOT / "worlds/reksio/games/yard/game/index.html"
STILL = "seed=1&still&rain=0&creatures="
DONE_MS = 60_000  # the longest thing (a full nap, the film) takes well under this
CUT_AFTER_MS = 400  # a tap this soon after starting cuts a move short

# Reksio's gestures, with arguments that keep each one short.
GESTURES = {
    "bark": "Reksio.bark()",
    "nod": "Reksio.nod(12, 400)",
    "lick": "Reksio.lick()",
    "lap": "Reksio.lap(3)",
    "shake": "Reksio.shake()",
    "shakeDry": "Reksio.shakeDry()",
    "paddle": "Reksio.paddle(800)",
    "hop": "Reksio.hop()",
    "sniff": "Reksio.sniff()",
    "lookAround": "Reksio.lookAround()",
    "lookUp": "Reksio.lookUp()",
    "scratch": "Reksio.scratch()",
    "playBow": "Reksio.playBow()",
    "chaseTail": "Reksio.chaseTail()",
    "yawn": "Reksio.yawn()",
    "stamp": "Reksio.stamp(() => {})",
    "snap": "Reksio.snap(2)",
    "watch": "Reksio.watch(() => ({ x: Reksio.x + 200, y: 600 }), 800)",
    "pounce": "Reksio.pounce(Reksio.x + 150)",
    "biteTail": "Reksio.biteTail()",
    "howl": "Reksio.howl()",
    "sit": "Reksio.sit(1500)",
    "lieDown": "Reksio.lieDown(1500)",
    "nap": "Reksio.nap(2000)",
    "startle": "Reksio.startle()",
    "catchDrops": "Reksio.catchDrops(2)",
    "stretch": "(async () => { Reksio.beginStretch(); await new Promise((r) => setTimeout(r, 600)); await Reksio.endStretch() })()",
}
# Reksio's other functions: state, not gestures, or tested through a thing.
NOT_GESTURES = {
    "walkTo",
    "stopWalking",
    "face",
    "tick",
    "relax",
    "setWet",
    "setMuddy",
    "holdBone",
    "mouth",
    "beginStretch",
    "endStretch",  # as "stretch" above
    "duck",  # the doghouse
}

ACTS = [
    "wish",
    "sniff",
    "wander",
    "look",
    "lookUp",
    "scratch",
    "hop",
    "bow",
    "tail",
    "drops",
    "shakeOff",
    "puddle",
    "snail",
    "biteTail",
    "sit",
    "lie",
    "nap",
    "howl",
    "fly",
    "yawn",
]
# Moves that need something in the yard this test can't quickly bring: skipped
# (and shown as skipped) when it isn't there.
ACT_NEEDS = {"puddle": "puddles, after rain", "snail": "a snail, after rain"}
# What each move needs in the page address.
ACT_QUERY = {"fly": "&creatures=fly"}

THINGS = [
    "doghouse",
    "house",
    "bowl",
    "tap",
    "flowers",
    "dig",
    "film",
    "gate",
    "bird",
    "trap",
    "tree",
    "berries",
]
POOL = {"bowl", "dig", "film", "trap", "tree", "berries"}  # layout.js PROP_POOL

CRITTERS = {"fly": "fly", "bee": "bee", "spider": "spider"}
CRITTER_NEEDS = {"snail": "a snail, after rain", "worm": "worms, after rain"}


@pytest.fixture(scope="session")
def browser() -> Iterator[object]:
    with playwright.sync_playwright() as p:
        b = p.chromium.launch(
            channel="chrome"
        )  # the bundled Chromium can't decode the game's audio
        yield b
        b.close()


class Yard:
    """One open play of the yard, collecting what went wrong."""

    def __init__(self, browser: object, query: str) -> None:
        self.errors: list[str] = []
        self.page = browser.new_page(viewport={"width": 1280, "height": 720})
        self.page.on("console", self._console)
        self.page.on("pageerror", lambda e: self.errors.append(f"uncaught: {e}"))
        self.page.goto(f"{YARD.as_uri()}?{query}")
        self.page.wait_for_function("window.yardGame")

    def _console(self, msg: object) -> None:
        # barks.js is local-only (never committed); its absence is expected
        if (
            msg.type == "error"
            and "barks.js" not in msg.text
            and "ERR_FILE_NOT_FOUND" not in msg.text
        ):
            self.errors.append(msg.text[:3000])

    def run(self, js: str, ms: int = DONE_MS) -> None:
        """Await `js` (a promise) in the page; fail if it doesn't end in time."""
        self.page.evaluate(
            """([js, ms]) => Promise.race([
                Debug.ignoreCut(eval(js), 'test'),
                new Promise((_, no) => setTimeout(() => no(new Error(`still going after ${ms} ms`)), ms)),
            ])""",
            [js, ms],
        )

    def start(self, js: str) -> None:
        """Start `js` without waiting for it."""
        self.page.evaluate(
            "(js) => { window.__running = Debug.ignoreCut(eval(js), 'test') }", js
        )

    def state(self) -> dict:
        return self.page.evaluate("yardGame.state()")

    def settled(self) -> dict:
        """Wait until he's free, then check he's standing and nothing went wrong."""
        try:
            self.page.wait_for_function("yardGame.free()", timeout=DONE_MS)
        except playwright.TimeoutError:
            pytest.fail(
                f"never free again: {self.state()}\n{self.page.evaluate('yardGame.trace()')}"
            )
        self.page.wait_for_timeout(300)  # a rules check or two (every 200 ms)
        s = self.state()
        assert s["reksio"]["pose"] == "stand", self.page.evaluate("yardGame.trace()")
        assert not self.errors, "\n---\n".join(self.errors)
        return s


@pytest.fixture
def yard(browser: object) -> Iterator[callable]:
    opened: list[Yard] = []

    def open_(query: str = STILL) -> Yard:
        opened.append(Yard(browser, query))
        return opened[-1]

    yield open_
    for y in opened:
        y.page.close()


class TestCoverage:
    """Everything the game can do has a test here."""

    def test_every_gesture_is_tested(self, yard: callable) -> None:
        names = set(
            yard().page.evaluate(
                "Object.keys(Reksio).filter((k) => typeof Reksio[k] === 'function')"
            )
        )
        assert names - set(GESTURES) - NOT_GESTURES == set(), (
            "add these to GESTURES (or NOT_GESTURES)"
        )

    def test_every_act_is_tested(self, yard: callable) -> None:
        assert set(yard().page.evaluate("yardGame.acts")) == set(ACTS)

    def test_every_thing_is_tested(self, yard: callable) -> None:
        assert set(yard().page.evaluate("yardGame.things")) == set(THINGS)

    def test_every_critter_is_tested(self, yard: callable) -> None:
        assert set(yard().page.evaluate("yardGame.critters")) == set(CRITTERS) | set(
            CRITTER_NEEDS
        )


class TestGestures:
    @pytest.mark.parametrize("name", GESTURES)
    def test_runs_to_the_end(self, yard: callable, name: str) -> None:
        y = yard()
        y.run(GESTURES[name])
        y.settled()


def open_for_act(yard: callable, name: str) -> Yard:
    y = yard(STILL + ACT_QUERY.get(name, ""))
    if name in ACT_NEEDS and not y.page.evaluate(f"yardGame.actOk('{name}')"):
        pytest.skip(f"needs {ACT_NEEDS[name]}")
    return y


class TestActs:
    @pytest.mark.parametrize("name", ACTS)
    def test_runs_to_the_end(self, yard: callable, name: str) -> None:
        y = open_for_act(yard, name)
        y.run(f"yardGame.act('{name}')")
        y.settled()

    @pytest.mark.parametrize("name", ACTS)
    def test_a_tap_cuts_it_short(self, yard: callable, name: str) -> None:
        y = open_for_act(yard, name)
        y.start(f"yardGame.act('{name}')")
        y.page.wait_for_timeout(CUT_AFTER_MS)
        y.page.evaluate("yardGame.walk(Reksio.x + 300)")
        y.settled()


def open_for_thing(yard: callable, name: str) -> Yard:
    props = f"&props={name}" if name in POOL else ""
    y = yard(f"{STILL}&flowers=1&mouse-at=0&visitor-at=0{props}")
    try:
        y.page.wait_for_function(f"Things.ready('{name}')", timeout=20_000)
    except playwright.TimeoutError:
        pytest.fail(f"{name} never ready: {y.state()}")
    return y


class TestThings:
    @pytest.mark.parametrize("extra", [False, True], ids=["plain", "variation"])
    @pytest.mark.parametrize("name", THINGS)
    def test_runs_to_the_end(self, yard: callable, name: str, extra: bool) -> None:
        y = open_for_thing(yard, name)
        y.run(f"yardGame.use('{name}', {str(extra).lower()})")
        assert y.settled()["uses"].get(name) == 1

    @pytest.mark.parametrize("name", THINGS)
    def test_a_tap_while_busy_waits_its_turn(self, yard: callable, name: str) -> None:
        y = open_for_thing(yard, name)
        y.page.evaluate(f"yardGame.tap('{name}')")
        y.page.wait_for_function("yardGame.state().busy", timeout=DONE_MS)
        y.page.wait_for_timeout(CUT_AFTER_MS)
        y.page.evaluate("yardGame.walk(Reksio.MIN_X + 100)")
        s = y.settled()
        assert s["uses"].get(name) == 1
        assert abs(s["reksio"]["x"] - y.page.evaluate("Reksio.MIN_X + 100")) < 5, (
            "the waiting walk never ran"
        )


class TestCritters:
    @pytest.mark.parametrize("name", [*CRITTERS, *CRITTER_NEEDS])
    def test_chase_runs_to_the_end(self, yard: callable, name: str) -> None:
        if name in CRITTER_NEEDS:
            pytest.skip(f"needs {CRITTER_NEEDS[name]}")
        y = yard(f"seed=1&still&rain=0&creatures={CRITTERS[name]}")
        y.page.wait_for_timeout(1500)  # let it fly in
        y.run(f"yardGame.chase('{name}')")
        y.settled()


class TestDebugOverlay:
    def test_shows_the_seed_and_state(self, yard: callable) -> None:
        y = yard("seed=5&debug&still")
        y.page.wait_for_selector("#debug")
        text = y.page.inner_text("#debug")
        assert "seed 5" in text
        assert "busy: false" in text


DAY = ["house", "tap", "bowl", "dig", "gate", "flowers"]  # six new things: the sun sets
DAY_PLAY = f"{STILL}&props=bowl,dig,film&flowers=1"


class TestWholePlay:
    def test_six_new_things_bring_dusk_and_the_doghouse_brings_bed(
        self, yard: callable
    ) -> None:
        y = yard(DAY_PLAY)
        for name in DAY:
            assert not y.state()["dusk"], name
            y.page.evaluate(f"yardGame.tap('{name}')")
            y.settled()
        assert y.state()["dusk"]
        y.page.evaluate("yardGame.tap('bowl')")  # the yard is still open
        y.settled()
        assert y.state()["uses"]["bowl"] == 2 and not y.state()["ended"]
        y.page.evaluate("yardGame.tap('doghouse')")
        y.page.wait_for_function("yardGame.state().ended", timeout=DONE_MS)
        y.page.wait_for_timeout(7000)  # night falls, he walks home, the picture closes
        assert not y.errors, "\n---\n".join(y.errors)

    def test_once_the_moon_is_up_he_goes_to_bed(self, yard: callable) -> None:
        y = yard(f"{DAY_PLAY}&moon-rise=3")
        for name in DAY:
            y.run(f"yardGame.use('{name}')")
        y.page.wait_for_function("yardGame.state().bedtime", timeout=10_000)
        y.page.wait_for_function("yardGame.state().ended", timeout=5_000)
        assert y.state()["moonUp"] == 1
        y.page.wait_for_timeout(7000)
        assert not y.errors, "\n---\n".join(y.errors)


class TestLeftAlone:
    def test_he_keeps_busy_on_his_own(self, yard: callable) -> None:
        y = yard("seed=2&rain=0&creatures=")
        y.page.wait_for_timeout(20_000)
        acts = [
            e["name"]
            for e in y.page.evaluate("yardGame.events()")
            if e["kind"] == "act"
        ]
        assert acts and acts[0] == "wish", acts  # first, what he'd like to do
        assert len(set(acts)) >= 3, acts
        assert all(a != b for a, b in pairwise(acts)), acts  # never twice running
        assert not y.errors, "\n---\n".join(y.errors)


class TestRecorder:
    """Save a bug report from the game, then replay it."""

    def test_report_saves_and_replays(self, yard: callable, tmp_path: Path) -> None:
        from replay import load_report

        y = yard("seed=4&debug&rain=0&creatures=")
        for intent in ["walk to 1400", "press", "release", "go to tap"]:
            y.page.evaluate(f"yardGame.perform('{intent}')")
            y.page.wait_for_timeout(700)
        y.page.wait_for_function("yardGame.free()", timeout=DONE_MS)
        y.page.once("dialog", lambda d: d.accept("he looked odd at the tap"))
        with y.page.expect_download() as download:
            y.page.keyboard.press("Control+Shift+B")
        path = tmp_path / download.value.suggested_filename
        download.value.save_as(path)
        assert path.name.startswith("yard-bug-")

        report = load_report(path)
        assert report["description"] == "he looked odd at the tap"
        assert [i["intent"] for i in report["inputs"]] == [
            "walk to 1400",
            "press",
            "release",
            "go to tap",
        ]
        assert report["snapshots"], "no state snapshots"

        # the real command, in its own process (Playwright's sync API can't nest)
        out = tmp_path / "replay"
        run = subprocess.run(
            [
                sys.executable,
                "main.py",
                "replay",
                str(path),
                "--last",
                "3",
                "--out",
                str(out),
            ],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
        assert run.returncode == 0, run.stdout + run.stderr
        replayed = json.loads((out / "replay.json").read_text())
        assert len(list((out / "frames").glob("*.jpg"))) >= 4
        assert replayed["errors"] == []
        assert replayed["replayed"]["uses"] == report["state"]["uses"], replayed[
            "differences"
        ]


class TestGettingUp:
    """Walking off from a rest: up on his feet first, never gliding along still
    sitting or lying (Adam's report, 2026-10-06)."""

    @pytest.mark.parametrize("act", ["sit", "lie", "nap"])
    @pytest.mark.parametrize("after_ms", [150, 1500])
    def test_never_moves_with_posed_legs(
        self, yard: callable, act: str, after_ms: int
    ) -> None:
        y = yard()
        y.start(f"yardGame.act('{act}')")
        y.page.wait_for_timeout(after_ms)
        y.page.evaluate("yardGame.walk(Reksio.x + 900)")
        glides, last_x = [], None
        for _ in range(30):
            s = y.page.evaluate(
                "() => ({ x: Reksio.x, legs: ['leg-1', 'leg-2', 'leg-3', 'leg-4']"
                ".some((id) => document.getElementById(id).getAnimations().length > 0) })"
            )
            if last_x is not None and abs(s["x"] - last_x) > 0.5 and s["legs"]:
                glides.append(round(s["x"]))
            last_x = s["x"]
            y.page.wait_for_timeout(40)
        assert not glides, f"moved with posed legs at x={glides}"
        y.settled()
