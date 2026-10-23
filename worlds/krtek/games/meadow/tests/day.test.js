// The meadow's day (game/day.js): plain rules, no page.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const sandbox = {}
vm.createContext(sandbox)
vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'game', 'day.js'), 'utf8')}\nthis.Day = Day`, sandbox)
const { Day } = sandbox

test('the day runs from 08:00 to 20:00 in five minutes, and no further', () => {
  assert.equal(Day.hour(0), 8)
  assert.equal(Day.hour(Day.DAY_MS / 2), 14)
  assert.equal(Day.hour(Day.DAY_MS), 20)
  assert.equal(Day.hour(Day.DAY_MS * 3), 20)
  assert.equal(Day.hour(30000, 60000), 14) // ?day=60: the same day, a minute long
})

test('it is day until sunset, then dusk, then bedtime at 20:00', () => {
  assert.equal(Day.phase(18.9), 'day')
  assert.equal(Day.phase(19), 'dusk')
  assert.equal(Day.phase(19.99), 'dusk')
  assert.equal(Day.phase(20), 'bedtime')
})

test('the tulips open in the morning and close as the sun goes down', () => {
  assert.equal(Day.tulips(8), 0)
  assert.equal(Day.tulips(12), 1)
  assert.ok(Day.tulips(18.5) > 0 && Day.tulips(18.5) < 1)
  assert.equal(Day.tulips(19.5), 0)
})

test('the cricket fiddles from dusk until bedtime only', () => {
  assert.equal(Day.cricket(18), false)
  assert.equal(Day.cricket(19.5), true)
  assert.equal(Day.cricket(20), false)
})

test('the circle shows everything until 19:00, then closes steadily to the molehill', () => {
  assert.equal(Day.iris(12), 1)
  assert.equal(Day.iris(19), 1)
  assert.ok(Day.iris(19.5) < 1 && Day.iris(19.5) > Day.iris(19.9))
  assert.ok(Math.abs(Day.iris(20) - 0.16) < 1e-9)
})

test('the sun crosses from left to right and is gone at sunset; the moon rises after', () => {
  assert.ok(Day.sun(8).across < Day.sun(13).across && Day.sun(13).across < Day.sun(18.9).across)
  assert.ok(Day.sun(13).up > Day.sun(8.2).up)
  assert.equal(Day.sun(19), null)
  assert.equal(Day.moon(18), null)
  assert.ok(Day.moon(19.9).up > Day.moon(19.1).up)
})

test('the sky moves between its colours by hour', () => {
  assert.deepEqual({ ...Day.sky(12) }, { top: '#94b8ea', bottom: '#e4e8f6' })
  assert.match(Day.sky(18).top, /^#[0-9a-f]{6}$/)
  assert.deepEqual({ ...Day.sky(20) }, { top: '#1d2a5a', bottom: '#3e4b80' })
})
