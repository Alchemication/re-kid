"""The world dossier: everything we know about one cartoon series as a whole.

One ``WorldDossier`` per world, stored at ``worlds/<id>/world.yaml``. It holds
research only — facts, observations, interpretations. Game ideas belong in a
game brief; the one bridge is ``design_notes``, whose claims must all be
interpretations.

Example:
    dossier = WorldDossier.model_validate(yaml.safe_load(path.read_text()))
"""

from __future__ import annotations

from pydantic import Field, model_validator

from schema.common import SLUG_PATTERN, Claim, Credit, Model, Source, Status


class Production(Model):
    """Who made the series, when, how, and how much of it exists."""

    studio: Claim
    credits: list[Credit] = Field(
        default_factory=list,
        description="Creators, directors, writers, designers. Composers go in Sound.",
    )
    first_year: int | None = Field(default=None, description="Year of first release.")
    last_year: int | None = Field(default=None, description="Year of last episode.")
    years: Claim = Field(description="Production and broadcast span, with nuance.")
    episode_count: Claim
    episode_runtime: Claim
    technique: Claim = Field(description="Animation technique: cel, cut-out, etc.")
    origins: Claim = Field(description="How and why the series came to be.")


class Relationship(Model):
    """How one character relates to another."""

    to: str = Field(pattern=SLUG_PATTERN, description="Target character id.")
    claim: Claim


class Character(Model):
    """A recurring character (episodic one-offs belong in episode breakdowns)."""

    id: str = Field(pattern=SLUG_PATTERN)
    name: str
    name_en: str | None = None
    kind: str = Field(description="Species or type: 'dog', 'boy', 'crow'.")
    role: str = Field(description="'protagonist', 'recurring', 'antagonist', ...")
    description: Claim
    personality: Claim
    visual_signature: Claim = Field(description="How to recognise them at a glance.")
    sound_signature: Claim | None = Field(
        default=None, description="Voice, bark, musical motif, if any."
    )
    relationships: list[Relationship] = Field(default_factory=list)


class Place(Model):
    """A recurring setting."""

    id: str = Field(pattern=SLUG_PATTERN)
    name: str
    description: Claim


class Aesthetics(Model):
    """Visual language. Frame-based observations go here as OBSERVED claims."""

    overview: Claim
    palette: Claim
    palette_hex: list[str] = Field(
        default_factory=list,
        description="Representative colours sampled from frames, '#rrggbb'.",
    )
    line_and_shape: Claim
    backgrounds: Claim
    character_animation: Claim
    pacing: Claim = Field(description="Timing, rhythm, how long a gag or beat lasts.")
    composition: Claim = Field(description="Framing, staging, camera.")


class Sound(Model):
    """Everything heard. Much of this needs human ears (OBSERVED by a person)."""

    overview: Claim
    credits: list[Credit] = Field(default_factory=list, description="Composers etc.")
    theme: Claim = Field(description="The title theme: character, instrumentation.")
    music_role: Claim = Field(description="How music carries story and emotion.")
    sound_effects: Claim
    dialogue: Claim = Field(description="Speech, narration, or deliberate absence.")


class WorldDossier(Model):
    """Series-level research for one world."""

    id: str = Field(pattern=SLUG_PATTERN)
    title: str = Field(description="Original title.")
    title_en: str | None = None
    country: str = Field(description="ISO 3166-1 alpha-2, e.g. 'PL'.")
    original_language: str | None = Field(
        default=None, description="ISO 639-1; None for wordless series."
    )

    summary: str = Field(
        description="A short, plain-language introduction for a parent. "
        "Must only restate claims made elsewhere in this dossier."
    )
    production: Production
    viewing_context: Claim = Field(
        description="How and where a generation watched it (slot, channel, era)."
    )
    premise: Claim
    episode_formula: Claim = Field(description="How a typical episode unfolds.")
    opening_sequence: Claim = Field(
        description="The title sequence, in brief. Dissected separately."
    )
    tone_and_mood: Claim
    humour: Claim
    themes_and_values: list[Claim] = Field(default_factory=list)
    characters: list[Character] = Field(default_factory=list)
    places: list[Place] = Field(default_factory=list)
    aesthetics: Aesthetics
    sound: Sound
    legacy: list[Claim] = Field(
        default_factory=list,
        description="Later games, books, monuments, remakes, cultural references.",
    )
    availability: list[Claim] = Field(
        default_factory=list, description="Where to watch it legitimately today."
    )
    rights: Claim = Field(description="Who holds rights. Parked until release.")
    design_notes: list[Claim] = Field(
        default_factory=list,
        description="What the research implies for a game. Always INTERPRETATION.",
    )
    open_questions: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_internal_refs(self) -> WorldDossier:
        """Unique ids, valid relationship targets, design notes kept honest."""
        ids = [c.id for c in self.characters]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate character ids")
        place_ids = [p.id for p in self.places]
        if len(place_ids) != len(set(place_ids)):
            raise ValueError("duplicate place ids")
        for character in self.characters:
            for rel in character.relationships:
                if rel.to not in ids:
                    raise ValueError(
                        f"{character.id}: relationship to unknown character {rel.to!r}"
                    )
        for note in self.design_notes:
            if note.status != Status.INTERPRETATION:
                raise ValueError("design_notes must all be interpretation claims")
        return self


class SourceRegistry(Model):
    """All sources a world's files cite, stored at ``worlds/<id>/sources.yaml``."""

    sources: list[Source] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_unique(self) -> SourceRegistry:
        """Source ids must be unique."""
        ids = [s.id for s in self.sources]
        dupes = {i for i in ids if ids.count(i) > 1}
        if dupes:
            raise ValueError(f"duplicate source ids: {sorted(dupes)}")
        return self
