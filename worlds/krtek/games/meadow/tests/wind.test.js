// The wind (game/wind.js, a copy of shared/): plain rules, no page.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const sandbox = {}
vm.createContext(sandbox)
vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'game', 'wind.js'), 'utf8')}\nthis.Wind = Wind`, sandbox)
const { Wind } = sandbox

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

/** Its level each tenth of a second for `s` seconds. */
function blow(w, s, extra = 0) {
  const levels = []
  for (let k = 0; k < s * 10; k++) levels.push(Wind.step(w, 0.1, extra))
  return levels
}

test('mostly a breeze, now and then a gust, never past a full one', () => {
  const levels = blow(Wind.make(stream()), 600)
  assert.ok(levels.every((l) => l >= 0 && l <= 1))
  const gusty = levels.filter((l) => l > 0.6).length / levels.length
  assert.ok(gusty > 0.01 && gusty < 0.25, `in a gust ${(gusty * 100).toFixed(1)}% of the time`)
})

test('the same stream blows the same', () => {
  assert.deepEqual(blow(Wind.make(stream(4)), 60), blow(Wind.make(stream(4)), 60))
})

test('clouds coming in make it stronger', () => {
  const calm = blow(Wind.make(stream(2)), 60)
  const cloudy = blow(Wind.make(stream(2)), 60, 0.25)
  assert.ok(cloudy.at(-1) > calm.at(-1))
})

test('a gust asked for comes at once and passes; the evening drops it to the lightest breeze', () => {
  const w = Wind.make(stream())
  blow(w, 5)
  Wind.gust(w)
  assert.ok(Math.max(...blow(w, 3)) > 0.7)
  Wind.calm(w)
  const after = blow(w, 30)
  assert.ok(after.at(-1) < 0.1, `still ${after.at(-1)}`)
  assert.ok(!w.gust)
})
