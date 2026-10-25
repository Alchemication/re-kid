// Copied from shared/bed.js by `main.py shared` — edit that, not this.
// A music bed's rules: quiet music under a scene, there all the time but never
// in the way, so the scene is never dead silent and the recorded takes are the
// moments it swells into. A game gives its score (score()): its key, its
// moments of the day and a bed for each, and which bed plays when; this says
// which bed for a moment, what it plays in bar n, and how busy the child is.
// A few notes a bar, no tune to hum, played a little loose, as real players
// would.
//
// Pure: Ensemble (ensemble.js) plays it on the audio clock. Nothing here
// sounds or waits.

// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* exported Bed */
const Bed = (() => {
  const BEATS = 4 // to a bar
  const LOOSE_S = 0.025 // a note lands up to this far off the beat, either way…
  const LOOSE_VOL = 0.15 // …and this much louder or softer: played, not programmed
  const STIR = 0.25 // each tap or key makes it this much livelier…
  const CALM_S = 20 // …and left alone it calms down over about this long
  const MAJOR = [0, 2, 4, 5, 7, 9, 11]

  /** How busy the child is: a tap or a key makes it livelier… */
  const livelier = (busy) => Math.min(1, busy + STIR)
  /** …and it calms down as time passes with none (dt in seconds). */
  const calmer = (busy, dt) => busy * Math.exp(-dt / CALM_S)

  /**
   * A game's bed, from its score:
   * - tonic (midi), scale (degrees, major if left out);
   * - moods: { name: { chords: [scale degrees, a bar each], lift (whole octaves only), dens: [left alone, busy] } };
   * - styles: { name: { bpm, bar(m, e, n, random, h) → [{ inst, midi, at (beats), vol }] } },
   *   h the helpers below (triad, density, slots, pickOf, degree);
   * - pick(mood, playing): which style for a moment; busy: [down, up], the child playing from up,
   *   back to watching from down (no flipping to and fro), for the moods where playing counts
   *   (playsIn: the mood names);
   * - hours: { morning, afternoon, dusk } (moodAt).
   */
  function score(def) {
    const { tonic, moods, styles, pick, busy = [0.35, 0.55], playsIn = ['day'], hours } = def
    const scale = def.scale || MAJOR
    const degree = (steps) => tonic + 12 * Math.floor(steps / 7) + scale[((steps % 7) + 7) % 7]
    const triad = (d) => [degree(d), degree(d + 2), degree(d + 4)]
    const density = (m, e) => Math.round(m.dens[0] + (m.dens[1] - m.dens[0]) * e)
    const pickOf = (list, random) => list[Math.floor(random() * list.length)]
    /** n different eighths of the bar, never the first (the bass's). */
    function slots(n, random) {
      const out = new Set()
      for (let i = 0; i < n * 3 && out.size < n; i++) out.add(1 + Math.floor(random() * (BEATS * 2 - 1)))
      return [...out]
    }
    const h = { degree, triad, density, pickOf, slots }
    const first = Object.keys(moods)[0]

    /** Which moment it is: rain over everything, then rest (lying down, asleep), then the hour. */
    function moodAt({ hour, raining = false, resting = false, dusk = false }) {
      if (raining && moods.rain) return 'rain'
      if (resting && moods.rest) return 'rest'
      if (dusk || hour >= hours.dusk) return 'dusk'
      if (hour < hours.morning) return 'morning'
      if (hour >= hours.afternoon) return 'afternoon'
      return 'day'
    }

    /** Which bed for a moment, how busy the child is, and whether the child was playing a moment ago. */
    function style(mood, energy, wasPlaying = false) {
      const playing = playsIn.includes(mood) && energy >= (wasPlaying ? busy[0] : busy[1])
      return { style: pick(mood, playing), playing }
    }

    /** What bar n plays: [{ inst, midi, at (seconds into the bar), vol }], and how long the bar is. */
    function bar(styleName, mood, energy, n, random) {
      const s = styles[styleName] ?? styles[Object.keys(styles)[0]]
      const beat = 60 / s.bpm
      const notes = s.bar(moods[mood] ?? moods[first], Math.max(0, Math.min(1, energy)), n, random, h).map((note) => ({
        inst: note.inst,
        midi: note.midi,
        at: Math.max(0, note.at * beat + (random() * 2 - 1) * LOOSE_S),
        vol: note.vol * (1 + (random() * 2 - 1) * LOOSE_VOL),
      }))
      return { notes, seconds: BEATS * beat }
    }

    return { MOODS: moods, STYLES: styles, TONIC: tonic, SCALE: scale, CALM_S, degree, moodAt, livelier, calmer, style, bar }
  }

  return { score, livelier, calmer, CALM_S }
})()
