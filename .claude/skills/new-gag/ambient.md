# Ambient life

The `new-gag` path for a creature that goes about its own business (the
meadow's butterflies, the spring's finch and dragonflies, the snail), and,
as they come, the world's own events (wind, a storm, an eclipse). It runs on
the world model; read `docs/WORLD_MODEL.md` first. The worked example is the
snail (`critters.js` `snailComes`, `rain.js` its shelter and wet grass,
`TestMeadowSnail`).

In the yard, the fly and the bee are on the world model (`creatures.js`,
stepped from the yard's own tick, so its unit tests drive them); a new
yard creature follows them. The spider, the snail and the worms are still
machines of their own.

## 1. Design, on paper

No beats. Instead, in a few lines each, checked with Adam as a gag would be:

- **Is it from the films, or invented?** Look in `worlds/<id>/world.yaml`
  before drawing; say which in the brief. What it may do with the hero
  (land on him, follow him) comes from that world's films (Adam,
  2026-10-25), not a rule for every world.
- **How it comes, and how it leaves.** From out of sight, or out of its
  own place (the snail up out of the grass, the mouse from her hole): never
  appearing or vanishing in view. Its own place is a `home` (its shelter);
  without one it leaves off the nearer edge.
- **What brings it.** The hour, the light, the wet, or something on offer.
  The better ones come because of something else in the scene (the finch
  for the pool's drink, the snail for the wet grass after the cloud): that
  is what makes the world read as alive.
- **What it goes for, what scares it, what it ignores.** Its traits. Pick
  the noises it minds with care: a butterfly that minded his words fled
  every "ooh" a toddler's taps set off.
- **What a tap does.** An answer at once (it flees, freezes, plops in), and
  the hero looks at it if he is free.
- **How often, how many.** Quiet by default (`docs/DESIGN_PRINCIPLES.md`:
  never busy).

## 2. Where each piece goes (the meadow)

| Piece | Where |
|---|---|
| The creature | its traits (a comment on each value) and drawing in `critters.js` (over the meadow) or `spring.js` (the pool); made with `Creature.make`, run with `Ambient.add` (`draw`, `arrived` for a move of its own, `gone`) |
| When it comes | its file: a `Clock` timer, or a look every few seconds at the world (the snail: a wet shelter) |
| Its random draws | its own `Debug.random` stream, so it shifts nothing else |
| What the world should know | the things it involves offer (`World.offer`), wet places (`World.wet`) and noises (`World.noise`), each from its own file. A new offer kind or noise goes in `docs/WORLD_MODEL.md` |
| A new trait or rule | `shared/creature.js` (generic, never a creature's name), then `main.py shared`; its test in `tests/creature.test.js` |
| A tap | an `INTENTS` entry and `CRITTER_TAPS` in `meadow.js`, `data-critter="<name>"` on its drawing with a transparent target circle, and its intent in `waits` (a tap on it never waits for an encounter) |
| Trying it | `?critters=<name>` (layout.js, README): it comes at once, its hours opened (an asked-for one may come before them), whatever it needs set up (the snail's wet grass) |
| Words | its part in `brief.yaml`, `docs/WORLD_MODEL.md` (who uses it), the plan |

## 3. Traps already hit

- **A beeline across the scene.** Hungry, a butterfly flew 16 s in a straight
  line to the only open flower: food is looked for within half its `roam`.
- **Hidden behind a thing.** The snail among the wild flowers' stems: taps
  went to the flowers (the rain encounter). A creature behind something
  wins a tap near its middle (`critterAt` in `meadow.js`); a browser test
  must click it for real, not `do('tap …')`.
- **Too small to find.** At the butterfly's size the snail was invisible to
  a toddler; draw it big enough to spot and tap, and look at it at phone size.
- **Asked for, then gone at once.** `?critters=now` comes at 08:00, before
  the butterflies' hours, and turned straight round.
- **Lingering.** The finch wandered 10 s after drinking: a short `stayMs`, since
  a feed under way always finishes.
- **Complexity.** `think` and `move` grow a branch per trait: split them
  (eslint warnings are the hotspot list: add none).
- **A timed flag counted from the wrong moment.** `?wind=gust` first
  counted its three seconds from the page loading, so it blew before he
  woke. Something timed from waking is asked for in the meadow's `wake()`.
- **Lost against the background.** White dandelion seeds against the pale
  sky were invisible: look at a photo of it against what it actually
  crosses, and draw it bigger and outlined if it must be seen.
- **A CSS variable on the page root restyles the whole page.** The wind's
  `--sway` set every tenth of a degree cost a storm about 5% of a phone's
  main thread; set it in half-degree steps. When perf sits at its edge,
  switch one part off at a time and measure (a probe at the perf test's
  settings) before guessing.
- **The wind changes everyone's timing.** A butterfly coming in upwind took
  longer to reach the view, and a test that waited a fixed 1.5 s clicked
  off-screen. Browser tests wait for a state (it is in view), never a time.

## 4. Look, test, review

- **Look:** a Playwright probe (`channel="chrome"`) sampling where it is
  every second, the trace (`Ambient` notes each goal), and photos cropped
  round it. Watch it come, do its thing, and leave; then what makes it react.
- **Unit:** a new rule in `creature.test.js`, frame-stepped on a pretend clock.
- **Browser:** a class in `test_meadow_browser.py`: it comes when asked, a
  tap answers and the hero ends free and settled; it doesn't come without
  its cause (no rain, no snail); one reaction through the world (the frog at
  his paddle). Then `SKILL.md` sections 8–9: review, the whole suite once,
  perf (it runs every frame), report and retro.
