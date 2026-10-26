// The meadow's weather, for now its wind (invented: Adam picked it,
// 2026-10-26). A light breeze comes and goes all day, now and then a gust
// (wind.js); it drops at sunset. You see it in what is drawn to move: the
// tulips, the wild flowers, the reeds at the pool and the tufts along the
// front lean further in a gust (game.css .sway, by --sway), and his three
// hairs flutter (--flutter). You hear it, quietly. A strong gust now and then
// carries a few leaves or dandelion seeds across the meadow, in from out of
// sight upwind and off out of sight downwind, and he turns to watch them go
// if he is free. Creatures read its level in the world state (world.js):
// the butterflies are blown about (creature.js, `blown`).
//
// The wind and whether a gust carries anything draw from their own streams;
// how each leaf tumbles from another. Time is the Clock's: its level moves
// a tick at a time. `?wind=gust` (layout.js) brings a strong gust that
// carries something three seconds after he wakes, for trying it.

/* global Clock, Debug, Motion, Sound, Wind, World */
/* exported Weather */
const Weather = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const TICK_MS = 100
  const SWAY_DEG = [1, 7] // the plants' lean, still and in a full gust
  const FLUTTER_DEG = [1, 16] // his hairs' flutter, still and in a full gust
  const SHOWN_STEP = 0.1 // the lean is set on the page only when it changes by this much (degrees): fewer style changes a frame
  const CARRY_FROM = 0.75 // a gust this strong may carry something...
  const CARRY_CHANCE = 0.5 // ...this often
  const CARRY_COUNT = [3, 6] // how many leaves or seeds
  const CARRY_MS = [3000, 4500] // across the view in this long
  const CARRY_Y = [440, 650] // how high they go: low, against the trees and the grass, where they show (white seeds were lost in the sky)
  const CARRY_SIZE = 2 // drawn this much bigger than their shapes: a toddler sees them go by
  const CALM_FROM = 18.6 // the wind drops as the sun goes down
  const FORCED_AFTER_MS = 3000 // ?wind=gust: this long after he wakes
  const LEAVES = ['#6a9a3a', '#8bb24a', '#b88a2e'] // green, and the odd brown one
  const random = Debug.random('meadow-wind')
  const carries = Debug.random('meadow-carried') // whether a gust carries, and what
  const tumble = Debug.random('meadow-tumble') // how each one goes
  const air = Wind.make(random)
  let layer = null
  let sound = null
  const shown = { sway: -1, flutter: -1 }
  let strong = false // in a strong gust now (it carries at most once)
  let forced = false // ?wind=gust: this gust carries for certain
  let watch = () => {}

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const between = ([a, b], r) => a + r * (b - a)

  /** A leaf or a dandelion seed, drawn at 0,0. */
  function piece(kind, g) {
    if (kind === 'seeds') {
      el('path', { d: 'M0 0 V14', stroke: '#8a8070', 'stroke-width': 1.5 }, g)
      for (let k = 0; k < 7; k++) {
        const a = Math.PI + (k / 6) * Math.PI
        const d = `M0 0 L${(Math.cos(a) * 10).toFixed(1)} ${(Math.sin(a) * 10).toFixed(1)}`
        el('path', { d, stroke: '#8a8070', 'stroke-width': 3 }, g) // an outline, so it shows on the light
        el('path', { d, stroke: '#fbf8ef', 'stroke-width': 1.6 }, g)
      }
      return
    }
    el('path', { d: 'M-10 0 Q0 -9 10 0 Q0 9 -10 0 Z M-10 0 H12', fill: LEAVES[Math.floor(tumble() * LEAVES.length)], stroke: '#2f4a17', 'stroke-width': 1.4 }, g)
  }

  /** A few leaves or seeds, carried across the view on the gust: in upwind, off downwind. */
  function carry(kind) {
    const n = Math.round(between(CARRY_COUNT, carries()))
    const { x0, x1 } = World.state.view
    Debug.trace('gust', { carries: kind, n })
    for (let i = 0; i < n; i++) {
      const g = el('g', { class: `carried ${kind}` }, layer)
      piece(kind, el('g', { transform: `scale(${CARRY_SIZE})` }, g))
      const y = between(CARRY_Y, tumble())
      const ms = between(CARRY_MS, tumble())
      const from = x0 - 60 - i * 70
      const to = x1 + 120
      const turns = (kind === 'seeds' ? 0.4 : 2) * (tumble() < 0.5 ? -1 : 1)
      const frames = [0, 0.25, 0.5, 0.75, 1].map((k) => ({
        transform: `translate(${(from + (to - from) * k).toFixed(0)}px, ${(y + Math.sin(k * Math.PI * 3 + i) * 40 - k * 60).toFixed(0)}px) rotate(${(turns * 360 * k).toFixed(0)}deg)`,
      }))
      Motion.endAt(g, frames, { duration: ms, delay: i * 180, easing: 'linear' }).then(() => g.remove(), () => g.remove())
    }
    Clock.after(1200, watch) // he turns to watch them go by
  }

  /** Set how far the plants lean and his hairs flutter, if it changed enough to see. */
  function show(level) {
    const sway = between(SWAY_DEG, level)
    const flutter = between(FLUTTER_DEG, level)
    const root = document.documentElement.style
    for (const [name, deg] of [['sway', sway], ['flutter', flutter]]) {
      if (Math.abs(deg - shown[name]) < SHOWN_STEP) continue
      root.setProperty(`--${name}`, `${deg.toFixed(2)}deg`)
      shown[name] = deg
    }
  }

  function tick() {
    if (World.state.hour >= CALM_FROM && !air.calm) Wind.calm(air)
    const level = Wind.step(air, TICK_MS / 1000)
    World.set({ wind: level })
    show(level)
    if (!sound && Sound.running) sound = Sound.wind()
    if (sound) sound(level)
    if (!air.gust) strong = false
    else if (!strong && level >= CARRY_FROM) {
      strong = true
      const r = carries() // both drawn either way, forced or not: the stream stays put
      const kind = carries() < 0.5 ? 'leaves' : 'seeds'
      if (forced || r < CARRY_CHANCE) carry(kind)
      forced = false
    }
  }

  /** Start the wind: `into` the layer what a gust carries goes in; onWatch(): the meadow has him look after it, if he is free. */
  function setup(into, { onWatch = () => {} } = {}) {
    layer = into
    watch = onWatch
    Clock.every(TICK_MS, tick)
  }

  /** ?wind=gust: a strong gust that carries something, a moment from now (the meadow asks as he wakes). */
  function gustSoon() {
    Clock.after(FORCED_AFTER_MS, () => {
      Wind.gust(air)
      forced = true
      air.level = Math.max(air.level, CARRY_FROM) // full at once: it carries now
    })
  }

  return { setup, gustSoon, get wind() { return air.level } }
})()
