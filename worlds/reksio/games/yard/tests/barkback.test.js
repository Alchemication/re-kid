// Unit tests for barkback.js: who answers Reksio's bark, and when nobody does,
// on a pretend clock with stand-ins for the bird, the hen and the mouse.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')
const { fakeReksio, fakeSound } = require('./fakes')

/** A yard with Reksio at 1500 and these about: { bird: x, hen: x, mouse: x } (each can answer until told not to). */
function yard(about = {}, seed = 1) {
  const reksio = fakeReksio(1500)
  const { Sound, played } = fakeSound()
  const answered = []
  const who = (name) => ({ x: about[name] ?? 99999, can: name in about, answer: () => answered.push(name) })
  const [bird, hen, mouse] = ['bird', 'hen', 'mouse'].map(who)
  const globals = {
    Reksio: reksio,
    Sound,
    Bird: { get perch() { return { x: bird.x } }, get canChirpBack() { return bird.can }, chirpBack: bird.answer },
    Hen: { get x() { return hen.x }, get canCluckBack() { return hen.can }, cluckBack: hen.answer },
    Mouse: { get x() { return mouse.x }, get canPeepBack() { return mouse.can }, peepBack: mouse.answer },
  }
  const page = load(['debug.js', 'layout.js', 'barkback.js'], { query: `?seed=${seed}`, dom: true, globals })
  const BarkBack = page.get('BarkBack')
  const state = { free: true, ended: false }
  BarkBack.init({ free: () => state.free, ended: () => state.ended })
  return {
    BarkBack, answered, played, reksio, state, about: { bird, hen, mouse },
    /** He barks (mid: inside a gag), and the answer's moment and the quiet after it pass. */
    async bark(mid = false) {
      BarkBack.heard(reksio.x, mid)
      await page.advance(BarkBack.GAP_MS + 100)
    },
    advance: page.advance,
  }
}

describe('who answers his bark', () => {
  it('the nearest who can, a moment after, and once', async () => {
    const y = yard({ bird: 1900, hen: 1300 })
    y.BarkBack.heard(1500, false)
    assert.deepEqual(y.answered, [], 'the answer came on top of his bark')
    await y.advance(y.BarkBack.AFTER_MS + 50)
    assert.deepEqual(y.answered, ['hen'])
    await y.advance(3000)
    assert.deepEqual(y.answered, ['hen'])
  })

  it('never the same one twice running if another can', async () => {
    const y = yard({ bird: 1900, hen: 1300, mouse: 2200 })
    for (let i = 0; i < 4; i++) await y.bark()
    assert.deepEqual(y.answered, ['hen', 'bird', 'hen', 'bird'])
  })

  it('the only one about answers every time', async () => {
    const y = yard({ bird: 1900 })
    for (let i = 0; i < 3; i++) await y.bark()
    assert.deepEqual(y.answered, ['bird', 'bird', 'bird'])
  })

  it('nobody out of earshot, or busy', async () => {
    const y = yard({ bird: 1500 + 901, hen: 1300 })
    y.about.hen.can = false
    await y.bark()
    assert.deepEqual(y.answered, [])
  })

  it('not one who got busy before its moment came', async () => {
    const y = yard({ bird: 1900 })
    y.BarkBack.heard(1500, false)
    y.about.bird.can = false // off after a worm meanwhile
    await y.advance(3000)
    assert.deepEqual(y.answered, [])
  })

  it('a bark inside a gag is the gag\'s: no answer', async () => {
    const y = yard({ bird: 1900 })
    await y.bark(true)
    assert.deepEqual(y.answered, [])
  })

  it('a row of barks gets an answer now and then, not one each', async () => {
    const y = yard({ bird: 1900 })
    for (let i = 0; i < 5; i++) {
      y.BarkBack.heard(1500, false)
      await y.advance(400) // five barks in two seconds
    }
    await y.advance(1000)
    assert.deepEqual(y.answered, ['bird'])
  })

  it('nothing after the day has ended', async () => {
    const y = yard({ bird: 1900 })
    y.state.ended = true
    await y.bark()
    assert.deepEqual(y.answered, [])
  })
})

describe('the far dog', () => {
  it('answers only when nobody near can, and only some barks', () => {
    const { BarkBack } = yard()
    assert.equal(BarkBack.pick([], null, BarkBack.FAR_DOG - 0.01), 'dog')
    assert.equal(BarkBack.pick([], null, BarkBack.FAR_DOG + 0.01), null)
    assert.equal(BarkBack.pick([{ name: 'bird', distance: 800 }], 'bird', 0), 'bird')
  })

  it('over many seeds it barks back on some plays\' first bark and not on others; free, he turns to the gate', async () => {
    let dogs = 0
    for (let seed = 1; seed <= 20; seed++) {
      const y = yard({}, seed)
      y.reksio.facing = -1
      await y.bark()
      const dog = y.played.includes('farBark')
      if (dog) dogs++
      assert.equal(y.reksio.facing, dog ? 1 : -1, `seed ${seed}`)
    }
    assert.ok(dogs > 1 && dogs < 14, `${dogs} of 20`)
  })

  it('busy with something, he does not turn', async () => {
    for (let seed = 1; seed <= 20; seed++) {
      const y = yard({}, seed)
      y.reksio.facing = -1
      y.state.free = false
      await y.bark()
      assert.equal(y.reksio.facing, -1)
    }
  })
})
