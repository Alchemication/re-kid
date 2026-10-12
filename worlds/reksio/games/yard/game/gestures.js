// Reksio's everyday gestures: bark, nod, lick, lap, hop, sniff, scratch, the
// play-bow, chasing and biting his tail, pouncing, howling, startling,
// catching drops, shaking, yawning, and resting (sit, lie down, nap). Each is
// made from his kit (Reksio.kit: blends of his layers on the game's Clock)
// and added with Reksio.addGestures, so relax() cuts it short like any other
// and it counts as a gesture under way. reksio.js holds what they are made
// of; antics.js holds the bigger gags' own moves.

// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* global Clock, Sound, Music, Figure, Reksio */
(() => {
  const NAPS = ['nap', 'curl', 'sprawl']
  // a bark is eager, cross or cheerful, never quite the same twice
  const BARK_FACES = [{ open: 0.75, smile: 0.3, lift: 0.6 }, { open: 0.8, smile: -0.3, brows: -0.8 }, { open: 0.7, smile: 0.8, eyes: 0, joy: 1 }]
  const k = Reksio.kit
  const { blend, pause, faceTo, faceOff, actTo, actOff, onFours, upright, settle, rise, basePose, add, random, rnd, rndInt, pickOne } = k
  const { EASE_OUT, EASE_IN, OVERSHOOT } = k
  const F = k.POSES

  // ------------------------------------------------------------ small moves

  async function bark() {
    const big = rnd(0.7, 1.3)
    faceTo(pickOne(BARK_FACES), 60)
    Sound.bark()
    k.tell('bark', Reksio.mouth())
    await blend(add, 'tilt', -16 * big, 110, EASE_OUT)
    await blend(add, 'tilt', 0, 110)
    await blend(add, 'tilt', -12 * big, 100, EASE_OUT)
    await blend(add, 'tilt', 0, 110)
    await faceOff(80)
  }

  /** Head down (positive) or up (negative) by deg, held for ms. */
  async function nod(deg, ms) {
    await blend(add, 'tilt', deg, ms * 0.2)
    await pause(ms * 0.65)
    await blend(add, 'tilt', 0, ms * 0.15)
  }

  /** Lick his lips: the tongue out over his chin and back. */
  async function lick() {
    await faceTo({ tongue: 1, open: 0.2 }, 160, EASE_OUT)
    await pause(200)
    await faceOff(160)
  }

  /** The bowl's level, his head lowered to it: on all fours, nose down. */
  const headDown = (deg) => Figure.vary(basePose(), { head: { y: basePose().head.y + 30, tilt: deg } })

  /** Lap from a bowl: quick little dips with the tongue out, n times. */
  async function lap(n) {
    await onFours()
    await actTo(headDown(22), 220, EASE_OUT)
    faceTo({ tongue: 0.8, open: 0.3, ...(random() < 0.5 ? { eyes: 0, joy: -1 } : {}) }, 120)
    for (let i = 0; i < n; i++) {
      Sound.lap()
      await blend(add, 'tilt', 8, 95)
      await blend(add, 'tilt', 0, 95)
    }
    await faceOff(120)
    await actOff(260)
    await upright()
  }

  /** A happy hop on the spot; height and count vary unless given. */
  async function hop(height = rnd(30, 56), times = random() < 0.3 ? 2 : 1) {
    faceTo(pickOne([{ smile: 1, open: 0.5 }, { smile: 1, open: 1, eyes: 0, joy: 1, teeth: 1 }, { smile: 1, open: 0.6, tongue: 0.7 }]), 120)
    // sometimes both arms go up for joy, as he cheers in Sportowiec (362 s)
    // (only his arms: his legs may go on walking, as when a sneeze blows him back)
    if (k.fours < 0.5 && random() < 0.5) actTo(Figure.vary(basePose(), { nearArm: F.armsWide.nearArm, farArm: F.armsWide.farArm }), 160, OVERSHOOT, true)
    for (let i = 0; i < times; i++) {
      Sound.hop()
      Music.react.hop()
      const h = (i ? height * 0.6 : height) / k.SCALE
      await blend(add, 'dy', 5, 90, EASE_OUT)
      await blend(add, 'dy', -h, 180 + h * 1.5, EASE_OUT)
      await blend(add, 'dy', 3, 150 + h, EASE_IN)
      await blend(add, 'dy', 0, 80)
    }
    await faceOff(150)
    if (k.posing) await actOff(200)
  }

  /** Nose to the ground, a few sniffs (how many, and how low, varies). */
  async function sniff(times = rndInt(2, 5)) {
    await onFours()
    await actTo(Figure.vary(F.sniff, { head: { tilt: rnd(20, 32) }, face: { eyes: rnd(0.4, 0.8), brows: rnd(0, 0.5) } }), 260)
    for (let i = 0; i < times; i++) {
      Sound.sniff()
      const ms = rnd(200, 320)
      await blend(add, 'tilt', -5, ms / 2)
      await blend(add, 'tilt', 0, ms / 2)
    }
    await actOff(300)
    await upright()
  }

  /** Glance the other way, then back (unless he has set off meanwhile). */
  async function lookAround(ms = rnd(600, 1400)) {
    const was = Reksio.facing
    Reksio.face(-was)
    await pause(ms)
    if (!k.setOff && Reksio.facing === -was) Reksio.face(was)
  }

  /** Look up at the sky (or the bird) for a moment. */
  async function lookUp(ms = rnd(900, 1800)) {
    if (random() < 0.5) faceTo({ lift: 1, open: 0.3, o: 0.6, smile: 0 }, ms * 0.2) // wonder
    await blend(add, 'tilt', rnd(-28, -18), ms * 0.2)
    await pause(ms * 0.6)
    await blend(add, 'tilt', 0, ms * 0.2)
    await faceOff(150)
  }

  /** Scratch behind the ear with a back leg, sitting, head tilted to meet it. */
  async function scratch(times = rndInt(4, 8)) {
    const sitting = Figure.vary(F.sitDog, { nearLeg: [[30, -46], [34, -82]], head: { tilt: 20 } })
    await actTo(sitting, 260)
    faceTo({ eyes: 0, joy: -1, smile: 1, tongue: random() < 0.5 ? 0.6 : 0 }, 200) // bliss
    Sound.scratch()
    for (let i = 0; i < times; i++) {
      await blend(add, 'kick', 10, 70)
      await blend(add, 'kick', 0, 70)
    }
    faceOff(200)
    await actOff(250)
  }

  /** A play-bow: front down, rear up, tail going; sometimes a bark. */
  async function playBow() {
    const ms = rnd(900, 1500)
    await actTo(Figure.vary(F.bowStretch, { face: { eyes: 1, joy: 0, open: 0.3, smile: 1 } }), ms * 0.2)
    blend(add, 'wag', 1.5, ms * 0.1)
    await pause(ms * 0.6)
    await actOff(ms * 0.2)
    if (random() < 0.5) await bark()
  }

  /** Chase his own tail: a few quick turns with little hops. */
  async function chaseTail(turns = rndInt(3, 5)) {
    const was = Reksio.facing
    await onFours(160)
    for (let i = 0; i < turns; i++) {
      Reksio.face(-Reksio.facing)
      Sound.step()
      await blend(add, 'dy', -8, 100, EASE_OUT)
      await blend(add, 'dy', 0, 100, EASE_IN)
    }
    if (!k.setOff) Reksio.face(was)
    await upright()
  }

  /** Rear up on his hind legs and stamp down with both front paws; onImpact
   * runs as they land. */
  async function stamp(onImpact) {
    const up = Figure.vary(F.stand, {
      nearArm: [[30, -122], [42, -144]], farArm: [[4, -124], [16, -146]],
      head: { tilt: -10 }, face: { smile: 1, open: 0.4 },
    })
    const down = Figure.vary(F.onFours, {
      nearArm: [[24, -22], [26, 0]], farArm: [[16, -22], [16, 0]],
      head: { tilt: 12 }, face: { eyes: 0, joy: 1, smile: 1 },
    })
    await actTo(up, rnd(200, 260), EASE_OUT)
    await actTo(down, 110, EASE_IN)
    onImpact()
    await pause(80)
    await actOff(200)
  }

  /** Snap the jaws shut, quick, n times. */
  async function snap(n = 1) {
    for (let i = 0; i < n; i++) {
      await faceTo({ open: 0.6, teeth: 1, smile: 0.2, brows: -0.6 }, 60)
      await pause(30)
      Sound.snap()
      k.tell('snap', Reksio.mouth())
      await faceTo({ open: 0, teeth: 0 }, 50)
      await pause(60)
    }
    await faceOff(80)
  }

  /** Where his head is in the scene. */
  const headAt = () => k.toScene([basePose().head.x, basePose().head.y])

  /** Watch something that moves: turn to it and follow it with the head for
   * ms. where() returns its current {x, y} (or null once it's gone). */
  async function watch(where, ms = rnd(1500, 3000)) {
    const end = Clock.now() + ms
    while (Clock.now() < end && !k.setOff) {
      const p = where()
      if (!p) break
      if (Math.abs(p.x - Reksio.x) > 40) Reksio.face(p.x > Reksio.x ? 1 : -1)
      const h = headAt()
      const angle = (Math.atan2(p.y - h.y, Math.abs(p.x - h.x)) * 180) / Math.PI
      add.tilt = Math.max(-40, Math.min(30, angle))
      await Clock.frame()
    }
    await blend(add, 'tilt', 0, 200)
  }

  /** Pounce towards x: a stretched leap forward with snapping jaws. */
  async function pounce(tx) {
    const x = Reksio.x
    Reksio.face(tx > x ? 1 : -1)
    const leap = Math.max(-160, Math.min(160, tx - x))
    onFours(120)
    actTo(F.leap, 220, EASE_OUT, true)
    Reksio.walkTo(x + leap)
    const up = k.loose(blend(add, 'dy', -42, 280, EASE_OUT).then(() => blend(add, 'dy', 0, 340, EASE_IN)))
    await pause(200)
    await snap(2)
    await up
    await actOff(200)
    await upright()
  }

  /** Chase and bite his own tail: fast turns, snapping. */
  async function biteTail(turns = rndInt(4, 7)) {
    const was = Reksio.facing
    await onFours(160)
    for (let i = 0; i < turns; i++) {
      Reksio.face(-Reksio.facing)
      if (i % 2) Sound.snap()
      faceTo({ open: i % 2 ? 0.6 : 0, teeth: i % 2 }, 40)
      await blend(add, 'dy', -6, 75, EASE_OUT)
      await blend(add, 'dy', 0, 75, EASE_IN)
    }
    await faceOff(80)
    if (!k.setOff) Reksio.face(was)
    await shake()
    await upright()
  }

  /** Howl at the sky, sitting up. */
  async function howl() {
    Sound.howl()
    const howling = Figure.vary(F.sitDog, { head: { tilt: -40, turn: 0.8 }, face: { eyes: 0, joy: -1, open: 0.6, o: 0.8, smile: 0 } })
    await actTo(howling, 320)
    await pause(960)
    await actOff(320)
  }

  /** Startled by something in front: a yelp, a surprised face, and a hop
   * backwards. */
  async function startle() {
    Sound.yelp()
    const back = Reksio.facing > 0 ? -60 : 60
    Reksio.walkTo(Reksio.x + back)
    Reksio.face(back > 0 ? -1 : 1) // keep facing the thing that startled him
    faceTo({ lift: 1, brows: 0.6, open: 0.5, o: 1, smile: 0 }, 60)
    await blend(add, 'dy', -28, 210, EASE_OUT)
    await blend(add, 'dy', 0, 210, EASE_IN)
    await faceOff(200)
  }

  /** Head up, tongue out: catching raindrops. */
  async function catchDrops(n = rndInt(3, 6)) {
    const mine = k.relaxes
    await blend(add, 'tilt', -34, 300)
    await faceTo({ tongue: 1, open: 0.35, eyes: 0, joy: 1, smile: 0.8 }, 120)
    for (let i = 0; i < n; i++) {
      await pause(rnd(250, 500))
      if (mine !== k.relaxes) return
      Sound.lap()
      k.loose(blend(add, 'tilt', -28, 80).then(() => blend(add, 'tilt', -34, 80)))
    }
    await faceOff(150)
    await blend(add, 'tilt', 0, 300)
  }

  /** A shake of the body, nose to tail. */
  async function shake() {
    for (const d of [9, -9, 8, -8, 6, -6, 0]) await blend(add, 'lean', d, 80)
  }

  /** A proper wet-dog shake: fast and hard from nose to tail, the head
   * swinging against the body, then a last little shiver. */
  async function shakeDry() {
    await onFours(160)
    for (const d of [14, -14, 13, -13, 12, -12, 10, -10, 7, -7, 3, 0]) {
      blend(add, 'tilt', -d * 1.3, 58)
      blend(add, 'wag', d / 4, 58)
      await blend(add, 'lean', d, 58)
    }
    await pause(120)
    for (const d of [3, -3, 2, -2, 0]) await blend(add, 'lean', d, 52)
    await upright()
  }

  /** Paddle the front paws, as when digging, for ms. */
  async function paddle(ms) {
    await onFours(160)
    const strokes = Math.max(1, Math.round(ms / 180))
    for (let i = 0; i < strokes; i++) {
      await blend(add, 'dig', 1, 90)
      await blend(add, 'dig', -1, 90)
    }
    await blend(add, 'dig', 0, 60)
  }

  // ------------------------------------------------------------ resting

  /** A little look about while resting: the head turns up, down, along. */
  function glance(range) {
    const to = rnd(-range, range * 0.5)
    const ms = rnd(1400, 2400)
    k.loose(blend(add, 'tilt', to, ms * 0.3).then(() => pause(ms * 0.45)).then(() => blend(add, 'tilt', 0, ms * 0.25)))
  }

  /** A wag of the tail, sitting. */
  function wag() {
    k.loose(blend(add, 'wag', 2, 180).then(() => blend(add, 'wag', -1, 180)).then(() => blend(add, 'wag', 0, 180)))
  }

  /** Sit and watch the yard for a while, looking about. */
  async function sit(ms = rnd(4000, 8000)) {
    const mine = k.relaxes
    await settle('sit', 700)
    const end = Clock.now() + ms
    while (Clock.now() < end) {
      await pause(rnd(1500, 3000))
      if (mine !== k.relaxes) return
      if (random() < 0.7) glance(16)
      else wag()
    }
    if (mine !== k.relaxes) return
    await rise()
  }

  /** Lie down, head up, looking about. */
  async function lieDown(ms = rnd(6000, 10000)) {
    const mine = k.relaxes
    await settle('sit', 650)
    if (mine !== k.relaxes) return
    await settle('lie', 800)
    const end = Clock.now() + ms
    while (Clock.now() < end) {
      await pause(rnd(1800, 3200))
      if (mine !== k.relaxes) return
      glance(22)
    }
    if (mine !== k.relaxes) return
    await rise()
  }

  /** A nap in the open: lie down, then sleep, head on paws, curled up or
   * sprawled out, with little snores; wake with a proper dog stretch. */
  async function nap(ms = rnd(10000, 18000)) {
    const mine = k.relaxes
    await settle('sit', 650)
    if (mine !== k.relaxes) return
    await settle('lie', 800)
    if (mine !== k.relaxes) return
    Sound.from(150, Sound.yawn)
    await settle(NAPS[Math.floor(random() * NAPS.length)], 1200)
    const end = Clock.now() + ms
    let n = 0
    while (Clock.now() < end) {
      await pause(1700)
      if (mine !== k.relaxes) return
      if (n++ % 2 === 0) Sound.from(250, Sound.snore)
      Reksio.floatZ()
    }
    if (mine !== k.relaxes) return
    await settle('lie', 700)
    await rise()
    if (mine !== k.relaxes) return
    await wakeUp()
    if (random() < 0.5) await dogStretch(mine)
    if (mine !== k.relaxes) return
    await shake()
  }

  /** The dog stretch: front legs reaching forward, rump up, then the back
   * legs stretched out behind. */
  async function dogStretch(mine) {
    await settle('bowStretch', 800)
    await pause(900)
    if (mine !== k.relaxes) return
    await settle('backStretch', 700)
    await pause(700)
    if (mine !== k.relaxes) return
    await rise(450)
  }

  /** A yawn as wide as size (0 to 1): upright, mouth open, eyes squeezed,
   * arms flung out wider the bigger it is. */
  function yawnPose(size) {
    const p = Figure.mix(F.stand, F.armsWide, 0.25 + 0.75 * size)
    return Figure.vary(p, {
      head: { tilt: -4 - 10 * size, turn: 0.1 },
      face: { eyes: 0, joy: 1, open: 0.45 + 0.55 * size, smile: 0.1, teeth: 0, tongue: size > 0.8 ? 0.4 : 0 },
    })
  }

  /** Yawn: how many times and how wide vary unless given. Each yawn after
   * the first is a little smaller, with a breath between. */
  async function yawn(times = random() < 0.3 ? 2 : 1, size = rnd(0.4, 0.75)) {
    let s = size
    for (let i = 0; i < times; i++) {
      Sound.yawn(s)
      await actTo(yawnPose(s), 280 + 260 * s)
      await pause(300 + 500 * s)
      if (i < times - 1) {
        await actTo(Figure.vary(yawnPose(s * 0.3), { face: { open: 0.1 } }), 220) // a breath
        await pause(rnd(120, 320))
        s = Math.max(0.3, s * rnd(0.6, 0.95))
      }
    }
    await actOff(390)
  }

  /** Waking up, he yawns wide and loud, sometimes more than once, arms
   * flung out: the cartoon's moment just out of the doghouse (Aktor,
   * Pocieszyciel, Kompan; world.yaml, characters[reksio].moves[waking-yawn]). */
  function wakeUp(times = pickOne([1, 2, 2, 3])) {
    return yawn(times, rnd(0.8, 1))
  }

  Reksio.addGestures({
    shakeDry, bark, nod, lick, lap, shake, paddle, hop, sniff, lookAround, lookUp, scratch, playBow, chaseTail, yawn,
    stamp, snap, watch, pounce, biteTail, howl, sit, lieDown, nap, startle, catchDrops, wakeUp,
  })
})()
