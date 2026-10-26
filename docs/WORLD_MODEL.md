# The world model

How a scene's ambient life knows about the rest of the scene: the creatures
that go about their own business between the encounters. Why it exists, and
what it is not for, is in `docs/DECISIONS.md` (Scope: "A world model, tried
in the meadow").

It is four shared parts. The first three are plain rules with no drawing
and no clock, tested in node (`worlds/krtek/games/meadow/tests/creature.test.js`,
`wind.test.js`):

- `shared/world.js` (`World`): the world state. Parts write their own piece
  of it; creatures read it and never reach into another part.
- `shared/creature.js` (`Creature`): how a creature decides what to do, and
  moves there.
- `shared/wind.js` (`Wind`): the breeze and its gusts, plain rules too;
  each game's weather steps it and writes its level here. The yard's
  `weather.js` uses it as well.
- `shared/ambient.js` (`Ambient`): runs them, a frame at a time on the
  Clock: each thinks and moves, the game draws it, and takes it away once
  it is gone. Goals taken up go in the trace.

Used in the meadow by the butterflies and the snail (`critters.js`), the
bullfinch and the dragonflies (`spring.js`). The frog sits still, so it
needs no steering: it reads the world's noises itself. The fish only makes
noise. The yard's creatures are still wired by hand.

## The world state

| Field / call | What | Written by (meadow) |
|---|---|---|
| `hour` | 08–20, moves only with the day | `meadow.js` tick |
| `light` | 1 broad day to 0 night | `meadow.js` sky |
| `wind` | 0 still to 1 a full gust, blowing left to right (`shared/wind.js`: a breeze, now and then a gust, calm from sunset) | `weather.js` |
| `view` | `{x0, x1}`: what the child sees | `meadow.js`, from the view |
| `offer(id, kind, x, y, open)` | a thing offers something while `open()` | `meadow.js` (nectar: the tulips while open, the bluebells, the yellow spike), `rain.js` (nectar: the wild patch, not while drooping; shelter under its leaves), `spring.js` (a drink at either edge of the pool) |
| `wet(x0, x1, ms)` | rain, or wet underfoot, there and for so long | `rain.js`, under the cloud and for 45 s after |
| `noise(kind, x, reach)` | a sound, heard within `reach` | `car.js` (`vroom`, along its way), `spring.js` and the paddle (`splash`), `church.js` (`bell`, everywhere) |

A field joins only when something reads it. Hour and light are apart on
purpose: the day is the same length for every child, so an eclipse or a
storm may dim the light but never move the hour, and creatures answer to the
light.

Offer kinds in use: `nectar`, `drink`, `shelter` (a creature's home to
come out of: the snail comes out where one is wet). A new kind is a word
both the thing and the creature use; add it to this list.

## A creature

A creature is its traits, a goal, and where it is. The game makes it
(`Creature.make`) when it comes and hands it to `Ambient.add` with its
`Debug.random` stream and how to draw it; each frame the runner calls
`Creature.think` (what to go for) and `Creature.move` (go there, with a
little momentum), then the game's `draw`. The game keeps the look and the
moves that are the creature's own (`arrived`: the finch's dip to drink).

What it goes for, first that applies:

1. **Fear**: it was tapped (`c.tapped`), or heard a noise of a kind in its
   `startledBy`. Off out of sight at `flee` times its speed, or, with
   `freezeMs`, still that long (the snail into its shell).
2. **Home**: its stay is over, it is out of its `hours`, the `light` is below
   its `dark`, or the wet if it minds it (`wet: 'avoid'`), or the dry if it
   likes the wet (`'likes'`). To its own `home` if made with one, else off
   out of sight.
3. **Hunger**: once `hungerMs` has passed since it last fed, something on
   offer that it `feeds` on, within its reach and half its `roam`, and dry
   if it minds the wet. It sits there `feedMs`. Whatever it is doing, a feed
   under way is finished: going home waits for it, fear doesn't.
4. **Wander**: somewhere within its reach (its `haunt`, or the view),
   `band` (scene y) and `roam`; with `pauseMs`, it hovers where it gets to.

Whatever it goes for, the wind pushes it downwind as much as its `blown`
(0 to 1; the butterflies 0.8, the dragonflies 0.3, the finch 0.15), except
while it feeds.

## Adding one

- Its traits and drawing go in the game's file for it, with a comment for
  each trait's value, as `critters.js` has for the butterfly.
- What may touch the hero comes from that world's films, not a rule for all
  worlds (Adam, 2026-10-25). In the yard nothing new lands on Reksio's nose.
- A relationship that is one gag (the yard's spider and fly) stays code in
  the gag. Encounters stay hand-made.
- A thing that should matter to creatures offers it, or makes its noise,
  from its own file.
