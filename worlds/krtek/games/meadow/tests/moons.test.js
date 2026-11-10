// The evening's moon (game/moons.js): plain rules, no page.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const sandbox = {}
vm.createContext(sandbox)
vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'game', 'moons.js'), 'utf8')}\nthis.Moons = Moons`, sandbox)
const { Moons } = sandbox

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

/** A plan for each of 600 seeds, with how many draws it made. */
function plans(asked) {
  return Array.from({ length: 600 }, (_, k) => {
    let draws = 0
    const next = stream(k + 1)
    return { moon: Moons.plan(() => { draws += 1; return next() }, asked), draws }
  })
}

test('each kind comes, about at its share, each play its own; the same draws whatever the kind or ?moon=', () => {
  const all = plans()
  const draws = new Set([...all, ...plans('full')].map((p) => p.draws))
  assert.equal(draws.size, 1)
  for (const [kind, share] of Object.entries(Moons.KINDS)) {
    const got = all.filter((p) => p.moon.kind === kind).length / all.length
    assert.ok(Math.abs(got - share) < 0.07, `${kind} ${got}`)
  }
  const fulls = all.filter((p) => p.moon.kind === 'full').map((p) => p.moon)
  assert.ok(new Set(fulls.map((m) => m.r.toFixed(0))).size > 5, 'full moons of different sizes')
  assert.ok(new Set(all.map((m) => m.moon.lit)).size === 2)
  for (const { moon } of all) {
    assert.ok(moon.r >= Moons.SIZE[0] && moon.r <= Moons.SIZE[1])
    assert.ok(moon.x >= Moons.X[0] && moon.x <= Moons.X[1])
    assert.ok(moon.tilt >= Moons.TILT[0] && moon.tilt <= Moons.TILT[1])
  }
})

test('asked for, that kind; asked for no kind, the drawn one', () => {
  assert.ok(plans('crescent').every((p) => p.moon.kind === 'crescent'))
  assert.deepEqual(plans('banana').map((p) => p.moon.kind), plans().map((p) => p.moon.kind))
})

test('its shape: a whole circle, a half with a straight edge, a crescent bulging the lit way', () => {
  const base = { r: 40, lit: 'right', thin: 0.6 }
  assert.match(Moons.shape({ ...base, kind: 'full' }), /^M-40\.0 0 A40\.0 40\.0 0 1 1 40\.0 0 A/)
  assert.equal(Moons.shape({ ...base, kind: 'half' }), 'M0 -40.0 A40.0 40.0 0 0 1 0 40.0 A0.0 40.0 0 0 0 0 -40.0 Z')
  assert.equal(Moons.shape({ ...base, kind: 'crescent' }), 'M0 -40.0 A40.0 40.0 0 0 1 0 40.0 A24.0 40.0 0 0 0 0 -40.0 Z')
  assert.equal(Moons.shape({ ...base, kind: 'crescent', lit: 'left' }), 'M0 -40.0 A40.0 40.0 0 0 0 0 40.0 A24.0 40.0 0 0 1 0 -40.0 Z')
})
