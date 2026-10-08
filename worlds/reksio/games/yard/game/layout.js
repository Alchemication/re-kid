// What this play of the yard holds, decided once at load: which props are out
// (three of six: the rest come another time), which creatures are about (two
// of them), whether the flowers are out, whether it rains, where everything
// stands, and where the sun and the moon are in the sky. Not everything at
// once, so the next play has something new; the last play is remembered and
// things not seen then are preferred.
//
// Two anchors never move: the doghouse by the house (home, where the day
// ends) and the gate at the far end (the way out, later into episodes).
// Between them the things on the ground come in a new order each play, with
// uneven gaps that never let two of them (or their action spots) overlap.
// Puddles and the bird's perches on the wall go in the widest gaps.

/* global Debug */
/* exported Layout */
const Layout = (() => {
  const WORLD_W = 4000 // the whole yard, in scene units (2.5 screens)
  const MIN_X = 380 // the house wall: the yard's left end, for Reksio
  const GATE_SHIFT = 960 // the fence and gate are drawn at 2730–3020 and moved here
  const MAX_X = 2690 + GATE_SHIFT // the fence: the yard's right end, for Reksio
  const ROW_FROM = 725 // the doghouse's right edge
  const ROW_TO = MAX_X - 70 // the gate's action spot starts here
  const MIN_GAP = 140 // at least a dog's length between two things
  const PROP_POOL = ['bowl', 'dig', 'film', 'trap', 'tree', 'berries'] // the doghouse, house, tap, bird and gate are always there
  const PROPS_PER_PLAY = 3 // with the five always there (and sometimes the flowers), eight or nine things to do: more than a day takes (yard.js DAY_THINGS)
  const CREATURE_POOL = ['fly', 'bee', 'spider']
  const CREATURES_PER_PLAY = 2
  const MEMORY_KEY = 'reksio-yard-last-play'
  const RAIN_CHANCE = 0.6 // most plays have a shower; after one, the next leans dry
  const SUN_X = [380, 1300] // where the sun stands across the sky (screen units, the sky stays put)
  const MOON_X = [200, 1400] // where the moon comes up
  const MOON_Y = [80, 190] // how high it climbs (its centre; the wall top is at 334)
  const MOON_R = [30, 44] // its size
  const MOON_PHASES = [0.2, 0.35, 0.5, 0.7, 0.85, 1] // how much of it is lit: a thin crescent to full
  const MOON_TINTS = ['#fbf3d2', '#f4f1e6', '#fde7b0'] // cream, silver, honey
  const WAKE_S = [6, 9] // asleep in the doghouse at the start, he wakes by himself after this long
  const PUDDLES = 3 // at most; fewer when the gaps are tight
  const PUDDLE_RX = [85, 120] // half-width range of a puddle
  // Each thing on the ground as drawn: from the left of its drawing or action
  // spot (whichever is further left) to the right of the other.
  const FOOTPRINTS = { bowl: [710, 970], tap: [1140, 1380], flowers: [1440, 1765], dig: [1930, 2210], film: [2210, 2685], trap: [890, 1290], tree: [1480, 1840], berries: [2220, 2650] }

  const random = Debug.random('layout') // this part's own random stream (debug.js)

  const rnd = (lo, hi) => lo + random() * (hi - lo)

  function remembered() {
    if (Debug.seeded) return {} // a replay: the same play whatever came before
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
      let r = random() * weights.reduce((a, b) => a + b, 0)
      const i = weights.findIndex((w) => (r -= w) < 0)
      chosen.push(left.splice(i, 1)[0])
    }
    return chosen
  }

  const shuffled = (list) => pick(list, list.length)

  // Flags in the page address force parts of a play, for trying them out and
  // for tests (README lists them all). Every draw is made either way, so a
  // flag doesn't shift the rest of a seeded play.
  const params = new URLSearchParams(location.search)
  const listed = (name, pool) => (params.get(name) || '').split(',').filter((n) => pool.includes(n))

  const last = remembered()
  const props = pick(PROP_POOL, PROPS_PER_PLAY, last.props)
  const creatures = pick(CREATURE_POOL, CREATURES_PER_PLAY, last.creatures)
  // ?creatures=fly,spider picks the creatures
  if (params.has('creatures')) creatures.splice(0, creatures.length, ...listed('creatures', CREATURE_POOL))
  // ?flowers=1 (or 0) puts the flowers out (or not)
  const flowerCoin = random() < 0.5
  const flowersDrawn = creatures.includes('bee') || flowerCoin
  const flowers = params.has('flowers') ? params.get('flowers') !== '0' : flowersDrawn
  // ?rain=1 (or 0) and ?rain-at=SECONDS force the weather
  const rainDrawn = random() < (last.rain ? RAIN_CHANCE / 2 : RAIN_CHANCE)
  const rain = params.has('rain') ? params.get('rain') !== '0' : rainDrawn
  const rainAt = Number(params.get('rain-at')) || null
  // ?props=trap,bowl picks the props, and ?mouse-at=SECONDS brings the mouse out, likewise
  const asked = listed('props', PROP_POOL)
  if (asked.length) props.splice(0, props.length, ...asked)
  const mouseAt = params.has('mouse-at') ? Number(params.get('mouse-at')) : null
  // the tree's fruit this play (?fruit=apple|plum|nut forces it), and when its visitor comes
  const FRUITS = ['apple', 'plum', 'nut']
  const fruitDrawn = FRUITS[Math.floor(random() * FRUITS.length)]
  const fruit = FRUITS.includes(params.get('fruit')) ? params.get('fruit') : fruitDrawn
  const visitorAt = params.has('visitor-at') ? Number(params.get('visitor-at')) : null
  // ?moon-rise=SECONDS: how long the moon takes to come up at dusk
  const moonRise = params.has('moon-rise') ? Number(params.get('moon-rise')) : null

  // props that aren't out this time
  const hidden = PROP_POOL.filter((n) => !props.includes(n))
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

  // the sky, from its own stream so a seeded play's yard doesn't shift: where
  // the sun stands, and a different moon every evening (how full, which way
  // it faces, where it comes up, its size, tilt, colour and marks)
  const sky = Debug.random('sky')
  const skyRnd = (lo, hi) => lo + sky() * (hi - lo)
  const sun = { x: Math.round(skyRnd(...SUN_X)) }
  const moon = {
    x: Math.round(skyRnd(...MOON_X)),
    y: Math.round(skyRnd(...MOON_Y)),
    r: Math.round(skyRnd(...MOON_R)),
    lit: MOON_PHASES[Math.floor(sky() * MOON_PHASES.length)],
    waning: sky() < 0.5,
    tilt: Math.round(skyRnd(-25, 25)),
    tint: MOON_TINTS[Math.floor(sky() * MOON_TINTS.length)],
    marks: Array.from({ length: 3 }, () => ({ x: skyRnd(-0.55, 0.55), y: skyRnd(-0.55, 0.55), r: skyRnd(0.1, 0.22) })),
  }

  // the morning (yard.js): each play starts with him asleep in his doghouse,
  // as the cartoon's episodes start, and he wakes by himself after a while (a
  // tap wakes him sooner). A ?still play starts with him up unless it asks
  // for the morning (?morning=1); ?morning=0 skips it. Its own stream.
  const dawn = Debug.random('morning')
  const wakeAfter = WAKE_S[0] + dawn() * (WAKE_S[1] - WAKE_S[0])
  const morning = params.has('morning') ? params.get('morning') !== '0' : !params.has('still')

  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify({ props, creatures, rain }))
  } catch {
    // private window or storage blocked: the next play just won't remember
  }

  return {
    WORLD_W, MIN_X, MAX_X, ROW_FROM, ROW_TO, MIN_GAP, FOOTPRINTS, props, creatures, flowers, rain, rainAt, mouseAt, fruit, visitorAt, moonRise, shift, hidden, puddles, perches, sun, moon, morning, wakeAfter,
    x: (name) => shift[name] || 0,
  }
})()
