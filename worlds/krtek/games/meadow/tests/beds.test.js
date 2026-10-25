// The meadow's music bed (game/beds.js on shared/bed.js): in the takes' key,
// only the meadow's instruments, soft, and a bed for each moment.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const sandbox = {}
vm.createContext(sandbox)
for (const f of ['bed.js', 'beds.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'game', f), 'utf8'), sandbox)
const Beds = vm.runInContext('MeadowBeds', sandbox)
const seq = (seed) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647) }

test('every note in E major, the takes\' key', () => {
  const scale = new Set([...Beds.SCALE].map((d) => (Beds.TONIC + d) % 12))
  for (const style of Object.keys(Beds.STYLES)) {
    for (const mood of Object.keys(Beds.MOODS)) {
      const random = seq(7)
      for (let n = 0; n < 16; n++) {
        for (const note of Beds.bar(style, mood, 0.7, n, random).notes) assert.ok(scale.has(((note.midi % 12) + 12) % 12), `${style} ${mood}: ${note.midi}`)
      }
    }
  }
})

test('only the meadow\'s instruments, inside the bar, soft', () => {
  const have = new Set(['harp', 'flute', 'birdflute', 'strings', 'clarinet'])
  for (const style of Object.keys(Beds.STYLES)) {
    const random = seq(3)
    for (let n = 0; n < 12; n++) {
      const { notes, seconds } = Beds.bar(style, 'day', 1, n, random)
      for (const note of notes) {
        assert.ok(have.has(note.inst), `${style}: ${note.inst}`)
        assert.ok(note.at >= 0 && note.at < seconds, `${style}: a note at ${note.at}`)
        assert.ok(note.vol > 0 && note.vol < 0.4, `${style}: ${note.vol}`)
      }
    }
  }
})

test('the takes\' pulse, and a bed for each moment', () => {
  for (const s of Object.values(Beds.STYLES)) assert.equal(s.bpm, 103)
  assert.equal(Beds.style('morning', 0).style, 'birdsong')
  assert.equal(Beds.style('day', 0).style, 'meadow')
  assert.equal(Beds.style('day', 1).style, 'stroll')
  assert.equal(Beds.style('afternoon', 0).style, 'haze')
  assert.deepEqual([9, 12, 16].map((hour) => Beds.moodAt({ hour })), ['morning', 'day', 'afternoon'])
})
