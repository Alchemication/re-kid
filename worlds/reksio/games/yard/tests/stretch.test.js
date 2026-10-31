// Unit tests for stretch.js: when he does the dachshund stretch by himself,
// and that he always lets go of it.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')
const { fakeReksio, fakeSound } = require('./fakes')

/** stretch.js in a play of this seed, with a Reksio who has room to stretch. */
function play(seed, { pause = async () => {} } = {}) {
  const reksio = fakeReksio()
  reksio.roomToStretch = 1
  reksio.kit.pause = pause
  const weather = { raining: false }
  const page = load(['debug.js', 'stretch.js'], { query: `?seed=${seed}`, globals: { Reksio: reksio, Weather: weather, ...fakeSound() } })
  const when = { idle: 60, calm: true }
  const act = page.get('Stretch').act({ idleS: () => when.idle, calm: () => when.calm })
  return { act, reksio, weather, when }
}

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)
const plays = SEEDS.filter((seed) => play(seed).act.ok())

describe('the stretch, left alone', () => {
  it('comes in some plays, not every one', () => {
    assert.ok(plays.length > SEEDS.length * 0.35 && plays.length < SEEDS.length * 0.85, `${plays.length} of ${SEEDS.length}`)
  })

  it('comes at most once a play', async () => {
    const { act } = play(plays[0])
    await act.run()
    assert.equal(act.ok(), false)
  })

  it('waits for a good while alone, standing, the dry, calm and room for the whole stretch', () => {
    const { act, reksio, weather, when } = play(plays[0])
    const not = (why, undo) => {
      assert.equal(act.ok(), false, why)
      undo()
      assert.equal(act.ok(), true, `${why}, undone`)
    }
    when.idle = 5
    not('just tapped', () => (when.idle = 60))
    weather.raining = true
    not('raining', () => (weather.raining = false))
    when.calm = false
    not('dusk or fog', () => (when.calm = true))
    reksio.roomToStretch = 0.5
    not('no room', () => (reksio.roomToStretch = 1))
    reksio.worn = ['bowl']
    not('a gag has put something on him', () => (reksio.worn = []))
    reksio.pose = 'lie'
    not('lying down', () => (reksio.pose = 'stand'))
  })

  it('stretches, and lets go however it ends', async () => {
    const { act, reksio } = play(plays[0])
    await act.run()
    assert.deepEqual([...reksio.calls], ['beginStretch', 'endStretch'])

    const cut = play(plays[0], { pause: () => Promise.reject(Object.assign(new Error('cut short'), { name: 'AbortError' })) })
    await assert.rejects(cut.act.run(), { name: 'AbortError' })
    assert.deepEqual([...cut.reksio.calls], ['beginStretch', 'endStretch'], 'a tap cuts the wait: he still lets go')
  })
})
