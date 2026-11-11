// The fruit tree, and who is hungry for its fruit.
//
// Some plays have a tree by the wall: apples, plums or hazelnuts (layout.js
// picks). A while into the play a hungry visitor turns up at its foot and
// looks up at the fruit it can't reach: a snail for apples or plums, a
// squirrel for nuts. Reksio rears up against the trunk and shakes it; leaves
// fly and fruit drops. The snail creeps to an apple and slowly eats it, and
// more snails come to share; the squirrel eats one nut and buries another,
// then runs off up the trunk.
//
// A little story over three shakes, the crown emptying as you watch: the
// first brings down half the fruit, the second all but one. By the third the
// bird has flown down to peck at that last one; he shakes, and out tumbles
// the bird with the fruit, cross: it scolds him from over his head, and he
// shrinks. After that the tree is bare: a shake, a look up, and a tut from
// the bird. The second shake brings something on top (VARIATIONS): an apple
// or plum lands on Reksio's head; one fruit won't come down until he gives
// up and turns away, then drops right behind him; the squirrel runs up the
// trunk and drops a nut for him to catch, which he puts down for her; or a
// shower of leaves lands on his head, and he shakes them off.
//
// In winter the tree is bare and snowy, with no one waiting under it: each
// shake brings down snow, a different fall from the last (SNOWFALLS): a
// sprinkle, a big shower, or a clump right on his head that he shakes off.
//
// Everything here lives inside the tree's own group, in the coordinates it
// is drawn in (index.html); Layout.x('tree') moves the lot.

/* global Clock, Debug, Motion, Layout, Sound, Music, Reksio, Figure, Bird */
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
  // what a repeat adds, by fruit: the squirrel only comes for nuts; a nut on his head is no joke
  const VARIATIONS = Layout.fruit === 'nut' ? ['stuck', 'squirrel', 'leaves'] : ['bonk', 'stuck', 'leaves']
  const GIVE_UP = 90 // he turns and walks this far away before the stuck fruit lets go
  const SQUIRREL_UP = 470 // how high up the trunk she runs to drop him a nut
  const FIRST_FALL = 3 // the first shake brings down half the fruit; the second all but one (the bird's)
  const BIRD_BY_FRUIT = { x: 22, y: -10 } // where the bird perches by the last fruit, from the fruit
  const BIRD_SCOLDS = 190 // shaken out, it scolds him from this far behind him, clear of his nose once he turns to it
  const SNOWFALLS = ['sprinkle', 'shower', 'head'] // what a winter shake brings down, never the same twice running
  const CROWN = { x: [1550, 1770], y: [290, 460] } // where snow falls from, as drawn
  const winter = Layout.season === 'winter'
  /** A fruit's transform at (x, y), shrunk to k as it's eaten. */
  const at = (x, y, k = 1) => `translate(${x}px, ${y}px) scale(${k * FRUIT_SCALE})`

  const SVG_NS = 'http://www.w3.org/2000/svg'
  const $ = (id) => document.getElementById(id)
  const wait = Clock.wait
  const random = Debug.random('tree') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)
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
  let scolded = false // the bird was shaken out with the last fruit: from then on it tuts at him
  let lastSnow = null

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
    fx.burst(TRUNK_X + X() + rnd(-80, 80), rnd(330, 430), 6, winter ? 'snow-bit' : 'leaf', { height: 10, reach: 90, size: 5 })
  }

  /** One fruit falls from the crown to (toX, toY), bounces and settles. */
  async function drop(f, toX, toY = FRUIT_REST_Y) {
    const layer = $('tree-ground')
    f.el.remove()
    const g = el('g', { class: 'fallen' }, layer)
    el('use', { href: `#fruit-${Layout.fruit}` }, g)
    const fall = Math.max(200, (toY - f.y) * 1.3)
    await Motion.endAt(
      g,
      [
        { transform: at(f.x, f.y), easing: 'ease-in' },
        { transform: at((f.x + toX) / 2, toY), offset: 0.7, easing: 'ease-out' },
        { transform: at((f.x + toX * 3) / 4, toY - 18), offset: 0.85, easing: 'ease-in' },
        { transform: at(toX, toY) },
      ],
      { duration: fall + 350 },
    )
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
    await Motion.endAt(g, [{ transform: at(hx, head.y - 40) }, { transform: at((hx + rest) / 2, head.y - 90) }, { transform: at(rest, FRUIT_REST_Y) }], { duration: 600, easing: 'ease-in' })
    fallen.push({ el: g, x: rest, bites: 0, eater: null })
    for (let i = 0; i < 3; i++) Clock.after(i * 220, () => fx.twinkle(head.x + rnd(-50, 30), head.y - 70 + rnd(-20, 20)))
    await Reksio.sit(1300)
  }

  /** One fruit won't fall: he shakes and shakes; once he gives up and turns
   * away, it drops right behind him. */
  async function stuck() {
    const f = hanging.shift()
    for (let i = 0; i < 3; i++) await Reksio.stamp(wobbleCrown)
    await Reksio.lookUp(800)
    await Reksio.walkTo(Reksio.x - GIVE_UP) // oh well
    const g = await drop(f, WAITS_AT - 80)
    fallen.push({ el: g, x: WAITS_AT - 80, bites: 0, eater: null })
    Reksio.face(1)
    await Reksio.startle()
  }

  /** The squirrel runs up the trunk and drops a nut to him: he jumps and
   * catches it, and puts it down for her. False if she can't now. */
  async function squirrelHelps() {
    const q = squirrel
    if (!q || q.busy || hanging.length < 2) return false // the last one is the bird's
    q.busy = true
    try {
      q.g.style.opacity = '1'
      await scamper(TRUNK_X + 10, SQUIRREL_UP)
      q.up = true
      hear(q.x, () => Sound.chitter())
      const f = hanging.shift()
      const m = Reksio.mouth()
      const catching = drop(f, m.x - X(), m.y - 10)
      await wait(250)
      await Reksio.hop(30, 1)
      const g = await catching
      Sound.snap()
      const x = WAITS_AT - 40
      await Reksio.nod(24, 500) // and down for her: it rolls over to her
      const m2 = Reksio.mouth()
      await Motion.endAt(g, [{ transform: at(m2.x - X(), FRUIT_REST_Y) }, { transform: at(x, FRUIT_REST_Y) }], { duration: 500, easing: 'ease-out' })
      Sound.tok()
      shakes += 1 // counts as a shake: the next drops fewer
      fallen.push({ el: g, x, bites: 0, eater: null })
    } finally {
      q.busy = false
    }
    return true
  }

  /** A shower of leaves, two of them landing on his head; a look up, and he
   * shakes them off. */
  async function leaves() {
    fx.burst(Reksio.x, 520, 14, 'leaf', { height: 10, reach: 80, size: 6 })
    const parts = [-16, 14].map((dx) => ({ dx, dy: 4, el: el('ellipse', { class: 'leaf head-leaf', rx: 14, ry: 7 }, $('fx')) }))
    await onHisHead(parts, () => Reksio.lookUp(900))
  }

  /** Shapes laid on his head (each s.el at s.dx, s.dy from its top), kept
   * there each frame while `during()` runs (gone if that is cut short);
   * then he shakes them off, in a spray of `spray` bits if given. */
  async function onHisHead(parts, during, spray = null) {
    const put = () => {
      const p = Reksio.pointAt(Figure.bowlTopAt)
      for (const s of parts) {
        s.el.setAttribute('cx', p.x + s.dx)
        s.el.setAttribute('cy', p.y + s.dy)
      }
    }
    put()
    const stay = Clock.every(0, put)
    try {
      await during()
    } catch (e) {
      parts.forEach((s) => s.el.remove()) // cut short: nothing left behind
      throw e
    } finally {
      stay()
    }
    Sound.shake()
    if (spray) fx.burst(Reksio.x, Reksio.pointAt(Figure.bowlTopAt).y, 16, spray, { height: 40, reach: 80, size: 4 })
    parts.forEach((s, i) => s.el.animate([{ transform: 'translate(0, 0)', opacity: 1 }, { transform: `translate(${(i % 2 ? 1 : -1) * 40}px, 90px)`, opacity: 0 }], { duration: 700, easing: 'ease-in' }).finished.then(() => s.el.remove()))
    await Reksio.shake()
  }

  /** Whoever is hungry comes to eat what's down. */
  function feed() {
    if (nut()) squirrelEats()
    else snailsEat()
    if (visitor === 'hungry') visitor = 'fed'
  }

  /** These fruit fall from the crown to the ground by the visitor, one after another. */
  const fall = (falling) => Promise.all(
    falling.map(async (f, i) => {
      await wait(i * 180)
      const x = WAITS_AT - 70 + i * 60 + rnd(-15, 15)
      const g = await drop(f, x)
      fallen.push({ el: g, x, bites: 0, eater: null })
    }),
  )

  /** A use: what a shake brings down depends on what is left up there.
   * variation() draws the repeat's extra, only when fruit falls. */
  async function shake({ variation }) {
    Reksio.face(1)
    if (winter) return shakeSnow()
    if (!hanging.length) return bare()
    if (hanging.length === 1) return lastFruit()
    return fruitFalls(variation())
  }

  /** Fruit comes down, all but one; v, the repeat's extra, on top. */
  async function fruitFalls(v) {
    Debug.trace('tree', { stage: shakes ? 'more' : 'first' })
    if (v === 'squirrel' && (await squirrelHelps())) return feed()
    for (let i = 0; i < 3; i++) await Reksio.stamp(wobbleCrown)
    shakes += 1
    const keep = shakes === 1 ? Math.max(1, hanging.length - FIRST_FALL) : 1
    const falling = hanging.splice(0, hanging.length - keep - (v === 'stuck' ? 1 : 0))
    if (v === 'bonk' && !nut() && falling.length) await bonk(falling.pop())
    await fall(falling)
    if (v === 'stuck' && hanging.length > 1) await stuck()
    feed()
    if (v === 'leaves') await leaves()
    await wait(600)
  }

  /** The last fruit, and the bird has come down to peck at it. He shakes:
   * out tumbles the bird with the fruit, scolds him from over his head, and
   * he shrinks. With the bird busy elsewhere, just the fruit. */
  async function lastFruit() {
    const f = hanging[0]
    const spot = { x: f.x + BIRD_BY_FRUIT.x + X(), y: f.y + BIRD_BY_FRUIT.y }
    const bird = await Bird.toFruit(spot) // he is at the trunk, looking at it: he doesn't see it come
    Debug.trace('tree', { stage: 'last', bird })
    let shooed = false
    try {
      for (let i = 0; i < 3; i++) await Reksio.stamp(wobbleCrown)
      shakes += 1
      hanging.shift()
      shooed = bird
      const to = { x: Reksio.x - Reksio.facing * BIRD_SCOLDS, y: Reksio.mouth().y - 60 } // by his head, clear of the crown
      await Promise.all([
        fall([f]),
        bird && Reksio.startle(),
        bird && Bird.shooed(spot, to, async () => {
          Reksio.face(-Reksio.facing) // round to it
          await Reksio.toldOff()
        }),
      ])
      scolded = scolded || bird
    } finally {
      if (bird && !shooed) Bird.flyAway(spot) // cut short with it in the tree: off home on its wings
    }
    feed()
    await wait(600)
  }

  /** Nothing left: a shake, a long look up at the bare crown, and, if he
   * shook the bird out of it, a tut from its perch that makes him shrink. */
  async function bare() {
    Debug.trace('tree', { stage: 'bare' })
    await Reksio.stamp(wobbleCrown)
    await Reksio.lookUp(1100)
    if (!scolded || Bird.flying) return Reksio.puzzled()
    Reksio.face(Math.sign(Bird.perch.x - Reksio.x) || 1)
    await Promise.all([Bird.tut(), Reksio.toldOff()])
  }

  /** In winter: three shakes, and down comes snow, a different fall each
   * time: a sprinkle (is that all?), a big shower (he hops with delight), or
   * a clump on his head that he shakes off. */
  async function shakeSnow() {
    const choices = SNOWFALLS.filter((s) => s !== lastSnow)
    const how = choices[Math.floor(random() * choices.length)]
    lastSnow = how
    Debug.trace('tree', { stage: 'snow', how })
    for (let i = 0; i < 3; i++) await Reksio.stamp(wobbleCrown)
    Sound.poof()
    if (how === 'sprinkle') {
      snowFalls(10, 3)
      await Reksio.lookUp(900)
      return Reksio.puzzled()
    }
    if (how === 'shower') {
      snowFalls(110, 6)
      await Reksio.lookUp(1500)
      return Reksio.hop(40, 1)
    }
    snowFalls(24, 4)
    await snowOnHead()
  }

  /** Snow falling from the crown to the ground, n bits of about this size. */
  function snowFalls(n, size) {
    for (let i = 0; i < n; i++) {
      const x = rnd(...CROWN.x) + X()
      const y = rnd(...CROWN.y)
      const c = el('circle', { class: 'snow-bit', cx: x, cy: y, r: size * rnd(0.6, 1.4) }, $('fx'))
      c.animate([{ transform: 'translate(0, 0)', opacity: 1 }, { transform: `translate(${rnd(-30, 30)}px, ${GROUND - y}px)`, opacity: 0.3 }], { duration: rnd(900, 1500), delay: rnd(0, 600), easing: 'ease-in', fill: 'backwards' }).finished.then(() => c.remove())
    }
  }

  /** A clump of snow drops onto his head: flump. He freezes, eyes up at it,
   * and shakes it off in a spray. */
  async function snowOnHead() {
    const top = Reksio.pointAt(Figure.bowlTopAt)
    const clump = el('circle', { class: 'snow-clump', cx: top.x, cy: top.y - 8, r: 18 }, $('fx'))
    try {
      await clump.animate([{ transform: `translate(0, ${CROWN.y[1] - top.y}px)` }, { transform: 'translate(0, 0)' }], { duration: 380, easing: 'ease-in' }).finished
    } finally {
      clump.remove()
    }
    Sound.poof()
    const parts = [[-18, 2, 13], [2, -6, 17], [20, 3, 11]].map(([dx, dy, r]) => ({ dx, dy, el: el('circle', { class: 'snow-clump', r }, $('fx')) }))
    await onHisHead(parts, async () => {
      await Reksio.startle()
      await Reksio.lookUp(800)
    }, 'snow-bit')
  }

  // ------------------------------------------------------------ eating

  /** Each free snail takes a free apple and nibbles it away; more come. */
  function snailsEat() {
    for (const s of snails) if (!s.fruit) snailTo(s)
    if (shakes === 1 || fallen.some((f) => !f.eater && f.bites < BITES)) {
      const more = Math.round(rnd(...MORE_SNAILS))
      for (let i = 0; i < more && snails.length < MAX_SNAILS; i++) {
        Clock.after(rnd(3000, 9000) * (i + 1), () => {
          if (isEnded() || snails.length >= MAX_SNAILS) return
          const side = random() < 0.5 ? -1 : 1
          const s = makeSnail(WAITS_AT + side * rnd(260, 360))
          s.body.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1200, easing: 'ease-out' })
          snailTo(s)
        })
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
    await Motion.endAt(f.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 600 })
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
      const spot = hide.x + (random() < 0.5 ? -1 : 1) * rnd(140, 220)
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
    await Motion.endAt(q.g, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 })
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
    if (Layout.hidden.includes('tree') || winter) return // in winter: no fruit, no one hungry
    makeFruit()
    $('tree').classList.add('not-yet')
    Clock.after((Layout.visitorAt ?? rnd(...VISITOR_AT_S)) * 1000, visitorComes)
  }

  return {
    VARIATIONS,
    thing,
    init,
    /** Can the tree be shaken? Once the hungry visitor is there. */
    get ready() { return winter || visitor !== 'away' },
    get visitor() { return visitor },
    get snails() { return snails.length },
    /** Fruit still up in the crown. */
    get hanging() { return hanging.length },
  }
})()
