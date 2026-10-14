"""Look at a gag: play it in Chrome and photograph it as it runs.

For checking a gag by eye while making it (CLAUDE.md, "Adding a gag"). It opens
a seeded, still play (``LOOK_FLAGS``, with any flags given on top), awaits the
setup steps, then starts the step to watch and takes a screenshot every so
often until it ends. It saves the frames, a contact sheet, and ``look.json``:
each frame's game time, the game's trace and events, its state at the end, and
any errors.
"""

from __future__ import annotations

import json
import logging
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import parse_qsl, urlencode

from config import (
    GAME_PAGE,
    GAMES_DIR,
    LOOK_CLOSE,
    LOOK_FLAGS,
    WORLDS_DIR,
)
from replay import contact_sheet

logger = logging.getLogger(__name__)


class LookError(Exception):
    """A look that can't run; the message says what to do."""


@dataclass
class Look:
    """What a look saw."""

    frames: list[Path] = field(default_factory=list)
    times: list[int] = field(default_factory=list)
    sheet: Path | None = None
    ended: bool = False
    failed: str | None = None
    errors: list[str] = field(default_factory=list)


def look_url(world: str, game: str, flags: str = "") -> str:
    """The game page with LOOK_FLAGS, and `flags` (a page address query) on
    top: a flag given here replaces the default, never sits beside it (the
    game reads the first of two)."""
    page = WORLDS_DIR / world / GAMES_DIR / game / GAME_PAGE
    if not page.is_file():
        raise LookError(
            f"No game page at {page}. Check the world and game names (`main.py list`)."
        )
    query = dict(LOOK_FLAGS)
    query.update(parse_qsl(flags.lstrip("?"), keep_blank_values=True))
    return f"{page.resolve().as_uri()}?{urlencode(query)}"


def parse_size(text: str) -> tuple[int, int]:
    """'1280x720' as (1280, 720)."""
    try:
        w, h = (int(n) for n in text.lower().split("x"))
    except ValueError as e:
        raise LookError(
            f"Size {text!r} isn't WIDTHxHEIGHT. Give it as, say, 844x390."
        ) from e
    if w <= 0 or h <= 0:
        raise LookError(f"Size {text!r} must be positive, as, say, 844x390.")
    return w, h


def close_clip(box: dict, size: tuple[int, int]) -> dict:
    """LOOK_CLOSE around Reksio's box (screen pixels), a little above his
    middle (what lands on his head shows), kept inside the page."""
    w, h = min(LOOK_CLOSE[0], size[0]), min(LOOK_CLOSE[1], size[1])
    cx = box["x"] + box["width"] / 2
    cy = box["y"] + box["height"] * 0.4
    x = min(max(0, cx - w / 2), size[0] - w)
    y = min(max(0, cy - h / 2), size[1] - h)
    return {"x": x, "y": y, "width": w, "height": h}


def look(
    url: str,
    out: Path,
    *,
    before: list[str],
    watch: str | None,
    seconds: float,
    every_ms: int,
    size: tuple[int, int],
    close: bool,
) -> Look:
    """Open `url`, await each of `before` (JavaScript, in the page), then
    photograph `watch` as it runs, every `every_ms`, until it ends or
    `seconds` pass (with no `watch`: for `seconds`). Saves to `out`."""
    try:
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import sync_playwright
    except ImportError as e:
        raise LookError(
            "Playwright is missing. Run `uv sync` (it is a dev dependency)."
        ) from e

    result = Look()
    frames_dir = out / "frames"
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(
            channel="chrome"
        )  # the bundled Chromium can't decode the game's audio
        page = browser.new_page(viewport={"width": size[0], "height": size[1]})
        page.on(
            "console",
            lambda m: (
                m.type == "error"
                and "ERR_FILE_NOT_FOUND" not in m.text
                and result.errors.append(m.text)
            ),
        )
        page.on("pageerror", lambda e: result.errors.append(f"uncaught: {e}"))
        page.goto(url)
        page.wait_for_function("window.yardGame")
        try:
            for step in before:
                page.evaluate(
                    "(js) => Debug.ignoreCut(Promise.resolve(eval(js)), 'look: before')",
                    step,
                )
            if watch:
                page.evaluate(
                    """(js) => {
                        window.__look = null
                        Promise.resolve(eval(js)).then(() => (window.__look = 'done'), (e) => (window.__look = String(e)))
                    }""",
                    watch,
                )
        except PlaywrightError as e:
            browser.close()
            raise LookError(
                f"A step failed in the page: {e.message.splitlines()[0]}. Check the JavaScript "
                "(try it in the browser console of `main.py play --still`)."
            ) from e
        start = page.evaluate("Clock.now()")
        while True:
            now = page.evaluate("Clock.now()")
            state = page.evaluate("window.__look") if watch else None
            if state or now - start > seconds * 1000:
                break
            frame = frames_dir / f"{len(result.frames):03d}.jpg"
            clip = (
                close_clip(page.locator("#rk-bob").bounding_box(), size)
                if close
                else None
            )
            page.screenshot(path=frame, type="jpeg", quality=80, clip=clip)
            result.frames.append(frame)
            result.times.append(round(now - start))
            page.wait_for_timeout(every_ms)
        result.ended = state == "done" or not watch
        result.failed = state if state and state != "done" else None
        record = {
            "url": url, "before": before, "watch": watch, "ended": result.ended, "failed": result.failed,
            "frames": [{"file": f.name, "t": t} for f, t in zip(result.frames, result.times, strict=True)],
            "errors": result.errors, "state": page.evaluate("yardGame.state()"),
            "events": page.evaluate("yardGame.events()"), "trace": page.evaluate("yardGame.trace()"),
        }  # fmt: skip
        browser.close()
    result.sheet = contact_sheet(result.frames, out / "sheet.jpg")
    (out / "look.json").write_text(json.dumps(record, indent=1))
    return result
