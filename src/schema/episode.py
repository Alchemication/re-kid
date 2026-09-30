"""The episode catalogue: one row per episode of a series, before any is chosen.

Stored at ``worlds/<id>/episodes/index.yaml``. It exists to make episode
selection an informed choice: what each episode is, who made it, how long it
runs, what happens in it, and whether the studio has put it online.

Typed fields (year, directors, runtime) make the list sortable and filterable;
the ``record`` claim beside them carries their provenance and spells out any
disagreement between sources.

Example:
    catalogue = EpisodeCatalogue.model_validate(yaml.safe_load(path.read_text()))
"""

from __future__ import annotations

from pydantic import Field, model_validator

from schema.common import SLUG_PATTERN, Claim, Model


class EpisodeRef(Model):
    """One episode as the catalogue knows it."""

    id: str = Field(pattern=SLUG_PATTERN, description="Slug of the title.")
    number: int = Field(
        ge=1,
        description="Position in the catalogue's reference list, counting from 1. "
        "The catalogue notes say which list that is.",
    )
    title: str = Field(description="Original title.")
    year: int = Field(description="Year of production.")
    directors: list[str] = Field(
        min_length=1, description="Directors and co-directors, as credited."
    )
    runtime_min: int | None = Field(
        default=None, ge=1, description="Nominal length in whole minutes."
    )
    watch_url: str | None = Field(
        default=None,
        pattern=r"^https://",
        description="Official upload by the studio or rights holder, if any.",
    )
    record: Claim = Field(
        description="Provenance for title, year, directors and runtime. "
        "Conflicts between sources are stated here."
    )
    synopsis: Claim | None = None


class EpisodeCatalogue(Model):
    """Every episode of one world, in the order of one reference list."""

    notes: list[Claim] = Field(
        default_factory=list,
        description="Catalogue-wide facts: how episodes are counted, numbered, "
        "grouped, and where sources disagree.",
    )
    episodes: list[EpisodeRef] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_episodes(self) -> EpisodeCatalogue:
        """Unique ids, and numbers that run 1..N in list order with no gaps."""
        ids = [e.id for e in self.episodes]
        dupes = {i for i in ids if ids.count(i) > 1}
        if dupes:
            raise ValueError(f"duplicate episode ids: {sorted(dupes)}")
        for expected, episode in enumerate(self.episodes, start=1):
            if episode.number != expected:
                raise ValueError(
                    f"{episode.id}: number {episode.number}, expected {expected} "
                    "— keep episodes in list order, numbered from 1"
                )
        return self
