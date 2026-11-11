// The paint and the fox (someone helps him), after Krtek malířem, told as a
// story that grows each time the tins are tapped again (Adam, 2026-11-01).
// The fox comes first, as in the film, and the paint after (Adam,
// 2026-11-06: friends carrying tins in before anything had happened made no
// sense). It begins with a sly snicker from off the meadow's edge: a
// threat, so, like the bulldozer, he stops what he is doing and hurries
// over towards the spring, and the fox comes sneaking in, big, for the
// bullfinch's nest on its rocks (nest.js; in the film he raids a nest),
// while the chicks huddle up, trembling and peeping the alarm. He snickers, rubbing his paws, licks his lips; the mole
// gasps and points, and the fox rears up over the nest, bigger still, paws
// up, teeth bared, and growls. The mole claps his hands to his face. The
// hare and the mouse have seen it all: they come from the painter's garden
// with three of his paint tins (they have a plan), and stop: the fox is in
// the way. The mole has an idea: he tunnels over to them under the fox's
// feet (who jumps, peers down or spins round as it bumps by), and back,
// and up they come behind him out of his molehill (Adam's idea,
// 2026-11-07: it says where the paint came from, and it is the mole's own
// gift that gets them by). Each tunnel draws what the fox does, there and
// back, and who comes up first. They set the tins down behind him and nod. But backing away from the fox, the mole tumbles into the
// nearest tin before anything comes of it: out he comes, all painted (the
// paint by accident, as the film; red there, any of the painter's colours
// here). Painted, he has an idea of his own: a ghost, arms up, "uuuu!". The first time the
// fox jumps, then peers closer and laughs: he sees through it. Now the
// friends' plan: brushes out, they paint each other (stripes, zigzags or
// spots, in the tins' colours: each play draws the colours and who wears
// which) and dab spots on him, and the three climb onto each other's shoulders, a
// big striped spotted monster with its arms up; the fox, shocked, shrinks
// small and hunched, his ruff on end, yelps and runs (the surprise, as the
// stacked monster in the film), and the chicks settle. His friends wave and
// go, and he jumps in the spring to wash the paint off. The tins stay.
//
// The tins tapped again, the story again, warier and quicker (again): the
// fox sneaks back, the mole tumbles in again, and this time the hare and
// the mouse come painted at once (up his tunnel again) and play ghost
// with him: that does it.
// Then, as chance has it, the fox runs, or (FRIENDS_CHANCE), small and found
// out, he is sorry: ears down, eyes on the ground, a bow. The mouse dabs
// spots on him too, he laughs, and he goes off with the hare and the mouse,
// all friends (the film's ending turned round: Adam's idea). Then the story
// is told: the hare and the mouse come back for the tins and carry them home
// to the garden (nothing falls from the sky or vanishes: Adam, 2026-10-23). Each play
// draws how the fox sneaks in (on tiptoe, or creeping low) and how the
// ghost acts (swaying, or bobbing). If bedtime comes first, he goes to bed
// washed.
//
// A tap on the nest (till the tins are down), a tin or him hurries it on; a tap elsewhere waits for the step to end, then cuts it short
// (things.js): the friends and the fox go home, and the next tap carries
// on from the step it stopped at (the fox comes back first, quicker); the
// tins, once brought, stay where they were set down; he stays red until he
// washes.

/* global Clock, Debug, Friends, Layout, Mole, Motion, Nest, Sound, Things */
;(() => {
  const Y = Layout.GROUND
  const S = Layout.SPRING
  const look = Debug.random('meadow-paint') // its own stream: each play's colours and patterns, so the fox's draws stay as they were
  const shuffled = (list) => Things.shuffle(list, look)
  const colours = shuffled(Layout.PAINTS) // three of the painter's colours, each play
  const TINS = [S - 255, S - 198, S - 142].map((x, i) => ({ x, colour: colours[i] }))
  const DIP = 2 // the tin he falls into: the one nearest the spring
  const PATTERNS = shuffled(['stripes', 'zigzags', 'spots'])
  // how the friends paint each other this play: the mouse in the first tin's colour (she dabs it on him
  // and the fox too), the hare in the second's; never the colour he fell into, so his spots show
  const PAINTED = { mouse: { pattern: PATTERNS[0], colour: TINS[0].colour }, hare: { pattern: PATTERNS[1], colour: TINS[1].colour } }
  const PEER_X = S - 75 // where he stands by the tins, right of them
  const BACK_X = TINS[DIP].x + 40 // backing off from the fox, he reaches the red tin's rim
  const GHOST_X = S + 150 // where he plays the ghost, towards the fox
  const FOX_FROM = PEER_X + 950 // the fox sneaks in from off to the right...
  const FOX_AT = Nest.AT.x + 240 // ...to the spring's rocks, the nest a little way off his snout (Adam, 2026-11-08: nearer, he looked to be eating the chicks)
  const SNEAK_MS = 3600 // tiptoeing in, slowly…
  const TIPTOE = 12 // …each step up high
  const CREEP = 0.8 // or creeping in this low, small steps
  const BIG = 1.15 // he comes in big…
  const LOOM = 1.32 // …rears up bigger still over the nest, paws up (PAWS_UP)…
  const SMALL = 0.68 // …and, frightened, shrinks small and hunched (HUNCH), paws to his chest (PAWS_COWER)
  const HUNCH = 0.88
  const SORRY = SMALL * 1.2 // sorry, he stands a little taller than when scared
  const PAWS_UP = 95
  const PAWS_COWER = 40
  const GHOST_MS = 1600
  const FRIENDS_CHANCE = 0.5 // after the first story, how often the fox ends up a friend rather than running
  const STACK_X = S + 40 // where the monster stands, between the tins and the fox
  const FRIENDS_FROM = FOX_FROM // the friends come from off to the right, from the painter's garden: the fox's side
  const STUCK_X = FOX_AT + 290 // where they stop, the fox in their way (the mouse; the hare beyond her), clear of his tail
  const DOOR_FAR = FOX_AT + 220 // his tunnel comes up here, between the fox and them…
  const DOOR_NEAR = TINS[0].x - 125 // …and back here, left of the tins, behind him
  const COME_MS = 2600 // the friends coming from the garden
  const IDEA_MS = 450 // the idea dawning
  const ASIDE = 110 // back up, he steps this far aside from his molehill to let them out
  const REACTS = ['jump', 'peer', 'spin'] // what the fox does as the earth bumps along under his feet: each tunnel draws two
  const QUICK = 0.45 // coming back after a cut, or again, everyone hurries
  const HARE_TALL = 150 // how high he stands on the hare's shoulders...
  const MOLE_TALL = 190 // ...and the mouse on his
  const WASH_AT = Layout.SPRING - 40
  const GRIP = 14 // a tin is held this far up its side, in the hands of whoever carries it (friends.js HANDS)…
  const STACK_Y = 50 // …the second on top of the first
  const CARRY_MS = 3200 // carrying them off at the end
  const LOADS = [['mouse', [0]], ['hare', [1, DIP]]] // who carries which tins, in the order they come to them from the left (the hare two, stacked)
  const WAIT_X = { hare: TINS[0].x - 70, mouse: TINS[0].x - 140 } // where they stand by once the tins are down, behind them

  const random = Debug.random('meadow-fox') // its own stream: how he sneaks, the ghost's act, the ending
  const tins = []
  const cast = Friends.troupe()
  const porters = Friends.troupe() // the hare and the mouse fetching the tins once the story is told: not the chain's cast
  let fox = null
  let brought = false // the tins are down (or on their way, so a cut sets them down where they were going)
  let friends = { hare: null, mouse: null }
  let red = false // he fell in the tin
  let cutShort = false // picked up after a cut: the fox comes back and it carries on at once
  let told = 0 // how many times the story has ended
  let ending = null // how the last one ended: 'ran' or 'friends'
  const creeps = random() < 0.5 // this play, the fox creeps in low (else on tiptoe)
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

  /** Off the screen to the right, or where the friends come from if that is further. */
  const offRight = () => Friends.offscreen(1, FRIENDS_FROM)

  /** One of the friends, from the painter's garden off to the right (n: how far behind). */
  const callIn = (kind, n) => cast.call(kind, offRight() + n * 90, -1)

  /** Paint on one of the friends, as this play draws it. */
  const daub = (f) => f.daub(PAINTED[f.kind].pattern, PAINTED[f.kind].colour)

  /** A tin down in the grass at its place, to be tapped. */
  function setDown(i) {
    const g = tins[i]
    document.getElementById('things').appendChild(g)
    g.style.transform = `translate(${TINS[i].x}px, ${Y + 8}px)`
    g.setAttribute('data-thing', 'paint')
  }

  /** A tin up in front of `f`, carried (k: which in the stack). */
  function pickUp(i, f, k) {
    const g = tins[i]
    g.removeAttribute('data-thing')
    f.held.appendChild(g) // in its hands: down a hole with it
    g.style.transform = `translate(${k ? 6 : -4}px, ${GRIP - k * STACK_Y}px)`
  }

  /** They have seen the fox: the hare and the mouse come from the painter's garden with his tins (a
   * plan), but the fox stands in their way. So he tunnels over to them, and back, and up they come
   * behind him out of his molehill, set the tins down and stand by. */
  async function bring(alive) {
    if (!fox) await foxComes(alive) // picked up after a cut: the fox comes back first
    if (!alive()) return
    if (brought) return // brought before a cut: the tins stand where they were set down
    brought = true
    Nest.mark(null) // the tins are the thing to tap now
    await tunnel(alive, (f) => LOADS.find(([kind]) => kind === f.kind)[1].forEach((i, k) => pickUp(i, f, k)))
    if (!alive()) return
    await Promise.all(LOADS.map(async ([kind, which]) => {
      const f = friends[kind]
      for (const i of which) {
        await f.go(TINS[i].x - 30, 600, kind === 'hare' ? 24 : 0)
        if (!alive()) return
        setDown(i)
        Sound.plink()
      }
      await f.go(WAIT_X[kind], 700, kind === 'hare' ? 36 : 0)
      if (!alive()) return
      f.turn(1) // towards the fox
    }))
    if (!alive()) return
    Mole.lookAt(TINS[1].x) // he glances back: tins?
    Sound.say('hm')
    await Promise.all([friends.hare.bob(1), friends.mouse.bob(1)]) // a nod: we have a plan
  }

  /** The hare and the mouse come from the garden (laden: what they carry) and stop: the fox is in the
   * way. He has an idea, tunnels over to them under the fox's feet (who feels it go by), comes up by
   * them, and down they all go; back under the fox, and up they come out of his molehill behind him.
   * Each time a little different: what the fox does as it bumps by, there and back; who comes up first. */
  async function tunnel(alive, laden = () => {}) {
    const [there, back] = shuffled(REACTS)
    const order = shuffled(['hare', 'mouse'])
    Debug.trace('tunnel', { there, back, first: order[0] })
    for (const [n, kind] of ['mouse', 'hare'].entries()) laden((friends[kind] = callIn(kind, n)))
    const { hare, mouse } = friends
    m().frame(STUCK_X) // them in sight with him
    try {
      await Promise.all([m().goTo(DOOR_NEAR), mouse.go(STUCK_X, pace(COME_MS)), hare.go(STUCK_X + 80, pace(COME_MS), 36)])
      if (!alive()) return
      Mole.lookAt(STUCK_X)
      await hare.no() // no way past
      if (!alive()) return
      Sound.say('hm')
      await Mole.scratchHead()
      if (!alive()) return
      Sound.say('tam') // an idea!
      await Clock.wait(IDEA_MS)
      if (!alive()) return
      await Promise.all([m().digTo(DOOR_FAR), feels(there, alive)])
      if (!alive()) return
      await Promise.all([hare.bob(1), mouse.bob(1)]) // there he is!
      if (!alive()) return
      await underAndBack(alive, order, back)
    } finally {
      if (alive()) m().frame(null) // cut short, restore() let it go: what runs next may frame its own
    }
  }

  /** Down he goes, and they after him in turn; back under the fox, and up they come behind him. */
  async function underAndBack(alive, order, back) {
    Sound.dig()
    await Mole.goDown()
    for (const kind of order) { // in after him
      if (!alive()) return
      const f = friends[kind]
      await f.go(DOOR_FAR, 500, kind === 'hare' ? 24 : 0)
      if (!alive()) return
      await f.rise(false)
      f.turn(1)
      f.place(DOOR_NEAR) // along the tunnel, out of sight
    }
    if (!alive()) return
    await Promise.all([Mole.tunnelTo(DOOR_NEAR), feels(back, alive)])
    if (!alive()) return
    Sound.pop()
    await Mole.comeUp('hill')
    if (!alive()) return
    await m().goTo(DOOR_NEAR - ASIDE) // out, and aside, to see them up
    if (!alive()) return
    Mole.lookAt(DOOR_NEAR)
    for (const kind of order) { // up they come after him
      if (!alive()) return
      Sound.squeak()
      await friends[kind].rise(true)
    }
  }

  /** The fox, as the bump of the tunnel goes by under his feet: a jump, a puzzled look down, or a spin round. */
  async function feels(how, alive) {
    // the bump on its way, then past him (or the tunnel done: it went by between two looks)
    while (alive() && Mole.burrowX() === null) await Clock.wait(40)
    const dir = Math.sign(FOX_AT - Mole.burrowX())
    while (alive() && Mole.burrowX() !== null && (FOX_AT - Mole.burrowX()) * dir > 0) await Clock.wait(40)
    if (!alive() || !fox) return
    Debug.trace('fox feels', { how })
    fox.feel('shock')
    if (how === 'jump') await fox.go(FOX_AT, 320, 50)
    else if (how === 'peer') await fox.bob(2) // down at the ground: what was that?
    else {
      fox.turn(1) // round: who's there?
      await Clock.wait(500)
      fox.turn(-1)
    }
    fox.feel('sly')
  }

  /** Every tin not down yet set down at its place (a cut while they were carried: they stay). */
  function setAllDown() {
    tins.forEach((g, i) => { if (g.parentNode !== document.getElementById('things')) setDown(i) })
  }

  /** It begins: a sly snicker from off the meadow's edge; the nest is the thing to tap till the tins are down. */
  function appear() {
    TINS.forEach((t) => {
      const g = el('g', { class: 'thing tin' })
      g.appendChild(drawTin(t.colour))
      tins.push(g)
    })
    Sound.snicker()
    Nest.mark('paint')
  }

  const pace = (ms) => (cutShort || told ? ms * QUICK : ms) // after a cut, or told again, everyone hurries

  /** Paint splashes round x, y. */
  function splash(x, y, colour) {
    const layer = document.getElementById('drops')
    for (let i = 0; i < 9; i++) {
      const d = el('circle', { r: 6 + (i % 3) * 3, fill: colour, stroke: '#15140f', 'stroke-width': 1.5 }, layer)
      const a = (i / 9) * Math.PI * 2
      Motion.endAt(d, [{ transform: `translate(${x}px, ${y}px)` }, { transform: `translate(${x + Math.cos(a) * 90}px, ${y + Math.sin(a) * 50 - 40}px)`, opacity: 0 }], { duration: 650, easing: 'ease-out' }).then(() => d.remove(), () => d.remove())
    }
  }

  // ------------------------------------------------------------ the fox

  /** Frightened: shocked, a jump and a yelp, then small and hunched, his ruff on end. */
  async function foxScared(alive) {
    fox.feel('shock')
    Sound.yelp()
    await fox.go(FOX_AT, 300, 60) // a jump of fright
    if (!alive()) return
    fox.feel('scared')
    fox.bristle(true)
    await Promise.all([fox.grow(SMALL, 600, HUNCH), fox.paws(PAWS_COWER, 400)])
  }

  /** Off he runs, back the way he came; the chicks settle. */
  async function foxRuns(alive) {
    fox.turn(1)
    await fox.go(FOX_FROM + 60, 900)
    if (!alive()) return
    cast.dismiss(fox)
    fox = null
    Nest.fear(false)
    ending = 'ran'
  }

  /** Found out, he is sorry: eyes down, a bow, paws together. The mouse dabs spots on him, he laughs,
   * and off he goes with the hare and the mouse, friends. */
  async function foxSorry(alive) {
    fox.bristle(false)
    fox.feel('sorry')
    Nest.fear(false) // no danger now
    await Promise.all([fox.grow(SORRY, 700), fox.paws(0, 500)])
    if (!alive()) return
    await fox.bob(2) // a bow
    if (!alive()) return
    await fox.rub(1)
    if (!alive()) return
    Sound.say('hm')
    await Mole.lean(10, 600)
    if (!alive()) return
    const { mouse } = friends
    await mouse.go(FOX_AT - 50, 1000)
    if (!alive()) return
    Sound.swish()
    fox.daub('spots', PAINTED.mouse.colour)
    await mouse.bob(1)
    if (!alive()) return
    fox.feel('laugh')
    Sound.say('giggle')
    await Mole.cheer()
    if (!alive()) return
    ending = 'friends'
    Debug.trace('fox befriended')
  }

  /** The fox sneaks in for the nest, his shadow first: snickering and rubbing his paws, licking his lips,
   * then rearing up over it with a growl. The mole gasps, points, and gets a fright. */
  async function foxComes(alive) {
    Nest.fear(true) // the chicks see him coming
    if (!fox) {
      fox = cast.call('fox', Friends.offscreen(1, FOX_FROM), -1)
      fox.grow(BIG, 0, creeps ? CREEP : 1)
      await fox.go(FOX_AT, pace(creeps ? SNEAK_MS * 1.2 : SNEAK_MS), creeps ? 4 : TIPTOE)
      if (!alive()) return
      await fox.grow(BIG, 300)
      if (!alive()) return
    }
    if (cutShort) return // picked up after a cut: he is back, and it carries on at once
    fox.feel('laugh')
    Sound.snicker()
    await fox.rub(3)
    if (!alive()) return
    fox.feel('sly')
    if (!told) await fox.lick() // the first time: told again, he gets on with it
    if (!alive()) return
    Sound.say('tam')
    await Mole.point(fox.x)
    if (!alive()) return
    fox.feel('snarl')
    Sound.growl()
    await Promise.all([fox.grow(LOOM, 500), fox.paws(PAWS_UP, 400)])
    if (!alive()) return
    Sound.say('fright')
    await Mole.handsToFace(600, 'fright')
    if (!alive()) return
    await Promise.all([fox.grow(BIG, 600), fox.paws(0, 500)])
    fox.feel('sly')
  }

  // ------------------------------------------------------------ the chain

  /** He hurries over towards the spring, and the fox comes sneaking in for the nest. */
  async function seen(alive) {
    await m().goTo(PEER_X)
    if (!alive()) return
    Mole.lookAt(Nest.AT.x)
    Sound.say('ooh')
    await foxComes(alive)
  }

  /** Frightened, he backs away from the fox into the red tin, and topples in head first: out he comes, all red. */
  async function tumble(alive) {
    if (!fox) await foxComes(alive) // picked up after a cut: the fox comes back first
    if (!alive() || red) return
    if (!brought) await bring(alive) // never brought (bring cut before it began): they come now
    if (!alive()) return
    await m().goTo(PEER_X)
    if (!alive()) return
    Mole.lookAt(FOX_AT)
    await Mole.glide(BACK_X, pace(900), 0) // backing off, still facing him
    if (!alive()) return
    const t = TINS[DIP]
    Sound.splash()
    Sound.say('fright')
    splash(t.x, Y - 60, t.colour)
    Mole.paint(t.colour)
    red = true
    Debug.trace('red')
    await Mole.lean(-50, 700)
    if (!alive()) return
    Sound.say('ooh') // he looks himself over: all red
    await Mole.lean(12, 700)
  }

  /** All red, he plays a ghost at the fox. The first time the fox jumps, then peers closer and laughs. */
  async function ghost(alive) {
    if (!fox) await foxComes(alive)
    if (!alive()) return
    await m().goTo(GHOST_X)
    if (!alive()) return
    Sound.say('ghost')
    await Mole.ghost(GHOST_MS, random() < 0.5)
    if (!alive()) return
    fox.feel('shock')
    await fox.go(FOX_AT, 300, 30)
    if (!alive()) return
    fox.feel('sly')
    await fox.bob(1) // a closer look…
    if (!alive()) return
    fox.feel('laugh') // …only the mole
    Sound.snicker()
    await fox.rub(2)
    if (!alive()) return
    fox.feel('sly')
    Sound.say('achJo')
  }

  /** The hare and the mouse come with brushes and paint each other, and him. */
  async function friendsPaint(alive) {
    if (!fox) await foxComes(alive)
    if (!alive()) return
    if (!friends.hare) await tunnel(alive) // standing by since they brought the tins; after a cut, he fetches them again
    if (!alive()) return
    await Promise.all([m().goTo(STACK_X), friends.hare.go(STACK_X - 130, pace(1800), 36), friends.mouse.go(STACK_X - 210, pace(1800))])
    if (!alive()) return
    friends.hare.turn(1) // towards the fox
    friends.mouse.turn(1)
    Sound.swish()
    await friends.hare.bob(2)
    if (!alive()) return
    daub(friends.mouse)
    Sound.swish()
    await friends.mouse.bob(2)
    if (!alive()) return
    daub(friends.hare)
    Sound.swish()
    Mole.dots(PAINTED.mouse.colour)
    Sound.say('giggle')
  }

  /** Up on each other's shoulders: a big striped spotted monster. The fox shrinks, yelps and runs. */
  async function monster(alive) {
    // picked up after a cut: the fox and the friends went home, so they come again first
    if (!fox) await foxComes(alive)
    if (!alive()) return
    if (!friends.hare) await friendsPaint(alive)
    if (!alive()) return
    const { hare, mouse } = friends
    cutShort = false
    await Promise.all([m().goTo(STACK_X), hare.go(STACK_X, 900, 30), mouse.go(STACK_X - 10, 900)])
    if (!alive()) return
    await Mole.perch(HARE_TALL, 600)
    if (!alive()) return
    await mouse.lift(HARE_TALL + MOLE_TALL, 600)
    if (!alive()) return
    Sound.boo()
    await Mole.cheer()
    if (!alive()) return
    await foxScared(alive)
    if (!alive()) return
    await foxRuns(alive)
    if (!alive()) return
    Sound.say('giggle')
    await Promise.all([mouse.lift(0, 500), Mole.perch(0, 500)])
  }

  /** His friends wave and go (the fox with them, if he is a friend now); he jumps in the spring and comes out clean. */
  async function wash(alive) {
    const pack = [friends.hare, friends.mouse, fox].filter(Boolean)
    for (const f of pack) f.turn(-1) // to him
    await Promise.all(pack.map((f) => f.glad(f.bob(2))))
    if (!alive()) return
    for (const f of pack) f.turn(1) // home, the painter's garden's way
    await Promise.all([...pack.map((f, i) => f.go(offRight() + i * 60, 3600, f.kind === 'hare' ? 36 : 0)), m().goTo(WASH_AT)])
    if (!alive()) return
    for (const f of pack) cast.dismiss(f)
    friends = { hare: null, mouse: null }
    fox = null
    await Mole.lean(-30, 600)
    if (!alive()) return
    Sound.splash()
    splash(Mole.state.x - 40, Y - 30, '#7fb3ea')
    Mole.paint(null)
    red = false
    cutShort = false
    told++
    Debug.trace('washed', { told, ending })
    if (ending === 'friends') fetchTins() // the story is told
    Sound.say('giggle')
    await Mole.cheer()
  }

  /** The tins tapped again: the story again, quicker. The hare and the mouse come painted and play ghost
   * with him: the fox shrinks. Then he runs, or, as chance has it, is sorry and becomes a friend. */
  async function retold(alive) {
    if (!tins.some((g) => g.hasAttribute('data-thing'))) return // told: the tins are being carried off
    // the fox already a friend (a cut came after): only the wash and the tins are left
    if (ending !== 'friends') await retell(alive)
    if (!alive()) return
    await wash(alive)
  }

  /** The story again, up to how it ends: the fox runs, or is sorry. */
  async function retell(alive) {
    if (!fox) {
      m().music('hush')
      await foxComes(alive)
    }
    if (!alive()) return
    await tumble(alive)
    if (!alive()) return
    if (!friends.hare) await tunnel(alive, daub) // they come painted: he fetches them through his tunnel
    if (!alive()) return
    await Promise.all([m().goTo(GHOST_X), friends.hare.go(GHOST_X - 110, pace(3600), 36), friends.mouse.go(GHOST_X - 190, pace(3600))])
    if (!alive()) return
    friends.hare.turn(1) // round on the fox
    friends.mouse.turn(1)
    Sound.say('ghost')
    Sound.boo()
    await Promise.all([Mole.ghost(GHOST_MS, random() < 0.5), friends.hare.bob(2), friends.mouse.bob(2)])
    if (!alive()) return
    await foxScared(alive)
    if (!alive()) return
    m().music('happy')
    if (random() < FRIENDS_CHANCE) await foxSorry(alive)
    else await foxRuns(alive)
  }

  /** The hare and the mouse come back for the tins and carry them home to the painter's garden, leaving the grass free. */
  async function fetchTins() {
    for (const g of tins) g.removeAttribute('data-thing') // done with: not to be tapped
    const from = offRight()
    try {
      await Promise.all(LOADS.map(async ([kind, which], n) => {
        const f = porters.call(kind, from + n * 90, -1)
        for (const [k, i] of [...which].reverse().entries()) { // from the right: the nearest first
          await f.go(TINS[i].x + 30, k ? 500 : CARRY_MS)
          pickUp(i, f, k)
        }
        f.turn(1)
      }))
    } catch {
      // bedtime came first: everyone home at once, tins and all
    }
    porters.dismissAll(false, 1) // off the screen the way they came, tins and all
  }

  /** Cut short: the fox and the friends go home (they'll come again, quicker); he stays as painted as he is. */
  function restore() {
    if (brought) setAllDown() // carried in when the cut came: down where they were going
    cast.dismissAll() // home on their own feet (friends.js leave)
    m().frame(null)
    fox = null
    Nest.fear(false)
    friends = { hare: null, mouse: null }
    cutShort = true
  }

  /** Bedtime: everyone home, and he goes to bed washed. */
  function night() {
    restore()
    cast.dismissAll(true) // bedtime, under the closing circle: home at once
    porters.dismissAll(true)
    Nest.mark(null)
    Mole.paint(null)
    red = false
  }

  Things.add({
    name: 'paint',
    offer: 'helped',
    urgent: true, // a threat won't wait for a tap: he goes to see at once, as for the bulldozer (things.js)
    engageMs: 3000, // when it can't break off his play (still waking), he goes to see soon
    trouble: [0, 5], // from the chicks' alarm and the fox's coming till the monster sends it off: the bed uneasy (things.js)
    music: { 0: 'fox' }, // the fox: his sly motif (Music MOTIFS), then the effects lead; the monster sends it off (happy as the trouble lifts: things.js)
    appear,
    steps: [seen, bring, tumble, ghost, friendsPaint, monster, wash],
    again: retold,
    restore,
    night,
    detail: () => ({ red, painted: Mole.state.painted, fox: !!fox, cast: cast.kinds(), told, ending, creeps, tins: TINS.map((t) => t.colour), patterns: { ...PAINTED } }),
  })
})()
