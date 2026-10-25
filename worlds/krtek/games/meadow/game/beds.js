// The meadow's music bed (shared/bed.js rules, ensemble.js plays it): quiet
// music under the meadow between the recorded takes, so it is never silent,
// as the films play all through (worlds/krtek/MUSIC_DIRECTION.md: calm, close
// to nature, a flute over strings, birdsong). In E major at 103 beats a
// minute, the kept takes' key and pulse, so a take swells out of it without
// a jump.
//
// A bed for each moment of the day: in the morning a harp and birdsong; while
// the child watches, the harp with a little flute turn now and then; while the
// child plays, the harp strolling on every beat; in the afternoon, soft held
// violins under a slower harp. From dusk the cricket's fiddle takes over
// (music.js), and the bed stops.

/* global Bed */
/* exported MeadowBeds */
const MeadowBeds = (() => {
  const TONIC = 52 // E3: the takes' key (E major)
  const BPM = 103 // the takes' pulse (measured: experiments/music/measure.py)
  const HOURS = { morning: 10.5, afternoon: 15, dusk: 19 } // the meadow's sun sets at 19:00 (day.js)

  // each moment: its chords (scale degrees, a bar each), how far up it sits
  // (whole octaves only), and how many notes a bar, left alone to busy
  const MOODS = {
    morning: { chords: [0, 3, 4, 0], lift: 12, dens: [2, 4] },
    day: { chords: [0, 5, 3, 4], lift: 12, dens: [2, 5] },
    afternoon: { chords: [0, 3, 0, 4], lift: 0, dens: [1, 3] },
  }

  /** A bird's trill: two or three quick high notes, to and fro between two of the chord's (in key). */
  function trill(c, random, at) {
    const n = 2 + Math.floor(random() * 2)
    const k0 = Math.floor(random() * 3)
    const pair = [c[k0], c[(k0 + 1) % 3]].map((m) => m + 24)
    return Array.from({ length: n }, (_, k) => ({ inst: 'birdflute', midi: pair[k % 2], at: at + k * 0.18, vol: 0.09 }))
  }

  const STYLES = {
    // harp notes falling softly, and birds (the films' sunny morning)
    birdsong: {
      bpm: BPM,
      bar(m, e, n, random, { triad, density, slots, pickOf }) {
        const c = triad(m.chords[n % m.chords.length])
        const out = [{ inst: 'harp', midi: c[0] - 12, at: 0, vol: 0.3 }]
        for (const s of slots(density(m, e), random)) out.push({ inst: 'harp', midi: pickOf(c, random) + m.lift, at: s / 2, vol: 0.2 })
        if (random() < 0.35) out.push(...trill(c, random, 1 + Math.floor(random() * 2)))
        return out
      },
    },
    // the harp, and now and then a little flute turn: the child watching
    meadow: {
      bpm: BPM,
      bar(m, e, n, random, { triad, density, slots, pickOf }) {
        const c = triad(m.chords[n % m.chords.length])
        const out = [{ inst: 'harp', midi: c[0] - 12, at: 0, vol: 0.3 }]
        for (const s of slots(Math.max(1, density(m, e) - 1), random)) out.push({ inst: 'harp', midi: pickOf(c, random), at: s / 2, vol: 0.2 })
        if (n % 4 === 2 && random() < 0.6) [c[2], c[1], c[0]].forEach((midi, k) => out.push({ inst: 'flute', midi: midi + 12, at: 2 + k * 0.5, vol: 0.12 }))
        else if (random() < 0.2) out.push(...trill(c, random, 2.5))
        return out
      },
    },
    // the harp strolling on every beat: the child playing
    stroll: {
      bpm: BPM,
      bar(m, e, n, random, { triad, density, slots, pickOf }) {
        const c = triad(m.chords[n % m.chords.length])
        const out = [c[0], c[1], c[2], c[1]].map((midi, k) => ({ inst: 'harp', midi: midi - (k ? 0 : 12), at: k, vol: k ? 0.18 : 0.28 }))
        for (const s of slots(Math.max(0, density(m, e) - 2), random)) out.push({ inst: 'harp', midi: pickOf(c, random) + 12, at: s / 2, vol: 0.14 })
        return out
      },
    },
    // soft held violins under a slower harp: a lazy afternoon
    haze: {
      bpm: BPM,
      bar(m, e, n, random, { triad, density, slots, pickOf }) {
        const c = triad(m.chords[n % m.chords.length])
        const out = n % 2 === 0 ? [{ inst: 'strings', midi: c[0], at: 0, vol: 0.1 }, { inst: 'strings', midi: c[2], at: 0, vol: 0.08 }] : []
        out.push({ inst: 'harp', midi: c[0] - 12, at: 0, vol: 0.26 })
        for (const s of slots(density(m, e), random)) out.push({ inst: 'harp', midi: pickOf(c, random) + 12, at: s / 2, vol: 0.16 })
        return out
      },
    },
  }

  const BY_MOOD = { morning: 'birdsong', day: 'meadow', afternoon: 'haze' }

  return Bed.score({
    tonic: TONIC,
    moods: MOODS,
    styles: STYLES,
    hours: HOURS,
    playsIn: ['day', 'afternoon'],
    // the child playing: the harp strolls; watching: that moment's bed
    pick: (mood, playing) => (playing ? 'stroll' : BY_MOOD[mood] ?? 'meadow'),
  })
})()
