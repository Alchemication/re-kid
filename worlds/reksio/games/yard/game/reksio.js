// Reksio himself: where he is, which way he faces, walking, and his small
// moves (bark, nod, shake, ducking into the doghouse). Drawn in index.html.

/* global Sound */
/* exported Reksio */
const Reksio = (() => {
  const GROUND = 812 // y of his feet, in scene units
  const SCALE = 1.7
  const SPEED = 300 // scene units per second
  const MIN_X = 90
  const MAX_X = 1510

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

  let x = 700
  let facing = 1
  let target = null
  let arrive = null // resolves the current walk: true if he got there
  let phase = 0
  let lastStepSign = 1
  let idleTime = 0

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

  function tick(dt) {
    if (target !== null) {
      const dx = target - x
      const step = SPEED * dt
      if (Math.abs(dx) <= step) {
        x = target
        target = null
        const done = arrive
        arrive = null
        if (done) done(true)
      } else {
        x += Math.sign(dx) * step
      }
      phase += dt * 15
      const swing = Math.sin(phase) * 24
      legs[0].style.transform = `rotate(${swing}deg)`
      legs[3].style.transform = `rotate(${swing}deg)`
      legs[1].style.transform = `rotate(${-swing}deg)`
      legs[2].style.transform = `rotate(${-swing}deg)`
      bob.style.transform = `translateY(${-Math.abs(Math.sin(phase)) * 3}px)`
      const sign = Math.sign(Math.sin(phase))
      if (sign !== lastStepSign) {
        lastStepSign = sign
        Sound.step()
      }
      idleTime = 0
    } else {
      legs.forEach((l) => (l.style.transform = ''))
      idleTime += dt
      bob.style.transform = `translateY(${Math.sin(idleTime * 2.2) * 0.8}px)`
    }
    tail.style.transform = `rotate(${Math.sin(performance.now() / (target !== null ? 90 : 260)) * 10}deg)`
    place()
  }

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
  async function duck(into) {
    const out = { transform: `scale(${SCALE})`, opacity: 1 }
    const inside = { transform: `translate(0, -70px) scale(${SCALE * 0.55})`, opacity: 0 }
    const anim = scaler.animate(into ? [out, inside] : [inside, out], { duration: 420, easing: 'ease-in-out', fill: 'forwards' })
    await anim.finished
    if (!into) anim.cancel()
  }

  function holdBone(on) {
    show(bone, on)
  }

  place()

  return {
    get x() { return x },
    get facing() { return facing },
    get walking() { return target !== null },
    /** Mouth position in scene units, for effects. */
    mouth() { return { x: x + facing * 143, y: GROUND - 110 } },
    walkTo, stopWalking, face, tick, bark, nod, lick, shake, paddle, duck, holdBone,
  }
})()
