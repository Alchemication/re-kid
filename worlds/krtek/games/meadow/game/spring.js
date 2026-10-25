// The spring: a little rock cliff behind the meadow's pool, a waterfall
// pouring from a cleft in it into the pool, foam where it lands, lily pads
// and reeds (after the spring in Krtek a buldozer's opening, made bigger:
// Adam, 2026-10-25, "more immersive and impressive to look at, with
// occasional random life on/in it").
//
// Its life is chosen fresh each play and comes and goes on its own feet or
// wings (docs/DESIGN_PRINCIPLES.md, nothing from nowhere):
// - a frog, some plays: it sits on a lily pad, croaks now and then, and now
//   and then plops into the pool, surfacing a while later; a tap on it, and in
//   it plops;
// - one or two dragonflies, now and then: they dart in, hover here and there
//   over the pool, and dart off;
// - a fish, some plays: now and then it leaps out of the pool and back in;
// - a bullfinch, now and then: it flies down to the pool's edge, drinks and
//   flies off;
// and rings spread on the water where anything touches it.
//
// They live on the world model (docs/WORLD_MODEL.md): the pool offers a
// drink at its edges, which is what brings the bullfinch down; the finch is
// off at the church bell, a splash or the car, the dragonflies at a splash;
// and the frog, sitting on its pad, plops in at a splash near it (the fish,
// the mole paddling) or the car going by. Their splashes are noises the
// others hear in turn.
//
// Drawn once; its life moves only on the Clock (Motion.endAt for the frog and
// the fish, ambient.js for the flyers), with its own random stream, so it
// doesn't shift the rest of the play. Nothing at night.

/* global Ambient, Clock, Creature, Debug, Friends, Layout, Motion, Sound, World */
/* exported Spring */
const Spring = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const INK = '#2f2a22'
  const S = Layout.SPRING
  const POOL = { x: S + 40, y: 708, rx: 220, ry: 36 }
  const FALL = { x: S + 205, top: 482, bottom: 700, w: 30 } // the waterfall: over the ledge, down the wet stone into the pool
  const PAD = { x: S - 60, y: 712 } // the frog's lily pad
  const EVERY_MS = [9000, 20000] // between one bit of life and the next
  const NIGHT_FROM = 18.8 // they all go quiet by sunset
  const FROG_HEARS = ['splash', 'vroom'] // what has the frog plop in: a splash near it, the car going by
  const FROG_LISTENS_MS = 250
  const DRINK_Y = POOL.y + 8 // where a bird stands to drink, at the water's edge
  const BULLFINCH = {
    speed: 300, flee: 1.6, turn: 4,
    stayMs: [3000, 5000], // over by the time it has drunk: down, a drink, and off (a drink under way is always finished)
    hours: [8.4, NIGHT_FROM], dark: 0.5, wet: 'avoid',
    feeds: 'drink', hungerMs: [0, 0], feedMs: [2200, 3000], // comes thirsty; two dips
    startledBy: ['bell', 'splash', 'vroom'],
    band: [POOL.y - 320, POOL.y - 160], roam: 1400, // sees the pool from out of sight
    haunt: [POOL.x - 700, POOL.x + 700],
  }
  const DRAGONFLY = {
    speed: 260, flee: 2, turn: 7, // a dart, quick to turn
    stayMs: [6000, 11000],
    hours: [8.4, NIGHT_FROM], dark: 0.5, wet: 'avoid',
    startledBy: ['splash'],
    band: [POOL.y - 110, POOL.y - 40], roam: 300, // low over the water
    haunt: [POOL.x - POOL.rx * 0.8, POOL.x + POOL.rx * 0.8],
    pauseMs: [500, 1300], // hovering
  }
  const life = Debug.random('spring-life')
  const pick = (list) => list[Math.floor(life() * list.length)]
  const between = ([a, b]) => a + life() * (b - a)
  let layer = null
  let water = null // the pool's surface group (rings go on it)
  let frog = null // { g, in: boolean }
  let fish = false
  let hourNow = () => 9
  let ids = 0

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const line = { stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }

  // ------------------------------------------------------------ drawing

  function draw() {
    const g = layer
    // the rock cliff is painted (painting.js rocks); the water goes over it
    // the waterfall: over the ledge, a sheet of water falling, its streaks running down (game.css .fall), mist where it lands
    const fall = el('g', { class: 'waterfall' }, g)
    const { x, top, bottom, w } = FALL
    el('path', { d: `M${x - w - 6} ${top - 8} Q${x} ${top - 22} ${x + w + 6} ${top - 8} L${x + w} ${top + 6} Q${x} ${top - 4} ${x - w} ${top + 6} Z`, fill: '#bcd6f6', stroke: '#4f7fc6', 'stroke-width': 2 }, fall)
    el('path', { d: `M${x - w} ${top} Q${x - w - 8} ${(top + bottom) / 2} ${x - w - 14} ${bottom} H${x + w + 14} Q${x + w + 8} ${(top + bottom) / 2} ${x + w} ${top} Z`, fill: '#8fb6ea', opacity: 0.92, stroke: '#4f7fc6', 'stroke-width': 2 }, fall)
    for (let k = 0; k < 7; k++) {
      const dx = -w + 4 + (k * (2 * w - 8)) / 6
      el('path', { class: 'fall', d: `M${x + dx} ${top + 2} Q${x + dx * 1.2} ${(top + bottom) / 2} ${x + dx * 1.45} ${bottom}`, stroke: k % 2 ? '#eef6ff' : '#d4e6fb', 'stroke-width': k % 2 ? 3 : 2, fill: 'none', 'stroke-linecap': 'round', style: `animation-delay: -${(k * 0.13).toFixed(2)}s` }, fall)
    }
    // the pool, its far bank darker, light on the water
    el('ellipse', { cx: POOL.x, cy: POOL.y, rx: POOL.rx, ry: POOL.ry, fill: '#5d79c8', stroke: '#2f4a8a', 'stroke-width': 3 }, g)
    el('ellipse', { cx: POOL.x + 10, cy: POOL.y + 6, rx: POOL.rx - 30, ry: POOL.ry - 12, fill: '#7a95dc' }, g)
    water = el('g', { class: 'water' }, g)
    // foam where the fall lands (game.css .foam: it heaves)
    const foam = el('g', { class: 'foam' }, g)
    for (const [dx, rr] of [[-48, 10], [-30, 14], [-10, 17], [12, 16], [32, 13], [50, 9]]) el('circle', { cx: FALL.x + dx, cy: FALL.bottom + 2, r: rr, fill: '#f4f8ff', stroke: '#9cb7e6', 'stroke-width': 1.5 }, foam)
    // lily pads, one with a flower; reeds and cattails at the near end
    for (const [x, y, r] of [[PAD.x, PAD.y, 24], [S + 60, 718, 18], [S - 110, 704, 15], [S + 120, 702, 13]]) {
      el('path', { d: `M${x} ${y} m${r} 0 a${r} ${r * 0.42} 0 1 1 -${r * 0.4} -${r * 0.38} L${x} ${y} Z`, fill: '#4f8a3a', stroke: '#2a4a17', 'stroke-width': 2 }, g)
    }
    el('circle', { cx: S + 60, cy: 712, r: 6, fill: '#f6b3c4', stroke: '#b5577a', 'stroke-width': 1.5 }, g)
    for (const [x, h, lean] of [[POOL.x - POOL.rx + 10, 120, -6], [POOL.x - POOL.rx + 26, 150, -2], [POOL.x - POOL.rx + 40, 110, 4], [POOL.x + POOL.rx - 20, 100, 6]]) {
      el('path', { d: `M${x} ${POOL.y + 8} q${lean} -${h / 2} ${lean * 2} -${h}`, stroke: '#4f7a33', 'stroke-width': 4, fill: 'none' }, g)
      if (h > 115) el('rect', { x: x + lean * 2 - 5, y: POOL.y + 8 - h, width: 10, height: 30, rx: 5, fill: '#7a4a24', transform: `rotate(${lean} ${x + lean * 2} ${POOL.y + 8 - h})` }, g)
    }
    el('rect', { class: 'tap-spring', x: POOL.x - POOL.rx, y: 470, width: POOL.rx * 2 + 140, height: 260, fill: 'transparent' }, g)
  }

  // ------------------------------------------------------------ life

  /** Rings spreading on the water at x. */
  function rings(x, y = POOL.y) {
    for (let k = 0; k < 2; k++) {
      const r = el('ellipse', { cx: x, cy: y, rx: 8, ry: 3, fill: 'none', stroke: '#dde8ff', 'stroke-width': 2 }, water)
      r.style.transformBox = 'fill-box'
      r.style.transformOrigin = 'center'
      Motion.endAt(r, [{ transform: 'scale(1)', opacity: 0.9 }, { transform: 'scale(5)', opacity: 0 }], { duration: 1400, delay: k * 300, easing: 'ease-out' })
        .then(() => r.remove(), () => r.remove())
    }
  }

  /** The frog: sitting on its pad, or in the water (hidden, rings where it went). */
  function drawFrog() {
    const g = el('g', { class: 'frog', 'data-critter': 'frog' }, layer)
    el('ellipse', { cx: 0, cy: -10, rx: 18, ry: 12, fill: '#6fae4c', ...line, 'stroke-width': 2 }, g)
    for (const dx of [-8, 8]) {
      el('circle', { cx: dx, cy: -22, r: 6, fill: '#6fae4c', ...line, 'stroke-width': 2 }, g)
      el('circle', { cx: dx, cy: -22, r: 2.5, fill: INK }, g)
    }
    el('path', { d: 'M-9 -8 q9 6 18 0', stroke: INK, 'stroke-width': 1.8, fill: 'none' }, g)
    el('path', { d: 'M-18 -2 q-8 4 -12 2 M18 -2 q8 4 12 2', stroke: '#4f8a3a', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g)
    el('circle', { cx: 0, cy: -16, r: 30, fill: 'transparent' }, g) // a bigger target for small fingers
    g.style.transform = `translate(${PAD.x}px, ${PAD.y}px)`
    return { g, in: false }
  }

  /** Plop: the frog leaps off its pad into the pool, rings, and later climbs back on. */
  async function plop(tapped = false) {
    if (!frog || frog.in) return
    frog.in = true
    Debug.trace('frog', { plop: true, tapped })
    const to = PAD.x + 50
    await Debug.ignoreCut(Motion.endAt(frog.g, [{ transform: `translate(${PAD.x}px, ${PAD.y}px)` }, { transform: `translate(${PAD.x + 25}px, ${PAD.y - 50}px)`, offset: 0.5 }, { transform: `translate(${to}px, ${PAD.y + 10}px) scale(0.4)`, opacity: 0 }], { duration: 520, easing: 'ease-in' }), 'the frog plops in')
    Sound.splash()
    World.noise('splash', to, 250)
    rings(to)
    Clock.after(between([6000, 12000]), () => {
      if (!frog) return
      rings(PAD.x)
      frog.in = false
      Debug.ignoreCut(Motion.endAt(frog.g, [{ transform: `translate(${PAD.x}px, ${PAD.y + 10}px) scale(0.5)`, opacity: 0 }, { transform: `translate(${PAD.x}px, ${PAD.y}px)`, opacity: 1 }], { duration: 600, easing: 'ease-out' }), 'the frog climbs back')
    })
  }

  /** A dragonfly darts in from out of sight, hovers here and there over the pool, and darts off. */
  function dragonfly() {
    const g = el('g', { class: 'dragonfly' }, layer)
    el('path', { d: 'M-16 0 H14', stroke: '#2f6fae', 'stroke-width': 4, 'stroke-linecap': 'round' }, g)
    el('circle', { cx: 15, cy: 0, r: 4, fill: '#2f6fae' }, g)
    const wings = el('g', { class: 'dwings' }, g)
    for (const s of [-1, 1]) el('ellipse', { cx: 4, cy: s * 8, rx: 10, ry: 4, fill: '#dbeafc', opacity: 0.8, stroke: '#7aa0cc', 'stroke-width': 1 }, wings)
    const c = Creature.make(DRAGONFLY, Friends.offscreen(life() < 0.5 ? -1 : 1, POOL.x), 560, Clock.now(), life)
    Ambient.add(c, {
      name: 'dragonfly', id: ++ids, rnd: life,
      draw: () => { g.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px) scaleX(${c.vx < 0 ? -1 : 1})` },
      gone: () => g.remove(),
    })
  }

  /** The fish leaps out of the pool in an arc and back in, with a splash. */
  async function leap() {
    const g = el('g', { class: 'fish' }, water)
    el('path', { d: 'M-16 0 Q0 -10 16 0 Q0 10 -16 0 Z M16 0 l10 -7 v14 z', fill: '#e2873a', ...line, 'stroke-width': 2 }, g)
    const x0 = POOL.x - 60 + life() * 80
    rings(x0)
    Sound.splash()
    World.noise('splash', x0, 250)
    await Debug.ignoreCut(Motion.endAt(g, [
      { transform: `translate(${x0}px, ${POOL.y}px) rotate(-40deg)` },
      { transform: `translate(${x0 + 40}px, ${POOL.y - 90}px) rotate(0deg)`, offset: 0.5 },
      { transform: `translate(${x0 + 80}px, ${POOL.y}px) rotate(40deg)`, opacity: 0.2 },
    ], { duration: 900, easing: 'ease-in-out' }), 'the fish leaps')
    g.remove()
    rings(x0 + 80)
    Sound.splash()
  }

  /** A bullfinch flies down to the pool's edge, dips its head to drink twice, and flies off. */
  function bullfinch() {
    const dir = life() < 0.5 ? -1 : 1
    const bird = Friends.make('bullfinch', Friends.offscreen(dir, POOL.x), -dir)
    bird.g.classList.add('flying')
    const c = Creature.make(BULLFINCH, bird.x, POOL.y - 260, Clock.now(), life)
    Ambient.add(c, {
      name: 'bullfinch', id: ++ids, rnd: life,
      draw: () => {
        bird.g.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px)`
        if (Math.abs(c.vx) > 30) bird.turn(Math.sign(c.vx))
        bird.g.classList.toggle('flying', !Creature.feeding(c))
      },
      arrived: async (_, kind) => {
        if (kind !== 'feed') return
        bird.turn(Math.sign(POOL.x - c.x)) // to the water
        for (let k = 0; k < 2 && Creature.feeding(c); k++) {
          await Debug.ignoreCut(bird.bob(1), 'the bullfinch drinks')
          rings(c.x + bird.face * 18, POOL.y + 4)
        }
      },
      gone: () => bird.gone(true),
    })
  }

  /** The frog hears what goes on round it: a splash near it, or the car, and in it plops. */
  function listen() {
    let since = Clock.now()
    Clock.every(FROG_LISTENS_MS, () => {
      const heard = World.heard(PAD.x, since).some((n) => FROG_HEARS.includes(n.kind))
      since = Clock.now()
      if (heard && frog && !frog.in) plop()
    })
  }

  /** Every so often, one bit of the spring's life, from those this play has. */
  function next() {
    Clock.after(between(EVERY_MS), () => {
      next()
      if (hourNow() >= NIGHT_FROM || hourNow() < 8.4) return
      const can = ['drink']
      if (frog && !frog.in) can.push('frog', 'frog')
      if (fish) can.push('fish')
      if (Ambient.count('dragonfly') < 2) can.push('dragonfly')
      const what = pick(can)
      Debug.trace('spring', { what })
      if (what === 'frog') { Sound.croak(); Clock.after(900, () => plop()) }
      else if (what === 'fish') leap()
      else if (what === 'dragonfly') dragonfly()
      else if (!Ambient.count('bullfinch')) bullfinch()
    })
  }

  /** Draw it into `into` (the spring's group); hour() the meadow's hour. */
  function setup(into, hour) {
    layer = into
    hourNow = hour
    draw()
    // a drink at either edge of the pool: what brings the birds down
    for (const side of [-1, 1]) World.offer(`pool-${side < 0 ? 'left' : 'right'}`, 'drink', POOL.x + side * (POOL.rx - 10), DRINK_Y)
    // this play's life (drawn either way, so the stream stays put)
    const hasFrog = life() < 0.75
    fish = life() < 0.6
    if (hasFrog) {
      frog = drawFrog()
      listen()
    }
    next()
  }

  /** A tap on the frog: in it plops. */
  const tapFrog = () => plop(true)

  return { setup, tapFrog, POOL, get frog() { return frog && !frog.in } }
})()
