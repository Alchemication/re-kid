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
noise.

In the yard (Adam, 2026-10-26: "far more superior already"), the fly and
the bee live on it too (`creatures.js`). The yard steps them from its own
tick, not through the runner, so its unit tests can drive them frame by
frame; the world runs on the creatures' clock there (`World.setup` in
`Creatures.init`). The snail is on it as well: she comes out by a puddle
that still offers a `drink` a few seconds after the rain stops, creeps
about, freezes in her shell when his nose comes close, and goes to food put
down for her (`snail-food`, a porcino) to eat it bite by bite. The worms
come up beside the puddles by the same signs. The spider stays a small
machine of its own; it hears Reksio's bark as a world noise. Gags still
reach them as before (`beeTo`, the web), and a gag's errand comes before
everything else the bee would do.

## The world state

| Field / call | What | Written by (meadow) |
|---|---|---|
| `hour` | 08–20, moves only with the day | `meadow.js` tick |
| `light` | 1 broad day to 0 night; in an eclipse down to 0.3, under a storm to 0.55, while the hour goes on (`eclipse.js`, `storm.js`) | `meadow.js` sky; the yard's `sky.js` (falling the half hour before sunset) |
| `overcast` | 0 to 1: rain coming. A creature that minds the wet goes home from 0.5 | the yard's `weather.js` (its shower's clouds) |
| `season` | the play's season, from start to bed (`summer`, `winter`); what is out depends on it (the yard's `layout.js` `IN_SEASON`: each prop and creature lists the seasons it belongs to) | the yard's `weather.js`, from `layout.js` |
| `cold` | 0 warm to 1 winter. From 0.5 the shower falls as snow, the puddles are ice (no drink, nothing to splash in), nothing soaks; read as cold, not as the season, so a frost could freeze in any season | the yard's `weather.js` (`COLD` per season) |
| `fog` | 0 to 1: creatures keep closer in it (their wanders shorter) | the yard's `weather.js` (`fog.js`: some mornings, lifting by 10:30) |
| `hero` | `{x, nose}`: where the hero is, and his nose (a shy creature darts from it) | the yard's `creatures.js` |
| `wind` | 0 still to 1 a full gust, blowing left to right (`shared/wind.js`: a breeze, now and then a gust, calm from sunset) | `weather.js` |
| `view` | `{x0, x1}`: what the child sees | `meadow.js`, from the view |
| `offer(id, kind, x, y, open)` | a thing offers something while `open()`; in the yard, each puddle a `drink` while it holds water (`weather.js`) | `meadow.js` (nectar: the tulips while open, the bluebells, the yellow spike), `rain.js` (nectar: the wild patch, not while drooping; shelter under its leaves), `spring.js` (a drink at either edge of the pool) |
| `wet(x0, x1, ms)` | rain, or wet underfoot, there and for so long | `rain.js`, under the cloud and for 45 s after; `storm.js`, the whole meadow while it rains and 45 s after |
| `noise(kind, x, reach)` | a sound, heard within `reach`. Noises are numbered: a listener keeps `World.heardUpTo` and hears each once | `car.js` (`vroom`, along its way), `spring.js` and the paddle (`splash`), `church.js` (`bell`, everywhere), `storm.js` (`thunder`, everywhere); the yard: Reksio's `bark` and `snap` |

A field joins only when something reads it. Hour and light are apart on
purpose: the day is the same length for every child, so an eclipse or a
storm may dim the light but never move the hour. What answers to the light
answers to an eclipse with no case of its own: the creatures go home and
none come (their `dark`), the tulips close and the cricket comes out
(`meadow.js`, by the light as well as the hour), the wind eases
(`weather.js`). A storm works the same way through the wet: the creatures go
home and none come while it rains, and the snail comes out, since its
shelter is wet; the wind gets up with it.

Offer kinds in use: `nectar`, `drink`, `shelter` (a creature's home to
come out of: the snail comes out where one is wet), `perch` (somewhere to
land: the yard's roof, tap, bowl, flower), `sight` (something on show a
curious creature comes to look at: Reksio's nose, the web's edge), `food`
(the yard's bowl, in the cold: the sparrows come to it in winter, shy of
his nose, so they keep off while he is at it). A new kind is a word
both the thing and the creature use; add it to this list.

## A creature

A creature is its traits, a goal, and where it is. The game makes it
(`Creature.make`) when it comes and hands it to `Ambient.add` with its
`Debug.random` stream and how to draw it; each frame the runner calls
`Creature.think` (what to go for) and `Creature.move` (go there, with a
little momentum), then the game's `draw`. The game keeps the look and the
moves that are the creature's own (`arrived`: the finch's dip to drink).

What it goes for, first that applies:

0. **An errand**: a gag set `c.errand` = {x, y}. It goes there at
   `errandSpeed` and stays until the gag clears it (the yard's bee).
1. **Fear**: it was tapped (`c.tapped`), heard a noise of a kind in its
   `startledBy` (a list, or `{ kind: range }`), or, if `shy`, the hero's
   nose came too close. Off out of sight at `flee` times its speed; or,
   with `dart`, a startled burst a short way off, then on as before (the
   fly's dodge, the bee's huff); or, with `freezeMs`, stock still at once,
   that long (a snail into her shell).
2. **Home**: its stay is over, it is out of its `hours`, the `light` is below
   its `dark`, rain coming or the wet if it minds it (`wet: 'avoid'`), or
   the dry if it likes the wet (`'likes'`). To its own `home` if made with
   one, else off out of sight (at `exitY`, or up and away).
3. **Hunger**: once `hungerMs` has passed since it last fed, something on
   offer that it `feeds` on, within its reach and half its `roam`, and dry
   if it minds the wet. It sits there `feedMs`. Whatever it is doing, a feed
   under way is finished: going home waits for it, fear doesn't.
4. **Wander**: somewhere within its reach (its `haunt`, or the view),
   `band` (scene y) and `roam`; with `pauseMs`, it hovers where it gets to;
   if `curious`, that share of its wanders go to something on show.

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
