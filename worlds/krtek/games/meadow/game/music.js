// The meadow's music (worlds/krtek/MUSIC_DIRECTION.md): recorded takes
// picked by ear (tunes.js), one at a time with quiet between, the way the
// films turn one theme with the story:
// - the morning: the meadow's theme as he comes up;
// - an encounter: the theme curious as it arrives, sad at its trouble,
//   happy as it comes right (things.js; each encounter says at which of its
//   steps). When the bulldozer comes over the hill, a short uneasy turn
//   (menace, Adam 2026-11-01), then the music steps back and its rumble
//   leads; for the fox, a sly motif written note by note (MOTIFS); then,
//   until the trouble is over, only the uneasy bed (beds.js `unease`,
//   things.js `trouble`): no glad theme while the threat is still here;
// - from dusk, the cricket's fiddle, one take after another until the
//   circle closes, now and then a longer quiet between for the owl (owl.js); the last plays to its end over him asleep.
// A mood plays over quiet, or cuts short a weaker one (menace over happy
// over sad over curious over the morning), never the same or a stronger one.
// Between takes, a quiet bed (beds.js: harp, flute, birds, violins, in the
// takes' key and pulse; ensemble.js plays it) steps back under each take
// and comes back after; the game says the moment and how busy the child is
// (bed.set). It stops at dusk, for the cricket.

/* global Clock, Debug, Ensemble, Layout, MeadowBeds, SAMPLES, Sound, Takes, TUNES */
/* exported Music */
const Music = (() => {
  const VOLUME = 0.45 // the music under his voice and the effects
  const TAKE_VOLUME = 0.8 // each take (levelled when packed)
  const LEAD_S = 0.15 // a take starts this long after it is asked for
  const CRICKET_GAP_S = 0.6 // between one of the cricket's takes and the next
  const RANK = { morning: 0, curious: 1, sad: 2, happy: 3, menace: 4 } // a mood cuts short only a weaker one
  const PARTS = ['morning', 'curious', 'sad', 'happy', 'menace', 'lullaby'] // the parts it plays (tunes.yaml)
  // Motifs written note by note on the meadow's own samples (no takes to load: Adam, 2026-11-01, "even
  // synth could be better"): a few seconds as trouble comes, then quiet. [instrument, midi note, at s, loudness]
  const MOTIFS = {
    // the bulldozer: a low clarinet creeping between two neighbouring notes, slow, then quicker and
    // quicker as it comes, over soft low strings; a low held chord as it arrives
    bulldozer: [
      ['strings', 52, 0, 0.35], ['clarinet', 52, 0, 0.7], ['clarinet', 53, 0.9, 0.7], ['clarinet', 52, 1.7, 0.7],
      ['clarinet', 53, 2.4, 0.75], ['strings', 52, 2.4, 0.35], ['clarinet', 52, 3.0, 0.75], ['clarinet', 53, 3.5, 0.8],
      ['clarinet', 52, 3.9, 0.8], ['clarinet', 53, 4.25, 0.85], ['clarinet', 52, 4.55, 0.85], ['clarinet', 53, 4.8, 0.9],
      ['strings', 52, 5.1, 0.5], ['strings', 55, 5.1, 0.45], ['clarinet', 52, 5.1, 0.8],
    ],
    // the fox: a sly little turn, slinking down and back on the clarinet over a few dark harp notes
    fox: [
      ['harp', 40, 0, 0.6], ['clarinet', 59, 0, 0.6], ['clarinet', 58, 0.45, 0.6], ['clarinet', 59, 0.9, 0.6],
      ['harp', 47, 0.9, 0.5], ['clarinet', 55, 1.4, 0.65], ['harp', 40, 1.9, 0.6], ['clarinet', 54, 1.9, 0.7], ['harp', 39, 2.6, 0.6],
    ],
  }
  const MOTIF_VOLUME = 0.9 // a motif against the takes (both under the effects)
  const MOTIF_TAIL_S = 2 // after its last note, the bed comes back over about this long

  let takes = null // the takes' player (takes.js)
  let band = null // the samples and the bed (ensemble.js)
  let bed = null
  let ctx = null
  let loading = null
  let ready = false
  let night = false // from dusk: only the cricket
  let ended = false // the circle has closed: nothing more
  let startsAt = 0 // when the take asked for last starts (audio time)
  let random = null
  let between = () => 0 // after each of the cricket's tunes: how much longer to wait before the next (the owl's hoot)

  /** Load the takes (once), on the audio context Sound made at the first tap. */
  function prepare() {
    if (!loading) {
      const bus = Sound.bus()
      ctx = bus.ctx
      const out = ctx.createGain()
      out.gain.value = VOLUME
      out.connect(bus.master)
      band = Ensemble.make(ctx, out, typeof SAMPLES !== 'undefined' ? SAMPLES : {})
      bed = band.bed(MeadowBeds, { quiet: () => takes.playing, stream: 'meadow-bed' })
      takes = Takes.player(ctx, out, { volume: TAKE_VOLUME, onStart: (t) => bed.away(t), onEnd: () => { if (!night) bed.back() } })
      random = Debug.random('music')
      loading = Promise.all([band.loaded, typeof TUNES !== 'undefined' && takes.load(TUNES)]).then(() => { ready = true })
    }
    return loading
  }

  /** The part playing now, whichever season's take it is ('happy', not 'happy.autumn'), or null. */
  const partNow = () => takes?.part?.split('.')[0] ?? null

  /** A take of `part` after `wait` seconds; then(): once it has played to its end. */
  function play(part, wait = LEAD_S, then = null) {
    const own = `${part}.${Layout.season}` // a season's own takes of a part (tunes.yaml `season`: autumn's), where it has them
    if (!takes.play(takes.has(own) ? own : part, random, ctx.currentTime + wait, then)) return
    startsAt = ctx.currentTime + wait
    Debug.trace('music', { part })
  }

  /** The morning: the theme, as he comes up (if nothing plays yet). */
  async function morning() {
    await prepare()
    if (!night && !takes.playing) play('morning')
    if (!night) bed.start()
  }

  /**
   * An encounter's moment: 'curious', 'sad', 'happy' or 'menace' (a take
   * of that mood, if it wins over what plays; trouble coming: a short uneasy
   * turn, then quiet), or 'hush' (a fright: what plays fades and the
   * effects lead), or a motif's name (MOTIFS: a few written notes as
   * trouble comes). A mood with no takes yet fades what plays, as a hush.
   */
  function cue(part) {
    if (!loading || night) return // no tap yet: no sound
    if (!ready) return void loading.then(() => cue(part)) // still loading (an encounter arriving as he wakes)
    if (MOTIFS[part]) return motif(part)
    if (part === 'hush') {
      if (takes.playing) Debug.trace('music', { part })
      takes.fade()
      return
    }
    const now = partNow()
    if (now && RANK[now] >= RANK[part]) return
    const wait = now ? takes.FADE_S + 0.2 : LEAD_S // once the weaker one has faded
    takes.fade()
    play(part, wait)
  }

  /** A motif (MOTIFS) as trouble comes: what plays fades, the bed steps back, its notes play, and after
   * them the bed comes back. */
  function motif(name) {
    const t = ctx.currentTime + (takes.playing ? takes.FADE_S : LEAD_S)
    takes.fade()
    bed.away(t)
    let last = 0
    for (const [inst, midi, at, vol] of MOTIFS[name]) {
      band.play(inst, midi, t + at, vol * MOTIF_VOLUME)
      last = Math.max(last, at)
    }
    Debug.trace('music', { motif: name })
    Clock.after((t - ctx.currentTime + last + MOTIF_TAIL_S) * 1000, () => { if (!night && !takes.playing) bed.back() })
  }

  /** Dusk: the cricket fiddles, take after take, until quiet(). */
  async function evening() {
    if (night) return
    night = true
    await prepare()
    bed.stop() // the cricket's alone from dusk
    const wait = takes.playing ? takes.FADE_S + 0.2 : LEAD_S
    takes.fade()
    const fiddle = (gap) => { if (!ended) play('lullaby', gap, () => { if (!ended) fiddle(CRICKET_GAP_S + between()) }) }
    fiddle(wait)
  }

  /** The cricket's fiddle once in the day (an eclipse's dusk): one take, over whatever plays. */
  function fiddle() {
    if (!loading || night) return // no tap yet, or the evening has it already
    if (!ready) return void loading.then(fiddle)
    const wait = takes.playing ? takes.FADE_S + 0.2 : LEAD_S
    takes.fade()
    play('lullaby', wait)
  }

  /** The circle has closed: the tune playing ends as it ends, over him asleep (cut, it sounded
   * unfinished: Adam, 2026-11-04), and nothing comes after; one not started yet never starts. */
  function quiet() {
    ended = true
    bed?.stop()
    const waiting = takes && ctx.currentTime < startsAt
    if (waiting) takes.fade()
    Debug.trace('last tune', { playsOn: !!takes?.playing })
  }

  return {
    PARTS, prepare, morning, cue, evening, fiddle, quiet,
    /** Asked after each of the cricket's tunes, `fn` says how many seconds more of quiet before the next (the
     * owl hoots into it, owl.js). */
    between(fn) { between = fn },
    /** The bed's moment and how busy the child is (the meadow steers it). */
    setBed(change) { bed?.set(change) },
    /** The bed now, for the overlay and the tests. */
    get bed() { return bed ? { on: bed.on, style: bed.style, mood: bed.mood } : null },
    /** The part playing now, or null (for the overlay and the tests). */
    get part() { return partNow() },
  }
})()
