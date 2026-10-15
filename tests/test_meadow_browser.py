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
from pathlib import Path

import pytest

pytestmark = pytest.mark.browser
playwright = pytest.importorskip("playwright.sync_api")

ROOT = Path(__file__).resolve().parent.parent
MEADOW = ROOT / "worlds/krtek/games/meadow/game/index.html"
STILL = "seed=1&still"
DONE_MS = 60_000  # the longest encounter runs well under this
CUT_MS = 350  # into a step, the cut comes this soon

# Each encounter and how many steps its chain has.
ENCOUNTERS = {"egg": 5}


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


def arrived(m: Meadow, name: str) -> None:
    m.wait(
        f"meadowGame.state().things.{name} && meadowGame.state().things.{name}.startsWith('step')"
    )


class TestMeadowCoverage:
    def test_every_encounter_is_tested(self, meadow: callable) -> None:
        assert set(meadow().page.evaluate("meadowGame.things")) == set(ENCOUNTERS)


class TestMeadowDay:
    def test_wakes_digs_answers_and_waters(self, meadow: callable) -> None:
        m = meadow()
        m.wake()
        for intent in ("dig to 1100", "tap mole", "water", "dig to 300"):
            m.do(intent)
            m.wait_free()
            m.assert_settled()
        assert m.state()["x"] == 300

    def test_a_tap_cuts_any_move_short(self, meadow: callable) -> None:
        m = meadow()
        m.wake()
        for first in ("dig to 1300", "water", "tap mole"):
            m.do(first)
            m.page.wait_for_timeout(CUT_MS)
            m.do("dig to 400")
            m.wait_free()
            m.assert_settled()

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
        m.do(f"use {name}")
        m.wait(f"meadowGame.state().things.{name} === 'done'")
        m.wait_free()
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
        m.do("dig to 1400")
        m.wait_free()
        m.assert_settled()
        assert m.page.evaluate(f"meadowGame.detail('{name}').cast") == [], (
            "visitors left about"
        )
        m.do(f"use {name}")
        m.wait(f"meadowGame.state().things.{name} === 'done'")
        m.wait_free()
        m.assert_settled()

    def test_hurried_by_taps(self, meadow: callable, name: str) -> None:
        m = meadow(f"{STILL}&soon&props={name}")
        m.wake()
        arrived(m, name)
        for _ in range(40):
            m.do(f"use {name}")
            m.page.wait_for_timeout(300)
            if m.state()["things"][name] == "done":
                break
        m.wait(f"meadowGame.state().things.{name} === 'done'")
        m.wait_free()
        m.assert_settled()

    def test_a_tap_on_him_hurries_it_rather_than_cuts_it(
        self, meadow: callable, name: str
    ) -> None:
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
