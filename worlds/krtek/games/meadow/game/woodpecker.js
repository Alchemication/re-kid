// The woodpecker in the chestnut (invented, not from the films; Adam's pick, 2026-11-08): on autumn
// plays the old tree's knot-hole (Layout.OAK.knot) is a woodpecker's, as the owl's is in spring. A great
// spotted woodpecker as a cartoon: black and white, a red cap and a red patch under its tail, a big eye.
// It sits in its hole; every so often in the day it hops out onto the trunk's edge, drums a roll on the
// bark, looks about and hops back in (if he is free, he looks up at the noise). At dusk it goes in for the
// night. A tap on it: he goes to the trunk's foot and they knock to each other, a different way each
// time (rounds): he knocks twice and it knocks twice back; he knocks three and it answers three, then
// drums a long roll that makes him jump; or it drums first and he tries a roll of his own on the bark,
// and shakes his sore paw.
//
// Drawn in code into the tree's layer (#oak), side-on and facing left (the trunk is to its left as it
// clings to the trunk's edge), its feet at 0, 0, its head turning about NECK. It moves only on the Clock
// (Motion.endAt); restore() puts it back where its state says at once when a tap cuts a visit short.

/* global Clock, Debug, Layout, Mole, Motion, Sound, View */
/* exported Woodpecker */
const Woodpecker = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const INK = '#2f2a22'
  const BLACK = '#26231f'
  const WHITE = '#f6f1e4'
  const RED = '#d8432f'
  const [KX, KY, , KRY] = Layout.OAK.knot
  const IN_HOLE = { x: KX + 10, y: KY + KRY * 0.8, s: 1.1 } // in its hole: on the hole's lip, a little smaller (further in)
  const EDGE = { x: 288, y: 330, s: 1.5 } // out: clinging to the trunk's right edge, where it shows against what is behind
  const STAND = 380 // where he stands to knock on the trunk's foot, facing it
  const NECK = [10, -44] // its head turns about this (its units)
  const DRUM_EVERY_MS = [26000, 52000] // by day it comes out to drum this often
  const OUT_MS = [5000, 9000] // and stays out this long
  const IN_AT = 18.3 // the hour it goes in for the night
  const HOP_MS = 520 // one hop, hole to edge in two
  const PECK_MS = 70 // one peck of a roll
  const random = Debug.random('meadow-woodpecker') // whether it is here (always, in autumn), how a visit goes
  const timing = Debug.random('meadow-woodpecker-timing') // when it comes out by itself: its own stream

  let g = null // the whole, where it sits
  let head = null // pecks and turns about the neck
  let state = 'none' // 'none' (not this play), 'in', 'out', 'night'
  let busy = false // hopping or drumming by itself
  let posing = false // a visit under way: the rule says never once he is free
  let outAt = Infinity // when it comes out next
  let backAt = Infinity // out: when it goes back in
  let goTo, next, heard // the meadow's (setup)

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const line = (w = 2) => ({ stroke: INK, 'stroke-width': w, 'stroke-linejoin': 'round' })
  const at = ({ x, y, s }) => `translate(${x}px, ${y}px) scale(${s})`
  const between = ([a, b], k) => a + (b - a) * k

  /** The woodpecker, side-on facing left, its feet at 0, 0 on the bark to its left: a stiff tail braced
   * below, a black back with white bars, a pale front, red under its tail, a round head with a red cap,
   * a white cheek, a big shiny eye and a long grey beak. */
  function draw(into) {
    el('path', { d: 'M8 -6 L2 22 L10 16 L14 24 L16 -4 Z', fill: BLACK, ...line(1.6) }, into) // the tail, braced on the bark
    el('ellipse', { cx: 13, cy: -22, rx: 13, ry: 24, fill: BLACK, ...line(), transform: 'rotate(8 13 -22)' }, into) // the body
    el('path', { d: 'M2 -38 C-2 -26 -1 -10 6 -2 C10 -10 10 -28 6 -40 Z', fill: WHITE }, into) // its pale front, towards the bark
    el('path', { d: 'M4 -6 C2 -2 4 2 9 2 C11 -2 10 -5 8 -7 Z', fill: RED }, into) // red under its tail
    for (const y of [-28, -20, -12]) el('path', { d: `M17 ${y} h7`, stroke: WHITE, 'stroke-width': 3, 'stroke-linecap': 'round' }, into) // its wing's white bars
    el('path', { d: 'M14 -40 C22 -38 24 -32 22 -26 C18 -30 15 -34 14 -40 Z', fill: WHITE }, into) // the white shoulder patch
    for (const dy of [0, 7]) el('path', { d: `M1 ${-1 - dy} l-6 -2 M1 ${-1 - dy} l-6 2`, stroke: INK, 'stroke-width': 1.8, 'stroke-linecap': 'round' }, into) // its toes on the bark
    const neck = el('g', { transform: `translate(${NECK[0]} ${NECK[1]})` }, into)
    head = el('g', { class: 'woodpecker-head' }, neck)
    const h = el('g', { transform: `translate(${-NECK[0]} ${-NECK[1]})` }, head)
    el('path', { d: 'M-1 -58 L-30 -54 L-1 -49 Z', fill: '#8c8a84', ...line(1.6) }, h) // the beak, long and pointed
    el('circle', { cx: 9, cy: -56, r: 14, fill: BLACK, ...line() }, h)
    el('path', { d: 'M-3 -60 C0 -72 16 -74 22 -62 C16 -66 6 -66 -3 -60 Z', fill: RED, ...line(1.4) }, h) // the red cap
    el('path', { d: 'M-2 -52 C4 -46 14 -46 20 -52 C14 -50 6 -50 -2 -52 Z', fill: WHITE }, h) // the white cheek
    el('circle', { cx: 6, cy: -57, r: 5.5, fill: WHITE }, h)
    el('circle', { cx: 4.8, cy: -57, r: 3.4, fill: '#120f0c' }, h)
    el('circle', { cx: 3.6, cy: -58.6, r: 1.3, fill: '#fff' }, h)
  }

  /** Its head pecks n times on the bark, `ms` a peck (a roll: quick; a knock: slow). */
  function pecks(n, ms) {
    const frames = []
    for (let i = 0; i < n; i++) frames.push({ transform: 'rotate(0deg)' }, { transform: 'rotate(-18deg) translateX(-3px)' })
    frames.push({ transform: 'rotate(0deg)' })
    return Motion.endAt(head, frames, { duration: n * ms, easing: 'linear' })
  }

  /** A roll on the bark: its head a blur, the drum's sound. */
  async function drum(n = 12) {
    Sound.drum()
    Debug.trace('woodpecker', { drums: n })
    await pecks(n, PECK_MS)
  }

  /** n knocks, slow, one by one with a peck's sound each. */
  async function knocks(n, alive) {
    for (let i = 0; i < n; i++) {
      Sound.peck()
      await pecks(1, 260)
      if (!alive()) return false
      await Clock.wait(140)
    }
    return alive()
  }

  /** From where it is to `to`, in two hops (state set first: a cut leaves it there). */
  async function hopTo(to, now) {
    const from = state === 'out' ? EDGE : IN_HOLE
    state = now
    const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 4, s: (from.s + to.s) / 2 }
    const up = (a, b) => ({ x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 18, s: (a.s + b.s) / 2 })
    await Motion.endAt(g, [{ transform: at(from) }, { transform: at(up(from, mid)) }, { transform: at(mid) }, { transform: at(up(mid, to)) }, { transform: at(to) }], { duration: HOP_MS * 2, easing: 'ease-in-out' })
  }

  /** Draw it in autumn: in its hole. `meadow`: its `goTo`, `rounds`, and `heard` (it drummed: he looks up if free). */
  function setup(layer, meadow) {
    goTo = meadow.goTo
    heard = meadow.heard || (() => {})
    const forced = Layout.flags.woodpecker // '1' always, '0' never, 'out' out on the trunk from the start
    random() // drawn either way (a share of plays, should it ever be one), so a flag shifts nothing else
    if (forced === '0' || (!forced && !Layout.inSeason('woodpecker'))) return
    g = el('g', { class: 'woodpecker' }, layer)
    draw(g)
    el('circle', { cx: 10, cy: -30, r: 56, fill: 'none', 'pointer-events': 'all' }, g) // the tap target: the bird and a little round it
    next = meadow.rounds(Object.keys(VISITS), random)
    state = forced === 'out' ? 'out' : 'in'
    g.style.transform = at(state === 'out' ? EDGE : IN_HOLE)
    outAt = Clock.now() + between(DRUM_EVERY_MS, timing()) / 2
    backAt = forced === 'out' ? Infinity : Clock.now()
  }

  /** The hour: by day, now and then out to drum and back in; at dusk in for the night. Only while nobody
   * is visiting it and it is in view (it comes out for the child, not for an empty screen). */
  function tick(h) {
    if (state === 'none' || state === 'night' || busy || posing) return
    const now = Clock.now()
    if (h >= IN_AT) return void Debug.ignoreCut(goIn(true), 'the woodpecker goes in for the night')
    if (state === 'in' && now >= outAt && View.x < EDGE.x + 400 && !Debug.still) Debug.ignoreCut(outToDrum(), 'the woodpecker comes out')
    else if (state === 'out' && now >= backAt) Debug.ignoreCut(goIn(false), 'the woodpecker goes in')
  }

  async function outToDrum() {
    busy = true
    try {
      await hopTo(EDGE, 'out')
      await Clock.wait(400)
      await drum()
      heard(EDGE.x)
      await Clock.wait(900)
      await Motion.endAt(head, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(14deg)', offset: 0.3 }, { transform: 'rotate(14deg)', offset: 0.7 }, { transform: 'rotate(0deg)' }], { duration: 1400 }) // a look about
      if (timing() < 0.5) await drum(9)
      backAt = Clock.now() + between(OUT_MS, timing())
    } finally {
      busy = false
    }
  }

  async function goIn(forTheNight) {
    busy = true
    try {
      if (state === 'out') await hopTo(IN_HOLE, 'in')
      if (forTheNight) state = 'night'
      outAt = Clock.now() + between(DRUM_EVERY_MS, timing())
      Debug.trace('woodpecker', { in: true, night: forTheNight })
    } finally {
      busy = false
    }
  }

  // ------------------------------------------------------------ a tap on it

  const VISITS = {
    /** He knocks twice on the bark; it knocks twice back. He looks up, and giggles. */
    async echo(alive) {
      Sound.knock()
      await Mole.knock()
      if (!alive()) return
      await Clock.wait(500)
      if (!(await knocks(2, alive))) return
      Mole.lookAt(EDGE.x)
      Mole.perk(1.4)
      Mole.feel('ooh', 1200)
      await Clock.wait(900)
      if (!alive()) return
      Sound.say('giggle')
      await Mole.handsToFace(600)
    },

    /** He knocks three; it answers three, then drums a long roll: he jumps, then laughs. */
    async three(alive) {
      Sound.knock()
      await Mole.knock()
      if (!alive()) return
      Sound.knock()
      await Mole.knock()
      if (!alive()) return
      await Clock.wait(400)
      if (!(await knocks(3, alive))) return
      await Clock.wait(300)
      if (!alive()) return
      const roll = drum(20)
      Mole.show('front')
      Sound.say('gasp')
      await Mole.handsToFace(700, 'fright')
      await roll
      if (!alive()) return
      Sound.say('giggle')
      await Mole.cheer()
    },

    /** It drums first; he tries a roll of his own on the bark, quick as he can, and shakes his sore paw. */
    async roll(alive) {
      await drum()
      if (!alive()) return
      Mole.feel('squeezed', 1600)
      for (let i = 0; i < 2; i++) {
        Sound.knock()
        await Mole.knock()
        if (!alive()) return
      }
      Mole.show('front')
      Sound.say('achJo')
      await Mole.handsToFace(500, 'fright') // his paw stings
      if (!alive()) return
      await Motion.endAt(head, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(16deg)', offset: 0.4 }, { transform: 'rotate(16deg)', offset: 0.7 }, { transform: 'rotate(0deg)' }], { duration: 1100 }) // it tilts its head at him
      if (!alive()) return
      Sound.say('giggle')
      await Mole.handsToFace(600)
    },
  }

  /** A tap on it: he goes to the trunk's foot, it comes out if it was in, and they knock (VISITS, a
   * different way each time). At night it stays in: he only looks up. */
  async function visit(alive) {
    if (state === 'none') return
    if (state === 'night') return void Mole.lookAt(KX)
    Mole.lookAt(EDGE.x)
    await goTo(STAND)
    if (!alive()) return
    Mole.show('three', -1)
    posing = true
    try {
      while (busy) await Clock.wait(100) // a hop or a roll of its own: let it end
      if (!alive()) return
      if (state === 'in') await hopTo(EDGE, 'out')
      if (!alive()) return
      const how = next()
      Debug.trace('woodpecker visit', { how })
      await VISITS[how](alive)
      backAt = Clock.now() + between(OUT_MS, timing())
    } finally {
      if (alive()) posing = false
    }
  }

  /** A visit cut short: where its state says, its head straight. */
  function restore() {
    if (state === 'none') return
    posing = false
    for (const e of [g, head]) e.getAnimations().forEach((a) => a.cancel())
    head.style.transform = ''
    g.style.transform = at(state === 'out' ? EDGE : IN_HOLE)
    busy = false
  }

  return {
    setup,
    tick,
    visit,
    restore,
    /** 'none', 'in', 'out' or 'night' (for the tests and the overlay). */
    get state() { return state },
    /** A visit under way? */
    get posing() { return posing },
  }
})()
