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
  const BED_VOLUME = 0.9 // the bed against the takes and touches (its notes are soft already)
  // the retro recipe the effects are packed with (config.EFFECT_*), live on the bed
  const RETRO = { highpass: 120, lowpass: 5500, saturation: 0.6 }
  const WOW = { hz: 0.45, depth: 0.0018, delay: 0.012 } // tape wobble: a slow drift of a hair of pitch
  const AHEAD_S = 0.6 // bars are scheduled this far ahead on the audio clock
  const BACK_S = 1.6 // after a take, the bed comes back over about this long
  const TICK_MS = 200 // how often it schedules more bars

  const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer

  /** The bed's bus: its gain, then the retro recipe and a tape wobble, into out. */
  function bedBus(ctx, out) {
    const gain = ctx.createGain()
    gain.gain.value = BED_VOLUME
    const low = ctx.createBiquadFilter()
    low.type = 'highpass'
    low.frequency.value = RETRO.highpass
    const high = ctx.createBiquadFilter()
    high.type = 'lowpass'
    high.frequency.value = RETRO.lowpass
    const shaper = ctx.createWaveShaper()
    const curve = new Float32Array(1024)
    for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / 511.5 - 1) * (1 + RETRO.saturation)) / Math.tanh(1 + RETRO.saturation)
    shaper.curve = curve
    const wow = ctx.createDelay(0.05)
    wow.delayTime.value = WOW.delay
    const lfo = ctx.createOscillator()
    lfo.frequency.value = WOW.hz
    const depth = ctx.createGain()
    depth.gain.value = WOW.depth
    lfo.connect(depth).connect(wow.delayTime)
    lfo.start()
    gain.connect(low).connect(high).connect(shaper).connect(wow).connect(out)
    return { gain, lfo }
  }

  /**
   * The bed: a score (bed.js) played bar by bar. quiet(): true while it
   * should hold back (a take plays: nothing is scheduled, nobody would
   * hear it). start() once sound may play; set({ mood, energy }) as the day
   * goes; away(t)/back() around a take; stop() for good (the lullaby).
   */
  function bedOf({ ctx, out, play, loaded, isReady }, score, { quiet = () => false, stream = 'music-bed' } = {}) {
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
        b.bus = bedBus(ctx, out)
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
        if (b.bus && b.on) b.bus.gain.gain.setTargetAtTime(BED_VOLUME, ctx.currentTime, BACK_S / 3)
      },
      /** The bed off: its bars stop, its sound fades, its wobble stops; it may start again. */
      stop() {
        if (!b.on) return
        b.timer()
        const { bus } = b
        bus?.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3)
        Clock.after(1500, () => {
          bus?.lfo.stop()
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
