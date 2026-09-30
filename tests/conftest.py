"""Shared fixtures: a minimal valid world written to a temporary worlds dir."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
import yaml


def claim(text: str = "x", status: str = "sourced", **extra: Any) -> dict:
    """Return a claim dict; sourced claims cite 'src-a' unless overridden."""
    data: dict[str, Any] = {"text": text, "status": status}
    if status in ("sourced", "verified"):
        data["sources"] = ["src-a"]
    if status == "observed":
        data["observed_by"] = "adam"
    data.update(extra)
    return data


def minimal_dossier() -> dict:
    """Return the smallest dossier dict that validates."""
    c = claim()
    return {
        "id": "demo",
        "title": "Demo",
        "country": "PL",
        "summary": "A demo world.",
        "production": {
            "studio": c,
            "years": c,
            "episode_count": c,
            "episode_runtime": c,
            "technique": c,
            "origins": c,
        },
        "viewing_context": c,
        "premise": c,
        "episode_formula": c,
        "opening_sequence": c,
        "tone_and_mood": c,
        "humour": c,
        "aesthetics": {
            k: c
            for k in (
                "overview",
                "palette",
                "line_and_shape",
                "backgrounds",
                "character_animation",
                "pacing",
                "composition",
            )
        },
        "sound": {
            k: c
            for k in ("overview", "theme", "music_role", "sound_effects", "dialogue")
        },
        "rights": claim("unknown", status="unknown"),
    }


def episode(number: int = 1, **extra: Any) -> dict:
    """Return an episode dict that validates; id defaults to 'ep-<number>'."""
    data: dict[str, Any] = {
        "id": f"ep-{number}",
        "number": number,
        "title": f"Episode {number}",
        "year": 1972,
        "directors": ["Someone"],
        "record": claim(),
    }
    data.update(extra)
    return data


def beat(beat_id: str = "b1", start_s: float = 0, end_s: float = 1) -> dict:
    """Return a beat dict that validates, with sound left unknown."""
    return {
        "id": beat_id,
        "start_s": start_s,
        "end_s": end_s,
        "action": claim("Reksio waves.", status="observed"),
        "sound": claim("Not yet heard.", status="unknown"),
    }


def minimal_breakdown(reference: str = "ep-1") -> dict:
    """Return the smallest breakdown dict that validates."""
    return {
        "id": "intro",
        "title": "Intro",
        "reference_episode": reference,
        "overview": claim(),
        "beats": [beat()],
    }


def minimal_sources() -> dict:
    """Return a registry with one database source, 'src-a'."""
    return {
        "sources": [
            {
                "id": "src-a",
                "title": "Source A",
                "kind": "database",
                "language": "pl",
                "accessed": "2026-09-29",
            }
        ]
    }


@pytest.fixture
def worlds_root(tmp_path: Path) -> Path:
    """A worlds dir containing one valid world, 'demo'."""
    base = tmp_path / "worlds" / "demo"
    base.mkdir(parents=True)
    (base / "world.yaml").write_text(yaml.safe_dump(minimal_dossier()))
    (base / "sources.yaml").write_text(yaml.safe_dump(minimal_sources()))
    return tmp_path / "worlds"
