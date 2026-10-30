// Unit tests for grownup.js (and the shared again.js): a grown-up's holds (the house for the evening,
// the corner sun for a new morning) against a toddler's taps and second
// fingers, on a pretend page and clock.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

function grownUp() {
  const page = load(['debug.js', 'again.js', 'grownup.js'], { dom: true })
  const GrownUp = page.get('GrownUp')
  const done = []
  GrownUp.init({ perform: (intent) => done.push(intent) })
  return { GrownUp, done, page, again: page.get('document').getElementById('again'), location: page.get('location') }
}

const finger = (n) => ({ pointerId: n })

describe('the house', () => {
  it('a tap is a tap, as the finger lifts', async () => {
    const g = grownUp()
    g.GrownUp.pressHouse(finger(1))
    await g.page.advance(300)
    g.GrownUp.letGoOfHouse(finger(1), true)
    await g.page.advance(3000)
    assert.deepEqual(g.done, ['go to house'])
  })

  it('held, the evening now, and letting go after is nothing more', async () => {
    const g = grownUp()
    g.GrownUp.pressHouse(finger(1))
    await g.page.advance(g.GrownUp.HOLD_MS + 100)
    g.GrownUp.letGoOfHouse(finger(1), true)
    assert.deepEqual(g.done, ['evening now'])
  })

  it('a second finger leaves no timer behind', async () => {
    const g = grownUp()
    g.GrownUp.pressHouse(finger(1))
    g.GrownUp.pressHouse(finger(2))
    await g.page.advance(300)
    g.GrownUp.letGoOfHouse(finger(1), true)
    g.GrownUp.letGoOfHouse(finger(2), true)
    await g.page.advance(3000)
    assert.deepEqual(g.done, ['go to house'])
  })

  it('another finger lifting does not end the hold', async () => {
    const g = grownUp()
    g.GrownUp.pressHouse(finger(1))
    await g.page.advance(500)
    g.GrownUp.letGoOfHouse(finger(2), true)
    await g.page.advance(g.GrownUp.HOLD_MS)
    assert.deepEqual(g.done, ['evening now'])
  })

  it('a press lost (the page left) is neither a tap nor a hold', async () => {
    const g = grownUp()
    g.GrownUp.pressHouse(finger(1))
    g.GrownUp.letGoOfHouse({}, false)
    await g.page.advance(3000)
    assert.deepEqual(g.done, [])
  })
})

describe('the corner sun', () => {
  it('held, a new morning; let go too soon, nothing', async () => {
    const g = grownUp()
    g.again.fire('pointerdown', finger(1))
    await g.page.advance(600)
    g.again.fire('pointerup', finger(1))
    await g.page.advance(3000)
    assert.equal(g.location.reloads, 0)
    g.again.fire('pointerdown', finger(1))
    await g.page.advance(g.GrownUp.HOLD_MS + 100)
    assert.equal(g.location.reloads, 1)
    assert.deepEqual(g.done, [], 'not an intent: a replay never reloads')
  })

  it('a second finger leaves no timer behind', async () => {
    const g = grownUp()
    g.again.fire('pointerdown', finger(1))
    g.again.fire('pointerdown', finger(2))
    await g.page.advance(500)
    g.again.fire('pointerup', finger(1))
    g.again.fire('pointerup', finger(2))
    await g.page.advance(3000)
    assert.equal(g.location.reloads, 0)
  })
})
