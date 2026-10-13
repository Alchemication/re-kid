// Unit tests for day.js: the day on a clock, from waking to bed.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const Day = load(['day.js']).get('Day')
const HOUR = 1000 // a 12 s day: a second an hour
const newDay = (options = {}) => Day.start({ lengthMs: 12 * HOUR, ...options })

/** A day begun at 0 and run to `ms`, ticking every 100 ms as yard.js does. */
function runTo(day, ms, from = 0) {
  for (let t = from; t <= ms; t += 100) day.tick(t)
}

describe('the clock', () => {
  it('stands at 08:00 until he wakes, then starts', () => {
    const day = newDay()
    assert.equal(day.hour(50_000), 8)
    assert.equal(day.begun, false)
    day.begin(1000)
    assert.equal(day.hour(1000), 8)
    assert.equal(day.hour(1000 + 3 * HOUR), 11)
  })

  it('moves at the same pace all day', () => {
    const day = newDay()
    day.begin(0)
    const hours = [0, 1, 2, 3, 4, 5].map((n) => day.hour(n * 2 * HOUR))
    assert.deepEqual(hours, [8, 10, 12, 14, 16, 18])
  })

  it('begins once: a second begin moves nothing', () => {
    const day = newDay()
    day.begin(0)
    day.begin(5 * HOUR)
    assert.equal(day.hour(5 * HOUR), 13)
  })

  it('stops at 20:00', () => {
    const day = newDay()
    day.begin(0)
    assert.equal(day.hour(100 * HOUR), 20)
  })

  it('lasts five minutes by default, 25 s an hour', () => {
    const day = Day.start()
    day.begin(0)
    assert.equal(day.hour(25_000), 9)
    assert.equal(day.hour(5 * 60_000), 20)
  })

  it('can begin later in the day (?hour), at the same pace', () => {
    const day = newDay({ from: 18 })
    day.begin(0)
    assert.equal(day.hour(0), 18)
    assert.equal(day.hour(HOUR), 19)
  })
})

describe('a grown-up hurrying the sun down', () => {
  it('sets it within HURRY_MS, then lets the last hour run as ever', () => {
    const day = newDay()
    day.begin(0)
    assert.equal(day.hurry(2 * HOUR), true) // at 10:00
    assert.equal(day.hurrying(2 * HOUR + 1), true)
    assert.ok(Math.abs(day.hour(2 * HOUR + Day.HURRY_MS / 2) - 14.5) < 1e-9, 'half way down')
    assert.equal(day.hour(2 * HOUR + Day.HURRY_MS), 19)
    assert.equal(day.hurrying(2 * HOUR + Day.HURRY_MS), false)
    assert.equal(day.hour(2 * HOUR + Day.HURRY_MS + HOUR / 2), 19.5)
    assert.equal(day.tick(2 * HOUR + Day.HURRY_MS), true, 'the sun sets')
  })

  it('only in the day, once he is up, and once', () => {
    const asleep = newDay()
    assert.equal(asleep.hurry(0), false)
    const day = newDay()
    day.begin(0)
    assert.equal(day.hurry(0), true)
    assert.equal(day.hurry(100), false)
    const evening = newDay({ from: 19.5 })
    evening.begin(0)
    evening.tick(0)
    assert.equal(evening.hurry(0), false)
  })

  it('never moves the hour backwards', () => {
    const day = newDay()
    day.begin(0)
    day.hurry(3 * HOUR)
    let last = 0
    for (let t = 0; t < 6 * HOUR; t += 50) {
      assert.ok(day.hour(t) >= last, `at ${t}`)
      last = day.hour(t)
    }
  })
})

describe('sleepy', () => {
  it('from 18:00', () => {
    const day = newDay()
    day.begin(0)
    assert.equal(day.sleepy(10 * HOUR - 1), false)
    assert.equal(day.sleepy(10 * HOUR), true)
  })
})

describe('what he does', () => {
  it('never moves the day: a hundred things, the same hour', () => {
    const busy = newDay()
    const idle = newDay()
    busy.begin(0)
    idle.begin(0)
    for (let i = 0; i < 100; i++) busy.did(`thing ${i}`)
    runTo(busy, 6 * HOUR)
    runTo(idle, 6 * HOUR)
    assert.equal(busy.hour(6 * HOUR), idle.hour(6 * HOUR))
    assert.equal(busy.phase, 'day')
  })

  it('says whether it was the first time', () => {
    const day = newDay()
    assert.deepEqual({ ...day.did('bowl') }, { first: true })
    assert.deepEqual({ ...day.did('bowl') }, { first: false })
    assert.equal(day.count, 1)
  })
})

describe('the evening', () => {
  it('the sun sets at 19:00, once', () => {
    const day = newDay()
    day.begin(0)
    assert.equal(day.tick(11 * HOUR - 1), false)
    assert.equal(day.tick(11 * HOUR), true)
    assert.equal(day.phase, 'dusk')
    assert.equal(day.tick(11.5 * HOUR), false)
  })

  it('is bedtime at 20:00', () => {
    const day = newDay()
    day.begin(0)
    runTo(day, 12 * HOUR - 100)
    assert.equal(day.bedtime, false)
    day.tick(12 * HOUR)
    assert.equal(day.bedtime, true)
  })

  it('a day begun at 20:00 sets the sun and is bedtime on its first tick', () => {
    const day = newDay({ from: 20 })
    day.begin(0)
    assert.equal(day.tick(0), true)
    assert.equal(day.phase, 'bedtime')
  })

  it('never comes while he is still asleep', () => {
    const day = newDay()
    runTo(day, 100 * HOUR)
    assert.equal(day.phase, 'day')
  })
})

describe('bed', () => {
  it('is never before the sun has set', () => {
    const day = newDay()
    day.begin(0)
    runTo(day, 10 * HOUR)
    assert.equal(day.bed(), false)
    assert.equal(day.phase, 'day')
  })

  it('can come at dusk, before bedtime (the doghouse tapped)', () => {
    const day = newDay()
    day.begin(0)
    runTo(day, 11 * HOUR)
    assert.equal(day.bed(), true)
    assert.equal(day.ended, true)
  })

  it('happens once: night stays night as the clock runs on', () => {
    const day = newDay()
    day.begin(0)
    runTo(day, 11 * HOUR)
    day.bed()
    assert.equal(day.bed(), false)
    runTo(day, 13 * HOUR, 11 * HOUR)
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
    day.begin(0)
    runTo(day, 11 * HOUR)
    assert.equal(day.wants('tap'), false)
    assert.equal(day.wants(Day.BED), true)
    runTo(day, 12 * HOUR, 11 * HOUR)
    assert.equal(day.wants(Day.BED), true)
  })

  it('at night: nothing', () => {
    const day = newDay()
    day.begin(0)
    runTo(day, 11 * HOUR)
    day.bed()
    assert.equal(day.wants(Day.BED), false)
  })
})
