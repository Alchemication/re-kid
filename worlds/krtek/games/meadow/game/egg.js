// The egg (he helps someone), after Krtek a vejce: an egg rolls into the
// meadow and stops in the grass. Whose is it? He knocks on it and puts his
// ear to it, then carries it over his head to ask: the mouse pops out of
// her hole and shakes her head, the hare hops in and shakes his. Then the
// egg wobbles in his hands and cracks: a chick hatches, and the top of the
// shell lands on his head like a hat (the surprise, and the laugh). The hen
// comes clucking along looking for her chick, it runs to her, and off they
// go; he keeps the hat until he next dives into the ground.
//
// A tap on the egg or on him while it plays hurries it on; a tap on the
// meadow cuts it short (things.js), and the next tap on the egg carries on
// from where it stopped: a dropped egg waits in the grass, a hatched chick
// waits for its mother.

/* global Debug, Friends, Layout, Mole, Motion, Sound, Things */
(() => {
  const Y = Layout.GROUND
  const ROLL_FROM = -60 // it rolls in from the left edge...
  const REST_X = 330 // ...and stops here, in the grass left of his molehill
  const HOLE_X = 190 // the mouse's hole
  const ASK_X = 300 // where he stands to show it to the mouse and the hare
  const HARE_FROM = -120
  const HARE_AT = 170
  const HEN_FROM = 1720
  const ROLL_MS = 2200

  const egg = { x: REST_X, where: 'away', node: null, wrap: null, chick: null }
  const cast = Friends.troupe()
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

  function appear() {
    const hole = el('g', { class: 'mouse-hole' }, document.getElementById('things'))
    el('ellipse', { cx: HOLE_X, cy: Y + 4, rx: 30, ry: 9, fill: '#2b1b0b' }, hole)
    el('path', { d: `M${HOLE_X - 36} ${Y + 6} q36 -22 72 0`, fill: 'none', stroke: '#6e4a24', 'stroke-width': 6, 'stroke-linecap': 'round' }, hole)
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

  // ------------------------------------------------------------ the chain

  /** He finds it: knock knock, an ear to it. */
  async function find(alive) {
    if (egg.where !== 'ground') return
    await m().goTo(egg.x + 80)
    if (!alive()) return
    Sound.knock()
    await Mole.knock()
    if (!alive()) return
    await Mole.lean(-14, 1100)
    if (!alive()) return
    Sound.say('ooh')
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

  /** Up over his head with it, and over to the mouse's hole: not hers. */
  async function askMouse(alive) {
    await holdIt(alive)
    if (!alive()) return
    await m().goTo(ASK_X)
    if (!alive()) return
    const mouse = cast.call('mouse', HOLE_X, 1)
    mouse.under()
    Sound.squeak()
    await mouse.rise(true)
    if (!alive()) return
    await mouse.bob(2)
    if (!alive()) return
    await mouse.no()
    if (!alive()) return
    await mouse.rise(false)
    cast.dismiss(mouse)
  }

  /** The hare hops in to look: not his either. */
  async function askHare(alive) {
    await holdIt(alive)
    if (!alive()) return
    await m().goTo(ASK_X)
    if (!alive()) return
    const hare = cast.call('hare', HARE_FROM, 1)
    await hare.go(HARE_AT, 1500, 36)
    if (!alive()) return
    await hare.bob(1)
    if (!alive()) return
    await hare.no()
    if (!alive()) return
    hare.turn(-1)
    await hare.go(HARE_FROM, 1300, 36)
    cast.dismiss(hare)
  }

  /** It wobbles, it cracks: a chick, and the top of the shell on his head. */
  async function hatch(alive) {
    if (egg.chick) return // hatched already: on to its mother
    await holdIt(alive)
    if (!alive()) return
    Sound.peep()
    await Mole.wobble(1000)
    if (!alive()) return
    Sound.crack()
    Sound.say('fright')
    Mole.carry(null)
    egg.where = 'hatched'
    Debug.trace('hatched')
    Mole.wear(drawCap())
    const at = Mole.state.x - 70
    const bottom = el('g', { class: 'egg-bottom-lies' }, document.getElementById('things'))
    bottom.appendChild(drawBottom())
    bottom.style.transform = `translate(${at - 30}px, ${Y - 26}px)`
    egg.bottom = bottom
    egg.chick = Friends.make('chick', at, 1)
    egg.chick.g.dataset.thing = 'egg' // a tap on the chick hurries it to its mother
    await Motion.endAt(egg.chick.g, [{ transform: `translate(${at}px, ${Y - 120}px)` }, { transform: `translate(${at}px, ${Y}px)` }], { duration: 500, easing: 'cubic-bezier(.5,0,.8,1.4)' })
    if (!alive()) return
    await Mole.cheer()
    if (!alive()) return
    Sound.say('giggle')
    Sound.peep()
    await egg.chick.bob(3)
  }

  /** The hen comes looking, the chick runs to her, and off they go together. */
  async function mother(alive) {
    const chick = egg.chick
    const hen = cast.call('hen', HEN_FROM, -1)
    Sound.cluck()
    const near = Math.min(Mole.state.x + 220, 1380)
    await hen.go(near, 2600)
    if (!alive()) return
    Sound.cluck()
    Sound.peep()
    chick.turn(1)
    await chick.go(near - 60, 900, 14)
    if (!alive()) return
    await hen.bob(2)
    if (!alive()) return
    Sound.say('giggle')
    hen.turn(1)
    await Promise.all([hen.go(HEN_FROM + 60, 2600), chick.go(HEN_FROM, 2600, 10), Mole.cheer()])
    if (!alive()) return
    cast.dismiss(hen)
    chick.gone()
    egg.chick = null
    if (egg.bottom) Motion.endAt(egg.bottom, [{ opacity: 1 }, { opacity: 0 }], { duration: 1500 }).then(() => egg.bottom.remove(), () => egg.bottom.remove())
    egg.where = 'home'
  }

  /** Cut short: visitors go home; an egg in his hands goes down in the grass where he stands; a chick waits. */
  function restore() {
    cast.dismissAll()
    if (egg.where === 'carried') {
      Mole.carry(null)
      onGround(Math.max(150, Mole.state.x - 60))
    }
    if (egg.chick) {
      egg.chick.g.getAnimations().forEach((a) => a.cancel())
      egg.chick.place(Math.max(150, Math.min(1420, egg.chick.x)))
      egg.chick.turn(1)
    }
  }

  /** Bedtime: the chick goes home with nobody, the halves of the shell are tidied away; an egg not yet asked about waits in the grass. */
  function night() {
    restore()
    if (egg.chick) egg.chick.gone()
    egg.chick = null
    if (egg.bottom) egg.bottom.remove()
  }

  Things.add({
    name: 'egg',
    offer: 'help',
    appear,
    steps: [find, askMouse, askHare, hatch, mother],
    restore,
    night,
    detail: () => ({ where: egg.where, x: Math.round(egg.x), chick: !!egg.chick, cast: cast.kinds() }),
  })
})()
