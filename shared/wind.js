// Shared by every game: the wind, as plain rules (docs/WORLD_MODEL.md). Most
// of the time a light breeze that comes and goes; now and then a gust that
// passes quickly; calm once the evening drops it. The game steps it each
// frame and shows it (plants leaning, the wind's sound, things carried in a
// gust) and puts its level in the world state, where creatures read it.
//
// No drawing and no clock: step() is told how much time has passed, and draws
// from the game's own random stream, in the same order each time, so a seeded
// play blows the same.

/* exported Wind */
const Wind = (() => {
  const BREEZE = [0.08, 0.38] // wind level most of the time (0 still, 1 a gust)
  const GUST = [0.6, 1] // …and in a gust
  const GUST_CHANCE = 0.2 // of each change of wind, this many are gusts
  const CHANGE_S = [3, 10] // the wind changes this often
  const GUST_S = [2, 4] // a gust passes this quickly
  const EASE = 0.7 // how quickly the level follows a change, per second

  /** A wind starting at this level, on random stream `random`. */
  function make(random, level = 0.2) {
    return { random, level, target: level, t: 0, changeAt: 0, calm: false, gust: false }
  }

  const rnd = (w, lo, hi) => lo + w.random() * (hi - lo)

  /**
   * Move it on dt seconds; `extra` adds to where it's heading (clouds coming
   * in make it stronger). Returns its level, 0 still to 1 a full gust.
   */
  function step(w, dt, extra = 0) {
    w.t += dt
    if (w.t >= w.changeAt) {
      w.gust = !w.calm && w.random() < GUST_CHANCE
      w.target = w.calm ? BREEZE[0] : rnd(w, ...(w.gust ? GUST : BREEZE))
      w.changeAt = w.t + (w.gust ? rnd(w, ...GUST_S) : rnd(w, ...CHANGE_S))
    }
    const target = Math.min(1, w.target + extra)
    w.level += (target - w.level) * Math.min(1, dt * EASE)
    return w.level
  }

  /** A gust now, at full strength (for trying it: no random draw). */
  function gust(w) {
    w.gust = true
    w.target = GUST[1]
    w.changeAt = w.t + GUST_S[1]
  }

  /** The evening: it drops to the lightest breeze, from now on. */
  function calm(w) {
    w.calm = true
    w.changeAt = w.t
  }

  return { make, step, gust, calm }
})()
