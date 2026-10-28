// Unit tests for sound.js's recorded effects (effects.js): which take plays,
// when the synthesised sound plays instead, and one take of a sound at a
// time. Run on a stand-in AudioContext that notes what was started.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')
const { atob, btoa } = require('node:buffer')

/** A stand-in AudioContext: decoding gives a buffer named after the take's
 * first byte; started sources and oscillators are noted; time moves only
 * when the test sets `now`. */
function fakeAudio() {
  const made = { takes: [], oscillators: 0, gains: [] }
  const param = () => ({ value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} })
  const node = (extra = {}) => ({ connect: (to) => to, disconnect() {}, ...extra })
  const clock = { now: 0 }
  class AudioContext {
    constructor() {
      this.state = 'running'
      this.sampleRate = 22050
      this.destination = node()
    }
    get currentTime() { return clock.now }
    createGain() {
      const g = node({ gain: param() })
      made.gains.push(g)
      return g
    }
    createBuffer(_ch, length) { return { getChannelData: () => new Float32Array(length) } }
    createBufferSource() {
      const src = node({ buffer: null, playbackRate: param(), start() { if (src.buffer.take) made.takes.push(src) }, stop() {} })
      return src
    }
    createOscillator() {
      made.oscillators += 1
      return node({ type: '', frequency: param(), start() {}, stop() {} })
    }
    createBiquadFilter() { return node({ type: '', frequency: param(), Q: param() }) }
    decodeAudioData(bytes) { return Promise.resolve({ duration: 1, take: new Uint8Array(bytes)[0] }) }
    resume() {}
    suspend() {}
  }
  return { AudioContext, made, clock }
}

/** sound.js with these EFFECTS ({name: number of takes}; `steady` names the
 * steady ones), and `originals` original barks (BARKS, their bytes from 100
 * up), on a stand-in context. */
function sound(takes, steady = [], originals = 0, overlaps = []) {
  const audio = fakeAudio()
  const EFFECTS = Object.fromEntries(Object.entries(takes).map(([name, n]) => [
    name, { gain: 1, ...(steady.includes(name) ? { steady: true } : {}), ...(overlaps.includes(name) ? { overlaps: true } : {}), takes: Array.from({ length: n }, (_, i) => btoa(String.fromCharCode(i + 1))) },
  ]))
  const page = load(['debug.js', 'sound.js'], {
    dom: true,
    globals: {
      atob, EFFECTS,
      ...(originals ? { BARKS: Array.from({ length: originals }, (_, i) => btoa(String.fromCharCode(100 + i))) } : {}),
      window: { AudioContext: audio.AudioContext, addEventListener() {}, innerWidth: 1280, innerHeight: 720 },
    },
  })
  const Sound = page.get('Sound')
  Sound.ensure() // the first tap
  return { Sound, ...audio }
}

const decoded = () => new Promise((resolve) => setImmediate(resolve))

describe('recorded effects', () => {
  it('play a recorded take once decoded, and the synth before then', async () => {
    const s = sound({ boing: 2 })
    s.Sound.boing()
    assert.equal(s.made.takes.length, 0, 'nothing decoded yet')
    assert.ok(s.made.oscillators > 0, 'the synthesised boing played instead')
    await decoded()
    const before = s.made.oscillators
    s.clock.now = 5
    s.Sound.boing()
    assert.equal(s.made.takes.length, 1)
    assert.equal(s.made.oscillators, before, 'no synth on top of the take')
  })

  it('never play the same take twice running, and vary its pitch', async () => {
    const s = sound({ splash: 3 })
    await decoded()
    for (let i = 0; i < 30; i++) {
      s.clock.now += 2
      s.Sound.splash()
    }
    const order = s.made.takes.map((t) => t.buffer.take)
    assert.equal(order.length, 30)
    order.forEach((take, i) => i && assert.notEqual(take, order[i - 1], `take ${take} twice running`))
    assert.equal(new Set(order).size, 3, 'every take gets its turn')
    const rates = s.made.takes.map((t) => t.playbackRate.value)
    assert.ok(rates.every((r) => r >= 0.94 && r <= 1.06) && new Set(rates).size > 1, String(rates))
  })

  it('a steady sound plays its one take at its own speed, every time', async () => {
    const s = sound({ cuckoo: 1 }, ['cuckoo'])
    await decoded()
    for (let i = 0; i < 8; i++) {
      s.clock.now += 2
      s.Sound.cuckoo()
    }
    assert.equal(s.made.takes.length, 8)
    assert.ok(s.made.takes.every((t) => t.playbackRate.value === 1), 'never higher or lower')
  })

  it('play one take of a sound at a time: asked again while one plays, it lets that one play on', async () => {
    const s = sound({ munch: 2 })
    await decoded()
    s.Sound.munch()
    s.clock.now = 0.3
    s.Sound.munch() // the next chew, while the take still chews
    assert.equal(s.made.takes.length, 1)
    s.clock.now = 1.2 // the take (1 s, at most 6% slower) is over
    s.Sound.munch()
    assert.equal(s.made.takes.length, 2)
  })

  it('a sound that overlaps plays every call, over the take before (the boy\'s pats)', async () => {
    const s = sound({ pat: 2 }, [], 0, ['pat'])
    await decoded()
    for (let i = 0; i < 4; i++) {
      s.Sound.pat()
      s.clock.now += 0.2 // quicker than a take lasts
    }
    assert.equal(s.made.takes.length, 4)
  })

  it('bring back his voice where it has takes; the rest of it stays silent', async () => {
    const s = sound({ yawn: 1 })
    await decoded()
    s.Sound.yawn()
    s.Sound.slurp()
    assert.equal(s.made.takes.length, 1)
    assert.equal(s.made.oscillators, 0, 'no synthesised voice')
  })

  it('heard from afar (a creature), quieter', async () => {
    const s = sound({ buzz: 1 })
    await decoded()
    s.Sound.buzz()
    const near = s.made.gains.at(-1).gain.value
    s.clock.now = 5
    s.Sound.from(600, () => s.Sound.buzz())
    const far = s.made.gains.at(-1).gain.value
    assert.ok(far < near / 2, `${far} vs ${near}`)
  })

  it('bark with a take on the public site, where the original barks are missing', async () => {
    const s = sound({ bark: 2 })
    await decoded()
    s.Sound.bark()
    assert.equal(s.made.takes.length, 1, 'one take: the whole "hau hau"')
    assert.equal(s.made.oscillators, 0, 'no synthesised woof')
    s.clock.now = 5
    s.Sound.bowlBark() // muffled in the bowl: still a take
    assert.equal(s.made.takes.length, 2)
  })

  it('bark with the originals where they are here, never a take over them', async () => {
    const s = sound({ bark: 2 }, [], 3)
    await decoded()
    s.Sound.bark()
    const played = s.made.takes.map((t) => t.buffer.take)
    assert.equal(played.length, 2, 'two original barks: "hau hau"')
    assert.ok(played.every((b) => b >= 100), `a take played: ${played}`)
  })
})
