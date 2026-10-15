// The meadow's sounds. The mole's voice is recorded takes picked by ear
// (effects.yaml, packed into effects.js by `main.py effects`): one at random
// each time, never the same twice running, a little higher or lower. The
// rest is made in the browser, quiet and short: digging, popping up, water,
// and the cricket's fiddle at dusk.
//
// Its take player does what the yard's sound.js does for recorded effects;
// both are the next part to move into shared/ (CLAUDE.md, "Shared parts").

/* global EFFECTS, Clock */
/* exported Sound */
const Sound = (() => {
  const VOLUME = 0.5
  const VOICE_VOLUME = 0.9
  const VOICE_RATE = [0.95, 1.07] // each word a little lower or higher: never quite the same twice
  const CRICKET_VOLUME = 0.12
  // The cricket's tune: a slow, rocking phrase on a pentatonic scale (Hz, beats)
  const TUNE = [[523, 1], [587, 1], [659, 2], [587, 1], [523, 1], [440, 2], [392, 1], [440, 1], [523, 3], [0, 1]]
  const BEAT_S = 0.42
  let ctx = null
  let master = null
  let noise = null
  const takes = {} // decoded voice takes, by sound: {gain, buffers, last}
  let fiddle = null // the cricket's tune while it plays: {stop}

  Clock.onHold((held) => {
    if (!ctx) return
    if (held) ctx.suspend()
    else ctx.resume()
  })

  /** Create the audio context on the first tap (browsers require a gesture). */
  function ensure() {
    if (!ctx) {
      if (navigator.audioSession) navigator.audioSession.type = 'playback' // iPhone on silent: play like a video
      ctx = new (window.AudioContext || window.webkitAudioContext)()
      master = ctx.createGain()
      master.gain.value = VOLUME
      master.connect(ctx.destination)
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const data = noise.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      for (const [name, e] of Object.entries(typeof EFFECTS !== 'undefined' ? EFFECTS : {})) {
        const mine = (takes[name] = { gain: e.gain, buffers: [], last: -1 })
        for (const b64 of e.takes) {
          ctx.decodeAudioData(bytes(b64)).then((b) => mine.buffers.push(b), () => {}) // a take that won't decode is left out: the others play
        }
      }
    }
    if (ctx.state === 'suspended' && !Clock.held) ctx.resume()
    return ctx
  }

  const bytes = (b64) => Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)).buffer
  const ready = () => ctx && ctx.state !== 'closed'

  /** One of the mole's words or noises ('giggle', 'ahoj', 'achJo', 'ooh', 'fright'), if it has takes. */
  function say(name) {
    if (!ready()) return false
    const e = takes[name]
    if (!e || !e.buffers.length) return false
    let i = Math.floor(Math.random() * e.buffers.length)
    if (i === e.last && e.buffers.length > 1) i = (i + 1) % e.buffers.length
    e.last = i
    const src = ctx.createBufferSource()
    src.buffer = e.buffers[i]
    src.playbackRate.value = VOICE_RATE[0] + Math.random() * (VOICE_RATE[1] - VOICE_RATE[0])
    const g = ctx.createGain()
    g.gain.value = VOICE_VOLUME * e.gain
    src.connect(g).connect(master)
    src.start()
    return true
  }

  /** A burst of filtered noise: earth scraped, water poured. */
  function hiss(at, length, freq, q, peak) {
    const t = ctx.currentTime + at
    const src = ctx.createBufferSource()
    src.buffer = noise
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + length)
    src.connect(f).connect(g).connect(master)
    src.start(t, Math.random() * 0.5)
    src.stop(t + length + 0.05)
  }

  function note(freq, at, length, peak, type = 'sine', glide = 1) {
    const t = ctx.currentTime + at
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    o.frequency.exponentialRampToValueAtTime(freq * glide, t + length)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.04, length / 3))
    g.gain.exponentialRampToValueAtTime(0.0001, t + length)
    o.connect(g).connect(master)
    o.start(t)
    o.stop(t + length + 0.05)
    return o
  }

  /** Digging down: a few quick scrapes of earth. */
  function dig() {
    if (!ready()) return
    for (let i = 0; i < 3; i++) hiss(i * 0.11, 0.09, 900 + Math.random() * 500, 1.2, 0.35)
  }

  /** Popping up through a fresh molehill. */
  function pop() {
    if (!ready()) return
    hiss(0, 0.12, 600, 0.9, 0.25)
    note(330, 0.05, 0.14, 0.18, 'sine', 2.2)
  }

  /** Water: filling the can at the spring, or sprinkling it on the flowers. */
  function water(seconds = 0.8) {
    if (!ready()) return
    for (let t = 0; t < seconds; t += 0.07) hiss(t, 0.1, 2600 + Math.random() * 1800, 3, 0.08)
  }

  /** The cricket's fiddle, played over and over until stopped (dusk to bedtime). */
  function cricket() {
    if (!ready() || fiddle) return
    let at = 0
    const oscs = []
    for (let round = 0; round < 6; round++) {
      for (const [freq, beats] of TUNE) {
        if (freq) {
          const o = note(freq, at, beats * BEAT_S * 0.95, CRICKET_VOLUME, 'triangle')
          const vib = ctx.createOscillator() // a fiddler's vibrato
          const depth = ctx.createGain()
          vib.frequency.value = 5.5
          depth.gain.value = freq * 0.012
          vib.connect(depth).connect(o.frequency)
          vib.start(ctx.currentTime + at)
          vib.stop(ctx.currentTime + at + beats * BEAT_S)
          oscs.push(o, vib)
        }
        at += beats * BEAT_S
      }
    }
    fiddle = {
      stop() {
        for (const o of oscs) {
          try { o.stop() } catch { /* already ended: nothing to stop */ }
        }
        fiddle = null
      },
    }
  }

  function quiet() {
    if (fiddle) fiddle.stop()
  }

  return { ensure, say, dig, pop, water, cricket, quiet }
})()
