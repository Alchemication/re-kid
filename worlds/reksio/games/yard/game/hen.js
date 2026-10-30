// The hen who lays where she shouldn't (after Reksio i nośna kura, 1981: a
// hen who lays her eggs all over the yard, and Reksio collects them).
//
// Some plays have her nest by the wall, the garden ladder leaning beside it.
// A while in, she flutters up onto the top of the wall, lays an egg there,
// flutters down, and can't get it back: she clucks up at it. Reksio carries
// the ladder over under the egg (Adam's frame of him carrying a ladder,
// 2026-10-19), leans it on the wall, climbs, takes the egg gently in his
// mouth, climbs down and puts it in her nest. She settles on it, happy.
// Each time after, she flutters up and lays again somewhere else along the
// wall, and something is added on top, a different thing each time
// (VARIATIONS): the ladder wobbles on his way down and he clings to it; the
// egg hatches in the nest and a chick hops out to him; or he and the hen
// dance for joy.
//
// Everything is drawn inside the hen's own group, in the coordinates it is
// drawn in (index.html); Layout.x('hen') moves the lot. The egg he carries
// is drawn in the scene's effects layer, in scene units.

/* global Clock, Debug, Layout, Sound, Music, Reksio, Figure */
/* exported Hen */
const Hen = (() => {
  const GROUND = 812
  const WALL_TOP = 334 // the top of the yard wall (index.html)
  const NEST = { x: 1050, y: 806 } // drawn
  const EGG_XS = [1060, 1270] // where along the wall top she may lay (drawn)
  const LADDER_LONG = 470 // from its foot on the ground to just under the wall top
  const LADDER_LEAN = 4 // degrees: its top a little towards the wall's face
  const LADDER_START = 1250 // where it leans at the start (drawn)
  const CLIMBER = 34 // he stands this far to the side of the ladder's foot, facing it (his units)
  const RUNGS = 7 // he climbs this many steps up
  const HEN_AT_S = [15, 40] // she goes up to lay this long into the play
  const HEN_SCALE = 1.75
  const HELPED_GAP = 90 // a new egg at least this far along the wall from the last
  const CHICKS = 2 // at most this many chicks by the nest: more would crowd the yard
  const EGG_BITE = { x: 14, y: 3 } // the egg in his teeth, from his bite (his units): held at its end, most of it out in front
  const EGG = { rx: 13, ry: 17 } // an egg's size, big enough to see up on the wall
  const EGG_HELD = { rx: 9, ry: 12 } // drawn smaller in his mouth: up on the wall it is big enough to see; held, it must not hide his face
  const VARIATIONS = ['wobble', 'chick', 'dance']

  const SVG_NS = 'http://www.w3.org/2000/svg'
  const $ = (id) => document.getElementById(id)
  const wait = Clock.wait
  const random = Debug.random('hen') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)
  const X = () => Layout.x('hen')
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
    if (parent) parent.appendChild(n)
    return n
  }
  /** Move something along over ms of game time, step(k) each frame, k 0 to 1. */
  async function tween(ms, step) {
    const t0 = Clock.now()
    for (;;) {
      const k = Math.min(1, (Clock.now() - t0) / ms)
      step(k)
      if (k >= 1) return
      await Clock.frame()
    }
  }
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)
  /** A sound from the hen's place, as Reksio hears it. */
  const hear = (x, play) => Sound.from(Math.abs(x + X() - Reksio.x), play)

  let fx = { heart: () => {} } // effects, from things.js
  let isEnded = () => false
  let state = 'away' // away (not out) | nesting | laying | worried (an egg up on the wall) | helping
  let hen = null // {g, wing, x, y, dir}
  let ladder = null // {g, foot}: where its foot stands, drawn
  let eggUp = null // the egg on the wall: {el, x}
  const chicks = []

  // ------------------------------------------------------------ drawing

  function drawHen() {
    const g = el('g', { class: 'hen' }, $('hen-bird'))
    const body = el('g', {}, g)
    el('path', { class: 'hen-leg', d: 'M-4 -10 V0 M6 -10 V0 M-8 0 H0 M2 0 H10' }, body)
    el('path', { class: 'hen-tail', d: 'M-18 -30 Q-36 -58 -26 -20 Z' }, body)
    el('ellipse', { class: 'hen-body', cx: 0, cy: -26, rx: 24, ry: 18 }, body)
    const wing = el('ellipse', { class: 'hen-wing', cx: -3, cy: -27, rx: 13, ry: 9, style: 'transform-origin: 6px -30px' }, body)
    el('path', { class: 'hen-comb', d: 'M11 -56 Q13 -64 17 -57 Q19 -65 23 -56 Q26 -61 26 -53 Z' }, body)
    el('circle', { class: 'hen-body', cx: 18, cy: -47, r: 10 }, body)
    el('path', { class: 'hen-beak', d: 'M27 -49 L36 -46 L27 -43 Z' }, body)
    el('ellipse', { class: 'hen-comb', cx: 25, cy: -38, rx: 3, ry: 4.5 }, body)
    el('circle', { class: 'eye', cx: 21, cy: -49, r: 1.9 }, body)
    hen = { g, body, wing, x: NEST.x + 50, y: GROUND, dir: -1, sitting: false }
    placeHen()
  }

  function placeHen() {
    const sit = hen.sitting ? 10 : 0 // sitting on the nest, her legs tucked under
    hen.g.setAttribute('transform', `translate(${hen.x} ${hen.y + sit}) scale(${hen.dir * HEN_SCALE} ${HEN_SCALE})`)
  }

  function drawLadder() {
    const g = el('g', { class: 'ladder' }, $('hen-ladder'))
    const rails = 'M-19 0 V' + -LADDER_LONG + ' M19 0 V' + -LADDER_LONG
    let rungs = ''
    for (let y = -38; y > -LADDER_LONG; y -= 50) rungs += `M-19 ${y} H19 `
    for (const cls of ['ladder-ink', 'ladder-wood']) el('path', { class: cls, d: `${rails} ${rungs}` }, g)
    ladder = { g, foot: LADDER_START }
    lean(LADDER_START)
  }

  /** The ladder's centre and angle, in the hen's drawn coordinates. */
  function setLadder(cx, cy, deg) {
    ladder.g.setAttribute('transform', `translate(${cx} ${cy}) rotate(${deg}) translate(0 ${LADDER_LONG / 2})`)
    ladder.at = { cx, cy, deg }
  }

  /** Where its centre is when it leans against the wall with its foot at x. */
  function leaning(x) {
    const a = (LADDER_LEAN * Math.PI) / 180
    return { cx: x + (Math.sin(-a) * LADDER_LONG) / 2, cy: GROUND - (Math.cos(a) * LADDER_LONG) / 2, deg: -LADDER_LEAN }
  }

  function lean(x) {
    ladder.foot = x
    const l = leaning(x)
    setLadder(l.cx, l.cy, l.deg)
  }

  /** An egg, in the scene's effects layer, at scene point p. */
  function makeEgg(p) {
    const e = el('ellipse', { class: 'egg', ...EGG }, $('fx')) // big enough to see up on the wall
    putEgg(e, p)
    return e
  }
  const putEgg = (e, p) => {
    e.setAttribute('cx', p.x)
    e.setAttribute('cy', p.y)
  }
  const scene = (x, y) => ({ x: x + X(), y })

  // ------------------------------------------------------------ her moves

  /** She flutters in an arc to (x, y), wings going. */
  async function flutter(x, y, ms = 900) {
    const from = { x: hen.x, y: hen.y }
    hen.dir = x >= from.x ? 1 : -1
    hen.sitting = false
    const flap = hen.wing.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-50deg)' }, { transform: 'rotate(0)' }], { duration: 140, iterations: Infinity })
    hear(hen.x, () => Sound.flutter())
    try {
      await tween(ms, (k) => {
        const e = ease(k)
        hen.x = from.x + (x - from.x) * e
        hen.y = from.y + (y - from.y) * e - Math.sin(Math.PI * k) * 60
        placeHen()
      })
    } finally {
      flap.cancel()
    }
  }

  /** A few steps along the ground to x. */
  async function walk(x) {
    const from = hen.x
    hen.dir = x >= from ? 1 : -1
    hen.sitting = false
    await tween(Math.abs(x - from) * 6 + 200, (k) => {
      hen.x = from + (x - from) * k
      hen.y = GROUND - Math.abs(Math.sin(k * Math.PI * 6)) * 4
      placeHen()
    })
    hen.y = GROUND
    placeHen()
  }

  /** A cluck, her head bobbing. */
  function cluck(times = 1) {
    hear(hen.x, () => Sound.cluck(times))
    hen.body.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 220, iterations: times })
  }

  /** Up onto the wall, an egg laid there, and down again to cluck up at it. */
  async function lay() {
    state = 'laying'
    const x = pickEggX()
    Debug.trace('hen lays', { x: Math.round(x + X()) })
    await flutter(x, WALL_TOP)
    cluck(3)
    await wait(900)
    hear(x, () => Sound.cluck(1, true)) // the big "ko-DAK"
    eggUp = { el: makeEgg(scene(x + 4, WALL_TOP - 15)), x }
    eggUp.el.animate([{ transform: 'scale(0.4)' }, { transform: 'scale(1)' }], { duration: 250 }) // about its own middle (game.css .egg)
    await wait(400)
    await flutter(Math.max(NEST.x + 40, x - 70), GROUND)
    hen.dir = 1
    placeHen()
    state = 'worried'
    $('hen').classList.remove('not-yet')
    worriedLoop()
  }

  /** Somewhere new along the wall, away from the last egg and the ladder. */
  function pickEggX() {
    for (let i = 0; i < 8; i++) {
      const x = rnd(...EGG_XS)
      if (Math.abs(x - ladder.foot) >= HELPED_GAP) return x
    }
    return ladder.foot > (EGG_XS[0] + EGG_XS[1]) / 2 ? EGG_XS[0] : EGG_XS[1]
  }

  /** While the egg is up there: she clucks up at it, flapping. */
  async function worriedLoop() {
    while (state === 'worried' && !isEnded()) {
      await wait(rnd(2200, 4000))
      if (state !== 'worried') return
      cluck(2)
      hen.wing.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-40deg)' }, { transform: 'rotate(0)' }], { duration: 260, iterations: 2 })
    }
  }

  // ------------------------------------------------------------ his part

  /** He picks up the ladder and carries it, level, to under the egg. */
  async function carryLadder(toX) {
    Reksio.face(1)
    await Reksio.nod(10, 300) // he takes hold
    const arms = { nearArm: [[24, -100], [40, -112]], farArm: [[6, -100], [22, -112]] }
    Reksio.wear('ladder', (p) => Figure.vary(p, arms))
    const held = () => {
      const r = Reksio.x - X()
      return { cx: r + 20 * Reksio.facing, cy: GROUND - 118, deg: 90 }
    }
    const from = ladder.at
    await tween(350, (k) => {
      const to = held()
      setLadder(from.cx + (to.cx - from.cx) * k, from.cy + (to.cy - from.cy) * k, from.deg + (to.deg - from.deg) * k)
    })
    Sound.scrape()
    const follow = Clock.every(0, () => {
      const h = held()
      setLadder(h.cx, h.cy, h.deg)
    })
    try {
      await Reksio.walkTo(toX + X() - CLIMBER)
    } finally {
      follow()
    }
    const up = { ...ladder.at } // as carried, before he turns to the wall
    Reksio.face(1)
    const to = leaning(toX)
    await tween(400, (k) => setLadder(up.cx + (to.cx - up.cx) * k, up.cy + (to.cy - up.cy) * k, up.deg + (to.deg - up.deg) * k))
    lean(toX)
    Reksio.wear('ladder', null)
    Sound.tok()
  }

  /** How far up he climbs (his units) to have the egg at his mouth. */
  const climbRise = () => (Reksio.mouth().y - (WALL_TOP - 15)) / Reksio.kit.SCALE

  /** Up the ladder, the egg into his mouth, and down again (wobbling on
   * the way, for that variation). Resolves with the egg he carries. */
  async function fetchEgg(wobble) {
    const rise = climbRise()
    await Reksio.climb(rise, RUNGS)
    const egg = eggUp.el
    eggUp = null
    putEgg(egg, EGG_BITE) // in his teeth, drawn with him (Reksio.inMouth)
    egg.setAttribute('rx', EGG_HELD.rx)
    egg.setAttribute('ry', EGG_HELD.ry)
    Reksio.inMouth(egg)
    /** Out of his mouth, back among the scene's effects where it was. */
    const stop = () => {
      Reksio.inMouth(null)
      $('fx').appendChild(egg)
      putEgg(egg, Reksio.mouth())
      egg.setAttribute('rx', EGG.rx)
      egg.setAttribute('ry', EGG.ry)
    }
    cluck(2)
    try {
      await Reksio.climbDown(RUNGS, wobble ? () => wobbleLadder() : null)
    } catch (e) {
      stop()
      throw e
    }
    return { egg, stop }
  }

  /** The ladder sways side to side under him. */
  function wobbleLadder() {
    const l = ladder.at
    Sound.scrape()
    return tween(1100, (k) => setLadder(l.cx, l.cy, l.deg + Math.sin(k * Math.PI * 4) * 4 * (1 - k)))
  }

  /** Into the nest; she hurries over and settles on it. */
  async function intoNest(egg, stop) {
    await Reksio.walkTo(NEST.x + X() - 70)
    Reksio.face(1)
    await Reksio.nod(22, 700) // gently down
    stop()
    putEgg(egg, scene(NEST.x, NEST.y - 12))
  }

  /** She hurries over and settles on the nest (on the egg, if it's still one). */
  async function settle(egg) {
    await walk(NEST.x)
    egg?.remove()
    hen.sitting = true
    hen.dir = 1
    placeHen()
    cluck(2)
    fx.heart(NEST.x + X(), GROUND - 90)
    Music.react.done()
  }

  /** The egg hatches: it rocks, cracks, and a chick pops out and hops to him. */
  async function hatch(egg) {
    egg.animate([0, -12, 12, -8, 8, 0].map((d) => ({ transform: `rotate(${d}deg)` })), { duration: 700 })
    await wait(800)
    Sound.crack()
    egg.remove()
    const c = el('g', { class: 'chick' }, $('hen-bird'))
    el('circle', { class: 'chick-body', cx: 0, cy: -9, r: 9 }, c)
    el('circle', { class: 'chick-body', cx: 6, cy: -19, r: 6 }, c)
    el('path', { class: 'hen-beak', d: 'M11 -20 L16 -18 L11 -16 Z' }, c)
    el('circle', { class: 'eye', cx: 8, cy: -21, r: 1.3 }, c)
    let x = NEST.x - 10
    const put = (y = 0) => c.setAttribute('transform', `translate(${x} ${NEST.y + y}) scale(-1.4 1.4)`)
    put()
    chicks.push(c) // counted at once, so a cut can't leave one uncounted
    if (chicks.length > CHICKS) chicks.shift().remove()
    Sound.cheep()
    for (let i = 0; i < 3; i++) {
      const from = x
      await tween(260, (k) => {
        x = from - 14 * k
        put(-Math.sin(Math.PI * k) * 10)
      })
    }
    Sound.cheep()
    await Reksio.aww()
  }

  /** He and the hen hop about together for joy. */
  async function dance() {
    const hops = (async () => {
      for (let i = 0; i < 3; i++) {
        cluck(1)
        await tween(320, (k) => {
          hen.y = GROUND - Math.sin(Math.PI * k) * 22
          placeHen()
        })
      }
    })()
    await Reksio.hop(40, 2)
    await hops
  }

  /** The thing: help her get her egg down. Each time after the first she
   * lays again first; v: the variation on top (things.js draws it). */
  async function run({ v }) {
    if (state === 'nesting') await lay()
    if (state !== 'worried') return
    state = 'helping'
    let carried = null
    try {
      await Reksio.lookUp(700)
      await carryLadder(eggUp.x)
      carried = await fetchEgg(v === 'wobble')
      const { egg } = carried
      await intoNest(egg, carried.stop)
      carried = null
      if (v === 'chick') await hatch(egg)
      await settle(v === 'chick' ? null : egg)
      if (v === 'dance') await dance()
    } finally {
      // however it ends: the ladder leaning somewhere; an egg he had is in
      // the nest under her, one he never reached still up on the wall
      Reksio.wear('ladder', null)
      if (!ladder.at || ladder.at.deg !== -LADDER_LEAN) lean(Math.min(Math.max(Reksio.x - X() + CLIMBER, EGG_XS[0]), EGG_XS[1]))
      carried?.stop()
      carried?.egg.remove()
      hen.y = GROUND
      if (eggUp) {
        state = 'worried' // still up there: she waits for him, clucking
        placeHen()
        worriedLoop()
      } else {
        hen.x = NEST.x
        hen.sitting = true
        placeHen()
        state = 'nesting'
      }
    }
  }

  const thing = {
    at: () => ladder.foot + X() - 60,
    face: 1,
    run,
  }

  function init({ ended, effects }) {
    isEnded = ended
    fx = effects
    if (Layout.hidden.includes('hen')) return
    drawHen()
    drawLadder()
    hen.x = NEST.x
    hen.sitting = true
    placeHen()
    state = 'nesting'
    $('hen').classList.add('not-yet')
    const drawn = rnd(...HEN_AT_S) // drawn either way, so ?hen-at doesn't shift the rest
    Clock.after((Layout.henAt ?? drawn) * 1000, () => {
      if (state === 'nesting' && !isEnded()) lay()
    })
  }

  return {
    VARIATIONS,
    thing,
    init,
    /** Can she be helped? Once she has laid her first egg up on the wall. */
    get ready() { return state !== 'away' && !$('hen').classList.contains('not-yet') },
    get state() { return state },
  }
})()
