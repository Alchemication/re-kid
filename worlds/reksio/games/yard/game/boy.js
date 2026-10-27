// Reksio's boy (world.yaml, characters[boy]): where he is, which way he
// faces, his walk, what keeps him alive standing about (blinks, breathing, a
// glance at Reksio), and his gestures: calling Reksio, waving, pointing,
// crouching, pushing, lifting, reaching, laughing, cheering, scratching his
// curls, nodding and shaking his head. Drawn by boyfigure.js. A gag brings him
// out (comeOut), uses his gestures, and sends him in (goIn); what he holds is
// the gag's to draw, at handAt().
//
// Built as Reksio is (reksio.js): each frame his pose is composed from layers
// moved only by blends on the game's Clock: rest (the pose he is in), act (a
// gesture's pose over it, by weight), face (a gesture's face, by weight), then
// what life adds and his walk's stride. relax() cuts every blend short
// (whoever awaits one hears an AbortError) and blends him back to standing
// from where he was drawn, so nothing is left frozen part-way.

// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* global Clock, Debug, Figure, Motion, BoyFigure */
/* exported Boy */
const Boy = (() => {
  const GROUND = 812 // y of his feet, in scene units (Reksio's ground)
  const SCALE = 0.9 // a child of seven by the house and the doghouse: about one and a half doghouses tall with his curls (Adam, 2026-10-27: at 1.2 he looked as big as the house)
  const SPEED = 165 // walking, units/s: a little slower than Reksio's trot
  const ACCEL = 900
  const STEP = 58 // ground covered by one step
  const STRIDE = { reach: 22, lift: 16, knee: 12, swing: 16, bob: 3 } // a step's numbers: how far a foot goes ahead, how high it lifts, the knee's bend, the arms' swing, the body's bob
  const BLINK_EVERY_MS = [2200, 5200]
  const BLINK_MS = 140
  const BREATH_MS = 3600 // one breath, in and out: his chest rises a little
  const GLANCE_EVERY_MS = [2500, 6000] // standing free, now and then he looks to Reksio, or the child
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const P = BoyFigure.POSES

  const random = Debug.random('boy') // this part's own random stream (debug.js)
  const life = Debug.random('boy-life') // drawn every frame: its own stream
  const rnd = (lo, hi) => lo + random() * (hi - lo)

  let root = null // <g>: placed at x, GROUND
  let flip = null
  let paint = null
  let x = 0
  let facing = 1
  let target = null
  let arrive = null // resolves the current walk: true if he got there
  let v = 0
  let speed = SPEED // this walk's
  let phase = 0
  let watching = () => null // where Reksio is: the game says (init)
  let nextBlink = 0
  let blinkUntil = 0
  let nextGlance = 0
  let glanceTurn = null // a glance turns his head this far, for a moment
  let glanceUntil = 0
  let lastT = 0
  let doing = 0 // gestures under way

  // ------------------------------------------------------------ blends

  const blends = Motion.blends() // moved in step(), every frame
  const { blend, pause } = blends

  // ------------------------------------------------------------ his state

  const rest = { from: P.stand, to: P.stand, k: 1 }
  const act = { from: P.stand, to: P.stand, k: 1, w: 0 }
  const face = { to: {}, w: 0 }
  const add = { dy: 0, tilt: 0, swing: 0, pat: 0, turn: 0 } // swing: a hand waving side to side; pat: hands patting knees
  let last = P.stand // the pose drawn last frame

  /** Into a resting pose: stand, crouch, push… */
  function settle(name, ms = 500) {
    rest.from = last
    rest.to = P[name]
    rest.k = 0
    act.w = 0
    return blend(rest, 'k', 1, ms)
  }

  /** A gesture's pose over his own, by weight. */
  function actTo(pose, ms) {
    act.from = Figure.mix(Figure.mix(rest.from, rest.to, rest.k), act.to, act.w)
    act.to = pose
    act.k = 0
    act.w = 1
    return blend(act, 'k', 1, ms)
  }
  const actOff = (ms = 400) => blend(act, 'w', 0, ms)

  /** A gesture's face: changes to his face, by weight. */
  function faceTo(changes, ms = 200) {
    face.to = changes
    return blend(face, 'w', 1, ms)
  }
  const faceOff = (ms = 300) => blend(face, 'w', 0, ms)

  function compose(t) {
    let p = Figure.mix(rest.from, rest.to, rest.k)
    if (act.w > 0) p = Figure.mix(p, Figure.mix(act.from, act.to, act.k), act.w)
    if (face.w > 0) for (const [k, val] of Object.entries(face.to)) p.face[k] += (val - p.face[k]) * face.w
    // life: a breath, a blink, a glance
    const breath = breathAt(t) * 0.4
    p.chest[1] -= breath
    p.head[1] -= breath
    if (t < blinkUntil) p.face.blink = Math.max(p.face.blink, 1)
    if (glancing(t)) p.turn += (glanceTurn - p.turn) * 0.8
    p.turn = Math.max(0, Math.min(1, p.turn + add.turn))
    p.tilt += add.tilt
    // a hand waving: the raised hand side to side
    if (add.swing) p.arms.near[1][0] += add.swing * 14
    if (add.pat) for (const arm of ['near', 'far']) p.arms[arm][1][1] += add.pat * 8
    // walking: legs, arms and a bob
    const walk = Math.min(1, Math.abs(v) / speed)
    if (walk > 0.01) stride(p, walk)
    for (const part of [p.hip, p.chest, p.head]) part[1] += add.dy
    return p
  }

  /** His walk: the feet taking turns ahead, the lifted one's knee bent, arms swinging against them, a bob. */
  function stride(p, w) {
    const s = Math.sin(phase)
    const c = Math.cos(phase)
    const legs = [['near', 1], ['far', -1]]
    for (const [leg, sign] of legs) {
      const [knee, ankle] = p.legs[leg]
      const ahead = sign * s * STRIDE.reach * w
      const lift = Math.max(0, sign * c) * STRIDE.lift * w
      ankle[0] += ahead
      ankle[1] -= lift
      knee[0] += ahead * 0.6 + lift * 0.5
      knee[1] -= lift * 0.6
      p.feet[leg] += -sign * s * 10 * w
      const [elbow, hand] = p.arms[leg]
      elbow[0] -= ahead * 0.35
      hand[0] -= sign * s * STRIDE.swing * w
    }
    const bob = Math.abs(c) * STRIDE.bob * w
    for (const part of [p.hip, p.chest, p.head]) part[1] -= bob
    p.scarf = -s * w * 0.6 + w * 0.6
  }

  /** His breath, in steps, so he isn't redrawn every frame for it. */
  const breathAt = (t) => Math.round(Math.sin((t / BREATH_MS) * Math.PI * 2) * 3)
  const glancing = (t) => glanceTurn !== null && t < glanceUntil && !doing

  let drawn = '' // what life showed when he was last drawn standing still: unchanged, nothing to redraw
  function draw(t) {
    if (t >= blinkUntil && t >= nextBlink) {
      blinkUntil = t + BLINK_MS
      nextBlink = t + BLINK_MS + BLINK_EVERY_MS[0] + life() * (BLINK_EVERY_MS[1] - BLINK_EVERY_MS[0])
    }
    const still = target === null && v === 0 && !blends.moving() // a pause moves nothing
    const shown = `${x} ${facing} ${breathAt(t)} ${t < blinkUntil} ${glancing(t)}`
    if (still && shown === drawn) return
    drawn = still ? shown : ''
    last = compose(t)
    paint.draw(last)
    const place = `translate(${x}px, ${GROUND}px)`
    if (root.style.transform !== place) root.style.transform = place
    const turned = `scale(${SCALE * facing}, ${SCALE})`
    if (flip.style.transform !== turned) flip.style.transform = turned
  }

  function step() {
    const t = Clock.now()
    const dt = Math.min(0.05, (t - lastT) / 1000)
    lastT = t
    blends.run()
    if (!root || root.style.display === 'none') {
      if (target !== null) arrived(false) // gone in: a walk he was on ends
      return
    }
    if (target !== null) {
      const d = target - x
      const want = Math.sign(d) * speed
      v += Math.sign(want - v) * Math.min(Math.abs(want - v), ACCEL * dt)
      // slow down to arrive
      const brake = Math.sqrt(2 * ACCEL * Math.abs(d))
      if (Math.abs(v) > brake) v = Math.sign(v) * brake
      x += v * dt
      phase += (Math.abs(v) * dt * Math.PI) / STEP
      if (Math.abs(d) < 2 || Math.sign(target - x) !== Math.sign(d)) {
        x = target
        arrived(true)
      }
    } else if (v !== 0) v = 0
    // free and still: now and then a glance to Reksio, or out at the child
    if (!doing && target === null && t >= nextGlance) {
      nextGlance = t + rnd(...GLANCE_EVERY_MS)
      const r = watching()
      const toward = r === null ? 0 : Math.sign(r - x) === facing ? 0.9 : 0.1
      glanceTurn = random() < 0.4 ? 0.1 : toward // to the child, or to Reksio
      glanceUntil = t + rnd(900, 1800)
    }
    draw(t)
  }

  function arrived(ok) {
    target = null
    v = 0
    const done = arrive
    arrive = null
    done?.(ok)
  }

  // ------------------------------------------------------------ moving

  /** Walk to tx (slower with a speed: pushing something); resolves true
   * there, false if stopped or sent elsewhere. */
  function walkTo(tx, { speed: s = SPEED } = {}) {
    if (arrive) arrived(false)
    if (Math.abs(tx - x) < 2) return Promise.resolve(true)
    facing = tx > x ? 1 : -1
    target = tx
    speed = s
    return new Promise((resolve) => (arrive = resolve))
  }

  function face_(dir) {
    if (dir) facing = dir > 0 ? 1 : -1
  }

  /** Cut every gesture short and blend back to standing from where he is. */
  function relax() {
    if (arrive) arrived(false)
    blends.cut()
    rest.from = last
    rest.to = P.stand
    rest.k = 0
    act.w = 0
    face.w = 0
    Object.assign(add, { dy: 0, tilt: 0, swing: 0, pat: 0, turn: 0 })
    blend(rest, 'k', 1, 300)
  }

  // ------------------------------------------------------------ gestures

  /** A gesture: counted while under way, so life leaves his head alone. */
  const busy = (fn) => async (...args) => {
    doing += 1
    try {
      return await fn(...args)
    } finally {
      doing -= 1
    }
  }

  const gestures = {
    /** "Come here!": leaning to Reksio, patting his knees. */
    async call(times = 3) {
      await actTo(P.call, 300)
      for (let i = 0; i < times; i++) {
        await blend(add, 'pat', 1, 130)
        await blend(add, 'pat', 0, 150)
      }
      await pause(250)
      await actOff(350)
    },
    /** A wave, the hand up and side to side. */
    async wave(times = 3) {
      await actTo(P.wave, 300)
      for (let i = 0; i < times; i++) {
        await blend(add, 'swing', 1, 180)
        await blend(add, 'swing', -0.6, 180)
      }
      await blend(add, 'swing', 0, 120)
      await actOff(350)
    },
    /** Pointing ahead (facing dir first). */
    async point(dir, ms = 900) {
      face_(dir)
      await actTo(P.point, 300)
      await pause(ms)
      await actOff(350)
    },
    /** A finger on his own nose: "a nose!" */
    async touchNose(ms = 900) {
      await actTo(P.nose, 350)
      await pause(ms)
      await actOff(350)
    },
    /** Puzzled: scratching his curls. */
    async scratch(ms = 1100) {
      await actTo(P.scratch, 350)
      for (let i = 0; i < 3; i++) {
        await blend(add, 'tilt', 4, ms / 6)
        await blend(add, 'tilt', 0, ms / 6)
      }
      await actOff(350)
    },
    /** Laughing: head back, shoulders bobbing. */
    async laugh(times = 4) {
      await actTo(P.laugh, 250)
      for (let i = 0; i < times; i++) {
        await blend(add, 'dy', -4, 110)
        await blend(add, 'dy', 0, 120)
      }
      await actOff(400)
    },
    /** Both arms up, a hop. */
    async cheer() {
      await actTo(P.cheer, 220)
      await blend(add, 'dy', -26, 200, (t) => 1 - (1 - t) ** 2)
      await blend(add, 'dy', 0, 200, (t) => t * t)
      await pause(500)
      await actOff(400)
    },
    /** A nod, yes; or a shake of the head, no (no). */
    async nod(no = false) {
      for (let i = 0; i < 2; i++) {
        if (no) {
          await blend(add, 'turn', -0.35, 160)
          await blend(add, 'turn', 0.25, 200)
        } else {
          await blend(add, 'tilt', 9, 150)
          await blend(add, 'tilt', -2, 150)
        }
      }
      await blend(add, no ? 'turn' : 'tilt', 0, 150)
    },
    /** Reaching ahead with his near hand (to put something in place), and back. */
    async reach(ms = 500) {
      await actTo(P.reach, 350)
      await pause(ms)
      await actOff(350)
    },
    /** Into a resting pose (stand, crouch, push, lift…), staying there. */
    settle,
    /** Back on his feet. */
    stand: (ms = 400) => settle('stand', ms),
    /** A face for a while: { smile, open, brows, joy }. */
    async look(changes, ms = 800) {
      await faceTo(changes, 200)
      await pause(ms)
      await faceOff(300)
    },
  }

  // ------------------------------------------------------------ in and out

  function build(parent) {
    root = document.createElementNS(SVG_NS, 'g')
    root.setAttribute('id', 'boy')
    root.style.display = 'none'
    flip = document.createElementNS(SVG_NS, 'g')
    root.appendChild(flip)
    parent.appendChild(root)
  }

  const api = {
    /** Where he lives in the page (a <g> of the scene), and how to find
     * Reksio (watch: () => his x, for a glance). Dressed for winter or not. */
    init({ parent, winter = false, watch = () => null }) {
      build(parent)
      paint = BoyFigure.mount(flip, { winter })
      watching = watch
      lastT = Clock.now()
      Clock.every(0, step)
    },
    /** He comes into the scene at x (out of the house door), facing dir. */
    comeOut(at, dir = 1) {
      x = at
      facing = dir
      root.style.display = 'inline'
      drawn = ''
      Debug.trace('boy out', { x: Math.round(x) })
      draw(Clock.now())
    },
    /** His cap off (on: true), or back on: a winter cap given away. */
    capOff(on) {
      paint.capOff(on)
      drawn = ''
    },
    /** Out of the scene (into the house). */
    goIn() {
      if (arrive) arrived(false)
      root.style.display = 'none'
      Debug.trace('boy in', {})
    },
    get out() { return !!root && root.style.display !== 'none' },
    get x() { return x },
    get facing() { return facing },
    get walking() { return target !== null },
    get busy() { return doing > 0 },
    /** Where his hand is in the scene: for what he holds (which: 'near', 'far'). */
    handAt(which = 'near') {
      const [hx, hy] = BoyFigure.handAt(last, which)
      return { x: x + hx * SCALE * facing, y: GROUND + hy * SCALE }
    },
    walkTo,
    face: face_,
    relax,
    pause,
  }
  for (const [name, fn] of Object.entries(gestures)) api[name] = busy(fn)
  return api
})()
