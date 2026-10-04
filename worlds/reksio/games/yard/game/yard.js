// Reksio's yard: tap the ground and he walks there; tap a thing and he goes
// over and does something with it. The yard is wider than the screen and the
// view follows him, from the house wall on the left to the fence on the right.
// Pressing and holding on Reksio stretches him like a dachshund. Each play
// counts four main things (layout.js picks them); when they're done, evening
// comes and he goes to sleep. Every usable thing has an action spot on the
// ground: stand in it and space uses the thing; tap it and Reksio goes there.
// No text, no score; every tap gets an answer.

/* global Layout, Painting, Sound, Music, Reksio, Creatures, Weather */
(() => {
  const WISH_SHOW_MS = 4000 // how long a thought bubble stays up
  const WISH_GAP_MS = 12000 // at least this long between bubbles
  const IDLE_FIRST_MS = 2500 // left alone this long, Reksio starts doing things
  const IDLE_GAP_MS = [1500, 3500] // then something new every 1.5–3.5 s
  const HOLD_MS = 230 // a press on Reksio longer than this stretches him; shorter barks
  const RESTART_AFTER_MS = 2500 // at the end, taps are ignored this long
  const CAMERA_EASE = 3.5 // how quickly the view catches up with Reksio (per second)
  const DOOR = { x: 560, y: 726 } // doghouse door, scene units
  const EVENING_NEEDS = Layout.mains // this play's main things
  const X = Layout.x // per-play offset of a movable thing, scene units
  const FRAMES_DRAWN = [2290, 2360, 2430, 2500, 2570] // film frame centres as drawn
  const FRAMES = FRAMES_DRAWN.map((f) => f + X('film')) // …and where they are this play
  const PAW_REACH = 31 // from Reksio's middle to where his front paws land

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
    { x: Layout.perches[0], y: 330 }, // on the wall, over open ground (layout.js)
    { x: 560, y: 552 }, // on the doghouse roof
    { x: Layout.perches[1], y: 330 }, // further along the wall
    { x: 2880 + X('gate'), y: 602 }, // on the fence rail
  ]
  let perch = 0
  let flying = false

  function birdAt(p) {
    bird.style.transform = `translate(${p.x}px, ${p.y}px)`
  }

  /** Fly from one point to another in an arc, wings flapping. */
  async function flyBetween(from, to) {
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
    return facing
  }

  /** Off to the perch furthest from Reksio, so the chase can go on. */
  async function flyAway(from = PERCHES[perch]) {
    flying = true
    const choices = PERCHES.map((p, i) => i).filter((i) => i !== perch)
    perch = choices.sort((a, b) => Math.abs(PERCHES[b].x - Reksio.x) - Math.abs(PERCHES[a].x - Reksio.x))[Math.floor(Math.random() * 2)]
    const to = PERCHES[perch]
    Music.react.bird()
    await flyBetween(from, to)
    birdAt(to)
    Sound.chirp()
    flying = false
  }

  /** After rain: down to a worm, a few pecks, and back up to a perch. */
  async function birdHunt(worm) {
    if (flying) return
    flying = true
    const land = { x: worm.x + 30, y: worm.y + 6 }
    await flyBetween(PERCHES[perch], land)
    bird.style.transform = `translate(${land.x}px, ${land.y}px) scaleX(-1)`
    for (let i = 0; i < 3; i++) {
      await $('bird-body').animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-30deg)' }, { transform: 'rotate(0)' }], { duration: 260 }).finished
    }
    worm.eat()
    Sound.chirp()
    await wait(500)
    await flyAway(land)
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
  let stamped = 0 // film frames stamped so far

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
          Music.react.snore(i)
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
      at: () => 764 + X('bowl'),
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
          burst(880 + X('bowl'), 760, 3, 'crumb', { height: 34, reach: 36, size: 3 })
          foodLeft -= 0.16
          food.style.transform = `scaleY(${Math.max(foodLeft, 0.15)})`
        }
        await lapping
        Sound.slurp()
        await Reksio.lick()
      },
    },
    tap: {
      at: () => 1201 + X('tap'),
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
          burst(1322 + X('tap'), 790, 3, 'drop', { height: 30, reach: 30, size: 3 })
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
      at: () => 1483 + X('flowers'),
      face: 1,
      async run() {
        for (let i = 0; i < 3; i++) {
          Sound.step()
          await Reksio.nod(8, 260)
        }
        await wait(150)
        Sound.sneeze()
        Music.react.sneeze()
        await wait(320)
        Reksio.nod(-24, 380)
        burst(1640 + X('flowers'), 680, 12, 'petal', { height: 70, reach: 110, size: 5 })
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
    film: {
      at: () => FRAMES[Math.min(stamped, FRAMES.length - 1)] - PAW_REACH,
      face: 1,
      async run() {
        if (stamped >= FRAMES.length) {
          // already a reel: give it a spin
          Sound.reel()
          await $('reel').animate([{ transform: 'rotate(0)' }, { transform: 'rotate(720deg)' }], { duration: 900, easing: 'ease-out' }).finished
          await Reksio.bark()
          return
        }
        const prints = document.querySelectorAll('#strip .print')
        for (let i = stamped; i < FRAMES.length; i++) {
          if (i > stamped) await Reksio.walkTo(FRAMES[i] - PAW_REACH)
          Reksio.face(1)
          await Reksio.stamp(() => {
            Sound.thump()
            Music.react.stamp()
            const print = prints[i]
            print.setAttribute('opacity', '1')
            print.style.transformOrigin = `${FRAMES_DRAWN[i]}px 791px` // inside the moved strip
            print.animate([{ transform: 'scale(1.6)', opacity: 0.2 }, { transform: 'scale(1)', opacity: 1 }], { duration: 220, easing: 'ease-out' })
            burst(FRAMES[i], 812, 5, 'dust', { height: 22, reach: 40, size: 3.5 })
          })
          stamped = i + 1
        }
        await wait(350)
        // the full strip rolls up into a reel
        Sound.reel()
        const strip = $('strip')
        const reel = $('reel')
        reel.setAttribute('opacity', '1')
        reel.animate([{ transform: 'scale(0.2) rotate(0)' }, { transform: 'scale(1) rotate(900deg)' }], { duration: 900, easing: 'ease-out' })
        await strip.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 900, easing: 'ease-in', fill: 'forwards' }).finished
        strip.style.visibility = 'hidden'
        await Reksio.hop(50, 2)
      },
    },
    bird: {
      at: () => PERCHES[perch].x - 70,
      face: 1,
      async run() {
        if (flying) return
        await Reksio.nod(-22, 300)
        await Reksio.bark()
        await flyAway()
      },
    },
    dig: {
      at: () => 2000 + X('dig'),
      face: 1,
      async run() {
        Reksio.holdBone(false)
        const digging = Reksio.paddle(1300)
        Sound.dig()
        for (let i = 0; i < 6; i++) {
          burst(2040 + X('dig'), 790, 3, 'clod', { dir: -1, height: 80, reach: 120, size: 4.5 })
          await wait(200)
        }
        await digging
        const bone = $('found-bone')
        bone.style.opacity = '1'
        await bone.animate(
          [{ transform: 'translateY(30px) scale(0.4)' }, { transform: 'translateY(-50px) scale(1.2)' }, { transform: 'translateY(-30px) scale(1)' }],
          { duration: 600, easing: 'ease-out', fill: 'forwards' },
        ).finished
        Music.react.wish()
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
    const firstTime = EVENING_NEEDS.includes(name) && !done.has(name)
    done.add(name)
    sunset()
    if (EVENING_NEEDS.every((n) => done.has(n)) && !ended) {
      evening()
      return
    }
    if (firstTime) {
      Music.react.done()
      fillSlot(name)
    }
    if (firstTime && !pending) await Reksio.hop() // a hop of joy
    runPending()
  }

  function runPending() {
    if (pending) {
      const next = pending
      pending = null
      next()
    }
  }

  // ------------------------------------------------------------ the stretch

  // A press on Reksio: let go quickly and he barks; hold and he stretches,
  // then snaps back when let go.
  let hold = null

  function holdStart() {
    if (ended || busy || hold) return command(() => Reksio.bark())
    lastTap = performance.now()
    hold = { stretching: false, stopSound: null }
    const mine = hold
    mine.timer = setTimeout(() => {
      if (hold !== mine) return
      mine.stretching = true
      busy = true
      Reksio.beginStretch()
      mine.stopSound = stretchMusic()
    }, HOLD_MS)
  }

  /** While he stretches, the bassoon climbs a note at a time. */
  function stretchMusic() {
    let n = 0
    Music.react.stretchStep(n++)
    const id = setInterval(() => Music.react.stretchStep(n++), 300)
    return () => clearInterval(id)
  }

  async function holdEnd() {
    if (!hold) return
    const h = hold
    hold = null
    clearTimeout(h.timer)
    if (!h.stretching) return command(() => Reksio.bark())
    lastTap = performance.now()
    h.stopSound()
    Music.react.snap()
    await Reksio.endStretch()
    busy = false
    runPending()
  }

  // ------------------------------------------------------------ the sunset

  // Sun colour per step (0 to 6 main things done): yellow, through orange, to red.
  const SUN_COLORS = ['#fbe08a', '#fbd57a', '#f9c05a', '#f6a64a', '#ef8a3e', '#e46c34', '#d9542e']
  const SUN_STEP = 44 // how far the sun sinks per step, scene units

  /** Lower the sun and warm the sky to match how much is done. */
  function sunset() {
    // the same six-step sunset, whatever the number of main things this play
    const step = Math.round((EVENING_NEEDS.filter((n) => done.has(n)).length / EVENING_NEEDS.length) * 6)
    $('sun').style.transform = `translateY(${step * SUN_STEP}px)`
    document.querySelector('#sun .sun').style.fill = SUN_COLORS[step]
    document.querySelector('#sun .sun-glow').style.fill = SUN_COLORS[step]
    $('sunset').style.opacity = String(step * 0.095)
    Music.setDusk(step)
  }

  // ------------------------------------------------------------ creatures

  // Tapping a creature: Reksio goes after it, in his own way.
  const CRITTERS = {
    async snail() {
      const sn = Creatures.snail
      if (sn && (await Reksio.walkTo(sn.x - 150 * Math.sign(sn.x - Reksio.x || 1)))) {
        Reksio.face(sn.x > Reksio.x ? 1 : -1)
        await Reksio.sniff(3)
        await Reksio.lookAround(700)
      }
    },
    async worm() {
      const w = Creatures.worm
      if (w && (await Reksio.walkTo(w.x - 130 * Math.sign(w.x - Reksio.x || 1)))) await Reksio.sniff(2)
    },
    async fly() {
      const f = Creatures.fly
      if (!f) return
      if (await Reksio.walkTo(f.x - 140 * Math.sign(f.x - Reksio.x || 1))) {
        await Reksio.watch(() => Creatures.fly, 900)
        const g = Creatures.fly
        if (g) await Reksio.pounce(g.x)
      }
    },
    async bee() {
      const b = Creatures.bee
      if (b && (await Reksio.walkTo(b.x - 120))) {
        Reksio.face(1)
        await Reksio.sniff(2)
        await Reksio.startle()
      }
    },
    async spider() {
      const spot = Creatures.webSpot()
      if (await Reksio.walkTo(spot.x)) {
        Reksio.face(-1)
        await Reksio.lookUp(600)
        const nose = Reksio.mouth()
        const visiting = Creatures.spider.visit(nose.y - 8)
        await wait(900)
        await Reksio.startle()
        await visiting
      }
    },
  }

  async function chase(name) {
    busy = true
    try {
      await CRITTERS[name]()
    } finally {
      busy = false
    }
    runPending()
  }

  // ------------------------------------------------------------ the end

  async function evening() {
    ended = true
    Weather.stop()
    await wait(1800) // let the last step of the sunset be seen
    $('evening').classList.add('on')
    Music.evening()
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
    Music.start()
    const critter = e.target.closest('[data-critter]')
    if (critter) return command(() => chase(critter.dataset.critter))
    const thing = e.target.closest('[data-thing]')
    if (thing) return command(() => goAndDo(thing.dataset.thing))
    if (e.target.closest('#reksio')) return holdStart()
    const x = yardX(e)
    command(() => Reksio.walkTo(x))
  })

  // ------------------------------------------------------------ action spots

  // Where Reksio must stand to use each thing: a wide oval on the ground,
  // drawn faintly and lit up when he is in it. Generous on purpose.
  // x = centre, r = half-width, both scene units.
  const SPOTS = {
    house: () => ({ x: 410, r: 70 }),
    doghouse: () => ({ x: 560, r: 130 }),
    bowl: () => ({ x: 830 + X('bowl'), r: 120 }),
    tap: () => ({ x: 1260 + X('tap'), r: 120 }),
    flowers: () => ({ x: 1570 + X('flowers'), r: 130 }),
    dig: () => ({ x: 2060 + X('dig'), r: 130 }),
    film: () => ({ x: 2430 + X('film'), r: 220 }),
    gate: () => ({ x: Reksio.MAX_X + 20, r: 90 }),
    bird: () => ({ x: PERCHES[perch].x - 30, r: 130 }), // on the ground, under the bird
  }
  const spotEls = {}

  function makeSpots() {
    for (const name of Object.keys(SPOTS)) {
      if (Layout.hidden.includes(name)) continue
      const e = document.createElementNS(SVG_NS, 'ellipse')
      e.setAttribute('class', `spot ${EVENING_NEEDS.includes(name) ? 'main' : 'extra'}`)
      e.setAttribute('data-thing', name)
      e.setAttribute('cy', '826')
      e.setAttribute('ry', '30')
      $('spots').appendChild(e)
      spotEls[name] = e
    }
    placeSpots()
  }

  function placeSpots() {
    for (const [name, e] of Object.entries(spotEls)) {
      const { x, r } = SPOTS[name]()
      e.setAttribute('cx', x)
      e.setAttribute('rx', r)
    }
  }

  /** The thing whose spot Reksio is standing in (nearest centre wins). */
  function nearest() {
    let best = null
    for (const name of Object.keys(spotEls)) {
      if (name === 'bird' && flying) continue
      const { x, r } = SPOTS[name]()
      const d = Math.abs(Reksio.x - x)
      if (d <= r && (!best || d < best.d)) best = { name, d }
    }
    return best && best.name
  }

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (['Shift', 'Meta', 'Control', 'Alt', 'CapsLock', 'Tab', 'Escape'].includes(e.key)) return
    e.preventDefault()
    Sound.ensure()
    Music.start()
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (!e.repeat) command(() => Reksio.walkTo(e.key === 'ArrowLeft' ? Reksio.MIN_X : Reksio.MAX_X))
      return
    }
    if (e.repeat) return
    if (e.key === ' ' || e.key === 'Enter') {
      const name = nearest()
      return command(() => (name ? goAndDo(name) : Reksio.bark()))
    }
    // any other key: tap to bark, hold to stretch
    holdKey = e.key
    holdStart()
  })

  let holdKey = null
  document.addEventListener('keyup', (e) => {
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !busy) Reksio.stopWalking()
    if (e.key === holdKey) {
      holdKey = null
      holdEnd()
    }
  })

  window.addEventListener('pointerup', () => holdEnd())
  window.addEventListener('pointercancel', () => holdEnd())
  window.addEventListener('blur', () => holdEnd())

  // the mouse over a thing lights up its spot
  $('stage').addEventListener('pointerover', (e) => {
    const thing = e.target.closest('#things [data-thing]')
    if (thing && spotEls[thing.dataset.thing]) spotEls[thing.dataset.thing].classList.add('hover')
  })
  $('stage').addEventListener('pointerout', (e) => {
    const thing = e.target.closest('#things [data-thing]')
    if (thing && spotEls[thing.dataset.thing]) spotEls[thing.dataset.thing].classList.remove('hover')
  })

  document.addEventListener('contextmenu', (e) => e.preventDefault())

  $('fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
  })

  // ------------------------------------------------------------ life

  // A thought bubble above Reksio, with a picture of the nearest main thing
  // he hasn't done yet; that thing twinkles too if it's on screen. Only the
  // five main things ever appear, so it's clear which ones count.
  const wishEl = $('wish')
  let wishing = null
  let wishShownAt = 0
  let lastWishAt = -Infinity

  function thingCenter(name) {
    if (name === 'bird') return { x: PERCHES[perch].x, y: PERCHES[perch].y - 80 }
    const el = document.querySelector(`#things [data-thing="${name}"]`)
    const box = el.querySelector('.hit').getBBox()
    return { x: box.x + box.width / 2 + X(name), y: Number(el.dataset.hintY) || box.y }
  }

  function placeWish() {
    // the bubble sits over his head, which is ahead of his middle
    wishEl.style.transform = `translateX(${Reksio.facing > 0 ? 0 : -112}px)`
  }

  function showWish(name) {
    wishing = name
    wishShownAt = performance.now()
    lastWishAt = wishShownAt
    document.querySelectorAll('.wish-icon').forEach((icon) => {
      icon.style.opacity = icon.dataset.wish === name ? '1' : '0'
    })
    placeWish()
    wishEl.style.opacity = '1'
    $('wish-pop').animate(
      [{ transform: 'scale(0)' }, { transform: 'scale(1.12)', offset: 0.7 }, { transform: 'scale(1)' }],
      { duration: 320, easing: 'ease-out' },
    )
    Music.react.wish()
    const c = thingCenter(name)
    if (c.x > camX + 60 && c.x < camX + Painting.VIEW_W - 60) twinkle(c.x, c.y)
  }

  function hideWish() {
    wishing = null
    wishEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250 })
    wishEl.style.opacity = '0'
  }

  // ------------------------------------------------------------ spots and tray

  // What is left shows on the ground and on the tray: a main thing's spot is
  // bright until it is done, then faint like the extras; the spot Reksio is
  // standing in (or the mouse is over) glows. A done thing's picture fills in
  // on the tray.
  function showNear() {
    const name = !busy && !ended ? nearest() : null
    for (const [n, e] of Object.entries(spotEls)) {
      e.classList.toggle('on', n === name)
      e.classList.toggle('main', EVENING_NEEDS.includes(n) && !done.has(n))
      e.classList.toggle('extra', !EVENING_NEEDS.includes(n) || done.has(n))
    }
  }

  function makeTray() {
    EVENING_NEEDS.forEach((name, i) => {
      const g = document.createElementNS(SVG_NS, 'g')
      g.setAttribute('class', 'slot pending')
      g.setAttribute('data-thing', name)
      g.setAttribute('transform', `translate(${58 + i * 74} 54)`)
      g.innerHTML =
        '<circle r="31" />' +
        `<use class="slot-icon" href="#icon-${name}" transform="scale(0.62) translate(-56 252)" />` +
        '<circle class="tick" cx="22" cy="-22" r="9" />'
      $('tray').appendChild(g)
    })
  }

  function fillSlot(name) {
    const slot = document.querySelector(`#tray [data-thing="${name}"]`)
    if (!slot) return
    slot.classList.remove('pending')
    slot.classList.add('done')
    slot.animate(
      [{ transform: `${slot.getAttribute('transform')} scale(1)` }, { transform: `${slot.getAttribute('transform')} scale(1.35)` }, { transform: `${slot.getAttribute('transform')} scale(1)` }],
      { duration: 500, easing: 'ease-out' },
    )
  }

  // ------------------------------------------------------------ left alone

  // One loop decides what Reksio does when nobody is tapping: a thought
  // bubble now and then, otherwise a dog move, picked at random (never the
  // same one twice running) and a little different each time.
  const rnd = (lo, hi) => lo + Math.random() * (hi - lo)
  let nextIdleAt = 0
  let acting = false
  let lastAct = null
  let firstWish = true

  function wishFor() {
    const left = EVENING_NEEDS.filter((n) => !done.has(n))
    const dist = (n) => Math.abs((n === 'bird' ? PERCHES[perch].x : THINGS[n].at()) - Reksio.x)
    return left.sort((a, b) => dist(a) - dist(b))[0]
  }

  function birdOnScreen() {
    const x = PERCHES[perch].x
    return x > camX && x < camX + Painting.VIEW_W
  }

  const ACTS = {
    wish: { weight: 2, ok: () => wishFor() && performance.now() - lastWishAt > WISH_GAP_MS, run: () => showWish(wishFor()), ms: WISH_SHOW_MS + 600 },
    sniff: { weight: 3, run: () => Reksio.sniff() },
    wander: {
      weight: 3,
      async run() {
        const dir = Math.random() < 0.5 ? -1 : 1
        if (await Reksio.walkTo(Reksio.x + dir * rnd(80, 260)) && Math.random() < 0.7) await Reksio.sniff()
      },
    },
    look: { weight: 2, run: () => Reksio.lookAround() },
    lookUp: {
      weight: 2,
      async run() {
        if (birdOnScreen()) Reksio.face(PERCHES[perch].x > Reksio.x ? 1 : -1)
        await Reksio.lookUp()
      },
    },
    scratch: { weight: 2, run: () => Reksio.scratch() },
    hop: { weight: 2, run: () => Reksio.hop() },
    bow: { weight: 2, run: () => Reksio.playBow() },
    tail: { weight: 1, run: () => Reksio.chaseTail() },
    drops: { weight: 6, ok: () => Weather.raining, run: () => Reksio.catchDrops() },
    shakeOff: { weight: 3, ok: () => Weather.raining, run: () => { Sound.shake(); burst(Reksio.x, 730, 12, 'drop', { height: 60, reach: 80, size: 3 }); return Reksio.shake() } },
    puddle: {
      // a puddle nearby: jump in it
      weight: 6,
      ok: () => Weather.puddles.some((p) => Math.abs(p.x - Reksio.x) < 700),
      async run() {
        const p = Weather.puddles.reduce((a, b) => (Math.abs(a.x - Reksio.x) < Math.abs(b.x - Reksio.x) ? a : b))
        if (await Reksio.walkTo(p.x - Math.sign(p.x - Reksio.x || 1) * 90)) {
          await Reksio.pounce(p.x)
          await Reksio.hop(30, 2)
          Sound.shake()
          burst(Reksio.x, 730, 10, 'drop', { height: 60, reach: 80, size: 3 })
          await Reksio.shake()
        }
      },
    },
    snail: {
      weight: 3,
      ok: () => Creatures.snail && Math.abs(Creatures.snail.x - Reksio.x) < 700,
      run: () => CRITTERS.snail(),
    },
    biteTail: { weight: 1, run: () => Reksio.biteTail() },
    sit: { weight: 2, run: () => Reksio.sit() },
    howl: { weight: 1, ok: () => done.size >= 1, run: () => Reksio.howl() },
    fly: {
      // the fly is close: watch it, and sometimes pounce
      weight: 7,
      ok: () => Creatures.fly && Math.abs(Creatures.fly.x - Reksio.x) < 800,
      async run() {
        await Reksio.watch(() => Creatures.fly)
        const f = Creatures.fly
        if (f && Math.random() < 0.6 && Math.abs(f.x - Reksio.x) < 380) await Reksio.pounce(f.x)
      },
    },
    yawn: { weight: 1, ok: () => done.size >= 2, run: () => Reksio.yawn() },
  }

  function pickAct() {
    if (firstWish && ACTS.wish.ok()) return 'wish' // first, show what he wants
    const names = Object.keys(ACTS).filter((n) => n !== lastAct && (!ACTS[n].ok || ACTS[n].ok()))
    let r = Math.random() * names.reduce((sum, n) => sum + ACTS[n].weight, 0)
    for (const n of names) if ((r -= ACTS[n].weight) < 0) return n
    return names[0]
  }

  /** How full the music is: busy or just tapped → fuller; left alone → sparser. */
  function musicEnergy(now) {
    if (busy || hold || Reksio.stretching) return 3
    const since = now - lastTap
    if (Reksio.walking || since < 4000) return 2
    return since < 15000 ? 1 : 0
  }

  function idleLoop() {
    const now = performance.now()
    Music.setEnergy(musicEnergy(now))
    showNear()
    const worm = Creatures.worm
    if (worm && !flying && !ended && Math.random() < 0.02) birdHunt(worm)
    if (wishing) {
      placeWish()
      if (busy || ended || done.has(wishing) || now - wishShownAt > WISH_SHOW_MS) hideWish()
    }
    const quiet = !ended && !busy && !hold && !acting && !Reksio.walking && !Reksio.stretching
    if (quiet && now - lastTap > IDLE_FIRST_MS && now >= nextIdleAt) {
      const name = pickAct()
      lastAct = name
      if (name === 'wish') firstWish = false
      acting = true
      Promise.resolve(ACTS[name].run()).finally(() => {
        acting = false
        nextIdleAt = performance.now() + (ACTS[name].ms || rnd(IDLE_GAP_MS[0], IDLE_GAP_MS[1]))
      })
    }
    setTimeout(idleLoop, 200)
  }

  let last = performance.now()
  let lastSplash = 0
  let shownCam = -1
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000)
    last = t
    Reksio.tick(dt)
    Creatures.tick(dt)
    Weather.tick(dt, camX)
    if (Reksio.walking && t - lastSplash > 280 && Weather.splash(Reksio.x)) {
      lastSplash = t
      Sound.splash()
      burst(Reksio.x, 830, 4, 'drop', { height: 34, reach: 50, size: 3 })
    }
    if (spotEls.bird) {
      spotEls.bird.setAttribute('cx', SPOTS.bird().x)
      spotEls.bird.style.opacity = flying ? '0' : ''
    }
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

  // this play's layout: move the movable things, hide what isn't in play
  const GROUPS = { bowl: 'bowl', tap: 'tap', flowers: 'flowers', dig: 'mound', film: 'film', gate: 'fence' }
  for (const [name, id] of Object.entries(GROUPS)) {
    const g = $(id)
    if (Layout.hidden.includes(name)) g.style.display = 'none'
    else if (X(name)) g.setAttribute('transform', `translate(${X(name)} 0)`)
  }

  birdAt(PERCHES[0])
  makeSpots()
  makeTray()
  Creatures.init()
  Weather.init()
  Weather.on((phase) => {
    // Reksio notices the weather turn (unless he's in the middle of something)
    if (busy || ended || Reksio.walking) return
    if (phase === 'clouding') Reksio.lookUp(1600)
    if (phase === 'after') Reksio.hop(40, 2)
  })
  requestAnimationFrame(frame)
  setTimeout(birdIdle, 3000)
  lastTap = performance.now() - IDLE_FIRST_MS + 1500 // the first wish shows soon after start
  setTimeout(idleLoop, 200)

  window.yardGame = { goAndDo, done, pickAct, state: () => ({ busy, ended, done: [...done], camX, lastAct, stamped }) } // for testing
})()
