// Unit tests for bed.js: what the music bed plays, which moment, how busy.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const page = load(['debug.js', 'bed.js'], { query: '?seed=5' })
const Bed = page.get('Bed')
const Debug = page.get('Debug')
const MOODS = Object.keys(Bed.MOODS)

/** Every note of bars 0..n-1 of a bed for a moment, at a busyness. */
function notes(style, mood, energy, bars = 16, stream = 'bed-test') {
  const random = Debug.random(stream)
  const out = []
  for (let n = 0; n < bars; n++) out.push(...Bed.bar(style, mood, energy, n, random).notes)
  return out
}

describe('the bed for each moment', () => {
  it('a music box in the morning; while playing, the tiptoe walk; then the afternoon, evening, rain and nap each their own', () => {
    assert.equal(Bed.style('morning', 1).style, 'musicbox')
    assert.equal(Bed.style('day', 1).style, 'tiptoe')
    assert.equal(Bed.style('day', 0).style, 'musicbox')
    assert.equal(Bed.style('afternoon', 0.5).style, 'patter')
    assert.equal(Bed.style('dusk', 0.5).style, 'chat')
    assert.equal(Bed.style('rain', 0.5).style, 'drips')
    assert.equal(Bed.style('rest', 1).style, 'hush')
  })

  it('does not flip to and fro between playing and watching as the child slows down', () => {
    assert.equal(Bed.style('day', 0.45, true).style, 'tiptoe', 'dropped out of playing too soon')
    assert.equal(Bed.style('day', 0.45, false).style, 'musicbox', 'started playing too soon')
  })
})

describe('what a bed plays', () => {
  const scale = new Set(Bed.SCALE.map((s) => (Bed.TONIC + s) % 12))

  it('every note in B-flat major (the touches\' key), in each bed and moment', () => {
    for (const style of Object.keys(Bed.STYLES)) {
      for (const mood of MOODS) {
        for (const n of notes(style, mood, 0.7)) {
          if (n.midi != null) assert.ok(scale.has(((n.midi % 12) + 12) % 12), `${style} ${mood}: ${n.midi}`)
        }
      }
    }
  })

  it('only instruments the yard has, inside the bar, soft', () => {
    const have = new Set(['pizz', 'bassoon', 'flute', 'xylo', 'glock'])
    for (const style of Object.keys(Bed.STYLES)) {
      const random = Debug.random('bars')
      for (let n = 0; n < 12; n++) {
        const { notes: ns, seconds } = Bed.bar(style, 'day', 0.8, n, random)
        for (const note of ns) {
          assert.ok(have.has(note.inst), `${style}: ${note.inst}`)
          assert.ok(note.at >= 0 && note.at < seconds, `${style}: a note at ${note.at} of ${seconds}`)
          assert.ok(note.vol > 0 && note.vol < 0.45, `${style}: ${note.vol} is not soft`)
        }
      }
    }
  })

  it('more notes when the child is busy than when left alone', () => {
    for (const style of ['musicbox', 'tiptoe', 'patter']) {
      assert.ok(notes(style, 'day', 1, 32).length > notes(style, 'day', 0, 32).length, style)
    }
  })

  it('never silent for long: every bed has a note at least every other bar, even left alone', () => {
    for (const style of Object.keys(Bed.STYLES)) {
      const random = Debug.random('silence')
      for (let n = 0; n < 24; n += 2) {
        const two = [...Bed.bar(style, 'rest', 0, n, random).notes, ...Bed.bar(style, 'rest', 0, n + 1, random).notes]
        assert.ok(two.length > 0, `${style}: bars ${n} and ${n + 1} silent`)
      }
    }
  })

  it('played a little loose: not every note on its beat', () => {
    const ats = notes('musicbox', 'day', 1, 8).map((n) => n.at)
    assert.ok(ats.some((at) => Math.abs(at * 4 - Math.round(at * 4)) > 0.001), 'every note exactly on an eighth')
  })

  it('the same stream, the same music', () => {
    assert.deepEqual(notes('chat', 'dusk', 0.5, 8, 'same'), notes('chat', 'dusk', 0.5, 8, 'same'))
  })
})

describe('which moment the bed plays for', () => {
  const at = (hour, more = {}) => Bed.moodAt({ hour, raining: false, resting: false, dusk: false, ...more })

  it('the hours: morning, day, afternoon, dusk', () => {
    assert.deepEqual([8, 10, 14, 15, 17.9, 18].map((h) => at(h)), ['morning', 'day', 'day', 'afternoon', 'afternoon', 'dusk'])
  })

  it('rain over everything, then his rest, then the hour', () => {
    assert.equal(at(9, { raining: true, resting: true }), 'rain')
    assert.equal(at(9, { resting: true }), 'rest')
    assert.equal(at(12, { dusk: true }), 'dusk')
  })

  it('busier with each input, calmer as time passes, never past 0 or 1', () => {
    let busy = 0
    for (let i = 0; i < 10; i++) busy = Bed.livelier(busy)
    assert.equal(busy, 1)
    busy = Bed.calmer(busy, Bed.CALM_S)
    assert.ok(busy > 0.3 && busy < 0.4, `${busy}`)
    assert.ok(Bed.calmer(busy, 1000) >= 0)
  })
})
