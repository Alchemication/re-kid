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
// - The bed (the game turns it on: bed.start(score)): quiet music under all
//   of it, so the yard is never silent; the game's score (beds.js) says what
//   it plays, the game says the moment and how busy the child is (bed.set).
//   Ensemble (ensemble.js) plays it through the retro recipe, steps back
//   under a take and comes back after, and it stops at the lullaby.

// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* global Sound, SAMPLES, TUNES, Debug, Ensemble, Takes */
/* exported Music */
const Music = (() => {
  const VOLUME = 0.42 // music under the sound effects
  const TAKE_VOLUME = 0.8 // the takes against the samples' touches (both levelled when packed)
  const PHRASE_LEAD_S = 0.8 // a phrase starts after the new thing's flourish, not over it
  const PARTS = ['morning', 'phrase', 'lullaby'] // the parts it plays (tunes.yaml)
  const EIGHTH_S = 60 / 136 / 2 // the touches' pace: eighth notes at 136 BPM
  const CHORD = [62, 65, 70] // D4 F4 B-flat4: the touches stay in B-flat

  let bus = null
  let out = null
  let band = null // the samples and the bed (ensemble.js)
  let bed = null // the bed, once the game starts it with its score
  let takes = null // the recorded takes' player (takes.js)
  let ready = false
  let night = false // after the lullaby starts, nothing else plays
  let dusk = 0
  let raining = false

  // ------------------------------------------------------------ loading

  async function load() {
    const jobs = [band.loaded]
    if (typeof TUNES !== 'undefined') jobs.push(takes.load(TUNES))
    await Promise.all(jobs)
    ready = true
  }

  const play = (...args) => band.play(...args)

  // ------------------------------------------------------------ takes

  /** A random take of `part` (never the one before, if it has others) from
   * time t; false if it has none ready. random: the caller's stream. The bed
   * steps back while it plays (takes.js onStart, onEnd). */
  function playTake(part, random, t) {
    return ready && takes.play(part, random, t)
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
      band = Ensemble.make(bus.ctx, out, typeof SAMPLES !== 'undefined' ? SAMPLES : {})
      takes = Takes.player(bus.ctx, out, { volume: TAKE_VOLUME, onStart: (t) => bed?.away(t), onEnd: () => { if (!night) bed?.back() } })
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
    bed?.stop() // the lullaby is the last music of the day
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

  /** The bed, which a game turns on: start(score) once sound may play (its
   * score: shared/bed.js rules, the game's beds); set({ mood, energy }) as
   * the day goes and the child plays or stops. */
  const bedApi = {
    async start(score) {
      if (bed?.on || night) return
      await prepare()
      bed ??= band.bed(score, { quiet: () => takes.playing })
      if (!night) await bed.start()
    },
    set(change) { bed?.set(change) },
    get on() { return !!bed?.on },
    get style() { return bed?.style },
    get mood() { return bed?.mood },
  }

  return {
    bed: bedApi,
    start, startMorning, phrase, audition, setDusk, setRain, react, evening,
    get ready() { return ready },
    get playing() { return !!takes?.playing },
    get buffers() { return band?.buffers ?? {} },
  }
})()
