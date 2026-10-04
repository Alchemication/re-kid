// What this play of the yard holds, decided once at load: which main things
// count (the doghouse and three of the other five), which creatures are about
// (two of them), whether the flowers are out, and where the movable things
// stand — each within its own stretch, never crowding the next. Not
// everything at once, so the next play has something new; the last play is
// remembered and things not seen then are preferred.

/* exported Layout */
const Layout = (() => {
  const WORLD_W = 3400 // the whole yard, in scene units
  const MIN_X = 380 // the house wall: the yard's left end, for Reksio
  const GATE_SHIFT = 400 // the fence and gate are drawn at 2740 and moved here
  const MAX_X = 2690 + GATE_SHIFT // the fence: the yard's right end, for Reksio
  const MAIN_POOL = ['bowl', 'tap', 'bird', 'dig', 'film'] // doghouse always counts
  const MAINS_PER_PLAY = 3
  const CREATURE_POOL = ['fly', 'bee', 'spider']
  const CREATURES_PER_PLAY = 2
  const MEMORY_KEY = 'reksio-yard-last-play'
  const RAIN_CHANCE = 0.6 // most plays have a shower; after one, the next leans dry
  // Each movable thing is drawn at a base position; per play it moves by an
  // offset within these limits (scene units), drawn left to right.
  const SHIFTS = { bowl: [0, 140], flowers: [-60, 240], dig: [-10, 330], film: [140, 385] } // film stops clear of the gate
  const WIDTHS = { flowers: [1545, 1765], dig: [1990, 2210], film: [2235, 2685] } // drawn extents
  const MIN_GAP = 60

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

  const last = remembered()
  const mains = ['doghouse', ...pick(MAIN_POOL, MAINS_PER_PLAY, last.mains)]
  // keep the tray in the yard's left-to-right order
  const ORDER = ['doghouse', 'bowl', 'tap', 'bird', 'dig', 'film']
  mains.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
  const creatures = pick(CREATURE_POOL, CREATURES_PER_PLAY, last.creatures)
  const flowers = creatures.includes('bee') || Math.random() < 0.5
  // ?rain=1 (or 0) and ?rain-at=SECONDS in the page address force the weather,
  // for trying it out without waiting.
  const params = new URLSearchParams(location.search)
  const rain = params.has('rain') ? params.get('rain') !== '0' : Math.random() < (last.rain ? RAIN_CHANCE / 2 : RAIN_CHANCE)
  const rainAt = Number(params.get('rain-at')) || null

  // positions: left to right, each clear of the one before
  const shift = { gate: GATE_SHIFT }
  shift.bowl = rnd(...SHIFTS.bowl)
  shift.flowers = rnd(...SHIFTS.flowers)
  let rightEdge = flowers ? WIDTHS.flowers[1] + shift.flowers : 1400
  shift.dig = Math.max(rnd(...SHIFTS.dig), rightEdge + MIN_GAP - WIDTHS.dig[0])
  rightEdge = mains.includes('dig') ? WIDTHS.dig[1] + shift.dig : rightEdge
  shift.film = Math.min(SHIFTS.film[1], Math.max(rnd(...SHIFTS.film), rightEdge + MIN_GAP - WIDTHS.film[0]))

  // props that are only there when they count this time
  const hidden = ['bowl', 'dig', 'film'].filter((n) => !mains.includes(n))
  if (!flowers) hidden.push('flowers')

  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify({ mains, creatures, rain }))
  } catch {
    // private window or storage blocked: the next play just won't remember
  }

  return { WORLD_W, MIN_X, MAX_X, mains, creatures, flowers, rain, rainAt, shift, hidden, x: (name) => shift[name] || 0 }
})()
