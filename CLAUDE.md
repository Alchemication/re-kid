## Rules

Always use `uv run`, never plain `python`. Commands: `uv run python main.py --help`.

`main.py` is dispatch only — handlers live in `src/commands.py` (split into
`src/cmd_*.py` once it nears ~1000 lines).

Paths and tunables live in `src/config.py` as named constants, each with a
docstring saying why it has that value. Never inline them at the point of use.

Work on `main`. Commit only when asked, and only with lint and tests green.

## Project

Small, faithful games made from nostalgic childhood cartoons. Current scope is
one rich home scene per cartoon (Reksio's yard, then a second cartoon's), not a
game per episode; resist building platform features ahead of that. Read `docs/PROJECT_PLAN.md` at the start of a session, and
`docs/DECISIONS.md` before reopening anything settled; the docs table under
Documentation says where everything else is.

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
original barks, varied each time — shipped with the game for this POC.

## Research

Research happens in Claude Code sessions (web search/fetch, reading frames), not
through API calls from `main.py`. Write results straight into the YAML files and
run `uv run python main.py validate <world>` before reporting done.

Procedures live in skills (`.claude/skills/`): `new-world` researches a new
cartoon into a world; `new-episode` breaks down an episode; `new-character`
draws a hero after the films; `new-gag` adds a gag or encounter to a game;
`new-sound` makes a game's sound effects and `new-music` its music
(generated, picked by Adam's ear). README's "Adding a cartoon" shows their
order. Each run ends with a retro that proposes edits
to its skill.

The skills are meant to become a general process for building any cartoon's
world and scene, and the engine under it. So, at any time, not only in a
retro: when work shows that a skill is wrong, missing a step, slow, or
shaped around one cartoon, propose the edit to Adam, with the reason, as
soon as you notice it; the same for a step done by hand twice that could
become a skill. Make the edit once he agrees, never silently.

Provenance rules (enforced by `schema.common.Claim` and `worlds.validate_world`):

- `verified` — two independent credible sources, or one primary (`studio`, `archive`).
- `sourced` — one credible source.
- `observed` — seen/heard in the original material; set `observed_by`.
- `interpretation` — our reading. Say so; don't dress it as fact.
- `unknown` — an open question, stated plainly. Prefer this over a guess.

Sound needs a person's ears. Claude can read frames and spectrograms but cannot
hear, and no model reachable from here hears reliably (`docs/DECISIONS.md` has the
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

| File | What it holds |
|---|---|
| `docs/PROJECT_PLAN.md` | The next steps, in the agreed order. Take a step out when it is done. |
| `docs/DECISIONS.md` | What has been decided and why, and the original brief. Read before reopening a settled question. |
| `docs/DESIGN_PRINCIPLES.md` | How the games should feel and what they must never do, with the research on short play for toddlers. Check a new gag, ending or feature against it. |
| `README.md` | Layout, commands, the site, performance, debugging the yard, a note for parents. |
| `CLAUDE.md` / `AGENTS.md` | Working rules (this file). |
| `.claude/skills/*/SKILL.md` | Procedures: `new-world`, `new-episode`, `new-character`, `new-gag`, `new-sound`, `new-music`. |
| `experiments/sound/README.md` | The sound-generation experiment and its board. |
| `experiments/music/README.md` | The music-generation experiment and its board. |
| `worlds/<id>/games/<game>/brief.yaml` | A game's parts, each `original`, `inspired` or `invented`. |

Keep `AGENTS.md` and `CLAUDE.md` identical. When editing either, update both.
Adding, renaming or removing a doc updates this table and README's.

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
- **Game (`worlds/<id>/games/<game>/game/`):**
  - Plain HTML, CSS and classic scripts (not modules), so the page opens
    straight from disk with no server. Characters are drawn in code (SVG).
  - Sound effects: Web Audio, or, where a sound has them, recorded takes
    picked by ear (generated by a model, listed in `effects.yaml`, kept as
    made in `effects/`, packed into `effects.js` by `main.py effects` with
    the retro recipe in `config.EFFECT_*`). A sound plays a random take each
    time, or, marked `steady` (the cuckoo clock), its one take always.
  - Music: recorded takes picked by ear (generated by a model, listed in
    `tunes.yaml`, kept as made in `tunes/`, packed into `tunes.js` by
    `main.py tunes` with the effects' retro recipe), a part at a time:
    the morning, a phrase now and then, the lullaby. Small touches for
    what Reksio does play note by note from CC0 instrument samples
    (`samples.yaml`, packed into `samples.js` by `main.py samples`).
  - `effects.js`, `tunes.js` and `samples.js` are generated: rebuild them,
    don't edit. So are the copies of `shared/` scripts (`main.py shared`).
  - Original audio: never committed, except the bark (see Project), packed
    by `main.py barks` into the game's `barks.js`; without it
    the game falls back to a synthesised bark.
  - Every push to `main` that touches a game folder publishes it to GitHub
    Pages (`.github/workflows/pages.yml`, `<site>/<world>/<game>/`): only
    what is committed in `game/` goes out.
- **Shared parts:** what every game of a world will use (its characters,
  `debug.js`, sound and music) says so in its header (`// Shared by every
  game`) and uses only other shared parts. It never holds a game's things,
  state or layout: the game reaches in through hooks it sets (for Reksio,
  `kit`/`addGestures`, `wear`, `pointAt`, `keepBetween`, `listen`;
  `Debug.pin`), and a gag's state stays in the gag's file. A character is
  split the same way: an engine (state, drawing, the kit), its everyday
  gestures, and each game's gag moves kept with that game. A part that
  needs a game-side name gets a hook, not an exception.
  `test_shared_parts_know_no_game` checks what they depend on; whether one
  is shaped around a single game is for review. They stay in the first
  game's folder until a second game needs them; then the source moves to
  `shared/`, and `main.py shared` copies it into each game whose page
  loads it, so every game folder still opens, tests and publishes on its
  own. Edit `shared/`, never a copy (its first line says so;
  `test_shared.py` fails on a stale one). `debug.js` and `filmlook.js`
  are there so far.
- **Game debuggability (`debug.js`, loaded first):** every bug must be
  replayable, so:
  - randomness comes from `Debug.random('<part>')`, never `Math.random`
    (sound.js texture excepted); anything drawn every frame gets its own
    stream, so it can't shift the others;
  - time and timers come from `Clock` (debug.js): `Clock.now`, `after`,
    `wait`, `every`, never `setTimeout`, `setInterval` or `performance.now`
    (sound's audio clock aside). Game time moves only as frames are drawn,
    so a hidden page pauses the game instead of running it on unseen;
  - an awaited gesture a tap may cut short goes through
    `Debug.ignoreCut(promise, 'what')`, never `.catch(() => {})`; an empty
    catch needs a comment on the line saying why;
  - input goes through `perform(intent)` as a short text intent, so the
    recorder captures it and replays reuse it; new input = new `INTENTS` entry;
  - new behaviour notes itself with `Debug.trace(kind, data)`, and anything
    that must always hold becomes a `Debug.check` rule in `checkRules`;
  - Reksio is drawn from his state: each frame, `compose()` in reksio.js
    builds a pose (plain numbers, figure.js) from his layers (rest pose,
    stance, a gesture's pose and face, small additions), what life.js adds
    (how he stands and looks about when free; blinks, ears and tail always)
    and walking's stride (gait.js), then what a gag has put on him
    (`Reksio.wear`: the bowl, his caught tail), and figure.js draws it.
    Gestures (gestures.js, antics.js, made from `Reksio.kit`) move those numbers only with
    `blend()` on the Clock; `relax()` cuts every blend short. Nothing in the
    game is frozen with `fill: 'forwards'`: a frozen animation is a second
    source of truth that a cut-short gag leaves behind. Set the end on the
    element and animate to it (`Motion.endAt`, debug.js; for Reksio, a
    blend or a pose); a new gag follows the same rule;
  - a new page-address flag goes in layout.js (a shared part reads its
    own, as debug.js and filmlook.js do), makes its random draw either
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
  `shower.js`, `idle.js`, `input.js`, `layout.js`, `life.js`, `gait.js`): the part that draws tells them what
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

- *Performance* (`tests/test_game_perf.py`, `uv run pytest -m perf`, about
  35 s, alone on an idle machine): a phone-sized 3x screen with Chrome's CPU
  slowed 4x; idle, walking and rain must keep the main thread under 25% busy
  and 95% of frames under 20 ms. Run it after changing what happens every
  frame (draw, tick, weather, painting, CSS animations) and before a commit
  that does. It can't see the phone's GPU or heat: README says how to
  measure on the iPhone.

**Which tests while working.** Unit and convention tests always (seconds).
Browser tests: only the slice for what changed, then the whole suite once
before a commit.

| Changed | Browser slice (`-m browser -n 8 -k …`) |
|---|---|
| a thing in `things.js` / `bowl.js` / `tree.js` / `bramble.js` / `bird.js` / `cuckoo.js` / `nap.js` / `hen.js` / `mushrooms.js` / `spots.js` / `mouse.js` / `mound.js` / `film.js` | `"TestThings and <name>"`, the bowl `"TestBowl"`, the bramble `"TestBramble"`, the clock `"TestClock"`, the doghouse nap `"TestNap"`, the variations and the hen `"TestVariations"`, the mushrooms `"TestMushrooms"` (and its rules in `things.test.js` / `tree.test.js` / `cuckoo.test.js` / `nap.test.js`) |
| a gesture or pose in `reksio.js`, `gestures.js`, `antics.js`, `figure.js`, `life.js` or `gait.js` | `"TestGestures or TestGettingUp"` (and `reksio.test.js`: walking, every gesture ends) |
| left-alone moves (`yard.js` ACTS, `idle.js`) | `"TestActs or TestLeftAlone"` |
| `creatures.js` | `"TestCritters"` |
| `weather.js` / `shower.js` / `wet.js` | `"drops or shakeOff or puddle or snail"` |
| `day.js` / `sky.js` / `grownup.js` / the end | `"TestWholePlay or TestEvening"` |
| `debug.js`, recorder, replay | `"TestRecorder or TestDebugOverlay"` |
| `input.js`, taps and keys | `"TestRealInput"` |
| screen size, `painting.js`, `game.css` stage | `"TestScreens"` |
| `layout.js`, anything shared | the whole suite |
| Krtek's meadow (`worlds/krtek/games/meadow`, `tests/test_meadow_browser.py`) | `"Meadow"` |

**Adding a gag:** run the `new-gag` skill; it has the steps and where each
piece goes. Every gag gets its rows in the `test_game_browser.py` tables, a
`main.py look` at it, then `/code-review` (taps mid-gag, rain, evening) and
`/simplify`. No tool checks judgement; these reviews are the step for it.

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
