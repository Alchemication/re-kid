// Unit tests for the game clock (Clock, in debug.js): game time moves on with
// the frames, and stops when they stop (a hidden page), so the game pauses
// instead of running on unseen.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

function clock() {
  const page = load(['debug.js'], { dom: true })
  return { Clock: page.get('Clock'), page }
}

describe('game time', () => {
  it('moves on with the frames', async () => {
    const { Clock, page } = clock()
    await page.advance(1000)
    assert.ok(Math.abs(Clock.now() - 1000) <= 32, `${Clock.now()}`)
  })

  it('stands still while no frames are drawn, and then moves on by one short frame, not the gap', async () => {
    const { Clock, page } = clock()
    await page.advance(500)
    const before = Clock.now()
    page.skip(60000) // a minute with the page hidden
    await page.advance(20)
    assert.ok(Clock.now() - before <= 100 + 20, `jumped ${Clock.now() - before} ms`)
  })
})

describe('timers on game time', () => {
  it('run in order, after their time', async () => {
    const { Clock, page } = clock()
    const ran = []
    Clock.after(300, () => ran.push('b'))
    Clock.after(100, () => ran.push('a'))
    Clock.wait(200).then(() => ran.push('wait'))
    await page.advance(150)
    assert.deepEqual([...ran], ['a'])
    await page.advance(300)
    assert.deepEqual([...ran], ['a', 'wait', 'b'])
  })

  it('wait out a hidden page: a timer due in a second still takes a second of play', async () => {
    const { Clock, page } = clock()
    await page.advance(100) // playing a moment first
    let ran = false
    Clock.after(1000, () => (ran = true))
    page.skip(60000)
    await page.advance(500)
    assert.equal(ran, false, 'ran while the page was hidden')
    await page.advance(600)
    assert.equal(ran, true)
  })

  it('can be cancelled', async () => {
    const { Clock, page } = clock()
    let ran = false
    const t = Clock.after(100, () => (ran = true))
    Clock.cancel(t)
    await page.advance(500)
    assert.equal(ran, false)
  })

  it('repeat with every() until stopped', async () => {
    const { Clock, page } = clock()
    let n = 0
    const stop = Clock.every(100, () => n++)
    await page.advance(450)
    stop()
    const at = n
    await page.advance(500)
    assert.ok(at >= 3 && at <= 5, `${at}`)
    assert.equal(n, at)
  })

  it('set from inside a timer wait for the next frame, so a frame always ends', async () => {
    const { Clock, page } = clock()
    let n = 0
    const again = () => {
      n++
      Clock.after(0, again)
    }
    Clock.after(0, again)
    await page.advance(160) // about ten frames
    assert.ok(n >= 8 && n <= 12, `${n} runs in ten frames`)
  })
})
