// The storm's weather (the umbrella encounter, umbrella.js, brings it; after
// the rain at the end of Krtek a paraplíčko, made a storm: Adam's pick,
// 2026-10-26). Big grey clouds roll in from upwind over the sky and a grey
// haze dims it; the wind gets up (weather.js reads `cover`); the light falls
// a little, never as far as dusk; then rain over the whole meadow, the
// thunder far off behind the hill and soft (a bolt of lightning behind the
// hill, a faint flash, a low rumble a moment later: never a crack overhead),
// and then the clouds roll on and
// it clears. It rains at most its strength's rainMs, whatever the encounter does.
//
// The same weather, lighter, is autumn's rain now and then (showers.js): a
// drizzle, a shower or a downpour (STRENGTHS), paler clouds, fewer drops,
// less dim, no thunder, and it clears by itself after its while.
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
  const CLEAR_MS = 9000 // ...and roll on over this long
  // How hard it rains. Each: the clouds roll in over gatherMs, it rains for rainMs (at most: the storm's
  // umbrella clears it sooner), so many drops at once, drawn so thick (width) and long (len); the light falls by
  // dim and the sky greys by haze under it; the clouds drawn so dark (clouds: their opacity, pale for a drizzle);
  // the wind gets up by wind (weather.js); the patter this loud (patter, of the storm's); thunder or not.
  const STRENGTHS = {
    drizzle: { gatherMs: 9000, rainMs: [30000, 45000], drops: 110, width: 1.6, len: 0.65, dim: 0.1, haze: 0.14, clouds: 0.45, wind: 0.05, patter: 0.35, thunder: false }, // fine and soft: you see it more than hear it
    shower: { gatherMs: 10000, rainMs: [30000, 50000], drops: 160, width: 1.8, len: 0.85, dim: 0.22, haze: 0.28, clouds: 0.75, wind: 0.2, patter: 0.7, thunder: false },
    downpour: { gatherMs: 11000, rainMs: [30000, 45000], drops: 230, width: 2, len: 1, dim: 0.32, haze: 0.38, clouds: 0.9, wind: 0.35, patter: 0.9, thunder: false }, // hard, but not a storm: no thunder (that is the umbrella's)
    storm: { gatherMs: 12000, rainMs: [80000, 80000], drops: 260, width: 2, len: 1, dim: 0.45, haze: 0.45, clouds: 1, wind: 0.45, patter: 1, thunder: true }, // the umbrella's (umbrella.js): the light to 0.55, short of dusk
  }
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
  const DROP_SPEED = [900, 1300] // scene units a second
  const GROUND = [700, 880] // where a drop lands, near the back to the front
  const CLOUDS = [[150, 120, 260], [560, 80, 320], [1000, 130, 280], [1420, 90, 300], [1800, 120, 260]] // where each cloud sits once in: x, y, half its width
  const where = Debug.random('meadow-rain') // where each drop falls
  const thunderTimes = Debug.random('meadow-thunder')
  const howLong = Debug.random('meadow-rain-length') // how long a shower rains: its own, so the drops and thunder don't shift
  const between = ([a, b], r) => a + r * (b - a)

  const state = { phase: null, kind: null, cover: 0, since: 0, rainMs: 0, nextThunder: 0, nextPatter: 0 } // phase: 'gathering', 'raining', 'clearing' or null; kind: a STRENGTHS name
  const strength = () => STRENGTHS[state.kind || 'storm']
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
    return { x: between([-200, 1800], where()), y: top ? between([-300, -100], where()) : between([-300, 880], where()), v: between(DROP_SPEED, where()), len: between([18, 30], where()) * strength().len, lands: between(GROUND, where()) }
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
    ctx.lineWidth = strength().width
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
    drops = Array.from({ length: strength().drops }, () => newDrop())
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
    clouds.style.opacity = strength().clouds
    const off = state.phase === 'clearing' ? (1 - k) * 2000 : -(1 - k) * 2000
    clouds.style.transform = `translateX(${off.toFixed(0)}px)`
    haze.setAttribute('opacity', (strength().haze * k).toFixed(3))
  }

  function tick() {
    if (!state.phase) return
    const t = Clock.now()
    if (state.phase === 'gathering') {
      state.cover = Math.min(1, state.cover + TICK_MS / strength().gatherMs)
      if (state.cover >= 1) begin()
    } else if (state.phase === 'raining') {
      World.wet(-500, 4500, TICK_MS * 3) // the whole meadow, while it rains
      if (strength().thunder && t >= state.nextThunder) {
        thunder()
        state.nextThunder = t + between(THUNDER_MS, thunderTimes())
      }
      if (t >= state.nextPatter) {
        Sound.water(RAIN_SOUND_S + 0.4, { soft: strength().patter })
        state.nextPatter = t + RAIN_SOUND_S * 1000
      }
      if (t - state.since >= state.rainMs) clear()
    } else {
      state.cover = Math.max(0, state.cover - TICK_MS / CLEAR_MS)
      if (state.cover <= 0) {
        state.phase = null
        Debug.trace('storm', { over: true, how: state.kind })
      }
    }
    drawSky()
  }

  /** The rain begins. */
  function begin() {
    state.phase = 'raining'
    state.since = Clock.now()
    state.rainMs = between(strength().rainMs, howLong())
    state.nextThunder = Clock.now() + 1500
    state.nextPatter = 0
    World.wet(-500, 4500, TICK_MS * 3) // wet with the first drop
    Debug.trace('storm', { rain: true, how: state.kind })
    startRain()
  }

  /** The clouds roll in: the storm comes (umbrella.js), or, `kind` lighter, autumn's rain (showers.js). */
  function gather(kind = 'storm') {
    if (state.phase) return
    state.phase = 'gathering'
    state.kind = kind
    drawn.cover = -1 // its own clouds' darkness
    Debug.trace('storm', { gathers: true, how: kind })
    if (strength().thunder) firstRumble = Clock.after(strength().gatherMs / 3, () => Sound.rumble(RUMBLE_S)) // the first, far off, as they come
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
    STRENGTHS,
    /** 'gathering', 'raining', 'clearing' or null. */
    get phase() { return state.phase },
    /** How hard it rains now, or last rained: a STRENGTHS name. */
    get kind() { return state.kind },
    /** How much it gets the wind up now (weather.js): 0 clear to its strength's wind under full cover. */
    get windUp() { return state.phase ? strength().wind * state.cover : 0 },
    /** How far the storm is in: 0 none to 1 the full storm (the wind and the light read it). */
    get cover() { return state.cover },
    /** The light, at most, under the storm now. */
    get light() { return 1 - strength().dim * state.cover },
  }
})()
