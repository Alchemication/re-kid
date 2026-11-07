// His den under the molehill, where the day begins and ends, after Krtek a
// autíčko (0:44-1:08, and its end, 15:04): a rounded chamber in the black
// earth, paved with a mosaic of dark stones, a fringe of little spikes round
// its edge and pale flecks scattered in the dark about it; a long white
// pillow; and him asleep on his front as the
// film has him, his rump up in a hump, his feet out behind, his head down
// on his crossed hands, his nose pressed into them, his eyes shut, his bib
// showing at his side; no hairs, as the film shows none while he sleeps. On a
// night the toy car came and was mended, it is in his arms, as the film ends. He breathes (a CSS loop, game.css #den); z's drift up.
//
// Drawn once, in code, into #den (meadow.js shows and hides it): only
// drawing here, from its own random stream, so it shifts nothing else.

/* global Debug, MoleArt */
/* exported Den */
const Den = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const { INK, BODY, BIB, PINK, SKIN_LINE, NOSE, BROW } = MoleArt
  const ROOM = { x: 500, y: 230, w: 600, h: 440 } // the chamber
  const SQUARE = 3.2 // ...a rounded square, as the film's (a superellipse: 2 an oval, higher squarer)
  const EARTH = '#e2a04c' // its ochre
  const STONE = '#a8642a' // the mosaic's stones
  const FLECK = '#cbb89a' // the pale flecks in the dark earth about it
  const STONE_CELL = 34 // a stone in each cell of this size, jittered, close-packed as crazy paving
  const SPIKE_EVERY = 34 // the fringe round its edge: a small spike about this often
  const FLECKS = 220
  let toy = null // the toy car in his arms
  const random = Debug.random('meadow-den') // the mosaic, the fringe, the flecks: its own stream

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const r = (a, b) => a + random() * (b - a)
  const pts = (list) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  /** A point on the chamber's outline at t (0..1 round it), and its outward normal. */
  function edge(t) {
    const { x, y, w, h } = ROOM
    // a rounded square as a superellipse: close enough to the film's, and easy to walk round
    const a = t * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    const n = SQUARE
    const px = x + w / 2 + (w / 2) * Math.sign(c) * Math.abs(c) ** (2 / n)
    const py = y + h / 2 + (h / 2) * Math.sign(s) * Math.abs(s) ** (2 / n)
    return [px, py, c, s]
  }

  function outline() {
    const list = []
    for (let i = 0; i < 120; i++) list.push(edge(i / 120).slice(0, 2))
    return `M${pts(list).replaceAll(' ', ' L')} Z`
  }

  /** The dark earth about the chamber, flecked pale. */
  function earth(into) {
    el('rect', { x: -200, y: -200, width: 2000, height: 1300, fill: '#000' }, into)
    const flecks = el('g', { fill: FLECK, opacity: 0.85 }, into)
    for (let i = 0; i < FLECKS; i++) {
      let x, y
      do {
        x = r(280, 1320)
        y = r(60, 840)
      } while (x > ROOM.x - 24 && x < ROOM.x + ROOM.w + 24 && y > ROOM.y - 24 && y < ROOM.y + ROOM.h + 24)
      const a = r(0, Math.PI * 2)
      const len = r(11, 19)
      el('polygon', { points: pts([[x, y], [x + Math.cos(a) * len, y + Math.sin(a) * len], [x + Math.cos(a + 0.5) * len * 0.8, y + Math.sin(a + 0.5) * len * 0.8]]) }, flecks)
    }
  }

  /** The chamber: its fringe of spikes, the ochre, the mosaic of stones. */
  function chamber(into) {
    const fringe = el('g', { fill: EARTH }, into)
    const around = 2 * (ROOM.w + ROOM.h) * 0.9
    for (let i = 0, n = Math.round(around / SPIKE_EVERY); i < n; i++) {
      const [x, y, c, s] = edge((i + r(-0.2, 0.2)) / n)
      if (random() < 0.3) continue // a gap in the fringe
      const len = r(6, 11)
      const tx = -s * 3.5
      const ty = c * 3.5
      el('polygon', { points: pts([[x + tx, y + ty], [x - tx, y - ty], [x + c * len, y + s * len]]) }, fringe)
    }
    const d = outline()
    el('path', { d, fill: EARTH }, into)
    const clip = el('clipPath', { id: 'den-room' }, into)
    el('path', { d }, clip)
    const stones = el('g', { fill: STONE, 'clip-path': 'url(#den-room)', opacity: 0.85 }, into)
    for (let y = ROOM.y; y < ROOM.y + ROOM.h; y += STONE_CELL) {
      for (let x = ROOM.x; x < ROOM.x + ROOM.w; x += STONE_CELL) {
        const cx = x + STONE_CELL / 2 + r(-5, 5)
        const cy = y + STONE_CELL / 2 + r(-5, 5)
        const k = r(0.5, 0.6) * STONE_CELL
        const turn = r(0, Math.PI * 2)
        const corners = random() < 0.5 ? 3 : 4
        const list = []
        for (let j = 0; j < corners; j++) {
          const a = turn + (j / corners) * Math.PI * 2 + r(-0.3, 0.3)
          list.push([cx + Math.cos(a) * k * r(0.7, 1.15), cy + Math.sin(a) * k * r(0.6, 1)])
        }
        el('polygon', { points: pts(list) }, stones)
      }
    }
  }

  /** The long white pillow (Autíčko 0:50; its striped curl left out: at this size it read as a scribble). */
  function pillow(into) {
    el('path', { d: 'M576 606 C556 566 592 530 652 532 C740 524 860 520 934 524 C992 526 1014 566 1000 604 C990 632 952 640 900 638 C800 642 700 644 640 642 C604 640 584 628 576 606 Z', fill: '#fbf8ef', stroke: INK, 'stroke-width': 3 }, into)
  }

  /** A soft mitt lying flat on the pillow, its fingers a scalloped edge towards `dir` (1 right, -1 left). */
  function mitt(into, cx, cy, dir, turn) {
    const g = el('g', { transform: `translate(${cx} ${cy}) rotate(${turn}) scale(${dir} 1)` }, into)
    el('path', { d: 'M-30 2 C-30 -10 -14 -13 4 -12 C14 -12 22 -11 27 -8 C33 -6 33 -1 29 0 C34 2 33 7 28 8 C30 11 26 14 20 13 C10 14 -20 14 -26 10 C-29 8 -30 5 -30 2 Z', fill: PINK, stroke: SKIN_LINE, 'stroke-width': 1.6 }, g)
    for (const y of [-4, 3]) el('path', { d: `M18 ${y} q5 0 8 1`, fill: 'none', stroke: SKIN_LINE, 'stroke-width': 1.2, 'stroke-linecap': 'round' }, g) // between his fingers
  }

  /** Him, asleep on his front: rump up, feet out behind, his head down on his hands, his nose resting on them. */
  function sleeper(into) {
    const g = el('g', { class: 'sleeper' }, into)
    for (const [x, y, a] of [[612, 586, -20], [632, 594, -8]]) el('ellipse', { cx: x, cy: y, rx: 15, ry: 9, fill: PINK, stroke: SKIN_LINE, 'stroke-width': 1.5, transform: `rotate(${a} ${x} ${y})` }, g) // his soles, out behind
    const body = el('g', { class: 'sleeper-body' }, g) // what rises and falls as he breathes
    el('path', { d: 'M622 588 C604 540 626 462 700 456 C762 450 792 482 818 492 C870 478 928 506 942 556 C948 578 930 590 904 590 L650 594 C634 594 625 592 622 588 Z', fill: BODY }, body)
    el('path', { d: 'M724 594 C726 570 748 560 772 562 C796 564 808 576 806 594 Z', fill: BIB }, body) // his bib, at his side
    const face = el('g', { fill: 'none', stroke: BROW, 'stroke-width': 3.6, 'stroke-linecap': 'round' }, body)
    for (const x of [876, 906]) el('path', { d: `M${x - 11} 538 q11 9 22 0` }, face) // eyes shut: content curves, near his snout
    toy = el('g', { class: 'den-car', transform: 'translate(884 600) scale(0.42)' }, g) // the toy car, on nights it came: in his arms
    toy.style.display = 'none'
    el('path', { d: 'M-96 -40 q6 -30 40 -34 l20 -30 h64 q16 0 24 30 q40 4 46 34 z', fill: '#c9302c', stroke: INK, 'stroke-width': 4 }, toy)
    el('path', { d: 'M-30 -100 l14 -22 h34 q10 0 16 22', fill: '#cfe3f7', stroke: INK, 'stroke-width': 4 }, toy)
    el('path', { d: 'M-110 -10 v-34 q0 -10 14 -10 h192 q14 0 18 14 v30 z', fill: '#e2453f', stroke: INK, 'stroke-width': 4 }, toy)
    for (const x of [-62, 66]) el('circle', { cx: x, cy: -6, r: 20, fill: '#2b2b2b', stroke: INK, 'stroke-width': 4 }, toy)
    mitt(g, 902, 598, 1, -4) // his hands under his head, one on the other
    mitt(g, 910, 590, 1, 6)
    for (const [dy, a] of [[-4, -10], [4, 8]]) el('path', { d: `M950 ${568 + dy} l18 ${a * 0.5}`, fill: 'none', stroke: BROW, 'stroke-width': 2, 'stroke-linecap': 'round' }, g) // whiskers
    el('ellipse', { cx: 940, cy: 570, rx: 10, ry: 8, fill: NOSE, stroke: INK, 'stroke-width': 1.5 }, g) // his nose, resting on his hands
  }

  function zees(into) {
    const g = el('g', { class: 'zees', fill: 'none', stroke: '#fbf8ef', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, into)
    for (const [i, [x, y, s]] of [[880, 430, 22], [920, 390, 28], [966, 342, 34]].entries()) el('path', { class: `z z${i + 1}`, d: `M${x} ${y} h${s} l${-s} ${s * 1.08} h${s}` }, g)
  }

  /** Draw the den into `into` (#den). */
  function draw(into) {
    earth(into)
    chamber(into)
    const bed = el('g', { transform: 'translate(790 600) scale(1.15) translate(-790 -600)' }, into) // he and his pillow fill the room, as in the film
    pillow(bed)
    sleeper(bed)
    zees(into)
  }

  return {
    draw,
    /** The toy car in his arms tonight, or not (Krtek a autíčko 15:04). */
    hug(on) {
      toy.style.display = on ? '' : 'none'
    },
  }
})()
