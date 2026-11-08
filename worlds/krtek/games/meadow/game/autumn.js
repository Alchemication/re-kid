// The meadow in autumn (Adam, 2026-11-08), after Krtek a zápalky (1974; world.yaml `autumn`): pale,
// misty ochre ground, big horse-chestnut leaves turned yellow, orange and brown, some still half green,
// conkers in their spiky green husks, colours soft and washed as watercolour on paper.
//
// Three parts. `recolour` turns a painted layer (painting.js) autumnal once it is painted: its greens
// become yellows, ambers, oranges and rusts in patches (a soft noise over the meadow, so a bush is one
// colour and its neighbour another), a few patches stay a tired olive, and a little haze washes over
// everything. `crown` paints the old tree's crown as a horse chestnut's (the tree stands where the oak
// does: in autumn it is a chestnut, Adam's call), with conkers hanging in it. `setup` lets a leaf drop from
// it now and then, spiralling down to lie at its foot (the oldest fade as new ones land), and gives the
// wind (weather.js) chestnut leaves to carry. And two things of autumn's air: a morning mist over the far
// meadow (the film's pale haze, 0:30) that lifts by mid-morning, and once or twice a day a skein of geese
// going south high over the meadow, honking far off (invented). A tap on the leaves lying under the chestnut:
// he plays in them, a different way each time (rounds): he kicks through them and they fly up and settle
// round him, or he throws an armful up over himself and they flutter down. Only autumn plays call any of this.
//
// Draws: the painting's from its own stream (so the season shifts nothing painted after it), the falling
// leaves from another. Time is the Clock's.

/* global Clock, Debug, Layout, Mole, Motion, Sound */
/* exported Autumn */
const Autumn = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  // the film's autumn, from its frames (0:04–1:14): leaf colours from yellow to brown, and the ground's ochre
  const HUES = [50, 43, 36, 29, 22] // a patch's hue, yellow to orange-rust (degrees): the film's leaves are golden, not mauve
  const OLIVE = 58 // a patch still half green: a tired olive, not spring's green
  const OLIVE_SHARE = 0.16 // of the patches
  const GREEN = [55, 175] // the hues that turn (degrees): everything leafy; the sky, flowers and earth keep theirs
  const SAT = [0.5, 0.85] // the turned colours' saturation: at least the first (dark greens went grey), at most the second
  const HAZE = [239, 228, 205] // the film's misty paper, washed over the whole layer...
  const PATCH = 70 // the noise's cell, in scene units: about a bush across
  const LEAF_TONES = ['#e8c45a', '#e0a63c', '#d9822b', '#c4622a', '#9a5a2e', '#b5b25a'] // a chestnut leaf's colours, yellow to brown, and the odd one still greenish
  const CONKERS = 26 // husks hanging in the crown
  const DROP_EVERY_MS = [5000, 11000] // a leaf drops from the chestnut this often
  const DROP_MS = [5500, 8000] // and takes this long to come down
  const LYING = 14 // leaves lying at its foot at most: the oldest fades as a new one lands
  const FOOT = [-20, 560] // where they come down (x), round the tree's foot
  const GROUND_Y = [722, 760] // and lie, on the grass in front of it
  const MIST = [6.5, 10.5] // the morning mist is thickest at the first hour, gone by the second
  const GEESE_AT = [[9, 12], [13, 16.5]] // a skein of geese goes over once in each of these spans (hours)...
  const GEESE_CHANCE = 0.7 // ...this often
  const GEESE = 7 // in a V
  const GEESE_MS = 24000 // across the sky, right to left (south, as the meadow is drawn)
  const GEESE_Y = [120, 210] // high in the sky
  const paintRandom = Debug.random('meadow-autumn-painting')
  const air = Debug.random('meadow-autumn-air') // the geese: whether and when, their own stream
  const drops = Debug.random('meadow-autumn-leaves')
  let layer = null
  let mist = null
  let sky = null
  let mistShown = -1
  let geeseAt = [] // the hours a skein goes over this play
  let heard = () => {}
  const lying = []

  const between = ([a, b], k) => a + (b - a) * k

  /** A smooth noise over the scene, in [0, 1): value noise on a grid of PATCH, eased between corners. */
  function noise(cols, rows) {
    const grid = Array.from({ length: (cols + 2) * (rows + 2) }, () => paintRandom())
    const at = (i, j) => grid[j * (cols + 2) + i]
    const ease = (t) => t * t * (3 - 2 * t)
    return (x, y) => {
      const [i, j] = [Math.floor(x), Math.floor(y)]
      const [u, v] = [ease(x - i), ease(y - j)]
      const top = at(i, j) + (at(i + 1, j) - at(i, j)) * u
      const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u
      return top + (bottom - top) * v
    }
  }

  /** HSV (h in degrees, s and v 0..1) to RGB 0..255. */
  function rgb(h, s, v) {
    const f = (n) => {
      const k = (n + h / 60) % 6
      return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))))
    }
    return [f(5), f(3), f(1)]
  }

  /** What each colour becomes, worked out once per layer (5 bits a channel: 32768 colours): for a green,
   * its colour in each patch (HUES, then OLIVE), packed 0xRRGGBB; -1 for a colour that stays. */
  const tables = new Map() // by strength: each layer of a strength shares one
  function table(strength) {
    if (tables.has(strength)) return tables.get(strength)
    const targets = [...HUES, OLIVE]
    const out = new Int32Array(32768 * targets.length).fill(-1)
    for (let i = 0; i < 32768; i++) {
      const [r, g, b] = [((i >> 10) & 31) * 8 + 4, ((i >> 5) & 31) * 8 + 4, (i & 31) * 8 + 4]
      const max = Math.max(r, g, b)
      const d = max - Math.min(r, g, b)
      if (!max || d / max <= 0.1) continue
      let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
      h = (h * 60 + 360) % 360
      if (h < GREEN[0] || h > GREEN[1]) continue
      const s0 = d / max
      const s = s0 + (Math.min(SAT[1], Math.max(SAT[0], s0)) - s0) * strength
      const v = Math.min(1, (max / 255) * (1 + 0.25 * strength)) // a little lighter: the film's autumn is pale and sunny
      targets.forEach((to, t) => {
        const [nr, ng, nb] = rgb(h + (to - h) * strength, s, v)
        out[i * targets.length + t] = (nr << 16) | (ng << 8) | nb
      })
    }
    tables.set(strength, out)
    return out
  }

  /**
   * Turn a painted layer autumnal, in place: its greens to the patch's autumn colour, and a haze over all.
   * Each colour's turn comes from a table, each patch's colour is read once per block of pixels: a phone
   * paints autumn about as quickly as spring.
   * @param {CanvasRenderingContext2D} ctx the layer's, as painting.js made it
   * @param {number} res its canvas pixels per scene unit
   * @param {number} strength 0 leaves it as it is, 1 turns every green (the far pines keep some)
   * @param {number} haze how much of the misty paper to wash over it
   */
  function recolour(ctx, res, strength = 1, haze = 0.1) {
    const { width, height } = ctx.canvas
    const img = ctx.getImageData(0, 0, width, height)
    const px = img.data
    const turned = table(strength)
    const n = HUES.length + 1
    const cell = PATCH * res
    const hueAt = noise(Math.ceil(width / cell), Math.ceil(height / cell))
    const keepAt = noise(Math.ceil(width / cell), Math.ceil(height / cell))
    const BLOCK = 8 // pixels: a patch's colour is read once per block this big (a patch is many blocks across)
    const cols = Math.ceil(width / BLOCK)
    const patch = new Uint8Array(cols * Math.ceil(height / BLOCK))
    for (let by = 0; by * BLOCK < height; by++) {
      for (let bx = 0; bx < cols; bx++) {
        const [x, y] = [(bx + 0.5) * BLOCK / cell, (by + 0.5) * BLOCK / cell]
        patch[by * cols + bx] = keepAt(x, y) < OLIVE_SHARE ? HUES.length : Math.min(HUES.length - 1, Math.floor(hueAt(x, y) * HUES.length))
      }
    }
    const [hr, hg, hb] = HAZE.map((c) => c * haze)
    const keep = 1 - haze
    const px32 = new Uint32Array(px.buffer) // a pixel at a time: 0xAABBGGRR (little-endian, as every phone is)
    for (let y = 0; y < height; y++) {
      const row = (y / BLOCK | 0) * cols
      const at = y * width
      for (let x = 0; x < width; x++) {
        const v = px32[at + x]
        if (!(v >>> 24)) continue
        let r = v & 255
        let g = (v >> 8) & 255
        let b = (v >> 16) & 255
        const c = turned[(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)) * n + patch[row + (x / BLOCK | 0)]]
        if (c >= 0) {
          r = c >> 16
          g = (c >> 8) & 255
          b = c & 255
        }
        px32[at + x] = (v & 0xff000000) | ((b * keep + hb) << 16) | ((g * keep + hg) << 8) | (r * keep + hr)
      }
    }
    ctx.putImageData(img, 0, 0)
  }

  /** A horse-chestnut leaf on a canvas: seven long leaflets fanned from the stalk's end, widest near their tips. */
  function leaf(ctx, x, y, size, colour, turn) {
    ctx.fillStyle = colour
    ctx.beginPath()
    for (let k = -3; k <= 3; k++) {
      const a = turn + k * 0.42
      const len = size * (1 - Math.abs(k) * 0.13)
      const [ca, sa] = [Math.cos(a), Math.sin(a)]
      const w = len * 0.24
      // a leaflet: from the stalk, out along a, widest at 0.7 of its length, to a point
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + ca * len * 0.7 - sa * w, y + sa * len * 0.7 + ca * w, x + ca * len, y + sa * len)
      ctx.quadraticCurveTo(x + ca * len * 0.7 + sa * w, y + sa * len * 0.7 - ca * w, x, y)
    }
    ctx.fill()
  }

  /** A conker's husk: a green ball with spikes; split, the brown conker shows. */
  function husk(ctx, x, y, rad, split) {
    ctx.fillStyle = '#7d9a3c'
    ctx.strokeStyle = '#3e5420'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + paintRandom() * 0.3
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad)
      ctx.lineTo(x + Math.cos(a) * rad * 1.45, y + Math.sin(a) * rad * 1.45)
      ctx.stroke()
    }
    if (!split) return
    ctx.fillStyle = '#7a3e1c'
    ctx.beginPath()
    ctx.ellipse(x + rad * 0.2, y + rad * 0.1, rad * 0.62, rad * 0.55, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 230, 200, 0.6)'
    ctx.beginPath()
    ctx.ellipse(x, y - rad * 0.12, rad * 0.18, rad * 0.1, 0.4, 0, Math.PI * 2)
    ctx.fill()
  }

  /** The tree's crown as a horse chestnut's, on its clumps (Layout.OAK.crown): a dark warm round under each,
   * then leaves, lighter towards the light (top left), and conkers hanging among them. `dab` is the painting's. */
  function crown(ctx, clumps, dab) {
    const r = (a, b) => a + paintRandom() * (b - a)
    for (const [x, y, rad] of clumps) {
      dab(ctx, x, y + rad * 0.1, rad * 0.9, '#6b4a2a', 1)
      for (let i = 0, n = Math.round(rad * rad / 42); i < n; i++) {
        const a = r(0, Math.PI * 2)
        const d = Math.sqrt(paintRandom()) * rad
        const [lx, ly] = [x + Math.cos(a) * d, y + Math.sin(a) * d]
        const lit = (x - lx + (y - ly) * 1.3) / rad
        const k = Math.max(0, Math.min(LEAF_TONES.length - 2, Math.round(2.4 - lit * 1.4 + r(-1, 1))))
        leaf(ctx, lx, ly, r(16, 24), paintRandom() < 0.07 ? LEAF_TONES[5] : LEAF_TONES[k], r(0, Math.PI * 2))
      }
    }
    for (let i = 0; i < CONKERS; i++) {
      const [x, y, rad] = clumps[Math.floor(paintRandom() * clumps.length)]
      const a = r(0.2, Math.PI - 0.2) // the lower half: they hang
      husk(ctx, x + Math.cos(a) * rad * r(0.3, 0.8), y + Math.sin(a) * rad * r(0.2, 0.7), r(7, 9), paintRandom() < 0.25)
    }
  }

  /** A chestnut leaf as an SVG path at 0,0, about `size` long (what the wind carries, what falls). */
  function leafPath(size = 10) {
    let d = ''
    for (let k = -3; k <= 3; k++) {
      const a = -Math.PI / 2 + k * 0.42
      const len = size * (1 - Math.abs(k) * 0.13)
      const w = len * 0.24
      const [ca, sa] = [Math.cos(a), Math.sin(a)]
      const p = (u, v) => `${(ca * u - sa * v).toFixed(1)} ${(sa * u + ca * v).toFixed(1)}`
      d += `M0 0 Q${p(len * 0.7, w)} ${p(len, 0)} Q${p(len * 0.7, -w)} 0 0 `
    }
    return `${d}M0 0 L0 ${(size * 0.45).toFixed(1)}`
  }

  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    parent.appendChild(e)
    return e
  }

  /** One leaf, drawn in a group at 0,0, its colour from `rand`. */
  function piece(g, rand, size = 10) {
    el('path', { d: leafPath(size), fill: LEAF_TONES[Math.floor(rand() * (LEAF_TONES.length - 1))], stroke: '#6b4220', 'stroke-width': 1, 'stroke-linejoin': 'round' }, g)
  }

  /** A leaf lets go of the chestnut and spirals down to lie at its foot. */
  function drop() {
    const { crown: clumps } = Layout.OAK
    const [cx, cy, rad] = clumps[Math.floor(drops() * clumps.length)]
    const from = { x: cx + between([-0.6, 0.6], drops()) * rad, y: cy + rad * 0.5 }
    const to = { x: between(FOOT, drops()), y: between(GROUND_Y, drops()) }
    const ms = between(DROP_MS, drops())
    const spin = between([-1, 1], drops()) * 540
    const flat = between([-70, 70], drops()) // how it lies, come down
    const g = el('g', { class: 'dropped' }, layer)
    piece(el('g', { transform: 'scale(2.6)' }, g), drops) // big enough to see come down from across the meadow
    const frames = [0, 0.2, 0.4, 0.6, 0.8, 1].map((k) => ({
      transform: `translate(${(from.x + (to.x - from.x) * k + Math.sin(k * Math.PI * 4) * 36).toFixed(0)}px, ${(from.y + (to.y - from.y) * k).toFixed(0)}px) rotate(${(k < 1 ? spin * k : flat).toFixed(0)}deg) scaleY(${(k < 1 ? Math.cos(k * Math.PI * 5) * 0.6 + 0.4 : 0.55).toFixed(2)})`,
    }))
    Debug.trace('leaf', { x: Math.round(to.x) })
    Motion.endAt(g, frames, { duration: ms, easing: 'linear' }).then(() => lie(g), () => g.remove())
  }

  /** A skein of geese across the sky, right to left, honking far off now and then. */
  function geese() {
    const y = between(GEESE_Y, air())
    const g = el('g', { class: 'geese' }, sky)
    for (let i = 0; i < GEESE; i++) {
      const row = Math.ceil(i / 2) * (i % 2 ? 1 : -1) // the V: the leader, then its two arms
      const b = el('g', { transform: `translate(${Math.abs(row) * 34} ${row * 16}) scale(1.4)` }, g)
      const wings = el('path', { class: 'goose-wings', d: 'M-10 -2 Q-4 -9 0 0 Q4 -9 10 -2', fill: 'none', stroke: '#3a3530', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, b)
      wings.style.animationDelay = `${(i * 0.13).toFixed(2)}s`
      el('path', { d: 'M-7 0 L0 0', stroke: '#3a3530', 'stroke-width': 3, 'stroke-linecap': 'round' }, b)
    }
    Debug.trace('geese', { y: Math.round(y) })
    heard()
    for (const at of [0.15, 0.4, 0.65]) Clock.after(GEESE_MS * at, () => Sound.honk())
    Motion.endAt(g, [{ transform: `translate(1800px, ${y}px)` }, { transform: `translate(-400px, ${y - 30}px)` }], { duration: GEESE_MS, easing: 'linear' }).then(() => g.remove(), () => g.remove())
  }

  // ------------------------------------------------------------ a tap on the leaves under the chestnut

  const PLAY_AT = 330 // where he plays in them: at the chestnut's foot (left of the hedgehog's leaves, which take their own taps)
  const where = (g) => new DOMMatrixReadOnly(getComputedStyle(g).transform)

  /** A leaf from (x, y) up into the air and down to lie at x + dx. */
  function flutter(g, x, y, dx, ms) {
    const to = { x: Math.max(FOOT[0], Math.min(FOOT[1], x + dx)), y: between(GROUND_Y, drops()) }
    const up = y - 120 - drops() * 80
    const flat = between([-70, 70], drops())
    return Motion.endAt(g, [
      { transform: `translate(${x}px, ${y}px) rotate(0deg) scaleY(0.55)` },
      { transform: `translate(${x + dx * 0.4}px, ${up}px) rotate(${dx * 2}deg) scaleY(1)`, offset: 0.3 },
      { transform: `translate(${x + dx * 0.8}px, ${(up + to.y) / 2}px) rotate(${-dx}deg) scaleY(-0.6)`, offset: 0.65 },
      { transform: `translate(${to.x}px, ${to.y}px) rotate(${flat}deg) scaleY(0.55)` },
    ], { duration: ms, easing: 'ease-out' })
  }

  const PLAYS = {
    /** He kicks through them: the ones near him fly up and settle round him. */
    async kick(alive) {
      for (const dir of [1, -1]) {
        Sound.swish()
        await Mole.lean(dir * 10, 300)
        if (!alive()) return
        const near = lying.filter((g) => Math.abs(where(g).e - Mole.state.x) < 140)
        await Promise.all(near.map((g, i) => {
          const { e, f } = where(g)
          return flutter(g, e, f, dir * (60 + ((i * 37) % 90)), 1600 + i * 60)
        }))
        if (!alive()) return
      }
      Mole.lean(0, 300)
      Sound.say('giggle')
      await Mole.handsToFace(600)
    },
    /** He scoops up an armful and throws it up over himself; down they flutter, round him. */
    async toss(alive) {
      await Mole.lean(12, 400) // down to scoop
      if (!alive()) return
      Mole.lean(0, 300)
      Sound.whoosh()
      Mole.feel('delighted', 2000)
      const x = Mole.state.x
      const flying = []
      for (let i = 0; i < 6; i++) {
        const g = el('g', { class: 'dropped' }, layer)
        piece(el('g', { transform: 'scale(2.6)' }, g), drops)
        flying.push(flutter(g, x, Layout.GROUND - 60, (i - 2.5) * 40, 2200 + i * 120).then(() => lie(g)))
      }
      await Mole.cheer()
      await Promise.all(flying)
      if (!alive()) return
      Sound.say('giggle')
    },
  }

  /** A leaf come to rest: it lies with the others (the oldest fades past LYING). */
  function lie(g) {
    lying.push(g)
    if (lying.length > LYING) {
      const old = lying.shift()
      Motion.endAt(old, [{ opacity: 0 }], { duration: 2000 }).then(() => old.remove(), () => old.remove())
    }
  }

  let nextPlay = null
  /** A tap on the leaves: he goes over and plays in them (PLAYS, a different way each time). */
  async function play(alive) {
    await goTo(PLAY_AT)
    if (!alive()) return
    Mole.show('front')
    const how = nextPlay()
    Debug.trace('leaves', { how })
    await PLAYS[how](alive)
  }
  let goTo = null

  /** The hour: the morning mist lifts; a skein of geese at its hour. */
  function tick(h) {
    if (mist) {
      const k = Math.round(Math.max(0, Math.min(1, (MIST[1] - h) / (MIST[1] - MIST[0]))) * 50) / 50
      if (k !== mistShown) {
        mistShown = k
        mist.setAttribute('opacity', String(k))
      }
    }
    while (geeseAt.length && h >= geeseAt[0]) {
      geeseAt.shift()
      if (!Debug.still) geese()
    }
  }

  /** Leaves drop from the chestnut into `into` now and then, all day; the mist in `haze` (over the far
   * meadow, before the scene's camera); the geese in the `high` sky; onGeese(): they're going over (the
   * meadow has him look up, if free). Autumn plays only. */
  function setup(into, { haze = null, high = null, onGeese = () => {}, meadow = null } = {}) {
    layer = into
    if (meadow) {
      goTo = meadow.goTo
      nextPlay = meadow.rounds(Object.keys(PLAYS), drops)
      const hit = el('rect', { class: 'leaf-hit', x: 200, y: 700, width: 260, height: 90, fill: 'none', 'pointer-events': 'all' }, into) // the leaves at the chestnut's foot take taps
      hit.style.cursor = 'pointer'
    }
    sky = high
    heard = onGeese
    for (const [a, b] of GEESE_AT) { // drawn either way, so ?still shifts nothing
      const when = between([a, b], air())
      if (air() < GEESE_CHANCE) geeseAt.push(when)
    }
    if (Layout.flags.critters === 'geese') geeseAt.unshift(0) // ?critters=geese: one at once
    if (haze) {
      mist = el('rect', { class: 'mist', x: -200, y: 380, width: 2000, height: 380, fill: 'url(#mist-grad)', opacity: 1 }, haze)
      mist.style.pointerEvents = 'none'
    }
    const next = () => Clock.after(between(DROP_EVERY_MS, drops()), () => {
      if (!Debug.still) drop()
      next()
    })
    next()
  }

  return { recolour, crown, piece, setup, tick, play, LEAF_TONES, /** Leaves lying under the chestnut now. */ get lying() { return lying.length } }
})()
