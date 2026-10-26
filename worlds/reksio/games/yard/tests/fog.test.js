// The morning fog (game/fog.js): plain rules, no page.
const test = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const Fog = load(['fog.js']).get('Fog')

/** A seeded random stream (mulberry32), as Debug.random gives the game. */
function stream(seed = 1) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

test('some plays wake in fog; forced either way, the draws are made all the same', () => {
  let foggy = 0
  for (let seed = 1; seed <= 300; seed++) if (Fog.plan(stream(seed))) foggy += 1
  assert.ok(foggy > 50 && foggy < 130, `${foggy} of 300`)
  for (const forced of [true, false]) {
    let draws = 0
    const counting = () => { draws += 1; return 0.5 }
    Fog.plan(counting, forced)
    assert.equal(draws, 2)
  }
  assert.ok(Fog.plan(stream(), true))
  assert.equal(Fog.plan(stream(), false), null)
})

test('thick at first, lifting mid-morning, gone well before noon', () => {
  const p = { thick: 0.8 }
  assert.equal(Fog.level(p, 8), 0.8)
  assert.equal(Fog.level(p, Fog.LIFTS[0]), 0.8)
  const mid = Fog.level(p, (Fog.LIFTS[0] + Fog.LIFTS[1]) / 2)
  assert.ok(mid > 0.1 && mid < 0.7)
  assert.equal(Fog.level(p, Fog.LIFTS[1]), 0)
  assert.equal(Fog.level(p, 12), 0)
  assert.equal(Fog.level(null, 8), 0)
})
