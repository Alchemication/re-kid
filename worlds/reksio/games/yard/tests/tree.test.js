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
  const birds = []
  const Bird = {
    flying: false,
    perch: { x: 1480, y: 330 },
    async toFruit() {
      if (Bird.flying) return false
      birds.push('toFruit')
      return true
    },
    async shooed(spot, to, takeIt) {
      birds.push('shooed')
      await takeIt()
    },
    async flyAway() { birds.push('flyAway') },
    async tut() { birds.push('tut') },
  }
  const page = load(['debug.js', 'layout.js', 'tree.js'], {
    query: `?seed=${seed}&${query}${query.includes('season=') ? '' : '&season=summer'}`, // summer, unless asked: a winter tree has no fruit
    dom: true,
    globals: { Reksio: reksio, Sound, Music, Bird, Figure: { bowlTopAt: {} } },
  })
  const Tree = page.get('Tree')
  Tree.init({ ended: () => ended, effects: { burst() {}, twinkle() {} } })
  const count = (list, name) => list.filter((c) => c === name).length
  return {
    Tree,
    reksio,
    played,
    Bird,
    birds,
    page,
    advance: page.advance,
    end: () => (ended = true),
    count,
    /** Shake the tree, and let the clock run until he's done. */
    async shake(v = null) {
      let over = false
      Tree.thing.run({ variation: () => v }).then(() => (over = true))
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

/** What the tree's shakes so far did (tree.js traces), in order. */
const traced = (y) => [...y.page.get('Debug.dump()').matchAll(/tree (\{.*?\})/g)].map((m) => JSON.parse(m[1]))

describe('the fruit', () => {
  const stages = (y) => traced(y).map((t) => t.stage)

  for (const fruit of ['apple', 'plum', 'nut']) {
    it(`tells a story over three shakes of ${fruit}s: half, all but one, the last with the bird; then bare`, async () => {
      const y = yard(`props=tree&${VISITOR}&fruit=${fruit}`)
      await y.advance(30000)
      await y.shake()
      assert.equal(y.Tree.hanging, 3)
      await y.shake()
      assert.equal(y.Tree.hanging, 1)
      await y.shake()
      assert.equal(y.Tree.hanging, 0)
      assert.deepEqual(y.birds, ['toFruit', 'shooed'])
      assert.equal(y.count(y.reksio.calls, 'toldOff'), 1)
      await y.shake()
      assert.deepEqual(stages(y), ['first', 'more', 'last', 'bare'])
      assert.deepEqual(y.birds, ['toFruit', 'shooed', 'tut'], 'the bird it shook out tuts at him from its perch')
      assert.equal(y.count(y.reksio.calls, 'toldOff'), 2)
    })
  }

  it('leaves the last fruit for the bird, whatever the second shake brings on top', async () => {
    for (const v of ['bonk', 'stuck', 'leaves', 'squirrel']) {
      const y = yard(`props=tree&${VISITOR}&fruit=${v === 'squirrel' ? 'nut' : 'apple'}`)
      await y.advance(30000)
      await y.shake()
      await y.shake(v)
      if (y.Tree.hanging > 1) await y.shake() // the squirrel took one: another shake brings the rest down
      assert.equal(y.Tree.hanging, 1, v)
    }
  })

  it('drops the last fruit without the bird when it is busy, and the bare tree only puzzles him', async () => {
    const y = yard(`props=tree&${VISITOR}&fruit=apple`)
    await y.advance(30000)
    await y.shake()
    await y.shake()
    y.Bird.flying = true
    await y.shake()
    assert.equal(y.Tree.hanging, 0)
    y.Bird.flying = false
    await y.shake()
    assert.deepEqual(y.birds, [])
    assert.equal(y.count(y.reksio.calls, 'toldOff'), 0)
    assert.equal(y.count(y.reksio.calls, 'puzzled'), 1)
  })

  it('lands an apple on his head in the variation (bonk), never a nut', async () => {
    const apple = yard(`props=tree&${VISITOR}&fruit=apple`)
    await apple.advance(30000)
    await apple.shake('bonk')
    assert.ok(apple.played.includes('bonk'))
    const nut = yard(`props=tree&${VISITOR}&fruit=nut`)
    await nut.advance(30000)
    await nut.shake('bonk')
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

describe('in winter', () => {
  it('stands bare and snowy, to be shaken at once, with no one hungry under it', async () => {
    const y = yard(`props=tree&${VISITOR}&season=winter`)
    assert.equal(y.Tree.ready, true)
    await y.advance(30000)
    assert.equal(y.Tree.visitor, 'away')
    assert.equal(y.Tree.hanging, 0)
  })

  it('brings down a different fall of snow each time, and the clump on his head is shaken off', async () => {
    const y = yard(`props=tree&season=winter`)
    for (let i = 0; i < 12; i++) await y.shake()
    const falls = traced(y).map((t) => t.how)
    assert.equal(new Set(falls).size, 3, `${falls}`)
    for (let i = 1; i < falls.length; i++) assert.notEqual(falls[i], falls[i - 1], `${falls}`)
    assert.ok(y.count(y.reksio.calls, 'shake') >= 1, 'never shook the snow off')
    assert.deepEqual(y.birds, [])
  })
})
