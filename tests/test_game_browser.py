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
import re
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
    "wakeUp": "Reksio.wakeUp()",
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
    # the bowl on his head (antics.js): sitting ones get up again with freed()
    "bowlShake": "Reksio.bowlShake()",
    "slump": "Reksio.slump().then(() => Reksio.freed())",
    "mope": "Reksio.slump().then(() => Reksio.mope(Clock.wait(600))).then(() => Reksio.freed())",
    "bowlBark": "Reksio.bowlBark()",
    "tugged": "Reksio.tugged()",
    "freed": "Reksio.freed()",
    "squint": "Reksio.squint()",
    # his tail caught in the bramble (antics.js): sitting or posed ones are
    # followed by what comes after them in the gag
    "swish": "Reksio.swish()",
    "yanked": "Reksio.yanked()",
    "strain": "Reksio.strain().then(() => Reksio.freed())",
    "sulk": "Reksio.sulk().then(() => Reksio.hearsBee()).then(() => Reksio.leapFright(80))",
    "hearsBee": "Reksio.hearsBee().then(() => Reksio.leapFright(80))",
    "leapFright": "Reksio.leapFright(80).then(() => Reksio.freed())",
    # counting along with the cuckoo (antics.js): head up and proud until glare()
    "barkUp": "Reksio.barkUp().then(() => Reksio.glare())",
    "smugTurn": "Reksio.smugTurn().then(() => Reksio.glare())",
    "spunRound": "Reksio.spunRound().then(() => Reksio.glare())",
    "glare": "Reksio.glare()",
    # the things' variations (antics.js, things.js)
    "puzzled": "Reksio.puzzled()",
    "waitForDrop": "Reksio.waitForDrop(800)",
    "hiccups": "Reksio.hiccups()",
    "tryToFly": "Reksio.tryToFly()",
    "crossEyed": "Reksio.crossEyed()",
    "blow": "Reksio.blow()",
    "puffUp": "Reksio.puffUp()",
    "peekOver": "Reksio.peekOver(70)",
    "gnaw": "Reksio.gnaw(() => {})",
    "climb": "Reksio.climb(120, 4).then(() => Reksio.climbDown(4))",
    "climbDown": "Reksio.climb(60, 2).then(() => Reksio.climbDown(2, () => Clock.wait(300)))",
    "aww": "Reksio.aww()",
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
    "wear",  # what a gag puts on him: the bowl (TestBowl), his tail caught (TestBramble)
    "wearing",
    "pointAt",
    "addGestures",  # how gestures.js and antics.js add theirs
    "keepBetween",  # set once by the game
    "listen",
    "mouth",
    "beginStretch",
    "endStretch",  # as "stretch" above
    "duck",  # the doghouse
    "sleepIn",  # the morning (TestMorning)
    "floatZ",  # as "nap", and the morning
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
    "bowl",
    "bramble",
    "cuckoo",
]
# Moves that need something in the yard this test can't quickly bring: skipped
# (and shown as skipped) when it isn't there.
ACT_NEEDS = {"puddle": "puddles, after rain", "snail": "a snail, after rain"}
# What each move needs in the page address.
ACT_QUERY = {"fly": "&creatures=fly", "bramble": "&props=berries"}

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
    "hen",
]
POOL = {"bowl", "dig", "film", "trap", "tree", "berries", "hen"}  # layout.js PROP_POOL

CRITTERS = {"fly": "fly", "bee": "bee", "spider": "spider"}
CRITTER_NEEDS = {"snail": "a snail, after rain", "worm": "worms, after rain"}


class Yard:
    """One open play of the yard, collecting what went wrong."""

    def __init__(
        self,
        browser: object,
        query: str,
        size: tuple[int, int] = (1280, 720),
        touch: bool = True,
    ) -> None:
        self.errors: list[str] = []
        self.page = browser.new_page(
            viewport={"width": size[0], "height": size[1]}, has_touch=touch
        )
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

    def events(self, kind: str) -> list[dict]:
        """The trace events of one kind, oldest first."""
        return [e for e in self.page.evaluate("yardGame.events()") if e["kind"] == kind]

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

    def open_(
        query: str = STILL, size: tuple[int, int] = (1280, 720), touch: bool = True
    ) -> Yard:
        opened.append(Yard(browser, query, size, touch))
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
    y = yard(f"{STILL}&flowers=1&mouse-at=0&visitor-at=0&hen-at=0{props}")
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
        y.page.evaluate("yardGame.walk(Layout.MIN_X + 100)")
        s = y.settled()
        assert s["uses"].get(name) == 1
        assert abs(s["reksio"]["x"] - y.page.evaluate("Layout.MIN_X + 100")) < 5, (
            "the waiting walk never ran"
        )


class TestVariations:
    """After its first use, each thing with a pool plays one of its
    variations every time (things.js VARIATIONS), each running to its end
    and each cut short by a tap leaving him free."""

    @pytest.mark.parametrize(
        ("name", "uses"),
        [("tap", 4), ("flowers", 3), ("gate", 5), ("bird", 3), ("hen", 4)],
    )
    def test_each_variation_runs_to_the_end(
        self, yard: callable, name: str, uses: int
    ) -> None:
        y = open_for_thing(yard, name)
        for _ in range(uses):
            y.run(f"yardGame.use('{name}')")
            y.settled()
        seen = re.findall(
            rf'variation \{{"name":"{name}","v":"(\w+)"\}}',
            y.page.evaluate("yardGame.trace()"),
        )
        assert sorted(seen) == sorted(
            y.page.evaluate(f"Things.VARIATIONS['{name}']")
        ), seen

    @pytest.mark.parametrize("name", ["tap", "flowers", "gate", "bird", "hen"])
    def test_a_tap_mid_variation_waits_and_he_ends_free(
        self, yard: callable, name: str
    ) -> None:
        y = open_for_thing(yard, name)
        y.run(f"yardGame.use('{name}')")
        y.settled()
        y.page.evaluate(f"yardGame.tap('{name}')")
        y.page.wait_for_function("yardGame.state().busy", timeout=DONE_MS)
        y.page.wait_for_timeout(1500)
        y.page.evaluate("yardGame.walk(Layout.MIN_X + 100)")
        y.settled()


class TestNap:
    """A nap in the doghouse: the first plain, each after with something on
    top, all four before any comes again (nap.js)."""

    def test_each_nap_after_the_first_brings_something_new(
        self, yard: callable
    ) -> None:
        y = open_for_thing(yard, "doghouse")
        for _ in range(5):
            y.run("yardGame.use('doghouse')")
            y.settled()
        naps = re.findall(
            r'nap \{"variation":(null|"\w+")\}', y.page.evaluate("yardGame.trace()")
        )
        assert naps[0] == "null", naps
        assert sorted(naps[1:]) == sorted(
            f'"{v}"' for v in y.page.evaluate("Object.keys(Nap.VARIATIONS)")
        ), naps

    def test_a_first_nap_asked_for_with_extra_has_something_on_top(
        self, yard: callable
    ) -> None:
        y = open_for_thing(yard, "doghouse")
        y.run("yardGame.use('doghouse', true)")
        y.settled()
        assert 'nap {"variation":null}' not in y.page.evaluate("yardGame.trace()")

    def test_he_sleeps_as_himself_in_the_morning_and_at_bedtime(
        self, yard: callable
    ) -> None:
        """One sleeping Reksio: the figure in the doorway, not the old drawing."""
        y = yard("seed=1&rain=0&creatures=")
        assert y.page.evaluate("!document.getElementById('nap')"), (
            "the old drawing is back"
        )
        assert y.page.evaluate(
            "getComputedStyle(document.querySelector('#doghouse g[clip-path]')).display !== 'none'"
        ), "not asleep in the doorway this morning"


class TestBowl:
    """The empty bowl sticks on his head, and the bird pulls it off."""

    @staticmethod
    def stuck(yard: callable, extra: str = "") -> Yard:
        y = yard(f"seed=1&still&creatures=&props=bowl&{extra or 'rain=0'}")
        y.run("yardGame.use('bowl', false)")  # he eats it all
        return y

    def test_stuck_and_pulled_off_and_friends_after(self, yard: callable) -> None:
        y = self.stuck(yard)
        y.run("yardGame.use('bowl', true)")
        y.settled()
        assert y.events("bowl stuck") and y.events("bird to the rescue")
        got = y.page.evaluate("""() => ({
            wearing: Reksio.wearing('bowl'), flying: Bird.flying, friend: Bird.friend,
            bowl: getComputedStyle(document.getElementById('bowl-body')).visibility })""")
        assert got == {
            "wearing": False,
            "flying": False,
            "friend": True,
            "bowl": "visible",
        }

    def test_taps_while_stuck_are_barks_and_nothing_waits_for_after(
        self, yard: callable
    ) -> None:
        y = self.stuck(yard)
        y.start("yardGame.use('bowl', true)")
        y.page.wait_for_function("Reksio.wearing('bowl')", timeout=10_000)
        x = y.page.evaluate("Reksio.x")
        for intent in ["press", "release", "walk to 3000", "go to gate"]:
            y.page.evaluate(f"yardGame.perform('{intent}')")
            y.page.wait_for_timeout(200)
        s = y.settled()
        assert len(y.events("stuck tap")) == 3  # the release isn't a tap
        assert abs(s["reksio"]["x"] - x) < 200, "a tap while stuck was kept for after"
        assert "gate" not in s["uses"]

    def test_taps_all_through_the_tugs_dont_cut_them_short(
        self, yard: callable
    ) -> None:
        y = self.stuck(yard)
        y.start("yardGame.use('bowl', true)")
        y.page.wait_for_function("Reksio.wearing('bowl')", timeout=10_000)
        while y.page.evaluate("Reksio.wearing('bowl')"):  # a child tapping away
            y.page.evaluate("yardGame.perform('press')")
            y.page.evaluate("yardGame.perform('release')")
            y.page.wait_for_timeout(300)
        y.settled()
        on = y.events("bird on the bowl")[0]["t"]
        off = y.events("bowl off")[0]["t"]
        assert off - on > 2500, (
            f"the tugs took only {off - on} ms"
        )  # two pecks, three tugs

    def test_the_bird_beside_him_can_be_tapped(self, yard: callable) -> None:
        y = self.stuck(yard)
        y.start("yardGame.use('bowl', true)")
        y.page.wait_for_function(
            "yardGame.events().some((e) => e.kind === 'bowl off')", timeout=30_000
        )
        y.page.wait_for_timeout(900)  # landed beside him
        y.page.tap("#bird .bird >> nth=0")
        y.settled()  # the gag, then the tap's turn
        y.page.wait_for_function(
            "yardGame.events().some((e) => e.kind === 'bird visits')", timeout=DONE_MS
        )
        y.settled()

    def test_left_alone_he_gets_stuck_by_himself_and_a_tap_is_a_bark(
        self, yard: callable
    ) -> None:
        y = yard(f"{STILL}&props=bowl")  # a full bowl: he eats it first
        y.start("yardGame.act('bowl')")
        y.page.wait_for_function("Reksio.wearing('bowl')", timeout=20_000)
        x = y.page.evaluate("Reksio.x")
        y.page.evaluate("yardGame.perform('walk to 3000')")  # doesn't cut it short now
        s = y.settled()
        assert y.events("stuck tap") and y.events("bowl off")
        assert abs(s["reksio"]["x"] - x) < 200
        assert y.page.evaluate("Bowl.stuckTimes") == 1
        assert not y.page.evaluate("yardGame.actOk('bowl')"), "only once a play"

    def test_once_friends_the_bird_comes_down_to_him(self, yard: callable) -> None:
        y = self.stuck(yard)
        y.run("yardGame.use('bowl', true)")
        y.settled()
        perch = y.page.evaluate("Bird.perch.x")
        y.run("yardGame.use('bird')")
        y.settled()
        assert y.events("bird visits")
        assert y.page.evaluate("Bird.perch.x") == perch

    def test_rain_coming_on_while_he_is_stuck(self, yard: callable) -> None:
        y = self.stuck(yard, "rain=1&rain-at=3")
        y.run("yardGame.use('bowl', true)")
        y.settled()
        assert y.page.evaluate("Weather.phase") in (
            "clouding",
            "raining",
            "clearing",
            "after",
        )
        assert not y.page.evaluate("Reksio.wearing('bowl')")


class TestBramble:
    """His tail caught in the bramble, and a bee frightens him free."""

    def freed(self, y: Yard) -> dict:
        s = y.settled()
        assert y.events("tail caught") and y.events("tail free")
        got = y.page.evaluate("""() => ({
            pinned: Reksio.wearing('tail'), hook: !!document.getElementById('snag-hook'),
            caught: Bramble.caughtTimes })""")
        assert got == {"pinned": False, "hook": False, "caught": 1}
        return s

    @pytest.mark.parametrize("creatures", ["", "bee"], ids=["bee-a-guest", "bee-out"])
    def test_caught_and_frightened_free(self, yard: callable, creatures: str) -> None:
        y = yard(f"seed=1&still&rain=0&flowers=1&props=berries&creatures={creatures}")
        y.run("yardGame.use('berries', true)")
        self.freed(y)
        assert y.events("bee comes")

    def test_taps_while_caught_are_tries_and_nothing_waits_for_after(
        self, yard: callable
    ) -> None:
        y = yard(f"{STILL}&props=berries")
        y.start("yardGame.use('berries', true)")
        y.page.wait_for_function("Reksio.wearing('tail')", timeout=20_000)
        x = y.page.evaluate("Reksio.x")
        while y.page.evaluate("Reksio.wearing('tail')"):  # a child tapping away
            y.page.evaluate("yardGame.perform('walk to 3000')")
            y.page.wait_for_timeout(400)
        s = self.freed(y)
        taps = y.events("tail tap")
        assert any(t.get("stage") == "stuck" for t in taps), taps
        assert abs(s["reksio"]["x"] - x) < 300, "a tap while caught was kept for after"

    def test_left_alone_his_tail_gets_caught_and_a_tap_is_a_try(
        self, yard: callable
    ) -> None:
        y = yard(f"{STILL}&props=berries")
        y.start("yardGame.act('bramble')")
        y.page.wait_for_function("Reksio.wearing('tail')", timeout=30_000)
        y.page.evaluate("yardGame.perform('walk to 3000')")  # doesn't cut it short now
        self.freed(y)
        assert y.events("stuck tap")
        assert not y.page.evaluate("yardGame.actOk('bramble')"), "only once a play"

    def test_a_press_while_caught_left_alone_is_a_try_not_a_stretch(
        self, yard: callable
    ) -> None:
        y = yard(f"{STILL}&props=berries")
        y.start("yardGame.act('bramble')")
        y.page.wait_for_function("Reksio.wearing('tail')", timeout=30_000)
        y.page.evaluate("yardGame.perform('press')")
        y.page.wait_for_timeout(600)  # longer than a press takes to become a stretch
        assert not y.page.evaluate("Reksio.stretching")
        y.page.evaluate("yardGame.perform('release')")
        self.freed(y)
        assert y.events("stuck tap")

    def test_the_weather_turning_while_caught_leaves_him_be(
        self, yard: callable
    ) -> None:
        y = yard("seed=1&still&creatures=&props=berries&rain=1&rain-at=12")
        y.page.evaluate("""() => {
            window.__noticed = []
            const lookUp = Reksio.lookUp
            Reksio.lookUp = (...a) => { window.__noticed.push(Reksio.wearing('tail')); return lookUp(...a) }
        }""")
        y.run("yardGame.act('bramble')")
        self.freed(y)
        assert True not in y.page.evaluate("window.__noticed"), (
            "looked up at the clouds, caught"
        )

    def test_rain_coming_on_while_he_is_caught(self, yard: callable) -> None:
        y = yard("seed=1&still&creatures=&props=berries&rain=1&rain-at=12")
        y.run("yardGame.use('berries', true)")
        self.freed(y)


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


DAY = ["house", "tap", "bowl", "dig", "gate", "flowers"]  # six new things
DAY_PLAY = f"{STILL}&props=bowl,dig,film&flowers=1"
SUN_X = "Number(document.querySelector('#sun .sun').getAttribute('cx'))"


class TestWholePlay:
    """The day is on a clock (day.js): things done never bring the evening; the
    hour does (?hour starts it late, ?day makes it short)."""

    def test_things_done_never_bring_the_evening(self, yard: callable) -> None:
        y = yard(DAY_PLAY)
        x0 = y.page.evaluate(SUN_X)
        for name in DAY:
            y.page.evaluate(f"yardGame.tap('{name}')")
            y.settled()
        assert not y.state()["dusk"]
        assert y.page.evaluate(SUN_X) > x0, "the sun moves on with the hour"
        assert not y.errors, "\n---\n".join(y.errors)

    def test_the_hour_brings_dusk_and_the_doghouse_brings_bed(
        self, yard: callable
    ) -> None:
        y = yard(f"{DAY_PLAY}&hour=18.9&day=600")  # dusk in 5 s, bedtime in 55
        y.page.wait_for_function("yardGame.state().dusk", timeout=15_000)
        y.page.evaluate("yardGame.tap('bowl')")  # the yard is still open
        y.settled()
        assert y.state()["uses"]["bowl"] == 1 and not y.state()["ended"]
        y.page.evaluate("yardGame.tap('doghouse')")
        y.page.wait_for_function("yardGame.state().ended", timeout=DONE_MS)
        y.page.wait_for_timeout(7000)  # night falls, he walks home, the picture closes
        assert not y.errors, "\n---\n".join(y.errors)

    def test_at_bedtime_supper_then_bed_by_himself(self, yard: callable) -> None:
        y = yard(
            f"{DAY_PLAY}&hour=19.9&day=60"
        )  # 5 s an hour: bedtime in half a second
        y.page.wait_for_function(
            "yardGame.events().some((e) => e.kind === 'supper')", timeout=10_000
        )
        y.page.wait_for_function("yardGame.state().ended", timeout=40_000)
        assert y.state()["moonUp"] == 1 and y.state()["hour"] == 20
        asks = [e["what"] for e in y.events("ask")]
        assert asks == ["supper", "bedtime"], "nobody sent him: the hour did"
        y.page.wait_for_timeout(5000)
        assert not y.errors, "\n---\n".join(y.errors)


class TestEvening:
    """Supper, then bed; a grown-up's holds: the house for the evening now,
    the corner sun for a new morning; after the end a tap does nothing."""

    @staticmethod
    def fed(yard: callable) -> Yard:
        """A play at bedtime, past supper, the doghouse waiting for him."""
        y = yard(f"{DAY_PLAY}&hour=19.95&day=60")
        y.page.wait_for_function(
            "yardGame.events().some((e) => e.kind === 'supper')", timeout=10_000
        )
        y.page.wait_for_function("yardGame.free()", timeout=DONE_MS)
        return y

    def test_after_supper_a_tap_on_the_doghouse_sends_him_in(
        self, yard: callable
    ) -> None:
        y = self.fed(yard)
        y.page.evaluate("yardGame.tap('doghouse')")
        y.page.wait_for_function("yardGame.state().ended", timeout=15_000)
        assert "bedtime" not in [e["what"] for e in y.events("ask")]
        assert not y.errors, "\n---\n".join(y.errors)

    def test_with_his_bowl_out_supper_is_in_his_bowl(self, yard: callable) -> None:
        """One bowl, not two: supper steams in his own bowl, and he eats it there
        (Adam saw a red dish appear by the doghouse beside the bowl)."""
        y = yard(f"{DAY_PLAY}&hour=19.95&day=60")  # DAY_PLAY has the bowl out
        y.page.wait_for_function(
            "document.getElementById('bowl').classList.contains('supper')",
            timeout=10_000,
        )
        y.page.wait_for_function("yardGame.free()", timeout=DONE_MS)
        assert not y.page.evaluate(
            "document.getElementById('supper').classList.contains('served')"
        ), "a second dish by the doghouse"
        assert y.page.evaluate("Math.abs(Reksio.x - Bowl.thing.at())") < 5, (
            "he ate somewhere else"
        )
        assert not y.page.evaluate(
            "document.getElementById('bowl').classList.contains('supper')"
        ), "still steaming, eaten up"
        assert not y.errors, "\n---\n".join(y.errors)

    def test_without_his_bowl_supper_comes_in_a_dish(self, yard: callable) -> None:
        y = yard(f"{STILL}&props=dig,film&flowers=1&hour=19.95&day=60")
        y.page.wait_for_function(
            "yardGame.events().some((e) => e.kind === 'supper')", timeout=10_000
        )
        y.page.wait_for_function("yardGame.free()", timeout=DONE_MS)
        assert y.page.evaluate(
            "document.getElementById('supper').classList.contains('served')"
        )
        assert not y.errors, "\n---\n".join(y.errors)

    def test_a_tap_on_the_doghouse_just_before_bedtime_is_not_overruled_by_supper(
        self, yard: callable
    ) -> None:
        y = yard(
            f"{DAY_PLAY}&hour=19.88&day=600"
        )  # dusk: bedtime about half way back from the far end
        y.page.evaluate("yardGame.walk(3000)")
        y.settled()
        y.page.evaluate(
            "yardGame.tap('doghouse')"
        )  # a long way back: bedtime comes on his way
        y.page.wait_for_function(
            "yardGame.state().bedtime || yardGame.state().ended", timeout=30_000
        )
        assert y.state()["reksio"]["walking"], (
            "bedtime came before or after his walk: no race"
        )
        y.page.wait_for_function("yardGame.state().ended", timeout=30_000)
        assert not y.events("supper"), "sent to bed: no supper on the way"
        assert not y.errors, "\n---\n".join(y.errors)

    def test_kept_busy_past_his_bedtime_he_still_goes_to_bed(
        self, yard: callable
    ) -> None:
        y = self.fed(yard)
        y.page.wait_for_timeout(10_500)  # just before he'd go by himself
        y.page.evaluate("yardGame.tap('bowl')")
        y.page.wait_for_function("yardGame.state().busy", timeout=DONE_MS)
        y.page.evaluate("yardGame.tap('dig')")  # waits its turn, after the bowl
        y.page.wait_for_function("yardGame.state().ended", timeout=60_000)
        assert not y.errors, "\n---\n".join(y.errors)

    def test_holding_the_house_brings_the_evening_and_a_tap_does_not(
        self, yard: callable
    ) -> None:
        y = yard(f"{STILL}&day=600")
        box = y.page.locator("#things [data-thing='house'] .plaster").bounding_box()
        y.page.mouse.move(box["x"] + box["width"] * 0.7, box["y"] + box["height"] * 0.7)
        y.page.mouse.down()
        y.page.wait_for_timeout(2400)
        y.page.mouse.up()
        assert y.events("evening now")
        y.page.wait_for_function("yardGame.state().dusk", timeout=8000)
        assert not y.state()["uses"].get("house"), "a hold is not a tap"
        assert 19 <= y.state()["hour"] < 19.5, "then the last hour as ever"
        assert not y.errors, "\n---\n".join(y.errors)

    def test_after_the_end_a_tap_does_nothing_and_the_sun_held_starts_a_new_morning(
        self, yard: callable
    ) -> None:
        y = self.fed(yard)
        y.page.evaluate("yardGame.tap('doghouse')")
        y.page.wait_for_selector("#again:not([hidden])", timeout=20_000)
        y.page.evaluate("window.__sameplay = true")
        y.page.mouse.click(640, 300)
        y.page.wait_for_timeout(3500)
        assert y.page.evaluate("window.__sameplay === true"), "a tap started a new play"
        box = y.page.locator("#again").bounding_box()
        y.page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        y.page.mouse.down()
        y.page.wait_for_timeout(600)
        y.page.mouse.up()  # let go too soon: nothing
        y.page.wait_for_timeout(2500)
        assert y.page.evaluate("window.__sameplay === true")
        y.page.mouse.down()
        with y.page.expect_navigation(timeout=5000):
            y.page.wait_for_timeout(2400)
        y.page.mouse.up()


CLOUDS_IN_VIEW = """[...document.querySelectorAll('#clouds .cloud')]
    .map((g) => Number(g.getAttribute('transform').match(/translate\\(([-\\d.]+)/)[1]))
    .filter((x) => x > Painting.SKY_LEFT - 150 && x < Painting.SKY_RIGHT + 150)"""


class TestSky:
    """The kind of day (layout.js ?sky=) sets the clouds between showers."""

    def test_a_clear_day_has_no_clouds_in_the_sky(self, yard: callable) -> None:
        y = yard(f"{STILL}&sky=clear")
        for _ in range(6):  # none sweeps across as the play starts, either
            y.page.wait_for_timeout(500)
            assert y.page.evaluate(CLOUDS_IN_VIEW) == []
        assert not y.errors, "\n---\n".join(y.errors)

    def test_a_fair_day_has_clouds_drifting_across(self, yard: callable) -> None:
        y = yard(f"{STILL}&sky=fair")
        y.page.wait_for_timeout(1000)
        before = y.page.evaluate(CLOUDS_IN_VIEW)
        y.page.wait_for_timeout(2000)
        after = y.page.evaluate(CLOUDS_IN_VIEW)
        assert before and after, "clouds in the sky"
        assert sum(after) > sum(before), "drifting to the right"
        assert not y.errors, "\n---\n".join(y.errors)


class TestClock:
    """The cuckoo clock on the house (cuckoo.js): its hands show the hour, and
    the cuckoo calls each hour, eight slow times at bedtime."""

    def test_the_hands_show_the_hour(self, yard: callable) -> None:
        y = yard(f"{STILL}&hour=10.25&day=100000")
        y.page.wait_for_timeout(500)
        got = y.page.evaluate("""() => ['hour', 'minute'].map((h) => parseFloat(
            document.getElementById(`clock-${h}`).style.transform.slice(7)))""")
        assert got == pytest.approx([307.5, 90], abs=1)  # drawn to whole degrees

    def test_it_calls_the_hour_and_he_looks_up_near_it(self, yard: callable) -> None:
        y = yard("seed=1&rain=0&creatures=&morning=0&hour=8.95&day=120")  # 10 s an hour
        y.page.wait_for_function(
            "yardGame.events().filter((e) => e.kind === 'cuckoo').length >= 2",
            timeout=30_000,
        )
        assert [e["calls"] for e in y.events("cuckoo")][:2] == [1, 1]
        assert y.events("glance"), "near the house, he looked up at it"
        assert not y.errors, "\n---\n".join(y.errors)

    def test_eight_slow_calls_at_bedtime(self, yard: callable) -> None:
        y = yard(
            f"{DAY_PLAY}&hour=19.9&day=60"
        )  # 5 s an hour: bedtime in half a second
        y.page.wait_for_function(
            "yardGame.events().some((e) => e.kind === 'cuckoo')", timeout=10_000
        )
        assert [e["calls"] for e in y.events("cuckoo")] == [8]
        y.page.wait_for_timeout(10_000)  # it calls on through supper
        assert not y.errors, "\n---\n".join(y.errors)


class TestLeftAlone:
    def test_he_keeps_busy_on_his_own(self, yard: callable) -> None:
        y = yard(
            "seed=2&rain=0&creatures=&morning=0"
        )  # left alone, not the morning (TestMorning)
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


class TestRealInput:
    """Taps and keys on the real page become the right intents (input.js decides
    what they mean; this checks what yard.js reads from under the finger)."""

    @staticmethod
    def intents(y: Yard) -> list[str]:
        """What was asked of him, not counting the mouse passing over things."""
        return [
            e["intent"]
            for e in y.page.evaluate("yardGame.events()")
            if e["kind"] == "input" and not e["intent"].startswith("notice ")
        ]

    def test_the_mouse_over_a_thing_makes_it_glow_and_him_notice(
        self, yard: callable
    ) -> None:
        """With a mouse, what can be clicked shows itself (Adam, 2026-10-20:
        the kids couldn't tell): the thing glows, and he turns to it."""
        y = yard(STILL, touch=False)  # a desktop: a mouse, no touch
        box = y.page.locator("#things [data-thing='house']").bounding_box()
        left = max(box["x"], 0)  # the house is partly off screen at the start
        y.page.mouse.move(
            (left + box["x"] + box["width"]) / 2, box["y"] + box["height"] / 2
        )
        y.page.wait_for_timeout(300)
        assert y.page.evaluate(
            "getComputedStyle(document.querySelector('#house')).filter.includes('drop-shadow')"
        ), "no glow"
        assert "notice house" in [
            e.get("intent") for e in y.page.evaluate("yardGame.events()")
        ]
        assert y.page.evaluate("Reksio.facing") == -1, "he didn't turn to it"
        y.page.mouse.move(5, 5)
        y.page.wait_for_timeout(300)
        assert not y.page.evaluate(
            "getComputedStyle(document.querySelector('#house')).filter.includes('drop-shadow')"
        ), "still glowing"

    def test_a_tap_on_a_thing_uses_it(self, yard: callable) -> None:
        y = yard(STILL)
        y.page.click("#things [data-thing='house']")  # in view from the start
        y.page.wait_for_function("yardGame.state().uses.house === 1", timeout=DONE_MS)
        assert self.intents(y) == ["go to house"]
        y.settled()

    def test_a_tap_on_open_sky_walks_there(self, yard: callable) -> None:
        y = yard(STILL)
        y.page.mouse.click(1000, 60)  # nothing to tap up there: walk below it
        y.settled()
        assert self.intents(y)[0].startswith("walk to ")
        assert y.state()["reksio"]["x"] > 900

    def test_arrows_walk_and_stop(self, yard: callable) -> None:
        y = yard(STILL)
        x0 = y.state()["reksio"]["x"]
        y.page.keyboard.down("ArrowRight")
        y.page.wait_for_timeout(800)
        y.page.keyboard.up("ArrowRight")
        y.settled()
        assert self.intents(y) == ["walk to 3650", "stop"]
        assert y.state()["reksio"]["x"] > x0

    def test_a_key_tap_barks(self, yard: callable) -> None:
        y = yard(STILL)
        y.page.keyboard.press("b")
        y.settled()
        assert self.intents(y) == ["press", "release"]
        assert any(
            e["kind"] == "ask" and e["what"] == "bark"
            for e in y.page.evaluate("yardGame.events()")
        )


class TestScreens:
    """The view fits the screen: all of the 16:9 view on a big screen, and a
    wider one sees more of the yard, not black bars. On a phone the top of the
    sky is cut so the yard shows bigger, and the sky's things shrink to fit."""

    @staticmethod
    def fit(y: Yard) -> dict:
        return y.page.evaluate("""() => {
            const s = document.getElementById('stage').getBoundingClientRect()
            return { w: s.width, h: s.height, view: Painting.VIEW_W, top: Painting.VIEW_TOP,
                     box: document.getElementById('world').getAttribute('viewBox') }
        }""")

    def test_a_phone_on_its_side_fills_the_screen(self, yard: callable) -> None:
        y = yard(STILL, size=(844, 390))
        f = self.fit(y)
        assert (f["w"], f["h"]) == (844, 390), f
        assert f["top"] == 160 and f["box"] == f"0 160 {f['view']} 740", f
        assert f["view"] == round(740 * 844 / 390), f

    def test_on_a_phone_the_yard_shows_bigger_and_the_sun_still_shows(
        self, yard: callable
    ) -> None:
        y = yard(
            f"{STILL}&morning=0", size=(750, 340)
        )  # a phone in Safari, bars showing
        got = y.page.evaluate("""() => {
            const box = (q) => document.querySelector(q).getBoundingClientRect()
            const stage = box('#stage'), sun = box('#sun .sun'), rk = box('#rk-bob')
            return { reksio: rk.height, sunTop: sun.top - stage.top, sunBottom: sun.bottom - stage.top,
                     wallTop: (334 - Painting.VIEW_TOP) / Painting.VIEW_H * stage.height }
        }""")
        # bigger than with all of the sky showing (98 px, measured before his ears folded down)
        assert got["reksio"] > 110, got
        assert 0 <= got["sunTop"] and got["sunBottom"] < got["wallTop"], got

    def test_he_can_go_anywhere_on_a_phone(self, yard: callable) -> None:
        y = yard(STILL, size=(844, 390))
        y.page.tap("#things [data-thing='house']")
        y.page.wait_for_function("yardGame.state().uses.house === 1", timeout=DONE_MS)
        y.settled()
        y.page.evaluate("yardGame.walk(3650)")  # the far end of the yard
        y.settled()
        y.page.wait_for_timeout(1500)  # the camera catches up
        assert y.state()["camX"] == 4000 - self.fit(y)["view"]

    def test_a_16_9_screen_shows_the_view_as_it_was(self, yard: callable) -> None:
        f = self.fit(yard(STILL))
        assert (f["w"], f["h"], f["view"], f["box"]) == (
            1280,
            720,
            1600,
            "0 0 1600 900",
        )

    def test_wider_than_21_9_gets_bars_at_the_sides(self, yard: callable) -> None:
        f = self.fit(yard(STILL, size=(1600, 600)))
        assert (
            f["view"] == 2100 and f["h"] == 600 and round(f["w"]) == round(600 * 21 / 9)
        )

    def test_a_phone_held_upright_asks_to_be_turned_and_waits(
        self, yard: callable
    ) -> None:
        y = yard("seed=1&rain=0", size=(393, 660))  # the morning: he wakes after 6-9 s
        turn = "!document.getElementById('turn').hidden"
        assert y.page.evaluate(turn)
        t0 = y.page.evaluate("Clock.now()")
        y.page.wait_for_timeout(1000)
        assert y.page.evaluate("Clock.now()") == t0  # the game waits
        y.page.set_viewport_size({"width": 660, "height": 393})
        y.page.wait_for_function(f"!({turn})", timeout=2000)
        y.page.wait_for_function(f"Clock.now() > {t0} + 500", timeout=3000)
        assert not y.errors, "\n---\n".join(y.errors)

    def test_an_upright_tablet_plays_without_asking(self, yard: callable) -> None:
        y = yard(STILL, size=(820, 1180))
        assert y.page.evaluate("document.getElementById('turn').hidden")

    def test_turning_the_phone_refits_it(self, yard: callable) -> None:
        y = yard(STILL, size=(390, 844))
        # upright: a 16:9 stage, bars above and below, the sky cut
        assert self.fit(y)["view"] == round(740 * 16 / 9)
        y.page.set_viewport_size({"width": 844, "height": 390})
        y.page.wait_for_timeout(300)
        assert self.fit(y)["view"] == round(740 * 844 / 390)
        assert not y.errors, "\n---\n".join(y.errors)


class TestHidden:
    def test_hiding_the_page_pauses_what_moves_and_showing_it_plays_on(
        self, yard: callable
    ) -> None:
        y = yard(STILL)
        y.start("Reksio.nap(4000)")
        y.page.wait_for_timeout(300)  # settling down: animations running
        states = """() => document.getAnimations().map((a) => a.playState)"""
        assert "running" in y.page.evaluate(states)
        set_hidden = """(hidden) => {
            Object.defineProperty(document, 'hidden', { value: hidden, configurable: true })
            document.dispatchEvent(new Event('visibilitychange'))
        }"""
        y.page.evaluate(set_hidden, True)
        assert "running" not in y.page.evaluate(states)
        y.page.evaluate(set_hidden, False)
        assert "paused" not in y.page.evaluate(states)
        y.page.evaluate("window.__running")  # the nap plays on to its end
        y.settled()


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


MORNING = "seed=1&rain=0&creatures=&still&morning=1"
DOOR_X = 560  # the doghouse door (things.js DOOR)


class TestMorning:
    """Each play starts with him asleep in his doghouse (?morning=1 asks for it
    in a ?still play); he wakes by himself, or sooner when tapped, and that
    first tap only wakes him."""

    def trace(self, y: Yard) -> str:
        return y.page.evaluate("yardGame.trace()")

    def test_he_wakes_by_himself(self, yard: callable) -> None:
        y = yard(MORNING)
        assert not y.page.evaluate("yardGame.free()"), "awake from the start"
        s = y.settled()
        assert 'wake {"how":"by himself"}' in self.trace(y)
        assert s["reksio"]["x"] == DOOR_X, "woke somewhere else"

    def test_a_tap_wakes_him_and_does_nothing_else(self, yard: callable) -> None:
        y = yard(MORNING)
        y.page.wait_for_timeout(500)
        y.page.mouse.click(1100, 600)  # far off: awake, he would go there
        s = y.settled()
        trace = self.trace(y)
        assert 'wake {"how":"tap"}' in trace and "by himself" not in trace, trace
        assert s["reksio"]["x"] == DOOR_X, "the waking tap also sent him off"

    def test_a_tap_while_he_yawns_sends_him_off(self, yard: callable) -> None:
        y = yard(MORNING)
        y.page.wait_for_timeout(500)
        y.page.mouse.click(1100, 600)  # wakes him
        y.page.wait_for_timeout(1200)  # out, and yawning
        y.page.mouse.click(1100, 600)  # off he goes, the yawn cut short
        s = y.settled()
        assert s["reksio"]["x"] > DOOR_X + 300, s["reksio"]


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
        assert_moves_standing(y)
        y.settled()

    @pytest.mark.parametrize("act", ["sit", "lie", "nap"])
    def test_a_rest_that_ran_its_course_leaves_him_standing(
        self, yard: callable, act: str
    ) -> None:
        """As in Adam's second report: he sat down on his own, got up, did other
        things; then, walked off, he was still drawn sitting and slid along."""
        y = yard()
        y.run(f"yardGame.act('{act}')")
        for other in ["lookUp", "tail", "wish"]:
            y.run(f"yardGame.act('{other}')")
        assert drawn(y)["bob"]["up"], f"still drawn resting: {drawn(y)}"
        y.page.evaluate("yardGame.walk(Reksio.x + 900)")
        assert_moves_standing(y)
        y.settled()


DRAWN = """() => {
    // reksio.js notes on him, every frame, how he was drawn: standing (not
    // resting) and whether a gesture is still posing him
    const r = document.getElementById('reksio')
    return { x: Reksio.x, bob: { up: r.dataset.up === '1' }, anims: r.dataset.posed === '1' }
}"""


def drawn(y: Yard) -> dict:
    """How Reksio is drawn now: his body upright (as standing or walking), or
    tilted and down (as sitting or lying); any leg still animating."""
    return y.page.evaluate(DRAWN)


def assert_moves_standing(y: Yard) -> None:
    """While he moves along, he is drawn standing: never a resting pose, never
    a leg still posed."""
    wrong, last_x = [], None
    for _ in range(30):
        d = drawn(y)
        if (
            last_x is not None
            and abs(d["x"] - last_x) > 0.5
            and (d["anims"] or not d["bob"]["up"])
        ):
            wrong.append((round(d["x"]), d["bob"], d["anims"]))
        last_x = d["x"]
        y.page.wait_for_timeout(40)
    assert not wrong, f"moved while drawn resting or posed: {wrong}"
