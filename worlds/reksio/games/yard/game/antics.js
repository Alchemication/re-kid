// Reksio's moves for the bigger gags, kept out of reksio.js so it holds only
// what every gag shares. Each is a gesture made from his kit (Reksio.kit:
// blends of his layers on the game's Clock), added to him with
// Reksio.addGestures, so
// relax() cuts it short like any other and it counts as a gesture under way.
//
// The bowl on his head (things.js): he shakes it, sits glum under it, barks
// inside it, is tugged at by the bird, and is delighted when it comes off.

/* global Reksio, Sound, Figure */
(() => {
  const DROOP = 14 // his head hanging, glum, the bowl stuck on it (degrees)
  const GLUM = { smile: -0.7, open: 0 } // what shows of his face under the bowl
  const k = Reksio.kit
  const { blend, pause, faceTo, faceOff, actTo, actOff, add, rnd, rndInt } = k

  /** Stuck in the bowl: he freezes, arms out, then shakes his head hard to
   * get it off, the bowl clanging. */
  async function bowlShake(times = rndInt(5, 7)) {
    const arms = k.POSES.armsWide
    await actTo(Figure.vary(k.basePose(), { nearArm: arms.nearArm, farArm: arms.farArm }), 160, k.OVERSHOOT)
    await pause(rnd(500, 800)) // frozen: what just happened?
    for (let i = 0; i < times; i++) {
      if (i % 2 === 0) Sound.clang(0, 0.5)
      const d = (i % 2 ? -1 : 1) * rnd(14, 20)
      blend(add, 'lean', d / 3, 85)
      await blend(add, 'tilt', d, 85)
    }
    blend(add, 'lean', 0, 120)
    await blend(add, 'tilt', 0, 120)
    await actOff(260)
  }

  /** Sits down glum, head hanging under the bowl. */
  async function slump() {
    faceTo(GLUM, 300)
    await k.settle('sit', 500)
    await blend(add, 'tilt', DROOP, 500)
  }

  /** Sits glum until `freed` resolves. */
  async function mope(freed) {
    faceTo(GLUM, 300)
    await freed
  }

  /** "Hau" inside the bowl: muffled, his mouth opens under the rim, the bowl
   * rings. Only his face moves: his head is the bowl's, shaken or tugged at
   * by the bird, and a bark must not cut that short. */
  async function bowlBark() {
    Sound.bowlBark()
    await faceTo({ open: 0.7, smile: 0 }, 60)
    await pause(140)
    if (Reksio.pose === 'sit') await faceTo(GLUM, 160)
    else await faceOff(100)
  }

  /** The bird tugs at the bowl: his head is pulled up off his seat, and it
   * slips back down. */
  async function tugged(ms = rnd(650, 850)) {
    blend(add, 'dy', -12, ms * 0.6, k.EASE_OUT)
    await blend(add, 'tilt', -24, ms * 0.6, k.EASE_OUT)
    blend(add, 'dy', 0, ms * 0.4)
    await blend(add, 'tilt', DROOP * 0.5, ms * 0.4, k.OVERSHOOT)
  }

  /** The bowl is off: a blink of surprise, then delight, and up he gets. */
  async function freed() {
    faceTo({ lift: 1, brows: 0.6, open: 0.4, o: 1, smile: 0 }, 60)
    await blend(add, 'tilt', -6, 160, k.EASE_OUT)
    await pause(rnd(400, 650))
    faceTo({ smile: 1, open: 0.7, eyes: 0, joy: 1, teeth: 1 }, 160)
    await blend(add, 'tilt', 0, 200)
    await k.rise(400)
    await faceOff(250)
  }

  /** A suspicious look: eyes narrowed, brows down, head cocked. */
  async function squint(ms = rnd(800, 1200)) {
    await faceTo({ eyes: 0.35, brows: -0.9, smile: -0.3, open: 0 }, 200)
    await blend(add, 'tilt', 8, 250)
    await pause(ms)
    await blend(add, 'tilt', 0, 200)
    await faceOff(200)
  }

  const gestures = { bowlShake, slump, mope, bowlBark, tugged, freed, squint }
  Reksio.addGestures(gestures)

})()
