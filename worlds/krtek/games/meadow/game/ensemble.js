// Copied from shared/ensemble.js by `main.py shared` — edit that, not this.
// A game's little band: its instrument samples (the game's samples.js), played
// note by note on the audio clock, and the music bed (bed.js rules, the game's
// score) played live through the retro recipe the effects are packed with,
// with a little tape wobble. Each game's music.js makes one and says when
// what plays.
//
// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* global Clock, Debug */
/* exported Ensemble */
const Ensemble = (() => {
  // How a bed sounds, unless the game's score says otherwise (bed.js `sound`: each world its own):
  // its level against the takes and touches (its notes are soft already); the retro recipe the
  // effects are packed with (config.EFFECT_*), live; a tape wobble, a slow drift of a hair of
  // pitch; and tape hiss under it (none here).
  const SOUND = { volume: 0.9, highpass: 120, lowpass: 5500, saturation: 0.6, wow: { hz: 0.45, depth: 0.0018 }, hiss: 0 }
  const WOW_DELAY = 0.012
  const HISS_S = 2 // the hiss loops a noise this long
  const AHEAD_S = 0.6 // bars are scheduled this far ahead on the audio clock
  const BACK_S = 1.6 // after a take, the bed comes back over about this long
  const TICK_MS = 200 // how often it schedules more bars

  const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer

  /** A loop of quiet noise, hiss off old tape, into to; its own stream, drawn once. */
  function hissInto(ctx, to, level) {
    const random = Debug.random('bed-hiss')
    const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * HISS_S), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (random() * 2 - 1) * level
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    src.connect(to)
    src.start()
    return src
  }

  /** The bed's bus: its gain, then the retro recipe and a tape wobble, into out. */
  function bedBus(ctx, out, s) {
    const gain = ctx.createGain()
    gain.gain.value = s.volume
    const low = ctx.createBiquadFilter()
    low.type = 'highpass'
    low.frequency.value = s.highpass
    const high = ctx.createBiquadFilter()
    high.type = 'lowpass'
    high.frequency.value = s.lowpass
    const shaper = ctx.createWaveShaper()
    const curve = new Float32Array(1024)
    for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / 511.5 - 1) * (1 + s.saturation)) / Math.tanh(1 + s.saturation)
    shaper.curve = curve
    const wow = ctx.createDelay(0.05)
    wow.delayTime.value = WOW_DELAY
    const lfo = ctx.createOscillator()
    lfo.frequency.value = s.wow.hz
    const depth = ctx.createGain()
    depth.gain.value = s.wow.depth
    lfo.connect(depth).connect(wow.delayTime)
    lfo.start()
    gain.connect(low).connect(high).connect(shaper).connect(wow).connect(out)
    const hiss = s.hiss ? hissInto(ctx, gain, s.hiss) : null // under the bed, so it steps back and stops with it
    return { gain, lfo, hiss }
  }

  /**
   * The bed: a score (bed.js) played bar by bar. quiet(): true while it
   * should hold back (a take plays: nothing is scheduled, nobody would
   * hear it). start() once sound may play; set({ mood, energy }) as the day
   * goes; away(t)/back() around a take; stop() for good (the lullaby).
   */
  function bedOf({ ctx, out, play, loaded, isReady }, score, { quiet = () => false, stream = 'music-bed' } = {}) {
    const sound = { ...SOUND, ...score.SOUND }
    const b = { on: false, mood: Object.keys(score.MOODS)[0], energy: 0.3, style: null, playing: false, n: 0, next: 0, bus: null, random: null, timer: () => {} }

    function bars() {
      if (!isReady()) return
      if (quiet() || b.next < ctx.currentTime) b.next = ctx.currentTime + 0.1 // under a take nothing is scheduled; back from a hidden page, afresh
      if (quiet()) return
      while (b.next < ctx.currentTime + AHEAD_S) {
        const pick = score.style(b.mood, b.energy, b.playing)
        if (pick.style !== b.style) b.n = 0 // a new bed starts its chords from the top
        b.style = pick.style
        b.playing = pick.playing
        const { notes, seconds } = score.bar(b.style, b.mood, b.energy, b.n, b.random)
        for (const note of notes) play(note.inst, note.midi, b.next + note.at, note.vol, { to: b.bus.gain })
        b.next += seconds
        b.n += 1
      }
    }

    return {
      async start() {
        if (b.on) return
        b.on = true // at once, so taps while it loads don't start it twice
        try {
          await loaded
        } catch (e) {
          b.on = false // the samples wouldn't load: no bed, and the next tap may try again
          Debug.trace('music bed', { failed: String(e?.message ?? e) })
          return
        }
        b.random ??= Debug.random(stream)
        b.bus = bedBus(ctx, out, sound)
        if (quiet()) this.away(ctx.currentTime)
        b.timer = Clock.every(TICK_MS, bars)
      },
      set({ mood = b.mood, energy = b.energy }) {
        b.mood = mood
        b.energy = energy
      },
      /** A take begins at t: the bed steps back. */
      away(t) {
        if (b.bus) b.bus.gain.gain.setTargetAtTime(0.0001, Math.max(t, ctx.currentTime), 0.25)
      },
      /** No take now: the bed comes back. */
      back() {
        if (b.bus && b.on) b.bus.gain.gain.setTargetAtTime(sound.volume, ctx.currentTime, BACK_S / 3)
      },
      /** The bed off: its bars stop, its sound fades, its wobble stops; it may start again. */
      stop() {
        if (!b.on) return
        b.timer()
        const { bus } = b
        bus?.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3)
        Clock.after(1500, () => {
          bus?.lfo.stop()
          bus?.hiss?.stop()
          bus?.gain.disconnect()
        })
        b.on = false
        b.bus = null
      },
      get on() { return b.on },
      get style() { return b.style },
      get mood() { return b.mood },
    }
  }


  /** The band on audio context `ctx`, playing into node `out`, from a SAMPLES table. */
  function make(ctx, out, samples) {
    const buffers = {} // instrument -> [{midi, buffer}]
    let ready = false
    const jobs = []
    for (const [inst, notes] of Object.entries(samples || {})) {
      buffers[inst] = []
      for (const note of notes) jobs.push(ctx.decodeAudioData(bytes(note.data)).then((buffer) => buffers[inst].push({ midi: note.midi, buffer })))
    }
    const loaded = Promise.all(jobs).then(() => {
      for (const list of Object.values(buffers)) list.sort((a, b) => (a.midi ?? 0) - (b.midi ?? 0))
      ready = true
    })

    /** Play one note (or one-shot sound) at time t. Pitched instruments use the
     * nearest sample, re-tuned by playback rate. to: where it goes (the bed's bus). */
    function play(inst, midi, t, vol = 0.8, { index = 0, to = out } = {}) {
      const list = buffers[inst]
      if (!ready || !list || !list.length) return
      let pick = list[Math.min(index, list.length - 1)]
      let rate = 1
      if (midi != null && pick.midi != null) {
        pick = list.reduce((best, s) => (Math.abs(s.midi - midi) < Math.abs(best.midi - midi) ? s : best))
        rate = 2 ** ((midi - pick.midi) / 12)
      }
      const src = ctx.createBufferSource()
      src.buffer = pick.buffer
      src.playbackRate.value = rate
      const g = ctx.createGain()
      g.gain.value = vol
      src.connect(g).connect(to)
      src.start(Math.max(t, ctx.currentTime))
    }

    const bed = (score, opts) => bedOf({ ctx, out, play, loaded, isReady: () => ready }, score, opts)

    return { play, bed, loaded, get ready() { return ready }, buffers }
  }

  return { make }
})()
