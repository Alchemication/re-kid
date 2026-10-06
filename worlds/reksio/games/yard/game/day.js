// The day in the yard, as plain rules with no drawing and no clock of its own
// (yard.js tells it what happened and when): each new thing Reksio does is a
// step of the sunset; after enough of them, or after a long play, the sun has
// set (dusk); once the moon is up it's bedtime; bed ends the play (night).
// Nothing is a goal: every thing counts the same, and only the first time.

/* exported Day */
const Day = (() => {
  const MAX_MS = 10 * 60000 // the sun sets anyway after this long, so a play that keeps to one thing still ends
  const BED = 'doghouse' // what he wants at dusk

  /**
   * A new day, begun at `startedAt` (ms, the caller's clock).
   * @param {number} startedAt
   * @param {{things: number, maxMs?: number}} options things: new things done
   *   before the sun sets (one sunset step each); maxMs: how long a day lasts at most.
   */
  function start(startedAt, { things, maxMs = MAX_MS }) {
    const done = new Set()
    let phase = 'day' // day → dusk → bedtime → night

    return {
      /** He did `name`. first: never before; step: the sunset step it brings
       * (null once the sun has set); dusk: the sun sets now. */
      did(name) {
        const first = !done.has(name)
        done.add(name)
        if (!first || phase !== 'day') return { first, step: null, dusk: false }
        const dusk = done.size >= things
        if (dusk) phase = 'dusk'
        return { first, step: Math.min(done.size, things), dusk }
      },
      /** Time passing: true if the sun sets now because the day has run long. */
      tick(now) {
        if (phase !== 'day' || now - startedAt < maxMs) return false
        phase = 'dusk'
        return true
      },
      /** The moon is up: bedtime. */
      moonUp() {
        if (phase === 'dusk') phase = 'bedtime'
      },
      /** Off to bed; false (and nothing changes) unless the sun has set. */
      bed() {
        if (phase !== 'dusk' && phase !== 'bedtime') return false
        phase = 'night'
        return true
      },
      /** Would he like to do `name`? In the day, anything not done yet; from
       * dusk, only bed; at night, nothing. */
      wants(name) {
        if (phase === 'day') return !done.has(name)
        return phase !== 'night' && name === BED
      },
      get phase() { return phase },
      get dusk() { return phase !== 'day' },
      get bedtime() { return phase === 'bedtime' },
      get ended() { return phase === 'night' },
      get count() { return done.size },
      get done() { return [...done] },
    }
  }

  return { MAX_MS, BED, start }
})()
