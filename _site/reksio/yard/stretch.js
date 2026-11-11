// The dachshund stretch, as the yard plays it: the bassoon climbing as he
// stretches and a falling run as he lets go (out), and, left alone, the
// stretch all by himself (act). The stretch itself, his body reaching out
// and gathering up after the intro (22.5–28.5 s), is Reksio's
// (beginStretch, endStretch); a press held on him is yard.js's.

/* global Clock, Debug, Music, Reksio, Weather */
/* exported Stretch */
const Stretch = (() => {
  // Left alone, now and then he does the intro's stretch all by himself: at
  // most once a play, and not in every play, so it stays a surprise (Adam,
  // 2026-10-31).
  const ALONE_CHANCE = 0.6 // in this share of plays
  const ALONE_AFTER_S = 20 // left alone this long: a good while, the child watching rather than tapping
  const ALONE_MS = 3200 // how long he reaches out before he lets go: about the longest stretch (reksio.js), and a beat
  const ALONE_ROOM = 0.9 // only with room for nearly the whole stretch
  const MUSIC_STEP_MS = 300 // the bassoon climbs a note this often

  const thisPlay = Debug.random('stretch-alone')() < ALONE_CHANCE // drawn once, from its own stream
  let stretchedAlone = false

  /** He stretches, the bassoon climbing a note at a time while he does.
   * Returns letGo(): a falling run as he gathers up (or springs back),
   * resolving once he is himself again. */
  function out() {
    Debug.trace('stretch')
    Reksio.beginStretch()
    let n = 0
    Music.react.stretchStep(n++)
    const climbing = Clock.every(MUSIC_STEP_MS, () => Music.react.stretchStep(n++))
    return () => {
      climbing()
      Music.react.snap()
      return Reksio.endStretch()
    }
  }

  /** The left-alone move (yard.js ACTS): once in some plays, after a good
   * while alone (idleS(), seconds), standing, in the dry and with room for
   * it, when the yard says it can (calm()). He stretches at once, so a press
   * from then on is a tap (yard.js holdStart), which cuts the wait short:
   * he lets go. */
  const act = ({ idleS, calm }) => ({
    weight: 0,
    due: true,
    quiet: true, // the bassoon climbs as he stretches: no phrase over it
    ok: () => thisPlay && !stretchedAlone && idleS() > ALONE_AFTER_S && calm() && !Weather.raining &&
      Reksio.pose === 'stand' && !Reksio.worn.length && Reksio.roomToStretch >= ALONE_ROOM,
    async run() {
      stretchedAlone = true
      const letGo = out()
      try {
        await Reksio.kit.pause(ALONE_MS)
      } finally {
        await letGo()
      }
    },
  })

  return { out, act }
})()
