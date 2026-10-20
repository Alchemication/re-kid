// Reksio's moves for the bigger gags, kept out of reksio.js so it holds only
// what every gag shares. Each is a gesture made from his kit (Reksio.kit:
// blends of his layers on the game's Clock), added to him with
// Reksio.addGestures, so
// relax() cuts it short like any other and it counts as a gesture under way.
//
// The bowl on his head (things.js): he shakes it, sits glum under it, barks
// inside it, is tugged at by the bird, and is delighted when it comes off.
//
// His tail caught in the bramble (bramble.js): a proud wag, yanked back as he
// sets off, a double take, straining to pull free and snapped back onto his
// bottom, glum; frozen at a bee's hum by his tail, and a leap of fright.
//
// The cuckoo clock (cuckoo.js): he barks back up at each call, very pleased;
// turns his back on it, nose in the air; is spun round by one call more; and
// gives the shut door a cross look.

/* global Reksio, Sound, Figure */
(() => {
  const DROOP = 14 // his head hanging, glum, the bowl stuck on it (degrees)
  const GLUM = { smile: -0.7, open: 0 } // what shows of his face under the bowl
  const STEP_OFF = 24 // setting off, he gets this far before his tail yanks him back (his units)
  const STRAIN = 46 // straining hard, this far: the tail stretches like elastic
  const EFFORT = { eyes: 0, joy: -1, brows: -0.9, lines: 1, smile: 0, grit: 1, open: 0 } // eyes screwed shut, teeth clenched
  const STARTLED = { lift: 1, brows: 0.6, o: 1, open: 0.3, smile: 0 }
  const FRIGHT = { lift: 1, brows: 1, open: 0.8, o: 1, smile: 0, eyes: 1, joy: 0 }
  const PROUD = { smile: 1, eyes: 0, joy: 1, lift: 0.3 } // eyes shut, beaming
  const SMUG = { smile: 0.9, eyes: 0.35, joy: 0.3, brows: 0.4 } // eyes half shut, nose up
  const LOOK_BACK = { turn: 0 } // his head turned to us, the eyes looking back over his shoulder (face.look)
  const k = Reksio.kit
  const { blend, pause, faceTo, faceOff, actTo, actOff, add, rnd, rndInt } = k
  // the expressions after the films' frames (figure.js POSES): cross at the
  // cuckoo, worried with his tail caught, puzzled at the hum, content once
  // he is freed
  const CROSS = { ...k.POSES.cross.face, joy: 0 }
  const WORRIED = k.POSES.worried.face
  const PUZZLED = k.POSES.puzzled.face
  const CONTENT = k.POSES.content.face

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

  /** Freed (the bowl off, his tail loose): a blink of surprise, then
   * delight, up he gets, and a moment of contentment. */
  async function freed() {
    faceTo({ lift: 1, brows: 0.6, open: 0.4, o: 1, smile: 0 }, 60)
    k.perk('both', 500)
    await blend(add, 'tilt', -6, 160, k.EASE_OUT)
    await pause(rnd(400, 650))
    faceTo({ smile: 1, open: 0.7, eyes: 0, joy: 1, teeth: 1 }, 160)
    await blend(add, 'tilt', 0, 200)
    await k.rise(400)
    await faceTo(CONTENT, 300)
    await pause(rnd(500, 800))
    await faceOff(250)
  }

  /** A suspicious look: eyes narrowed, brows down, head cocked. */
  async function squint(ms = rnd(800, 1200)) {
    await faceTo({ eyes: 0.35, brows: -0.9, lines: 0.6, small: 0.6, smile: -0.3, open: 0 }, 200)
    await blend(add, 'tilt', 8, 250)
    await pause(ms)
    await blend(add, 'tilt', 0, 200)
    await faceOff(200)
  }

  /** Pleased with himself, a big swishing wag (where the tail goes is his
   * business: the bramble's catches it). */
  async function swish(times = 4) {
    faceTo({ smile: 1, eyes: 0, joy: 1 }, 150)
    for (let i = 0; i < times; i++) await blend(add, 'wag', i % 2 ? -2 : 2.5, 150)
    await blend(add, 'wag', 0, 150)
  }

  /** The turn of the head to look back over his shoulder, or forward again. */
  const lookBack = (back, ms, face = {}) => Promise.all([
    back ? actTo(Figure.vary(k.basePose(), { head: LOOK_BACK }), ms) : actOff(ms),
    faceTo({ look: back ? -1 : 0, ...face }, ms),
  ])

  /** Off he goes… and is yanked back, boing. A blink, a glance back, away,
   * and the double take: what has got him? */
  async function yanked() {
    await faceOff(100)
    blend(add, 'dy', -5, 120)
    await blend(add, 'dx', STEP_OFF, 200, k.EASE_OUT)
    Sound.boing()
    blend(add, 'dy', 0, 120)
    await blend(add, 'dx', 0, 300, k.OVERSHOOT)
    await faceTo(STARTLED, 80)
    await pause(rnd(350, 500))
    await lookBack(true, 140)
    await pause(200)
    await lookBack(false, 120)
    await pause(rnd(200, 300))
    await lookBack(true, 70, { lift: 1, brows: 1, open: 0.6, o: 1 }) // the double take
    await pause(rnd(600, 800))
    await lookBack(false, 200)
    await faceOff(150)
  }

  /** Down on all fours, teeth gritted, pulling for all he's worth: the tail
   * stretches… and snaps him back, boing, onto his bottom. `hard`, 0 to 1. */
  async function strain(hard = 1) {
    faceTo(EFFORT, 150)
    await actTo(Figure.vary(k.POSES.onFours, { head: { tilt: -8 }, face: EFFORT }), 200)
    await blend(add, 'dx', STRAIN * hard, 500 + 300 * hard, k.EASE_OUT)
    await blend(add, 'dx', STRAIN * hard * 0.85, 110) // a scrabble
    await blend(add, 'dx', STRAIN * hard, 110)
    Sound.boing()
    faceTo({ ...STARTLED, open: 0.5, eyes: 1, joy: 0, teeth: 0 }, 60)
    actOff(220)
    await Promise.all([k.settle('sit', 220), blend(add, 'dx', 0, 360, k.OVERSHOOT)])
    await pause(rnd(250, 400))
  }

  /** Sitting glum, looking back at his caught tail, until `freed` resolves
   * (a tap's strain may come and go meanwhile: he goes back to it after). */
  async function sulk() {
    await lookBack(true, 400, WORRIED)
  }

  /** A hum, right behind him: he freezes, eyes wide, and slowly looks round. */
  async function hearsBee() {
    k.perk('either', 1800) // an ear goes up before he dares look
    await Promise.all([actOff(150), faceTo({ ...PUZZLED, look: 0 }, 90)]) // what was that?
    blend(add, 'tilt', -6, 150)
    await pause(rnd(700, 900)) // frozen
    await lookBack(true, 700, FRIGHT) // slowly…
    await pause(rnd(300, 450))
  }

  /** A leap of fright, straight up and forward, arms flung wide, landing
   * `far` ahead on his feet. */
  async function leapFright(far = 150) {
    faceTo({ ...FRIGHT, look: 0 }, 60)
    k.perk('both', 900)
    await Promise.all([k.settle('stand', 140), actTo(Figure.vary(k.POSES.armsWide, { face: FRIGHT }), 140, k.OVERSHOOT, true)])
    Sound.hop()
    const going = Reksio.walkTo(Reksio.x + Reksio.facing * far)
    await blend(add, 'dy', -95, 300, k.EASE_OUT)
    await blend(add, 'dy', 0, 320, k.EASE_IN)
    await going
    blend(add, 'tilt', 0, 200)
    await actOff(200)
  }

  /** A bark straight back up at the cuckoo: head well up, mouth wide, and
   * then beaming, pleased with it. Leaves his head up and his face proud. */
  async function barkUp() {
    faceTo({ open: 0.8, smile: 0.5, lift: 0.7, eyes: 1, joy: 0 }, 60)
    Sound.bark()
    k.tell('bark', Reksio.mouth())
    await blend(add, 'tilt', -32, 120, k.EASE_OUT)
    await blend(add, 'tilt', -22, 140)
    await faceTo(PROUD, 120)
  }

  /** That's that: he turns his back on the clock, nose in the air. */
  async function smugTurn() {
    faceTo(SMUG, 200)
    blend(add, 'tilt', -12, 300)
    await pause(rnd(150, 250))
    Reksio.face(-Reksio.facing)
    await pause(rnd(600, 900))
  }

  /** One call more, behind him: frozen, spun round with a hop, eyes wide. */
  async function spunRound() {
    faceTo(STARTLED, 60)
    await blend(add, 'tilt', -4, 90)
    Reksio.face(-Reksio.facing)
    await blend(add, 'dy', -26, 180, k.EASE_OUT)
    await blend(add, 'dy', 0, 180, k.EASE_IN)
  }

  /** A cross look up at the shut door, then he lets it go. Ends with his
   * head and face back as they were. */
  async function glare() {
    faceTo(CROSS, 120)
    await blend(add, 'tilt', -18, 200)
    await pause(rnd(700, 1000))
    blend(add, 'tilt', 0, 300)
    await faceOff(300)
  }

  // ------------------------------------------------------------ the variations' moves (things.js)

  /** Puzzled: both ears up, brows up, forehead lines, a little dash of a
   * mouth, head on one side, for ms. */
  async function puzzled(ms = rnd(700, 1000)) {
    k.perk('both', ms)
    faceTo(PUZZLED, 150)
    await blend(add, 'tilt', 10, 200)
    await pause(ms)
    blend(add, 'tilt', 0, 200)
    await faceOff(200)
  }

  /** Under the dripping tap: head right back, mouth open, tongue ready,
   * for ms (resolves when his head is back down). */
  async function waitForDrop(ms) {
    faceTo({ open: 0.5, smile: 0.4, lift: 1, eyes: 1, joy: 0, tongue: 0.3 }, 150)
    await blend(add, 'tilt', -34, 250, k.EASE_OUT)
    await pause(ms)
    blend(add, 'tilt', 0, 200)
    await faceOff(200)
  }

  /** Hiccups after drinking too fast: little hops, a "hic" each, his mouth
   * an O; then a puzzled look. */
  async function hiccups(times = 3) {
    for (let i = 0; i < times; i++) {
      faceTo({ open: 0.3, o: 1, lift: 1, eyes: 1, joy: 0 }, 40)
      Sound.pop()
      k.perk('both', 160)
      await blend(add, 'dy', -16, 90, k.EASE_OUT)
      await blend(add, 'dy', 0, 120, k.EASE_IN)
      await faceOff(80)
      await pause(rnd(380, 560))
    }
    await puzzled(rnd(600, 800))
  }

  /** Trying to fly after the bird: ears flapping, arms out, two hops, and
   * down on his bottom with a boing; a sheepish look, and up. */
  async function tryToFly() {
    await actTo(Figure.vary(k.basePose(), { nearArm: k.POSES.armsWide.nearArm, farArm: k.POSES.armsWide.farArm }), 160, k.OVERSHOOT)
    faceTo({ lift: 1, eyes: 1, open: 0.2, smile: 0.6 }, 100)
    for (let i = 0; i < 2; i++) {
      k.perk('both', 140)
      Sound.hop()
      await blend(add, 'dy', -34 - 10 * i, 220, k.EASE_OUT)
      k.perk('both', 140)
      await blend(add, 'dy', 0, 200, k.EASE_IN)
    }
    actOff(120)
    Sound.boing()
    faceTo(STARTLED, 60)
    await k.settle('sit', 160)
    await pause(rnd(400, 550))
    await faceTo({ ...WORRIED, smile: 0.2, small: 0.4 }, 200) // sheepish
    await pause(rnd(500, 700))
    await faceOff(200)
    await k.rise(350)
  }

  /** Cross-eyed at something on his nose: head down a little, eyes on it. */
  async function crossEyed(ms = 700) {
    faceTo({ eyes: 1, lift: 0.8, brows: 0.5, small: 1, smile: 0, look: 1 }, 120)
    await blend(add, 'tilt', 12, 200)
    await pause(ms)
    blend(add, 'tilt', 0, 200)
    await faceOff(150)
  }

  /** A puff of breath: blowing something off his nose. */
  async function blow() {
    faceTo({ o: 1, open: 0.35, small: 0, lift: 0.5 }, 60)
    await blend(add, 'tilt', -6, 120)
    await pause(250)
    blend(add, 'tilt', 0, 200)
    await faceOff(200)
  }

  /** Puffed up, chest out, hands on hips: a bigger bark back. */
  async function puffUp() {
    await Promise.all([actTo(Figure.vary(k.POSES.handsOnHips, { chest: [k.POSES.handsOnHips.chest[0] + 6, k.POSES.handsOnHips.chest[1] - 4] }), 200, k.OVERSHOOT), faceTo({ brows: -0.6, smile: 0.2, open: 0, lift: 0 }, 150)])
    await blend(add, 'tilt', -10, 200)
    faceTo({ open: 0.85, smile: 0.3, brows: -0.6 }, 60)
    Sound.bark()
    k.tell('bark', Reksio.mouth())
    await pause(500)
    await faceTo({ ...k.POSES.content.face, eyes: 0.3, joy: 0.3 }, 200) // that told him
    await pause(rnd(400, 600))
    blend(add, 'tilt', 0, 250)
    await Promise.all([actOff(250), faceOff(250)])
  }

  const gestures = { bowlShake, slump, mope, bowlBark, tugged, freed, squint, swish, yanked, strain, sulk, hearsBee, leapFright, barkUp, smugTurn, spunRound, glare, puzzled, waitForDrop, hiccups, tryToFly, crossEyed, blow, puffUp }
  Reksio.addGestures(gestures)

})()
