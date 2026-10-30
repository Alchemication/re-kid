// Reksio himself: where he is, which way he faces, how he moves (upright for
// a walk, on all fours for a run, easing in and out), the dachshund stretch,
// resting poses, ducking into the doghouse, and what his gestures are made of
// (the kit). The gestures themselves are in gestures.js (everyday ones) and
// antics.js (a bigger gag's own). Drawn by figure.js, the way the cartoon
// draws him.
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
// after him). Walking adds its stride as he goes. What a gag puts on him (the
// bowl over his head, his tail caught on a thorn: wear()) goes on last;
// what he carries goes in his teeth (inMouth), his jaws shut on it.
// relax() cuts every blend short (whoever awaits one hears an AbortError) and
// blends him back to standing from exactly where he was drawn, so nothing is
// ever left frozen part-way.

// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* global Clock, Debug, Sound, Figure, Motion, Life, Gait */
/* exported Reksio */
const Reksio = (() => {
  const GROUND = 812 // y of his feet, in scene units
  const SCALE = 1.2 // upright, he stands about as tall as his doghouse, as in the cartoon
  const GAITS = Gait.GAITS // walk, run, sniff: gait.js
  const SNIFF_EVERY_MS = [380, 650] // on a sniffing trot, a sniff this often
  const ACCEL = 1500 // how quickly he speeds up and slows down (units/s²)
  const SKID = 900 // slipping, how quickly his skid slows (units/s²): a short slide on, not a glide
  const MAX_STRETCH = 230 // longest dachshund stretch, in his own units
  const STRETCH_RATE = 210 // how fast he stretches while held (units/s)
  const RELAX_MS = 220 // how fast he springs up from a rest when asked to do something
  const STANCE_MS = 260 // dropping to all fours, or standing up
  const F = Figure.POSES
  // the resting poses, by the names the yard knows them by
  const REST = { sit: F.sitDog, lie: F.lie, nap: F.nap, curl: F.curl, sprawl: F.sprawl, bowStretch: F.bowStretch, backStretch: F.backStretch }
  const LYING = ['lie', 'nap', 'curl', 'sprawl']

  const $ = (id) => document.getElementById(id)
  const root = $('reksio')
  const scaler = $('rk-scale')
  const flip = $('rk-flip')
  const bob = $('rk-bob')
  const paint = Figure.mount(bob)

  let x = 1000
  let minX = -Infinity // the ends of the scene he may walk to: the game says (keepBetween)
  let maxX = Infinity
  let holding = false // carrying a bone
  let carrying = null // what else he carries in his teeth (inMouth)
  const worn = new Map() // what gags have put on him, by name: change(pose, toFigure) → the pose with it
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
  let slipsHere = () => null // the game says (slipOn): walking at x, does he slip here? a gesture to play if so
  let slipping = false // a slip under way: his walk waits for it, skidding on a little
  let skid = 0 // the skid's speed

  const clamp = (v) => Math.max(minX, Math.min(maxX, v))
  const random = Debug.random('reksio') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)
  const rndInt = (lo, hi) => Math.floor(rnd(lo, hi + 1))
  const pickOne = (list) => list[Math.floor(random() * list.length)]
  const life = Life.create(Debug.random('life')) // every frame: its own stream
  const gaitRandom = Debug.random('gait') // each walk's own swagger
  let alive = null // what life adds this frame
  let doing = 0 // gestures under way: while any is, he isn't free for life's ways of standing
  let flavour = { lift: 1, swing: 1, bob: 1, tilt: 0 } // this walk's: a strut when proud
  let nextSniffAt = 0 // on a sniffing trot, the next sniff

  // ------------------------------------------------------------ blends

  const EASE = Motion.EASE
  const EASE_OUT = (t) => 1 - (1 - t) ** 3
  const EASE_IN = (t) => t * t * t
  /** Lands a little past its mark and settles: a move with some snap. */
  const OVERSHOOT = (t) => 1 + (t - 1) ** 2 * (2.4 * (t - 1) + 1.4)

  // Blends move with the game's clock, every frame, whether or not he is being
  // drawn: a gesture always reaches its end (or is cut short by relax()).
  const blends = Motion.blends()
  const { blend, pause } = blends
  const loose = Motion.loose
  Clock.every(0, blends.run)

  // ------------------------------------------------------------ his state

  let current = 'stand' // the resting pose he is in (or moving into): stand, sit, lie, nap…
  const stance = { fours: 0 } // standing: upright (0) or on all fours (1)
  const rest = { from: null, k: 1 } // blending from the pose `from` into `current`
  const act = { from: null, to: null, k: 1, w: 0, moving: false } // a gesture's pose, by weight w
  const face = { from: null, to: null, k: 1, w: 0 } // a gesture's face, by weight w
  const add = { tilt: 0, dy: 0, dx: 0, lean: 0, kick: 0, dig: 0, wag: 0 } // dx: his whole body pulled forward, feet and all
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
    if (alive) p = Figure.perked(p, alive.perk) // over a gesture's pose: an ear goes up whatever he is doing
    p = Figure.vary(p, { head: { tilt: p.head.tilt + add.tilt } })
    if (stretch) p = stretched(p, stretch)
    if (add.kick) p = Figure.vary(p, { nearLeg: [[p.nearLeg[0][0], p.nearLeg[0][1] - add.kick / 2], [p.nearLeg[1][0], p.nearLeg[1][1] - add.kick]] })
    if (add.dig) p = digging(p, add.dig)
    if (add.wag) p = Figure.vary(p, { tail: [p.tail[0] + add.wag * 6, p.tail[1] - Math.abs(add.wag) * 2] })
    if (carrying) p = Figure.vary(p, { face: { open: Math.min(p.face.open, 0.1), tongue: 0, bone: 1 } }) // jaws shut on it, whatever his face says
    else if (holding) p = Figure.vary(p, { face: { bone: p.face.open < 0.15 && p.face.tongue < 0.1 ? 1 : 0 } })
    for (const change of worn.values()) p = change(p, toFigure)
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

  // ------------------------------------------------------------ drawing

  let drawnBob = ''
  let drawnFlags = ''

  /** Paint him from his state: the end of every frame. */
  function draw(walkAmount = 0) {
    let p = compose()
    const going = { gait, phase, amount: walkAmount, fours: stance.fours >= 0.5, swagger: flavour }
    if (walkAmount > 0) p = Gait.stride(p, going)
    last = p
    paint(p)
    const breathe = target === null && !stretching ? Math.sin(idleTime * 2.2) * 0.8 : 0
    const hopping = Gait.rise(going)
    const t = `translate(${add.dx.toFixed(1)}px, ${(add.dy + breathe + hopping).toFixed(1)}px) rotate(${add.lean.toFixed(1)}deg)`
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
  const toScene = ([fx, fy]) => ({ x: x + facing * SCALE * (fx + add.dx), y: GROUND + SCALE * (fy + add.dy) })
  /** …and where a point of the scene is in his own units (toScene's reverse). */
  const toFigure = ({ x: sx, y: sy }) => [((sx - x) * facing) / SCALE - add.dx, (sy - GROUND) / SCALE - add.dy]

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

  /** Walk to x (sniffing: at a sniffing trot). Resolves true on arrival,
   * false if another walk replaced it. */
  function walkTo(tx, { sniffing = false } = {}) {
    if (arrive) arrive(false)
    target = clamp(tx)
    if (Math.abs(target - x) > 2) facing = target > x ? 1 : -1
    // keep running if already running; otherwise pick by distance
    if (!(gait === GAITS.run && v > GAITS.walk.speed)) {
      const was = gait
      gait = Gait.choose(Math.abs(target - x), sniffing, gaitRandom)
      // off at a run from standing: a little crouch, and a spring
      if (gait === GAITS.run && was !== GAITS.run && v < 50) loose(blend(add, 'dy', 6, 70, EASE_OUT).then(() => blend(add, 'dy', 0, 110, EASE_IN)))
    }
    if (!act.moving) blend(stance, 'fours', gait.fours, STANCE_MS)
    flavour = Gait.swagger(gait, life.mood === 'proud', gaitRandom)
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
    if (gait === GAITS.sniff && Clock.now() >= nextSniffAt) {
      Sound.sniff()
      nextSniffAt = Clock.now() + SNIFF_EVERY_MS[0] + gaitRandom() * (SNIFF_EVERY_MS[1] - SNIFF_EVERY_MS[0])
    }
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
    if (slipping) {
      // down on the ice: the walk waits, and he slides on a little
      x = clamp(x + facing * skid * dt)
      skid = Math.max(0, skid - SKID * dt)
    } else if (target !== null && !stretching) {
      // a walking dog is up on his feet: from a rest pose, up first, then off
      if (current !== 'stand') relax()
      if (!springing()) walking = stepAlong(dt)
      if (walking) slip()
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
    if (!blends.moving((b) => b.key === 'wag')) add.wag = Math.sin(Clock.now() / (wagFast ? 80 : 260)) * (wagFast ? 1.2 : 0.8)
    place()
    draw(walking)
  }

  /** On ice, now and then (the game says, slipOn): his walk waits while the
   * gesture plays (it lands him and gets him up), then carries on. A tap
   * cutting it short ends it the same way. */
  function slip() {
    const act = slipsHere(x, v)
    if (!act) return
    slipping = true
    skid = v
    v = 0
    Debug.ignoreCut(busyWith(act)(), 'slip').then(() => {
      slipping = false
      skid = 0
    })
  }

  // ------------------------------------------------------------ the stretch

  function setStretch(s) {
    stretch = s
  }

  /** How far he can stretch before his nose reaches the end of the yard. */
  function maxStretch() {
    const room = facing > 0 ? maxX + 130 - x : x - (minX - 130)
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

  // Gestures that hold a pose (sitting, catching drops) note `relaxes` when
  // they start (kit.relaxes); relax() bumps it, so a cut-short gesture stops
  // quietly.
  let relaxes = 0

  /** Drop whatever he is doing, at once: someone has asked him to do
   * something else. Every blend is cut short (a gesture awaiting one hears
   * an AbortError and stops), and he blends back up to standing from exactly
   * where he was drawn. */
  function relax() {
    relaxes += 1
    const was = last ?? compose()
    // drawn low (resting, or a gesture's sit or bow): up on his feet before he goes
    const fromRest = current !== 'stand' || root.getAttribute('data-up') === '0'
    blends.cut()
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

  /** A Z drifting up from his head as he sleeps (or from `at`, {x, y}: a
   * doghouse door). */
  function floatZ(at) {
    const fx = $('fx')
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('class', 'zzz')
    const z = document.createElementNS('http://www.w3.org/2000/svg', 'use')
    z.setAttribute('href', '#zee')
    z.style.opacity = '1'
    g.appendChild(z)
    fx.appendChild(g)
    const h = basePose().head
    const { x: zx, y: zy } = at ?? toScene([h.x + 24, h.y - 24])
    g.animate(
      [{ transform: `translate(${zx}px, ${zy}px) scale(0.6)`, opacity: 0 }, { transform: `translate(${zx + 8}px, ${zy - 20}px) scale(0.9)`, opacity: 1, offset: 0.3 }, { transform: `translate(${zx + 18}px, ${zy - 60}px) scale(1.1)`, opacity: 0 }],
      { duration: 1800, easing: 'ease-out' },
    ).finished.then(() => g.remove())
  }

  /** Asleep in the doghouse at x: in out of sight, as duck(true) leaves him. */
  function sleepIn(at) {
    x = clamp(at)
    facing = 1
    scaler.style.transform = `translate(0, -70px) scale(${SCALE * 0.55})`
    scaler.style.opacity = '0'
    place()
  }

  /** Shrink into (or grow out of) the doghouse door. */
  async function duck(into) {
    const out = { transform: `scale(${SCALE})`, opacity: 1 }
    const inside = { transform: `translate(0, -70px) scale(${SCALE * 0.55})`, opacity: 0 }
    await Motion.endAt(scaler, into ? [out, inside] : [inside, out], { duration: 420, easing: 'ease-in-out' })
  }

  // ------------------------------------------------------------ on him

  /** Soaked fur looks a touch darker. */
  function setWet(on) {
    root.classList.toggle('wet', on)
  }

  /** Muddy legs, after puddles. */
  function setMuddy(on) {
    root.classList.toggle('muddy', on)
  }

  /** Carry a bone in his mouth (or not). */
  function holdBone(on) {
    holding = on
  }

  /** Carry this SVG node in his teeth (drawn about its bite, facing
   * right), so it turns, tips and mirrors with his head; null, nothing. Whoever
   * takes it from him puts it elsewhere. */
  function inMouth(node) {
    if (carrying && carrying !== node && carrying.parentNode === paint.mouth) carrying.remove()
    carrying = node
    if (node) paint.mouth.appendChild(node)
  }

  /** Put on him something a gag brings (change(pose, toFigure) returns the
   * pose with it: the bowl over his head, his tail caught on a thorn), or
   * take it off (null). */
  function wear(name, change) {
    if (change) worn.set(name, change)
    else worn.delete(name)
    draw()
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

  const listeners = [] // who hears what he does (listen)

  /** Let the game know he did something others may notice (a bark, a snap)
   * at `at`, a point in the scene. */
  const tell = (what, at) => listeners.forEach((fn) => fn(what, at))

  /** Where a point of his, as drawn, is in the scene: at(pose) finds it in
   * his own units (Figure.mouthAt, Figure.bowlTopAt). */
  const pointAt = (at) => toScene(at(last ?? compose()))

  scaler.style.transform = `scale(${SCALE})`
  place()
  draw()

  // What a gesture is made of, for the gestures kept elsewhere (gestures.js,
  // and a bigger gag's own moves in antics.js): they move his layers only
  // through these, so relax() cuts them short the same way.
  const kit = {
    blend, pause, loose, tell, faceTo, faceOff, actTo, actOff, onFours, upright, settle, rise, basePose, toScene, add, POSES: F, SCALE,
    EASE, EASE_OUT, EASE_IN, OVERSHOOT, random, rnd, rndInt, pickOne,
    /** Something caught his attention: an ear ('near', 'far', 'both' or
     * 'either') snaps up for ms, then flops back. On life's clock, not a
     * blend: relax() can't leave it up. */
    perk: (which, ms) => life.perk(which, Clock.now(), ms),
    /** How far he is down on all fours (0 upright, 1 on all fours). */
    get fours() { return stance.fours },
    /** A gesture's pose is (still partly) over his own. */
    get posing() { return act.w > 0 },
    /** He has set off: on a walk, or stretching. */
    get setOff() { return target !== null || stretching },
    /** How many times relax() has cut him short: a gesture that holds a pose
     * (sitting, catching drops) notes it when it starts, and stops quietly
     * once it changes. */
    get relaxes() { return relaxes },
  }

  const api = {
    get x() { return x },
    get facing() { return facing },
    get walking() { return target !== null },
    /** The pose he is in or moving into: stand, sit, lie, nap, curl, sprawl,
     * bowStretch, backStretch. Standing may be upright or on all fours. */
    get pose() { return current },
    /** Lying down: resting, napping, curled up or sprawled out. */
    get lying() { return LYING.includes(current) },
    get stretching() { return stretching || stretch !== 0 },
    /** Moving along while not drawn walking: a gesture still posing him, or
     * his body still drawn resting. Read from what was drawn, not from the
     * state's names, so a drawing that has come apart from the state shows
     * up here (yard.js checks it as a rule). */
    /** Down on the ice: his walk waits for him to get up. */
    get slipping() { return slipping },
    /** Where he slips: test(x, speed) → a gesture (kit-made) to play, or null. */
    slipOn(test) {
      slipsHere = test
    },
    get sliding() {
      return target !== null && !springing() && (root.getAttribute('data-posed') === '1' || root.getAttribute('data-up') === '0')
    },
    /** Mouth position in scene units, for effects. */
    mouth: () => pointAt(Figure.mouthAt),
    pointAt,
    get holdingBone() { return holding },
    /** Is he wearing what a gag put on him under this name? */
    wearing: (name) => worn.has(name),
    /** The names of everything gags have put on him. */
    get worn() { return [...worn.keys()] },
    walkTo, stopWalking, face: face_, tick, relax, setWet, setMuddy, duck, holdBone, inMouth, wear, beginStretch, endStretch, sleepIn, floatZ,
    /** The ends of the scene he may walk to (the yard's house wall and fence). */
    keepBetween(min, max) {
      minX = min
      maxX = max
      x = clamp(x)
      place()
    },
    /** fn(what, at) hears what he does that others may notice: a bark, a
     * snap, at his mouth (the yard's creatures). */
    listen: (fn) => listeners.push(fn),
    kit,
    /** Add gestures made from the kit (gestures.js, antics.js): each counted
     * while under way. A name he has already is a mistake, not a replacement. */
    addGestures(gestures) {
      for (const [name, fn] of Object.entries(gestures)) {
        if (name in api) throw new Error(`Reksio already has ${name}: name the gesture something else`)
        api[name] = busyWith(fn)
      }
    },
  }
  return api
})()
