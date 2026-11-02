// The meadow's wild animals, drawn (wildlife.js says when they come and what
// they do): roe deer (sarny), wild boar, the żubr, and the small birds of the
// far trees. Invented for the meadow, not from the films (Adam, 2026-11-01:
// "make the world truly alive"), drawn as the films draw their animals: flat
// colour, one thin ink line, a few big shapes, an eye that reads from afar.
//
// Each faces left, its feet on the ground at 0, 0 (a bird: its middle), in
// its own units; the caller scales and mirrors it. Its moving parts are
// groups the caller turns: `.head` (down to graze, up to look), `.leg`s
// (fore far, fore near, hind far, hind near, each turning at its hip),
// `.tail`. Each returns its drawing with `leg`, its legs' length in the
// caller's units, so the caller can match their stride to the ground.

/* exported WildArt */
const WildArt = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const INK = '#15140f'
  const line = { stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /** A part turning about its own pivot (px, py: in the animal's units). */
  function part(g, cls, px, py) {
    const p = el('g', { class: cls }, g)
    p.style.transformOrigin = `${px}px ${py}px`
    return p
  }

  /** Legs, each a thin tapered shape from the body down to a hoof at the ground, turning about its top. */
  function legs(g, xs, top, w, colour, hoof) {
    const all = el('g', { class: 'legs' }, g)
    xs.forEach((x, i) => {
      const leg = part(all, 'leg', x, top)
      el('path', { d: `M${x - w / 2} ${top} L${x - w * 0.3} -6 L${x + w * 0.3} -6 L${x + w / 2} ${top} Z`, fill: colour, ...line, 'stroke-width': 2.5 }, leg)
      el('path', { d: `M${x - w * 0.34} -7 L${x + w * 0.34} -7 L${x + w * 0.3} 0 L${x - w * 0.3} 0 Z`, fill: hoof, ...line, 'stroke-width': 2 }, leg)
    })
    return all
  }

  /** An eye: white with a dark pupil looking forward (left), and a lid line. */
  function eye(g, x, y, r) {
    el('circle', { cx: x, cy: y, r, fill: '#fbf8ef', ...line, 'stroke-width': 2 }, g)
    el('circle', { cx: x - r * 0.35, cy: y, r: r * 0.55, fill: INK }, g)
  }

  // ------------------------------------------------------------ roe deer

  /** A roe deer (sarna): slim, red-brown, a white rump, big ears, a black nose; a buck has short
   * antlers; a fawn is small, with white spots down its back. */
  function deer(g, { buck = false, fawn = false } = {}) {
    const coat = fawn ? '#b8743c' : '#a65f2c'
    const s = fawn ? 0.62 : 1
    const a = el('g', { transform: `scale(${s})` }, g)
    const tail = part(a, 'tail', 70, -112)
    el('path', { d: 'M62 -118 Q84 -116 80 -96 Q70 -92 62 -100 Z', fill: '#fbf8ef', ...line, 'stroke-width': 2.5 }, tail) // the white rump
    legs(a, [-38, -24, 44, 58], -86, 13, coat, '#3a2a1c')
    a.leg = 86 * s
    el('path', { d: 'M-52 -96 Q-58 -136 -20 -140 L46 -138 Q78 -134 74 -104 Q70 -84 40 -84 L-30 -84 Q-50 -84 -52 -96 Z', fill: coat, ...line }, a)
    el('path', { d: 'M-40 -92 Q0 -82 40 -90', stroke: '#e9c9a1', 'stroke-width': 5, fill: 'none' }, a) // the pale belly
    if (fawn) for (const [x, y] of [[-24, -126], [-4, -130], [16, -128], [34, -124], [-12, -116], [8, -118], [26, -114]]) el('circle', { cx: x, cy: y, r: 3.4, fill: '#fbf1dc' }, a)
    const head = part(a, 'head', -40, -128)
    el('path', { d: 'M-46 -124 Q-54 -158 -62 -178 L-34 -186 Q-26 -160 -14 -130 Z', fill: coat, ...line }, head) // the neck
    el('path', { d: 'M-52 -192 Q-60 -214 -48 -222 Q-40 -206 -44 -190 Z', fill: coat, ...line, 'stroke-width': 2.5 }, head) // an ear
    el('path', { d: 'M-34 -190 Q-30 -214 -18 -216 Q-20 -198 -30 -186 Z', fill: coat, ...line, 'stroke-width': 2.5 }, head)
    if (buck && !fawn) el('path', { d: 'M-44 -196 L-46 -230 M-46 -214 L-54 -222 M-36 -196 L-32 -228 M-33 -212 L-24 -218', stroke: '#6b4a2b', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, head)
    el('path', { d: 'M-30 -196 Q-24 -178 -40 -174 L-80 -168 Q-90 -170 -88 -178 L-60 -196 Q-46 -204 -30 -196 Z', fill: coat, ...line }, head)
    el('path', { d: 'M-86 -180 Q-80 -170 -74 -172', stroke: '#fbf1dc', 'stroke-width': 4, fill: 'none' }, head) // the white chin
    el('ellipse', { cx: -86, cy: -177, rx: 5, ry: 4, fill: INK }, head)
    eye(head, -56, -186, 5.5)
    return a
  }

  // ------------------------------------------------------------ wild boar

  /** A wild boar: dark, bristly, heavy at the shoulders, a long snout with a flat pink-grey end; a male
   * has tusks; a piglet is small and striped cream and brown (a humbug). */
  function boar(g, { male = false, piglet = false } = {}) {
    const coat = piglet ? '#a7714a' : '#4a3a30'
    const s = piglet ? 0.4 : 1
    const a = el('g', { transform: `scale(${s})` }, g)
    const tail = part(a, 'tail', 66, -76)
    el('path', { d: 'M66 -76 Q80 -66 74 -48', stroke: INK, 'stroke-width': 3, fill: 'none' }, tail)
    el('path', { d: 'M74 -50 l-4 10 l8 -2 z', fill: INK }, tail)
    legs(a, [-34, -20, 40, 54], -40, 14, coat, '#2b2b2b')
    a.leg = 40 * s
    el('path', { d: 'M-56 -60 Q-60 -116 -16 -122 Q30 -122 60 -98 Q76 -80 66 -56 Q60 -38 30 -38 L-40 -38 Q-56 -40 -56 -60 Z', fill: coat, ...line }, a)
    if (piglet) for (const y of [-110, -96, -82, -68]) el('path', { d: `M-44 ${y} Q8 ${y - 8} 60 ${y + 6}`, stroke: '#ead7ae', 'stroke-width': 6, fill: 'none' }, a)
    else for (const [x, y] of [[-30, -118], [-14, -124], [4, -124], [20, -120]]) el('path', { d: `M${x} ${y} l3 -10 l3 9`, stroke: INK, 'stroke-width': 2, fill: 'none' }, a) // bristles on its back
    const head = part(a, 'head', -46, -84)
    el('path', { d: 'M-40 -110 L-50 -122 L-58 -104 Z', fill: coat, ...line, 'stroke-width': 2.5 }, head) // an ear
    el('path', { d: 'M-44 -104 Q-56 -110 -70 -90 L-104 -66 Q-108 -56 -98 -54 L-60 -50 Q-40 -54 -40 -76 Z', fill: coat, ...line }, head)
    el('ellipse', { cx: -103, cy: -60, rx: 5, ry: 8, fill: '#c9a8a0', ...line, 'stroke-width': 2 }, head) // the snout's end
    if (male) el('path', { d: 'M-86 -56 Q-92 -70 -84 -76', stroke: '#fbf8ef', 'stroke-width': 4.5, fill: 'none', 'stroke-linecap': 'round' }, head)
    eye(head, -64, -86, 4.5)
    return a
  }

  // ------------------------------------------------------------ żubr

  /** A żubr (European bison): huge, dark brown, a high shaggy hump, a beard and mane paler and woolly,
   * short horns curving up; small hindquarters; a calf is reddish, with no hump to speak of. */
  function bison(g, { calf = false } = {}) {
    const coat = calf ? '#9a5a2e' : '#4f3424'
    const wool = calf ? '#b4703e' : '#7a5235'
    const s = calf ? 0.55 : 1
    const a = el('g', { transform: `scale(${s})` }, g)
    const tail = part(a, 'tail', 92, -120)
    el('path', { d: 'M92 -120 Q100 -96 96 -70', stroke: INK, 'stroke-width': 3, fill: 'none' }, tail)
    el('path', { d: 'M96 -72 l-5 14 l10 -2 z', fill: INK }, tail)
    legs(a, [-50, -32, 66, 82], -64, 20, coat, '#2b2b2b')
    a.leg = 64 * s
    el('path', { d: 'M-70 -90 Q-82 -190 -24 -200 Q20 -196 40 -150 Q90 -150 98 -112 Q100 -64 70 -62 L-50 -62 Q-72 -64 -70 -90 Z', fill: coat, ...line }, a)
    if (!calf) el('path', { d: 'M-66 -120 Q-70 -186 -24 -194 Q6 -190 22 -160 Q-10 -150 -20 -120 Q-40 -96 -66 -100 Z', fill: wool, stroke: 'none' }, a) // the woolly hump and mane
    const head = part(a, 'head', -66, -110)
    el('path', { d: 'M-60 -140 Q-104 -150 -118 -112 Q-124 -82 -100 -74 Q-80 -70 -64 -92 Z', fill: coat, ...line }, head)
    if (!calf) el('path', { d: 'M-108 -84 Q-104 -52 -88 -48 Q-80 -66 -76 -84 Z', fill: wool, ...line, 'stroke-width': 2.5 }, head) // the beard
    el('path', { d: 'M-100 -138 Q-112 -152 -104 -164 M-74 -142 Q-66 -158 -74 -168', stroke: '#e9e2cf', 'stroke-width': calf ? 3 : 5, fill: 'none', 'stroke-linecap': 'round' }, head) // the horns
    el('ellipse', { cx: -116, cy: -96, rx: 6, ry: 9, fill: '#2b2b2b' }, head)
    eye(head, -96, -118, 5)
    return a
  }

  // ------------------------------------------------------------ birds

  /** A small bird of the far trees (a finch, red-breasted as the spring's), its middle at 0, 0: perched,
   * its wings folded; `.wings` show only as it flies (game.css flaps them). */
  function bird(g) {
    const a = el('g', {}, g)
    const wings = el('g', { class: 'wings' }, a)
    el('path', { d: 'M-2 -4 Q-14 -22 -26 -18 Q-14 -8 -2 -2 Z M2 -4 Q14 -22 26 -18 Q14 -8 2 -2 Z', fill: '#5f6a72', ...line, 'stroke-width': 1.8 }, wings)
    el('ellipse', { cx: 0, cy: 0, rx: 12, ry: 9, fill: '#5f6a72', ...line, 'stroke-width': 2 }, a)
    el('path', { d: 'M-9 2 Q0 11 8 2 Q3 -2 -9 2 Z', fill: '#e0453a' }, a)
    el('circle', { cx: -9, cy: -7, r: 6.5, fill: INK }, a)
    el('path', { d: 'M-15 -7 l-6 2 l6 2 z', fill: '#2b2b2b' }, a)
    el('path', { d: 'M11 -2 l10 -4 l-2 6 z', fill: INK }, a)
    return a
  }

  // ------------------------------------------------------------ heron

  /** A grey heron, standing (its feet at 0, 0): long yellow legs, a slim grey body, an S of a neck, a white
   * face with a black stripe back from the eye, a long dagger bill. `.lean` (all but its legs) tips forward at
   * the hip and `.neck` stretches out from the body (heron.js: it stalks, strikes, swallows); `.ripples` ring
   * its legs where it stands in the shallows; `.wings` show only in flight, the legs then trailing behind
   * (game.css, `.flying`). A young one (`young`) has a greyer neck and no black crest yet. */
  function heron(g, { young = false } = {}) {
    const neckColour = young ? '#c4c9cb' : '#e8ebe8'
    const a = el('g', {}, g)
    const stand = el('g', { class: 'standing' }, a)
    el('path', { d: 'M-4 -96 L-8 0 M8 -96 L10 0 M-8 0 l-12 0 M10 0 l-10 0', stroke: '#c9a23a', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, stand)
    el('path', { class: 'ripples', d: 'M-22 2 Q-8 8 4 2 M0 2 Q12 8 22 2 M-34 6 Q-6 14 30 6', stroke: '#a9c6dc', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, stand)
    const lean = part(a, 'lean', 2, -96)
    el('path', { d: 'M-24 -128 Q-28 -100 -4 -92 L30 -88 Q56 -86 66 -70 Q50 -98 28 -120 Q4 -140 -24 -128 Z', fill: '#9aa3a8', ...line }, lean) // the body, its tail down behind
    el('path', { d: 'M0 -124 Q24 -118 46 -96', stroke: '#5f6a72', 'stroke-width': 5, fill: 'none' }, lean) // the dark wing edge
    const neck = part(lean, 'neck', -20, -124)
    el('path', { d: 'M-20 -124 Q-36 -150 -18 -168 Q-4 -182 -22 -200 L-32 -194 Q-20 -180 -30 -168 Q-48 -148 -30 -120 Z', fill: neckColour, ...line, 'stroke-width': 2.5 }, neck)
    el('ellipse', { cx: -26, cy: -206, rx: 13, ry: 10, fill: neckColour, ...line, 'stroke-width': 2.5 }, neck)
    if (!young) el('path', { d: 'M-24 -210 L6 -216', stroke: INK, 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round' }, neck) // its black crest
    el('path', { d: 'M-36 -208 L-78 -202 L-36 -200 Z', fill: '#d9b23a', ...line, 'stroke-width': 2 }, neck) // the bill
    eye(neck, -30, -207, 3.5)
    const wings = el('g', { class: 'wings' }, a)
    el('path', { d: 'M-6 -118 Q-30 -190 -90 -200 Q-50 -150 -20 -108 Z M14 -118 Q50 -190 110 -196 Q66 -150 26 -106 Z', fill: '#7d878d', ...line, 'stroke-width': 2.5 }, wings)
    return a
  }

  return { deer, boar, bison, bird, heron, el }
})()
