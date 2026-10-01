# re-kid

Small, faithful games made from nostalgic childhood cartoons — starting with
one Polish world, Reksio, and one short game for a parent and a young child.
Background: [PROJECT_IDEA.md](PROJECT_IDEA.md). Plan and status: [PROJECT_PLAN.md](PROJECT_PLAN.md).

## Layout

```
main.py                 CLI entry point (dispatch only)
src/
  config.py             paths and tunables
  schema/               pydantic models for every research file
  worlds.py             load/save YAML, cross-file validation
  commands.py           subcommand handlers
  audio.py              audio measurements, clips, spectrograms (ffmpeg, librosa)
worlds/<id>/
  world.yaml            series dossier (schema.world.WorldDossier)
  sources.yaml          every source the world's files cite
  episodes/index.yaml   episode catalogue (schema.episode.EpisodeCatalogue)
  intro.yaml            title sequence, beat by beat (schema.breakdown.Breakdown)
  audio/intro/          generated measurements, clips, spectrograms (gitignored)
tests/
```

Every statement about an original work is a claim with a status —
`verified`, `sourced`, `observed`, `interpretation`, `unknown` — and the
sources behind it. `validate` enforces the evidence each status needs.

`audio.py` measures; it does not listen. Its tempo, onsets and spectrograms
are leads for a person to check by ear, and never go into claims directly.

## Commands

```
uv sync
uv run python main.py list
uv run python main.py validate [WORLD...]
uv run python main.py show WORLD [--status unknown] [--section sound]
uv run python main.py episodes WORLD [--online]
uv run python main.py schema world|sources|episodes|intro
```

Development: `uv run ruff check . && uv run ruff format . && uv run pytest`.
