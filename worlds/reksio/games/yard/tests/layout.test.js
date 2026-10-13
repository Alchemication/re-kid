// Unit tests for layout.js: what a play holds, and that it always fits.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1)
const layout = (query = '', options = {}) => load(['debug.js', 'layout.js'], { query, ...options }).json('Layout')

/** Left and right ends of each visible thing on the ground, left to right. */
function placed(L) {
  return Object.keys(L.FOOTPRINTS)
    .filter((n) => !L.hidden.includes(n))
    .map((n) => ({ n, from: L.FOOTPRINTS[n][0] + L.shift[n], to: L.FOOTPRINTS[n][1] + L.shift[n] }))
    .sort((a, b) => a.from - b.from)
}

describe('a play', () => {
  it('puts out three different props', () => {
    for (const seed of SEEDS) {
      const L = layout(`?seed=${seed}`)
      assert.equal(L.props.length, 3, `seed ${seed}`)
      assert.equal(new Set(L.props).size, 3, `seed ${seed}`)
    }
  })

  it('always has someone Reksio can help and someone who helps him', () => {
    for (const seed of SEEDS) {
      const L = layout(`?seed=${seed}`)
      assert.ok(L.props.some((n) => ['trap', 'tree'].includes(n)), `seed ${seed}: ${L.props}`)
      assert.ok(L.props.some((n) => ['bowl', 'berries'].includes(n)), `seed ${seed}: ${L.props}`)
      for (const n of L.props) assert.ok(L.OFFERS[n], n)
    }
  })

  it('takes turns between the fixes someone helps him out of: not the bowl every play', () => {
    const plays = SEEDS.map((seed) => layout(`?seed=${seed}`).props)
    assert.ok(plays.some((p) => !p.includes('bowl')), 'the bowl is out every play')
    assert.ok(plays.some((p) => !p.includes('berries')), 'the bramble is out every play')
  })

  it('still brings every prop out now and then', () => {
    const seen = new Set()
    for (const seed of SEEDS) for (const n of layout(`?seed=${seed}`).props) seen.add(n)
    assert.deepEqual([...seen].sort(), ['berries', 'bowl', 'dig', 'film', 'trap', 'tree'])
  })

  it('shows a prop only when it is out (the tap always, the flowers sometimes)', () => {
    for (const seed of SEEDS) {
      const L = layout(`?seed=${seed}`)
      for (const n of ['bowl', 'dig', 'film', 'trap', 'tree', 'berries']) assert.equal(L.hidden.includes(n), !L.props.includes(n), `seed ${seed}: ${n}`)
      assert.ok(!L.hidden.includes('tap'))
      assert.equal(L.hidden.includes('flowers'), !L.flowers)
    }
  })

  it('always brings the flowers with the bee', () => {
    for (const seed of SEEDS) {
      const L = layout(`?seed=${seed}`)
      if (L.creatures.includes('bee')) assert.ok(L.flowers, `seed ${seed}`)
    }
  })

  it('brings two different creatures', () => {
    for (const seed of SEEDS) {
      const L = layout(`?seed=${seed}`)
      assert.equal(new Set(L.creatures).size, 2, `seed ${seed}`)
    }
  })

  it('lets the sun climb a little higher some days, and puts a different moon in the sky each play', () => {
    const moons = new Set()
    for (const seed of SEEDS) {
      const { sun, moon } = layout(`?seed=${seed}`)
      assert.ok(sun.noon >= 105 && sun.noon <= 140, `seed ${seed}: sun at noon at ${sun.noon}`)
      assert.ok(moon.x >= 200 && moon.x <= 1400 && moon.y >= 80 && moon.y <= 190, `seed ${seed}`)
      assert.ok(moon.lit > 0 && moon.lit <= 1, `seed ${seed}`)
      moons.add(JSON.stringify(moon))
    }
    assert.equal(moons.size, SEEDS.length)
  })
})

describe('the row of things', () => {
  it('keeps things (and their action spots) a dog length apart, inside the row', () => {
    for (const seed of SEEDS) {
      const L = layout(`?seed=${seed}`)
      const row = placed(L)
      assert.ok(row[0].from >= L.ROW_FROM + L.MIN_GAP - 1e-6, `seed ${seed}: ${row[0].n} too far left`)
      assert.ok(row.at(-1).to <= L.ROW_TO - L.MIN_GAP + 1e-6, `seed ${seed}: ${row.at(-1).n} too far right`)
      for (let i = 1; i < row.length; i++) {
        assert.ok(row[i].from - row[i - 1].to >= L.MIN_GAP - 1e-6, `seed ${seed}: ${row[i - 1].n} and ${row[i].n} too close`)
      }
    }
  })

  it('puts puddles on free ground only', () => {
    for (const seed of SEEDS) {
      const L = layout(`?seed=${seed}`)
      const row = placed(L)
      assert.ok(L.puddles.length >= 1 && L.puddles.length <= 3, `seed ${seed}`)
      for (const p of L.puddles) {
        assert.ok(p.rx > 0, `seed ${seed}: an empty puddle`)
        for (const t of row) assert.ok(p.x + p.rx <= t.from || p.x - p.rx >= t.to, `seed ${seed}: puddle at ${p.x} on the ${t.n}`)
      }
    }
  })

  it('puts two perches on the wall, left one first', () => {
    for (const seed of SEEDS) {
      const L = layout(`?seed=${seed}`)
      assert.equal(L.perches.length, 2)
      assert.ok(L.perches[0] <= L.perches[1], `seed ${seed}`)
    }
  })
})

describe('replays and memory', () => {
  it('replays the same play from the same seed, whatever the last play was', () => {
    const a = layout('?seed=11', { storage: { 'reksio-yard-last-play': JSON.stringify({ props: ['bowl', 'tree', 'dig'], rain: true }) } })
    const b = layout('?seed=11')
    assert.deepEqual(a, b)
  })

  it('remembers an unseeded play, and prefers new things next time', () => {
    const page = load(['debug.js', 'layout.js'])
    const memory = JSON.parse(page.store.get('reksio-yard-last-play'))
    assert.deepEqual(memory.props, page.json('Layout.props'))
    // over many unseeded plays after the same one, its things come up less than
    // with no memory: about 0.5 a play against 0.75. A last play of props the
    // helper rule doesn't bring back anyway, so only the preference counts.
    const last = { props: ['dig', 'film', 'berries'], creatures: ['fly', 'bee'], rain: false }
    const seenAgain = (storage) => {
      let again = 0
      for (let i = 0; i < 300; i++) again += layout('', { storage }).props.filter((n) => last.props.includes(n)).length
      return again / 300
    }
    const after = seenAgain({ 'reksio-yard-last-play': JSON.stringify(last) })
    const fresh = seenAgain({})
    assert.ok(after < fresh - 0.1, `seen-before props came up ${after} a play, ${fresh} with no memory`)
  })

  it('still makes a play when storage is blocked', () => {
    assert.equal(layout('', { storageThrows: true }).props.length, 3)
  })

  it('survives a corrupted memory', () => {
    assert.equal(layout('', { storage: { 'reksio-yard-last-play': '{not json' } }).props.length, 3)
  })
})

describe('flags in the page address', () => {
  it('picks the props, ignoring unknown names', () => {
    assert.deepEqual([...layout('?seed=3&props=trap,nonsense,bowl').props].sort(), ['bowl', 'trap'])
  })

  it('sets how long the day is and the hour it begins, without shifting the play', () => {
    const plain = layout('?seed=3')
    const evening = layout('?seed=3&day=60&hour=18.5')
    assert.equal(evening.dayS, 60)
    assert.equal(evening.hour, 18.5)
    assert.equal(plain.dayS, null)
    assert.equal(plain.hour, null)
    assert.deepEqual({ ...evening, dayS: null, hour: null }, plain)
  })

  it('forces the kind of day, ignoring unknown kinds, without shifting the play', () => {
    const plain = layout('?seed=3')
    const cloudy = layout('?seed=3&sky=cloudy')
    assert.equal(cloudy.sky.kind, 'cloudy')
    assert.ok(cloudy.sky.clouds > 0 && cloudy.sky.haze > 0 && cloudy.sky.sun < 1)
    assert.deepEqual({ ...cloudy, sky: plain.sky }, plain)
    assert.equal(layout('?seed=3&sky=stormy').sky.kind, plain.sky.kind)
  })

  it('has every kind of day come up, and the sun come up and go down somewhere new', () => {
    const kinds = new Set()
    const paths = new Set()
    for (let seed = 1; seed <= 60; seed++) {
      const { sky, sun } = layout(`?seed=${seed}`)
      kinds.add(sky.kind)
      paths.add(`${sun.rise} ${sun.set}`)
      assert.ok(sun.rise >= 100 && sun.rise <= 320 && sun.set >= 1280 && sun.set <= 1500, `seed ${seed}`)
    }
    assert.deepEqual([...kinds].sort(), ['clear', 'cloudy', 'fair', 'golden'])
    assert.ok(paths.size > 50)
  })

  it('keeps the hour within the day', () => {
    assert.equal(layout('?seed=3&hour=3').hour, 8)
    assert.equal(layout('?seed=3&hour=23').hour, 20)
  })

  it('picks exactly the props asked for, two or three of them', () => {
    assert.deepEqual([...layout('?seed=3&props=dig,film').props].sort(), ['dig', 'film'])
  })

  it('picks the creatures', () => {
    assert.deepEqual(layout('?seed=3&creatures=spider').creatures, ['spider'])
    assert.deepEqual(layout('?seed=3&creatures=').creatures, [])
  })

  it('forces the flowers, the rain and the fruit', () => {
    assert.equal(layout('?seed=3&flowers=0&creatures=fly').flowers, false)
    assert.equal(layout('?seed=3&flowers=1').flowers, true)
    assert.equal(layout('?seed=3&rain=0').rain, false)
    assert.equal(layout('?seed=3&rain=1').rain, true)
    assert.equal(layout('?seed=3&fruit=plum').fruit, 'plum')
    assert.notEqual(layout('?seed=3&fruit=banana').fruit, 'banana')
  })

  it("doesn't shift the rest of a seeded play", () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const plain = layout(`?seed=${seed}`)
      const forced = layout(`?seed=${seed}&rain=1&fruit=nut&flowers=${plain.flowers ? 1 : 0}`)
      assert.deepEqual(forced.shift, plain.shift, `seed ${seed}`)
      assert.deepEqual(forced.puddles, plain.puddles, `seed ${seed}`)
    }
  })

  it("doesn't shift the creatures, weather or sky when the props are picked", () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const plain = layout(`?seed=${seed}`)
      const forced = layout(`?seed=${seed}&props=dig,film`)
      for (const k of ['creatures', 'flowers', 'rain', 'fruit', 'sun', 'moon', 'wakeAfter']) assert.deepEqual(forced[k], plain[k], `seed ${seed}: ${k}`)
    }
  })

  it('reads the forced times', () => {
    const L = layout('?mouse-at=0&visitor-at=2&rain-at=5')
    assert.equal(L.mouseAt, 0)
    assert.equal(L.visitorAt, 2)
    assert.equal(L.rainAt, 5)
  })
})
