// Unit tests for nap.js: which thing happens on top of a nap.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

describe('what happens on top of a nap', () => {
  it('is never the same twice running, and all of them come before any again', () => {
    const page = load(['debug.js', 'idle.js', 'figure.js', 'nap.js'], { query: '?seed=3' })
    const Nap = page.get('Nap')
    const all = Object.keys(Nap.VARIATIONS)
    const drawn = Array.from({ length: all.length * 6 }, () => Nap.next())
    for (let i = 1; i < drawn.length; i++) assert.notEqual(drawn[i], drawn[i - 1], drawn.join())
    for (let r = 0; r < 6; r++) assert.deepEqual([...drawn.slice(r * all.length, (r + 1) * all.length)].sort(), [...all].sort())
  })

  it('only for its moment: before it starts and once it ends, his face is his sleeping face', () => {
    const page = load(['debug.js', 'idle.js', 'figure.js', 'nap.js'], { query: '?seed=3' })
    const [Nap, Figure] = [page.get('Nap'), page.get('Figure')]
    const p = Figure.POSES.doorNap
    for (const [name, v] of Object.entries(Nap.VARIATIONS)) {
      for (const k of [0, 1]) {
        const face = v.pose(p, k).face
        for (const [key, value] of Object.entries(p.face)) assert.ok(Math.abs(face[key] - value) < 1e-6, `${name} at ${k}: ${key} ${face[key]}, asleep ${value}`)
      }
    }
  })

  it('every variation leaves him a pose that draws', () => {
    const page = load(['debug.js', 'idle.js', 'figure.js', 'nap.js'], { query: '?seed=3' })
    const [Nap, Figure] = [page.get('Nap'), page.get('Figure')]
    for (const [name, v] of Object.entries(Nap.VARIATIONS)) {
      for (const k of [0, 0.25, 0.5, 0.75, 1]) {
        const s = JSON.stringify(Figure.shape(v.pose(Figure.POSES.doorNap, k)))
        assert.ok(!s.includes('NaN'), `${name} at ${k}`)
      }
    }
  })
})
