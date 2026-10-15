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

  /** Something round rolling through the grass. */
  function roll(seconds) {
    if (!ready()) return
    for (let t = 0; t < seconds; t += 0.12) hiss(t, 0.14, 500 + Math.random() * 200, 2, 0.06 * (1 - t / seconds))
  }

  /** Knock knock, on an eggshell. */
  function knock() {
    if (!ready()) return
    for (const at of [0.18, 0.5]) {
      note(1400, at, 0.05, 0.22, 'triangle', 0.6)
      hiss(at, 0.03, 3000, 2, 0.12)
    }
  }

  /** The mouse: two little squeaks. */
  function squeak() {
    if (!ready()) return
    note(2200, 0, 0.09, 0.08, 'sine', 1.3)
    note(2500, 0.14, 0.08, 0.07, 'sine', 1.25)
  }

  /** The chick: a few high peeps. */
  function peep() {
    if (!ready()) return
    for (let i = 0; i < 3; i++) note(2600 + Math.random() * 400, i * 0.16, 0.08, 0.07, 'sine', 1.4)
  }

  /** The shell cracking. */
  function crack() {
    if (!ready()) return
    for (let i = 0; i < 4; i++) hiss(i * 0.04, 0.05, 2400 + i * 400, 4, 0.3)
  }

  /** The hen: a soft "bok bok bok". */
  function cluck() {
    if (!ready()) return
    for (let i = 0; i < 3; i++) {
      note(420 - i * 20, i * 0.2, 0.11, 0.12, 'square', 0.7)
      hiss(i * 0.2, 0.06, 1200, 3, 0.05)
    }
  }

  /** A pole planted in the ground: a wooden tok. */
  function plink() {
    if (!ready()) return
    note(520, 0, 0.12, 0.2, 'triangle', 0.7)
    hiss(0, 0.05, 900, 2, 0.1)
  }

  /** A tug at something stuck: a low strain. */
  function tug() {
    if (!ready()) return
    hiss(0, 0.35, 260, 1.5, 0.18)
  }

  /** Something thrown: a whoosh. */
  function whoosh() {
    if (!ready()) return
    hiss(0, 0.5, 1500, 0.8, 0.12)
  }

  /** The bulldozer far off: a soft low rumble for a few seconds. */
  function rumble(seconds) {
    if (!ready()) return
    for (let t = 0; t < seconds; t += 0.25) hiss(t, 0.3, 110 + Math.random() * 40, 1.2, 0.05)
  }

  /** A splash: into a tin of paint, or the spring. */
  function splash() {
    if (!ready()) return
    hiss(0, 0.35, 900, 0.7, 0.3)
    hiss(0.05, 0.25, 2400, 1.5, 0.15)
  }

  /** A brush, swished. */
  function swish() {
    if (!ready()) return
    for (const at of [0, 0.22]) hiss(at, 0.16, 3200, 1.2, 0.1)
  }

  /** The monster's "boo": three voices low and loud, for a cartoon fright. */
  function boo() {
    if (!ready()) return
    for (const f of [150, 190, 230]) note(f, 0, 0.7, 0.12, 'sawtooth', 0.7)
  }

  /** The fox, frightened: a quick yelp. */
  function yelp() {
    if (!ready()) return
    note(900, 0, 0.18, 0.15, 'square', 1.6)
  }

  /** Winding a clockwork key: a ratchet. */
  function crank() {
    if (!ready()) return
    for (let t = 0; t < 1.1; t += 0.09) {
      note(1800, t, 0.03, 0.08, 'square', 0.8)
      hiss(t, 0.02, 4000, 3, 0.05)
    }
  }

  /** A clockwork toy car whizzing along: a whirr that rises. */
  function vroom(seconds) {
    if (!ready()) return
    note(180, 0, seconds, 0.07, 'sawtooth', 1.8)
    note(360, 0, seconds, 0.04, 'square', 1.7)
  }

  return { ensure, say, dig, pop, water, cricket, quiet, roll, knock, squeak, peep, crack, cluck, plink, tug, whoosh, rumble, splash, swish, boo, yelp, crank, vroom }
})()
