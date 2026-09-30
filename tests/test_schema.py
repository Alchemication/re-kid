"""Schema rules that would otherwise let bad provenance through silently."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from schema.breakdown import Breakdown
from schema.common import Claim, Status
from schema.episode import EpisodeCatalogue
from schema.world import SourceRegistry, WorldDossier
from tests.conftest import (
    beat,
    claim,
    episode,
    minimal_breakdown,
    minimal_dossier,
    minimal_sources,
)


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


class TestEpisodeCatalogue:
    def test_valid(self) -> None:
        EpisodeCatalogue.model_validate({"episodes": [episode(1), episode(2)]})

    def test_duplicate_ids_rejected(self) -> None:
        data = {"episodes": [episode(1), episode(2, id="ep-1")]}
        with pytest.raises(ValidationError, match="duplicate episode ids"):
            EpisodeCatalogue.model_validate(data)

    def test_gap_in_numbers_rejected(self) -> None:
        data = {"episodes": [episode(1), episode(3)]}
        with pytest.raises(ValidationError, match="expected 2"):
            EpisodeCatalogue.model_validate(data)

    def test_out_of_order_rejected(self) -> None:
        data = {"episodes": [episode(2), episode(1)]}
        with pytest.raises(ValidationError, match="list order"):
            EpisodeCatalogue.model_validate(data)

    def test_needs_a_director(self) -> None:
        with pytest.raises(ValidationError, match="directors"):
            EpisodeCatalogue.model_validate({"episodes": [episode(directors=[])]})

    def test_watch_url_must_be_https(self) -> None:
        data = {"episodes": [episode(watch_url="youtube.com/watch?v=x")]}
        with pytest.raises(ValidationError, match="watch_url"):
            EpisodeCatalogue.model_validate(data)

    def test_record_provenance_enforced(self) -> None:
        data = {"episodes": [episode(record={"text": "x", "status": "verified"})]}
        with pytest.raises(ValidationError, match="at least one source"):
            EpisodeCatalogue.model_validate(data)


class TestBreakdown:
    def test_minimal_is_valid(self) -> None:
        Breakdown.model_validate(minimal_breakdown())

    def test_needs_a_beat(self) -> None:
        data = minimal_breakdown() | {"beats": []}
        with pytest.raises(ValidationError, match="beats"):
            Breakdown.model_validate(data)

    def test_beat_must_end_after_start(self) -> None:
        data = minimal_breakdown() | {"beats": [beat(start_s=2, end_s=2)]}
        with pytest.raises(ValidationError, match="end_s must be after"):
            Breakdown.model_validate(data)

    def test_beats_in_time_order(self) -> None:
        beats = [beat("late", 5, 6), beat("early", 1, 2)]
        with pytest.raises(ValidationError, match="time order"):
            Breakdown.model_validate(minimal_breakdown() | {"beats": beats})

    def test_overlapping_beats_allowed(self) -> None:
        # Crossfades between credit cards make neighbouring beats overlap.
        beats = [beat("a", 0, 5), beat("b", 4.5, 8)]
        Breakdown.model_validate(minimal_breakdown() | {"beats": beats})

    def test_duplicate_beat_ids_rejected(self) -> None:
        beats = [beat("a", 0, 1), beat("a", 1, 2)]
        with pytest.raises(ValidationError, match="duplicate beat ids"):
            Breakdown.model_validate(minimal_breakdown() | {"beats": beats})

    def test_sound_is_required(self) -> None:
        data = minimal_breakdown()
        del data["beats"][0]["sound"]
        with pytest.raises(ValidationError, match="sound"):
            Breakdown.model_validate(data)


class TestSourceRegistry:
    def test_duplicate_ids_rejected(self) -> None:
        data = minimal_sources()
        data["sources"].append(data["sources"][0])
        with pytest.raises(ValidationError, match="duplicate source ids"):
            SourceRegistry.model_validate(data)
