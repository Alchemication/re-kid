// Unit tests for things.js: the rules of the things in the yard (the mouse
// and her trap, the bird, the film), run on a pretend page and clock with a
// stand-in Reksio whose gestures end at once. Seeded, so every run is the same.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')
const { fakeReksio, fakeSound } = require('./fakes')

/** Make Reksio's `n`th stamp from now be cut short (a gesture cancelled under
 * him rejects, as relax() does in the game). */
function cutStamp(reksio, n) {
  const stamp = reksio.stamp
  let k = 0
  reksio.stamp = async (onThump) => {
    if (++k === n) throw new Error('cut short')
    return stamp(onThump)
  }
  return () => (reksio.stamp = stamp)
}

/** A yard with things in it; `query` adds layout.js flags. */
function yard(query = '') {
  const reksio = fakeReksio()
  const { Sound, Music, played } = fakeSound()
  let ended = false
  const page = load(['debug.js', 'layout.js', 'things.js'], {
    query: `?seed=1&${query}`,
    dom: true,
    globals: { Reksio: reksio, Sound, Music, Tree: { init() {}, ready: false, thing: { at: () => 1600, async run() {} } } },
  })
  const Things = page.get('Things')
  Things.init({ ended: () => ended })
  return {
    Things,
    reksio,
    played,
    advance: page.advance,
    end: () => (ended = true),
    /** Use a thing the way yard.js does (cut short counts as over), and let
     * the clock run until it's over. */
    async use(name, extra = false) {
      const run = Things.THINGS[name].run({ extra })
      let over = false
      run.then(
        () => (over = true),
        () => (over = true),
      )
      for (let i = 0; i < 600 && !over; i++) await page.advance(100)
      assert.ok(over, `${name} still going after a minute`)
    },
  }
}

describe('the mouse', () => {
  it('comes out when she said she would, and only then is the trap ready', async () => {
    const y = yard('props=trap&mouse-at=5')
    assert.equal(y.Things.ready('trap'), false)
    await y.advance(4900)
    assert.equal(y.Things.mouse, 'away')
    await y.advance(200)
    assert.equal(y.Things.mouse, 'wanting')
    assert.equal(y.Things.ready('trap'), true)
  })

  it('comes out 14–30 s into the play when nothing says when', async () => {
    const y = yard('props=trap')
    await y.advance(13900)
    assert.equal(y.Things.mouse, 'away')
    await y.advance(16200)
    assert.equal(y.Things.mouse, 'wanting')
  })

  it('never comes out when the trap is not out this play', async () => {
    const y = yard('props=bowl,dig,film&mouse-at=1')
    await y.advance(60000)
    assert.equal(y.Things.mouse, 'away')
    assert.equal(y.Things.ready('trap'), false)
  })

  it('never comes out once he has gone to bed', async () => {
    const y = yard('props=trap&mouse-at=5')
    y.end()
    await y.advance(10000)
    assert.equal(y.Things.mouse, 'away')
  })

  it('is set free by a stamp beside the trap, and is fed', async () => {
    const y = yard('props=trap&mouse-at=0')
    await y.advance(3000)
    await y.use('trap')
    assert.equal(y.Things.mouse, 'fed')
    assert.ok(y.reksio.calls.includes('stamp'))
    assert.ok(y.played.includes('trap'), 'the trap snaps')
    assert.equal(y.Things.ready('trap'), true, 'and she can be visited after')
  })

  it('comes out to say hello once fed, every time he asks', async () => {
    const y = yard('props=trap&mouse-at=0')
    await y.advance(3000)
    await y.use('trap')
    for (const extra of [false, true, true, false]) {
      const squeaks = y.played.filter((s) => s === 'mouse').length
      await y.use('trap', extra)
      assert.ok(y.played.filter((s) => s === 'mouse').length > squeaks, 'she did not come out')
      assert.equal(y.Things.mouse, 'fed')
    }
  })
})

describe('the bird', () => {
  it('cannot be chased while it flies, and settles on a perch after', async () => {
    const y = yard()
    assert.equal(y.Things.ready('bird'), true)
    const flight = y.Things.flyAway()
    assert.equal(y.Things.ready('bird'), false)
    assert.equal(y.Things.flying, true)
    await y.advance(5000)
    await flight
    assert.equal(y.Things.flying, false)
    assert.ok(y.Things.PERCHES.includes(y.Things.perch))
  })

  it('flies off to one of the two perches furthest from Reksio, never the same one', async () => {
    for (const rx of [400, 1500, 3000]) {
      const y = yard()
      y.reksio.x = rx
      for (let i = 0; i < 6; i++) {
        const from = y.Things.perch
        const far = y.Things.PERCHES.filter((p) => p !== from)
          .sort((a, b) => Math.abs(b.x - rx) - Math.abs(a.x - rx))
          .slice(0, 2)
        const done = y.Things.flyAway()
        await y.advance(5000)
        await done
        assert.notEqual(y.Things.perch, from)
        assert.ok(far.includes(y.Things.perch), `Reksio at ${rx}: went to ${y.Things.perch.x}`)
      }
    }
  })

  it('takes a worm, and is back on a perch after', async () => {
    const y = yard()
    let eaten = false
    const hunt = y.Things.birdHunt({ x: 1800, y: 820, eat: () => (eaten = true) })
    await y.advance(10000)
    await hunt
    assert.equal(eaten, true)
    assert.equal(y.Things.flying, false)
  })

  it('leaves a worm be while it is flying already', async () => {
    const y = yard()
    const flight = y.Things.flyAway()
    let eaten = false
    await y.Things.birdHunt({ x: 1800, y: 820, eat: () => (eaten = true) })
    await y.advance(5000)
    await flight
    assert.equal(eaten, false)
  })
})

describe('the film', () => {
  it('is stamped frame by frame, then rolls up into a reel', async () => {
    const y = yard('props=film')
    assert.equal(y.Things.stamped, 0)
    await y.use('film')
    assert.equal(y.Things.stamped, 5)
    assert.equal(y.reksio.calls.filter((c) => c === 'stamp').length, 5)
    assert.ok(y.played.includes('squeaks'), 'the little Reksios squeak back')
  })

  it('keeps the frames stamped when cut short, and goes on from the next', async () => {
    const y = yard('props=film')
    const restore = cutStamp(y.reksio, 2) // he stamps the first; the second is cut short
    await y.use('film')
    assert.equal(y.Things.stamped, 1)
    restore()
    await y.use('film')
    assert.equal(y.Things.stamped, 5)
    assert.equal(y.reksio.calls.filter((c) => c === 'stamp').length, 5, 'no frame stamped twice')
  })

  it('stands him by the next frame to stamp', async () => {
    const y = yard('props=film')
    const first = y.Things.THINGS.film.at()
    cutStamp(y.reksio, 3)
    await y.use('film')
    assert.equal(y.Things.stamped, 2)
    assert.ok(y.Things.THINGS.film.at() > first)
  })

  it('once a reel, spins (or rolls off and is fetched) without stamping again', async () => {
    const y = yard('props=film')
    await y.use('film')
    await y.use('film')
    await y.use('film', true)
    assert.equal(y.reksio.calls.filter((c) => c === 'stamp').length, 5)
    assert.ok(y.reksio.calls.includes('pounce'), 'chased the rolling reel')
  })
})
