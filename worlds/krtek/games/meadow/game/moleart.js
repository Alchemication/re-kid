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
  const PINK = '#eda88f' // his hands and feet: a warm peach-pink (Autíčko 11:34-11:37)
  const SKIN_LINE = '#8c4f3c' // their outline: thin and brown, not ink, so they don't read as stickers
  const NOSE = '#e0442c'
  const WHITE = '#eef1ef' // his eyes' white: a little grey, as on the cels
  const MOUTH = '#6e3430' // the tongue in his open mouth: a muted red-brown (Krtek a autíčko 11:41.5)
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
    const skin = { fill: PINK, stroke: SKIN_LINE, 'stroke-width': 1.1 }
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
    const f = el('ellipse', { cx, cy: -5, rx: 18, ry: 8.5, fill: PINK, stroke: SKIN_LINE, 'stroke-width': 1.5 }, parent)
    f.style.transformOrigin = `${cx}px -5px`
    return f
  }

  let clips = 0

  /** Two eyes (or one), their pupils, and white lids with a lash line that
   * close (scaleY 1) over them, as the films draw his closed eyes; and over
   * each a brow, shown only while it acts. `inner`: the x his brows' inner
   * ends are towards (the middle of his face). Small tall eggs, tilted
   * (`tilt`, degrees), with no outline, the white straight on his black
   * (Krtek a autíčko 7:12, 11:36-11:43). The pupils are upright ovals a
   * little above the middle, so he looks up, hopeful; clipped to the white,
   * a glance runs them to its edge. */
  function eyes(parent, list, inner) {
    const g = el('g', { class: 'mole-eyes' }, parent)
    const clip = el('clipPath', { id: `mole-eye-${++clips}` }, g)
    const oval = (e, attrs, to) => { // an egg: widest a little below the middle, narrower at the top
      const [w, h] = [e.rx, e.ry]
      const d = `M0 ${-h} C${0.6 * w} ${-h} ${w} ${-0.45 * h} ${w} ${0.1 * h} C${w} ${0.65 * h} ${0.55 * w} ${h} 0 ${h} C${-0.55 * w} ${h} ${-w} ${0.65 * h} ${-w} ${0.1 * h} C${-w} ${-0.45 * h} ${-0.6 * w} ${-h} 0 ${-h} Z`
      return el('path', { d, transform: `translate(${e.x} ${e.y}) rotate(${e.tilt || 0})`, ...attrs }, to)
    }
    for (const e of list) {
      oval(e, { fill: WHITE }, g)
      oval(e, {}, clip)
    }
    const inside = el('g', { 'clip-path': `url(#mole-eye-${clips})` }, g)
    const pupils = el('g', {}, inside)
    for (const e of list) el('ellipse', { cx: e.px, cy: e.py, rx: e.rx * 0.45, ry: e.ry * 0.47, fill: INK, transform: `rotate(${e.tilt || 0} ${e.px} ${e.py})` }, pupils)
    const lids = el('g', {}, inside)
    for (const e of list) {
      const [l, r, top, edge, dip] = [e.x - e.rx - 3, e.x + e.rx + 3, e.y - e.ry - 3, e.y + e.ry * 0.45, e.y + e.ry * 0.9]
      el('path', { d: `M${l} ${top} H${r} V${edge} Q${e.x} ${dip} ${l} ${edge} Z`, fill: WHITE }, lids)
      line(`M${l} ${edge} Q${e.x} ${dip} ${r} ${edge}`, lids, 2)
    }
    lids.style.transformOrigin = `0px ${Math.min(...list.map((e) => e.y - e.ry - 3))}px`
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
   * and side views), `w` wide and opening `h` deep at most; shut, its line
   * `drop` lower (out of the black snout); its creases on `sides` (-1 the
   * left, 1 the right: turned, only the near one shows). Returns set(f),
   * which draws it from numbers: open (0 a line, 1 wide), curve (+1 corners
   * up, -1 down), width (a share of w), round (an arched top; 1 or more, an
   * ooh's oval), lean (-1..1: the open mouth
   * lopsided, deepest to one side) and chin (the line under an open or
   * smiling mouth). Shut, a thin dark line on the teal; open, black inside
   * with a red-brown tongue at the bottom, its corners tucked up into his
   * cheeks when he smiles, so facing us it runs on from
   * his black snout and the teal's edge makes his lips (Autíčko 7:12).
   */
  /** An open mouth's outline: a wide U under a gently curved upper lip, lopsided by lean; an ooh's, an oval. */
  function openMouth(f, half, c, depth, lean) {
    const ry = depth * 0.55
    if (f.round >= 1) return `M${-half} ${ry} A${half} ${ry} 0 1 0 ${half} ${ry} A${half} ${ry} 0 1 0 ${-half} ${ry} Z`
    const upper = c * 0.6 - (f.round || 0) * depth // the upper lip's middle: an ooh's arches up
    const low = ((2 * depth + c) * 0.67).toFixed(1) // the lower lip's controls: round to the corners, not a lens
    const full = half * 0.95
    return `M${-half} ${-c} Q${(lean * 0.4).toFixed(1)} ${upper.toFixed(1)} ${half} ${-c} C${(full + lean).toFixed(1)} ${low} ${(lean - full).toFixed(1)} ${low} ${-half} ${-c} Z`
  }

  /** A smile's crease on side s (-1 left, 1 right): from the corner up and out over the cheek, wide at the corner, thinning to a point that bends down; `w` its size, bigger on the side a lopsided smile pulls up, away from its deepest part (Autíčko 7:12). */
  function crease(s, half, c, w) {
    const t = 1.5 // half its width at the corner
    const pt = (x, y) => `${(s * x).toFixed(1)} ${y.toFixed(1)}`
    const [x1, y1, x2, y2] = [half + w * 0.04, -c - w * 0.17, half + w * 0.22, -c - w * 0.2]
    const end = pt(half + w * 0.36, -c - w * 0.06)
    return `M${pt(half - 1 - t, -c + 1)} C${pt(x1 - t, y1 - t)} ${pt(x2, y2 - t)} ${end} C${pt(x2, y2 + t * 0.4)} ${pt(x1 + t, y1 + t * 0.6)} ${pt(half - 1 + t, -c + 1)} Z`
  }

  function mouth(parent, x, y, slant, w, h, drop = 0, sides = [-1, 1]) {
    const g = el('g', { class: 'mole-mouth', transform: `translate(${x} ${y}) rotate(${slant})` }, parent)
    const shape = el('path', {}, el('clipPath', { id: `mole-mouth-${++clips}` }, g))
    const open = el('path', { fill: INK }, g)
    const tongue = el('ellipse', { fill: MOUTH, 'clip-path': `url(#mole-mouth-${clips})` }, g)
    const shut = el('path', { fill: 'none', stroke: INK, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, g)
    const chin = el('path', { fill: 'none', stroke: INK, 'stroke-width': 1.8, 'stroke-linecap': 'round' }, g)
    const creases = el('path', { fill: INK }, g)
    return (f) => {
      const half = (w * f.width) / 2
      const c = f.curve * w * 0.22 // the corners up (+) or down (-)
      const depth = f.open * h
      const isOpen = depth > 1
      for (const e of [open, tongue]) e.style.display = isOpen ? '' : 'none'
      shut.style.display = isOpen ? 'none' : ''
      const lean = (f.lean || 0) * half
      const d = openMouth(f, half, c, depth, lean)
      if (isOpen) {
        open.setAttribute('d', d)
        shape.setAttribute('d', d)
        const bottom = f.round >= 1 ? 1.1 * depth : depth
        for (const [k, v] of Object.entries({ cx: lean * 0.5, cy: bottom, rx: half * 0.8, ry: depth * 0.55 })) tongue.setAttribute(k, v.toFixed(1))
      } else shut.setAttribute('d', `M${-half} ${drop - c} Q0 ${(drop + c * 1.5).toFixed(1)} ${half} ${drop - c}`)
      const smiling = isOpen && f.curve > 0 && !(f.round >= 1)
      creases.style.display = smiling ? '' : 'none' // from the corners up and out along his cheeks' tops (Autíčko 7:12)
      if (smiling) creases.setAttribute('d', sides.map((s) => crease(s, half, c, w * (1 - s * (f.lean || 0) * 0.5))).join(' '))
      chin.style.display = f.chin ? '' : 'none'
      const under = (isOpen ? depth : drop + Math.max(0, c * 0.25)) + 6
      if (f.chin) chin.setAttribute('d', `M${-half * 0.45} ${under.toFixed(1)} Q0 ${(under + 4).toFixed(1)} ${half * 0.45} ${under.toFixed(1)}`)
    }
  }

  /** A view's face: its mouth and brows set together from one face's numbers (mole.js FACES). */
  const faceOf = (setMouth, brows) => (f) => {
    setMouth(f)
    brows(f.brows || null)
  }

  /** His three hairs, fine lines as the films draw them, in a group that can perk up from where they grow (mole.js perk). */
  function hairs(parent, list, root) {
    const g = el('g', { class: 'mole-hair' }, parent)
    for (const d of list) line(d, g, 1.8).style.transformOrigin = `${root[0]}px ${root[1]}px` // each flutters in the wind (game.css)
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
    const arms = [arm(v, skin, [-31, -80], [-59, -54], -50), arm(v, skin, [31, -80], [59, -54], 50)] // out of his black sides, beside the teal
    skin.push(el('path', { d: 'M-38 -4 C-46 -26 -35 -62 -35 -82 C-35 -100 -46 -116 -41 -136 C-37 -156 -18 -164 0 -164 C18 -164 37 -156 41 -136 C46 -116 35 -100 35 -82 C35 -62 46 -26 38 -4 Q0 6 -38 -4 Z', fill: BODY }, v))
    el('path', { d: 'M-25 -84 C-29 -96 -28 -106 -21 -106 C-16 -106 -15 -101 -15 -97 C-15 -91 -9 -88 0 -88 C9 -88 15 -91 15 -97 C15 -101 16 -106 21 -106 C28 -106 29 -96 25 -84 C24 -66 22 -50 21 -36 C20 -24 17 -16 12 -14 Q0 -10 -12 -14 C-17 -16 -20 -24 -21 -36 C-22 -50 -24 -66 -25 -84 Z', fill: BIB }, v) // the muzzle, about 60% of his width: cheeks up to his eyes, his black snout coming down between them into the mouth (Autíčko 7:12)
    const dots = spots(v, [[-30, -44], [28, -34], [-8, -22], [34, -70], [-36, -78], [14, -52]])
    const hair = hairs(v, ['M-6 -154 C-10 -184 -28 -192 -36 -176', 'M0 -156 C2 -190 -8 -204 -18 -194', 'M6 -154 C10 -184 28 -192 36 -176'], [0, -154])
    const eye = eyes(v, [{ x: -17, y: -122, rx: 7.5, ry: 14, tilt: -5, px: -16.5, py: -124 }, { x: 17, y: -122, rx: 7.5, ry: 14, tilt: 5, px: 16.5, py: -124 }], 0)
    el('ellipse', { cx: 0, cy: -103, rx: 9, ry: 5, fill: NOSE }, v) // flat, level with the bottom of his eyes, his black snout under it
    const m = mouth(v, 0, -94, 0, 30, 15, 9) // its top under his snout's foot: one black from snout to tongue
    // in front of everything: the arms, so a hand can go to his face
    for (const a of arms) v.appendChild(a)
    return { view: v, feet, arms, hair, ...eye, face: faceOf(m, eye.brows), dots }
  }

  /** Three-quarter view, facing right (mirrored for left), as he is mostly drawn: a round head with a blunt snout, both eyes big, the nose low at the front edge, the teal wrapping round his mouth (Autíčko 7:10-7:12). */
  function three(parent, skin) {
    const v = el('g', { class: 'mole-three' }, parent)
    const far = arm(v, skin, [32, -94], [58, -70], 45) // behind his body
    const feet = [foot(v, -16), foot(v, 24)]
    skin.push(el('path', { d: 'M-36 -4 C-44 -26 -32 -62 -32 -84 C-32 -104 -42 -122 -36 -140 C-30 -158 -8 -166 12 -165 C36 -164 52 -146 53 -128 C54 -122 58 -120 63 -118 C69 -116 70 -108 65 -105 C61 -100 55 -96 51 -92 C46 -86 44 -76 44 -66 C44 -46 46 -24 36 -4 Q0 6 -36 -4 Z', fill: BODY }, v))
    el('path', { d: 'M-4 -96 C-4 -106 10 -110 22 -106 C30 -103 34 -102 38 -103 C46 -105 56 -105 63 -104 C60 -99 54 -96 50 -92 C45 -86 44 -76 43 -66 C42 -48 42 -32 36 -22 C28 -14 8 -16 2 -26 C-6 -46 -8 -80 -4 -98 Z', fill: BIB }, v) // a wide band, its near cheek up under the eye, round his mouth under the snout to his chin (Autíčko 7:11)
    const dots = spots(v, [[-24, -44], [22, -34], [-6, -22], [30, -70], [-28, -82], [8, -56]])
    const hair = hairs(v, ['M4 -162 C-2 -188 -20 -194 -30 -178', 'M12 -164 C12 -197 -4 -211 -18 -201', 'M20 -163 C26 -195 12 -213 -2 -209'], [12, -163])
    const eye = eyes(v, [{ x: 39, y: -128, rx: 6.5, ry: 14, tilt: -5, px: 40, py: -130 }, { x: 19, y: -128, rx: 8, ry: 15, tilt: -5, px: 21, py: -130 }], 30)
    el('ellipse', { cx: 66, cy: -112, rx: 5.5, ry: 4.5, fill: NOSE, transform: 'rotate(-10 66 -112)' }, v) // on the short snout's tip, level with the bottom of his eyes
    line('M66 -109 l20 -9 M67 -108 l22 -2 M66 -106 l19 6', v, 1)
    const m = mouth(v, 47, -101, -15, 20, 17, 9, [-1]) // under the nose: one black from snout to tongue, as facing us
    const near = arm(v, skin, [-22, -92], [-50, -68], -45)
    return { view: v, feet, arms: [near, far], hair, ...eye, face: faceOf(m, eye.brows), dots }
  }

  /** In profile, facing right (mirrored for left): walking. A round head, its front dipping under the eye into a thin straight snout with the nose a cap on its tip, one big eye near the front, the hairs arching back, one arm, two feet (Autíčko 11:34). */
  function side(parent, skin) {
    const v = el('g', { class: 'mole-side' }, parent)
    const feet = [foot(v, -14), foot(v, 16)]
    skin.push(el('path', { d: 'M-36 -4 C-44 -26 -32 -62 -32 -84 C-32 -104 -42 -122 -36 -140 C-30 -158 -6 -167 14 -166 C38 -165 52 -148 51 -130 C51 -122 52 -117 57 -116 C61 -115 66 -116 70 -117 C75 -117 75 -105 70 -105 C64 -105 57 -104 53 -100 C49 -97 46 -93 42 -89 C38 -66 46 -26 36 -4 Q0 6 -36 -4 Z', fill: BODY }, v))
    el('path', { d: 'M53 -100 C49 -95 46 -86 44 -74 C42 -50 40 -30 34 -22 C26 -16 16 -20 14 -30 C12 -56 16 -80 26 -90 C34 -96 44 -98 53 -100 Z', fill: BIB }, v) // from under his chin down his front
    const dots = spots(v, [[-18, -40], [20, -30], [-4, -20], [28, -64], [-22, -80]])
    const hair = hairs(v, ['M4 -162 C-2 -188 -20 -194 -30 -178', 'M12 -164 C12 -197 -4 -211 -18 -201', 'M20 -163 C26 -195 12 -213 -2 -209'], [12, -163])
    const eye = eyes(v, [{ x: 40, y: -131, rx: 6, ry: 14, tilt: -6, px: 42.5, py: -133 }], 60)
    el('ellipse', { cx: 72.5, cy: -111, rx: 5, ry: 7, fill: NOSE, transform: 'rotate(-12 72.5 -111)' }, v) // a cap on the snout's tip
    line('M70 -107 l22 -7 M70 -106 l24 1 M69 -105 l20 8', v, 1)
    const m = mouth(v, 48, -95, -20, 14, 10, 4, [-1])
    const a = arm(v, skin, [10, -94], [40, -74], 60)
    return { view: v, feet, arms: [a, a], hair, ...eye, face: faceOf(m, eye.brows), dots }
  }

  /** All three views into `parent`; the skin list gets every black shape, for paint. */
  function draw(parent, skin) {
    return { front: front(parent, skin), three: three(parent, skin), side: side(parent, skin) }
  }

  return { draw }
})()
