// What this play of the yard holds, decided once at load: which main things
// count (the doghouse and three of the other eight), which creatures are about
// (two of them), whether the flowers are out, whether it rains, and where
// everything stands. Not everything at once, so the next play has something
// new; the last play is remembered and things not seen then are preferred.
//
// Two anchors never move: the doghouse by the house (home, where the day
// ends) and the gate at the far end (the way out, later into episodes).
// Between them the things on the ground come in a new order each play, with
// uneven gaps that never let two of them (or their action spots) overlap.
// Puddles and the bird's perches on the wall go in the widest gaps.

/* exported Layout */
const Layout = (() => {
  const WORLD_W = 4000 // the whole yard, in scene units (2.5 screens)
  const MIN_X = 380 // the house wall: the yard's left end, for Reksio
  const GATE_SHIFT = 960 // the fence and gate are drawn at 2730–3020 and moved here
  const MAX_X = 2690 + GATE_SHIFT // the fence: the yard's right end, for Reksio
  const ROW_FROM = 725 // the doghouse's right edge
  const ROW_TO = MAX_X - 70 // the gate's action spot starts here
  const MIN_GAP = 140 // at least a dog's length between two things
  const MAIN_POOL = ['bowl', 'tap', 'bird', 'dig', 'film', 'trap', 'tree', 'berries'] // doghouse always counts
  const MAINS_PER_PLAY = 3
  const CREATURE_POOL = ['fly', 'bee', 'spider']
  const CREATURES_PER_PLAY = 2
  const MEMORY_KEY = 'reksio-yard-last-play'
  const RAIN_CHANCE = 0.6 // most plays have a shower; after one, the next leans dry
  const PUDDLES = 3 // at most; fewer when the gaps are tight
  const PUDDLE_RX = [85, 120] // half-width range of a puddle
  // Each thing on the ground as drawn: from the left of its drawing or action
  // spot (whichever is further left) to the right of the other.
  const FOOTPRINTS = { bowl: [710, 970], tap: [1140, 1380], flowers: [1440, 1765], dig: [1930, 2210], film: [2210, 2685], trap: [890, 1290], tree: [1480, 1840], berries: [2220, 2650] }

  const rnd = (lo, hi) => lo + Math.random() * (hi - lo)

  function remembered() {
    try {
      return JSON.parse(localStorage.getItem(MEMORY_KEY)) || {}
    } catch {
      return {}
    }
  }

  /** Pick n from pool, preferring ones not seen last time (3 to 1). */
  function pick(pool, n, seenBefore = []) {
    const left = [...pool]
    const chosen = []
    while (chosen.length < n && left.length) {
      const weights = left.map((x) => (seenBefore.includes(x) ? 1 : 3))
      let r = Math.random() * weights.reduce((a, b) => a + b, 0)
      const i = weights.findIndex((w) => (r -= w) < 0)
      chosen.push(left.splice(i, 1)[0])
    }
    return chosen
  }

  const shuffled = (list) => pick(list, list.length)

  const last = remembered()
  const mains = ['doghouse', ...pick(MAIN_POOL, MAINS_PER_PLAY, last.mains)]
  const creatures = pick(CREATURE_POOL, CREATURES_PER_PLAY, last.creatures)
  const flowers = creatures.includes('bee') || Math.random() < 0.5
  // ?rain=1 (or 0) and ?rain-at=SECONDS in the page address force the weather,
  // for trying it out without waiting.
  const params = new URLSearchParams(location.search)
  const rain = params.has('rain') ? params.get('rain') !== '0' : Math.random() < (last.rain ? RAIN_CHANCE / 2 : RAIN_CHANCE)
  const rainAt = Number(params.get('rain-at')) || null
  // ?mains=trap,bowl picks main things, and ?mouse-at=SECONDS brings the mouse out, likewise
  const asked = (params.get('mains') || '').split(',').filter((n) => MAIN_POOL.includes(n))
  if (asked.length) mains.splice(1, mains.length, ...asked)
  const mouseAt = params.has('mouse-at') ? Number(params.get('mouse-at')) : null
  // the tree's fruit this play (?fruit=apple|plum|nut forces it), and when its visitor comes
  const FRUITS = ['apple', 'plum', 'nut']
  const fruit = FRUITS.includes(params.get('fruit')) ? params.get('fruit') : FRUITS[Math.floor(Math.random() * FRUITS.length)]
  const visitorAt = params.has('visitor-at') ? Number(params.get('visitor-at')) : null

  // props that are only there when they count this time (the tap is on the wall for good)
  const hidden = ['bowl', 'dig', 'film', 'trap', 'tree', 'berries'].filter((n) => !mains.includes(n))
  if (!flowers) hidden.push('flowers')

  // the row: things in a new order, the spare room shared out unevenly as gaps
  const row = shuffled(Object.keys(FOOTPRINTS).filter((n) => !hidden.includes(n)))
  const width = (n) => FOOTPRINTS[n][1] - FOOTPRINTS[n][0]
  const spare = ROW_TO - ROW_FROM - row.reduce((sum, n) => sum + width(n), 0) - (row.length + 1) * MIN_GAP
  const weights = [...row, null].map(() => rnd(0.4, 1.6))
  const total = weights.reduce((a, b) => a + b, 0)
  const gaps = [] // free ground between things: [from, to]
  const shift = { gate: GATE_SHIFT }
  let at = ROW_FROM
  row.forEach((n, i) => {
    const gap = MIN_GAP + Math.max(0, spare) * (weights[i] / total)
    gaps.push([at, at + gap])
    shift[n] = at + gap - FOOTPRINTS[n][0]
    at += gap + width(n)
  })
  gaps.push([at, ROW_TO])

  const widest = [...gaps].sort((a, b) => b[1] - b[0] - (a[1] - a[0]))
  const mid = ([a, b]) => Math.round((a + b) / 2)
  const puddles = widest.slice(0, PUDDLES).map((g) => ({ x: mid(g), rx: Math.min(rnd(...PUDDLE_RX), (g[1] - g[0]) / 2 - 10) }))
  // two perches on the wall, over the two widest gaps, left one first
  const perches = widest.slice(0, 2).map(mid).sort((a, b) => a - b)

  // the tray follows the yard from left to right; the bird starts on the first perch
  const where = (n) => (n === 'doghouse' ? 0 : n === 'bird' ? perches[0] : FOOTPRINTS[n][0] + shift[n])
  mains.sort((a, b) => where(a) - where(b))

  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify({ mains, creatures, rain }))
  } catch {
    // private window or storage blocked: the next play just won't remember
  }

  return {
    WORLD_W, MIN_X, MAX_X, mains, creatures, flowers, rain, rainAt, mouseAt, fruit, visitorAt, shift, hidden, puddles, perches,
    x: (name) => shift[name] || 0,
  }
})()
