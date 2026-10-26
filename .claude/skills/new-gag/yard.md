# The yard (Reksio)

`new-gag`'s map for Reksio's yard: where each piece goes, the traps only
the yard has hit, how to look at a gag, and its test tables. The procedure
is `SKILL.md`.

## Where each piece goes

| Piece | Where |
|---|---|
| The sequence for a thing | its entry in `THINGS`, `things.js`; a thing with a lot going on gets its own file (`bowl.js`, `tree.js`, `bramble.js`) |
| A creature's part | its own file (`bird.js`); things call it (`Bird.rescue`). A creature that already wanders (`creatures.js`) is sent with an errand (`Creatures.beeTo`) |
| Reksio's own moves for this gag | `antics.js`, made from `Reksio.kit` (`blend`, `pause`, `faceTo`/`faceOff`, `actTo`/`actOff`, `settle`/`rise`, the `add` layer), added with `Reksio.addGestures`. Not `reksio.js` (the engine) or `gestures.js` (everyday moves) |
| Something on his body (bowl, caught tail) | `Reksio.wear(name, change)` from the gag's file: `change(pose, toFigure)` returns his pose with it, drawn last; `Reksio.wear(name, null)` in the gag's `finally`. A new shape to draw on him (the bowl) is a face field in `figure.js` (`FACE`, drawn in `mount`). Points on him: `Reksio.pointAt(Figure.bowlTopAt)` |
| Sounds | `sound.js`; reuse first (`grep -no "^    [a-zA-Z]*(" sound.js`) |
| Its action spot | `spots.js` `SPOTS`: every usable thing has one (the brief says so), its centre nearer its own thing than any neighbour's. Two things that would crowd one spot are better as one thing (the cuckoo clock became the house's: it hangs inside, through the window) |
| A left-alone trigger | `yard.js` `ACTS`; a fix someone helps him out of: a `helped` field on its thing (`{ act, can, alone, times }`, as `bowl.js`), and yard.js makes the once-a-play move. A move an event starts (he looks up at the cuckoo on the hour) is an `ACTS` entry with `weight: 0, ok: () => false`, so it never picks itself, started with `startAct` from the event's hook (`glanceAtCuckoo`) |
| Something a shared part (Reksio, `debug.js`, sound) must know about the game | a hook the game sets (`Reksio.listen`, `Debug.pin`), never the game's name in the shared file (`CLAUDE.md`, "Shared parts") |
| Tunables | named constants at the top of the module, each with why |
| What must always hold | a `Debug.check` in `yard.js` `checkRules` |
| Words | the scene in `brief.yaml`, marked `original`, `inspired` or `invented` with refs to what it is based on; status in `docs/PROJECT_PLAN.md` |

## Traps the yard has hit

- Two gestures blending the same number (`add.tilt`, `add.dy`) cut each other
  short: the newer resolves the older at once. A bark in the bowl during the
  bird's tug popped the bowl off at once. Give concurrent moves different
  layers (a bark moves only the face).
- A left-alone gag must only wait in ways a tap can cut short: his gestures
  or `Reksio.kit.pause`, never `Clock.wait` or a `Motion` animation, until
  the gag holds him. Otherwise it plays on as he walks off (the berry toss
  hopped and snapped after a tap). Before he's held, keep it to gestures; a
  thing's own run (busy, taps wait) may use any wait.
- A gag that holds him must cover every input path, not just taps: a press
  held on him (`holdStart`, the stretch) and the weather's reactions leaked
  into the bramble. Check `Things.holding` or `free()` wherever input or the
  yard acts on him outside `command`.
- Every file of moves or things must be loaded by a unit test, at least to
  check its moves end (`reksio.test.js` loads `antics.js`). `antics.js` had
  none, and a constant using `k` above the line defining it stopped every
  gag in the file; only the slow browser suite would have caught it.

## Look at it

```sh
uv run python main.py look <world> --flags props=bowl --close \
  --before "yardGame.use('bowl')" --watch "yardGame.use('bowl', true)"
```

For a pose, a walk or a face rather than a gag, `look` is too slow (about
one frame per quarter second, so a stride is missed): draw the poses
straight from `figure.js` (and `Gait.stride` for a step) onto a scratch
page with `Figure.mount`, a row per pose or per point of the stride, and
screenshot it with Playwright (`channel="chrome"`). Put film frames beside
it to compare.

Read `looks/latest/sheet.jpg`, then single frames for detail
(`looks/latest/frames/`, times in `look.json`). `--close` crops round
Reksio: for anything above or beside him (the cuckoo clock was cut off),
look at the full view first; phone size is `--size 844x390`.

## Tests

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
