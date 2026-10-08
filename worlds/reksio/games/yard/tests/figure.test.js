// Unit tests for figure.js: Reksio's drawing from a pose, without a page.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const Figure = load(['figure.js']).get('Figure')
const NUMBER = /-?\d+(\.\d+)?/g

/** Every number in a drawing, so a NaN or an endless value can't hide. */
function numbers(value) {
  if (typeof value === 'number') return [value]
  if (typeof value === 'string') return value.includes('NaN') ? [NaN] : (value.match(NUMBER) || []).map(Number)
  return Object.values(value).flatMap(numbers)
}

describe('every pose draws', () => {
  for (const [name, pose] of Object.entries(Figure.POSES)) {
    it(`${name}: only finite numbers`, () => {
      const all = numbers(Figure.shape(pose))
      assert.ok(all.length > 50)
      assert.ok(all.every(Number.isFinite), `${name} has a non-finite number`)
    })
  }

  it('every pose has the same parts, so any two can blend', () => {
    const keys = (o) => (typeof o === 'object' ? Object.keys(o).sort().map((k) => [k, keys(o[k])]) : typeof o)
    const want = JSON.stringify(keys(Figure.POSES.stand))
    for (const [name, pose] of Object.entries(Figure.POSES)) assert.equal(JSON.stringify(keys(pose)), want, name)
  })
})

describe('blending poses', () => {
  const { stand, grin } = Figure.POSES

  it('ends on each pose exactly', () => {
    assert.deepEqual(Figure.mix(stand, grin, 0), stand)
    assert.deepEqual(Figure.mix(stand, grin, 1), grin)
  })

  it('goes halfway', () => {
    assert.equal(Figure.mix(stand, grin, 0.5).face.open, (stand.face.open + grin.face.open) / 2)
  })

  it('a variation changes only what it names', () => {
    const v = Figure.vary(stand, { head: { turn: 1 } })
    assert.equal(v.head.turn, 1)
    assert.equal(v.head.x, stand.head.x)
    assert.equal(stand.head.turn, 0.35, 'the base pose is left alone')
  })
})

describe('the body bean', () => {
  it('is one closed outline round both ends', () => {
    const d = Figure.capsule([0, 0], 24, [0, -40], 18)
    assert.match(d, /^M.*Z$/)
    assert.equal((d.match(/A/g) || []).length, 2)
  })

  it('falls back to a circle when one end swallows the other', () => {
    const d = Figure.capsule([0, 0], 24, [0, -2], 18)
    assert.ok(numbers(d).every(Number.isFinite))
  })
})

describe('the face', () => {
  const { stand } = Figure.POSES
  const at = (turn) => Figure.shape(Figure.vary(stand, { head: { turn } })).head

  it('the far eye goes round the edge as he turns side-on', () => {
    assert.equal(at(0).eyes[1].open, 1)
    assert.equal(at(1).eyes[1].open, 0)
  })

  it('shut eyes show as a line, open ones as an eye', () => {
    const shut = Figure.shape(Figure.vary(stand, { face: { eyes: 0 } })).head.eyes[0]
    assert.equal(shut.open, 0)
    assert.equal(shut.shutShow, 1)
    const open = Figure.shape(stand).head.eyes[0]
    assert.equal(open.shutShow, 0)
  })
})
