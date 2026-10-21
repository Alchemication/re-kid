// What this play of the yard holds, decided once at load: which props are out
// (three of six: the rest come another time, and always one Reksio can help
// and one that helps him, see OFFERS), which creatures are about (two of
// them), whether the flowers are out, whether it rains, where everything
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
  const MIN_GAP = 160 // at least this between two things: a dog's length and some, so three mushrooms fit a gap without a puddle (mushrooms.js). With the widest props out the row still has room for 169
  // what each prop can offer a play: something to find out about (discover),
  // someone Reksio can help (help), someone who helps him (helped). The
  // doghouse, house, tap, bird and gate are always there and only discover.
  // A kind is listed only once a gag gives it (helped: the bowl on his head,
  // his tail caught in the bramble).
  const OFFERS = { bowl: ['discover', 'helped'], dig: ['discover'], film: ['discover'], trap: ['help'], tree: ['help'], berries: ['discover', 'helped'], hen: ['help'] }
  const PROP_POOL = Object.keys(OFFERS)
  const PROPS_PER_PLAY = 3 // with the five always there (and sometimes the flowers), eight or nine things to do
  const CREATURE_POOL = ['fly', 'bee', 'spider']
  const CREATURES_PER_PLAY = 2
  const MEMORY_KEY = 'reksio-yard-last-play'
  const RAIN_CHANCE = 0.6 // most plays have a shower; after one, the next leans dry
  const SUN_NOON = [105, 140] // how high the sun climbs at noon (its centre; sky.js): a little higher some days
  const MOON_X = [200, 1400] // where the moon comes up
  const MOON_Y = [80, 190] // how high it climbs (its centre; the wall top is at 334)
  const MOON_R = [30, 44] // its size
  const MOON_PHASES = [0.2, 0.35, 0.5, 0.7, 0.85, 1] // how much of it is lit: a thin crescent to full
  const MOON_TINTS = ['#fbf3d2', '#f4f1e6', '#fde7b0'] // cream, silver, honey
  // what kind of day it is, drawn each play (?sky= forces one): clouds, how
  // many drift across all day (weather.js; a shower brings them all); haze,
  // a grey over the sky; sun, how bright it shines; warmth, how much warmer
  // the light is all day (sky.js)
  const DAYS = {
    clear: { chance: 3, clouds: 0, haze: 0, sun: 1, warmth: 0 },
    fair: { chance: 4, clouds: 3, haze: 0, sun: 1, warmth: 0 },
    cloudy: { chance: 2, clouds: 5, haze: 0.16, sun: 0.65, warmth: 0 },
    golden: { chance: 2, clouds: 1, haze: 0, sun: 1, warmth: 0.1 },
  }
  const SUN_RISE_X = [100, 320] // where the sun comes up over the wall (screen units)
  const SUN_SET_X = [1280, 1500] // and where it goes down
  const WAKE_S = [6, 9] // asleep in the doghouse at the start, he wakes by himself after this long
  const PUDDLES = 3 // at most; fewer when the gaps are tight
  const PUDDLE_RX = [85, 120] // half-width range of a puddle
  // Each thing on the ground as drawn: from the left of its drawing or action
  // spot (whichever is further left) to the right of the other.
  const FOOTPRINTS = { bowl: [710, 970], tap: [1140, 1380], flowers: [1440, 1765], dig: [1930, 2210], film: [2210, 2685], trap: [890, 1290], tree: [1480, 1840], berries: [2220, 2650], hen: [990, 1360] }

  const random = Debug.random('layout') // this part's own random stream (debug.js)

  const rnd = (lo, hi) => lo + random() * (hi - lo)

  /** ?day=SECONDS: how long the whole day lasts; ?hour=H: the hour it begins
   * at (day.js: 8 to 20), to see the evening without waiting for it. */
  function dayFlags(params) {
    const dayS = Number(params.get('day')) || null
    const hour = params.has('hour') ? Math.max(8, Math.min(20, Number(params.get('hour')) || 8)) : null
    return { dayS, hour }
  }

  /** When things happen, in seconds into the play, if the page address
   * says (else null: their own time): ?mouse-at, the mouse comes out;
   * ?visitor-at, the tree's visitor; ?hen-at, the hen goes up to lay;
   * ?mushrooms, the mushrooms come up, rain or not. */
  function whenFlags(params) {
    const at = (name) => (params.has(name) ? Number(params.get(name)) : null)
    return { mouseAt: at('mouse-at'), visitorAt: at('visitor-at'), henAt: at('hen-at'), mushroomsAt: at('mushrooms') }
  }

  /** The kind of day for a draw `u` (0–1), by each kind's chance, unless
   * `asked` names one. */
  function pickDay(u, asked) {
    const kinds = Object.keys(DAYS)
    const total = kinds.reduce((n, k) => n + DAYS[k].chance, 0)
    let left = u * total
    let kind = kinds.find((k) => (left -= DAYS[k].chance) < 0) ?? kinds[kinds.length - 1]
    if (kinds.includes(asked)) kind = asked
    const { clouds, haze, sun, warmth } = DAYS[kind]
    return { kind, clouds, haze, sun, warmth }
  }

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

  /** The play's props: one that offers help, one that helps (unless the first already does), then the rest. */
  function pickProps(seenBefore) {
    const chosen = []
    for (const kind of ['help', 'helped']) {
      if (chosen.some((n) => OFFERS[n].includes(kind))) continue
      chosen.push(...pick(PROP_POOL.filter((n) => OFFERS[n].includes(kind)), 1, seenBefore))
    }
    return [...chosen, ...pick(PROP_POOL.filter((n) => !chosen.includes(n)), PROPS_PER_PLAY - chosen.length, seenBefore)]
  }

  // Flags in the page address force parts of a play, for trying them out and
  // for tests (README lists them all). Every draw is made either way, so a
  // flag doesn't shift the rest of a seeded play.
  const params = new URLSearchParams(location.search)
  const listed = (name, pool) => (params.get(name) || '').split(',').filter((n) => pool.includes(n))

  const last = remembered()
  const props = pickProps(last.props)
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
  const { mouseAt, visitorAt, henAt, mushroomsAt } = whenFlags(params)
  // the tree's fruit this play (?fruit=apple|plum|nut forces it), and when its visitor comes
  const FRUITS = ['apple', 'plum', 'nut']
  const fruitDrawn = FRUITS[Math.floor(random() * FRUITS.length)]
  const fruit = FRUITS.includes(params.get('fruit')) ? params.get('fruit') : fruitDrawn
  const { dayS, hour } = dayFlags(params)

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

  // the sky, from its own stream so a seeded play's yard doesn't shift: how
  // high the sun climbs, and a different moon every evening (how full, which
  // way it faces, where it comes up, its size, tilt, colour and marks)
  const skyDraw = Debug.random('sky')
  const skyRnd = (lo, hi) => lo + skyDraw() * (hi - lo)
  const sun = { noon: Math.round(skyRnd(...SUN_NOON)) }
  const moon = {
    x: Math.round(skyRnd(...MOON_X)),
    y: Math.round(skyRnd(...MOON_Y)),
    r: Math.round(skyRnd(...MOON_R)),
    lit: MOON_PHASES[Math.floor(skyDraw() * MOON_PHASES.length)],
    waning: skyDraw() < 0.5,
    tilt: Math.round(skyRnd(-25, 25)),
    tint: MOON_TINTS[Math.floor(skyDraw() * MOON_TINTS.length)],
    marks: Array.from({ length: 3 }, () => ({ x: skyRnd(-0.55, 0.55), y: skyRnd(-0.55, 0.55), r: skyRnd(0.1, 0.22) })),
  }
  // the sun's path, and the kind of day: drawn after the moon, so the moon of
  // a seeded play is as it was
  sun.rise = Math.round(skyRnd(...SUN_RISE_X))
  sun.set = Math.round(skyRnd(...SUN_SET_X))
  const sky = pickDay(skyDraw(), params.get('sky'))

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

  const layout = {
    WORLD_W, MIN_X, MAX_X, ROW_FROM, ROW_TO, MIN_GAP, FOOTPRINTS, OFFERS, props, creatures, flowers, rain, rainAt, mouseAt, fruit, visitorAt, henAt, mushroomsAt, gaps, dayS, hour, shift, hidden, puddles, perches, sun, moon, sky, morning, wakeAfter,
    x: (name) => shift[name] || 0,
  }
  /** The page-address flags that build this same yard again. */
  const replayFlags = () => ({ props: props.join(','), creatures: creatures.join(','), flowers: flowers ? 1 : 0, rain: rain ? 1 : 0, fruit, ...(dayS ? { day: dayS } : {}), ...(hour !== null ? { hour } : {}) })
  Debug.pin({ flags: replayFlags(), layout }) // a replay builds this same yard (debug.js)
  return layout
})()
