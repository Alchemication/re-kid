// The ice, in a winter play: the puddles frozen over (weather.js). Now and
// then, and rarely, so it stays a surprise (Adam, 2026-10-27), whoever steps
// onto a patch at a trot has his feet go from under him: Reksio plonks onto
// his bottom, a dazed blink, and up again carefully (antics.js slipped); the
// boy flails, sits down hard, and laughs (boy.js slipped). The walk waits
// for him and then carries on (slipOn, in each), so a slip can come in the
// middle of anything that walks them, a gag's fetch as much as a stroll.

/* global Clock, Debug, Layout, Weather, Sound, Reksio, Boy */
/* exported Ice */
const Ice = (() => {
  const ODDS = 0.3 // stepping onto a patch at a trot, he slips this often…
  const GAP_MS = 120000 // …and nobody slips twice within two minutes
  const FIRST_MS = 30000 // nor in the first half minute of a play
  const MIN_SPEED = 120 // only at a trot or a run: walking carefully (pushing a snowball), he keeps his feet
  const ON = 0.8 // on a patch: within this much of its half-width of its middle
  const BOY_BUMP_MS = 380 // the boy lands on his bottom this long into his slip

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

  const reksio = rule('reksio', () => Reksio.slipped())
  const boy = rule('boy', () => {
    Clock.after(BOY_BUMP_MS, () => Sound.plop()) // bump
    return Boy.slipped()
  })
  Reksio.slipOn(reksio)
  Boy.slipOn(boy)

  return { reksio, boy }
})()
