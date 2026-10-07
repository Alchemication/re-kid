"""Load, save, and cross-check the research files of a world.

Pydantic validates each file on its own; ``validate_world`` adds the checks that
need more than one file — every cited source exists, VERIFIED claims meet the
"two sources or one primary" bar, no source sits unused, catalogued episodes
fall inside the dossier's production years, and every breakdown (the intro and
``episodes/<id>.yaml``) is timed against an episode the catalogue knows.

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
    BRIEF_NAME,
    EPISODES_FILE,
    GAMES_DIR,
    INTRO_FILE,
    SOURCES_FILE,
    WORLD_FILE,
    WORLDS_DIR,
    YAML_LINE_WIDTH,
)
from schema.breakdown import Breakdown
from schema.brief import GameBrief
from schema.common import PRIMARY_SOURCE_KINDS, Claim, Status
from schema.episode import EpisodeCatalogue
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
    breakdowns: dict[str, Breakdown] = field(default_factory=dict)
    """Episode breakdowns by catalogue id, from ``episodes/<id>.yaml``."""
    briefs: dict[str, GameBrief] = field(default_factory=dict)

    def iter_all_claims(self) -> Iterator[tuple[str, str, Claim]]:
        """Yield (file name, claim path, claim) across every loaded file.

        Dossier and catalogue paths are unprefixed (``premise``,
        ``episodes[reksio-wybawca].record``); intro paths start with ``intro``,
        an episode breakdown's with its file, ``episodes/reksio-wybawca``.
        """
        files: list[tuple[str, str, BaseModel | None]] = [
            (WORLD_FILE, "", self.dossier),
            (EPISODES_FILE, "", self.catalogue),
            (INTRO_FILE, "intro", self.intro),
        ]
        for episode_id, breakdown in self.breakdowns.items():
            file = breakdown_file(episode_id)
            files.append((file, file.removesuffix(".yaml"), breakdown))
        for file, prefix, model in files:
            if model is not None:
                for path, claim in iter_claims(model, prefix):
                    yield file, path, claim


def breakdown_file(episode_id: str) -> str:
    """Return the world-relative path of an episode's breakdown."""
    return f"{Path(EPISODES_FILE).parent}/{episode_id}.yaml"


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

    files_ok = True
    for path in sorted((base / EPISODES_FILE).parent.glob("*.yaml")):
        if path.name == Path(EPISODES_FILE).name:
            continue
        label = breakdown_file(path.stem)
        try:
            report.breakdowns[path.stem] = load_model(path, Breakdown)
        except ValidationError as exc:
            report.errors.extend(_format_validation_error(label, exc))
            files_ok = False
        except yaml.YAMLError as exc:
            report.errors.append(f"{label}: not valid YAML: {exc}")
            files_ok = False

    for path in sorted((base / GAMES_DIR).glob(f"*/{BRIEF_NAME}")):
        label = f"{GAMES_DIR}/{path.parent.name}/{BRIEF_NAME}"
        try:
            report.briefs[path.parent.name] = load_model(path, GameBrief)
        except ValidationError as exc:
            report.errors.extend(_format_validation_error(label, exc))
            files_ok = False
        except yaml.YAMLError as exc:
            report.errors.append(f"{label}: not valid YAML: {exc}")
            files_ok = False

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
        report.errors.extend(
            _check_reference_episode(INTRO_FILE, report.intro, report.catalogue)
        )
    for episode_id, breakdown in report.breakdowns.items():
        report.errors.extend(
            _check_episode_breakdown(episode_id, breakdown, report.catalogue)
        )
    for name, brief in report.briefs.items():
        report.errors.extend(_check_brief(name, brief, report.intro, report.dossier))

    for file, attr in (
        (EPISODES_FILE, "catalogue"),
        (INTRO_FILE, "intro"),
    ):
        if getattr(report, attr) is None and (base / file).is_file():
            # An optional file failed to load, so its citations are unknown;
            # warning about "unused" sources now would only be noise.
            return report
    if not files_ok:
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
    file: str, breakdown: Breakdown, catalogue: EpisodeCatalogue | None
) -> list[str]:
    """A breakdown's times must refer to an episode the catalogue knows."""
    ref = breakdown.reference_episode
    if catalogue is None:
        error = (
            f"{file}: reference_episode {ref!r} needs a valid {EPISODES_FILE} "
            "to check against — add the episode catalogue first"
        )
        return [error]
    if ref not in {e.id for e in catalogue.episodes}:
        error = (
            f"{file}: reference_episode {ref!r} is not in {EPISODES_FILE} "
            "— use a catalogue id, e.g. 'reksio-kosmonauta'"
        )
        return [error]
    return []


def _check_episode_breakdown(
    episode_id: str, breakdown: Breakdown, catalogue: EpisodeCatalogue | None
) -> list[str]:
    """An episode breakdown is named after a catalogued episode, its id matches
    its file, and its times refer to a catalogued upload."""
    file = breakdown_file(episode_id)
    errors = []
    if breakdown.id != episode_id:
        errors.append(
            f"{file}: id {breakdown.id!r} differs from its file name "
            f"{episode_id!r} — make them match"
        )
    if catalogue is not None and episode_id not in {e.id for e in catalogue.episodes}:
        errors.append(
            f"{file}: {episode_id!r} is not an episode in {EPISODES_FILE} "
            "— name the file after a catalogue id, e.g. 'reksio-poliglota.yaml'"
        )
    return errors + _check_reference_episode(file, breakdown, catalogue)


def _check_brief(
    name: str, brief: GameBrief, intro: Breakdown | None, dossier: WorldDossier
) -> list[str]:
    """The brief's id matches its folder, and every scene moment and every ref
    points at something that exists."""
    label = f"{GAMES_DIR}/{name}/{BRIEF_NAME}"
    errors = []
    if brief.id != name:
        errors.append(
            f"{label}: id {brief.id!r} differs from its folder {name!r} — make them match"
        )
    moments = {b.id for b in intro.beats} if intro else set()
    marks = {m.id for m in intro.marks} if intro else set()
    claims = {path for path, _ in iter_claims(dossier)}
    known = {"intro": moments, "mark": marks, "world": claims}
    where = {"intro": INTRO_FILE, "mark": INTRO_FILE, "world": WORLD_FILE}
    for scene in brief.scenes:
        if scene.moment is not None and scene.moment not in moments:
            errors.append(
                f"{label}: scenes[{scene.id}]: moment {scene.moment!r} "
                f"is not a beat in {INTRO_FILE}"
            )
    for path, element in brief.elements():
        for ref in element.refs:
            kind, target = ref.split(":", 1)
            if target not in known[kind]:
                errors.append(
                    f"{label}: {path}: {ref!r} not found in "
                    f"{where[kind]} — check the id (main.py show lists claim paths)"
                )
    return errors
