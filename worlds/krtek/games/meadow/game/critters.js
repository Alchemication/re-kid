// The meadow's small life between the encounters: butterflies, the snail
// after the rain, and fireflies in the dim. Now and then
// through the day one or two flutter in, wander over the meadow, settle on a
// flower for its nectar a moment, and flutter off; never after sunset. A tap
// on one sends it fluttering up and away, and the meadow has the mole look
// up after it (the children in the yard wanted more going on; a toddler
// loves a thing to tap that answers).
//
// What each does comes from the world model (creature.js on world.js): it
// goes for the flowers on offer (the tulips while open, the wild patch
// while it stands), keeps out of the rain cloud's rain, and is scared off by
// the car going by and a splash near it. This file draws them and says when
// one comes.
//
// The snail (invented) comes up out of the grass where a shelter is wet (the
// wild flowers' leaves, once the rain cloud has rained on them), crawls about
// there while the grass stays wet, and goes back down into it as it dries. A
// tap, the car or a splash, and it pulls into its shell a moment; a tap on it
// has the mole look and say "ooh" too.
//
// Curious, a butterfly now and then flutters over to him while he stands
// free, to look at him (meadow.js offers him as a 'sight'), and he follows it
// with his eyes. It never lands on him: nothing in the films says it may.
//
// The fireflies (invented, Adam's call that the games stay calm, 2026-10-31)
// rise out of the grass once the light is low, at dusk as he lies listening to
// the cricket, or in an eclipse's dim: a few, drifting slowly low over the
// meadow, each glowing and fading in its own time. As the light comes back,
// or at bedtime, each sinks back into the grass where it came from. A tap,
// and it glows bright and drifts off a little way; a splash or the car, the
// same.
//
// Their comings and goings draw from their own stream, and how they flutter
// each frame from another, so neither shifts the rest of the play. Time is
// the Clock's. A still play (?still) has none, unless ?critters=now asks for
// one at once (layout.js), for trying them and for the tests; ?critters=fireflies
// the fireflies, whatever the light. The world
// model's runner (ambient.js) steps them each frame.

/* global Ambient, Clock, Creature, Debug, World */
/* exported Critters */
const Critters = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const FIRST_MS = [12000, 25000] // the first comes this long after he wakes...
  const EVERY_MS = [25000, 50000] // ...and the next this long after the last came
  const MAX = 2 // at most this many out at once
  const SIZE = 1.6 // drawn this much bigger than its shapes: big enough for a toddler to see and tap
  const BUTTERFLY = {
    speed: 140, // scene units a second, wandering
    flee: 3, // scared, it flies off this much quicker
    turn: 3, // eases into a turn: a lazy flutter, not a dart
    blown: 0.8, // light: a gust carries it off its way
    stayMs: [18000, 30000], // how long one wanders before it goes
    hours: [8.3, 18.6], // the hours they are about
    dark: 0.5, // gone once the light is down to this (at dusk, or under a storm)
    wet: 'avoid',
    feeds: 'nectar',
    hungerMs: [3000, 9000], // from one flower to wanting the next
    feedMs: [1500, 3500], // settled on a flower, this long
    startledBy: ['vroom', 'splash'], // not the bell, nor his words: he says "ooh" at them
    band: [420, 690], // how high it wanders (scene y): over the grass, among the flowers
    roam: 900,
    curious: 0.3, // this share of its wanders take it to him, standing free, to look at him (meadow.js)
  }
  const SNAIL = {
    speed: 12, flee: 1, turn: 2, // a crawl
    stayMs: [90000, 90000], // as long as the grass stays wet: the wet sends it home first
    hours: [8.3, 19], dark: 0.3, wet: 'likes',
    startledBy: ['vroom', 'splash'], freezeMs: [3000, 5000], // into its shell
    band: [700, 706], roam: 220, // along the top of the grass, shell and all showing
  }
  const SNAIL_HAUNT = 260 // it keeps this near its shelter: out from among the stems, where it shows
  const SNAIL_LOOKS_MS = 2000 // how often it checks whether its shelter is wet
  const SNAIL_SIZE = 2.2 // big enough for a toddler to spot in the grass, and to tap
  const FIREFLY = {
    speed: 22, flee: 3, turn: 1.2, blown: 0.25, // a slow drift, easing into its turns; a gust carries it a little
    stayMs: [150000, 150000], // as long as the dim lasts: the light, or bedtime, sends it home first
    hours: [0, 20], // home into the grass at bedtime (day.js END), as the circle closes
    dark: 0, bright: 0.45, // out only in the dim: from about 19:10, as the cricket starts, or an eclipse
    wet: 'avoid',
    startledBy: ['vroom', 'splash'], dart: 90, // a splash: off a little way, and on it drifts
    band: [560, 690], roam: 280, // low over the grass, below his head and up to it
    pauseMs: [800, 2400], // hanging still in the air a moment
  }
  const FIREFLIES = 5 // at most this many out at once: a few lights, not a swarm
  const FIREFLY_EVERY_MS = 1800 // in the dim, another rises this often, up to FIREFLIES
  const FIREFLY_GLOW_MS = [1600, 3200] // one glow and fade, each its own
  const FIREFLY_SIZE = 1.7
  const FIREFLY_ABOUT = 380 // they rise and drift within this of the middle of the view, where he is
  const FLASH_MS = 900 // tapped, it glows bright this long
  const FIREFLY_LIGHTS_MS = 1500 // it lights up over this long, rising out of the grass...
  const FIREFLY_LANDS = 60 // ...and goes out over this last stretch home: never blinking out in view
  const INK = '#15140f'
  const COLOURS = [['#f6d23b', '#e08a20'], ['#fbf8ef', '#9aa4c8'], ['#e98a3a', '#7a3a14'], ['#9fc4f0', '#3d5fc4']] // wings, and their edges and spots
  const comings = Debug.random('meadow-critters')
  const flutter = Debug.random('meadow-flutter') // every frame: its own stream
  const crawl = Debug.random('meadow-snail') // the snail's own, so ?critters=snail shifts nothing else
  const glows = Debug.random('meadow-fireflies') // the fireflies' own: they come only in the dim, so they shift nothing else
  const out = []
  let layer = null
  let low = null // behind the front grass
  let snail = null // { g, c }
  let glowLayer = null // over the night's dusk, so they shine in it
  const fireflies = [] // { id, g, light, c, t, glow, phase, flash }
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

  /** One comes in at a side of the view; asked for at once, early in the morning too. */
  function come(asked = false) {
    const id = ++ids
    const { x0, x1 } = World.state.view
    const x = comings() < 0.5 ? x0 - 60 : x1 + 60
    const traits = asked ? { ...BUTTERFLY, hours: [0, BUTTERFLY.hours[1]] } : BUTTERFLY
    const c = Creature.make(traits, x, between([BUTTERFLY.band[0], BUTTERFLY.band[1] - 80], comings()), Clock.now(), comings)
    const b = { id, g: draw(id), c, t: 0 }
    out.push(b)
    Debug.trace('butterfly', { id, comes: Math.round(x) })
    Ambient.add(c, {
      name: 'butterfly', id, rnd: comings,
      draw: (_, dt) => {
        b.t += dt
        const y = c.y + Math.sin(b.t / 90) * 6 + (flutter() - 0.5) * 3 // the flutter: up and down as it goes
        b.g.style.transform = `translate(${c.x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${c.vx < 0 ? -SIZE : SIZE}, ${SIZE})`
        b.g.classList.toggle('resting', Creature.feeding(c))
      },
      gone: () => {
        b.g.remove()
        out.splice(out.indexOf(b), 1)
      },
    })
  }

  /** The snail drawn at 0,0, facing right: its shell, and the soft parts it pulls in (body, eye stalks). */
  function drawSnail() {
    const g = el('g', { class: 'critter snail', 'data-critter': 'snail' }, low)
    const soft = el('g', { class: 'soft' }, g)
    el('path', { d: 'M-20 0 C-22 -10 -6 -12 6 -12 C14 -12 20 -10 24 -4 L26 0 Z', fill: '#d9c99a', stroke: INK, 'stroke-width': 1.8 }, soft)
    for (const [dx, h] of [[16, 16], [22, 13]]) {
      el('path', { d: `M${dx - 4} -10 L${dx} ${-10 - h}`, stroke: INK, 'stroke-width': 1.8 }, soft)
      el('circle', { cx: dx, cy: -10 - h, r: 2.6, fill: INK }, soft)
    }
    el('circle', { cx: -4, cy: -16, r: 14, fill: '#c9773a', stroke: INK, 'stroke-width': 2 }, g)
    el('path', { d: 'M-4 -16 m0 -9 a9 9 0 1 1 -8 6 a6 6 0 1 1 6 6', fill: 'none', stroke: '#7a3a14', 'stroke-width': 1.8 }, g)
    el('circle', { cx: 0, cy: -14, r: 30, fill: 'transparent' }, g) // a bigger target than the snail: small fingers
    return g
  }

  /** The snail comes up out of the grass at its shelter, wet now; asked for, early in the morning too. */
  function snailComes(home, asked) {
    const traits = { ...SNAIL, hours: [asked ? 0 : SNAIL.hours[0], SNAIL.hours[1]], haunt: [home.x - SNAIL_HAUNT, home.x + SNAIL_HAUNT] }
    const c = Creature.make(traits, home.x, home.y, Clock.now(), crawl, { x: home.x, y: home.y })
    const g = drawSnail()
    snail = { g, c, face: 1 }
    Debug.trace('snail', { comes: Math.round(home.x) })
    Ambient.add(c, {
      name: 'snail', id: 1, rnd: crawl,
      draw: () => {
        if (Math.abs(c.vx) > 2) snail.face = Math.sign(c.vx)
        g.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px) scale(${snail.face * SNAIL_SIZE}, ${SNAIL_SIZE})`
        g.classList.toggle('tucked', c.goal?.kind === 'freeze')
      },
      gone: () => {
        g.remove()
        snail = null
        Debug.trace('snail', { home: true })
      },
    })
  }

  /** Now and then the snail looks whether a shelter of its is wet, and comes out if it is. */
  function snailLooks(asked) {
    Clock.every(SNAIL_LOOKS_MS, () => {
      const [from, to] = SNAIL.hours
      if (snail || (!asked && World.state.hour < from) || World.state.hour >= to || World.state.light < SNAIL.dark) return
      const home = World.offered('shelter').find((o) => asked || World.isWet(o.x))
      if (!home) return
      if (asked) World.wet(home.x - 120, home.x + 120, SNAIL.stayMs[0]) // ?critters=snail: wet there now
      snailComes(home, asked)
      asked = false
    })
  }

  /** A firefly drawn at 0,0: a little dark body, and its light, which glows and fades. */
  function drawFirefly(id) {
    const g = el('g', { class: 'critter firefly', 'data-critter': `firefly ${id}` }, glowLayer)
    const light = el('g', { opacity: 0 }, g)
    el('circle', { r: 18, fill: '#f6f0a0', opacity: 0.3 }, light) // its glow on the dusk air: no blur, which costs every frame
    el('circle', { r: 7, fill: '#fbf6b8', opacity: 0.55 }, light)
    el('circle', { r: 3.4, fill: '#fffde8' }, light)
    el('ellipse', { cx: 0, cy: -5, rx: 2.4, ry: 3.6, fill: '#2b2a1e' }, g)
    el('circle', { r: 24, fill: 'transparent' }, g) // a bigger target than the light: small fingers
    return { g, light }
  }

  /** A firefly rises out of the grass in the view; asked for, in daylight too. */
  function fireflyComes(asked) {
    const id = ++ids
    const { x0, x1 } = World.state.view
    const mid = (x0 + x1) / 2 // the view keeps him in the middle: they rise about him, inside the closing circle
    const home = { x: mid + (glows() - 0.5) * 2 * FIREFLY_ABOUT, y: FIREFLY.band[1] + 20 }
    const traits = { ...FIREFLY, haunt: [mid - FIREFLY_ABOUT * 1.3, mid + FIREFLY_ABOUT * 1.3], ...(asked ? { bright: Infinity } : {}) }
    const c = Creature.make(traits, home.x, home.y, Clock.now(), glows, home)
    const f = { id, ...drawFirefly(id), c, t: 0, glow: between(FIREFLY_GLOW_MS, glows()), phase: glows() * Math.PI * 2, flash: 0 }
    fireflies.push(f)
    Debug.trace('firefly', { id, comes: Math.round(home.x) })
    Ambient.add(c, {
      name: 'firefly', id, rnd: glows,
      draw: (_, dt) => {
        f.t += dt
        f.flash = Math.max(0, f.flash - dt / FLASH_MS)
        const on = (0.5 + 0.5 * Math.sin((f.t / f.glow) * Math.PI * 2 + f.phase)) ** 2 // a soft glow, and a fade
        const homing = c.goal?.kind === 'home' ? Math.min(1, Math.hypot(c.x - c.home.x, c.y - c.home.y) / FIREFLY_LANDS) : 1
        const up = Math.min(1, f.t / FIREFLY_LIGHTS_MS, homing) // lighting up as it rises; going out as it settles in the grass
        f.light.setAttribute('opacity', (up * Math.min(1, 0.15 + 0.85 * on + f.flash)).toFixed(2))
        f.g.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px) scale(${FIREFLY_SIZE})`
      },
      gone: () => {
        f.g.remove()
        fireflies.splice(fireflies.indexOf(f), 1)
      },
    })
  }

  /** In the dim, and before bedtime, another firefly rises now and then, up to a few; asked for, all at once. */
  function fireflyLooks(asked) {
    if (asked) for (let i = 0; i < FIREFLIES; i++) Clock.after(i * 400, () => fireflyComes(true))
    Clock.every(FIREFLY_EVERY_MS, () => {
      const { light, hour } = World.state
      if (asked || fireflies.length >= FIREFLIES || light > FIREFLY.bright || hour >= FIREFLY.hours[1]) return
      fireflyComes(false)
    })
  }

  /**
   * Start: `into` the layer they fly in, `under` the one behind the front
   * grass, `glowing` the one over the night (the fireflies); now: a
   * butterfly comes at once (whatever the hour, for trying them), snail: the
   * snail (its shelter wet from the start), fireflies: the fireflies (in
   * daylight too); still: none come of themselves.
   */
  function setup(into, under, glowing, { now = false, snail: wantSnail = false, fireflies: wantFireflies = false, still = false } = {}) {
    layer = into
    low = under
    glowLayer = glowing
    if (!still || wantSnail) snailLooks(wantSnail)
    if (!still || wantFireflies) fireflyLooks(wantFireflies)
    const first = between(FIRST_MS, comings()) // drawn either way: a forced one doesn't shift the rest
    if (now) Clock.after(0, () => come(true))
    if (still) return
    const next = (ms) => Clock.after(ms, () => {
      const [from, to] = BUTTERFLY.hours
      const h = World.state.hour
      const { x0, x1 } = World.state.view
      if (out.length < MAX && h > from && h < to && World.state.light >= BUTTERFLY.dark && !World.isWet((x0 + x1) / 2)) come() // not in an eclipse's dim, nor in the rain
      next(between(EVERY_MS, comings()))
    })
    next(first)
  }

  /** A tap on butterfly `id`: it flutters up and away. Its place, for the mole to look at; null if gone. */
  function tap(id) {
    const b = out.find((o) => o.id === id)
    if (!b) return null
    Debug.trace('butterfly', { id, tapped: true })
    b.c.tapped = true
    return { x: b.c.x, y: b.c.y }
  }

  /** A tap on firefly `id`: it glows bright and drifts off a little. Its place, for the mole to look at; null if gone. */
  function tapFirefly(id) {
    const f = fireflies.find((o) => o.id === id)
    if (!f) return null
    Debug.trace('firefly', { id, tapped: true })
    f.c.tapped = true
    f.flash = 1
    return { x: f.c.x, y: f.c.y }
  }

  /** A tap on the snail: into its shell it goes. Its place, for the mole to look at; null if it isn't out. */
  function tapSnail() {
    if (!snail) return null
    Debug.trace('snail', { tapped: true })
    snail.c.tapped = true
    return { x: snail.c.x, y: snail.c.y }
  }

  const leaving = (b) => b.c.goal?.kind === 'home' || b.c.goal?.kind === 'flee'
  return { setup, tap, tapSnail, tapFirefly, get fireflies() { return fireflies.map((f) => ({ id: f.id, x: Math.round(f.c.x), y: Math.round(f.c.y), home: f.c.goal?.kind === 'home' })) }, get snail() { return snail ? { x: Math.round(snail.c.x), tucked: snail.c.goal?.kind === 'freeze' } : null }, get out() { return out.map((b) => ({ id: b.id, x: Math.round(b.c.x), y: Math.round(b.c.y), leaving: leaving(b) })) } }
})()
