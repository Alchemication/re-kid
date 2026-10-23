// The meadow's music (worlds/krtek/MUSIC_DIRECTION.md): recorded takes
// picked by ear (tunes.js), one at a time with quiet between, the way the
// films turn one theme with the story:
// - the morning: the meadow's theme as he comes up;
// - an encounter: the theme curious as it arrives, sad at its trouble,
//   happy as it comes right (things.js; each encounter says at which of its
//   steps). At a fright (the fox) the music steps back and the effects
//   lead, as the films go quiet when trouble comes;
// - from dusk, the cricket's fiddle, one take after another until the
//   circle closes.
// A mood plays over quiet, or cuts short a weaker one (happy over sad over
// curious over the morning), never the same or a stronger one.

/* global Debug, Sound, Takes, TUNES */
/* exported Music */
const Music = (() => {
  const VOLUME = 0.45 // the music under his voice and the effects
  const TAKE_VOLUME = 0.8 // each take (levelled when packed)
  const LEAD_S = 0.15 // a take starts this long after it is asked for
  const CRICKET_GAP_S = 0.6 // between one of the cricket's takes and the next
  const RANK = { morning: 0, curious: 1, sad: 2, happy: 3 } // a mood cuts short only a weaker one
  const PARTS = ['morning', 'curious', 'sad', 'happy', 'lullaby'] // the parts it plays (tunes.yaml)

  let takes = null // the takes' player (takes.js)
  let ctx = null
  let loading = null
  let ready = false
  let night = false // from dusk: only the cricket
  let ended = false // the circle has closed: nothing more
  let random = null

  /** Load the takes (once), on the audio context Sound made at the first tap. */
  function prepare() {
    if (!loading) {
      const bus = Sound.bus()
      ctx = bus.ctx
      const out = ctx.createGain()
      out.gain.value = VOLUME
      out.connect(bus.master)
      takes = Takes.player(ctx, out, { volume: TAKE_VOLUME })
      random = Debug.random('music')
      loading = Promise.resolve(typeof TUNES !== 'undefined' && takes.load(TUNES)).then(() => { ready = true })
    }
    return loading
  }

  /** A take of `part` after `wait` seconds; then(): once it has played to its end. */
  function play(part, wait = LEAD_S, then = null) {
    if (takes.play(part, random, ctx.currentTime + wait, then)) Debug.trace('music', { part })
  }

  /** The morning: the theme, as he comes up (if nothing plays yet). */
  async function morning() {
    await prepare()
    if (!night && !takes.playing) play('morning')
  }

  /**
   * An encounter's moment: 'curious', 'sad' or 'happy' (a take of that
   * mood, if it wins over what plays), or 'hush' (a fright: what plays
   * fades and the effects lead).
   */
  function cue(part) {
    if (!loading || night) return // no tap yet: no sound
    if (!ready) return void loading.then(() => cue(part)) // still loading (an encounter arriving as he wakes)
    if (part === 'hush') {
      if (takes.playing) Debug.trace('music', { part })
      takes.fade()
      return
    }
    const now = takes.part
    if (now && RANK[now] >= RANK[part]) return
    const wait = now ? takes.FADE_S + 0.2 : LEAD_S // once the weaker one has faded
    takes.fade()
    play(part, wait)
  }

  /** Dusk: the cricket fiddles, take after take, until quiet(). */
  async function evening() {
    if (night) return
    night = true
    await prepare()
    const wait = takes.playing ? takes.FADE_S + 0.2 : LEAD_S
    takes.fade()
    const fiddle = (gap) => { if (!ended) play('lullaby', gap, () => fiddle(CRICKET_GAP_S)) }
    fiddle(wait)
  }

  /** The circle has closed: the music fades and stays away. */
  function quiet() {
    ended = true
    takes?.fade()
  }

  return {
    PARTS, prepare, morning, cue, evening, quiet,
    /** The part playing now, or null (for the overlay and the tests). */
    get part() { return takes?.part ?? null },
  }
})()
