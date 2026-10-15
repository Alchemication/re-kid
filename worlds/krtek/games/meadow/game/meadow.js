// Krtek's meadow: the scene, what a tap means, and the day from waking to
// sleep (brief.yaml). He wakes in his den under the molehill; a tap on the
// meadow sends him tunnelling there, a tap on him gets a word and a hop, a
// tap on the flower bed or the spring has him water the flowers. The day
// runs on its own (day.js); at dusk the tulips close and the cricket
// fiddles, through the last hour the picture closes in a circle round his
// molehill, and at 20:00 he goes down to sleep in his den. After that only
// a grown-up's long press starts a new day.
//
// Every input is an intent ("dig to 900", "tap mole", "water", "wake"), run
// by perform() so the recorder (debug.js) keeps it. A new intent cuts the
// gesture under way short (Mole.relax), and he is settled where it left
// him, so he always ends free and standing.

/* global Clock, Day, Debug, Friends, Layout, Mole, Motion, Sound, Things */
/* exported meadowGame */
const meadowGame = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const { GROUND, HOME, BED, SPRING, DIG } = Layout
  const IRIS_FULL = 1250 // the circle's radius when it shows the whole meadow
  const IRIS_AT = { x: HOME, y: GROUND - 90 } // it closes round the molehill
  const IRIS_CLOSE_MS = 1400 // the last of it, at bedtime
  const WAKE_ANYWAY_MS = 4000 // left asleep this long, he wakes by himself
  const HOME_AT_DUSK_MS = 3000 // left alone this long at dusk, he goes home to listen
  const HOLD_NEW_DAY_MS = 2000 // after the end, a press held this long starts a new day
  const MAX_HILLS = 6 // molehills he has left about the meadow; the oldest sinks back
  const TULIPS = 9
  const TICK_MS = 100
  const words = Debug.random('meadow-words')
  const paint = Debug.random('meadow-paint')

  const svg = document.getElementById('world')
  const layers = Object.fromEntries(['sky', 'back', 'mole', 'front', 'top', 'den'].map((id) => [id, document.getElementById(id)]))
  const frontGround = document.getElementById('front-ground')
  const irisCircle = document.getElementById('iris-circle')
  const sun = document.getElementById('sun')
  const moon = document.getElementById('moon')
  const stops = [...document.querySelectorAll('#sky-grad stop')]
  const cricket = document.getElementById('cricket')
  const den = layers.den

  const game = { awake: false, ended: false, dayStart: 0, hour: Day.START, lastInput: 0, gesture: null, hills: [], grow: 1 }
  let tulipHeads = []

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  // ------------------------------------------------------------ the scene

  /** Soft dabs of paint over the sky and the meadow, as the series' backgrounds are dabbed: drawn once. */
  function dab(parent, n, area, colours, size, faint = 0.12) {
    for (let i = 0; i < n; i++) {
      el('circle', {
        cx: area.x + paint() * area.w, cy: area.y + paint() * area.h, r: size[0] + paint() * size[1],
        fill: colours[Math.floor(paint() * colours.length)], opacity: faint + paint() * faint * 1.5,
      }, parent)
    }
  }

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
    dab(layers.sky, 90, { x: -100, y: -100, w: 1800, h: 700 }, ['#ffffff', '#b9cfee'], [30, 70], 0.04)
    const far = document.getElementById('far')
    for (let i = 0; i < 26; i++) {
      const x = i * 66 + paint() * 40
      el('ellipse', { cx: x, cy: 610 - paint() * 40, rx: 60 + paint() * 50, ry: 80 + paint() * 70, fill: paint() < 0.5 ? '#6e9a5a' : '#88b06e', opacity: 0.85 }, far)
    }
    dab(far, 160, { x: 0, y: 480, w: 1600, h: 160 }, ['#4d6d1f', '#a9cf7c', '#6e9a5a'], [8, 20])
    dab(document.getElementById('back-ground'), 300, { x: 0, y: 600, w: 1600, h: 130 }, ['#4d6d1f', '#a9cf7c', '#3f7d22'], [3, 9])
    dab(document.getElementById('front-ground'), 260, { x: 0, y: 730, w: 1600, h: 170 }, ['#4d6d1f', '#a9cf7c', '#3f7d22'], [3, 10])
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
      const base = 812 + (i % 2) * 22
      const height = 96 + paint() * 40
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
    el('rect', { class: 'tap-bed', x: BED.from - 20, y: 640, width: BED.to - BED.from + 40, height: 230, fill: 'transparent' }, bed)
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
    if (Day.cricket(h) && !cricket.classList.contains('out')) {
      cricket.classList.add('out')
      Debug.trace('cricket', { hour: Day.clock(h) })
      Sound.cricket()
    }
  }

  /** The circle closing through the last hour; at dusk, left alone, he goes home to listen; then bedtime. */
  function evening(h) {
    irisCircle.setAttribute('r', String(Math.round(Day.iris(h) * IRIS_FULL)))
    const alone = !Debug.still && !game.gesture && Clock.now() - game.lastInput > HOME_AT_DUSK_MS
    if (Day.phase(h) === 'dusk' && alone && Mole.state.pose !== 'listen') run('home to listen', homeToListen)
    if (Day.phase(h) === 'bedtime') bedtime()
  }

  function stateNow() {
    const m = Mole.state
    return { hour: Day.clock(game.hour), awake: game.awake, ended: game.ended, x: Math.round(m.x), pose: m.pose, busy: game.gesture, carrying: m.carrying, hills: game.hills.length, things: Things.state() }
  }

  function checkRules() {
    const m = Mole.state
    Debug.check('the mole is in the meadow', m.x >= DIG.from - 1 && m.x <= DIG.to + 1, { x: m.x })
    if (game.awake && !game.ended && !game.gesture) {
      Debug.check('a free mole stands', m.pose !== 'down', { pose: m.pose })
      Debug.check('a free mole holds nothing', !m.carrying, {})
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

  /** Get him out on the grass at x: tunnel there and climb out, or waddle if he's out already. */
  async function goTo(x) {
    x = clampX(x)
    const m = Mole.state
    if (m.pose === 'out') return Mole.walkTo(x)
    if (Math.abs(x - m.x) > 50) await digTo(x)
    await Mole.comeUp('out')
  }

  /** After a cut: he stands where he was going, with a molehill under him if he is in the ground. */
  function settle() {
    const m = Mole.state
    if (m.carrying) Mole.hold(false)
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

  async function tapMole() {
    const said = ['giggle', 'giggle', 'ooh', 'ahoj'][Math.floor(words() * 4)]
    Sound.say(said)
    Debug.trace('says', { said })
    await Mole.cheer()
  }

  async function water() {
    const m = Mole.state
    const fill = SPRING - 110
    if (m.pose !== 'out' || Math.abs(m.x - fill) > 40) {
      if (m.pose === 'out') await Mole.walkTo(fill)
      else await digTo(fill)
      await Mole.comeUp('out')
    }
    Mole.hold(true)
    Sound.water(0.9)
    await Mole.tip(55, 1000)
    await Mole.walkTo((BED.from + BED.to) / 2 + 60)
    Sound.water(1.3)
    sprinkle(1500)
    await Mole.tip(-40, 1500)
    Mole.hold(false)
    game.grow = Math.min(1.3, game.grow + 0.08)
    await Promise.all(tulipHeads.map((t) => Motion.endAt(t.stem, [{ transform: `scaleY(${game.grow})` }], { duration: 500, easing: 'cubic-bezier(.3,1.6,.5,1)' })))
    Debug.trace('watered', { grow: game.grow })
    await Mole.cheer()
  }

  /** Drops falling from the can's spout onto the flowers while he tips it. */
  function sprinkle(ms) {
    const drops = document.getElementById('drops')
    for (let i = 0; i < 14; i++) {
      Clock.after(300 + (i * (ms - 600)) / 14, () => {
        const { x, y } = Mole.spout()
        const d = el('circle', { r: 5, fill: '#7fb3ea', stroke: '#2f5d94', 'stroke-width': 1.5 }, drops)
        const dx = (paint() - 0.5) * 30
        Motion.endAt(d, [{ transform: `translate(${x}px, ${y}px)` }, { transform: `translate(${x + 30 + dx}px, ${y + 150}px)`, opacity: 0.2 }], { duration: 520, easing: 'ease-in' }).then(() => d.remove(), () => d.remove())
      })
    }
  }

  async function homeToListen() {
    if (Math.abs(Mole.state.x - HOME) > 50 || Mole.state.pose === 'out') await digTo(HOME)
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
    den.classList.add('waking')
    await Clock.wait(900)
    await Debug.ignoreCut(Motion.endAt(den, [{ opacity: 1 }, { opacity: 0 }], { duration: 700 }), 'den fades')
    den.style.display = 'none'
    game.dayStart = Clock.now()
    tick()
    if (game.token !== mine) return // a tap has him busy already
    Sound.pop()
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
    Debug.trace('bedtime')
    cutShort()
    Things.night()
    game.gesture = 'bedtime'
    if (Math.abs(Mole.state.x - HOME) > 50 || Mole.state.pose === 'out') await Debug.ignoreCut(digTo(HOME), 'home to bed')
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
    Sound.quiet()
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
    [/^water$/, () => run('water', water)],
    [/^use ([a-z]+)$/, (m) => Things.use(m[1]) || run('tap mole', tapMole)],
    [/^dig to (\d+)$/, (m) => run('dig', () => digTo(Number(m[1])))],
  ]

  function perform(intent) {
    Debug.input(intent)
    if (game.ended) return
    game.lastInput = Clock.now()
    if (!game.awake) return wake()
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
    const thing = target.closest('[data-thing]')
    if (thing) return `use ${thing.dataset.thing}`
    // a tap on him while an encounter plays is a tap on it (he holds the egg): it hurries it on
    if (target.closest('.mole')) return game.gesture && Things.get(game.gesture) ? `use ${game.gesture}` : 'tap mole'
    if (target.closest('#bed') || target.closest('#spring')) return 'water'
    if (p.y > 560) return `dig to ${Math.round(clampX(p.x))}`
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
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') perform(`dig to ${Math.round(clampX(x + (e.key === 'ArrowLeft' ? -220 : 220)))}`)
    else if (e.key === ' ') perform(x > BED.from - 120 && x < SPRING + 60 ? 'water' : 'tap mole')
    else perform('tap mole')
    e.preventDefault()
  })

  // ------------------------------------------------------------ start

  makeScene()
  Friends.setup(document.getElementById('friends'))
  const things = Things.setup({
    run,
    goTo,
    el,
    free: () => game.awake && !game.ended && !game.gesture,
    alone: () => Clock.now() - game.lastInput,
    busyWith: () => game.gesture,
  })
  Debug.pin({ flags: { ...(Layout.flags.day ? { day: Layout.flags.day } : {}), props: things.join(',') }, layout: { home: HOME, spring: SPRING, things } })
  Debug.record(stateNow)
  Clock.every(TICK_MS, tick)
  Clock.after(WAKE_ANYWAY_MS, () => { if (!game.awake) perform('wake') })

  return { perform, state: stateNow, trace: () => Debug.dump(), things: Things.names(), detail: (name) => Things.get(name).detail() }
})()
