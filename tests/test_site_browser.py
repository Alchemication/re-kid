"""The site's front page (`site/`): it opens on Re-Kid's worlds, each card
painted, under the old-print look and alive, with no error, so a game's part
that changes (the meadow's painting once needed its oak) can't leave a card
half drawn without a test failing."""

from __future__ import annotations

from pathlib import Path

import pytest

pytestmark = pytest.mark.browser

SITE = Path(__file__).resolve().parent.parent / "site"


class TestFrontPage:
    def test_opens_with_both_worlds_painted_and_alive(self, browser: object) -> None:
        page = browser.new_page(viewport={"width": 844, "height": 390})
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: m.type == "error" and errors.append(m.text))
        try:
            page.goto((SITE / "index.html").as_uri())
            assert page.text_content("h1") == "Re-Kid"
            page.wait_for_function(
                "[...document.querySelectorAll('.card')].every(c => c.classList.contains('ready'))",
                timeout=3500,  # before index.html's own fallback shows them anyway
            )
            frames = {
                f.url.rsplit("/", 1)[-1]: f for f in page.frames if f != page.main_frame
            }
            for card in ("reksio.html", "krtek.html"):
                f = frames[card]
                assert (
                    f.evaluate("document.documentElement.style.visibility") == "visible"
                )
                assert f.evaluate("!!document.querySelector('body > div')"), (
                    f"{card}: no old-print look"
                )
            assert (
                frames["reksio.html"].evaluate(
                    "document.getElementById('fig').childElementCount"
                )
                > 0
            )
            assert (
                frames["krtek.html"].evaluate(
                    "document.getElementById('mole-fig').childElementCount"
                )
                > 0
            )
            assert frames["krtek.html"].evaluate(
                "document.getElementById('front-ground').querySelector('image') !== null"
            )
            assert errors == []
        finally:
            page.close()
