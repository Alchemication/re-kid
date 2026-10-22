// The music bed: quiet music under the scene, there all the time but never
// in the way, so the yard is never dead silent and the recorded takes are
// the moments it swells into (Adam, 2026-10-21: too much silence, and short
// clips repeating; the old note-by-note oom-pah was alive but wore on him,
// so these have no tunes to hum: a few notes a bar, in B-flat with the
// touches).
//
// Each moment of the day has its own bed, picked by Adam on the bed board
// (experiments/music/bed.html, where they were first heard): a music box
// for the morning and while the child watches, a tiptoe walk while the
// child plays, xylophone patter for a lazy afternoon, the flute and
// bassoon chatting at evening, drips for rain, almost nothing for a nap.
// Played a little loose, as real players would (he found them a bit too
// crisp; music.js also puts them through the retro recipe).
//
// Pure: style() says which bed for a moment, bar() what it plays in bar n;
// music.js plays it on the audio clock. Nothing here sounds or waits.

// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* exported Bed */
const Bed = (() => {
  const TONIC = 58 // B-flat3: the key the touches are in (music.js CHORD)
  const SCALE = [0, 2, 4, 5, 7, 9, 11] // major
  const BEATS = 4 // to a bar
  const LOOSE_S = 0.025 // a note lands up to this far off the beat, either way…
  const LOOSE_VOL = 0.15 // …and this much louder or softer: played, not programmed
  const BUSY = [0.35, 0.55] // the child playing from this busy up, back to watching from this down (no flipping to and fro)
  const STIR = 0.25 // each tap or key makes it this much livelier…
  const CALM_S = 20 // …and left alone it calms down over about this long
  const HOURS = { morning: 10, afternoon: 15, dusk: 18 } // a day from 8 to 20: morning until 10, afternoon from 15, dusk from 18 (when he gets sleepy)

  // each moment: its chords (scale degrees, a bar each), how far up it sits
  // (whole octaves only, or it leaves the key), and how many notes a bar,
  // left alone to busy
  const MOODS = {
    morning: { chords: [0, 3, 0, 4], lift: 12, dens: [2, 5] },
    day: { chords: [0, 5, 3, 4], lift: 0, dens: [2, 5] },
    afternoon: { chords: [0, 2, 3, 0], lift: 0, dens: [1, 4] },
    dusk: { chords: [5, 3, 0, 4], lift: 0, dens: [1, 3] },
    rain: { chords: [0, 3], lift: 12, dens: [1, 3] },
    rest: { chords: [0, 3], lift: 0, dens: [0, 1] },
  }

  const degree = (steps) => TONIC + 12 * Math.floor(steps / 7) + SCALE[((steps % 7) + 7) % 7]
  const triad = (d) => [degree(d), degree(d + 2), degree(d + 4)]
  const density = (m, e) => Math.round(m.dens[0] + (m.dens[1] - m.dens[0]) * e)
  const pickOf = (list, random) => list[Math.floor(random() * list.length)]
  /** n different eighths of the bar, never the first (the bass's). */
  function slots(n, random) {
    const out = new Set()
    for (let i = 0; i < n * 3 && out.size < n; i++) out.add(1 + Math.floor(random() * (BEATS * 2 - 1)))
    return [...out]
  }

  // The beds, as heard on the board. Each: its pace, and its bar from the
  // moment (m), how busy (e, 0 to 1), the bar's number and the stream.
  // A note: { inst, midi, at (beats into the bar), vol }.
  const STYLES = {
    // plucked strings and a little bell, like a music box
    musicbox: {
      bpm: 72,
      bar(m, e, n, random) {
        const c = triad(m.chords[n % m.chords.length])
        const out = [{ inst: 'pizz', midi: c[0] - 12, at: 0, vol: 0.32 }]
        for (const s of slots(density(m, e), random)) {
          const glock = random() < 0.25
          out.push({ inst: glock ? 'glock' : 'pizz', midi: pickOf(c, random) + m.lift + (glock ? 12 : 0), at: s / 2, vol: glock ? 0.16 : 0.24 })
        }
        return out
      },
    },
    // a plucked bass walking on every beat: the cartoon "sneaking about"
    tiptoe: {
      bpm: 96,
      bar(m, e, n, random) {
        const c = triad(m.chords[n % m.chords.length])
        const out = []
        ;[c[0], c[1], c[2], c[1]].forEach((midi, k) => {
          if (k === 0 || k === 2 || e > 0.25) out.push({ inst: 'pizz', midi: midi - 12, at: k, vol: 0.26 })
        })
        for (const s of slots(Math.max(0, density(m, e) - 1), random)) out.push({ inst: random() < 0.5 ? 'xylo' : 'pizz', midi: pickOf(c, random) + 12 + m.lift, at: s / 2, vol: 0.14 })
        return out
      },
    },
    // soft xylophone notes rolling up and down
    patter: {
      bpm: 84,
      bar(m, e, n, random) {
        const c = triad(m.chords[n % m.chords.length])
        const out = n % 2 === 0 ? [{ inst: 'pizz', midi: c[0] - 12, at: 0, vol: 0.3 }] : []
        const run = [c[0], c[1], c[2], c[0] + 12, c[2], c[1]]
        const len = Math.max(1, Math.round(1 + 5 * e * (m.dens[1] / 5)))
        const from = Math.floor(random() * 3)
        for (let k = 0; k < len; k++) out.push({ inst: 'xylo', midi: run[(from + k) % run.length] + 12 + m.lift, at: 1 + k * 0.5, vol: 0.12 })
        return out
      },
    },
    // a low bassoon asks, a high flute answers
    chat: {
      bpm: 76,
      bar(m, e, n, random) {
        const c = triad(m.chords[n % m.chords.length])
        const out = [{ inst: 'pizz', midi: c[0] - 12, at: 0, vol: 0.26 }]
        if (n % 2 === 0) [c[0], c[1], c[2]].forEach((midi, k) => out.push({ inst: 'bassoon', midi: midi - 12, at: 1 + k * 0.5, vol: 0.2 }))
        else if (random() < 0.5 + 0.5 * e) [c[2], c[1], c[0]].forEach((midi, k) => out.push({ inst: 'flute', midi: midi + 12 + m.lift, at: 1 + k * 0.5, vol: 0.16 }))
        return out
      },
    },
    // high notes at odd moments, like drops off a roof
    drips: {
      bpm: 80,
      bar(m, e, n, random) {
        const c = triad(m.chords[n % m.chords.length])
        const out = n % 2 === 0 ? [{ inst: 'pizz', midi: c[0] - 12, at: 0, vol: 0.24 }] : []
        const k = 2 + Math.round(4 * e)
        for (let j = 0; j < k; j++) out.push({ inst: random() < 0.5 ? 'glock' : 'pizz', midi: pickOf(c, random) + 24, at: 0.25 + random() * 3.6, vol: 0.12 })
        return out
      },
    },
    // a low note now and then, a rare bell
    hush: {
      bpm: 60,
      bar(m, e, n, random) {
        const c = triad(m.chords[n % m.chords.length])
        const out = n % 2 === 0 ? [{ inst: 'pizz', midi: c[0] - 12, at: 0, vol: 0.28 }] : []
        if (n % 3 === 1 || random() < 0.3 * e) out.push({ inst: 'glock', midi: pickOf(c, random) + 12 + m.lift, at: 2, vol: 0.14 })
        return out
      },
    },
  }

  /**
   * Which moment it is: rain over everything, then rest (lying down or
   * asleep), then the hour of the day (hours: a game's own, if its day differs).
   * @param {{hour: number, raining: boolean, resting: boolean, dusk: boolean}} s
   */
  function moodAt({ hour, raining, resting, dusk }, hours = HOURS) {
    if (raining) return 'rain'
    if (resting) return 'rest'
    if (dusk || hour >= hours.dusk) return 'dusk'
    if (hour < hours.morning) return 'morning'
    if (hour >= hours.afternoon) return 'afternoon'
    return 'day'
  }

  /** How busy the child is: a tap or a key makes it livelier… */
  const livelier = (busy) => Math.min(1, busy + STIR)
  /** …and it calms down as time passes with none (dt in seconds). */
  const calmer = (busy, dt) => busy * Math.exp(-dt / CALM_S)

  /**
   * Which bed for a moment: the mood, how busy the child is, and whether the
   * child was playing a moment ago (so it doesn't flip to and fro).
   * @returns {{style: string, playing: boolean}}
   */
  function style(mood, energy, wasPlaying = false) {
    const playing = mood === 'day' && energy >= (wasPlaying ? BUSY[0] : BUSY[1])
    const byMood = { morning: 'musicbox', afternoon: 'patter', dusk: 'chat', rain: 'drips', rest: 'hush' }
    return { style: playing ? 'tiptoe' : byMood[mood] ?? 'musicbox', playing }
  }

  /**
   * What bar n plays: [{ inst, midi, at (seconds into the bar), vol }], and
   * how long the bar is (seconds).
   * @param {string} styleName a bed (style())
   * @param {string} mood one of MOODS
   * @param {number} energy 0 (left alone) to 1 (busy)
   * @param {number} n which bar (its chord comes round)
   * @param {() => number} random the bed's own stream
   */
  function bar(styleName, mood, energy, n, random) {
    const s = STYLES[styleName] ?? STYLES.musicbox
    const beat = 60 / s.bpm
    const notes = s.bar(MOODS[mood] ?? MOODS.day, Math.max(0, Math.min(1, energy)), n, random).map((note) => ({
      inst: note.inst,
      midi: note.midi,
      at: Math.max(0, note.at * beat + (random() * 2 - 1) * LOOSE_S),
      vol: note.vol * (1 + (random() * 2 - 1) * LOOSE_VOL),
    }))
    return { notes, seconds: BEATS * beat }
  }

  return { MOODS, STYLES, TONIC, SCALE, CALM_S, degree, moodAt, livelier, calmer, style, bar }
})()
