"""Cross-file validation and YAML round-trips."""

from __future__ import annotations

from pathlib import Path

import yaml

from schema.common import Status
from schema.episode import EpisodeCatalogue
from schema.world import WorldDossier
from tests.conftest import (
    claim,
    episode,
    minimal_breakdown,
    minimal_dossier,
    minimal_sources,
)
from worlds import dump_model, iter_claims, list_worlds, load_model, validate_world


def _write(root: Path, dossier: dict, sources: dict) -> None:
    base = root / "demo"
    (base / "world.yaml").write_text(yaml.safe_dump(dossier))
    (base / "sources.yaml").write_text(yaml.safe_dump(sources))


class TestValidateWorld:
    def test_valid_world(self, worlds_root: Path) -> None:
        report = validate_world("demo", worlds_root)
        assert report.errors == []
        assert report.warnings == []
        assert report.status_counts[Status.UNKNOWN] == 1

    def test_missing_files(self, tmp_path: Path) -> None:
        (tmp_path / "empty").mkdir()
        report = validate_world("empty", tmp_path)
        assert len(report.errors) == 2
        assert all("missing" in e for e in report.errors)

    def test_unknown_source(self, worlds_root: Path) -> None:
        dossier = minimal_dossier()
        dossier["premise"] = claim(sources=["nope"])
        _write(worlds_root, dossier, minimal_sources())
        report = validate_world("demo", worlds_root)
        assert any("premise" in e and "'nope'" in e for e in report.errors)

    def test_verified_on_one_non_primary_source(self, worlds_root: Path) -> None:
        dossier = minimal_dossier()
        dossier["premise"] = claim(status="verified")
        _write(worlds_root, dossier, minimal_sources())
        report = validate_world("demo", worlds_root)
        assert any("one non-primary source" in e for e in report.errors)

    def test_verified_on_one_primary_source(self, worlds_root: Path) -> None:
        dossier = minimal_dossier()
        dossier["premise"] = claim(status="verified")
        sources = minimal_sources()
        sources["sources"][0]["kind"] = "studio"
        _write(worlds_root, dossier, sources)
        assert validate_world("demo", worlds_root).errors == []

    def test_unused_source_warns(self, worlds_root: Path) -> None:
        sources = minimal_sources()
        sources["sources"].append({**sources["sources"][0], "id": "src-b"})
        _write(worlds_root, minimal_dossier(), sources)
        report = validate_world("demo", worlds_root)
        assert report.errors == []
        assert report.warnings == ["sources.yaml: 'src-b' is never cited"]

    def test_invalid_yaml_reported(self, worlds_root: Path) -> None:
        (worlds_root / "demo" / "world.yaml").write_text("a: [unclosed")
        report = validate_world("demo", worlds_root)
        assert any("not valid YAML" in e for e in report.errors)


class TestValidateCatalogue:
    def _write_catalogue(self, root: Path, catalogue: dict) -> None:
        path = root / "demo" / "episodes" / "index.yaml"
        path.parent.mkdir(exist_ok=True)
        path.write_text(yaml.safe_dump(catalogue))

    def test_catalogue_is_optional(self, worlds_root: Path) -> None:
        report = validate_world("demo", worlds_root)
        assert report.errors == []
        assert report.catalogue is None

    def test_catalogue_claims_counted(self, worlds_root: Path) -> None:
        before = validate_world("demo", worlds_root).status_counts[Status.SOURCED]
        self._write_catalogue(worlds_root, {"episodes": [episode()]})
        report = validate_world("demo", worlds_root)
        assert report.errors == []
        assert report.catalogue is not None
        assert report.status_counts[Status.SOURCED] == before + 1

    def test_unknown_source_in_catalogue(self, worlds_root: Path) -> None:
        bad = episode(synopsis=claim(sources=["nope"]))
        self._write_catalogue(worlds_root, {"episodes": [bad]})
        report = validate_world("demo", worlds_root)
        expected = (
            "episodes/index.yaml: episodes[ep-1].synopsis: cites unknown source "
            "'nope' — add it to sources.yaml"
        )
        assert report.errors == [expected]

    def test_verified_rule_applies_to_catalogue(self, worlds_root: Path) -> None:
        bad = episode(record=claim(status="verified"))
        self._write_catalogue(worlds_root, {"episodes": [bad]})
        report = validate_world("demo", worlds_root)
        assert any(
            "episodes[ep-1].record" in e and "one non-primary" in e
            for e in report.errors
        )

    def test_year_outside_production_years(self, worlds_root: Path) -> None:
        dossier = minimal_dossier()
        dossier["production"] |= {"first_year": 1967, "last_year": 1990}
        _write(worlds_root, dossier, minimal_sources())
        eps = [episode(1, year=1967), episode(2, year=1990), episode(3, year=1991)]
        self._write_catalogue(worlds_root, {"episodes": eps})
        report = validate_world("demo", worlds_root)
        assert len(report.errors) == 1
        assert "episodes[ep-3]: year 1991 is outside" in report.errors[0]

    def test_invalid_catalogue_skips_unused_warnings(self, worlds_root: Path) -> None:
        sources = minimal_sources()
        sources["sources"].append({**sources["sources"][0], "id": "src-b"})
        _write(worlds_root, minimal_dossier(), sources)
        self._write_catalogue(worlds_root, {"episodes": [episode(2)]})
        report = validate_world("demo", worlds_root)
        assert any("expected 1" in e for e in report.errors)
        assert report.warnings == []


class TestValidateIntro:
    def _write(self, root: Path, intro: dict, catalogue: dict | None) -> None:
        base = root / "demo"
        (base / "intro.yaml").write_text(yaml.safe_dump(intro))
        if catalogue is not None:
            (base / "episodes").mkdir(exist_ok=True)
            (base / "episodes" / "index.yaml").write_text(yaml.safe_dump(catalogue))

    def test_valid_intro(self, worlds_root: Path) -> None:
        self._write(worlds_root, minimal_breakdown(), {"episodes": [episode()]})
        report = validate_world("demo", worlds_root)
        assert report.errors == []
        assert report.intro is not None

    def test_intro_claims_prefixed(self, worlds_root: Path) -> None:
        self._write(worlds_root, minimal_breakdown(), {"episodes": [episode()]})
        report = validate_world("demo", worlds_root)
        paths = [p for f, p, _ in report.iter_all_claims() if f == "intro.yaml"]
        assert "intro.overview" in paths
        assert "intro.beats[b1].sound" in paths

    def test_unknown_reference_episode(self, worlds_root: Path) -> None:
        intro = minimal_breakdown(reference="nope")
        self._write(worlds_root, intro, {"episodes": [episode()]})
        report = validate_world("demo", worlds_root)
        assert any("'nope' is not in episodes/index.yaml" in e for e in report.errors)

    def test_reference_needs_catalogue(self, worlds_root: Path) -> None:
        self._write(worlds_root, minimal_breakdown(), None)
        report = validate_world("demo", worlds_root)
        assert any("needs a valid episodes/index.yaml" in e for e in report.errors)

    def test_invalid_intro_skips_unused_warnings(self, worlds_root: Path) -> None:
        sources = minimal_sources()
        sources["sources"].append({**sources["sources"][0], "id": "src-b"})
        _write(worlds_root, minimal_dossier(), sources)
        self._write(worlds_root, {"id": "intro"}, {"episodes": [episode()]})
        report = validate_world("demo", worlds_root)
        assert any(e.startswith("intro.yaml:") for e in report.errors)
        assert report.warnings == []


class TestIterClaims:
    def test_paths_use_ids_for_lists(self) -> None:
        dossier = minimal_dossier()
        dossier["places"] = [{"id": "garden", "name": "Garden", "description": claim()}]
        paths = [p for p, _ in iter_claims(WorldDossier.model_validate(dossier))]
        assert "places[garden].description" in paths
        assert "production.studio" in paths


class TestRoundTrip:
    def test_dump_then_load_is_identical(self, tmp_path: Path) -> None:
        dossier = minimal_dossier()
        dossier["title"] = "Przygody kota Filemona"
        dossier["premise"] = claim("line one\nline two — ąęłóśżź")
        model = WorldDossier.model_validate(dossier)
        path = tmp_path / "world.yaml"
        dump_model(model, path)
        assert load_model(path, WorldDossier) == model
        text = path.read_text(encoding="utf-8")
        assert "ąęłóśżź" in text
        assert "text: |" in text

    def test_catalogue_round_trip(self, tmp_path: Path) -> None:
        data = {
            "notes": [claim("Counted two ways.")],
            "episodes": [
                episode(
                    title="Reksio i nośna kura",
                    runtime_min=8,
                    watch_url="https://www.youtube.com/watch?v=x",
                    synopsis=claim("Kura gubi jajka."),
                )
            ],
        }
        model = EpisodeCatalogue.model_validate(data)
        path = tmp_path / "episodes" / "index.yaml"
        dump_model(model, path)
        assert load_model(path, EpisodeCatalogue) == model
        assert "nośna" in path.read_text(encoding="utf-8")

    def test_list_worlds(self, worlds_root: Path) -> None:
        assert list_worlds(worlds_root) == ["demo"]
        assert list_worlds(worlds_root / "missing") == []
