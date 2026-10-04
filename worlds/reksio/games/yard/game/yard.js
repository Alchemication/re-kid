// Reksio's yard: tap the ground and he walks there; tap a thing and he goes
// over and does something with it. The yard is wider than the screen and the
// view follows him, from the house wall on the left to the fence on the right.
// When he has done the five main things, evening comes and he goes to sleep.
// No text, no score; every tap gets an answer.

/* global Painting, Sound, Reksio */
(() => {
  const HINT_EVERY_MS = 6000 // twinkle above something untried if nobody has tapped
  const RESTART_AFTER_MS = 2500 // at the end, taps are ignored this long
  const CAMERA_EASE = 3.5 // how quickly the view catches up with Reksio (per second)
  const DOOR = { x: 560, y: 726 } // doghouse door, scene units
  const EVENING_NEEDS = ['doghouse', 'bowl', 'tap', 'bird', 'dig']

  const $ = (id) => document.getElementById(id)
  const svg = $('world')
  const cam = $('cam')
  const fx = $('fx')
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const SVG_NS = 'http://www.w3.org/2000/svg'

  const done = new Set()
  let busy = false
  let pending = null
  let ended = false
  let endedAt = 0
  let lastTap = performance.now()
  let camX = clampCam(Reksio.x - Painting.VIEW_W / 2)

  function clampCam(v) {
    return Math.max(0, Math.min(Painting.WORLD_W - Painting.VIEW_W, v))
  }

  // ------------------------------------------------------------ effects

  /** Little particles flung in arcs: crumbs, clods of earth, drops, petals. */
  function burst(x, y, n, cls, { dir = 0, spread = 1, height = 60, reach = 70, size = 4 } = {}) {
    for (let i = 0; i < n; i++) {
      const c = document.createElementNS(SVG_NS, 'circle')
      c.setAttribute('class', cls)
      c.setAttribute('cx', x)
      c.setAttribute('cy', y)
      c.setAttribute('r', size * (0.6 + Math.random() * 0.8))
      fx.appendChild(c)
      const side = dir || (Math.random() < 0.5 ? -1 : 1)
      const dx = side * reach * (0.3 + Math.random() * spread)
      const up = height * (0.5 + Math.random())
      c.animate(
        [
          { transform: 'translate(0, 0)', opacity: 1 },
          { transform: `translate(${dx * 0.5}px, ${-up}px)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${dx}px, ${up * 0.4}px)`, opacity: 0 },
        ],
        { duration: 600 + Math.random() * 300, easing: 'ease-out' },
      ).finished.then(() => c.remove())
    }
  }

  /** A small twinkle above a thing: "you can tap me". Nothing solid moves. */
  function twinkle(x, y) {
    const t = document.createElementNS(SVG_NS, 'use')
    t.setAttribute('href', '#twinkle-shape')
    t.setAttribute('class', 'twinkle')
    t.setAttribute('x', x)
    t.setAttribute('y', y)
    t.style.transformOrigin = `${x}px ${y}px`
    fx.appendChild(t)
    t.animate(
      [
        { transform: 'scale(0) rotate(0)', opacity: 0 },
        { transform: 'scale(1.2) rotate(45deg)', opacity: 1, offset: 0.25 },
        { transform: 'scale(0.6) rotate(70deg)', opacity: 0.8, offset: 0.5 },
        { transform: 'scale(1.1) rotate(110deg)', opacity: 1, offset: 0.75 },
        { transform: 'scale(0) rotate(180deg)', opacity: 0 },
      ],
      { duration: 1400, easing: 'ease-in-out' },
    ).finished.then(() => t.remove())
  }

  // ------------------------------------------------------------ the bird

  const bird = $('bird')
  const wing = $('bird-wing')
  const PERCHES = [
    { x: 1480, y: 330 }, // on the wall
    { x: 560, y: 552 }, // on the doghouse roof
    { x: 2350, y: 330 }, // further along the wall
    { x: 2880, y: 602 }, // on the fence rail
  ]
  let perch = 0
  let flying = false

  function birdAt(p) {
    bird.style.transform = `translate(${p.x}px, ${p.y}px)`
  }

  async function flyAway() {
    flying = true
    const from = PERCHES[perch]
    // fly to the perch furthest from Reksio, so the chase can go on
    const choices = PERCHES.map((p, i) => i).filter((i) => i !== perch)
    perch = choices.sort((a, b) => Math.abs(PERCHES[b].x - Reksio.x) - Math.abs(PERCHES[a].x - Reksio.x))[Math.floor(Math.random() * 2)]
    const to = PERCHES[perch]
    const flap = wing.animate(
      [{ transform: 'rotate(0)' }, { transform: 'rotate(-55deg)' }, { transform: 'rotate(0)' }],
      { duration: 160, iterations: Infinity },
    )
    Sound.flutter()
    const top = Math.min(from.y, to.y) - 180
    const mid = { x: (from.x + to.x) / 2, y: top }
    const facing = to.x < from.x ? -1 : 1
    await bird.animate(
      [
        { transform: `translate(${from.x}px, ${from.y}px) scaleX(${facing})` },
        { transform: `translate(${mid.x}px, ${mid.y}px) scaleX(${facing})` },
        { transform: `translate(${to.x}px, ${to.y}px) scaleX(${facing})` },
      ],
      { duration: 1200 + Math.abs(to.x - from.x) * 0.5, easing: 'ease-in-out' },
    ).finished
    flap.cancel()
    birdAt(to)
    Sound.chirp()
    flying = false
  }

  function birdIdle() {
    if (!flying && !ended) {
      $('bird-body').animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }],
        { duration: 300 },
      )
      if (Math.random() < 0.6) Sound.chirp()
    }
    setTimeout(birdIdle, 4000 + Math.random() * 4000)
  }

  // ------------------------------------------------------------ things

  const food = $('food')
  let foodLeft = 1

  const THINGS = {
    doghouse: {
      at: () => DOOR.x,
      async run() {
        Sound.knock()
        await Reksio.duck(true)
        const nap = $('nap')
        const head = $('nap-head')
        await nap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, fill: 'forwards' }).finished
        nap.style.opacity = '1'
        const zs = ['z1', 'z2', 'z3'].map($)
        for (let i = 0; i < 3; i++) {
          Sound.snore()
          head.animate(
            [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.05) translateY(-2px)', offset: 0.45 }, { transform: 'scaleY(1)' }],
            { duration: 1700, easing: 'ease-in-out' },
          )
          zs.forEach((z, k) =>
            z.animate(
              [
                { opacity: 0, transform: 'translate(0, 0)' },
                { opacity: 1, transform: 'translate(4px, -10px)', offset: 0.3 },
                { opacity: 0, transform: 'translate(10px, -34px)' },
              ],
              { duration: 1200, delay: 650 + k * 180, easing: 'ease-out' },
            ),
          )
          await wait(1750)
        }
        Sound.yawn()
        await wait(500)
        await nap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).finished
        nap.style.opacity = '0'
        await Reksio.duck(false)
      },
    },
    bowl: {
      at: () => 764,
      face: 1,
      async run() {
        if (foodLeft <= 0.2) {
          foodLeft = 1
          food.style.transform = 'scaleY(1)'
          await wait(200)
        }
        const lapping = Reksio.lap(10)
        for (let i = 0; i < 5; i++) {
          await wait(380)
          burst(880, 760, 3, 'crumb', { height: 34, reach: 36, size: 3 })
          foodLeft -= 0.16
          food.style.transform = `scaleY(${Math.max(foodLeft, 0.15)})`
        }
        await lapping
        Sound.slurp()
        await Reksio.lick()
      },
    },
    tap: {
      at: () => 1201,
      face: 1,
      async run() {
        const handle = $('tap-handle')
        const water = $('water')
        Sound.squeak()
        handle.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(90deg)' }], { duration: 300, fill: 'forwards' })
        await wait(300)
        water.style.opacity = '1'
        const flow = water.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -80 }], { duration: 400, iterations: Infinity })
        Sound.water(1.9)
        const drinking = Reksio.nod(-10, 1700)
        for (let i = 0; i < 5; i++) {
          burst(1322, 790, 3, 'drop', { height: 30, reach: 30, size: 3 })
          await wait(320)
        }
        await drinking
        flow.cancel()
        water.style.opacity = '0'
        handle.animate([{ transform: 'rotate(90deg)' }, { transform: 'rotate(0)' }], { duration: 300, fill: 'forwards' })
        await wait(250)
        Sound.shake()
        burst(Reksio.x, 730, 14, 'drop', { height: 70, reach: 90, size: 3.5 })
        await Reksio.shake()
      },
    },
    flowers: {
      at: () => 1483,
      face: 1,
      async run() {
        for (let i = 0; i < 3; i++) {
          Sound.step()
          await Reksio.nod(8, 260)
        }
        await wait(150)
        Sound.sneeze()
        await wait(320)
        Reksio.nod(-24, 380)
        burst(1640, 680, 12, 'petal', { height: 70, reach: 110, size: 5 })
        await wait(500)
      },
    },
    house: {
      at: () => Reksio.MIN_X,
      face: -1,
      async run() {
        await Reksio.nod(-20, 300)
        await Reksio.bark()
        Sound.curtain()
        await $('curtain').animate(
          [{ transform: 'skewX(0)' }, { transform: 'skewX(-8deg)' }, { transform: 'skewX(4deg)' }, { transform: 'skewX(0)' }],
          { duration: 900, easing: 'ease-in-out' },
        ).finished
      },
    },
    gate: {
      at: () => Reksio.MAX_X,
      face: 1,
      async run() {
        Sound.rattle()
        $('gate').animate(
          [0, -1.5, 1.5, -1, 1, 0].map((d) => ({ transform: `rotate(${d}deg)` })),
          { duration: 600 },
        )
        await Reksio.nod(10, 500)
        await Reksio.bark()
      },
    },
    bird: {
      at: () => PERCHES[perch].x - 110,
      face: 1,
      async run() {
        if (flying) return
        await Reksio.nod(-22, 300)
        await Reksio.bark()
        await flyAway()
      },
    },
    dig: {
      at: () => 2000,
      face: 1,
      async run() {
        Reksio.holdBone(false)
        const digging = Reksio.paddle(1300)
        Sound.dig()
        for (let i = 0; i < 6; i++) {
          burst(2040, 790, 3, 'clod', { dir: -1, height: 80, reach: 120, size: 4.5 })
          await wait(200)
        }
        await digging
        const bone = $('found-bone')
        bone.style.opacity = '1'
        await bone.animate(
          [{ transform: 'translateY(30px) scale(0.4)' }, { transform: 'translateY(-50px) scale(1.2)' }, { transform: 'translateY(-30px) scale(1)' }],
          { duration: 600, easing: 'ease-out', fill: 'forwards' },
        ).finished
        Sound.ding()
        await wait(500)
        bone.style.opacity = '0'
        Reksio.holdBone(true)
        Sound.original('bark') // easter egg: his original quick barks, if the clip exists
        await Reksio.nod(-14, 700)
      },
    },
  }

  async function goAndDo(name) {
    const thing = THINGS[name]
    const arrived = await Reksio.walkTo(thing.at())
    if (!arrived) return // tapped elsewhere on the way
    if (thing.face) Reksio.face(thing.face)
    busy = true
    try {
      await thing.run()
    } finally {
      busy = false
    }
    done.add(name)
    if (EVENING_NEEDS.every((n) => done.has(n)) && !ended) {
      evening()
      return
    }
    if (pending) {
      const next = pending
      pending = null
      next()
    }
  }

  // ------------------------------------------------------------ the end

  async function evening() {
    ended = true
    $('evening').classList.add('on')
    Sound.lullaby()
    await wait(1600)
    if (await Reksio.walkTo(DOOR.x)) {
      Sound.knock()
      await Reksio.duck(true)
    }
    await wait(700)
    const iris = $('iris')
    iris.style.setProperty('--x', `${((DOOR.x - camX) / Painting.VIEW_W) * 100}%`)
    iris.style.setProperty('--y', `${(DOOR.y / 900) * 100}%`)
    const start = performance.now()
    await new Promise((resolve) => {
      function close(t) {
        const k = Math.min(1, (t - start) / 2600)
        iris.style.setProperty('--r', `${(1 - k) * (1 - k) * 120}%`)
        if (k < 1) requestAnimationFrame(close)
        else resolve()
      }
      requestAnimationFrame(close)
    })
    endedAt = performance.now()
  }

  // ------------------------------------------------------------ input

  function command(fn) {
    lastTap = performance.now()
    if (ended) {
      if (endedAt && performance.now() - endedAt > RESTART_AFTER_MS) location.reload()
      return
    }
    if (busy) pending = fn
    else fn()
  }

  /** Where in the yard (scene units) a pointer event landed. */
  function yardX(e) {
    const p = svg.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    return p.matrixTransform(svg.getScreenCTM().inverse()).x + camX
  }

  $('stage').addEventListener('pointerdown', (e) => {
    if (e.target.closest('#fullscreen')) return
    e.preventDefault()
    Sound.ensure()
    const thing = e.target.closest('[data-thing]')
    if (thing) return command(() => goAndDo(thing.dataset.thing))
    if (e.target.closest('#reksio')) return command(() => Reksio.bark())
    const x = yardX(e)
    command(() => Reksio.walkTo(x))
  })

  function nearest() {
    let best = null
    for (const [name, thing] of Object.entries(THINGS)) {
      const d = Math.abs(thing.at() - Reksio.x)
      if (d < 160 && (!best || d < best.d)) best = { name, d }
    }
    return best && best.name
  }

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (['Shift', 'Meta', 'Control', 'Alt', 'CapsLock', 'Tab', 'Escape'].includes(e.key)) return
    e.preventDefault()
    Sound.ensure()
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (!e.repeat) command(() => Reksio.walkTo(e.key === 'ArrowLeft' ? Reksio.MIN_X : Reksio.MAX_X))
      return
    }
    if (e.repeat) return
    if (e.key === ' ' || e.key === 'Enter') {
      const name = nearest()
      return command(() => (name ? goAndDo(name) : Reksio.bark()))
    }
    command(() => Reksio.bark())
  })

  document.addEventListener('keyup', (e) => {
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !busy) Reksio.stopWalking()
  })

  document.addEventListener('contextmenu', (e) => e.preventDefault())

  $('fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
  })

  // ------------------------------------------------------------ life

  function hint() {
    if (!ended && !busy && !Reksio.walking && performance.now() - lastTap > HINT_EVERY_MS) {
      const visible = EVENING_NEEDS.filter((n) => {
        if (done.has(n)) return false
        const x = n === 'bird' ? PERCHES[perch].x : THINGS[n].at() + 100
        return x > camX + 60 && x < camX + Painting.VIEW_W - 60
      })
      const name = visible[Math.floor(Math.random() * visible.length)]
      if (name === 'bird') {
        twinkle(PERCHES[perch].x, PERCHES[perch].y - 80)
      } else if (name) {
        const el = document.querySelector(`[data-thing="${name}"]`)
        const box = el.querySelector('.hit').getBBox()
        twinkle(box.x + box.width / 2, Number(el.dataset.hintY) || box.y)
      }
      lastTap = performance.now() - HINT_EVERY_MS + 3500
    }
    setTimeout(hint, 1000)
  }

  let last = performance.now()
  let shownCam = -1
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000)
    last = t
    Reksio.tick(dt)
    const target = clampCam(Reksio.x - Painting.VIEW_W / 2)
    camX += (target - camX) * Math.min(1, dt * CAMERA_EASE)
    if (Math.abs(camX - shownCam) > 0.05) {
      shownCam = camX
      cam.style.transform = `translateX(${-camX}px)`
      Painting.render(camX)
    }
    requestAnimationFrame(frame)
  }

  const paint = () => {
    Painting.setup($('paint'))
    Painting.render(camX)
  }
  new ResizeObserver(paint).observe($('paint'))
  paint()

  birdAt(PERCHES[0])
  requestAnimationFrame(frame)
  setTimeout(birdIdle, 3000)
  setTimeout(hint, 1000)

  window.yardGame = { goAndDo, done, state: () => ({ busy, ended, done: [...done], camX }) } // for testing
})()
