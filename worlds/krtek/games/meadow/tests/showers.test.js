// Autumn's rain (game/showers.js): plain rules, no page.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const sandbox = {}
vm.createContext(sandbox)
vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'game', 'showers.js'), 'utf8')}\nthis.Showers = Showers`, sandbox)
const { Showers } = sandbox

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

/** Plans over 600 seeds in a season: each one's draws counted. */
function plans(season, options) {
  return Array.from({ length: 600 }, (_, k) => {
    let draws = 0
    const next = stream(k + 1)
    const plan = Showers.plan(() => { draws += 1; return next() }, season, options)
    return { plan, draws }
  })
}

test('about one autumn play in three has rain, by day, mostly a drizzle; three draws a plan either way', () => {
  const all = plans('autumn')
  assert.ok(all.every(({ draws }) => draws === 3))
  const rained = all.map(({ plan }) => plan).filter(Boolean)
  const share = rained.length / all.length
  assert.ok(share > 0.28 && share < 0.42, `share ${share}`)
  assert.ok(rained.every(({ at }) => at >= Showers.HOURS[0] && at <= Showers.HOURS[1]))
  const count = (kind) => rained.filter((p) => p.kind === kind).length
  assert.ok(count('drizzle') > count('shower') && count('shower') > count('downpour') && count('downpour') > 0, JSON.stringify({ d: count('drizzle'), s: count('shower'), p: count('downpour') }))
})

test('none in spring, unless asked for; asked for, it comes soon, as hard as asked, in any season', () => {
  assert.ok(plans('spring').every(({ plan }) => plan === null))
  for (const { plan, draws } of plans('spring', { asked: 'downpour', start: 8 })) {
    assert.equal(draws, 3)
    assert.equal(plan.kind, 'downpour')
    assert.ok(plan.at > 8 && plan.at < 8.5)
  }
  assert.ok(plans('spring', { asked: 'hail' }).every(({ plan }) => plan === null)) // not a kind: as if not asked
})

test('it starts when due, never past the latest hour, nor over rain or an encounter', () => {
  const shower = { at: 11, kind: 'shower' }
  assert.equal(Showers.due(shower, 10.9), false)
  assert.equal(Showers.due(shower, 11), true)
  assert.equal(Showers.due(shower, 11.5, { held: true }), false) // an encounter out: it waits
  assert.equal(Showers.due(shower, 11.5, { raining: true }), false)
  assert.equal(Showers.due(shower, Showers.LATEST + 0.1), false) // held back too long: none this play
  assert.equal(Showers.due(null, 12), false)
})
