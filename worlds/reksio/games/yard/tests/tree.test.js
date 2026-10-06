// Unit tests for tree.js: the fruit tree and its hungry visitor, run on a
// pretend page and clock with a stand-in Reksio. Seeded, so every run is the same.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')
const { fakeReksio, fakeSound } = require('./fakes')

/** A yard with the tree out (unless `query` says otherwise). */
function yard(query = 'props=tree', seed = 1) {
  const reksio = fakeReksio(1600)
  const { Sound, Music, played } = fakeSound()
  let ended = false
  const page = load(['debug.js', 'layout.js', 'tree.js'], {
    query: `?seed=${seed}&${query}`,
    dom: true,
    globals: { Reksio: reksio, Sound, Music },
  })
  const Tree = page.get('Tree')
  Tree.init({ ended: () => ended, effects: { burst() {}, twinkle() {} } })
  const count = (list, name) => list.filter((c) => c === name).length
  return {
    Tree,
    reksio,
    played,
    advance: page.advance,
    end: () => (ended = true),
    count,
    /** Shake the tree, and let the clock run until he's done. */
    async shake(extra = false) {
      let over = false
      Tree.thing.run({ extra }).then(() => (over = true))
      for (let i = 0; i < 300 && !over; i++) await page.advance(100)
      assert.ok(over, 'still shaking after half a minute')
    },
  }
}

const VISITOR = 'visitor-at=1'

describe('the hungry visitor', () => {
  it('turns up when it said it would, and only then can the tree be shaken', async () => {
    const y = yard(`props=tree&${VISITOR}&fruit=apple`)
    assert.equal(y.Tree.ready, false)
    await y.advance(30000)
    assert.equal(y.Tree.visitor, 'hungry')
    assert.equal(y.Tree.ready, true)
  })

  it('never comes when the tree is not out this play', async () => {
    const y = yard(`props=bowl,dig,film&${VISITOR}`)
    await y.advance(60000)
    assert.equal(y.Tree.visitor, 'away')
  })

  it('never comes once he has gone to bed', async () => {
    const y = yard(`props=tree&${VISITOR}`)
    y.end()
    await y.advance(30000)
    assert.equal(y.Tree.visitor, 'away')
  })

  it('is fed by the first shake', async () => {
    const y = yard(`props=tree&${VISITOR}&fruit=plum`)
    await y.advance(30000)
    await y.shake()
    assert.equal(y.Tree.visitor, 'fed')
    assert.ok(y.played.includes('plop'), 'fruit landed')
  })
})

describe('the fruit', () => {
  it('runs out after five shakes of apples; then he just looks up', async () => {
    const y = yard(`props=tree&${VISITOR}&fruit=apple`)
    await y.advance(30000)
    for (let i = 0; i < 5; i++) await y.shake()
    assert.equal(y.count(y.reksio.calls, 'lookUp'), 0)
    await y.shake()
    assert.equal(y.count(y.reksio.calls, 'lookUp'), 1)
  })

  it('runs out after three shakes of nuts', async () => {
    const y = yard(`props=tree&${VISITOR}&fruit=nut`)
    await y.advance(30000)
    for (let i = 0; i < 3; i++) await y.shake()
    await y.shake()
    assert.equal(y.count(y.reksio.calls, 'lookUp'), 1)
  })

  it('lands an apple on his head in the variation (bonk), never a nut', async () => {
    const apple = yard(`props=tree&${VISITOR}&fruit=apple`)
    await apple.advance(30000)
    await apple.shake(true)
    assert.ok(apple.played.includes('bonk'))
    const nut = yard(`props=tree&${VISITOR}&fruit=nut`)
    await nut.advance(30000)
    await nut.shake(true)
    assert.ok(!nut.played.includes('bonk'))
  })
})

describe('who eats it', () => {
  it('brings snails to share the apples, never more than four', async () => {
    let most = 0
    for (let seed = 1; seed <= 12; seed++) {
      const y = yard(`props=tree&${VISITOR}&fruit=apple`, seed)
      await y.advance(30000)
      assert.equal(y.Tree.snails, 1)
      for (let i = 0; i < 5; i++) {
        await y.shake()
        await y.advance(i === 0 ? 2000 : 20000) // the first time, shake again while more are still coming
      }
      await y.advance(60000)
      assert.ok(y.Tree.snails > 1, `seed ${seed}: nobody came to share`)
      assert.ok(y.Tree.snails <= 4, `seed ${seed}: ${y.Tree.snails} snails`)
      assert.ok(y.played.includes('nibble'), `seed ${seed}: nobody ate`)
      most = Math.max(most, y.Tree.snails)
    }
    assert.equal(most, 4, 'the most snails any play had: the cap was never reached, so this test cannot see it')
  })

  it('sends the squirrel to eat a nut and bury one, then up the trunk', async () => {
    const y = yard(`props=tree&${VISITOR}&fruit=nut`)
    await y.advance(30000)
    assert.equal(y.Tree.snails, 0)
    await y.shake()
    await y.advance(30000)
    assert.ok(y.count(y.played, 'nibble') >= 5, 'did not eat')
    assert.ok(y.played.includes('dig'), 'did not bury one')
  })
})
