// The meadow's small life between the encounters: butterflies. Now and then
// through the day one or two flutter in, wander over the meadow, settle on a
// flower a moment, and flutter off; never after sunset. A tap on one sends
// it fluttering up and away, and the meadow has the mole look up after it
// (the children in the yard wanted more going on; a toddler loves a thing to
// tap that answers).
//
// Their comings and goings draw from their own stream, and how they flutter
// each frame from another, so neither shifts the rest of the play. Time is
// the Clock's. A still play (?still) has none, unless ?critters=now asks for
// one at once (layout.js), for trying them and for the tests.

/* global Clock, Debug, Layout, View */
/* exported Critters */
const Critters = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const FIRST_MS = [12000, 25000] // the first comes this long after he wakes...
  const EVERY_MS = [25000, 50000] // ...and the next this long after the last came
  const MAX = 2 // at most this many out at once
  const STAY_MS = [18000, 30000] // how long one wanders before it goes
  const SPEED = 140 // scene units a second, wandering
  const FLEE = 3 // tapped, it flies off this much quicker
  const SIZE = 1.6 // drawn this much bigger than its shapes: big enough for a toddler to see and tap
  const REST_MS = [1500, 3500] // settled on a flower, this long
  const DAY = { from: 8.3, to: 18.6 } // hours they are about
  const SKY = 420 // how high they wander (scene y), at most…
  const LOW = 690 // …and how low: over the grass, among the flowers
  const COLOURS = [['#f6d23b', '#e08a20'], ['#fbf8ef', '#9aa4c8'], ['#e98a3a', '#7a3a14'], ['#9fc4f0', '#3d5fc4']] // wings, and their edges and spots
  const comings = Debug.random('meadow-critters')
  const flutter = Debug.random('meadow-flutter') // every frame: its own stream
  const out = []
  let layer = null
  let next = Infinity
  let hourNow = () => 9
  let flowers = () => []
  let ids = 0

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const between = ([a, b], r) => a + r * (b - a)

  /** A butterfly drawn at 0,0: two pairs of wings that beat (game.css), a thin body. */
  function draw(id) {
    const [wing, edge] = COLOURS[Math.floor(comings() * COLOURS.length)]
    const g = el('g', { class: 'critter butterfly', 'data-critter': String(id) }, layer)
    const body = el('g', { class: 'flap' }, g)
    for (const side of [-1, 1]) {
      const w = el('g', { class: `wing ${side < 0 ? 'left' : 'right'}` }, body)
      el('path', { d: `M0 -2 C${side * 10} -22 ${side * 30} -20 ${side * 26} -4 C${side * 24} 4 ${side * 8} 2 0 0 Z`, fill: wing, stroke: '#15140f', 'stroke-width': 1.6 }, w)
      el('path', { d: `M0 1 C${side * 8} 4 ${side * 20} 8 ${side * 16} 18 C${side * 10} 20 ${side * 2} 10 0 2 Z`, fill: wing, stroke: '#15140f', 'stroke-width': 1.6 }, w)
      el('circle', { cx: side * 17, cy: -10, r: 3.2, fill: edge }, w)
    }
    el('ellipse', { cx: 0, cy: 2, rx: 2.4, ry: 10, fill: '#15140f' }, g)
    el('path', { d: 'M-1 -8 q-4 -8 -8 -10 M1 -8 q4 -8 8 -10', stroke: '#15140f', 'stroke-width': 1.2, fill: 'none' }, g)
    el('circle', { cx: 0, cy: 0, r: 30, fill: 'transparent' }, g) // a bigger target than the wings: small fingers
    return g
  }

  /** A place to wander to: over the meadow in view, or a flower to settle on. */
  function somewhere(b) {
    const left = View.x - 100
    const near = flowers().filter((f) => f.x > left && f.x < left + Layout.VIEW_W + 200)
    if (near.length && comings() < 0.45) {
      const f = near[Math.floor(comings() * near.length)]
      return { x: f.x, y: f.y, settle: true }
    }
    return { x: Math.max(40, Math.min(Layout.WORLD_W - 40, b.x + (comings() - 0.5) * 900)), y: between([SKY, LOW], comings()), settle: false }
  }

  /** One comes in at a side of the view. */
  function come() {
    const id = ++ids
    const fromLeft = comings() < 0.5
    const b = {
      id, g: draw(id),
      x: View.x + (fromLeft ? -60 : Layout.VIEW_W + 60), y: between([SKY, LOW - 80], comings()),
      leaves: Clock.now() + between(STAY_MS, comings()), resting: 0, fleeing: false, to: null, t: 0,
    }
    b.to = somewhere(b)
    out.push(b)
    Debug.trace('butterfly', { id, comes: Math.round(b.x) })
  }

  /** Off, out of the view. */
  function leave(b, fleeing = false) {
    b.fleeing = fleeing
    b.resting = 0
    b.to = { x: b.x + (b.x - View.x < Layout.VIEW_W / 2 ? -1 : 1) * 1400, y: -200, settle: false, gone: true }
  }

  function step(b, dt) {
    b.t += dt
    if (b.resting) {
      if (Clock.now() < b.resting) return
      b.resting = 0
      b.to = somewhere(b)
    }
    if (!b.to.gone && Clock.now() > b.leaves) leave(b)
    const speed = SPEED * (b.fleeing ? FLEE : 1)
    const dx = b.to.x - b.x
    const dy = b.to.y - b.y
    const d = Math.hypot(dx, dy)
    const go = Math.min(d, (speed * dt) / 1000)
    b.x += (dx / (d || 1)) * go
    b.y += (dy / (d || 1)) * go + Math.sin(b.t / 90) * 1.4 + (flutter() - 0.5) * 1.2 // the flutter: up and down as it goes
    b.g.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px) scale(${dx < 0 ? -SIZE : SIZE}, ${SIZE})`
    if (d < 6) {
      if (b.to.gone) return true
      if (b.to.settle) {
        b.resting = Clock.now() + between(REST_MS, comings())
        b.g.classList.add('resting')
      } else b.to = somewhere(b)
    } else b.g.classList.remove('resting')
    return b.to.gone && (b.y < -100 || b.x < View.x - 400 || b.x > View.x + Layout.VIEW_W + 400)
  }

  /**
   * Start: `into` the layer they fly in; hour() the meadow's hour; spots()
   * the flowers they may settle on ([{x, y}]); now: one comes at once.
   */
  function setup(into, hour, spots, { now = false, still = false } = {}) {
    layer = into
    hourNow = hour
    flowers = spots
    const first = between(FIRST_MS, comings()) // drawn either way: a forced one doesn't shift the rest
    next = still && !now ? Infinity : Clock.now() + (now ? 0 : first)
    let last = Clock.now()
    const frame = () => {
      const t = Clock.now()
      const dt = Math.min(100, t - last)
      last = t
      const h = hourNow()
      if (t >= next) {
        if (out.length < MAX && ((now && !ids) || (h > DAY.from && h < DAY.to))) come() // asked for at once: whatever the hour
        next = still ? Infinity : t + between(EVERY_MS, comings())
      }
      if (h >= DAY.to) for (const b of out) if (!b.to.gone) leave(b) // sunset: they go
      for (const b of [...out]) {
        if (step(b, dt)) {
          b.g.remove()
          out.splice(out.indexOf(b), 1)
        }
      }
      Clock.after(0, frame)
    }
    Clock.after(0, frame)
  }

  /** A tap on butterfly `id`: it flutters up and away. Its place, for the mole to look at; null if gone. */
  function tap(id) {
    const b = out.find((c) => c.id === id)
    if (!b) return null
    Debug.trace('butterfly', { id, tapped: true })
    if (!b.fleeing) leave(b, true)
    return { x: b.x, y: b.y }
  }

  return { setup, tap, get out() { return out.map((b) => ({ id: b.id, x: Math.round(b.x), y: Math.round(b.y), leaving: !!b.to.gone })) } }
})()
