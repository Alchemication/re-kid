---
name: new-gag
description: Add or rework a gag or encounter in a game (the yard first) — design its beats, how the child gets to see it and what taps do, put each piece where it belongs, look at it frame by frame, test it against taps and interleavings, review, verify once. Use when asked to add, build, improve or fix a gag, encounter, creature behaviour or left-alone move, e.g. "the bird's twig to fetch" or "his tail caught in the bramble".
---

# New gag

The procedure for one gag in a game, from idea to a reviewed, tested commit.
The rules it relies on are in `CLAUDE.md` ("Code Style", game debuggability,
"Testing", "Adding a gag"); this skill is the order to do things in and the
traps already found. The worked example is the bowl stuck on his head
(`things.js` `stuckInBowl`, `bird.js` `rescue`, `antics.js`, `TestBowl`).

A gag is choreography: several characters, any tap at any moment, nothing
ever left stuck. That care is the job; what this skill cuts is the time spent
finding where things go and re-running things.

## 0. Before starting

- Read `PROJECT_PLAN.md` (what's next, open questions about Eliot) and the
  game's `brief.yaml` (principles, the scene it touches).
- Skim the module heads only (each file's first comment block says what it is
  for); read code where the gag will hook in, not whole files.

## 1. Is it a good gag?

Before any code, the idea must pass these (reject weak ones; a few good gags
beat many):

- **Clear without words.** A three-year-old sees what happened and why.
- **One real comic moment.** A freeze, a mishap, a reversal: something to
  laugh at, not just an animation playing.
- **Natural.** It could happen in a gentle cartoon in this world. If it is
  about help, the trouble comes from a harmless mishap or curiosity; nobody is
  made helpless just to be rescued, and helpers have their own reasons and
  abilities.
- **Fun to repeat.** The core stays the same each time (small children love
  exact repetition); something small is added on top now and then.
- **New to the place.** It adds what the game doesn't have yet.
- **Built from what exists.** Reuse his moves, the creatures and the sounds
  before inventing new ones.
- **Inspired, not copied.** New drawings, sounds and music; original audio
  only as an occasional easter egg (`CLAUDE.md`).

## 2. Design on paper, then check with Adam

Write down, briefly:

- **Beats:** setup, trigger, the comic moment, how it resolves, the aftermath.
  Who acts in each (Reksio, a creature, the yard).
- **Acting:** what his face and body show at each beat (surprise, glum,
  delight, suspicion). This, more than the motion, makes it read as a cartoon.
- **What it offers:** `discover`, `help` (he helps someone) or `helped`
  (someone helps him). If it makes a kind real for a prop, that prop's
  `OFFERS` in `layout.js` gains it, and the layout tests follow.
- **How the child gets to see it.** A tap on a thing (first use), the thing's
  variation (second use, then about every other: easy to never see), a
  left-alone move (`yard.js` `ACTS`; `due: true` makes a once-a-play move
  happen the first time it can), a creature's own timing, or the weather.
  The bowl was first built as a variation only and needed a second round.
- **What a tap does at each beat.** Every tap gets an answer, and for each
  beat decide which: it waits for after (the default while he is busy with a
  thing), it is answered inside the gag (the child takes part), or it cuts the
  gag short (left-alone moves). Answered inside: the bowl's `Things.stuckTap`
  is the one example so far; make it general for the second.
- **Interleavings to survive:** a tap mid-gag (queued, or answered), a tap
  during each beat that moves his head or body, rain starting, dusk, the
  creature busy elsewhere (the bird after a worm), the gag cut short at every
  `await`, the same thing used again.

**Checkpoint:** show Adam the beats, the trigger and the tap behaviour; build
once he agrees.

## 3. Where each piece goes

The yard's map (a game with another structure, an episode, writes its own
here when it gets its first gag):

| Piece | Where |
|---|---|
| The sequence for a thing | its entry in `THINGS`, `things.js` (the tree: `tree.js`) |
| A creature's part | its own file (`bird.js`); things call it (`Bird.rescue`) |
| Reksio's own moves for this gag | `antics.js`, made from `Reksio.kit` (`blend`, `pause`, `faceTo`/`faceOff`, `actTo`/`actOff`, `settle`/`rise`, the `add` layer), added with `Reksio.addGestures`. Not `reksio.js` |
| Something on his body (bone, bowl) | a face field in `figure.js` (`FACE`, drawn in `mount`), switched on in `reksio.js` `compose()` |
| Sounds | `sound.js`; reuse first (`grep -no "^    [a-zA-Z]*(" sound.js`) |
| A left-alone trigger | `yard.js` `ACTS` |
| Tunables | named constants at the top of the module, each with why |
| What must always hold | a `Debug.check` in `yard.js` `checkRules` |
| Words | the scene in `brief.yaml`, marked `original`, `inspired` or `invented` with refs to what it is based on; status in `PROJECT_PLAN.md` |

A file over 1000 lines fails `test_files_stay_small`: split by what it is
for (precedents: `bird.js` out of `things.js`, `antics.js` out of
`reksio.js`), and update every caller, no shims.

## 4. Traps already hit

- Two gestures blending the same number (`add.tilt`, `add.dy`) cut each other
  short: the newer resolves the older at once. A bark in the bowl during the
  bird's tug popped the bowl off at once. Give concurrent moves different
  layers (a bark moves only the face).
- Every piece of state the gag changes is restored in a `finally`: the prop
  shown and back in place, the creature home (`Bird.home()`), flags cleared.
- A gesture started now and awaited later must not reject unhandled (wrap or
  make it unable to reject).
- Moving an element elsewhere in the page breaks the selectors that find it:
  check hit tests and hover.
- Brief text: an unquoted `: ` inside a YAML string breaks the file. Use a
  full stop.

## 5. Look at it

```sh
uv run python main.py look <world> --flags props=bowl --close \
  --before "yardGame.use('bowl')" --watch "yardGame.use('bowl', true)"
```

Read `looks/latest/sheet.jpg`, then single frames for detail
(`looks/latest/frames/`, times in `look.json`). Check that each beat reads
without words, at phone size too (`--size 844x390`). Stills can't judge
timing or sound: name the constants Adam should tune by watching
(`main.py play <world> --still`).

## 6. Tests

- **Unit** (`tests/things.test.js` and friends, fake page and clock): the
  rules. The fake Reksio (`tests/fakes.js`) answers any gesture, but a
  property or getter the gag reads (`wearingBowl`, `bowlTop`) must be added
  to it, or it reads as a function.
- **Browser** (`tests/test_game_browser.py`): add new gestures to `GESTURES`
  (or `NOT_GESTURES`), moves to `ACTS`, things to `THINGS`; the coverage tests
  fail until you do. Give the gag a class (`TestBowl`): it runs to the end;
  taps mid-gag; each interleaving that can be forced (rain:
  `rain=1&rain-at=N`, never on top of `STILL`, which already says `rain=0`
  and the game reads the first); what changes after.
- `page.evaluate` waits for a returned promise. To start a gag and watch it,
  wrap it: `"() => { yardGame.use('bowl', true) }"`.
- Each bug a review finds gets a test that fails on the old code: put the old
  code back, see it fail, restore.

## 7. Review, then verify once

1. While working: unit tests, eslint, and the browser slice for what changed
   (`CLAUDE.md` table).
2. `/code-review` the diff (and `/simplify`); fix, with tests (6).
3. Then once: `uv run ruff check . && uv run pytest`, `npx --yes
   eslint@10.12.0 worlds`, `uv run pytest -m browser -n 8`, `uv run pytest
   -m perf` if something drawn every frame changed, `main.py validate`.
   Not after each step: the full browser suite takes about 3 minutes.

## 8. Report and retro

Report: what the gag does, how the child gets to it, what a tap does, what
was tested, what wasn't (and why), and the constants to tune by eye and ear.
Commit only when asked. Then a short retro: what in this skill was wrong,
missing or slow this time. Propose concrete edits to this file and make them
once the user agrees. The skill improves only through this step.
