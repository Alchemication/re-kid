// The yard's background, painted the way the series' backgrounds look: a
// sponged, mottled sky, stone wall and sandy ground. Thousands of small dabs,
// clustered into blotches, from a fixed seed so the yard is the same every time.

/* exported Painting */
const Painting = (() => {
  const W = 1600 // the scene's own units; the canvas is scaled to fit
  const H = 900
  const WALL_TOP = 330
  const GROUND_TOP = 700

  const LAYERS = [
    { top: 0, bottom: WALL_TOP, base: '#e7a464', dabs: ['#f3c08a', '#d98a52', '#f7d6a6', '#e9b277'], blotches: 260 },
    { top: WALL_TOP, bottom: GROUND_TOP, base: '#8d9884', dabs: ['#a9b39b', '#77856f', '#bcc2aa', '#93a3a2', '#6c7a69'], blotches: 420 },
    { top: GROUND_TOP, bottom: H, base: '#e2cd9b', dabs: ['#cbb17a', '#f0e2b9', '#bb9f68', '#d8bf88'], blotches: 260 },
  ]

  function rng(seed) {
    let s = seed
    return () => ((s = (s * 16807) % 2147483647) / 2147483647)
  }

  /** A wobbly horizontal edge, so layers meet like paint, not like a ruler. */
  function edge(rand, y, amp) {
    const pts = []
    for (let x = 0; x <= W; x += 40) pts.push([x, y + (rand() - 0.5) * amp])
    return pts
  }

  function layerPath(ctx, top, bottom) {
    ctx.beginPath()
    top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    for (let i = bottom.length - 1; i >= 0; i--) ctx.lineTo(bottom[i][0], bottom[i][1])
    ctx.closePath()
  }

  function draw(canvas) {
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(canvas.clientWidth * dpr)
    canvas.height = Math.round(canvas.clientHeight * dpr)
    const ctx = canvas.getContext('2d')
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0)
    const rand = rng(1977)

    const edges = [
      edge(rand, -20, 0),
      edge(rand, WALL_TOP, 8),
      edge(rand, GROUND_TOP, 14),
      edge(rand, H + 20, 0),
    ]

    LAYERS.forEach((layer, i) => {
      ctx.save()
      layerPath(ctx, edges[i], edges[i + 1])
      ctx.clip()
      ctx.fillStyle = layer.base
      ctx.fillRect(0, layer.top - 30, W, layer.bottom - layer.top + 60)
      // Sponge blotches: each a cluster of small dabs in one or two colours.
      for (let b = 0; b < layer.blotches; b++) {
        const cx = rand() * W
        const cy = layer.top + rand() * (layer.bottom - layer.top)
        const r = 10 + rand() * 34
        const color = layer.dabs[Math.floor(rand() * layer.dabs.length)]
        const dabs = Math.round(r * r * 0.18)
        ctx.fillStyle = color
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
    })

    // The wall's cap: a slightly darker line along its top, where the bird sits.
    ctx.globalAlpha = 0.55
    ctx.strokeStyle = '#5f6a59'
    ctx.lineWidth = 5
    ctx.beginPath()
    edges[1].forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 2) : ctx.moveTo(x, y + 2)))
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  return { draw, WALL_TOP, GROUND_TOP }
})()
