// The mouse, the hare, the hen and her chick, drawn after the films' frames
// (friends.js moves them). Each stands on 0,0 facing left, in three-quarter
// view as the films show them, and gives back its head (what a nod, a shake
// or a peck turns).
//
// - The mouse (Krtek a vejce 0:58-1:02, the mother; Malířem 2:38): upright
//   like a little person, a pear of a body, a long pointed snout with a dark
//   nose at its tip, two big white eyes close together high on the head,
//   round ears, thin arms, a long tail curling on the grass.
// - The hare (Malířem 4:16-4:18): sitting up on a big haunch and long feet,
//   tall ears dark inside, a white ruff of fur round his cheeks and chin, a
//   pale muzzle with two front teeth in a wide smile, long whiskers.
// - The hen (Vejce 4:50-5:08): a plump black body on long thin yellow legs, a
//   tall fan of a tail, a grey-brown wing with a slate edge, and a white neck
//   and head in one piece, dotted black; a big pale ringed eye, a small red
//   comb, a long red wattle under an orange beak.
// - The chick (Vejce 4:36-5:00): a yellow ball with a tuft, a small wing.

/* exported FriendArt */
const FriendArt = (() => {
  const INK = '#15140f'
  const line = { stroke: INK, 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }
  const thin = { ...line, 'stroke-width': 1.6 }
  const hair = { stroke: INK, 'stroke-width': 1.1, fill: 'none', 'stroke-linecap': 'round' }

  const MOUTH = '#8f3a34'
  const FACES = ['calm', 'glad', 'glum', 'ooh', 'shut'] // at rest; delighted; let down or saying no; surprised; eyes squeezed shut (a sneeze)

  /** A transform that grows what is drawn by k about a point (the neck). */
  const big = (x, y, k) => `translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})`

  /** A rosy cheek. */
  const cheek = (el, parent, cx, cy, r) => el('ellipse', { cx, cy, rx: r * 1.2, ry: r, fill: '#ee8d8d', opacity: 0.55 }, parent)

  /** A group for the parts of the face that show only in these faces ('calm glum'). */
  function only(el, head, faces) {
    const g = el('g', { 'data-face': faces }, head)
    if (!faces.split(' ').includes('calm')) g.style.display = 'none'
    return g
  }

  /** An eye as the films draw it: a tall white oval ([cx, cy, rx, ry]), a black pupil (k: its size) towards where it looks ([dx, dy]). */
  function eye(el, parent, [cx, cy, rx, ry], [dx, dy] = [-1.6, 0.6], k = 1) {
    el('ellipse', { cx, cy, rx, ry, fill: '#fff', ...thin }, parent)
    el('ellipse', { cx: cx + dx, cy: cy + dy, rx: rx * 0.52 * k, ry: ry * 0.56 * k, fill: INK }, parent)
  }

  /** An upper lid over an eye, in `fur`, down by `lid` of the eye's height (to a half at most). */
  function lid(el, parent, [cx, cy, rx, ry], fur, lid) {
    const y = cy - ry + 2 * ry * lid
    const w = (rx + 0.8) * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2))
    el('path', { d: `M${(cx - w).toFixed(1)} ${y.toFixed(1)} A${rx + 0.8} ${ry + 0.8} 0 0 1 ${(cx + w).toFixed(1)} ${y.toFixed(1)} Z`, fill: fur, ...thin }, parent)
  }

  /** An eye shut: an arc, curving up (glad) or down (squeezed). */
  function shutEye(el, parent, [cx, cy, rx, ry], up) {
    const bend = up ? -ry * 1.1 : ry * 0.9
    el('path', { d: `M${cx - rx} ${cy - bend * 0.3} Q${cx} ${cy + bend} ${cx + rx} ${cy - bend * 0.3}`, ...hair, 'stroke-width': 2.2 }, parent)
  }

  /** A pair (or one) of eyes in every face: open, glad, half-lidded and looking down, wide, squeezed shut. `calmLid`: the lid at rest. */
  function eyes(el, head, specs, fur, calmLid = 0) {
    const calm = only(el, head, 'calm')
    const glum = only(el, head, 'glum')
    const ooh = only(el, head, 'ooh')
    const glad = only(el, head, 'glad')
    const shut = only(el, head, 'shut')
    for (const spec of specs) {
      eye(el, calm, spec)
      if (calmLid) lid(el, calm, spec, fur, calmLid)
      eye(el, glum, spec, [-0.6, spec[3] * 0.4])
      lid(el, glum, spec, fur, 0.5)
      eye(el, ooh, [spec[0], spec[1], spec[2] + 0.8, spec[3] + 1], [-0.6, 0], 0.7)
      shutEye(el, glad, spec, true)
      shutEye(el, shut, spec, false)
    }
  }

  const MOUSE = { fur: '#8c8174', dark: '#6f665b', belly: '#cfc6b8', pink: '#eea0a4' }
  function mouse(g, { el }) {
    const c = MOUSE
    el('path', { d: 'M14 -10 C40 -2 70 0 76 -16 C80 -30 62 -34 60 -22 C59 -16 66 -14 68 -19', fill: 'none', stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }, g)
    el('path', { d: 'M14 -10 C40 -2 70 0 76 -16 C80 -30 62 -34 60 -22 C59 -16 66 -14 68 -19', fill: 'none', stroke: c.dark, 'stroke-width': 3, 'stroke-linecap': 'round' }, g)
    el('ellipse', { cx: 10, cy: -3, rx: 13, ry: 5, fill: c.pink, ...thin }, g) // the far foot
    el('path', { class: 'body', d: 'M-18 -6 C-30 -30 -20 -56 -4 -60 C14 -62 27 -40 24 -10 C22 2 -12 4 -18 -6 Z', fill: c.fur, ...line }, g) // .body: where paint can go (friends.js daub)
    el('path', { d: 'M-17 -12 C-24 -30 -17 -48 -7 -52 C0 -40 0 -14 -6 -3 C-11 -3 -15 -6 -17 -12 Z', fill: c.belly }, g)
    el('ellipse', { cx: -8, cy: -3, rx: 14, ry: 5.5, fill: c.pink, ...thin }, g)
    // an arm, held in front, a small pink hand
    el('path', { d: 'M4 -46 C-6 -44 -16 -38 -22 -34', fill: 'none', stroke: INK, 'stroke-width': 8.5, 'stroke-linecap': 'round' }, g)
    el('path', { d: 'M4 -46 C-6 -44 -16 -38 -22 -34', fill: 'none', stroke: c.fur, 'stroke-width': 5, 'stroke-linecap': 'round' }, g)
    el('circle', { cx: -24, cy: -33, r: 4.2, fill: c.pink, ...thin }, g)
    const head = el('g', { class: 'head' }, g)
    const h = el('g', { transform: big(4, -56, 1.2) }, head) // a big head for the body, as the films draw their small animals
    for (const [cx, cy, r] of [[25, -93, 17], [-3, -102, 19]]) {
      el('circle', { cx, cy, r, fill: c.fur, ...line }, h)
      el('circle', { cx: cx - 1, cy: cy + 1, r: r * 0.58, fill: c.pink }, h)
    }
    el('path', { d: 'M22 -70 C26 -90 6 -100 -10 -92 C-22 -86 -38 -76 -54 -66 C-42 -56 -24 -50 -6 -50 C10 -50 20 -58 22 -70 Z', fill: c.fur, ...line }, h)
    // her mouth, under the snout: a smile; open, glad; turned down; a small round "oh"
    el('path', { d: 'M-40 -60 C-30 -53 -18 -51 -8 -54', ...hair, 'stroke-width': 1.8 }, only(el, h, 'calm'))
    el('path', { d: 'M-40 -60 C-30 -54 -18 -52 -8 -55 C-12 -42 -32 -44 -40 -60 Z', fill: MOUTH, ...thin }, only(el, h, 'glad'))
    el('path', { d: 'M-36 -54 C-28 -59 -18 -58 -11 -53', ...hair, 'stroke-width': 1.8 }, only(el, h, 'glum shut'))
    el('ellipse', { cx: -28, cy: -53, rx: 4, ry: 5, fill: MOUTH, ...thin }, only(el, h, 'ooh'))
    el('circle', { cx: -53, cy: -66, r: 4.6, fill: INK }, h)
    eyes(el, h, [[-21, -85, 7, 9.4], [-7, -83, 7.6, 10]], c.fur)
    cheek(el, h, 2, -63, 5.5)
    el('path', { d: 'M-44 -64 l-17 -10 M-43 -62 l-21 0 M-43 -60 l-16 9', ...hair }, h)
    return head
  }

  const HARE = { fur: '#96643a', dark: '#5b3a1f', foot: '#86562e', pale: '#f6f0e2', nose: '#3a2616' }
  function hare(g, { el, fluffy }) {
    const c = HARE
    el('path', { d: fluffy(40, -24, 13, 12, 9, 0.22), fill: c.pale, ...thin }, g) // his tail, a white puff
    el('ellipse', { cx: 22, cy: -7, rx: 24, ry: 8, fill: c.foot, ...line }, g) // the far foot
    // his back and chest, sitting up
    el('path', { class: 'body', d: 'M-22 -12 C-36 -44 -30 -84 -12 -98 C6 -106 28 -96 36 -66 C44 -40 44 -14 30 -6 C14 0 -14 0 -22 -12 Z', fill: c.fur, ...line }, g)
    el('path', { d: 'M-24 -22 C-32 -46 -27 -76 -14 -90 C0 -84 6 -52 0 -24 C-4 -12 -18 -10 -24 -22 Z', fill: c.pale }, g)
    el('path', { class: 'body', d: 'M4 -10 C-2 -34 12 -56 30 -52 C44 -48 48 -26 42 -12 C36 -2 10 -2 4 -10 Z', fill: c.fur, ...line }, g) // the haunch
    el('ellipse', { cx: -12, cy: -7, rx: 30, ry: 9, fill: c.foot, ...line }, g)
    el('path', { d: 'M-34 -9 l-6 0 M-32 -4 l-6 1', ...hair, 'stroke-width': 1.6 }, g) // toes
    // his arms, paws hanging at his chest
    for (const [x, y] of [[10, -78], [-8, -74]]) {
      el('path', { d: `M${x} ${y} C${x - 10} ${y + 4} ${x - 18} ${y + 12} ${x - 20} ${y + 22}`, fill: 'none', stroke: INK, 'stroke-width': 14, 'stroke-linecap': 'round' }, g)
      el('path', { d: `M${x} ${y} C${x - 10} ${y + 4} ${x - 18} ${y + 12} ${x - 20} ${y + 22}`, fill: 'none', stroke: c.fur, 'stroke-width': 9.5, 'stroke-linecap': 'round' }, g)
    }
    const head = el('g', { class: 'head' }, g)
    const h = el('g', { transform: big(0, -104, 1.13) }, head) // a big head for the body, as the films draw their small animals
    // the far ear, bent over at its tip; the near one straight up
    const far = el('g', { class: 'ear', 'data-stripes': '16 11 -156 -176', transform: 'rotate(16 16 -140)' }, h)
    el('path', { d: 'M4 -140 C0 -166 2 -188 8 -200 L26 -198 C30 -180 30 -160 28 -140 Z', fill: c.fur, ...line }, far)
    el('path', { d: 'M11 -146 C9 -166 11 -182 14 -192 L22 -191 C24 -176 23 -160 21 -146 Z', fill: c.dark }, far)
    el('path', { d: 'M8 -200 L26 -198 C40 -192 48 -178 46 -164 C32 -168 16 -184 8 -200 Z', fill: c.fur, ...line }, far)
    const near = el('g', { class: 'ear', 'data-stripes': '-14 11 -160 -180 -200', transform: 'rotate(-8 -14 -140)' }, h)
    el('path', { d: 'M-27 -140 C-33 -180 -20 -224 -12 -226 C-4 -224 3 -180 -1 -140 Z', fill: c.fur, ...line }, near)
    el('path', { d: 'M-20 -146 C-22 -176 -16 -208 -12 -210 C-8 -206 -6 -176 -8 -146 Z', fill: c.dark }, near)
    el('path', { d: fluffy(-2, -108, 40, 31, 13, 0.24), fill: c.pale, ...thin }, h) // the ruff round his cheeks and chin
    el('path', { d: 'M-30 -116 C-32 -142 -16 -154 0 -154 C18 -154 32 -140 28 -116 C24 -98 -26 -98 -30 -116 Z', fill: c.fur, ...line }, h)
    el('path', { d: 'M-8 -153 q-4 -10 2 -12 M-1 -154 q0 -12 5 -11 M6 -153 q5 -9 9 -6', ...hair, 'stroke-width': 1.8 }, h) // a tuft between his ears
    // the muzzle: two pale puffs, the nose between, the smile and his two teeth
    el('path', { d: 'M-21 -101 C-22 -91 -12 -87 -4 -91 C6 -87 17 -91 15 -102 Z', fill: MOUTH, ...thin }, only(el, h, 'calm')) // a smile
    el('path', { d: 'M-25 -101 C-28 -82 -12 -76 -4 -82 C6 -76 24 -84 18 -102 Z', fill: MOUTH, ...thin }, only(el, h, 'glad')) // laughing
    el('rect', { x: -11, y: -101, width: 6.5, height: 9, fill: '#fff', ...thin, 'stroke-width': 1.2 }, h)
    el('rect', { x: -4.5, y: -101, width: 6.5, height: 9, fill: '#fff', ...thin, 'stroke-width': 1.2 }, h)
    for (const x of [-16, 6]) el('ellipse', { cx: x, cy: -106, rx: 13, ry: 9.5, fill: c.pale, ...thin }, h)
    el('path', { d: 'M-12 -115 C-10 -119 0 -119 2 -115 C0 -109 -10 -109 -12 -115 Z', fill: c.nose }, h)
    el('path', { d: 'M-17 -92 Q-4 -98 9 -92', ...hair, 'stroke-width': 1.8 }, only(el, h, 'glum shut')) // the mouth turned down
    el('ellipse', { cx: -4, cy: -91, rx: 5, ry: 6, fill: MOUTH, ...thin }, only(el, h, 'ooh'))
    eyes(el, h, [[-12, -130, 6.6, 9.2], [4, -131, 7.2, 9.8]], c.fur)
    cheek(el, h, -25, -119, 4.5)
    cheek(el, h, 21, -119, 5)
    el('path', { d: 'M-27 -108 l-26 -8 M-28 -105 l-28 2 M-27 -102 l-24 11 M18 -108 l24 -8 M19 -105 l26 2 M18 -102 l22 11', ...hair }, h)
    return head
  }

  const HEN = { body: '#17161c', wing: '#74665a', slate: '#4a4c66', white: '#fbf9f4', red: '#d8322b', leg: '#e8a52a', eye: '#ebe6f0' }
  function hen(g, { el }) {
    const c = HEN
    // long thin legs, three toes forward
    for (const x of [14, -6]) {
      el('path', { d: `M${x} -40 L${x - 2} -3 M${x - 2} -3 l-17 1 M${x - 2} -3 l-14 -6 M${x - 2} -3 l-12 6 M${x - 2} -3 l7 3`, fill: 'none', stroke: INK, 'stroke-width': 6.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g)
      el('path', { d: `M${x} -40 L${x - 2} -3 M${x - 2} -3 l-17 1 M${x - 2} -3 l-14 -6 M${x - 2} -3 l-12 6 M${x - 2} -3 l7 3`, fill: 'none', stroke: c.leg, 'stroke-width': 3.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g)
    }
    // the tail, a tall fan, its lowest feathers slate
    el('path', { d: 'M22 -84 C30 -124 46 -158 66 -162 C84 -160 92 -128 84 -96 C78 -74 62 -56 44 -52 Z', fill: c.body, ...thin }, g)
    el('path', { d: 'M46 -54 C62 -62 76 -80 83 -100 C80 -78 68 -60 46 -54 Z', fill: c.slate }, g)
    el('path', { d: 'M40 -70 C48 -104 56 -134 66 -150 M52 -66 C62 -92 70 -116 78 -132', fill: 'none', stroke: '#3a3a48', 'stroke-width': 1.4, 'stroke-linecap': 'round' }, g)
    // the body, plump, breast forward
    el('path', { d: 'M-50 -86 C-58 -60 -40 -34 -4 -32 C30 -30 58 -44 60 -70 C56 -92 30 -104 2 -104 C-20 -104 -44 -100 -50 -86 Z', fill: c.body, ...thin }, g)
    // the wing: grey-brown, a slate edge under it
    el('path', { d: 'M-16 -72 C0 -92 34 -88 50 -66 C36 -46 0 -46 -16 -72 Z', fill: c.slate, ...thin }, g)
    el('path', { d: 'M-16 -72 C0 -92 34 -88 50 -66 C30 -60 2 -60 -16 -72 Z', fill: c.wing }, g)
    const head = el('g', { class: 'head' }, g)
    const h = el('g', { transform: big(-14, -92, 1.12) }, head) // a big head for the body, as the films draw their small animals
    // comb and wattle behind and under the head
    el('path', { d: 'M-58 -160 C-62 -174 -48 -176 -47 -166 C-46 -178 -32 -176 -35 -164 C-28 -170 -22 -160 -30 -154 Z', fill: c.red, ...thin }, h)
    // neck and head in one white piece, down over the breast
    el('path', { d: 'M-2 -98 C-14 -78 -44 -70 -54 -86 C-60 -100 -54 -116 -58 -130 C-62 -146 -62 -160 -48 -164 C-32 -166 -22 -154 -24 -138 C-26 -124 -14 -112 -2 -98 Z', fill: c.white, ...line }, h)
    for (const [cx, cy] of [[-46, -84], [-32, -86], [-18, -92], [-50, -98], [-37, -100], [-24, -104], [-48, -112], [-35, -114], [-44, -126], [-32, -128], [-28, -142], [-34, -154]]) el('circle', { cx, cy, r: 3.3, fill: INK }, h)
    el('path', { d: 'M-60 -132 C-66 -122 -64 -108 -56 -108 C-50 -110 -52 -124 -56 -134 Z', fill: c.red, ...thin }, h) // the wattle
    const beak = only(el, h, 'calm glum shut')
    el('path', { d: 'M-58 -150 L-80 -140 L-59 -134 Z', fill: c.leg, ...thin }, beak)
    el('path', { d: 'M-76 -141 L-60 -142', ...hair }, beak)
    const open = only(el, h, 'glad ooh') // the beak open: a cluck
    el('path', { d: 'M-59 -146 L-72 -141 L-59 -137 Z', fill: MOUTH }, open)
    el('path', { d: 'M-58 -152 L-81 -146 L-59 -142 Z', fill: c.leg, ...thin }, open)
    el('path', { d: 'M-59 -140 L-76 -132 L-58 -133 Z', fill: c.leg, ...thin }, open)
    // a big pale eye, ringed
    const E = [-46, -147, 9.5, 9.5]
    for (const [faces, r, look] of [['calm', 9.5, [-2, 0.5]], ['glum', 9.5, [-0.5, 3.5]], ['ooh', 11, [-0.5, 0]]]) {
      const g = only(el, h, faces)
      el('circle', { cx: E[0], cy: E[1], r, fill: c.eye, ...thin }, g)
      el('circle', { cx: E[0], cy: E[1], r: r * 0.72, fill: 'none', stroke: '#c3bdd0', 'stroke-width': 1 }, g)
      el('circle', { cx: E[0] + look[0], cy: E[1] + look[1], r: faces === 'ooh' ? 3 : 4.4, fill: INK }, g)
      if (faces === 'glum') lid(el, g, E, c.white, 0.5)
    }
    cheek(el, h, -38, -132, 4.5)
    shutEye(el, only(el, h, 'glad'), [E[0], E[1], 8, 7], true)
    shutEye(el, only(el, h, 'shut'), [E[0], E[1], 8, 7], false)
    return head
  }

  function chick(g, { el }) {
    for (const x of [-5, 6]) el('path', { d: `M${x} -5 v4 l-5 2 M${x} -1 l5 2`, stroke: '#e08a20', 'stroke-width': 2.6, fill: 'none', 'stroke-linecap': 'round' }, g)
    el('ellipse', { cx: 1, cy: -22, rx: 20, ry: 18, fill: '#f6d23b', ...line, 'stroke-width': 2.2 }, g)
    el('path', { d: 'M2 -24 C10 -30 20 -26 20 -18 C14 -14 6 -16 2 -24 Z', fill: '#f1c22a', ...thin }, g) // a stub of a wing
    const head = el('g', { class: 'head' }, g)
    el('path', { d: 'M-13 -53 q-3 -9 2 -8 q0 -6 5 -3 q5 -3 3 6 z', fill: '#f6d23b', ...thin }, head) // a tuft
    el('circle', { cx: -9, cy: -42, r: 13.5, fill: '#f6d23b', ...line, 'stroke-width': 2.2 }, head)
    el('path', { d: 'M-21 -44 l-10 4 l10 3 z', fill: '#e08a20', ...thin }, head)
    el('circle', { cx: -14, cy: -46, r: 2.8, fill: INK }, head)
    return head
  }

  /** Their faces, on a drawing in `inner` (friends.js make): feel() sets the face she wears, during() one for as long as a move lasts. */
  function moves(inner) {
    let wears = 'calm'
    const show = (name) => {
      for (const g of inner.querySelectorAll('[data-face]')) g.style.display = g.dataset.face.split(' ').includes(name) ? '' : 'none'
    }
    return {
      /** A face from FACES, worn until the next. */
      feel(name) {
        wears = name
        show(name)
      },
      /** Stripes of `colour` across its ears too, given back (the hare, a tiger to his ear tips: Malířem 4:28): on the ears, so they nod with his head. */
      stripeEars(el, colour) {
        const made = []
        for (const ear of inner.querySelectorAll('.ear')) {
          const [cx, w, ...ys] = ear.dataset.stripes.split(' ').map(Number) // the ear's middle, its half-width at the bottom, where the stripes go
          for (const [i, y] of ys.entries()) {
            const half = w - i * 2.5
            made.push(el('path', { class: 'paint', d: `M${cx - half} ${y} q${half} -5 ${half * 2} 0`, stroke: colour, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, ear))
          }
        }
        return made
      },
      /** A face for as long as `move` lasts (a shake of the head, glum), then the one worn before; also if a tap cuts the move short. */
      async during(name, move) {
        show(name)
        try {
          return await move
        } finally {
          show(wears)
        }
      },
    }
  }

  return { FACES, mouse, hare, hen, chick, moves }
})()
