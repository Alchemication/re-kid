// Copied from shared/ambient.js by `main.py shared` — edit that, not this.
// Shared by every game: runs a scene's ambient creatures (docs/WORLD_MODEL.md).
// Each frame on the Clock, every creature added here thinks and moves
// (creature.js, on world.js), and then the game draws it where it is; when
// it is gone (home, or fled out of sight) the game's gone() takes it away.
// A goal it takes up (feeding, freezing, home, fleeing) goes in the trace.
//
// The game keeps what is its own: the drawing, the moves the creature has
// besides going somewhere (a finch's dip to drink: arrived()), and when one
// comes. Its random stream is the game's, one per creature kind.

/* global Clock, Creature, Debug, World */
/* exported Ambient */
const Ambient = (() => {
  const MAX_DT = 100 // a slow frame moves it at most this far in time: no leaps across the scene
  const NOTED = ['feed', 'freeze', 'home', 'flee']
  const all = []
  let last = null

  function frame() {
    const t = Clock.now()
    const dt = Math.min(MAX_DT, t - last)
    last = t
    for (const a of [...all]) {
      const was = a.c.goal?.kind
      const goal = Creature.think(a.c, World, t, a.rnd)
      if (goal.kind !== was && NOTED.includes(goal.kind)) Debug.trace(a.name, { id: a.id, [goal.kind]: true })
      const moved = Creature.move(a.c, World, dt, t, a.rnd)
      if (moved === 'gone') {
        all.splice(all.indexOf(a), 1)
        a.gone(a.c)
        continue
      }
      if (moved === 'arrived') a.arrived(a.c, a.c.goal?.kind)
      a.draw(a.c, dt)
    }
    if (all.length) Clock.after(0, frame)
    else last = null
  }

  /**
   * Run creature c (Creature.make), named `name` in the trace as `id`, on
   * random stream rnd: draw(c, dt) each frame, arrived(c, kind) when it gets
   * where it was going, gone(c) once it is gone.
   */
  function add(c, { name, id, rnd, draw, arrived = () => {}, gone = () => {} }) {
    all.push({ c, name, id, rnd, draw, arrived, gone })
    if (last === null) {
      last = Clock.now()
      Clock.after(0, frame)
    }
  }

  /** How many of this name are out. */
  const count = (name) => all.filter((a) => a.name === name).length

  return { add, count }
})()
