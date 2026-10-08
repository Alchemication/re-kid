// Reksio himself: where he is, which way he faces, how he moves (upright for
// a walk, on all fours for a run, easing in and out), the dachshund stretch,
// and his gestures (bark, nod, hop, sniff, scratch, naps, ducking into the
// doghouse). Drawn by figure.js, the way the cartoon draws him.
//
// How he is drawn is decided in one place: compose() builds a pose (plain
// numbers, figure.js) from his state at every frame, and draw() hands it to
// the figure. The state is a few layers, each moved only by blends on the
// game's Clock:
// - rest: the pose he is in (standing, sitting, lying, asleep…), blending
//   from where he was to where he is going;
// - stance: standing upright (0) or on all fours (1);
// - act: a gesture's own pose for his whole body, over the rest, by weight;
// - face: a gesture's face (a bark, a yawn, his tongue out), by weight;
// - add: small things added on top: a head tilt, a hop, a lean, a kick.
// Under the gestures, life.js keeps him alive when he is free (how he
// stands, his glances and moods) and always (blinks, ears and tail swinging
// after him). Walking adds its stride as he goes. relax() cuts every blend short (whoever
// awaits one hears an AbortError) and blends him back to standing from
// exactly where he was drawn, so nothing is ever left frozen part-way.

/* global Clock, Debug, Sound, Music, Creatures, Layout, Figure, Motion, Life */
/* exported Reksio */
const Reksio = (() => {
  const GROUND = 812 // y of his feet, in scene units
  const SCALE = 1.2 // upright, he stands about as tall as his doghouse, as in the cartoon
  const GAITS = {
    // speed in scene units/s; cadence in stride radians/s; stride, lift and
    // arm swing in his own units; fours: upright (0) or on all fours (1)
    walk: { speed: 250, cadence: 11, stride: 12, lift: 9, swing: 9, bob: 3, fours: 0 },
    run: { speed: 600, cadence: 17, stride: 22, lift: 14, swing: 20, bob: 8, fours: 1 },
  }
  const RUN_FROM = 520 // trips longer than this are run, not walked
  const ACCEL = 1500 // how quickly he speeds up and slows down (units/s²)
  const MAX_STRETCH = 230 // longest dachshund stretch, in his own units
  const STRETCH_RATE = 210 // how fast he stretches while held (units/s)
  const RELAX_MS = 220 // how fast he springs up from a rest when asked to do something
  const STANCE_MS = 260 // dropping to all fours, or standing up
  const MIN_X = Layout.MIN_X // the house wall is the yard's left end
  const MAX_X = Layout.MAX_X // the fence is its right end
  const F = Figure.POSES
  // the resting poses, by the names the yard knows them by
  const REST = { sit: F.sitDog, lie: F.lie, nap: F.nap, curl: F.curl, sprawl: F.sprawl, bowStretch: F.bowStretch, backStretch: F.backStretch }
  const LYING = ['lie', 'nap', 'curl', 'sprawl']
  const NAPS = ['nap', 'curl', 'sprawl']

  const $ = (id) => document.getElementById(id)
  const root = $('reksio')
  const scaler = $('rk-scale')
  const flip = $('rk-flip')
  const bob = $('rk-bob')
  const paint = Figure.mount(bob)

  let x = 1000
  let holding = false // carrying a bone
  let facing = 1
  let target = null
  let arrive = null // resolves the current walk: true if he got there
  let phase = 0
  let lastStepSign = 1
  let idleTime = 0
  let gait = GAITS.walk
  let v = 0 // current speed
  let stretch = 0 // how far his front half is pulled forward
  let stretching = false

  const clamp = (v) => Math.max(MIN_X, Math.min(MAX_X, v))
  const wait = Clock.wait
  const random = Debug.random('reksio') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)
  const rndInt = (lo, hi) => Math.floor(rnd(lo, hi + 1))
  const pickOne = (list) => list[Math.floor(random() * list.length)]
  const life = Life.create(Debug.random('life')) // every frame: its own stream
  const gaitRandom = Debug.random('gait') // each walk's own swagger
  let alive = null // what life adds this frame
  let doing = 0 // gestures under way: while any is, he isn't free for life's ways of standing
  let flavour = { lift: 1, swing: 1, bob: 1, tilt: 0 } // this walk's: a strut when proud

  // ------------------------------------------------------------ blends

  const EASE = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
  const EASE_OUT = (t) => 1 - (1 - t) ** 3
  const EASE_IN = (t) => t * t * t
  /** Lands a little past its mark and settles: a move with some snap. */
  const OVERSHOOT = (t) => 1 + (t - 1) ** 2 * (2.4 * (t - 1) + 1.4)

  const blends = [] // {obj, key, from, to, start, ms, ease, resolve, reject}
  const cutShort = () => Object.assign(new Error('cut short'), { name: 'AbortError' })

  /** Move obj[key] to `to` over ms of game time. Resolves when it gets there;
   * rejects (an AbortError) if relax() cuts it short. A newer blend of the
   * same number takes over from wherever this one got to. */
  function blend(obj, key, to, ms, ease = EASE) {
    for (const b of blends.filter((b) => b.obj === obj && b.key === key)) {
      blends.splice(blends.indexOf(b), 1)
      b.resolve()
    }
    return loose(new Promise((resolve, reject) => {
      blends.push({ obj, key, from: obj[key], to, start: Clock.now(), ms: Math.max(1, ms), ease, resolve, reject })
    }))
  }

  /** A promise that may be cut short with nobody waiting on it: whoever
   * awaits it hears; nobody else need. */
  function loose(promise) {
    promise.catch(() => {}) // cut short, unawaited: nothing to do
    return promise
  }

  // Blends move with the game's clock, every frame, whether or not he is being
  // drawn: a gesture always reaches its end (or is cut short).
  Clock.every(0, runBlends)
  function runBlends() {
    const now = Clock.now()
    for (const b of [...blends]) {
      const k = Math.min(1, (now - b.start) / b.ms)
      b.obj[b.key] = b.from + (b.to - b.from) * b.ease(k)
      if (k >= 1) {
        blends.splice(blends.indexOf(b), 1)
        b.resolve()
      }
    }
  }

  // ------------------------------------------------------------ his state

  let current = 'stand' // the resting pose he is in (or moving into): stand, sit, lie, nap…
  const stance = { fours: 0 } // standing: upright (0) or on all fours (1)
  const rest = { from: null, k: 1 } // blending from the pose `from` into `current`
  const act = { from: null, to: null, k: 1, w: 0, moving: false } // a gesture's pose, by weight w
  const face = { from: null, to: null, k: 1, w: 0 } // a gesture's face, by weight w
  const add = { tilt: 0, dy: 0, lean: 0, kick: 0, dig: 0, wag: 0 }
  let rising = false // springing up from a rest: he stays put until he's up
  let last = null // the pose drawn last frame

  const standing = () => Figure.mix(F.stand, F.onFours, stance.fours)
  const restPose = (name) => (name === 'stand' ? standing() : REST[name])
  const springing = () => rising && rest.k < 1

  function basePose() {
    const to = restPose(current)
    return rest.k >= 1 || !rest.from ? to : Figure.mix(rest.from, to, rest.k)
  }

  /** The pose to draw, from his state (without walking's stride). */
  function compose() {
    let p = basePose()
    if (alive) p = lively(p, alive)
    if (act.w > 0) p = Figure.mix(p, Figure.mix(act.from, act.to, act.k), act.w)
    if (face.w > 0) p = { ...p, face: Figure.mix(p.face, Figure.mix(face.from, face.to, face.k), face.w) }
    p = Figure.vary(p, { head: { tilt: p.head.tilt + add.tilt } })
    if (stretch) p = stretched(p, stretch)
    if (add.kick) p = Figure.vary(p, { nearLeg: [[p.nearLeg[0][0], p.nearLeg[0][1] - add.kick / 2], [p.nearLeg[1][0], p.nearLeg[1][1] - add.kick]] })
    if (add.dig) p = digging(p, add.dig)
    if (add.wag) p = Figure.vary(p, { tail: [p.tail[0] + add.wag * 6, p.tail[1] - Math.abs(add.wag) * 2] })
    if (holding) p = Figure.vary(p, { face: { bone: p.face.open < 0.15 && p.face.tongue < 0.1 ? 1 : 0 } })
    return p
  }

  /** What life adds: how he stands and looks about when free; blinks, eyes,
   * and ears and tail swinging after him always. */
  function lively(p, a) {
    const changes = {}
    if (a.standW > 0.01 && stance.fours < 0.5) {
      const arms = Figure.mix(F[a.standFrom], F[a.stand], a.standK)
      changes.nearArm = Figure.mix(p.nearArm, arms.nearArm, a.standW)
      changes.farArm = Figure.mix(p.farArm, arms.farArm, a.standW)
    }
    const w = a.faceW
    changes.head = { turn: p.head.turn + (a.turn - p.head.turn) * w, tilt: p.head.tilt + a.tilt * w }
    const face = Figure.mix(p.face, { ...p.face, ...a.face }, w)
    changes.face = { ...face, blink: Math.max(p.face.blink, a.blink), look: a.look }
    changes.ears = {
      near: [p.ears.near[0] + a.ears[0] * 0.4, p.ears.near[1] + a.ears[1] - a.ears[0] * 0.6],
      far: [p.ears.far[0] + a.ears[0] * 0.3, p.ears.far[1] + a.ears[1] * 0.7 - a.ears[0] * 0.4],
    }
    changes.tail = [p.tail[0] + a.tail * 0.5, p.tail[1] - Math.abs(a.tail) * 0.2]
    return Figure.vary(p, changes)
  }

  /** The dachshund stretch: his front half pulled forward by s. */
  function stretched(p, s) {
    const fwd = ([a, b]) => [a + s, b]
    return Figure.vary(p, {
      chest: fwd(p.chest), head: { x: p.head.x + s },
      nearArm: p.nearArm.map(fwd), farArm: p.farArm.map(fwd),
    })
  }

  /** Front paws paddling the earth back, as when digging (d from -1 to 1). */
  function digging(p, d) {
    const paw = (arm, k) => [arm[0], [arm[1][0] - 14 * k, arm[1][1] - 8 * Math.abs(k)]]
    return Figure.vary(p, { nearArm: paw(p.nearArm, d), farArm: paw(p.farArm, -d) })
  }

  /** Walking's stride, added to a pose: legs (and arms, or front legs) swing
   * and lift in turn. amount: 0 standing still, 1 at full speed. */
  function strideOf(p, amount) {
    const g = gait
    const lift0 = g.lift * flavour.lift
    const limb = (pair, offset, lift, swing = g.stride) => {
      const sw = Math.sin(phase + offset) * swing * amount
      const up = Math.max(0, Math.cos(phase + offset)) * lift * amount
      return [[pair[0][0] + sw * 0.6, pair[0][1] - up * 0.6], [pair[1][0] + sw, pair[1][1] - up]]
    }
    // going somewhere, he looks where he goes: his head turns side-on
    p = Figure.vary(p, { head: { turn: p.head.turn + (0.85 - p.head.turn) * Math.min(1, amount * 1.5), tilt: p.head.tilt + flavour.tilt * amount } })
    if (stance.fours < 0.5) {
      // upright: legs in turn, arms swinging against them
      return Figure.vary(p, {
        nearLeg: limb(p.nearLeg, 0, lift0), farLeg: limb(p.farLeg, Math.PI, lift0),
        nearArm: limb(p.nearArm, Math.PI, 0, g.swing * flavour.swing), farArm: limb(p.farArm, 0, 0, g.swing * flavour.swing),
      })
    }
    // on all fours: a walk moves diagonal pairs together; a run bounds,
    // front pair together, back pair together, out of step
    const run = g === GAITS.run
    return Figure.vary(p, {
      nearLeg: limb(p.nearLeg, run ? Math.PI : 0, lift0), farLeg: limb(p.farLeg, run ? Math.PI + 0.4 : Math.PI, lift0),
      nearArm: limb(p.nearArm, run ? 0 : Math.PI, lift0), farArm: limb(p.farArm, run ? 0.4 : 0, lift0),
    })
  }

  // ------------------------------------------------------------ drawing

  let drawnBob = ''
  let drawnFlags = ''

  /** Paint him from his state: the end of every frame. */
  function draw(walkAmount = 0) {
    let p = compose()
    if (walkAmount > 0) p = strideOf(p, walkAmount)
    last = p
    paint(p)
    const breathe = target === null && !stretching ? Math.sin(idleTime * 2.2) * 0.8 : 0
    const hopping = walkAmount > 0 ? -Math.abs(Math.sin(phase)) * gait.bob * flavour.bob * walkAmount : 0
    const t = `translateY(${(add.dy + breathe + hopping).toFixed(1)}px) rotate(${add.lean.toFixed(1)}deg)`
    if (t !== drawnBob) {
      drawnBob = t
      bob.style.transform = t
    }
    // what the browser tests and the rules read: is he drawn standing (not
    // resting), and is a gesture still posing him?
    const up = p.pelvis[1] < -38 && p.chest[1] < -38 && Math.abs(add.lean) < 15 ? '1' : '0'
    const posed = act.w > 0.01 && !act.moving ? '1' : '0'
    if (up + posed !== drawnFlags) {
      drawnFlags = up + posed
      root.setAttribute('data-up', up)
      root.setAttribute('data-posed', posed)
    }
  }

  function place() {
    root.style.transform = `translate(${x}px, ${GROUND}px)`
    flip.style.transform = `scaleX(${facing})`
  }

  /** Where a point of his (figure units) is in the scene. */
  const toScene = ([fx, fy]) => ({ x: x + facing * SCALE * fx, y: GROUND + SCALE * (fy + add.dy) })

  // ------------------------------------------------------------ layers

  /** A layer's blend to a new target: from wherever it is now. */
  function layerTo(layer, to, ms, ease) {
    if (layer.w <= 0.001) {
      layer.from = to
      layer.to = to
      layer.k = 1
      return blend(layer, 'w', 1, ms, ease)
    }
    layer.from = Figure.mix(layer.from, layer.to, layer.k)
    layer.to = to
    layer.k = 0
    layer.w = Math.max(layer.w, 0)
    return loose(Promise.all([blend(layer, 'k', 1, ms, ease), blend(layer, 'w', 1, ms, ease)]))
  }

  /** Pose his whole body for a gesture; moving: a gesture that travels (a
   * pounce), so walking may carry it along. */
  function actTo(pose, ms, ease = EASE, moving = false) {
    act.moving = moving
    return layerTo(act, pose, ms, ease)
  }
  const actOff = (ms, ease = EASE) => blend(act, 'w', 0, ms, ease)

  /** Change his face for a gesture: only what is named, the rest as it is. */
  function faceTo(changes, ms, ease = EASE) {
    return layerTo(face, { ...basePose().face, ...changes }, ms, ease)
  }
  const faceOff = (ms) => blend(face, 'w', 0, ms)

  const onFours = (ms = STANCE_MS) => blend(stance, 'fours', 1, ms)
  const upright = (ms = STANCE_MS) => blend(stance, 'fours', 0, ms)

  // ------------------------------------------------------------ walking

  /** Walk to x. Resolves true on arrival, false if another walk replaced it. */
  function walkTo(tx) {
    if (arrive) arrive(false)
    target = clamp(tx)
    if (Math.abs(target - x) > 2) facing = target > x ? 1 : -1
    // keep running if already running; otherwise pick by distance
    if (!(gait === GAITS.run && v > GAITS.walk.speed)) {
      gait = Math.abs(target - x) > RUN_FROM ? GAITS.run : GAITS.walk
    }
    if (!act.moving) blend(stance, 'fours', gait.fours, STANCE_MS)
    const proud = life.mood === 'proud' && gait === GAITS.walk
    const r = () => 0.85 + gaitRandom() * 0.35
    flavour = proud ? { lift: 1.7 * r(), swing: 1.5 * r(), bob: 1.4, tilt: -6 } : { lift: r(), swing: r(), bob: r(), tilt: 0 }
    return new Promise((resolve) => (arrive = resolve))
  }

  function stopWalking() {
    target = null
    if (arrive) arrive(false)
    arrive = null
  }

  function face_(dir) {
    facing = dir
    place()
  }

  /** One step along the current walk; returns how much he is walking (0 to 1). */
  function stepAlong(dt) {
    const dx = target - x
    const dist = Math.abs(dx)
    // speed up to the gait's speed, and slow down in time to stop
    const vmax = Math.min(gait.speed, Math.sqrt(2 * ACCEL * dist) + 40)
    v = Math.min(vmax, v + ACCEL * dt)
    const step = v * dt
    if (dist <= step) {
      x = target
      target = null
      v = 0
      gait = GAITS.walk
      if (!act.moving) upright()
      const done = arrive
      arrive = null
      if (done) done(true)
    } else {
      x += Math.sign(dx) * step
    }
    const k = Math.min(1, v / gait.speed)
    phase += dt * gait.cadence * (0.45 + 0.55 * k)
    const sign = Math.sign(Math.sin(phase))
    if (sign !== lastStepSign) {
      lastStepSign = sign
      Sound.step()
    }
    idleTime = 0
    return target === null ? 0 : 0.5 + 0.5 * k
  }

  /** Life moves on: told whether he is free, and where his head is. */
  function stepLife(dt) {
    const before = last ?? compose()
    alive = life.step(dt, Clock.now(), {
      free: doing === 0 && target === null && !stretching && current === 'stand' && act.w < 0.05 && face.w < 0.05,
      walking: target !== null,
      fours: stance.fours > 0.5,
      head: [(x * facing) / SCALE + before.head.x, before.head.y + add.dy],
    })
  }

  function tick(dt) {
    let walking = 0
    if (target !== null && !stretching) {
      // a walking dog is up on his feet: from a rest pose, up first, then off
      if (current !== 'stand') relax()
      if (!springing()) walking = stepAlong(dt)
    } else if (stretching || stretch !== 0) {
      // front legs walk on the spot as his front half pulls forward
      phase += dt * 8
      walking = 0.4
      if (stretching) setStretch(Math.min(maxStretch(), stretch + STRETCH_RATE * dt))
    } else {
      idleTime += dt
    }
    stepLife(dt)
    const wagFast = target !== null || stretching
    if (!blends.some((b) => b.key === 'wag')) add.wag = Math.sin(Clock.now() / (wagFast ? 80 : 260)) * (wagFast ? 1.2 : 0.8)
    place()
    draw(walking)
  }

  // ------------------------------------------------------------ the stretch

  function setStretch(s) {
    stretch = s
  }

  /** How far he can stretch before his nose reaches the end of the yard. */
  function maxStretch() {
    const room = facing > 0 ? MAX_X + 130 - x : x - (MIN_X - 130)
    return Math.max(0, Math.min(MAX_STRETCH, room / SCALE))
  }

  function beginStretch() {
    target = null
    if (arrive) arrive(false)
    arrive = null
    v = 0
    stretching = true
    onFours()
  }

  /** Let go: snap back with a springy wobble. */
  function endStretch() {
    stretching = false
    const from = stretch
    const start = Clock.now()
    return new Promise((resolve) => {
      function spring() {
        const s = (Clock.now() - start) / 1000
        const value = from * Math.exp(-5.5 * s) * Math.cos(15 * s)
        if (s > 1 || Math.abs(value) < 0.5) {
          setStretch(0)
          upright()
          resolve()
          return
        }
        setStretch(Math.max(-14, value))
        Clock.after(0, spring)
      }
      Clock.after(0, spring)
    })
  }

  // ------------------------------------------------------------ cut short

  // Gestures that hold a pose (sitting, sniffing, catching drops) note `pose`
  // when they start; relax() bumps it, so a cut-short gesture stops quietly.
  let pose = 0

  /** Drop whatever he is doing, at once: someone has asked him to do
   * something else. Every blend is cut short (a gesture awaiting one hears
   * an AbortError and stops), and he blends back up to standing from exactly
   * where he was drawn. */
  function relax() {
    pose += 1
    const was = last ?? compose()
    // drawn low (resting, or a gesture's sit or bow): up on his feet before he goes
    const fromRest = current !== 'stand' || root.getAttribute('data-up') === '0'
    for (const b of blends.splice(0)) b.reject(cutShort())
    act.w = 0
    act.moving = false
    face.w = 0
    Object.keys(add).forEach((k) => (add[k] = 0))
    stance.fours = target !== null ? gait.fours : 0
    current = 'stand'
    rest.from = was
    rest.k = 0
    rising = fromRest
    blend(rest, 'k', 1, RELAX_MS, EASE_OUT)
    draw() // drawn from the new state now, not at the next frame: what was drawn never lags what he is
  }

  // ------------------------------------------------------------ small moves

  // a bark is eager, cross or cheerful, never quite the same twice
  const BARK_FACES = [{ open: 0.75, smile: 0.3, lift: 0.6 }, { open: 0.8, smile: -0.3, brows: -0.8 }, { open: 0.7, smile: 0.8, eyes: 0, joy: 1 }]

  async function bark() {
    const big = rnd(0.7, 1.3)
    faceTo(pickOne(BARK_FACES), 60)
    Sound.bark()
    const m = mouth()
    Creatures.notice('bark', m.x, m.y)
    await blend(add, 'tilt', -16 * big, 110, EASE_OUT)
    await blend(add, 'tilt', 0, 110)
    await blend(add, 'tilt', -12 * big, 100, EASE_OUT)
    await blend(add, 'tilt', 0, 110)
    await faceOff(80)
  }

  /** Head down (positive) or up (negative) by deg, held for ms. */
  async function nod(deg, ms) {
    await blend(add, 'tilt', deg, ms * 0.2)
    await wait(ms * 0.65)
    await blend(add, 'tilt', 0, ms * 0.15)
  }

  /** Lick his lips: the tongue out over his chin and back. */
  async function lick() {
    await faceTo({ tongue: 1, open: 0.2 }, 160, EASE_OUT)
    await wait(200)
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
    if (stance.fours < 0.5 && random() < 0.5) actTo(Figure.vary(basePose(), { nearArm: F.armsWide.nearArm, farArm: F.armsWide.farArm }), 160, OVERSHOOT, true)
    for (let i = 0; i < times; i++) {
      Sound.hop()
      Music.react.hop()
      const h = (i ? height * 0.6 : height) / SCALE
      await blend(add, 'dy', 5, 90, EASE_OUT)
      await blend(add, 'dy', -h, 180 + h * 1.5, EASE_OUT)
      await blend(add, 'dy', 3, 150 + h, EASE_IN)
      await blend(add, 'dy', 0, 80)
    }
    await faceOff(150)
    if (act.w > 0) await actOff(200)
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
    const was = facing
    face_(-was)
    await wait(ms)
    if (target === null && !stretching && facing === -was) face_(was)
  }

  /** Look up at the sky (or the bird) for a moment. */
  async function lookUp(ms = rnd(900, 1800)) {
    if (random() < 0.5) faceTo({ lift: 1, open: 0.3, o: 0.6, smile: 0 }, ms * 0.2) // wonder
    await blend(add, 'tilt', rnd(-28, -18), ms * 0.2)
    await wait(ms * 0.6)
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
    await wait(ms * 0.6)
    await actOff(ms * 0.2)
    if (random() < 0.5) await bark()
  }

  /** Chase his own tail: a few quick turns with little hops. */
  async function chaseTail(turns = rndInt(3, 5)) {
    const was = facing
    await onFours(160)
    for (let i = 0; i < turns; i++) {
      face_(-facing)
      Sound.step()
      await blend(add, 'dy', -8, 100, EASE_OUT)
      await blend(add, 'dy', 0, 100, EASE_IN)
    }
    if (target === null && !stretching) face_(was)
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
    await wait(80)
    await actOff(200)
  }

  /** Snap the jaws shut, quick, n times. */
  async function snap(n = 1) {
    for (let i = 0; i < n; i++) {
      await faceTo({ open: 0.6, teeth: 1, smile: 0.2, brows: -0.6 }, 60)
      await wait(30)
      Sound.snap()
      const m = mouth()
      Creatures.notice('snap', m.x, m.y)
      await faceTo({ open: 0, teeth: 0 }, 50)
      await wait(60)
    }
    await faceOff(80)
  }

  /** Where his head is in the scene. */
  const headAt = () => toScene([basePose().head.x, basePose().head.y])

  /** Watch something that moves: turn to it and follow it with the head for
   * ms. where() returns its current {x, y} (or null once it's gone). */
  async function watch(where, ms = rnd(1500, 3000)) {
    const end = Clock.now() + ms
    while (Clock.now() < end && target === null && !stretching) {
      const p = where()
      if (!p) break
      if (Math.abs(p.x - x) > 40) face_(p.x > x ? 1 : -1)
      const h = headAt()
      const angle = (Math.atan2(p.y - h.y, Math.abs(p.x - h.x)) * 180) / Math.PI
      add.tilt = Math.max(-40, Math.min(30, angle))
      await Clock.frame()
    }
    await blend(add, 'tilt', 0, 200)
  }

  /** Pounce towards x: a stretched leap forward with snapping jaws. */
  async function pounce(tx) {
    face_(tx > x ? 1 : -1)
    const leap = Math.max(-160, Math.min(160, tx - x))
    blend(stance, 'fours', 1, 120)
    actTo(F.leap, 220, EASE_OUT, true)
    walkTo(x + leap)
    const up = loose(blend(add, 'dy', -42, 280, EASE_OUT).then(() => blend(add, 'dy', 0, 340, EASE_IN)))
    await wait(200)
    await snap(2)
    await up
    await actOff(200)
    await upright()
  }

  /** Chase and bite his own tail: fast turns, snapping. */
  async function biteTail(turns = rndInt(4, 7)) {
    const was = facing
    await onFours(160)
    for (let i = 0; i < turns; i++) {
      face_(-facing)
      if (i % 2) Sound.snap()
      faceTo({ open: i % 2 ? 0.6 : 0, teeth: i % 2 }, 40)
      await blend(add, 'dy', -6, 75, EASE_OUT)
      await blend(add, 'dy', 0, 75, EASE_IN)
    }
    await faceOff(80)
    if (target === null && !stretching) face_(was)
    await shake()
    await upright()
  }

  /** Howl at the sky, sitting up. */
  async function howl() {
    Sound.howl()
    const howling = Figure.vary(F.sitDog, { head: { tilt: -40, turn: 0.8 }, face: { eyes: 0, joy: -1, open: 0.6, o: 0.8, smile: 0 } })
    await actTo(howling, 320)
    await wait(960)
    await actOff(320)
  }

  // ------------------------------------------------------------ resting

  /** Move from the current pose into another; draw() holds it from then on.
   * Rejects if cut short. */
  async function settle(name, ms = 600) {
    rest.from = basePose()
    current = name // the state first: the blend only covers the move
    rest.k = 0
    rising = false
    await blend(rest, 'k', 1, ms)
  }

  /** Back up on his feet: from lying, the front comes up first (through a
   * sit), as a dog's does. */
  async function rise(ms = 500) {
    if (LYING.includes(current)) await settle('sit', ms)
    await settle('stand', ms)
  }

  /** A little look about while resting: the head turns up, down, along. */
  function glance(range) {
    const to = rnd(-range, range * 0.5)
    const ms = rnd(1400, 2400)
    loose(blend(add, 'tilt', to, ms * 0.3).then(() => wait(ms * 0.45)).then(() => blend(add, 'tilt', 0, ms * 0.25)))
  }

  /** A wag of the tail, sitting. */
  function wag() {
    loose(blend(add, 'wag', 2, 180).then(() => blend(add, 'wag', -1, 180)).then(() => blend(add, 'wag', 0, 180)))
  }

  /** Sit and watch the yard for a while, looking about. */
  async function sit(ms = rnd(4000, 8000)) {
    const mine = pose
    await settle('sit', 700)
    const end = Clock.now() + ms
    while (Clock.now() < end) {
      await wait(rnd(1500, 3000))
      if (mine !== pose) return
      if (random() < 0.7) glance(16)
      else wag()
    }
    if (mine !== pose) return
    await rise()
  }

  /** Lie down, head up, looking about. */
  async function lieDown(ms = rnd(6000, 10000)) {
    const mine = pose
    await settle('sit', 650)
    if (mine !== pose) return
    await settle('lie', 800)
    const end = Clock.now() + ms
    while (Clock.now() < end) {
      await wait(rnd(1800, 3200))
      if (mine !== pose) return
      glance(22)
    }
    if (mine !== pose) return
    await rise()
  }

  /** A nap in the open: lie down, then sleep, head on paws, curled up or
   * sprawled out, with little snores; wake with a proper dog stretch. */
  async function nap(ms = rnd(10000, 18000)) {
    const mine = pose
    await settle('sit', 650)
    if (mine !== pose) return
    await settle('lie', 800)
    if (mine !== pose) return
    yawnSound()
    await settle(NAPS[Math.floor(random() * NAPS.length)], 1200)
    const end = Clock.now() + ms
    let n = 0
    while (Clock.now() < end) {
      await wait(1700)
      if (mine !== pose) return
      if (n++ % 2 === 0) Sound.from(250, Sound.snore)
      floatZ()
    }
    if (mine !== pose) return
    await settle('lie', 700)
    await rise()
    if (mine !== pose) return
    await wakeUp()
    if (random() < 0.5) await dogStretch(mine)
    if (mine !== pose) return
    await shake()
  }

  /** The dog stretch: front legs reaching forward, rump up, then the back
   * legs stretched out behind. */
  async function dogStretch(mine) {
    await settle('bowStretch', 800)
    await wait(900)
    if (mine !== pose) return
    await settle('backStretch', 700)
    await wait(700)
    if (mine !== pose) return
    await rise(450)
  }

  function yawnSound() {
    Sound.from(150, Sound.yawn)
  }

  /** A Z drifting up from his head as he sleeps. */
  function floatZ() {
    const fx = $('fx')
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('class', 'zzz')
    const z = document.createElementNS('http://www.w3.org/2000/svg', 'use')
    z.setAttribute('href', '#zee')
    z.style.opacity = '1'
    g.appendChild(z)
    fx.appendChild(g)
    const h = basePose().head
    const { x: zx, y: zy } = toScene([h.x + 24, h.y - 24])
    g.animate(
      [{ transform: `translate(${zx}px, ${zy}px) scale(0.6)`, opacity: 0 }, { transform: `translate(${zx + 8}px, ${zy - 20}px) scale(0.9)`, opacity: 1, offset: 0.3 }, { transform: `translate(${zx + 18}px, ${zy - 60}px) scale(1.1)`, opacity: 0 }],
      { duration: 1800, easing: 'ease-out' },
    ).finished.then(() => g.remove())
  }

  /** Startled by something in front: a yelp, a surprised face, and a hop
   * backwards. */
  async function startle() {
    Sound.yelp()
    const back = facing > 0 ? -60 : 60
    walkTo(x + back)
    face_(back > 0 ? -1 : 1) // keep facing the thing that startled him
    faceTo({ lift: 1, brows: 0.6, open: 0.5, o: 1, smile: 0 }, 60)
    await blend(add, 'dy', -28, 210, EASE_OUT)
    await blend(add, 'dy', 0, 210, EASE_IN)
    await faceOff(200)
  }

  /** Head up, tongue out: catching raindrops. */
  async function catchDrops(n = rndInt(3, 6)) {
    const mine = pose
    await blend(add, 'tilt', -34, 300)
    await faceTo({ tongue: 1, open: 0.35, eyes: 0, joy: 1, smile: 0.8 }, 120)
    for (let i = 0; i < n; i++) {
      await wait(rnd(250, 500))
      if (mine !== pose) return
      Sound.lap()
      loose(blend(add, 'tilt', -28, 80).then(() => blend(add, 'tilt', -34, 80)))
    }
    await faceOff(150)
    await blend(add, 'tilt', 0, 300)
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
      await wait(300 + 500 * s)
      if (i < times - 1) {
        await actTo(Figure.vary(yawnPose(s * 0.3), { face: { open: 0.1 } }), 220) // a breath
        await wait(rnd(120, 320))
        s = Math.max(0.3, s * rnd(0.6, 0.95))
      }
    }
    await actOff(390)
  }

  /** Waking up, he yawns wide and loud, sometimes more than once, arms
   * flung out: the cartoon's moment just out of the doghouse (Aktor,
   * Pocieszyciel, Kompan; world.yaml, characters[reksio].moves[waking-yawn]). */
  function wakeUp() {
    return yawn(pickOne([1, 2, 2, 3]), rnd(0.8, 1))
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
    await wait(120)
    for (const d of [3, -3, 2, -2, 0]) await blend(add, 'lean', d, 52)
    await upright()
  }

  /** Soaked fur looks a touch darker. */
  function setWet(on) {
    root.classList.toggle('wet', on)
  }

  /** Muddy legs, after puddles. */
  function setMuddy(on) {
    root.classList.toggle('muddy', on)
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

  /** Shrink into (or grow out of) the doghouse door. */
  async function duck(into) {
    const out = { transform: `scale(${SCALE})`, opacity: 1 }
    const inside = { transform: `translate(0, -70px) scale(${SCALE * 0.55})`, opacity: 0 }
    await Motion.endAt(scaler, into ? [out, inside] : [inside, out], { duration: 420, easing: 'ease-in-out' })
  }

  /** Carry a bone in his mouth (or not). */
  function holdBone(on) {
    holding = on
  }

  /** A gesture, counted while under way: he isn't free for life's ways of
   * standing until every gesture is over (or cut short). */
  function busyWith(fn) {
    return async (...args) => {
      doing += 1
      try {
        return await fn(...args)
      } finally {
        doing -= 1
      }
    }
  }

  /** Mouth position in scene units, for effects. */
  function mouth() {
    return toScene(Figure.mouthAt(last ?? compose()))
  }

  scaler.style.transform = `scale(${SCALE})`
  place()
  draw()

  return {
    get x() { return x },
    get facing() { return facing },
    get walking() { return target !== null },
    /** The pose he is in or moving into: stand, sit, lie, nap, curl, sprawl,
     * bowStretch, backStretch. Standing may be upright or on all fours. */
    get pose() { return current },
    get stretching() { return stretching || stretch !== 0 },
    /** Moving along while not drawn walking: a gesture still posing him, or
     * his body still drawn resting. Read from what was drawn, not from the
     * state's names, so a drawing that has come apart from the state shows
     * up here (yard.js checks it as a rule). */
    get sliding() {
      return target !== null && !springing() && (root.getAttribute('data-posed') === '1' || root.getAttribute('data-up') === '0')
    },
    mouth,
    get holdingBone() { return holding },
    walkTo, stopWalking, face: face_, tick, relax, setWet, setMuddy, duck, holdBone, beginStretch, endStretch,
    ...Object.fromEntries(Object.entries({
      shakeDry, bark, nod, lick, lap, shake, paddle, hop, sniff, lookAround, lookUp, scratch, playBow, chaseTail, yawn,
      stamp, snap, watch, pounce, biteTail, howl, sit, lieDown, nap, startle, catchDrops, wakeUp,
    }).map(([name, fn]) => [name, busyWith(fn)])),
    MIN_X, MAX_X,
  }
})()
