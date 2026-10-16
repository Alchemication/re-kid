// The paint and the fox (someone helps him), after Krtek malířem: paint
// tins get dropped in the open grass between his flowers and the spring. He peers into the red one and falls in
// head first, and comes out all red. Then a grinning fox comes sneaking in
// from the edge of the meadow, and he claps his hands to his cheeks. Along
// come the hare and the mouse with brushes: they paint each other (tiger
// stripes, spots) and dab spots on him, and the three of them climb onto each
// other's shoulders, a big striped spotted monster with its arms up, and
// the fox yelps and runs (the surprise, as the stacked monster in the film).
// His friends wave and go, he jumps in the spring to wash the paint off, and
// the tins are fetched away. If bedtime comes first, he goes to bed washed.
//
// A tap on a tin or on him hurries it on; a tap elsewhere cuts it short
// (things.js): the friends and the fox go home, and the next tap carries
// on from the step it stopped at (the fox comes back first, quicker); he
// stays red until he washes.

/* global Debug, Friends, Layout, Mole, Motion, Sound, Things */
;(() => {
  const Y = Layout.GROUND
  const S = Layout.SPRING
  const TINS = [{ x: S - 255, colour: '#3a67ad' }, { x: S - 198, colour: '#f2c94c' }, { x: S - 142, colour: '#d8322b' }]
  const RED = 2 // the tin he falls into: the one nearest the spring
  const PEER_X = S - 75 // where he stands to peer into it, right of the tins
  const FOX_FROM = PEER_X + 950 // the fox sneaks in from off to the right...
  const FOX_AT = S + 190 // ...past the spring
  const STACK_X = S + 40 // where the monster stands, between the tins and the fox
  const FRIENDS_FROM = STACK_X - 950 // the friends come from off to the left, from his molehill's side
  const QUICK = 0.45 // coming back after a cut, everyone hurries
  const HARE_TALL = 150 // how high he stands on the hare's shoulders...
  const MOLE_TALL = 190 // ...and the mouse on his
  const WASH_AT = Layout.SPRING - 40

  const tins = []
  const cast = Friends.troupe()
  let fox = null
  let friends = { hare: null, mouse: null }
  let red = false // he fell in the tin (step 0 done)
  let again = false // a step is being picked up after a cut: the fox and friends hurry back
  const m = () => Things.meadow
  const el = (...args) => m().el(...args)

  function drawTin(colour) {
    const g = el('g', { class: 'tin' })
    el('rect', { x: -24, y: -50, width: 48, height: 50, rx: 4, fill: '#cfd4da', stroke: '#15140f', 'stroke-width': 3 }, g)
    el('ellipse', { cx: 0, cy: -50, rx: 24, ry: 7, fill: colour, stroke: '#15140f', 'stroke-width': 3 }, g)
    el('rect', { x: -24, y: -36, width: 48, height: 14, fill: colour, opacity: 0.85 }, g)
    el('path', { d: 'M-4 -50 v-40 l8 -6 v46', fill: '#8a5d2e', stroke: '#15140f', 'stroke-width': 2 }, g)
    return g
  }

  function appear() {
    TINS.forEach((t, i) => {
      const g = el('g', { class: 'thing tin', 'data-thing': 'paint' }, document.getElementById('things'))
      g.appendChild(drawTin(t.colour))
      g.style.transform = `translate(${t.x}px, ${Y + 8}px)`
      tins.push(g)
      // dropped one after another, as if by someone passing
      Motion.endAt(g, [{ transform: `translate(${t.x}px, ${Y - 500}px)` }, { transform: `translate(${t.x}px, ${Y + 8}px)` }], { duration: 500, delay: i * 350, easing: 'cubic-bezier(.5,0,.8,1.4)' })
        .then(() => Sound.plink(), () => 'cut: it stands where it ends')
    })
  }

  const pace = (ms) => (again ? ms * QUICK : ms)

  /** Paint splashes round x, y. */
  function splash(x, y, colour) {
    const layer = document.getElementById('drops')
    for (let i = 0; i < 9; i++) {
      const d = el('circle', { r: 6 + (i % 3) * 3, fill: colour, stroke: '#15140f', 'stroke-width': 1.5 }, layer)
      const a = (i / 9) * Math.PI * 2
      Motion.endAt(d, [{ transform: `translate(${x}px, ${y}px)` }, { transform: `translate(${x + Math.cos(a) * 90}px, ${y + Math.sin(a) * 50 - 40}px)`, opacity: 0 }], { duration: 650, easing: 'ease-out' }).then(() => d.remove(), () => d.remove())
    }
  }

  // ------------------------------------------------------------ the chain

  /** He peers into the red tin and falls in head first: out he comes, all red. */
  async function tumble(alive) {
    if (red) return
    const t = TINS[RED]
    await m().goTo(PEER_X)
    if (!alive()) return
    await Mole.lean(-24, 900)
    if (!alive()) return
    Sound.splash()
    Sound.say('fright')
    splash(t.x, Y - 60, t.colour)
    Mole.paint(t.colour)
    red = true
    Debug.trace('red')
    await Mole.lean(-50, 700)
    if (!alive()) return
    Sound.say('ooh')
    await Mole.cheer()
  }

  /** The fox sneaks in, grinning; he claps his hands to his cheeks. */
  async function foxComes(alive) {
    if (!fox) {
      fox = cast.call('fox', FOX_FROM, -1)
      await fox.go(FOX_AT, pace(2600))
      if (!alive()) return
    }
    await fox.bob(2)
    if (!alive()) return
    Sound.say('fright')
    await Mole.lean(20, 900)
  }

  /** The hare and the mouse come with brushes and paint each other, and him. */
  async function friendsPaint(alive) {
    if (!fox) await foxComes(alive) // picked up after a cut: the fox comes back first
    if (!alive()) return
    await m().goTo(STACK_X)
    if (!alive()) return
    friends.hare = cast.call('hare', FRIENDS_FROM, 1)
    friends.mouse = cast.call('mouse', FRIENDS_FROM - 90, 1)
    await Promise.all([friends.hare.go(STACK_X - 130, pace(3600), 36), friends.mouse.go(STACK_X - 210, pace(3600))])
    if (!alive()) return
    Sound.swish()
    await friends.hare.bob(2)
    if (!alive()) return
    friends.mouse.daub('spots', '#f2c94c')
    Sound.swish()
    await friends.mouse.bob(2)
    if (!alive()) return
    friends.hare.daub('stripes', '#15140f')
    Sound.swish()
    Mole.dots('#f2c94c')
    Sound.say('giggle')
  }

  /** Up on each other's shoulders: a big striped spotted monster. The fox yelps and runs. */
  async function monster(alive) {
    // picked up after a cut: the fox and the friends went home, so they come again first
    if (!fox) await foxComes(alive)
    if (!alive()) return
    if (!friends.hare) await friendsPaint(alive)
    if (!alive()) return
    const { hare, mouse } = friends
    again = false
    await Promise.all([m().goTo(STACK_X), hare.go(STACK_X, 900, 30), mouse.go(STACK_X - 10, 900)])
    if (!alive()) return
    await Mole.perch(HARE_TALL, 600)
    if (!alive()) return
    await mouse.lift(HARE_TALL + MOLE_TALL, 600)
    if (!alive()) return
    Sound.boo()
    await Mole.cheer()
    if (!alive()) return
    if (fox) {
      Sound.yelp()
      await fox.go(FOX_AT, 300, 60) // a jump of fright
      if (!alive()) return
      fox.turn(1)
      await fox.go(FOX_FROM + 60, 900)
      if (!alive()) return
      cast.dismiss(fox)
      fox = null
    }
    Sound.say('giggle')
    await Promise.all([mouse.lift(0, 500), Mole.perch(0, 500)])
  }

  /** His friends wave and go; he jumps in the spring and comes out clean. */
  async function wash(alive) {
    for (const f of [friends.hare, friends.mouse]) if (f) f.turn(-1)
    await Promise.all([friends.hare?.bob(2), friends.mouse?.bob(2)])
    if (!alive()) return
    await Promise.all([friends.hare?.go(FRIENDS_FROM, 3600, 36), friends.mouse?.go(FRIENDS_FROM - 60, 3600), m().goTo(WASH_AT)])
    if (!alive()) return
    cast.dismiss(friends.hare)
    cast.dismiss(friends.mouse)
    friends = { hare: null, mouse: null }
    await Mole.lean(-30, 600)
    if (!alive()) return
    Sound.splash()
    splash(Mole.state.x - 40, Y - 30, '#7fb3ea')
    Mole.paint(null)
    Debug.trace('washed')
    Sound.say('giggle')
    await Mole.cheer()
    fetchTins()
  }

  /** The tins are fetched away (someone comes back for them), leaving the grass free. */
  function fetchTins() {
    for (const t of tins) {
      t.removeAttribute('data-thing')
      Motion.endAt(t, [{ opacity: 1 }, { opacity: 0 }], { duration: 1500 }).then(() => t.remove(), () => t.remove())
    }
  }

  /** Cut short: the fox and the friends go home (they'll come again, quicker); he stays as painted as he is. */
  function restore() {
    cast.dismissAll()
    fox = null
    friends = { hare: null, mouse: null }
    again = true
  }

  /** Bedtime: everyone home, and he goes to bed washed. */
  function night() {
    restore()
    Mole.paint(null)
  }

  Things.add({
    name: 'paint',
    offer: 'helped',
    appear,
    steps: [tumble, foxComes, friendsPaint, monster, wash],
    restore,
    night,
    detail: () => ({ red, painted: Mole.state.painted, fox: !!fox, cast: cast.kinds() }),
  })
})()
