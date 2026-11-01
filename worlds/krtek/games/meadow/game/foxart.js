// How the fox is drawn, after Krtek malířem (1:00-1:55): up on his hind legs
// like a person, a big bushy tail with a white tip, a white chest, legs in
// dark socks, and a big head in a spiky white ruff: tall pointed ears, a long
// snout with a black nose and whiskers, two round eyes under heavy brows, and
// a wide mouth full of sharp teeth. His face acts as the film's does, with
// the brows and the mouth (feel): sly as he sneaks (1:01), laughing with his
// eyes squeezed shut (1:02), snarling (1:07), shocked (1:28) and scared,
// brows up and mouth wobbling (1:52-1:53); and ours, sorry, eyes down. A long shadow runs out ahead of
// him, so it slides into view before he does: a touch of spooky (Adam,
// 2026-11-01: a little is fine). He comes in big, rears up bigger over the
// nest, and frightened shrinks small and hunched (grow), his ruff bristling.
//
// Only drawing and his own moves here: paint.js says when.

/* global Motion */
/* exported FoxArt */
const FoxArt = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const INK = '#15140f'
  const ORANGE = '#c8642a'
  const WHITE = '#fbf8ef'
  const DARK = '#3a2414'
  const MOUTH = '#6b1d1d'
  const PINK = '#e8788a'
  const HEAD_AT = 'translate(-14 -296) scale(1.5)' // a big head, as the films': drawn round its middle
  const EYES = [[-27, -15, 9, 12], [-6, -17, 10, 13]] // far and near eye: cx, cy, rx, ry (three-quarter view)

  // Each face: how far the lids come down (0 open, 1 shut), or eyes squeezed shut (laughing); the
  // pupils' size and where they look; the brows' inner and outer ends (above the eye's top: lower is
  // cross, inner end up is worried); and the mouth.
  const FACES = {
    sly: { lid: 0.45, pupil: 3.2, look: [-2, 2], brow: [1, -5], mouth: 'smirk' },
    laugh: { squeeze: true, brow: [-6, -8], mouth: 'grin' },
    snarl: { lid: 0.5, pupil: 2.6, look: [-2, 2], brow: [4, -7], mouth: 'snarl' },
    shock: { lid: 0, pupil: 1.8, look: [0, 0], brow: [-11, -10], mouth: 'gape' },
    scared: { lid: 0, pupil: 2.4, look: [3, -1], brow: [-10, -2], mouth: 'wobble' },
    sorry: { lid: 0.55, pupil: 2.6, look: [2, 6], brow: [-13, 1], mouth: 'meek' }, // found out: eyes on the ground
  }

  /** A row of sharp teeth from x0 to x1 along y, pointing down (h > 0) or up (h < 0). */
  const teeth = (x0, x1, y, h, n) => {
    const w = (x1 - x0) / n
    let d = `M${x0} ${y}`
    for (let i = 0; i < n; i++) d += ` l${(w / 2).toFixed(1)} ${h} l${(w / 2).toFixed(1)} ${-h}`
    return `${d} Z`
  }

  const MOUTHS = {
    smirk: (el, g) => {
      el('path', { d: 'M-57 5 Q-30 15 -1 3 Q-26 22 -57 5 Z', fill: PINK, stroke: INK, 'stroke-width': 2 }, g)
      el('path', { d: teeth(-50, -26, 8, 4, 4), fill: '#fff', stroke: INK, 'stroke-width': 1 }, g)
    },
    grin: (el, g) => {
      el('path', { d: 'M-61 4 Q-30 12 1 0 Q-20 42 -61 4 Z', fill: MOUTH, stroke: INK, 'stroke-width': 2 }, g)
      el('ellipse', { cx: -26, cy: 23, rx: 12, ry: 5, fill: PINK }, g)
      el('path', { d: teeth(-57, -4, 6, 7, 8), fill: '#fff', stroke: INK, 'stroke-width': 1 }, g)
    },
    snarl: (el, g) => {
      el('path', { d: 'M-61 3 Q-30 8 -1 -2 Q-22 38 -61 3 Z', fill: MOUTH, stroke: INK, 'stroke-width': 2 }, g)
      el('path', { d: teeth(-57, -6, 4, 10, 6), fill: '#fff', stroke: INK, 'stroke-width': 1 }, g)
      el('path', { d: teeth(-48, -14, 26, -9, 4), fill: '#fff', stroke: INK, 'stroke-width': 1 }, g)
    },
    gape: (el, g) => {
      el('ellipse', { cx: -34, cy: 15, rx: 9, ry: 13, fill: MOUTH, stroke: INK, 'stroke-width': 2 }, g)
    },
    meek: (el, g) => {
      el('path', { d: 'M-46 10 q9 5 18 0', fill: 'none', stroke: INK, 'stroke-width': 2.5, 'stroke-linecap': 'round' }, g)
    },
    wobble: (el, g) => {
      el('path', { d: 'M-50 13 q4 -5 8 0 q4 5 8 0 q4 -5 8 0 q4 5 8 0', fill: 'none', stroke: INK, 'stroke-width': 2.5, 'stroke-linecap': 'round' }, g)
    },
  }

  /** One face: eyes (lidded, or squeezed shut), brows, mouth, in its own group. */
  function face(el, into, name) {
    const f = FACES[name]
    const g = el('g', { class: `face ${name}`, style: 'display: none' }, into)
    for (const [cx, cy, rx, ry] of EYES) {
      if (f.squeeze) {
        el('path', { d: `M${cx - rx} ${cy + 2} q${rx} -${ry} ${2 * rx} 0`, fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, g)
      } else {
        el('ellipse', { cx, cy, rx, ry, fill: '#fff', stroke: INK, 'stroke-width': 1.8 }, g)
        el('circle', { cx: cx + f.look[0], cy: cy + f.look[1], r: f.pupil, fill: INK }, g)
        if (f.lid) {
          // the lid: the eye's top, down to a straight edge
          const y0 = cy - ry + 2 * ry * f.lid
          const dx = rx * Math.sqrt(1 - ((y0 - cy) / ry) ** 2)
          el('path', { d: `M${cx - dx} ${y0} A${rx} ${ry} 0 ${f.lid > 0.5 ? 1 : 0} 1 ${cx + dx} ${y0} Z`, fill: ORANGE, stroke: INK, 'stroke-width': 1.8 }, g)
        }
      }
      const top = cy - ry - 2
      el('path', { d: `M${cx - rx - 3} ${top + f.brow[0]} L${cx + rx + 3} ${top + f.brow[1]}`, stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, g)
    }
    MOUTHS[f.mouth](el, g)
    return g
  }

  /** Into g (facing left, his feet at 0, 0); el and fluffy are friends.js's. Returns his head. */
  function draw(g, { el, fluffy }) {
    const line = { stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }
    const orange = { fill: ORANGE, ...line }
    const sock = { fill: DARK, ...line, 'stroke-width': 2 }
    const size = el('g', { class: 'size' }, g) // grow(): from his feet
    // his shadow, cast long ahead of him over the grass towards us, his ears at its tip
    el('path', { class: 'shadow', d: 'M30 -4 C-40 0 -200 22 -320 34 C-336 30 -350 26 -362 30 l-20 -14 l8 22 l-18 -8 l12 18 C-330 62 -300 60 -260 56 C-150 44 -40 26 30 4 Z', fill: '#1d2233', opacity: 0.34 }, size)
    el('path', { d: fluffy(84, -196, 30, 74, 10, 0.12), ...orange, transform: 'rotate(32 84 -196)' }, size) // the tail
    el('path', { d: fluffy(124, -258, 18, 20, 8, 0.2), fill: WHITE, ...line, 'stroke-width': 2 }, size)
    for (const x of [-12, 18]) {
      el('ellipse', { cx: x, cy: -104, rx: 20, ry: 40, ...orange }, size) // a thigh
      el('path', { d: `M${x - 9} -74 L${x - 7} -12 L${x + 7} -12 L${x + 9} -74 Z`, ...sock }, size)
      el('ellipse', { cx: x - 14, cy: -7, rx: 20, ry: 8, ...sock }, size) // a foot, to the front
    }
    const body = el('g', { transform: 'rotate(-12 0 -120)' }, size) // hunched forward: sneaking
    el('ellipse', { cx: 0, cy: -190, rx: 46, ry: 84, ...orange }, body)
    el('ellipse', { cx: -18, cy: -196, rx: 24, ry: 58, fill: WHITE }, body)
    const paws = el('g', { class: 'paws' }, size)
    paws.style.transformOrigin = '-20px -248px' // his shoulders: paws() swings them up
    for (const [sx, px, py] of [[-6, -54, -204], [-34, -46, -196]]) {
      el('path', { d: `M${sx} -248 Q${sx - 30} -238 ${px} ${py}`, fill: 'none', stroke: INK, 'stroke-width': 17, 'stroke-linecap': 'round' }, paws)
      el('path', { d: `M${sx} -248 Q${sx - 30} -238 ${px} ${py}`, fill: 'none', stroke: ORANGE, 'stroke-width': 12, 'stroke-linecap': 'round' }, paws)
      el('circle', { cx: px, cy: py, r: 9, ...sock }, paws)
      el('path', { d: `M${px - 8} ${py - 4} l-6 -3 M${px - 9} ${py + 1} l-7 0 M${px - 7} ${py + 6} l-6 3`, stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round' }, paws) // claws
    }
    const head = el('g', { class: 'head' }, size)
    const h = el('g', { transform: HEAD_AT }, head)
    el('path', { class: 'ruff', d: fluffy(6, 0, 46, 44, 15, 0.34), fill: WHITE, ...line, 'stroke-width': 2 }, h)
    el('path', { d: 'M-18 -20 l-10 -44 l30 30 z', ...orange, 'stroke-width': 2.5 }, h) // ears
    el('path', { d: 'M6 -24 l4 -44 l18 38 z', ...orange, 'stroke-width': 2.5 }, h)
    el('path', { d: 'M-21 -34 l-4 -20 l12 12 z M10 -36 l2 -20 l8 16 z', fill: DARK }, h)
    el('path', { d: 'M24 -4 C26 -26 4 -34 -14 -27 C-30 -21 -44 -13 -60 -5 C-67 -1 -65 6 -58 7 C-40 10 -24 16 -6 16 C12 16 22 10 24 -4 Z', ...orange, 'stroke-width': 2.5 }, h)
    el('ellipse', { cx: -63, cy: 0, rx: 6, ry: 5, fill: INK }, h) // the nose
    el('path', { d: 'M-46 -1 l-22 -14 M-45 2 l-27 -3 M-44 5 l-22 9', stroke: INK, 'stroke-width': 1, fill: 'none' }, h) // whiskers
    el('path', { class: 'tongue', d: 'M-56 6 q-6 12 6 10 q4 -2 2 -8', fill: PINK, stroke: INK, 'stroke-width': 1.5, style: 'display: none' }, h)
    for (const name of Object.keys(FACES)) face(el, h, name)
    h.querySelector('.face.sly').style.display = ''
    return head
  }

  /** His own moves, on his drawing in `inner` (friends.js make). */
  function moves(inner) {
    const part = (sel) => inner.querySelector(sel)
    return {
      /** A face from FACES: shown at once, the last one hidden. */
      feel(name) {
        for (const g of inner.querySelectorAll('.face')) g.style.display = g.classList.contains(name) ? '' : 'none'
      },
      /** Bigger or smaller (k), from his feet; squash < 1 hunches him down. At once without ms. */
      async grow(k, ms = 0, squash = 1) {
        const to = `scale(${k}, ${k * squash})`
        if (!ms) {
          part('.size').style.transform = to
          return
        }
        await Motion.endAt(part('.size'), [{ transform: to }], { duration: ms, easing: 'cubic-bezier(.3,1.3,.5,1)' })
      },
      /** His paws swung up from the shoulders (deg; 0 down in front of him). */
      async paws(deg, ms) {
        await Motion.endAt(part('.paws'), [{ transform: `rotate(${deg}deg)` }], { duration: ms, easing: 'ease-out' })
      },
      /** His ruff standing on end, trembling (game.css), or lying down again. */
      bristle(on) {
        inner.classList.toggle('bristle', on)
      },
      /** Paint dabbed on him (the mouse, making friends): spots of `colour` on his white chest, growing and
       * shrinking with him. Only spots: he is never striped. */
      daub(pattern, colour) {
        const size = part('.size')
        const marks = size.insertBefore(document.createElementNS(SVG, 'g'), part('.paws')) // under his paws
        marks.setAttribute('class', 'paint')
        for (const [cx, cy] of [[-30, -222], [-16, -198], [-34, -176], [-14, -158], [-26, -138]]) {
          const c = marks.appendChild(document.createElementNS(SVG, 'circle'))
          for (const [k, v] of Object.entries({ cx, cy, r: 8, fill: colour })) c.setAttribute(k, v)
        }
      },
      /** Licks his lips, his tongue out round his grin and back in. */
      async lick() {
        const tongue = part('.tongue')
        tongue.style.display = ''
        try {
          await Motion.endAt(tongue, [{ transform: 'translateX(0px)' }, { transform: 'translateX(-10px)', offset: 0.5 }, { transform: 'translateX(0px)' }], { duration: 700 })
        } finally {
          tongue.style.display = 'none'
        }
      },
      /** Rubbing his paws together, pleased with his plan. */
      async rub(times = 3) {
        const frames = [{ transform: 'rotate(0deg)' }]
        for (let i = 0; i < times; i++) frames.push({ transform: 'rotate(-7deg)' }, { transform: 'rotate(5deg)' })
        frames.push({ transform: 'rotate(0deg)' })
        await Motion.endAt(part('.paws'), frames, { duration: 260 * times })
      },
    }
  }

  return { draw, moves }
})()
