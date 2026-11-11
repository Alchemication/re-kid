"""The site's pages (`site/`), in a browser: the front page opens on Little
Kino's worlds, each card painted, under the old-print look and alive, with no
error, so a game's part that changes (the meadow's painting once needed its
oak) can't leave a card half drawn without a test failing; the grown-ups'
page shows Reksio answering a tap. What the build fills in and refuses is in
test_site.py."""

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
            assert page.text_content("h1") == "Little Kino"
            assert page.evaluate(
                "document.fonts.ready.then(() => document.fonts.check('900 20px Fraunces'))"
            ), "the lettering's typeface didn't load"
            assert page.evaluate(
                "document.documentElement.scrollHeight <= innerHeight"
            ), "the front page must never scroll"
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

    def test_the_meadow_card_paints_whatever_its_season(self, browser: object) -> None:
        """The card loads no autumn.js: an autumn draw (half its loads) still paints it, as spring."""
        page = browser.new_page(viewport={"width": 844, "height": 390})
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        try:
            page.goto((SITE / "krtek.html").as_uri() + "?season=autumn")
            page.wait_for_function(
                "document.documentElement.style.visibility === 'visible'", timeout=5000
            )
            assert page.evaluate(
                "document.getElementById('front-ground').querySelector('image') !== null"
            )
            assert errors == []
        finally:
            page.close()


class TestGrownUps:
    def test_a_tap_on_the_set_and_reksio_answers(self, browser: object) -> None:
        """Read from disk, as written (its {{…}} facts are the build's): the set
        shows him alive, a tap cheers him and the page says he heard, on a
        phone held upright with nothing to scroll sideways."""
        page = browser.new_page(viewport={"width": 390, "height": 844})
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: m.type == "error" and errors.append(m.text))
        try:
            page.goto((SITE / "grown-ups.html").as_uri())
            card = next(f for f in page.frames if f != page.main_frame)
            card.wait_for_function(
                "document.documentElement.style.visibility === 'visible'", timeout=5000
            )
            assert page.text_content("#heard") == ""
            page.click("#tap")
            assert page.text_content("#heard") == "He heard you."
            assert card.evaluate("document.getElementById('fig').childElementCount") > 0
            assert page.evaluate(
                "document.documentElement.scrollWidth <= innerWidth"
            ), "the page scrolls sideways on a phone"
            assert errors == []
        finally:
            page.close()
