// The yard's background, painted the way the series' backgrounds look: a
// sponged, mottled sky, stone wall and sandy ground — thousands of small dabs
// clustered into blotches, from a fixed seed so the yard is the same every time.
//
// The scene is 900 units high, and on a big enough screen all of it shows, as
// wide as the screen's shape allows, from 16:9 (1600) to 21:9 (2100): a phone
// on its side sees more of the yard, not black bars. On a short screen (a
// phone) the top of the sky is cut instead, so the yard and everyone in it
// show bigger; the sky's own things (sun, moon, clouds, rainbow: the
// `.far-sky` groups) are drawn smaller to fit the strip of sky that is left.
// setup() fits it, on load and whenever the stage is resized.
//
// The yard is wider than the view. Two layers are painted once, off screen:
// the sky (which moves at half speed, for depth) and the wall with the ground.
// Each frame copies the visible part of each onto the visible canvas.

/* global Layout */
/* exported Painting */
const Painting = (() => {
  const H = 900 // the scene's height, in scene units
  const FULL_SCALE = 0.6 // CSS px per scene unit at which all of the scene shows; below it (a phone) the sky is cut, so Reksio stays over 110 px tall and the mouse finger-sized
  const VIEW_MIN_H = 740 // but at most this much is cut: 174 units of sky stay above the wall, room for the sun and the moon at half size, and the bird's wall in view
  const MIN_PLAY_PX = 260 // a stage shorter than this, on a screen held upright (a phone: about 220), is too small to play: yard.js asks for it on its side
  const SKY_FLOOR = 334 // the sky's things are clipped at the wall's top (index.html #sky-clip), and shrink towards it
  const MAX_DPR = 2 // canvases are drawn at most this many pixels per CSS pixel: a phone's 3x looks the same for a sponged texture and costs 2.25x the pixels, every frame
  const VIEW_MAX_W = 2100 // the widest view: all of the scene at 21:9 (game.css keeps the stage between 16:9 and 21:9)
  const WORLD_W = Layout.WORLD_W // the whole yard (layout.js)
  const SKY_SPEED = 0.5 // the sky scrolls this much slower than the ground
  const SKY_W = WORLD_W * SKY_SPEED + VIEW_MAX_W * (1 - SKY_SPEED) // enough sky for the widest view at the far end
  let fit = { top: 0, w: 1600, h: H, k: 1 }
  let skyLeft = 0 // the view's edges in the sky's own units (its things are drawn k times smaller)
  let skyRight = fit.w
  let tooSmall = false
  const WALL_TOP = 330
  const GROUND_TOP = 700

  const SKY = { base: '#e7a464', dabs: ['#f3c08a', '#d98a52', '#f7d6a6', '#e9b277'], density: 0.17 }
  const WALL = { base: '#8d9884', dabs: ['#a9b39b', '#77856f', '#bcc2aa', '#93a3a2', '#6c7a69'], density: 0.27 }
  const GROUND = { base: '#e2cd9b', dabs: ['#cbb17a', '#f0e2b9', '#bb9f68', '#d8bf88'], density: 0.17 }

  let canvas = null
  let sky = null
  let near = null
  let scale = 1

  function rng(seed) {
    let s = seed
    return () => ((s = (s * 16807) % 2147483647) / 2147483647)
  }

  /** A wobbly horizontal edge, so layers meet like paint, not like a ruler. */
  function edge(rand, width, y, amp) {
    const pts = []
    for (let x = -40; x <= width + 40; x += 40) pts.push([x, y + (rand() - 0.5) * amp])
    return pts
  }

  function region(ctx, top, bottom) {
    ctx.beginPath()
    top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    for (let i = bottom.length - 1; i >= 0; i--) ctx.lineTo(bottom[i][0], bottom[i][1])
    ctx.closePath()
  }

  /** Fill a clipped region with a base colour and sponge blotches. */
  function sponge(ctx, rand, layer, width, top, bottom, yTop, yBottom) {
    ctx.save()
    region(ctx, top, bottom)
    ctx.clip()
    ctx.fillStyle = layer.base
    ctx.fillRect(-40, yTop - 30, width + 80, yBottom - yTop + 60)
    const blotches = Math.round((width * (yBottom - yTop) * layer.density) / 1000)
    for (let b = 0; b < blotches; b++) {
      const cx = rand() * width
      const cy = yTop + rand() * (yBottom - yTop)
      const r = 10 + rand() * 34
      ctx.fillStyle = layer.dabs[Math.floor(rand() * layer.dabs.length)]
      const dabs = Math.round(r * r * 0.18)
      for (let d = 0; d < dabs; d++) {
        const a = rand() * Math.PI * 2
        const dist = Math.sqrt(rand()) * r
        ctx.globalAlpha = 0.3 + rand() * 0.55
        ctx.beginPath()
        ctx.ellipse(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * 0.7, 0.8 + rand() * 2.6, 0.6 + rand() * 1.8, rand() * 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
    ctx.globalAlpha = 1
  }

  function offscreen(width) {
    const c = document.createElement('canvas')
    c.width = Math.round(width * scale)
    c.height = Math.round(H * scale)
    const ctx = c.getContext('2d')
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    return [c, ctx]
  }

  function paintLayers() {
    const rand = rng(1977)
    let ctx
    ;[sky, ctx] = offscreen(SKY_W)
    sponge(ctx, rand, SKY, SKY_W, edge(rand, SKY_W, -20, 0), edge(rand, SKY_W, WALL_TOP + 20, 0), 0, WALL_TOP + 20)

    ;[near, ctx] = offscreen(WORLD_W)
    const wallTop = edge(rand, WORLD_W, WALL_TOP, 8)
    const groundTop = edge(rand, WORLD_W, GROUND_TOP, 14)
    sponge(ctx, rand, WALL, WORLD_W, wallTop, groundTop, WALL_TOP - 10, GROUND_TOP + 10)
    sponge(ctx, rand, GROUND, WORLD_W, groundTop, edge(rand, WORLD_W, H + 20, 0), GROUND_TOP - 10, H)
    // The wall's cap: a slightly darker line along its top, where the bird sits.
    ctx.globalAlpha = 0.55
    ctx.strokeStyle = '#5f6a59'
    ctx.lineWidth = 5
    ctx.beginPath()
    wallTop.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 2) : ctx.moveTo(x, y + 2)))
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  /**
   * The view for a stage of w × h CSS px: its top and height (the sky is cut
   * on a short stage), its width (the stage's shape), and k, how much smaller
   * the sky's things are drawn to fit what is left of the sky.
   */
  function viewFor(w, h) {
    const top = Math.round(H - Math.min(H, Math.max(VIEW_MIN_H, (h || 1) / FULL_SCALE)))
    const viewH = H - top
    const viewW = Math.min(VIEW_MAX_W, Math.round((viewH * w) / (h || 1)))
    return { top, w: viewW, h: viewH, k: (SKY_FLOOR - top) / SKY_FLOOR }
  }

  /** Fit the view to the stage, size the visible canvas and repaint the
   * layers (on load and resize). */
  function setup(el) {
    canvas = el
    const { width, height } = canvas.getBoundingClientRect() // exact: whole pixels would round the shape
    fit = viewFor(width, height)
    tooSmall = height < MIN_PLAY_PX && window.innerHeight > window.innerWidth
    const stage = canvas.parentElement // its gradients follow the view (game.css)
    stage.style.setProperty('--view-top', fit.top)
    stage.style.setProperty('--view-h', fit.h)
    for (const svg of document.querySelectorAll('svg.view')) svg.setAttribute('viewBox', `0 ${fit.top} ${fit.w} ${fit.h}`)
    // the sky's things shrink towards the middle of the wall's top
    const mid = fit.w / 2
    const shrink = fit.k === 1 ? '' : `translate(${mid} ${SKY_FLOOR}) scale(${fit.k}) translate(${-mid} ${-SKY_FLOOR})`
    for (const g of document.querySelectorAll('.far-sky')) g.setAttribute('transform', shrink)
    skyLeft = mid - mid / fit.k
    skyRight = mid + mid / fit.k
    for (const r of document.querySelectorAll('rect.view-wide')) {
      r.setAttribute('x', skyLeft)
      r.setAttribute('width', skyRight - skyLeft)
    }
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
    canvas.width = Math.round(canvas.clientWidth * dpr)
    canvas.height = Math.round(canvas.clientHeight * dpr)
    scale = canvas.width / fit.w
    paintLayers() // at this screen's resolution
  }

  /** Show the yard with the camera's left edge at camX (scene units). */
  function render(camX) {
    if (!canvas || !sky) return
    const ctx = canvas.getContext('2d')
    const sw = fit.w * scale
    const sh = fit.h * scale
    const sy = fit.top * scale
    ctx.drawImage(sky, camX * SKY_SPEED * scale, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    ctx.drawImage(near, camX * scale, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  }

  return {
    setup,
    render,
    viewFor,
    WORLD_W,
    VIEW_MAX_W,
    MAX_DPR,
    WALL_TOP,
    GROUND_TOP,
    /** The view's width now, in scene units. */
    get VIEW_W() { return fit.w },
    /** The view's top (above it, the sky is cut) and height, in scene units. */
    get VIEW_TOP() { return fit.top },
    get VIEW_H() { return fit.h },
    /** The view's left and right edges in the sky's units (clouds come and go past them). */
    get SKY_LEFT() { return skyLeft },
    get SKY_RIGHT() { return skyRight },
    /** Is the stage too small to play, on a screen held upright? */
    get tooSmall() { return tooSmall },
  }
})()
