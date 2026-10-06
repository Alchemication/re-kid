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
  it('always counts the doghouse and three others, all different', () => {
    for (const seed of SEEDS) {
      const L = layout(`?seed=${seed}`)
      assert.equal(L.mains.length, 4, `seed ${seed}`)
      assert.ok(L.mains.includes('doghouse'), `seed ${seed}`)
      assert.equal(new Set(L.mains).size, 4, `seed ${seed}`)
    }
  })

  it('shows a prop only when it counts (the tap always, the flowers sometimes)', () => {
    for (const seed of SEEDS) {
      const L = layout(`?seed=${seed}`)
      for (const n of ['bowl', 'dig', 'film', 'trap', 'tree', 'berries']) assert.equal(L.hidden.includes(n), !L.mains.includes(n), `seed ${seed}: ${n}`)
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

  it('orders the tray from left to right, doghouse first', () => {
    for (const seed of SEEDS) {
      const L = layout(`?seed=${seed}`)
      assert.equal(L.mains[0], 'doghouse', `seed ${seed}`)
      const where = (n) => (n === 'bird' ? L.perches[0] : L.FOOTPRINTS[n][0] + L.shift[n])
      const xs = L.mains.slice(1).map(where)
      assert.deepEqual(xs, [...xs].sort((a, b) => a - b), `seed ${seed}`)
    }
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
    const a = layout('?seed=11', { storage: { 'reksio-yard-last-play': JSON.stringify({ mains: ['doghouse', 'bowl', 'tap', 'dig'], rain: true }) } })
    const b = layout('?seed=11')
    assert.deepEqual(a, b)
  })

  it('remembers an unseeded play, and prefers new things next time', () => {
    const page = load(['debug.js', 'layout.js'])
    const memory = JSON.parse(page.store.get('reksio-yard-last-play'))
    assert.deepEqual(memory.mains, page.json('Layout.mains'))
    // over many unseeded plays after the same one, its things come up less
    const last = { mains: ['doghouse', 'bowl', 'tap', 'bird'], creatures: ['fly', 'bee'], rain: false }
    let again = 0
    for (let i = 0; i < 300; i++) {
      const L = layout('', { storage: { 'reksio-yard-last-play': JSON.stringify(last) } })
      again += L.mains.filter((n) => last.mains.includes(n) && n !== 'doghouse').length
    }
    assert.ok(again / 300 < 0.9 * 3 * (3 / 8), `seen-before things came up ${again / 300} a play`)
  })

  it('still makes a play when storage is blocked', () => {
    assert.equal(layout('', { storageThrows: true }).mains.length, 4)
  })

  it('survives a corrupted memory', () => {
    assert.equal(layout('', { storage: { 'reksio-yard-last-play': '{not json' } }).mains.length, 4)
  })
})

describe('flags in the page address', () => {
  it('picks the main things, ignoring unknown names', () => {
    assert.deepEqual([...layout('?seed=3&mains=trap,nonsense,bowl').mains].sort(), ['bowl', 'doghouse', 'trap'])
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

  it('reads the forced times', () => {
    const L = layout('?mouse-at=0&visitor-at=2&rain-at=5')
    assert.equal(L.mouseAt, 0)
    assert.equal(L.visitorAt, 2)
    assert.equal(L.rainAt, 5)
  })
})
