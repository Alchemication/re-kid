// Reksio and the sparrows at his bowl (a winter play; after Reksiowa zima,
// where birds try to feed from Reksio's bowl: Adam's pick, 2026-10-26). Left
// alone, now and then, he notices them pecking at it and goes over to guard
// it. Up they flutter; he stands by it, looks about, and turns to go, and the
// moment his back is turned they are down at it again (the laugh: a toddler
// sees it coming before he does). Round he turns, and up they go. After two
// or three times he gives in: an aww, a step back, and he sits to watch them
// eat. Gentle, as the episode is: he never chases them.
//
// The sparrows do all of their part by the world model (creatures.js: shy of
// his nose, they dart from it and come back once it's away): standing close
// facing the bowl his nose scares them; turned away it is far enough for them
// to come back. This file is his part only: where he stands and when he
// turns. Every wait is his own gesture or the kit's pause, so a tap cuts it
// short at any point.

/* global Bowl, Creatures, Debug, Reksio */
/* exported Sparrows */
const Sparrows = (() => {
  const GUARD_FROM = 130 // he stands this far from the bowl: facing it, his nose scares them; turned away, it doesn't
  const SEES_FROM = 900 // he notices them pecking at his bowl from this near
  const TURNS = [2, 3] // how many times he turns away and back before he gives in
  const LOOK_MS = 900 // guarding, he watches the bowl this long…
  const AWAY_MS = 3000 // …turned away this long: time for them to come back down behind him
  const WATCH_FROM = 320 // giving in, he sits this far off to watch them eat
  const WATCH_MS = 5000
  const random = Debug.random('sparrows-gag')
  let sharedWith = false // he has given in to this flock: he leaves it be until it has gone

  const pecking = () => Creatures.sparrows.some((s) => s.pecking)
  const about = () => Creatures.sparrows.length > 0

  /** Are they pecking at his bowl, near enough for him to notice, and not a flock he has given in to? */
  function ok() {
    if (!about()) sharedWith = false
    return !sharedWith && pecking() && Math.abs(Bowl.x - Reksio.x) < SEES_FROM
  }

  /** Guard the bowl, turn away and back as they come and go, and give in. A tap (relax) or the flock gone ends it. */
  async function guard() {
    const mine = Reksio.kit.relaxes
    const on = () => Reksio.kit.relaxes === mine && about() // not cut short, and they are still about
    const b = Bowl.x
    const side = Reksio.x >= b ? 1 : -1 // he guards from the side he comes from
    Reksio.kit.perk('both', 600) // he has seen them
    if (!(await Reksio.walkTo(b + side * GUARD_FROM)) || !on()) return
    Reksio.face(-side)
    Debug.trace('guards the bowl', {})
    const turns = Math.round(TURNS[0] + random() * (TURNS[1] - TURNS[0]))
    for (let i = 0; i < turns; i++) {
      await Reksio.watch(() => ({ x: b, y: 760 }), LOOK_MS) // guarding: eyes on the bowl
      if (!on()) return
      Reksio.face(side) // he turns to go…
      await Reksio.kit.pause(AWAY_MS) // …and down they come behind him
      if (!on()) return
      Reksio.face(-side) // round he turns: up they go
      Reksio.kit.perk('both', 600)
      await Reksio.kit.pause(400)
      if (!on()) return
    }
    sharedWith = true
    Debug.trace('shares the bowl', { turns })
    if (!(await Reksio.walkTo(b + side * WATCH_FROM)) || !on()) return
    Reksio.face(-side)
    await Reksio.aww()
    if (on()) await Reksio.sit(WATCH_MS) // and watches them eat
  }

  return { ok, guard }
})()
