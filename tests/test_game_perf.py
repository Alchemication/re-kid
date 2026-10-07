"""Performance budgets for the yard, the way games are measured: a phone-sized
screen at 3x pixels, Chrome's CPU slowed 4x (a mid-range phone), and for each
scenario how much of every second the page's main thread is busy and how long
frames take (60 fps is a 16.7 ms budget a frame).

Run alone, on an otherwise idle machine (`uv run pytest -m perf`): timings
under load (the browser tests' 8 workers) measure the machine, not the game.
Each run prints its numbers, so a change's cost shows next to the budget.

What this can't see is the phone's GPU and its heat: for that, Safari's Web
Inspector on the iPhone itself (Timelines: CPU and Energy Impact), see README.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest

pytestmark = pytest.mark.perf
playwright = pytest.importorskip("playwright.sync_api")

YARD = (
    Path(__file__).resolve().parent.parent / "worlds/reksio/games/yard/game/index.html"
)
PHONE = {"width": 844, "height": 390}  # an iPhone on its side
PHONE_PIXELS = 3
CPU_SLOWDOWN = 4  # Chrome's own throttling: about a mid-range phone
SECONDS = 8  # long enough to average over a few left-alone moves
BUSY_BUDGET = 25  # % of each second the main thread may be busy: about 15 now; 3 ms of extra work a frame takes it to about 28
FRAME_P95_BUDGET_MS = (
    20  # 95% of frames within this: a steady 60 fps (16.7 ms) with a little slack
)

SCENARIOS = {
    "idle": ("rain=0", None),  # left alone: he keeps busy on his own
    "walking": (
        "rain=0",
        "setInterval(() => yardGame.walk(Reksio.x < 2000 ? 3400 : 600), 4000); yardGame.walk(3400)",
    ),
    "rain": ("rain=1&rain-at=0", None),  # rain, splashes, puddles: the busiest drawing
}
FRAME_TIMES = """() => { window.__frames = []; let last = performance.now()
    const f = (t) => { __frames.push(t - last); last = t; requestAnimationFrame(f) }
    requestAnimationFrame(f) }"""


@pytest.fixture(scope="module")
def browser() -> Iterator[object]:
    with playwright.sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        yield b
        b.close()


def measure(browser: object, query: str, action: str | None) -> dict:
    """Main-thread busy % and frame times over SECONDS of play."""
    ctx = browser.new_context(
        viewport=PHONE, device_scale_factor=PHONE_PIXELS, has_touch=True
    )
    page = ctx.new_page()
    cdp = ctx.new_cdp_session(page)
    cdp.send("Performance.enable")
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": CPU_SLOWDOWN})
    page.goto(f"{YARD.as_uri()}?seed=2&{query}")
    page.wait_for_function("window.yardGame")
    page.wait_for_timeout(2000)  # past the first paint
    page.mouse.click(400, 300)  # a first tap: sound and music on, as in play
    if action:
        page.evaluate(action)
    page.evaluate(FRAME_TIMES)

    def busy_s() -> float:
        metrics = cdp.send("Performance.getMetrics")["metrics"]
        return next(m["value"] for m in metrics if m["name"] == "TaskDuration")

    before = busy_s()
    page.wait_for_timeout(SECONDS * 1000)
    busy = (busy_s() - before) / SECONDS * 100
    frames = sorted(page.evaluate("__frames")[5:])
    ctx.close()
    return {
        "busy": round(busy),
        "fps": round(len(frames) / SECONDS),
        "p50": round(frames[len(frames) // 2], 1),
        "p95": round(frames[int(len(frames) * 0.95)], 1),
    }


@pytest.mark.parametrize("scenario", SCENARIOS)
def test_stays_within_budget_on_a_phone(browser: object, scenario: str) -> None:
    query, action = SCENARIOS[scenario]
    m = measure(browser, query, action)
    print(
        f"\n  {scenario}: main thread {m['busy']}% busy, {m['fps']} fps, frames p50 {m['p50']} ms, p95 {m['p95']} ms"
    )
    assert m["busy"] <= BUSY_BUDGET, (
        f"{scenario}: main thread {m['busy']}% busy (budget {BUSY_BUDGET}%): {m}"
    )
    assert m["p95"] <= FRAME_P95_BUDGET_MS, (
        f"{scenario}: slow frames, p95 {m['p95']} ms (budget {FRAME_P95_BUDGET_MS}): {m}"
    )
