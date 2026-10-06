// Reksio's yard: tap the ground and he walks there; tap a thing and he goes
// over and does something with it. The yard is wider than the screen and the
// view follows him, from the house wall on the left to the fence on the right.
// Pressing and holding on Reksio stretches him like a dachshund. Each play
// counts four main things (layout.js picks them); when they're done, evening
// comes and he goes to sleep. Every usable thing has an action spot on the
// ground: stand in it and space uses the thing; tap it and Reksio goes there.
// No text, no score; every tap gets an answer. What each thing does, and its
// variation on a repeat, is in things.js.

/* global Debug, Layout, Painting, Sound, Music, Reksio, Creatures, Weather, Things */
(() => {
  const WISH_SHOW_MS = 4000 // how long a thought bubble stays up
  const WISH_GAP_MS = 12000 // at least this long between bubbles
  const IDLE_FIRST_MS = 2500 // left alone this long, Reksio starts doing things
  const IDLE_GAP_MS = [1500, 3500] // then something new every 1.5–3.5 s
  const HOLD_MS = 230 // a press on Reksio longer than this stretches him; shorter barks
  const RESTART_AFTER_MS = 2500 // at the end, taps are ignored this long
  const BUSY_STUCK_MS = 45000 // busy longer than this (no stretch held) is a bug: far longer than any one thing takes
  const CAMERA_EASE = 3.5 // how quickly the view catches up with Reksio (per second)
  const CRITTER_CORE = 0.45 // where a critter's tap circle covers a thing or Reksio, the critter wins only this close to its middle (share of the circle): about its drawn size
  const PUDDLE_REACH = 40 // a ground tap this far past a puddle's edge (scene units) still means "jump in"
  const EVENING_NEEDS = Layout.mains // this play's main things
  const X = Layout.x // per-play offset of a movable thing, scene units

  const $ = (id) => document.getElementById(id)
  const svg = $('world')
  const cam = $('cam')
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const random = Debug.random('yard') // this part's own random stream (debug.js)
  const huntRandom = Debug.random('bird-hunt') // drawn every idle tick, so kept out of the stream above
  const rnd = (lo, hi) => lo + random() * (hi - lo)
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

  const { THINGS, DOOR, PERCHES, burst, twinkle } = Things

  // ------------------------------------------------------------ doing things

  const uses = {} // how many times each thing has been used this play

  /** Walk to a thing and use it. `forceExtra` (tests) picks the plain use
   * (false) or the variation (true) instead of leaving it to the count. */
  async function goAndDo(name, forceExtra) {
    const thing = THINGS[name]
    const arrived = await Reksio.walkTo(thing.at())
    if (!arrived) return // tapped elsewhere on the way
    if (thing.face) Reksio.face(thing.face)
    if (!Things.ready(name)) return notYet(name)
    // busy until it's all over, the hop of joy included, so nothing else
    // (a left-alone move) can start on him half-way through
    busy = true
    try {
      // a repeat keeps the same core; the first repeat and then every other
      // one or so adds a variation on top
      const n = (uses[name] = (uses[name] || 0) + 1)
      const drawn = n === 2 || (n > 2 && random() < 0.5)
      const extra = forceExtra ?? drawn
      Debug.trace('use', { name, n, extra })
      await Debug.ignoreCut(thing.run({ extra }), `use ${name}`) // cut short: still counts
      const firstTime = EVENING_NEEDS.includes(name) && !done.has(name)
      done.add(name)
      sunset()
      if (firstTime) {
        Music.react.done()
        fillSlot(name)
      }
      if (EVENING_NEEDS.every((n) => done.has(n)) && !ended) {
        await Debug.ignoreCut(Reksio.hop(), 'last hop') // the last one: a hop of joy, then evening
        evening()
        return
      }
      if (firstTime && !pending) await Debug.ignoreCut(Reksio.hop(), 'hop of joy')
    } finally {
      busy = false
    }
    runPending()
  }

  /** Tapped something with nothing to do yet: still an answer, never a dead
   * tap. He looks up after the bird, and sniffs round the rest; at the trap a
   * peep from the hole says someone is in there. */
  async function notYet(name) {
    Debug.trace('not yet', { name })
    busy = true
    try {
      if (name === 'bird') await Reksio.lookUp(900)
      else {
        if (name === 'trap') setTimeout(() => Sound.mouse(), 500)
        await Reksio.sniff(2)
        await Reksio.lookAround(700)
      }
    } finally {
      busy = false
    }
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
    if (ended || busy || hold) return command(() => Reksio.bark(), 'bark')
    lastTap = performance.now()
    hold = { stretching: false, stopSound: null }
    const mine = hold
    mine.timer = setTimeout(() => {
      if (hold !== mine) return
      mine.stretching = true
      Debug.trace('stretch')
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
    if (!h.stretching) return command(() => Reksio.bark(), 'bark')
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
    Debug.trace('chase', { name })
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
    Debug.trace('evening')
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

  /** Ask Reksio to do something (`what` names it, for the trace): now, or
   * once he's done with what he's busy with (a newer ask replaces an older). */
  function command(fn, what) {
    lastTap = performance.now()
    Debug.trace('ask', { what, busy, acting })
    if (acting && !busy) {
      Debug.trace('relax', { from: lastAct })
      Reksio.relax() // left alone, he was doing something: drop it
    }
    if (ended) {
      if (endedAt && performance.now() - endedAt > RESTART_AFTER_MS) location.reload()
      return
    }
    if (busy) {
      if (pending) Debug.trace('replaced', { by: what })
      pending = fn
    } else fn()
  }

  /** Where in the yard (scene units) a pointer event landed. */
  function yardAt(e) {
    const p = svg.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    const at = p.matrixTransform(svg.getScreenCTM().inverse())
    return { x: at.x + camX, y: at.y }
  }

  /** Is a thing or Reksio also under the pointer (ground spots don't count)? */
  function somethingUnder(e) {
    return document.elementsFromPoint(e.clientX, e.clientY).some((el) =>
      !el.closest('[data-critter]') && (el.closest('#things [data-thing]') || el.closest('#reksio')))
  }

  /** Did the pointer land near the critter's middle, where it is drawn? */
  function onCritter(critter, e) {
    const box = critter.querySelector('.critter-hit').getBoundingClientRect()
    const d = Math.hypot(e.clientX - (box.left + box.width / 2), e.clientY - (box.top + box.height / 2))
    return d < (box.width / 2) * CRITTER_CORE
  }

  // Every input becomes an intent, a short line of text ("go to bowl", "walk
  // to 1830", "press"), and perform() carries it out. Live play and replays
  // (debug.js records every intent) go through the same path.
  const INTENTS = [
    [/^go to (\w+)$/, (m) => command(() => goAndDo(m[1]), m[0])],
    [/^chase (\w+)$/, (m) => command(() => chase(m[1]), m[0])],
    [/^walk to (-?\d+)$/, (m) => command(() => Reksio.walkTo(Number(m[1])), m[0])],
    [/^jump in puddle at (-?\d+)$/, (m) => {
      const p = Weather.puddles.find((q) => Math.abs(q.x - Number(m[1])) < q.rx + PUDDLE_REACH)
      return p ? command(() => jumpIn(p), m[0]) : command(() => Reksio.walkTo(Number(m[1])), m[0]) // dried up since
    }],
    [/^bark$/, () => command(() => Reksio.bark(), 'bark')],
    [/^press$/, () => holdStart()],
    [/^release$/, () => holdEnd()],
    [/^stop$/, () => !busy && Reksio.stopWalking()],
  ]

  function perform(intent) {
    Debug.input(intent)
    for (const [re, run] of INTENTS) {
      const m = intent.match(re)
      if (m) return run(m)
    }
    Debug.check(`known intent: ${intent}`, false)
  }

  /** What a tap at this pointer event means. */
  function tapIntent(e) {
    let target = e.target
    // a critter's tap circle is wide; over a thing or Reksio it gives way
    // except near its middle
    const critter = target.closest('[data-critter]')
    if (critter && somethingUnder(e) && !onCritter(critter, e)) {
      target = document.elementsFromPoint(e.clientX, e.clientY).find((el) => !el.closest('[data-critter]')) || target
    } else if (critter) return `chase ${critter.dataset.critter}`
    const thing = target.closest('#things [data-thing]')
    if (thing) return `go to ${thing.dataset.thing}`
    if (target.closest('#reksio')) return 'press'
    // a puddle is drawn on the ground, so it wins over the faint action spots
    const { x, y } = yardAt(e)
    const puddle = y > Painting.GROUND_TOP && Weather.puddles.find((p) => Math.abs(p.x - x) < p.rx + PUDDLE_REACH)
    if (puddle) return `jump in puddle at ${Math.round(puddle.x)}`
    const spot = target.closest('#spots [data-thing]')
    if (spot) return `go to ${spot.dataset.thing}`
    return `walk to ${Math.round(x)}`
  }

  $('stage').addEventListener('pointerdown', (e) => {
    if (e.target.closest('#fullscreen')) return
    e.preventDefault()
    Sound.ensure()
    Music.start()
    perform(tapIntent(e))
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
    bird: () => ({ x: Things.perch.x - 30, r: 130 }), // on the ground, under the bird
    trap: () => ({ x: (Things.mouse === 'fed' ? 960 : 1000) + X('trap'), r: 110 }),
    tree: () => ({ x: 1600 + X('tree'), r: 120 }),
    berries: () => ({ x: 2330 + X('berries'), r: 110 }),
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
      if (!Things.ready(name)) continue
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
      if (!e.repeat) perform(`walk to ${e.key === 'ArrowLeft' ? Reksio.MIN_X : Reksio.MAX_X}`)
      return
    }
    if (e.repeat) return
    if (e.key === ' ' || e.key === 'Enter') {
      const name = nearest()
      return perform(name ? `go to ${name}` : 'bark')
    }
    // any other key: tap to bark, hold to stretch
    holdKey = e.key
    perform('press')
  })

  let holdKey = null
  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') perform('stop')
    if (e.key === holdKey) {
      holdKey = null
      perform('release')
    }
  })

  const release = () => hold && perform('release')
  window.addEventListener('pointerup', release)
  window.addEventListener('pointercancel', release)
  window.addEventListener('blur', release)

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
    if (name === 'bird') return { x: Things.perch.x, y: Things.perch.y - 80 }
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
  let nextIdleAt = 0
  let acting = false
  let lastAct = null
  let firstWish = true

  function wishFor() {
    const left = EVENING_NEEDS.filter((n) => !done.has(n) && Things.ready(n))
    const dist = (n) => Math.abs((n === 'bird' ? Things.perch.x : THINGS[n].at()) - Reksio.x)
    return left.sort((a, b) => dist(a) - dist(b))[0]
  }

  function birdOnScreen() {
    const x = Things.perch.x
    return x > camX && x < camX + Painting.VIEW_W
  }

  // Left alone this long (seconds), he may sit, lie down, or nap.
  const REST_AFTER_S = { sit: 8, lie: 18, nap: 30 }
  const idleFor = () => (performance.now() - lastTap) / 1000

  const ACTS = {
    wish: { weight: 2, ok: () => wishFor() && performance.now() - lastWishAt > WISH_GAP_MS, run: () => showWish(wishFor()), ms: WISH_SHOW_MS + 600 },
    sniff: { weight: 3, run: () => Reksio.sniff() },
    wander: {
      weight: 3,
      async run() {
        const dir = random() < 0.5 ? -1 : 1
        if (await Reksio.walkTo(Reksio.x + dir * rnd(80, 260)) && random() < 0.7) await Reksio.sniff()
      },
    },
    look: { weight: 2, run: () => Reksio.lookAround() },
    lookUp: {
      weight: 2,
      async run() {
        if (birdOnScreen()) Reksio.face(Things.perch.x > Reksio.x ? 1 : -1)
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
          await splashIn(p)
          await stepOut(p)
        }
      },
    },
    snail: {
      weight: 3,
      ok: () => Creatures.snail && Math.abs(Creatures.snail.x - Reksio.x) < 700,
      run: () => CRITTERS.snail(),
    },
    biteTail: { weight: 1, run: () => Reksio.biteTail() },
    // resting, the longer he's left alone: sit and watch, lie down, nap
    sit: { weight: 3, ok: () => idleFor() > REST_AFTER_S.sit, run: () => Reksio.sit() },
    lie: { weight: 3, ok: () => idleFor() > REST_AFTER_S.lie, run: () => Reksio.lieDown() },
    nap: { weight: 4, ok: () => idleFor() > REST_AFTER_S.nap && !Weather.raining, run: () => Reksio.nap() },
    howl: { weight: 1, ok: () => done.size >= 1, run: () => Reksio.howl() },
    fly: {
      // the fly is close: watch it, and sometimes pounce
      weight: 7,
      ok: () => Creatures.fly && Math.abs(Creatures.fly.x - Reksio.x) < 800,
      async run() {
        await Reksio.watch(() => Creatures.fly)
        const f = Creatures.fly
        if (f && random() < 0.6 && Math.abs(f.x - Reksio.x) < 380) await Reksio.pounce(f.x)
      },
    },
    yawn: { weight: 1, ok: () => done.size >= 2, run: () => Reksio.yawn() },
  }

  function pickAct() {
    if (firstWish && ACTS.wish.ok()) return 'wish' // first, show what he wants
    const names = Object.keys(ACTS).filter((n) => n !== lastAct && (!ACTS[n].ok || ACTS[n].ok()))
    let r = random() * names.reduce((sum, n) => sum + ACTS[n].weight, 0)
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

  // ------------------------------------------------------------ wet

  // Puddles muddy his paws (it fades after a while). Rain, a jump into a
  // puddle, or splashing through plenty of water soaks him: fur a touch
  // darker, drips. Soaked, as soon as he stops out of the rain, he shakes
  // himself dry, like every dog. While he stands in a puddle, its near edge
  // is drawn in front of his paws.
  const SOAK_PER_SPLASH = 0.15 // each splashing step through a puddle (about 3 per puddle)
  const SOAKED = 0.7 // soaked from here on: drips, and a shake when he stops
  const DRY_S = 40 // without a shake, the wet slowly dries off over this long
  const MUDDY_S = 10 // muddy paws last this long after the last puddle
  const DRIP_EVERY_MS = 350
  let soak = 0 // 0 dry … 1 soaked through
  let muddyUntil = 0
  let lastDrip = 0
  let lastWetFrame = 0
  const pawWater = document.createElementNS(SVG_NS, 'path')
  pawWater.setAttribute('class', 'paw-water')
  pawWater.setAttribute('d', 'M-44 814 A44 10 0 0 0 44 814 Z')
  $('fx').appendChild(pawWater)

  const soaked = () => soak >= SOAKED

  /** Wetter by `amount` (1 = soaked through at once). */
  /** Pounce into a puddle: splish, splash. He'll shake once he steps out. */
  async function splashIn(p) {
    await Reksio.pounce(p.x)
    Weather.splash(p.x)
    Sound.splash()
    wetten(1)
    await Reksio.hop(30, 2)
  }

  const stepOut = (p) => Reksio.walkTo(p.x + Math.sign(p.x - Reksio.x || 1) * (p.rx + 50))

  /** A tapped puddle: run over and jump in. */
  async function jumpIn(p) {
    if (!(await Reksio.walkTo(p.x - Math.sign(p.x - Reksio.x || 1) * 90))) return
    busy = true
    try {
      await splashIn(p)
    } finally {
      busy = false
    }
    if (pending) runPending()
    else await stepOut(p)
  }

  function wetten(amount) {
    soak = Math.min(1, soak + amount)
    muddyUntil = performance.now() + MUDDY_S * 1000
  }

  async function shakeDry() {
    Sound.shake()
    const spray = setInterval(() => burst(Reksio.x, 740, 8, 'drop', { height: 60, reach: 110, size: 3.5 }), 120)
    try {
      await Reksio.shakeDry()
    } finally {
      clearInterval(spray)
    }
    soak = 0
  }

  function wetFrame(t) {
    const dt = Math.min(0.1, (t - lastWetFrame) / 1000)
    lastWetFrame = t
    if (Weather.raining) soak = 1
    else soak = Math.max(0, soak - dt / DRY_S)
    const inPuddle = Weather.puddleAt(Reksio.x)
    pawWater.classList.toggle('on', !!inPuddle)
    pawWater.setAttribute('transform', `translate(${Reksio.x} 0)`)
    Reksio.setWet(soaked())
    Reksio.setMuddy(t < muddyUntil)
    if (soaked() && !Weather.raining && t - lastDrip > DRIP_EVERY_MS) {
      lastDrip = t
      burst(Reksio.x + rnd(-40, 40), 770, 1, 'drop', { height: 4, reach: 6, size: 2.5 })
    }
  }

  function idleLoop() {
    const now = performance.now()
    Music.setEnergy(musicEnergy(now))
    showNear()
    const worm = Creatures.worm
    if (worm && !Things.flying && !ended && !Debug.still && huntRandom() < 0.02) Things.birdHunt(worm)
    if (wishing) {
      placeWish()
      if (busy || ended || done.has(wishing) || now - wishShownAt > WISH_SHOW_MS) hideWish()
    }
    const quiet = !Debug.still && !ended && !busy && !hold && !acting && !Reksio.walking && !Reksio.stretching
    if (quiet && soaked() && !Weather.raining && !Weather.puddleAt(Reksio.x)) {
      // stopped, wet, and out of the rain: shake it off, straight away
      acting = true
      Debug.trace('shake dry')
      Debug.ignoreCut(shakeDry(), 'shake dry') // cut short by a tap: still wet, he'll shake later
        .finally(() => (acting = false))
    } else if (quiet && now - lastTap > IDLE_FIRST_MS && now >= nextIdleAt) {
      startAct(pickAct())
    }
    checkRules(now)
    Debug.show(state())
    setTimeout(idleLoop, 200)
  }

  // Rules that should always hold (debug.js reports a broken one, with the trace).
  let busySince = 0
  function checkRules(now) {
    busySince = busy && !hold ? busySince || now : 0
    Debug.check('walks only standing up', !Reksio.walking || Reksio.pose === 'stand', { pose: Reksio.pose })
    Debug.check('never busy for long', !busySince || now - busySince < BUSY_STUCK_MS, { lastAct })
    Debug.check('a waiting ask runs once he is free', !pending || busy || ended)
  }

  /** The game's state, for tests and the ?debug overlay. */
  function state() {
    return {
      seed: Debug.seed, busy, ended, acting, holding: !!hold, pending: !!pending, lastAct,
      done: [...done], mains: EVENING_NEEDS, uses: { ...uses },
      reksio: { x: Math.round(Reksio.x), pose: Reksio.pose, walking: Reksio.walking },
      soak: Number(soak.toFixed(2)), weather: Weather.phase, camX: Math.round(camX),
      stamped: Things.stamped, mouse: Things.mouse,
    }
  }

  /** Do one of the left-alone moves; resolves when it's over. */
  function startAct(name) {
    lastAct = name
    if (name === 'wish') firstWish = false
    acting = true
    Debug.trace('act', { name })
    return Debug.ignoreCut(Promise.resolve().then(() => ACTS[name].run()), `act ${name}`)
      .finally(() => {
        acting = false
        nextIdleAt = performance.now() + (ACTS[name].ms || rnd(IDLE_GAP_MS[0], IDLE_GAP_MS[1]))
      })
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
    wetFrame(t)
    if (Reksio.walking && t - lastSplash > 280 && Weather.splash(Reksio.x)) {
      lastSplash = t
      wetten(SOAK_PER_SPLASH)
      Sound.splash()
      burst(Reksio.x, 830, 4, 'drop', { height: 34, reach: 50, size: 3 })
    }
    if (spotEls.bird) {
      spotEls.bird.setAttribute('cx', SPOTS.bird().x)
      spotEls.bird.style.opacity = Things.flying ? '0' : ''
    }
    if (spotEls.trap) spotEls.trap.setAttribute('cx', SPOTS.trap().x)
    for (const n of ['trap', 'tree']) if (spotEls[n]) spotEls[n].style.opacity = Things.ready(n) ? '' : '0'
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
  const GROUPS = { bowl: 'bowl', tap: 'tap', flowers: 'flowers', dig: 'mound', film: 'film', trap: 'trap', tree: 'tree', berries: 'bramble', gate: 'fence' }
  for (const [name, id] of Object.entries(GROUPS)) {
    const g = $(id)
    if (Layout.hidden.includes(name)) g.style.display = 'none'
    else if (X(name)) g.setAttribute('transform', `translate(${X(name)} 0)`)
  }

  Things.init({ ended: () => ended })
  makeSpots()
  makeTray()
  Creatures.init()
  Weather.init()
  Weather.on((phase) => {
    Debug.trace('weather', { phase })
    // Reksio notices the weather turn (unless he's in the middle of something)
    if (busy || ended || Reksio.walking) return
    if (phase === 'clouding') Reksio.lookUp(1600)
    if (phase === 'after') Reksio.hop(40, 2)
  })
  requestAnimationFrame(frame)
  Debug.record(state)
  lastTap = performance.now() - IDLE_FIRST_MS + 1500 // the first wish shows soon after start
  setTimeout(idleLoop, 200)

  // For tests and the console: do things, read the state, read what happened.
  // tap/walk go through command() like a real tap; use/act/chase run one thing
  // directly and resolve when it's over.
  window.yardGame = {
    tap: (name) => perform(`go to ${name}`),
    walk: (x) => perform(`walk to ${Math.round(x)}`),
    perform,
    use: (name, extra) => goAndDo(name, extra),
    act: startAct,
    actOk: (name) => !ACTS[name].ok || !!ACTS[name].ok(),
    chase,
    acts: Object.keys(ACTS),
    things: Object.keys(SPOTS),
    critters: Object.keys(CRITTERS),
    /** Nothing going on: not busy, acting, walking or waiting to do something. */
    free: () => !busy && !acting && !hold && !pending && !Reksio.walking,
    pickAct,
    state,
    trace: () => Debug.dump(),
    events: () => [...Debug.events],
    replayUrl: Debug.replayUrl,
  }
})()
