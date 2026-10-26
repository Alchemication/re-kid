// How the little mole is drawn: three views, after the films' frames
// (worlds/krtek/world.yaml, characters[krtek].visual_signature): facing us,
// in three-quarter view (his everyday look) and in profile (walking). One
// soft black teardrop of head and body running into the snout, a small red
// nose at its tip, big white eyes high near the snout, three or four long
// thin hairs arching back, a long teal bib down his front that rises up
// under the nose as his muzzle, big pink hands with four fingers, pink feet.
// Each view has the same parts, so mole.js can pose any of them: two arms
// (near and far), two feet, eyes with pupils and lids, his hairs (they perk
// up), and his face, drawn from numbers (face(f)): the mouth on the muzzle,
// in thin dark line, open with a dark red-brown inside, its corners up or
// down, and a chin line; and brows, light lines on his black face, that lift
// and tilt. As in Krtek a autíčko's close-ups (7:13, 11:41-11:46), the
// mouth carries most of his feeling.
//
// Only drawing here: no state, no clock. mole.js shows one view at a time
// and moves its parts.

/* exported MoleArt */
const MoleArt = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const INK = '#15140f'
  const BODY = '#15140f'
  const BIB = '#4a6a64' // teal in the films; blue-grey in some transfers
  const PINK = '#f2a0a6'
  const NOSE = '#e0442c'
  const MOUTH = '#6a1a14' // inside an open mouth: dark red-brown (Krtek a autíčko 11:41.5)
  const BROW = '#b8c3cf' // lines drawn on his black face (brows, the squeeze by his eyes): light, as the films draw them
  const HAND = 1.35 // his hands, big as in the films: they do half his acting

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const line = (d, parent, width = 3.5) => el('path', { d, stroke: INK, 'stroke-width': width, fill: 'none', 'stroke-linecap': 'round' }, parent)

  /** A pink hand at cx, cy, as the films draw it: a human hand, like a glove, a palm with four
   * fingers held together and a thumb apart, the fingers towards `dir` (degrees, 0 = up). */
  function hand(parent, cx, cy, dir = 0) {
    const g = el('g', { class: 'mole-hand' }, parent)
    g.setAttribute('transform', `rotate(${dir} ${cx} ${cy}) translate(${cx} ${cy}) scale(${dir < 0 ? -HAND : HAND} ${HAND})`) // the thumb always towards his body
    const skin = { fill: PINK, stroke: INK, 'stroke-width': 1.8 }
    el('ellipse', { cx: -10.5, cy: 2, rx: 3.6, ry: 8, ...skin, transform: 'rotate(-38 -10.5 2)' }, g) // the thumb
    el('rect', { x: -9.5, y: -3, width: 19, height: 15, rx: 6, ...skin }, g) // the palm
    for (const [x, len] of [[-6.6, 11], [-2.2, 14], [2.2, 13.5], [6.6, 10]]) el('rect', { x: x - 2.2, y: -3 - len, width: 4.4, height: len + 5, rx: 2.2, ...skin }, g)
    el('rect', { x: -8.6, y: -3.6, width: 17.2, height: 5, fill: PINK }, g) // the fingers grow out of the palm: no line across
    el('ellipse', { cx: -8.4, cy: 3, rx: 2.6, ry: 4, fill: PINK, transform: 'rotate(-38 -8.4 3)' }, g) // nor across the thumb
    return g
  }

  /** An arm from the shoulder (sx, sy) to a hand at (hx, hy), turning about the shoulder. */
  function arm(parent, skin, [sx, sy], [hx, hy], dir) {
    const g = el('g', { class: 'mole-arm' }, parent)
    g.style.transformOrigin = `${sx}px ${sy}px`
    skin.push(el('path', { d: `M${sx} ${sy} Q${(sx + hx) / 2 + (hx - sx) * 0.4} ${(sy + hy) / 2} ${hx} ${hy}`, stroke: BODY, 'stroke-width': 14, fill: 'none', 'stroke-linecap': 'round' }, g))
    hand(g, hx, hy + 6, dir)
    return g
  }

  function foot(parent, cx) {
    const f = el('ellipse', { cx, cy: -5, rx: 18, ry: 8.5, fill: PINK, stroke: INK, 'stroke-width': 2.5 }, parent)
    f.style.transformOrigin = `${cx}px -5px`
    return f
  }

  let clips = 0

  /** Two eyes (or one), their pupils, and white lids with a lash line that
   * close (scaleY 1) over them, as the films draw his closed eyes; and over
   * each a brow, shown only while it acts. `inner`: the x his brows' inner
   * ends are towards (the middle of his face). */
  function eyes(parent, list, inner) {
    const g = el('g', { class: 'mole-eyes' }, parent)
    const clip = el('clipPath', { id: `mole-eye-${++clips}` }, g)
    for (const e of list) {
      el('ellipse', { cx: e.x, cy: e.y, rx: e.rx, ry: e.ry, fill: '#fff' }, g)
      el('ellipse', { cx: e.x, cy: e.y, rx: e.rx, ry: e.ry }, clip)
    }
    const pupils = el('g', {}, g)
    for (const e of list) el('ellipse', { cx: e.px, cy: e.py, rx: e.rx * 0.4, ry: e.ry * 0.42, fill: INK }, pupils)
    const lids = el('g', {}, el('g', { 'clip-path': `url(#mole-eye-${clips})` }, g))
    for (const e of list) {
      const [l, r, top, edge, dip] = [e.x - e.rx - 1, e.x + e.rx + 1, e.y - e.ry - 1, e.y + e.ry * 0.45, e.y + e.ry * 0.9]
      el('path', { d: `M${l} ${top} H${r} V${edge} Q${e.x} ${dip} ${l} ${edge} Z`, fill: '#fff' }, lids)
      line(`M${l} ${edge} Q${e.x} ${dip} ${r} ${edge}`, lids, 2.5)
    }
    for (const e of list) el('ellipse', { cx: e.x, cy: e.y, rx: e.rx, ry: e.ry, fill: 'none', stroke: INK, 'stroke-width': 2 }, g)
    lids.style.transformOrigin = `0px ${Math.min(...list.map((e) => e.y - e.ry - 1))}px`
    lids.style.transform = 'scaleY(0)'
    const browLines = list.map(() => el('path', { fill: 'none', stroke: BROW, 'stroke-width': 3, 'stroke-linecap': 'round' }, g))
    /** The brows: null hides them; lift raises them, tilt > 0 their inner ends up (worried), < 0 down (cross, squeezed). */
    const brows = (b) => list.forEach((e, i) => {
      const line = browLines[i]
      line.style.display = b ? '' : 'none'
      if (!b) return
      const towards = Math.sign(inner - e.x) || 1 // which end is the inner one
      const y = e.y - e.ry - 4 - (b.lift || 0) // just over the eye
      const [x0, x1] = [e.x - towards * e.rx * 0.85, e.x + towards * e.rx * 0.85] // outer, inner
      line.setAttribute('d', `M${x0} ${y + (b.tilt || 0) * 2} Q${e.x} ${y - 5} ${x1} ${y - (b.tilt || 0) * 7}`)
    })
    brows(null)
    return { pupils, lids, brows }
  }

  /**
   * His mouth on the muzzle at x, y, turned `slant` degrees (the three-quarter
   * and side views), `w` wide and opening `h` deep at most. Returns set(f),
   * which draws it from numbers: open (0 a line, 1 wide), curve (+1 corners
   * up, -1 down), width (a share of w), round (an arched top; 1 or more, an
   * ooh's oval) and chin
   * (the line under an open or smiling mouth). In thin dark line on the teal,
   * open with a dark red-brown inside, as the films draw it.
   */
  function mouth(parent, x, y, slant, w, h) {
    const g = el('g', { class: 'mole-mouth', transform: `translate(${x} ${y}) rotate(${slant})` }, parent)
    const open = el('path', { fill: MOUTH, stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round' }, g)
    const shut = el('path', { fill: 'none', stroke: INK, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, g)
    const chin = el('path', { fill: 'none', stroke: INK, 'stroke-width': 1.8, 'stroke-linecap': 'round' }, g)
    return (f) => {
      const half = (w * f.width) / 2
      const c = f.curve * w * 0.22 // the corners up (+) or down (-)
      const depth = f.open * h
      const isOpen = depth > 1
      open.style.display = isOpen ? '' : 'none'
      shut.style.display = isOpen ? 'none' : ''
      const upper = c * 0.6 - (f.round || 0) * depth // the upper lip's middle: an ooh's arches up
      const lower = 2 * depth + c // the lower lip's
      const ry = depth * 0.55
      if (isOpen && f.round >= 1) open.setAttribute('d', `M${-half} ${ry} A${half} ${ry} 0 1 0 ${half} ${ry} A${half} ${ry} 0 1 0 ${-half} ${ry} Z`) // an ooh: an oval
      else if (isOpen) open.setAttribute('d', `M${-half} ${-c} Q0 ${upper.toFixed(1)} ${half} ${-c} Q0 ${lower.toFixed(1)} ${-half} ${-c} Z`)
      else shut.setAttribute('d', `M${-half} ${-c} Q0 ${(c * 1.5).toFixed(1)} ${half} ${-c}`)
      chin.style.display = f.chin ? '' : 'none'
      const under = (isOpen ? depth : Math.max(0, c * 0.25)) + 6
      if (f.chin) chin.setAttribute('d', `M${-half * 0.45} ${under.toFixed(1)} Q0 ${(under + 4).toFixed(1)} ${half * 0.45} ${under.toFixed(1)}`)
    }
  }

  /** A view's face: its mouth and brows set together from one face's numbers (mole.js FACES). */
  const faceOf = (setMouth, brows) => (f) => {
    setMouth(f)
    brows(f.brows || null)
  }

  /** His three hairs, in a group that can perk up from where they grow (mole.js perk). */
  function hairs(parent, list, root) {
    const g = el('g', { class: 'mole-hair' }, parent)
    for (const d of list) line(d, g).style.transformOrigin = `${root[0]}px ${root[1]}px` // each flutters in the wind (game.css)
    g.style.transformOrigin = `${root[0]}px ${root[1]}px`
    return g
  }

  function spots(parent, list) {
    const g = el('g', { class: 'mole-spots' }, parent)
    for (const [cx, cy] of list) el('circle', { cx, cy, r: 7 }, g)
    g.style.display = 'none'
    return g
  }

  /** Facing us, as on the boat: two big eyes close together, the small nose under them, a wide smile, the bib from under the eyes down. */
  function front(parent, skin) {
    const v = el('g', { class: 'mole-front' }, parent)
    const feet = [foot(v, -24), foot(v, 24)]
    const arms = [arm(v, skin, [-30, -90], [-58, -64], -50), arm(v, skin, [30, -90], [58, -64], 50)]
    skin.push(el('path', { d: 'M-38 -4 C-46 -26 -35 -62 -35 -82 C-35 -100 -46 -116 -41 -136 C-37 -156 -18 -164 0 -164 C18 -164 37 -156 41 -136 C46 -116 35 -100 35 -82 C35 -62 46 -26 38 -4 Q0 6 -38 -4 Z', fill: BODY }, v))
    el('path', { d: 'M0 -110 C17 -110 30 -100 30 -84 C30 -66 26 -50 25 -36 C24 -24 20 -16 14 -14 Q0 -10 -14 -14 C-20 -16 -24 -24 -25 -36 C-26 -50 -30 -66 -30 -84 C-30 -100 -17 -110 0 -110 Z', fill: BIB }, v) // the muzzle, up under the nose (Autíčko 7:13)
    const dots = spots(v, [[-30, -44], [28, -34], [-8, -22], [34, -70], [-36, -78], [14, -52]])
    const hair = hairs(v, ['M-6 -154 C-10 -184 -28 -192 -36 -176', 'M0 -156 C2 -190 -8 -204 -18 -194', 'M6 -154 C10 -184 28 -192 36 -176'], [0, -154])
    const eye = eyes(v, [{ x: -15, y: -126, rx: 15, ry: 21, px: -12, py: -121 }, { x: 15, y: -126, rx: 15, ry: 21, px: 18, py: -121 }], 0)
    el('circle', { cx: 0, cy: -103, r: 8.5, fill: NOSE, stroke: INK, 'stroke-width': 2 }, v)
    const m = mouth(v, 0, -86, 0, 30, 15)
    // in front of everything: the arms, so a hand can go to his face
    for (const a of arms) v.appendChild(a)
    return { view: v, feet, arms, hair, ...eye, face: faceOf(m, eye.brows), dots }
  }

  /** Three-quarter view, facing right (mirrored for left), as he is mostly drawn: the snout up and to the side, the near eye big, the far one half behind it. */
  function three(parent, skin) {
    const v = el('g', { class: 'mole-three' }, parent)
    const far = arm(v, skin, [32, -94], [58, -70], 45) // behind his body
    const feet = [foot(v, -16), foot(v, 24)]
    skin.push(el('path', { d: 'M-36 -4 C-44 -26 -32 -62 -32 -84 C-32 -102 -42 -118 -37 -136 C-32 -152 -14 -156 4 -154 C28 -152 44 -132 44 -110 C44 -98 38 -92 38 -80 C38 -60 46 -24 36 -4 Q0 6 -36 -4 Z', fill: BODY }, v))
    skin.push(el('path', { d: 'M34 -126 C44 -130 54 -134 62 -138 C70 -128 64 -116 52 -110 C46 -107 40 -107 34 -108 Z', fill: BODY }, v))
    el('path', { d: 'M64 -130 C68 -118 58 -106 46 -100 C40 -92 41 -70 38 -44 C36 -26 28 -18 18 -20 C10 -38 10 -76 22 -98 C30 -112 46 -124 64 -130 Z', fill: BIB }, v) // up along under the snout (Autíčko 11:43)
    const dots = spots(v, [[-24, -44], [22, -34], [-6, -22], [30, -70], [-28, -82], [8, -56]])
    const hair = hairs(v, ['M-2 -148 C-8 -174 -26 -180 -36 -164', 'M6 -151 C6 -184 -10 -198 -24 -188', 'M14 -150 C20 -182 6 -200 -8 -196'], [6, -150])
    const eye = eyes(v, [{ x: 42, y: -134, rx: 9, ry: 14, px: 45, py: -131 }, { x: 24, y: -132, rx: 13, ry: 19, px: 29, py: -128 }], 33)
    el('circle', { cx: 66, cy: -136, r: 9, fill: NOSE, stroke: INK, 'stroke-width': 2 }, v)
    line('M56 -130 l14 -4 M56 -126 l14 4', v, 1.5)
    const m = mouth(v, 44, -108, -20, 20, 12)
    const near = arm(v, skin, [-22, -92], [-50, -68], -45)
    return { view: v, feet, arms: [near, far], hair, ...eye, face: faceOf(m, eye.brows), dots }
  }

  /** In profile, facing right (mirrored for left): walking. The snout straight ahead, one big eye, the hairs arching back, one arm, two feet. */
  function side(parent, skin) {
    const v = el('g', { class: 'mole-side' }, parent)
    const feet = [foot(v, -14), foot(v, 16)]
    skin.push(el('path', { d: 'M-36 -4 C-44 -26 -32 -62 -32 -84 C-32 -102 -42 -118 -37 -136 C-32 -150 -14 -152 4 -150 C34 -152 50 -128 50 -108 C50 -96 40 -92 40 -80 C40 -60 46 -24 36 -4 Q0 6 -36 -4 Z', fill: BODY }, v))
    skin.push(el('path', { d: 'M44 -134 C62 -138 78 -132 86 -122 C82 -104 64 -98 48 -100 Z', fill: BODY }, v))
    el('path', { d: 'M86 -118 C80 -106 64 -100 50 -98 C42 -90 44 -60 36 -34 C32 -22 20 -22 16 -32 C14 -58 18 -86 30 -96 C46 -106 66 -110 86 -118 Z', fill: BIB }, v) // under the snout to its tip
    const dots = spots(v, [[-18, -40], [20, -30], [-4, -20], [28, -64], [-22, -80]])
    const hair = hairs(v, ['M-2 -148 C-8 -174 -26 -180 -36 -164', 'M6 -151 C6 -184 -10 -198 -24 -188', 'M14 -150 C20 -182 6 -200 -8 -196'], [6, -150])
    const eye = eyes(v, [{ x: 36, y: -128, rx: 11, ry: 16, px: 41, py: -126 }], 80)
    el('circle', { cx: 88, cy: -124, r: 9, fill: NOSE, stroke: INK, 'stroke-width': 2 }, v)
    line('M76 -118 l16 -5 M76 -114 l16 4', v, 1.5)
    const m = mouth(v, 58, -103, -10, 16, 10)
    const a = arm(v, skin, [10, -94], [40, -74], 60)
    return { view: v, feet, arms: [a, a], hair, ...eye, face: faceOf(m, eye.brows), dots }
  }

  /** All three views into `parent`; the skin list gets every black shape, for paint. */
  function draw(parent, skin) {
    return { front: front(parent, skin), three: three(parent, skin), side: side(parent, skin) }
  }

  return { draw }
})()
