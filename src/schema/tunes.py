"""Recorded music a game uses: the takes picked by ear for each part of its day.

Stored at ``worlds/<id>/games/<game>/tunes.yaml``, with the takes themselves
in the game's ``tunes/`` folder, as they were made. ``main.py tunes`` puts
them through the effects' retro recipe, levels them and packs them into the
game's ``tunes.js``; the game's music.js plays one take of a part at random
when that part comes (the morning, a phrase after something new, a mood of
an encounter, the lullaby), a season's own takes of it in that season.

Example:
    tunes = TuneSet.model_validate(yaml.safe_load(path.read_text()))
"""

from __future__ import annotations

from typing import Literal

from pydantic import Field, model_validator

from schema.common import Model


class TuneTake(Model):
    """One take of a part, as it was made."""

    file: str = Field(description="Path inside the game's tunes/ folder.")
    prompt: str = Field(description="What it was made from (the wording asked for).")
    model: str = Field(description="The model that made it, e.g. 'music_v1'.")
    song: str | None = Field(
        default=None,
        description="Its song id at the maker, to grow variations from it later.",
    )


class Tune(Model):
    """One part of the day's music, and the takes it plays from."""

    id: Literal["morning", "phrase", "curious", "sad", "happy", "lullaby"] = Field(
        description=(
            "The part in the game's music.js (its PARTS): 'morning' as he "
            "wakes; 'phrase' now and then through the day (the yard); the "
            "theme's moods in an encounter, 'curious' as it arrives, 'sad' "
            "at its trouble, 'happy' as it comes right (the meadow); "
            "'lullaby' at evening."
        )
    )
    season: Literal["winter"] | None = Field(
        default=None,
        description=(
            "The season whose plays it belongs to (Adam, 2026-10-27: each "
            "season its own themes); none: every season without its own."
        ),
    )
    takes: list[TuneTake] = Field(min_length=1)

    @property
    def key(self) -> str:
        """Its name in tunes.js, which music.js asks for: 'lullaby', 'lullaby.winter'."""
        return f"{self.id}.{self.season}" if self.season else self.id

    @model_validator(mode="after")
    def _check_takes(self) -> Tune:
        """No take listed twice."""
        files = [t.file for t in self.takes]
        dupes = {f for f in files if files.count(f) > 1}
        if dupes:
            raise ValueError(f"{self.id}: takes listed twice: {sorted(dupes)}")
        return self


class TuneSet(Model):
    """All recorded music one game uses."""

    source: str = Field(
        description="How the takes were made and picked, and what may be done with them."
    )
    tunes: list[Tune] = Field(min_length=1)

    @model_validator(mode="after")
    def _check_ids(self) -> TuneSet:
        """Each part is listed once (once for each season)."""
        ids = [t.key for t in self.tunes]
        dupes = {i for i in ids if ids.count(i) > 1}
        if dupes:
            raise ValueError(f"parts listed twice: {sorted(dupes)}")
        return self
