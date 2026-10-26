// The eclipse (game/eclipse.js): plain rules, no page.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const sandbox = {}
vm.createContext(sandbox)
vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'game', 'eclipse.js'), 'utf8')}\nthis.Eclipse = Eclipse`, sandbox)
const { Eclipse } = sandbox
const { IN_MS, HOLD_MS, OUT_MS } = Eclipse

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

test('some plays have one, around midday; each plan draws twice, eclipse or not', () => {
  let n = 0
  let had = 0
  for (let seed = 1; seed <= 400; seed++) {
    let draws = 0
    const next = stream(seed)
    const random = () => {
      draws += 1
      return next()
    }
    const at = Eclipse.plan(random)
    assert.equal(draws, 2)
    n += 1
    if (at !== null) {
      had += 1
      assert.ok(at >= 11 && at <= 15, `at ${at}`)
    }
  }
  assert.ok(had / n > 0.15 && had / n < 0.35, `${had} of ${n}`)
})

test('the moon slides over, stays, and slides off; then it is over', () => {
  assert.equal(Eclipse.cover(-1), 0)
  assert.equal(Eclipse.cover(0), 0)
  assert.ok(Eclipse.cover(IN_MS / 2) > 0.3 && Eclipse.cover(IN_MS / 2) < 0.7)
  assert.equal(Eclipse.cover(IN_MS + HOLD_MS / 2), 1)
  assert.equal(Eclipse.cover(IN_MS + HOLD_MS + OUT_MS), 0)
  assert.ok(!Eclipse.over(IN_MS + HOLD_MS))
  assert.ok(Eclipse.over(IN_MS + HOLD_MS + OUT_MS))
  assert.ok(Eclipse.across(0) < -0.99 && Eclipse.across(IN_MS + 1) === 0 && Eclipse.across(IN_MS + HOLD_MS + OUT_MS) > 0.99)
})

test('the light falls as the moon comes over, to about dusk and never to night; the hour does not move', () => {
  assert.equal(Eclipse.light(0), 1)
  assert.ok(Eclipse.light(0.5) > Eclipse.light(1))
  assert.ok(Eclipse.light(1) >= 0.25 && Eclipse.light(1) <= 0.35)
  assert.equal(Eclipse.skyHour(13, 0), 13) // the sky is drawn as later only while the moon is over the sun
  assert.ok(Eclipse.skyHour(13, 1) > 19 && Eclipse.skyHour(13, 1) < 20)
})
