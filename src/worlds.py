"""Load, save, and cross-check the research files of a world.

Pydantic validates each file on its own; ``validate_world`` adds the checks that
need more than one file — every cited source exists, VERIFIED claims meet the
"two sources or one primary" bar, no source sits unused, catalogued episodes
fall inside the dossier's production years, the intro breakdown is timed
against an episode the catalogue knows, and intro loops name real intro beats.

Example:
    report = validate_world("reksio")
    if report.errors:
        ...
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, ValidationError

from config import (
    EPISODES_FILE,
    INTRO_FILE,
    INTRO_LOOPS_FILE,
    SOURCES_FILE,
    WORLD_FILE,
    WORLDS_DIR,
    YAML_LINE_WIDTH,
)
from schema.breakdown import Breakdown
from schema.common import PRIMARY_SOURCE_KINDS, Claim, Status
from schema.episode import EpisodeCatalogue
from schema.loops import LoopSet
from schema.world import SourceRegistry, WorldDossier


class _Dumper(yaml.SafeDumper):
    """SafeDumper that writes multi-line strings as literal blocks."""


def _str_representer(dumper: yaml.SafeDumper, value: str) -> yaml.ScalarNode:
    style = "|" if "\n" in value else None
    return dumper.represent_scalar("tag:yaml.org,2002:str", value, style=style)


_Dumper.add_representer(str, _str_representer)


def world_dir(world_id: str, root: Path = WORLDS_DIR) -> Path:
    """Return the directory for a world id."""
    return root / world_id


def list_worlds(root: Path = WORLDS_DIR) -> list[str]:
    """Return ids of all worlds that have a dossier file, sorted."""
    if not root.is_dir():
        return []
    return sorted(p.parent.name for p in root.glob(f"*/{WORLD_FILE}"))


def load_model[M: BaseModel](path: Path, model: type[M]) -> M:
    """Parse a YAML file into a model. Raises ValidationError or OSError."""
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return model.model_validate(data)


def dump_model(model: BaseModel, path: Path) -> None:
    """Write a model to YAML: field order kept, Unicode kept, None fields dropped."""
    data = model.model_dump(mode="json", exclude_none=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        yaml.dump(
            data,
            Dumper=_Dumper,
            allow_unicode=True,
            sort_keys=False,
            width=YAML_LINE_WIDTH,
        ),
        encoding="utf-8",
    )


def iter_claims(obj: Any, path: str = "") -> Iterator[tuple[str, Claim]]:
    """Yield (dotted path, claim) for every Claim nested anywhere in obj."""
    if isinstance(obj, Claim):
        yield path, obj
    elif isinstance(obj, BaseModel):
        for name in type(obj).model_fields:
            child = f"{path}.{name}" if path else name
            yield from iter_claims(getattr(obj, name), child)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            label = getattr(item, "id", None) or str(i)
            yield from iter_claims(item, f"{path}[{label}]")


@dataclass
class WorldReport:
    """Outcome of validating one world."""

    world_id: str
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    status_counts: Counter[Status] = field(default_factory=Counter)
    dossier: WorldDossier | None = None
    registry: SourceRegistry | None = None
    catalogue: EpisodeCatalogue | None = None
    intro: Breakdown | None = None
    intro_loops: LoopSet | None = None

    def iter_all_claims(self) -> Iterator[tuple[str, str, Claim]]:
        """Yield (file name, claim path, claim) across every loaded file.

        Dossier and catalogue paths are unprefixed (``premise``,
        ``episodes[reksio-wybawca].record``); intro paths start with ``intro``.
        """
        files: list[tuple[str, str, BaseModel | None]] = [
            (WORLD_FILE, "", self.dossier),
            (EPISODES_FILE, "", self.catalogue),
            (INTRO_FILE, "intro", self.intro),
        ]
        for file, prefix, model in files:
            if model is not None:
                for path, claim in iter_claims(model, prefix):
                    yield file, path, claim


def _format_validation_error(file: str, exc: ValidationError) -> list[str]:
    return [
        f"{file}: {'.'.join(str(p) for p in err['loc']) or '<root>'}: {err['msg']}"
        for err in exc.errors()
    ]


def validate_world(world_id: str, root: Path = WORLDS_DIR) -> WorldReport:
    """Validate a world's files individually and against each other."""
    report = WorldReport(world_id)
    base = world_dir(world_id, root)

    for file, model, attr, required in (
        (WORLD_FILE, WorldDossier, "dossier", True),
        (SOURCES_FILE, SourceRegistry, "registry", True),
        (EPISODES_FILE, EpisodeCatalogue, "catalogue", False),
        (INTRO_FILE, Breakdown, "intro", False),
        (INTRO_LOOPS_FILE, LoopSet, "intro_loops", False),
    ):
        path = base / file
        if not path.is_file():
            if required:
                report.errors.append(f"{file}: missing (expected at {path})")
            continue
        try:
            setattr(report, attr, load_model(path, model))
        except ValidationError as exc:
            report.errors.extend(_format_validation_error(file, exc))
        except yaml.YAMLError as exc:
            report.errors.append(f"{file}: not valid YAML: {exc}")

    if report.dossier is None or report.registry is None:
        return report

    sources = {s.id: s for s in report.registry.sources}
    cited: set[str] = set()
    for file, claim_path, claim in report.iter_all_claims():
        report.status_counts[claim.status] += 1
        for source_id in claim.sources:
            cited.add(source_id)
            if source_id not in sources:
                report.errors.append(
                    f"{file}: {claim_path}: cites unknown source {source_id!r} "
                    f"— add it to {SOURCES_FILE}"
                )
        if claim.status == Status.VERIFIED and len(claim.sources) == 1:
            only = sources.get(claim.sources[0])
            if only is not None and only.kind not in PRIMARY_SOURCE_KINDS:
                report.errors.append(
                    f"{file}: {claim_path}: verified on one non-primary source "
                    f"({only.kind}) — add a second source or downgrade to sourced"
                )

    if report.catalogue is not None:
        report.errors.extend(_check_episode_years(report.dossier, report.catalogue))
    if report.intro is not None:
        report.errors.extend(_check_reference_episode(report.intro, report.catalogue))
    if report.intro_loops is not None:
        report.errors.extend(_check_loops(report.intro_loops, report.intro))

    for file, attr in (
        (EPISODES_FILE, "catalogue"),
        (INTRO_FILE, "intro"),
        (INTRO_LOOPS_FILE, "intro_loops"),
    ):
        if getattr(report, attr) is None and (base / file).is_file():
            # An optional file failed to load, so its citations are unknown;
            # warning about "unused" sources now would only be noise.
            return report

    for source_id in sorted(set(sources) - cited):
        report.warnings.append(f"{SOURCES_FILE}: {source_id!r} is never cited")
    return report


def _check_episode_years(
    dossier: WorldDossier, catalogue: EpisodeCatalogue
) -> list[str]:
    """Episodes must fall inside the dossier's first_year..last_year, when set."""
    first, last = dossier.production.first_year, dossier.production.last_year
    errors = []
    for episode in catalogue.episodes:
        if (first and episode.year < first) or (last and episode.year > last):
            errors.append(
                f"{EPISODES_FILE}: episodes[{episode.id}]: year {episode.year} is "
                f"outside the dossier's production years ({first}–{last}) "
                f"— fix one of them in {EPISODES_FILE} or {WORLD_FILE}"
            )
    return errors


def _check_reference_episode(
    breakdown: Breakdown, catalogue: EpisodeCatalogue | None
) -> list[str]:
    """A breakdown's times must refer to an episode the catalogue knows."""
    ref = breakdown.reference_episode
    if catalogue is None:
        error = (
            f"{INTRO_FILE}: reference_episode {ref!r} needs a valid {EPISODES_FILE} "
            "to check against — add the episode catalogue first"
        )
        return [error]
    if ref not in {e.id for e in catalogue.episodes}:
        error = (
            f"{INTRO_FILE}: reference_episode {ref!r} is not in {EPISODES_FILE} "
            "— use a catalogue id, e.g. 'reksio-kosmonauta'"
        )
        return [error]
    return []


def _check_loops(loops: LoopSet, intro: Breakdown | None) -> list[str]:
    """Loop choices must belong to the intro breakdown and name its beats."""
    if intro is None:
        error = (
            f"{INTRO_LOOPS_FILE}: needs a valid {INTRO_FILE} — its loops refer to "
            "the intro's beats"
        )
        return [error]
    errors = []
    if loops.breakdown != intro.id:
        errors.append(
            f"{INTRO_LOOPS_FILE}: breakdown {loops.breakdown!r} is not {intro.id!r} "
            f"— set it to the id in {INTRO_FILE}"
        )
    beat_ids = {b.id for b in intro.beats}
    for loop in loops.loops:
        if loop.beat_id not in beat_ids:
            errors.append(
                f"{INTRO_LOOPS_FILE}: loop for unknown beat {loop.beat_id!r} "
                f"— rename it to a beat id in {INTRO_FILE} or delete it"
            )
    return errors
