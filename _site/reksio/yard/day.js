// The day in the yard, as plain rules with no drawing and no clock of its own
// (yard.js tells it the time): a day on a clock, from 08:00 to 20:00, that
// starts when Reksio wakes and moves only with time, never with what he does,
// so a child who watches the snail all day gets as long as one who tries
// everything (docs/DESIGN_PRINCIPLES.md). The sun sets at 19:00 (dusk), the moon
// comes up through the last hour, and at 20:00 it's bedtime; bed ends the
// play (night). What he has done is kept only for his wishes. A grown-up
// can hurry the sun down (holding the house): it sets within a few seconds,
// and the last hour then runs as it always does.

/* exported Day */
const Day = (() => {
  const LENGTH_S = 300 // the whole day, 08:00 to 20:00, in seconds of play: 25 s an hour (Adam, 2026-10-13: 5 minutes to start with)
  const FROM = 8 // the hour he wakes
  const SLEEPY = 18 // from here he yawns more
  const SUNSET = 19 // the sun is behind the wall: dusk, and the moon comes up
  const TO = 20 // bedtime
  const BED = 'doghouse' // what he wants at dusk
  const HURRY_MS = 4000 // hurried, the sun sets this fast, from whatever hour: quick for a grown-up, still seen going down

  /**
   * A new day, not begun yet: the clock stands at `from` until begin().
   * @param {{lengthMs?: number, from?: number}} options lengthMs: how long the
   *   whole day (FROM to TO) lasts; from: the hour it begins at (tests, ?hour).
   */
  function start({ lengthMs = LENGTH_S * 1000, from = FROM } = {}) {
    const done = new Set()
    const perMs = (TO - FROM) / lengthMs // hours a millisecond
    let begunAt = null
    let hurried = null // { at, from }: when the sun was hurried down, and from which hour
    let phase = 'day' // day → dusk → bedtime → night

    /** The hour at `now` (ms, the caller's clock), from `from` to TO. */
    function hour(now) {
      if (begunAt === null) return from
      const steady = from + (now - begunAt) * perMs
      if (!hurried || now < hurried.at) return Math.min(TO, steady)
      const k = (now - hurried.at) / HURRY_MS
      if (k < 1) return hurried.from + (SUNSET - hurried.from) * k
      return Math.min(TO, SUNSET + (now - hurried.at - HURRY_MS) * perMs) // set: the last hour as ever
    }

    return {
      /** He's up: the clock starts. Only the first call counts. */
      begin(now) {
        if (begunAt === null) begunAt = now
      },
      hour,
      /** A grown-up hurries the sun down: true if it is now setting faster
       * (only in the day, once, and once he's up). */
      hurry(now) {
        if (begunAt === null || hurried || phase !== 'day' || hour(now) >= SUNSET) return false
        hurried = { at: now, from: hour(now) }
        return true
      },
      /** Is the sun hurrying down at `now`? */
      hurrying: (now) => !!hurried && now >= hurried.at && now < hurried.at + HURRY_MS,
      /** Is he sleepy at `now` (the evening coming)? */
      sleepy: (now) => hour(now) >= SLEEPY,
      /** He did `name`; first: never before. It doesn't move the day. */
      did(name) {
        const first = !done.has(name)
        done.add(name)
        return { first }
      },
      /** Time passing: true if the sun sets now. From TO on, it's bedtime. */
      tick(now) {
        const h = hour(now)
        const sets = phase === 'day' && h >= SUNSET
        if (sets) phase = 'dusk'
        if (phase === 'dusk' && h >= TO) phase = 'bedtime'
        return sets
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
      get begun() { return begunAt !== null },
      get phase() { return phase },
      get dusk() { return phase !== 'day' },
      get bedtime() { return phase === 'bedtime' },
      get ended() { return phase === 'night' },
      get count() { return done.size },
      get done() { return [...done] },
    }
  }

  return { LENGTH_S, FROM, SLEEPY, SUNSET, TO, BED, HURRY_MS, start }
})()
