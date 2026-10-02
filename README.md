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
  mark.py               local server for the sound-marking tool
  mark_ui/              its page: HTML, CSS, JS, vendored wavesurfer.js
worlds/<id>/
  world.yaml            series dossier (schema.world.WorldDossier)
  sources.yaml          every source the world's files cite
  episodes/index.yaml   episode catalogue (schema.episode.EpisodeCatalogue)
  intro.yaml            title sequence, beat by beat (schema.breakdown.Breakdown)
  audio/intro/          measurements, spectrograms, mark clips (generated, gitignored)
  media/intro/          intro video clips (downloaded, gitignored)
tests/
```

Every statement about an original work is a claim with a status —
`verified`, `sourced`, `observed`, `interpretation`, `unknown` — and the
sources behind it. `validate` enforces the evidence each status needs.

`mark` opens a local page for marking sounds by ear: the intro video next to
its waveform and spectrogram, with the breakdown's moments and the measured beat
grid. Drag to select a sound or melody, name it, note what you hear; marks are
saved to `intro.yaml` as the listener's observations. Ctrl+C stops it and cuts
each mark to its own clip. The measurements (`audio.py`) are leads for the
listener, never claims on their own.

## Commands

```
uv sync
uv run python main.py list
uv run python main.py validate [WORLD...]
uv run python main.py show WORLD [--status unknown] [--section sound]
uv run python main.py episodes WORLD [--online]
uv run python main.py mark WORLD [MEDIA] [--by NAME] [--no-open]
uv run python main.py schema world|sources|episodes|intro
```

Development: `uv run ruff check . && uv run ruff format . && uv run pytest`.
