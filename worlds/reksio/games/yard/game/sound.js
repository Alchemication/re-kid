// Sounds made in the browser, new for the game. All gentle: small ears.

/* exported Sound */
const Sound = (() => {
  const VOLUME = 0.5
  let ctx = null
  let master = null
  let noise = null
  let original = null // easter-egg clips, if present (see play())

  /** Create the audio context on the first tap (browsers require a gesture). */
  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
      master = ctx.createGain()
      master.gain.value = VOLUME
      master.connect(ctx.destination)
      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const data = noise.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }

  function env(gain, t, peak, attack, decay) {
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(peak, t + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  }

  function tone(type, f0, f1, at, peak, attack, decay) {
    const c = ensure()
    const t = c.currentTime + at
    const o = c.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(f1, t + attack + decay)
    const g = c.createGain()
    env(g, t, peak, attack, decay)
    o.connect(g).connect(master)
    o.start(t)
    o.stop(t + attack + decay + 0.05)
  }

  function hiss(at, peak, attack, decay, filterType, freq, q = 1) {
    const c = ensure()
    const t = c.currentTime + at
    const src = c.createBufferSource()
    src.buffer = noise
    const f = c.createBiquadFilter()
    f.type = filterType
    f.frequency.value = freq
    f.Q.value = q
    const g = c.createGain()
    env(g, t, peak, attack, decay)
    src.connect(f).connect(g).connect(master)
    src.start(t, Math.random())
    src.stop(t + attack + decay + 0.05)
  }

  /** A cartoon "woof": a short voiced burst that drops in pitch. */
  function woof(at = 0) {
    const c = ensure()
    const t = c.currentTime + at
    const o = c.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(420, t)
    o.frequency.exponentialRampToValueAtTime(190, t + 0.16)
    const formant = c.createBiquadFilter()
    formant.type = 'bandpass'
    formant.frequency.value = 900
    formant.Q.value = 1.4
    const g = c.createGain()
    env(g, t, 0.55, 0.012, 0.17)
    o.connect(formant).connect(g).connect(master)
    o.start(t)
    o.stop(t + 0.25)
    hiss(at, 0.12, 0.005, 0.08, 'bandpass', 1500, 0.8)
  }

  return {
    ensure,
    /** The shared audio context and output, for the music engine. */
    bus() { ensure(); return { ctx, master } },
    bark() { woof(0); woof(0.2) },
    step() { hiss(0, 0.05, 0.002, 0.04, 'bandpass', 2400, 2) },
    knock() { tone('sine', 220, 160, 0, 0.3, 0.003, 0.12); tone('sine', 220, 160, 0.14, 0.25, 0.003, 0.12) },
    munch() { hiss(0, 0.22, 0.004, 0.07, 'bandpass', 1100, 1.5) },
    slurp() {
      const c = ensure()
      const t = c.currentTime
      const src = c.createBufferSource()
      src.buffer = noise
      const f = c.createBiquadFilter()
      f.type = 'bandpass'
      f.Q.value = 6
      f.frequency.setValueAtTime(500, t)
      f.frequency.exponentialRampToValueAtTime(2200, t + 0.35)
      const g = c.createGain()
      env(g, t, 0.35, 0.03, 0.35)
      src.connect(f).connect(g).connect(master)
      src.start(t)
      src.stop(t + 0.45)
    },
    /** One lap of the tongue: a short, wet "slp" that rises in pitch. */
    lap() {
      const c = ensure()
      const t = c.currentTime
      const src = c.createBufferSource()
      src.buffer = noise
      const f = c.createBiquadFilter()
      f.type = 'bandpass'
      f.Q.value = 9
      f.frequency.setValueAtTime(700, t)
      f.frequency.exponentialRampToValueAtTime(2600, t + 0.07)
      const g = c.createGain()
      env(g, t, 0.45, 0.006, 0.07)
      src.connect(f).connect(g).connect(master)
      src.start(t, Math.random())
      src.stop(t + 0.1)
    },
    /** One sleepy breath: a soft intake, then a low rumbling snore out. */
    snore() {
      const c = ensure()
      const t = c.currentTime
      hiss(0, 0.05, 0.5, 0.25, 'bandpass', 900, 0.7)
      const o = c.createOscillator()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(70, t + 0.75)
      o.frequency.linearRampToValueAtTime(58, t + 1.55)
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 420
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t + 0.75)
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.95)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6)
      o.connect(lp).connect(g).connect(master)
      o.start(t + 0.75)
      o.stop(t + 1.65)
    },
    yawn() { tone('sawtooth', 300, 170, 0, 0.08, 0.15, 0.5) },
    sneeze() {
      hiss(0, 0.06, 0.25, 0.05, 'bandpass', 1800, 1)
      hiss(0.32, 0.4, 0.004, 0.12, 'highpass', 1500)
      tone('square', 520, 300, 0.32, 0.06, 0.004, 0.1)
    },
    rattle() { for (let i = 0; i < 4; i++) tone('triangle', 260 + i * 14, 240, i * 0.08, 0.12, 0.003, 0.06) },
    curtain() { hiss(0, 0.06, 0.08, 0.3, 'bandpass', 2400, 0.6) },
    hop() { tone('sine', 300, 620, 0.1, 0.08, 0.02, 0.18) },
    sniff() { hiss(0, 0.07, 0.015, 0.06, 'bandpass', 2600, 1.5) },
    scratch() { for (let i = 0; i < 6; i++) hiss(i * 0.16, 0.09, 0.004, 0.06, 'highpass', 2500) },
    /** Teeth snapping shut on nothing. */
    snap() { tone('square', 1800, 900, 0, 0.12, 0.002, 0.03); hiss(0, 0.1, 0.002, 0.03, 'highpass', 3500) },
    /** A fly zipping away. */
    zip() { tone('sawtooth', 380, 900, 0, 0.035, 0.01, 0.22) },
    /** A short, soft bumblebee buzz. */
    buzz(seconds = 0.6) {
      const c = ensure()
      const t = c.currentTime
      const o = c.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = 165
      const lfo = c.createOscillator()
      lfo.frequency.value = 9
      const lfoGain = c.createGain()
      lfoGain.gain.value = 12
      lfo.connect(lfoGain).connect(o.frequency)
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 700
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.08)
      g.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
      o.connect(lp).connect(g).connect(master)
      o.start(t); lfo.start(t)
      o.stop(t + seconds + 0.05); lfo.stop(t + seconds + 0.05)
    },
    /** A startled little yelp. */
    yelp() { tone('triangle', 700, 1300, 0, 0.14, 0.01, 0.12); tone('triangle', 1250, 900, 0.1, 0.1, 0.01, 0.12) },
    /** A small dog's howl at the sky. */
    howl() {
      const c = ensure()
      const t = c.currentTime
      const o = c.createOscillator()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(380, t)
      o.frequency.linearRampToValueAtTime(560, t + 0.35)
      o.frequency.linearRampToValueAtTime(520, t + 1.0)
      o.frequency.linearRampToValueAtTime(400, t + 1.4)
      const vib = c.createOscillator()
      vib.frequency.value = 5.5
      const vibGain = c.createGain()
      vibGain.gain.value = 9
      vib.connect(vibGain).connect(o.frequency)
      const formant = c.createBiquadFilter()
      formant.type = 'bandpass'
      formant.frequency.value = 1000
      formant.Q.value = 1.6
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.2)
      g.gain.setValueAtTime(0.16, t + 1.0)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5)
      o.connect(formant).connect(g).connect(master)
      o.start(t); vib.start(t)
      o.stop(t + 1.55); vib.stop(t + 1.55)
    },
    /** Steady, soft rain. Returns a function that lets it fade away. */
    rain() {
      const c = ensure()
      const t = c.currentTime
      const src = c.createBufferSource()
      src.buffer = noise
      src.loop = true
      const hp = c.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 900
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 5200
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.09, t + 3)
      src.connect(hp).connect(lp).connect(g).connect(master)
      src.start(t)
      return () => {
        const now = c.currentTime
        g.gain.cancelScheduledValues(now)
        g.gain.setValueAtTime(g.gain.value, now)
        g.gain.exponentialRampToValueAtTime(0.0001, now + 3)
        src.stop(now + 3.1)
      }
    },
    /** Paws in a puddle. */
    splash() {
      hiss(0, 0.16, 0.004, 0.12, 'bandpass', 1300, 1.2)
      hiss(0.05, 0.08, 0.004, 0.1, 'bandpass', 2600, 1.5)
    },
    /** A rubber-stamp thump. */
    thump() {
      tone('sine', 120, 55, 0, 0.5, 0.004, 0.16)
      hiss(0, 0.12, 0.003, 0.05, 'lowpass', 900)
    },
    /** The rattle of a film reel winding up. */
    reel() { for (let i = 0; i < 14; i++) tone('square', 1300, 1200, i * 0.06, 0.035, 0.002, 0.025) },
    squeak() { tone('sine', 900, 1500, 0, 0.12, 0.02, 0.18) },
    /** A mouse: two tiny high peeps. */
    mouse() { tone('sine', 2400, 3300, 0, 0.07, 0.008, 0.06); tone('sine', 2600, 3500, 0.09, 0.06, 0.008, 0.05) },
    nibble() { hiss(0, 0.05, 0.002, 0.03, 'highpass', 4200) },
    /** A mouse trap going off: a sharp crack and a twangy spring. */
    trap() {
      hiss(0, 0.3, 0.001, 0.05, 'highpass', 2500)
      tone('square', 1400, 500, 0, 0.12, 0.001, 0.05)
      tone('triangle', 330, 180, 0.03, 0.12, 0.005, 0.4)
      tone('triangle', 345, 175, 0.05, 0.08, 0.005, 0.38)
    },
    /** A metal bowl nosed along the ground. */
    scrape() { hiss(0, 0.08, 0.05, 0.3, 'bandpass', 1800, 3) },
    water(seconds) {
      const c = ensure()
      const t = c.currentTime
      const src = c.createBufferSource()
      src.buffer = noise
      src.loop = true
      const f = c.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = 1800
      f.Q.value = 0.7
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.15)
      g.gain.setValueAtTime(0.18, t + seconds - 0.2)
      g.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
      src.connect(f).connect(g).connect(master)
      src.start(t)
      src.stop(t + seconds + 0.05)
    },
    shake() { for (let i = 0; i < 5; i++) hiss(i * 0.07, 0.12, 0.004, 0.05, 'highpass', 3000) },
    chirp() { tone('sine', 2600, 3600, 0, 0.12, 0.01, 0.07); tone('sine', 2800, 3900, 0.11, 0.1, 0.01, 0.07) },
    flutter() { for (let i = 0; i < 6; i++) hiss(i * 0.05, 0.08, 0.004, 0.035, 'bandpass', 900, 1) },
    dig() { for (let i = 0; i < 6; i++) hiss(i * 0.11, 0.2, 0.004, 0.06, 'bandpass', 700 + Math.random() * 500, 1.2) },
    /** Play an original clip (an easter egg), if the file is there; silent otherwise. */
    original(id) {
      ensure()
      original = original || {}
      const audio = original[id] || (original[id] = new Audio(`../../../audio/intro/marks/${id}.wav`))
      audio.currentTime = 0
      audio.volume = 0.6
      audio.play().catch(() => {})
    },
  }
})()
