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
    /** A rising, rubbery tone while he stretches. Returns a function that stops it. */
    stretch() {
      const c = ensure()
      const t = c.currentTime
      const o = c.createOscillator()
      o.type = 'triangle'
      o.frequency.setValueAtTime(170, t)
      o.frequency.exponentialRampToValueAtTime(620, t + 2.2)
      const wob = c.createOscillator()
      wob.frequency.value = 7
      const wobGain = c.createGain()
      wobGain.gain.value = 9
      wob.connect(wobGain).connect(o.frequency)
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.11, t + 0.12)
      o.connect(g).connect(master)
      o.start(t)
      wob.start(t)
      return () => {
        const now = c.currentTime
        g.gain.cancelScheduledValues(now)
        g.gain.setValueAtTime(g.gain.value, now)
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08)
        o.stop(now + 0.1)
        wob.stop(now + 0.1)
      }
    },
    /** A cartoon boing as he snaps back. */
    boing() {
      const c = ensure()
      const t = c.currentTime
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(140, t)
      o.frequency.exponentialRampToValueAtTime(520, t + 0.07)
      o.frequency.exponentialRampToValueAtTime(260, t + 0.5)
      const wob = c.createOscillator()
      wob.frequency.setValueAtTime(18, t)
      wob.frequency.linearRampToValueAtTime(8, t + 0.5)
      const wobGain = c.createGain()
      wobGain.gain.setValueAtTime(60, t)
      wobGain.gain.linearRampToValueAtTime(5, t + 0.5)
      wob.connect(wobGain).connect(o.frequency)
      const g = c.createGain()
      env(g, t, 0.3, 0.01, 0.55)
      o.connect(g).connect(master)
      o.start(t)
      wob.start(t)
      o.stop(t + 0.6)
      wob.stop(t + 0.6)
    },
    hop() { tone('sine', 300, 620, 0.1, 0.08, 0.02, 0.18) },
    sniff() { hiss(0, 0.07, 0.015, 0.06, 'bandpass', 2600, 1.5) },
    scratch() { for (let i = 0; i < 6; i++) hiss(i * 0.16, 0.09, 0.004, 0.06, 'highpass', 2500) },
    /** A soft pop, for a thought bubble appearing. */
    blip() { tone('sine', 660, 990, 0, 0.1, 0.01, 0.12) },
    squeak() { tone('sine', 900, 1500, 0, 0.12, 0.02, 0.18) },
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
    ding() { tone('triangle', 1046, 1046, 0, 0.18, 0.005, 0.6); tone('triangle', 1568, 1568, 0.12, 0.14, 0.005, 0.8) },
    lullaby() {
      // A simple, original four-bar tune; a placeholder until real music exists.
      const notes = [392, 330, 349, 294, 330, 262, 294, 196]
      notes.forEach((f, i) => tone('triangle', f, f, i * 0.42, 0.12, 0.02, 0.5))
    },
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
