"""Game brief: origins need their basis, and every reference must exist."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml
from pydantic import ValidationError

from schema.brief import Element, GameBrief
from tests.conftest import claim, episode, minimal_breakdown
from worlds import validate_world


def _el(origin: str = "invented", refs: list[str] | None = None) -> dict:
    return {"text": "x", "origin": origin, "refs": refs or []}


def _scene(scene_id: str = "s1", **extra: object) -> dict:
    data = {"id": scene_id, "action": _el(), "result": _el(), "sound": _el()}
    data.update(extra)
    return data


def minimal_brief(**extra: object) -> dict:
    data = {
        "id": "intro",
        "title": "Demo",
        "audience": "A child and a parent.",
        "length": "3 minutes",
        "pitch": _el(),
        "principles": [_el()],
        "controls": _el(),
        "look": [_el()],
        "sound": [_el()],
        "scenes": [_scene()],
        "ending": _el(),
        "parent_card": _el(),
    }
    data.update(extra)
    return data


class TestElement:
    def test_invented_needs_no_refs(self) -> None:
        Element.model_validate(_el())

    @pytest.mark.parametrize("origin", ["original", "inspired"])
    def test_original_and_inspired_need_refs(self, origin: str) -> None:
        with pytest.raises(ValidationError, match="needs refs"):
            Element.model_validate(_el(origin))

    def test_bad_ref_format(self) -> None:
        with pytest.raises(ValidationError, match="bad ref 'cymbals'"):
            Element.model_validate(_el("inspired", ["cymbals"]))

    def test_unknown_origin(self) -> None:
        with pytest.raises(ValidationError):
            Element.model_validate(_el("borrowed", ["intro:a"]))


class TestGameBrief:
    def test_minimal_is_valid(self) -> None:
        GameBrief.model_validate(minimal_brief())

    def test_duplicate_scene_ids(self) -> None:
        data = minimal_brief(scenes=[_scene("a"), _scene("a")])
        with pytest.raises(ValidationError, match="duplicate scene ids"):
            GameBrief.model_validate(data)

    def test_needs_a_scene(self) -> None:
        with pytest.raises(ValidationError, match="scenes"):
            GameBrief.model_validate(minimal_brief(scenes=[]))

    def test_elements_lists_every_part(self) -> None:
        data = minimal_brief(scenes=[_scene("a", easter_egg=_el())])
        paths = [p for p, _ in GameBrief.model_validate(data).elements()]
        assert "scenes[a].easter_egg" in paths
        assert {"pitch", "controls", "ending", "parent_card"} <= set(paths)


class TestValidateBrief:
    def _write(self, root: Path, brief: dict) -> None:
        base = root / "demo"
        intro = minimal_breakdown() | {
            "marks": [
                {
                    "id": "bark",
                    "name": "bark",
                    "kind": "effect",
                    "start_s": 0,
                    "end_s": 0.5,
                    "claim": claim("Barks.", status="observed"),
                }
            ]
        }
        (base / "intro.yaml").write_text(yaml.safe_dump(intro))
        (base / "episodes").mkdir(exist_ok=True)
        (base / "episodes" / "index.yaml").write_text(
            yaml.safe_dump({"episodes": [episode()]})
        )
        (base / "games" / "intro").mkdir(parents=True, exist_ok=True)
        (base / "games" / "intro" / "brief.yaml").write_text(yaml.safe_dump(brief))

    def test_valid_refs(self, worlds_root: Path) -> None:
        refs = ["intro:b1", "mark:bark", "world:premise", "world:aesthetics.palette"]
        brief = minimal_brief(
            pitch=_el("inspired", refs), scenes=[_scene("s1", moment="b1")]
        )
        self._write(worlds_root, brief)
        report = validate_world("demo", worlds_root)
        assert report.errors == []
        assert set(report.briefs) == {"intro"}

    @pytest.mark.parametrize(
        "ref", ["intro:nope", "mark:nope", "world:nope", "world:aesthetics.nope"]
    )
    def test_unknown_ref(self, worlds_root: Path, ref: str) -> None:
        self._write(worlds_root, minimal_brief(pitch=_el("inspired", [ref])))
        errors = validate_world("demo", worlds_root).errors
        assert any(f"pitch: '{ref}' not found" in e for e in errors)

    def test_id_must_match_folder(self, worlds_root: Path) -> None:
        self._write(worlds_root, minimal_brief(id="other"))
        errors = validate_world("demo", worlds_root).errors
        assert any("id 'other' differs from its folder 'intro'" in e for e in errors)

    def test_parked_status_allowed(self) -> None:
        GameBrief.model_validate(minimal_brief(status="parked"))

    def test_unknown_scene_moment(self, worlds_root: Path) -> None:
        self._write(worlds_root, minimal_brief(scenes=[_scene("s1", moment="nope")]))
        errors = validate_world("demo", worlds_root).errors
        assert any("scenes[s1]: moment 'nope'" in e for e in errors)
