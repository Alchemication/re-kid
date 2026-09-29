# re-kid

Small, faithful games made from nostalgic childhood cartoons — starting with
one Polish world, Reksio, and one short game for a parent and a young child.
Background: [PROJECT_IDEA.md](PROJECT_IDEA.md).

## Layout

```
main.py                 CLI entry point (dispatch only)
src/
  config.py             paths and tunables
  schema/               pydantic models for every research file
  worlds.py             load/save YAML, cross-file validation
  commands.py           subcommand handlers
worlds/<id>/
  world.yaml            series dossier (schema.world.WorldDossier)
  sources.yaml          every source the world's files cite
tests/
```

Every statement about an original work is a claim with a status —
`verified`, `sourced`, `observed`, `interpretation`, `unknown` — and the
sources behind it. `validate` enforces the evidence each status needs.

## Commands

```
uv sync
uv run python main.py list
uv run python main.py validate [WORLD...]
uv run python main.py show WORLD [--status unknown] [--section sound]
uv run python main.py schema world|sources
```

Development: `uv run ruff check . && uv run ruff format . && uv run pytest`.
