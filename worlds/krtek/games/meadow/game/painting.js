// The meadow painted the way the films' backgrounds are (Krtek a buldozer,
// Krtek a vejce): a pale blue sky with a watercolour wash of cloud; far off,
// a misty band of pines and sponged round trees; nearer, bushes made of
// little stars of leaves, fans of long leaves, big fern fronds by the spring,
// tall bluebells and a yellow flower spike behind his molehill; grass
// painted in fine strokes, daisies and small flowers along the front; the
// flower bed a dense mass of daisies and cornflowers round the tulips; and
// at the left end the old oak with its arch (after Krtek a hodinářem).
//
// Each layer is painted once, with brush strokes made in code from a fixed
// seed (the same meadow every play), onto a canvas, and shown as one image
// in its layer (index.html): a few bitmaps to draw as the view moves, not
// thousands of shapes. Nothing here moves or changes after it is painted,
// except the clouds' wash fading at night (cloudsAt).

/* global Autumn, Debug, Layout, Path2D */
/* exported Painting */
const Painting = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const RES = [0.75, 1.5] // canvas pixels per scene unit: as sharp as the screen shows the scene, within this (memory: the back is 4000 units wide)
  const GARDEN_BOX = [3240, 300, 1100, 420] // what the painter's garden covers (x, y, w, h): his cottage, the tins in front, past the meadow's end for wide screens
  const OAK_BOX = [-60, -80, 640, 800] // what the oak's painting covers (x, y, w, h): its long right limb reaches past x 540
  const GRAIN = 2 // the oak's bark is worked out on a grid this coarse (scene units): fine enough for its ridges, quick
  const RIDGE = 16 // one ridge of its bark to the next, across the wood: near the film's (a tenth of the mole's height); wider, and the ripples break them into blobs
  const OPEN = { from: 1400, to: 2080 } // the poles' hill: open grass, nothing tall where they land far off (poles.js FAR)
  let random = Debug.random('meadow-painting') // its own stream: so many draws must not shift the others (tree() lends another)
  const GREENS = [['#244529', '#335c34', '#4a7843', '#6d9a58', '#a2c47e'], ['#33491b', '#476a27', '#62893a', '#86a94f', '#bccd77'], ['#22443a', '#345f4d', '#4f8068', '#76a48a', '#a9cbb2']] // the leaves' tones, dark to light
  const r = (a = 1, b) => (b == null ? random() * a : a + random() * (b - a))
  const pick = (list) => list[Math.floor(random() * list.length)]
  let res = 1
  const perches = [] // where the far trees' crowns are, for the birds (flock.js)

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
    const greens = GREENS
    // the forest's edge at the left, a few trees and bushes along the rest, none on the poles' hill
    for (let x = -60; x < W + 60; x += r(70, 150)) {
      if (open(x)) continue
      const forest = x < 520 || x > W - 300
      const kind = r()
      const tones = pick(greens)
      if (forest || kind < 0.3) {
        const [base, size, trunk] = [edge + r(4, 16), [r(150, 280), r(150, 280)], r(50, 150)] // drawn in the order leafy's arguments were
        leafy(ctx, x, base, size, tones, trunk)
        perches.push({ x, y: base - trunk - size[1] * 0.85 }) // near its crown's top: the far trees' birds sit there (flock.js)
      } else if (kind < 0.42) pine(ctx, x, edge + r(6, 14), r(180, 300), '#2f5640', '#46705a')
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
    for (const x of [380, 2780, 3150]) bluebell(ctx, x, 690, r(130, 180))
  }

  /** The spring's rock cliff (spring.js draws the water over it): boulders piled up, sponged in
   * greys and browns, darker below and wet behind the waterfall, moss on their tops, ferns at
   * their feet. Each stone: [x, foot y, half width, height]. */
  function rocks(ctx) {
    const S = Layout.SPRING
    const stones = [[S + 330, 712, 190, 270], [S + 470, 700, 110, 190], [S + 170, 714, 120, 150], [S + 290, 540, 120, 150, true], [S + 60, 716, 70, 70]]
    for (const [x, foot, w, h, whole] of stones) {
      // a lumpy dome standing on the ground, or (whole) a lumpy round stone up on the others
      const pts = []
      const n = whole ? 24 : 16
      for (let k = 0; k <= n; k++) {
        const a = whole ? (k / n) * Math.PI * 2 : Math.PI + (k / n) * Math.PI
        const wob = 0.88 + r(0.14)
        pts.push([x + Math.cos(a) * w * wob, (whole ? foot - h / 2 : foot) + Math.sin(a) * (whole ? h / 2 : h) * wob])
      }
      const outline = () => {
        ctx.beginPath()
        pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
        ctx.closePath()
      }
      outline()
      ctx.save()
      ctx.clip()
      const g = ctx.createLinearGradient(0, foot - h, 0, foot)
      g.addColorStop(0, '#a89d88')
      g.addColorStop(1, '#5f574a')
      ctx.fillStyle = g
      ctx.fillRect(x - w - 10, foot - h - 10, w * 2 + 20, h + 20)
      for (let i = 0; i < (w * h) / 40; i++) dab(ctx, x + r(-w, w), foot - r(h), r(4, 12), pick(['#8b8170', '#b3a892', '#6f6656', '#9a8c6a', '#c2b8a2']), r(0.25, 0.6))
      for (let i = 0; i < w / 2; i++) dab(ctx, x + r(-w * 0.8, w * 0.8), foot - h + r(h * 0.25), r(5, 13), pick(['#5d7a3a', '#6f8f45', '#4c6a30']), r(0.5, 0.85)) // moss on top
      ctx.restore()
      outline() // the dabs used the path: draw the stone's own again for its line
      ctx.strokeStyle = '#2f2a22'
      ctx.lineWidth = 3
      ctx.stroke()
    }
    // wet, dark stone where the water runs down
    ctx.globalAlpha = 0.45
    ctx.fillStyle = '#3d4a58'
    ctx.beginPath()
    ctx.ellipse(S + 205, 600, 46, 120, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    // ferns and leaves at their feet
    for (const [x, len, lean] of [[S - 150, 120, -0.6], [S - 120, 140, -0.3], [S + 560, 150, 0.4], [S + 590, 120, 0.7], [S + 520, 130, 0.2]]) fern(ctx, x, 716, len, lean, pick(['#2f5a3a', '#3d6c46', '#28503a']))
    for (const x of [S - 170, S + 610]) fan(ctx, x, 716, 60, '#4b7a3a', '#2a4a25')
  }

  /** One of the oak's leaves: rounded lobes fanned from its stalk (the films' oak leaves are pale, lobed, like a hand). */
  function oakLeaf(ctx, x, y, size, colour, turn) {
    ctx.fillStyle = colour
    ctx.beginPath() // one path, one fill: thousands of leaves
    for (let k = -2; k <= 2; k++) {
      const a = turn + k * 0.5
      const [cx, cy] = [x + Math.cos(a) * size * 0.5, y + Math.sin(a) * size * 0.5]
      const rad = size * (k ? 0.3 : 0.36)
      ctx.moveTo(cx + rad, cy)
      ctx.arc(cx, cy, rad, 0, Math.PI * 2)
    }
    ctx.fill()
  }

  /** A broken-off limb out of the oak's right side, round Layout.OAK.perch (the owl's, owl.js), its torn end pale. */
  function limb(ctx) {
    const { x: px, y: py } = Layout.OAK.perch
    const stub = new Path2D(`M${px - 54} ${py + 10} C${px - 28} ${py + 2} ${px - 2} ${py - 6} ${px + 18} ${py - 14} C${px + 26} ${py - 10} ${px + 28} ${py + 4} ${px + 21} ${py + 9} C${px} ${py + 16} ${px - 24} ${py + 26} ${px - 50} ${py + 44} Z`)
    ctx.fillStyle = '#7d7366'
    ctx.fill(stub)
    ctx.strokeStyle = '#4a4239'
    ctx.lineWidth = 1.6
    for (const dy of [-4, 6]) {
      ctx.beginPath()
      ctx.moveTo(px - 46, py + 22 + dy)
      ctx.quadraticCurveTo(px - 16, py + 10 + dy, px + 14, py - 3 + dy / 2)
      ctx.stroke()
    }
    ctx.strokeStyle = '#2f2a22'
    ctx.lineWidth = 3
    ctx.stroke(stub)
    ctx.fillStyle = '#c4b393'
    ctx.beginPath()
    ctx.ellipse(px + 22, py - 2, 4, 11, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = 1.6
    ctx.stroke()
  }

  /** The old oak at the meadow's left end, after Krtek a hodinářem (1:00-1:24): a huge grey-brown trunk on
   * flared roots, an arch between its root legs, twisting limbs up into clusters of pale lobed leaves, ferns
   * at its foot; and at the picture's edge the wood running on, darker. Its bark as the film paints it: long
   * wavy ridges that follow the wood, up the trunk and out along each limb, wrapping round the arch and the
   * knot-hole (here: lines of equal distance from its outline, made wavy). Layout.OAK says its shape. */
  function oak(ctx) {
    const { x: archX, trunk, arch, crown } = Layout.OAK
    const [X0, Y0, W, H] = OAK_BOX
    const body = new Path2D(trunk)
    const knot = new Path2D()
    knot.ellipse(...Layout.OAK.knot, 0, Math.PI * 2)
    ctx.save()
    ctx.clip(body)
    const grain = barkGrain(body, new Path2D(arch), knot)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(grain.picture, X0, Y0, W, H) // the ridges, soft, as painted
    for (let i = 0; i < 140; i++) dab(ctx, r(-40, 540), r(-60, 716), r(10, 34), pick(['#8a7f72', '#6b6259', '#a39889', '#8d8494', '#9a90a0', '#7f8a78']), r(0.06, 0.16)) // grey-brown, lavender and moss in places, as the film's
    // each ridge's groove, dark, and the light catching its edge
    for (const [at, colour, width, alpha] of [[0.78, '#352d26', 3.2, 0.34], [0.32, '#ddd3c0', 2.2, 0.26]]) {
      ctx.strokeStyle = colour
      ctx.lineWidth = width
      ctx.globalAlpha = alpha
      ctx.stroke(grain.lines(at))
    }
    ctx.globalAlpha = 1
    // shadow round the arch, and down the trunk's right, away from the light
    const shade = ctx.createRadialGradient(archX, 600, 40, archX, 600, 210)
    shade.addColorStop(0, 'rgba(40, 32, 26, 0.5)')
    shade.addColorStop(1, 'rgba(40, 32, 26, 0)')
    ctx.fillStyle = shade
    ctx.fillRect(-60, 380, 560, 340)
    const side = ctx.createLinearGradient(140, 0, 420, 0)
    side.addColorStop(0, 'rgba(40, 32, 26, 0)')
    side.addColorStop(1, 'rgba(40, 32, 26, 0.3)')
    ctx.fillStyle = side
    ctx.fillRect(140, 180, 300, 540)
    ctx.restore()
    ctx.strokeStyle = '#2f2a22'
    ctx.lineWidth = 3
    ctx.stroke(body)
    // the arch: dark inside, deepest at its back
    const hollow = new Path2D(arch)
    const dark = ctx.createLinearGradient(0, 444, 0, 716)
    dark.addColorStop(0, '#1e1813')
    dark.addColorStop(1, '#3a2f25')
    ctx.fillStyle = dark
    ctx.fill(hollow)
    ctx.stroke(hollow)
    // the knot-hole up on the left, the ridges wrapping round it
    ctx.fillStyle = '#231c16'
    ctx.fill(knot)
    ctx.stroke(knot)
    limb(ctx)
    // the crown: clumps of pale lobed leaves, darker underneath; in autumn a horse chestnut's (autumn.js)
    const tones = ['#2f5548', '#4a7a66', '#6c9c84', '#9dc3a7', '#c3dcc2']
    if (!autumn()) for (const [x, y, rad] of crown) { // in autumn a chestnut's, painted over the turned layer (paint): its green husks must stay green
      dab(ctx, x, y + rad * 0.1, rad * 0.9, tones[0], 1)
      for (let i = 0, n = Math.round(rad * rad / 30); i < n; i++) {
        const a = r(Math.PI * 2)
        const d = Math.sqrt(random()) * rad
        const [lx, ly] = [x + Math.cos(a) * d, y + Math.sin(a) * d]
        const lit = (x - lx + (y - ly) * 1.3) / rad
        oakLeaf(ctx, lx, ly, r(13, 19), tones[Math.max(0, Math.min(tones.length - 1, Math.round(1.6 + lit * 1.3 + r(-0.6, 0.6))))], r(Math.PI * 2))
      }
    }
    // ferns at its feet, either side of the arch
    for (const [x, len, lean] of [[-6, 170, -0.5], [44, 140, -0.25], [300, 130, 0.3], [360, 170, 0.6], [420, 120, 0.8]]) fern(ctx, x, 718, len, lean, pick(['#2f5a3a', '#3d6c46', '#28503a']))
    // the wood running on past the picture's edge: darker towards it
    const deep = ctx.createLinearGradient(-60, 0, 70, 0)
    deep.addColorStop(0, 'rgba(24, 34, 26, 0.55)')
    deep.addColorStop(1, 'rgba(24, 34, 26, 0)')
    ctx.fillStyle = deep
    ctx.fillRect(-60, -80, 130, 800)
  }

  /** How far each cell of a mask (RGBA, `cols` by `rows`) is inside it, in cells, by a two-pass chamfer.
   * Past the grid's edge counts as inside, so only the mask's own edges count. */
  function inside(alpha, cols, rows) {
    const d = new Float32Array(cols * rows)
    for (let i = 0; i < d.length; i++) d[i] = alpha[i * 4 + 3] > 127 ? 1e6 : 0
    const D = Math.SQRT2
    const at = (c, rr) => (c < 0 || rr < 0 || c >= cols || rr >= rows ? 1e6 : d[rr * cols + c])
    for (let rr = 0; rr < rows; rr++) {
      for (let c = 0; c < cols; c++) {
        const i = rr * cols + c
        if (d[i]) d[i] = Math.min(d[i], at(c - 1, rr) + 1, at(c, rr - 1) + 1, at(c - 1, rr - 1) + D, at(c + 1, rr - 1) + D)
      }
    }
    for (let rr = rows - 1; rr >= 0; rr--) {
      for (let c = cols - 1; c >= 0; c--) {
        const i = rr * cols + c
        if (d[i]) d[i] = Math.min(d[i], at(c + 1, rr) + 1, at(c, rr + 1) + 1, at(c + 1, rr + 1) + D, at(c - 1, rr + 1) + D)
      }
    }
    return d
  }

  /** Where level 0 crosses a grid cell whose corners (top left, top right, bottom right, bottom left) are
   * a, b, c, d over it, the cell's top left at x, y: the line's ends, in pairs. */
  function crossings(a, b, c, d, x, y) {
    const cut = (p, q) => p / (p - q)
    const pts = []
    if (a < 0 !== b < 0) pts.push([x + cut(a, b) * GRAIN, y])
    if (b < 0 !== c < 0) pts.push([x + GRAIN, y + cut(b, c) * GRAIN])
    if (d < 0 !== c < 0) pts.push([x + cut(d, c) * GRAIN, y + GRAIN])
    if (a < 0 !== d < 0) pts.push([x, y + cut(a, d) * GRAIN])
    return pts
  }

  /** The oak's bark, worked out on a coarse grid over OAK_BOX: how far each point is inside the wood (from
   * its outline, the arch and the knot-hole; not from the ground or the picture's edges, where the wood runs
   * on), made wavy. `picture`: a small canvas of the ridges' light and shade, to be drawn smoothed over the
   * box; `lines(at)`: a path along every ridge at `at` (0 to 1) across it. */
  function barkGrain(body, hole, knot) {
    const [X0, Y0, W, H] = OAK_BOX
    const [cols, rows] = [Math.ceil(W / GRAIN), Math.ceil(H / GRAIN)]
    const mask = document.createElement('canvas')
    mask.width = cols
    mask.height = rows
    const m = mask.getContext('2d')
    m.setTransform(1 / GRAIN, 0, 0, 1 / GRAIN, -X0 / GRAIN, -Y0 / GRAIN)
    m.fill(body)
    m.globalCompositeOperation = 'destination-out'
    m.fill(hole)
    m.fill(knot)
    const d = inside(m.getImageData(0, 0, cols, rows).data, cols, rows)
    // made wavy, as the film's ridges are: more so away from the outline, which stays clean
    const [p1, p2, p3] = [r(Math.PI * 2), r(Math.PI * 2), r(Math.PI * 2)]
    const f = new Float32Array(cols * rows)
    for (let rr = 0; rr < rows; rr++) {
      for (let c = 0; c < cols; c++) {
        const [x, y] = [X0 + c * GRAIN, Y0 + rr * GRAIN]
        const i = rr * cols + c
        // ripples along each ridge, as the film's: gentle enough (its slope well under the wood's) not to break the ridges into loops
        const wave = 3.4 * Math.sin(y * 0.15 + 2.2 * Math.sin(x * 0.03 + p1)) + 2.6 * Math.sin(x * 0.14 + 2.2 * Math.sin(y * 0.028 + p2)) + 1.6 * Math.sin((x - y) * 0.05 + p3)
        f[i] = d[i] * GRAIN + wave * Math.min(1, (d[i] * GRAIN) / 12)
      }
    }
    // the ridges' light and shade: lit from the top left, each ridge rounded, a little lavender and moss
    const picture = document.createElement('canvas')
    picture.width = cols
    picture.height = rows
    const pc = picture.getContext('2d')
    const img = pc.createImageData(cols, rows)
    const [light, darkTone] = [[166, 157, 144], [84, 76, 70]]
    for (let rr = 0; rr < rows; rr++) {
      for (let c = 0; c < cols; c++) {
        const [x, y] = [X0 + c * GRAIN, Y0 + rr * GRAIN]
        const i = rr * cols + c
        const t = Math.max(0, Math.min(1, ((x + 40) / 480) * 0.75 + (y / 720) * 0.25))
        const ridge = 0.88 + 0.16 * Math.sin((f[i] / RIDGE) * Math.PI * 2)
        const tint = Math.sin(x * 0.011 + y * 0.007 + p3)
        const k = [tint * 6, -tint * 2, tint * 8] // lavender one way, moss the other
        for (let ch = 0; ch < 3; ch++) img.data[i * 4 + ch] = Math.max(0, Math.min(255, (light[ch] + (darkTone[ch] - light[ch]) * t + k[ch]) * ridge))
        img.data[i * 4 + 3] = 255
      }
    }
    pc.putImageData(img, 0, 0)

    /** Marching squares: the ridge lines at `at` across each, through the grid. */
    function lines(at) {
      const path = new Path2D()
      const levels = []
      for (let k = 0; (k + at) * RIDGE < 400; k++) levels.push((k + at) * RIDGE)
      for (let rr = 0; rr < rows - 1; rr++) {
        for (let c = 0; c < cols - 1; c++) {
          const i = rr * cols + c
          const [a, b, cc, dd] = [f[i], f[i + 1], f[i + cols + 1], f[i + cols]] // round the cell: top left, top right, bottom right, bottom left
          if (!d[i] || !d[i + 1] || !d[i + cols] || !d[i + cols + 1]) continue // the outline is drawn on its own
          const lo = Math.min(a, b, cc, dd)
          const hi = Math.max(a, b, cc, dd)
          for (const v of levels) {
            if (v < lo || v > hi) continue
            const pts = crossings(a - v, b - v, cc - v, dd - v, X0 + c * GRAIN, Y0 + rr * GRAIN)
            for (let q = 0; q + 1 < pts.length; q += 2) {
              path.moveTo(...pts[q])
              path.lineTo(...pts[q + 1])
            }
          }
        }
      }
      return path
    }
    return { picture, lines }
  }

  /** The painter's cottage at the right end, after Krtek malířem: a thatched roof over plastered walls and
   * a gable of upright planks, small windows with crossed frames, a chimney, a ladder leaning on the wall,
   * and his paint tins about the garden in front (they show between the fence's palings). */
  function garden(ctx) {
    const { cottage: cx } = Layout.FENCE
    const [w, base, wall] = [360, 640, 120] // the cottage's width, where it stands, its walls' height
    const [l, rr] = [cx - w / 2, cx + w / 2]
    const eave = base - wall
    const ridge = eave - 150
    const gable = cx + w * 0.12 // the gable end, towards us on the right, as the film's
    ctx.lineWidth = 3
    ctx.strokeStyle = '#2f2a22'
    // the walls: whitewash, a little pink in the shade, and the gable's planks
    ctx.fillStyle = '#ead9cf'
    ctx.fillRect(l, eave, w, wall)
    for (let i = 0; i < 40; i++) dab(ctx, r(l, rr), r(eave, base), r(6, 16), pick(['#d9c3b8', '#f3e6dc', '#cdb2a8']), r(0.2, 0.45))
    ctx.strokeRect(l, eave, w, wall)
    ctx.beginPath()
    ctx.moveTo(gable, base)
    ctx.lineTo(gable, eave - 6)
    ctx.lineTo((gable + rr) / 2, ridge + 30)
    ctx.lineTo(rr + 4, eave - 6)
    ctx.lineTo(rr + 4, base)
    ctx.closePath()
    ctx.fillStyle = '#9a6a3e'
    ctx.fill()
    ctx.stroke()
    ctx.save()
    ctx.clip()
    ctx.lineWidth = 2
    for (let x = gable + 10; x < rr; x += 13) {
      ctx.strokeStyle = pick(['#6e4a2a', '#7d5634', '#5e3e22'])
      ctx.beginPath()
      ctx.moveTo(x + r(-1, 1), ridge)
      ctx.lineTo(x + r(-1, 1), base)
      ctx.stroke()
    }
    ctx.restore()
    // the windows and the door
    ctx.lineWidth = 3
    ctx.strokeStyle = '#2f2a22'
    for (const x of [l + 50, l + 140]) {
      ctx.fillStyle = '#3c4a52'
      ctx.fillRect(x, eave + 30, 34, 30)
      ctx.strokeRect(x, eave + 30, 34, 30)
      ctx.beginPath()
      ctx.moveTo(x + 17, eave + 30)
      ctx.lineTo(x + 17, eave + 60)
      ctx.moveTo(x, eave + 45)
      ctx.lineTo(x + 34, eave + 45)
      ctx.strokeStyle = '#f3e6dc'
      ctx.stroke()
      ctx.strokeStyle = '#2f2a22'
    }
    ctx.fillStyle = '#3a2a1c'
    ctx.fillRect(l + 214, eave + 36, 38, wall - 36)
    ctx.strokeRect(l + 214, eave + 36, 38, wall - 36)
    roofAndLadder(ctx, l, rr, base, gable)
    tins(ctx, l, rr, base)
  }

  /** The cottage's thatched roof (from l to the gable), its chimney, and the ladder leaning on its wall. */
  function roofAndLadder(ctx, l, rr, base, gable) {
    const eave = base - 120
    const ridge = eave - 150
    // the thatch: a heavy roof of straw, its strokes running down, its edge ragged
    const roof = new Path2D()
    roof.moveTo(l - 26, eave + 10)
    roof.lineTo(l + 40, ridge)
    roof.lineTo((gable + rr) / 2, ridge)
    roof.lineTo(gable - 4, eave + 14)
    roof.closePath()
    ctx.fillStyle = '#a5864e'
    ctx.fill(roof)
    ctx.save()
    ctx.clip(roof)
    for (let i = 0; i < 520; i++) {
      const x = r(l - 30, gable + 10)
      const y = r(ridge, eave + 14)
      ctx.strokeStyle = pick(['#8a6c38', '#c2a266', '#76592c', '#b39358', '#d1b57c'])
      ctx.globalAlpha = r(0.4, 0.8)
      ctx.lineWidth = r(1.2, 2.4)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - r(2, 6), y + r(14, 26))
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.restore()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#2f2a22'
    ctx.stroke(roof)
    // the chimney
    ctx.fillStyle = '#c9b6a6'
    ctx.fillRect(l + 92, ridge - 34, 26, 52)
    ctx.strokeRect(l + 92, ridge - 34, 26, 52)
    // the ladder, leaning on the wall by the door
    ctx.strokeStyle = '#6e4a2a'
    ctx.lineWidth = 4
    const [lx, ly] = [l + 286, base]
    ctx.beginPath()
    ctx.moveTo(lx, ly)
    ctx.lineTo(lx + 26, eave - 40)
    ctx.moveTo(lx + 26, ly)
    ctx.lineTo(lx + 52, eave - 40)
    for (let k = 1; k < 7; k++) {
      const t = k / 7
      ctx.moveTo(lx + 26 * t, ly + (eave - 40 - ly) * t)
      ctx.lineTo(lx + 26 + 26 * t, ly + (eave - 40 - ly) * t)
    }
    ctx.stroke()
  }

  /** The painter's tins about his garden from l to past r, in rows from `base`: lids off, a band of colour, brushes in some. */
  function tins(ctx, l, rr, base) {
    grass(ctx, [l - 80, rr + 260, base - 6, 700], 0.02, ['#86b866', '#9bc778', '#78ab5a'], [4, 8])
    for (let row = 0; row < 3; row++) {
      for (let x = l - 40 + row * 14; x < rr + 220; x += r(30, 46)) {
        const y = base + 14 + row * 16
        const [tw, th] = [r(16, 22), r(16, 22)]
        ctx.fillStyle = '#c9ccd4'
        ctx.fillRect(x - tw / 2, y - th, tw, th)
        ctx.lineWidth = 2
        ctx.strokeRect(x - tw / 2, y - th, tw, th)
        ctx.fillStyle = pick(Layout.PAINTS)
        ctx.beginPath()
        ctx.ellipse(x, y - th, tw / 2, 4, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillRect(x - tw / 2 + 2, y - th * 0.6, tw - 4, th * 0.25) // its band of colour
        if (r() < 0.3) {
          ctx.strokeStyle = '#6e4a2a'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(x, y - th)
          ctx.lineTo(x + r(-8, 8), y - th - 22)
          ctx.stroke()
          ctx.strokeStyle = '#2f2a22'
        }
      }
    }
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
    for (let i = 0; i < 60; i++) fan(ctx, r(x0, x1), r(690, 712), r(14, 24), pick(['#3f7d22', '#4d6d1f', '#5a8a35']), '#2a4a17')
    for (let i = 0; i < 90; i++) {
      const x = r(x0, x1)
      const y = r(650, 708)
      if (r() < 0.55) daisy(ctx, x, y, r(6, 10), pick(['#f08fa6', '#f6b3c4', '#e46f8e']), '#f2c230')
      else cornflower(ctx, x, y, r(7, 10))
    }
  }

  // ------------------------------------------------------------ public

  let cloudImg = null

  /**
   * Paint the meadow into its layers: the clouds into the sky, the far
   * trees, the back and the front, the flower bed's mass, the oak, and the painter's garden.
   * @param {{sky: Element, far: Element, back: Element, front: Element, bed: Element, rocks?: Element, oak?: Element, garden?: Element}} into
   * @param {number} pxPerUnit how many screen pixels a scene unit is
   */
  function paint(into, pxPerUnit) {
    res = Math.max(RES[0], Math.min(RES[1], pxPerUnit))
    const farW = Layout.WORLD_W / 2 + Layout.VIEW_W // the far trees scroll at half speed (view.js)
    cloudImg = place(into.sky, layer(-200, -100, 2000, 740, clouds))
    place(into.far, layer(-60, 380, farW + 120, 290, fall((ctx) => far(ctx, farW), 0.7, 0.16))) // the far pines keep some green
    place(into.back, layer(-60, 140, Layout.WORLD_W + 120, 590, fall(back)))
    if (into.rocks) place(into.rocks, layer(Layout.SPRING - 240, 360, 900, 370, fall(rocks, 0.8)))
    const chestnut = (ctx) => { // the turned oak, then the chestnut's crown over it, untouched by the turning
      fall(oak, 1, 0.05)(ctx)
      Autumn.crown(ctx, Layout.OAK.crown, dab)
    }
    if (into.oak) withStream(Debug.random('meadow-oak-painting'), 1, () => place(into.oak, layer(...OAK_BOX, autumn() ? chestnut : oak), into.oak.firstChild)) // its own stream: painted last, it shifts nothing else (none on the front page's card)
    if (into.garden) withStream(Debug.random('meadow-garden-painting'), 1, () => place(into.garden, layer(...GARDEN_BOX, fall(garden, 0.8)))) // its own stream: it shifts nothing else
    place(into.front, layer(-60, 690, Layout.WORLD_W + 120, 210, fall(front, 1, 0.06)))
    const { from, to } = Layout.BED
    place(into.bed, layer(from - 30, 610, to - from + 60, 110, fall((ctx) => bed(ctx, from - 10, to + 10))))
    if (autumn()) Autumn.forget()
    Debug.trace('painted', { res: Math.round(res * 100) / 100 })
  }

  /** How much of the clouds' wash shows: fading as the sky darkens (light: 0 night to 1 day). */
  function cloudsAt(light) {
    if (cloudImg) cloudImg.style.opacity = String(Math.max(0, Math.min(1, light)))
  }

  /** A young tree painted as the meadow's are (leaf stars on a thin trunk), its foot at 0, 0, as an image in
   * `parent`: for a tree that must move (the bulldozer fells them: poles.js). Crown [w, h] over a trunk
   * this tall; painted `sharp` times finer (it is shown that much bigger), drawn from `stream` so it shifts
   * nothing else. */
  function tree(parent, [w, h], trunk, stream, sharp = 1) {
    return withStream(stream, sharp, () => {
      const tones = pick(GREENS)
      return place(parent, layer(-w / 2 - 20, -(trunk + h) - 20, w + 40, trunk + h + 40, fall((ctx) => leafy(ctx, 0, 0, [w, h], tones, trunk))))
    })
  }

  const autumn = () => Layout.season === 'autumn' && typeof Autumn !== 'undefined' // the front page's card loads no autumn.js: it is always spring
  /** A layer's painting, turned autumnal once painted on an autumn play (autumn.js: `strength` of its greens
   * turned, `haze` of the film's misty paper over it); as it is in spring. */
  const fall = (draw, strength = 1, haze = 0.1) => (autumn() ? (ctx) => { draw(ctx); Autumn.recolour(ctx, res, strength, haze) } : draw)

  /** Paint with `stream` lent for the painting's draws, `sharp` times finer, so it shifts nothing else. */
  function withStream(stream, sharp, paintIt) {
    const [was, wasRes] = [random, res]
    random = stream
    res *= sharp
    try {
      return paintIt()
    } finally {
      random = was
      res = wasRes
    }
  }

  return { paint, cloudsAt, tree, /** The far trees' crowns, as painted: [{ x, y }]. */ get perches() { return perches } }
})()
