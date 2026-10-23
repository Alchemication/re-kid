// How the little mole is drawn: three views, after the films' frames
// (worlds/krtek/world.yaml, characters[krtek].visual_signature): facing us,
// in three-quarter view (his everyday look) and in profile (walking). One
// soft black teardrop of head and body running into the snout, a small red
// nose at its tip, big white eyes high near the snout, three or four long
// thin hairs arching back, a long teal bib down his front, big pink hands
// with four fingers, pink feet. Each view has the same parts, so mole.js
// can pose any of them: two arms (near and far), two feet, eyes with
// pupils and lids, his hairs (they perk up), and his mouths: a smile, a
// laugh, a round "o" and a frown.
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
  const SMILE = '#d0453a'
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

  /** His mouths, one shown at a time (mole.js): a closed smile, an open laugh, a little round
   * "o" (surprise, ooh) at [x, y, size], and a frown (ach jo). */
  function mouth(parent, closed, open, [ox, oy, os], frown) {
    const smile = line(closed, parent, 3.5)
    smile.setAttribute('stroke', SMILE) // red on his black face, as the films draw it (ink would vanish)
    const laugh = el('g', { class: 'mole-laugh' }, parent)
    el('path', { d: open, fill: MOUTH, stroke: INK, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, laugh)
    const oh = el('ellipse', { class: 'mole-oh', cx: ox, cy: oy, rx: os * 0.75, ry: os, fill: MOUTH, stroke: SMILE, 'stroke-width': 2 }, parent)
    const sad = line(frown, parent, 3.5)
    sad.setAttribute('stroke', SMILE)
    for (const m of [laugh, oh, sad]) m.style.display = 'none'
    return { smile, laugh, oh, frown: sad }
  }

  /** His three hairs, in a group that can perk up from where they grow (mole.js perk). */
  function hairs(parent, list, root) {
    const g = el('g', { class: 'mole-hair' }, parent)
    for (const d of list) line(d, g)
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
    el('path', { d: 'M-17 -78 C-26 -56 -25 -28 -15 -17 Q0 -11 15 -17 C25 -28 26 -56 17 -78 C9 -85 -9 -85 -17 -78 Z', fill: BIB }, v)
    const dots = spots(v, [[-30, -44], [28, -34], [-8, -22], [34, -70], [-36, -78], [14, -52]])
    const hair = hairs(v, ['M-6 -154 C-10 -184 -28 -192 -36 -176', 'M0 -156 C2 -190 -8 -204 -18 -194', 'M6 -154 C10 -184 28 -192 36 -176'], [0, -154])
    const eye = eyes(v, [{ x: -15, y: -126, rx: 15, ry: 21, px: -12, py: -121 }, { x: 15, y: -126, rx: 15, ry: 21, px: 18, py: -121 }])
    el('circle', { cx: 0, cy: -101, r: 8.5, fill: NOSE, stroke: INK, 'stroke-width': 2 }, v)
    const m = mouth(v, 'M-22 -91 Q0 -70 22 -91', 'M-20 -92 Q0 -58 20 -92 Q0 -82 -20 -92 Z', [0, -85, 6.5], 'M-15 -82 Q0 -95 15 -82')
    // in front of everything: the arms, so a hand can go to his face
    for (const a of arms) v.appendChild(a)
    return { view: v, feet, arms, hair, ...eye, ...m, dots }
  }

  /** Three-quarter view, facing right (mirrored for left), as he is mostly drawn: the snout up and to the side, the near eye big, the far one half behind it. */
  function three(parent, skin) {
    const v = el('g', { class: 'mole-three' }, parent)
    const far = arm(v, skin, [32, -94], [58, -70], 45) // behind his body
    const feet = [foot(v, -16), foot(v, 24)]
    skin.push(el('path', { d: 'M-36 -4 C-44 -26 -32 -62 -32 -84 C-32 -102 -42 -118 -37 -136 C-32 -152 -14 -156 4 -154 C28 -152 44 -132 44 -110 C44 -98 38 -92 38 -80 C38 -60 46 -24 36 -4 Q0 6 -36 -4 Z', fill: BODY }, v))
    skin.push(el('path', { d: 'M34 -126 C44 -130 54 -134 62 -138 C70 -128 64 -116 52 -110 C46 -107 40 -107 34 -108 Z', fill: BODY }, v))
    el('path', { d: 'M22 -98 C37 -96 41 -70 38 -44 C36 -26 28 -18 18 -20 C10 -38 10 -76 22 -98 Z', fill: BIB }, v)
    const dots = spots(v, [[-24, -44], [22, -34], [-6, -22], [30, -70], [-28, -82], [8, -56]])
    const hair = hairs(v, ['M-2 -148 C-8 -174 -26 -180 -36 -164', 'M6 -151 C6 -184 -10 -198 -24 -188', 'M14 -150 C20 -182 6 -200 -8 -196'], [6, -150])
    const eye = eyes(v, [{ x: 42, y: -134, rx: 9, ry: 14, px: 45, py: -131 }, { x: 24, y: -132, rx: 13, ry: 19, px: 29, py: -128 }])
    el('circle', { cx: 66, cy: -136, r: 9, fill: NOSE, stroke: INK, 'stroke-width': 2 }, v)
    line('M56 -130 l14 -4 M56 -126 l14 4', v, 1.5)
    const m = mouth(v, 'M45 -110 Q51 -104 57 -109', 'M42 -108 Q52 -86 63 -113 Q52 -102 42 -108 Z', [52, -103, 6], 'M43 -99 Q52 -110 60 -103')
    const near = arm(v, skin, [-22, -92], [-50, -68], -45)
    return { view: v, feet, arms: [near, far], hair, ...eye, ...m, dots }
  }

  /** In profile, facing right (mirrored for left): walking. The snout straight ahead, one big eye, the hairs arching back, one arm, two feet. */
  function side(parent, skin) {
    const v = el('g', { class: 'mole-side' }, parent)
    const feet = [foot(v, -14), foot(v, 16)]
    skin.push(el('path', { d: 'M-36 -4 C-44 -26 -32 -62 -32 -84 C-32 -102 -42 -118 -37 -136 C-32 -150 -14 -152 4 -150 C34 -152 50 -128 50 -108 C50 -96 40 -92 40 -80 C40 -60 46 -24 36 -4 Q0 6 -36 -4 Z', fill: BODY }, v))
    skin.push(el('path', { d: 'M44 -134 C62 -138 78 -132 86 -122 C82 -104 64 -98 48 -100 Z', fill: BODY }, v))
    el('path', { d: 'M30 -96 C42 -88 44 -60 36 -34 C32 -22 20 -22 16 -32 C14 -58 18 -86 30 -96 Z', fill: BIB }, v)
    const dots = spots(v, [[-18, -40], [20, -30], [-4, -20], [28, -64], [-22, -80]])
    const hair = hairs(v, ['M-2 -148 C-8 -174 -26 -180 -36 -164', 'M6 -151 C6 -184 -10 -198 -24 -188', 'M14 -150 C20 -182 6 -200 -8 -196'], [6, -150])
    const eye = eyes(v, [{ x: 36, y: -128, rx: 11, ry: 16, px: 41, py: -126 }])
    el('circle', { cx: 88, cy: -124, r: 9, fill: NOSE, stroke: INK, 'stroke-width': 2 }, v)
    line('M76 -118 l16 -5 M76 -114 l16 4', v, 1.5)
    const m = mouth(v, 'M57 -103 Q62 -99 68 -103', 'M54 -103 Q62 -85 74 -106 Q62 -99 54 -103 Z', [62, -99, 6], 'M55 -95 Q63 -104 71 -97')
    const a = arm(v, skin, [10, -94], [40, -74], 60)
    return { view: v, feet, arms: [a, a], hair, ...eye, ...m, dots }
  }

  /** All three views into `parent`; the skin list gets every black shape, for paint. */
  function draw(parent, skin) {
    return { front: front(parent, skin), three: three(parent, skin), side: side(parent, skin) }
  }

  return { draw }
})()
