// What Reksio does when nobody is tapping, as plain choices with no drawing,
// clock or randomness of their own (yard.js passes in what it knows, and a
// random stream): whether to do something now, which left-alone move, which
// thing to wish for, and how full the music should be.

/* exported Idle */
const Idle = (() => {
  const FIRST_MS = 2500 // left alone this long, he starts doing things
  const GAP_MS = [1500, 3500] // then something new every 1.5–3.5 s
  const REST_AFTER_S = { sit: 8, lie: 18, nap: 30 } // left alone this long, he may sit, lie down, or nap
  const LIVELY_MS = 4000 // the music stays full this long after a tap
  const SPARSE_MS = 15000 // and thins to a bare bass line after this long

  /**
   * What to do now, left alone: 'shake' (wet, stopped, out of the rain: at
   * once), 'act' (a left-alone move is due) or null (wait).
   * @param {{soaked: boolean, raining: boolean, inPuddle: boolean, sinceTap: number, now: number, nextAt: number}} s
   */
  function next({ soaked, raining, inPuddle, sinceTap, now, nextAt }) {
    if (soaked && !raining && !inPuddle) return 'shake'
    if (sinceTap > FIRST_MS && now >= nextAt) return 'act'
    return null
  }

  /**
   * Which move: a thought bubble first (if one can show), then any move that
   * can happen now, weighted, never the one just done.
   * @param {Object<string, {weight: number}>} acts
   * @param {{ok: (name: string) => boolean, last: string|null, firstWish: boolean, random: () => number}} o
   */
  function pick(acts, { ok, last, firstWish, random }) {
    if (firstWish && acts.wish && ok('wish')) return 'wish'
    const names = Object.keys(acts).filter((n) => n !== last && ok(n))
    let r = random() * names.reduce((sum, n) => sum + acts[n].weight, 0)
    for (const n of names) if ((r -= acts[n].weight) < 0) return n
    return names[0] ?? null
  }

  /** Has he been left alone long enough to `rest` ('sit', 'lie' or 'nap')? */
  const restOk = (rest, idleS) => idleS > REST_AFTER_S[rest]

  /**
   * What to wish for: the nearest of `names` he wants and that is ready.
   * @param {string[]} names
   * @param {{wants: (n: string) => boolean, ready: (n: string) => boolean, distance: (n: string) => number}} o
   */
  function wish(names, { wants, ready, distance }) {
    const left = names.filter((n) => wants(n) && ready(n))
    return left.sort((a, b) => distance(a) - distance(b))[0] ?? null
  }

  /** How full the music is: 3 busy, 2 just tapped or walking, 1 a while alone, 0 long alone. */
  function energy({ busy, walking, sinceTap }) {
    if (busy) return 3
    if (walking || sinceTap < LIVELY_MS) return 2
    return sinceTap < SPARSE_MS ? 1 : 0
  }

  /** How long until the next move after one that took `ms` (or a random gap). */
  const gap = (ms, random) => ms || GAP_MS[0] + random() * (GAP_MS[1] - GAP_MS[0])

  return { FIRST_MS, GAP_MS, REST_AFTER_S, next, pick, restOk, wish, energy, gap }
})()
