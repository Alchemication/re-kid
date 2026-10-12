"""Recorded sound effects a game uses: the takes picked by ear for each sound.

Stored at ``worlds/<id>/games/<game>/effects.yaml``, with the takes themselves
in the game's ``effects/`` folder, as they were made. ``main.py effects``
trims, levels and roughens them (the retro recipe, ``config.EFFECT_*``) and
packs them into the game's ``effects.js``; the game plays one of a sound's
takes at random each time, in place of its synthesised sound.

Example:
    effects = EffectSet.model_validate(yaml.safe_load(path.read_text()))
"""

from __future__ import annotations

from pydantic import Field, model_validator

from schema.common import Model

SOUND_ID_PATTERN = r"^[a-z][a-zA-Z]*$"
"""The name of the sound in sound.js (``Sound.<id>``): camelCase, as there."""


class Take(Model):
    """One take of a sound, as it was made."""

    file: str = Field(description="Path inside the game's effects/ folder.")
    prompt: str = Field(description="What it was made from (the wording asked for).")


class Effect(Model):
    """One of the game's sounds, and the takes it plays from."""

    id: str = Field(
        pattern=SOUND_ID_PATTERN,
        description="The sound in sound.js it replaces, e.g. 'splash'.",
    )
    gain: float = Field(
        default=1.0, gt=0, description="Its level in the game, after levelling."
    )
    takes: list[Take] = Field(min_length=1)

    @model_validator(mode="after")
    def _check_takes(self) -> Effect:
        """No take listed twice."""
        files = [t.file for t in self.takes]
        dupes = {f for f in files if files.count(f) > 1}
        if dupes:
            raise ValueError(f"{self.id}: takes listed twice: {sorted(dupes)}")
        return self


class EffectSet(Model):
    """All recorded effects one game uses."""

    source: str = Field(
        description="How the takes were made and picked, and what may be done with them."
    )
    effects: list[Effect] = Field(min_length=1)

    @model_validator(mode="after")
    def _check_ids(self) -> EffectSet:
        """Each sound is listed once."""
        ids = [e.id for e in self.effects]
        dupes = {i for i in ids if ids.count(i) > 1}
        if dupes:
            raise ValueError(f"sounds listed twice: {sorted(dupes)}")
        return self
