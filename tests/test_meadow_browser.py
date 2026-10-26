"""Krtek's meadow, played in the installed Chrome: the day's own moves, and
every encounter run to its end, cut short at each of its steps and picked
up again, and caught by bedtime.

Each test opens a seeded, still play (`?seed=1&still`: the mole goes to
nothing by himself), wakes him, does one thing, and checks that it ends with
him free and standing, nobody left about, no console error and no broken
rule (debug.js). Real time: `uv run pytest -m browser -n 8 -k Meadow`.

Adding an encounter? Add it to ENCOUNTERS; test_every_encounter_is_tested
fails until you do.
"""

from __future__ import annotations

from collections.abc import Iterator
from itertools import pairwise
from pathlib import Path

import pytest

pytestmark = pytest.mark.browser
playwright = pytest.importorskip("playwright.sync_api")

ROOT = Path(__file__).resolve().parent.parent
MEADOW = ROOT / "worlds/krtek/games/meadow/game/index.html"
STILL = "seed=1&still"
DONE_MS = 60_000  # the longest encounter runs well under this
CUT_MS = 350  # into a step, the cut comes this soon

# Each encounter and how many steps its chain has (for a choice encounter,
# the steps before the child chooses).
ENCOUNTERS = {"car": 6, "egg": 1, "paint": 5, "poles": 5, "rain": 5}
# What finishes a choice encounter once it waits for a choice: the taps, in
# order (the egg: the mouse and the hare say no, the hen is its mother).
SOLVE = {"egg": ["use egg mouse", "use egg hare", "use egg hen"]}


class Meadow:
    """One open play of the meadow, collecting what went wrong."""

    def __init__(self, browser: object, query: str) -> None:
        self.errors: list[str] = []
        self.page = browser.new_page(viewport={"width": 1280, "height": 720})
        self.page.on(
            "console",
            lambda m: self.errors.append(m.text[:3000]) if m.type == "error" else None,
        )
        self.page.on("pageerror", lambda e: self.errors.append(f"uncaught: {e}"))
        self.page.goto(f"{MEADOW.as_uri()}?{query}")
        self.page.wait_for_function("typeof meadowGame !== 'undefined'")

    def do(self, intent: str) -> None:
        self.page.evaluate("(i) => meadowGame.perform(i)", intent)

    def state(self) -> dict:
        return self.page.evaluate("meadowGame.state()")

    def wait(self, js: str, ms: int = DONE_MS) -> None:
        self.page.wait_for_function(js, timeout=ms)

    def wake(self) -> None:
        self.do("wake")
        self.wait_free()

    def wait_free(self, ms: int = DONE_MS) -> None:
        """Until no gesture is under way."""
        self.wait("!meadowGame.state().busy && meadowGame.state().awake", ms)

    def assert_settled(self) -> None:
        s = self.state()
        assert s["busy"] is None, s
        assert s["pose"] in ("hill", "out", "listen"), s
        assert not self.errors, self.errors


@pytest.fixture
def meadow(browser: object) -> Iterator[callable]:
    opened: list[Meadow] = []

    def open_(query: str = STILL) -> Meadow:
        opened.append(Meadow(browser, query))
        return opened[-1]

    yield open_
    for m in opened:
        m.page.close()


def finish(m: Meadow, name: str) -> None:
    """Taps it to its end: on and on, or, a choice encounter, its choices in turn."""
    for intent in SOLVE.get(name, [f"use {name}"]):
        m.do(intent)
        m.wait_free()
    m.wait(f"meadowGame.state().things.{name} === 'done'")
    m.wait_free()


def arrived(m: Meadow, name: str) -> None:
    m.wait(
        f"meadowGame.state().things.{name} && meadowGame.state().things.{name}.startsWith('step')"
    )


class TestMeadowCoverage:
    def test_every_encounter_is_tested(self, meadow: callable) -> None:
        assert set(meadow().page.evaluate("meadowGame.things")) == set(ENCOUNTERS)


class TestMeadowDay:
    def test_wakes_walks_answers_sniffs_and_paddles(self, meadow: callable) -> None:
        m = meadow()
        m.wake()
        for intent in ("go to 1100", "tap mole", "sniff", "paddle", "go to 300"):
            m.do(intent)
            m.wait_free()
            m.assert_settled()
        assert m.state()["x"] == 300

    def test_a_tap_cuts_any_move_short(self, meadow: callable) -> None:
        m = meadow()
        m.wake()
        for first in ("go to 2300", "sniff", "paddle", "tap mole", "dig to 1800"):
            m.do(first)
            m.page.wait_for_timeout(CUT_MS)
            m.do("go to 400")
            m.wait_free()
            m.assert_settled()

    def test_one_encounter_at_a_time(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&day=90&props=egg,poles")
        m.wake()
        m.wait("meadowGame.state().hour >= '13:00'", 40_000)
        things = m.state()["things"]
        assert things["egg"].startswith("step"), things
        assert things["poles"].startswith("at"), (
            "the poles came while the egg still waited"
        )
        finish(m, "egg")
        m.wait("meadowGame.state().things.poles.startsWith('step')", 5_000)
        assert not m.errors, m.errors

    def test_the_day_ends_asleep_in_the_den(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&day=12&props=")
        m.wake()
        m.wait("meadowGame.state().ended && !meadowGame.state().busy", 40_000)
        assert (
            m.page.evaluate("getComputedStyle(document.getElementById('den')).display")
            != "none"
        )
        assert not m.errors, m.errors


@pytest.mark.parametrize("name", sorted(ENCOUNTERS))
class TestMeadowEncounters:
    def test_runs_to_its_end(self, meadow: callable, name: str) -> None:
        m = meadow(f"{STILL}&soon&props={name}")
        m.wake()
        arrived(m, name)
        finish(m, name)
        m.assert_settled()
        assert m.page.evaluate(f"meadowGame.detail('{name}').cast") == []

    @pytest.mark.parametrize("step", range(max(ENCOUNTERS.values())))
    def test_cut_short_at_each_step_then_picked_up(
        self, meadow: callable, name: str, step: int
    ) -> None:
        if step >= ENCOUNTERS[name]:
            pytest.skip("fewer steps")
        m = meadow(f"{STILL}&soon&props={name}")
        m.wake()
        arrived(m, name)
        m.do(f"use {name}")
        m.wait(f"meadowGame.state().things.{name} === 'step {step}'")
        m.page.wait_for_timeout(CUT_MS)
        m.do("go to 1400")
        m.wait_free()
        m.assert_settled()
        assert m.page.evaluate(f"meadowGame.detail('{name}').cast") == [], (
            "visitors left about"
        )
        finish(m, name)
        m.assert_settled()

    def test_hurried_by_taps(self, meadow: callable, name: str) -> None:
        m = meadow(f"{STILL}&soon&props={name}")
        m.wake()
        arrived(m, name)
        last = SOLVE.get(name, [f"use {name}"])[
            -1
        ]  # a choice encounter: its answer, tapped again and again
        for _ in range(40):
            m.do(last)
            m.page.wait_for_timeout(300)
            if m.state()["things"][name] == "done":
                break
        m.wait(f"meadowGame.state().things.{name} === 'done'")
        m.wait_free()
        m.assert_settled()

    def test_a_tap_on_him_hurries_it_rather_than_cuts_it(
        self, meadow: callable, name: str
    ) -> None:
        if name in SOLVE:
            pytest.skip("a choice encounter: TestMeadowEgg taps him mid-choice")
        m = meadow(f"{STILL}&soon&props={name}")
        m.wake()
        arrived(m, name)
        m.do(f"use {name}")
        m.wait(f"meadowGame.state().things.{name} === 'step 1'")
        m.page.wait_for_timeout(1500)
        m.page.locator(
            "#mole-out .mole .mole-body, #mole .mole .mole-body"
        ).first.click(force=True)
        m.page.wait_for_timeout(200)
        assert m.state()["busy"] == name, "a tap on him cut the encounter short"
        m.wait(f"meadowGame.state().things.{name} === 'done'")
        m.wait_free()
        m.assert_settled()

    def test_bedtime_in_the_middle(self, meadow: callable, name: str) -> None:
        m = meadow(f"{STILL}&soon&props={name}&day=16")
        m.wake()
        arrived(m, name)
        m.do(f"use {name}")
        m.wait("meadowGame.state().ended && !meadowGame.state().busy", 40_000)
        assert m.page.evaluate(f"meadowGame.detail('{name}').cast") == []
        assert not m.errors, m.errors


class TestMeadowCar:
    def test_once_mended_a_tap_gives_another_ride(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&soon&props=car")
        m.wake()
        arrived(m, "car")
        m.do("use car")
        m.wait("meadowGame.state().things.car === 'done'")
        m.wait_free()
        m.do("use car")
        m.wait("meadowGame.state().busy === 'car'", 2_000)
        m.wait("meadowGame.detail('car').riding", 10_000)
        m.do("use car")  # a tap while it rides is part of the ride
        assert m.state()["busy"] == "car"
        m.wait_free()
        m.assert_settled()
        assert not m.page.evaluate("meadowGame.detail('car').riding")

    def test_a_cut_mid_ride_leaves_him_in_the_meadow(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&soon&props=car")
        m.wake()
        arrived(m, "car")
        m.do("use car")
        m.wait("meadowGame.state().things.car === 'done'")
        m.wait_free()
        m.do("use car")
        m.wait("meadowGame.detail('car').riding", 10_000)
        m.page.wait_for_timeout(900)  # zooming towards the spring
        m.do("tap mole")
        m.wait_free()
        m.assert_settled()
        assert 140 <= m.state()["x"] <= 3860
        m.do("use car")  # it sets off facing the spring again
        m.wait("meadowGame.detail('car').riding", 10_000)
        m.wait_free()
        m.assert_settled()


class TestMeadowView:
    def test_the_view_follows_him_and_a_tap_lands_where_aimed(
        self, meadow: callable
    ) -> None:
        m = meadow()
        m.wake()
        m.do("go to 3500")
        m.wait_free()
        m.page.wait_for_timeout(1500)  # the view eases after him
        view = m.state()["view"]
        assert view >= 2300, f"the view stayed behind at {view}"
        # a real tap a quarter of the way across the screen, low on the grass
        m.page.mouse.click(1280 * 0.25, 720 * 0.9)
        m.wait_free()
        assert abs(m.state()["x"] - (view + 400)) < 30, m.state()
        m.assert_settled()


class TestMeadowWalking:
    def test_quick_taps_never_make_him_jump(self, meadow: callable) -> None:
        m = meadow()
        m.wake()
        m.do("go to 1000")  # out of his molehill and walking
        m.wait_free()
        # where he is drawn, every animation frame, timed in the page (load can't stretch it)
        m.page.evaluate(
            """() => { window.__xs = []; const f = (t) => { window.__xs.push([t, Mole.drawnX()]); if (window.__xs.length < 100000) requestAnimationFrame(f) }; requestAnimationFrame(f) }"""
        )
        for i in range(8):  # each tap cuts a walk under way
            m.page.mouse.click(1250 if i % 2 else 30, 650)
            m.page.wait_for_timeout(400)
        xs = m.page.evaluate("window.__xs")
        speed = max(abs(b[1] - a[1]) / max(1, b[0] - a[0]) for a, b in pairwise(xs))
        # a run is about 0.43 units/ms; the bug teleported him thousands of units in one frame
        assert speed < 1.5, f"he jumped: {speed:.1f} units/ms"
        m.wait_free()
        m.assert_settled()

    def test_an_arrow_held_walks_him_until_let_go(self, meadow: callable) -> None:
        m = meadow()
        m.wake()
        x0 = m.state()["x"]
        m.page.keyboard.down("ArrowRight")
        m.page.wait_for_timeout(1200)
        m.page.keyboard.up("ArrowRight")
        m.wait_free(3_000)
        x1 = m.state()["x"]
        assert 150 < x1 - x0 < 1500, (x0, x1)
        m.page.wait_for_timeout(600)
        assert m.state()["x"] == x1, "he walked on after the key was let go"
        m.assert_settled()


class TestMeadowEgg:
    """The egg is the child's choice: whom to show it to."""

    def open(self, meadow: callable, query: str = "") -> Meadow:
        m = meadow(f"{STILL}&soon&props=egg{query}")
        m.wake()
        arrived(m, "egg")
        m.do("use egg")
        m.wait("meadowGame.state().things.egg === 'choosing'")
        m.wait_free()
        return m

    def test_wrong_guesses_answer_and_wait_the_hen_resolves(
        self, meadow: callable
    ) -> None:
        m = self.open(meadow)
        assert m.page.evaluate("meadowGame.detail('egg').where") == "carried", (
            "he holds it up, waiting"
        )
        for who in ("mouse", "hare", "mouse"):  # a wrong guess can be had again
            m.do(f"use egg {who}")
            m.wait_free()
            assert m.state()["things"]["egg"] == "choosing", who
            assert m.page.evaluate("meadowGame.detail('egg').cast") == []
        m.do("use egg hen")
        m.wait("meadowGame.state().things.egg === 'done'")
        m.wait_free()
        m.assert_settled()

    def test_another_choice_mid_way_sends_him_there_instead(
        self, meadow: callable
    ) -> None:
        m = self.open(meadow)
        m.do("use egg mouse")
        m.page.wait_for_timeout(1200)  # the mouse is out
        m.do("use egg hare")
        m.wait(
            'meadowGame.trace().includes(\'try {"thing":"egg","who":"hare"}\')', 5_000
        )
        m.wait_free()
        assert m.page.evaluate("meadowGame.detail('egg').cast") == [], (
            "the mouse was left out"
        )
        m.assert_settled()

    def test_a_tap_on_the_egg_while_waiting_is_a_try(self, meadow: callable) -> None:
        m = self.open(meadow)
        m.page.locator(".mole-carry .egg-shape").click(
            force=True
        )  # a real tap on the egg he holds up
        m.page.wait_for_timeout(100)
        assert m.state()["busy"] == "egg"
        m.wait_free()
        assert m.page.evaluate("meadowGame.detail('egg').tried") == ["mouse"]
        m.assert_settled()

    def test_tapping_only_the_egg_solves_it(self, meadow: callable) -> None:
        """A child taps the egg, not the hen: tap after tap he tries the mouse,
        the hare, then the hen, and it is solved (in a filmed day it waited all day)."""
        m = self.open(meadow)
        for _ in range(3):
            m.do("use egg")
            m.wait_free()
        m.wait("meadowGame.state().things.egg === 'done'")
        m.assert_settled()

    def test_a_tap_on_him_mid_choice_hurries_it_rather_than_cuts_it(
        self, meadow: callable
    ) -> None:
        m = self.open(meadow)
        m.do("use egg hare")
        m.page.wait_for_timeout(600)
        m.page.locator(
            "#mole-out .mole .mole-body, #mole .mole .mole-body"
        ).first.click(force=True)
        m.page.wait_for_timeout(200)
        assert m.state()["busy"] == "egg", "a tap on him cut the choice short"
        m.wait_free()
        m.assert_settled()

    def test_wandering_off_mid_choice_and_coming_back(self, meadow: callable) -> None:
        m = self.open(meadow)
        m.do("use egg mouse")
        m.page.wait_for_timeout(1300)
        m.do("go to 2000")
        m.wait_free()
        m.assert_settled()
        assert m.page.evaluate("meadowGame.detail('egg').cast") == []
        m.do("use egg hen")
        m.wait("meadowGame.state().things.egg === 'done'")
        m.wait_free()
        m.assert_settled()

    def test_left_alone_he_tries_them_himself(self, meadow: callable) -> None:
        m = meadow("seed=1&soon&props=egg")
        m.wake()
        m.wait("meadowGame.state().things.egg === 'done'", 90_000)
        tries = m.page.evaluate(
            "meadowGame.trace().split('\\n').filter((l) => l.includes(' try ')).map((l) => JSON.parse(l.slice(l.indexOf('{'))).who)"
        )
        assert tries[:3] == ["mouse", "hare", "hen"], tries
        assert not m.errors, m.errors

    def test_doing_something_else_puts_the_egg_down(self, meadow: callable) -> None:
        m = self.open(meadow)
        m.do("go to 2000")
        m.wait_free()
        assert m.page.evaluate("meadowGame.detail('egg').where") == "ground"
        assert not m.page.evaluate("Mole.state.holdsUp")
        m.assert_settled()

    def test_choices_tapped_while_he_finds_it_dont_restart_it(
        self, meadow: callable
    ) -> None:
        m = meadow(f"{STILL}&soon&props=egg")
        m.wake()
        arrived(m, "egg")
        m.do("use egg")
        m.page.wait_for_timeout(400)
        for _ in range(6):  # a toddler tapping the hen over and over
            m.do("use egg hen")
            m.page.wait_for_timeout(200)
        m.wait("meadowGame.state().things.egg === 'done'")
        steps = m.page.evaluate(
            "meadowGame.trace().split('\\n').filter((l) => l.includes(' step ')).length"
        )
        assert steps == 1, f"finding it started over {steps} times"
        m.wait_free()
        m.assert_settled()

    def test_a_cut_as_the_hare_hops_home_still_finishes_it(
        self, meadow: callable
    ) -> None:
        m = meadow(f"{STILL}&soon&props=egg,poles&day=90")
        m.wake()
        arrived(m, "egg")
        m.do("use egg hen")
        m.wait(
            "meadowGame.detail('egg').where === 'home'"
        )  # given back; the hare hops off
        m.do("go to 300")
        m.wait_free()
        assert m.state()["things"]["egg"] == "done"
        m.wait(
            "meadowGame.state().things.poles.startsWith('step')", 20_000
        )  # and the next one comes
        assert not m.errors, m.errors


MUSIC = "meadowGame.trace().split('\\n').filter((l) => l.includes(' music ')).map((l) => JSON.parse(l.slice(l.indexOf('{'))).part)"


def in_order(parts: list[str], wanted: list[str]) -> bool:
    """Whether `wanted` comes in `parts` in that order (others may come between)."""
    it = iter(parts)
    return all(w in it for w in wanted)


class TestMeadowMusic:
    """The meadow's music (music.js): the theme as he wakes, its moods in an
    encounter, the cricket from dusk. Read from the trace: whether a take is
    heard is for Adam's ears."""

    def test_the_theme_as_he_comes_up(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&props=")
        m.wake()
        m.wait(f"{MUSIC}.includes('morning')", 10_000)
        assert not m.errors, m.errors

    def test_an_encounter_turns_the_theme_curious_sad_then_happy(
        self, meadow: callable
    ) -> None:
        m = meadow(f"{STILL}&soon&props=poles")
        m.wake()
        arrived(m, "poles")
        finish(m, "poles")
        parts = m.page.evaluate(MUSIC)
        assert in_order(parts, ["curious", "sad", "happy"]), parts
        assert not m.errors, m.errors

    def test_the_music_steps_back_for_the_fox_and_comes_back_happy(
        self, meadow: callable
    ) -> None:
        m = meadow(f"{STILL}&soon&props=paint")
        m.wake()
        arrived(m, "paint")
        m.do("use paint")
        m.wait("meadowGame.state().things.paint === 'step 1'")
        m.page.wait_for_timeout(1500)  # the fade
        assert m.page.evaluate("meadowGame.music()") is None, "music over the fox"
        finish(m, "paint")
        assert m.page.evaluate(MUSIC)[-1] == "happy"
        assert not m.errors, m.errors

    def test_the_cricket_fiddles_from_dusk_until_the_circle_closes(
        self, meadow: callable
    ) -> None:
        m = meadow(f"{STILL}&day=12&props=")
        m.wake()
        m.wait(f"{MUSIC}.includes('lullaby')", 40_000)
        assert m.page.evaluate("meadowGame.music()") == "lullaby"
        m.wait("meadowGame.state().ended && !meadowGame.state().busy", 40_000)
        m.page.wait_for_timeout(1500)  # the fade
        assert m.page.evaluate("meadowGame.music()") is None
        parts = m.page.evaluate(MUSIC)
        assert parts[parts.index("lullaby") :] == ["lullaby"] * len(
            parts[parts.index("lullaby") :]
        ), f"something but the cricket after dusk: {parts}"
        assert not m.errors, m.errors


class TestMeadowCritters:
    """The butterflies (critters.js): one comes, a tap sends it off and has
    him look up after it, they go at sunset; nobody is left stuck."""

    def test_a_tap_sends_it_off_and_he_looks_up(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&props=&critters=now")
        m.wake()
        m.wait(  # in view, over the meadow: one that comes in upwind takes longer
            "Critters.out.some((b) => b.x > World.state.view.x0 + 150 && b.x < World.state.view.x1 - 150)",
            15_000,
        )
        m.page.locator("[data-critter]").first.click(force=True)
        m.wait("meadowGame.trace().includes('\"tapped\":true')", 5_000)
        m.wait("document.querySelector('[data-critter]') === null", 15_000)
        m.wait_free()
        m.assert_settled()

    def test_none_in_a_still_play_unless_asked(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&props=")
        m.wake()
        m.page.wait_for_timeout(4000)
        assert (
            m.page.evaluate("document.querySelectorAll('[data-critter]').length") == 0
        )
        assert not m.errors, m.errors

    def test_they_go_at_sunset(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&props=&critters=now&day=20")
        m.wake()
        m.wait("meadowGame.state().ended", 40_000)
        m.wait("document.querySelector('[data-critter]') === null", 15_000)
        assert not m.errors, m.errors


class TestMeadowSnail:
    """The snail (critters.js): it comes up out of the grass where its shelter
    is wet, a tap tucks it into its shell and has him look at it; and in a
    play without rain it never comes."""

    def test_a_tap_tucks_it_in_and_he_looks(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&props=&critters=snail")
        m.wake()
        m.do("go to 1450")
        m.wait("Critters.snail !== null", 6_000)
        m.page.wait_for_timeout(5000)  # up out of the grass
        m.page.locator("[data-critter=snail]").click(force=True)
        m.wait("Critters.snail && Critters.snail.tucked", 3_000)
        m.wait("Critters.snail && !Critters.snail.tucked", 8_000)  # and out again
        m.wait_free()
        m.assert_settled()

    def test_none_without_rain(self, meadow: callable) -> None:
        m = meadow("seed=3&props=&day=30")
        m.wake()
        m.wait("meadowGame.state().ended", 40_000)
        assert '"snail"' not in m.page.evaluate("meadowGame.trace()")
        assert not m.errors, m.errors


class TestMeadowWind:
    """The wind (weather.js on wind.js): a strong gust carries leaves or seeds
    across from out of sight and off out of sight, the plants lean further,
    and it is all in the world state; nothing is left behind."""

    SWAY = "parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sway'))"

    def test_a_gust_carries_something_across_and_the_plants_lean(
        self, meadow: callable
    ) -> None:
        m = meadow(f"{STILL}&props=&wind=gust")
        m.wake()
        breeze = m.page.evaluate(self.SWAY)
        m.wait("document.querySelectorAll('.carried').length > 0", 6_000)
        assert m.page.evaluate("World.state.wind") > 0.7
        assert m.page.evaluate(self.SWAY) > breeze + 2
        m.wait("document.querySelectorAll('.carried').length === 0", 10_000)
        assert '"carries"' in m.page.evaluate("meadowGame.trace()")
        m.wait_free()
        m.assert_settled()

    def test_it_drops_at_sunset(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&props=&day=20")
        m.wake()
        m.wait("meadowGame.state().ended", 40_000)
        m.wait("World.state.wind < 0.1", 15_000)
        assert not m.errors, m.errors


class TestMeadowTapHim:
    """A tap on him: every answer in turn (wave, peekaboo, a jump of joy, a
    think, a laugh behind his hands), never the same twice running; each
    ends with him free, and each can be cut short by a tap elsewhere."""

    HOWS = "meadowGame.trace().split('\\n').filter((l) => l.includes(' says ')).map((l) => JSON.parse(l.slice(l.indexOf('{'))).how)"

    def test_every_answer_in_turn_never_twice_running(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&props=")
        m.wake()
        for _ in range(10):
            m.do("tap mole")
            m.wait_free()
            m.assert_settled()
        hows = m.page.evaluate(self.HOWS)
        assert set(hows[:5]) == {"cheer", "wave", "peekaboo", "laughs", "ponder"}, hows
        assert all(a != b for a, b in pairwise(hows)), hows

    def test_each_answer_cut_short(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&props=")
        m.wake()
        for _ in range(5):
            m.do("tap mole")
            m.page.wait_for_timeout(CUT_MS)
            m.do("go to 600")
            m.wait_free()
            m.assert_settled()
            assert m.page.evaluate("meadowGame.state().pose") != "listen"


class TestMeadowTapsWait:
    """As in the yard: while a step of an encounter plays, a tap elsewhere
    waits for it (he glances that way), then he goes."""

    def test_a_tap_on_the_meadow_mid_step_waits_then_goes(
        self, meadow: callable
    ) -> None:
        m = meadow(f"{STILL}&soon&props=poles")
        m.wake()
        arrived(m, "poles")
        m.do("use poles")
        m.wait("meadowGame.state().things.poles === 'step 0'")
        m.page.wait_for_timeout(CUT_MS)
        m.do("go to 400")
        m.page.wait_for_timeout(200)
        assert m.state()["busy"] == "poles", "the tap cut the step short"
        m.wait("meadowGame.state().busy === 'go'", 15_000)  # the step over, off he goes
        m.wait_free()
        assert m.state()["x"] == 400
        assert m.state()["things"]["poles"] == "step 1", "the step was not kept"
        m.assert_settled()


class TestMeadowChurch:
    """The church bell on the hour (church.js): twice each hour from 09:00,
    longer at sunset; he looks up at it when free; nobody is left stuck."""

    def test_the_bell_rings_each_hour_and_the_evening_bell(
        self, meadow: callable
    ) -> None:
        m = meadow(f"{STILL}&props=&day=40")
        m.wake()
        m.wait("meadowGame.state().ended && !meadowGame.state().busy", 50_000)
        bells = m.page.evaluate(
            "meadowGame.trace().split('\\n').filter((l) => l.includes(' bell ')).map((l) => JSON.parse(l.slice(l.indexOf('{'))))"
        )
        assert [b["hour"] for b in bells] == list(range(9, 20)), bells
        assert bells[-1]["strokes"] > bells[0]["strokes"], "no evening bell"
        assert not m.errors, m.errors


class TestMeadowSpring:
    """The spring's life (spring.js): the frog plops in when tapped, and its
    life comes and goes through the day without breaking a rule."""

    def test_a_tap_on_the_frog_and_it_plops_in(self, meadow: callable) -> None:
        m = meadow("seed=2&still&props=")  # seed 2: this play has a frog
        m.wake()
        assert m.page.evaluate("Spring.frog"), "no frog this play: pick another seed"
        m.do("tap frog")
        m.wait("meadowGame.trace().includes('\"plop\":true')", 3_000)
        m.wait("Spring.frog", 20_000)  # and later it climbs back on its pad
        assert not m.errors, m.errors

    def test_a_splash_near_the_frog_and_it_plops_in(self, meadow: callable) -> None:
        """The world model: the frog hears his paddling (a splash) and plops in."""
        m = meadow("seed=2&still&props=")
        m.wake()
        assert m.page.evaluate("Spring.frog"), "no frog this play: pick another seed"
        m.do("paddle")
        m.wait(
            'meadowGame.trace().includes(\'"plop":true,"tapped":false\')', 20_000
        )  # he walks to the spring first
        m.wait_free()
        m.assert_settled()

    def test_its_life_comes_and_goes_all_day(self, meadow: callable) -> None:
        m = meadow("seed=3&props=&day=45")
        m.wake()
        m.wait("meadowGame.state().ended && !meadowGame.state().busy", 60_000)
        assert "spring" in m.page.evaluate("meadowGame.trace()")
        assert not m.errors, m.errors
