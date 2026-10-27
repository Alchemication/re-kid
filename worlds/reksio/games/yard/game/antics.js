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

  // ------------------------------------------------------------ the hen's ladder (hen.js)

  // on a ladder, side-on, a paw on a rung above his head, the other lower, in turn
  const CLIMB = [
    { nearArm: [[26, -120], [32, -150]], farArm: [[8, -104], [16, -124]] },
    { nearArm: [[24, -104], [30, -126]], farArm: [[10, -120], [18, -150]] },
  ]
  const onRung = (i) => Figure.vary(k.basePose(), CLIMB[i % 2])

  /** Up a ladder: `rise` (his units) in `rungs` steps, paw over paw. Ends at
   * the top, still holding on (climbDown brings him back). */
  async function climb(rise, rungs) {
    faceTo({ lift: 0.6, brows: 0.3, smile: 0.3 }, 150)
    for (let i = 0; i < rungs; i++) {
      actTo(onRung(i), 160)
      Sound.step()
      await blend(add, 'dy', (-rise * (i + 1)) / rungs, 260, k.EASE_OUT)
      await pause(60)
    }
    k.perk('both', 600)
  }

  /** Down the ladder, slower and careful (an egg in his mouth). `wobble`,
   * if given, plays half-way down while he clings on, worried. */
  async function climbDown(rungs, wobble = null) {
    const from = add.dy
    faceTo({ ...k.POSES.content.face, eyes: 0.6, joy: 0, small: 0.5 }, 150)
    for (let i = rungs - 1; i >= 0; i--) {
      if (wobble && i === Math.floor(rungs / 2)) {
        faceTo({ ...WORRIED, eyes: 1 }, 80)
        k.perk('both', 1100)
        await Promise.all([wobble(), blend(add, 'lean', 4, 300).then(() => blend(add, 'lean', -3, 400)).then(() => blend(add, 'lean', 0, 300))])
        faceTo({ ...k.POSES.content.face, eyes: 0.6, joy: 0, small: 0.5 }, 150)
      }
      actTo(onRung(i), 200)
      Sound.step()
      await blend(add, 'dy', (from * i) / rungs, 340, k.EASE_IN)
      await pause(90)
    }
    await Promise.all([actOff(200), faceOff(200)])
  }

  /** Aww: head on one side, a soft smile, looking down at something small. */
  async function aww() {
    faceTo({ ...CONTENT, eyes: 0.7, joy: 0.4 }, 200)
    await blend(add, 'tilt', 14, 300)
    await pause(rnd(700, 900))
    blend(add, 'tilt', 0, 300)
    await faceOff(300)
  }

  // ------------------------------------------------------------ at the gate (things.js)

  /** A leap up to peek over the gate: paws on the top rail, ears up, a long
   * look out, a grin, and down again. rise: how high (his units). */
  async function peekOver(rise) {
    k.perk('both', 1800)
    await actTo(Figure.vary(k.basePose(), { nearArm: [[30, -128], [42, -156]], farArm: [[14, -126], [26, -154]] }), 160)
    Sound.hop()
    await blend(add, 'dy', -rise, 260, k.EASE_OUT)
    faceTo({ lift: 1, eyes: 1, joy: 0, open: 0.3, o: 1, smile: 0 }, 100) // oh! what's out there
    await pause(rnd(700, 900))
    faceTo({ smile: 1, open: 0.5, eyes: 0, joy: 1 }, 120)
    await pause(450)
    await blend(add, 'dy', 0, 280, k.EASE_IN)
    Sound.hop()
    await Promise.all([actOff(220), faceOff(220)])
  }

  /** A picket in his teeth, tugging for all he's worth (onTug at each
   * tug: the gate rattles); then he lets go and licks his lips. */
  async function gnaw(onTug) {
    await faceTo({ eyes: 0, joy: -1, brows: -0.9, lines: 1, grit: 1, smile: 0, open: 0 }, 120)
    for (let i = 0; i < 3; i++) {
      onTug()
      await blend(add, 'lean', -9, 230, k.EASE_OUT)
      await blend(add, 'lean', 0, 200)
    }
    faceTo({ grit: 0, tongue: 0.8, open: 0.2, eyes: 0.6, joy: 0, lines: 0 }, 150)
    await pause(450)
    await faceOff(200)
  }

  // ------------------------------------------------------------ mushrooms (mushrooms.js)

  /** A blissful sniff: eyes shut, a smile, head up, a sigh. */
  async function bliss() {
    faceTo({ eyes: 0, joy: 1, smile: 1, small: 0.3 }, 200)
    await blend(add, 'tilt', -14, 400)
    await pause(rnd(600, 800))
    blend(add, 'tilt', 0, 300)
    await faceOff(300)
  }

  /** Turned to the child, showing off what he carries: head up, proud. */
  async function showOff() {
    faceTo(PROUD, 150)
    await Promise.all([actTo(Figure.vary(k.basePose(), { head: { turn: 0 } }), 250), blend(add, 'tilt', -8, 250)])
    k.perk('both', 700)
    await pause(rnd(700, 900))
    blend(add, 'tilt', 0, 250)
    await Promise.all([actOff(250), faceOff(250)])
  }

  /** Yuck: a sniff he doesn't like. Ears down, a recoil, a head shake: no. */
  async function yuck() {
    faceTo({ eyes: 0.4, joy: 0, brows: -0.6, lines: 0.8, small: 1, smile: -0.7 }, 100)
    await Promise.all([blend(add, 'dy', -10, 120, k.EASE_OUT).then(() => blend(add, 'dy', 0, 160)), blend(add, 'dx', -16, 280, k.EASE_OUT)])
    for (let i = 0; i < 3; i++) {
      await blend(add, 'lean', 5, 120)
      await blend(add, 'lean', -5, 120)
    }
    await Promise.all([blend(add, 'lean', 0, 120), blend(add, 'dx', 0, 400), faceOff(250)])
  }

  /** No, no: a paw raised, wagging, a stern little face. */
  async function wagFinger() {
    faceTo({ brows: -0.5, eyes: 0.8, small: 1, smile: -0.3, lines: 0.5 }, 120)
    const up = (out) => Figure.vary(k.basePose(), { nearArm: [[30, -108], [36 + out, -142]] })
    for (let i = 0; i < 4; i++) await actTo(up(i % 2 ? -8 : 8), 150)
    await Promise.all([actOff(200), faceOff(200)])
  }

  /** Walking off, a wary look back over his shoulder at it. */
  async function wary() {
    await lookBack(true, 250, { brows: -0.4, eyes: 0.6, small: 1, smile: -0.3 })
    await pause(rnd(600, 800))
    await lookBack(false, 250)
    await faceOff(200)
  }

  /** On the ice (a winter play: ice.js): his feet shoot out from under him,
   * arms flung up, and down he plonks on his bottom, legs out straight, as he
   * skids on; a dazed, cross-eyed blink; then up, slowly and carefully. Slow
   * enough to see (Adam, 2026-10-27). */
  async function slipped() {
    faceTo({ o: 1, open: 0.5, lift: 1, brows: 0.9, smile: 0 }, 50)
    k.perk('both', 250)
    blend(add, 'dy', -18, 160, k.EASE_OUT)
    await actTo(FEET_UP, 160)
    blend(add, 'dy', 0, 170, k.EASE_IN)
    await actTo(PLONKED, 170)
    Sound.plop()
    await pause(500)
    await faceTo({ eyes: 1, lift: 0.8, brows: 0.5, small: 1, smile: 0, look: 1 }, 120) // seeing stars
    await pause(900)
    await faceOff(250)
    await pause(300)
    await actOff(900) // up, carefully
  }
  // his feet out from under him: leaning back, legs kicked up in front, arms flung up
  const FEET_UP = Figure.vary(k.POSES.stand, {
    pelvis: [0, -64], chest: [-16, -96], head: { x: -14, y: -140, tilt: -22 },
    nearArm: [[-2, -112], [10, -138]], farArm: [[-26, -110], [-36, -134]],
    nearLeg: [[30, -60], [56, -70]], farLeg: [[22, -56], [48, -58]],
  })
  // down on his bottom, legs out straight in front, a paw behind him on the ice
  const PLONKED = Figure.vary(k.POSES.sitUp, {
    pelvis: [-4, -24], chest: [-8, -60], head: { x: 0, y: -104, tilt: -10, turn: 0.4 },
    nearArm: [[10, -44], [26, -36]], farArm: [[-20, -42], [-30, -14]],
    nearLeg: [[26, -14], [52, -8]], farLeg: [[20, -12], [46, -4]],
  })

  /** His tongue out, a long cross-eyed look down at it (it's gone purple:
   * the page colours it), and a grin. */
  async function lookAtTongue() {
    await faceTo({ tongue: 1, open: 0.25, eyes: 1, joy: 0, look: 1, lift: 1, brows: 0.5, small: 0 }, 200)
    k.perk('both', 900)
    await blend(add, 'tilt', 16, 300)
    await pause(rnd(900, 1100))
    await faceTo({ smile: 1, open: 0.6, eyes: 0, joy: 1, tongue: 0.5, look: 0, lift: 0.3 }, 200)
    blend(add, 'tilt', 0, 300)
    await pause(600)
    await faceOff(300)
  }

  const gestures = { lookAtTongue, bliss, showOff, yuck, wagFinger, wary, peekOver, gnaw, climb, climbDown, aww, bowlShake, slump, mope, bowlBark, tugged, freed, squint, swish, yanked, strain, sulk, hearsBee, leapFright, barkUp, smugTurn, spunRound, glare, puzzled, waitForDrop, hiccups, tryToFly, crossEyed, blow, puffUp, slipped }
  Reksio.addGestures(gestures)

})()
