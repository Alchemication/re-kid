"""Schema rules that would otherwise let bad provenance through silently."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from schema.common import Claim, Status
from schema.world import SourceRegistry, WorldDossier
from tests.conftest import claim, minimal_dossier, minimal_sources


class TestClaim:
    def test_sourced_needs_source(self) -> None:
        with pytest.raises(ValidationError, match="at least one source"):
            Claim(text="x", status=Status.SOURCED)

    def test_verified_needs_source(self) -> None:
        with pytest.raises(ValidationError, match="at least one source"):
            Claim(text="x", status=Status.VERIFIED)

    def test_observed_needs_observer(self) -> None:
        with pytest.raises(ValidationError, match="observed_by"):
            Claim(text="x", status=Status.OBSERVED)

    def test_interpretation_and_unknown_need_nothing(self) -> None:
        Claim(text="x", status=Status.INTERPRETATION)
        Claim(text="x", status=Status.UNKNOWN)

    def test_unknown_field_rejected(self) -> None:
        with pytest.raises(ValidationError):
            Claim.model_validate({"text": "x", "status": "unknown", "source": "a"})


class TestWorldDossier:
    def test_minimal_is_valid(self) -> None:
        WorldDossier.model_validate(minimal_dossier())

    def test_design_notes_must_be_interpretation(self) -> None:
        data = minimal_dossier()
        data["design_notes"] = [claim(status="sourced")]
        with pytest.raises(ValidationError, match="interpretation"):
            WorldDossier.model_validate(data)

    def test_relationship_target_must_exist(self) -> None:
        data = minimal_dossier()
        c = claim()
        data["characters"] = [
            {
                "id": "reksio",
                "name": "Reksio",
                "kind": "dog",
                "role": "protagonist",
                "description": c,
                "personality": c,
                "visual_signature": c,
                "relationships": [{"to": "nobody", "claim": c}],
            }
        ]
        with pytest.raises(ValidationError, match="unknown character 'nobody'"):
            WorldDossier.model_validate(data)

    def test_bad_slug_rejected(self) -> None:
        data = minimal_dossier()
        data["id"] = "Demo World"
        with pytest.raises(ValidationError):
            WorldDossier.model_validate(data)


class TestSourceRegistry:
    def test_duplicate_ids_rejected(self) -> None:
        data = minimal_sources()
        data["sources"].append(data["sources"][0])
        with pytest.raises(ValidationError, match="duplicate source ids"):
            SourceRegistry.model_validate(data)
