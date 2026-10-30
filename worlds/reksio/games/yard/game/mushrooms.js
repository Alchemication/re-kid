// Mushrooms after the rain (after Reksio kompan, 1976: Reksio and the boy go
// mushroom picking, and in the end he finds a huge porcino).
//
// A few seconds after a shower clears, three come up by a puddle: a fly
// agaric and two porcinos, and the boy's basket stands a little way off. The
// child chooses which to tap. The fly agaric he only sniffs, from a
// distance, and backs away from, shaking his head: never in his mouth, never
// eaten (a toddler watching must not learn "pick and eat"). A porcino he
// picks gently in his mouth and carries to the boy's basket, left out a
// little way off; once the basket
// holds three, he shares the next with the snail (Adam: "sharing is
// caring"), puts it down by her and steps back; she hides in her shell,
// peeks out, and eats it. Picked porcinos slowly grow back, a few a play.
//
// Everything is in scene units, in the #mushrooms layer among the things.

/* global Clock, Debug, Layout, Sound, Music, Reksio, Weather, Creatures */
/* exported Mushrooms */
const Mushrooms = (() => {
  const GROUND = 812
  const AFTER_RAIN_S = 5 // they come up this long after a shower clears
  const SPACING = 42 // between mushrooms in the cluster: tight, so three fit the narrowest gap between things
  const CAP_R = 25 // half a cap's width, as drawn at SCALE
  const CLEAR = 12 // they keep this clear of a puddle's edge, and of the things either side (Adam, 2026-10-21: they came up on the hen's nest)
  const BASKET_ROOM = 80 // the basket wants this much free ground, beside the mushrooms or in the next free stretch
  const BASKET_HOLDS = 3 // then he shares with the snail
  const REGROW_S = [12, 25] // a picked porcino grows back after this long…
  const PORCINOS_MAX = 6 // …up to this many in a play
  const PICK_FROM = 48 // he stands this far from a porcino to pick it
  const PORCINO_BITE = { x: 14, y: 16, scale: 0.8 } // carried, by the stalk: its foot this far from his bite, the cap clear in front of his nose, a little smaller
  const SNAIL_RANGE = [460, 60] // food for the snail no nearer the house, or the fence, than this (she turns back at 420)
  const KEEP_AWAY = 150 // and this far from the fly agaric: down on all fours to sniff, his nose stops short of it
  const SCALE = 1.15
  const VARIATIONS = { porcino: ['proud', 'bliss'], agaric: ['nono', 'wary'] }

  const SVG_NS = 'http://www.w3.org/2000/svg'
  const $ = (id) => document.getElementById(id)
  const random = Debug.random('mushrooms') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
    if (parent) parent.appendChild(n)
    return n
  }

  let isEnded = () => false
  let up = false // have they come up this play
  let agaric = null // {g, x}
  const porcinos = [] // on the ground: {g, x}
  let grown = 0
  let basket = null // {g, heap}
  let inBasket = 0

  // ------------------------------------------------------------ drawing

  /** A mushroom drawing at the scene's origin: a porcino (brown cap, fat
   * stem) or a fly agaric (red cap, white dots, a ring on its stem). */
  function drawMushroom(kind, parent) {
    const g = el('g', { class: `mushroom thing`, 'data-thing': kind }, parent)
    el('circle', { class: 'hit', cx: 0, cy: -28, r: 46 }, g)
    const body = el('g', { transform: `scale(${SCALE})` }, g)
    if (kind === 'porcino') {
      el('path', { class: 'porcino-stem', d: 'M-11 0 Q-14 -14 -9 -24 H9 Q14 -14 11 0 Z' }, body)
      el('path', { class: 'porcino-cap', d: 'M-21 -22 Q-20 -42 0 -43 Q20 -42 21 -22 Q0 -18 -21 -22 Z' }, body)
    } else {
      el('path', { class: 'agaric-stem', d: 'M-6 0 Q-8 -14 -5 -26 H5 Q8 -14 6 0 Z' }, body)
      el('path', { class: 'agaric-stem', d: 'M-9 -14 Q0 -10 9 -14 L7 -18 Q0 -15 -7 -18 Z' }, body)
      el('path', { class: 'agaric-cap', d: 'M-22 -24 Q-20 -46 0 -47 Q20 -46 22 -24 Q0 -20 -22 -24 Z' }, body)
      for (const [x, y, r] of [[-10, -34, 3.2], [3, -40, 2.6], [12, -31, 3], [-1, -29, 2.2]]) el('circle', { class: 'agaric-dot', cx: x, cy: y, r }, body)
    }
    return { g, body }
  }

  const place = (m, x, y = GROUND) => m.g.setAttribute('transform', `translate(${x} ${y})`)

  /** Up out of the ground, with a soft pop. */
  function grow(kind, x) {
    const m = { ...drawMushroom(kind, $('mushrooms')), x }
    place(m, x)
    m.body.animate([{ transform: `scale(${SCALE * 0.1})` }, { transform: `scale(${SCALE})` }], { duration: 700, easing: 'ease-out' })
    Sound.from(Math.abs(x - Reksio.x), () => Sound.pop())
    return m
  }

  function drawBasket(x) {
    const g = el('g', { class: 'basket', transform: `translate(${x} ${GROUND})` }, $('mushrooms'))
    el('path', { class: 'basket-handle', d: 'M-24 -22 Q0 -58 24 -22' }, g)
    const heap = el('g', {}, g)
    el('path', { class: 'basket-body', d: 'M-30 -24 H30 L24 0 H-24 Z' }, g)
    el('path', { class: 'basket-weave', d: 'M-27 -16 H27 M-25 -8 H25 M-14 -24 L-12 0 M0 -24 V0 M14 -24 L12 0' }, g)
    basket = { g, heap, x }
  }

  /** The porcino caps showing over the basket's rim, one per porcino in it. */
  function fillBasket() {
    basket.heap.replaceChildren()
    for (let i = 0; i < Math.min(inBasket, BASKET_HOLDS); i++) {
      el('path', { class: 'porcino-cap', d: `M${-20 + i * 14} -22 q8 -16 16 0 Z` }, basket.heap)
    }
  }

  // ------------------------------------------------------------ coming up

  /** The free ground: the gaps between things (layout.js), less their
   * puddles, clear of both; the widest first. [from, to], scene units. */
  function stretches() {
    const out = []
    for (const [a, b] of Layout.gaps) {
      const p = Layout.puddles.find((q) => q.x > a && q.x < b)
      const parts = p ? [[a, p.x - p.rx], [p.x + p.rx, b]] : [[a, b]]
      for (const [x0, x1] of parts) if (x1 - x0 > 2 * CLEAR) out.push([x0 + CLEAR, x1 - CLEAR])
    }
    return out.sort((s, t) => t[1] - t[0] - (s[1] - s[0]))
  }

  let patch = [1500, 1700] // where they grow: the widest free stretch

  /** How wide a cluster of n is, caps and all. */
  const across = (n) => (n - 1) * SPACING + 2 * CAP_R

  function comeUp() {
    if (up || isEnded()) return
    up = true
    const free = stretches()
    const width = free[0] ? free[0][1] - free[0][0] : 0
    // three if the widest free stretch has room, else two (a third grows later), else none this play
    const n = width >= across(3) ? 3 : width >= across(2) ? 2 : 0
    Debug.trace('mushrooms up', { n })
    if (!n) return
    patch = free[0]
    // the basket beside them if the stretch has room for both, else in another with room for it
    const other = free.slice(1).find(([a, b]) => b - a >= BASKET_ROOM)
    const shared = width >= across(n) + BASKET_ROOM || !other
    const cluster = shared ? [patch[0], patch[1] - BASKET_ROOM] : patch
    const x0 = (cluster[0] + cluster[1]) / 2 - ((n - 1) * SPACING) / 2
    // the fly agaric at the near end: he keeps his distance from it without standing over a porcino
    ;['agaric', 'porcino', 'porcino'].slice(0, n).forEach((kind, i) => {
      const x = x0 + i * SPACING
      if (kind === 'agaric') agaric = grow(kind, x)
      else {
        porcinos.push(grow(kind, x))
        grown += 1
      }
    })
    drawBasket(shared ? patch[1] - BASKET_ROOM / 2 : (other[0] + other[1]) / 2)
    patch = [cluster[0] + CAP_R, cluster[1] - CAP_R] // where more grow: inside it, caps and all
    if (n < 3) regrow()
  }

  /** A picked porcino grows back a while later, near where they grow. */
  function regrow() {
    if (grown >= PORCINOS_MAX) return
    grown += 1
    Clock.after(rnd(...REGROW_S) * 1000, () => {
      if (isEnded()) return
      const taken = (x) => [agaric, ...porcinos].some((m) => m && Math.abs(m.x - x) < SPACING * 0.8)
      // somewhere in their patch, not on another
      let x = rnd(...patch)
      for (let i = 0; i < 6 && taken(x); i++) x = rnd(...patch)
      porcinos.push(grow('porcino', x))
    })
  }

  // ------------------------------------------------------------ the porcino

  const nearestPorcino = () => porcinos.reduce((best, m) => (!best || Math.abs(m.x - Reksio.x) < Math.abs(best.x - Reksio.x) ? m : best), null)

  /** Carry it in his teeth (Reksio.inMouth), by its stalk, until the
   * returned stop() takes it out again. */
  function carry(m) {
    m.g.setAttribute('transform', `translate(${PORCINO_BITE.x} ${PORCINO_BITE.y}) scale(${PORCINO_BITE.scale})`)
    Reksio.inMouth(m.g)
    return () => {
      Reksio.inMouth(null)
      const at = Reksio.mouth()
      $('fx').appendChild(m.g)
      place(m, at.x, at.y + PORCINO_BITE.y)
    }
  }

  /** Down on the ground at x (a porcino again, to be picked another time). */
  function putDown(m, x) {
    $('mushrooms').appendChild(m.g)
    m.x = x
    place(m, x)
  }

  /** Into the basket. */
  async function toBasket(m, stop) {
    const side = Reksio.x > basket.x ? 1 : -1
    await Reksio.walkTo(basket.x + side * 70)
    Reksio.face(-side)
    await Reksio.nod(22, 600)
    stop()
    m.given = true
    m.g.remove()
    inBasket += 1
    fillBasket()
    Sound.plop()
    Music.react.done()
  }

  /** To the snail: put it down in front of her, step back, and watch. */
  async function toSnail(m, stop, snail) {
    // in front of her, inside the yard and her own range; he comes from beyond it, facing her way back
    const x = Math.min(Math.max(snail.x + snail.dir * 60, SNAIL_RANGE[0]), Layout.MAX_X - SNAIL_RANGE[1])
    const from = x > snail.x ? 1 : -1
    await Reksio.walkTo(x + from * 55)
    Reksio.face(-from)
    await Reksio.nod(22, 600)
    stop()
    m.given = true
    putDown(m, x)
    m.g.removeAttribute('data-thing') // hers now: not a porcino to tap
    m.g.classList.remove('thing')
    Creatures.feedSnail({
      x,
      bite: (k) => m.body.setAttribute('transform', `scale(${SCALE * k})`),
      done: () => m.g.remove(),
    })
    await Reksio.walkTo(x + from * 170)
    Reksio.face(-from)
    await Reksio.aww()
  }

  /** Pick the nearest porcino and take it to the basket, or, the basket
   * full, to the snail (or, no snail out, by the basket). v: the variation. */
  async function pickPorcino({ v }) {
    const m = nearestPorcino()
    if (!m) return
    porcinos.splice(porcinos.indexOf(m), 1)
    Debug.trace('porcino', { v, inBasket })
    let stop = null
    try {
      await Reksio.sniff(2)
      if (v === 'bliss') await Reksio.bliss()
      await Reksio.nod(24, 450) // gently, in his mouth
      stop = carry(m)
      Reksio.kit.perk('both', 600)
      if (v === 'proud') await Reksio.showOff()
      const snail = Creatures.snail
      if (inBasket < BASKET_HOLDS || !snail) await toBasket(m, stop)
      else {
        Debug.trace('porcino to the snail')
        await toSnail(m, stop, snail)
      }
      stop = null
      regrow()
    } finally {
      // cut short before it was given: on the ground again (where he is, if
      // he had it), still a porcino to pick
      if (!m.given) {
        if (stop) {
          stop()
          putDown(m, Reksio.x + Reksio.facing * PICK_FROM)
        }
        porcinos.push(m)
      }
    }
  }

  // ------------------------------------------------------------ the fly agaric

  /** A sniff from a distance, a recoil, a head shake: no. v: the variation. */
  async function sniffAgaric({ v }) {
    Debug.trace('agaric', { v })
    await Reksio.sniff(1)
    await Reksio.yuck()
    if (v === 'nono') await Reksio.wagFinger()
    if (v === 'wary') {
      await Reksio.walkTo(Reksio.x - 110)
      await Reksio.wary()
    }
  }

  const things = {
    porcino: { at: () => (nearestPorcino()?.x ?? Reksio.x) - PICK_FROM, face: 1, run: pickPorcino, ready: () => porcinos.length > 0 },
    agaric: { at: () => (agaric?.x ?? Reksio.x) - KEEP_AWAY, face: 1, run: sniffAgaric, ready: () => !!agaric },
  }

  function init({ ended }) {
    isEnded = ended
    if (Layout.mushroomsAt != null) Clock.after(Layout.mushroomsAt * 1000, comeUp)
    Weather.on((phase) => {
      if (phase === 'after' && !Weather.frozen) Clock.after(AFTER_RAIN_S * 1000, comeUp) // none after snow
    })
  }

  return {
    VARIATIONS,
    things,
    init,
    /** Where its action spot is (spots.js): by the nearest one. */
    spotX: (name) => things[name].at() + (name === 'agaric' ? KEEP_AWAY - 40 : PICK_FROM),
    get inBasket() { return inBasket },
    get porcinos() { return porcinos.length },
  }
})()
