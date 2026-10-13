// Unit tests for cuckoo.js: the clock's hands, the cuckoo on the hour, and
// Reksio counting along with it, on a pretend page and clock.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')
const { fakeReksio, fakeSound } = require('./fakes')

/** A clock on the wall at `hour` (the test moves it on with `at`). */
function clock(hour = 8) {
  const reksio = fakeReksio(420)
  const { Sound, played } = fakeSound()
  const page = load(['debug.js', 'layout.js', 'cuckoo.js'], { query: '?seed=1', dom: true, globals: { Reksio: reksio, Sound } })
  const Cuckoo = page.get('Cuckoo')
  const hours = []
  const now = { hour, hushed: false }
  Cuckoo.init({ hourAt: () => now.hour, onHour: (h) => hours.push(h), hushed: () => now.hushed })
  const calls = () => played.filter((n) => n === 'cuckoo').length
  return {
    Cuckoo,
    reksio,
    hours,
    calls,
    played,
    advance: page.advance,
    now,
    /** The day's clock moves to `h`; a few frames pass. */
    async at(h) {
      now.hour = h
      await page.advance(50)
    },
    /** Use the clock as yard.js does, and let it run until it's over. */
    async use(extra = false) {
      let over = false
      const run = Cuckoo.thing.run({ extra }).then(() => null, (e) => e) // a cut short noted at once, thrown below
      run.finally(() => (over = true))
      for (let ms = 0; ms < 30_000 && !over; ms += 100) await page.advance(100)
      const cut = await run
      if (cut) throw cut
    },
  }
}

describe('the hands', () => {
  it('show the hour and the minutes', () => {
    const { Cuckoo } = clock()
    assert.deepEqual({ ...Cuckoo.hands(8) }, { hour: 240, minute: 0 })
    assert.deepEqual({ ...Cuckoo.hands(9.5) }, { hour: 285, minute: 180 })
    assert.deepEqual({ ...Cuckoo.hands(15.25) }, { hour: 97.5, minute: 90 })
    assert.deepEqual({ ...Cuckoo.hands(12) }, { hour: 0, minute: 0 })
  })
})

describe('on the hour', () => {
  it('calls once, and not at the hour the play begins at', async () => {
    const c = clock(8)
    await c.at(8.9)
    assert.equal(c.calls(), 0)
    await c.at(9)
    await c.advance(3000)
    assert.equal(c.calls(), 1)
    assert.deepEqual(c.hours, [9])
    assert.equal(c.Cuckoo.busy, false)
    assert.equal(c.Cuckoo.out, 0)
  })

  it('calls eight times at bedtime', async () => {
    const c = clock(19.9)
    await c.at(19.9) // a first frame: the clock reads the hour the play begins at
    await c.at(20)
    await c.advance(15_000)
    assert.equal(c.calls(), c.Cuckoo.BEDTIME_CALLS)
    assert.equal(c.Cuckoo.busy, false)
  })

  it('calls every hour of a whole day, and only then', async () => {
    const c = clock(8)
    for (let h = 8; h <= 20; h += 0.25) {
      await c.at(h)
      await c.advance(h === 20 ? 15_000 : 2000)
    }
    assert.deepEqual(c.hours, [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
    assert.equal(c.calls(), 11 + c.Cuckoo.BEDTIME_CALLS)
  })
})

describe('the sun hurried down', () => {
  it('spins the hands without calling the hours it crosses, then calls the next as ever', async () => {
    const c = clock(10.2)
    await c.at(10.2)
    c.now.hushed = true
    for (let h = 10.2; h < 19; h += 0.3) await c.at(h)
    await c.at(19)
    c.now.hushed = false
    await c.advance(3000)
    assert.equal(c.calls(), 0)
    assert.deepEqual(c.hours, [])
    await c.at(20)
    await c.advance(15_000)
    assert.equal(c.calls(), c.Cuckoo.BEDTIME_CALLS)
  })
})

describe('counting along', () => {
  it('he barks back at each call, turns away, and is caught out by one more', async () => {
    const c = clock()
    await c.use()
    const moves = c.reksio.calls.filter((n) => ['lookUp', 'barkUp', 'smugTurn', 'spunRound', 'glare'].includes(n))
    assert.deepEqual(moves, ['lookUp', 'barkUp', 'barkUp', 'smugTurn', 'spunRound', 'barkUp', 'glare'])
    assert.equal(c.calls(), 3)
    assert.equal(c.Cuckoo.busy, false)
    assert.equal(c.Cuckoo.out, 0)
  })

  it('the variation: he howls first and it answers', async () => {
    const c = clock()
    await c.use(true)
    const moves = c.reksio.calls.filter((n) => ['howl', 'barkUp', 'smugTurn', 'spunRound', 'glare'].includes(n))
    assert.deepEqual(moves, ['howl', 'barkUp', 'smugTurn', 'spunRound', 'barkUp', 'glare'])
    assert.equal(c.calls(), 3)
  })

  it('an hour that comes mid-gag is called once it is over, not over it', async () => {
    const c = clock(9.95)
    await c.at(9.95)
    let over = false
    const run = c.Cuckoo.thing.run({ extra: false }).finally(() => (over = true))
    await c.advance(300)
    await c.at(10) // the hour, while it is out for him
    for (let ms = 0; ms < 30_000 && !over; ms += 100) await c.advance(100)
    await run
    assert.equal(c.calls(), 3, 'only the gag’s, while it runs')
    await c.advance(3000)
    assert.equal(c.calls(), 4, 'then the hour’s')
    assert.deepEqual(c.hours, [10])
  })

  it('bedtime coming mid-gag still gets its eight calls, after it', async () => {
    const c = clock(19.97)
    await c.at(19.97)
    let over = false
    const run = c.Cuckoo.thing.run({ extra: false }).finally(() => (over = true))
    await c.advance(300)
    await c.at(20)
    for (let ms = 0; ms < 30_000 && !over; ms += 100) await c.advance(100)
    await run
    await c.advance(15_000)
    assert.equal(c.calls(), 3 + c.Cuckoo.BEDTIME_CALLS)
  })

  it('a tap during the hour’s call waits for it, then plays it all', async () => {
    const c = clock(9.99)
    await c.at(9.99)
    await c.at(10)
    assert.equal(c.Cuckoo.busy, true)
    await c.use()
    assert.equal(c.calls(), 1 + 3)
    assert.equal(c.Cuckoo.out, 0)
  })

  it('cut short at his late bark, the door snapping shut on him does not go on after', async () => {
    const c = clock()
    let barks = 0
    c.reksio.barkUp = async () => {
      if (++barks === 3) throw new Error('cut short') // the late one
    }
    await assert.rejects(c.use())
    const toks = c.played.filter((n) => n === 'tok').length
    await c.advance(2000)
    assert.equal(c.played.filter((n) => n === 'tok').length, toks, 'no snap after the gag is over')
    assert.equal(c.Cuckoo.out, 0)
    assert.equal(c.Cuckoo.busy, false)
  })

  it('cut short anywhere, it leaves the cuckoo in and the door shut', async () => {
    for (const move of ['barkUp', 'smugTurn', 'spunRound', 'glare']) {
      const c = clock()
      c.reksio[move] = async () => {
        throw new Error('cut short')
      }
      await assert.rejects(c.use())
      const after = c.played.length
      await c.advance(2000)
      assert.equal(c.played.length, after, `${move}: nothing plays on after it`)
      assert.equal(c.Cuckoo.busy, false, move)
      assert.equal(c.Cuckoo.out, 0, move)
    }
  })
})
