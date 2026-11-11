"""The public site's build (`src/website.py`): pages are filled from what owns
each fact, and nothing unfit goes out — an unfilled token, a creator the
research doesn't stand behind, a request to another site, a seventh world."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
import yaml

import website
from config import SITE_DIR, SITE_MAX_WORLDS, SITE_NAME, SITE_WORLDS, WORLDS_DIR
from website import SiteError, build, check_front_page, check_page, fill


@pytest.fixture(scope="module")
def built(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """The real site, built once."""
    out = tmp_path_factory.mktemp("site")
    build(out)
    return out


class TestBuild:
    def test_every_page_is_filled_and_named(self, built: Path) -> None:
        pages = sorted(p.name for p in built.glob("*.html"))
        assert {"index.html", "grown-ups.html", "research.html"} <= set(pages)
        for name in pages:
            page = (built / name).read_text()
            assert not re.search(r"\{\{[A-Za-z_.]+\}\}", page), name
        for name in ("index.html", "grown-ups.html", "research.html"):
            assert SITE_NAME in (built / name).read_text()

    def test_each_world_has_its_card_and_its_game(self, built: Path) -> None:
        for world, game in SITE_WORLDS.items():
            assert (built / f"{world}.html").is_file()
            assert (built / world / game / "index.html").is_file()

    def test_the_facts_come_from_the_code_and_the_dossiers(self, built: Path) -> None:
        page = (built / "grown-ups.html").read_text()
        day = (WORLDS_DIR / "reksio/games/yard/game/day.js").read_text()
        minutes = int(re.search(r"const LENGTH_S = (\d+)", day).group(1)) // 60
        assert f"about {minutes} minutes" in page
        dossier = yaml.safe_load((WORLDS_DIR / "krtek/world.yaml").read_text())
        made = dossier["production"]
        assert f"{made['first_year']}–{made['last_year']}" in page
        assert made["credits"][0]["name"] in page

    def test_the_research_page_is_the_design_principles(self, built: Path) -> None:
        page = (built / "research.html").read_text()
        assert "<h1>Design principles</h1>" in page
        assert "Is a few minutes a day fine for a toddler?" in page

    def test_only_what_is_meant_to_go_out_goes_out(self, built: Path) -> None:
        assert not (built / "art").exists()
        assert (built / ".nojekyll").is_file()
        assert not list(built.rglob("*.yaml"))

    def test_the_manifest_and_pages_point_at_pictures_that_exist(
        self, built: Path
    ) -> None:
        manifest = json.loads((built / "manifest.webmanifest").read_text())
        assert manifest["name"] == SITE_NAME
        for icon in manifest["icons"]:
            assert (built / icon["src"]).is_file()
        for name in ("index.html", "grown-ups.html", "research.html"):
            page = (built / name).read_text()
            for ref in re.findall(r'(?:href|src)="(assets/[^"]+)"', page):
                assert (built / ref).is_file(), f"{name}: {ref}"
        assert (built / "assets/og-image.png").is_file()

    def test_a_rebuild_replaces_the_last_one(self, tmp_path: Path) -> None:
        out = tmp_path / "out"
        build(out)
        (out / "stale.html").write_text("old")
        build(out)
        assert not (out / "stale.html").exists()

    def test_it_never_empties_a_folder_that_is_not_a_build(
        self, tmp_path: Path
    ) -> None:
        (tmp_path / "keep.txt").write_text("mine")
        with pytest.raises(SiteError, match="aren't an earlier build"):
            build(tmp_path)
        assert (tmp_path / "keep.txt").read_text() == "mine"


class TestFill:
    def test_fills_what_it_knows(self) -> None:
        assert fill("a {{X}} b {{w.title}}", {"X": "1", "w.title": "T"}, "p") == (
            "a 1 b T"
        )

    def test_an_unknown_token_stops_the_build(self) -> None:
        with pytest.raises(SiteError, match=r"\{\{NOPE\}\}"):
            fill("{{NOPE}}", {}, "page.html")

    def test_a_comment_about_tokens_is_left_alone(self) -> None:
        assert fill("the {{…}} places", {}, "p") == "the {{…}} places"


class TestFacts:
    def test_a_moved_constant_stops_the_build(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        script = tmp_path / "w/game.js"
        script.parent.mkdir()
        script.write_text("const OTHER = 3")
        monkeypatch.setattr(
            website, "SITE_FACTS", {"N": ("w/game.js", r"const N = (\d+)", 1)}
        )
        with pytest.raises(SiteError, match="SITE_FACTS"):
            website.code_facts(tmp_path)

    def test_a_number_is_written_as_a_person_would(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        (tmp_path / "g.js").write_text("const A = 300\nconst B = 2500")
        monkeypatch.setattr(
            website,
            "SITE_FACTS",
            {"A": ("g.js", r"const A = (\d+)", 60), "B": ("g.js", r"B = (\d+)", 1000)},
        )
        assert website.code_facts(tmp_path) == {"A": "5", "B": "2.5"}

    def _world(self, tmp_path: Path, change: object) -> Path:
        """A copy of Reksio's dossier, changed, in a worlds folder of its own."""
        data = yaml.safe_load((WORLDS_DIR / "reksio/world.yaml").read_text())
        change(data)
        (tmp_path / "reksio").mkdir()
        (tmp_path / "reksio/world.yaml").write_text(
            yaml.safe_dump(data, allow_unicode=True)
        )
        return tmp_path

    def test_a_creator_the_research_does_not_stand_behind_is_refused(
        self, tmp_path: Path
    ) -> None:
        def unsure(data: dict) -> None:
            claim = data["production"]["credits"][0]["claim"]
            claim["status"] = "interpretation"

        with pytest.raises(SiteError, match="verified or sourced"):
            website.world_facts("reksio", self._world(tmp_path, unsure))

    def test_missing_years_are_refused(self, tmp_path: Path) -> None:
        def no_years(data: dict) -> None:
            del data["production"]["first_year"]

        with pytest.raises(SiteError, match="first_year"):
            website.world_facts("reksio", self._world(tmp_path, no_years))

    def test_an_unworded_country_is_refused(self, tmp_path: Path) -> None:
        def elsewhere(data: dict) -> None:
            data["country"] = "HU"

        with pytest.raises(SiteError, match="SITE_COUNTRIES"):
            website.world_facts("reksio", self._world(tmp_path, elsewhere))


class TestChecks:
    def test_a_page_must_carry_the_name(self) -> None:
        with pytest.raises(SiteError, match="<title>"):
            check_page("<title>Something else</title>", "p.html")

    @pytest.mark.parametrize(
        "tag",
        [
            '<script src="https://cdn.example/x.js"></script>',
            '<link rel="stylesheet" href="//fonts.example/css">',
            '<img src="http://example.com/a.png">',
        ],
    )
    def test_a_page_asking_another_site_for_something_is_refused(
        self, tag: str
    ) -> None:
        with pytest.raises(SiteError, match="another site"):
            check_page(f"<title>{SITE_NAME}</title>{tag}", "p.html")

    def test_a_link_out_is_fine(self) -> None:
        check_page(f'<title>{SITE_NAME}</title><a href="https://x.org">x</a>', "p")

    def _site(self, tmp_path: Path, cards: int) -> Path:
        card = '<div class="card"><iframe src="reksio.html"></iframe></div>'
        front = card * cards + "reksio/yard/ " + 'src="krtek.html" krtek/meadow/'
        (tmp_path / "index.html").write_text(front)
        for world in SITE_WORLDS:
            (tmp_path / f"{world}.html").write_text("")
        return tmp_path

    def test_the_real_front_page_passes(self) -> None:
        check_front_page(SITE_DIR)

    def test_one_world_too_many_is_refused(self, tmp_path: Path) -> None:
        with pytest.raises(SiteError, match="one\\s+screen"):
            check_front_page(self._site(tmp_path, SITE_MAX_WORLDS + 1))

    def test_a_world_without_a_card_is_refused(self, tmp_path: Path) -> None:
        site = self._site(tmp_path, 2)
        (site / "krtek.html").unlink()
        with pytest.raises(SiteError, match="no card page"):
            check_front_page(site)
