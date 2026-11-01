// The paint and the fox (someone helps him), after Krtek malířem, told as a
// story that grows each time the tins are tapped again (Adam, 2026-11-01).
// The hare and the mouse carry three paint tins in and set them down in the
// open grass between his flowers and the spring, and go off. He comes to
// them, curious, and knocks on the red one. Then the fox: first his long
// shadow slides in, then he comes sneaking in from the edge of the meadow,
// big, for the bullfinch's nest on the spring's rocks (nest.js; in the film
// he raids a nest), while the chicks huddle up trembling and peeping the
// alarm. He snickers, rubbing his paws, licks his lips; the mole gasps and
// points (tam!), and the fox rears up over the nest, bigger still, paws up,
// teeth bared, and growls. The mole gets a fright, backs away, and tumbles
// into the red tin: out he comes, all red (as the film: the fox first, the
// paint by accident). All red, he has an idea: a ghost, arms up, "uuuu!".
// The first time the fox jumps, then peers closer and laughs: he sees
// through it. Along come the hare and the mouse with brushes: they paint
// each other (tiger stripes, spots) and dab spots on him, and the three
// climb onto each other's shoulders, a big striped spotted monster with its
// arms up; the fox, shocked, shrinks small and hunched, his ruff on end,
// yelps and runs (the surprise, as the stacked monster in the film), and
// the chicks settle. His friends wave and go, and he jumps in the spring to
// wash the paint off. The tins stay.
//
// The tins tapped again, the story again, warier and quicker (again): the
// fox sneaks back, the mole tumbles in again, and this time the hare and
// the mouse come painted at once and play ghost with him: that does it.
// Then, as chance has it, the fox runs, or (FRIENDS_CHANCE), small and found
// out, he is sorry: ears down, eyes on the ground, a bow. The mouse dabs
// spots on him too, he laughs, and he goes off with the hare and the mouse,
// all friends (the film's ending turned round: Adam's idea). Then the story
// is told: the hare and the mouse come back for the tins and carry them off
// (nothing falls from the sky or vanishes: Adam, 2026-10-23). Each play
// draws how the fox sneaks in (on tiptoe, or creeping low) and how the
// ghost acts (swaying, or bobbing). If bedtime comes first, he goes to bed
// washed.
//
// A tap on a tin or on him hurries it on; a tap elsewhere waits for the step to end, then cuts it short
// (things.js): the friends and the fox go home, and the next tap carries
// on from the step it stopped at (the fox comes back first, quicker); he
// stays red until he washes.

/* global Debug, Friends, Layout, Mole, Motion, Nest, Sound, Things */
;(() => {
  const Y = Layout.GROUND
  const S = Layout.SPRING
  const TINS = [{ x: S - 255, colour: '#3a67ad' }, { x: S - 198, colour: '#f2c94c' }, { x: S - 142, colour: '#d8322b' }]
  const RED = 2 // the tin he falls into: the one nearest the spring
  const PEER_X = S - 75 // where he stands by the tins, right of them
  const BACK_X = TINS[RED].x + 40 // backing off from the fox, he reaches the red tin's rim
  const GHOST_X = S + 150 // where he plays the ghost, towards the fox
  const FOX_FROM = PEER_X + 950 // the fox sneaks in from off to the right...
  const FOX_AT = Nest.AT.x + 110 // ...to the spring's rocks, the nest beside his head: under it, his head hid it
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
  const FRIENDS_FROM = STACK_X - 950 // the friends come from off to the left, from his molehill's side
  const QUICK = 0.45 // coming back after a cut, or again, everyone hurries
  const HARE_TALL = 150 // how high he stands on the hare's shoulders...
  const MOLE_TALL = 190 // ...and the mouse on his
  const WASH_AT = Layout.SPRING - 40
  const CARRY_Y = 66 // a tin is carried this high, in front of whoever carries it…
  const STACK_Y = 50 // …the second on top of the first
  const CARRY_MS = 3200 // bringing them in, or carrying them off
  const LOADS = [['mouse', [0]], ['hare', [RED, 1]]] // who carries which tins (the hare two, stacked)

  const random = Debug.random('meadow-fox') // its own stream: how he sneaks, the ghost's act, the ending
  const tins = []
  const cast = Friends.troupe()
  const porters = Friends.troupe() // the hare and the mouse bringing the tins and fetching them: not the chain's cast
  let fox = null
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

  /** Off the screen to the left, or where the friends come from if that is further. */
  const offLeft = () => Friends.offscreen(-1, FRIENDS_FROM)

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
    f.g.appendChild(g)
    g.style.transform = `translate(${k ? 6 : -4}px, ${-CARRY_Y - k * STACK_Y}px)`
  }

  /** The hare and the mouse carry the tins in, set each down at its place, and go off. */
  async function bring() {
    const from = offLeft()
    try {
      await Promise.all(LOADS.map(async ([kind, which], n) => {
        const f = porters.call(kind, from - n * 90, 1)
        which.forEach((i, k) => pickUp(i, f, k))
        for (const i of which) {
          await f.go(TINS[i].x - 30, which[0] === i ? CARRY_MS : 500)
          setDown(i)
          Sound.plink()
        }
      }))
    } catch {
      // bedtime came first (porters gone at once): the tins stand at their places all the same
    } finally {
      tins.forEach((g, i) => { if (g.parentNode !== document.getElementById('things')) setDown(i) }) // any still carried
      porters.dismissAll(false, -1) // off they go, back the way they came (for brushes, it turns out)
    }
  }

  function appear() {
    TINS.forEach((t) => {
      const g = el('g', { class: 'thing tin' })
      g.appendChild(drawTin(t.colour))
      tins.push(g)
    })
    bring()
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
    fox.daub('spots', '#f2c94c')
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
    await Mole.handsToFace(600)
    if (!alive()) return
    await Promise.all([fox.grow(BIG, 600), fox.paws(0, 500)])
    fox.feel('sly')
  }

  // ------------------------------------------------------------ the chain

  /** He comes to the tins, curious, and knocks on the red one. */
  async function curious(alive) {
    await m().goTo(PEER_X)
    if (!alive()) return
    Sound.say('hm')
    Sound.knock()
    await Mole.knock()
  }

  /** Frightened, he backs away from the fox into the red tin, and topples in head first: out he comes, all red. */
  async function tumble(alive) {
    if (!fox) await foxComes(alive) // picked up after a cut: the fox comes back first
    if (!alive() || red) return
    await m().goTo(PEER_X)
    if (!alive()) return
    Mole.lookAt(FOX_AT)
    await Mole.glide(BACK_X, pace(900), 0) // backing off, still facing him
    if (!alive()) return
    const t = TINS[RED]
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
    await m().goTo(STACK_X)
    if (!alive()) return
    friends.hare = cast.call('hare', offLeft(), 1)
    friends.mouse = cast.call('mouse', offLeft() - 90, 1)
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
    for (const f of pack) f.turn(-1)
    await Promise.all(pack.map((f) => f.bob(2)))
    if (!alive()) return
    await Promise.all([...pack.map((f, i) => f.go(FRIENDS_FROM - i * 60, 3600, f.kind === 'hare' ? 36 : 0)), m().goTo(WASH_AT)])
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
    if (!friends.hare) {
      friends.hare = cast.call('hare', offLeft(), 1)
      friends.mouse = cast.call('mouse', offLeft() - 90, 1)
      friends.hare.daub('stripes', '#15140f')
      friends.mouse.daub('spots', '#f2c94c')
    }
    await Promise.all([m().goTo(GHOST_X), friends.hare.go(GHOST_X - 110, pace(3600), 36), friends.mouse.go(GHOST_X - 190, pace(3600))])
    if (!alive()) return
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

  /** The hare and the mouse come back for the tins and carry them off, leaving the grass free. */
  async function fetchTins() {
    for (const g of tins) g.removeAttribute('data-thing') // done with: not to be tapped
    const from = offLeft()
    try {
      await Promise.all(LOADS.map(async ([kind, which], n) => {
        const f = porters.call(kind, from - n * 90, 1)
        for (const [k, i] of [...which].reverse().entries()) {
          await f.go(TINS[i].x - 30, k ? 500 : CARRY_MS)
          pickUp(i, f, which.length - 1 - k)
        }
        f.turn(-1)
      }))
    } catch {
      // bedtime came first: everyone home at once, tins and all
    }
    porters.dismissAll(false, -1) // off the screen the way they came, tins and all
  }

  /** Cut short: the fox and the friends go home (they'll come again, quicker); he stays as painted as he is. */
  function restore() {
    cast.dismissAll() // home on their own feet (friends.js leave)
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
    Mole.paint(null)
    red = false
  }

  Things.add({
    name: 'paint',
    offer: 'helped',
    music: { 1: 'fox', 5: 'happy' }, // the fox: his sly motif (Music MOTIFS), then the effects lead; the monster sends it off
    appear,
    steps: [curious, foxComes, tumble, ghost, friendsPaint, monster, wash],
    again: retold,
    restore,
    night,
    detail: () => ({ red, painted: Mole.state.painted, fox: !!fox, cast: cast.kinds(), told, ending, creeps }),
  })
})()
