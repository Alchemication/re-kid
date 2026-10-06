"""Replay a game's bug report in Chrome and photograph the run-up to it.

A report (saved from the game with Ctrl+Shift+B, see the game's ``debug.js``)
holds the play's seed and flags and every input since the start. The replay
opens the same play, feeds the inputs in at the same times, and takes a
screenshot every so often over the last seconds before the report. It then
compares the replayed state with the recorded one: the game runs on the real
clock, so a replay is close, not exact, and the comparison says how close.
"""

from __future__ import annotations

import json
import logging
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import parse_qsl, unquote, urlencode, urlsplit

from config import (
    BUG_REPORT_DIR,
    BUG_REPORT_GLOB,
    BUG_REPORT_VERSION,
    GAME_PAGE,
    GAMES_DIR,
    REPLAY_SHEET_COLUMNS,
    REPLAY_SHEET_WIDTH,
    WORLDS_DIR,
)

logger = logging.getLogger(__name__)

# State keys that are expected to drift on a replay (the camera eases, time
# passes) and say nothing about whether the replay went the same way.
DRIFTING = {"camX", "soak", "t"}


class ReplayError(Exception):
    """A report that can't be replayed; the message says what to do."""


@dataclass
class Replay:
    """What a replay found."""

    report: dict
    frames: list[Path] = field(default_factory=list)
    sheet: Path | None = None
    state: dict = field(default_factory=dict)
    differences: dict = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)


def latest_report(folder: Path = BUG_REPORT_DIR) -> Path:
    """The newest bug report in `folder`."""
    found = sorted(folder.glob(BUG_REPORT_GLOB), key=lambda p: p.stat().st_mtime)
    if not found:
        raise ReplayError(
            f"No bug report ({BUG_REPORT_GLOB}) in {folder}. Save one in the game with Ctrl+Shift+B, "
            "or pass the report's path."
        )
    return found[-1]


def load_report(path: Path) -> dict:
    """Read and check a bug report."""
    try:
        report = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as e:
        raise ReplayError(
            f"Can't read {path}: {e}. Pass a report saved by the game."
        ) from e
    if report.get("version") != BUG_REPORT_VERSION:
        raise ReplayError(
            f"{path} is a version {report.get('version')} report; this replay reads version "
            f"{BUG_REPORT_VERSION}. Save a new report from the current game."
        )
    for key in ("replayUrl", "inputs", "at", "viewport"):
        if key not in report:
            raise ReplayError(
                f"{path} has no {key!r}. Save a new report from the current game."
            )
    page = local_page(report["replayUrl"])
    if not page.is_file():
        raise ReplayError(
            f"The report's game page {page} isn't here. Replay it in the repository "
            "it came from (a file:// report: on the machine that saved it)."
        )
    return report


def local_page(url: str) -> Path:
    """This repository's copy of the game page a report was saved on.

    A report saved from disk has the page's own path. One saved on the
    published site (``<site>/<world>/<game>/``, see ``.github/workflows/pages.yml``)
    maps to that world's game here, so replays run on the local copy.
    """
    parts = urlsplit(url)
    if parts.scheme == "file":
        return Path(unquote(parts.path))
    segments = [s for s in parts.path.split("/") if s and s != "index.html"]
    if len(segments) < 2:
        raise ReplayError(
            f"Can't tell which game {url} is: expected <site>/<world>/<game>/."
        )
    world, game = segments[-2:]
    return WORLDS_DIR / world / GAMES_DIR / game / GAME_PAGE


def layout_flags(layout: dict | None) -> dict:
    """Page-address flags that pin a play's layout, so a replay builds the same
    yard: an unseeded play picks its things partly from the browser's memory of
    the last play, which a replay doesn't have. (Forced flags still make their
    random draws, so the rest of the seeded play is unchanged.)"""
    if not layout:
        return {}
    flags = {
        "mains": ",".join(m for m in layout.get("mains", []) if m != "doghouse"),
        "creatures": ",".join(layout.get("creatures", [])),
    }
    for key in ("flowers", "rain"):
        if key in layout:
            flags[key] = "1" if layout[key] else "0"
    if layout.get("fruit"):
        flags["fruit"] = layout["fruit"]
    return flags


def replay_url(report: dict) -> str:
    """The report's play on the local game page: seeded, its layout pinned, with
    the debug overlay on."""
    query = layout_flags(report.get("layout"))
    query.update(parse_qsl(urlsplit(report["replayUrl"]).query, keep_blank_values=True))
    query["debug"] = ""
    return f"{local_page(report['replayUrl']).resolve().as_uri()}?{urlencode(query)}"


def differences(recorded: dict, replayed: dict) -> dict:
    """Keys whose values differ, as {key: [recorded, replayed]}."""
    keys = (set(recorded) | set(replayed)) - DRIFTING
    return {
        k: [recorded.get(k), replayed.get(k)]
        for k in sorted(keys)
        if recorded.get(k) != replayed.get(k)
    }


def contact_sheet(frames: list[Path], out: Path) -> Path | None:
    """Tile the frames into one picture (needs ffmpeg; None without it)."""
    if not frames or shutil.which("ffmpeg") is None:
        return None
    rows = -(-len(frames) // REPLAY_SHEET_COLUMNS)
    pattern = frames[0].parent / "%03d.jpg"
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-framerate", "1", "-i", str(pattern),
         "-vf", f"scale={REPLAY_SHEET_WIDTH}:-1,tile={REPLAY_SHEET_COLUMNS}x{rows}", "-frames:v", "1", str(out)],
        check=True,
    )  # fmt: skip
    return out


def replay(report: dict, out: Path, last_s: float, every_ms: int) -> Replay:
    """Replay `report` in Chrome, saving frames of its last `last_s` seconds to `out`."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as e:
        raise ReplayError(
            "Playwright is missing. Run `uv sync` (it is a dev dependency)."
        ) from e

    result = Replay(report=report)
    frames_dir = out / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    for old in frames_dir.glob("*.jpg"):
        old.unlink()
    at = report["at"]
    with sync_playwright() as p:
        browser = p.chromium.launch(
            channel="chrome"
        )  # the bundled Chromium can't decode the game's audio
        page = browser.new_page(viewport=report["viewport"])
        page.on(
            "console",
            lambda m: (
                m.type == "error"
                and "barks.js" not in m.text
                and result.errors.append(m.text)
            ),
        )
        page.on("pageerror", lambda e: result.errors.append(f"uncaught: {e}"))
        page.goto(replay_url(report))
        page.wait_for_function("window.yardGame && typeof Debug !== 'undefined'")
        page.evaluate(
            "(inputs) => inputs.forEach((i) => setTimeout(() => yardGame.perform(i.intent), i.t - Debug.now()))",
            report["inputs"],
        )
        start = max(0, at - last_s * 1000)
        page.wait_for_function(
            f"Debug.now() >= {start}", timeout=at + 60_000, polling=50
        )
        while (now := page.evaluate("Debug.now()")) < at:
            frame = frames_dir / f"{len(result.frames):03d}.jpg"
            page.screenshot(path=frame, type="jpeg", quality=80)
            result.frames.append(frame)
            logger.debug("frame %s at %.1f s", frame.name, now / 1000)
            page.wait_for_timeout(every_ms)
        result.state = page.evaluate("yardGame.state()")
        trace = page.evaluate("yardGame.trace()")
        browser.close()
    result.differences = differences(report.get("state", {}), result.state)
    result.sheet = contact_sheet(result.frames, out / "sheet.jpg")
    (out / "replay.json").write_text(
        json.dumps(
            {"description": report.get("description"), "recorded": report.get("state"), "replayed": result.state,
             "differences": result.differences, "errors": result.errors, "trace": trace},
            indent=1,
        )
    )  # fmt: skip
    return result
