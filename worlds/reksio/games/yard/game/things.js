// What Reksio does with each thing in the yard, the bird he chases, the mouse
// he helps, and the small effects they share (flung crumbs, twinkles, hearts).
//
// Each thing's run({ extra }) plays its action; `extra` asks for its
// variation. A toddler loves exact repetition, so a repeat keeps the same core
// and only now and then adds something on top (yard.js decides when).
//
// The mouse: some plays, a mouse trap baited with cheese stands by a mouse
// hole in the wall. After a while a mouse comes out, wants the cheese, and
// can't get it past the trap. Reksio stamps beside the trap: it snaps shut on
// nothing and flings the cheese to the mouse, who eats it and thanks him, and
// he noses the sprung trap away. After that she comes out to say hello.

/* global Debug, Layout, Sound, Music, Reksio, Tree */
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
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const random = Debug.random('things') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)
  const sparkle = Debug.random('fx') // particles only: how many fly depends on frame timing, so they keep out of the stream above
  const SVG_NS = 'http://www.w3.org/2000/svg'
  let isEnded = () => false

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

  // ------------------------------------------------------------ the bird

  const bird = $('bird')
  const wing = $('bird-wing')
  const PERCHES = [
    { x: Layout.perches[0], y: 330 }, // on the wall, over open ground (layout.js)
    { x: 560, y: 552 }, // on the doghouse roof
    { x: Layout.perches[1], y: 330 }, // further along the wall
    { x: 2880 + X('gate'), y: 602 }, // on the fence rail
  ]
  let perch = 0
  let flying = false

  function birdAt(p) {
    bird.style.transform = `translate(${p.x}px, ${p.y}px)`
  }

  /** Fly from one point to another in an arc, wings flapping. */
  async function flyBetween(from, to) {
    const flap = wing.animate(
      [{ transform: 'rotate(0)' }, { transform: 'rotate(-55deg)' }, { transform: 'rotate(0)' }],
      { duration: 160, iterations: Infinity },
    )
    Sound.flutter()
    const top = Math.min(from.y, to.y) - 180
    const mid = { x: (from.x + to.x) / 2, y: top }
    const facing = to.x < from.x ? -1 : 1
    await bird.animate(
      [
        { transform: `translate(${from.x}px, ${from.y}px) scaleX(${facing})` },
        { transform: `translate(${mid.x}px, ${mid.y}px) scaleX(${facing})` },
        { transform: `translate(${to.x}px, ${to.y}px) scaleX(${facing})` },
      ],
      { duration: 1200 + Math.abs(to.x - from.x) * 0.5, easing: 'ease-in-out' },
    ).finished
    flap.cancel()
    return facing
  }

  /** Off to the perch furthest from Reksio, so the chase can go on. */
  async function flyAway(from = PERCHES[perch]) {
    flying = true
    const choices = PERCHES.map((p, i) => i).filter((i) => i !== perch)
    perch = choices.sort((a, b) => Math.abs(PERCHES[b].x - Reksio.x) - Math.abs(PERCHES[a].x - Reksio.x))[Math.floor(random() * 2)]
    const to = PERCHES[perch]
    Music.react.bird()
    await flyBetween(from, to)
    birdAt(to)
    Sound.chirp()
    flying = false
  }

  /** After rain: down to a worm, a few pecks, and back up to a perch. */
  async function birdHunt(worm) {
    if (flying) return
    flying = true
    const land = { x: worm.x + 30, y: worm.y + 6 }
    await flyBetween(PERCHES[perch], land)
    bird.style.transform = `translate(${land.x}px, ${land.y}px) scaleX(-1)`
    for (let i = 0; i < 3; i++) {
      await $('bird-body').animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-30deg)' }, { transform: 'rotate(0)' }], { duration: 260 }).finished
    }
    worm.eat()
    Sound.chirp()
    await wait(500)
    await flyAway(land)
  }

  function birdIdle() {
    if (!flying && !isEnded()) {
      $('bird-body').animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }],
        { duration: 300 },
      )
      if (random() < 0.6) Sound.from(Math.abs(PERCHES[perch].x - Reksio.x), Sound.chirp)
    }
    setTimeout(birdIdle, 4000 + random() * 4000)
  }

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
      await $('mouse-head').animate([{ transform: 'rotate(0)' }, { transform: 'translateX(5px) rotate(10deg)' }], { duration: 400, fill: 'forwards' }).finished
      $('mouse-head').getAnimations().forEach((a) => a.cancel())
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
      bar.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(180deg)' }], { duration: 90, easing: 'ease-in', fill: 'forwards' })
      trapBody.animate(
        [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-46px) rotate(-14deg)', offset: 0.45 }, { transform: 'translateY(0) rotate(0)' }],
        { duration: 520, easing: 'ease-out' },
      )
      const dx = CHEESE_LANDS - CHEESE.x
      cheese.animate(
        [
          { transform: 'translate(0, 0) rotate(0)' },
          { transform: `translate(${dx * 0.5}px, -90px) rotate(200deg)`, offset: 0.5 },
          { transform: `translate(${dx}px, ${GROUND - CHEESE.y - 4}px) rotate(360deg)` },
        ],
        { duration: 700, easing: 'ease-in-out', fill: 'forwards' },
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
      await $('trap-body').animate(
        [{ transform: 'translateX(0) rotate(0)', opacity: 1 }, { transform: 'translateX(70px) rotate(8deg)', opacity: 1, offset: 0.5 }, { transform: 'translateX(120px) rotate(20deg)', opacity: 0 }],
        { duration: 1000, easing: 'ease-out', fill: 'forwards' },
      ).finished
    }
    await home
    mouse = 'fed'
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
    setTimeout(mouseComesOut, (Layout.mouseAt ?? rnd(...MOUSE_AT_S)) * 1000)
  }

  // ------------------------------------------------------------ blackberries

  // Berries on the bramble, as drawn; the ones nearest Reksio (on the left,
  // where he stands) go first.
  const ON_BUSH = [[2418, 758], [2436, 718], [2462, 686], [2500, 676], [2470, 744], [2540, 668], [2512, 728], [2582, 684], [2556, 742], [2612, 722], [2628, 760]]
  const BERRY_SCALE = 1.7 // on the bush
  const FLYING_BERRY = 2.2 // bigger in the air, so the child can follow it
  const TOSS_UP = 300 // how high he flicks a berry above his nose
  const CATCH_HOP = 60 // and how high he jumps to catch it
  let onBush = []

  function makeBerries() {
    if (Layout.hidden.includes('berries')) return
    const bush = $('berry-bush')
    onBush = ON_BUSH.map(([x, y]) => {
      const u = document.createElementNS(SVG_NS, 'use')
      u.setAttribute('href', '#berry')
      u.setAttribute('transform', `translate(${x} ${y}) scale(${BERRY_SCALE})`)
      bush.appendChild(u)
      return { x, y, el: u }
    })
  }

  /** Nip a berry off, flick it up high, jump and catch it (or, the extra,
   * miss, and gobble it off the ground), then lick his lips. */
  async function berryToss(extra) {
    if (!onBush.length) {
      // all eaten: a puzzled sniff
      await Reksio.sniff(3)
      await Reksio.lookAround(700)
      return
    }
    await Reksio.sniff(2)
    const b = onBush.shift()
    await Reksio.nod(16, 320)
    b.el.remove()
    Sound.snap()
    const m = Reksio.mouth()
    const berry = document.createElementNS(SVG_NS, 'use')
    berry.setAttribute('href', '#berry')
    fx.appendChild(berry)
    const at = (x, y) => ({ transform: `translate(${x}px, ${y}px) scale(${FLYING_BERRY})` })
    Reksio.nod(-30, 380) // the flick
    Sound.toss()
    const catchY = m.y - CATCH_HOP * 1.3
    if (!extra) {
      const flight = berry.animate(
        [{ ...at(m.x, m.y), easing: 'ease-out' }, { ...at(m.x + 12, m.y - TOSS_UP), offset: 0.55, easing: 'ease-in' }, at(m.x + 4, catchY)],
        { duration: 1100, fill: 'forwards' },
      )
      const flightDone = flight.finished // taken now: see Reksio's ending()
      await wait(1100 - (480 + CATCH_HOP * 3) * 0.55) // jump so he's at the top as it comes down
      const jump = Reksio.hop(CATCH_HOP, 1)
      await flightDone
      berry.remove()
      Sound.snap()
      Music.react.wish()
      await jump
    } else {
      // too far: it sails over his head and lands behind him
      const lands = m.x - Reksio.facing * 170
      const flight = berry.animate(
        [{ ...at(m.x, m.y), easing: 'ease-out' }, { ...at(m.x - Reksio.facing * 60, m.y - TOSS_UP), offset: 0.5, easing: 'ease-in' }, at(lands, 806)],
        { duration: 1300, fill: 'forwards' },
      )
      const flightDone = flight.finished // taken now: see Reksio's ending()
      await wait(500)
      await Reksio.hop(CATCH_HOP, 1)
      Sound.snap() // snaps at nothing
      await flightDone
      Sound.plop()
      await Reksio.lookAround(500)
      Reksio.face(-Reksio.facing)
      await Reksio.pounce(lands)
      berry.remove()
    }
    for (let i = 0; i < 3; i++) {
      Sound.munch()
      await Reksio.nod(6, 220)
    }
    await Reksio.lick()
    await wait(150)
    await Reksio.lick()
  }

  // ------------------------------------------------------------ things

  const food = $('food')
  let foodLeft = 1
  let bowlPushed = 0 // how far his nose has pushed the bowl
  let stamped = 0 // film frames stamped so far

  const THINGS = {
    doghouse: {
      at: () => DOOR.x,
      async run({ extra }) {
        Sound.knock()
        await Reksio.duck(true)
        const nap = $('nap')
        const head = $('nap-head')
        await nap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, fill: 'forwards' }).finished
        nap.style.opacity = '1'
        // the extra: he dreams of a bone, paws twitching
        const dream = $('dream')
        if (extra) dream.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 5200 })
        const zs = ['z1', 'z2', 'z3'].map($)
        for (let i = 0; i < 3; i++) {
          Sound.snore()
          Music.react.snore(i)
          head.animate(
            [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.05) translateY(-2px)', offset: 0.45 }, { transform: 'scaleY(1)' }],
            { duration: 1700, easing: 'ease-in-out' },
          )
          if (extra) {
            document.querySelectorAll('#nap .paw').forEach((p, k) =>
              p.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 180, delay: 400 + k * 120, iterations: 2 }),
            )
          } else {
            zs.forEach((z, k) =>
              z.animate(
                [
                  { opacity: 0, transform: 'translate(0, 0)' },
                  { opacity: 1, transform: 'translate(4px, -10px)', offset: 0.3 },
                  { opacity: 0, transform: 'translate(10px, -34px)' },
                ],
                { duration: 1200, delay: 650 + k * 180, easing: 'ease-out' },
              ),
            )
          }
          await wait(1750)
        }
        Sound.yawn()
        await wait(500)
        await nap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).finished
        nap.style.opacity = '0'
        await Reksio.duck(false)
      },
    },
    bowl: {
      at: () => 764 + X('bowl') + bowlPushed,
      face: 1,
      async run({ extra }) {
        if (foodLeft <= 0.2 && !extra) {
          foodLeft = 1
          food.style.transform = 'scaleY(1)'
          await wait(200)
        }
        if (foodLeft <= 0.2) {
          // the extra: an empty bowl — he licks it clean and noses it along
          await Reksio.lap(4)
          const push = bowlPushed ? -bowlPushed : 28
          Sound.scrape()
          const body = $('bowl-body')
          Reksio.nod(14, 500)
          await body.animate([{ transform: `translateX(${bowlPushed}px)` }, { transform: `translateX(${bowlPushed + push}px)` }], { duration: 500, easing: 'ease-out', fill: 'forwards' }).finished
          bowlPushed += push
          body.getAnimations().forEach((a) => a.cancel())
          body.style.transform = `translateX(${bowlPushed}px)`
          await Reksio.lick()
          foodLeft = 1
          food.style.transform = 'scaleY(1)'
          return
        }
        const lapping = Reksio.lap(10)
        for (let i = 0; i < 5; i++) {
          await wait(380)
          burst(880 + X('bowl') + bowlPushed, 760, 3, 'crumb', { height: 34, reach: 36, size: 3 })
          foodLeft -= 0.16
          food.style.transform = `scaleY(${Math.max(foodLeft, 0.15)})`
        }
        await lapping
        Sound.slurp()
        await Reksio.lick()
      },
    },
    tap: {
      at: () => 1201 + X('tap'),
      face: 1,
      async run({ extra }) {
        const handle = $('tap-handle')
        const water = $('water')
        Sound.squeak()
        handle.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(90deg)' }], { duration: 300, fill: 'forwards' })
        await wait(300)
        water.style.opacity = '1'
        const flow = water.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -80 }], { duration: 400, iterations: Infinity })
        Sound.water(1.9)
        const drinking = Reksio.nod(-10, 1700)
        for (let i = 0; i < 5; i++) {
          burst(1322 + X('tap'), 790, 3, 'drop', { height: 30, reach: 30, size: 3 })
          if (extra && i >= 2) {
            // the extra: the water sprays sideways, all over him
            burst(1320 + X('tap'), 570, 24, 'drop', { dir: -1, height: 40, reach: 200, size: 4.5 })
            Sound.splash()
          }
          await wait(320)
        }
        await drinking
        flow.cancel()
        water.style.opacity = '0'
        handle.animate([{ transform: 'rotate(90deg)' }, { transform: 'rotate(0)' }], { duration: 300, fill: 'forwards' })
        if (extra) await Reksio.startle()
        await wait(250)
        for (let i = 0; i < (extra ? 2 : 1); i++) {
          Sound.shake()
          burst(Reksio.x, 730, extra ? 22 : 14, 'drop', { height: 70, reach: 90, size: 3.5 })
          await Reksio.shake()
        }
      },
    },
    flowers: {
      at: () => 1483 + X('flowers'),
      face: 1,
      async run({ extra }) {
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
        if (extra) {
          // the extra: a second, bigger sneeze blows him backwards
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
    house: {
      at: () => Reksio.MIN_X,
      face: -1,
      async run() {
        await Reksio.nod(-20, 300)
        await Reksio.bark()
        Sound.curtain()
        await $('curtain').animate(
          [{ transform: 'skewX(0)' }, { transform: 'skewX(-8deg)' }, { transform: 'skewX(4deg)' }, { transform: 'skewX(0)' }],
          { duration: 900, easing: 'ease-in-out' },
        ).finished
      },
    },
    gate: {
      at: () => Reksio.MAX_X,
      face: 1,
      async run() {
        Sound.rattle()
        $('gate').animate(
          [0, -1.5, 1.5, -1, 1, 0].map((d) => ({ transform: `rotate(${d}deg)` })),
          { duration: 600 },
        )
        await Reksio.nod(10, 500)
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
              reel.animate([{ transform: `translateX(${from}px) rotate(${from * 2.4}deg)` }, { transform: `translateX(${to}px) rotate(${to * 2.4}deg)` }], { duration: ms, easing: 'ease-out', fill: 'forwards' }).finished
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
            reel.getAnimations().forEach((a) => a.cancel())
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
        await strip.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 900, easing: 'ease-in', fill: 'forwards' }).finished
        strip.style.visibility = 'hidden'
        await Reksio.hop(50, 2)
      },
    },
    bird: {
      at: () => PERCHES[perch].x - 70,
      face: 1,
      async run() {
        if (flying) return
        await Reksio.nod(-22, 300)
        await Reksio.bark()
        await flyAway()
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
          await bone.animate(
            [{ transform: 'translateY(-30px) scale(1)', opacity: 1 }, { transform: 'translateY(26px) scale(0.6)', opacity: 0 }],
            { duration: 500, easing: 'ease-in', fill: 'forwards' },
          ).finished
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
        await bone.animate(
          [{ transform: 'translateY(30px) scale(0.4)' }, { transform: 'translateY(-50px) scale(1.2)' }, { transform: 'translateY(-30px) scale(1)' }],
          { duration: 600, easing: 'ease-out', fill: 'forwards' },
        ).finished
        Music.react.wish()
        await wait(500)
        bone.getAnimations().forEach((a) => a.cancel())
        bone.style.opacity = '0'
        Reksio.holdBone(true)
        Sound.original('bark') // easter egg: his original quick barks, if the clip exists
        await Reksio.nod(-14, 700)
      },
    },
    tree: Tree.thing,
    berries: {
      at: () => 2310 + X('berries'),
      face: 1,
      run: ({ extra }) => berryToss(extra),
    },
    trap: {
      // before: stand so his paws land just short of the trap; after: nose at her hole
      at: () => (mouse === 'fed' ? HOLE.x - 210 : TRAP_X - 60 - PAW_REACH) + X('trap'),
      face: 1,
      async run({ extra }) {
        if (mouse === 'wanting') return rescue()
        if (mouse === 'fed') return visit(extra)
      },
    },
  }

  /** Can it be used now? The trap only once the mouse is out, the tree once
   * someone hungry is under it, the bird only while it sits somewhere. */
  const ready = (name) =>
    name === 'trap' ? mouse === 'wanting' || mouse === 'fed' : name === 'bird' ? !flying : name === 'tree' ? Tree.ready : true

  function init({ ended }) {
    isEnded = ended
    birdAt(PERCHES[0])
    setTimeout(birdIdle, 3000)
    startMouse()
    makeBerries()
    Tree.init({ ended, effects: { burst, twinkle } })
    document.querySelectorAll('.icon-fruit').forEach((u) => u.setAttribute('href', `#fruit-${Layout.fruit}`))
  }

  return {
    THINGS, DOOR, PERCHES, burst, twinkle, flyAway, birdHunt, ready, init,
    get perch() { return PERCHES[perch] },
    get flying() { return flying },
    get stamped() { return stamped },
    get mouse() { return mouse },
  }
})()
