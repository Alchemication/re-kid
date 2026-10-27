// Around the finished snowman (snowman.js), a tap brings something new each
// time, from a pool, all before any comes again (Adam, 2026-10-27: make it
// feel alive). Reksio's part is the thing's run, at the snowman's right,
// facing it and the boy beyond; the boy's part goes in his queue
// (Snowman.kit.boyDo), one step at a time.
//
// Snowballs: the boy packs one and lobs it over the snowman; Reksio snaps it
// out of the air, and it bursts on his nose (cross-eyed, a shake, and a bow:
// again!). Once or twice; then a throw goes flat, straight into the
// snowman's head, which flies off and breaks at Reksio's feet. Both freeze
// and look at each other; the boy laughs, and mends it (snowman.js), while
// Reksio sits and watches. An accident in a game they play together, never
// Reksio wrecking it (Adam, 2026-10-27).
//
// The sparrow and the carrot: a sparrow flies in and lands on the snowman's
// cap, looks about, flutters down to its carrot and tugs at it, once, twice,
// and out it comes. Off it flies, low and wobbly under a carrot bigger than
// itself, over Reksio's head, and drops it in the snow. Reksio runs after it
// and brings it back to the boy, who pushes it in again. Cut short, the
// carrot lies where it fell, and the next tap (or Reksio, left alone) brings
// it back.

/* global Clock, Debug, Idle, Layout, Sound, Reksio, Boy, Snowman, Things, Creatures */
/* exported SnowPlay */
const SnowPlay = (() => {
  const BALL_R = 13 // a snowball, packed in his hands: big enough to follow in the air (Adam, 2026-10-27: 9 was too small)
  const PATS = 4 // he pats it up from a pinch of snow to its size in this many pats…
  const PAT_MS = 260 // …each this long
  const CATCH_FROM = 170 // Reksio backs off this far right of the snowman's base to catch: room for the lob, and for its head to land short of him
  const LOB_MS = 1000 // a lobbed snowball's flight, boy to Reksio: slow enough for a toddler to follow (Adam, 2026-10-27)
  const LOB = 130 // how high it arcs: over the snowman's head
  const FLAT_MS = 450 // the last throw, flat and fast…
  const FLAT = 12 // …and hardly arcing: into the snowman's head
  const CATCHES = [1, 2] // how many he catches before the one that hits it
  const SNAP_BEFORE_MS = 200 // he snaps this long before the ball reaches his mouth
  const WAIT_MS = 8000 // waiting for the boy to throw, he gives up after this long
  const WATCH_BACK = 90 // then he steps back this far to watch the boy mend it
  const FREEZE_MS = 1500 // after the head flies off, both stand frozen this long: time to see what happened
  const COMES_FROM = { dx: 560, dy: -230 } // the sparrow comes in from up and to the right of the snowman's head
  const LAND_MS = 1300 // its flight in, onto the cap
  const ON_CAP = 18 // it stands this far above the snowman's head's top: on the cap
  const HOVER = { dx: 32, dy: 26 } // tugging, it hovers with its beak at the carrot's tip: its body this far right of and below the beak
  const TUGS = 3 // it tugs this many times; the last pulls the carrot out
  const LOOK_MS = 600 // on the cap, each look about this long
  const TUG_MS = 300 // each tug, and the rest between
  const GOT_IT_MS = 500 // the carrot out, it hangs there a moment with it: oh!
  const CARRY_MS = 2400 // off with it, wobbly under its weight, over Reksio's head…
  const DROPS_PAST = 430 // …dropping it this far right of the snowman, well beyond him: he runs for it
  const CARRY_Y = 300 // it carries the carrot this high above the ground: over his head
  const FALL_MS = 450 // the carrot falling into the snow
  const FETCH_AFTER_MS = 6000 // left lying, left alone, he goes for it after this long

  const SVG_NS = 'http://www.w3.org/2000/svg'
  const random = Debug.random('snowplay') // this part's own random stream (debug.js)
  const next = Idle.pool(['snowballs', 'carrot'], random)
  let flight = null // the snowball in the air: { n, arrives, landed }
  let thrown = 0 // throws so far, so Reksio knows a new one from the last
  let theft = 'none' // the sparrow's part: none, coming, on (the cap), pulled, dropped
  let carrotAt = null // where the carrot lies in the snow, if it does
  let droppedAt = 0
  let lying = null // the carrot lying there, drawn
  let fetching = false

  // ------------------------------------------------------------ snowballs

  function ballNode(r = BALL_R) {
    const n = document.createElementNS(SVG_NS, 'circle')
    n.setAttribute('class', 'snow-ball')
    n.setAttribute('r', r)
    return n
  }

  /** The ball flies from his hand to `to()` (a point, followed as it moves)
   * in an arc; at the end, hit() says what it hit. */
  function fly(last) {
    const k = Snowman.kit
    const from = Boy.handAt('far')
    const ms = last ? FLAT_MS : LOB_MS
    const to = last ? () => ({ x: k.at() - k.R.head * 0.8, y: k.headY() }) : () => {
      const m = Reksio.mouth()
      return { x: m.x, y: m.y }
    }
    const t0 = Clock.now()
    let done
    flight = { n: ++thrown, last, arrives: t0 + ms, landed: new Promise((resolve) => (done = resolve)) }
    Sound.toss()
    const stop = k.follow(ballNode(), () => {
      const t = Math.min(1, (Clock.now() - t0) / ms)
      const p = to()
      return { x: from.x + (p.x - from.x) * t, y: from.y + (p.y - from.y) * t - Math.sin(t * Math.PI) * (last ? FLAT : LOB) }
    })
    Clock.after(ms, () => {
      stop()
      const p = to()
      Things.burst(p.x, p.y, last ? 8 : 6, 'drop', { height: 30, reach: 45, size: 4 }) // snow (game.css: .frozen .drop)
      Sound.plop()
      flight = null
      if (last && Snowman.stage === 'done') k.knockOff(1).then(done)
      else done()
    })
  }

  /** The boy's throw: to his place, a snowball packed, and thrown; the last
   * one goes flat into the snowman's head: he freezes, then laughs. */
  async function throwOne(last) {
    const k = Snowman.kit
    if (Snowman.stage !== 'done') return
    await k.go(k.at() - k.BOY_SIDE)
    Boy.face(1)
    await Boy.settle('crouch', 350)
    let landed = null
    const ball = ballNode(3) // a scoop of snow in his hands…
    let held = k.follow(ball, () => Boy.handAt('far'))
    const letGo = () => {
      held?.()
      held = null
    }
    await k.holding(letGo, async () => {
      for (let i = 1; i <= PATS; i++) {
        ball.setAttribute('r', (3 + ((BALL_R - 3) * i) / PATS).toFixed(1)) // …patted bigger and rounder
        Sound.scrape()
        await Boy.pause(PAT_MS)
      }
      await Boy.stand(300)
      await Boy.throw(() => {
        letGo() // out of his hand…
        fly(last) // …and into the air
        landed = flight.landed
      })
    })
    if (!last || !landed) return
    await landed
    await Boy.look({ o: 1, open: 0.6, brows: 1 }, FREEZE_MS) // oh!
    await Boy.laugh(5)
  }

  /** Waits for the boy to throw the next ball; null if he doesn't (cut short, dusk). */
  async function aThrow(after) {
    const mine = Reksio.kit.relaxes
    for (let t = 0; t < WAIT_MS && Reksio.kit.relaxes === mine; t += 100) {
      if (flight && flight.n > after) return flight
      await Reksio.kit.pause(100)
    }
    return null
  }

  /** Reksio's part: a bow (throw it!), a catch or two, and the one that hits the snowman. */
  async function snowballs() {
    const k = Snowman.kit
    const catches = CATCHES[Math.floor(random() * CATCHES.length)]
    Debug.trace('snowballs', { catches })
    if (!(await Reksio.walkTo(k.at() + k.R.base + CATCH_FROM))) return
    Reksio.face(-1)
    await Reksio.playBow()
    let f = null
    for (let i = 0; i <= catches; i++) {
      const last = i === catches
      const before = thrown
      k.boyDo('throws a snowball', () => throwOne(last))
      f = await aThrow(before)
      if (!f) return
      Reksio.kit.perk('both', 300)
      await Reksio.lookUp(Math.max(0, f.arrives - Clock.now() - SNAP_BEFORE_MS))
      if (last) break
      await Reksio.snap()
      await f.landed
      await Reksio.crossEyed(500) // right on his nose
      await Reksio.shake()
      if (i < catches - 1) await Reksio.playBow()
    }
    await f.landed
    if (Snowman.stage !== 'fallen') return
    await Reksio.startle()
    Reksio.face(-1) // at the boy: did we…?
    await Reksio.kit.faceTo({ o: 1, open: 0.4, lift: 1, brows: 0.6 }, 80)
    await Reksio.kit.pause(FREEZE_MS)
    await Reksio.kit.faceOff(200)
    await Reksio.hop(24, 1) // glad: it was funny
    if (!(await Reksio.walkTo(Reksio.x + WATCH_BACK))) return // out of the boy's way, to watch him mend it
    Reksio.face(-1)
    await Reksio.sit()
  }

  // ------------------------------------------------------------ the sparrow and the carrot

  /** Move the sparrow from `from` to `to` over ms: in an arc `lift` high,
   * bobbing `wobble` as it goes; each(x, y) after each step. Runs to the end
   * on its own: nothing cuts the sparrow short. */
  async function glide(s, from, to, ms, { lift = 0, wobble = 0, face = 1, each = () => {} } = {}) {
    const t0 = Clock.now()
    for (;;) {
      const k = Math.min(1, (Clock.now() - t0) / ms)
      const x = from.x + (to.x - from.x) * k
      const y = from.y + (to.y - from.y) * k - lift * Math.sin(Math.PI * k) + wobble * Math.sin(k * Math.PI * 7)
      perch(s, x, y, face)
      each(x, y)
      if (k >= 1) return
      await Clock.frame()
    }
  }

  function perch(s, x, y, face) {
    s.at = { x, y, face }
    s.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${face * s.size} ${s.size})`)
  }

  /** Where its beak is, in the scene (creatures.js draws it at 19, -15). */
  const beak = (s) => ({ x: s.at.x + s.at.face * 19 * s.size, y: s.at.y - 15 * s.size })

  /** The carrot, held by its tip at (x, y), its thick end trailing back and sagging by `sag` degrees. */
  function carrotAtTip(node, x, y, sag) {
    node.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${sag.toFixed(0)}) translate(-22 0)`)
  }

  /** The carrot lying in the snow at x, its tip stuck in, its top up. */
  function lay(x) {
    const k = Snowman.kit
    carrotAt = Math.min(Layout.MAX_X - 40, Math.max(Layout.MIN_X + 40, x))
    droppedAt = Clock.now()
    lying = k.carried('carrot')
    lying.setAttribute('transform', `translate(${carrotAt.toFixed(0)} ${k.GROUND - 8}) rotate(-25)`)
    k.layer().appendChild(lying)
    Debug.trace('carrot in the snow', { x: Math.round(carrotAt) })
  }

  /** The carrot let go at (x, y0): it tumbles down into the snow, and lies there. */
  async function fall(node, x, y0) {
    const k = Snowman.kit
    const t0 = Clock.now()
    for (;;) {
      const t = Math.min(1, (Clock.now() - t0) / FALL_MS)
      carrotAtTip(node, x + 22, y0 + (k.GROUND - 8 - y0) * t * t, 25 + 200 * t) // tumbling
      if (t >= 1) break
      await Clock.frame()
    }
    node.remove()
    lay(x)
    Sound.plop()
  }

  /** The sparrow's part, on its own: in, onto the cap, down to the carrot,
   * tugs it out, off with it, and drops it in the snow. Then away. */
  async function steal() {
    const k = Snowman.kit
    const fx = document.getElementById('fx')
    const s = Creatures.sparrow(fx)
    const head = { x: k.at(), y: k.headY() }
    const cap = { x: head.x, y: head.y - k.R.head - ON_CAP }
    const tip = { x: head.x + 40, y: head.y + 3 } // the carrot's tip (snowman.js ON_HEAD)
    const hover = { x: tip.x + HOVER.dx, y: tip.y + HOVER.dy }
    const drop = { x: head.x + DROPS_PAST, y: k.GROUND - CARRY_Y }
    let carried = null
    try {
      theft = 'coming'
      s.g.classList.add('flying')
      Sound.flutter()
      await glide(s, { x: head.x + COMES_FROM.dx, y: head.y + COMES_FROM.dy }, cap, LAND_MS, { lift: 40, face: -1 })
      s.g.classList.remove('flying')
      theft = 'on'
      Sound.chirp()
      for (const turn of [1, -1, 1]) { // looks about, and spots the carrot
        perch(s, cap.x, cap.y, turn)
        await Clock.wait(LOOK_MS)
      }
      s.g.classList.add('flying')
      await glide(s, cap, hover, 450, { lift: 14, face: -1 })
      const pulled = { x: hover.x + 9, y: hover.y }
      for (let i = 1; i <= TUGS; i++) {
        s.head.setAttribute('transform', 'rotate(20 6 -10)') // beak on it…
        await Clock.wait(TUG_MS * 0.6)
        await glide(s, hover, pulled, TUG_MS, { face: -1 }) // …and tug
        if (i === TUGS) break // out it comes
        await glide(s, pulled, hover, TUG_MS * 0.6, { face: -1 }) // stuck: back it springs
        s.head.setAttribute('transform', '')
        await Clock.wait(TUG_MS)
      }
      k.takeOff('carrot') // out it comes
      Sound.pop()
      theft = 'pulled'
      Debug.trace('sparrow steals the carrot', {})
      k.boyDo('sees the sparrow', seesIt)
      carried = k.carried('carrot')
      fx.appendChild(carried)
      const hold = () => {
        const b = beak(s)
        carrotAtTip(carried, b.x + 22 * s.at.face, b.y + 4, s.at.face > 0 ? 25 : 0) // in its beak by the tip, hanging
      }
      hold()
      await Clock.wait(GOT_IT_MS) // got it!
      await glide(s, { ...s.at }, drop, CARRY_MS, { lift: 40, wobble: 9, face: 1, each: hold }) // up, wobbly, over him
    } finally {
      // however it ends, the sparrow lets go and flies up and away, and the carrot falls into the snow
      const from = { ...(s.at ?? { ...drop, face: 1 }) }
      const y0 = s.at ? beak(s).y : drop.y
      s.head.setAttribute('transform', '')
      s.g.classList.add('flying')
      glide(s, from, { x: from.x + 600, y: 160 }, 1400, { lift: 60, face: 1 }).then(() => s.g.remove())
      if (carried) await fall(carried, from.x, y0)
      theft = carried ? 'dropped' : 'none'
    }
  }

  /** The boy sees it go: oh! and points after it. */
  async function seesIt() {
    Boy.face(1)
    await Boy.look({ o: 1, open: 0.5, brows: 1 }, 500)
    await Boy.point(1, 900)
  }

  /** Waits (looking up) until the sparrow's part is past `stage`; false if cut short. */
  async function until(done) {
    const mine = Reksio.kit.relaxes
    for (let t = 0; t < 12000 && !done(); t += 100) {
      if (Reksio.kit.relaxes !== mine) return false
      await Reksio.kit.pause(100)
    }
    return done()
  }

  /** Reksio's part: he watches it land, sees it pull the carrot out, turns
   * after it, and runs to fetch it back. */
  async function carrot() {
    if (!(await Reksio.walkTo(Snowman.kit.at() + Snowman.kit.R.base + CATCH_FROM))) return // back, to see it all: clear of the sparrow at the carrot
    Reksio.face(-1)
    Debug.ignoreCut(steal(), 'the sparrow') // its part runs on its own
    Reksio.kit.perk('both', 500)
    await Reksio.lookUp(LAND_MS)
    if (!(await until(() => theft !== 'coming'))) return
    await Reksio.sniff(1)
    if (!(await until(() => theft !== 'on'))) return
    await Reksio.startle()
    Reksio.face(1) // after it
    await Reksio.lookUp(CARRY_MS * 0.6)
    if (!(await until(() => carrotAt !== null))) return
    await fetchCarrot()
  }

  /** Over to the carrot in the snow, and back to the boy with it. */
  async function fetchCarrot() {
    const k = Snowman.kit
    if (carrotAt === null || fetching) return
    fetching = true
    let held = null
    let given = false
    try {
      const side = Reksio.x < carrotAt ? -1 : 1
      if (!(await Reksio.walkTo(carrotAt + side * 50))) return
      Reksio.face(-side)
      await Reksio.sniff(1)
      await Reksio.nod(24, 400)
      lying.remove()
      lying = null
      carrotAt = null
      held = k.follow(k.carried('carrot'), () => {
        const m = Reksio.mouth()
        return { x: m.x, y: m.y + 4 }
      })
      Reksio.kit.perk('both', 600)
      if (!(await k.giveToBoy())) return
      held()
      held = null
      given = true
      k.boyDo('puts the carrot back', async () => {
        try {
          await k.takeAndPut('carrot')
        } finally {
          if (!Snowman.has.carrot) lay(Boy.x + Boy.facing * 30) // cut short (dusk): dropped in the snow, not gone
        }
      })
      await Reksio.hop()
    } finally {
      fetching = false
      if (held) {
        held()
        lay(Reksio.mouth().x) // dropped where he was: there to fetch another time
      }
      if (given) theft = 'none'
    }
  }

  const PLAYS = { snowballs, carrot }

  /** A tap on the finished snowman: its carrot back if it lies in the snow,
   * or the next thing from the pool (the sparrow only while it has its carrot). */
  function run() {
    if (carrotAt !== null) return fetchCarrot()
    let what = next()
    if (what === 'carrot' && !Snowman.has.carrot) what = 'snowballs'
    Debug.trace('snow play', { what })
    return PLAYS[what]()
  }

  return {
    run,
    /** Left alone, the carrot lying in the snow a while: go for it? */
    helpDue: () => carrotAt !== null && !fetching && Boy.out && Clock.now() - droppedAt > FETCH_AFTER_MS,
    fetchCarrot,
  }
})()
