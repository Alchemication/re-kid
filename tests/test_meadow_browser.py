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

from tests.game_page import GamePage

pytestmark = pytest.mark.browser
playwright = pytest.importorskip("playwright.sync_api")

ROOT = Path(__file__).resolve().parent.parent
MEADOW = ROOT / "worlds/krtek/games/meadow/game/index.html"
STILL = "seed=1&still"
DONE_MS = (
    90_000  # the longest encounter (the bulldozer, about a minute) runs well under this
)
CUT_MS = 350  # into a step, the cut comes this soon

# Each encounter and how many steps its chain has (for a choice encounter,
# the steps before the child chooses).
ENCOUNTERS = {
    "car": 6,
    "egg": 1,
    "hedgehog": 4,
    "paint": 7,
    "poles": 9,
    "rain": 5,
    "storm": 2,
}
# The season an encounter belongs to, where it is one season's only (layout.js IN_SEASON).
SEASON = {"hedgehog": "&season=autumn"}
# What finishes a choice encounter once it waits for a choice: the taps, in
# order (the egg: the mouse and the hare say no, the hen is its mother).
SOLVE = {
    "egg": ["use egg mouse", "use egg hare", "use egg hen"],
    "storm": ["use storm hare", "use storm mouse", "use storm hen"],
}


class Meadow(GamePage):
    """One open play of the meadow, collecting what went wrong."""

    def __init__(self, browser: object, query: str) -> None:
        super().__init__(
            browser,
            MEADOW,
            query,
            "meadowGame",
            viewport={"width": 1280, "height": 720},
        )

    def do(self, intent: str) -> None:
        self.page.evaluate("(i) => meadowGame.perform(i)", intent)

    def state(self) -> dict:
        return self.page.evaluate("meadowGame.state()")

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
def meadow(browser: object, game_time: str) -> Iterator[callable]:
    opened: list[Meadow] = []

    def open_(query: str = STILL) -> Meadow:
        if "season=" not in query:
            query += (
                "&season=spring"  # the tests were written for spring; autumn's say so
            )
        opened.append(Meadow(browser, query + game_time))
        return opened[-1]

    yield open_
    for m in opened:
        m.page.close()


def traced(m: Meadow, kind: str) -> list[str]:
    """Which way each traced `kind` went (its `how`), in order."""
    return m.page.evaluate(
        f"meadowGame.trace().split('\\n').filter((l) => l.includes(' {kind} ')).map((l) => JSON.parse(l.slice(l.indexOf('{{'))).how)"
    )


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

    def test_the_flower_bed_and_the_spring_answer_a_new_way_each_time(
        self, meadow: callable
    ) -> None:
        m = meadow("seed=2&still&props=")  # a play with the frog
        m.wake()
        for intent in ["paddle"] * 4 + [
            "sniff"
        ] * 4:  # the paddles first, while the frog sits
            m.do(intent)
            m.wait_free()
            m.assert_settled()
        sniffs = traced(m, "sniffs")
        assert sorted(sniffs[:3]) == ["along", "dreamy", "giggle"], sniffs
        assert all(a != b for a, b in pairwise(sniffs)), sniffs
        paddles = traced(m, "paddles")
        assert paddles[0] == "frog", "the frog on its pad joins the first paddle"
        assert {"splash", "face"} <= set(paddles), paddles
        assert all(a != b for a, b in pairwise(paddles)), paddles

    @pytest.mark.parametrize("intent", ["sniff", "paddle"])
    def test_each_way_cut_short_leaves_him_free(
        self, meadow: callable, intent: str
    ) -> None:
        m = meadow("seed=2&still&props=")
        m.wake()
        for _ in range(3):
            m.do(intent)
            m.play_for(2600)  # there, and part way through
            m.do("go to 400")
            m.wait_free()
            m.assert_settled()

    def test_a_tap_cuts_any_move_short(self, meadow: callable) -> None:
        m = meadow()
        m.wake()
        for first in ("go to 2300", "sniff", "paddle", "tap mole", "dig to 1800"):
            m.do(first)
            m.play_for(CUT_MS)
            m.do("go to 400")
            m.wait_free()
            m.assert_settled()

    # Adam, 2026-11-06: the bulldozer rolled in while he held the egg up, in an eclipse
    def test_one_happening_at_a_time(self, meadow: callable) -> None:
        """However long one waits (here 75 s, past the minute that once let the next
        come too), neither the next encounter nor a due eclipse arrives on top of it.
        Once it is done and a quiet spell has passed, the eclipse (due first) has its
        turn, and the poles still wait for it."""
        m = meadow(f"{STILL}&props=egg,poles&eclipse=11")
        m.wake()
        m.wait("meadowGame.state().hour >= '12:00'", 60_000)
        state = m.state()
        assert state["things"]["egg"].startswith("step"), state["things"]
        assert state["things"]["poles"].startswith("at"), (
            "the poles came while the egg still waited"
        )
        assert state["eclipse"] == 0, "the eclipse came while the egg still waited"
        finish(m, "egg")
        # a quiet spell first (REST_HOURS: about 45 s of a five-minute day)
        m.wait("meadowGame.state().eclipse > 0", 40_000)
        assert m.state()["things"]["poles"].startswith("at"), (
            "the poles came during the eclipse"
        )
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

    # a tester, 2026-10-30: after the end, a held press anywhere started a new day
    def test_after_the_end_a_held_press_does_nothing_and_only_the_sun_starts_a_new_day(
        self, meadow: callable
    ) -> None:
        m = meadow(f"{STILL}&day=12&props=")
        m.wake()
        m.wait("document.querySelector('#again:not([hidden])')", 60_000)
        m.page.evaluate("window.__sameplay = true")
        m.page.mouse.move(640, 400)
        m.page.mouse.down()  # held, on the picture: nothing
        m.play_for(3000)
        m.page.mouse.up()
        m.page.keyboard.press("Space")
        m.play_for(500)
        assert m.page.evaluate("window.__sameplay === true"), (
            "a press started a new day"
        )
        assert m.page.evaluate("meadowGame.state().ended")
        box = m.page.locator("#again").bounding_box()
        m.page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        m.page.mouse.down()
        # the reload begun is the new play; its page loading may be slow on a busy machine
        with m.page.expect_navigation(wait_until="commit", timeout=5000):
            m.play_on()  # held long enough, the sun reloads the page
        m.page.mouse.up()


@pytest.mark.parametrize("name", sorted(ENCOUNTERS))
class TestMeadowEncounters:
    def test_runs_to_its_end(self, meadow: callable, name: str) -> None:
        m = meadow(f"{STILL}{SEASON.get(name, '')}&soon&props={name}")
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
        m = meadow(f"{STILL}{SEASON.get(name, '')}&soon&props={name}")
        m.wake()
        arrived(m, name)
        m.do(f"use {name}")
        m.wait(f"meadowGame.state().things.{name} === 'step {step}'")
        m.play_for(CUT_MS)
        m.do("go to 1400")
        m.wait_free()
        m.assert_settled()
        assert m.page.evaluate(f"meadowGame.detail('{name}').cast") == [], (
            "visitors left about"
        )
        finish(m, name)
        m.assert_settled()

    def test_hurried_by_taps(self, meadow: callable, name: str) -> None:
        m = meadow(f"{STILL}{SEASON.get(name, '')}&soon&props={name}")
        m.wake()
        arrived(m, name)
        last = SOLVE.get(name, [f"use {name}"])[
            -1
        ]  # a choice encounter: its answer, tapped again and again
        for _ in range(150):  # long enough for the storm's clouds to come in first
            m.do(last)
            m.play_for(300)
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
        m = meadow(f"{STILL}{SEASON.get(name, '')}&soon&props={name}")
        m.wake()
        arrived(m, name)
        m.do(f"use {name}")
        m.wait(f"meadowGame.state().things.{name} === 'step 1'")
        m.play_for(1500)
        m.page.locator(
            "#mole-out .mole .mole-body, #mole .mole .mole-body"
        ).first.click(force=True)
        m.play_for(200)
        assert m.state()["busy"] == name, "a tap on him cut the encounter short"
        m.wait(f"meadowGame.state().things.{name} === 'done'")
        m.wait_free()
        m.assert_settled()

    def test_bedtime_in_the_middle(self, meadow: callable, name: str) -> None:
        m = meadow(f"{STILL}{SEASON.get(name, '')}&soon&props={name}&day=16")
        m.wake()
        arrived(m, name)
        m.do(f"use {name}")
        m.wait("meadowGame.state().ended && !meadowGame.state().busy", 40_000)
        assert m.page.evaluate(f"meadowGame.detail('{name}').cast") == []
        assert not m.errors, m.errors


class TestMeadowCar:
    def test_some_plays_it_jiggles_at_his_knock(self, meadow: callable) -> None:
        """Seed 1 (every other car test) has it jiggle; seed 3 doesn't."""
        for seed, startles in ((1, True), (3, False)):
            m = meadow(f"seed={seed}&still&soon&props=car")
            assert m.page.evaluate("meadowGame.detail('car').startles") is startles
            m.wake()
            arrived(m, "car")
            m.do("use car")
            m.wait("meadowGame.state().things.car === 'step 1'")
            m.do("go to 2000")
            m.wait_free()
            m.assert_settled()

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

    def test_mended_and_parked_he_takes_it_to_bed(self, meadow: callable) -> None:
        """As Krtek a autíčko ends: parked by his molehill, then in his arms in the den."""
        m = meadow(f"{STILL}&soon&props=car&day=60")
        m.wake()
        arrived(m, "car")
        m.do("use car")
        m.wait("meadowGame.state().things.car === 'done'", 60_000)
        assert m.page.evaluate("meadowGame.detail('car').parked")
        m.wait("meadowGame.trace().includes(' end')", 90_000)
        assert "car to bed" in m.page.evaluate("meadowGame.trace()")
        assert m.page.evaluate("document.querySelector('.den-car').style.display") == ""
        assert m.page.evaluate(
            "[...document.querySelectorAll('.car')].every((c) => c.style.display === 'none')"
        )
        assert not m.errors, m.errors

    def test_not_mended_it_stays_out(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&soon&props=car&day=12")
        m.wake()
        m.wait("meadowGame.trace().includes(' end')", 60_000)
        assert (
            m.page.evaluate("document.querySelector('.den-car').style.display")
            == "none"
        )
        assert not m.errors, m.errors

    def test_a_cut_mid_ride_leaves_him_in_the_meadow(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&soon&props=car")
        m.wake()
        arrived(m, "car")
        m.do("use car")
        m.wait("meadowGame.state().things.car === 'done'")
        m.wait_free()
        m.do("use car")
        m.wait("meadowGame.detail('car').riding", 10_000)
        m.play_for(900)  # zooming towards the spring
        m.do("tap mole")
        m.wait_free()
        m.assert_settled()
        dig = m.page.evaluate("Layout.DIG")
        assert dig["from"] <= m.state()["x"] <= dig["to"]
        m.do("use car")  # it sets off facing the spring again
        m.wait("meadowGame.detail('car').riding", 10_000)
        m.wait_free()
        m.assert_settled()


class TestMeadowView:
    SWAYING = """(() => { const all = [...document.querySelectorAll('#cam .sway')]
        const x = (e) => { const b = e.getBBox(); return b.x + b.width / 2 }
        const far = all.filter((e) => x(e) > 3300), near = all.filter((e) => x(e) < 1200)
        const on = (list) => list.filter((e) => e.getAnimations().length > 0).length
        return { far: on(far), farAll: far.length, near: on(near), nearAll: near.length } })()"""

    def test_what_sways_out_of_sight_stops_and_starts_again_in_sight(
        self, meadow: callable
    ) -> None:
        m = meadow()
        m.wake()
        at_home = m.page.evaluate(self.SWAYING)
        assert at_home["farAll"] > 0 and at_home["far"] == 0, at_home
        assert at_home["near"] == at_home["nearAll"] > 0, at_home
        m.do("go to 3500")
        m.wait_free()
        m.wait("View.x > 2000")
        far_end = m.page.evaluate(self.SWAYING)
        assert far_end["far"] == far_end["farAll"], far_end
        assert far_end["near"] == 0, far_end

    def test_the_view_follows_him_and_a_tap_lands_where_aimed(
        self, meadow: callable
    ) -> None:
        m = meadow()
        m.wake()
        m.do("go to 3500")
        m.wait_free()
        m.play_for(1500)  # the view eases after him
        view = m.state()["view"]
        assert view >= 2300, f"the view stayed behind at {view}"
        # a real tap a quarter of the way across the screen, low on the grass
        m.page.mouse.click(1280 * 0.25, 720 * 0.9)
        m.wait_free()
        assert abs(m.state()["x"] - (view + 400)) < 30, m.state()
        m.assert_settled()


PHONE = {"width": 844, "height": 340}  # a phone on its side in Safari, its bars showing


class TestMeadowScreens:
    """The view fits the screen (view.js): a phone on its side sees more of
    the meadow at the sides and only a little less sky, so the church's
    cross stays in sight; upright, a picture asks for it on its side."""

    def test_on_a_phone_the_church_cross_shows(self, meadow: callable) -> None:
        m = meadow()
        m.page.set_viewport_size(PHONE)
        m.play_for(300)
        top = m.page.evaluate(
            "document.querySelector('#distant path[d^=\"M538 176 V156\"]').getBoundingClientRect().top"
        )
        assert top >= 0, f"the cross is cut off: its top at {top}"
        assert not m.errors, m.errors

    def test_on_a_phone_taps_land_and_the_view_keeps_to_the_meadow(
        self, meadow: callable
    ) -> None:
        m = meadow()
        m.page.set_viewport_size(PHONE)
        m.wake()
        for to in (3900, 100):
            m.do(f"go to {to}")
            m.wait_free()
            m.play_for(1500)  # the view eases after him
            edges = m.page.evaluate("[View.left, View.right]")
            assert edges[0] >= 0 and edges[1] <= 4000, f"past the meadow: {edges}"
        m.do("go to 2000")
        m.wait_free()
        m.play_for(1500)
        left, right = m.page.evaluate("[View.left, View.right]")
        assert right - left > 1600, "a wide screen sees more of the meadow"
        m.page.mouse.click(
            844 * 0.25, 340 * 0.9
        )  # a quarter of the way across, low on the grass
        m.wait_free()
        assert abs(m.state()["x"] - (left + (right - left) * 0.25)) < 30, m.state()
        m.assert_settled()

    @pytest.mark.realtime  # the game holds itself here: a test's hold would hide it
    def test_a_phone_held_upright_asks_to_be_turned_and_waits(
        self, meadow: callable
    ) -> None:
        m = meadow()
        m.page.set_viewport_size({"width": 390, "height": 844})
        turn = "!document.getElementById('turn').hidden"
        m.wait(turn, 2000)
        t0 = m.page.evaluate("Clock.now()")
        m.page.wait_for_timeout(1000)  # real time: game time stands still
        assert m.page.evaluate("Clock.now()") == t0  # the game waits
        m.page.set_viewport_size({"width": 844, "height": 390})
        m.wait(f"!({turn})", 2000)
        m.wait(f"Clock.now() > {t0} + 500", 3000)
        assert not m.errors, m.errors


class TestMeadowWalking:
    def test_quick_taps_never_make_him_jump(self, meadow: callable) -> None:
        m = meadow()
        m.wake()
        m.do("go to 1000")  # out of his molehill and walking
        m.wait_free()
        # where he is drawn, every animation frame, in game time (load can't stretch it)
        m.page.evaluate(
            """() => { window.__xs = []; const f = () => { window.__xs.push([Clock.now(), Mole.drawnX()]); if (window.__xs.length < 100000) requestAnimationFrame(f) }; requestAnimationFrame(f) }"""
        )
        for i in range(8):  # each tap cuts a walk under way
            m.page.mouse.click(1250 if i % 2 else 30, 650)
            m.play_for(400)
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
        m.play_for(1200)
        m.page.keyboard.up("ArrowRight")
        m.wait_free(3_000)
        x1 = m.state()["x"]
        assert 150 < x1 - x0 < 1500, (x0, x1)
        m.play_for(600)
        assert m.state()["x"] == x1, "he walked on after the key was let go"
        m.assert_settled()

    def facing_wrong_way(self, m: Meadow, ms: int) -> int:
        """Frames over `ms` in which he moves one way while turned the other (sliding)."""
        m.page.evaluate(
            """() => { window.__s = []; const f = () => { window.__s.push([Clock.now(), Mole.drawnX(), Mole.state.facing, Mole.state.view]); if (window.__s.length < 100000) requestAnimationFrame(f) }; requestAnimationFrame(f) }"""
        )
        m.play_for(ms)
        s = m.page.evaluate("window.__s")
        wrong = 0
        for (t0, x0, _, _), (t1, x1, facing, view) in pairwise(s):
            v = (x1 - x0) / max(1, t1 - t0)
            if abs(v) > 0.05 and view != "front" and (v > 0) != (facing > 0):
                wrong += 1
        return wrong

    def test_a_tap_that_waits_never_turns_him_to_slide(self, meadow: callable) -> None:
        """A tap away from an encounter's step waits for it; walking, he must not turn
        to it and slide along backwards (Adam, 2026-11-07)."""
        m = meadow(f"{STILL}&soon&props=car")
        m.wake()
        arrived(m, "car")
        m.do("use car")  # off he walks to it, far to the right
        m.play_for(500)
        m.do("go to 300")
        assert self.facing_wrong_way(m, 3000) <= 1  # the one frame he turns to go
        m.wait_free()
        m.assert_settled()

    def test_gone_to_it_by_himself_a_tap_takes_over(self, meadow: callable) -> None:
        """Left alone, he goes to a waiting thing himself; the child's tap elsewhere then
        goes at once, not after the step (he walked on, unstoppable)."""
        m = meadow(f"{STILL}&soon&props=car")
        m.wake()
        arrived(m, "car")
        m.page.evaluate("Things.use('car', false)")  # what the left-alone tick does
        m.play_for(500)
        assert m.state()["busy"] == "car"
        m.do("go to 300")
        m.play_for(200)
        assert m.state()["busy"] == "go", m.state()
        m.wait_free()
        assert abs(m.state()["x"] - 300) < 5, m.state()
        m.assert_settled()
        finish(m, "car")  # and it is still there to play


class TestMeadowRain:
    def test_some_plays_the_hen_comes_by_under_the_cloud(
        self, meadow: callable
    ) -> None:
        """Seed 1 (every other rain test) has the hare; seed 2 the hen: cut short as she
        comes, picked up, and on to the end."""
        m = meadow("seed=2&still&soon&props=rain")
        assert m.page.evaluate("meadowGame.detail('rain').passer") == "hen"
        m.wake()
        arrived(m, "rain")
        m.do("use rain")
        m.wait("meadowGame.state().things.rain === 'step 2'")
        m.wait("document.querySelector('.friend.hen')", 10_000)
        m.do("go to 1200")
        m.wait_free()
        m.assert_settled()
        assert m.page.evaluate("meadowGame.detail('rain').cast") == []
        finish(m, "rain")
        assert m.page.evaluate("meadowGame.detail('rain').hare"), "she came by"
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
        # a wrong guess can be had again, the other joke the second time (a nibble, a leap back)
        for who in ("mouse", "hare", "mouse", "hare"):
            m.do(f"use egg {who}")
            m.wait_free()
            assert m.state()["things"]["egg"] == "choosing", who
            assert m.page.evaluate("meadowGame.detail('egg').cast") == []
        assert m.page.evaluate("meadowGame.detail('egg').asked") == {
            "mouse": 2,
            "hare": 2,
        }
        m.do("use egg hen")
        m.wait("meadowGame.state().things.egg === 'done'")
        m.wait_free()
        m.assert_settled()

    def test_another_choice_mid_way_sends_him_there_instead(
        self, meadow: callable
    ) -> None:
        m = self.open(meadow)
        m.do("use egg mouse")
        m.play_for(1200)  # the mouse is out
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
        m.play_for(100)
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
        m.play_for(600)
        m.page.locator(
            "#mole-out .mole .mole-body, #mole .mole .mole-body"
        ).first.click(force=True)
        m.play_for(200)
        assert m.state()["busy"] == "egg", "a tap on him cut the choice short"
        m.wait_free()
        m.assert_settled()

    def test_wandering_off_mid_choice_and_coming_back(self, meadow: callable) -> None:
        m = self.open(meadow)
        m.do("use egg mouse")
        m.play_for(1300)
        m.do("go to 2000")  # waits for the mouse's try, then goes (a frame later)
        m.wait("meadowGame.state().x === 2000")
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
        m.play_for(400)
        for _ in range(6):  # a toddler tapping the hen over and over
            m.do("use egg hen")
            m.play_for(200)
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


@pytest.mark.realtime  # the takes follow sound's own clock
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
        m = meadow(f"{STILL}&soon&props=rain")
        m.wake()
        arrived(m, "rain")
        finish(m, "rain")
        parts = m.page.evaluate(MUSIC)
        assert in_order(parts, ["curious", "sad", "happy"]), parts
        assert not m.errors, m.errors

    def test_a_threat_has_its_menace_and_nothing_glad_till_it_is_gone(
        self, meadow: callable
    ) -> None:
        m = meadow(f"{STILL}&soon&props=poles")
        m.wake()
        arrived(m, "poles")
        finish(m, "poles")
        parts = m.page.evaluate(MUSIC)
        assert in_order(parts, ["menace", "happy"]), parts
        after = parts[parts.index("menace") :]
        assert not {"curious", "sad"} & set(after), parts
        assert after.index("happy") == len(after) - 1, parts  # glad only at the end
        assert not m.errors, m.errors

    def test_the_music_steps_back_for_the_fox_and_comes_back_happy(
        self, meadow: callable
    ) -> None:
        m = meadow(f"{STILL}&soon&props=paint")
        m.wake()
        arrived(m, "paint")
        m.do("use paint")
        m.wait("meadowGame.state().things.paint === 'step 1'")
        m.play_for(1500)  # the fade
        # the theme stops; at most the short uneasy turn (menace), once it has takes
        assert m.page.evaluate("meadowGame.music()") in (None, "menace"), (
            "music over the fox"
        )
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
        heard = m.page.evaluate(f"{MUSIC}.length")
        if '"playsOn":true' in m.page.evaluate("meadowGame.trace()"):
            m.play_for(1500)  # a cut take would have faded by now
            assert m.page.evaluate("meadowGame.music()") == "lullaby", (
                "the last tune plays on to its end over him asleep, not cut"
            )
        m.wait("meadowGame.music() === null", 20_000)  # a take is about 15 s
        assert m.page.evaluate(f"{MUSIC}.length") == heard, "a tune began after the end"
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
        m.play_for(4000)
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

    def test_a_curious_one_comes_to_look_at_him_and_he_watches_it(
        self, meadow: callable
    ) -> None:
        m = meadow(
            "seed=2&props=&day=200"
        )  # a play's own butterflies: one alone may spend its stay feeding
        m.wake()
        m.wait("meadowGame.trace().includes('watches butterfly')", 60_000)
        assert not m.errors, m.errors


class TestMeadowFireflies:
    """The fireflies (critters.js): out only in the dim, rising about him;
    a tap flashes one and has him look; home into the grass by bedtime."""

    def test_a_tap_flashes_one_and_he_looks(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&props=&critters=fireflies")
        m.wake()
        m.wait("Critters.fireflies.length >= 3", 6_000)
        m.play_for(2000)  # up out of the grass
        m.page.locator("[data-critter^='firefly']").first.click(force=True)
        m.wait("meadowGame.trace().includes('\"tapped\":true')", 3_000)
        m.wait_free()
        m.assert_settled()

    def test_they_come_only_in_the_dim_and_go_home_by_bedtime(
        self, meadow: callable
    ) -> None:
        m = meadow("seed=2&props=&day=30")
        m.wake()
        m.wait("Critters.fireflies.length > 0", 40_000)
        assert m.page.evaluate("World.state.light") <= 0.45
        assert m.page.evaluate("World.state.hour") >= 18.6
        m.wait("meadowGame.state().ended", 30_000)
        m.wait("Critters.fireflies.length === 0", 15_000)
        assert not m.errors, m.errors


class TestMeadowWildlife:
    """The far life (wildlife.js, flock.js, heron.js; Adam, 2026-11-01: make
    the world truly alive, far off so it doesn't distract): one kind of
    herd a play, the birds of the far trees, the heron at the far pond.
    Each comes, lives, answers a tap and the bulldozer's rumble, and goes."""

    OUT = "Wildlife.out"

    @pytest.mark.parametrize("kind", ["deer", "boar", "bison"])
    def test_a_herd_comes_grazes_and_answers_a_tap(
        self, meadow: callable, kind: str
    ) -> None:
        m = meadow(f"{STILL}&props=&wild={kind}")
        m.wake()
        m.wait(f"{self.OUT} && {self.OUT}.kind === '{kind}'", 10_000)
        m.wait(  # walking in, it faces where it goes (drawn facing left: unmirrored)
            f"{self.OUT} && Math.abs({self.OUT}.vx) > 8 && document.querySelector('.wild-one')?.getAttribute('transform')",
            15_000,
        )
        faces = m.page.evaluate(
            f"[{self.OUT}.vx, document.querySelector('.wild-one').transform.baseVal.consolidate().matrix.a]"
        )
        assert (faces[0] < 0) == (faces[1] > 0), f"it walks backwards: {faces}"
        m.wait(
            f"{self.OUT} && {self.OUT}.goal === 'pause'", 30_000
        )  # it grazes, in view
        assert m.page.evaluate(
            f"{self.OUT}.x > World.state.view.x0 && {self.OUT}.x < World.state.view.x1"
        ), "it grazes out of sight"
        far = m.page.evaluate(
            "[...document.querySelectorAll('.wild-one')].every((g) => (g.transform.baseVal.consolidate()?.matrix.d ?? 0) <= 0.501)"
        )
        assert far, "an animal came near the front: they keep far off"
        m.do("tap wild")
        if kind == "bison":  # he only looks back, chewing
            m.play_for(3000)
            assert m.page.evaluate(f"{self.OUT} && {self.OUT}.goal") != "flee"
        else:
            m.wait(f"!{self.OUT} || {self.OUT}.goal === 'flee'", 5000)
            m.wait(f"!{self.OUT}", 30_000)  # off out of sight
        assert not m.errors, m.errors
        m.wait_free()
        m.assert_settled()

    def test_the_calf_walks_round_when_the_bull_turns(self, meadow: callable) -> None:
        """When the leader turns, the place behind it jumps to its other
        side: the others walk round to it at an animal's pace, never slide
        across (the calf did, Adam, 2026-11-03)."""
        m = meadow("seed=1&still&props=&wild=bison&day=600")
        m.wake()
        m.wait(f"{self.OUT} && {self.OUT}.n === 2", 10_000)
        m.page.evaluate(
            """() => { window.paces = []; let last = null
            const look = () => {
              const xs = [...document.querySelectorAll('.wild-one')].map((g) => g.transform.baseVal.consolidate()?.matrix.e ?? null)
              const t = Clock.now()
              if (last && t > last.t) xs.forEach((x, i) => { if (x !== null && last.xs[i] !== null) window.paces.push(Math.abs(x - last.xs[i]) / (t - last.t) * 1000) })
              last = { t, xs }; requestAnimationFrame(look) }
            look() }"""
        )
        m.wait(f"Math.abs({self.OUT}.vx) > 3", 15_000)  # walking in, then
        came = 1 if m.page.evaluate(f"{self.OUT}.vx") > 0 else -1
        m.wait(f"{self.OUT}.vx * {came} < -3", 90_000)  # it turns
        m.play_for(3000)
        fastest = m.page.evaluate("Math.max(...window.paces)")
        assert fastest < 20 * 1.8 * 1.1, f"one slid along at {fastest:.0f} a second"
        assert not m.errors, m.errors

    def test_the_bulldozer_sends_them_all_off(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&soon&props=poles&wild=deer&critters=flock")
        m.wake()
        m.wait(  # grazing, or drinking at the pond
            f"{self.OUT} && ['pause', 'feed'].includes({self.OUT}.goal)", 30_000
        )
        assert m.page.evaluate("Flock.count") > 0, "no birds in the far trees"
        m.do("use poles")
        m.wait("meadowGame.state().things.poles === 'step 3'", 40_000)
        m.wait(f"!{self.OUT} || {self.OUT}.goal === 'flee'", 10_000)
        m.wait(  # all in sight flown off (one sitting beyond the rumble's reach may stay)
            "[...document.querySelectorAll('.far-bird')].every((g) => {"
            " const x = g.transform.baseVal.consolidate().matrix.e;"
            " return x < World.state.view.x0 || x > World.state.view.x1 })",
            30_000,
        )
        assert not m.errors, m.errors

    def test_the_birds_sit_in_the_trees_and_fly_from_thunder(
        self, meadow: callable
    ) -> None:
        m = meadow(f"{STILL}&props=&critters=flock")
        m.wake()
        assert m.page.evaluate("Flock.count") > 0
        m.wait(
            "meadowGame.trace().includes('\"feed\":true')", 20_000
        )  # one sat in a tree
        m.page.evaluate("World.noise('thunder', 1000, Infinity)")
        m.wait("Flock.count === 0", 30_000)
        assert not m.errors, m.errors

    def test_the_heron_comes_to_the_pond_and_a_tap_sends_it_off(
        self, meadow: callable
    ) -> None:
        m = meadow(
            f"{STILL}&props=&critters=heron"
        )  # it fishes west of the pond's middle: faces east
        m.wake()
        m.wait("Heron.out && Heron.out.goal === 'feed'", 30_000)  # standing at the pond
        m.wait(
            "Heron.out.pose !== undefined && meadowGame.trace().includes('\"fishing\":true')",
            15_000,
        )
        assert m.page.evaluate(  # out over the water, not away from it
            "Heron.out.face === (Heron.out.x < Heron.POND.x ? -1 : 1)"
        ), m.page.evaluate("JSON.stringify(Heron.out)")
        m.do("tap heron")
        m.wait("!Heron.out", 30_000)
        assert not m.errors, m.errors
        m.wait_free()
        m.assert_settled()


class TestMeadowSnail:
    """The snail (critters.js): it comes up out of the grass where its shelter
    is wet, a tap tucks it into its shell and has him look at it; and in a
    play without rain it never comes."""

    def test_a_tap_tucks_it_in_and_he_looks(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&props=&critters=snail")
        m.wake()
        m.do("go to 1450")
        m.wait("Critters.snail !== null", 6_000)
        m.play_for(5000)  # up out of the grass
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


class TestMeadowEclipse:
    """The eclipse (eclipse.js): the light falls to dusk while the hour goes
    on, and what answers to the light answers (the tulips close, the cricket
    comes out, the butterflies go home); a tap on the sun has him call to it;
    then it all comes back."""

    TULIP_OPEN = "parseFloat(getComputedStyle(document.querySelector('.tulip g path')).transform.split(',')[1]) || 0"

    def test_the_meadow_dims_answers_and_comes_back(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&props=&critters=now&eclipse=11&day=60")
        m.wake()
        m.wait("meadowGame.state().eclipse === 1", 25_000)
        m.wait("World.state.light < 0.35", 3_000)
        assert m.page.evaluate("Cricket.state") in ("coming", "playing")
        assert abs(m.page.evaluate(self.TULIP_OPEN)) < 0.05, "the tulips closed"
        assert m.page.evaluate("Critters.out.every((b) => b.leaving)")
        m.do("tap sun")
        m.wait("meadowGame.trace().includes('calls the sun')", 3_000)
        m.wait("meadowGame.state().eclipse === 0 && World.state.light > 0.9", 15_000)
        assert m.page.evaluate("Cricket.state") in ("going", "home")
        m.wait("Cricket.state === 'home'", 10_000)  # back down his burrow
        assert abs(m.page.evaluate(self.TULIP_OPEN)) > 0.3, "the tulips opened again"
        m.wait_free()
        m.assert_settled()

    def test_the_cricket_climbs_out_walks_over_and_plays(
        self, meadow: callable
    ) -> None:
        """In the dim he comes out of his burrow (nothing from nowhere), walks
        to his spot by the molehill, sets his stand down and plays."""
        m = meadow(f"{STILL}&props=&eclipse=now")
        assert m.page.evaluate(
            "Cricket.state === 'home' && getComputedStyle(document.getElementById('cricket')).display === 'none'"
        ), "he waits down his burrow"
        m.wake()
        m.wait("Cricket.state === 'coming'", 20_000)
        start = m.page.evaluate("Cricket.x")
        m.wait("Cricket.state === 'playing'", 10_000)
        assert m.page.evaluate("Cricket.x") == m.page.evaluate("Cricket.SPOT") != start
        trace = m.page.evaluate("meadowGame.trace()")
        assert trace.index('"out":true') < trace.index('"plays":true')
        assert not m.errors, m.errors

    def test_now_starts_one_as_he_wakes(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&props=&eclipse=now")
        m.wake()
        m.wait("meadowGame.state().eclipse > 0", 5_000)
        assert not m.errors, m.errors

    def test_a_tap_on_the_sun_without_one_is_a_tap_on_him(
        self, meadow: callable
    ) -> None:
        m = meadow(f"{STILL}&props=")
        m.wake()
        m.do("tap sun")
        m.wait("meadowGame.trace().includes(' says ')", 3_000)
        assert "calls the sun" not in m.page.evaluate("meadowGame.trace()")
        m.wait_free()
        m.assert_settled()


class TestMeadowFox:
    """The fox up to no good (Adam, 2026-10-31): upright and tall, after the
    bullfinch's nest, its chicks peeping the alarm until the monster sends
    him running, or the encounter is cut short."""

    HEIGHTS = """() => [document.querySelector('.friend.fox'), document.querySelector('.mole-body')]
        .map((e) => e.getBoundingClientRect().height)"""

    def fox_at_the_nest(self, meadow: callable) -> Meadow:
        m = meadow(f"{STILL}&soon&props=paint")
        m.wake()
        arrived(m, "paint")
        m.do("use paint")
        m.wait("document.querySelector('.friend.fox') && Nest.alarmed", 40_000)
        return m

    def test_tall_and_after_the_nest_until_the_monster_sends_him_off(
        self, meadow: callable
    ) -> None:
        m = self.fox_at_the_nest(meadow)
        fox, mole = m.page.evaluate(self.HEIGHTS)
        # about 1.6 times his drawn box (his hairs and arms in it): twice his body
        assert fox > 1.5 * mole, (
            f"the fox ({fox:.0f}) should stand well over the mole ({mole:.0f})"
        )
        m.wait("meadowGame.state().things.paint === 'done'", 90_000)
        assert not m.page.evaluate("Nest.alarmed"), "the chicks still peep the alarm"
        trace = m.page.evaluate("meadowGame.trace()")
        assert trace.index('"alarmed":true') < trace.index(" red"), (
            "he fell in the paint before the fox came to frighten him"
        )
        assert m.page.evaluate("meadowGame.detail('paint').ending") == "ran", (
            "the first time, the fox runs, as in the film"
        )
        m.wait_free()
        m.assert_settled()

    def test_told_again_the_fox_may_end_a_friend_and_the_tins_go(
        self, meadow: callable
    ) -> None:
        """The tins tapped again tell the story again; as chance has it the
        fox runs, or is sorry and goes off with the friends, and then the
        hare and the mouse carry the tins off (seed 1: ran, then friends)."""
        m = self.fox_at_the_nest(meadow)
        m.wait("meadowGame.state().things.paint === 'done'", 90_000)
        m.wait_free()
        for _ in range(4):
            m.do("use paint")
            m.wait("meadowGame.state().busy", 5000)
            m.wait_free(90_000)
            if m.page.evaluate("meadowGame.detail('paint').ending") == "friends":
                break
        detail = m.page.evaluate("meadowGame.detail('paint')")
        assert detail["ending"] == "friends", detail
        assert "fox befriended" in m.page.evaluate("meadowGame.trace()")
        assert not m.page.evaluate("Nest.alarmed")
        m.wait("document.querySelectorAll('.tin').length === 0", 20_000)
        m.assert_settled()

    def test_told_again_cut_short_then_tapped_it_carries_on(
        self, meadow: callable
    ) -> None:
        m = self.fox_at_the_nest(meadow)
        m.wait("meadowGame.state().things.paint === 'done'", 90_000)
        m.wait_free()
        m.do("use paint")
        m.wait("document.querySelector('.friend.fox') && Nest.alarmed", 10_000)
        m.do("go to 600")
        m.wait_free()
        m.wait("!Nest.alarmed && !document.querySelector('.friend.fox')", 10_000)
        m.do("use paint")
        m.wait("meadowGame.state().busy", 5000)
        m.wait_free(90_000)
        detail = m.page.evaluate("meadowGame.detail('paint')")
        assert detail["told"] == 2 and not detail["red"], detail
        assert not m.page.evaluate("Nest.alarmed")
        m.assert_settled()

    def test_his_tunnel_brings_them_past_the_fox(self, meadow: callable) -> None:
        """Adam, 2026-11-07: the hare and the mouse come from the painter's
        garden with the tins, the fox in their way; he tunnels over to them
        under the fox's feet (who feels it each way) and back, and up they
        come behind him out of his molehill."""
        m = self.fox_at_the_nest(meadow)
        m.wait("meadowGame.trace().split(' fox feels ').length === 3", 60_000)
        # on the way back the friends are down his tunnel, and the tins they carry with them
        tins_down = m.page.evaluate("""() => {
            const ground = document.querySelector('.friend.fox').getScreenCTM().f
            return [...document.querySelectorAll('.tin')].every((t) => t.getBoundingClientRect().top > ground) }""")
        assert tins_down, "the tins stayed up when their carriers went down the hole"
        m.wait("meadowGame.trace().includes(' red ')", 60_000)
        trace = m.page.evaluate("meadowGame.trace()")
        feels = traced(m, "fox feels")
        assert len(feels) == 2 and feels[0] != feels[1], feels
        assert (
            trace.index(" tunnel ") < trace.index(" fox feels ") < trace.index(" red ")
        ), "the tins came before the tunnel, or he fell in before they came"
        assert m.page.evaluate("meadowGame.state().hills") >= 2, (
            "no molehill at either end"
        )
        behind = m.page.evaluate(
            "['hare', 'mouse'].map((k) => document.querySelector('.friend.' + k).getBoundingClientRect().right)"
            " .every((r) => r < document.querySelector('.mole-body').getBoundingClientRect().left)"
        )
        assert behind, "his friends did not come up behind him"
        assert (
            m.page.evaluate("document.querySelectorAll('.tin[data-thing]').length") == 3
        )
        m.wait("meadowGame.state().things.paint === 'done'", 90_000)
        m.wait_free()
        m.assert_settled()

    def test_each_play_draws_its_own_paints(self, meadow: callable) -> None:
        plays = []
        for seed in (1, 2, 3):
            m = meadow(f"seed={seed}&still&props=paint")
            d = m.page.evaluate("meadowGame.detail('paint')")
            assert len(set(d["tins"])) == 3, d
            assert (
                d["patterns"]["hare"]["pattern"] != d["patterns"]["mouse"]["pattern"]
            ), d
            plays.append((tuple(d["tins"]), d["patterns"]["hare"]["pattern"]))
        assert len(set(plays)) > 1, "every play paints the same"

    def test_bedtime_in_his_tunnel_leaves_nobody_under(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&soon&props=paint&day=26")
        m.wake()
        arrived(m, "paint")
        m.do("use paint")
        m.wait("meadowGame.state().ended", 60_000)
        trace = m.page.evaluate("meadowGame.trace()")
        assert trace.index(" tunnel ") < trace.index(" bedtime "), (
            "bedtime came before the tunnel"
        )
        assert " red " not in trace, "bedtime came after the tunnel"
        m.wait("document.querySelectorAll('.friend').length === 0", 5000)
        assert not m.errors, m.errors

    def test_cut_short_the_chicks_settle(self, meadow: callable) -> None:
        m = self.fox_at_the_nest(meadow)
        m.do("go to 600")
        m.wait_free()
        m.wait("!Nest.alarmed", 5000)
        m.assert_settled()


class TestMeadowBulldozer:
    """The poles and the bulldozer (Adam, 2026-11-01): it comes over the
    meadow's far edge and down to him, big, framed in view with him, shoots its line of poles, flattens
    the first, nose-dives into the pit he digs, and goes off after its last pole; the bed is uneasy
    all the while it is here; and it won't wait for a tap."""

    BOXES = """() => [document.querySelector('.dozer'), document.querySelector('.mole-body')]
        .map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.right, r.height] })"""

    def test_it_comes_big_and_in_sight_with_him(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&soon&props=poles")
        m.wake()
        arrived(m, "poles")
        m.do("use poles")
        m.wait(
            "meadowGame.state().things.poles === 'step 3'", 40_000
        )  # it came, and shot its poles
        m.play_for(1500)  # the view eases over
        (d_left, _d_right, d_h), (m_left, m_right, m_h) = m.page.evaluate(self.BOXES)
        assert d_h > 1.3 * m_h, (
            f"the bulldozer ({d_h:.0f}) should tower over him ({m_h:.0f})"
        )
        width = m.page.evaluate("innerWidth")
        assert 0 <= m_left and m_right <= width, "he is out of sight"
        assert d_left < width * 0.75, "the bulldozer is hardly in sight"
        assert (
            m.page.evaluate(
                "document.querySelectorAll('.pole[style*=\"visibility: hidden\"]').length"
            )
            == 0
        ), "a pole was never shot"

    def test_it_noses_into_the_pit_and_leaves_its_marks(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&soon&props=poles")
        m.wake()
        arrived(m, "poles")
        m.do("use poles")
        m.wait("meadowGame.state().things.poles === 'done'", 90_000)
        trace = m.page.evaluate("meadowGame.trace()")
        assert trace.index("bulldozer stuck") < trace.rindex("pole far"), (
            "the last pole went before it was stuck in the pit"
        )
        assert not m.page.evaluate("document.querySelector('.dozer')"), "it never left"
        assert m.page.evaluate("document.querySelectorAll('.pit').length") == 1
        assert m.page.evaluate("[...meadowGame.detail('poles').poles]") == [
            "flat",
            "far",
            "far",
        ], "the first was not flattened, or the others not thrown"
        flowers = m.page.evaluate("meadowGame.detail('poles')")
        assert flowers["flat"] == 7, (
            "its blade did not flatten the wild flowers in its way"
        )
        assert flowers["knocked"] == 0, "he did not stand his tulips up again"
        m.wait_free()
        m.assert_settled()

    def test_he_thinks_then_digs_himself_down_step_by_step(
        self, meadow: callable
    ) -> None:
        """Adam, 2026-11-02: he just vanished, then the pit was there. Now he
        scratches his head, has the idea, and sinks in jerks as he digs."""
        m = meadow(f"{STILL}&soon&props=poles")
        m.wake()
        arrived(m, "poles")
        m.do("use poles")
        m.wait("meadowGame.state().things.poles === 'step 6'", 60_000)
        faces = set()
        while m.page.evaluate("!document.querySelector('.pit')"):
            faces.add(m.page.evaluate("Mole.state.face"))
            m.play_for(40)
        assert "puzzled" in faces, f"he didn't stop to think: {faces}"
        depths = m.page.evaluate(
            "meadowGame.trace().split('\\n').filter((l) => l.includes(' dig in '))"
            ".map((l) => JSON.parse(l.slice(l.indexOf('{'))).depth)"
        )
        assert depths == [55, 110, 160], f"he didn't sink step by step: {depths}"
        m.wait("meadowGame.state().things.poles === 'step 7'", 20_000)
        assert not m.page.evaluate("document.querySelector('#low-critters ellipse')"), (
            "the hole he dug himself into was left behind"
        )
        assert not m.errors, m.errors

    def test_the_bed_and_he_are_uneasy_till_it_is_gone(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&soon&props=poles")
        m.wake()
        arrived(m, "poles")
        m.do("use poles")
        m.wait("meadowGame.state().things.poles === 'step 2'", 40_000)
        m.wait("Music.bed && Music.bed.mood === 'trouble'", 2000)
        moods, parts, faces = set(), set(), set()
        while (
            True
        ):  # one look at a time, so "done" and its happy theme can't slip in between
            here, mood, part, face = m.page.evaluate(
                "[Things.troubled(), Music.bed.mood, Music.part, Mole.state.face]"
            )
            if not here:  # gone: he cheers, and mends his tulips, glad again
                break
            moods.add(mood)
            parts.add(part)
            faces.add(face)
            m.play_for(250)
        assert moods == {"trouble"}, f"the bed lifted while it was here: {moods}"
        assert not parts & {"curious", "sad", "happy", "morning"}, (
            f"the theme came back while it was here: {parts}"
        )
        assert not faces & {"content", "delighted"}, (
            f"he smiled while it was here: {faces}"
        )
        m.wait("Music.bed.mood !== 'trouble'", 2000)  # gone: the day's bed again
        m.wait(  # and the glad theme, at once, not only once he has mended his tulips
            'meadowGame.trace().includes(\'"part":"happy"\')'
            " || Music.part === 'happy'",
            4000,
        )
        m.wait(  # and his smile back
            "['content', 'delighted'].includes(Mole.state.face)", 5000
        )

    def test_taps_carry_it_on_rather_than_cut_it(self, meadow: callable) -> None:
        """A child tapping on and on held it at the meadow's edge: each tap
        cut the story short (Adam, 2026-11-01). Now every tap carries it on."""
        m = meadow(f"{STILL}&soon&props=poles")
        m.wake()
        arrived(m, "poles")
        m.do("use poles")
        m.wait("meadowGame.state().things.poles === 'step 0'")
        for intent in ["go to 400", "tap mole", "sniff", "paddle", "tap mole"]:
            m.do(intent)
            m.play_for(700)
            assert m.state()["busy"] == "poles", f"{intent} cut it short"
        m.wait("meadowGame.state().things.poles === 'step 3'", 40_000)
        assert m.state()["busy"] == "poles"

    def test_it_breaks_off_his_play(self, meadow: callable) -> None:
        m = meadow("seed=1&day=60&props=poles")
        m.wake()
        for _ in range(30):  # the child taps him on and on, until it comes
            if "arrives" in m.page.evaluate("meadowGame.trace()"):
                break
            m.do("tap mole")
            m.play_for(500)
        arrived(m, "poles")
        trace = m.page.evaluate("meadowGame.trace()").split("\n")
        came = next(
            float(t.split("s")[0])
            for t in trace
            if '"thing":"poles"' in t and "arrives" in t
        )
        went = next(
            float(t.split("s")[0])
            for t in trace
            if '"name":"poles"' in t and "gesture" in t
        )
        assert went - came < 0.5, f"he went to see {went - came:.1f} s after it came"


class TestMeadowStorm:
    """The storm and the umbrella (umbrella.js, storm.js): the child picks
    whom he waves in; the last in squeezes him out into the rain, and he pops
    up in a molehill in the middle; the rain stops, everyone goes home, the
    umbrella stays, closed. No rain falls under it."""

    def test_the_child_picks_and_the_last_squeezes_him_out(
        self, meadow: callable
    ) -> None:
        m = meadow(f"{STILL}&soon&props=storm")
        m.wake()
        arrived(m, "storm")
        m.do("use storm")
        m.wait("meadowGame.state().things.storm === 'choosing'", 40_000)
        assert m.page.evaluate("Storm.phase") == "raining"
        for who in ("hen", "hare", "hen"):  # the hen again: the next one still out
            m.do(f"use storm {who}")
            m.wait("!meadowGame.state().busy", 15_000)
        m.wait("meadowGame.state().things.storm === 'done'", 40_000)
        trace = m.page.evaluate("meadowGame.trace()")
        assert trace.index('"who":"hen","under":"hen"') < trace.index(
            '"under":"hen hare"'
        )
        assert "squeezed out" in trace
        assert m.page.evaluate("meadowGame.detail('storm').umbrella.open") is False
        assert m.state()["pose"] == "hill", "he popped up in a molehill"
        m.wait("Storm.phase === null", 15_000)
        m.wait_free()
        m.assert_settled()

    def test_a_storm_coming_breaks_off_his_play_and_he_goes_for_the_umbrella(
        self, meadow: callable
    ) -> None:
        """Weather won't wait for a tap: a child busy tapping him, laughing,
        and the clouds come in; he stops at once, with a fright, and goes."""
        m = meadow("seed=1&props=storm")
        m.wake()
        for _ in range(60):  # the child taps him on and on, until the clouds come
            if "arrives" in m.page.evaluate("meadowGame.trace()"):
                break
            m.do("tap mole")
            m.play_for(1000)
        arrived(m, "storm")
        trace = m.page.evaluate("meadowGame.trace()").split("\n")
        came = next(
            float(t.split("s")[0])
            for t in trace
            if '"thing":"storm"' in t and "arrives" in t
        )
        went = next(
            float(t.split("s")[0])
            for t in trace
            if '"name":"storm"' in t and "gesture" in t
        )
        assert went - came < 0.5, (
            f"he went for the umbrella {went - came:.1f} s after the clouds came"
        )
        m.wait("meadowGame.state().pose === 'down'", 15_000)  # down into his den for it

    def test_another_friend_tapped_mid_wave_keeps_the_sheltered(
        self, meadow: callable
    ) -> None:
        """Review, 2026-10-26: a tap on another friend while one was waved in
        cut the try, and the cut sent everyone home, the sheltered too."""
        m = meadow(f"{STILL}&soon&props=storm")
        m.wake()
        arrived(m, "storm")
        m.do("use storm")
        m.wait("meadowGame.state().things.storm === 'choosing'", 40_000)
        m.do("use storm mouse")
        m.wait("meadowGame.detail('storm').under.includes('mouse')", 10_000)
        m.wait("!meadowGame.state().busy", 5_000)
        m.do("use storm hare")
        m.play_for(400)  # the hare's wave under way
        m.do("use storm hen")
        m.wait("meadowGame.detail('storm').under.length >= 2", 10_000)
        assert "mouse" in m.page.evaluate("meadowGame.detail('storm').under")
        assert m.page.evaluate("meadowGame.detail('storm').out.length") == 3

    def test_a_cut_while_he_carries_it_puts_it_down_and_he_picks_it_up(
        self, meadow: callable
    ) -> None:
        """Review, 2026-10-26: a cut on his way planted the umbrella wherever
        he was (by his den, in his flower bed), for the rest of the day."""
        m = meadow(f"{STILL}&soon&props=storm")
        m.wake()
        arrived(m, "storm")
        m.do("use storm")
        m.wait("meadowGame.state().carrying", 20_000)
        m.play_for(CUT_MS)
        m.do(
            "stop"
        )  # a tap would wait for the step to end; an arrow let go (or bedtime) cuts at once
        m.wait_free()
        m.assert_settled()
        detail = m.page.evaluate("meadowGame.detail('storm')")
        assert detail["umbrella"] is None and detail["lying"] is not None, detail
        m.do("use storm")
        m.wait("meadowGame.detail('storm').umbrella?.open", 30_000)
        assert m.page.evaluate("meadowGame.detail('storm')")["umbrella"]["x"] == 1420
        assert m.page.evaluate("meadowGame.detail('storm').lying") is None

    def test_no_rain_falls_under_the_umbrella(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&soon&props=storm")
        m.wake()
        arrived(m, "storm")
        m.do("use storm")
        m.wait(
            "Storm.phase === 'raining' && meadowGame.detail('storm').umbrella?.open",
            40_000,
        )
        assert m.page.evaluate("World.isWet(1420)"), "the meadow is wet"
        assert (
            m.page.evaluate("getComputedStyle(document.getElementById('rain')).display")
            == "block"
        )
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
        # just after his morning "ahoj!", no wave hello: every other answer in turn
        assert set(hows[:4]) == {"cheer", "peekaboo", "laughs", "ponder"}, hows
        assert "wave" not in hows, "he waved hello again, just after his morning ahoj"
        assert all(a != b for a, b in pairwise(hows)), hows

    def test_each_answer_cut_short(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&props=")
        m.wake()
        for _ in range(5):
            m.do("tap mole")
            m.play_for(CUT_MS)
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
        m = meadow(
            f"{STILL}&soon&props=rain"
        )  # not the bulldozer: a threat won't be cut short
        m.wake()
        arrived(m, "rain")
        m.do("use rain")
        m.wait(
            "Things.stepping === 'rain'"
        )  # its first step playing (it arrives as 'step 0' already)
        m.play_for(CUT_MS)
        m.do("go to 400")
        m.play_for(200)
        assert m.state()["busy"] == "rain", "the tap cut the step short"
        m.wait("meadowGame.state().busy === 'go'", 15_000)  # the step over, off he goes
        m.wait_free()
        assert m.state()["x"] == 400
        assert m.state()["things"]["rain"] == "step 1", "the step was not kept"
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

    def test_the_old_clock_tells_the_play_s_hour(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&props=&day=40")
        m.wake()
        for _ in range(3):  # the hands follow the day, a step behind at most
            m.play_for(2500)
            shows, hour = m.page.evaluate("[Church.shows, World.state.hour]")
            assert 0 <= hour - shows < 0.2, (shows, hour)
        hand = m.page.evaluate(
            "document.querySelector('.clock-hour').getAttribute('transform')"
        )
        assert hand and hand.startswith("rotate("), hand
        assert not m.errors, m.errors


class TestMeadowOak:
    """The old oak at the meadow's left end (oak.js): he stops at its arch, and a
    tap on it has him peek into its hollow, a different way each time."""

    GONE = "document.getElementById('oak-front').childElementCount === 1 && !document.querySelector('.oak-leaf')"  # the dark alone: nothing falling

    PEEKS = ("acorns", "dark", "echo")

    def leaves_nothing(self, m: Meadow) -> None:
        """No dark over him, no eyes in it, no leaf on his head, nothing in his hands or falling."""
        left = m.page.evaluate(
            """({ dark: Oak.dark, eyes: document.querySelectorAll('.oak-eyes').length,
                 hat: document.querySelector('.mole-hat').childElementCount,
                 holds: Mole.state.holdsUp, falling: document.getElementById('oak-front').childElementCount - 1 })"""
        )
        assert left == {
            "dark": False,
            "eyes": 0,
            "hat": 0,
            "holds": False,
            "falling": 0,
        }, left

    def test_he_stops_at_its_arch(self, meadow: callable) -> None:
        m = meadow()
        m.wake()
        m.do("go to 0")
        m.wait_free()
        assert m.state()["x"] == m.page.evaluate("Layout.OAK.x")
        m.assert_settled()

    def test_a_tap_on_it_peeks_a_new_way_each_time(self, meadow: callable) -> None:
        m = meadow()
        m.wake()
        for _ in range(4):
            m.do("peek")
            m.wait_free()
            m.assert_settled()
        peeks = traced(m, "peeks")
        assert tuple(sorted(peeks[:3])) == self.PEEKS, peeks
        assert all(a != b for a, b in pairwise(peeks)), peeks
        assert m.page.evaluate("Oak.kept") == peeks.count("acorns")
        m.wait(self.GONE)  # what fell or flew off has landed and gone
        self.leaves_nothing(m)
        # the leaves he shook off lie in the grass, in front of the oak, and stay
        assert m.page.evaluate("Oak.fallen") == peeks.count("dark")
        m.play_for(5_000)
        assert m.page.evaluate("Oak.fallen") == peeks.count("dark")

    @pytest.mark.parametrize("cut_ms", [1800, 3200, 4600, 6000])
    def test_each_peek_cut_short_leaves_nothing_behind(
        self, meadow: callable, cut_ms: int
    ) -> None:
        m = meadow()
        m.wake()
        m.do("go to 300")  # beside it: each peek starts at once
        m.wait_free()
        for _ in range(3):
            m.do("peek")
            m.play_for(cut_ms)
            m.do("go to 400")
            m.wait_free()
            m.assert_settled()
            m.wait(self.GONE)
            self.leaves_nothing(m)
        assert tuple(sorted(traced(m, "peeks"))) == self.PEEKS

    def test_a_real_tap_on_its_trunk_and_he_peeks(self, meadow: callable) -> None:
        m = meadow()
        m.wake()
        m.do("go to 400")
        m.wait_free()
        m.wait(
            "meadowGame.state().view === 0"
        )  # the view eases to the meadow's left end
        # the screen shows 0.8 px a unit
        m.page.mouse.click(240, 544)  # its foot, at the meadow's edge: he walks there
        m.wait_free()
        assert abs(m.state()["x"] - 300) < 5, m.state()
        m.page.mouse.click(200, 300)  # the trunk, above the arch
        m.wait("meadowGame.trace().includes(' peeks ')", 5_000)
        m.wait_free()
        m.assert_settled()

    def test_his_eggshell_cap_stays_on(self, meadow: callable) -> None:
        """In the dark he would come out with a leaf on his head: in his cap, he keeps it."""
        m = meadow()
        m.wake()
        m.page.evaluate(
            "() => { const cap = document.createElementNS('http://www.w3.org/2000/svg', 'g'); cap.id = 'cap'; Mole.wear(cap) }"
        )
        for _ in range(3):
            m.do("peek")
            m.wait_free()
            m.assert_settled()
        assert "dark" in traced(m, "peeks")
        assert m.page.evaluate("Mole.wearing()?.id") == "cap"


class TestMeadowFence:
    """The painter's fence at the meadow's right end (fence.js): he stops at its corner,
    and a tap on it has him play at it, a different way each time."""

    TURNS = ("gap", "hops", "twig")

    def leaves_nothing(self, m: Meadow) -> None:
        """No twig in his hands, nobody about behind the fence, nothing held up."""
        left = m.page.evaluate(
            "({ twig: Fence.holding, about: Fence.about, holds: Mole.state.holdsUp })"
        )
        assert left == {"twig": False, "about": 0, "holds": False}, left

    def near(self, meadow: callable) -> Meadow:
        m = meadow()
        m.wake()
        m.do("go to 3000")  # a walk, not a run, from here to the fence
        m.wait_free()
        return m

    def test_he_stops_at_its_corner(self, meadow: callable) -> None:
        m = self.near(meadow)
        m.do("go to 3990")
        m.wait_free()
        assert m.state()["x"] == m.page.evaluate("Layout.FENCE.x")
        m.assert_settled()

    def test_a_tap_on_it_plays_a_new_way_each_time(self, meadow: callable) -> None:
        m = self.near(meadow)
        for _ in range(4):
            m.do("fence")
            m.wait_free()
            m.assert_settled()
            self.leaves_nothing(m)
        turns = traced(m, "fence")
        assert tuple(sorted(turns[:3])) == self.TURNS, turns
        assert all(a != b for a, b in pairwise(turns)), turns

    def test_the_twig_rings_up_the_scale_and_lies_where_he_left_it(
        self, meadow: callable
    ) -> None:
        m = self.near(meadow)
        start = m.page.evaluate("Fence.twigX")
        for _ in range(3):
            m.do("fence")
            m.wait_free()
            if traced(m, "fence")[-1] == "twig":
                break
        notes = m.page.evaluate(
            "meadowGame.trace().split('\\n').filter((l) => l.includes(' twig note ')).map((l) => JSON.parse(l.slice(l.indexOf('{'))).k)"
        )
        assert len(notes) > 10 and notes == sorted(notes), (
            notes
        )  # along to the right: up
        assert notes[0] == 0, f"the scale began part way up: {notes}"
        assert m.page.evaluate("Fence.twigX") > start + 200
        m.assert_settled()

    def test_cut_short_the_hare_ducks_from_where_he_is(self, meadow: callable) -> None:
        """Review, 2026-11-07: a cut cancelled his rise over the corner, which
        jumped him to its end (an animation's end is set on the element)
        before he ducked."""
        m = self.near(meadow)
        m.do("go to 3500")
        m.wait_free()
        for n in range(1, 4):
            m.do("fence")
            m.wait(f"meadowGame.trace().split(' fence {{').length > {n}", 5_000)
            if traced(m, "fence")[-1] == "hops":
                break
            m.wait_free()
        # the cut comes from the page, the first frame he is on his way up over the corner
        before, after = m.run("""new Promise((done) => {
            const stop = Clock.every(10, () => {
                const h = document.querySelector('#garden-life .friend.hare')
                if (!h || !h.getAnimations().some((a) => a.playState === 'running')) return
                stop()
                const stands = () => new DOMMatrixReadOnly(getComputedStyle(h).transform).f // how high he stands
                const y = stands()
                meadowGame.perform('go to 3300')
                Clock.wait(1).then(() => done([y, stands()])) // the next frame
            })
        })""")
        assert after >= before - 4, (
            f"he jumped up before ducking: {before:.0f} to {after:.0f}"
        )
        m.wait_free()
        m.assert_settled()

    @pytest.mark.parametrize("cut_ms", [1200, 2600, 4000, 5400])
    def test_each_turn_cut_short_leaves_nothing_behind(
        self, meadow: callable, cut_ms: int
    ) -> None:
        m = self.near(meadow)
        m.do("go to 3500")  # by the fence: each turn starts soon
        m.wait_free()
        for _ in range(3):
            m.do("fence")
            m.play_for(cut_ms)
            m.do("go to 3300")
            m.wait_free()
            m.assert_settled()
            self.leaves_nothing(m)
        assert tuple(sorted(traced(m, "fence"))) == self.TURNS
        m.play_for(2500)  # the hen off along the garden, out of sight
        assert (
            m.page.evaluate("document.getElementById('garden-life').childElementCount")
            == 0
        )

    def test_a_real_tap_on_its_palings_and_he_plays(self, meadow: callable) -> None:
        m = self.near(meadow)
        m.do("go to 3500")
        m.wait_free()
        m.wait("meadowGame.state().view === 2400")  # the view at the meadow's right end
        # the screen shows 0.8 px a unit: a paling of the back fence, above his head's height
        m.page.mouse.click((3410 - 2400) * 0.8, 590 * 0.8)
        m.wait("meadowGame.trace().includes(' fence {')", 5_000)
        m.wait_free()
        m.assert_settled()

    def test_bedtime_at_the_fence(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&day=16")
        m.wake()
        m.do("go to 3000")
        m.wait_free()
        for _ in range(30):
            if m.state()["ended"]:
                break
            m.do("fence")
            m.play_for(1500)
        m.wait("meadowGame.state().ended", 30_000)
        assert m.page.evaluate("Fence.about") == 0
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


class TestMeadowOwl:
    """The owl in the oak (owl.js): on some plays, asleep in the knot-hole by
    day, woken by his second call into the arch, out on its limb from dusk,
    playing with him at a tap, hooting only between the cricket's tunes."""

    VISITS = ("tilt", "turn", "wink")
    LIDS = "[...document.querySelectorAll('.owl-lid')].map((l) => l.style.transform)"

    def sits_as_it_does(self, m: Meadow) -> None:
        """Its head upright, its face round to us, the back of its head hidden: as drawn, not only as styled."""
        left = m.page.evaluate(
            """(() => {
                 const drawn = (sel) => getComputedStyle(document.querySelector(sel))
                 const still = (sel) => new DOMMatrixReadOnly(drawn(sel).transform === 'none' ? undefined : drawn(sel).transform).isIdentity
                 return { posing: Owl.posing, head: still('.owl-head'), face: still('.owl-face') && drawn('.owl-face').opacity === '1',
                          back: drawn('.owl-back').opacity }
               })()"""
        )
        assert left == {"posing": False, "head": True, "face": True, "back": "0"}, left

    def test_it_lives_in_the_oak_on_some_plays_only(self, meadow: callable) -> None:
        states = []
        for seed in (1, 2):  # seed 1 draws one, seed 2 none
            m = meadow(f"seed={seed}&still")
            states.append(m.page.evaluate("Owl.state"))
            m.page.close()
        assert states == ["asleep", "none"], states
        m = meadow(f"{STILL}&owl=0")
        assert m.page.evaluate("Owl.state") == "none"
        assert not m.page.query_selector(".owl")

    def test_his_second_call_wakes_it_and_it_sleeps_on(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&owl=1")
        m.wake()
        while traced(m, "peeks").count("echo") < 2:
            m.do("peek")
            m.wait_free()
        trace = m.page.evaluate("meadowGame.trace()")
        first, second = (
            i for i, line in enumerate(trace.split("\n")) if '"how":"echo"' in line
        )
        woken = [
            i for i, line in enumerate(trace.split("\n")) if '"woken":true' in line
        ]
        assert len(woken) == 1 and first < second < woken[0], trace
        assert m.page.evaluate("Owl.state") == "asleep"
        lids = m.page.evaluate(self.LIDS)
        assert lids == ["scaleY(1)", "scaleY(1)"], "its eyes shut again"
        m.assert_settled()

    def test_it_comes_out_onto_its_limb_at_dusk(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&owl=1&day=40&props=")
        m.wake()
        m.wait("Owl.state === 'perched'", 60_000)
        perch = m.page.evaluate("Layout.OAK.perch")
        at = m.page.evaluate(
            "(() => { const t = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.owl')).transform); return { x: t.e, y: t.f } })()"
        )
        assert abs(at["x"] - perch["x"]) < 1 and abs(at["y"] - perch["y"]) < 1, at
        assert not m.errors, m.errors

    def test_a_tap_on_it_out_plays_a_new_way_each_time(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&owl=out")
        m.wake()
        for _ in range(4):
            m.do("owl")
            m.wait_free()
            m.assert_settled()
            self.sits_as_it_does(m)
        visits = traced(m, "owl visit")
        assert tuple(sorted(visits[:3])) == self.VISITS, visits
        assert all(a != b for a, b in pairwise(visits)), visits

    def test_a_tap_by_day_opens_an_eye_and_it_sleeps_on(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&owl=1")
        m.wake()
        m.do("owl")
        m.wait_free()
        assert m.page.evaluate("Owl.state") == "asleep"
        lids = m.page.evaluate(self.LIDS)
        assert lids == ["scaleY(1)", "scaleY(1)"]
        m.assert_settled()

    def test_cut_short_its_head_comes_upright(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&owl=out")
        m.wake()
        for _ in range(3):  # each way, cut in its middle
            m.do("owl")
            m.wait(
                "Owl.posing && document.querySelector('.owl-head').getAnimations().length + document.querySelector('.owl-face').getAnimations().length + [...document.querySelectorAll('.owl-lid')].flatMap((l) => l.getAnimations()).length > 0"
            )
            m.do("go to 900")
            m.wait_free()
            m.assert_settled()
            self.sits_as_it_does(m)

    @pytest.mark.realtime  # the music follows sound's own clock
    def test_it_hoots_into_the_quiet_after_a_tune(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&owl=out&props=")
        m.wake()
        m.wait(
            f"{MUSIC}.includes('morning') && meadowGame.music() === null", 60_000
        )  # a tune has ended: as the cricket's do
        assert m.page.evaluate("Owl.rest()") > 0, "the cricket waits for it"
        m.wait("meadowGame.trace().includes('\"hoots\":true')")
        assert '"over":null' in m.page.evaluate("meadowGame.trace()")
        m.do("owl")
        m.wait("Owl.posing")
        assert m.page.evaluate("Owl.rest()") > 0
        m.wait_free()
        assert not m.errors, m.errors

    def test_it_is_tapped_where_it_sits(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&owl=out")
        m.wake()
        box = m.page.query_selector(".owl .owl-body").bounding_box()
        m.page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        m.wait("meadowGame.trace().includes(' owl visit ')")
        m.wait_free()
        m.assert_settled()

    def test_a_cut_peek_as_it_wakes_lets_it_come_out(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&owl=1&day=40&props=")
        m.wake()
        m.do("go to 400")
        m.wait("Owl.state === 'coming'", 60_000)
        m.do(
            "peek"
        )  # cut at once: the peek's restore must leave the owl's waking alone
        m.play_for(200)
        m.do("go to 900")
        m.wait("Owl.state === 'perched'", 20_000)
        assert m.page.evaluate(self.LIDS) == ["scaleY(0)", "scaleY(0)"], (
            "on its limb, eyes open"
        )

    def test_it_comes_out_only_once_he_has_done(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&owl=1")
        m.wake()
        m.do("owl")
        m.wait(f"{self.LIDS}[0] === 'scaleY(0)'")  # an eye open at him
        m.page.evaluate("Owl.tick(19, !meadowGame.state().busy)")
        assert m.page.evaluate("Owl.state") == "asleep", "not out mid-visit"
        m.wait_free()
        m.page.evaluate("Owl.tick(19, !meadowGame.state().busy)")
        m.wait("Owl.state === 'perched'", 20_000)
        assert m.page.evaluate(self.LIDS) == ["scaleY(0)", "scaleY(0)"], (
            "on its limb, eyes open"
        )

    def test_a_second_tap_by_day_keeps_its_eye_open(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&owl=1")
        m.wake()
        m.do("owl")
        m.wait(
            f"{self.LIDS}[0] === 'scaleY(0)'"
        )  # its eye opening: then it looks at him 900 ms
        m.play_for(500)
        # the first visit cut while it looks: it must not shut the eye the second has opened
        m.do("owl")
        m.play_for(
            900
        )  # past when the first would have shut it, before the second does
        assert m.page.evaluate(self.LIDS)[0] == "scaleY(0)"
        m.wait_free()
        assert m.page.evaluate(self.LIDS) == ["scaleY(1)", "scaleY(1)"]

    def test_it_keeps_quiet_over_a_tune(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&owl=out&props=")
        m.wake()
        m.wait(
            f"{MUSIC}.includes('morning') && meadowGame.music() === 'morning'", 20_000
        )
        m.page.evaluate(
            "window.hooted = 0; const h = Sound.hoot; Sound.hoot = (...a) => { hooted += 1; return h(...a) }; Owl.rest()"
        )
        m.wait("meadowGame.trace().includes(' owl {\"hoots\"')")
        assert '"over":"morning"' in m.page.evaluate("meadowGame.trace()")
        assert m.page.evaluate("hooted") == 0, "it hooted over the tune"

    @pytest.mark.realtime  # the music follows sound's own clock
    def test_its_hoot_leaves_a_tilted_head_tilted(self, meadow: callable) -> None:
        m = meadow(f"{STILL}&owl=out&props=")
        m.wake()
        m.wait(f"{MUSIC}.includes('morning') && meadowGame.music() === null", 60_000)
        while True:
            m.do("owl")
            m.wait(
                "meadowGame.trace().split('\\n').some((l) => l.includes(' owl visit '))"
            )
            if traced(m, "owl visit")[-1] == "tilt":
                break
            m.do("go to 400")  # not this one: cut it short
            m.wait_free()
        m.wait(
            "Owl.posing && document.querySelector('.owl-head').style.transform.startsWith('rotate') && document.querySelector('.owl-head').style.transform !== 'rotate(0deg)'"
        )
        m.page.evaluate("Owl.rest()")
        m.wait("meadowGame.trace().includes('\"hoots\":true')")
        assert m.page.evaluate(
            "document.querySelector('.owl-head').style.transform"
        ).startswith("rotate"), "the hoot never sets the head upright"
        m.wait_free()
        m.assert_settled()


class TestMeadowAutumn:
    """Autumn (autumn.js, layout.js): half the plays; the painting turned,
    the tree a chestnut dropping its leaves, the egg and the owl spring's,
    and the woodpecker in the tree's hole (woodpecker.js)."""

    AUTUMN = f"{STILL}&season=autumn"
    VISITS = ("echo", "roll", "three")
    HEAD_STILL = "new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.woodpecker-head')).transform === 'none' ? undefined : getComputedStyle(document.querySelector('.woodpecker-head')).transform).isIdentity"

    def where(self, m: Meadow) -> dict:
        return m.page.evaluate(
            "(() => { const t = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.woodpecker')).transform); return { x: Math.round(t.e), y: Math.round(t.f) } })()"
        )

    def test_a_play_is_spring_or_autumn(self, meadow: callable) -> None:
        seasons = set()
        for seed in range(1, 7):
            m = meadow(
                f"seed={seed}&still&season=drawn"
            )  # not a season: the play's own draw
            seasons.add(m.page.evaluate("Layout.season"))
            m.page.close()
        assert seasons == {"spring", "autumn"}, seasons

    def test_autumn_has_its_own_and_not_springs(self, meadow: callable) -> None:
        m = meadow(f"{self.AUTUMN}&props=egg,car&owl=1")
        plan = m.page.evaluate(
            "meadowGame.trace().split('\\n').find((l) => l.includes(' things '))"
        )
        assert '"car@' in plan and "egg" not in plan, f"the egg is spring's: {plan}"
        assert m.page.evaluate("Owl.state") == "none", "the owl is spring's"
        assert m.page.evaluate("Woodpecker.state") == "in"
        assert m.page.evaluate(
            "document.getElementById('world').classList.contains('season-autumn') && World.state.season === 'autumn'"
        )
        spring = meadow(f"{STILL}&woodpecker=1")
        assert spring.page.evaluate("Woodpecker.state") == "in", (
            "forced, it comes in spring too"
        )
        spring = meadow(STILL)
        assert spring.page.evaluate("Woodpecker.state") == "none"
        assert not m.errors, m.errors

    def test_leaves_drop_from_the_chestnut_and_lie_at_its_foot(
        self, meadow: callable
    ) -> None:
        m = meadow("seed=1&season=autumn&props=")
        m.wake()
        m.wait("Autumn.lying >= 2", 60_000)
        xs = m.page.evaluate(
            "[...document.querySelectorAll('#oak-ground .dropped')].map((g) => new DOMMatrixReadOnly(getComputedStyle(g).transform).e)"
        )
        assert all(-40 < x < 600 for x in xs), xs
        assert not m.errors, m.errors

    def test_the_woodpecker_comes_out_to_drum_and_goes_back_in(
        self, meadow: callable
    ) -> None:
        m = meadow("seed=1&season=autumn&props=")
        m.wake()
        m.wait("meadowGame.trace().includes('\"drums\"')", 120_000)
        m.wait(
            "Woodpecker.state === 'in' && !document.querySelector('.woodpecker').getAnimations().length",
            60_000,
        )
        hole = m.page.evaluate("Layout.OAK.knot")
        assert abs(self.where(m)["x"] - hole[0]) < 20, self.where(m)
        assert not m.errors, m.errors

    def test_it_goes_in_for_the_night(self, meadow: callable) -> None:
        m = meadow(f"{self.AUTUMN}&woodpecker=out&day=40&props=")
        m.wake()
        m.wait("Woodpecker.state === 'night'", 60_000)
        m.do("woodpecker")
        m.wait_free()
        assert m.page.evaluate("Woodpecker.state") == "night", (
            "a tap at night leaves it in"
        )
        m.assert_settled()

    def test_a_tap_plays_a_new_way_each_time(self, meadow: callable) -> None:
        m = meadow(f"{self.AUTUMN}&woodpecker=out")
        m.wake()
        for _ in range(4):
            m.do("woodpecker")
            m.wait_free()
            m.assert_settled()
            assert m.page.evaluate(self.HEAD_STILL)
        visits = traced(m, "woodpecker visit")
        assert tuple(sorted(visits[:3])) == self.VISITS, visits
        assert all(a != b for a, b in pairwise(visits)), visits

    def test_a_tap_brings_it_out_of_its_hole(self, meadow: callable) -> None:
        m = meadow(f"{self.AUTUMN}&props=")
        m.wake()
        m.do("woodpecker")
        m.wait_free()
        assert m.page.evaluate("Woodpecker.state") == "out"
        assert len(traced(m, "woodpecker visit")) == 1
        m.assert_settled()

    def test_cut_short_it_is_back_where_it_was(self, meadow: callable) -> None:
        m = meadow(f"{self.AUTUMN}&props=")
        m.wake()
        for _ in range(3):  # each way, cut in its middle
            m.do("woodpecker")
            m.wait(
                "Woodpecker.posing && (document.querySelector('.woodpecker-head').getAnimations().length + document.querySelector('.woodpecker').getAnimations().length) > 0"
            )
            m.do("go to 900")
            m.wait_free()
            m.assert_settled()
            assert m.page.evaluate(self.HEAD_STILL)
            state = m.page.evaluate("Woodpecker.state")
            hole = m.page.evaluate("Layout.OAK.knot")
            near_hole = abs(self.where(m)["x"] - hole[0]) < 20
            assert near_hole == (state == "in"), (state, self.where(m))

    def test_it_is_tapped_where_it_sits(self, meadow: callable) -> None:
        m = meadow(f"{self.AUTUMN}&woodpecker=out")
        m.wake()
        box = m.page.query_selector(".woodpecker-head").bounding_box()
        m.page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        m.wait("meadowGame.trace().includes(' woodpecker visit ')")
        m.wait_free()
        m.assert_settled()

    def test_a_tap_on_the_chestnut_brings_a_conker_down(self, meadow: callable) -> None:
        m = meadow(f"{self.AUTUMN}&props=&woodpecker=0")
        m.wake()
        for _ in range(3):
            m.do("peek")
            m.wait_free()
            m.assert_settled()
        assert sorted(traced(m, "peeks")) == ["conkers", "dark", "echo"]
        assert m.page.evaluate("Oak.kept") == 1, "the conker tucked into the hollow"
        assert (
            m.page.evaluate("document.querySelectorAll('.oak-acorns .conker').length")
            == 1
        )
        assert (
            m.page.evaluate("document.querySelectorAll('#oak-front .husk').length") == 1
        ), "its husk lies split in the grass"

    def test_the_conker_cut_short_lies_where_it_rolled(self, meadow: callable) -> None:
        m = meadow(f"{self.AUTUMN}&props=&woodpecker=0")
        m.wake()
        while "conkers" not in traced(m, "peeks"):
            m.do("peek")
            m.play_for(300)
            if traced(m, "peeks")[-1:] != ["conkers"]:
                m.wait_free()
        m.wait(
            "meadowGame.trace().includes('\"thing\":\"roll\"') || document.querySelector('#oak-front > .conker')"
        )
        m.do("go to 900")
        m.wait_free()
        m.assert_settled()
        assert m.page.evaluate("Oak.kept") == 0
        assert not m.page.evaluate(
            "document.querySelector('#mole .conker, #mole-out .conker')"
        ), "nothing left in his hands"

    def test_geese_go_over_and_the_mist_lifts(self, meadow: callable) -> None:
        m = meadow("seed=1&season=autumn&props=&critters=geese")
        m.wake()
        early = float(
            m.page.evaluate(
                "document.querySelector('#haze .mist').getAttribute('opacity')"
            )
        )
        m.wait("meadowGame.trace().includes(' geese ')", 30_000)
        m.wait(
            "!document.querySelector('.geese')", 60_000
        )  # across and gone, out of sight
        late = meadow("seed=1&season=autumn&props=&day=40")
        late.wake()
        late.wait(
            "Number(document.querySelector('#haze .mist').getAttribute('opacity')) === 0",
            60_000,
        )
        assert early > 0.3, early
        assert not m.errors and not late.errors, (m.errors, late.errors)

    def test_a_tap_on_the_fallen_leaves_plays_in_them(self, meadow: callable) -> None:
        m = meadow(f"{self.AUTUMN}&props=&woodpecker=0")
        m.wake()
        for _ in range(3):
            m.do("leaves")
            m.wait_free()
            m.assert_settled()
        hows = traced(m, "leaves")
        assert sorted(hows[:2]) == ["kick", "toss"], hows
        assert m.page.evaluate("Autumn.lying") >= 6, (
            "the tossed leaves lie in the grass"
        )
        box = m.page.query_selector(".leaf-hit").bounding_box()
        m.page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        m.wait("meadowGame.trace().split(' leaves ').length > 4")
        m.do("go to 900")  # cut short
        m.wait_free()
        m.assert_settled()

    @pytest.mark.realtime  # the music follows sound's own clock
    def test_its_morning_plays_autumns_own_take(self, meadow: callable) -> None:
        m = meadow("seed=1&props=&season=autumn")
        m.wake()
        m.wait("meadowGame.trace().includes(' music ')", 30_000)
        assert '"season":"autumn"' in m.page.evaluate("meadowGame.trace()")
        spring = meadow("seed=1&props=")
        spring.wake()
        spring.wait("meadowGame.trace().includes(' music ')", 30_000)
        assert '"season"' not in spring.page.evaluate("meadowGame.trace()")

    def test_the_swing_under_the_chestnut(self, meadow: callable) -> None:
        m = meadow(f"{self.AUTUMN}&props=&woodpecker=0")
        m.wake()
        for _ in range(3):
            m.do("swing")
            m.wait_free()
            m.assert_settled()
            assert not m.page.evaluate("Swing.on")
        assert sorted(traced(m, "swing")[:2]) == ["higher", "jump"]
        spring = meadow(STILL)
        assert not spring.page.query_selector(".swing"), "the swing is autumn's"

    def test_the_swing_cut_short_puts_him_down(self, meadow: callable) -> None:
        m = meadow(f"{self.AUTUMN}&props=&woodpecker=0")
        m.wake()
        for _ in range(2):
            m.do("swing")
            m.wait(
                "Swing.on && document.querySelector('.swing').getAnimations().length > 0"
            )
            m.do("go to 900")
            m.wait_free()
            m.assert_settled()
            assert not m.page.evaluate("Swing.on")
        m.wait("!document.querySelector('.swing').getAnimations().length", 20_000)
        still = m.page.evaluate(
            "new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.swing')).transform).isIdentity || getComputedStyle(document.querySelector('.swing')).transform === 'none'"
        )
        assert still, "the swing swings itself still"
