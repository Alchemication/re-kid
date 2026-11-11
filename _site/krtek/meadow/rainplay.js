// What the mole does with autumn's rain (Adam, 2026-11-10: his ideas, the
// designs mine; showers.js brings the rain, storm.js draws it). Not the
// storm's (umbrella.js has its own story then).
// - A leaf for an umbrella: a tap on him in the rain and he hunches, hands
//   over his head, as the drops come down; a big chestnut leaf comes
//   see-sawing down on the breeze and lands on his head, and he peeks up at
//   it, pleased. Taps after, while it rains: he tips it and the water runs
//   off on to his nose (a sneeze), or twirls it, drops flying. In a downpour
//   it fills, and after a while tips its water down his back (the laugh).
//   When the rain is over he takes it off, and it lies in the grass.
// - Puddles: while it rains, puddles fill on free ground (a small one in a
//   drizzle, two in a shower or a downpour), and dry away after. A tap on
//   one: he goes and stomps in it, a different way each time (a hop, a
//   careful toe and then a hop, a big jump that soaks him), and each stomp
//   splashes some of it out, until at the last there is none, and he looks
//   down for it, puzzled.
// - The chestnut drips: for a while after the rain, a tap on the tree has
//   him pat its trunk, and its drops come pattering down on him (under his
//   leaf, they patter on it, and he stays dry: proud).
// - Now and then a rainbow after it: always after a downpour, sometimes
//   after a shower.
//
// Moves only on the Clock (Motion.endAt); draws from its own streams. A cut:
// restore() (falling drops and a falling leaf land on the grass).

/* global AfterRain, Clock, Debug, Layout, Mole, Motion, Sound, Storm, View */
/* exported RainPlay */
const RainPlay = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const Y = Layout.GROUND
  const TICK_MS = 250
  const PUDDLES = [{ x: 1960, w: 170 }, { x: 1460, w: 130 }] // on free ground: between the wild flowers and the spring; between his flower bed and the wild flowers (the storm's umbrella stands there, but not on a shower's play)
  const FULL = { drizzle: [0.5, 0], shower: [0.85, 0.6], downpour: [1, 1] } // how full each gets by the rain's end, by how hard it rained
  const FILL_MS = 25000 // it fills to that over this much rain
  const DRY_MS = 120000 // after the rain, a full one dries away over this long
  const SPLASH_OUT = 0.35 // each stomp splashes this much (of full) out
  const LEAF = { half: 78, high: 46, lobes: 5 } // the leaf over his head, seen side-on as a drooping canopy (his own units): wider than his head, so it reads as an umbrella
  const LEAF_TONES = [['#d9a13a', '#8a5a1e'], ['#c9782e', '#7a4318'], ['#b8a03a', '#6a5a1e']] // gold, rust or olive, with its veins' colour
  const LEAF_FALL_MS = 2200
  const TIP_AFTER_MS = [8000, 12000] // a downpour fills his leaf, and tips it down his back after this long
  const DRIP_MS = 60000 // after the rain the chestnut drips this long
  const DRIP_AT = Layout.OAK.x + 150 // where he pats its trunk: under its right limb, clear of the swing's ropes (swing.js X ± 30)
  const DRIPS = 40
  const RAINBOW = { downpour: 1, shower: 0.25, drizzle: 0 } // the chance of a rainbow after it
  const random = Debug.random('meadow-rainplay') // which way, where the leaf comes from, a rainbow or not
  const spray = Debug.random('meadow-rainplay-drops') // where each drop goes: its own, so nothing else shifts

  let things = null // #things: the puddles, behind him
  let front = null // #oak-front: drips and the falling leaf, in front of him
  let sky = null // #far-things: the rainbow
  let ground = null // #oak-ground: the leaf he takes off lies here
  let meadow = null // goTo, rounds, run, free
  const puddles = []
  let nextStomp = null
  let nextUnder = null
  let leaf = null // the leaf on his head
  let falling = new Set() // drops and a leaf in the air: landed on the grass at a cut
  let rained = null // the kind it last rained, while it is still raining (or the shower's clouds still in)
  let dripsUntil = 0
  let dripped = false // the chestnut's drops shaken down on him this time
  let tipAt = Infinity
  let tipped = false

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const between = ([a, b], r) => a + r * (b - a)
  const showering = () => Storm.phase === 'raining' && Storm.kind !== 'storm'

  // ------------------------------------------------------------ drawing

  function drawPuddle({ x, w }, i) {
    const g = el('g', { class: 'puddle', 'data-puddle': i, display: 'none' }, things)
    const water = el('g', {}, g)
    el('ellipse', { cx: 0, cy: 0, rx: w / 2, ry: w * 0.11, fill: '#7d93b8', stroke: '#4d607f', 'stroke-width': 2 }, water)
    el('ellipse', { cx: -w * 0.08, cy: -w * 0.02, rx: w * 0.3, ry: w * 0.05, fill: '#b9cbe6', opacity: 0.8 }, water) // the sky in it
    el('ellipse', { class: 'puddle-hit', 'data-puddle': i, cx: 0, cy: -10, rx: w / 2 + 30, ry: 40, fill: 'transparent' }, g) // small fingers
    g.setAttribute('transform', `translate(${x} ${Y + 6})`)
    return { x, w, fill: 0, g, water }
  }

  function showPuddle(p) {
    p.g.setAttribute('display', p.fill > 0.02 ? 'inline' : 'none')
    if (p.fill > 0.02) p.water.setAttribute('transform', `scale(${(0.35 + 0.65 * p.fill).toFixed(3)} ${(0.5 + 0.5 * p.fill).toFixed(3)})`)
  }

  /** A big leaf seen side-on, drooping over 0,0 (his head): a little umbrella, gold, rust or olive. */
  function bigLeaf() {
    const { half, high, lobes } = LEAF
    const [fill, vein] = LEAF_TONES[Math.floor(random() * LEAF_TONES.length)]
    const g = el('g', { class: 'rain-leaf' })
    let d = `M${-half} 4 Q${-half * 0.8} ${-high} 0 ${-high} Q${half * 0.8} ${-high} ${half} 4` // its top, arched over him
    for (let k = lobes; k > 0; k--) { // its edge, scalloped where the leaflets hang down
      const x0 = -half + (2 * half * k) / lobes
      const x1 = -half + (2 * half * (k - 1)) / lobes
      d += ` Q${(x0 + x1) / 2} ${18 - Math.abs(k - (lobes + 1) / 2) * 3} ${x1} 4`
    }
    el('path', { d: `${d} Z`, fill, stroke: '#4a2f12', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, g)
    for (let k = 1; k < lobes; k++) el('path', { d: `M0 ${-high + 4} Q${(-half + (2 * half * k) / lobes) * 0.6} ${-high * 0.4} ${-half + (2 * half * k) / lobes} 6`, stroke: vein, 'stroke-width': 1.4, fill: 'none' }, g)
    el('path', { d: `M0 ${-high} q-4 -14 6 -22`, stroke: '#4a2f12', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, g) // its stalk
    return g
  }

  // ------------------------------------------------------------ the weather, a tick at a time

  function tick() {
    if (leaf && !leaf.isConnected) leaf = null // something else put on his head took its place
    const kind = showering() ? Storm.kind : null
    if (kind) raining(kind)
    else drying()
    for (const p of puddles) showPuddle(p)
  }

  /** While it rains: the puddles fill; in a downpour, his leaf fills and tips. */
  function raining(kind) {
    rained = kind
    FULL[kind].forEach((full, i) => {
      if (full > puddles[i].fill) puddles[i].fill = Math.min(full, puddles[i].fill + (full * TICK_MS) / FILL_MS)
    })
    if (leaf && kind === 'downpour' && tipAt === Infinity && !tipped) tipAt = Clock.now() + between(TIP_AFTER_MS, random())
    if (Clock.now() >= tipAt && meadow.free()) {
      tipAt = Infinity
      tipped = true
      meadow.run('leaf tips', tipDown)
    }
  }

  /** Not raining: just over, the drips and the rainbow; the puddles dry; once the clouds are gone, the leaf off. */
  function drying() {
    if (rained) over(rained)
    for (const p of puddles) p.fill = Math.max(0, p.fill - TICK_MS / DRY_MS)
    if (leaf && !Storm.phase && meadow.free()) meadow.run('leaf off', takeOff)
  }

  /** The rain is over: the chestnut drips a while, and now and then a rainbow. */
  function over(kind) {
    rained = null
    dripsUntil = Clock.now() + DRIP_MS
    dripped = false
    tipAt = Infinity
    tipped = false
    const bow = random() < RAINBOW[kind] // drawn either way
    Debug.trace('rain over', { how: kind, rainbow: bow })
    if (bow) AfterRain.rainbow(sky, View.x + 800)
  }

  // ------------------------------------------------------------ the leaf

  /** A tap on him in the rain: the leaf comes to him, or, with it on, a way of his under it (rounds). */
  async function tapHim(alive) {
    if (!leaf) return catchLeaf(alive)
    const how = nextUnder()
    Debug.trace('under the leaf', { how })
    if (how === 'tip') {
      Mole.lean(-14, 900)
      await Clock.wait(450)
      AfterRain.shake(Mole.state.x - 20, Y - 150, 6, 50)
      Sound.water(0.4)
      await Clock.wait(350)
      if (!alive()) return
      Sound.sneeze()
      Mole.feel('squeezed', 700)
      await Mole.hop(14, 300)
      if (!alive()) return
      Sound.say('giggle', true)
      await Mole.handsToFace(500)
    } else {
      Sound.swish()
      AfterRain.shake(Mole.state.x, Y - 170, 12, 140)
      await Motion.endAt(leaf, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-25deg)', offset: 0.25 }, { transform: 'rotate(25deg)', offset: 0.6 }, { transform: 'rotate(0deg)' }], { duration: 900 })
      if (!alive()) return
      Sound.say('giggle', true)
      await Mole.cheer()
    }
  }

  /** Hands over his head as the drops come; a leaf see-saws down on to it; he peeks up at it, pleased. */
  async function catchLeaf(alive) {
    if (Mole.state.pose !== 'out') await meadow.goTo(Mole.state.x)
    if (!alive()) return
    Mole.show('front')
    Mole.feel('squeezed', 1600)
    Debug.trace('rain leaf', { comes: true })
    await Mole.shakeOff(700)
    if (!alive()) return
    const node = bigLeaf()
    const { x, y } = Mole.head()
    const from = random() < 0.5 ? -1 : 1
    const g = el('g', {}, front)
    g.appendChild(node)
    falling.add(g)
    await Debug.ignoreCut(Motion.endAt(g, [
      { transform: `translate(${x + from * 260}px, ${y - 260}px) rotate(${from * 30}deg) scale(${Mole.SCALE})` },
      { transform: `translate(${x - from * 90}px, ${y - 160}px) rotate(${-from * 25}deg) scale(${Mole.SCALE})`, offset: 0.4 },
      { transform: `translate(${x + from * 50}px, ${y - 70}px) rotate(${from * 15}deg) scale(${Mole.SCALE})`, offset: 0.75 },
      { transform: `translate(${x}px, ${y}px) rotate(0deg) scale(${Mole.SCALE})` },
    ], { duration: LEAF_FALL_MS, easing: 'ease-in-out' }), 'a leaf on the breeze')
    if (!falling.has(g)) return // a cut let it fall to the grass
    falling.delete(g)
    g.remove()
    if (!alive() || Mole.wearing()) return lie(node, x)
    node.removeAttribute('transform')
    leaf = node
    Mole.wear(leaf)
    Sound.say('ooh', true)
    Mole.perk(1.2)
    await Mole.lean(-8, 700) // a peek up at it
    if (!alive()) return
    Sound.say('giggle', true)
    await Mole.handsToFace(600)
  }

  /** A downpour: his leaf fills and tips its water down his back; a start, a shiver, and a laugh. */
  async function tipDown(alive) {
    if (!leaf) return
    Debug.trace('under the leaf', { how: 'down his back' })
    Mole.show('three')
    await Motion.endAt(leaf, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(28deg)', offset: 0.5 }, { transform: 'rotate(0deg)' }], { duration: 900 })
    Sound.water(0.6)
    AfterRain.shake(Mole.state.x + 40, Y - 120, 8, 40)
    if (!alive()) return
    Sound.say('gasp')
    Mole.feel('squeezed', 1200)
    await Mole.shakeOff(900)
    if (!alive()) return
    Sound.say('giggle', true)
    await Mole.handsToFace(700)
  }

  /** The rain over: he takes the leaf off, and it lies in the grass by him. */
  async function takeOff(alive) {
    if (!leaf) return
    const node = Mole.wear(null)
    leaf = null
    Mole.show('front')
    lie(node, Mole.state.x + 50)
    if (!alive()) return
    await Mole.cheer()
  }

  /** The leaf lying in the grass at x. */
  function lie(node, x) {
    const g = el('g', { class: 'rain-leaf-lying', transform: `translate(${x} ${Y + 8}) scale(${Mole.SCALE}) scale(1 0.45)` }, ground)
    node.removeAttribute('transform')
    g.appendChild(node)
  }

  // ------------------------------------------------------------ the puddles

  /** A tap on puddle i: he goes and stomps in it (rounds); it splashes out, until it is gone. */
  async function stomp(i, alive) {
    const p = puddles[i]
    if (!p || p.fill <= 0.02) return
    await meadow.goTo(p.x)
    if (!alive() || p.fill <= 0.02) return
    const how = nextStomp()
    Debug.trace('puddle', { how, i })
    Mole.show('front')
    if (how === 'toe') {
      await Mole.lean(10, 600)
      Sound.say('ooh', true)
      await Mole.shakeOff(500)
      if (!alive()) return
    }
    const big = how === 'big'
    if (!(await splash(p, big, alive))) return
    if (p.fill <= 0.02) return gone(i, alive)
    Sound.say('giggle', true)
    await (big ? Mole.handsToFace(700) : Mole.cheer())
  }

  /** Into the puddle he hops (big: a jump, and it soaks him), and some of it splashes out: still his to carry on? */
  async function splash(p, big, alive) {
    await Mole.hop(big ? 90 : 40, big ? 800 : 480)
    if (!alive()) return false
    Sound.puddle()
    AfterRain.shake(p.x, Y - 6, big ? 18 : 10, big ? 170 : 110)
    p.fill = Math.max(0, p.fill - SPLASH_OUT * (big ? 1.5 : 1))
    showPuddle(p)
    if (!big) return true
    Mole.feel('squeezed', 900)
    await Mole.shakeOff(800)
    return alive()
  }

  /** All splashed out: he looks down for it, and scratches his head. */
  async function gone(i, alive) {
    Debug.trace('puddle', { gone: i })
    await Mole.lean(14, 700)
    if (!alive()) return
    Sound.say('hm', true)
    await Mole.scratchHead()
  }

  // ------------------------------------------------------------ the chestnut's drips

  /** He pats the trunk; its drops come pattering down on him (on his leaf, if he has it: he stays dry). */
  async function drips(alive) {
    await meadow.goTo(DRIP_AT)
    if (!alive()) return
    Mole.lookAt(DRIP_AT - 100)
    await Mole.knock()
    if (!alive()) return
    dripped = true // shaken down: a cut before this, and the next tap on the tree tries again
    Debug.trace('drips', { leaf: !!leaf })
    Sound.drips()
    const under = Mole.state.x
    const landed = []
    for (let k = 0; k < DRIPS; k++) {
      const d = el('ellipse', { rx: 4, ry: 7, fill: '#a9c6ee', stroke: '#4f7fc6', 'stroke-width': 1.2 }, front)
      falling.add(d)
      const x = under + (spray() - 0.5) * 180
      const top = Y - 420 + spray() * 80
      const end = leaf && Math.abs(x - under) < 70 ? Y - 175 : Y + 4 // on his leaf, or the grass
      landed.push(Debug.ignoreCut(Motion.endAt(d, [{ transform: `translate(${x}px, ${top}px)` }, { transform: `translate(${x}px, ${end}px)`, opacity: 0.4 }], { duration: 420 + spray() * 260, delay: spray() * 700, easing: 'ease-in' }), 'a drip').then(() => { falling.delete(d); d.remove() }))
    }
    if (leaf) {
      await Clock.wait(600)
      if (!alive()) return
      Mole.perk(1)
      await Mole.lean(-8, 600) // he peeks up at it: dry
      if (!alive()) return
      Sound.say('giggle', true)
      await Promise.all([Mole.cheer(), ...landed]) // free only once the last drop is down
      return
    }
    await Clock.wait(350)
    if (!alive()) return
    Sound.say('gasp')
    Mole.feel('squeezed', 1200)
    await Mole.shakeOff(800)
    if (!alive()) return
    AfterRain.shake(under, Y - 110, 10, 90)
    Sound.say('giggle', true)
    await Promise.all([Mole.handsToFace(700), ...landed])
  }

  // ------------------------------------------------------------ setup

  /** `layers`: things, front, sky, ground; `hooks`: the meadow's goTo, rounds, run (a gesture of his), free(). */
  function setup(layers, hooks) {
    ;({ things, front, sky, ground } = layers)
    meadow = hooks
    PUDDLES.forEach((p, i) => puddles.push(drawPuddle(p, i)))
    nextStomp = hooks.rounds(['hop', 'toe', 'big'], random)
    nextUnder = hooks.rounds(['tip', 'twirl'], random)
    Clock.every(TICK_MS, tick)
  }

  /** Cut short: what is in the air lands on the grass at once. */
  function restore() {
    for (const n of falling) {
      for (const a of n.getAnimations()) a.cancel()
      if (n.querySelector?.('.rain-leaf')) lie(n.querySelector('.rain-leaf'), Mole.state.x + 40)
      n.remove()
    }
    falling = new Set()
  }

  /** Bedtime: his leaf off at once. */
  function night() {
    restore()
    if (leaf) lie(Mole.wear(null), Mole.state.x + 50)
    leaf = null
  }

  return {
    setup, tapHim, stomp, drips, restore, night,
    /** Does a tap on him now go to the rain (a shower raining)? */
    get wants() { return showering() },
    /** Does the chestnut drip now (just after rain, not yet shaken)? */
    get dripping() { return !dripped && Clock.now() < dripsUntil },
    /** Is anything of it in the air (never once he is free)? */
    get posing() { return falling.size > 0 },
    /** The puddles' fill, for tests and the overlay. */
    get puddles() { return puddles.map((p) => Math.round(p.fill * 100) / 100) },
    get leaf() { return !!leaf },
  }
})()
