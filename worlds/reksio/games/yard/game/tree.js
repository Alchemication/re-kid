// The fruit tree, and who is hungry for its fruit.
//
// Some plays have a tree by the wall: apples, plums or hazelnuts (layout.js
// picks). A while into the play a hungry visitor turns up at its foot and
// looks up at the fruit it can't reach: a snail for apples or plums, a
// squirrel for nuts. Reksio rears up against the trunk and shakes it; leaves
// fly and fruit drops. The snail creeps to an apple and slowly eats it, and
// more snails come to share; the squirrel eats one nut and buries another,
// then runs off up the trunk. Shake again and more falls (and sometimes an
// apple lands on Reksio's head).
//
// Everything here lives inside the tree's own group, in the coordinates it
// is drawn in (index.html); Layout.x('tree') moves the lot.

/* global Layout, Sound, Music, Reksio */
/* exported Tree */
const Tree = (() => {
  const TRUNK_X = 1660 // drawn
  const GROUND = 812
  const FRUIT_REST_Y = 797 // fallen fruit lies here
  const FRUIT_SCALE = 1.6 // fruit drawn big enough to see, and to want
  const VISITOR_AT_S = [8, 25] // the hungry visitor turns up this long into the play
  const WAITS_AT = TRUNK_X + 100 // where the visitor sits looking up
  const SNAIL_SPEED = 18 // scene units per second: slow, but you can see it go
  const SNAIL_SCALE = 2.1
  const SQUIRREL_SPEED = 420
  const SQUIRREL_SCALE = 1.7
  const SNAIL_REACH = 72 // a snail eating sits this far from the fruit's middle: its nose at the edge
  const MORE_SNAILS = [1, 2] // after the first shake, this many more come to eat
  const MAX_SNAILS = 4
  const BITES = 8 // a snail's apple is gone after this many bites
  const PAW_REACH = 31 // from Reksio's middle to where his front paws land
  // where fruit hangs in the crown, as drawn
  const ON_TREE = [[1588, 418], [1628, 342], [1694, 330], [1738, 398], [1652, 440], [1712, 456]]
  const X = () => Layout.x('tree')
  /** A fruit's transform at (x, y), shrunk to k as it's eaten. */
  const at = (x, y, k = 1) => `translate(${x}px, ${y}px) scale(${k * FRUIT_SCALE})`

  const SVG_NS = 'http://www.w3.org/2000/svg'
  const $ = (id) => document.getElementById(id)
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const rnd = (lo, hi) => lo + Math.random() * (hi - lo)
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
    if (parent) parent.appendChild(n)
    return n
  }
  const nut = () => Layout.fruit === 'nut'
  /** A sound from somewhere by the tree, as Reksio hears it. */
  const hear = (x, play) => Sound.from(Math.abs(x + X() - Reksio.x), play)

  let fx = { burst: () => {}, twinkle: () => {} } // effects, from things.js
  let isEnded = () => false
  let visitor = 'away' // away | hungry | fed
  let hanging = [] // fruit still in the crown: {el, x, y}
  const fallen = [] // fruit on the ground: {el, x, bites, eater}
  const snails = []
  let squirrel = null
  let shakes = 0

  // ------------------------------------------------------------ drawing

  function makeFruit() {
    const layer = $('tree-fruit')
    hanging = ON_TREE.map(([x, y]) => {
      const f = el('use', { href: `#fruit-${Layout.fruit}` }, layer)
      f.style.transform = at(x, y)
      return { x, y, el: f }
    })
  }

  function makeSnail(x) {
    const g = el('g', { class: 'tree-snail' }, $('tree-ground'))
    const body = el('g', { class: 'snail-body' }, g)
    el('path', { d: 'M-16 0 Q-18 -8 -6 -8 L14 -8 Q22 -8 24 -2 Q26 2 20 2 L-14 2 Z', class: 'snail-foot' }, body)
    const stalks = el('g', { class: 'snail-stalks' }, body)
    el('path', { d: 'M17 -8 L22 -22 M20 -7 L28 -19' }, stalks)
    el('circle', { cx: 22, cy: -23, r: 2.4, class: 'fly-body' }, stalks)
    el('circle', { cx: 28, cy: -20, r: 2.4, class: 'fly-body' }, stalks)
    el('circle', { cx: 0, cy: -16, r: 13, class: 'snail-shell' }, g)
    el('path', { d: 'M0 -16 m-1 0 a2 2 0 1 1 3 1 a5 5 0 1 1 -8 -3 a8 8 0 1 1 11 10', class: 'snail-swirl' }, g)
    const s = { g, body, stalks, x, dir: -1, fruit: null }
    placeSnail(s)
    snails.push(s)
    return s
  }

  function placeSnail(s) {
    s.g.style.transform = `translate(${s.x}px, ${GROUND}px) scale(${s.dir * SNAIL_SCALE}, ${SNAIL_SCALE})`
  }

  function makeSquirrel() {
    const g = el('g', { class: 'squirrel' }, $('tree-ground'))
    el('path', { class: 'squirrel-tail', d: 'M-8 -10 C-40 -6 -46 -42 -28 -56 C-14 -66 0 -54 -8 -44 C-16 -34 -22 -24 -8 -18 Z' }, g)
    const body = el('g', { style: 'transform-origin: 0px 0px' }, g)
    el('ellipse', { class: 'squirrel-fur', cx: 2, cy: -15, rx: 13, ry: 12 }, body)
    el('ellipse', { class: 'squirrel-belly', cx: 9, cy: -13, rx: 5, ry: 8 }, body)
    const head = el('g', { style: 'transform-origin: 10px -24px' }, body)
    el('path', { class: 'squirrel-fur', d: 'M9 -36 L8 -47 L15 -37 Z' }, head)
    el('path', { class: 'squirrel-fur', d: 'M6 -28 Q8 -38 17 -36 Q25 -33 25 -27 Q24 -21 15 -21 Q7 -21 6 -28 Z' }, head)
    el('circle', { class: 'eye', cx: 17, cy: -30, r: 1.7 }, head)
    el('circle', { class: 'eye', cx: 25, cy: -27, r: 1.4 }, head)
    const cheek = el('circle', { class: 'squirrel-cheek', cx: 16, cy: -24, r: 0 }, head)
    const held = el('use', { href: '#fruit-nut', x: 0, y: 0, transform: 'translate(22 -20) scale(0.7)', opacity: 0 }, head)
    el('path', { class: 'squirrel-paws', d: 'M10 -10 l5 2 M7 -8 l5 2' }, body)
    el('path', { class: 'squirrel-feet', d: 'M-6 0 h8 M4 0 h7' }, g)
    squirrel = { g, body, head, cheek, held, x: TRUNK_X + 720, y: GROUND, dir: -1 }
    placeSquirrel()
  }

  function placeSquirrel() {
    const q = squirrel
    q.g.style.transform = `translate(${q.x}px, ${q.y}px) scale(${q.dir * SQUIRREL_SCALE}, ${SQUIRREL_SCALE})`
  }

  // ------------------------------------------------------------ movement

  /** Glide something along the ground (snails), or scamper (the squirrel). */
  async function go(who, place, toX, speed, toY = who.y ?? GROUND, hop = 0) {
    const fromX = who.x
    const fromY = who.y ?? GROUND
    who.dir = toX < fromX ? -1 : 1
    const ms = (Math.hypot(toX - fromX, toY - fromY) / speed) * 1000 + 60
    const scale = who === squirrel ? SQUIRREL_SCALE : SNAIL_SCALE
    const steps = Math.max(2, Math.round(ms / 90))
    const frames = []
    for (let i = 0; i <= steps; i++) {
      const k = i / steps
      const lift = hop && i % 2 ? hop : 0
      frames.push({ transform: `translate(${fromX + (toX - fromX) * k}px, ${fromY + (toY - fromY) * k - lift}px) scale(${who.dir * scale}, ${scale})` })
    }
    await who.g.animate(frames, { duration: ms }).finished
    who.x = toX
    if (who.y != null) who.y = toY
    place(who)
  }

  const creep = (s, toX) => go(s, placeSnail, toX, SNAIL_SPEED)
  const scamper = (toX, toY = GROUND) => go(squirrel, placeSquirrel, toX, SQUIRREL_SPEED, toY, 5)

  /** A snail looks up at the fruit: stalks raised, body stretched up. */
  function snailLooksUp(s, on) {
    s.stalks.setAttribute('transform', on ? 'rotate(-38 17 -8)' : '')
  }

  // ------------------------------------------------------------ the visitor

  async function visitorComes() {
    if (visitor !== 'away' || isEnded()) return
    if (nut()) {
      makeSquirrel()
      await scamper(WAITS_AT)
      squirrel.dir = -1
      placeSquirrel()
      squirrel.head.style.transform = 'rotate(-25deg)' // looking up at the nuts
    } else {
      const s = makeSnail(WAITS_AT + 80)
      s.body.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1200, easing: 'ease-out' })
      await creep(s, WAITS_AT)
      snailLooksUp(s, true)
    }
    visitor = 'hungry'
    $('tree').classList.remove('not-yet')
    hungryLoop()
  }

  /** While nobody has helped: little signs of wanting the fruit. */
  async function hungryLoop() {
    while (visitor === 'hungry' && !isEnded()) {
      await wait(rnd(2500, 4500))
      if (visitor !== 'hungry') return
      if (nut()) {
        hear(squirrel.x, () => Sound.chitter())
        squirrel.body.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }], { duration: 300 })
      } else {
        const s = snails[0]
        s.body.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.25)' }, { transform: 'scaleY(1)' }], { duration: 1400, easing: 'ease-in-out' })
      }
    }
  }

  // ------------------------------------------------------------ shaking

  function wobbleCrown() {
    $('crown-shake').animate(
      [0, -4, 3.5, -2.5, 1.5, 0].map((d) => ({ transform: `rotate(${d}deg)` })),
      { duration: 650, easing: 'ease-out' },
    )
    Sound.rustle()
    fx.burst(TRUNK_X + X() + rnd(-80, 80), rnd(330, 430), 6, 'leaf', { height: 10, reach: 90, size: 5 })
  }

  /** One fruit falls from the crown to (toX, toY), bounces and settles. */
  async function drop(f, toX, toY = FRUIT_REST_Y) {
    const layer = $('tree-ground')
    f.el.remove()
    const g = el('g', { class: 'fallen' }, layer)
    el('use', { href: `#fruit-${Layout.fruit}` }, g)
    const fall = Math.max(200, (toY - f.y) * 1.3)
    await g.animate(
      [
        { transform: at(f.x, f.y), easing: 'ease-in' },
        { transform: at((f.x + toX) / 2, toY), offset: 0.7, easing: 'ease-out' },
        { transform: at((f.x + toX * 3) / 4, toY - 18), offset: 0.85, easing: 'ease-in' },
        { transform: at(toX, toY) },
      ],
      { duration: fall + 350, fill: 'forwards' },
    ).finished
    g.getAnimations().forEach((a) => a.cancel())
    g.style.transform = at(toX, toY)
    if (toY >= FRUIT_REST_Y - 1) {
      if (nut()) Sound.tok()
      else Sound.plop()
    }
    return g
  }

  /** The repeat's extra: a fruit lands on Reksio's head. Bonk. */
  async function bonk(f) {
    const head = Reksio.mouth()
    const hx = head.x - Reksio.facing * 60 - X()
    const g = await drop(f, hx, head.y - 40)
    Sound.bonk()
    Music.react.sneeze()
    const rest = hx + Reksio.facing * 70
    await g.animate([{ transform: at(hx, head.y - 40) }, { transform: at((hx + rest) / 2, head.y - 90) }, { transform: at(rest, FRUIT_REST_Y) }], { duration: 600, easing: 'ease-in', fill: 'forwards' }).finished
    g.getAnimations().forEach((a) => a.cancel())
    g.style.transform = at(rest, FRUIT_REST_Y)
    fallen.push({ el: g, x: rest, bites: 0, eater: null })
    for (let i = 0; i < 3; i++) setTimeout(() => fx.twinkle(head.x + rnd(-50, 30), head.y - 70 + rnd(-20, 20)), i * 220)
    await Reksio.sit(1300)
  }

  async function shake({ extra }) {
    Reksio.face(1)
    for (let i = 0; i < 3; i++) await Reksio.stamp(wobbleCrown)
    shakes += 1
    const n = Math.min(hanging.length, shakes === 1 ? (nut() ? 3 : 2) : nut() ? 2 : 1)
    if (!n) {
      // nothing left up there
      await Reksio.lookUp(1200)
      return
    }
    const falling = hanging.splice(0, n)
    if (extra && !nut() && falling.length) await bonk(falling.pop())
    await Promise.all(
      falling.map(async (f, i) => {
        await wait(i * 180)
        const x = WAITS_AT - 70 + i * 60 + rnd(-15, 15)
        const g = await drop(f, x)
        fallen.push({ el: g, x, bites: 0, eater: null })
      }),
    )
    if (nut()) squirrelEats()
    else snailsEat()
    if (visitor === 'hungry') visitor = 'fed'
    await wait(600)
  }

  // ------------------------------------------------------------ eating

  /** Each free snail takes a free apple and nibbles it away; more come. */
  function snailsEat() {
    for (const s of snails) if (!s.fruit) snailTo(s)
    if (shakes === 1 || fallen.some((f) => !f.eater && f.bites < BITES)) {
      const more = Math.round(rnd(...MORE_SNAILS))
      for (let i = 0; i < more && snails.length < MAX_SNAILS; i++) {
        setTimeout(() => {
          if (isEnded() || snails.length >= MAX_SNAILS) return
          const side = Math.random() < 0.5 ? -1 : 1
          const s = makeSnail(WAITS_AT + side * rnd(260, 360))
          s.body.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1200, easing: 'ease-out' })
          snailTo(s)
        }, rnd(3000, 9000) * (i + 1))
      }
    }
  }

  // Bites: each one takes a chunk out of the side the snail eats from. Two
  // masks per fruit: the skin is cut a little wider than the flesh under it,
  // so every bite shows a pale rim of fruit.
  const BITE_R = 6.4 // a bite's radius, in fruit units (an apple is 11 across the middle)
  const BITE_STEP = 3.2 // how far each bite eats in
  let masks = 0

  function bitable(f, side) {
    const defs = document.querySelector('#world defs')
    const id = `bites-${masks++}`
    const mask = (name) => {
      const m = el('mask', { id: `${id}-${name}`, maskUnits: 'userSpaceOnUse', x: -24, y: -28, width: 48, height: 50 }, defs)
      el('rect', { x: -24, y: -28, width: 48, height: 50, fill: 'white' }, m)
      return m
    }
    const skin = mask('skin')
    const flesh = mask('flesh')
    const skinUse = f.el.querySelector('use')
    const plum = Layout.fruit === 'plum'
    const inside = el(plum ? 'ellipse' : 'circle', plum ? { rx: 8, ry: 10, class: 'plum-flesh' } : { r: 10, class: 'apple-flesh' })
    f.el.insertBefore(inside, skinUse)
    inside.setAttribute('mask', `url(#${id}-flesh)`)
    skinUse.setAttribute('mask', `url(#${id}-skin)`)
    f.bite = (k) => {
      const cx = side * (13 - k * BITE_STEP)
      const cy = (k % 2 ? -1 : 1) * rnd(2, 5)
      el('circle', { cx, cy, r: BITE_R, fill: 'black' }, skin)
      el('circle', { cx: cx + side * 1.4, cy, r: BITE_R - 0.8, fill: 'black' }, flesh)
    }
    f.masks = [skin, flesh]
  }

  /** All eaten: the core (or a plum's stone) is left a moment, then goes. */
  async function leaveCore(f) {
    f.el.replaceChildren()
    if (Layout.fruit === 'plum') el('ellipse', { rx: 3.5, ry: 5.5, class: 'plum-stone' }, f.el)
    else {
      el('path', { d: 'M-4 -9 Q-1 0 -4 9 L4 9 Q1 0 4 -9 Z', class: 'apple-core' }, f.el)
      el('path', { d: 'M0 -9 q1 -4 3 -6', class: 'fruit-stem' }, f.el)
    }
    f.masks?.forEach((m) => m.remove())
    await wait(3000)
    await f.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' }).finished
    f.el.remove()
  }

  async function snailTo(s) {
    const free = fallen.filter((f) => !f.eater && f.bites < BITES)
    if (!free.length) return
    const f = free.reduce((a, b) => (Math.abs(a.x - s.x) < Math.abs(b.x - s.x) ? a : b))
    f.eater = s
    s.fruit = f
    snailLooksUp(s, false)
    const side = s.x < f.x ? -1 : 1
    // nose to the fruit's edge; then it inches in as it eats
    await creep(s, f.x + side * SNAIL_REACH)
    s.dir = -side
    placeSnail(s)
    if (!f.bite) bitable(f, side)
    while (f.bites < BITES && !isEnded()) {
      await wait(rnd(1100, 1700))
      f.bite(f.bites)
      f.bites += 1
      s.x -= side * BITE_STEP * FRUIT_SCALE * 0.8
      placeSnail(s)
      hear(f.x, () => Sound.nibble())
      s.stalks.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(12deg)' }, { transform: 'rotate(0)' }], { duration: 400 })
      fx.burst(f.x + X() + side * 10, FRUIT_REST_Y - 4, 1, 'crumb-apple', { height: 8, reach: 10, size: 1.8 })
    }
    leaveCore(f)
    s.fruit = null
    // full: a slow wander off, or the next apple
    if (fallen.some((g) => !g.eater && g.bites < BITES)) return snailTo(s)
    snailLooksUp(s, true)
  }

  /** The squirrel: eats one nut, buries the next, then off up the trunk. */
  async function squirrelEats() {
    const q = squirrel
    if (!q || q.busy) return
    q.busy = true
    q.head.style.transform = ''
    if (q.up) {
      // back down the trunk
      q.g.style.opacity = '1'
      await scamper(TRUNK_X + 10, GROUND)
      q.up = false
    }
    const take = () => fallen.find((f) => !f.eater && f.bites < BITES)
    const eat = take()
    if (eat) {
      eat.eater = q
      await scamper(eat.x + 30)
      q.dir = -1
      placeSquirrel()
      eat.el.remove()
      q.held.setAttribute('opacity', '1')
      q.body.style.transform = 'rotate(-12deg)' // sits up, nut in paws
      for (let i = 0; i < 5; i++) {
        hear(q.x, () => Sound.nibble())
        q.cheek.setAttribute('r', String(2 + i))
        fx.burst(q.x + X() - 20, GROUND - 40, 2, 'nutshell', { height: 16, reach: 22, size: 2 })
        await wait(420)
      }
      q.held.setAttribute('opacity', '0')
      q.cheek.setAttribute('r', '0')
      q.body.style.transform = ''
      eat.bites = BITES
      hear(q.x, () => Sound.chitter())
    }
    const hide = take()
    if (hide) {
      hide.eater = q
      await scamper(hide.x + 26)
      hide.el.remove()
      q.held.setAttribute('opacity', '1')
      const spot = hide.x + (Math.random() < 0.5 ? -1 : 1) * rnd(140, 220)
      await scamper(spot)
      // dig a little hole, drop the nut in, pat it down
      for (let i = 0; i < 6; i++) {
        q.body.animate([{ transform: 'rotate(18deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(18deg)' }], { duration: 160 })
        fx.burst(q.x + X() - q.dir * 6, GROUND - 2, 2, 'clod', { dir: -q.dir, height: 20, reach: 30, size: 2.5 })
        await wait(160)
      }
      hear(q.x, () => Sound.dig())
      q.held.setAttribute('opacity', '0')
      await wait(300)
      for (let i = 0; i < 2; i++) {
        await q.body.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(0)' }], { duration: 180 }).finished
      }
      hide.bites = BITES
    }
    // off up the trunk, into the leaves
    await scamper(TRUNK_X + 10, GROUND)
    await scamper(TRUNK_X + 10, 480)
    await q.g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished
    q.g.getAnimations().forEach((a) => a.cancel())
    q.g.style.opacity = '0'
    q.up = true
    q.busy = false
  }

  // ------------------------------------------------------------ public

  const thing = {
    // he stands so his front paws land against the trunk
    at: () => TRUNK_X - 24 - PAW_REACH + X(),
    face: 1,
    run: shake,
  }

  function init({ ended, effects }) {
    isEnded = ended
    fx = effects
    if (Layout.hidden.includes('tree')) return
    makeFruit()
    $('tree').classList.add('not-yet')
    setTimeout(visitorComes, (Layout.visitorAt ?? rnd(...VISITOR_AT_S)) * 1000)
  }

  return {
    thing,
    init,
    /** Can the tree be shaken? Once the hungry visitor is there. */
    get ready() { return visitor !== 'away' },
    get visitor() { return visitor },
    get snails() { return snails.length },
  }
})()
