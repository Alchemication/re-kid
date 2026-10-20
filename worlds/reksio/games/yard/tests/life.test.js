// Unit tests for life.js: what keeps Reksio alive between gestures.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const page = load(['debug.js', 'figure.js', 'life.js'], { query: '?seed=7' })
const Life = page.get('Life')
const Figure = page.get('Figure')
const Debug = page.get('Debug')
const DT = 1 / 60

/** Run a life for `seconds`, with ctx (or ctx(t) per frame); every frame's output. */
function live(seconds, ctx = { free: true, walking: false, fours: false, head: [0, -150] }, random = Debug.random('life-test')) {
  const life = Life.create(random)
  const out = []
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    const c = typeof ctx === 'function' ? ctx(i * DT) : ctx
    out.push(life.step(DT, i * DT * 1000, c))
  }
  return out
}

describe('left alone, he is never quite still', () => {
  const frames = live(40)

  it('blinks every few seconds', () => {
    let blinks = 0
    for (let i = 1; i < frames.length; i++) if (frames[i].blink > 0.9 && frames[i - 1].blink <= 0.9) blinks++
    assert.ok(blinks >= 7 && blinks <= 30, `${blinks} blinks in 40 s`)
  })

  it('changes how he stands, only in ways the figure knows', () => {
    const stands = new Set(frames.map((f) => f.stand))
    assert.ok(stands.size >= 2, [...stands].join())
    for (const s of stands) assert.ok(Figure.POSES[s], `${s} is not a pose`)
  })

  it('looks about: his head turns, and stays in its range', () => {
    const turns = frames.map((f) => f.turn)
    assert.ok(Math.max(...turns) - Math.min(...turns) > 0.3)
    assert.ok(turns.every((t) => t > -0.2 && t < 1.2), 'turned past side-on')
  })

  it('every number it gives is finite', () => {
    for (const f of frames) {
      for (const v of [f.turn, f.tilt, f.look, f.blink, f.standW, f.faceW, f.tail, ...f.ears, ...f.perk, ...Object.values(f.face)]) {
        assert.ok(Number.isFinite(v), JSON.stringify(f))
      }
    }
  })
})

describe('busy, he is left to it', () => {
  it('a gesture under way: no way of standing of life\'s shows', () => {
    const frames = live(10, { free: false, walking: false, fours: false, head: [0, -150] })
    assert.ok(frames.at(-1).standW < 0.01)
    assert.ok(frames.at(-1).faceW < 0.01)
  })

  it('on all fours: no way of standing upright shows', () => {
    const frames = live(10, { free: true, walking: false, fours: true, head: [0, -90] })
    assert.ok(frames.at(-1).standW < 0.01)
  })

  it('walking: some of his mood shows in his face', () => {
    const w = live(3, { free: false, walking: true, fours: false, head: [0, -150] }).at(-1).faceW
    assert.ok(w > 0.4 && w < 0.8, `${w}`)
  })
})

describe('ears and tail', () => {
  it('swing when his head jumps, then settle', () => {
    const frames = live(4, (t) => ({ free: true, walking: false, fours: false, head: [0, t > 1 ? -190 : -150] }))
    const swing = Math.max(...frames.slice(60, 120).map((f) => Math.abs(f.ears[1])))
    assert.ok(swing > 3, `ears swung only ${swing}`)
    assert.ok(Math.abs(frames.at(-1).ears[1]) < 0.5, 'still swinging after 3 s')
  })

  it('never swing past their limit, however hard he moves', () => {
    const frames = live(3, (t) => ({ free: true, walking: false, fours: false, head: [Math.sin(t * 60) * 400, -150] }))
    assert.ok(frames.every((f) => Math.abs(f.ears[0]) <= 30 && Math.abs(f.tail) <= 30))
  })
})

describe('an ear perks up', () => {
  const BUSY = { free: false, walking: false, fours: false, head: [0, -150] }

  /** A life told to perk `which` at 1 s for holdMs; every frame's output. */
  function perked(which, holdMs, seconds = 4) {
    const life = Life.create(Debug.random('perk-test'))
    const out = []
    for (let i = 0; i < Math.round(seconds / DT); i++) {
      if (i === 60) life.perk(which, i * DT * 1000, holdMs)
      out.push(life.step(DT, i * DT * 1000, BUSY))
    }
    return out
  }

  it('snaps up fast, a little past straight, holds, and flops back down', () => {
    const frames = perked('near', 1000)
    const near = frames.map((f) => f.perk[0])
    assert.ok(near.slice(60, 72).some((v) => v > 0.9), 'not up within 0.2 s')
    assert.ok(Math.max(...near) > 1.05, 'no snap past straight')
    assert.ok(near.slice(100, 115).every((v) => v > 0.85), 'not held up')
    assert.ok(Math.abs(near.at(-1)) < 0.05, 'not back down')
    assert.ok(frames.every((f) => f.perk[1] === 0), 'the other ear moved')
  })

  it('both, or either one', () => {
    const both = perked('both', 600).at(90)
    assert.ok(both.perk[0] > 0.8 && both.perk[1] > 0.8)
    const either = perked('either', 600).at(90)
    assert.equal(either.perk.filter((v) => v > 0.8).length, 1)
  })

  it('left alone, now and then a glance perks one; busy, life perks none', () => {
    const up = (frames) => frames.some((f) => f.perk[0] > 0.8 || f.perk[1] > 0.8)
    assert.ok(up(live(60)), 'no ear went up in a minute alone')
    assert.ok(!up(live(60, BUSY)), 'an ear went up while he was busy')
  })

  it('either ear takes turns, without a random draw: the rest of his life is not shifted', () => {
    /** Live 10 s, perking either ear every 2 s or not; how many draws, and which ear went up. */
    function run(perking) {
      let draws = 0
      const base = Debug.random('perk-draws')
      const life = Life.create(() => (draws++, base()))
      const ups = []
      for (let i = 0; i < 600; i++) {
        const now = i * DT * 1000
        if (perking && i % 120 === 60) life.perk('either', now, 500)
        const f = life.step(DT, now, BUSY)
        if (perking && i % 120 === 80) ups.push(f.perk[0] > f.perk[1] ? 'near' : 'far')
      }
      return { draws, ups }
    }
    assert.equal(run(true).draws, run(false).draws, 'a perk drew from his stream')
    assert.deepEqual(run(true).ups, ['near', 'far', 'near', 'far', 'near'])
  })

  it('Figure.perked raises the ears towards straight up, and leaves them alone at 0', () => {
    const stand = Figure.POSES.stand
    assert.equal(Figure.perked(stand, [0, 0]), stand)
    const up = Figure.perked(stand, [1, 0])
    assert.ok(Math.abs(up.ears.near[1]) < Math.abs(stand.ears.near[1]), 'the near ear still folded')
    assert.deepEqual(up.ears.far, stand.ears.far)
  })
})

describe('the same stream, the same life', () => {
  it('replays exactly from the same seed', () => {
    const a = live(5, undefined, page.get('Debug').random('replay-a'))
    const b = live(5, undefined, load(['debug.js', 'figure.js', 'life.js'], { query: '?seed=7' }).get('Debug').random('replay-a'))
    assert.deepEqual(a.at(-1), b.at(-1))
  })
})
