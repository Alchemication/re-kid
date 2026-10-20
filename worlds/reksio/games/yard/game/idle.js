// What Reksio does when nobody is tapping, as plain choices with no drawing,
// clock or randomness of their own (yard.js passes in what it knows, and a
// random stream): whether to do something now, which left-alone move, which
// thing to wish for, and whether something done brings a phrase of music.

/* exported Idle */
const Idle = (() => {
  const FIRST_MS = 2500 // left alone this long, he starts doing things
  const GAP_MS = [1500, 3500] // then something new every 1.5–3.5 s
  const REST_AFTER_S = { sit: 8, lie: 18, nap: 30 } // left alone this long, he may sit, lie down, or nap
  // a phrase of music at most this often after something done, quiet in
  // between; and if it has been quiet this long, one anyway, as he potters
  // about alone. 40 s and only after something new left long silences (Adam,
  // 2026-10-19: "too many moments are quiet"); all day was too much (10-13).
  const PHRASE_GAP_MS = 25000
  const LONG_QUIET_MS = 50000

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
   * Which move: a thought bubble first (if one can show), then a move that
   * is due (one marked `due` happens as soon as it can), then any move that
   * can happen now, weighted, never the one just done.
   * @param {Object<string, {weight: number, due?: boolean}>} acts
   * @param {{ok: (name: string) => boolean, last: string|null, firstWish: boolean, random: () => number}} o
   */
  function pick(acts, { ok, last, firstWish, random }) {
    if (firstWish && acts.wish && ok('wish')) return 'wish'
    const due = Object.keys(acts).find((n) => acts[n].due && ok(n))
    if (due) return due
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

  /**
   * Does something done bring a phrase of music? Not while music plays, not
   * in the rain, and not within PHRASE_GAP_MS of the last phrase. Left alone
   * (alone: true), only once it has been quiet LONG_QUIET_MS: the music
   * follows the child, and still comes back now and then.
   * @param {{playing: boolean, raining: boolean, sinceLast: number, alone?: boolean}} s
   */
  const phraseOk = ({ playing, raining, sinceLast, alone = false }) => !playing && !raining && sinceLast >= (alone ? LONG_QUIET_MS : PHRASE_GAP_MS)

  /** How long until the next move after one that took `ms` (or a random gap). */
  const gap = (ms, random) => ms || GAP_MS[0] + random() * (GAP_MS[1] - GAP_MS[0])

  return { FIRST_MS, GAP_MS, REST_AFTER_S, PHRASE_GAP_MS, LONG_QUIET_MS, next, pick, restOk, wish, phraseOk, gap }
})()
