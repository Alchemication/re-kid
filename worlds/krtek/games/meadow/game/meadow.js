// Krtek's meadow: the scene, what a tap means, and the day from waking to
// sleep (brief.yaml). He wakes in his den under the molehill; a tap on the
// meadow sends him waddling there (the view follows him, view.js), a tap on
// him gets a word and a hop, a tap on the flower bed (behind his molehill)
// has him sniff a flower, a tap on the spring has him paddle in its pool;
// watering comes with the rain cloud (rain.js), now and then. The day
// runs on its own (day.js); at dusk the tulips close and the cricket
// fiddles, through the last hour the picture closes in a circle round his
// molehill, and at 20:00 he goes down to sleep in his den. After that only
// a grown-up's long press starts a new day.
//
// Every input is an intent ("go to 900", "tap mole", "sniff", "wake"), run
// by perform() so the recorder (debug.js) keeps it. A new intent cuts the
// gesture under way short (Mole.relax), and he is settled where it left
// him, so he always ends free and standing.

/* global Bed, Church, Clock, Critters, Spring, Day, Debug, FilmLook, Friends, Layout, MeadowBeds, Mole, Motion, Music, Painting, Sound, Things, View */
/* exported meadowGame */
const meadowGame = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const { GROUND, HOME, BED, SPRING, DIG } = Layout
  const IRIS_FULL = 1700 // the circle's radius when it shows the whole view, wherever he stands in it
  const IRIS_OPEN = 10000 // until the last hour it is out of the way altogether
  const IRIS_Y = GROUND - 90 // it closes round him (and at bedtime he is home, in his molehill)
  const IRIS_CLOSE_MS = 1400 // the last of it, at bedtime
  const WAKE_ANYWAY_MS = 4000 // left asleep this long, he wakes by himself
  const HOME_AT_DUSK_MS = 3000 // left alone this long at dusk, he goes home to listen
  const HOLD_NEW_DAY_MS = 2000 // after the end, a press held this long starts a new day
  const MAX_HILLS = 6 // molehills he has left about the meadow; the oldest sinks back
  const TULIPS = 9
  const TICK_MS = 100
  const BED_STEER_MS = 200 // how often the music bed hears the moment and how busy the child is
  const NIGHT_TINT = 0.6 // how dark the night's blue makes the meadow at its darkest (multiplied over it)
  const words = Debug.random('meadow-words')
  const paint = Debug.random('meadow-paint')

  const svg = document.getElementById('world')
  const layers = Object.fromEntries(['sky', 'back', 'mole', 'front', 'top', 'den'].map((id) => [id, document.getElementById(id)]))
  const frontGround = document.getElementById('front-ground')
  const irisCircle = document.getElementById('iris-circle')
  const night = document.getElementById('night')
  const sun = document.getElementById('sun')
  const moon = document.getElementById('moon')
  const stops = [...document.querySelectorAll('#sky-grad stop')]
  const cricket = document.getElementById('cricket')
  const den = layers.den

  const game = { awake: false, ended: false, dayStart: 0, hour: Day.START, lastInput: 0, gesture: null, queued: null, hills: [], busy: 0.3 }
  let tulipHeads = []

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  // ------------------------------------------------------------ the scene

  function hillPath(w, h) {
    return `M${-w / 2} 6 C${-w * 0.42} ${-h * 0.7} ${-w * 0.22} ${-h} 0 ${-h} C${w * 0.22} ${-h} ${w * 0.42} ${-h * 0.7} ${w / 2} 6 Z`
  }

  /** A molehill at x: a heap of earth with clods. */
  function hill(x, big = false, grow = true) {
    const [w, h] = big ? [240, 64] : [180, 50]
    const g = el('g', { class: 'hill' })
    layers.front.insertBefore(g, frontGround) // the grass in front stays in front of every molehill
    g.style.transform = `translate(${x}px, ${GROUND}px)`
    const inner = el('g', {}, g)
    el('path', { d: hillPath(w, h), fill: '#6e4a24', stroke: '#2b1b0b', 'stroke-width': 3 }, inner)
    for (let i = 0; i < (big ? 16 : 10); i++) {
      el('circle', { cx: (paint() - 0.5) * w * 0.75, cy: -paint() * h * 0.8, r: 4 + paint() * 7, fill: paint() < 0.5 ? '#38250a' : '#8a5d2e' }, inner)
    }
    if (grow) Debug.ignoreCut(Motion.endAt(inner, [{ transform: 'scaleY(0.05)' }, { transform: 'scaleY(1)' }], { duration: 320, easing: 'cubic-bezier(.3,1.5,.5,1)' }), 'hill grows')
    const mine = { x, g, home: big }
    if (!big) {
      game.hills.push(mine)
      if (game.hills.length > MAX_HILLS) sinkHill(game.hills.shift())
    }
    return mine
  }

  function sinkHill(h) {
    Motion.endAt(h.g, [{ transform: `translate(${h.x}px, ${GROUND + 80}px)` }], { duration: 900, easing: 'ease-in' }).then(() => h.g.remove(), () => h.g.remove())
  }

  const hillAt = (x) => Math.abs(x - HOME) < 70 || game.hills.some((h) => Math.abs(h.x - x) < 70)

  function makeScene() {
    const ctm = svg.getScreenCTM()
    Painting.paint({
      sky: layers.sky,
      far: document.getElementById('far'),
      back: document.getElementById('back-ground'),
      front: frontGround,
      bed: document.getElementById('bed'),
      rocks: document.getElementById('rocks'),
    }, (ctm ? ctm.a : 1) * (window.devicePixelRatio || 1))
    hill(HOME, true, false)
    makeBed()
    Mole.make(layers.mole, document.getElementById('mole-out'), document.getElementById('tunnels'))
    Mole.put(HOME, 'down')
  }

  function makeBed() {
    const bed = document.getElementById('bed')
    const colours = ['#e0453a', '#f08fa6', '#e0453a', '#f2c94c', '#e0453a', '#f08fa6', '#e0453a', '#f2c94c', '#e0453a']
    tulipHeads = []
    for (let i = 0; i < TULIPS; i++) {
      const x = BED.from + 20 + (i * (BED.to - BED.from - 40)) / (TULIPS - 1) + (paint() - 0.5) * 14
      const base = 700 + (i % 2) * 10 // behind him, at the meadow's back: nothing hides behind it
      const height = 66 + paint() * 26
      const stem = el('g', { class: 'tulip' }, bed)
      stem.style.transformOrigin = `${x}px ${base}px`
      el('path', { d: `M${x} ${base} V${base - height}`, stroke: '#3f7d22', 'stroke-width': 5 }, stem)
      el('path', { d: `M${x} ${base - 20} c-28 -10 -36 -36 -30 -58 c16 12 28 30 30 50`, fill: '#4d6d1f' }, stem)
      const head = el('g', {}, stem)
      head.style.transformOrigin = `${x}px ${base - height}px`
      const c = colours[i]
      const left = el('path', { d: `M${x} ${base - height} c-20 -4 -26 -26 -18 -44 l10 10 z`, fill: c, stroke: '#7a1f17', 'stroke-width': 2 }, head)
      const right = el('path', { d: `M${x} ${base - height} c20 -4 26 -26 18 -44 l-10 10 z`, fill: c, stroke: '#7a1f17', 'stroke-width': 2 }, head)
      el('path', { d: `M${x - 9} ${base - height - 2} c0 -20 4 -38 9 -44 c5 6 9 24 9 44 z`, fill: c, stroke: '#7a1f17', 'stroke-width': 2 }, head)
      for (const p of [left, right]) p.style.transformOrigin = `${x}px ${base - height}px`
      tulipHeads.push({ left, right, stem })
    }
    el('rect', { class: 'tap-bed', x: BED.from - 20, y: 590, width: BED.to - BED.from + 40, height: 125, fill: 'transparent' }, bed)
  }

  // ------------------------------------------------------------ the day

  function tick() {
    if (!game.awake) return
    const h = (game.hour = Day.hour(Clock.now() - game.dayStart, Layout.dayMs || Day.DAY_MS))
    drawSky(h)
    drawMeadow(h)
    if (!game.ended) evening(h)
    checkRules()
    Debug.show(stateNow())
  }

  /** The sky's colour, the sun and the moon at this hour. */
  function drawSky(h) {
    const s = Day.sky(h)
    stops[0].setAttribute('stop-color', s.top)
    stops[1].setAttribute('stop-color', s.bottom)
    const [cr, cg, cb] = [1, 3, 5].map((i) => parseInt(s.top.slice(i, i + 2), 16) / 255)
    const light = Math.max(0, Math.min(1, (0.3 * cr + 0.59 * cg + 0.11 * cb - 0.2) / 0.4)) // 1 by day, 0 at night
    Painting.cloudsAt(light) // the wash of cloud fades as the sky darkens
    night.setAttribute('opacity', String(NIGHT_TINT * (1 - light))) // and the painted meadow darkens with it
    const pos = Day.sun(h)
    sun.style.visibility = pos ? 'visible' : 'hidden'
    if (pos) sun.style.transform = `translate(${pos.across * 1600}px, ${640 - pos.up * 470}px)`
    const m = Day.moon(h)
    moon.style.visibility = m ? 'visible' : 'hidden'
    if (m) moon.style.transform = `translate(1180px, ${600 - m.up * 380}px)`
  }

  /** The tulips opening or closing, and the cricket coming out at dusk. */
  function drawMeadow(h) {
    const open = Day.tulips(h)
    for (const t of tulipHeads) {
      t.left.style.transform = `rotate(${-34 * open}deg)`
      t.right.style.transform = `rotate(${34 * open}deg)`
    }
    if (!game.ended) Things.tick(h)
    Church.tick(h)
    if (Day.cricket(h) && !cricket.classList.contains('out')) {
      cricket.classList.add('out')
      Debug.trace('cricket', { hour: Day.clock(h) })
      Music.evening()
    }
  }

  /** The circle closing through the last hour; at dusk, left alone, he goes home to listen; then bedtime. */
  function evening(h) {
    const share = Day.iris(h)
    irisCircle.setAttribute('r', String(share >= 1 ? IRIS_OPEN : Math.round(share * IRIS_FULL)))
    const alone = !Debug.still && !game.gesture && Clock.now() - game.lastInput > HOME_AT_DUSK_MS
    if (Day.phase(h) === 'dusk' && alone && Mole.state.pose !== 'listen') run('home to listen', homeToListen)
    if (Day.phase(h) === 'bedtime') bedtime()
  }

  function stateNow() {
    const m = Mole.state
    return { hour: Day.clock(game.hour), awake: game.awake, ended: game.ended, x: Math.round(m.x), view: Math.round(View.x), pose: m.pose, busy: game.gesture, carrying: m.carrying, hills: game.hills.length, things: Things.state() }
  }

  function checkRules() {
    const m = Mole.state
    Debug.check('the mole is in the meadow', m.x >= DIG.from - 1 && m.x <= DIG.to + 1, { x: m.x })
    if (game.awake && !game.ended && !game.gesture) {
      Debug.check('a free mole stands', m.pose !== 'down', { pose: m.pose })
      Debug.check('a free mole holds nothing up, unless an encounter waits on it', !m.holdsUp || Things.holding(), {})
      Debug.check('a free mole stands on the ground', m.lift === 0, { lift: m.lift })
      Debug.check('no visitor is left about', Things.cast().length === 0, { cast: Things.cast().map((c) => c.kind) })
      Debug.check('a mole in the ground has a molehill', m.pose === 'out' || hillAt(m.x), { x: m.x, pose: m.pose })
    }
  }

  // ------------------------------------------------------------ what he does

  /** Run a gesture, cutting short the one under way; whatever it leaves, he ends settled. `fn(alive)`
   * should stop once alive() is false; `onCut` puts back what it moved if it is cut short. */
  function run(name, fn, onCut = null) {
    if (game.gesture) Debug.trace('cut', { gesture: game.gesture, by: name })
    cutShort()
    if (name !== Things.holder()) Things.putDown() // something else to do: the egg he holds up waiting goes down first
    game.gesture = name
    const mine = Symbol(name)
    game.token = mine
    game.onCut = onCut
    Debug.trace('gesture', { name })
    Debug.ignoreCut(fn(() => game.token === mine), name).then(() => {
      if (game.token !== mine) return
      game.gesture = null
      game.onCut = null
      settle()
    })
  }

  /** Cut the gesture under way short: he stops where it was taking him, and
   * whatever it moved is put back (its onCut), then he is settled. */
  function cutShort() {
    const cut = game.onCut
    game.onCut = null
    game.token = Symbol('cut')
    Mole.relax()
    if (cut) cut()
    settle()
  }

  /** Get him out on the grass and waddle to x. */
  async function goTo(x) {
    x = clampX(x)
    Mole.lookAt(x) // he looks first: the tap was heard
    if (Mole.state.pose !== 'out') await Mole.comeUp('out')
    if (Math.abs(x - Mole.state.x) > 4) await Mole.walkTo(x)
  }

  /** Home, and down into his molehill and up again inside it, unless he's there already. */
  async function intoHome() {
    const m = Mole.state
    if (Math.abs(m.x - HOME) < 50 && (m.pose === 'hill' || m.pose === 'listen')) return
    await goTo(HOME)
    Sound.dig()
    await Mole.goDown()
    Sound.pop()
    await Mole.comeUp('hill')
  }

  /** After a cut: he stands where he was going, with a molehill under him if he is in the ground. */
  function settle() {
    const m = Mole.state
    if (m.pose === 'out') return Mole.put(m.x, 'out')
    if (!hillAt(m.x)) hill(m.x, false, false)
    Mole.put(m.x, m.pose === 'listen' ? 'listen' : 'hill')
  }

  const clampX = (x) => Math.max(DIG.from, Math.min(DIG.to, x))

  async function digTo(x) {
    x = clampX(x)
    const m = Mole.state
    if (Math.abs(x - m.x) < 50 && m.pose !== 'out') return Mole.cheer()
    if (m.pose === 'out' && !hillAt(m.x)) hill(m.x)
    dropHat()
    Sound.dig()
    await Mole.goDown()
    await Mole.tunnelTo(x)
    if (!hillAt(x)) hill(x)
    Sound.pop()
    await Mole.comeUp('hill')
  }

  /** Whatever is on his head falls off as he dives: it lies on the grass a moment and fades. */
  function dropHat() {
    const hat = Mole.wear(null)
    if (!hat) return
    const { x, y } = Mole.head()
    const g = el('g', {}, document.getElementById('things'))
    g.appendChild(hat)
    const s = `scale(${Mole.SCALE})` // drawn at his size, as it was on his head
    Motion.endAt(g, [{ transform: `translate(${x}px, ${y}px) ${s}` }, { transform: `translate(${x - 40}px, ${GROUND - 8}px) rotate(-30deg) ${s}`, offset: 0.4 }, { transform: `translate(${x - 40}px, ${GROUND - 8}px) rotate(-30deg) ${s}`, opacity: 0 }], { duration: 2400 }).then(() => g.remove(), () => g.remove())
  }

  // What a tap on him does, each with its word: all of them in turn before any comes again, in a
  // new order each round, never the same twice running (the yard's lesson: repeats need variety)
  const ANSWERS = {
    cheer: ['giggle', () => Mole.cheer()],
    wave: ['ahoj', () => Mole.wave()],
    peekaboo: ['giggle', () => Mole.peekaboo()],
    laughs: ['giggle', () => Mole.handsToFace(600)],
    ponder: ['ooh', () => Mole.ponder(900)],
  }
  let answers = []
  let lastAnswer = null

  async function tapMole() {
    if (!answers.length) {
      answers = Object.keys(ANSWERS)
      for (let i = answers.length - 1; i > 0; i--) {
        const j = Math.floor(words() * (i + 1))
        ;[answers[i], answers[j]] = [answers[j], answers[i]]
      }
      if (answers[0] === lastAnswer) answers.push(answers.shift())
    }
    const how = (lastAnswer = answers.shift())
    const [said, act] = ANSWERS[how]
    Sound.say(said, true) // a tap on him: a word only now and then, never every tap
    Debug.trace('says', { said, how })
    await act()
  }

  /** A tap on the flower bed: he goes over and sniffs a flower, eyes shut a moment. */
  async function sniff() {
    await goTo((BED.from + BED.to) / 2)
    Mole.show('three', 1)
    await Mole.lean(18, 1200)
    Sound.say('giggle', true)
    await Mole.cheer()
  }

  /** A tap on the spring: he paddles in the pool, splashing, and giggles. */
  async function paddle() {
    await goTo(Spring.POOL.x - 40)
    Sound.splash()
    await Mole.lean(-12, 500)
    Sound.splash()
    await Mole.lean(12, 500)
    Sound.say('giggle', true)
    await Mole.cheer()
  }

  async function homeToListen() {
    await intoHome()
    Mole.listen(true)
  }

  // ------------------------------------------------------------ morning and night

  async function wake() {
    if (game.awake) return
    game.awake = true
    game.gesture = 'wake' // he is not free until he is up: a tap meanwhile takes over (run)
    const mine = (game.token = Symbol('wake'))
    Debug.trace('wake')
    Sound.ensure()
    Music.prepare() // loading as he wakes, so a thing arriving at once gets its music
    den.classList.add('waking')
    await Clock.wait(900)
    await Debug.ignoreCut(Motion.endAt(den, [{ opacity: 1 }, { opacity: 0 }], { duration: 700 }), 'den fades')
    den.style.display = 'none'
    game.dayStart = Clock.now()
    tick()
    if (game.token !== mine) return // a tap has him busy already
    Sound.pop()
    Music.morning()
    await Debug.ignoreCut(Mole.comeUp('hill'), 'come up')
    if (game.token !== mine) return
    Sound.say('ahoj')
    await Debug.ignoreCut(Mole.stretch(), 'morning stretch')
    if (game.token !== mine) return
    game.gesture = null
    settle()
  }

  async function bedtime() {
    game.ended = true
    game.queued = null
    Debug.trace('bedtime')
    cutShort()
    Things.night()
    game.gesture = 'bedtime'
    await Debug.ignoreCut(intoHome(), 'home to bed')
    Mole.put(HOME, 'hill')
    Sound.say('achJo')
    await Debug.ignoreCut(Mole.stretch(), 'bedtime stretch')
    await Debug.ignoreCut(Mole.goDown(), 'down to bed')
    const from = Number(irisCircle.getAttribute('r'))
    const start = Clock.now()
    while (Clock.now() - start < IRIS_CLOSE_MS) {
      const t = (Clock.now() - start) / IRIS_CLOSE_MS
      irisCircle.setAttribute('r', String(Math.round(from * (1 - t))))
      await Clock.frame()
    }
    irisCircle.setAttribute('r', '0')
    Music.quiet()
    den.style.display = ''
    den.classList.remove('waking')
    den.classList.add('night')
    await Motion.endAt(den, [{ opacity: 0 }, { opacity: 1 }], { duration: 900 })
    game.gesture = null
    Debug.trace('end')
  }

  // ------------------------------------------------------------ input

  const INTENTS = [
    [/^wake$/, () => wake()],
    [/^tap mole$/, () => run('tap mole', tapMole)],
    [/^sniff$/, () => run('sniff', sniff)],
    [/^paddle$/, () => run('paddle', paddle)],
    [/^use ([a-z]+)(?: ([a-z]+))?$/, (m) => Things.use(m[1], true, m[2] || null) || run('tap mole', tapMole)],
    [/^go to (\d+)$/, (m) => run('go', () => goTo(Number(m[1])))],
    [/^stop$/, () => run('stop', async () => {})],
    [/^dig to (\d+)$/, (m) => run('dig', () => digTo(Number(m[1])))],
    [/^tap butterfly (\d+)$/, (m) => tapButterfly(Number(m[1]))],
    [/^tap frog$/, () => Spring.tapFrog()],
  ]

  /** A tap on a butterfly: it flutters off, and, if he is free, he looks up after it, hairs up: "ooh". */
  function tapButterfly(id) {
    const at = Critters.tap(id)
    if (!at || !(game.awake && !game.ended && !game.gesture)) return
    Mole.lookAt(at.x)
    Sound.say('ooh', true)
  }

  /**
   * While a step of an encounter plays, a tap elsewhere waits, as in the yard: he glances its way
   * and goes once the step is over (Things calls stepped). A toddler taps all the time, and cut
   * short at every tap a step started again and again, and nothing ever ended (a filmed day,
   * 2026-10-23). A tap on the encounter itself still hurries it; between steps, and while it waits
   * for a choice, taps are free. Only the latest waiting tap counts.
   */
  function waits(intent) {
    const busy = Things.stepping
    if (!busy || game.gesture !== busy) return false
    if (intent.startsWith(`use ${busy}`) || intent === 'stop' || intent.startsWith('tap butterfly') || intent === 'tap frog') return false
    game.queued = intent
    const to = intent.match(/^(?:go|dig) to (\d+)$/)
    if (to) Mole.lookAt(Number(to[1]))
    Debug.trace('waits', { intent, for: busy })
    return true
  }

  /** A step is over: a tap that waited for it goes now. */
  function stepped() {
    const q = game.queued
    game.queued = null
    if (q && !game.ended) Clock.after(0, () => run1(q))
  }

  function perform(intent) {
    Debug.input(intent)
    if (game.ended) return
    game.lastInput = Clock.now()
    game.busy = Bed.livelier(game.busy) // the bed livens up with each tap
    if (!game.awake) return wake()
    if (waits(intent)) return
    run1(intent)
  }

  /** Do what an intent asks. */
  function run1(intent) {
    for (const [re, fn] of INTENTS) {
      const m = intent.match(re)
      if (m) return fn(m)
    }
    Debug.trace('unknown intent', { intent })
  }

  function scenePoint(e) {
    const p = svg.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    return p.matrixTransform(svg.getScreenCTM().inverse())
  }

  /** What a tap at this point means. */
  function intentAt(target, p) {
    const critter = target.closest('[data-critter]')
    if (critter?.dataset.critter === 'frog') return 'tap frog'
    if (critter) return `tap butterfly ${critter.dataset.critter}`
    const thing = target.closest('[data-thing]')
    const choice = target.closest('[data-choice]')
    if (thing) return choice ? `use ${thing.dataset.thing} ${choice.dataset.choice}` : `use ${thing.dataset.thing}`
    // a tap on what he holds up waiting (the egg) is a tap on it; on him while an encounter plays,
    // a tap on that encounter (it plays on, not cut short)
    if (target.closest('.mole-carry') && Things.holder()) return `use ${Things.holder()}`
    if (target.closest('.mole')) return game.gesture && Things.get(game.gesture) ? `use ${game.gesture}` : 'tap mole'
    if (target.closest('#bed')) return 'sniff'
    if (target.closest('#spring')) return 'paddle'
    if (p.y > 560) return `go to ${Math.round(clampX(View.toWorld(p.x)))}`
    return 'tap mole' // the sky: he answers anyway
  }

  let press = null
  svg.addEventListener('pointerdown', (e) => {
    Sound.ensure()
    if (game.ended) {
      press = Clock.after(HOLD_NEW_DAY_MS, () => location.reload())
      return
    }
    perform(intentAt(e.target, scenePoint(e)))
  })
  svg.addEventListener('pointerup', () => {
    if (press) Clock.cancel(press)
    press = null
  })
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || ['Shift', 'Meta', 'Control', 'Alt', 'Tab', 'CapsLock', 'Escape'].includes(e.key)) return
    Sound.ensure()
    const x = Mole.state.x
    e.preventDefault()
    if (e.repeat) return // a key held down repeats: he is already going
    // an arrow held: he walks that way until it is let go (keyup)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') perform(`go to ${e.key === 'ArrowLeft' ? DIG.from : DIG.to}`)
    else if (e.key === ' ') perform(Math.abs(x - SPRING) < 300 ? 'paddle' : x > BED.from - 120 && x < BED.to + 120 ? 'sniff' : 'tap mole')
    else perform('tap mole')
  })
  document.addEventListener('keyup', (e) => {
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && game.gesture === 'go') perform('stop')
  })

  // ------------------------------------------------------------ start

  makeScene()
  Mole.setFree(() => game.awake && !game.ended && !game.gesture)
  Sound.listen((word) => Mole.express(word)) // each word he says comes with its face
  View.setup(() => Mole.drawnX(), (camX) => irisCircle.setAttribute('cx', String(Math.round(Mole.drawnX() - camX))))
  Friends.setup(document.getElementById('friends'))
  Spring.setup(document.getElementById('spring'), () => game.hour)
  // the church bell on the hour: if he's free, his hairs spring up and he looks up at it (as Reksio at the cuckoo)
  Church.setup(document.getElementById('distant'), () => {
    if (!(game.awake && !game.ended && !game.gesture)) return
    Mole.perk(1.2)
    Mole.lookAt(View.fromDistant(Church.X))
  })
  // the flowers a butterfly may settle on: the bed, the bluebells and the yellow spike (painting.js)
  const flowerTops = [...[0, 1, 2, 3, 4].map((i) => ({ x: BED.from + 30 + i * 60, y: 620 })), { x: 380, y: 545 }, { x: HOME - 210, y: 555 }, { x: HOME + 150, y: 570 }, { x: HOME - 128, y: 480 }, { x: 2780, y: 545 }, { x: 3420, y: 545 }]
  Critters.setup(document.getElementById('critters'), () => game.hour, () => flowerTops, { now: Layout.flags.critters === 'now', still: Debug.still })
  const things = Things.setup({
    run,
    goTo,
    el,
    free: () => game.awake && !game.ended && !game.gesture,
    alone: () => Clock.now() - game.lastInput,
    busyWith: () => game.gesture,
    music: (part) => Music.cue(part),
    notice: () => Mole.perk(1.3), // something has arrived: his hairs spring up
    stepped,
  })
  Debug.pin({ flags: { ...(Layout.flags.day ? { day: Layout.flags.day } : {}), props: things.join(',') }, layout: { home: HOME, spring: SPRING, things } })
  Debug.record(stateNow)
  FilmLook.mount(document.body) // the old print over the whole page
  Clock.every(TICK_MS, tick)
  Clock.every(BED_STEER_MS, () => { // the bed: the moment of the day, and how busy the child is, calming as time passes
    game.busy = Bed.calmer(game.busy, BED_STEER_MS / 1000)
    Music.setBed({ mood: MeadowBeds.moodAt({ hour: game.hour }), energy: game.busy })
  })
  Clock.after(WAKE_ANYWAY_MS, () => { if (!game.awake) perform('wake') })

  return { perform, state: stateNow, trace: () => Debug.dump(), music: () => Music.part, things: Things.names(), detail: (name) => Things.get(name).detail() }
})()
