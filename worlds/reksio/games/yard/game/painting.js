// The yard's background, painted the way the series' backgrounds look: a
// sponged, mottled sky, stone wall and sandy ground — thousands of small dabs
// clustered into blotches, from a fixed seed so the yard is the same every time.
//
// The view is 900 scene units high and as wide as the screen's shape allows,
// from 16:9 (1600) to 21:9 (2100): a phone on its side sees more of the yard,
// not black bars. setup() fits it, on load and whenever the stage is resized.
//
// The yard is wider than the view. Two layers are painted once, off screen:
// the sky (which moves at half speed, for depth) and the wall with the ground.
// Each frame copies the visible part of each onto the visible canvas.

/* global Layout */
/* exported Painting */
const Painting = (() => {
  const H = 900 // the view's height, in scene units
  const VIEW_MIN_W = 1600 // the view's width at 16:9: all of it shows on any screen
  const VIEW_MAX_W = 2100 // and at most, at 21:9 (wider than that, black bars at the sides)
  const WORLD_W = Layout.WORLD_W // the whole yard (layout.js)
  const SKY_SPEED = 0.5 // the sky scrolls this much slower than the ground
  const SKY_W = WORLD_W * SKY_SPEED + VIEW_MAX_W * (1 - SKY_SPEED) // enough sky for the widest view at the far end
  let viewW = VIEW_MIN_W
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

  /** How wide the view is (scene units) on a stage of this shape. */
  const viewFor = (w, h) => Math.max(VIEW_MIN_W, Math.min(VIEW_MAX_W, Math.round((H * w) / (h || 1))))

  /** Fit the view to the stage, size the visible canvas and repaint the
   * layers (on load and resize). */
  function setup(el) {
    canvas = el
    const { width, height } = canvas.getBoundingClientRect() // exact: whole pixels would round the shape
    viewW = viewFor(width, height)
    for (const svg of document.querySelectorAll('svg.view')) svg.setAttribute('viewBox', `0 0 ${viewW} ${H}`)
    for (const r of document.querySelectorAll('rect.view-wide')) r.setAttribute('width', viewW)
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(canvas.clientWidth * dpr)
    canvas.height = Math.round(canvas.clientHeight * dpr)
    scale = canvas.width / viewW
    paintLayers() // at this screen's resolution
  }

  /** Show the yard with the camera's left edge at camX (scene units). */
  function render(camX) {
    if (!canvas || !sky) return
    const ctx = canvas.getContext('2d')
    const sw = viewW * scale
    const sh = H * scale
    ctx.drawImage(sky, camX * SKY_SPEED * scale, 0, sw, sh, 0, 0, canvas.width, canvas.height)
    ctx.drawImage(near, camX * scale, 0, sw, sh, 0, 0, canvas.width, canvas.height)
  }

  return {
    setup,
    render,
    viewFor,
    WORLD_W,
    VIEW_MIN_W,
    VIEW_MAX_W,
    WALL_TOP,
    GROUND_TOP,
    /** The view's width now, in scene units. */
    get VIEW_W() { return viewW },
  }
})()
