// Unit tests for things.js: the rules of the things in the yard (the mouse
// and her trap, the bird (bird.js), the bowl (bowl.js), the film, the bramble
// (bramble.js)), run on a pretend page and clock with a
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

/** Let the clock run until ok() holds, or ms have passed. */
const until = async (y, ok, ms) => {
  for (let t = 0; t < ms && !ok(); t += 50) await y.advance(50)
}

/** What a gesture cut short by relax() throws. */
const cutShort = () => Object.assign(new Error('cut short'), { name: 'AbortError' })

/** A yard with things in it; `query` adds layout.js flags. */
function yard(query = '') {
  const reksio = fakeReksio()
  const { Sound, Music, played } = fakeSound()
  let ended = false
  const bee = [] // where the bee was sent, and 'free' when let go
  const Creatures = { async beeTo(x, y) { bee.push({ x, y }) }, beeFree() { bee.push('free') } }
  const Weather = { raining: false }
  const page = load(['debug.js', 'layout.js', 'idle.js', 'bird.js', 'bramble.js', 'bowl.js', 'cuckoo.js', 'things.js'], {
    query: `?seed=1&${query}`,
    dom: true,
    globals: { Reksio: reksio, Sound, Music, Creatures, Weather, Figure: { bowlTopAt() {}, noseTipAt() {} }, Tree: { init() {}, ready: false, thing: { at: () => 1600, async run() {} } } },
  })
  const Things = page.get('Things')
  Things.init({ ended: () => ended })
  return {
    Things,
    Bird: page.get('Bird'),
    Bramble: page.get('Bramble'),
    Bowl: page.get('Bowl'),
    bee,
    Weather,
    Clock: page.get('Clock'),
    reksio,
    played,
    advance: page.advance,
    /** The variations traced so far, by thing. */
    variations() {
      const out = {}
      for (const m of page.get('Debug.dump()').matchAll(/variation \{"name":"(\w+)","v":"(\w+)"\}/g)) (out[m[1]] ??= []).push(m[2])
      return out
    },
    end: () => (ended = true),
    /** Use a thing the way yard.js does (cut short counts as over), and let
     * the clock run until it's over. */
    async use(name, extra = false, n = 1) {
      const run = Things.THINGS[name].run({ extra, n })
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
    const flight = y.Bird.flyAway()
    assert.equal(y.Things.ready('bird'), false)
    assert.equal(y.Bird.flying, true)
    await y.advance(5000)
    await flight
    assert.equal(y.Bird.flying, false)
    assert.ok(y.Bird.PERCHES.includes(y.Bird.perch))
  })

  it('flies off to one of the two perches furthest from Reksio, never the same one', async () => {
    for (const rx of [400, 1500, 3000]) {
      const y = yard()
      y.reksio.x = rx
      for (let i = 0; i < 6; i++) {
        const from = y.Bird.perch
        const far = y.Bird.PERCHES.filter((p) => p !== from)
          .sort((a, b) => Math.abs(b.x - rx) - Math.abs(a.x - rx))
          .slice(0, 2)
        const done = y.Bird.flyAway()
        await y.advance(5000)
        await done
        assert.notEqual(y.Bird.perch, from)
        assert.ok(far.includes(y.Bird.perch), `Reksio at ${rx}: went to ${y.Bird.perch.x}`)
      }
    }
  })

  it('takes a worm, and is back on a perch after', async () => {
    const y = yard()
    let eaten = false
    const hunt = y.Bird.hunt({ x: 1800, y: 820, eat: () => (eaten = true) })
    await y.advance(10000)
    await hunt
    assert.equal(eaten, true)
    assert.equal(y.Bird.flying, false)
  })

  it('leaves a worm be while it is flying already', async () => {
    const y = yard()
    const flight = y.Bird.flyAway()
    let eaten = false
    await y.Bird.hunt({ x: 1800, y: 820, eat: () => (eaten = true) })
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

describe('the bowl on his head', () => {
  /** Empty the bowl, then start the stuck gag without waiting for it. */
  async function stuck(y) {
    await y.use('bowl') // he eats it all
    const run = y.Things.THINGS.bowl.run({ extra: true }) // licking the empty bowl: it sticks
    let over = false
    run.then(
      () => (over = true),
      () => (over = true),
    )
    return { isOver: () => over }
  }

  const sitsDown = async (y) => {
    for (let i = 0; i < 100 && !y.reksio.calls.includes('slump'); i++) await y.advance(50)
    assert.ok(y.reksio.calls.includes('slump'), 'he never sat down stuck')
  }

  it('sticks the first time he licks it empty, and the bird pulls it off', async () => {
    const y = yard('props=bowl')
    await y.use('bowl')
    await y.use('bowl', true)
    const c = y.reksio.calls
    assert.ok(c.indexOf('bowl on') < c.indexOf('tugged') && c.indexOf('tugged') < c.indexOf('bowl off'), c.join(' '))
    assert.equal(y.reksio.wearing('bowl'), false)
    assert.equal(y.Bird.flying, false, 'the bird is back on a perch')
    assert.equal(y.Bird.friend, true)
    assert.equal(y.Things.stuckTap(), false, 'taps are ordinary again')
  })

  it('the next empty bowl is nosed along, not stuck', async () => {
    const y = yard('props=bowl')
    for (const extra of [false, true, false]) await y.use('bowl', extra)
    const before = y.reksio.calls.length
    await y.use('bowl', true)
    assert.ok(!y.reksio.calls.slice(before).includes('bowl on'))
  })

  it('left alone, the bird comes 5 to 7 s after he sits down', async () => {
    const y = yard('props=bowl')
    await stuck(y)
    await sitsDown(y)
    const sat = y.Clock.now()
    await until(y, () => y.Bird.flying, 9000)
    const after = y.Clock.now() - sat
    assert.ok(after >= 5000 && after <= 7100, `came after ${after} ms`)
  })

  it('a tap while he is stuck is a bark in the bowl, and brings the bird at once', async () => {
    const y = yard('props=bowl')
    const gag = await stuck(y)
    await until(y, () => y.reksio.calls.includes('bowl on'), 3000)
    assert.equal(y.Things.stuckTap(), true)
    for (let i = 0; i < 5; i++) y.Things.stuckTap() // a burst of taps
    assert.equal(y.reksio.calls.filter((n) => n === 'bowlBark').length, 1, 'one bark for a burst, not a din')
    await sitsDown(y)
    await until(y, () => y.Bird.flying, 500)
    assert.equal(y.Bird.flying, true, 'the bird should come as soon as he sits')
    await until(y, gag.isOver, 30000)
    assert.ok(gag.isOver())
  })

  it('cut short, the bowl is back in its place and the bird on its perch', async () => {
    const y = yard('props=bowl')
    y.reksio.tugged = async () => {
      throw cutShort()
    }
    const gag = await stuck(y)
    await until(y, gag.isOver, 30000)
    assert.ok(gag.isOver())
    assert.equal(y.reksio.wearing('bowl'), false)
    assert.equal(y.Bird.flying, false)
    assert.equal(y.Things.stuckTap(), false)
  })

  it('once friends, a tap on the bird brings it down to him: no bark, no chase', async () => {
    const y = yard('props=bowl')
    await y.use('bowl')
    await y.use('bowl', true)
    const perch = y.Bird.perch
    const before = y.reksio.calls.length
    await y.use('bird')
    const c = y.reksio.calls.slice(before)
    assert.ok(c.includes('playBow') && !c.includes('bark'), c.join(' '))
    assert.equal(y.Bird.perch, perch, 'it stays on its perch')
    assert.equal(y.Bird.flying, false)
  })
})

describe('back to the bowl, left alone', () => {
  it('eats what is left, gets stuck, and the bird pulls it off; the next empty bowl is nosed along', async () => {
    const y = yard('props=bowl')
    const run = y.Bowl.thing.helped.alone()
    let over = false
    run.then(() => (over = true), () => (over = true))
    for (let i = 0; i < 600 && !over; i++) await y.advance(100)
    assert.ok(over)
    const c = y.reksio.calls
    assert.ok(c.indexOf('lap') < c.indexOf('bowl on') && c.indexOf('bowl on') < c.indexOf('bowl off'), c.join(' '))
    assert.equal(y.Bowl.stuckTimes, 1)
    for (const extra of [false, true]) await y.use('bowl', extra)
    assert.equal(y.Bowl.stuckTimes, 1, 'the next empty bowl is nosed along')
  })
})

describe('his tail caught in the bramble', () => {
  /** Start the gag (the bramble's first variation) without waiting for it. */
  function caught(y) {
    let over = false
    y.Things.THINGS.berries.run({ extra: true }).then(
      () => (over = true),
      () => (over = true),
    )
    return { isOver: () => over }
  }
  const count = (y, name) => y.reksio.calls.filter((n) => n === name).length

  it('the first variation: caught, his own tries, glum, and the bee by his tail frightens him free', async () => {
    const y = yard('props=berries')
    await y.use('berries', true)
    const c = y.reksio.calls
    const order = ['swish', 'tail on', 'yanked', 'strain', 'sulk', 'hearsBee', 'tail off', 'leapFright', 'freed', 'chaseTail']
    const at = order.map((n) => c.indexOf(n))
    assert.ok(at.every((i, k) => i >= 0 && (k === 0 || i > at[k - 1])), `${order} in ${c.join(' ')}`)
    assert.equal(y.reksio.wearing('tail'), false)
    assert.equal(y.Bramble.caughtTimes, 1)
    assert.equal(y.bee.length, 4, 'to the flower, to his bottom, back to the flower, let go')
    assert.equal(y.bee.at(-1), 'free')
    assert.equal(y.Things.stuckTap(), false, 'taps are ordinary again')
  })

  it('then takes turns with the missed berry', async () => {
    const y = yard('props=berries')
    for (const extra of [true, true, true]) await y.use('berries', extra)
    assert.equal(y.Bramble.caughtTimes, 2)
    assert.equal(count(y, 'pounce'), 1, 'the one in between is the miss')
  })

  it('not in the rain (no bee comes out), and the next dry variation still catches it', async () => {
    const y = yard('props=berries')
    y.Weather.raining = true
    await y.use('berries', true)
    assert.equal(y.Bramble.caughtTimes, 0)
    y.Weather.raining = false
    await y.use('berries', true)
    assert.equal(y.Bramble.caughtTimes, 1)
  })

  it('the bee comes 4.5 to 6.5 s after he sits glum', async () => {
    const y = yard('props=berries')
    caught(y)
    await until(y, () => y.reksio.calls.includes('sulk'), 20000)
    const sat = y.Clock.now()
    await until(y, () => y.bee.length > 0, 9000)
    const after = y.Clock.now() - sat
    assert.ok(after >= 4500 && after <= 6600, `came after ${after} ms`)
  })

  it('a tap while stuck is another try; a burst of taps is one try', async () => {
    const y = yard('props=berries')
    const gag = caught(y)
    await until(y, () => y.reksio.calls.includes('sulk'), 20000)
    const before = count(y, 'strain')
    assert.equal(y.Things.stuckTap(), true)
    for (let i = 0; i < 5; i++) y.Things.stuckTap()
    await y.advance(50)
    assert.equal(count(y, 'strain') - before, 1)
    await until(y, gag.isOver, 30000)
    assert.ok(gag.isOver())
    assert.equal(y.reksio.wearing('tail'), false)
  })

  it('a tap during his own tries is answered with one more try after them', async () => {
    const y = yard('props=berries')
    const gag = caught(y)
    await until(y, () => y.reksio.wearing('tail'), 20000)
    y.Things.stuckTap()
    await until(y, gag.isOver, 30000)
    assert.equal(count(y, 'strain'), 2, 'his own try, and the asked-for one')
  })

  it('frozen at the hum, a tap is not a try', async () => {
    const y = yard('props=berries')
    const gag = caught(y)
    await until(y, () => y.bee.length > 0, 30000)
    const before = count(y, 'strain')
    assert.equal(y.Things.stuckTap(), true, 'still held: the tap is his')
    await until(y, gag.isOver, 30000)
    assert.equal(count(y, 'strain'), before)
  })

  it('cut short while caught, his tail is let go, taps are ordinary, and the bee goes about its business', async () => {
    const y = yard('props=berries')
    y.reksio.hearsBee = async () => {
      throw cutShort()
    }
    const gag = caught(y)
    await until(y, gag.isOver, 30000)
    assert.ok(gag.isOver())
    assert.equal(y.reksio.wearing('tail'), false)
    assert.equal(y.Things.stuckTap(), false)
    assert.equal(y.bee.at(-1), 'free')
  })

  it('left alone, he sniffs round the bush and gets caught, with no berry tossed (a toss runs on Clock time a tap could not cut)', async () => {
    const y = yard('props=berries')
    let over = false
    y.Bramble.thing.helped.alone().then(() => (over = true))
    for (let i = 0; i < 600 && !over; i++) await y.advance(100)
    const c = y.reksio.calls
    assert.ok(c.indexOf('sniff') < c.indexOf('tail on'), c.join(' '))
    assert.ok(!c.slice(0, c.indexOf('tail on')).includes('hop'), c.join(' '))
    assert.ok(!y.played.includes('toss'), 'a berry was tossed')
  })

  it('cut short before it catches (a tap, left alone), nothing is caught and the bee is never sent', async () => {
    const y = yard('props=berries')
    y.reksio.swish = async () => {
      throw cutShort()
    }
    await y.use('berries', true)
    assert.equal(y.Bramble.caughtTimes, 0)
    assert.equal(y.bee.length, 0)
  })
})

describe('variations', () => {
  it('after its first use, each thing plays a variation every time, all of them before any comes again, each to its end', async () => {
    const y = yard('flowers=1')
    const pools = { ...y.Things.VARIATIONS }
    for (const [name, names] of Object.entries(pools)) {
      for (let n = 1; n <= names.length * 2 + 1; n++) await y.use(name, false, n)
    }
    const seen = y.variations()
    for (const [name, names] of Object.entries(pools)) {
      const got = seen[name] ?? []
      assert.equal(got.length, names.length * 2, `${name}: ${got}`)
      assert.deepEqual([...got.slice(0, names.length)].sort(), [...names].sort(), `${name}: ${got}`)
      assert.deepEqual([...got.slice(names.length)].sort(), [...names].sort(), `${name}: ${got}`)
    }
  })

  it('the first use is plain, unless a variation is asked for', async () => {
    const y = yard()
    await y.use('tap', false, 1)
    assert.equal(y.variations().tap, undefined)
    await y.use('tap', true, 1)
    assert.equal(y.variations().tap.length, 1)
  })
})
