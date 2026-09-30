"""Beat-by-beat breakdowns of a stretch of the original: an episode or the intro.

A breakdown is timed against one official upload (``reference_episode``, an id
from the episode catalogue), so anyone can scrub to a beat and check it. Each
beat says what is seen, what text is on screen, and what is heard, as separate
claims: frames can be read by Claude, but sound needs a person's ears, so the
two usually carry different statuses.

Example:
    intro = Breakdown.model_validate(yaml.safe_load(path.read_text()))
"""

from __future__ import annotations

from pydantic import Field, model_validator

from schema.common import SLUG_PATTERN, Claim, Model


class Beat(Model):
    """One small unit of action, a few seconds long."""

    id: str = Field(pattern=SLUG_PATTERN)
    start_s: float = Field(ge=0, description="Seconds into the reference upload.")
    end_s: float = Field(gt=0, description="Seconds into the reference upload.")
    action: Claim = Field(description="What happens on screen.")
    on_screen_text: Claim | None = Field(
        default=None, description="Credits, titles, signs — and what they mean."
    )
    sound: Claim = Field(description="What is heard. Needs ears, or a source.")
    notes: list[Claim] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_times(self) -> Beat:
        """A beat must end after it starts."""
        if self.end_s <= self.start_s:
            raise ValueError(f"{self.id}: end_s must be after start_s")
        return self


class Breakdown(Model):
    """A timed dissection of one stretch of the original."""

    id: str = Field(pattern=SLUG_PATTERN)
    title: str
    reference_episode: str = Field(
        pattern=SLUG_PATTERN,
        description="Catalogue id of the upload the times refer to.",
    )
    overview: Claim
    variation: Claim | None = Field(
        default=None,
        description="How this stretch differs between episodes, if it recurs.",
    )
    beats: list[Beat] = Field(min_length=1)
    open_questions: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_beats(self) -> Breakdown:
        """Unique beat ids, and beats listed in the order they start."""
        ids = [b.id for b in self.beats]
        dupes = {i for i in ids if ids.count(i) > 1}
        if dupes:
            raise ValueError(f"duplicate beat ids: {sorted(dupes)}")
        for prev, beat in zip(self.beats, self.beats[1:], strict=False):
            if beat.start_s < prev.start_s:
                raise ValueError(
                    f"{beat.id} starts before {prev.id} — list beats in time order"
                )
        return self
