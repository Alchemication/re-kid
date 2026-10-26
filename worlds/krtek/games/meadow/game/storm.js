// The storm's weather (the umbrella encounter, umbrella.js, brings it; after
// the rain at the end of Krtek a paraplíčko, made a storm: Adam's pick,
// 2026-10-26). Big grey clouds roll in from upwind over the sky and a grey
// haze dims it; the wind gets up (weather.js reads `cover`); the light falls
// a little, never as far as dusk; then rain over the whole meadow, the
// thunder far off behind the hill and soft (a bolt of lightning behind the
// hill, a faint flash, a low rumble a moment later: never a crack overhead),
// and then the clouds roll on and
// it clears. It rains at most RAIN_MAX_MS, whatever the encounter does.
//
// The world hears it (world.js): the whole meadow is wet while it rains and
// for a while after (so the butterflies and birds go home, and the snail comes
// out after), and the light falls (meadow.js drawSky takes `light`). Under
// a shelter (the umbrella: shelter()) no rain falls.
//
// The rain is drawn on a canvas over the picture, a frame at a time while it
// rains only (as the yard's): many drops are cheap there and dear as shapes.
// Where each drop falls draws from its own stream; the thunder's timing from
// another. Time is the Clock's.

/* global Clock, Debug, Motion, Sound, View, World */
/* exported Storm */
const Storm = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const TICK_MS = 100
  const GATHER_MS = 12000 // the clouds roll in over this long
  const CLEAR_MS = 9000 // ...and roll on over this long
  const RAIN_MAX_MS = 80000 // it rains at most this long
  const DIM = 0.45 // the light falls by this much under the full storm: to 0.55, short of dusk
  const HAZE = 0.45 // how grey the sky goes
  const THUNDER_MS = [8000, 14000] // between one far thunder and the next, while it rains
  const FLASH = 0.16 // how bright a far flash is, over the picture: faint
  const RUMBLE_AFTER_MS = 1200 // the rumble comes this long after its flash: it is far off
  const BOLT_X = [250, 1350] // where across the sky a bolt comes down, behind the hill (Adam: thunder needs its lightning)
  const BOLT_FROM = 170 // from the clouds' underside...
  const BOLT_TO = 470 // ...down behind the hill, never to the meadow
  const BOLT_MS = 380 // a flicker: on, off, on, gone
  const RUMBLE_S = 1.4
  const RAIN_SOUND_S = 3 // the rain's patter, played this long at a time, again and again
  const WET_AFTER_MS = 45000 // the grass stays wet this long after: the snail's outing
  const DROPS = 260 // drops falling at once, across the view
  const DROP_SPEED = [900, 1300] // scene units a second
  const GROUND = [700, 880] // where a drop lands, near the back to the front
  const CLOUDS = [[150, 120, 260], [560, 80, 320], [1000, 130, 280], [1420, 90, 300], [1800, 120, 260]] // where each cloud sits once in: x, y, half its width
  const where = Debug.random('meadow-rain') // where each drop falls
  const thunderTimes = Debug.random('meadow-thunder')
  const between = ([a, b], r) => a + r * (b - a)

  const state = { phase: null, cover: 0, since: 0, nextThunder: 0, nextPatter: 0 } // phase: 'gathering', 'raining', 'clearing' or null
  let clouds = null
  let bolts = null // behind the far hills: a bolt never comes down onto the meadow
  let haze = null
  let flash = null
  let canvas = null
  let drops = []
  let shelters = [] // [{ x, top, half }], in the meadow's units: no rain falls there below `top`
  let svg = null
  let raining = false // the canvas is drawn each frame while this is on
  let lastFrame = 0
  let ctx = null // the canvas's, kept
  let scale = null // the meadow's units to the canvas's pixels, as the picture is scaled: read on resize, not every frame
  let firstRumble = null
  const drawn = { cover: -1, phase: undefined } // what the sky was last drawn at

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /** The storm clouds, drawn once in the sky and kept out of sight until a storm. */
  function drawClouds() {
    for (const [x, y, w] of CLOUDS) {
      const g = el('g', { class: 'storm-cloud' }, clouds)
      for (let k = 0; k < 7; k++) {
        const cx = x - w + (k * 2 * w) / 6
        el('ellipse', { cx, cy: y + Math.abs(k - 3) * 10, rx: w / 3, ry: 46 + (k % 3) * 14, fill: k % 2 ? '#6d7381' : '#7b8190' }, g)
      }
      el('ellipse', { cx: x, cy: y + 40, rx: w, ry: 34, fill: '#5d6370' }, g) // its dark underside
    }
  }

  // ------------------------------------------------------------ the rain

  function sizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(canvas.clientWidth * dpr)
    canvas.height = Math.round(canvas.clientHeight * dpr)
    const m = svg.getScreenCTM()
    scale = [m.a * dpr, 0, 0, m.d * dpr, m.e * dpr, m.f * dpr]
  }

  function newDrop(top = false) {
    return { x: between([-200, 1800], where()), y: top ? between([-300, -100], where()) : between([-300, 880], where()), v: between(DROP_SPEED, where()), len: between([18, 30], where()), lands: between(GROUND, where()) }
  }

  /** Is (x, y), on the screen in the meadow's units, under a shelter? */
  const sheltered = (x, y) => shelters.some((s) => y > s.top && Math.abs(x - (s.x - View.x)) < s.half)

  /** One frame of rain on the canvas: the drops fall, a little slanted downwind, and none under a shelter. */
  function drawRain(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!raining) return
    ctx.setTransform(...scale) // the meadow's units, as the picture is scaled
    ctx.strokeStyle = 'rgba(214, 230, 245, 0.7)'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (const d of drops) {
      d.y += d.v * dt
      d.x += d.v * dt * 0.12 * (0.5 + World.state.wind) // slanted downwind
      if (d.y > d.lands || d.x > 1900) {
        Object.assign(d, newDrop(true))
        continue
      }
      if (sheltered(d.x, d.y)) continue
      ctx.moveTo(d.x, d.y)
      ctx.lineTo(d.x - d.len * 0.12, d.y - d.len)
    }
    ctx.stroke()
  }

  function frame() {
    const t = Clock.now()
    drawRain(Math.min(0.1, (t - lastFrame) / 1000))
    lastFrame = t
    if (raining) Clock.after(0, frame)
    else {
      drawRain(0) // cleared
      canvas.style.display = 'none'
    }
  }

  function startRain() {
    raining = true
    drops = Array.from({ length: DROPS }, () => newDrop())
    canvas.style.display = 'block'
    sizeCanvas()
    lastFrame = Clock.now()
    Clock.after(0, frame)
  }

  // ------------------------------------------------------------ the thunder

  /** A jagged bolt from the clouds down behind the hill at x, flickering, and gone. */
  function bolt(x) {
    let d = `M${x} ${BOLT_FROM}`
    let at = x
    for (let y = BOLT_FROM + 50; y < BOLT_TO; y += 50) {
      at += (thunderTimes() - 0.5) * 70
      d += ` L${at.toFixed(0)} ${y}`
    }
    d += ` L${(at + (thunderTimes() - 0.5) * 40).toFixed(0)} ${BOLT_TO}`
    const g = el('g', { class: 'bolt', 'pointer-events': 'none' }, bolts)
    el('path', { d, stroke: '#fff7c8', 'stroke-width': 9, fill: 'none', opacity: 0.35, 'stroke-linejoin': 'round' }, g) // its glow
    el('path', { d, stroke: '#fffdf0', 'stroke-width': 3.5, fill: 'none', 'stroke-linejoin': 'round' }, g)
    Debug.ignoreCut(Motion.endAt(g, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.2, offset: 0.35 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: BOLT_MS }), 'a bolt')
      .then(() => g.remove())
  }

  /** Far off: a bolt behind the hill, a faint flash over the picture, and a moment later a low, soft rumble. */
  function thunder() {
    const x = between(BOLT_X, thunderTimes())
    Debug.trace('thunder', { x: Math.round(x) })
    bolt(x)
    Debug.ignoreCut(Motion.endAt(flash, [{ opacity: 0 }, { opacity: FLASH, offset: 0.2 }, { opacity: 0 }], { duration: 260 }), 'a far flash')
    Clock.after(RUMBLE_AFTER_MS, () => Sound.rumble(RUMBLE_S))
    World.noise('thunder', View.x + 800, Infinity)
  }

  // ------------------------------------------------------------ the storm, a tick at a time

  /** Draw the sky at this much cover: the clouds rolled in that far (from the left coming, to the right going), the haze. */
  function drawSky() {
    const k = state.cover
    if (k === drawn.cover && state.phase === drawn.phase) return // nothing new: no repaint of the whole sky
    drawn.cover = k
    drawn.phase = state.phase
    clouds.style.visibility = k > 0 ? 'visible' : 'hidden'
    const off = state.phase === 'clearing' ? (1 - k) * 2000 : -(1 - k) * 2000
    clouds.style.transform = `translateX(${off.toFixed(0)}px)`
    haze.setAttribute('opacity', (HAZE * k).toFixed(3))
  }

  function tick() {
    if (!state.phase) return
    const t = Clock.now()
    if (state.phase === 'gathering') {
      state.cover = Math.min(1, state.cover + TICK_MS / GATHER_MS)
      if (state.cover >= 1) begin()
    } else if (state.phase === 'raining') {
      World.wet(-500, 4500, TICK_MS * 3) // the whole meadow, while it rains
      if (t >= state.nextThunder) {
        thunder()
        state.nextThunder = t + between(THUNDER_MS, thunderTimes())
      }
      if (t >= state.nextPatter) {
        Sound.water(RAIN_SOUND_S + 0.4, { soft: true })
        state.nextPatter = t + RAIN_SOUND_S * 1000
      }
      if (t - state.since >= RAIN_MAX_MS) clear()
    } else {
      state.cover = Math.max(0, state.cover - TICK_MS / CLEAR_MS)
      if (state.cover <= 0) {
        state.phase = null
        Debug.trace('storm', { over: true })
      }
    }
    drawSky()
  }

  /** The rain begins. */
  function begin() {
    state.phase = 'raining'
    state.since = Clock.now()
    state.nextThunder = Clock.now() + 1500
    state.nextPatter = 0
    World.wet(-500, 4500, TICK_MS * 3) // wet with the first drop
    Debug.trace('storm', { rain: true })
    startRain()
  }

  /** The clouds roll in: the storm comes (umbrella.js). */
  function gather() {
    if (state.phase) return
    state.phase = 'gathering'
    Debug.trace('storm', { gathers: true })
    firstRumble = Clock.after(GATHER_MS / 3, () => Sound.rumble(RUMBLE_S)) // the first, far off, as they come
  }

  /** The rain stops and the clouds roll on; the grass stays wet a while. */
  function clear() {
    if (state.phase !== 'raining' && state.phase !== 'gathering') return
    state.phase = 'clearing'
    raining = false
    World.wet(-500, 4500, WET_AFTER_MS)
    Debug.trace('storm', { clears: true })
  }

  /** Bedtime: gone at once, under the closing circle. */
  function night() {
    if (firstRumble) Clock.cancel(firstRumble)
    raining = false
    state.phase = null
    state.cover = 0
    if (clouds) drawSky()
  }

  /** Draw it into the page: `sky` the sky's group, `picture` the svg, `rain` the canvas over it, `over` where the flash goes. */
  function setup({ sky, picture, rain, over }) {
    svg = picture
    canvas = rain
    ctx = canvas.getContext('2d')
    haze = el('rect', { x: -200, y: -200, width: 2000, height: 1100, fill: '#5b6270', opacity: 0, class: 'storm-haze' }, sky)
    bolts = el('g', { class: 'storm-bolts' }, sky)
    clouds = el('g', { class: 'storm-clouds' }, sky)
    drawClouds()
    flash = el('rect', { x: -200, y: -200, width: 2000, height: 1300, fill: '#fff', opacity: 0, 'pointer-events': 'none' }, over)
    new ResizeObserver(() => raining && sizeCanvas()).observe(canvas)
    drawSky()
    Clock.every(TICK_MS, tick)
  }

  return {
    setup, gather, clear, night,
    /** A place no rain falls (the umbrella): x and half its width in the meadow's units, top its canopy; null removes it. */
    shelter(s) { shelters = s ? [s] : [] },
    /** 'gathering', 'raining', 'clearing' or null. */
    get phase() { return state.phase },
    /** How far the storm is in: 0 none to 1 the full storm (the wind and the light read it). */
    get cover() { return state.cover },
    /** The light, at most, under the storm now. */
    get light() { return 1 - DIM * state.cover },
  }
})()
