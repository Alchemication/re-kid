// The yard's music: recorded takes picked by ear (tunes.js), one part at a
// time with quiet in between, and small touches on instrument samples
// (samples.js) for what Reksio does.
//
// - The morning: a morning take as he wakes.
// - Through the day, a phrase now and then: the game asks for one (phrase())
//   when something is done, or after a long quiet; when is the game's rule (idle.js phraseOk),
//   so a child left alone mostly gets the yard's own sounds, not a loop.
// - At evening (supper), a lullaby take; a phrase still playing fades out first.
// - Rain and the sun going down make it quieter.
// - Actions play along on samples: a xylophone flourish when a new thing is
//   done, glockenspiel for a thought bubble, a flute trill for the bird, a
//   rising bassoon as Reksio stretches and a falling run (the shape of the
//   marked stretching melody) as he snaps back. They are in B-flat and each
//   take is in its own key, so they play only while no take does.
// - The bed (the game turns it on: bed.start): quiet music under all of
//   it, so the yard is never silent; bed.js says what it plays, the game
//   says the moment and how busy the child is (bed.set). It goes through
//   the retro recipe the effects use, with a little tape wobble, steps back
//   under a take and comes back after, and stops at the lullaby.

// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* global Sound, SAMPLES, TUNES, Debug, Clock, Bed, Takes */
/* exported Music */
const Music = (() => {
  const VOLUME = 0.42 // music under the sound effects
  const TAKE_VOLUME = 0.8 // the takes against the samples' touches (both levelled when packed)
  const PHRASE_LEAD_S = 0.8 // a phrase starts after the new thing's flourish, not over it
  const PARTS = ['morning', 'phrase', 'lullaby'] // the parts it plays (tunes.yaml)
  const EIGHTH_S = 60 / 136 / 2 // the touches' pace: eighth notes at 136 BPM
  const CHORD = [62, 65, 70] // D4 F4 B-flat4: the touches stay in B-flat
  const BED_VOLUME = 0.9 // the bed against the takes and touches (its notes are soft already: bed.js)
  // the retro recipe the effects are packed with (config.EFFECT_*), live on the bed
  const RETRO = { highpass: 120, lowpass: 5500, saturation: 0.6 }
  const WOW = { hz: 0.45, depth: 0.0018, delay: 0.012 } // tape wobble: a slow drift of a hair of pitch
  const BED_AHEAD_S = 0.6 // bars are scheduled this far ahead on the audio clock
  const BED_BACK_S = 1.6 // after a take, the bed comes back over about this long

  let bus = null
  let out = null
  const buffers = {} // instrument -> [{midi, buffer}]
  let takes = null // the recorded takes' player (takes.js)
  let ready = false
  let night = false // after the lullaby starts, nothing else plays
  let dusk = 0
  let raining = false

  // ------------------------------------------------------------ loading

  const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer

  async function load() {
    const { ctx } = bus
    const jobs = []
    for (const [inst, notes] of Object.entries(SAMPLES)) {
      buffers[inst] = []
      for (const note of notes) {
        jobs.push(ctx.decodeAudioData(bytes(note.data)).then((buffer) => buffers[inst].push({ midi: note.midi, buffer })))
      }
    }
    if (typeof TUNES !== 'undefined') jobs.push(takes.load(TUNES))
    await Promise.all(jobs)
    for (const list of Object.values(buffers)) list.sort((a, b) => (a.midi ?? 0) - (b.midi ?? 0))
    ready = true
  }

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
    const src = bus.ctx.createBufferSource()
    src.buffer = pick.buffer
    src.playbackRate.value = rate
    const g = bus.ctx.createGain()
    g.gain.value = vol
    src.connect(g).connect(to)
    src.start(Math.max(t, bus.ctx.currentTime))
  }

  // ------------------------------------------------------------ takes

  /** A random take of `part` (never the one before, if it has others) from
   * time t; false if it has none ready. random: the caller's stream. The bed
   * steps back while it plays (takes.js onStart, onEnd). */
  function playTake(part, random, t) {
    return ready && takes.play(part, random, t)
  }

  // ------------------------------------------------------------ the bed

  const bed = { on: false, mood: 'morning', energy: 0.3, style: 'musicbox', playing: false, n: 0, next: 0, gain: null, random: null, timer: () => {}, lfo: null }

  /** The bed's bus: its gain, then the retro recipe and a tape wobble, into the music's out. */
  function bedBus() {
    const c = bus.ctx
    const gain = c.createGain()
    gain.gain.value = BED_VOLUME
    const low = c.createBiquadFilter()
    low.type = 'highpass'
    low.frequency.value = RETRO.highpass
    const high = c.createBiquadFilter()
    high.type = 'lowpass'
    high.frequency.value = RETRO.lowpass
    const shaper = c.createWaveShaper()
    const curve = new Float32Array(1024)
    for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / 511.5 - 1) * (1 + RETRO.saturation)) / Math.tanh(1 + RETRO.saturation)
    shaper.curve = curve
    const wow = c.createDelay(0.05)
    wow.delayTime.value = WOW.delay
    const lfo = c.createOscillator()
    lfo.frequency.value = WOW.hz
    const depth = c.createGain()
    depth.gain.value = WOW.depth
    lfo.connect(depth).connect(wow.delayTime)
    lfo.start()
    bed.lfo = lfo
    gain.connect(low).connect(high).connect(shaper).connect(wow).connect(out)
    return gain
  }

  /** Bars, scheduled a little ahead on the audio clock, while the bed is on. */
  function bedBars() {
    if (!ready || night) return
    const c = bus.ctx
    if (takes.playing || bed.next < c.currentTime) bed.next = c.currentTime + 0.1 // under a take nothing is scheduled (nobody would hear it); back from a hidden page, afresh
    if (takes.playing) return
    while (bed.next < c.currentTime + BED_AHEAD_S) {
      const pick = Bed.style(bed.mood, bed.energy, bed.playing)
      if (pick.style !== bed.style) bed.n = 0 // a new bed starts its chords from the top
      bed.style = pick.style
      bed.playing = pick.playing
      const { notes, seconds } = Bed.bar(bed.style, bed.mood, bed.energy, bed.n, bed.random)
      for (const note of notes) play(note.inst, note.midi, bed.next + note.at, note.vol, { to: bed.gain })
      bed.next += seconds
      bed.n += 1
    }
  }

  /** The bed off: its bars stop, its sound fades, its wobble stops; it may start again. */
  function stopBed() {
    if (!bed.on) return
    bed.timer()
    bed.gain?.gain.setTargetAtTime(0.0001, bus.ctx.currentTime, 0.3)
    const { gain, lfo } = bed
    Clock.after(1500, () => {
      lfo?.stop()
      gain?.disconnect()
    })
    bed.on = false
    bed.gain = null
  }

  /** A take begins at t: the bed steps back. */
  function bedAway(t) {
    if (bed.gain) bed.gain.gain.setTargetAtTime(0.0001, Math.max(t, bus.ctx.currentTime), 0.25)
  }

  /** No take now: the bed comes back (not after the lullaby). */
  function bedBack() {
    if (bed.gain && !takes.playing && !night) bed.gain.gain.setTargetAtTime(BED_VOLUME, bus.ctx.currentTime, BED_BACK_S / 3)
  }

  // ------------------------------------------------------------ public

  /** Load the samples and takes (once); needs a tap first, like all sound. */
  let loading = null
  function prepare() {
    if (!loading) {
      bus = Sound.bus()
      out = bus.ctx.createGain()
      out.gain.value = VOLUME
      out.connect(bus.master)
      takes = Takes.player(bus.ctx, out, { volume: TAKE_VOLUME, onStart: bedAway, onEnd: bedBack })
      loading = load()
    }
    return loading
  }

  /** Sound may play now (a tap): load what the music plays from. */
  function start() {
    return prepare()
  }

  /** The morning (the first tap woke him): a morning take. random: the
   * morning's own stream. */
  async function startMorning(random) {
    await prepare()
    if (!night) playTake('morning', random, bus.ctx.currentTime + 0.15)
  }

  /** A phrase now, after something done (the game decides when: idle.js
   * phraseOk); true if one started. random: the game's stream for it. */
  function phrase(random) {
    if (!ready || night || takes.playing) return false
    return playTake('phrase', random, bus.ctx.currentTime + PHRASE_LEAD_S)
  }

  function level() {
    if (out) out.gain.setTargetAtTime(VOLUME * (1 - dusk * 0.07) * (raining ? 0.6 : 1), bus.ctx.currentTime, 1.5)
  }

  /** How far the sun is down (0 midday … 6 set, in between too): softer the further. */
  function setDusk(n) {
    dusk = n
    level()
  }

  /** While it rains the music steps back. */
  function setRain(on) {
    raining = on
    level()
  }

  /** In-key touches for what happens in the yard, only while no take plays. */
  const quiet = () => ready && !takes.playing && !night
  const react = {
    /** A new thing done: a xylophone run up the chord, a glockenspiel on top. */
    done() {
      if (!quiet()) return
      const t = bus.ctx.currentTime + 0.02
      const [a, b, c] = CHORD
      ;[a + 12, b + 12, c + 12, a + 24].forEach((n, k) => play('xylo', n, t + (k * EIGHTH_S) / 2, 0.55))
      play('glock', c + 12, t + 2 * EIGHTH_S, 0.4)
    },
    /** A thought bubble: two glockenspiel notes. */
    wish() {
      if (!quiet()) return
      const t = bus.ctx.currentTime + 0.02
      play('glock', CHORD[1] + 12, t, 0.35)
      play('glock', CHORD[2] + 12, t + EIGHTH_S, 0.35)
    },
    /** The bird takes off: a flute trill that climbs away. */
    bird() {
      if (!quiet()) return
      const t = bus.ctx.currentTime + 0.02
      const [a, , c] = CHORD
      for (let k = 0; k < 6; k++) play('flute', (k % 2 ? c : a) + 12 + Math.floor(k / 2) * 2, t + (k * EIGHTH_S) / 2, 0.4)
    },
    /** One more stretch step: the bassoon climbs (the marked melody's rising bass). */
    stretchStep(n) {
      if (!quiet()) return
      const climb = [44, 47, 49, 52, 53, 56, 58, 61] // G#2 B2 C#3 E3, then on up
      play('bassoon', climb[Math.min(n, climb.length - 1)], bus.ctx.currentTime, 0.55)
    },
    /** Snap back: flexatone, then the marked melody's falling line, in B-flat. */
    snap() {
      if (!quiet()) return
      const t = bus.ctx.currentTime
      play('flexatone', null, t, 0.7, { index: 1 })
      ;[82, 80, 79, 77, 75].forEach((n, k) => play('pizz', n - 12, t + 0.12 + k * 0.07, 0.5))
    },
    /** A stamp lands: a soft timpani under it. */
    stamp() {
      if (quiet()) play('timpani', null, bus.ctx.currentTime, 0.5)
    },
    /** A hop: a pizzicato note up the chord. */
    hop() {
      if (quiet()) play('pizz', CHORD[2], bus.ctx.currentTime + 0.1, 0.35)
    },
    /** A sneeze: the slapstick. */
    sneeze() {
      if (quiet()) play('slapstick', null, bus.ctx.currentTime, 0.6)
    },
    /** Snoring: descending glockenspiel notes, one per breath. */
    snore(n) {
      if (quiet()) play('glock', 79 - n * 3, bus.ctx.currentTime + 0.8, 0.22)
    },
  }

  /** Evening: a phrase still playing fades out, and a lullaby take plays;
   * once a play. random: the evening's own stream. */
  function evening(random) {
    if (!ready || night) return
    const after = takes.playing ? takes.FADE_S + 0.3 : 0.1 // straight away, or once the phrase has faded
    takes.fade()
    playTake('lullaby', random, bus.ctx.currentTime + after)
    night = true
    stopBed() // the lullaby is the last music of the day
  }

  let auditionRandom = null // its own stream, made when first needed, so a play's draws stay put

  /** One part on its own, for listening to it next to other takes:
   * 'morning', 'phrase' or 'lullaby' (a random take of it), 'stretch' (the
   * climb while held, then the snap back). */
  async function audition(part) {
    await prepare()
    auditionRandom ??= Debug.random('music-audition')
    takes.fade()
    if (PARTS.includes(part)) {
      playTake(part, auditionRandom, bus.ctx.currentTime + 0.1)
    } else if (part === 'stretch') {
      for (let n = 0; n < 6; n++) setTimeout(() => react.stretchStep(n), n * 300)
      setTimeout(() => react.snap(), 6 * 300 + 200)
    }
  }

  /** The bed (bed.js), which a game turns on: start() once sound may play;
   * set({ mood, energy }) as the day goes and the child plays or stops. */
  const bedApi = {
    async start() {
      if (bed.on || night) return
      bed.on = true // at once, so taps while it loads don't start it twice
      try {
        await prepare()
      } catch (e) {
        bed.on = false // the samples wouldn't load: no bed, and the next tap may try again
        Debug.trace('music bed', { failed: String(e?.message ?? e) })
        return
      }
      bed.random ??= Debug.random('music-bed')
      bed.gain = bedBus()
      if (takes.playing) bedAway(bus.ctx.currentTime)
      bed.timer = Clock.every(200, bedBars)
    },
    set({ mood = bed.mood, energy = bed.energy }) {
      bed.mood = mood
      bed.energy = energy
    },
    get on() { return bed.on },
    get style() { return bed.style },
    get mood() { return bed.mood },
  }

  return {
    bed: bedApi,
    start, startMorning, phrase, audition, setDusk, setRain, react, evening,
    get ready() { return ready },
    get playing() { return !!takes?.playing },
    get buffers() { return buffers },
  }
})()
