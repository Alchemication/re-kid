// Reksio's yard: tap the ground and he walks there; tap a thing and he goes
// over and does something with it. When he has done all five, evening comes
// and he goes to sleep in his doghouse. No text, no score.

/* global Painting, Sound, Reksio */
(() => {
  const HINT_EVERY_MS = 6000 // wiggle something untried if nobody has tapped
  const RESTART_AFTER_MS = 2500 // at the end, taps are ignored this long
  const DOOR = { x: 275, y: 726 } // doghouse door, scene units

  const $ = (id) => document.getElementById(id)
  const svg = $('world')
  const fx = $('fx')
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))

  const done = new Set()
  let busy = false
  let pending = null
  let ended = false
  let endedAt = 0
  let lastTap = performance.now()

  // ------------------------------------------------------------ effects

  /** Little particles flung in arcs: crumbs, clods of earth, drops. */
  function burst(x, y, n, cls, { dir = 0, spread = 1, height = 60, reach = 70, size = 4 } = {}) {
    for (let i = 0; i < n; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
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

  function wiggle(el) {
    el.animate(
      [0, -4, 4, -3, 3, 0].map((d) => ({ transform: `rotate(${d}deg)` })),
      { duration: 700, easing: 'ease-in-out' },
    )
  }

  // ------------------------------------------------------------ the bird

  const bird = $('bird')
  const wing = $('bird-wing')
  const PERCHES = [
    { x: 1150, y: 330 }, // on the wall
    { x: 275, y: 552 }, // on the doghouse roof
    { x: 640, y: 330 }, // further along the wall
  ]
  let perch = 0
  let flying = false

  function birdAt(p) {
    bird.style.transform = `translate(${p.x}px, ${p.y}px)`
  }

  async function flyAway() {
    flying = true
    const from = PERCHES[perch]
    perch = (perch + 1) % PERCHES.length
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
      { duration: 1500, easing: 'ease-in-out' },
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
        const peek = $('peek')
        const face = $('peek-face')
        peek.style.opacity = '1'
        await face.animate([{ transform: 'translateY(70px)' }, { transform: 'translateY(0)' }], { duration: 450, easing: 'ease-out', fill: 'forwards' }).finished
        const eyes = $('peek-eyes')
        await eyes.animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
          { duration: 1100 },
        ).finished
        Sound.bark()
        await wait(500)
        await face.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(70px)' }], { duration: 380, easing: 'ease-in', fill: 'forwards' }).finished
        peek.style.opacity = '0'
        await Reksio.duck(false)
      },
    },
    bowl: {
      at: () => 440,
      face: 1,
      async run() {
        if (foodLeft <= 0.2) {
          foodLeft = 1
          food.style.transform = 'scaleY(1)'
          await wait(200)
        }
        const eating = Reksio.nod(24, 1900)
        for (let i = 0; i < 4; i++) {
          await wait(330)
          Sound.munch()
          burst(570, 760, 4, 'crumb', { height: 40, reach: 40, size: 3 })
          foodLeft -= 0.2
          food.style.transform = `scaleY(${Math.max(foodLeft, 0.15)})`
        }
        await eating
        Sound.slurp()
        await Reksio.lick()
      },
    },
    tap: {
      at: () => 742,
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
          burst(882, 790, 3, 'drop', { height: 30, reach: 30, size: 3 })
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
      at: () => 1288,
      face: 1,
      async run() {
        Reksio.holdBone(false)
        const digging = Reksio.paddle(1300)
        Sound.dig()
        for (let i = 0; i < 6; i++) {
          burst(1340, 790, 3, 'clod', { dir: -1, height: 80, reach: 120, size: 4.5 })
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
    if (done.size === Object.keys(THINGS).length && !ended) {
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
    await wait(500)
    const iris = $('iris')
    iris.style.setProperty('--x', `${(DOOR.x / 1600) * 100}%`)
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

  function sceneX(e) {
    const p = svg.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    return p.matrixTransform(svg.getScreenCTM().inverse()).x
  }

  $('stage').addEventListener('pointerdown', (e) => {
    if (e.target.closest('#fullscreen')) return
    e.preventDefault()
    Sound.ensure()
    const thing = e.target.closest('[data-thing]')
    if (thing) return command(() => goAndDo(thing.dataset.thing))
    if (e.target.closest('#reksio')) return command(() => Reksio.bark())
    const x = sceneX(e)
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
      if (!e.repeat) command(() => Reksio.walkTo(Reksio.x + (e.key === 'ArrowLeft' ? -2000 : 2000)))
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
      const untried = Object.keys(THINGS).filter((n) => !done.has(n) && n !== 'bird')
      const name = untried[Math.floor(Math.random() * untried.length)]
      const el = name && document.querySelector(`[data-thing="${name}"] .wiggle`)
      if (el) wiggle(el)
      lastTap = performance.now() - HINT_EVERY_MS + 3500
    }
    setTimeout(hint, 1000)
  }

  const noise = $('boil-noise')
  let seed = 1
  setInterval(() => noise.setAttribute('seed', String((seed = (seed % 3) + 1))), 140)

  let last = performance.now()
  function frame(t) {
    Reksio.tick(Math.min(0.05, (t - last) / 1000))
    last = t
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  birdAt(PERCHES[0])
  setTimeout(birdIdle, 3000)
  setTimeout(hint, 1000)

  const paint = () => Painting.draw($('paint'))
  new ResizeObserver(paint).observe($('paint'))
  paint()

  window.yardGame = { goAndDo, done, state: () => ({ busy, ended, done: [...done] }) } // for testing
})()
