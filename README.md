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
  replay.py             replays a game's bug report in Chrome and photographs it
  audio.py              audio measurements, clips, spectrograms (ffmpeg, librosa)
  samples.py            downloads, measures and packs a game's instrument samples
  barks.py              cuts the marked original barks into a local script for the games
  mark.py               local server for the sound-marking tool
  mark_ui/              its page: HTML, CSS, JS, vendored wavesurfer.js
worlds/<id>/
  world.yaml            series dossier (schema.world.WorldDossier)
  sources.yaml          every source the world's files cite
  episodes/index.yaml   episode catalogue (schema.episode.EpisodeCatalogue)
  intro.yaml            title sequence, beat by beat (schema.breakdown.Breakdown)
  audio/intro/          measurements, spectrograms, mark clips (generated, gitignored)
  audio/barks.js        the original barks, packed for the games (generated, gitignored)
  games/<game>/brief.yaml  game brief (schema.brief.GameBrief)
  games/<game>/samples.yaml  instrument samples a game uses (schema.samples.SampleSet)
  games/<game>/game/    the game: static HTML, CSS and plain scripts
  games/<game>/tests/   the game's JS unit tests (node:test)
  media/intro/          intro video clips (downloaded, gitignored)
tests/                  pytest; test_game_browser.py drives the games in Chrome
.github/workflows/pages.yml  publishes the games to GitHub Pages
eslint.config.mjs       lint for the game scripts (run with npx, no npm project)
```

Every statement about an original work is a claim with a status —
`verified`, `sourced`, `observed`, `interpretation`, `unknown` — and the
sources behind it. `validate` enforces the evidence each status needs.

`mark` opens a local page for marking sounds by ear: the intro video next to
its waveform and spectrogram, with the breakdown's moments and the measured beat
grid. Drag to select a sound or melody, name it, note what you hear, and answer
each moment's "Listen for" question; marks and answers are saved to
`intro.yaml` as the listener's observations, and each mark's audio is kept cut
in `audio/intro/marks/<id>.wav`, updated on every save. The measurements (`audio.py`) are leads for the
listener, never claims on their own.

## Commands

```
uv sync
uv run python main.py list
uv run python main.py validate [WORLD...]
uv run python main.py show WORLD [--status unknown] [--section sound]
uv run python main.py episodes WORLD [--online]
uv run python main.py mark WORLD [MEDIA] [--by NAME] [--no-open]
uv run python main.py play WORLD [GAME] [--debug] [--seed N] [--still]
uv run python main.py replay [REPORT] [--last S] [--every MS] [--out DIR]
uv run python main.py samples WORLD [GAME]    # rebuilds the game's samples.js
uv run python main.py barks WORLD             # packs the marked barks (local only)
uv run python main.py schema world|sources|episodes|intro|brief
```

Development: `uv run ruff check . && uv run ruff format . && uv run pytest`,
`npx --yes eslint@10.12.0 worlds` for the game scripts, and
`uv run pytest -m browser -n 4` (a few minutes) after changing a game.

## The site

Every push to `main` that changes a game publishes it to GitHub Pages
(`.github/workflows/pages.yml`): https://alchemication.github.io/re-kid/
(forwards to the yard; each game is at `<site>/<world>/<game>/`). Only the
game folders go out. The original barks are local only, so the site plays the
synthesised bark; on an iPhone or iPad the sound plays even with the ringer
switch on silent (Safari 17+). Bug reports saved on the site replay locally:
`main.py replay` maps them to this repository's copy of the game.

## Debugging the yard

Flags in the page address (`main.py play` takes the first three):

| Flag | Does |
|------|------|
| `?seed=N` | Replays a play: the layout exactly, what happens in it closely. Every play prints its seed in the console. |
| `?debug` | State overlay, every event in the console, a "report a bug" button. |
| `?still` | Reksio moves only when asked: try one gesture or gag alone. |
| `?mains=trap,bowl` | Which main things count. |
| `?creatures=fly,spider` | Which creatures come (`?creatures=` for none). |
| `?flowers=1` / `0` | Flowers out or not. |
| `?rain=1` / `0`, `?rain-at=S` | Force the shower, and when it starts. |
| `?mouse-at=S`, `?visitor-at=S` | When the mouse, and the tree's visitor, come out. |
| `?fruit=apple\|plum\|nut` | The tree's fruit. |

In the console: `yardGame.state()`, `yardGame.trace()`, `yardGame.act('nap')`,
`yardGame.use('bowl', true)` (true: the variation), `yardGame.perform('go to tap')`.

**Bug reports.** The game keeps every input since the start and its state every
half second. Ctrl+Shift+B (any play) asks what went wrong and downloads
`yard-bug-<time>.json`. `main.py replay` replays the newest one in ~/Downloads:
same seed, same inputs at the same times. It saves a screenshot every 0.5 s of
the last 10 s, a contact sheet, and `replay.json` (recorded vs replayed state,
trace). The game runs on the real clock, so a replay is close, not exact; the
command says when it ended differently.
