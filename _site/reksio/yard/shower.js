// The shower's timeline, as plain rules with no drawing, sound or clock of its
// own (weather.js steps it each frame and draws what it says): waiting, then
// clouds roll in, rain, the clouds clear, puddles dry after the rain, dry.
// Also how hard it rains, how covered the sky is and how full the puddles are
// at each moment. A play without a shower is dry from the start.

/* exported Shower */
const Shower = (() => {
  const CLOUD_IN_S = 4 // clouds take this long to cover the sky
  const RAIN_UP_S = 3 // the rain takes this long to get going, and to stop
  const CLEAR_S = 4 // the clouds take this long to drift off
  const FILL_S = 18 // the puddles fill up over this much rain
  const DRY_S = 70 // and dry up over this long after it

  /**
   * A play's shower.
   * @param {{rain: boolean, startAt: number, rainFor: number}} plan
   *   rain: is there one; startAt: seconds into the play it starts;
   *   rainFor: seconds it rains.
   */
  function start({ rain, startAt, rainFor }) {
    let phase = rain ? 'waiting' : 'dry' // waiting | clouding | raining | clearing | after | dry
    let t = 0
    let phaseAt = 0
    let wet = 0
    let rained = false
    let afterRainAt = null
    const since = () => t - phaseAt

    function enter(p, entered) {
      phase = p
      phaseAt = t
      if (p === 'after') afterRainAt = t
      entered.push(p)
    }

    return {
      /** Time passes by dt seconds. Returns the phases entered, in order. */
      step(dt) {
        t += dt
        const entered = []
        if (phase === 'waiting' && t >= startAt) enter('clouding', entered)
        if (phase === 'clouding' && since() >= CLOUD_IN_S) enter('raining', entered)
        else if (phase === 'raining') {
          rained = true
          wet = Math.min(1, wet + dt / FILL_S)
          if (since() >= rainFor) enter('clearing', entered)
        } else if (phase === 'clearing' && since() >= CLEAR_S) enter(rained ? 'after' : 'dry', entered)
        else if (phase === 'after') {
          wet = Math.max(0, wet - dt / DRY_S)
          if (wet <= 0) enter('dry', entered)
        }
        return entered
      },
      /** No (more) shower: one to come never comes, one under way clears.
       * Returns the phases entered. */
      stop() {
        const entered = []
        if (phase === 'waiting') enter('dry', entered)
        else if (phase === 'clouding' || phase === 'raining') enter('clearing', entered)
        return entered
      },
      get phase() { return phase },
      get t() { return t },
      /** How hard it rains: 0 … 1. */
      get intensity() {
        if (phase === 'raining') return Math.min(1, since() / RAIN_UP_S)
        if (phase === 'clearing' && rained) return Math.max(0, 1 - since() / RAIN_UP_S)
        return 0
      },
      /** How much of the sky the clouds cover: 0 … 1. */
      get cover() {
        if (phase === 'clouding') return Math.min(1, since() / CLOUD_IN_S)
        if (phase === 'raining') return 1
        if (phase === 'clearing') return Math.max(0, 1 - since() / CLEAR_S)
        return 0
      },
      /** How full the puddles are: 0 … 1. */
      get wet() { return wet },
      /** Seconds since the rain stopped, or null if it hasn't rained. */
      get sinceRain() { return afterRainAt == null ? null : t - afterRainAt },
    }
  }

  return { CLOUD_IN_S, CLEAR_S, DRY_S, start }
})()
