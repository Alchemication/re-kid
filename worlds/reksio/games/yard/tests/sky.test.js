// Unit tests for sky.js: the sky through the day, and the shape of the moon.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const Sky = load(['debug.js', 'layout.js', 'day.js', 'sky.js'], { query: '?seed=1&sky=clear' }).get('Sky')
const golden = load(['debug.js', 'layout.js', 'day.js', 'sky.js'], { query: '?seed=1&sky=golden' }).get('Sky')

/** The terminator's half-width and which way it bulges, from a moon path. */
function terminator(d) {
  const m = d.match(/A([\d.]+) [\d.]+ 0 0 (\d) 0 -[\d.]+ Z$/)
  return { rx: Number(m[1]), sweep: Number(m[2]) }
}

describe('the moon', () => {
  it('is a crescent when little is lit: the terminator bulges toward the lit side', () => {
    assert.deepEqual(terminator(Sky.moonPath(40, 0.2)), { rx: 24, sweep: 0 })
  })

  it('is half lit with a straight terminator', () => {
    assert.equal(terminator(Sky.moonPath(40, 0.5)).rx, 0)
  })

  it('is gibbous past half, and full at 1: the terminator bulges the other way', () => {
    assert.deepEqual(terminator(Sky.moonPath(40, 0.85)), { rx: 28, sweep: 1 })
    assert.deepEqual(terminator(Sky.moonPath(40, 1)), { rx: 40, sweep: 1 })
  })
})

describe('the sky through the day', () => {
  const minutes = (from, to) => Array.from({ length: (to - from) * 60 + 1 }, (_, i) => from + i / 60)
  const rgb = (c) => c.match(/\d+/g).map(Number)
  const WALL_TOP = 334

  it('has the sun up over the wall at 08:00, highest about noon, behind the wall at 19:00', () => {
    const at = (h) => Sky.look(h)
    assert.ok(at(8).y + 46 < WALL_TOP, 'all of it above the wall in the morning')
    const high = Math.min(...minutes(8, 19).map((h) => at(h).y))
    assert.ok(Math.abs(at(12.5).y - high) < 1)
    assert.ok(at(19).y - 74 >= WALL_TOP, 'glow and all behind the wall')
  })

  it('crosses the sky one way, and never jumps', () => {
    const ls = minutes(8, 20).map((h) => Sky.look(h))
    for (let i = 1; i < ls.length; i++) {
      assert.ok(ls[i].x >= ls[i - 1].x)
      assert.ok(Math.abs(ls[i].y - ls[i - 1].y) < 3)
      assert.ok(Math.abs(ls[i].tint - ls[i - 1].tint) < 0.02)
      const [a, b] = [rgb(ls[i - 1].color), rgb(ls[i].color)]
      assert.ok(a.every((v, j) => Math.abs(v - b[j]) <= 4), `${ls[i - 1].color} to ${ls[i].color}`)
    }
  })

  it('warms all afternoon, to red at sunset', () => {
    const ts = minutes(15, 19).map((h) => Sky.look(h).tint)
    for (let i = 1; i < ts.length; i++) assert.ok(ts[i] >= ts[i - 1])
    assert.equal(Sky.look(19).color, 'rgb(217 84 46)')
    assert.ok(Sky.look(19).tint > 0.5)
    assert.equal(Sky.look(13).tint, 0)
  })

  it('is warmer all day on a golden day, but no warmer than a red sunset allows', () => {
    for (const h of [9, 13, 17]) assert.ok(golden.look(h).tint > Sky.look(h).tint + 0.05, `${h}:00`)
    assert.ok(golden.look(19).tint <= 0.65)
  })

  it('brings the moon up through the last hour', () => {
    assert.equal(Sky.look(18.9).moonUp, 0)
    assert.ok(Math.abs(Sky.look(19.5).moonUp - 0.5) < 1e-9)
    assert.equal(Sky.look(20).moonUp, 1)
  })
})
