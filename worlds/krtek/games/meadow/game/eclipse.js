// The eclipse, as plain rules with no drawing and no clock of their own
// (invented: Adam's pick, 2026-10-26). Some plays, once, around midday, the
// moon slides over the sun: the light falls to about dusk for a while, never
// to night, and comes back. The hour goes on as ever (the day is the same
// length for every child); only the light dips, and everything that answers
// to the light (the creatures, the tulips, the cricket, the wind) behaves as
// at dusk until it comes back. meadow.js draws it.

/* exported Eclipse */
const Eclipse = (() => {
  const CHANCE = 0.25 // of plays that have one
  const HOURS = [11, 15] // it starts at an hour between these
  const IN_MS = 15000 // the moon slides over the sun...
  const HOLD_MS = 35000 // ...stays over it this long...
  const OUT_MS = 15000 // ...and slides off
  const DUSK_HOUR = 19.35 // at its fullest, the sky is drawn as at this hour: about dusk
  const DIM = 0.7 // at its fullest, the light is down by this much: to 0.3, about dusk, never night

  const clamp = (v) => Math.max(0, Math.min(1, v))
  const ease = (t) => t * t * (3 - 2 * t)

  /** This play's: the hour it starts at, or null for none. Both drawn either way, so the stream stays put. */
  function plan(random) {
    const has = random() < CHANCE
    const at = HOURS[0] + random() * (HOURS[1] - HOURS[0])
    return has ? at : null
  }

  /** How far the moon covers the sun, `ms` after it began: 0 to 1 and back to 0. */
  function cover(ms) {
    if (ms < 0) return 0
    if (ms < IN_MS) return ease(ms / IN_MS)
    if (ms < IN_MS + HOLD_MS) return 1
    return ease(clamp(1 - (ms - IN_MS - HOLD_MS) / OUT_MS))
  }

  /** Where the moon's disc is across the sun, -1 (coming in, off its left) through 0 (over it) to 1 (gone off its right). */
  function across(ms) {
    if (ms < IN_MS) return cover(ms) - 1
    if (ms < IN_MS + HOLD_MS) return 0
    return 1 - cover(ms)
  }

  /** The hour the sky is drawn as at hour h, the moon covering this much: later, towards dusk. */
  const skyHour = (h, k) => h + (DUSK_HOUR - h) * k

  /** The light, at most, with the moon covering this much: it falls as the moon comes over, not all at once at the
   * end (the sky's dusk orange is bright, so the sky's colour alone keeps the light up until the last moment). */
  const light = (k) => 1 - DIM * k

  /** Is it over, `ms` after it began? */
  const over = (ms) => ms >= IN_MS + HOLD_MS + OUT_MS

  return { plan, cover, across, skyHour, light, over, IN_MS, HOLD_MS, OUT_MS }
})()
