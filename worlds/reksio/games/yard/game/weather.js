// Weather: in some plays (layout.js), a shower comes once, part-way through.
//
// Clouds roll in and the yard dims; rain falls and splashes; puddles slowly
// form, ringing where drops land. Then the clouds drift off, a rainbow shows
// for a while, the puddles dry up, and the flowers grow a little taller and
// open wider. No thunder: this is a gentle shower for a three-year-old.
//
// Other parts listen: creatures (the snail and worms come out after rain),
// Reksio (looks up, catches drops, jumps in puddles), the music (softer).

/* global Layout, Sound, Music */
/* exported Weather */
const Weather = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const VIEW_W = 1600
  const VIEW_H = 900
  const GROUND_Y = 812
  const START_S = [25, 55] // the shower starts this long into the play
  const RAIN_S = [22, 30] // and lasts this long
  const CLOUD_IN_S = 4 // clouds take this long to cover the sky
  const DRY_S = 70 // puddles take this long to dry up after the rain
  const PUDDLES = [1040, 1880, 2860] // world x of the dips where puddles form
  const DROPS = 220 // raindrops on screen at full rain

  const $ = (id) => document.getElementById(id)
  const rnd = (lo, hi) => lo + Math.random() * (hi - lo)
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
    parent.appendChild(n)
    return n
  }

  let phase = Layout.rain ? 'waiting' : 'dry' // waiting | clouding | raining | clearing | after | dry
  let t = 0
  const startAt = Layout.rainAt ?? rnd(...START_S)
  const rainFor = rnd(...RAIN_S)
  let phaseAt = 0 // when the current phase began
  let intensity = 0 // 0..1, how hard it's raining
  let wet = 0 // 0..1, how full the puddles are
  let afterRainAt = null
  const listeners = []
  let rainSound = null

  // ------------------------------------------------------------ clouds

  const cloudLayer = $('clouds')
  const clouds = []
  function makeClouds() {
    for (let i = 0; i < 5; i++) {
      const g = el('g', { class: 'cloud' }, cloudLayer)
      const w = rnd(220, 340)
      const bumps = 4 + Math.floor(Math.random() * 3)
      for (let k = 0; k < bumps; k++) {
        const cx = (k / (bumps - 1) - 0.5) * w * 0.8
        const r = rnd(42, 70) * (1 - Math.abs(cx) / w)
        el('circle', { cx, cy: rnd(-12, 6), r: Math.max(30, r), class: 'cloud-puff' }, g)
      }
      el('rect', { x: -w * 0.42, y: 0, width: w * 0.84, height: 34, rx: 17, class: 'cloud-puff' }, g)
      clouds.push({ g, x: -400 - i * 360, home: 80 + i * 340 + rnd(-40, 40), y: rnd(70, 200), drift: rnd(4, 10) })
    }
  }

  // ------------------------------------------------------------ rain

  const canvas = $('rain')
  const drops = []
  function sizeCanvas() {
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(canvas.clientWidth * dpr)
    canvas.height = Math.round(canvas.clientHeight * dpr)
  }
  function newDrop(top = false) {
    return { x: rnd(-100, VIEW_W + 100), y: top ? rnd(-200, 0) : rnd(-200, VIEW_H), v: rnd(900, 1300), len: rnd(18, 30) }
  }
  const splashes = []

  function drawRain(dt) {
    const ctx = canvas.getContext('2d')
    const sx = canvas.width / VIEW_W
    const sy = canvas.height / VIEW_H
    ctx.setTransform(sx, 0, 0, sy, 0, 0)
    ctx.clearRect(0, 0, VIEW_W, VIEW_H)
    if (intensity <= 0.01 && !splashes.length) return
    const wanted = Math.round(DROPS * intensity)
    while (drops.length < wanted) drops.push(newDrop(true))
    if (drops.length > wanted) drops.length = wanted
    ctx.strokeStyle = 'rgba(214, 230, 245, 0.75)'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (const d of drops) {
      d.y += d.v * dt
      d.x -= d.v * dt * 0.12 // a slight slant from the breeze
      if (d.y > GROUND_Y + rnd(0, 70)) {
        if (Math.random() < 0.35) splashes.push({ x: d.x, y: d.y, age: 0 })
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
  const puddles = PUDDLES.map((x) => {
    const g = el('g', { class: 'puddle', transform: `translate(${x} ${GROUND_Y + 22})` }, puddleLayer)
    const water = el('ellipse', { rx: 0, ry: 0, class: 'puddle-water' }, g)
    const shine = el('ellipse', { rx: 0, ry: 0, cx: -18, cy: -3, class: 'puddle-shine' }, g)
    return { x, g, water, shine, rx: rnd(85, 120) }
  })

  function drawPuddles() {
    for (const p of puddles) {
      const k = Math.min(1, wet)
      p.water.setAttribute('rx', p.rx * k)
      p.water.setAttribute('ry', 13 * k)
      p.shine.setAttribute('rx', p.rx * 0.35 * k)
      p.shine.setAttribute('ry', 3 * k)
      // drops land in the puddle: rings
      if (intensity > 0.2 && k > 0.3 && Math.random() < intensity * 0.12) ring(p, k)
    }
  }

  function ring(p, k) {
    const r = el('ellipse', { cx: rnd(-p.rx * 0.7, p.rx * 0.7) * k, cy: rnd(-4, 4), rx: 2, ry: 1, class: 'ripple' }, p.g)
    r.animate([{ rx: 2, ry: 1, opacity: 0.9 }, { rx: 26, ry: 7, opacity: 0 }], { duration: 700, easing: 'ease-out' }).finished.then(() => r.remove())
  }

  /** The puddle Reksio's feet are in, if any (and if there is water in it). */
  function puddleAt(x) {
    if (wet < 0.25) return null
    return puddles.find((p) => Math.abs(p.x - x) < p.rx * Math.min(1, wet) * 0.9) || null
  }

  /** A splash where something lands in a puddle (Reksio's feet). */
  function splash(x) {
    const p = puddleAt(x)
    if (!p) return false
    for (let i = 0; i < 3; i++) ring(p, Math.min(1, wet))
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
      grow.animate([{ transform: 'scaleY(1)' }, { transform: `scaleY(${1.15 + i * 0.05})` }], { duration: 5000, delay: i * 600, easing: 'ease-out', fill: 'forwards' })
      const bloom = stem.querySelector('.bloom')
      bloom.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }], { duration: 3000, delay: 2500 + i * 600, easing: 'ease-out', fill: 'forwards' })
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

  function setPhase(p) {
    phase = p
    phaseAt = t
    for (const fn of listeners) fn(p)
  }

  function tick(dt, camX) {
    t += dt
    const since = t - phaseAt
    if (phase === 'waiting' && t >= startAt) setPhase('clouding')
    if (phase === 'clouding') {
      if (since >= CLOUD_IN_S) {
        setPhase('raining')
        rainSound = Sound.rain()
        Music.setRain(true)
      }
    } else if (phase === 'raining') {
      intensity = Math.min(1, since / 3)
      wet = Math.min(1, wet + dt / 18)
      if (since >= rainFor) setPhase('clearing')
    } else if (phase === 'clearing') {
      intensity = Math.max(0, 1 - since / 3)
      if (rainSound && since > 0.1) {
        rainSound()
        rainSound = null
        Music.setRain(false)
      }
      if (since >= 4) {
        setPhase('after')
        afterRainAt = t
        rainbow.animate([{ opacity: 0 }, { opacity: 0.75, offset: 0.2 }, { opacity: 0.75, offset: 0.75 }, { opacity: 0 }], { duration: 14000 })
        growFlowers()
      }
    } else if (phase === 'after') {
      wet = Math.max(0, wet - dt / DRY_S)
      if (wet <= 0) setPhase('dry')
    }

    // clouds: in while clouding/raining, out after
    const cover = phase === 'clouding' ? Math.min(1, since / CLOUD_IN_S) : phase === 'raining' ? 1 : phase === 'clearing' ? Math.max(0, 1 - since / 4) : 0
    for (const c of clouds) {
      const target = cover > 0 ? c.home + Math.sin(t / c.drift) * 30 : VIEW_W + 500
      const from = c.x
      c.x = from + (target - from) * Math.min(1, dt * (cover > 0 ? 0.9 : 0.35))
      c.g.setAttribute('transform', `translate(${c.x} ${c.y})`)
    }
    $('overcast').style.opacity = String(cover * 0.42)
    const sun = document.querySelector('#sun')
    if (sun) sun.style.opacity = String(1 - cover * 0.85)

    drawRain(dt)
    drawPuddles(camX)
  }

  // ------------------------------------------------------------ public

  function init() {
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
    get phase() { return phase },
    get raining() { return phase === 'raining' },
    /** Seconds since the rain stopped, or null if it hasn't rained yet. */
    get sinceRain() { return afterRainAt == null ? null : t - afterRainAt },
    puddleAt,
    splash,
    /** Puddles with water in them now, for creatures and for Reksio. */
    get puddles() { return wet > 0.25 ? puddles.map((p) => ({ x: p.x, rx: p.rx * Math.min(1, wet) })) : [] },
    /** End any shower now (evening). */
    stop() {
      if (phase === 'clouding' || phase === 'raining' || phase === 'waiting') setPhase(phase === 'waiting' ? 'dry' : 'clearing')
    },
  }
})()
