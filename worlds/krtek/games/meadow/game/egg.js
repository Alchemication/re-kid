// The egg (he helps someone), after Krtek a vejce, and a choice for the
// child (docs/DESIGN_PRINCIPLES.md: a tap is a choice, not a skip). An egg
// rolls into the meadow; the hare hops in and sits in the grass nearby, and
// further along, past the flowers, the hen comes pecking her way in. He knocks on the egg, puts his ear
// to it, holds it up over his head, puzzled: whose is it?
//
// Then the child picks whom to show it to, by tapping them:
// - the mouse (her hole): she pops out, sniffs it, and sneezes so hard the
//   egg wobbles in his hands. Not hers.
// - the hare: he looks, his ears droop, he shakes his head. Not his.
// - the hen: she sees it and comes running, clucking; the egg cracks in his
//   hands, a chick, and the top of the shell lands on his head like a hat
//   (the surprise). The chick runs to her and they go off together.
// Left alone, he tries them himself: the mouse, the hare, then the hen.
// Each wrong guess is its own little joke, and can be had again.
//
// A tap on someone else while he goes to one sends him to them instead; a
// tap on the meadow cuts it short: the mouse ducks home, the egg goes down
// in the grass by him, and the next tap carries on.

/* global CSSAnimation, Debug, Friends, Layout, Mole, Motion, Sound, Things */
;(() => {
  const Y = Layout.GROUND
  const ROLL_FROM = -60 // it rolls in from the left edge...
  const REST_X = 330 // ...and stops here, in the grass left of his molehill
  const HOLE_X = 190 // the mouse's hole
  const HARE_AT = 650 // where the hare sits, between the egg and his molehill
  const HEN_AT = 1460 // where the hen pecks about, past his flowers…
  const HEN_NEAR = 1000 // …and where she comes once he holds the egg up, so she shows by him (a child must see whom to ask)
  const HEN_FROM = HEN_AT + 900 // she comes pecking her way in from off to the right…
  const HARE_FROM = -140 // …and the hare hops in from off to the left (nobody just appears)
  const ARRIVE_MS = 2600
  const HEN_LEAVES = 1900 // she takes her chick this way, and on off the screen
  const ROLL_MS = 2200
  const ORDER = ['mouse', 'hare', 'hen'] // what he tries himself, left alone

  const egg = { x: REST_X, where: 'away', node: null, wrap: null, chick: null, bottom: null }
  const cast = Friends.troupe() // visitors called in for a moment (the mouse): sent home on a cut
  let hare = null // the hare and the hen are about while the egg is: they wait to be asked
  let hen = null
  let henAt = HEN_AT // where she waits: closer once he holds the egg up
  const tried = new Set()
  const m = () => Things.meadow
  const el = (...args) => m().el(...args)

  /** The egg, drawn round its middle. */
  function drawEgg() {
    const g = el('g', { class: 'egg-shape' })
    el('path', { d: 'M0 -38 C22 -38 30 -6 28 10 C26 28 14 36 0 36 C-14 36 -26 28 -28 10 C-30 -6 -22 -38 0 -38 Z', fill: '#fbf7ec', stroke: '#15140f', 'stroke-width': 3 }, g)
    el('ellipse', { cx: -10, cy: -14, rx: 6, ry: 10, fill: '#fff', opacity: 0.9 }, g)
    return g
  }

  /** The top of the shell, jagged where it broke: a hat. */
  function drawCap() {
    const g = el('g', { class: 'egg-cap' })
    el('path', { d: 'M-27 4 C-26 -24 -14 -34 0 -34 C14 -34 26 -24 27 4 l-7 -8 l-6 8 l-7 -9 l-7 9 l-7 -8 l-6 8 z', fill: '#fbf7ec', stroke: '#15140f', 'stroke-width': 3, 'stroke-linejoin': 'round' }, g)
    return g
  }

  function drawBottom() {
    const g = el('g', { class: 'egg-bottom' })
    el('path', { d: 'M-28 0 l7 -8 l6 8 l7 -9 l7 9 l7 -8 l6 8 l7 -8 C29 18 18 30 0 30 C-18 30 -29 18 -28 0 Z', fill: '#fbf7ec', stroke: '#15140f', 'stroke-width': 3, 'stroke-linejoin': 'round' }, g)
    return g
  }

  /** Lay the egg in the grass at x (the tap target is the egg itself). */
  function onGround(x) {
    egg.x = x
    egg.where = 'ground'
    egg.wrap.style.transform = `translate(${x}px, ${Y - 34}px)`
    egg.wrap.appendChild(egg.node)
    egg.wrap.style.display = ''
  }

  /** Mark a drawing as one of the egg's choices: a tap on it is "use egg <who>". */
  function choice(g, who) {
    g.dataset.thing = 'egg'
    g.dataset.choice = who
    return g
  }

  function appear() {
    const hole = choice(el('g', { class: 'mouse-hole' }, document.getElementById('things')), 'mouse')
    el('ellipse', { cx: HOLE_X, cy: Y + 4, rx: 34, ry: 11, fill: '#2b1b0b' }, hole)
    el('path', { d: `M${HOLE_X - 40} ${Y + 6} q40 -24 80 0`, fill: 'none', stroke: '#6e4a24', 'stroke-width': 6, 'stroke-linecap': 'round' }, hole)
    hare = Friends.make('hare', HARE_FROM, 1)
    choice(hare.g, 'hare')
    Debug.ignoreCut(hare.go(HARE_AT, ARRIVE_MS * 0.8, 30), 'the hare hops in').then(() => hare?.turn(-1))
    hen = Friends.make('hen', Friends.offscreen(1, HEN_FROM), -1)
    choice(hen.g, 'hen')
    Debug.ignoreCut(hen.go(HEN_AT, ARRIVE_MS), 'the hen comes').then(() => hen?.g.classList.add('pecking'))
    egg.node = drawEgg()
    egg.wrap = el('g', { class: 'thing egg', 'data-thing': 'egg' }, document.getElementById('things'))
    onGround(REST_X)
    // it rolls in, turning, and rocks to a stop
    Motion.endAt(egg.wrap, [
      { transform: `translate(${ROLL_FROM}px, ${Y - 34}px) rotate(-540deg)` },
      { transform: `translate(${REST_X + 12}px, ${Y - 34}px) rotate(12deg)`, offset: 0.85 },
      { transform: `translate(${REST_X}px, ${Y - 34}px) rotate(0deg)` },
    ], { duration: ROLL_MS, easing: 'ease-out' }).catch(() => 'cut: it shows where it stopped')
    Sound.roll(ROLL_MS / 1000)
  }

  /** Pick it up (if it's in the grass) and hold it over his head. */
  async function holdIt(alive) {
    if (egg.where !== 'ground') return
    await m().goTo(egg.x + 50)
    if (!alive()) return
    egg.where = 'carried'
    Mole.carry(egg.node)
    egg.wrap.style.display = 'none'
  }

  // ------------------------------------------------------------ finding it

  /** He finds it: knock knock, an ear to it, then up over his head: whose is it? */
  async function find(alive) {
    if (egg.where === 'ground') {
      await m().goTo(egg.x + 80)
      if (!alive()) return
      Sound.knock()
      await Mole.knock()
      if (!alive()) return
      await Mole.lean(-14, 1100)
      if (!alive()) return
    }
    await holdIt(alive)
    if (!alive()) return
    Sound.say('ooh')
    if (hen && henAt !== HEN_NEAR) { // she has heard him, and comes pecking closer
      henAt = HEN_NEAR
      hen.turn(-1)
      Debug.ignoreCut(hen.go(HEN_NEAR, 1800), 'the hen comes closer').then(() => hen?.turn(-1))
    }
    await puzzled(alive)
  }

  /** Holding it up, he looks this way and that: whose? */
  async function puzzled(alive) {
    Mole.feel('worried', 1300) // whose is it?
    await Mole.lean(10, 600)
    if (!alive()) return
    await Mole.lean(-10, 600)
  }

  // ------------------------------------------------------------ whom he asks

  /** The mouse pops out of her hole, sniffs, and sneezes: not hers. */
  async function askMouse(alive) {
    await m().goTo(HOLE_X + 100)
    if (!alive()) return
    const mouse = cast.call('mouse', HOLE_X, 1, { hole: true })
    mouse.under()
    Sound.squeak()
    await mouse.rise(true)
    if (!alive()) return
    await mouse.bob(2) // a sniff, a sniff...
    if (!alive()) return
    Sound.sneeze()
    await Promise.all([mouse.jolt(), Mole.wobble(700)]) // ...atchoo, and the egg wobbles in his hands
    if (!alive()) return
    await mouse.no()
    if (!alive()) return
    await mouse.rise(false)
    cast.dismiss(mouse)
    Mole.feel('glum', 900)
    await Mole.lean(8, 700) // a little glum
  }

  /** The hare looks, his ears droop, he shakes his head: not his. */
  async function askHare(alive) {
    await m().goTo(HARE_AT + 110)
    if (!alive()) return
    hare.turn(1)
    await hare.bob(1)
    if (!alive()) return
    await hare.droop() // his ears sink...
    if (!alive()) return
    await hare.no() // ...and a shake of the head
    if (!alive()) return
    hare.turn(-1)
    Mole.feel('glum', 900)
    await Mole.lean(-8, 700)
  }

  /** The hen sees it and comes running; it hatches in his hands; the chick runs to her, and off they go. */
  async function askHen(alive) {
    if (!egg.chick) {
      await m().goTo(Math.max(HARE_AT + 160, henAt - 420))
      if (!alive()) return
      hen.g.classList.remove('pecking')
      Sound.cluck()
      await hen.go(Mole.state.x + 190, 900) // she has seen it: she comes running
      if (!alive()) return
      await hatch(alive)
      if (!alive()) return
    }
    await mother(alive)
  }

  /** It wobbles, it cracks: a chick, and the top of the shell on his head. */
  async function hatch(alive) {
    Sound.peep()
    await Mole.wobble(1000)
    if (!alive()) return
    Sound.crack()
    Sound.say('fright')
    Mole.carry(null)
    egg.where = 'hatched'
    Debug.trace('hatched')
    Mole.wear(drawCap())
    const at = Mole.state.x + 70
    const bottom = el('g', { class: 'egg-bottom-lies' }, document.getElementById('things'))
    bottom.appendChild(drawBottom())
    bottom.style.transform = `translate(${at - 30}px, ${Y - 26}px)`
    egg.bottom = bottom
    egg.chick = Friends.make('chick', at, 1, { born: true })
    choice(egg.chick.g, 'hen') // a tap on the chick: to its mother
    await Motion.endAt(egg.chick.g, [{ transform: `translate(${at}px, ${Y - 120}px)` }, { transform: `translate(${at}px, ${Y}px)` }], { duration: 500, easing: 'cubic-bezier(.5,0,.8,1.4)' })
    if (!alive()) return
    Sound.peep()
    await Mole.cheer()
  }

  async function mother(alive) {
    const chick = egg.chick
    if (Math.abs(hen.x - chick.x) > 260) {
      hen.turn(-1)
      Sound.cluck()
      await hen.go(chick.x + 120, 900)
      if (!alive()) return
    }
    Sound.peep()
    chick.turn(1)
    await chick.go(hen.x - 50, 700, 14)
    if (!alive()) return
    await hen.bob(2)
    if (!alive()) return
    Sound.say('giggle')
    hen.turn(1)
    await Promise.all([hen.go(HEN_LEAVES + 60, 2600), chick.go(HEN_LEAVES, 2600, 10), Mole.cheer()])
    if (!alive()) return
    hen.leave() // on off the screen, the two of them, then gone
    chick.leave()
    hen = null
    egg.chick = null
    egg.where = 'home' // the shell's bottom stays in the grass, as the poles stay
    hare.turn(-1)
    await hare.go(-160, 2400, 36) // the hare has seen enough, and hops off home
    if (!alive()) return
    hare.gone()
    hare = null
  }

  const ASK = { mouse: askMouse, hare: askHare, hen: askHen }

  /** Show it to `who`: up it goes in his hands, and off he goes to them. */
  async function choose(who, alive) {
    if (!egg.chick) {
      await holdIt(alive)
      if (!alive()) return
    }
    await (egg.chick ? askHen : ASK[who])(alive) // once it has hatched, every way leads to its mother
    if (alive()) tried.add(who) // asked to the end: left alone, he asks someone else next
  }

  /** Cut short: the mouse ducks home; the egg in his hands goes down in the grass by him; the hare and the hen walk back to where they were. */
  function restore() {
    cast.dismissAll()
    if (egg.where === 'carried') {
      Mole.carry(null)
      onGround(Math.max(150, Mole.state.x - 60))
    }
    if (egg.where === 'home' && hare) {
      hare.leave() // given back, and cut as the hare hopped off: on he hops, home
      hare = null
    }
    for (const [f, at] of [[hare, HARE_AT], [hen, henAt]]) {
      if (!f) continue
      // stop what was moving them (not the hen's own pecking, a CSS animation that keeps going), and back they walk
      f.g.getAnimations({ subtree: true }).filter((a) => !(a instanceof CSSAnimation)).forEach((a) => a.cancel())
      f.turn(at < f.drawnX() ? -1 : 1)
      Debug.ignoreCut(f.go(at, 700), 'back to its place').then(() => f.turn(-1))
    }
    if (hen && !egg.chick) hen.g.classList.add('pecking')
    if (egg.chick) {
      egg.chick.g.getAnimations().forEach((a) => a.cancel())
      egg.chick.place(Math.max(150, Math.min(Layout.DIG.to, egg.chick.x)))
    }
  }

  /** Bedtime: everyone goes home; an egg not yet given back waits in the grass. */
  function night() {
    restore()
    for (const f of [hare, hen, egg.chick]) if (f) f.gone(true)
    hare = hen = egg.chick = null
    if (egg.bottom) egg.bottom.remove()
  }

  Things.add({
    name: 'egg',
    offer: 'help',
    music: { 0: 'sad' }, // a lost egg: whose is it? (happy once the hen has her chick)
    appear,
    steps: [find],
    ask: choose,
    next: () => (egg.chick ? 'hen' : ORDER.find((who) => !tried.has(who)) || 'hen'),
    resolved: () => egg.where === 'home',
    holds: () => egg.where === 'carried',
    restore,
    night,
    detail: () => ({ where: egg.where, x: Math.round(egg.x), chick: !!egg.chick, tried: [...tried], cast: cast.kinds() }),
  })
})()
