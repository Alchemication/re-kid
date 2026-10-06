## Rules

Always use `uv run`, never plain `python`. Commands: `uv run python main.py --help`.

`main.py` is dispatch only — handlers live in `src/commands.py` (split into
`src/cmd_*.py` once it nears ~1000 lines).

Paths and tunables live in `src/config.py` as named constants, each with a
docstring saying why it has that value. Never inline them at the point of use.

Work on `main`. Commit only when asked, and only with lint and tests green.

## Project

Small, faithful games made from nostalgic childhood cartoons. Background and
goals: `PROJECT_IDEA.md`. Decisions, status and next steps: `PROJECT_PLAN.md` —
read it at the start of a session and update it as work lands. Current scope is
one world (Reksio) and one MVP game; resist building platform features ahead of
that.

Flow, one validated file per stage, under `worlds/<id>/`:

1. `world.yaml` + `sources.yaml` — series-level dossier (`schema.world`).
2. `episodes/index.yaml` — episode catalogue (`schema.episode`).
3. `intro.yaml`, `episodes/<slug>.yaml` — beat-by-beat breakdowns
   (`schema.breakdown`), plus the sounds a listener marked in them.
4. `games/<game>/brief.yaml` — a game brief (`schema.brief`): every part
   marked `original`, `inspired` or `invented`, with refs to what it is based
   on. Then the game itself, `games/<game>/game/` (opened with
   `main.py play <world> [game]`), and playtest logs (not written yet). The
   current game is `yard`; `intro` is a parked brief.

Research files hold research only. Game ideas go in a game brief; the one bridge
is `design_notes`, which must be `interpretation` claims. The game is inspired
by the original, not copied from it: original sounds or melodies only as
occasional easter eggs. One exception, Adam's call: Reksio barks with the
original barks, varied each time — packed locally, never committed.

## Research

Research happens in Claude Code sessions (web search/fetch, reading frames), not
through API calls from `main.py`. Write results straight into the YAML files and
run `uv run python main.py validate <world>` before reporting done.

Provenance rules (enforced by `schema.common.Claim` and `worlds.validate_world`):

- `verified` — two independent credible sources, or one primary (`studio`, `archive`).
- `sourced` — one credible source.
- `observed` — seen/heard in the original material; set `observed_by`.
- `interpretation` — our reading. Say so; don't dress it as fact.
- `unknown` — an open question, stated plainly. Prefer this over a guess.

Sound needs a person's ears. Claude can read frames and spectrograms but cannot
hear, and no model reachable from here hears reliably (`PROJECT_PLAN.md` has the
test). So music, rhythm and sound claims come from the listener
(`observed_by: adam`) or a source. Adam marks sounds in `main.py mark`; each
mark's note is saved as his observation. `src/audio.py` measurements (tempo,
onsets, loudness) are leads for him, never claims on their own.

Never state from memory what you haven't checked. If recall and a source
disagree, record the conflict in the claim text. Wikipedia is a lead, not a
destination — follow it to what it cites. Register every source once in
`sources.yaml` with `notes` on reliability; ids are kebab-case slugs.

Prose in claims: plain, specific, readable by a parent. No marketing tone.

## Collaboration Style

Challenge my ideas early. If an approach is over-engineered, fragile, or has a
simpler alternative — say so directly with reasoning. Flag knowledge gaps,
hidden trade-offs, or narrowed thinking. Be pragmatic.

**Prose:** terse, no pleasantries / hedging / filler. Fragments fine. Full
sentences for warnings, destructive-op confirmations, commit messages, and
research claims.

**Verification:** after cross-cutting changes (multiple modules, schema changes,
file moves), grep for stale references, run lint + tests + `main.py validate`,
and fix what you find before reporting done.

## Documentation

Keep `AGENTS.md` and `CLAUDE.md` identical. When editing either, update both.

Docs describe current behavior, not history or plans. Changes to commands or
file layout update `README.md` and the `main.py` docstring in the same change.

## Code Style

- **Linter/formatter:** `uv run ruff check .` and `uv run ruff format .`;
  game scripts: `npx --yes eslint@10.12.0 worlds` (errors fail; complexity
  warnings are the hotspot list: add none, split one when working in it).
- **Type hints:** required on all signatures. Native types only (`list`, `dict`,
  `str | None`) — never `typing.List` etc.
- **Docstrings:** Google style. Module docstrings say what the module is for.
- **Schemas:** Pydantic models extend `schema.common.Model` (`extra="forbid"`).
  Every statement about an original work is a `Claim`, not a bare string.
  Hard facts worth querying (years, counts) may get a typed field alongside
  the claim that carries their provenance.
- **File size:** keep source files under ~1000 lines.
- **No backward-compat shims:** when moving code, update all callers.
- **Game (`worlds/<id>/games/<game>/game/`):** plain HTML, CSS and classic
  scripts (not modules), so the page opens straight from disk with no server.
  Characters are drawn in code (SVG). Sound effects are made with Web Audio;
  music is played note by note from CC0 instrument samples listed in the
  game's `samples.yaml` and packed into `samples.js` by `main.py samples`
  (generated: don't edit it, rebuild it). Original audio only as easter eggs,
  plus the bark: `main.py barks` packs the original barks into the world's
  gitignored `audio/barks.js`, and the game falls back to a synthesised bark
  without it. Never commit original audio. Every push to `main` that touches
  a game folder publishes it to GitHub Pages (`.github/workflows/pages.yml`,
  `<site>/<world>/<game>/`): only what is committed in `game/` goes out.
- **Game debuggability (`debug.js`, loaded first):** every bug must be
  replayable, so:
  - randomness comes from `Debug.random('<part>')`, never `Math.random`
    (sound.js texture excepted); anything drawn every frame gets its own
    stream, so it can't shift the others;
  - an awaited gesture a tap may cut short goes through
    `Debug.ignoreCut(promise, 'what')`, never `.catch(() => {})`; an empty
    catch needs a comment on the line saying why;
  - input goes through `perform(intent)` as a short text intent, so the
    recorder captures it and replays reuse it; new input = new `INTENTS` entry;
  - new behaviour notes itself with `Debug.trace(kind, data)`, and anything
    that must always hold becomes a `Debug.check` rule in `checkRules`;
  - a new page-address flag goes in layout.js, makes its random draw either
    way (so seeded plays don't shift), and is listed in README.
- **Browser UI (`src/mark_ui/`):** plain HTML, CSS and ES modules, no build
  step. Libraries are vendored at a pinned version under `vendor/`, never loaded
  from a CDN. wavesurfer draws inside a shadow DOM, so styles for anything
  placed in its wrapper go in `SHADOW_CSS` in `mark.js`, not in `mark.css`.

## Output Rules

- `print()` for user-facing content → stdout.
- `logger` (stdlib `logging`) for diagnostics and errors → stderr.
- `rich` (import lazily) for tables and styled terminal output.
- Error messages tell the user what to do, not just what went wrong.

## Testing

`uv run pytest`. Shared fixtures and minimal valid data in `tests/conftest.py`.

**Must have tests:** schema validators, cross-file checks in `worlds.py`, YAML
round-trips, the marking server's API. Group in classes; use `tmp_path`; cover
the edge cases that would let bad data pass silently.

**Games**, three layers:

- *Unit* (`worlds/<id>/games/<game>/tests/*.test.js`, `node:test`, run by
  `uv run pytest`): logic, loaded into a sandbox by `tests/load.js`. Rules
  live in pure modules with no drawing or clock of their own (`day.js`,
  `shower.js`, `idle.js`, `input.js`, `layout.js`): the part that draws tells them what
  happened and does what they say. Drawing parts are tested here too, on a
  pretend page and clock: `load(…, { dom: true, globals })`, then
  `await page.advance(ms)` runs the timers and animation frames due (all
  animations end at once). `tests/fakes.js` has a Reksio whose gestures end
  at once and a Sound/Music that note what played (as `things.test.js`,
  `tree.test.js` and `creatures.test.js` use them). A minute of a gag runs
  in milliseconds. Logic that can be pure should be, and tested here.
- *Conventions* (`tests/test_game.py`, in `uv run pytest`): the debuggability
  rules above that a grep can check.
- *Browser* (`tests/test_game_browser.py`, `uv run pytest -m browser -n 8`,
  about 2 minutes, real time): every gesture, left-alone move, thing (plain
  and variation) and creature chase run alone in a `?seed=1&still` play, then
  cut short by a tap; plus a whole day to bed, Reksio left alone, and a
  report-and-replay round trip. Each must end with Reksio free and standing,
  no console error, no broken rule. The tables at the top list everything;
  the coverage tests fail until a new gesture, move, thing or creature is
  added there. Eight workers load the machine, which flushes out timing bugs:
  a test that fails only then is a real bug, not noise.

**Which tests while working.** Unit and convention tests always (seconds).
Browser tests: only the slice for what changed, then the whole suite once
before a commit.

| Changed | Browser slice (`-m browser -n 8 -k …`) |
|---|---|
| a thing in `things.js` / `tree.js` | `"TestThings and <name>"` (and its rules in `things.test.js` / `tree.test.js`) |
| a gesture or pose in `reksio.js` | `"TestGestures or TestGettingUp"` |
| left-alone moves (`yard.js` ACTS, `idle.js`) | `"TestActs or TestLeftAlone"` |
| `creatures.js` | `"TestCritters"` |
| `weather.js` / `shower.js` | `"drops or shakeOff or puddle or snail"` |
| `day.js` / `sky.js` / the end | `"TestWholePlay"` |
| `debug.js`, recorder, replay | `"TestRecorder or TestDebugOverlay"` |
| `input.js`, taps and keys | `"TestRealInput"` |
| screen size, `painting.js`, `game.css` stage | `"TestScreens"` |
| `layout.js`, anything shared | the whole suite |

**Adding a gag:** add its tests (tables in `test_game_browser.py`), run the
browser tests for it (`-k name`), look at it: a timed-screenshot contact sheet
or `main.py replay` frames. Then `/code-review` the diff for missed error cases
and interleavings (what if a tap lands mid-gag, it rains, the evening comes)
and `/simplify` for needless complexity. No tool checks judgement; these
reviews are the step for it.

**Bugs Adam reports:** he saves a report in the game (Ctrl+Shift+B, with a
description). `main.py replay` replays it and photographs the run-up; read the
contact sheet, `replay.json` (recorded vs replayed state, trace) and the
report's snapshots. Read the report's inputs and trace first: the moment may be
well before the report (widen with `--last`). A replay is close, not exact
(real clock): if it diverges, the bug may be timing-dependent; say so. When
frames can't settle it, probe the replayed page (sample what you suspect every
40 ms). Turn the bug into a browser test before fixing it, and check the test
fails on the old code.

**Browser UI:** after changing `src/mark_ui/`, drive it in the installed
Chrome with Playwright (`channel="chrome"`; the bundled Chromium can't decode
the H.264/AAC media). Check for console errors and take a screenshot. Test
against a scratch copy of the data or restore `intro.yaml` from git
afterwards, and restart the server between runs: it keeps marks in memory.
