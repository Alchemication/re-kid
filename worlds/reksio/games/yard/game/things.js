// What Reksio does with each thing in the yard, the bird he chases, the mouse
// he helps, and the small effects they share (flung crumbs, twinkles, hearts).
// The bowl, the tree, the bramble and the cuckoo clock have files of their
// own (bowl.js, tree.js, bramble.js, cuckoo.js).
//
// Each thing's run({ extra, n }) plays its action; `extra` asks for its
// variation, and `n` is which use this is. A toddler loves exact repetition,
// so a repeat keeps the same core and adds something on top: now and then
// (yard.js decides when), or, for a thing with a pool of variations
// (VARIATIONS, and the doghouse nap), a different one every use after the
// first.
//
// The mouse: some plays, a mouse trap baited with cheese stands by a mouse
// hole in the wall. After a while a mouse comes out, wants the cheese, and
// can't get it past the trap. Reksio stamps beside the trap: it snaps shut on
// nothing and flings the cheese to the mouse, who eats it and thanks him, and
// he noses the sprung trap away. After that she comes out to say hello.

/* global Clock, Debug, Motion, Layout, Sound, Music, Reksio, Bowl, Tree, Bramble, Bird, Cuckoo, Nap, Figure, Idle, Hen, Mushrooms */
/* exported Things */
const Things = (() => {
  const DOOR = { x: 560, y: 726 } // doghouse door, scene units
  const X = Layout.x // per-play offset of a movable thing, scene units
  const FRAMES_DRAWN = [2290, 2360, 2430, 2500, 2570] // film frame centres as drawn
  const FRAMES = FRAMES_DRAWN.map((f) => f + X('film')) // …and where they are this play
  const PAW_REACH = 31 // from Reksio's middle to where his front paws land
  const MOUSE_AT_S = [14, 30] // the mouse comes out this long after the start
  const MOUSE_SCALE = 1.7 // cartoon-big, so a small child can see what she does
  const MOUSE_SPEED = 120 // scene units per second, scurrying
  // the trap thing as drawn (index.html), before its per-play offset
  const HOLE = { x: 1150, y: 706 } // the mouse hole at the foot of the wall
  const TRAP_X = 1080 // the trap's hinge
  const CHEESE = { x: 1100, y: 798 } // cheese on the trap's trigger
  const CHEESE_LANDS = 1175 // where the snap flings it, by the mouse
  const MOUSE_WAITS = 1195 // where she sits looking at the cheese she can't have
  const GROUND = 812

  const $ = (id) => document.getElementById(id)
  const fx = $('fx')
  const wait = Clock.wait
  const random = Debug.random('things') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)
  const sparkle = Debug.random('fx') // particles only: how many fly depends on frame timing, so they keep out of the stream above
  const SVG_NS = 'http://www.w3.org/2000/svg'
  let isEnded = () => false

  // ------------------------------------------------------------ variety

  // Each thing's variations, after the first use one every time (Adam,
  // 2026-10-19: "each encounter should be a bit random and different"):
  // the tap sprays him, only drips (on his nose), or gives him hiccups; the
  // flowers' bigger sneeze, or a petal on his nose; at the gate a bigger dog
  // barks back, or he digs under it, tugs a picket in his teeth, or leaps
  // up to peek over it (the yard's edge stays put); the bird he barks at,
  // he tries to fly after,
  // or it lands on his head.
  const VARIATIONS = { tap: ['spray', 'drips', 'hiccups'], flowers: ['blow', 'petal'], gate: ['answer', 'dig', 'gnaw', 'peek'], bird: ['fly', 'head'], hen: Hen.VARIATIONS, ...Mushrooms.VARIATIONS }
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

  // ------------------------------------------------------------ the mouse

  // mouse: 'away' (not out yet) | 'wanting' (out, can't reach the cheese) |
  // 'rescuing' | 'fed' (back in her hole, happy to say hello)
  let mouse = 'away'
  let visiting = false
  const mouseEl = $('mouse')
  const mousePos = { x: HOLE.x, y: HOLE.y, dir: -1 }

  function mouseAt(x, y, dir = mousePos.dir, el = mouseEl, scale = MOUSE_SCALE) {
    el.style.transform = `translate(${x + X('trap')}px, ${y}px) scale(${dir * scale}, ${scale})`
    if (el === mouseEl) Object.assign(mousePos, { x, y, dir })
  }

  /** Scurry to (x, y), little hops all the way. */
  async function scurry(x, y = GROUND, el = mouseEl, from = mousePos, scale = MOUSE_SCALE) {
    const dir = x < from.x ? -1 : 1
    const ms = (Math.hypot(x - from.x, y - from.y) / MOUSE_SPEED) * 1000 + 120
    const at = (px, py, lift = 0) => `translate(${px + X('trap')}px, ${py - lift}px) scale(${dir * scale}, ${scale})`
    const steps = Math.max(2, Math.round(ms / 110))
    const frames = []
    for (let i = 0; i <= steps; i++) {
      const k = i / steps
      frames.push({ transform: at(from.x + (x - from.x) * k, from.y + (y - from.y) * k, i % 2 ? 3 : 0) })
    }
    await el.animate(frames, { duration: ms }).finished
    if (el === mouseEl) mouseAt(x, y, dir)
    else el.style.transform = at(x, y)
  }

  /** Out of the hole: she grows from the dark. */
  async function peekOut(el = mouseEl) {
    el.style.opacity = '1'
    await el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 }).finished
  }

  async function goHome(el = mouseEl, from = mousePos, scale = MOUSE_SCALE) {
    await scurry(HOLE.x, HOLE.y, el, from, scale)
    await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250 }).finished
    el.style.opacity = '0'
  }

  /** Nose forward, a few quick sniffs. */
  async function mouseSniff(n = 3) {
    const head = $('mouse-head')
    for (let i = 0; i < n; i++) {
      await head.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], { duration: 160 }).finished
    }
  }

  /** Squeak n times; from afar (while she waits) it's heard as from where she is. */
  async function squeak(n = 1, afar = false) {
    for (let i = 0; i < n; i++) {
      if (afar) Sound.from(Math.abs(mousePos.x + X('trap') - Reksio.x), Sound.mouse)
      else Sound.mouse()
      await $('mouse-head').animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(0)' }], { duration: 220 }).finished
    }
  }

  /** Out she comes, and the trap becomes something to help with. */
  async function mouseComesOut() {
    if (mouse !== 'away' || isEnded()) return
    mouse = 'wanting'
    $('trap').classList.remove('not-yet')
    // a rescue cancels her animations mid-way: that ends this loop, quietly
    Debug.ignoreCut(mouseWants(), 'mouse wants')
  }

  /** While she can't get the cheese: creep up, reach, flinch back, look to Reksio. */
  async function mouseWants() {
    mouseAt(HOLE.x, HOLE.y, -1)
    await peekOut()
    await scurry(MOUSE_WAITS + 20)
    while (mouse === 'wanting' && !isEnded()) {
      await mouseSniff(2)
      if (mouse !== 'wanting') return
      await scurry(CHEESE.x + 50)
      if (mouse !== 'wanting') return
      // reaching for the cheese… and the trap: no!
      await $('mouse-head').animate([{ transform: 'rotate(0)' }, { transform: 'translateX(5px) rotate(10deg)' }], { duration: 400 }).finished
      Sound.from(Math.abs(mousePos.x + X('trap') - Reksio.x), Sound.mouse)
      if (mouse !== 'wanting') return
      await scurry(MOUSE_WAITS + rnd(0, 30))
      if (mouse !== 'wanting') return
      // turn to Reksio, a squeak: help?
      mouseAt(mousePos.x, mousePos.y, Reksio.x < mousePos.x + X('trap') ? -1 : 1)
      await squeak(2, true)
      await wait(rnd(2500, 5000))
      if (mouse !== 'wanting') return
      mouseAt(mousePos.x, mousePos.y, -1)
      if (random() < 0.25) {
        // back into the hole for a moment, then out again
        await goHome()
        await wait(rnd(1500, 3000))
        if (mouse !== 'wanting') return
        mouseAt(HOLE.x, HOLE.y, -1)
        await peekOut()
        await scurry(MOUSE_WAITS + 20)
      }
    }
  }

  async function rescue() {
    mouse = 'rescuing'
    mouseEl.getAnimations().forEach((a) => a.cancel())
    if (mouseEl.style.opacity !== '1') {
      mouseAt(HOLE.x, HOLE.y, -1)
      await peekOut()
    }
    await scurry(MOUSE_WAITS + 30)
    mouseAt(mousePos.x, mousePos.y, -1)
    Reksio.face(1)
    await Reksio.sniff(2)
    const trapBody = $('trap-body')
    const bar = $('trap-bar')
    const cheese = $('cheese')
    await Reksio.stamp(() => {
      Sound.stamp(0)
      Music.react.stamp()
      burst(Reksio.x + PAW_REACH, GROUND, 5, 'dust', { height: 22, reach: 40, size: 3.5 })
      // the thump sets the trap off: SNAP, it jumps, and the cheese flies
      Sound.trap()
      Motion.endAt(bar, [{ transform: 'rotate(0)' }, { transform: 'rotate(180deg)' }], { duration: 90, easing: 'ease-in' })
      trapBody.animate(
        [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-46px) rotate(-14deg)', offset: 0.45 }, { transform: 'translateY(0) rotate(0)' }],
        { duration: 520, easing: 'ease-out' },
      )
      const dx = CHEESE_LANDS - CHEESE.x
      Motion.endAt(
        cheese,
        [
          { transform: 'translate(0, 0) rotate(0)' },
          { transform: `translate(${dx * 0.5}px, -90px) rotate(200deg)`, offset: 0.5 },
          { transform: `translate(${dx}px, ${GROUND - CHEESE.y - 4}px) rotate(360deg)` },
        ],
        { duration: 700, easing: 'ease-in-out' },
      )
    })
    await Reksio.startle()
    await wait(500)
    // the mouse to her cheese
    mouseAt(mousePos.x, mousePos.y, -1)
    await squeak(1)
    await scurry(CHEESE_LANDS + 44)
    const cheeks = $('mouse-cheek')
    for (let i = 0; i < 5; i++) {
      Sound.nibble()
      cheese.style.opacity = String(1 - (i + 1) * 0.18)
      await $('mouse-head').animate([{ transform: 'rotate(0)' }, { transform: 'rotate(7deg)' }, { transform: 'rotate(0)' }], { duration: 260 }).finished
      cheeks.setAttribute('r', String(2 + i * 1.4))
      burst(CHEESE_LANDS + X('trap'), GROUND - 6, 1, 'cheese-crumb', { height: 14, reach: 16, size: 2 })
    }
    cheese.style.opacity = '0'
    await wait(300)
    cheeks.setAttribute('r', '0')
    // thank you
    mouseAt(mousePos.x, mousePos.y, Reksio.x < mousePos.x + X('trap') ? -1 : 1)
    await squeak(2)
    heart(mousePos.x + X('trap'), GROUND - 50)
    Music.react.wish()
    await wait(700)
    const home = goHome()
    // and the sprung trap: he noses it away, out of the yard
    if (await Reksio.walkTo(TRAP_X + X('trap') - 150)) {
      Reksio.face(1)
      Reksio.nod(16, 600)
      Sound.scrape()
      await Motion.endAt(
        $('trap-body'),
        [{ transform: 'translateX(0) rotate(0)', opacity: 1 }, { transform: 'translateX(70px) rotate(8deg)', opacity: 1, offset: 0.5 }, { transform: 'translateX(120px) rotate(20deg)', opacity: 0 }],
        { duration: 1000, easing: 'ease-out' },
      )
    }
    await home
    mouse = 'fed'
  }

  // ------------------------------------------------------------ the variations' own moments

  const SPOUT = { x: 1320, y: 566 } // where the tap's water comes out (index.html), before X('tap')
  const PEEK_RISE = 70 // how high he leaps to look over the gate (his units): paws on its top rail
  const UNDER_SPOUT = 50 // he stands this far short of the spout, so his upturned nose is under it
  const nose = () => Reksio.pointAt(Figure.noseTipAt)
  const headTop = () => Reksio.pointAt(Figure.bowlTopAt)

  /** A drop falling from one point to another (the ground, or his nose). */
  function drip(from, to, ms = 700) {
    const d = document.createElementNS(SVG_NS, 'circle')
    for (const [k, v] of Object.entries({ class: 'drop', r: 7, cx: from.x, cy: from.y })) d.setAttribute(k, v)
    fx.appendChild(d)
    return d.animate([{ transform: 'translate(0, 0)' }, { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px)` }], { duration: ms, easing: 'ease-in' }).finished.then(() => d.remove())
  }

  /** The tap only drips: he waits under it, head up, mouth open; two drops
   * miss, the third lands on his nose, he sneezes, and gives the tap a
   * puzzled look. */
  async function drips(close) {
    const spout = { x: SPOUT.x + X('tap'), y: SPOUT.y }
    if (!(await Reksio.walkTo(spout.x - UNDER_SPOUT))) return // under it, nose up (sent elsewhere: not)
    Reksio.face(1)
    const waiting = Reksio.waitForDrop(2700)
    await wait(400)
    for (let i = 0; i < 2; i++) {
      await drip(spout, { x: spout.x + 14 * (i ? 1 : -1), y: 790 }) // just missing him
      Sound.plink()
      await wait(350)
    }
    await drip(spout, nose())
    Sound.plink()
    await waiting
    Sound.sneeze()
    Music.react.sneeze()
    await Reksio.nod(-24, 380)
    close()
    await Reksio.puzzled()
  }

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

  /** Once she's been fed: Reksio sniffs by her hole and she comes out to say hello. */
  async function visit(extra) {
    Reksio.face(1)
    await Reksio.sniff(2)
    if (visiting) return
    visiting = true
    const front = { x: HOLE.x - 40, y: GROUND } // on the ground, under his nose
    mouseAt(HOLE.x, HOLE.y, -1)
    await peekOut()
    await scurry(front.x, front.y)
    mouseAt(front.x, front.y, -1)
    await squeak(2)
    // nose to nose
    Sound.mouse()
    await Reksio.nod(18, 450)
    if (extra && random() < 0.5) {
      // she brings him a crumb of cheese
      burst(front.x + X('trap') - 40, GROUND - 6, 5, 'cheese-crumb', { dir: -1, height: 18, reach: 30, size: 2.5 })
      Sound.munch()
      await Reksio.nod(14, 400)
      Sound.munch()
      await Reksio.lick()
      heart(front.x + X('trap'), GROUND - 70)
    } else if (extra) {
      // and a little one comes out behind her
      const baby = $('mouse-baby')
      const babyAt = { x: HOLE.x + 10, y: GROUND }
      baby.style.transform = `translate(${HOLE.x + X('trap')}px, ${HOLE.y}px) scale(-1, 1)`
      await peekOut(baby)
      await scurry(babyAt.x, babyAt.y, baby, HOLE, 1)
      Sound.mouse()
      heart(babyAt.x + X('trap'), GROUND - 50)
      await wait(900)
      await goHome(baby, babyAt, 1)
    } else {
      await wait(400)
    }
    await goHome()
    visiting = false
  }

  function startMouse() {
    if (Layout.hidden.includes('trap')) return
    $('trap').classList.add('not-yet')
    Clock.after((Layout.mouseAt ?? rnd(...MOUSE_AT_S)) * 1000, mouseComesOut)
  }

  // ------------------------------------------------------------ things

  let held = null // while a gag holds him (the bowl on his head, his tail caught): a tap's answer (yard.js stuckTap)
  let stamped = 0 // film frames stamped so far

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
    tap: {
      at: () => 1201 + X('tap'),
      face: 1,
      async run({ extra, n }) {
        const v = variation('tap', extra, n)
        const handle = $('tap-handle')
        const water = $('water')
        Sound.squeak()
        Motion.endAt(handle, [{ transform: 'rotate(0)' }, { transform: 'rotate(90deg)' }], { duration: 300 })
        let flow = null
        let open = true
        /** Water off and the handle back, once, however the use ends. */
        const close = () => {
          flow?.cancel()
          water.style.opacity = '0'
          if (open) Motion.endAt(handle, [{ transform: 'rotate(90deg)' }, { transform: 'rotate(0)' }], { duration: 300 })
          open = false
        }
        try {
          await wait(300)
          if (v === 'drips') return await drips(close)
          water.style.opacity = '1'
          flow = water.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -80 }], { duration: 400, iterations: Infinity })
          Sound.water(1.9)
          const drinking = Reksio.nod(-10, 1700)
          for (let i = 0; i < 5; i++) {
            burst(1322 + X('tap'), 790, 3, 'drop', { height: 30, reach: 30, size: 3 })
            if (v === 'spray' && i >= 2) {
              // the water sprays sideways, all over him
              burst(1320 + X('tap'), 570, 24, 'drop', { dir: -1, height: 40, reach: 200, size: 4.5 })
              Sound.splash()
            }
            await wait(320)
          }
          await drinking
        } finally {
          close()
        }
        const soaked = v === 'spray'
        if (soaked) await Reksio.startle()
        if (v === 'hiccups') await Reksio.hiccups() // drank too fast
        await wait(250)
        for (let i = 0; i < (soaked ? 2 : 1); i++) {
          Sound.shake()
          burst(Reksio.x, 730, soaked ? 22 : 14, 'drop', { height: 70, reach: 90, size: 3.5 })
          await Reksio.shake()
        }
      },
    },
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
    film: {
      at: () => FRAMES[Math.min(stamped, FRAMES.length - 1)] - PAW_REACH,
      face: 1,
      async run({ extra }) {
        if (stamped >= FRAMES.length) {
          const reel = $('reel')
          if (extra) {
            // the extra: the reel rolls off and he chases it, then noses it back
            const roll = (from, to, ms) =>
              Motion.endAt(reel, [{ transform: `translateX(${from}px) rotate(${from * 2.4}deg)` }, { transform: `translateX(${to}px) rotate(${to * 2.4}deg)` }], { duration: ms, easing: 'ease-out' })
            Sound.reel()
            const away = roll(0, -170, 1300)
            await wait(200)
            await Reksio.walkTo(FRAMES[FRAMES.length - 1] + 40 - 170 - 120)
            Reksio.face(1)
            await away
            await Reksio.pounce(FRAMES[FRAMES.length - 1] + 40 - 170)
            await Reksio.walkTo(FRAMES[FRAMES.length - 1] + 40 - 170 - 140)
            Reksio.face(1)
            Reksio.nod(12, 500)
            Sound.reel()
            await roll(-170, 0, 1100)
            await Reksio.bark()
            return
          }
          // already a reel: give it a spin
          Sound.reel()
          await reel.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(720deg)' }], { duration: 900, easing: 'ease-out' }).finished
          await Reksio.bark()
          return
        }
        const prints = document.querySelectorAll('#strip .print')
        for (let i = stamped; i < FRAMES.length; i++) {
          if (i > stamped) await Reksio.walkTo(FRAMES[i] - PAW_REACH)
          Reksio.face(1)
          await Reksio.stamp(() => {
            Sound.stamp(i)
            Music.react.stamp()
            const print = prints[i]
            print.setAttribute('opacity', '1')
            print.style.transformOrigin = `${FRAMES_DRAWN[i]}px 791px` // inside the moved strip
            print.animate([{ transform: 'scale(1.6)', opacity: 0.2 }, { transform: 'scale(1)', opacity: 1 }], { duration: 220, easing: 'ease-out' })
            burst(FRAMES[i], 812, 5, 'dust', { height: 22, reach: 40, size: 3.5 })
          })
          stamped = i + 1
        }
        // thump, thump … and the double squeak: the little Reksios squeak back
        await wait(250)
        Sound.squeaks()
        prints.forEach((p, k) => {
          p.style.transformOrigin = `${FRAMES_DRAWN[k]}px 800px`
          p.animate(
            [{ transform: 'scale(1, 1)' }, { transform: 'scale(1.2, 0.75)' }, { transform: 'scale(0.9, 1.15)' }, { transform: 'scale(1.2, 0.75)' }, { transform: 'scale(1, 1)' }],
            { duration: 420 },
          )
        })
        await wait(650)
        // the full strip rolls up into a reel
        Sound.reel()
        const strip = $('strip')
        const reel = $('reel')
        reel.setAttribute('opacity', '1')
        reel.animate([{ transform: 'scale(0.2) rotate(0)' }, { transform: 'scale(1) rotate(900deg)' }], { duration: 900, easing: 'ease-out' })
        await Motion.endAt(strip, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 900, easing: 'ease-in' })
        strip.style.visibility = 'hidden'
        await Reksio.hop(50, 2)
      },
    },
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
    dig: {
      // the bone goes round: dug up and carried off, buried again, dug up again…
      at: () => 2000 + X('dig'),
      face: 1,
      async run({ extra }) {
        const digFor = async (ms, clods) => {
          const digging = Reksio.paddle(ms)
          Sound.dig()
          for (let i = 0; i < clods; i++) {
            burst(2040 + X('dig'), 790, 3, 'clod', { dir: -1, height: 80, reach: 120, size: 4.5 })
            await wait(200)
          }
          await digging
        }
        const bone = $('found-bone')
        if (Reksio.holdingBone) {
          // bury it: (the extra: a sly look round first) dig a hole, drop it in,
          // nose the earth back over it, pat it down
          if (extra) {
            await Reksio.lookAround(700)
            Reksio.face(1)
            await Reksio.lookAround(500)
            Reksio.face(1)
          }
          await digFor(1000, 4)
          Reksio.holdBone(false)
          bone.style.opacity = '1'
          await Motion.endAt(
            bone,
            [{ transform: 'translateY(-30px) scale(1)', opacity: 1 }, { transform: 'translateY(26px) scale(0.6)', opacity: 0 }],
            { duration: 500, easing: 'ease-in' },
          )
          bone.style.opacity = '0'
          for (let i = 0; i < 3; i++) {
            Sound.from(150, Sound.dig)
            burst(2010 + X('dig'), 800, 3, 'clod', { dir: 1, height: 20, reach: 40, size: 4 })
            await Reksio.nod(22, 380)
          }
          await Reksio.stamp(() => {
            Sound.stamp(0)
            burst(2040 + X('dig'), 806, 4, 'dust', { height: 16, reach: 30, size: 3 })
          })
          await Reksio.nod(-12, 500) // pleased with that
          return
        }
        await digFor(1300, 6)
        if (extra) {
          // the extra: nothing there… a puzzled look, then dig harder
          await Reksio.lookAround(800)
          Reksio.face(1)
          await digFor(1500, 9)
        }
        bone.style.opacity = '1'
        await Motion.endAt(
          bone,
          [{ transform: 'translateY(30px) scale(0.4)' }, { transform: 'translateY(-50px) scale(1.2)' }, { transform: 'translateY(-30px) scale(1)' }],
          { duration: 600, easing: 'ease-out' },
        )
        Music.react.wish()
        await wait(500)
        bone.style.transform = ''
        bone.style.opacity = '0'
        Reksio.holdBone(true)
        Sound.original('bark') // easter egg: his original quick barks, if the clip exists
        await Reksio.nod(-14, 700)
      },
    },
    tree: { ...Tree.thing, ready: () => Tree.ready },
    hen: varied('hen', { ...Hen.thing, ready: () => Hen.ready }),
    // after the rain (mushrooms.js): each a thing of its own, so the child chooses
    porcino: varied('porcino', Mushrooms.things.porcino),
    agaric: varied('agaric', Mushrooms.things.agaric),
    berries: Bramble.thing,
    trap: {
      // before: stand so his paws land just short of the trap; after: nose at her hole
      at: () => (mouse === 'fed' ? HOLE.x - 210 : TRAP_X - 60 - PAW_REACH) + X('trap'),
      face: 1,
      ready: () => mouse === 'wanting' || mouse === 'fed',
      async run({ extra }) {
        if (mouse === 'wanting') return rescue()
        if (mouse === 'fed') return visit(extra)
      },
    },
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
    isEnded = ended
    Bird.init({ ended })
    startMouse()
    const hold = (answer) => (held = answer)
    Bowl.init({ effects: { burst }, hold })
    Bramble.init({ effects: { burst }, hold })
    Tree.init({ ended, effects: { burst, twinkle } })
    Hen.init({ ended, effects: { heart } })
    Mushrooms.init({ ended })
    document.querySelectorAll('.icon-fruit').forEach((u) => u.setAttribute('href', `#fruit-${Layout.fruit}`))
  }

  return {
    THINGS, VARIATIONS, DOOR, burst, twinkle, ready, init, stuckTap, supperAt, serveSupper, eatSupper,
    /** A gag holds him (the bowl on his head, his tail caught): it answers every tap. */
    get holding() { return !!held },
    get stamped() { return stamped },
    get mouse() { return mouse },
  }
})()
