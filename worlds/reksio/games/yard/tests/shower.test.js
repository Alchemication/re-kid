// Unit tests for shower.js: the shower's timeline, from waiting to dry.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const Shower = load(['shower.js']).get('Shower')
const PLAN = { rain: true, startAt: 10, rainFor: 20 }

/** Step `shower` for `seconds` in small steps; the phases entered, in order. */
function run(shower, seconds, dt = 0.05) {
  const entered = []
  for (let i = 0; i < Math.round(seconds / dt); i++) entered.push(...shower.step(dt))
  return entered
}

describe('a shower', () => {
  it('goes through every phase once, in order', () => {
    const shower = Shower.start(PLAN)
    assert.deepEqual(run(shower, 200), ['clouding', 'raining', 'clearing', 'after', 'dry'])
  })

  it('starts on time, and rains for as long as planned once the clouds are in', () => {
    const shower = Shower.start(PLAN)
    run(shower, 9.9)
    assert.equal(shower.phase, 'waiting')
    run(shower, 0.2)
    assert.equal(shower.phase, 'clouding')
    run(shower, Shower.CLOUD_IN_S)
    assert.equal(shower.phase, 'raining')
    run(shower, 19.8)
    assert.equal(shower.phase, 'raining')
    run(shower, 0.4)
    assert.equal(shower.phase, 'clearing')
  })

  it('covers the sky as the clouds come, and uncovers it as they go', () => {
    const shower = Shower.start(PLAN)
    run(shower, 10 + Shower.CLOUD_IN_S / 2)
    assert.ok(Math.abs(shower.cover - 0.5) < 0.05, `half way in: ${shower.cover}`)
    run(shower, 10) // 22 s: raining (from 14 s)
    assert.equal(shower.cover, 1)
    run(shower, 14) // 36 s: clearing (from 34 s)
    assert.ok(shower.cover < 1 && shower.cover > 0, `clearing: ${shower.cover}`)
    run(shower, Shower.CLEAR_S)
    assert.equal(shower.cover, 0)
  })

  it('rains harder over the first seconds, and eases off as it clears', () => {
    const shower = Shower.start(PLAN)
    run(shower, 10 + Shower.CLOUD_IN_S + 0.1)
    const early = shower.intensity
    run(shower, 5)
    assert.ok(early > 0 && early < 1, `getting going: ${early}`)
    assert.equal(shower.intensity, 1)
    run(shower, 16)
    assert.equal(shower.phase, 'clearing')
    assert.ok(shower.intensity < 1)
  })

  it('fills the puddles while it rains and dries them after', () => {
    const shower = Shower.start({ rain: true, startAt: 0, rainFor: 30 })
    assert.equal(shower.wet, 0)
    run(shower, 30)
    assert.equal(shower.wet, 1) // full after 18 s of rain
    run(shower, 10)
    assert.equal(shower.phase, 'after')
    const wet = shower.wet
    assert.ok(wet > 0 && wet < 1)
    run(shower, Shower.DRY_S)
    assert.equal(shower.phase, 'dry')
    assert.equal(shower.wet, 0)
  })

  it('says how long since the rain stopped, once it has', () => {
    const shower = Shower.start(PLAN)
    run(shower, 30)
    assert.equal(shower.sinceRain, null)
    run(shower, 10)
    assert.ok(shower.sinceRain > 0)
  })

  it('never comes in a dry play', () => {
    const shower = Shower.start({ ...PLAN, rain: false })
    assert.deepEqual(run(shower, 200), [])
    assert.equal(shower.phase, 'dry')
    assert.equal(shower.cover, 0)
  })
})

describe('stopping a shower (dusk)', () => {
  it('cancels one still to come', () => {
    const shower = Shower.start(PLAN)
    run(shower, 5)
    assert.deepEqual([...shower.stop()], ['dry'])
    assert.deepEqual(run(shower, 100), [])
  })

  it('clears one that is raining, puddles and all', () => {
    const shower = Shower.start(PLAN)
    run(shower, 20)
    assert.deepEqual([...shower.stop()], ['clearing'])
    assert.deepEqual(run(shower, 200), ['after', 'dry'])
  })

  it('brings no rainbow when it is stopped before any rain fell', () => {
    const shower = Shower.start(PLAN)
    run(shower, 11) // clouds rolling in
    assert.deepEqual([...shower.stop()], ['clearing'])
    assert.equal(shower.intensity, 0)
    assert.deepEqual(run(shower, 20), ['dry'])
    assert.equal(shower.sinceRain, null)
  })

  it('changes nothing once it is over', () => {
    const shower = Shower.start(PLAN)
    run(shower, 200)
    assert.deepEqual([...shower.stop()], [])
    assert.equal(shower.phase, 'dry')
  })
})
