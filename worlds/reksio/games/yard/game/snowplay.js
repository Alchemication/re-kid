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

/* global Clock, Debug, Idle, Sound, Reksio, Boy, Snowman, Things */
/* exported SnowPlay */
const SnowPlay = (() => {
  const BALL_R = 13 // a snowball, packed in his hands: big enough to follow in the air (Adam, 2026-10-27: 9 was too small)
  const PATS = 4 // he pats it up from a pinch of snow to its size in this many pats…
  const PAT_MS = 260 // …each this long
  const CATCH_FROM = 170 // Reksio backs off this far right of the snowman's base to catch: room for the lob, and for its head to land short of him
  const LOB_MS = 800 // a lobbed snowball's flight, boy to Reksio
  const LOB = 130 // how high it arcs: over the snowman's head
  const FLAT_MS = 380 // the last throw, flat and fast…
  const FLAT = 12 // …and hardly arcing: into the snowman's head
  const CATCHES = [1, 2] // how many he catches before the one that hits it
  const SNAP_BEFORE_MS = 200 // he snaps this long before the ball reaches his mouth
  const WAIT_MS = 8000 // waiting for the boy to throw, he gives up after this long
  const WATCH_BACK = 90 // then he steps back this far to watch the boy mend it
  const FREEZE_MS = 1000 // after the head flies off, both stand frozen this long

  const SVG_NS = 'http://www.w3.org/2000/svg'
  const random = Debug.random('snowplay') // this part's own random stream (debug.js)
  const next = Idle.pool(['snowballs'], random)
  let flight = null // the snowball in the air: { n, arrives, landed }
  let thrown = 0 // throws so far, so Reksio knows a new one from the last

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

  const PLAYS = { snowballs }

  /** A tap on the finished snowman: the next thing from the pool. */
  function run() {
    const what = next()
    Debug.trace('snow play', { what })
    return PLAYS[what]()
  }

  return { run }
})()
