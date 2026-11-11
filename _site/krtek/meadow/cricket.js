// The cricket, drawn after the films' (Krtek a buldozer 1:24-1:44): a small
// black fellow standing upright like a little man, a big round head with
// one big eye and a pale muzzle, a wide smile with teeth, long antennae, big
// flat feet; an orange fiddle under his chin, his bow, and a white music
// stand in front of him. He plays to the mole at dusk (Adam, 2026-11-04:
// the first one, a green blob in the grass, was hard to spot and looked bad).
//
// He lives in a little burrow by the bluebells, always there, as field
// crickets do: at dusk (or in an eclipse's dim) he climbs out with his
// fiddle and stand, walks over by the molehill, sets the stand down facing
// the mole, and plays (bow sawing, body rocking, a foot keeping time); as
// the light comes back he picks it up and goes home down his burrow. He
// moves only on the Clock; his playing's loops are CSS (game.css .cricket).

/* global Clock, Debug, Layout */
/* exported Cricket */
const Cricket = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const INK = '#15140f'
  const COAT = '#2b221c' // black, a little brown, as the films'
  const PALE = '#e9dcc0' // his muzzle
  const HOLE = { x: 600, y: Layout.GROUND + 8 } // his burrow: by the bluebells, left of the molehill
  const SPOT = Layout.HOME - 205 // where he plays: in the open, facing the mole, his stand clear of the molehill
  const SIZE = 1.15 // about half the mole's height
  const DEEP = 150 // down in his burrow, this far below its mouth (his own units)
  const CLIMB_MS = 900 // up out of the burrow, or down into it
  const PACE = 75 // walking, scene units a second
  const SET_MS = 350 // setting the stand down, or picking it up
  const CARRIED = 'translate(-26px, -14px) rotate(-12deg)' // the stand, held out in front of him as he walks

  let g = null // the whole, where he stands
  let fig = null // the figure, facing his way
  let body = null // what climbs out of the burrow
  let stand = null
  let at = HOLE.x
  let depth = DEEP // how far down his burrow (his units): 0, out on the grass
  let token = 0
  let state = 'home' // 'home', 'coming', 'playing', 'going'

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const line = { stroke: INK, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }

  /** His burrow: a little dark hole with a lip of earth, in the grass. */
  function drawHole(into) {
    const h = el('g', { class: 'cricket-hole', transform: `translate(${HOLE.x} ${HOLE.y})` }, into)
    el('ellipse', { cx: 0, cy: 0, rx: 20, ry: 6, fill: '#2a2414' }, h)
    el('path', { d: 'M-24 1 Q-20 -6 -10 -6 M10 -6 Q20 -6 24 1', stroke: '#6b4a2b', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, h)
  }

  /** The cricket facing right (towards the mole), his feet at 0, 0, in his own units. */
  function drawFigure(into) {
    const legs = el('g', { class: 'cricket-legs' }, into)
    for (const [cls, x, foot] of [['leg-back', -5, -12], ['leg-front', 5, 9]]) {
      const leg = el('g', { class: `cricket-leg ${cls}` }, legs)
      el('path', { d: `M${x} -36 L${x + (foot > 0 ? 2 : -2)} -6`, stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, leg)
      el('ellipse', { class: 'cricket-foot', cx: foot, cy: -4, rx: 14, ry: 5.5, fill: COAT, ...line }, leg)
    }
    const upper = el('g', { class: 'cricket-upper' }, into) // sways as he plays
    el('ellipse', { cx: 0, cy: -54, rx: 16, ry: 24, fill: COAT, ...line }, upper)
    el('path', { d: 'M-11 -70 Q-18 -50 -9 -32', stroke: '#5a4636', 'stroke-width': 2, fill: 'none' }, upper) // his folded wing
    // the arm that holds the fiddle's neck, out in front
    el('path', { d: 'M2 -66 Q22 -54 40 -60', stroke: INK, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, upper)
    const head = el('g', { class: 'cricket-head' }, upper)
    const antennae = el('g', { class: 'cricket-antennae' }, head)
    el('path', { d: 'M-2 -110 C-8 -138 -26 -150 -40 -158 M6 -111 C6 -144 -4 -160 -16 -174', stroke: INK, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, antennae)
    el('circle', { cx: 4, cy: -92, r: 20, fill: COAT, ...line }, head)
    el('ellipse', { cx: 16, cy: -84, rx: 13, ry: 11, fill: PALE, ...line, 'stroke-width': 2 }, head)
    const eye = el('g', { class: 'cricket-eye' }, head)
    el('ellipse', { cx: 9, cy: -101, rx: 8, ry: 10, fill: '#fff', ...line, 'stroke-width': 2 }, eye)
    el('circle', { cx: 12.5, cy: -100, r: 3.8, fill: INK }, eye)
    el('path', { d: 'M1 -114 Q9 -119 18 -112', stroke: PALE, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, head) // his brow, pale on black
    el('path', { d: 'M8 -85 Q18 -71 28 -85 Q18 -81 8 -85 Z', fill: '#7a2a22', stroke: INK, 'stroke-width': 1.5 }, head) // a wide smile
    el('path', { d: 'M10.5 -84.2 Q18 -80.6 25.5 -84.2', stroke: '#fff', 'stroke-width': 2.2, fill: 'none' }, head) // his teeth
    // the fiddle under his chin, its scroll out front
    const fiddle = el('g', { class: 'cricket-fiddle', transform: 'translate(14 -64) rotate(16)' }, upper)
    el('path', { d: 'M-15 0 C-15 -9 -6 -9 -3 -5 C0 -8 4 -8 6 -5 C9 -9 15 -8 15 0 C15 8 9 9 6 5 C4 8 0 8 -3 5 C-6 9 -15 9 -15 0 Z', fill: '#c8622a', ...line, 'stroke-width': 2 }, fiddle)
    el('rect', { x: 15, y: -2, width: 20, height: 4, fill: '#3a2416' }, fiddle)
    el('circle', { cx: 37, cy: 0, r: 3.5, fill: '#c8622a', stroke: INK, 'stroke-width': 1.5 }, fiddle)
    el('path', { d: 'M-12 0 H35', stroke: '#f0d9a0', 'stroke-width': 0.8 }, fiddle)
    // the bow, across the strings, and the hand and arm that draw it
    const bow = el('g', { class: 'cricket-bow' }, upper)
    el('path', { d: 'M-4 -38 L30 -96', stroke: '#5a3a1a', 'stroke-width': 3, 'stroke-linecap': 'round' }, bow)
    el('path', { d: 'M-2 -40 L31 -94', stroke: '#f0e6cc', 'stroke-width': 1 }, bow) // its hair
    el('path', { d: 'M-8 -64 Q-14 -50 -3 -40', stroke: INK, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, bow)
  }

  /** His music stand, in front of him (his own units): a white sheet on a thin tripod. */
  function drawStand(into) {
    const s = el('g', { class: 'cricket-stand' }, into)
    el('path', { d: 'M48 -44 V-4 M48 -6 L40 0 M48 -6 L56 0', stroke: INK, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, s)
    el('path', { d: 'M36 -66 L60 -62 L58 -42 L34 -46 Z', fill: '#f6f3ea', stroke: INK, 'stroke-width': 1.8 }, s)
    el('path', { d: 'M38 -60 L56 -57 M37.5 -55 L55.5 -52 M37 -50 L55 -47', stroke: '#9aa0a6', 'stroke-width': 1 }, s)
    return s
  }

  /** Draw him, at home in his burrow, into `into` (on the grass, in front). */
  function setup(into) {
    drawHole(into)
    g = el('g', { id: 'cricket', 'clip-path': 'url(#cricket-burrow)' }, into)
    const clip = el('clipPath', { id: 'cricket-burrow' }, into)
    el('rect', { x: -200, y: -400, width: 400, height: 400 }, clip) // above the burrow's mouth: down in it, he can't be seen
    fig = el('g', {}, g)
    body = el('g', { class: 'cricket' }, fig)
    const art = el('g', { transform: `scale(${SIZE})` }, body)
    drawFigure(art)
    stand = drawStand(art)
    place(HOLE.x)
    sink(DEEP)
    g.style.display = 'none'
  }

  const place = (x) => {
    at = x
    g.style.transform = `translate(${x}px, ${HOLE.y}px)`
  }
  const face = (dir) => {
    fig.style.transform = dir < 0 ? 'scaleX(-1)' : ''
  }

  const sink = (d) => {
    depth = d
    body.style.transform = `translateY(${d}px)`
  }

  /** Up out of his burrow (to 0) or down it (to DEEP), from as far as he is, on the Clock. */
  async function climb(to, mine) {
    const from = depth
    const ms = (CLIMB_MS * Math.abs(to - from)) / DEEP
    const start = Clock.now()
    for (let t = 0; t < 1 && token === mine; t = (Clock.now() - start) / ms) {
      sink(from + (to - from) * t)
      await Clock.frame()
    }
    if (token === mine) sink(to)
    return token === mine
  }

  async function walkTo(x, mine) {
    face(x > at ? 1 : -1)
    body.classList.add('walking')
    let last = Clock.now()
    while (token === mine && Math.abs(x - at) > 0.5) {
      await Clock.frame()
      const now = Clock.now()
      const step = (PACE * (now - last)) / 1000
      last = now
      place(Math.abs(x - at) <= step ? x : at + Math.sign(x - at) * step)
    }
    if (token === mine) place(x)
    body.classList.remove('walking')
    return token === mine
  }

  async function setStand(down, mine) {
    stand.style.transition = `transform ${SET_MS}ms ease-in-out`
    stand.style.transform = down ? '' : CARRIED
    await Clock.wait(SET_MS)
    return token === mine
  }

  /** Out of his burrow, over to his spot, the stand down, playing. True once he plays (false: called home first). */
  async function out() {
    if (state === 'coming' || state === 'playing') return state === 'playing'
    const mine = ++token
    state = 'coming'
    Debug.trace('cricket', { out: true })
    g.style.display = ''
    g.setAttribute('clip-path', 'url(#cricket-burrow)')
    stand.style.transition = ''
    stand.style.transform = CARRIED
    face(1)
    if (!(await climb(0, mine))) return false
    g.removeAttribute('clip-path')
    if (!(await walkTo(SPOT, mine))) return false
    face(1)
    if (!(await setStand(true, mine))) return false
    state = 'playing'
    body.classList.add('playing')
    Debug.trace('cricket', { plays: true })
    return true
  }

  /** The stand picked up, back to his burrow and down it. */
  async function home() {
    if (state === 'home' || state === 'going') return
    const mine = ++token
    state = 'going'
    body.classList.remove('playing')
    Debug.trace('cricket', { out: false })
    if (!(await setStand(false, mine))) return
    if (!(await walkTo(HOLE.x, mine))) return
    g.setAttribute('clip-path', 'url(#cricket-burrow)')
    if (!(await climb(DEEP, mine))) return
    g.style.display = 'none'
    state = 'home'
  }

  return {
    setup,
    out,
    home,
    SPOT,
    /** 'home', 'coming', 'playing' or 'going' (for the tests and the overlay). */
    get state() { return state },
    get x() { return at },
  }
})()
