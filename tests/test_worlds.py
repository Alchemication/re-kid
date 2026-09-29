"""Cross-file validation and YAML round-trips."""

from __future__ import annotations

from pathlib import Path

import yaml

from schema.common import Status
from schema.world import WorldDossier
from tests.conftest import claim, minimal_dossier, minimal_sources
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

    def test_list_worlds(self, worlds_root: Path) -> None:
        assert list_worlds(worlds_root) == ["demo"]
        assert list_worlds(worlds_root / "missing") == []
