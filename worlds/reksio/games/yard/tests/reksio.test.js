// Unit tests for reksio.js: how he walks, and that every gesture ends with
// him standing, on a pretend page and clock (animations end at once, so how
// he looks is left to the browser tests).

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')
const { fakeSound } = require('./fakes')

const DT = 1 / 60

function reksio() {
  const { Sound, Music } = fakeSound()
  const noticed = [] // what the creatures were told he did
  const Creatures = { notice: (type, x, y) => noticed.push(type) }
  const page = load(['debug.js', 'layout.js', 'reksio.js'], { query: '?seed=1', dom: true, globals: { Sound, Music, Creatures } })
  const R = page.get('Reksio')
  return {
    R,
    page,
    noticed,
    /** Step him for `seconds` (yard.js calls tick every frame). */
    step(seconds) {
      for (let i = 0; i < Math.round(seconds / DT); i++) R.tick(DT)
    },
    /** Walk to x; resolves to whether he got there, stepping until he does. */
    async walk(x, seconds = 20) {
      let result = null
      R.walkTo(x).then((ok) => (result = ok))
      for (let i = 0; i < Math.round(seconds / DT) && result === null; i++) {
        R.tick(DT)
        if (i % 30 === 0) await page.advance(500)
      }
      await page.advance(0)
      return result
    },
  }
}

describe('walking', () => {
  it('gets him where he was asked, and says so', async () => {
    const r = reksio()
    assert.equal(await r.walk(1600), true)
    assert.equal(Math.round(r.R.x), 1600)
    assert.equal(r.R.walking, false)
  })

  it('never takes him past the ends of the yard', async () => {
    const r = reksio()
    await r.walk(-500)
    assert.equal(r.R.x, r.R.MIN_X)
    await r.walk(99999)
    assert.equal(r.R.x, r.R.MAX_X)
  })

  it('faces the way he goes', async () => {
    const r = reksio()
    await r.walk(r.R.x + 300)
    assert.equal(r.R.facing, 1)
    await r.walk(r.R.x - 300)
    assert.equal(r.R.facing, -1)
  })

  it('runs on a long trip and walks a short one', () => {
    const pace = (dist) => {
      const r = reksio()
      const x0 = r.R.x
      r.R.walkTo(x0 + dist)
      r.step(0.8)
      return (r.R.x - x0) / 0.8
    }
    const short = pace(150)
    const long = pace(2000)
    assert.ok(long > short * 1.5, `long trip ${long.toFixed(0)}/s, short ${short.toFixed(0)}/s`)
  })

  it('stops for a newer walk: the older one says he did not get there', async () => {
    const r = reksio()
    let first = null
    r.R.walkTo(2500).then((ok) => (first = ok))
    r.step(0.3)
    assert.equal(await r.walk(900), true)
    assert.equal(first, false)
    assert.equal(Math.round(r.R.x), 900)
  })

  it('stops where he is when told, and the walk says he did not get there', async () => {
    const r = reksio()
    let result = null
    r.R.walkTo(3000).then((ok) => (result = ok))
    r.step(0.5)
    r.R.stopWalking()
    await r.page.advance(0)
    const x = r.R.x
    r.step(1)
    assert.equal(result, false)
    assert.equal(r.R.walking, false)
    assert.ok(Math.abs(r.R.x - x) < 1, 'kept going after the stop')
  })
})

// Each gesture with arguments that keep it short (as in test_game_browser.py).
const GESTURES = {
  bark: [], nod: [12, 400], lick: [], lap: [3], shake: [], shakeDry: [], paddle: [800], hop: [], sniff: [],
  lookAround: [], lookUp: [], scratch: [], playBow: [], chaseTail: [], yawn: [], snap: [2], pounce: [1700],
  biteTail: [], howl: [], sit: [1500], lieDown: [1500], nap: [2000], startle: [], catchDrops: [2], duck: [true],
}

describe('every gesture', () => {
  for (const [name, args] of Object.entries(GESTURES)) {
    it(`${name} ends, with him standing`, async () => {
      const r = reksio()
      let over = false
      r.R[name](...args).then(() => (over = true))
      for (let i = 0; i < 400 && !over; i++) {
        r.R.tick(DT)
        await r.page.advance(100)
      }
      assert.ok(over, `${name} still going after 40 s`)
      if (name !== 'duck') assert.equal(r.R.pose, 'stand')
    })
  }

  it('tells the creatures when he barks or snaps, so they can startle', async () => {
    const r = reksio()
    r.R.bark()
    await r.page.advance(3000)
    r.R.snap(1)
    await r.page.advance(3000)
    assert.ok(r.noticed.includes('bark') && r.noticed.includes('snap'), r.noticed.join())
  })

  it('can be cut short at any moment: relax() leaves him standing, ready to walk', async () => {
    for (const [name, args] of Object.entries(GESTURES)) {
      const r = reksio()
      r.R[name](...args).catch(() => 'cut short: rejecting is how a gesture hears it')
      await r.page.advance(150)
      r.R.relax()
      assert.equal(r.R.pose, 'stand', name)
      assert.equal(await r.walk(r.R.x + 200), true, `${name}: could not walk off`)
    }
  })
})
