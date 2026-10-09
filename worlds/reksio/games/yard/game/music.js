// The yard's music: a light pizzicato "oom-pah" in B-flat, in the spirit of
// the Reksio theme (its key, its bouncing bass and a hook echoing the main
// melody Adam marked), that follows the game. Three tunes take turns over it:
// the hook, a skipping flute tune, and a tiptoeing one in G minor.
//
// - Energy (0-3) sets how full it is: just the bass when nobody has tapped for
//   a while, the full oom-pah, then the tune on top, then woodblock ticks.
// - Actions play along, in key and on the beat: a xylophone flourish when a
//   new thing is done, glockenspiel for a thought bubble, a flute trill for
//   the bird, a rising bassoon as Reksio stretches and a falling run (the
//   shape of the marked stretching melody) as he snaps back.
// - Each sunset step slows it a little and makes it softer; at evening it
//   gives way to a harp lullaby.
//
// Real instrument samples (CC0) come from samples.js, played note by note.

/* global Sound, SAMPLES */
/* exported Music */
const Music = (() => {
  const BPM = 136 // a touch calmer than the theme's measured pulse (about 143)
  const LOOKAHEAD_S = 0.12 // schedule notes this far ahead
  const VOLUME = 0.42 // music under the sound effects
  const STEPS = 32 // eighth notes in the loop: 8 bars of 2/4
  const PHRASE = 16 // eighth notes in a phrase of the tune: the tune comes and goes only between phrases

  // Pitches (MIDI numbers).
  const Bb1 = 34
  const F2 = 41
  const CHORDS = {
    Bb: { bass: [Bb1, F2], pah: [62, 65, 70] }, // D4 F4 Bb4
    Eb: { bass: [39, 46], pah: [63, 67, 70] }, // Eb4 G4 Bb4
    F7: { bass: [F2, 36], pah: [63, 69, 72] }, // Eb4 A4 C5
    Gm: { bass: [31, 38], pah: [62, 67, 70] }, // D4 G4 Bb4
    Cm: { bass: [36, 43], pah: [63, 67, 72] }, // Eb4 G4 C5
  }

  // The hook, from the Basic Pitch sketch of the marked main melody
  // (B-flat, B-flat, B-flat C B-flat C, D F, F), one entry per eighth note,
  // null = rest. Its second half answers it.
  const HOOK = [70, null, 70, null, 70, 72, 70, 72, 74, null, 77, null, 77, null, null, null]
  const ANSWER = [65, null, 67, null, 69, null, 70, null, 72, null, 70, null, 65, null, null, null]

  // Three tunes over the same oom-pah, one chord per bar. A is the hook; B and
  // C are new, in the same bouncy, cheeky spirit, so the music doesn't wear
  // thin. voice(i, pass) picks the instrument (and octave shift) for eighth
  // note i, alternating between passes.
  const THEMES = {
    A: {
      bars: ['Bb', 'Bb', 'Bb', 'F7', 'F7', 'F7', 'Bb', 'Bb'],
      tune: [...HOOK, ...ANSWER],
      voice: (i, pass) => ((i < 16) !== (pass % 2 === 1) ? ['clarinet', 0] : ['bassoon', i < 16 ? -12 : 0]),
    },
    // B: a skipping flute tune that leans on a cheeky chromatic neighbour
    // (G, F-sharp, G), stepping down a chord each time; xylophone on repeat.
    B: {
      bars: ['Eb', 'Eb', 'Bb', 'Bb', 'F7', 'F7', 'Bb', 'Bb'],
      tune: [
        79, null, 75, null, 79, 78, 79, null,
        77, null, 74, null, 77, 76, 77, null,
        75, null, 72, null, 75, 74, 72, 69,
        70, null, 74, null, 70, null, null, null,
      ],
      voice: (i, pass) => [pass % 2 ? 'xylo' : 'flute', 0],
    },
    // C: tiptoeing in G minor on the bassoon, the clarinet climbing out of it
    // back home to B-flat, then a bar's rest before the hook returns.
    C: {
      bars: ['Gm', 'Gm', 'Cm', 'Cm', 'F7', 'F7', 'Bb', 'Bb'],
      tune: [
        67, null, 70, 67, 74, null, 67, null,
        72, null, 75, 72, 79, null, 72, null,
        65, 69, 72, 75, 77, null, 75, null,
        74, 72, 70, null, null, null, null, null,
      ],
      voice: (i, pass) => ((i < 16) !== (pass % 2 === 1) ? ['bassoon', -12] : ['clarinet', 0]),
    },
  }
  // the order they come round in: the hook most, the others between
  const FORM = ['A', 'A', 'B', 'B', 'A', 'A', 'C', 'C']
  const theme = () => THEMES[FORM[loopCount % FORM.length]]

  let bus = null
  let out = null
  const buffers = {} // instrument -> [{midi, buffer}]
  let ready = false
  let running = false
  let step = 0
  let nextTime = 0
  let loopCount = 0
  let energy = 1
  let tuneOn = false // the tune is playing this phrase
  let dusk = 0
  let timer = null

  // ------------------------------------------------------------ samples

  async function load() {
    const { ctx } = bus
    const jobs = []
    for (const [inst, notes] of Object.entries(SAMPLES)) {
      buffers[inst] = []
      for (const note of notes) {
        const bytes = Uint8Array.from(atob(note.data), (c) => c.charCodeAt(0))
        jobs.push(
          ctx.decodeAudioData(bytes.buffer).then((buffer) => buffers[inst].push({ midi: note.midi, buffer })),
        )
      }
    }
    await Promise.all(jobs)
    for (const list of Object.values(buffers)) list.sort((a, b) => (a.midi ?? 0) - (b.midi ?? 0))
    ready = true
  }

  /** Play one note (or one-shot sound) at time t. Pitched instruments use the
   * nearest sample, re-tuned by playback rate. */
  function play(inst, midi, t, vol = 0.8, { index = 0, dest = out } = {}) {
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
    src.connect(g).connect(dest)
    src.start(Math.max(t, bus.ctx.currentTime))
  }

  // ------------------------------------------------------------ the groove

  function eighth() {
    return 60 / (BPM * (1 - dusk * 0.035)) / 2
  }

  function scheduleStep(i, t) {
    const bar = Math.floor(i / 4)
    const beat = i % 4 // 0: oom, 2: pah, 1/3: the "ands"
    const th = theme()
    const chord = CHORDS[th.bars[bar]]
    const e = Math.min(energy, dusk >= 4 || raining ? 1 : 3)

    if (beat === 0 && (e >= 1 || bar % 2 === 0)) {
      play('bass', chord.bass[bar % 2], t, e === 0 ? 0.45 : 0.75)
    }
    if (beat === 2 && e >= 1) {
      chord.pah.forEach((n, k) => play('pizz', n, t + k * 0.008, 0.32))
    }
    if (beat === 3 && e >= 2 && bar % 2 === 1) play('pizz', chord.pah[2], t, 0.22)
    // The tune comes in (or drops out) only at the start of a phrase, so it is
    // never heard from half-way; and the first time round it plays whatever
    // the energy, so the theme is heard from its beginning.
    if (i % PHRASE === 0) tuneOn = e >= 2 || loopCount === 0
    if (tuneOn) {
      // the tune; each theme comes round twice, voiced differently the second time
      const note = th.tune[i]
      if (note != null) {
        const [inst, shift] = th.voice(i, loopCount % 2)
        play(inst, note + shift, t, 0.5)
      }
    }
    if (e >= 3 && (beat === 1 || beat === 3)) play('woodblock', null, t, 0.22)
  }

  function tick() {
    if (!running) return
    while (nextTime < bus.ctx.currentTime + LOOKAHEAD_S) {
      scheduleStep(step, nextTime)
      nextTime += eighth()
      step = (step + 1) % STEPS
      if (step === 0) loopCount += 1
    }
  }

  /** When the next eighth note falls: reactions land on the beat. */
  function nextBeat() {
    return running ? nextTime : bus.ctx.currentTime + 0.02
  }

  /** The chord sounding now, so reactions stay in key. */
  function chordNow() {
    return CHORDS[theme().bars[Math.floor(step / 4)]]
  }

  // ------------------------------------------------------------ public

  /** Load the samples (once); needs a tap first, like all sound. */
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

  /** Start on the first tap (browsers need a gesture before sound). */
  async function start() {
    if (loading) return
    await prepare()
    running = true
    nextTime = bus.ctx.currentTime + 0.1
    timer = setInterval(tick, 25)
  }

  // The morning tune, as Reksio wakes and the sun comes up: the hook's notes
  // slowed and opened out, rising; one of a few shapes, on flute or harp, at
  // its own pace each play, over slow harp chords. New, not the cartoon's.
  const DAWN_TUNES = [
    [58, 62, 65, 70, null, 69, 70, 74, 72, null, 70],
    [65, 70, 72, 74, null, 77, 74, 72, 70],
    [62, 65, 70, null, 72, 70, 74, null, 77, 82],
  ]
  const DAWN_CHORDS = [[46, 58, 62, 65], [51, 55, 58, 63], [53, 57, 60, 65], [46, 58, 62, 70]] // B-flat, E-flat, F, B-flat

  /** Play the morning tune from t0; returns when it ends. */
  function dawnTune(t0, random) {
    const tune = DAWN_TUNES[Math.floor(random() * DAWN_TUNES.length)]
    const inst = random() < 0.5 ? 'flute' : 'harp'
    const beat = 0.42 + random() * 0.14
    const span = tune.length * beat
    DAWN_CHORDS.forEach((ch, i) => ch.forEach((n, k) => play('harp', n, t0 + (i * span) / DAWN_CHORDS.length + k * 0.12, 0.3)))
    tune.forEach((n, k) => n != null && play(inst, n, t0 + k * beat + (random() - 0.5) * 0.04, 0.4))
    play('glock', 82, t0 + span, 0.25)
    return t0 + span + beat * 2
  }

  /** The morning (the first tap woke him): the morning tune, then the
   * groove. random: the morning's own stream. */
  async function startMorning(random) {
    if (loading) return
    await prepare()
    running = true
    nextTime = dawnTune(bus.ctx.currentTime + 0.15, random)
    timer = setInterval(tick, 25)
  }

  /** 0: just the bass · 1: oom-pah · 2: the tune · 3: woodblock too. */
  function setEnergy(level) {
    energy = Math.max(0, Math.min(3, level))
  }

  /** Sunset step (0-6): a little slower and softer each step. */
  function setDusk(level) {
    dusk = level
    if (out) out.gain.setTargetAtTime(VOLUME * (1 - level * 0.07) * (raining ? 0.6 : 1), bus.ctx.currentTime, 1.5)
  }

  /** While it rains the music steps back: just the bass and soft pizzicato. */
  let raining = false
  function setRain(on) {
    raining = on
    if (out) out.gain.setTargetAtTime(VOLUME * (1 - dusk * 0.07) * (on ? 0.6 : 1), bus.ctx.currentTime, 1.5)
  }

  /** In-key reactions to what happens in the yard. */
  const react = {
    /** A new thing done: a xylophone run up the chord, a glockenspiel on top. */
    done() {
      if (!ready) return
      const t = nextBeat()
      const [a, b, c] = chordNow().pah
      ;[a + 12, b + 12, c + 12, a + 24].forEach((n, k) => play('xylo', n, t + k * eighth() / 2, 0.55))
      play('glock', c + 12, t + 2 * eighth(), 0.4)
    },
    /** A thought bubble: two glockenspiel notes. */
    wish() {
      if (!ready) return
      const t = nextBeat()
      const [, b, c] = chordNow().pah
      play('glock', b + 12, t, 0.35)
      play('glock', c + 12, t + eighth(), 0.35)
    },
    /** The bird takes off: a flute trill that climbs away. */
    bird() {
      if (!ready) return
      const t = nextBeat()
      const [a, , c] = chordNow().pah
      for (let k = 0; k < 6; k++) play('flute', (k % 2 ? c : a) + 12 + Math.floor(k / 2) * 2, t + k * eighth() / 2, 0.4)
    },
    /** One more stretch step: the bassoon climbs (the marked melody's rising bass). */
    stretchStep(n) {
      if (!ready) return
      const climb = [44, 47, 49, 52, 53, 56, 58, 61] // G#2 B2 C#3 E3, then on up
      play('bassoon', climb[Math.min(n, climb.length - 1)], bus.ctx.currentTime, 0.55)
    },
    /** Snap back: flexatone, then the marked melody's falling line, in B-flat. */
    snap() {
      if (!ready) return
      const t = bus.ctx.currentTime
      play('flexatone', null, t, 0.7, { index: 1 })
      ;[82, 80, 79, 77, 75].forEach((n, k) => play('pizz', n - 12, t + 0.12 + k * 0.07, 0.5))
    },
    /** A stamp lands: a soft timpani under it. */
    stamp() {
      if (ready) play('timpani', null, bus.ctx.currentTime, 0.5)
    },
    /** A hop: a pizzicato note up the chord. */
    hop() {
      if (ready) play('pizz', chordNow().pah[2], bus.ctx.currentTime + 0.1, 0.35)
    },
    /** A sneeze: the slapstick. */
    sneeze() {
      if (ready) play('slapstick', null, bus.ctx.currentTime, 0.6)
    },
    /** Snoring: descending glockenspiel notes, one per breath. */
    snore(n) {
      if (ready) play('glock', 79 - n * 3, bus.ctx.currentTime + 0.8, 0.22)
    },
  }

  /** Evening: the groove stops at the end of its bar, and a harp lullaby plays. */
  function evening() {
    if (!ready) return
    running = false
    clearInterval(timer)
    const t0 = Math.max(nextTime, bus.ctx.currentTime) + 0.3
    const beat = 0.85
    // slow arpeggios over B-flat, G minor, E-flat, F, B-flat
    const chords = [[58, 62, 65], [55, 58, 62], [51, 55, 58], [53, 57, 60], [58, 62, 65]]
    chords.forEach((ch, i) => ch.forEach((n, k) => play('harp', n, t0 + i * beat * 2 + k * 0.18, 0.5)))
    // the hook, slowed right down, on top
    const melody = [70, 70, 70, 72, 70, 72, 74, 77]
    melody.forEach((n, k) => play('harp', n, t0 + 0.4 + k * beat, 0.42))
    play('glock', 82, t0 + 0.4 + melody.length * beat, 0.3)
    out.gain.setTargetAtTime(0.0001, t0 + 9, 1.2)
  }

  /** One part on its own, for listening to it next to the original:
   * 'hook' (the clarinet tune), 'A', 'B' or 'C' (one turn of the groove
   * with that theme), 'stretch' (the climb while held, then the snap back).
   * bpm replaces the tempo for 'hook' and the themes. */
  async function audition(part, bpm = BPM) {
    await prepare()
    const t0 = bus.ctx.currentTime + 0.1
    const e = 60 / bpm / 2
    if (part === 'hook') {
      HOOK.forEach((n, k) => n != null && play('clarinet', n, t0 + k * e, 0.6))
    } else if (THEMES[part]) {
      const saved = [energy, loopCount]
      energy = 2
      loopCount = FORM.indexOf(part)
      for (let i = 0; i < STEPS; i++) scheduleStep(i, t0 + i * e)
      ;[energy, loopCount] = saved
    } else if (part === 'stretch') {
      for (let n = 0; n < 6; n++) setTimeout(() => react.stretchStep(n), n * 300)
      setTimeout(() => react.snap(), 6 * 300 + 200)
    }
  }

  return { start, startMorning, audition, setEnergy, setDusk, setRain, react, evening, get ready() { return ready }, get buffers() { return buffers } }
})()
