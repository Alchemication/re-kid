// The yard's music: recorded takes picked by ear (tunes.js), one part at a
// time with quiet in between, and small touches on instrument samples
// (samples.js) for what Reksio does.
//
// - The morning: a morning take as he wakes.
// - Through the day, a phrase now and then: the game asks for one (phrase())
//   when something new is done; when is the game's rule (idle.js phraseOk),
//   so a child left alone gets the yard's own sounds, not a loop.
// - At evening (supper), a lullaby take; a phrase still playing fades out first.
// - Rain and the sun going down make it quieter.
// - Actions play along on samples: a xylophone flourish when a new thing is
//   done, glockenspiel for a thought bubble, a flute trill for the bird, a
//   rising bassoon as Reksio stretches and a falling run (the shape of the
//   marked stretching melody) as he snaps back. They are in B-flat and each
//   take is in its own key, so they play only while no take does.

// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* global Sound, SAMPLES, TUNES, Debug */
/* exported Music */
const Music = (() => {
  const VOLUME = 0.42 // music under the sound effects
  const TAKE_VOLUME = 0.8 // the takes against the samples' touches (both levelled when packed)
  const PHRASE_LEAD_S = 0.8 // a phrase starts after the new thing's flourish, not over it
  const FADE_S = 0.5 // a take cut short (evening) fades over about this long
  const EIGHTH_S = 60 / 136 / 2 // the touches' pace: eighth notes at 136 BPM
  const CHORD = [62, 65, 70] // D4 F4 B-flat4: the touches stay in B-flat

  let bus = null
  let out = null
  const buffers = {} // instrument -> [{midi, buffer}]
  const takes = { morning: [], phrase: [], lullaby: [] } // part -> decoded takes
  const last = {} // part -> the take played last time, so it doesn't come twice running
  let current = null // the take playing now: {src, gain}
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
    if (typeof TUNES !== 'undefined') {
      for (const [part, list] of Object.entries(TUNES)) {
        for (const b64 of list) jobs.push(ctx.decodeAudioData(bytes(b64)).then((buffer) => takes[part]?.push(buffer), () => {})) // a take that won't decode is left out: the part plays from the others
      }
    }
    await Promise.all(jobs)
    for (const list of Object.values(buffers)) list.sort((a, b) => (a.midi ?? 0) - (b.midi ?? 0))
    ready = true
  }

  /** Play one note (or one-shot sound) at time t. Pitched instruments use the
   * nearest sample, re-tuned by playback rate. */
  function play(inst, midi, t, vol = 0.8, { index = 0 } = {}) {
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
    src.connect(g).connect(out)
    src.start(Math.max(t, bus.ctx.currentTime))
  }

  // ------------------------------------------------------------ takes

  /** Play a random take of `part` (never the one before, if it has others)
   * from time t; false if it has none ready. random: the caller's stream. */
  function playTake(part, random, t) {
    const list = takes[part]
    if (!ready || !list.length) return false
    const others = list.map((_, i) => i).filter((i) => i !== last[part] || list.length === 1)
    const i = others[Math.floor(random() * others.length)]
    last[part] = i
    const src = bus.ctx.createBufferSource()
    src.buffer = list[i]
    const gain = bus.ctx.createGain()
    gain.gain.value = TAKE_VOLUME
    src.connect(gain).connect(out)
    const take = { src, gain }
    src.onended = () => { if (current === take) current = null }
    current = take
    src.start(Math.max(t, bus.ctx.currentTime))
    return true
  }

  /** Fade out the take playing now, if any. */
  function fadeTake() {
    if (!current) return
    const now = bus.ctx.currentTime
    current.gain.gain.setTargetAtTime(0.0001, now, FADE_S / 3)
    current.src.stop(now + FADE_S * 2)
    current = null
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

  /** A phrase now, after something new (the game decides when: idle.js
   * phraseOk); true if one started. random: the game's stream for it. */
  function phrase(random) {
    if (!ready || night || current) return false
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
  const quiet = () => ready && !current && !night
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
    const after = current ? FADE_S + 0.3 : 0.1 // straight away, or once the phrase has faded
    fadeTake()
    playTake('lullaby', random, bus.ctx.currentTime + after)
    night = true
  }

  let auditionRandom = null // its own stream, made when first needed, so a play's draws stay put

  /** One part on its own, for listening to it next to other takes:
   * 'morning', 'phrase' or 'lullaby' (a random take of it), 'stretch' (the
   * climb while held, then the snap back). */
  async function audition(part) {
    await prepare()
    auditionRandom ??= Debug.random('music-audition')
    fadeTake()
    if (takes[part]) {
      playTake(part, auditionRandom, bus.ctx.currentTime + 0.1)
    } else if (part === 'stretch') {
      for (let n = 0; n < 6; n++) setTimeout(() => react.stretchStep(n), n * 300)
      setTimeout(() => react.snap(), 6 * 300 + 200)
    }
  }

  return {
    start, startMorning, phrase, audition, setDusk, setRain, react, evening,
    get ready() { return ready },
    get playing() { return !!current },
    get buffers() { return buffers },
  }
})()
