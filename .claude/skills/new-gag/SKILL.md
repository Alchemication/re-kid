---
name: new-gag
description: Add or rework a gag or encounter in a game (the yard first) — design its beats, how the child gets to see it and what taps do, put each piece where it belongs, look at it frame by frame, test it against taps and interleavings, review, verify once. Use when asked to add, build, improve or fix a gag, encounter, creature behaviour or left-alone move, e.g. "the bird's twig to fetch" or "his tail caught in the bramble".
---

# New gag

The procedure for one gag in a game, from idea to a reviewed, tested commit.
The rules it relies on are in `CLAUDE.md` ("Code Style", game debuggability,
"Testing", "Adding a gag"); this skill is the order to do things in and the
traps already found. The worked example is the bowl stuck on his head
(`bowl.js` `stuckInBowl`, `bird.js` `rescue`, `antics.js`, `TestBowl`).

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
- **New to the place.** It adds what the game doesn't have yet. First list
  the gags of the same kind already in the game (who helps or is helped, how,
  what the comic moment is, how it ends) and make this one differ in the
  helper *and* the shape of the resolution. A gag that retells the last one
  with new props is a copy: the bowl and the bramble both ending with the bird
  tugging him free was rejected (Adam: the game must feel creative and
  dynamic). The same character again only as a deliberate callback.
- **A surprise.** Something the child won't predict the first time: help
  that comes by accident, an unexpected helper, a fix that makes it worse
  before better, or an outcome that depends on who is about this play. The
  core repeats; the surprise is what makes the first time land.
- **Built from what exists.** Reuse his moves, the creatures and the sounds
  before inventing new ones. Reuse parts, not the story: borrowing the bowl's
  `freed` face is fine; borrowing its plot is not.
- **Inspired, not copied.** New drawings, sounds and music; original audio
  only as an occasional easter egg (`CLAUDE.md`).

## 2. Design on paper, then check with Adam

Sketch two or three designs that differ in who acts and how it resolves
(not one design with variants), each with its surprise, and recommend one.
The plan's idea for the gag is a starting point, not the design: if it
repeats an existing gag's shape, say so and offer alternatives. Then, for the
chosen one, write down briefly:

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

**Checkpoint:** show Adam the designs side by side, then the chosen one's
beats, trigger and tap behaviour; build once he agrees.

## 3. Where each piece goes

The yard's map (a game with another structure, an episode, writes its own
here when it gets its first gag):

| Piece | Where |
|---|---|
| The sequence for a thing | its entry in `THINGS`, `things.js`; a thing with a lot going on gets its own file (`bowl.js`, `tree.js`, `bramble.js`) |
| A creature's part | its own file (`bird.js`); things call it (`Bird.rescue`). A creature that already wanders (`creatures.js`) is sent with an errand (`Creatures.beeTo`) |
| Reksio's own moves for this gag | `antics.js`, made from `Reksio.kit` (`blend`, `pause`, `faceTo`/`faceOff`, `actTo`/`actOff`, `settle`/`rise`, the `add` layer), added with `Reksio.addGestures`. Not `reksio.js` (the engine) or `gestures.js` (everyday moves) |
| Something on his body (bowl, caught tail) | `Reksio.wear(name, change)` from the gag's file: `change(pose, toFigure)` returns his pose with it, drawn last; `Reksio.wear(name, null)` in the gag's `finally`. A new shape to draw on him (the bowl) is a face field in `figure.js` (`FACE`, drawn in `mount`). Points on him: `Reksio.pointAt(Figure.bowlTopAt)` |
| Sounds | `sound.js`; reuse first (`grep -no "^    [a-zA-Z]*(" sound.js`) |
| Its action spot | `yard.js` `SPOTS`: every usable thing has one (the brief says so), read from the thing's `at()`, and its centre nearer its own thing than any neighbour's (the clock and the house share the wall: the clock's at the wall, the house's a step off) |
| A left-alone trigger | `yard.js` `ACTS`; a fix someone helps him out of: a `helped` field on its thing (`{ act, can, alone, times }`, as `bowl.js`), and yard.js makes the once-a-play move. A move an event starts (he looks up at the cuckoo on the hour) is an `ACTS` entry with `weight: 0, ok: () => false`, so it never picks itself, started with `startAct` from the event's hook (`glanceAtCuckoo`) |
| Something a shared part (Reksio, `debug.js`, sound) must know about the game | a hook the game sets (`Reksio.listen`, `Debug.pin`), never the game's name in the shared file (`CLAUDE.md`, "Shared parts") |
| Tunables | named constants at the top of the module, each with why |
| What must always hold | a `Debug.check` in `yard.js` `checkRules` |
| Words | the scene in `brief.yaml`, marked `original`, `inspired` or `invented` with refs to what it is based on; status in `PROJECT_PLAN.md` |

A file over 1000 lines fails `test_files_stay_small`: split by what it is
for (precedents: `bird.js`, `bowl.js` and `bramble.js` out of `things.js`,
`gestures.js` and `antics.js` out of `reksio.js`, `wet.js` out of `yard.js`), and update every caller, no shims.

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
- A left-alone gag must only wait in ways a tap can cut short: his gestures
  or `Reksio.kit.pause`, never `Clock.wait` or a `Motion` animation, until
  the gag holds him. Otherwise it plays on as he walks off (the berry toss
  hopped and snapped after a tap). Before he's held, keep it to gestures; a
  thing's own run (busy, taps wait) may use any wait.
- A gag that holds him must cover every input path, not just taps: a press
  held on him (`holdStart`, the stretch) and the weather's reactions leaked
  into the bramble. Check `Things.holding` or `free()` wherever input or the
  yard acts on him outside `command`.
- Brief text: an unquoted `: ` inside a YAML string breaks the file. Use a
  full stop.

## 5. Look at it

```sh
uv run python main.py look <world> --flags props=bowl --close \
  --before "yardGame.use('bowl')" --watch "yardGame.use('bowl', true)"
```

Read `looks/latest/sheet.jpg`, then single frames for detail
(`looks/latest/frames/`, times in `look.json`). Check that each beat reads
without words, at phone size too (`--size 844x390`). `--close` crops
round Reksio: for anything above or beside him (the cuckoo clock was cut
off), look at the full view first. Check size and placement here, before
writing tests: the first clock was too small to read and had to move. Stills can't judge
timing or sound: name the constants Adam should tune by watching
(`main.py play <world> --still`).

## 6. Tests

- **Unit** (`tests/things.test.js` and friends, fake page and clock): the
  rules. The fake Reksio (`tests/fakes.js`) answers any gesture, but a
  property or getter the gag reads (`wearing`, `pointAt`) must be added
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
  code back, see it fail, restore. Check the test reaches the bug: one that
  cut the gag at its first move never reached the stray call it was for.
- Tapping a thing by its selector clicks the middle of its box, which may be
  something drawn on top (the clock over the house). Tap a point the thing
  owns: `y.on_screen(x, y)` gives a scene point's place on the screen.
- A browser test that fails now and then under `-n 8`: run the same slice a
  few times on the committed code (`git worktree add <scratch> HEAD`) to
  tell an old timing bug from a new one; either way it's a real bug, noted
  in `PROJECT_PLAN.md` if not fixed then.

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
