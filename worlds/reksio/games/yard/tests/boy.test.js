// Unit tests for boyfigure.js (the boy drawn from a pose, without a page) and
// boy.js (his walk and gestures, on a pretend page and clock).

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const shapes = load(['figure.js', 'boyfigure.js'])
const BoyFigure = shapes.get('BoyFigure')
const Figure = shapes.get('Figure')
const NUMBER = /-?\d+(\.\d+)?/g
const TURNS = [0, 0.25, 0.5, 0.75, 1]

function numbers(value) {
  if (typeof value === 'number') return [value]
  if (typeof value === 'string') return value.includes('NaN') ? [NaN] : (value.match(NUMBER) || []).map(Number)
  return Object.values(value).flatMap(numbers)
}

/** The points of his face's outline, as drawn. */
const outline = (s) => s.face.match(/-?\d+(\.\d+)?\s-?\d+(\.\d+)?/g).map((p) => p.split(/\s/).map(Number))

describe('the boy drawn', () => {
  for (const [name, pose] of Object.entries(BoyFigure.POSES)) {
    it(`${name}: only finite numbers, turned any way`, () => {
      for (const turn of TURNS) {
        const all = numbers(BoyFigure.shape(Figure.vary(pose, { turn })))
        assert.ok(all.every(Number.isFinite), `${name} at turn ${turn}`)
      }
    })
  }

  it('every pose has the same parts, so any two can blend', () => {
    const keys = (o) => (typeof o === 'object' ? Object.keys(o).sort().map((k) => [k, keys(o[k])]) : typeof o)
    const want = JSON.stringify(keys(BoyFigure.POSES.stand))
    for (const [name, pose] of Object.entries(BoyFigure.POSES)) assert.equal(JSON.stringify(keys(pose)), want, name)
  })

  // Adam, 2026-10-26: his hair must always hold his head; a cloud sat on top
  // of it like a wig "looks ridiculous"
  it('his curls cover the top and back of his head in every pose, turned any way', () => {
    for (const [name, pose] of Object.entries(BoyFigure.POSES)) {
      for (const turn of TURNS) {
        const p = Figure.vary(pose, { turn })
        const s = BoyFigure.shape(p)
        const curls = [...s.crown, ...s.fringe]
        const covered = ([x, y]) => curls.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) <= r + 1)
        const a = (-p.tilt * Math.PI) / 180
        for (const [x, y] of outline(s)) {
          // in the face's own units, untilted
          const dx = x - p.head[0]
          const dy = y - p.head[1]
          const lx = dx * Math.cos(a) - dy * Math.sin(a)
          const ly = dx * Math.sin(a) + dy * Math.cos(a)
          const top = ly < -14 // above his brows
          const back = turn >= 0.5 && lx < -8 && ly < 14 // behind his ear, down to the nape
          if (top || back) assert.ok(covered([x, y]), `${name} at turn ${turn}: bare head at ${lx.toFixed(0)}, ${ly.toFixed(0)}`)
        }
      }
    }
  })

  it('front-on he has two eyes; side-on one, the other behind his nose (Kompan 3:12)', () => {
    const shown = (turn) => BoyFigure.shape(Figure.vary(BoyFigure.POSES.stand, { turn })).eyes.filter((e) => e.shown).length
    assert.equal(shown(0), 2)
    assert.equal(shown(1), 1)
  })

  it('his ear shows only once he is turned', () => {
    const ear = (turn) => BoyFigure.shape(Figure.vary(BoyFigure.POSES.stand, { turn })).ear.shown
    assert.equal(ear(0), 0)
    assert.equal(ear(0.6), 1)
  })
})

function boyOnAPage() {
  const page = load(['debug.js', 'figure.js', 'boyfigure.js', 'boy.js'], { query: '?seed=1', dom: true })
  const Boy = page.get('Boy')
  Boy.init({ parent: page.get("document.getElementById('boy-layer')"), winter: true, watch: () => 1500 })
  Boy.comeOut(1000, 1)
  return { Boy, page }
}

describe('the boy moving', () => {
  it('walks there and stops, facing the way he went', async () => {
    const { Boy, page } = boyOnAPage()
    let arrived = null
    Boy.walkTo(700).then((ok) => (arrived = ok))
    await page.advance(5000)
    assert.equal(arrived, true)
    assert.equal(Math.round(Boy.x), 700)
    assert.equal(Boy.facing, -1)
    assert.equal(Boy.walking, false)
  })

  it('every gesture ends, and leaves him free', async () => {
    const { Boy, page } = boyOnAPage()
    const gestures = [
      () => Boy.call(), () => Boy.wave(), () => Boy.point(1), () => Boy.touchNose(), () => Boy.scratch(),
      () => Boy.laugh(), () => Boy.cheer(), () => Boy.nod(), () => Boy.nod(true), () => Boy.reach(),
      () => Boy.look({ smile: 1 }), () => Boy.settle('push'), () => Boy.settle('heave'), () => Boy.stand(),
    ]
    for (const g of gestures) {
      let done = false
      g().then(() => (done = true))
      await page.advance(6000)
      assert.ok(done, String(g))
      assert.equal(Boy.busy, false, String(g))
    }
  })

  it('relax cuts a gesture short and stops a walk', async () => {
    const { Boy, page } = boyOnAPage()
    let cut = null
    Boy.cheer().catch((e) => (cut = e.name))
    let walked = null
    await page.advance(100)
    Boy.relax()
    await page.advance(50)
    assert.equal(cut, 'AbortError')
    Boy.walkTo(300).then((ok) => (walked = ok))
    await page.advance(100)
    Boy.relax()
    await page.advance(50)
    assert.equal(walked, false)
    assert.equal(Boy.walking, false)
  })

  it('a hand is where his pose puts it, in the scene', () => {
    const { Boy } = boyOnAPage()
    const h = Boy.handAt('far')
    assert.ok(Number.isFinite(h.x) && Number.isFinite(h.y))
    assert.ok(h.y < 812 && h.y > 600, `his hand at ${h.y}`)
  })
})
