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
  const page = load(['debug.js', 'layout.js', 'figure.js', 'life.js', 'gait.js', 'reksio.js'], { query: '?seed=1', dom: true, globals: { Sound, Music, Creatures } })
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
  biteTail: [], howl: [], sit: [1500], lieDown: [1500], nap: [2000], startle: [], catchDrops: [2], wakeUp: [], duck: [true],
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

describe('yawning', () => {
  /** A Reksio whose yawns note how big each was. */
  function yawner(seed) {
    const sizes = []
    const Sound = new Proxy({}, { get: (_t, name) => (name === 'yawn' ? (s) => sizes.push(s) : name === 'from' ? (_d, play) => play() : () => {}) })
    const { Music } = fakeSound()
    const page = load(['debug.js', 'layout.js', 'figure.js', 'life.js', 'gait.js', 'reksio.js'], { query: `?seed=${seed}`, dom: true, globals: { Sound, Music, Creatures: { notice() {} } } })
    return { R: page.get('Reksio'), page, sizes }
  }

  /** Every yawn's size, gesture by gesture, over several seeds. */
  async function yawns(gesture) {
    const all = []
    for (let seed = 1; seed <= 12; seed++) {
      const y = yawner(seed)
      let over = false
      y.R[gesture]().then(() => (over = true))
      for (let i = 0; i < 200 && !over; i++) await y.page.advance(100)
      assert.ok(over, `${gesture} still going`)
      all.push(y.sizes)
    }
    return all
  }

  it('waking up: a big yawn, one to three times, and how many varies', async () => {
    const all = await yawns('wakeUp')
    assert.ok(all.every((s) => s.length >= 1 && s.length <= 3), JSON.stringify(all))
    assert.ok(new Set(all.map((s) => s.length)).size > 1, 'always the same number of yawns')
    assert.ok(all.every((s) => s[0] >= 0.8), 'the first waking yawn is a big one')
  })

  it('how wide varies, and a waking yawn is bigger than one in passing', async () => {
    const waking = (await yawns('wakeUp')).map((s) => s[0])
    const passing = (await yawns('yawn')).map((s) => s[0])
    assert.ok(new Set(passing.map((s) => s.toFixed(2))).size > 3, 'always the same size')
    assert.ok(Math.min(...waking) > Math.max(...passing), `waking ${waking} vs passing ${passing}`)
  })
})

describe('how he goes', () => {
  it('at a sniffing trot, he sniffs as he goes, and gets there', async () => {
    const { Sound, Music, played } = fakeSound()
    const page = load(['debug.js', 'layout.js', 'figure.js', 'life.js', 'gait.js', 'reksio.js'], { query: '?seed=1', dom: true, globals: { Sound, Music, Creatures: { notice() {} } } })
    const R = page.get('Reksio')
    let done = null
    R.walkTo(R.x + 250, { sniffing: true }).then((ok) => (done = ok))
    for (let i = 0; i < 400 && done === null; i++) {
      R.tick(DT)
      await page.advance(16)
    }
    assert.equal(done, true)
    assert.ok(played.filter((p) => p === 'sniff').length >= 2, played.join())
  })

  it('at a gallop, he leaves the ground as he stretches', () => {
    const r = reksio()
    const bob = r.page.get('document').getElementById('rk-bob')
    r.R.walkTo(r.R.x + 2000)
    let highest = 0
    for (let i = 0; i < 90; i++) {
      r.R.tick(DT)
      const dy = Number((bob.style.transform.match(/translateY\((-?[\d.]+)px\)/) || [0, 0])[1])
      highest = Math.min(highest, dy)
    }
    assert.ok(highest < -8, `only rose ${highest}`)
  })

  it('runs some middling trips for joy, and walks others', () => {
    const paces = []
    for (let seed = 1; seed <= 16; seed++) {
      const { Sound, Music } = fakeSound()
      const page = load(['debug.js', 'layout.js', 'figure.js', 'life.js', 'gait.js', 'reksio.js'], { query: `?seed=${seed}`, dom: true, globals: { Sound, Music, Creatures: { notice() {} } } })
      const R = page.get('Reksio')
      const x0 = R.x
      R.walkTo(x0 + 350)
      for (let i = 0; i < 24; i++) R.tick(DT)
      paces.push((R.x - x0) / (24 * DT))
    }
    const runs = paces.filter((v) => v > 260).length // still speeding up: a run is at about 310, a walk about 200
    assert.ok(runs > 0 && runs < paces.length, paces.map(Math.round).join())
  })
})

describe('cut short mid-gesture', () => {
  it('never carries on after a tap: walking off, nothing poses him', async () => {
    const bad = []
    for (const [name, args] of Object.entries(GESTURES)) {
      if (name === 'duck') continue // the doghouse: not a pose
      for (const at of [150, 450, 900, 1600]) {
        const r = reksio()
        const root = r.page.get('document').getElementById('reksio')
        r.R[name](...args).catch(() => 'cut short: rejecting is how a gesture hears it')
        for (let t = 0; t < at; t += 50) {
          r.R.tick(0.05)
          await r.page.advance(50)
        }
        r.R.relax()
        r.R.walkTo(r.R.x + 900)
        for (let i = 0; i < 60; i++) {
          r.R.tick(0.05)
          await r.page.advance(50)
          if (r.R.walking && root.getAttribute('data-posed') === '1') {
            bad.push(`${name} cut at ${at} ms`)
            break
          }
        }
      }
    }
    assert.deepEqual(bad, [])
  })
})
