// Unit tests for sky.js: the shape of the moon.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const Sky = load(['debug.js', 'layout.js', 'sky.js']).get('Sky')

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
