// Weather: in some plays (layout.js), a shower comes once, part-way through.
//
// Clouds roll in and the yard dims; rain falls and splashes; puddles slowly
// form, ringing where drops land. Then the clouds drift off, a rainbow shows
// for a while, the puddles dry up, and the flowers grow a little taller and
// open wider. No thunder: this is a gentle shower for a three-year-old.
//
// Other parts listen: creatures (the snail and worms come out after rain),
// Reksio (looks up, catches drops, jumps in puddles), the music (softer).
//
// The kind of day (layout.js) sets the sky between showers: a clear day has
// no clouds, a fair one a few drifting slowly across all day, a cloudy one
// more of them, a softer sun and a grey haze. The shower's clouds wait out of
// sight until it calls them, and at evening the drifting ones move off.
//
// Wind blows in every play, quietly: mostly a light breeze that comes and
// goes, now and then a gust, stronger when the clouds come. You hear it and
// see it, since the grass and flowers lean further in a gust.

/* global Debug, Layout, Motion, Painting, Shower, Sound, Music, Wind, World */
/* exported Weather */
const Weather = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const GROUND_Y = 812
  const START_S = [25, 55] // the shower starts this long into the play
  const WET_MS = 300 // the world is told where it's wet this far ahead, again every frame while it is
  const RAIN_S = [22, 30] // and lasts this long
  const DROPS = 220 // raindrops on screen at full rain
  const PUDDLE_DROP = 6 // puddles sit this far below Reksio's feet line: paws in the water
  const STORMY = 0.25 // extra wind while the clouds are in
  const SWAY_DEG = [1, 6] // plants' sway at still and at a full gust
  const DRIFT = 6 // a fair day's clouds drift across this fast (sky units a second), each a little faster or slower

  const $ = (id) => document.getElementById(id)
  const random = Debug.random('weather') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)
  const sparkle = Debug.random('weather-fx') // drops, splashes and rings: drawn per frame, so kept out of the stream above
  const fxRnd = (lo, hi) => lo + sparkle() * (hi - lo)
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
    parent.appendChild(n)
    return n
  }

  // the shower's timeline (shower.js); the start is drawn even when ?rain-at sets it
  const startAt = rnd(...START_S)
  const shower = Shower.start({ rain: Layout.rain, startAt: Layout.rainAt ?? startAt, rainFor: rnd(...RAIN_S) })
  let t = 0
  const listeners = []
  let rainSound = null

  // ------------------------------------------------------------ clouds

  const cloudLayer = $('clouds')
  const clouds = []
  function makeClouds() {
    for (let i = 0; i < 5; i++) {
      const g = el('g', { class: 'cloud' }, cloudLayer)
      const w = rnd(220, 340)
      const bumps = 4 + Math.floor(random() * 3)
      for (let k = 0; k < bumps; k++) {
        const cx = (k / (bumps - 1) - 0.5) * w * 0.8
        const r = rnd(42, 70) * (1 - Math.abs(cx) / w)
        el('circle', { cx, cy: rnd(-12, 6), r: Math.max(30, r), class: 'cloud-puff' }, g)
      }
      el('rect', { x: -w * 0.42, y: 0, width: w * 0.84, height: 34, rx: 17, class: 'cloud-puff' }, g)
      clouds.push({ g, x: null, size: null, from: -400 - i * 360, home: 80 + i * 340 + rnd(-40, 40), y: rnd(70, 200), drift: rnd(4, 10) })
    }
  }

  // ------------------------------------------------------------ rain

  const canvas = $('rain')
  const drops = []
  function sizeCanvas() {
    const dpr = Math.min(Painting.MAX_DPR, window.devicePixelRatio || 1) // see painting.js
    canvas.width = Math.round(canvas.clientWidth * dpr)
    canvas.height = Math.round(canvas.clientHeight * dpr)
  }
  function newDrop(top = false) {
    const y0 = Painting.VIEW_TOP - 200 // from above the view (whose top is cut on a phone)
    return { x: fxRnd(-100, Painting.VIEW_W + 100), y: top ? fxRnd(y0, y0 + 200) : fxRnd(y0, 900), v: fxRnd(900, 1300), len: fxRnd(18, 30) }
  }
  const splashes = []

  function drawRain(dt) {
    const ctx = canvas.getContext('2d')
    const sx = canvas.width / Painting.VIEW_W
    const sy = canvas.height / Painting.VIEW_H
    ctx.setTransform(sx, 0, 0, sy, 0, -Painting.VIEW_TOP * sy)
    ctx.clearRect(0, Painting.VIEW_TOP, Painting.VIEW_W, Painting.VIEW_H)
    if (shower.intensity <= 0.01 && !splashes.length) return
    const wanted = Math.round(DROPS * shower.intensity)
    while (drops.length < wanted) drops.push(newDrop(true))
    if (drops.length > wanted) drops.length = wanted
    ctx.strokeStyle = 'rgba(214, 230, 245, 0.75)'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (const d of drops) {
      d.y += d.v * dt
      d.x -= d.v * dt * 0.12 // a slight slant from the breeze
      if (d.y > GROUND_Y + fxRnd(0, 70)) {
        if (sparkle() < 0.35) splashes.push({ x: d.x, y: d.y, age: 0 })
        Object.assign(d, newDrop(true))
        continue
      }
      ctx.moveTo(d.x, d.y)
      ctx.lineTo(d.x + d.len * 0.12, d.y - d.len)
    }
    ctx.stroke()
    // little splash crowns on the ground
    ctx.strokeStyle = 'rgba(214, 230, 245, 0.6)'
    ctx.lineWidth = 1.5
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i]
      s.age += dt
      if (s.age > 0.25) {
        splashes.splice(i, 1)
        continue
      }
      const k = s.age / 0.25
      ctx.beginPath()
      ctx.ellipse(s.x, s.y, 4 + k * 10, 1.5 + k * 3, 0, Math.PI, 0)
      ctx.stroke()
    }
  }

  // ------------------------------------------------------------ puddles

  const puddleLayer = $('puddles')
  const puddles = Layout.puddles.map(({ x, rx }) => {
    const g = el('g', { class: 'puddle', transform: `translate(${x} ${GROUND_Y + PUDDLE_DROP})` }, puddleLayer)
    const water = el('ellipse', { rx: 0, ry: 0, class: 'puddle-water' }, g)
    const shine = el('ellipse', { rx: 0, ry: 0, cx: -18, cy: -3, class: 'puddle-shine' }, g)
    return { x, g, water, shine, rx }
  })

  function drawPuddles() {
    for (const p of puddles) {
      const k = Math.min(1, shower.wet)
      p.water.setAttribute('rx', p.rx * k)
      p.water.setAttribute('ry', 13 * k)
      p.shine.setAttribute('rx', p.rx * 0.35 * k)
      p.shine.setAttribute('ry', 3 * k)
      // drops land in the puddle: rings
      if (shower.intensity > 0.2 && k > 0.3 && sparkle() < shower.intensity * 0.12) ring(p, k)
    }
  }

  function ring(p, k) {
    const r = el('ellipse', { cx: fxRnd(-p.rx * 0.7, p.rx * 0.7) * k, cy: fxRnd(-4, 4), rx: 2, ry: 1, class: 'ripple' }, p.g)
    r.animate([{ rx: 2, ry: 1, opacity: 0.9 }, { rx: 26, ry: 7, opacity: 0 }], { duration: 700, easing: 'ease-out' }).finished.then(() => r.remove())
  }

  /** The puddle Reksio's feet are in, if any (and if there is water in it). */
  function puddleAt(x) {
    if (shower.wet < 0.25) return null
    return puddles.find((p) => Math.abs(p.x - x) < p.rx * Math.min(1, shower.wet) * 0.9) || null
  }

  /** A splash where something lands in a puddle (Reksio's feet). */
  function splash(x) {
    const p = puddleAt(x)
    if (!p) return false
    for (let i = 0; i < 3; i++) ring(p, Math.min(1, shower.wet))
    return true
  }

  // ------------------------------------------------------------ after the rain

  const rainbow = $('rainbow')
  function makeRainbow() {
    rainbow.setAttribute('clip-path', 'url(#sky-clip)')
    const colours = ['#e2574c', '#f0a243', '#f3d65a', '#7cbf6a', '#5f9ad8', '#8a6bc4']
    colours.forEach((c, i) => {
      el('path', { d: `M ${520 - i * 14} 360 A ${430 - i * 14} ${330 - i * 14} 0 0 1 ${1380 + i * 14} 360`, stroke: c, class: 'rainbow-band' }, rainbow)
    })
  }

  /** After the rain, the flowers stretch up a little and open wider. */
  function growFlowers() {
    if (!Layout.flowers) return
    document.querySelectorAll('#flowers .sway').forEach((stem, i) => {
      const grow = stem.querySelector('.grow') || wrapForGrowth(stem)
      Motion.endAt(grow, [{ transform: 'scaleY(1)' }, { transform: `scaleY(${1.15 + i * 0.05})` }], { duration: 5000, delay: i * 600, easing: 'ease-out' })
      const bloom = stem.querySelector('.bloom')
      Motion.endAt(bloom, [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }], { duration: 3000, delay: 2500 + i * 600, easing: 'ease-out' })
    })
  }

  /** Put a plant's parts in a group that can grow from its root. */
  function wrapForGrowth(stem) {
    const g = document.createElementNS(SVG_NS, 'g')
    g.setAttribute('class', 'grow')
    g.style.transformOrigin = stem.style.transformOrigin
    while (stem.firstChild) g.appendChild(stem.firstChild)
    stem.appendChild(g)
    const bloom = g.querySelector('.bloom')
    const centre = bloom.querySelector('circle')
    bloom.style.transformOrigin = `${centre.getAttribute('cx')}px ${centre.getAttribute('cy')}px`
    bloom.style.transformBox = 'view-box'
    return g
  }

  // ------------------------------------------------------------ the timeline

  /** A new phase of the shower: what starts and stops with it, then the listeners. */
  function entered(p) {
    if (p === 'raining') {
      rainSound = Sound.rain()
      Music.setRain(true)
    } else if (p === 'clearing' && rainSound) {
      rainSound()
      rainSound = null
      Music.setRain(false)
    } else if (p === 'after') {
      rainbow.animate([{ opacity: 0 }, { opacity: 0.75, offset: 0.2 }, { opacity: 0.75, offset: 0.75 }, { opacity: 0 }], { duration: 14000 })
      growFlowers()
    }
    for (const fn of listeners) fn(p)
  }

  // ------------------------------------------------------------ wind

  const air = Wind.make(random) // the breeze and its gusts (wind.js), on this part's stream
  let wind = air.level
  let windSound = null
  let calm = false // evening: the wind drops

  function blow(dt, cover) {
    wind = Wind.step(air, dt, cover * STORMY)
    if (!windSound && Sound.running) windSound = Sound.wind()
    if (windSound) windSound(wind)
    const sway = SWAY_DEG[0] + (SWAY_DEG[1] - SWAY_DEG[0]) * wind
    document.documentElement.style.setProperty('--sway', `${sway.toFixed(2)}deg`)
  }

  /** A cloud's move this frame (x in the sky's units, painting.js): in over
   * its home while the shower's clouds are in; else a fair day's drifts
   * across and comes round again, smaller and slower the further off it
   * looks, and the rest go off to the right once a shower has called them,
   * or wait off the left until one does. At evening every cloud goes. */
  function moveCloud(c, drifts, cover, dt) {
    if (cover > 0) c.called = true
    const drifting = drifts && !calm && cover === 0
    const far = (c.drift - 4) / 6 // 0 the furthest off … 1 the nearest (drift is 4–10)
    const size = drifts && cover === 0 ? 0.5 + 0.35 * far : 1
    if (c.x === null) [c.x, c.size] = drifts ? [c.home, size] : [Painting.SKY_LEFT + c.from, 1]
    c.size += (size - c.size) * Math.min(1, dt * 0.5)
    if (drifting) {
      c.x += DRIFT * (0.6 + 0.8 * far) * dt
      if (c.x > Painting.SKY_RIGHT + 400) c.x = Painting.SKY_LEFT - 400
    } else if (cover > 0 || c.called || drifts) {
      const target = cover > 0 ? c.home + Math.sin(t / c.drift) * 30 : Painting.SKY_RIGHT + 500
      c.x += (target - c.x) * Math.min(1, dt * (cover > 0 ? 0.9 : 0.35))
    }
    c.g.setAttribute('transform', `translate(${c.x.toFixed(1)} ${c.y}) scale(${c.size.toFixed(3)})`)
  }

  /** The world state (world.js): how overcast it is (rain coming), the wind, and where it's wet: all the yard
   * while it rains, and each puddle while it holds water. */
  function tellTheWorld(cover) {
    World.set({ overcast: cover, wind })
    if (shower.phase === 'raining') World.wet(-500, Layout.WORLD_W + 500, WET_MS)
    if (shower.wet > 0.25) for (const p of puddles) World.wet(p.x - p.rx, p.x + p.rx, WET_MS)
  }

  function tick(dt, camX) {
    t += dt
    shower.step(dt).forEach(entered)

    const cover = shower.cover
    tellTheWorld(cover)
    clouds.forEach((c, i) => moveCloud(c, (i * Layout.sky.clouds) % clouds.length < Layout.sky.clouds, cover, dt)) // spread out: 3 of 5 are the 1st, 3rd and 5th
    $('overcast').style.opacity = String(Math.max(Layout.sky.haze, cover * 0.42))
    blow(dt, cover)
    const sun = document.querySelector('#sun')
    if (sun) sun.style.opacity = String(Layout.sky.sun * (1 - cover * 0.85))

    drawRain(dt)
    drawPuddles(camX)
  }

  // ------------------------------------------------------------ public

  function init() {
    // each puddle offers a drink while it holds water (world.js): the snail and the worms come out by them after rain
    puddles.forEach((p, i) => World.offer(`puddle-${i}`, 'drink', p.x, GROUND_Y, () => shower.wet > 0.25))
    makeClouds()
    makeRainbow()
    new ResizeObserver(sizeCanvas).observe(canvas)
    sizeCanvas()
  }

  return {
    init,
    tick,
    /** fn(phase) on every change of phase. */
    on(fn) { listeners.push(fn) },
    get phase() { return shower.phase },
    get raining() { return shower.phase === 'raining' },
    /** How windy it is now: 0 still, 1 a gust. */
    get wind() { return wind },
    /** Seconds since the rain stopped, or null if it hasn't rained yet. */
    get sinceRain() { return shower.sinceRain },
    puddleAt,
    splash,
    /** Puddles with water in them now, for creatures and for Reksio. */
    get puddles() { return shower.wet > 0.25 ? puddles.map((p) => ({ x: p.x, rx: p.rx * Math.min(1, shower.wet) })) : [] },
    /** End any shower now (evening). */
    stop() {
      calm = true
      Wind.calm(air)
      shower.stop().forEach(entered)
    },
  }
})()
