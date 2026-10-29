// What Reksio does with each thing in the yard, the bird he chases, and the
// small effects they share (flung crumbs, twinkles, hearts). The bigger
// things have files of their own (bowl.js, tree.js, bramble.js, cuckoo.js,
// hen.js, mushrooms.js, mouse.js, mound.js, film.js, tap.js).
//
// Each thing's run({ extra, n }) plays its action; `extra` asks for its
// variation, and `n` is which use this is. A toddler loves exact repetition,
// so a repeat keeps the same core and adds something on top: now and then
// (yard.js decides when), or, for a thing with a pool of variations
// (VARIATIONS, and the doghouse nap), a different one every use after the
// first.
//

/* global Clock, Debug, Layout, Sound, Music, Reksio, Bowl, Tree, Bramble, Bird, Cuckoo, Nap, Figure, Idle, Hen, Mushrooms, Mouse, Mound, Film, Snowman, Tap */
/* exported Things */
const Things = (() => {
  const DOOR = { x: 560, y: 726 } // doghouse door, scene units
  const X = Layout.x // per-play offset of a movable thing, scene units
  const PAW_REACH = 31 // from Reksio's middle to where his front paws land
  const GROUND = 812

  const $ = (id) => document.getElementById(id)
  const fx = $('fx')
  const wait = Clock.wait
  const sparkle = Debug.random('fx') // particles only: how many fly depends on frame timing, so they keep out of the other streams
  const SVG_NS = 'http://www.w3.org/2000/svg'

  // ------------------------------------------------------------ variety

  // Each thing's variations, after the first use one every time (Adam,
  // 2026-10-19: "each encounter should be a bit random and different"):
  // the tap's running water (its first stage of three, tap.js) sprays him,
  // or gives him hiccups; the flowers' bigger sneeze, or a petal on his nose; at the gate a bigger dog
  // barks back, or he digs under it, tugs a picket in his teeth, or leaps
  // up to peek over it (the yard's edge stays put); the bird he barks at,
  // he tries to fly after,
  // or it lands on his head.
  const VARIATIONS = { tap: ['spray', 'hiccups'], flowers: ['blow', 'petal'], gate: ['answer', 'dig', 'gnaw', 'peek'], bird: ['fly', 'head'], hen: Hen.VARIATIONS, ...Mushrooms.VARIATIONS, trap: ['crumb', 'baby', 'hide', 'ride'], dig: ['harder', 'boot', 'molehill'], bury: ['sly', 'watched'], film: ['roll', 'show', 'restamp'], tree: Tree.VARIATIONS, berries: ['miss', 'caught', 'tongue', 'share', 'juggle'] }
  const variety = Debug.random('variety') // its own stream: how often the pools draw depends on taps
  const pools = Object.fromEntries(Object.entries(VARIATIONS).map(([name, names]) => [name, Idle.pool(names, variety)]))

  /** A thing kept in its own file, whose run takes the variation (v) that
   * things.js draws for it from VARIATIONS. */
  const varied = (name, thing) => ({ ...thing, run: ({ extra, n }) => thing.run({ v: variation(name, extra, n) }) })

  /** Which variation a use of `name` gets: none the first time (unless one
   * is asked for, extra), then one from its pool every time. */
  function variation(name, extra, n) {
    const v = extra || n > 1 ? pools[name]() : null
    Debug.trace('variation', { name, v })
    return v
  }

  // ------------------------------------------------------------ effects

  /** Little particles flung in arcs: crumbs, clods of earth, drops, petals. */
  function burst(x, y, n, cls, { dir = 0, spread = 1, height = 60, reach = 70, size = 4 } = {}) {
    for (let i = 0; i < n; i++) {
      const c = document.createElementNS(SVG_NS, 'circle')
      c.setAttribute('class', cls)
      c.setAttribute('cx', x)
      c.setAttribute('cy', y)
      c.setAttribute('r', size * (0.6 + sparkle() * 0.8))
      fx.appendChild(c)
      const side = dir || (sparkle() < 0.5 ? -1 : 1)
      const dx = side * reach * (0.3 + sparkle() * spread)
      const up = height * (0.5 + sparkle())
      c.animate(
        [
          { transform: 'translate(0, 0)', opacity: 1 },
          { transform: `translate(${dx * 0.5}px, ${-up}px)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${dx}px, ${up * 0.4}px)`, opacity: 0 },
        ],
        { duration: 600 + sparkle() * 300, easing: 'ease-out' },
      ).finished.then(() => c.remove())
    }
  }

  /** Float a shape from defs up from (x, y) and fade it: a twinkle, a heart. */
  function floatUp(shape, cls, x, y, { rise = 0, spin = true, ms = 1400 } = {}) {
    const t = document.createElementNS(SVG_NS, 'use')
    t.setAttribute('href', `#${shape}`)
    t.setAttribute('class', cls)
    t.setAttribute('x', x)
    t.setAttribute('y', y)
    t.style.transformOrigin = `${x}px ${y}px`
    fx.appendChild(t)
    const r = (deg) => (spin ? ` rotate(${deg}deg)` : '')
    t.animate(
      [
        { transform: `translateY(0) scale(0)${r(0)}`, opacity: 0 },
        { transform: `translateY(${-rise * 0.25}px) scale(1.2)${r(45)}`, opacity: 1, offset: 0.25 },
        { transform: `translateY(${-rise * 0.5}px) scale(0.6)${r(70)}`, opacity: 0.8, offset: 0.5 },
        { transform: `translateY(${-rise * 0.75}px) scale(1.1)${r(110)}`, opacity: 1, offset: 0.75 },
        { transform: `translateY(${-rise}px) scale(0)${r(180)}`, opacity: 0 },
      ],
      { duration: ms, easing: 'ease-in-out' },
    ).finished.then(() => t.remove())
  }

  /** A small twinkle above a thing: "you can tap me". Nothing solid moves. */
  const twinkle = (x, y) => floatUp('twinkle-shape', 'twinkle', x, y)
  const heart = (x, y) => floatUp('heart-shape', 'heart', x, y, { rise: 60, spin: false, ms: 1600 })

  // ------------------------------------------------------------ the variations' own moments

  const PEEK_RISE = 70 // how high he leaps to look over the gate (his units): paws on its top rail
  const nose = () => Reksio.pointAt(Figure.noseTipAt)
  const headTop = () => Reksio.pointAt(Figure.bowlTopAt)

  /** A petal flutters down onto his nose: cross-eyed, he blows it off, it
   * floats down onto his head, and he shakes it off. */
  async function petalOnNose() {
    const petal = document.createElementNS(SVG_NS, 'ellipse')
    for (const [k, v] of Object.entries({ class: 'petal-red', rx: 10, ry: 6 })) petal.setAttribute(k, v) // outlined, as on the flowers: a dot would be lost
    fx.appendChild(petal)
    let at = { ...nose(), y: nose().y - 140 }
    const put = (p) => {
      at = p
      petal.setAttribute('cx', p.x)
      petal.setAttribute('cy', p.y)
    }
    /** Move the petal from where it is to where(), over ms, with a flutter. */
    const glide = async (where, ms, sway = 8) => {
      const from = at
      const t0 = Clock.now()
      for (let k = 0; k < 1; ) {
        k = Math.min(1, (Clock.now() - t0) / ms)
        const to = where()
        put({ x: from.x + (to.x - from.x) * k + sway * Math.sin(k * 9) * (1 - k), y: from.y + (to.y - from.y) * k })
        if (k < 1) await Clock.frame()
      }
    }
    let stay = () => {}
    try {
      put(at)
      await glide(nose, 900)
      stay = Clock.every(0, () => put(nose()))
      await Reksio.crossEyed(700)
      stay()
      Sound.toss()
      await Promise.all([Reksio.blow(), glide(() => ({ x: headTop().x + 20, y: headTop().y - 70 }), 350, 0)])
      await glide(headTop, 700)
      stay = Clock.every(0, () => put(headTop()))
      await Reksio.lookUp(900)
      stay()
      Sound.shake()
      await Promise.all([Reksio.shake(), glide(() => ({ x: Reksio.x + 50, y: 800 }), 600)])
    } finally {
      stay()
      petal.remove()
    }
  }

  // ------------------------------------------------------------ things

  let held = null // while a gag holds him (the bowl on his head, his tail caught): a tap's answer (yard.js stuckTap)

  /** A tap while a gag holds him answers inside it (the bowl on his head: a
   * bark in it, the bird hears; his tail caught: another try). False if
   * nothing holds him (the tap is an ordinary one). */
  function stuckTap() {
    if (!held) return false
    held()
    return true
  }

  const THINGS = {
    doghouse: {
      at: () => DOOR.x,
      // a nap in the doorway (nap.js): the first plain, every one after (or
      // one asked for with extra) with something on top, a different one each time
      async run({ extra, n }) {
        Sound.knock()
        await Reksio.duck(true)
        await Nap.nap(extra || n > 1 ? Nap.next() : null)
        await Reksio.duck(false)
        await Reksio.wakeUp() // out of the doghouse, a big yawn, as in the cartoon
      },
    },
    bowl: Bowl.thing,
    tap: { ...Tap.thing, run: ({ extra }) => Tap.thing.run({ variation: (round) => variation('tap', extra, round) }) },
    flowers: {
      at: () => 1483 + X('flowers'),
      face: 1,
      async run({ extra, n }) {
        const v = variation('flowers', extra, n)
        for (let i = 0; i < 3; i++) {
          Sound.step()
          await Reksio.nod(8, 260)
        }
        await wait(150)
        Sound.sneeze()
        Music.react.sneeze()
        await wait(320)
        Reksio.nod(-24, 380)
        burst(1640 + X('flowers'), 680, 12, 'petal', { height: 70, reach: 110, size: 5 })
        if (v === 'petal') await petalOnNose()
        if (v === 'blow') {
          // a second, bigger sneeze blows him backwards
          await wait(600)
          Sound.sneeze()
          Music.react.sneeze()
          burst(1640 + X('flowers'), 680, 20, 'petal', { height: 90, reach: 150, size: 5 })
          Reksio.walkTo(Reksio.x - 90)
          Reksio.face(1)
          await Reksio.hop(36, 1)
        }
        await wait(500)
      },
    },
    house: Cuckoo.thing, // the cuckoo clock, through its open window
    gate: {
      at: () => Layout.MAX_X,
      face: 1,
      async run({ extra, n }) {
        const v = variation('gate', extra, n)
        const rattle = () => {
          Sound.rattle()
          $('gate').animate([0, -1.5, 1.5, -1, 1, 0].map((d) => ({ transform: `rotate(${d}deg)` })), { duration: 600 })
        }
        rattle()
        await Reksio.nod(10, 500)
        if (v === 'answer') {
          // a bigger dog barks back from the other side: a jump back, then a bigger bark
          await wait(250)
          Sound.farBark()
          rattle()
          await Reksio.startle()
          await Reksio.puffUp()
        }
        if (v === 'dig') {
          // a hole under the gate: earth flies, then he gives up and shakes it off
          const digging = Reksio.paddle(1500)
          Sound.dig()
          for (let i = 0; i < 6; i++) {
            burst(Layout.MAX_X + 30, 805, 3, 'clod', { dir: -1, height: 70, reach: 110, size: 4.5 })
            await wait(230)
          }
          await digging
          await Reksio.puzzled() // no good: a gate goes down into the ground
          await Reksio.shake()
        }
        if (v === 'gnaw') await Reksio.gnaw(rattle)
        if (v === 'peek') await Reksio.peekOver(PEEK_RISE)
        await Reksio.bark()
      },
    },
    film: varied('film', Film.thing),
    bird: {
      at: () => Bird.perch.x - 70,
      face: 1,
      ready: () => !Bird.flying,
      async run({ extra, n }) {
        if (Bird.flying) return
        if (Bird.friend) return Bird.visit()
        const v = variation('bird', extra, n)
        await Reksio.nod(-22, 300)
        await Reksio.bark()
        // it lands on his head instead: he looks up at it, and shakes it off
        if (v === 'head') return Bird.onHead({ lookUp: () => Reksio.lookUp(1300), shakeOff: () => Reksio.shake() })
        await Bird.flyAway()
        if (v === 'fly') await Reksio.tryToFly() // after it, ears flapping
      },
    },
    dig: { ...Mound.thing, run: ({ extra, n }) => Mound.thing.run({ v: variation(Reksio.holdingBone ? 'bury' : 'dig', extra, n) }) },
    tree: varied('tree', { ...Tree.thing, ready: () => Tree.ready }),
    hen: varied('hen', { ...Hen.thing, ready: () => Hen.ready }),
    // after the rain (mushrooms.js): each a thing of its own, so the child chooses
    porcino: varied('porcino', Mushrooms.things.porcino),
    agaric: varied('agaric', Mushrooms.things.agaric),
    // a winter play (snowman.js): the stones and the stick for the boy's snowman, and the snowman
    ...Snowman.things,
    berries: varied('berries', Bramble.thing),
    trap: varied('trap', Mouse.thing),
  }

  // ------------------------------------------------------------ supper

  // Supper at bedtime (yard.js), as Kosmonauta ends (observed, about 9:30):
  // steaming food, in his own bowl if it's out this play (bowl.js: one bowl,
  // not two), else in a red dish by the doghouse; he eats it and licks his chops.
  const SUPPER_X = 645 // the dish's middle, as drawn (index.html #supper)
  const SUPPER_REACH = 116 // he stands this far left of it to eat, as at his bowl
  const inBowl = () => Layout.props.includes('bowl')

  /** Where he stands to eat it. */
  const supperAt = () => (inBowl() ? Bowl.thing.at() : SUPPER_X - SUPPER_REACH)

  /** Supper is set down, steaming. */
  function serveSupper() {
    if (inBowl()) Bowl.serveSupper()
    else $('supper').classList.add('served')
    Sound.clang(0, 0.4)
  }

  /** He eats it all up and licks his chops. */
  async function eatSupper() {
    if (inBowl()) {
      await Bowl.eatSupper()
      await Reksio.lick()
      return
    }
    const food = $('supper-food')
    let left = 1
    const lapping = Reksio.lap(8)
    for (let i = 0; i < 4; i++) {
      await wait(380)
      burst(SUPPER_X, 762, 3, 'crumb', { height: 30, reach: 30, size: 3 })
      left -= 0.22
      food.style.transform = `scaleY(${Math.max(left, 0.1).toFixed(2)})`
    }
    await lapping
    Sound.slurp()
    await Reksio.lick()
  }

  /** Can it be used now? Each thing says, if it has a say (its `ready`): the
   * trap only once the mouse is out, the tree once someone hungry is under
   * it, the bird only while it sits somewhere… The rest always. */
  const ready = (name) => THINGS[name]?.ready?.() ?? true

  function init({ ended }) {
    Bird.init({ ended })
    Mouse.init({ ended, effects: { burst, heart } })
    Mound.init({ effects: { burst } })
    Tap.init({ effects: { burst }, layer: fx })
    Film.init({ effects: { burst } })
    const hold = (answer) => (held = answer)
    Bowl.init({ effects: { burst }, hold })
    Bramble.init({ effects: { burst }, hold })
    Tree.init({ ended, effects: { burst, twinkle } })
    Hen.init({ ended, effects: { heart } })
    Mushrooms.init({ ended })
    Snowman.init({ ended, door: DOOR })
    document.querySelectorAll('.icon-fruit').forEach((u) => u.setAttribute('href', `#fruit-${Layout.fruit}`))
  }

  return {
    THINGS, VARIATIONS, DOOR, burst, twinkle, ready, init, stuckTap, supperAt, serveSupper, eatSupper,
    /** A gag holds him (the bowl on his head, his tail caught): it answers every tap. */
    get holding() { return !!held },
    get stamped() { return Film.stamped },
    get mouse() { return Mouse.state },
  }
})()
