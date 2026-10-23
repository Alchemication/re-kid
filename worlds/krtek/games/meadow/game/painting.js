// The meadow painted the way the films' backgrounds are (Krtek a buldozer,
// Krtek a vejce): a pale blue sky with a watercolour wash of cloud; far off,
// a misty band of pines and sponged round trees; nearer, bushes made of
// little stars of leaves, fans of long leaves, big fern fronds by the spring,
// tall bluebells and a yellow flower spike behind his molehill; grass
// painted in fine strokes, daisies and small flowers along the front; and
// the flower bed a dense mass of daisies and cornflowers round the tulips.
//
// Each layer is painted once, with brush strokes made in code from a fixed
// seed (the same meadow every play), onto a canvas, and shown as one image
// in its layer (index.html): a few bitmaps to draw as the view moves, not
// thousands of shapes. Nothing here moves or changes after it is painted,
// except the clouds' wash fading at night (cloudsAt).

/* global Debug, Layout */
/* exported Painting */
const Painting = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const RES = [0.75, 1.5] // canvas pixels per scene unit: as sharp as the screen shows the scene, within this (memory: the back is 4000 units wide)
  const OPEN = { from: 1400, to: 2080 } // the poles' hill: open grass, nothing tall where they land far off (poles.js FAR)
  const random = Debug.random('meadow-painting') // its own stream: so many draws must not shift the others
  const r = (a = 1, b) => (b == null ? random() * a : a + random() * (b - a))
  const pick = (list) => list[Math.floor(random() * list.length)]
  let res = 1

  /** A canvas covering scene units x, y, w, h; draw() paints in scene units. */
  function layer(x, y, w, h, draw) {
    const c = document.createElement('canvas')
    c.width = Math.ceil(w * res)
    c.height = Math.ceil(h * res)
    const ctx = c.getContext('2d')
    ctx.scale(res, res)
    ctx.translate(-x, -y)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    draw(ctx)
    return { c, x, y, w, h }
  }

  /** Put a painted layer into `parent` as an image (before `before`, if given). */
  function place(parent, { c, x, y, w, h }, before = null) {
    const img = document.createElementNS(SVG, 'image')
    for (const [k, v] of Object.entries({ x, y, width: w, height: h, preserveAspectRatio: 'none', class: 'painted' })) img.setAttribute(k, v)
    img.style.pointerEvents = 'none'
    parent.insertBefore(img, before)
    c.toBlob((blob) => img.setAttribute('href', URL.createObjectURL(blob)))
    return img
  }

  // ------------------------------------------------------------ brushes

  /** A stroke of grass: a short blade leaning a little. */
  function blade(ctx, x, y, len, colour, width = 1.6) {
    ctx.strokeStyle = colour
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + r(-2, 2), y - len * 0.6, x + r(-4, 4), y - len)
    ctx.stroke()
  }

  /** Grass strokes over a band ([x0, x1, y0, y1]), thicker towards its foot. */
  function grass(ctx, [x0, x1, y0, y1], perUnit, colours, len) {
    const n = (x1 - x0) * (y1 - y0) * perUnit
    for (let i = 0; i < n; i++) {
      const t = Math.sqrt(random())
      const y = y0 + (y1 - y0) * t
      blade(ctx, r(x0, x1), y, len[0] + r(len[1]) * (0.6 + t * 0.6), pick(colours), 1.2 + t * 1.2)
    }
  }

  /** A soft round dab. */
  function dab(ctx, x, y, rad, colour, alpha) {
    ctx.globalAlpha = alpha
    ctx.fillStyle = colour
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  /** A little star of leaves: thin strokes out from a centre (the films' bushes and trees are made of these). */
  function star(ctx, x, y, size, colour, light) {
    const n = 9 + Math.floor(r(5))
    const turn = r(Math.PI)
    for (let k = 0; k < n; k++) {
      const a = turn + (k / n) * Math.PI * 2 + r(-0.15, 0.15)
      const len = size * r(0.7, 1)
      ctx.strokeStyle = k % 3 ? colour : light
      ctx.lineWidth = size * 0.16
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
      ctx.stroke()
    }
  }

  /** One clump of leaves: a dark round underneath, then leaf stars, darker below and lighter up towards the light (top left). */
  function leaves(ctx, x, y, rad, tones) {
    dab(ctx, x, y + rad * 0.1, rad * 0.92, tones[0], 1)
    const n = Math.round(rad * rad / 22)
    for (let i = 0; i < n; i++) {
      const a = r(Math.PI * 2)
      const d = Math.sqrt(random()) * rad
      const sx = x + Math.cos(a) * d
      const sy = y + Math.sin(a) * d
      const lit = (x - sx + (y - sy) * 1.3) / rad // towards the top left: more light
      const k = Math.max(0, Math.min(tones.length - 1, Math.round(1 + lit * 1.2 + r(-0.6, 0.6))))
      star(ctx, sx, sy, r(8, 13), tones[k], tones[Math.min(tones.length - 1, k + 1)])
    }
  }

  /** A bush or a tree, size [w, h]: a crown of several clumps (bigger ones low and behind); trunk: a tree. */
  function leafy(ctx, x, base, [w, h], tones, trunk = 0) {
    if (trunk) {
      ctx.strokeStyle = '#4e4030'
      ctx.lineWidth = Math.max(5, w * 0.06)
      ctx.beginPath()
      ctx.moveTo(x, base)
      ctx.quadraticCurveTo(x + r(-8, 8), base - trunk * 0.5, x + r(-10, 10), base - trunk - h * 0.3)
      for (const side of [-1, 1]) {
        ctx.moveTo(x, base - trunk * r(0.4, 0.7))
        ctx.quadraticCurveTo(x + side * w * 0.15, base - trunk * 0.9, x + side * w * r(0.2, 0.32), base - trunk - h * r(0.15, 0.4))
      }
      ctx.stroke()
    }
    const top = base - trunk - h
    const clumps = 3 + Math.floor((w / 60) + r(2))
    const spots = []
    for (let i = 0; i < clumps; i++) {
      const rad = Math.min(w, h) * r(0.22, 0.36)
      spots.push({ x: x + r(-0.5, 0.5) * (w - rad), y: top + rad + r() * (h - rad * 2), rad })
    }
    spots.sort((a, b) => b.rad - a.rad) // the big ones behind
    for (const s of spots) leaves(ctx, s.x, s.y, s.rad, tones)
  }

  /** A fan of long leaves from one root, as the films' palm-like plants. */
  function fan(ctx, x, base, size, colour, rib) {
    const n = 7 + Math.floor(r(4))
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + ((k / (n - 1)) - 0.5) * 2.4 + r(-0.08, 0.08)
      const len = size * r(0.75, 1)
      const tx = x + Math.cos(a) * len
      const ty = base + Math.sin(a) * len
      const nx = -Math.sin(a) * size * 0.11
      const ny = Math.cos(a) * size * 0.11
      const mx = (x + tx) / 2
      const my = (base + ty) / 2
      ctx.fillStyle = colour
      ctx.beginPath()
      ctx.moveTo(x, base)
      ctx.quadraticCurveTo(mx + nx, my + ny, tx, ty)
      ctx.quadraticCurveTo(mx - nx, my - ny, x, base)
      ctx.fill()
      ctx.strokeStyle = rib
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(x, base)
      ctx.lineTo(tx, ty)
      ctx.stroke()
    }
  }

  /** A fern frond: a curving stem with paired leaflets, smaller towards the tip. */
  function fern(ctx, x, base, len, lean, colour) {
    const steps = 18
    let px = x
    let py = base
    let a = -Math.PI / 2 + lean
    ctx.strokeStyle = colour
    for (let i = 0; i < steps; i++) {
      const seg = len / steps
      const nx = px + Math.cos(a) * seg
      const ny = py + Math.sin(a) * seg
      ctx.lineWidth = 2.2 - (i / steps) * 1.2
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(nx, ny)
      ctx.stroke()
      const leaf = len * 0.2 * (1 - i / steps) + 3
      for (const side of [-1, 1]) {
        const la = a + side * 1.1
        ctx.lineWidth = 2.6 * (1 - i / steps) + 0.8
        ctx.beginPath()
        ctx.moveTo(nx, ny)
        ctx.lineTo(nx + Math.cos(la) * leaf, ny + Math.sin(la) * leaf)
        ctx.stroke()
      }
      px = nx
      py = ny
      a += lean * 0.06
    }
  }

  /** A pine: a dark narrow cone, then tiers of drooping branch strokes on it. */
  function pine(ctx, x, base, h, colour, light) {
    ctx.fillStyle = colour
    ctx.beginPath()
    ctx.moveTo(x, base - h)
    ctx.lineTo(x + h * 0.2, base - h * 0.02)
    ctx.lineTo(x - h * 0.2, base - h * 0.02)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = colour
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, base)
    ctx.lineTo(x, base - h)
    ctx.stroke()
    const tiers = Math.round(h / 9)
    for (let i = 0; i < tiers; i++) {
      const y = base - h + (i / tiers) * h * 0.95
      const w = 4 + (i / tiers) * h * 0.26
      for (const side of [-1, 1]) {
        ctx.strokeStyle = i % 2 ? colour : light
        ctx.lineWidth = 2.4
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.quadraticCurveTo(x + side * w * 0.6, y + 1, x + side * w, y + w * 0.35)
        ctx.stroke()
      }
    }
  }

  /** A tall stem with bluebells hanging off it. */
  function bluebell(ctx, x, base, h) {
    ctx.strokeStyle = '#3f6a2a'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(x, base)
    ctx.quadraticCurveTo(x + r(-14, 14), base - h * 0.6, x + r(-8, 8), base - h)
    ctx.stroke()
    for (let k = 0; k < 5; k++) {
      const y = base - h * (0.45 + k * 0.12)
      const side = k % 2 ? 1 : -1
      const bx = x + side * r(10, 18)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + side * 8, y - 8, bx, y - 2)
      ctx.stroke()
      ctx.fillStyle = k % 2 ? '#6e5fc2' : '#7f6fd0'
      ctx.beginPath()
      ctx.moveTo(bx - 7, y + 14)
      ctx.quadraticCurveTo(bx - 7, y - 4, bx, y - 3)
      ctx.quadraticCurveTo(bx + 7, y - 4, bx + 7, y + 14)
      ctx.lineTo(bx + 3, y + 10)
      ctx.lineTo(bx, y + 15)
      ctx.lineTo(bx - 3, y + 10)
      ctx.closePath()
      ctx.fill()
    }
    fan(ctx, x, base, 34, '#4f7d33', '#2f5420')
  }

  /** A tall spike of yellow flowers (as behind his molehill in Krtek a buldozer). */
  function spike(ctx, x, base, h) {
    ctx.strokeStyle = '#4b6f2a'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x, base)
    ctx.lineTo(x + 4, base - h)
    ctx.stroke()
    for (let y = base - h * 0.45; y > base - h; y -= 7) {
      const t = (base - y) / h
      const w = 22 * (1.1 - t)
      for (const side of [-1, 1]) {
        const fx = x + 2 + side * r(3, w)
        ctx.fillStyle = r() < 0.7 ? '#f2c230' : '#e59a21'
        ctx.beginPath()
        ctx.arc(fx, y + r(-2, 2), r(3, 5), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    fan(ctx, x, base, 48, '#58803a', '#34582a')
  }

  /** A daisy: white petals round a yellow eye. */
  function daisy(ctx, x, y, size, petals = '#fbfbf2', eye = '#f2c230') {
    ctx.fillStyle = petals
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      ctx.beginPath()
      ctx.ellipse(x + Math.cos(a) * size * 0.6, y + Math.sin(a) * size * 0.6, size * 0.45, size * 0.22, a, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = eye
    ctx.beginPath()
    ctx.arc(x, y, size * 0.35, 0, Math.PI * 2)
    ctx.fill()
  }

  /** A cornflower: a small blue ragged star. */
  function cornflower(ctx, x, y, size) {
    ctx.strokeStyle = '#3d5fc4'
    ctx.lineWidth = size * 0.35
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + ((k / 6) - 0.5) * 2.6
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size)
      ctx.stroke()
    }
  }

  /** A low clump of the front's flowers: leaves, and daisies, red flowers or cornflowers on stems. */
  function clump(ctx, x, base) {
    const kind = pick(['daisy', 'red', 'blue', 'fan', 'daisy'])
    if (kind === 'fan') return fan(ctx, x, base, r(26, 40), '#2f5c25', '#1c3d17')
    const n = 2 + Math.floor(r(3))
    for (let k = 0; k < n; k++) {
      const fx = x + r(-22, 22)
      const top = base - r(18, 42)
      ctx.strokeStyle = '#3a6a28'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.moveTo(fx, base)
      ctx.quadraticCurveTo(fx + r(-6, 6), (base + top) / 2, fx, top)
      ctx.stroke()
      if (kind === 'daisy') daisy(ctx, fx, top, r(6, 9))
      else if (kind === 'red') daisy(ctx, fx, top, r(5, 7), '#d8473a', '#7a1f17')
      else cornflower(ctx, fx, top, r(6, 9))
    }
    for (let k = 0; k < 4; k++) blade(ctx, x + r(-16, 16), base, r(10, 18), '#2f5c25', 2.4)
  }

  // ------------------------------------------------------------ the layers

  /** The sky's wash of cloud: soft white blotches in bands, lilac towards the horizon. */
  function clouds(ctx) {
    for (let i = 0; i < 260; i++) {
      const band = r() < 0.5 ? r(60, 220) : r(240, 470)
      dab(ctx, r(-200, 1800), band, r(30, 90), r() < 0.8 ? '#ffffff' : '#d9d2f0', r(0.03, 0.08))
    }
    const g = ctx.createLinearGradient(0, 380, 0, 640)
    g.addColorStop(0, 'rgba(225,215,240,0)')
    g.addColorStop(1, 'rgba(225,215,240,0.45)')
    ctx.fillStyle = g
    ctx.fillRect(-200, 380, 2000, 260)
  }

  /** Far off: a misty band of pines and sponged round trees, low in contrast, fading into haze at the foot. */
  function far(ctx, w) {
    for (let x = -40; x < w + 40; x += r(40, 90)) {
      const base = 640 - r(0, 20)
      if (r() < 0.45) pine(ctx, x, base, r(110, 200), '#6f9484', '#8eae9f')
      else {
        const cw = r(70, 140)
        const ch = r(80, 150)
        for (let k = 0; k < (cw * ch) / 70; k++) {
          const a = r(Math.PI * 2)
          const d = Math.sqrt(random())
          dab(ctx, x + Math.cos(a) * d * cw * 0.5, base - ch * 0.55 + Math.sin(a) * d * ch * 0.5, r(5, 11), pick(['#7fa38a', '#98b89e', '#6c927b', '#adc8ae']), 0.8)
        }
      }
    }
    const mist = ctx.createLinearGradient(0, 470, 0, 650)
    mist.addColorStop(0, 'rgba(232,236,244,0)')
    mist.addColorStop(1, 'rgba(232,236,244,0.55)')
    ctx.fillStyle = mist
    ctx.fillRect(-60, 470, w + 120, 190)
  }

  const open = (x) => x > OPEN.from && x < OPEN.to

  /** Nearer: bushes and trees along the meadow's far edge, the bluebells and the spike behind his molehill, ferns by the spring; and grass. */
  function back(ctx) {
    const W = Layout.WORLD_W
    const edge = 628 // where the meadow meets the bushes
    const greens = [['#244529', '#335c34', '#4a7843', '#6d9a58', '#a2c47e'], ['#33491b', '#476a27', '#62893a', '#86a94f', '#bccd77'], ['#22443a', '#345f4d', '#4f8068', '#76a48a', '#a9cbb2']]
    // the forest's edge at the left, a few trees and bushes along the rest, none on the poles' hill
    for (let x = -60; x < W + 60; x += r(70, 150)) {
      if (open(x)) continue
      const forest = x < 520 || x > W - 300
      const kind = r()
      const tones = pick(greens)
      if (forest || kind < 0.3) leafy(ctx, x, edge + r(4, 16), [r(150, 280), r(150, 280)], tones, r(50, 150))
      else if (kind < 0.42) pine(ctx, x, edge + r(6, 14), r(180, 300), '#2f5640', '#46705a')
      else if (kind < 0.75) leafy(ctx, x, edge + r(6, 18), [r(90, 160), r(60, 110)], tones)
      else fan(ctx, x, edge + r(8, 18), r(50, 80), pick(['#4b7a3a', '#5d8a44', '#3e6b45']), '#2a4a25')
      if (!forest && r() < 0.5) leafy(ctx, x + r(-60, 60), edge + r(14, 22), [r(70, 120), r(40, 70)], pick(greens)) // undergrowth at their feet
    }
    // the meadow beyond, behind the bushes' feet: the grass
    grass(ctx, [-60, W + 60, edge - 4, 730], 0.012, ['#86b866', '#9bc778', '#b2d68e', '#78ab5a'], [4, 8])
    // behind his molehill: the yellow spike and bluebells (Krtek a buldozer, his flower bed)
    spike(ctx, Layout.HOME - 130, 690, 230)
    bluebell(ctx, Layout.HOME - 210, 696, 170)
    bluebell(ctx, Layout.HOME + 150, 690, 150)
    // by the spring: big fern fronds behind its rock, as the spring in the film's opening
    const S = Layout.SPRING
    for (const [dx, len, lean] of [[40, 230, -0.5], [110, 260, -0.15], [180, 240, 0.25], [250, 200, 0.55], [-30, 170, -0.75]]) fern(ctx, S + 120 + dx, 668, len, lean, pick(['#2f5a3a', '#3d6c46', '#28503a']))
    // bluebells here and there
    for (const x of [380, 2780, 3420]) bluebell(ctx, x, 690, r(130, 180))
  }

  /** In front: grass strokes, denser and darker towards the bottom, and low clumps of flowers along the edge. */
  function front(ctx) {
    const W = Layout.WORLD_W
    // the seam with the meadow beyond, painted over: the front's grass reaches up into it
    grass(ctx, [-60, W + 60, 704, 740], 0.03, ['#86b866', '#7cb15c', '#6ea64c'], [6, 10])
    grass(ctx, [-60, W + 60, 712, 900], 0.022, ['#5f9a42', '#77ad52', '#4e8836', '#8cc163', '#3f7429'], [7, 13])
    for (let x = 20; x < W; x += r(90, 220)) clump(ctx, x, r(866, 898))
  }

  /** The flower bed: a dense mass of pink daisies, cornflowers and leaves round the tulips (drawn on top: meadow.js). */
  function bed(ctx, x0, x1) {
    for (let i = 0; i < 70; i++) fan(ctx, r(x0, x1), r(800, 850), r(18, 32), pick(['#3f7d22', '#4d6d1f', '#5a8a35']), '#2a4a17')
    for (let i = 0; i < 90; i++) {
      const x = r(x0, x1)
      const y = r(745, 845)
      if (r() < 0.55) daisy(ctx, x, y, r(6, 10), pick(['#f08fa6', '#f6b3c4', '#e46f8e']), '#f2c230')
      else cornflower(ctx, x, y, r(7, 10))
    }
  }

  // ------------------------------------------------------------ public

  let cloudImg = null

  /**
   * Paint the meadow into its layers: the clouds into the sky, the far
   * trees, the back and the front, and the flower bed's mass.
   * @param {{sky: Element, far: Element, back: Element, front: Element, bed: Element}} into
   * @param {number} pxPerUnit how many screen pixels a scene unit is
   */
  function paint(into, pxPerUnit) {
    res = Math.max(RES[0], Math.min(RES[1], pxPerUnit))
    const farW = Layout.WORLD_W / 2 + Layout.VIEW_W // the far trees scroll at half speed (view.js)
    cloudImg = place(into.sky, layer(-200, -100, 2000, 740, clouds))
    place(into.far, layer(-60, 380, farW + 120, 290, (ctx) => far(ctx, farW)))
    place(into.back, layer(-60, 140, Layout.WORLD_W + 120, 590, back))
    place(into.front, layer(-60, 690, Layout.WORLD_W + 120, 210, front))
    const { from, to } = Layout.BED
    place(into.bed, layer(from - 30, 720, to - from + 60, 150, (ctx) => bed(ctx, from - 10, to + 10)))
    Debug.trace('painted', { res: Math.round(res * 100) / 100 })
  }

  /** How much of the clouds' wash shows: fading as the sky darkens (light: 0 night to 1 day). */
  function cloudsAt(light) {
    if (cloudImg) cloudImg.style.opacity = String(Math.max(0, Math.min(1, light)))
  }

  return { paint, cloudsAt }
})()
