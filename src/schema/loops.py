"""Loop choices for a game: which stretch of the original audio loops under each beat.

Stored at ``worlds/<id>/games/<game>/loops.yaml``. This is a production decision,
not research: it says what the game will play, not what the original sounds
like, so it holds plain values rather than claims. What the listener heard goes
into the breakdown's ``sound`` claims instead. ``main.py listen`` writes it.

Example:
    loops = LoopSet.model_validate(yaml.safe_load(path.read_text()))
"""

from __future__ import annotations

from pydantic import Field, model_validator

from schema.common import SLUG_PATTERN, Model


class LoopChoice(Model):
    """The loop for one breakdown beat, in seconds of the source clip."""

    beat_id: str = Field(pattern=SLUG_PATTERN, description="Id of a breakdown beat.")
    start_s: float = Field(ge=0)
    end_s: float = Field(gt=0)
    beats: int = Field(ge=1, description="Detected beats the loop spans.")
    approved: bool = Field(
        default=False, description="True once a person has heard it loop cleanly."
    )

    @model_validator(mode="after")
    def _check_times(self) -> LoopChoice:
        """A loop must end after it starts."""
        if self.end_s <= self.start_s:
            raise ValueError(f"{self.beat_id}: end_s must be after start_s")
        return self


class LoopSet(Model):
    """All loop choices for one game, cut from one source clip."""

    breakdown: str = Field(
        pattern=SLUG_PATTERN, description="Id of the breakdown the beats belong to."
    )
    source: str = Field(
        description="Path of the clip the times refer to, relative to the repo."
    )
    loops: list[LoopChoice] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_unique(self) -> LoopSet:
        """One loop per beat."""
        ids = [loop.beat_id for loop in self.loops]
        dupes = {i for i in ids if ids.count(i) > 1}
        if dupes:
            raise ValueError(f"more than one loop for beats: {sorted(dupes)}")
        return self
