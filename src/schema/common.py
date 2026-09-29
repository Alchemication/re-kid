"""Building blocks shared by every research file: sources, claims, credits.

The core rule of the project lives here: every statement about an original
work is a ``Claim`` that carries its provenance, so verified facts, things we
observed in the material, and our own interpretations never blur together.

Example:
    Claim(
        text="Produced by Studio Filmów Rysunkowych in Bielsko-Biała.",
        status=Status.VERIFIED,
        sources=["filmpolski-reksio", "sfr-reksio"],
    )
"""

from __future__ import annotations

from datetime import date
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

SLUG_PATTERN = r"^[a-z0-9]+(-[a-z0-9]+)*$"


class Model(BaseModel):
    """Base model: unknown keys are errors, so typos in YAML never pass silently."""

    model_config = ConfigDict(extra="forbid")


class Status(StrEnum):
    """How much a claim can be trusted, and why."""

    VERIFIED = "verified"
    """Primary source, or at least two independent credible sources."""
    SOURCED = "sourced"
    """One credible source."""
    OBSERVED = "observed"
    """Seen or heard in the original material; ``observed_by`` says by whom."""
    INTERPRETATION = "interpretation"
    """Our reading of the material; may cite sources it builds on."""
    UNKNOWN = "unknown"
    """Open question. ``text`` states what we do not know yet."""


PRIMARY_SOURCE_KINDS = frozenset({"studio", "archive"})
"""Source kinds that can verify a claim on their own (the makers, or the record)."""

SourceKind = Literal[
    "database",
    "encyclopedia",
    "studio",
    "archive",
    "interview",
    "book",
    "article",
    "video",
    "fan",
    "other",
]


class Source(Model):
    """One place a claim can point to. Registered once per world in sources.yaml."""

    id: str = Field(pattern=SLUG_PATTERN)
    title: str
    url: str | None = None
    kind: SourceKind
    language: str = Field(description="ISO 639-1 code, e.g. 'pl'.")
    publisher: str | None = None
    accessed: date
    notes: str | None = Field(
        default=None,
        description="Reliability caveats, what the source covers, what it lacks.",
    )


class Claim(Model):
    """A statement about the original work plus its provenance. Prose is fine."""

    text: str
    status: Status
    sources: list[str] = Field(default_factory=list)
    observed_by: str | None = None

    @model_validator(mode="after")
    def _check_provenance(self) -> Claim:
        """Enforce the minimum evidence each status needs."""
        if self.status in (Status.VERIFIED, Status.SOURCED) and not self.sources:
            raise ValueError(f"a {self.status} claim needs at least one source")
        # "Two sources or one primary" needs the source registry, so that half
        # of the VERIFIED rule is checked in worlds.validate_world.
        if self.status == Status.OBSERVED and not self.observed_by:
            raise ValueError("an observed claim needs observed_by")
        return self


class Credit(Model):
    """A person (or group) and what they did on the work."""

    name: str
    role: str = Field(description="e.g. 'creator', 'director', 'composer'.")
    claim: Claim
