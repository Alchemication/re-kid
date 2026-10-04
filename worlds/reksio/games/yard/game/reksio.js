// Reksio himself: where he is, which way he faces, how he moves (a walk for
// short distances, a bounding run for long ones, easing in and out), the
// dachshund stretch, and his small moves (bark, nod, shake, hop, sniff,
// scratch, ducking into the doghouse). Drawn in index.html.

/* global Sound, Music, Creatures, Layout */
/* exported Reksio */
const Reksio = (() => {
  const GROUND = 812 // y of his feet, in scene units
  const SCALE = 1.3
  const GAITS = {
    // speed in scene units/s; cadence in leg-cycle radians/s; swing in degrees
    walk: { speed: 250, cadence: 13, swing: 22, bob: 3, pitch: 0 },
    run: { speed: 600, cadence: 20, swing: 36, bob: 10, pitch: 5 },
  }
  const RUN_FROM = 520 // trips longer than this are run, not walked
  const ACCEL = 1500 // how quickly he speeds up and slows down (units/s²)
  const MAX_STRETCH = 230 // longest dachshund stretch, in his own units
  const STRETCH_RATE = 210 // how fast he stretches while held (units/s)
  const MIN_X = Layout.MIN_X // the house wall is the yard's left end
  const MAX_X = Layout.MAX_X // the fence is its right end

  const $ = (id) => document.getElementById(id)
  const root = $('reksio')
  const scaler = $('rk-scale')
  const flip = $('rk-flip')
  const bob = $('rk-bob')
  const head = $('rk-head')
  const tail = $('tail')
  const legs = ['leg-1', 'leg-2', 'leg-3', 'leg-4'].map($)
  const mouth = $('rk-mouth')
  const tongue = $('rk-tongue')
  const smile = $('rk-smile')
  const bone = $('rk-bone')
  const bodyInk = $('rk-body-ink')
  const bodyWhite = $('rk-body-white')
  const frontParts = [...root.querySelectorAll('.front-part')]

  let x = 1000
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
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))

  function place() {
    root.style.transform = `translate(${x}px, ${GROUND}px)`
    flip.style.transform = `scaleX(${facing})`
  }

  /** Walk to x. Resolves true on arrival, false if another walk replaced it. */
  function walkTo(tx) {
    if (arrive) arrive(false)
    target = clamp(tx)
    if (Math.abs(target - x) > 2) facing = target > x ? 1 : -1
    // keep running if already running; otherwise pick by distance
    if (!(gait === GAITS.run && v > GAITS.walk.speed)) {
      gait = Math.abs(target - x) > RUN_FROM ? GAITS.run : GAITS.walk
    }
    return new Promise((resolve) => (arrive = resolve))
  }

  function stopWalking() {
    target = null
    if (arrive) arrive(false)
    arrive = null
  }

  function face(dir) {
    facing = dir
    place()
  }

  function legsWalk(swing) {
    // diagonal pairs move together, as in a dog's walk
    legs[0].style.transform = `rotate(${swing}deg)`
    legs[3].style.transform = `rotate(${swing}deg)`
    legs[1].style.transform = `rotate(${-swing}deg)`
    legs[2].style.transform = `rotate(${-swing}deg)`
  }

  function legsRun(swing) {
    // a bound: front pair together, back pair together, out of step
    legs[1].style.transform = `rotate(${swing}deg)`
    legs[3].style.transform = `rotate(${swing * 0.85}deg)`
    legs[0].style.transform = `rotate(${-swing}deg)`
    legs[2].style.transform = `rotate(${-swing * 0.85}deg)`
  }

  function tick(dt) {
    if (target !== null && !stretching) {
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
        const done = arrive
        arrive = null
        if (done) done(true)
      } else {
        x += Math.sign(dx) * step
      }
      const k = Math.min(1, v / gait.speed)
      phase += dt * gait.cadence * (0.45 + 0.55 * k)
      const swing = Math.sin(phase) * gait.swing * (0.5 + 0.5 * k)
      if (gait === GAITS.run) legsRun(swing)
      else legsWalk(swing)
      bob.style.transform =
        `translateY(${-Math.abs(Math.sin(phase)) * gait.bob * k}px) rotate(${-Math.cos(phase) * gait.pitch * k}deg)`
      const sign = Math.sign(Math.sin(phase))
      if (sign !== lastStepSign) {
        lastStepSign = sign
        Sound.step()
      }
      idleTime = 0
    } else if (stretching || stretch !== 0) {
      // front legs walk on the spot as his front half pulls forward
      const swing = Math.sin(stretch * 0.09) * 26
      legs[1].style.transform = `rotate(${swing}deg)`
      legs[3].style.transform = `rotate(${-swing}deg)`
      legs[0].style.transform = ''
      legs[2].style.transform = ''
      if (stretching) {
        setStretch(Math.min(maxStretch(), stretch + STRETCH_RATE * dt))
      }
      bob.style.transform = ''
    } else {
      legs.forEach((l) => (l.style.transform = ''))
      idleTime += dt
      bob.style.transform = `translateY(${Math.sin(idleTime * 2.2) * 0.8}px)`
    }
    const wagFast = target !== null || stretching
    tail.style.transform = `rotate(${Math.sin(performance.now() / (wagFast ? 80 : 260)) * (wagFast ? 14 : 10)}deg)`
    place()
  }

  // ------------------------------------------------------------ the stretch

  function bodyPath(s) {
    return `M-50 -58 Q${-24 + s / 2} -66 ${2 + s} -76 L${18 + s} -94 L${30 + s} -90 ` +
      `L${28 + s} -52 Q${24 + s} -34 ${4 + s} -34 L-40 -34 Q-56 -36 -54 -50 Z`
  }

  function setStretch(s) {
    stretch = s
    const d = bodyPath(s)
    bodyInk.setAttribute('d', d)
    bodyWhite.setAttribute('d', d)
    frontParts.forEach((part) => (part.style.transform = `translateX(${s}px)`))
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
  }

  /** Let go: snap back with a springy wobble. */
  function endStretch() {
    stretching = false
    const from = stretch
    const start = performance.now()
    return new Promise((resolve) => {
      function spring(t) {
        const s = (t - start) / 1000
        const value = from * Math.exp(-5.5 * s) * Math.cos(15 * s)
        if (s > 1 || Math.abs(value) < 0.5) {
          setStretch(0)
          resolve()
          return
        }
        setStretch(Math.max(-14, value))
        requestAnimationFrame(spring)
      }
      requestAnimationFrame(spring)
    })
  }

  // ------------------------------------------------------------ small moves

  function show(el, on) {
    el.style.opacity = on ? '1' : '0'
  }

  async function bark() {
    head.animate(
      [{ transform: 'rotate(0)' }, { transform: 'rotate(-16deg)' }, { transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(0)' }],
      { duration: 480, easing: 'ease-out' },
    )
    show(mouth, true)
    show(smile, false)
    Sound.bark()
    Creatures.notice('bark', x + facing * 121, GROUND - 114)
    await wait(450)
    show(mouth, false)
    show(smile, true)
  }

  /** Head down (positive) or up (negative) by deg, held for ms. */
  async function nod(deg, ms) {
    const anim = head.animate(
      [{ transform: 'rotate(0)' }, { transform: `rotate(${deg}deg)`, offset: 0.2 }, { transform: `rotate(${deg}deg)`, offset: 0.85 }, { transform: 'rotate(0)' }],
      { duration: ms, easing: 'ease-in-out' },
    )
    await anim.finished
  }

  async function lick() {
    show(tongue, true)
    show(smile, false)
    await wait(500)
    show(tongue, false)
    show(smile, true)
  }

  /** Lap from a bowl: quick little dips with the tongue out, n times. */
  async function lap(n) {
    await head.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(22deg)' }], { duration: 220, easing: 'ease-out' }).finished
    show(tongue, true)
    show(smile, false)
    const dip = head.animate(
      [{ transform: 'rotate(22deg)' }, { transform: 'rotate(30deg)' }, { transform: 'rotate(22deg)' }],
      { duration: 190, iterations: n, easing: 'ease-in-out' },
    )
    for (let i = 0; i < n; i++) {
      Sound.lap()
      await wait(190)
    }
    await dip.finished
    show(tongue, false)
    show(smile, true)
    await head.animate([{ transform: 'rotate(22deg)' }, { transform: 'rotate(0)' }], { duration: 260, easing: 'ease-in-out' }).finished
  }

  const rnd = (lo, hi) => lo + Math.random() * (hi - lo)
  const rndInt = (lo, hi) => Math.floor(rnd(lo, hi + 1))

  /** A happy hop on the spot; height and count vary unless given. */
  async function hop(height = rnd(30, 56), times = Math.random() < 0.3 ? 2 : 1) {
    for (let i = 0; i < times; i++) {
      Sound.hop()
      Music.react.hop()
      const h = i ? height * 0.6 : height
      await bob.animate(
        [
          { transform: 'translateY(0)' },
          { transform: 'translateY(5px)', offset: 0.18 },
          { transform: `translateY(${-h}px)`, offset: 0.55, easing: 'ease-in' },
          { transform: 'translateY(3px)', offset: 0.85 },
          { transform: 'translateY(0)' },
        ],
        { duration: 480 + h * 3, easing: 'ease-out' },
      ).finished
    }
  }

  /** Nose to the ground, a few sniffs (how many, and how low, varies). */
  async function sniff(times = rndInt(2, 5)) {
    const low = rnd(24, 34)
    await head.animate([{ transform: 'rotate(0)' }, { transform: `rotate(${low}deg)` }], { duration: 260, fill: 'forwards' }).finished
    for (let i = 0; i < times; i++) {
      Sound.sniff()
      await head.animate(
        [{ transform: `rotate(${low}deg)` }, { transform: `rotate(${low - 5}deg)` }, { transform: `rotate(${low}deg)` }],
        { duration: rnd(200, 320) },
      ).finished
    }
    await head.animate([{ transform: `rotate(${low}deg)` }, { transform: 'rotate(0)' }], { duration: 300 }).finished
    head.getAnimations().forEach((a) => a.cancel())
  }

  /** Glance the other way, then back (unless he has set off meanwhile). */
  async function lookAround(ms = rnd(600, 1400)) {
    const was = facing
    face(-was)
    await wait(ms)
    if (target === null && !stretching && facing === -was) face(was)
  }

  /** Look up at the sky (or the bird) for a moment. */
  async function lookUp(ms = rnd(900, 1800)) {
    const up = rnd(-28, -18)
    await head.animate(
      [{ transform: 'rotate(0)' }, { transform: `rotate(${up}deg)`, offset: 0.2 }, { transform: `rotate(${up}deg)`, offset: 0.8 }, { transform: 'rotate(0)' }],
      { duration: ms, easing: 'ease-in-out' },
    ).finished
  }

  /** Scratch behind the ear with a back leg, head tilted to meet it. */
  async function scratch(times = rndInt(4, 8)) {
    const ms = 140 * times + 250
    head.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(20deg)', offset: 0.15 }, { transform: 'rotate(20deg)', offset: 0.85 }, { transform: 'rotate(0)' }], { duration: ms })
    bob.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)', offset: 0.15 }, { transform: 'rotate(-6deg)', offset: 0.85 }, { transform: 'rotate(0)' }], { duration: ms })
    const up = legs[2].animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-82deg)' }], { duration: 120, fill: 'forwards' })
    await up.finished
    Sound.scratch()
    await legs[2].animate(
      [{ transform: 'rotate(-82deg)' }, { transform: 'rotate(-62deg)' }, { transform: 'rotate(-82deg)' }],
      { duration: 140, iterations: times, easing: 'ease-in-out' },
    ).finished
    up.cancel()
  }

  /** A play-bow: front down, rear up, tail going; sometimes a bark. */
  async function playBow() {
    const ms = rnd(900, 1500)
    await bob.animate(
      [{ transform: 'rotate(0)' }, { transform: 'rotate(11deg) translateY(4px)', offset: 0.2 }, { transform: 'rotate(11deg) translateY(4px)', offset: 0.8 }, { transform: 'rotate(0)' }],
      { duration: ms, easing: 'ease-in-out' },
    ).finished
    if (Math.random() < 0.5) await bark()
  }

  /** Chase his own tail: a few quick turns with little hops. */
  async function chaseTail(turns = rndInt(3, 5)) {
    const was = facing
    for (let i = 0; i < turns; i++) {
      face(-facing)
      Sound.step()
      await bob.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }], { duration: 200 }).finished
    }
    if (target === null && !stretching) face(was)
  }

  /** Rear up and stamp down with both front paws; onImpact runs as they land. */
  async function stamp(onImpact) {
    const up = 'rotate(-24deg) translateY(-8px)'
    const down = 'rotate(5deg) translateY(2px)'
    await bob.animate([{ transform: 'rotate(0)' }, { transform: up }], { duration: rnd(200, 260), easing: 'ease-out', fill: 'forwards' }).finished
    const slam = bob.animate([{ transform: up }, { transform: down }], { duration: 110, easing: 'ease-in', fill: 'forwards' })
    await slam.finished
    onImpact()
    bob.getAnimations().forEach((a) => a.cancel())
    await bob.animate([{ transform: down }, { transform: 'rotate(0)' }], { duration: 170, easing: 'ease-out' }).finished
  }

  /** Snap the jaws shut, quick, n times. */
  async function snap(n = 1) {
    for (let i = 0; i < n; i++) {
      show(mouth, true)
      show(smile, false)
      await wait(90)
      Sound.snap()
      Creatures.notice('snap', x + facing * 121, GROUND - 114)
      show(mouth, false)
      await wait(110)
    }
    show(smile, true)
  }

  /** Watch something that moves: turn to it and follow it with the head for
   * ms. where() returns its current {x, y} (or null once it's gone). */
  async function watch(where, ms = rnd(1500, 3000)) {
    const end = performance.now() + ms
    while (performance.now() < end && target === null && !stretching) {
      const p = where()
      if (!p) break
      const hx = x + facing * 26
      const hy = GROUND - 120
      if (Math.abs(p.x - x) > 40) face(p.x > x ? 1 : -1)
      const angle = (Math.atan2(p.y - hy, Math.abs(p.x - hx)) * 180) / Math.PI
      head.style.transform = `rotate(${Math.max(-40, Math.min(30, angle))}deg)`
      await new Promise((r) => requestAnimationFrame(r))
    }
    head.style.transform = ''
  }

  /** Pounce towards x: a leap forward with snapping jaws. */
  async function pounce(tx) {
    face(tx > x ? 1 : -1)
    const leap = Math.max(-160, Math.min(160, tx - x))
    walkTo(x + leap)
    const up = bob.animate(
      [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-50px) rotate(-14deg)', offset: 0.45 }, { transform: 'translateY(0) rotate(4deg)', offset: 0.85 }, { transform: 'translateY(0) rotate(0)' }],
      { duration: 620, easing: 'ease-out' },
    )
    await wait(200)
    await snap(2)
    await up.finished
  }

  /** Chase and bite his own tail: fast turns, snapping. */
  async function biteTail(turns = rndInt(4, 7)) {
    const was = facing
    for (let i = 0; i < turns; i++) {
      face(-facing)
      if (i % 2) Sound.snap()
      show(mouth, i % 2 === 1)
      await bob.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-8deg) translateY(-6px)' }, { transform: 'rotate(0)' }], { duration: 150 }).finished
    }
    show(mouth, false)
    show(smile, true)
    if (target === null && !stretching) face(was)
    await shake()
  }

  /** Howl at the sky. */
  async function howl() {
    Sound.howl()
    show(mouth, true)
    show(smile, false)
    await head.animate(
      [{ transform: 'rotate(0)' }, { transform: 'rotate(-38deg)', offset: 0.2 }, { transform: 'rotate(-42deg)', offset: 0.7 }, { transform: 'rotate(0)' }],
      { duration: 1600, easing: 'ease-in-out' },
    ).finished
    show(mouth, false)
    show(smile, true)
  }

  /** Sit for a while: rear down, front up, tail sweeping. */
  async function sit(ms = rnd(1800, 3500)) {
    const down = 'rotate(-14deg) translate(4px, 7px)'
    await bob.animate([{ transform: 'rotate(0)' }, { transform: down }], { duration: 300, fill: 'forwards' }).finished
    const rear = [legs[0], legs[2]].map((l) => l.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(55deg)' }], { duration: 300, fill: 'forwards' }))
    await wait(ms)
    rear.forEach((a) => a.cancel())
    bob.getAnimations().forEach((a) => a.cancel())
    await bob.animate([{ transform: down }, { transform: 'rotate(0)' }], { duration: 260 }).finished
  }

  /** Startled by something in front: a yelp and a hop backwards. */
  async function startle() {
    Sound.yelp()
    const back = facing > 0 ? -60 : 60
    walkTo(x + back)
    face(back > 0 ? -1 : 1) // keep facing the thing that startled him
    await bob.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-34px) rotate(10deg)', offset: 0.5 }, { transform: 'translateY(0)' }],
      { duration: 420, easing: 'ease-out' },
    ).finished
  }

  /** A big yawn. */
  async function yawn() {
    Sound.yawn()
    show(mouth, true)
    show(smile, false)
    await head.animate(
      [{ transform: 'rotate(0)' }, { transform: 'rotate(-18deg)', offset: 0.3 }, { transform: 'rotate(-18deg)', offset: 0.7 }, { transform: 'rotate(0)' }],
      { duration: 1300, easing: 'ease-in-out' },
    ).finished
    show(mouth, false)
    show(smile, true)
  }

  async function shake() {
    await bob.animate(
      [0, 9, -9, 8, -8, 6, -6, 0].map((d) => ({ transform: `rotate(${d}deg)` })),
      { duration: 560 },
    ).finished
  }

  /** Paddle the front legs, as when digging. */
  async function paddle(ms) {
    const opts = { duration: 180, iterations: Math.round(ms / 180) }
    legs[2].animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-40deg)' }, { transform: 'rotate(10deg)' }], opts)
    await legs[3].animate([{ transform: 'rotate(-30deg)' }, { transform: 'rotate(20deg)' }, { transform: 'rotate(-30deg)' }], opts).finished
  }

  /** Shrink into (or grow out of) the doghouse door. */
  let ducked = null // the "inside" animation, held while he is in the doghouse

  async function duck(into) {
    const out = { transform: `scale(${SCALE})`, opacity: 1 }
    const inside = { transform: `translate(0, -70px) scale(${SCALE * 0.55})`, opacity: 0 }
    if (into) {
      ducked = scaler.animate([out, inside], { duration: 420, easing: 'ease-in-out', fill: 'forwards' })
      await ducked.finished
      return
    }
    const back = scaler.animate([inside, out], { duration: 420, easing: 'ease-in-out', fill: 'forwards' })
    await back.finished
    // Cancel both: if the held "inside" animation outlived this one, he
    // would stay invisible while still walking around.
    back.cancel()
    if (ducked) ducked.cancel()
    ducked = null
  }

  function holdBone(on) {
    show(bone, on)
  }

  place()

  return {
    get x() { return x },
    get facing() { return facing },
    get walking() { return target !== null },
    get stretching() { return stretching || stretch !== 0 },
    /** Mouth position in scene units, for effects. */
    mouth() { return { x: x + facing * 121, y: GROUND - 114 } },
    walkTo, stopWalking, face, tick, bark, nod, lick, lap, shake, paddle, duck, holdBone,
    beginStretch, endStretch, hop, sniff, lookAround, lookUp, scratch, playBow, chaseTail, yawn,
    stamp, snap, watch, pounce, biteTail, howl, sit, startle,
    MIN_X, MAX_X,
  }
})()
