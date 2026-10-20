// Unit tests for idle.js: what Reksio does when nobody is tapping.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const Idle = load(['idle.js']).get('Idle')
const ACTS = { wish: { weight: 2 }, sniff: { weight: 3 }, hop: { weight: 1 } }
const always = () => true
/** A fixed sequence of random numbers, then 0. */
const seq = (...xs) => () => (xs.length ? xs.shift() : 0)

describe('whether to do something now', () => {
  const QUIET = { soaked: false, raining: false, inPuddle: false, sinceTap: 10000, now: 5000, nextAt: 0 }

  it('waits a moment after a tap before doing anything', () => {
    assert.equal(Idle.next({ ...QUIET, sinceTap: Idle.FIRST_MS - 1 }), null)
    assert.equal(Idle.next({ ...QUIET, sinceTap: Idle.FIRST_MS + 1 }), 'act')
  })

  it('waits for the gap after the last move', () => {
    assert.equal(Idle.next({ ...QUIET, nextAt: 5001 }), null)
    assert.equal(Idle.next({ ...QUIET, nextAt: 5000 }), 'act')
  })

  it('shakes himself dry at once when soaked, stopped and out of the rain', () => {
    assert.equal(Idle.next({ ...QUIET, soaked: true, sinceTap: 0, nextAt: 9e9 }), 'shake')
  })

  it('never shakes in the rain or standing in a puddle', () => {
    assert.equal(Idle.next({ ...QUIET, soaked: true, raining: true }), 'act')
    assert.equal(Idle.next({ ...QUIET, soaked: true, inPuddle: true }), 'act')
  })
})

describe('which move', () => {
  it('shows a thought bubble first, if one can show', () => {
    assert.equal(Idle.pick(ACTS, { ok: always, last: null, firstWish: true, random: seq(0.99) }), 'wish')
    const noWish = (n) => n !== 'wish'
    assert.notEqual(Idle.pick(ACTS, { ok: noWish, last: null, firstWish: true, random: seq(0) }), 'wish')
  })

  it('does a move that is due as soon as it can, after a first bubble', () => {
    const acts = { ...ACTS, bowl: { weight: 0, due: true } }
    const pick = (ok, firstWish = false) => Idle.pick(acts, { ok, last: null, firstWish, random: seq(0.5) })
    assert.equal(pick(always), 'bowl')
    assert.equal(pick(always, true), 'wish')
    assert.notEqual(pick((n) => n !== 'bowl'), 'bowl', 'not when it cannot happen')
  })

  it('picks by weight', () => {
    // weights wish 2, sniff 3, hop 1 (total 6): 0–2 wish, 2–5 sniff, 5–6 hop
    const at = (r) => Idle.pick(ACTS, { ok: always, last: null, firstWish: false, random: seq(r) })
    assert.equal(at(0.1), 'wish')
    assert.equal(at(0.5), 'sniff')
    assert.equal(at(0.9), 'hop')
  })

  it('never does the same move twice running', () => {
    for (let r = 0; r < 1; r += 0.05) {
      assert.notEqual(Idle.pick(ACTS, { ok: always, last: 'sniff', firstWish: false, random: seq(r) }), 'sniff')
    }
  })

  it('only picks a move that can happen now', () => {
    const onlyHop = (n) => n === 'hop'
    for (let r = 0; r < 1; r += 0.1) {
      assert.equal(Idle.pick(ACTS, { ok: onlyHop, last: null, firstWish: false, random: seq(r) }), 'hop')
    }
  })

  it('comes up empty, not with a move that cannot happen, when none can', () => {
    assert.equal(Idle.pick(ACTS, { ok: () => false, last: null, firstWish: false, random: seq(0.5) }), null)
  })

  it('draws one random number a pick, so seeded plays stay in step', () => {
    let draws = 0
    const random = () => (draws++, 0.5)
    Idle.pick(ACTS, { ok: always, last: null, firstWish: false, random })
    assert.equal(draws, 1)
  })
})

describe('resting', () => {
  it('sits, then lies down, then naps, the longer he is left alone', () => {
    assert.deepEqual(['sit', 'lie', 'nap'].map((r) => Idle.restOk(r, 10)), [true, false, false])
    assert.deepEqual(['sit', 'lie', 'nap'].map((r) => Idle.restOk(r, 20)), [true, true, false])
    assert.deepEqual(['sit', 'lie', 'nap'].map((r) => Idle.restOk(r, 31)), [true, true, true])
  })
})

describe('what he wishes for', () => {
  const where = { bowl: 100, tap: 900, dig: 400 }
  const distance = (n) => Math.abs(where[n] - 350)

  it('is the nearest thing he wants that is ready', () => {
    assert.equal(Idle.wish(['bowl', 'tap', 'dig'], { wants: always, ready: always, distance }), 'dig')
  })

  it('skips what he does not want or is not ready', () => {
    assert.equal(Idle.wish(['bowl', 'tap', 'dig'], { wants: (n) => n !== 'dig', ready: always, distance }), 'bowl')
    assert.equal(Idle.wish(['bowl', 'tap', 'dig'], { wants: always, ready: (n) => n === 'tap', distance }), 'tap')
  })

  it('is nothing when there is nothing left', () => {
    assert.equal(Idle.wish(['bowl'], { wants: () => false, ready: always, distance }), null)
  })
})

describe('a phrase of music', () => {
  const gap = Idle.PHRASE_GAP_MS

  it('follows something new, the first time and once the gap has passed', () => {
    assert.equal(Idle.phraseOk({ playing: false, raining: false, sinceLast: Infinity }), true)
    assert.equal(Idle.phraseOk({ playing: false, raining: false, sinceLast: gap }), true)
  })

  it('waits out the gap since the last one', () => {
    assert.equal(Idle.phraseOk({ playing: false, raining: false, sinceLast: gap - 1 }), false)
  })

  it('left alone, comes only after a long quiet', () => {
    assert.equal(Idle.phraseOk({ playing: false, raining: false, sinceLast: gap, alone: true }), false)
    assert.equal(Idle.phraseOk({ playing: false, raining: false, sinceLast: Idle.LONG_QUIET_MS, alone: true }), true)
    assert.ok(Idle.LONG_QUIET_MS > gap)
  })

  it('never starts over music already playing, or in the rain', () => {
    assert.equal(Idle.phraseOk({ playing: true, raining: false, sinceLast: Infinity }), false)
    assert.equal(Idle.phraseOk({ playing: false, raining: true, sinceLast: Infinity }), false)
  })
})

describe('the gap after a move', () => {
  it('is the move own length if it has one, without a random draw', () => {
    let draws = 0
    assert.equal(Idle.gap(4600, () => (draws++, 0.5)), 4600)
    assert.equal(draws, 0)
  })

  it('is otherwise 1.5–3.5 s', () => {
    assert.equal(Idle.gap(undefined, () => 0), Idle.GAP_MS[0])
    assert.equal(Idle.gap(undefined, () => 1), Idle.GAP_MS[1])
  })
})
