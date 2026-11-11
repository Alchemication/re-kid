// The yard's music bed: quiet music under the yard (Adam, 2026-10-21: too
// much silence, and short clips repeating; the old note-by-note oom-pah was
// alive but wore on him, so these have no tunes to hum: a few notes a bar, in
// B-flat with the touches). shared/bed.js has the rules, ensemble.js plays it.
//
// Each moment of the day has its own bed, picked by Adam on the bed board
// (experiments/music/bed.html, where they were first heard): a music box
// for the morning and while the child watches, a tiptoe walk while the
// child plays, xylophone patter for a lazy afternoon, the flute and
// bassoon chatting at evening, drips for rain, almost nothing for a nap.
// Played a little loose, as real players would (he found them a bit too
// crisp; music.js also puts them through the retro recipe).
//
// Winter has its own (Adam, 2026-10-28: "sound good… quiet in the
// background"): snowfall while the child watches, snow play while they
// play; evening, rain and a nap keep theirs. The game says the season
// (forSeason).

/* global Bed */
/* exported YardBeds */
const YardBeds = (() => {
  const TONIC = 58 // B-flat3: the key the touches are in (music.js CHORD)
  // older than the effects' recipe (Adam, 2026-10-28: "a bit too modern"; quiet in the background):
  // a narrower band, more saturation, a wider tape wobble, a faint hiss, and softer
  const SOUND = { volume: 0.7, highpass: 200, lowpass: 3800, saturation: 1, wow: { hz: 0.6, depth: 0.0035 }, hiss: 0.006 }
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

  // The beds, as heard on the board. Each: its pace, and its bar from the
  // moment (m), how busy (e, 0 to 1), the bar's number and the stream.
  // A note: { inst, midi, at (beats into the bar), vol }.
  const STYLES = {
    // plucked strings and a little bell, like a music box
    musicbox: {
      bpm: 72,
      bar(m, e, n, random, { triad, density, slots, pickOf }) {
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
      bar(m, e, n, random, { triad, density, slots, pickOf }) {
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
      bar(m, e, n, random, { triad, density, slots, pickOf }) {
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
      bar(m, e, n, random, { triad, density, slots, pickOf }) {
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
      bar(m, e, n, random, { triad, density, slots, pickOf }) {
        const c = triad(m.chords[n % m.chords.length])
        const out = n % 2 === 0 ? [{ inst: 'pizz', midi: c[0] - 12, at: 0, vol: 0.24 }] : []
        const k = 2 + Math.round(4 * e)
        for (let j = 0; j < k; j++) out.push({ inst: random() < 0.5 ? 'glock' : 'pizz', midi: pickOf(c, random) + 24, at: 0.25 + random() * 3.6, vol: 0.12 })
        return out
      },
    },
    // winter: high bell notes drifting down a chord at odd moments, over a soft plucked root, like snow coming down
    snowfall: {
      bpm: 66,
      bar(m, e, n, random, { triad }) {
        const c = triad(m.chords[n % m.chords.length])
        const out = n % 2 === 0 ? [{ inst: 'pizz', midi: c[0] - 12, at: 0, vol: 0.26 }] : []
        const down = [c[2] + 24, c[1] + 24, c[0] + 24, c[2] + 12]
        const k = 1 + Math.round((2 + 2 * e) * (m.dens[1] / 5))
        const from = 0.5 + random() * 1.2
        for (let j = 0; j < Math.min(k, down.length); j++) out.push({ inst: 'glock', midi: down[j], at: from + j * (0.6 + random() * 0.3), vol: 0.11 - j * 0.015 })
        return out
      },
    },
    // winter, while the child plays: a light plucked bounce on the beat, bells skittering on top now and then
    snowplay: {
      bpm: 92,
      bar(m, e, n, random, { triad }) {
        const c = triad(m.chords[n % m.chords.length])
        const out = []
        ;[c[0], c[2], c[1], c[2]].forEach((midi, k) => {
          if (k % 2 === 0 || e > 0.3) out.push({ inst: 'pizz', midi: midi - 12, at: k, vol: k === 0 ? 0.26 : 0.18 })
        })
        if (random() < 0.35 + 0.5 * e) {
          const at = 2 + Math.floor(random() * 3) / 2
          ;[c[0], c[1], c[2]].forEach((midi, k) => out.push({ inst: 'glock', midi: midi + 24 + m.lift, at: at + k * 0.25, vol: 0.1 }))
        }
        return out
      },
    },
    // a low note now and then, a rare bell
    hush: {
      bpm: 60,
      bar(m, e, n, random, { triad, density, slots, pickOf }) {
        const c = triad(m.chords[n % m.chords.length])
        const out = n % 2 === 0 ? [{ inst: 'pizz', midi: c[0] - 12, at: 0, vol: 0.28 }] : []
        if (n % 3 === 1 || random() < 0.3 * e) out.push({ inst: 'glock', midi: pickOf(c, random) + 12 + m.lift, at: 2, vol: 0.14 })
        return out
      },
    },
  }

  const BY_MOOD = { morning: 'musicbox', afternoon: 'patter', dusk: 'chat', rain: 'drips', rest: 'hush' }
  const WINTER = { morning: 'snowfall', afternoon: 'snowfall', dusk: 'chat', rain: 'drips', rest: 'hush' }
  let season = null

  const score = Bed.score({
    tonic: TONIC,
    moods: MOODS,
    styles: STYLES,
    hours: HOURS,
    sound: SOUND,
    // the child playing: the tiptoe walk; watching, or another moment: that moment's bed
    pick: (mood, playing) => (season === 'winter' ? (playing ? 'snowplay' : WINTER[mood] ?? 'snowfall') : playing ? 'tiptoe' : BY_MOOD[mood] ?? 'musicbox'),
  })
  /** This play's season: winter has its own beds. */
  score.forSeason = (name) => (season = name)
  return score
})()
