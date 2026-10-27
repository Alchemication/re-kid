// Reksio's yard: tap the ground and he walks there; tap a thing and he goes
// over and does something with it. The yard is wider than the screen and the
// view follows him, from the house wall on the left to the fence on the right.
// Pressing and holding on Reksio stretches him like a dachshund. The day is
// on a clock (day.js): it starts when he wakes and moves only with time, the
// sun crossing the sky with the hour (sky.js), whatever he does; nothing is a
// goal and nothing is counted on screen. When the sun has set the yard stays
// open while the moon comes up; then, or sooner if the doghouse is tapped, he
// goes to bed. Every usable thing has an action spot on the
// ground: stand in it and space uses the thing; tap it and Reksio goes there.
// No text, no score; every tap gets an answer. What each thing does, and its
// variation on a repeat, is in things.js.

/* global Clock, Debug, Layout, Painting, Sky, Day, World, Cuckoo, GrownUp, Idle, Input, Sound, Music, Reksio, Creatures, Weather, Things, Wet, Bird, Sparrows, Snowman, FilmLook, Nap, Spots, Bed, YardBeds */
(() => {
  const WISH_SHOW_MS = 4000 // how long a thought bubble stays up
  const WISH_GAP_MS = 12000 // at least this long between bubbles
  const HELPED_AFTER_S = 8 // left alone this long, he gets into a fix someone helps him out of (a thing's `helped`): long enough that the child is watching him, not busy tapping
  const HELPED_FROM_S = 25 // …but not before this far into the play: the morning and a first look round come first
  const HOLD_MS = 230 // a press on Reksio longer than this stretches him; shorter barks
  const BUSY_STUCK_MS = 45000 // busy longer than this (no stretch held) is a bug: far longer than any one thing takes
  const CAMERA_EASE = 3.5 // how quickly the view catches up with Reksio (per second)
  const BED_AFTER_MS = 12000 // after supper, if nobody sends him to bed, he goes by himself this long after (yawning, sitting, lying down meanwhile)
  const BEDTIME_ACTS = ['yawn', 'sit', 'lie'] // at bedtime, all he does left alone: nothing new starts
  const BED_TWINKLE_MS = 1400 // and till then the doghouse twinkles this often
  const GLANCE_NEAR = 900 // on the hour, he looks up at the cuckoo only if he is this near the house (scene units) and free
  // the mouse over a thing (a desktop): it glows (game.css), and Reksio, if
  // free, turns to it with an ear up: the kids didn't see what could be
  // clicked (Adam, 2026-10-20)
  const NOTICE_GAP_MS = 900 // at most this often, so sweeping the mouse across the yard doesn't spin him
  const NOTICE_TURN = 60 // he turns to it only if it's more than this far to one side (scene units)
  const CRITTER_CORE = 0.45 // where a critter's tap circle covers a thing or Reksio, the critter wins only this close to its middle (share of the circle): about its drawn size
  const X = Layout.x // per-play offset of a movable thing, scene units

  const $ = (id) => document.getElementById(id)
  const svg = $('world')
  const cam = $('cam')
  const wait = Clock.wait
  const random = Debug.random('yard') // this part's own random stream (debug.js)
  const huntRandom = Debug.random('bird-hunt') // drawn every idle tick, so kept out of the stream above
  const rnd = (lo, hi) => lo + random() * (hi - lo)

  let busy = false
  let pending = null
  // the day (day.js): its clock starts when he wakes (or now, with no morning)
  const day = Day.start({ lengthMs: (Layout.dayS ?? Day.LENGTH_S) * 1000, from: Layout.hour ?? Day.FROM })
  let lastTap = Clock.now()
  // The morning: each play starts as the cartoon's episodes do, with Reksio
  // in his doghouse (intro.yaml: he pops out of it as an episode starts). He
  // sleeps at dawn and wakes by himself (Layout.wakeAfter), or sooner when
  // tapped: that first tap is his wake-up call and nothing else.
  Reksio.keepBetween(Layout.MIN_X, Layout.MAX_X) // from the house wall to the fence
  Reksio.listen((what, at) => Creatures.notice(what, at.x, at.y)) // a bark, a snap: the creatures hear
  FilmLook.mount($('stage'))
  let asleep = Layout.morning
  if (asleep) Reksio.sleepIn(Things.DOOR.x)
  let camX = clampCam(Reksio.x - Painting.VIEW_W / 2)

  function clampCam(v) {
    return Math.max(0, Math.min(Painting.WORLD_W - Painting.VIEW_W, v))
  }

  const { THINGS, DOOR, burst, twinkle } = Things

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
      await Debug.ignoreCut(thing.run({ extra, n }), `use ${name}`) // cut short: still counts
      const { first } = day.did(name)
      if (first) Music.react.done()
      if (!day.dusk) phraseAfter() // in the evening the lullaby is coming
      if (first && !pending) await Debug.ignoreCut(Reksio.hop(), 'hop of joy')
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
        if (name === 'trap') Clock.after(500, () => Sound.mouse())
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
    if (day.ended || busy || hold || Things.holding) return command(() => Reksio.bark(), 'bark') // held by a gag: no stretch, the gag answers
    lastTap = Clock.now()
    hold = { stretching: false, stopSound: null }
    const mine = hold
    mine.timer = Clock.after(HOLD_MS, () => {
      if (hold !== mine) return
      mine.stretching = true
      Debug.trace('stretch')
      busy = true
      Reksio.beginStretch()
      mine.stopSound = stretchMusic()
    })
  }

  /** While he stretches, the bassoon climbs a note at a time. */
  function stretchMusic() {
    let n = 0
    Music.react.stretchStep(n++)
    return Clock.every(300, () => Music.react.stretchStep(n++))
  }

  async function holdEnd() {
    if (!hold) return
    const h = hold
    hold = null
    Clock.cancel(h.timer)
    if (!h.stretching) return command(() => Reksio.bark(), 'bark')
    lastTap = Clock.now()
    h.stopSound()
    Music.react.snap()
    await Reksio.endStretch()
    busy = false
    runPending()
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

  /** A tap on a sparrow: up they all go, and he looks up after them. */
  CRITTERS.sparrow = async () => {
    Creatures.scatterSparrows()
    await Reksio.lookUp(1200)
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

  /** The sun has set: the rain stops and the light goes; the moon comes up
   * through the last hour. Everything still works; he yawns more and wishes
   * for his doghouse. At the end of the hour it's bedtime. */
  function startDusk() {
    Debug.trace('dusk', { done: day.count })
    Weather.stop()
    Creatures.evening()
    Snowman.evening()
    Sky.dusk()
  }

  let supperServed = false
  let bedAt = null // after supper: when he goes to bed by himself, if nobody has sent him
  let goingToBed = false // walking to the doghouse to bed (a tap on it): supper doesn't take over
  let stopBedTwinkle = () => {}

  /** Bedtime: supper by the doghouse, as Kosmonauta ends (things.js). Then
   * the doghouse twinkles and he wishes for it: a tap sends him in, or he goes
   * by himself after a while. */
  async function supper() {
    if (day.ended || supperServed) return
    supperServed = true
    Debug.trace('supper')
    busy = true
    try {
      Things.serveSupper()
      if (await Reksio.walkTo(Things.supperAt())) {
        Reksio.face(1)
        await Debug.ignoreCut(Things.eatSupper(), 'supper')
      }
    } finally {
      busy = false
    }
    if (day.ended) return
    lullabyOnceCuckooIsDone()
    const c = thingCenter('doghouse')
    stopBedTwinkle = Clock.every(BED_TWINKLE_MS, () => twinkle(c.x, c.y))
    showWish('doghouse')
    bedAt = Clock.now() + BED_AFTER_MS // dayAndNight sends him then, once he's free
    runPending()
  }

  /** Supper eaten: the lullaby, once the cuckoo has called its eight (not
   * over them); bed() starts it at the latest. */
  function lullabyOnceCuckooIsDone() {
    if (Cuckoo.busy) Clock.after(200, lullabyOnceCuckooIsDone)
    else Music.evening(eveningRandom)
  }

  /** A grown-up held the house: the sun hurries down (day.js). */
  function hurryEvening() {
    if (day.hurry(Clock.now())) Debug.trace('evening now')
  }

  /** The cuckoo has called the hour: near the house and free, he looks up
   * at it (ACTS.cuckoo, so a tap cuts it short). */
  function glanceAtCuckoo(hour) {
    if (day.ended || !free() || Debug.still || Reksio.x - Cuckoo.X > GLANCE_NEAR) return
    Debug.trace('glance', { at: 'cuckoo', hour })
    startAct('cuckoo')
  }

  /** At dusk the doghouse means bed (tapped elsewhere on the way: not yet). */
  async function goToBed() {
    goingToBed = true
    try {
      if (await Reksio.walkTo(THINGS.doghouse.at())) bed()
    } finally {
      goingToBed = false
    }
  }

  /** Off to bed: evening falls, he trots into the doghouse, the picture closes. */
  async function bed() {
    if (!day.bed()) return // not before the sun has set
    Debug.trace('bed')
    stopBedTwinkle()
    Sky.night()
    Music.evening(eveningRandom) // sent to bed before the lullaby began: now (once a play)
    await wait(1600)
    let stopNap = () => {}
    if (await Reksio.walkTo(DOOR.x)) {
      Sound.knock()
      await Reksio.duck(true)
      stopNap = Nap.asleep({ snoring: false, smiling: true }) // asleep in the doorway, smiling, as the picture closes
    }
    await wait(700)
    const iris = $('iris')
    iris.style.setProperty('--x', `${((DOOR.x - camX) / Painting.VIEW_W) * 100}%`)
    iris.style.setProperty('--y', `${((DOOR.y - Painting.VIEW_TOP) / Painting.VIEW_H) * 100}%`)
    const start = Clock.now()
    await new Promise((resolve) => {
      function close() {
        const k = Math.min(1, (Clock.now() - start) / 2600)
        iris.style.setProperty('--r', `${(1 - k) * (1 - k) * 120}%`)
        if (k < 1) Clock.after(0, close)
        else resolve()
      }
      Clock.after(0, close)
    })
    stopNap()
    $('supper').classList.remove('served') // behind the closed picture: no steam rising for nobody
    $('again').hidden = false // for the grown-up: a new morning, held
  }

  // ------------------------------------------------------------ input

  /** Ask Reksio to do something (`what` names it, for the trace): now, or
   * once he's done with what he's busy with (a newer ask replaces an older). */
  function command(fn, what) {
    lastTap = Clock.now()
    if (Things.stuckTap()) return Debug.trace('stuck tap', { what }) // a gag holds him (the bowl on his head, his tail caught): it answers every tap
    Debug.trace('ask', { what, busy, acting })
    if (acting && !busy) {
      Debug.trace('relax', { from: lastAct })
      Reksio.relax() // left alone, he was doing something: drop it
    }
    const now = Input.ask({ busy, ended: day.ended })
    if (now === 'wait') {
      if (pending) Debug.trace('replaced', { by: what })
      pending = fn
    } else if (now === 'run') fn()
  }

  /** Where in the yard (scene units) a pointer event landed. */
  function yardAt(e) {
    const p = svg.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    const at = p.matrixTransform(svg.getScreenCTM().inverse())
    return { x: at.x + camX, y: at.y }
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
    [/^go to (\w+)$/, (m) => command(() => (day.dusk && m[1] === Day.BED ? goToBed() : goAndDo(m[1])), m[0])],
    [/^chase (\w+)$/, (m) => command(() => chase(m[1]), m[0])],
    [/^walk to (-?\d+)$/, (m) => command(() => Reksio.walkTo(Number(m[1])), m[0])],
    [/^jump in puddle at (-?\d+)$/, (m) => {
      const p = Input.puddleAt(Number(m[1]), Weather.puddles)
      return p ? command(() => jumpIn(p), m[0]) : command(() => Reksio.walkTo(Number(m[1])), m[0]) // dried up since
    }],
    [/^bark$/, () => command(() => Reksio.bark(), 'bark')],
    [/^wake up$/, () => wake('tap')],
    [/^press$/, () => holdStart()],
    [/^release$/, () => holdEnd()],
    [/^stop$/, () => !busy && Reksio.stopWalking()],
    [/^evening now$/, () => hurryEvening()],
    [/^notice (\w+)$/, (m) => notice(m[1])],
  ]

  function perform(intent) {
    Debug.input(intent)
    for (const [re, run] of INTENTS) {
      const m = intent.match(re)
      if (m) return run(m)
    }
    Debug.check(`known intent: ${intent}`, false)
  }

  let noticedAt = -Infinity
  const noticeOk = () => free() && !day.ended && Clock.now() - noticedAt >= NOTICE_GAP_MS
  /** The mouse is over a thing: if he's free, he turns to it, an ear up. */
  function notice(name) {
    if (!noticeOk()) return
    noticedAt = Clock.now()
    const x = name === 'bird' ? Bird.perch.x : THINGS[name]?.at()
    if (x === undefined) return
    Debug.trace('notice', { name })
    if (Math.abs(x - Reksio.x) > NOTICE_TURN) Reksio.face(x > Reksio.x ? 1 : -1)
    Reksio.kit.perk('either', 700)
  }

  /** The thing an element is part of: among the things, or the bird when it
   * is drawn in front of him (bird.js); never an action spot. */
  const thingAt = (el) => el?.closest('#things [data-thing], #bird')

  /** What is under the pointer (input.js decides what the tap means). */
  function hitAt(e) {
    const critter = e.target.closest('[data-critter]')
    const below = critter ? document.elementsFromPoint(e.clientX, e.clientY).find((el) => !el.closest('[data-critter]')) : e.target
    const { x, y } = yardAt(e)
    return {
      critter: critter ? critter.dataset.critter : null,
      nearMiddle: !!critter && onCritter(critter, e),
      under: {
        thing: thingAt(below)?.dataset.thing,
        reksio: !!below?.closest('#reksio'),
        spot: below?.closest('#spots [data-thing]')?.dataset.thing,
      },
      x,
      y,
    }
  }

  const tapIntent = (e) => Input.tap(hitAt(e), { groundTop: Painting.GROUND_TOP, puddles: Weather.puddles })

  $('stage').addEventListener('pointerdown', (e) => {
    if (e.target.closest('#fullscreen, #again')) return
    e.preventDefault()
    Sound.ensure()
    stirBed() // the music bed starts with the first tap (sound may play now), and livens up with each
    if (asleep) return perform('wake up')
    Music.start()
    const intent = tapIntent(e)
    if (intent === 'go to house') GrownUp.pressHouse(e) // a tap as the finger lifts; held, the evening now
    else perform(intent)
  })

  GrownUp.init({ perform })

  // ------------------------------------------------------------ keys and the mouse

  let holdKey = null
  document.addEventListener('keydown', (e) => {
    const key = { key: e.key, repeat: e.repeat, modified: e.metaKey || e.ctrlKey || e.altKey }
    if (!Input.ownsKey(key)) return
    e.preventDefault()
    Sound.ensure()
    if (!e.repeat) stirBed()
    if (asleep) return perform('wake up')
    Music.start()
    const intent = Input.keyDown(key, { nearest: Spots.nearest(), minX: Layout.MIN_X, maxX: Layout.MAX_X })
    if (!intent) return
    if (intent === 'press') holdKey = e.key // any other key: tap to bark, hold to stretch
    perform(intent)
  })

  document.addEventListener('keyup', (e) => {
    const intent = Input.keyUp(e.key, holdKey)
    if (intent === 'release') holdKey = null
    if (intent) perform(intent)
  })

  const release = () => hold && perform('release')
  window.addEventListener('pointerup', (e) => {
    release()
    GrownUp.letGoOfHouse(e, true)
  })
  for (const ev of ['pointercancel', 'blur']) {
    window.addEventListener(ev, (e) => {
      release()
      GrownUp.letGoOfHouse(e, false)
    })
  }

  // the mouse over a thing: it glows, its spot lights up, and he notices it
  // (a finger on a phone has no hover: a touch is a tap)
  $('stage').addEventListener('pointerover', (e) => {
    const thing = thingAt(e.target)
    if (!thing) return
    thing.classList.add('hover')
    Spots.hover(thing.dataset.thing, true)
    if (e.pointerType === 'mouse' && !thing.contains(e.relatedTarget) && noticeOk()) perform(`notice ${thing.dataset.thing}`) // only recorded when he'll answer it
  })
  $('stage').addEventListener('pointerout', (e) => {
    const thing = thingAt(e.target)
    if (!thing || thing.contains(e.relatedTarget)) return
    thing.classList.remove('hover')
    Spots.hover(thing.dataset.thing, false)
  })

  document.addEventListener('contextmenu', (e) => e.preventDefault())

  // Full screen, for the grown-up: where the browser allows it (not an
  // iPhone: there, add the page to the home screen and it opens full screen).
  // On a phone, it also keeps the yard on its side.
  if (!document.fullscreenEnabled) $('fullscreen').hidden = true
  $('fullscreen').addEventListener('click', async () => {
    if (document.fullscreenElement) return
    await document.documentElement.requestFullscreen()
    window.screen.orientation?.lock?.('landscape').catch(() => {}) // most desktops can't lock it: full screen is enough
  })

  // ------------------------------------------------------------ life

  // A thought bubble above Reksio, with a picture of the nearest thing he
  // hasn't done yet (at dusk, his doghouse); that thing twinkles too if it's
  // on screen. A suggestion, never a task.
  const wishEl = $('wish')
  let wishing = null
  let wishShownAt = 0
  let lastWishAt = -Infinity

  function thingCenter(name) {
    if (name === 'bird') return { x: Bird.perch.x, y: Bird.perch.y - 80 }
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
    wishShownAt = Clock.now()
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

  /** The spot Reksio is standing in glows (spots.js), unless he's busy. */
  const showNear = () => Spots.show(!busy && !day.ended ? Spots.nearest() : null)

  // ------------------------------------------------------------ left alone

  // One loop decides what Reksio does when nobody is tapping: a thought
  // bubble now and then, otherwise a dog move, picked at random (never the
  // same one twice running) and a little different each time.
  let nextIdleAt = 0
  let acting = false
  let lastAct = null
  let firstWish = true

  // what he can wish for: the things out this play that have a picture for it
  const WISHABLE = [...document.querySelectorAll('.wish-icon')].map((u) => u.dataset.wish)

  function wishFor() {
    return Idle.wish(WISHABLE.filter(Spots.out), {
      wants: day.wants,
      ready: Things.ready,
      distance: (n) => Math.abs((n === 'bird' ? Bird.perch.x : THINGS[n].at()) - Reksio.x),
    })
  }

  function birdOnScreen() {
    const x = Bird.perch.x
    return x > camX && x < camX + Painting.VIEW_W
  }

  const idleFor = () => (Clock.now() - lastTap) / 1000

  const FOG_DIM = 0.3 // the morning fog dims the light this much at its thickest (the world model's light)
  const FOG_SNIFF = 0.3 // fog this thick: left alone, he sniffs his way about in it
  const ACTS = {
    // sparrows at his bowl (winter): he guards it, they come back behind him, and he gives in (sparrows.js)
    guardBowl: { weight: 6, ok: () => Sparrows.ok(), run: () => Sparrows.guard() },
    // the boy is waiting for something for his snowman (winter): left alone, he goes for it himself (snowman.js)
    helpSnowman: { weight: 0, due: true, ok: () => Snowman.helpDue(), run: () => Snowman.help() },
    // …and when the boy comes out to make it, he runs over to him and sits to watch
    greetBoy: { weight: 0, due: true, ok: () => Snowman.greetDue(), run: () => Snowman.greet() },
    // in the morning fog: nose down, he sniffs his way along a little, and stops to look about
    fogSniff: {
      weight: 8,
      ok: () => Weather.fog > FOG_SNIFF,
      async run() {
        const dir = random() < 0.5 ? -1 : 1
        if (await Reksio.walkTo(Reksio.x + dir * rnd(150, 320), { sniffing: true })) await Reksio.lookAround(700)
      },
    },
    wish: { weight: 2, quiet: true, ok: () => wishFor() && Clock.now() - lastWishAt > WISH_GAP_MS, run: () => showWish(wishFor()), ms: WISH_SHOW_MS + 600 },
    sniff: { weight: 5, run: () => Reksio.sniff() }, // he sniffs about a lot (Adam)
    wander: {
      weight: 3,
      async run() {
        const dir = random() < 0.5 ? -1 : 1
        // mostly nose down, sniffing as he goes (he sniffs about a lot: Adam)
        if (await Reksio.walkTo(Reksio.x + dir * rnd(80, 260), { sniffing: random() < 0.6 }) && random() < 0.7) await Reksio.sniff()
      },
    },
    look: { weight: 2, run: () => Reksio.lookAround() },
    // never picked: the cuckoo starts it on the hour (glanceAtCuckoo)
    cuckoo: {
      weight: 0,
      ok: () => false,
      async run() {
        Reksio.face(-1)
        await Reksio.lookUp(900)
      },
    },
    lookUp: {
      weight: 2,
      async run() {
        if (birdOnScreen()) Reksio.face(Bird.perch.x > Reksio.x ? 1 : -1)
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
          await Wet.splashIn(p)
          await Wet.stepOut(p)
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
    sit: { weight: 3, quiet: true, ok: () => Idle.restOk('sit', idleFor()), run: () => Reksio.sit() },
    lie: { weight: 3, quiet: true, ok: () => Idle.restOk('lie', idleFor()), run: () => Reksio.lieDown() },
    nap: { weight: 4, quiet: true, ok: () => Idle.restOk('nap', idleFor()) && !Weather.raining, run: () => Reksio.nap() },
    howl: { weight: 1, ok: () => day.count >= 1, run: () => Reksio.howl() },
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
    yawn: { get weight() { return day.sleepy(Clock.now()) ? 6 : 1 }, ok: () => day.count >= 2 || day.sleepy(Clock.now()), run: () => Reksio.yawn() }, // sleepy from 18:00
  }

  // A thing with a fix someone helps him out of (its `helped`: the bowl on
  // his head, his tail in the bramble) gets a left-alone move of its own: he
  // goes over and gets into it himself, once a play, so a child who never
  // taps the thing twice still sees it.
  const HELPED = Object.keys(THINGS).filter((n) => THINGS[n].helped)
  for (const name of HELPED) {
    const thing = THINGS[name]
    ACTS[thing.helped.act] = {
      weight: 0,
      due: true,
      ok: () => helpedDue(name),
      async run() {
        if (!(await Reksio.walkTo(thing.at()))) return
        Reksio.face(thing.face)
        await thing.helped.alone()
      },
    }
  }

  /** Is it time for `name`'s fix that someone helps him out of, left alone?
   * Once a play, and only one of them: if no one has helped him yet, the
   * first one out this play that can happen now (so they take turns across
   * plays, and one that can't happen now, the bramble in the rain when no bee
   * comes, leaves it to the next). */
  function helpedDue(name) {
    const canNow = (n) => HELPED.includes(n) && Spots.out(n) && THINGS[n].helped.can()
    const first = Layout.props.find(canNow)
    return first === name && HELPED.every((n) => !THINGS[n].helped.times) && !day.dusk &&
      idleFor() > HELPED_AFTER_S && Clock.now() > HELPED_FROM_S * 1000
  }

  /** Free: not asleep, busy, doing a left-alone move, held, waiting or walking. */
  const free = () => !asleep && !busy && !acting && !hold && !pending && !Reksio.walking

  const actOk = (name) => (!day.bedtime || BEDTIME_ACTS.includes(name)) && (!ACTS[name].ok || !!ACTS[name].ok())
  const pickAct = () => Idle.pick(ACTS, { ok: actOk, last: lastAct, firstWish, random })

  /** How full the music is: busy or just tapped → fuller; left alone → sparser. */
  const phraseRandom = Debug.random('phrase-music') // which phrase: drawn only when one plays
  let lastPhrase = -Infinity

  /** Something was done (alone: a left-alone move): a phrase of music, if
   * it is time for one (idle.js). */
  function phraseAfter(alone = false) {
    const now = Clock.now()
    if (!Idle.phraseOk({ playing: Music.playing, raining: Weather.raining, sinceLast: now - lastPhrase, alone })) return
    if (!Music.phrase(phraseRandom)) return // no sound yet
    lastPhrase = now
    Debug.trace('phrase', {})
  }

  // ------------------------------------------------------------ puddles

  /** A tapped puddle: run over and jump in. */
  async function jumpIn(p) {
    if (!(await Reksio.walkTo(p.x - Math.sign(p.x - Reksio.x || 1) * 90))) return
    busy = true
    try {
      await Wet.splashIn(p)
    } finally {
      busy = false
    }
    if (pending) runPending()
    else await Wet.stepOut(p)
  }

  function idleLoop() {
    const now = Clock.now()
    showNear()
    birdAndWish(now)
    const quiet = !Debug.still && !day.ended && !busy && !hold && !acting && !Reksio.walking && !Reksio.stretching
    if (quiet) leftAlone(now)
    dayAndNight(now)
    checkRules(now)
    Debug.show(state())
    Clock.after(200, idleLoop)
  }

  /** The bird may go after a worm; a thought bubble follows him, and goes when it's done its job. */
  function birdAndWish(now) {
    const worm = Creatures.worm
    if (worm && !Bird.flying && !day.ended && !Debug.still && huntRandom() < 0.02) Bird.hunt(worm)
    if (!wishing) return
    placeWish()
    if (busy || day.ended || !day.wants(wishing) || now - wishShownAt > WISH_SHOW_MS) hideWish()
  }

  /** The hour moves the sky; the sun sets at dusk; at bedtime, bed as soon as he's free. */
  function dayAndNight(now) {
    Sky.show(day.hour(now))
    if (day.tick(now)) startDusk()
    const settled = !busy && !hold && !Things.holding && !pending && !Reksio.walking && !goingToBed // nothing of his to cut short or override
    if (day.bedtime && !supperServed && settled) command(() => supper(), 'supper')
    if (bedAt !== null && Clock.now() >= bedAt && !day.ended && settled) command(() => bed(), 'bedtime')
  }

  /** Nothing going on: what he does next on his own, if anything. */
  function leftAlone(now) {
    const what = Idle.next({ soaked: Wet.soaked, raining: Weather.raining, inPuddle: !!Weather.puddleAt(Reksio.x), sinceTap: now - lastTap, now, nextAt: nextIdleAt })
    if (what === 'shake') {
      // stopped, wet, and out of the rain: shake it off, straight away
      acting = true
      Debug.trace('shake dry')
      Debug.ignoreCut(Wet.shakeDry(), 'shake dry') // cut short by a tap: still wet, he'll shake later
        .finally(() => (acting = false))
    } else if (what === 'act') {
      startAct(pickAct())
    }
  }

  // Rules that should always hold (debug.js reports a broken one, with the trace).
  let busySince = 0
  function checkRules(now) {
    busySince = busy && !hold ? busySince || now : 0
    Debug.check('walks only standing up', !Reksio.walking || (Reksio.pose === 'stand' && !Reksio.sliding), { pose: Reksio.pose, sliding: Reksio.sliding })
    Debug.check('never busy for long', !busySince || now - busySince < BUSY_STUCK_MS, { lastAct })
    Debug.check('a waiting ask runs once he is free', !pending || busy || day.ended)
    Debug.check('nothing a gag put on him outlasts it', !Reksio.worn.length || busy || acting, { worn: Reksio.worn })
    Debug.check('never walks with his tail caught', !Reksio.wearing('tail') || !Reksio.walking)
    Debug.check('the bird is in front of him only while it is busy', !Bird.front || Bird.flying)
  }

  /** The game's state, for tests and the ?debug overlay. */
  function state() {
    return {
      seed: Debug.seed, busy, day: day.phase, hour: Number(day.hour(Clock.now()).toFixed(2)), dusk: day.dusk, ended: day.ended, acting, holding: !!hold, pending: !!pending, lastAct,
      done: day.done, props: Layout.props, uses: { ...uses }, bedtime: day.bedtime, moonUp: Number(Sky.moonUp.toFixed(2)),
      reksio: { x: Math.round(Reksio.x), pose: Reksio.pose, walking: Reksio.walking },
      soak: Number(Wet.soak.toFixed(2)), weather: Weather.phase, camX: Math.round(camX),
      stamped: Things.stamped, mouse: Things.mouse,
    }
  }

  /** Do one of the left-alone moves; resolves when it's over. */
  function startAct(name) {
    lastAct = name
    if (name === 'wish') firstWish = false
    acting = true
    Debug.trace('act', { name })
    if (!day.dusk && !ACTS[name].quiet) phraseAfter(true) // quiet a long while: a phrase as he potters about (not over a rest or a thought bubble)
    return Debug.ignoreCut(Promise.resolve().then(() => ACTS[name].run()), `act ${name}`)
      .finally(() => {
        acting = false
        nextIdleAt = Clock.now() + Idle.gap(ACTS[name].ms, random)
      })
  }

  let last = Clock.now()
  let shownCam = -1
  // the music bed (bed.js; ?music=takes turns it off): the moment of the day, and how
  // busy the child is, told to it as often as it reads them
  const BED_STEER_MS = 200
  let busyness = 0.3
  function stirBed() {
    if (!Layout.layered) return
    busyness = Bed.livelier(busyness)
    Music.bed.start(YardBeds)
  }
  if (Layout.layered) {
    Clock.every(BED_STEER_MS, () => {
      busyness = Bed.calmer(busyness, BED_STEER_MS / 1000)
      const resting = asleep || Reksio.lying
      Music.bed.set({ mood: YardBeds.moodAt({ hour: day.hour(Clock.now()), raining: Weather.raining, resting, dusk: day.dusk }), energy: busyness })
    })
  }

  function frame() {
    const t = Clock.now() // game time: stands still while the page is hidden
    const dt = Math.min(0.05, (t - last) / 1000)
    last = t
    Reksio.tick(dt)
    if (day.hurrying(t)) Sky.show(day.hour(t))
    World.set({ hour: day.hour(t), light: Sky.light * (1 - FOG_DIM * Weather.fog), view: { x0: camX, x1: camX + Painting.VIEW_W } }) // the world state (world.js): the creatures read it // the sun hurrying down: every frame, not every idle tick
    Creatures.tick(dt)
    Weather.tick(dt, camX)
    Wet.frame(t)
    Spots.frame()
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
    turnMe(Painting.tooSmall)
  }

  /** A phone held upright: ask for it on its side, and wait meanwhile (the
   * game holds before the picture shows, so the picture's own turning isn't
   * paused with the game). */
  function turnMe(on) {
    const picture = $('turn')
    if (picture.hidden !== on) return
    Debug.trace('turn me', { on })
    if (on) Clock.hold('turned', true)
    picture.hidden = !on
    if (!on) Clock.hold('turned', false)
  }
  new ResizeObserver(paint).observe($('paint'))
  paint()

  // this play's layout: move the movable things, hide what isn't in play
  const GROUPS = { bowl: 'bowl', tap: 'tap', flowers: 'flowers', dig: 'mound', film: 'film', trap: 'trap', tree: 'tree', berries: 'bramble', gate: 'fence', hen: 'hen' }
  for (const [name, id] of Object.entries(GROUPS)) {
    const g = $(id)
    if (Layout.hidden.includes(name)) g.style.display = 'none'
    else if (X(name)) g.setAttribute('transform', `translate(${X(name)} 0)`)
  }

  // laid out: show the drawing from the next frame (game.css, .starting)
  Clock.after(0, () => $('stage').classList.remove('starting'))
  $('stage').classList.add(`season-${Layout.season}`) // the season's look (game.css .season-winter)

  Things.init({ ended: () => day.ended })
  Spots.init()
  Sky.init()
  Cuckoo.init({ hourAt: () => day.hour(Clock.now()), onHour: glanceAtCuckoo, inView: () => camX < Cuckoo.X + 150, hushed: () => day.hurrying(Clock.now()) })
  Sky.show(day.hour(Clock.now())) // ?hour: the sky for it from the start
  Creatures.init()
  Weather.init()
  Weather.on((phase) => {
    Debug.trace('weather', { phase })
    // Reksio notices the weather turn (unless he's in the middle of something)
    if (day.ended || !free()) return
    if (phase === 'clouding') Reksio.lookUp(1600)
    if (phase === 'after') Reksio.hop(40, 2)
  })
  // ------------------------------------------------------------ the morning

  const SUNRISE_MS = 4500 // the sun comes up as he wakes
  const morningRandom = Debug.random('morning-music') // the waking's own: the tune, how many yawns
  const eveningRandom = Debug.random('evening-music') // which lullaby
  let stopSnoring = () => {}

  /** Dawn, and Reksio asleep in his doghouse, snoring, until he wakes. */
  function beginMorning() {
    acting = true // nothing left-alone happens while he sleeps or wakes
    Sky.dawn()
    stopSnoring = Nap.asleep()
    Clock.after(Layout.wakeAfter * 1000, () => wake('by himself'))
  }

  /** He wakes: the sun comes up, he pops out of the doghouse and yawns a few
   * times, as he does in the cartoon (world.yaml, moves[waking-yawn]). Woken
   * by a tap, sound can play: a morning tune. */
  async function wake(how) {
    if (!asleep) return
    asleep = false
    stopSnoring()
    Debug.trace('wake', { how })
    if (Sound.heard) {
      Music.startMorning(morningRandom)
      lastPhrase = Clock.now() // the morning tune counts as a phrase: quiet before the day's first
    }
    day.begin(Clock.now())
    Sky.sunrise(SUNRISE_MS)
    await Debug.ignoreCut(Reksio.duck(false), 'out of the doghouse')
    await Debug.ignoreCut(Reksio.wakeUp(morningRandom() < 0.5 ? 2 : 3), 'morning yawns')
    acting = false
    nextIdleAt = Clock.now() + Idle.gap(0, random)
  }

  if (asleep) beginMorning()
  else day.begin(Clock.now())
  requestAnimationFrame(frame)
  Debug.record(state)
  console.info(`[yard] replay this play: ${Debug.replayUrl()}`)
  lastTap = Clock.now() - Idle.FIRST_MS + 1500 // the first wish shows soon after start
  Clock.after(200, idleLoop)

  // For tests and the console: do things, read the state, read what happened.
  // tap/walk go through command() like a real tap; use/act/chase run one thing
  // directly and resolve when it's over.
  window.yardGame = {
    tap: (name) => perform(`go to ${name}`),
    walk: (x) => perform(`walk to ${Math.round(x)}`),
    perform,
    use: (name, extra) => goAndDo(name, extra),
    act: startAct,
    actOk,
    chase,
    acts: Object.keys(ACTS),
    things: Object.keys(THINGS),
    critters: Object.keys(CRITTERS),
    /** Nothing going on: not busy, acting, walking or waiting to do something. */
    free,
    pickAct,
    state,
    trace: () => Debug.dump(),
    events: () => [...Debug.events],
    replayUrl: Debug.replayUrl,
  }
})()
