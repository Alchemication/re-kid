"""Load, save, and cross-check the research files of a world.

Pydantic validates each file on its own; ``validate_world`` adds the checks that
need more than one file — every cited source exists, VERIFIED claims meet the
"two sources or one primary" bar, and no source sits unused.

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

from config import SOURCES_FILE, WORLD_FILE, WORLDS_DIR, YAML_LINE_WIDTH
from schema.common import PRIMARY_SOURCE_KINDS, Claim, Status
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


def _format_validation_error(file: str, exc: ValidationError) -> list[str]:
    return [
        f"{file}: {'.'.join(str(p) for p in err['loc']) or '<root>'}: {err['msg']}"
        for err in exc.errors()
    ]


def validate_world(world_id: str, root: Path = WORLDS_DIR) -> WorldReport:
    """Validate a world's files individually and against each other."""
    report = WorldReport(world_id)
    base = world_dir(world_id, root)

    for file, model, attr in (
        (WORLD_FILE, WorldDossier, "dossier"),
        (SOURCES_FILE, SourceRegistry, "registry"),
    ):
        path = base / file
        if not path.is_file():
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
    for claim_path, claim in iter_claims(report.dossier):
        report.status_counts[claim.status] += 1
        for source_id in claim.sources:
            cited.add(source_id)
            if source_id not in sources:
                report.errors.append(
                    f"{WORLD_FILE}: {claim_path}: cites unknown source {source_id!r} "
                    f"— add it to {SOURCES_FILE}"
                )
        if claim.status == Status.VERIFIED and len(claim.sources) == 1:
            only = sources.get(claim.sources[0])
            if only is not None and only.kind not in PRIMARY_SOURCE_KINDS:
                report.errors.append(
                    f"{WORLD_FILE}: {claim_path}: verified on one non-primary source "
                    f"({only.kind}) — add a second source or downgrade to sourced"
                )

    for source_id in sorted(set(sources) - cited):
        report.warnings.append(f"{SOURCES_FILE}: {source_id!r} is never cited")
    return report
