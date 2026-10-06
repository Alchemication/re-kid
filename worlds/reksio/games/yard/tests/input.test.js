// Unit tests for input.js: what a tap or a key means, and what an ask does
// while Reksio is busy.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const Input = load(['input.js']).get('Input')
const YARD = { groundTop: 700, puddles: [{ x: 2000, rx: 100 }] }
/** A tap at (x, y) with nothing but the ground under it, plus `hit`. */
const tap = (hit = {}) => Input.tap({ critter: null, nearMiddle: false, under: {}, x: 1234.4, y: 800, ...hit }, YARD)

describe('a tap', () => {
  it('on the ground walks him there', () => {
    assert.equal(tap(), 'walk to 1234')
  })

  it('on a thing sends him to use it', () => {
    assert.equal(tap({ under: { thing: 'bowl' } }), 'go to bowl')
  })

  it('on Reksio is a press (bark, or hold to stretch)', () => {
    assert.equal(tap({ under: { reksio: true } }), 'press')
  })

  it('on an action spot sends him to its thing', () => {
    assert.equal(tap({ under: { spot: 'gate' } }), 'go to gate')
  })

  it('on a thing wins over the spot beneath it', () => {
    assert.equal(tap({ under: { thing: 'tap', spot: 'tap' } }), 'go to tap')
  })

  describe('near a puddle', () => {
    it('means jump in, out to a little past its edge', () => {
      assert.equal(tap({ x: 2000 }), 'jump in puddle at 2000')
      assert.equal(tap({ x: 2000 + 100 + Input.PUDDLE_REACH - 1 }), 'jump in puddle at 2000')
      assert.equal(tap({ x: 2000 + 100 + Input.PUDDLE_REACH + 1 }), `walk to ${2000 + 100 + Input.PUDDLE_REACH + 1}`)
    })

    it('wins over a faint action spot there, but not over a thing', () => {
      assert.equal(tap({ x: 2000, under: { spot: 'dig' } }), 'jump in puddle at 2000')
      assert.equal(tap({ x: 2000, under: { thing: 'dig' } }), 'go to dig')
    })

    it('only counts on the ground, not in the sky above it', () => {
      assert.equal(tap({ x: 2000, y: 400 }), 'walk to 2000')
    })
  })

  describe('on a creature', () => {
    it('chases it', () => {
      assert.equal(tap({ critter: 'fly' }), 'chase fly')
      assert.equal(tap({ critter: 'fly', under: { spot: 'bowl' } }), 'chase fly')
    })

    it('over a thing or Reksio, gives way unless near its middle', () => {
      assert.equal(tap({ critter: 'bee', under: { thing: 'flowers' } }), 'go to flowers')
      assert.equal(tap({ critter: 'bee', nearMiddle: true, under: { thing: 'flowers' } }), 'chase bee')
      assert.equal(tap({ critter: 'fly', under: { reksio: true } }), 'press')
      assert.equal(tap({ critter: 'fly', nearMiddle: true, under: { reksio: true } }), 'chase fly')
    })

    it('in a puddle is still a chase', () => {
      assert.equal(tap({ critter: 'snail', x: 2000 }), 'chase snail')
    })
  })
})

describe('a key', () => {
  const AT = { nearest: null, minX: 380, maxX: 3650 }
  const key = (k, o = {}, at = AT) => Input.keyDown({ key: k, repeat: false, modified: false, ...o }, at)

  it('arrows walk him to that end of the yard, once per press', () => {
    assert.equal(key('ArrowLeft'), 'walk to 380')
    assert.equal(key('ArrowRight'), 'walk to 3650')
    assert.equal(key('ArrowRight', { repeat: true }), null)
  })

  it('space or enter uses the thing he stands by, or barks', () => {
    assert.equal(key(' ', {}, { ...AT, nearest: 'bowl' }), 'go to bowl')
    assert.equal(key('Enter', {}, { ...AT, nearest: 'bowl' }), 'go to bowl')
    assert.equal(key(' '), 'bark')
  })

  it('any other key is a press on Reksio, not repeated while held', () => {
    assert.equal(key('a'), 'press')
    assert.equal(key('a', { repeat: true }), null)
  })

  it('leaves shortcuts and modifier keys to the browser', () => {
    for (const k of ['Shift', 'Meta', 'Control', 'Alt', 'CapsLock', 'Tab', 'Escape']) {
      assert.equal(key(k), null, k)
      assert.equal(Input.ownsKey({ key: k, modified: false }), false, k)
    }
    assert.equal(key('r', { modified: true }), null) // Ctrl+R still reloads
    assert.equal(Input.ownsKey({ key: 'r', modified: true }), false)
  })

  it('keeps a held arrow from scrolling the page, though it means nothing new', () => {
    assert.equal(Input.ownsKey({ key: 'ArrowLeft', modified: false }), true)
  })

  it('let go: an arrow stops him; the held key ends the press; others mean nothing', () => {
    assert.equal(Input.keyUp('ArrowLeft', null), 'stop')
    assert.equal(Input.keyUp('a', 'a'), 'release')
    assert.equal(Input.keyUp('b', 'a'), null)
  })
})

describe('an ask', () => {
  const ask = (s) => Input.ask({ busy: false, ended: false, endedAt: 0, now: 10000, ...s })

  it('runs at once when he is free, and waits its turn while he is busy', () => {
    assert.equal(ask(), 'run')
    assert.equal(ask({ busy: true }), 'wait')
  })

  it('after the end: ignored while the picture closes and a moment after, then restarts the play', () => {
    assert.equal(ask({ ended: true, endedAt: 0 }), 'ignore')
    assert.equal(ask({ ended: true, endedAt: 10000 - Input.RESTART_AFTER_MS }), 'ignore')
    assert.equal(ask({ ended: true, endedAt: 10000 - Input.RESTART_AFTER_MS - 1 }), 'restart')
  })
})
