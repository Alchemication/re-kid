"""The game brief: what a game is, scene by scene, and where each part comes from.

Stored at ``worlds/<id>/games/<game>/brief.yaml``. A brief is design, not
research, so its parts are not claims about the original. Instead every part
says how it relates to the original:

- ``original`` — uses the original material itself (a sound, a melody).
- ``inspired`` — new, but based on something in the original.
- ``invented`` — new, with no basis in the original.

``original`` and ``inspired`` parts must say what they are based on, as
references checked by ``worlds.validate_world``:

- ``intro:<beat id>`` — a moment of the intro breakdown;
- ``mark:<mark id>`` — a sound or melody the listener marked;
- ``world:<claim path>`` — a dossier claim, as ``main.py show`` prints it.

Example:
    brief = GameBrief.model_validate(yaml.safe_load(path.read_text()))
"""

from __future__ import annotations

import re
from typing import Literal

from pydantic import Field, model_validator

from schema.common import SLUG_PATTERN, Model

Origin = Literal["original", "inspired", "invented"]

REF_PATTERN = re.compile(r"^(intro|mark|world):\S+$")
"""``kind:target``, e.g. ``intro:cymbals``, ``mark:bark``, ``world:premise``."""


class Element(Model):
    """One part of the design and where it comes from."""

    text: str = Field(min_length=1)
    origin: Origin
    refs: list[str] = Field(
        default_factory=list,
        description="What the part is based on: intro:, mark: or world: refs.",
    )

    @model_validator(mode="after")
    def _check_refs(self) -> Element:
        """Original and inspired parts must name their basis; refs are well formed."""
        for ref in self.refs:
            if not REF_PATTERN.match(ref):
                raise ValueError(
                    f"bad ref {ref!r} — use intro:<beat id>, mark:<mark id> "
                    "or world:<claim path>"
                )
        if self.origin != "invented" and not self.refs:
            raise ValueError(
                f"an {self.origin} part needs refs saying what it is based on"
            )
        return self


class Scene(Model):
    """One step of the game: what the child does and what happens."""

    id: str = Field(pattern=SLUG_PATTERN)
    moment: str | None = Field(
        default=None,
        pattern=SLUG_PATTERN,
        description="The intro moment this scene plays, if any.",
    )
    action: Element = Field(description="What the child does.")
    result: Element = Field(description="What happens on screen.")
    sound: Element
    easter_egg: Element | None = Field(
        default=None, description="An occasional touch of the original."
    )


class GameBrief(Model):
    """A whole game, small enough to build and playtest."""

    id: str = Field(pattern=SLUG_PATTERN)
    title: str = Field(description="Working title.")
    status: Literal["draft", "agreed", "parked"] = "draft"
    audience: str
    length: str = Field(description="How long one play lasts, e.g. '3–5 minutes'.")
    pitch: Element
    principles: list[Element] = Field(min_length=1)
    controls: Element
    look: list[Element] = Field(min_length=1)
    sound: list[Element] = Field(min_length=1)
    scenes: list[Scene] = Field(min_length=1)
    ending: Element
    parent_card: Element
    open_questions: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_scenes(self) -> GameBrief:
        """Scene ids must be unique."""
        ids = [s.id for s in self.scenes]
        dupes = {i for i in ids if ids.count(i) > 1}
        if dupes:
            raise ValueError(f"duplicate scene ids: {sorted(dupes)}")
        return self

    def elements(self) -> list[tuple[str, Element]]:
        """Every element with a readable path, for reference checks."""
        found: list[tuple[str, Element]] = [("pitch", self.pitch)]
        found += [(f"principles[{i}]", e) for i, e in enumerate(self.principles)]
        found.append(("controls", self.controls))
        found += [(f"look[{i}]", e) for i, e in enumerate(self.look)]
        found += [(f"sound[{i}]", e) for i, e in enumerate(self.sound)]
        for s in self.scenes:
            for name in ("action", "result", "sound", "easter_egg"):
                element = getattr(s, name)
                if element is not None:
                    found.append((f"scenes[{s.id}].{name}", element))
        found += [("ending", self.ending), ("parent_card", self.parent_card)]
        return found
