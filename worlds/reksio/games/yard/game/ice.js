// The ice, in a winter play: the puddles frozen over (weather.js). Now and
// then, and rarely, so it stays a surprise (Adam, 2026-10-27), whoever steps
// onto a patch at a trot has his feet go from under him: Reksio plonks onto
// his bottom, a dazed blink, and up again carefully (antics.js slipped); the
// boy flails, sits down hard, and laughs (boy.js slipped). If Reksio goes
// down near the boy and the boy is free, he hurries over with a worried
// look, holds out his hands, and pulls him up; then they laugh about it
// together (Adam, 2026-10-30: help first, then a laugh they share, so it
// never teaches laughing at someone who fell). The walk waits
// for him and then carries on (slipOn, in each), so a slip can come in the
// middle of anything that walks them, a gag's fetch as much as a stroll.

/* global Clock, Debug, Layout, Weather, Sound, Reksio, Boy, Snowman */
/* exported Ice */
const Ice = (() => {
  const ODDS = 0.3 // stepping onto a patch at a trot, he slips this often…
  const GAP_MS = 120000 // …and nobody slips twice within two minutes
  const FIRST_MS = 30000 // nor in the first half minute of a play
  const MIN_SPEED = 120 // only at a trot or a run: walking carefully (pushing a snowball), he keeps his feet
  const ON = 0.8 // on a patch: within this much of its half-width of its middle
  const BOY_BUMP_MS = 380 // the boy lands on his bottom this long into his slip
  const HELP_FROM = 600 // the boy comes to help him up only from this near: in view of it
  const HAND_GAP = 135 // the boy stands this far from him to pull him up: past his legs, stuck out in front as he sits, at arm's length
  const HURRY = 260 // the boy's hurry over (units/s): faster than his walk
  const HELP_WAIT_MS = 5000 // paw up, he waits this long for the boy's hands, then gets up himself

  const random = Debug.random('ice') // this part's own random stream (debug.js): drawn only as someone steps onto a patch
  let lastAt = -Infinity

  /** The frozen patch at x, or -1. */
  const patchAt = (x) => (Weather.frozen ? Layout.puddles.findIndex((p) => Math.abs(p.x - x) < p.rx * ON) : -1)

  /** A walker's rule (slipOn): at x at this speed, does he slip here? His
   * slip if so. A draw only as he steps onto a patch, not on every step on it. */
  function rule(who, slip) {
    let on = -1
    return (x, speed) => {
      const i = patchAt(x)
      const stepped = i >= 0 && i !== on
      on = i
      if (!stepped || speed < MIN_SPEED) return null
      const now = Clock.now()
      if (now < FIRST_MS || now - lastAt < GAP_MS || random() >= ODDS) return null
      lastAt = now
      Debug.trace('slips on the ice', { who, x: Math.round(x) })
      return slip
    }
  }

  /** Reksio down on the ice: helped up by the boy if he's near and free,
   * and then they laugh together; otherwise up by himself. */
  async function reksioSlips() {
    if (!(Snowman.boyFree && Math.abs(Boy.x - Reksio.x) < HELP_FROM)) return Reksio.slipped()
    Debug.trace('boy helps him up')
    let ready = null // Reksio's paw is up
    let pull = null // the boy pulls (true), or won't (false)
    const pawUp = new Promise((r) => (ready = r))
    const pulled = new Promise((r) => (pull = r))
    let down = true
    Snowman.kit.boyDo('helps him up', () => helpUp(() => down, pawUp, pull))
    try {
      const up = await Reksio.slipped(() => {
        ready()
        Clock.after(HELP_WAIT_MS, () => pull(false))
        return pulled
      })
      down = false
      if (up) await Reksio.laughAlong()
    } finally {
      down = false
      ready()
      pull(false)
    }
  }

  /** The boy: over to him in a hurry, a worried look, hands out low; once
   * his paw is up, a pull, and he laughs. Not if Reksio is up by then. */
  async function helpUp(down, pawUp, pull) {
    try {
      const side = Math.sign(Boy.x - Reksio.x) || 1
      if (!(await Boy.walkTo(Reksio.x + side * HAND_GAP, { speed: HURRY })) || !down()) return
      Boy.face(-side)
      Reksio.face(side) // round to him
      await Boy.settle('helpUp', 350)
      await pawUp
      if (!down()) return
      pull(true)
      await Boy.stand(450)
      await Boy.laugh(4)
    } finally {
      pull(false)
      if (!Boy.walking) await Boy.stand(300)
    }
  }

  const reksio = rule('reksio', reksioSlips)
  const boy = rule('boy', () => {
    Clock.after(BOY_BUMP_MS, () => Sound.bump())
    return Boy.slipped()
  })
  Reksio.slipOn(reksio)
  Boy.slipOn(boy)

  return { reksio, boy, reksioSlips }
})()
