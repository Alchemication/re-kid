"""Instrument samples a game uses, and where each comes from.

Stored at ``worlds/<id>/games/<game>/samples.yaml``. ``main.py samples`` reads
it, downloads each file from its (public-domain) library, trims and compresses
it, measures the real pitch of pitched samples, and packs everything into the
game's ``samples.js``.

Example:
    samples = SampleSet.model_validate(yaml.safe_load(path.read_text()))
"""

from __future__ import annotations

from pydantic import Field, model_validator

from schema.common import SLUG_PATTERN, Model


class Instrument(Model):
    """One instrument: a few notes of it (or one-shot sounds, if unpitched)."""

    id: str = Field(
        pattern=SLUG_PATTERN, description="Name the game uses, e.g. 'pizz'."
    )
    library: str = Field(
        pattern=SLUG_PATTERN, description="Key into config.SAMPLE_LIBRARIES."
    )
    pitched: bool = True
    max_seconds: float = Field(
        default=2.5, gt=0, description="Longer samples are cut, with a short fade."
    )
    gain: float = Field(
        default=1.0, gt=0, description="Applied after loudness normalising."
    )
    files: list[str] = Field(
        min_length=1, description="Paths inside the library, one per note or sound."
    )

    @model_validator(mode="after")
    def _check_files(self) -> Instrument:
        """No file listed twice."""
        dupes = {f for f in self.files if self.files.count(f) > 1}
        if dupes:
            raise ValueError(f"{self.id}: files listed twice: {sorted(dupes)}")
        return self


class SampleSet(Model):
    """All samples one game uses."""

    licence: str = Field(description="What the libraries allow, in a sentence.")
    instruments: list[Instrument] = Field(min_length=1)

    @model_validator(mode="after")
    def _check_ids(self) -> SampleSet:
        """Instrument ids are unique."""
        ids = [i.id for i in self.instruments]
        dupes = {i for i in ids if ids.count(i) > 1}
        if dupes:
            raise ValueError(f"duplicate instrument ids: {sorted(dupes)}")
        return self
