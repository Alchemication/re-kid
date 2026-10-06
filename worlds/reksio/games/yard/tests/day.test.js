// Unit tests for day.js: how the day passes, from the first thing to bed.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const Day = load(['day.js']).get('Day')
const newDay = (options = {}) => Day.start(0, { things: 3, ...options })

describe('the day', () => {
  it('brings a sunset step with each new thing, and the sun sets on the last', () => {
    const day = newDay()
    assert.deepEqual({ ...day.did('bowl') }, { first: true, step: 1, dusk: false })
    assert.deepEqual({ ...day.did('tap') }, { first: true, step: 2, dusk: false })
    assert.equal(day.phase, 'day')
    assert.deepEqual({ ...day.did('gate') }, { first: true, step: 3, dusk: true })
    assert.equal(day.phase, 'dusk')
  })

  it('counts a repeat once: no step, no sunset', () => {
    const day = newDay()
    day.did('bowl')
    for (let i = 0; i < 10; i++) assert.deepEqual({ ...day.did('bowl') }, { first: false, step: null, dusk: false })
    assert.equal(day.count, 1)
    assert.equal(day.dusk, false)
  })

  it('counts every thing the same, the doghouse too', () => {
    const day = newDay()
    for (const n of ['doghouse', 'house', 'gate']) day.did(n)
    assert.equal(day.dusk, true)
  })

  it('sets the sun only once: new things at dusk are still new, but bring no step', () => {
    const day = newDay()
    for (const n of ['a', 'b', 'c']) day.did(n)
    assert.deepEqual({ ...day.did('d') }, { first: true, step: null, dusk: false })
    assert.equal(day.phase, 'dusk')
    assert.deepEqual([...day.done], ['a', 'b', 'c', 'd'])
  })

  it('sets the sun after a long day, whatever was done, and only once', () => {
    const day = newDay({ maxMs: 1000 })
    day.did('bowl')
    assert.equal(day.tick(999), false)
    assert.equal(day.tick(1000), true)
    assert.equal(day.phase, 'dusk')
    assert.equal(day.tick(5000), false)
  })

  it('lets a long day pass once the sun has set on things', () => {
    const day = newDay({ maxMs: 1000 })
    for (const n of ['a', 'b', 'c']) day.did(n)
    assert.equal(day.tick(2000), false)
  })

  it('lasts ten minutes at most by default', () => {
    const day = Day.start(500, { things: 3 })
    assert.equal(day.tick(500 + 10 * 60000 - 1), false)
    assert.equal(day.tick(500 + 10 * 60000), true)
  })
})

describe('bed', () => {
  it('is never before the sun has set', () => {
    const day = newDay()
    day.moonUp() // a moon in the day changes nothing
    assert.equal(day.bedtime, false)
    assert.equal(day.bed(), false)
    assert.equal(day.phase, 'day')
  })

  it('is bedtime once the moon is up', () => {
    const day = newDay()
    for (const n of ['a', 'b', 'c']) day.did(n)
    day.moonUp()
    assert.equal(day.phase, 'bedtime')
    assert.equal(day.bed(), true)
    assert.equal(day.ended, true)
  })

  it('can come at dusk, before the moon is up (the doghouse tapped)', () => {
    const day = newDay()
    for (const n of ['a', 'b', 'c']) day.did(n)
    assert.equal(day.bed(), true)
    assert.equal(day.phase, 'night')
  })

  it('happens once: night stays night', () => {
    const day = newDay()
    for (const n of ['a', 'b', 'c']) day.did(n)
    day.bed()
    assert.equal(day.bed(), false)
    day.moonUp() // the moon finishing its rise after an early bed
    assert.equal(day.phase, 'night')
    assert.equal(day.bedtime, false)
  })
})

describe('what he wants', () => {
  it('in the day: anything he has not done yet', () => {
    const day = newDay()
    day.did('bowl')
    assert.equal(day.wants('bowl'), false)
    assert.equal(day.wants('tap'), true)
  })

  it('from dusk to bedtime: only his bed', () => {
    const day = newDay()
    for (const n of ['a', 'b', 'c']) day.did(n)
    assert.equal(day.wants('tap'), false)
    assert.equal(day.wants(Day.BED), true)
    day.moonUp()
    assert.equal(day.wants(Day.BED), true)
  })

  it('at night: nothing', () => {
    const day = newDay()
    for (const n of ['a', 'b', 'c']) day.did(n)
    day.bed()
    assert.equal(day.wants(Day.BED), false)
  })
})
