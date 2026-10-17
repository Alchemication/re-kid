// How the little mole is drawn: three views, after the films' frames
// (worlds/krtek/world.yaml, characters[krtek].visual_signature): facing us,
// in three-quarter view (his everyday look) and in profile (walking). One
// soft black teardrop of head and body running into the snout, a small red
// nose at its tip, big white eyes high near the snout, three or four long
// thin hairs arching back, a long teal bib down his front, big pink hands
// with four fingers, pink feet. Each view has the same parts, so mole.js
// can pose any of them: two arms (near and far), two feet, eyes with
// pupils and lids, a smile that can open into a laugh.
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
  const MOUTH = '#7a1f17'

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const line = (d, parent, width = 3.5) => el('path', { d, stroke: INK, 'stroke-width': width, fill: 'none', 'stroke-linecap': 'round' }, parent)

  /** A pink hand at cx, cy: a palm and four fingers fanned towards `dir` (degrees, 0 = up). */
  function hand(parent, cx, cy, dir = 0) {
    const g = el('g', { class: 'mole-hand' }, parent)
    g.setAttribute('transform', `rotate(${dir} ${cx} ${cy})`)
    for (const a of [-54, -18, 18, 54]) {
      const r = (a * Math.PI) / 180
      el('ellipse', { cx: cx + Math.sin(r) * 10, cy: cy - Math.cos(r) * 10, rx: 4.2, ry: 7.5, fill: PINK, stroke: INK, 'stroke-width': 2, transform: `rotate(${a} ${cx + Math.sin(r) * 10} ${cy - Math.cos(r) * 10})` }, g)
    }
    el('ellipse', { cx, cy, rx: 11, ry: 9.5, fill: PINK, stroke: INK, 'stroke-width': 2.2 }, g)
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
   * close (scaleY 1) over them, as the films draw his closed eyes. */
  function eyes(parent, list) {
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
    return { pupils, lids }
  }

  /** A closed smile, and an open laughing mouth (shown instead). */
  function mouth(parent, closed, open) {
    const smile = line(closed, parent, 3.5)
    const laugh = el('g', { class: 'mole-laugh' }, parent)
    el('path', { d: open, fill: MOUTH, stroke: INK, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, laugh)
    laugh.style.display = 'none'
    return { smile, laugh }
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
    const arms = [arm(v, skin, [-40, -92], [-66, -66], -50), arm(v, skin, [40, -92], [66, -66], 50)]
    skin.push(el('path', { d: 'M-50 -6 C-62 -74 -44 -156 0 -158 C44 -156 62 -74 50 -6 Q0 8 -50 -6 Z', fill: BODY }, v))
    el('path', { d: 'M-27 -100 C-38 -62 -36 -18 -20 -8 Q0 0 20 -8 C36 -18 38 -62 27 -100 C14 -110 -14 -110 -27 -100 Z', fill: BIB }, v)
    const dots = spots(v, [[-30, -44], [28, -34], [-8, -22], [34, -70], [-36, -78], [14, -52]])
    for (const d of ['M-6 -154 C-10 -184 -28 -192 -36 -176', 'M0 -156 C2 -190 -8 -204 -18 -194', 'M6 -154 C10 -184 28 -192 36 -176']) line(d, v)
    const eye = eyes(v, [{ x: -15, y: -126, rx: 15, ry: 21, px: -12, py: -121 }, { x: 15, y: -126, rx: 15, ry: 21, px: 18, py: -121 }])
    el('circle', { cx: 0, cy: -101, r: 8.5, fill: NOSE, stroke: INK, 'stroke-width': 2 }, v)
    const m = mouth(v, 'M-22 -91 Q0 -70 22 -91', 'M-20 -92 Q0 -58 20 -92 Q0 -82 -20 -92 Z')
    // in front of everything: the arms, so a hand can go to his face
    for (const a of arms) v.appendChild(a)
    return { view: v, feet, arms, ...eye, ...m, dots }
  }

  /** Three-quarter view, facing right (mirrored for left), as he is mostly drawn: the snout up and to the side, the near eye big, the far one half behind it. */
  function three(parent, skin) {
    const v = el('g', { class: 'mole-three' }, parent)
    const far = arm(v, skin, [40, -94], [66, -70], 45) // behind his body
    const feet = [foot(v, -16), foot(v, 24)]
    skin.push(el('path', { d: 'M-42 -6 C-56 -70 -40 -148 2 -152 C36 -154 54 -124 56 -96 C58 -60 46 -14 36 -6 Q-2 6 -42 -6 Z', fill: BODY }, v))
    skin.push(el('path', { d: 'M36 -128 C50 -132 64 -138 74 -144 C82 -134 74 -118 58 -110 C50 -106 42 -106 36 -108 Z', fill: BODY }, v))
    el('path', { d: 'M24 -104 C46 -108 58 -76 50 -40 C46 -16 30 -6 14 -10 C2 -30 4 -80 24 -104 Z', fill: BIB }, v)
    const dots = spots(v, [[-24, -44], [22, -34], [-6, -22], [30, -70], [-28, -82], [8, -56]])
    for (const d of ['M-2 -148 C-8 -174 -26 -180 -36 -164', 'M6 -151 C6 -184 -10 -198 -24 -188', 'M14 -150 C20 -182 6 -200 -8 -196']) line(d, v)
    const eye = eyes(v, [{ x: 42, y: -134, rx: 9, ry: 14, px: 45, py: -131 }, { x: 24, y: -132, rx: 13, ry: 19, px: 29, py: -128 }])
    el('circle', { cx: 77, cy: -142, r: 8.5, fill: NOSE, stroke: INK, 'stroke-width': 2 }, v)
    line('M66 -138 l16 -4 M66 -134 l16 4', v, 1.5)
    const m = mouth(v, 'M44 -108 Q56 -98 66 -114', 'M44 -110 Q56 -86 68 -116 Q56 -104 44 -110 Z')
    const near = arm(v, skin, [-30, -92], [-58, -68], -45)
    return { view: v, feet, arms: [near, far], ...eye, ...m, dots }
  }

  /** In profile, facing right (mirrored for left): walking. The snout straight ahead, one big eye, the hairs arching back, one arm, two feet. */
  function side(parent, skin) {
    const v = el('g', { class: 'mole-side' }, parent)
    const feet = [foot(v, -14), foot(v, 16)]
    skin.push(el('path', { d: 'M-38 -8 C-50 -70 -36 -142 4 -150 C34 -154 52 -128 58 -108 C60 -80 46 -20 30 -6 Q-4 4 -38 -8 Z', fill: BODY }, v))
    skin.push(el('path', { d: 'M46 -126 C64 -128 80 -122 90 -114 C84 -102 66 -98 50 -100 Z', fill: BODY }, v))
    el('path', { d: 'M30 -100 C48 -92 52 -54 38 -20 C30 -8 10 -10 8 -28 C6 -56 12 -90 30 -100 Z', fill: BIB }, v)
    const dots = spots(v, [[-18, -40], [20, -30], [-4, -20], [28, -64], [-22, -80]])
    for (const d of ['M-2 -148 C-8 -174 -26 -180 -36 -164', 'M6 -151 C6 -184 -10 -198 -24 -188', 'M14 -150 C20 -182 6 -200 -8 -196']) line(d, v)
    const eye = eyes(v, [{ x: 36, y: -128, rx: 11, ry: 16, px: 41, py: -126 }])
    el('circle', { cx: 92, cy: -114, r: 8, fill: NOSE, stroke: INK, 'stroke-width': 2 }, v)
    line('M80 -110 l16 -5 M80 -106 l16 4', v, 1.5)
    const m = mouth(v, 'M56 -101 Q64 -94 74 -102', 'M56 -102 Q64 -84 76 -104 Q64 -98 56 -102 Z')
    const a = arm(v, skin, [10, -94], [40, -74], 60)
    return { view: v, feet, arms: [a, a], ...eye, ...m, dots }
  }

  /** All three views into `parent`; the skin list gets every black shape, for paint. */
  function draw(parent, skin) {
    return { front: front(parent, skin), three: three(parent, skin), side: side(parent, skin) }
  }

  return { draw }
})()
