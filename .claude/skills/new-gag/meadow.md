# The meadow (Krtek)

`new-gag`'s map for Krtek's meadow: how its encounters run, where each
piece goes, how to look at one, and its test tables. The procedure is
`SKILL.md`; ambient life (the butterflies, the spring's life, the snail) is
`ambient.md`.

## How encounters run, and where each piece goes

The meadow is one screen, so its encounters arrive one at a time at their
own hours and wait (`things.js`): each is a chain of steps that plays on
when he's left alone, a tap on it hurries it to its next step, and a tap
elsewhere waits for the step to end (as in the yard; meadow.js `waits`),
then cuts it short to be picked up at the next step later. Keep each step
4–8 s, so no tap waits long.

| Piece | Where |
|---|---|
| An encounter | its own file (`egg.js`, `poles.js`, `paint.js`, `car.js`, `umbrella.js`; one with `instead` and `chance` comes in that share of plays in place of another, as the storm for the rain cloud) that registers with `Things.add({ name, offer, appear, steps, restore, night, detail, again? })`; `offer` is `help`, `helped` or `discover` (one of each comes a play). Each step is `async (alive) => …` and returns as soon as `alive()` is false after an await. Steps must be safe to run again from the start after a cut: guard what is already done (`if (egg.chick) return`) and bring back whoever it needs (the paint's fox comes back first) |
| What a cut leaves | `restore()`, called at once when the chain is cut (the meadow's `run` onCut, before he is settled): visitors home, a thing in his hands put down by him, everything it was animating cancelled and left where it ends. Store a thing's end position before animating to it, so a cut leaves it there |
| Visitors (mouse, hare, hen, fox, bullfinch…) | drawn in `friends.js`; an encounter keeps its own `Friends.troupe()` and calls them with `cast.call(kind, x, face)` from out of sight (`Friends.offscreen(dir, x)`; `{ hole }` for one that lives in a hole, `{ born }` for the chick), sends them home with `cast.dismiss(f)` (they walk off), all in `restore` with `cast.dismissAll()`, and at bedtime `dismissAll(true)` (at once). Those who only bring or fetch its things (the tins' porters, the poles' birds) are a troupe of their own, not its `detail().cast` (a rule checks none of that is left once he is free) |
| His moves | `mole.js`: `goTo` (via `Things.meadow`), `walkTo`, `carry`/`wear`, `lean`, `knock`, `wobble`, `cheer`, `perch`, `glide`, `paint`/`dots`. New moves there, made with `Motion.endAt`, cut by `relax()` |
| Drawing helpers | `Things.meadow.el` (the SVG helper), the layers in `index.html` (`#things` behind him, `#mole-out` him on the grass, `#friends` in front, `#far-things` up the hill) |
| A tap on it | `data-thing="<name>"` on what can be tapped; remove it when the thing is done (unless it has `again`), so it stops taking taps meant for what is under it |
| What it does once done | an optional `again` step (the car's ride) |
| What ambient life should answer | its offers, wet places and noises, from its own file (`ambient.md`) |
| Sounds | `sound.js` (the meadow's); reuse first |
| What must always hold | a `Debug.check` in `meadow.js` `checkRules` |
| Trying it | `?soon&props=<name>` (it arrives as he wakes); `?day=60` for the evening |
| Words | its scene in `brief.yaml` (after a film's scene: `episode:<catalogue id>` among its refs), and the plan |

## Traps the meadow has hit

- A tap mid-step waits for the step to end (meadow.js `waits`), so a test
  that must cut a step in the middle (the umbrella in his hands) does
  `stop` (an arrow let go) instead; bedtime cuts mid-step too.
- An encounter that runs on world time (the storm's rain) must handle the
  world moving on without it: the rain stopping before the friends come,
  or before he can be squeezed out into it.
- Those who wait to be picked (the egg's hare and hen, the storm's friends)
  are the meadow's, not a troupe's cast: a free mole may have them about,
  and a cut leaves them where they are.

- A game object made with a top-level `const` (`meadowGame`) is not on
  `window`: wait for it in tests with `typeof meadowGame !== 'undefined'`.
- An answer that needs a creature in a certain state (the frog on its lily
  pad, for the paddle that makes it plop in) must come whenever that state
  holds, not on its turn in a rotation (`rounds`): by its turn, other taps
  have usually changed the state, and it almost never shows. Check it in
  the first few taps of a seeded play.

## Look at it

`main.py look krtek meadow` opens a seeded, still play, wakes him, and
photographs what `--watch` starts until he is free again; `--close` cuts
around him. A tap is an intent: `--watch "meadowGame.perform('use egg')"`
(with `--flags "soon&props=egg"`), `"meadowGame.perform('paddle')"`. To see
the answers a thing varies through, repeat `--before` with the same intent:
each is played to the end first. `look.json` has the trace (`sniffs`,
`paddles`: which answer came). A creature's own doing doesn't make him busy:
photograph it with `--for SECONDS`.

## Tests

- **The meadow** (`tests/test_meadow_browser.py`): add the encounter to
  `ENCOUNTERS` with its number of steps, and it gets: run to the end, cut
  at every step then picked up, hurried by taps, a tap on him that hurries
  rather than cuts, and bedtime in the middle. Add a class of its own for
  what is particular to it (`TestMeadowCar`: another ride, a cut mid-ride).
