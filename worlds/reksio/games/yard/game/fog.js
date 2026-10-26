// The morning fog, as plain rules with no drawing and no clock of their own
// (invented: Adam's pick, 2026-10-26; painted after the mist round the
// crags in Reksio taternik, 4:00-4:40, a pale wash). Some plays the yard
// wakes in fog; it starts to lift mid-morning and is gone well before noon.
// weather.js draws it and tells the world (world.js: `fog`), where the
// creatures keep closer in it; Reksio sniffs his way about (yard.js).

/* exported Fog */
const Fog = (() => {
  const CHANCE = 0.3 // of plays that wake in fog
  const THICK = [0.65, 0.9] // how thick, at its thickest
  const LIFTS = [9, 10.5] // it starts to lift at the first hour, and is gone by the second

  const clamp01 = (v) => Math.max(0, Math.min(1, v))
  const ease = (t) => t * t * (3 - 2 * t)

  /**
   * This play's fog: { thick }, or null for none. `forced` (?fog=1 or 0)
   * overrides the draw; both draws are made either way, so the stream stays put.
   */
  function plan(random, forced = null) {
    const has = random() < CHANCE
    const thick = THICK[0] + random() * (THICK[1] - THICK[0])
    return (forced ?? has) ? { thick } : null
  }

  /** How thick it is at hour h: 0 none, up to its thickest. */
  function level(p, h) {
    if (!p) return 0
    return p.thick * (1 - ease(clamp01((h - LIFTS[0]) / (LIFTS[1] - LIFTS[0]))))
  }

  return { plan, level, LIFTS }
})()
