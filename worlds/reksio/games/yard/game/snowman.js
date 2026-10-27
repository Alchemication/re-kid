// The snowman (a winter play; invented, Adam's idea, 2026-10-26, with the
// boy from the films: Kompan 1976). Some way into the morning the boy comes
// out from behind the house and rolls a snowman: a big ball pushed along
// until it is as big as it gets, a middle one lifted onto it, a head patted
// together and heaved on top. Then he calls Reksio ("come here!", patting his
// knees) and waits for a face and arms. The child chooses: a tap on the
// stones poking out of the snow, or on the stick, and Reksio digs them out
// or picks it up and brings it over; the boy puts in the eyes, and snaps the
// stick over his knee for two arms. Left alone a while, Reksio goes for the
// next one himself.
//
// Then the boy touches his own nose: a nose! Reksio has an idea, runs to his
// doghouse and brings his bone, and the boy puts it in. He steps back, looks,
// and laughs (the joke: a snowman with a bone for a nose), tosses the bone
// back by the doghouse, goes in, and comes out with a carrot. Last, he takes
// off his own cap and puts it on the snowman's head, his curls springing up,
// and cheers. The snowman stays for the rest of the play: a tap on it and
// Reksio comes to sniff it and look up at it.
//
// Everything is in scene units, in the #snowman layer among the things. The
// boy's part runs on his own (Boy, boy.js), one step at a time in a queue;
// Reksio's part is a thing (stones, stick, snowman) or a left-alone move
// (help), each cut short by a tap like any other.

/* global Clock, Debug, Layout, Sound, Music, Reksio, Boy, BoyFigure */
/* exported Snowman */
const Snowman = (() => {
  const GROUND = 812
  const AT_S = [20, 45] // the boy comes out this long into a winter play
  const R = { base: 76, middle: 54, head: 38 } // the balls' radii as finished: nearly as tall as the boy
  const SINK = 8 // each ball sits this far into the one under it
  const HOUSE_X = 230 // he comes out from behind the house, here (its wall is at 310)
  const BOY_SIDE = 125 // he stands this far left of the snowman's middle, facing it
  const GIVE_FROM = 125 // Reksio brings things to this far left of the boy
  const PUSH_SPEED = 70 // pushing a ball along, slowly
  const HAND_REACH = 30 // a ball he holds sits this far ahead of his hands
  const HELP_AFTER_MS = 9000 // asked and left alone this long, Reksio goes for the next thing himself
  const IDEA_AFTER_MS = 1500 // the boy touched his nose: Reksio has his idea after this long
  const CARROT_FETCH_MS = 2500 // inside, finding a carrot
  const STAY_MS = 15000 // done, he admires it this long, then goes in
  const SPOT_ROOM = 70 // a pile or the stick wants this much clear ground either side
  const PIECES = ['eyes', 'arms'] // what Reksio brings, the child's choice of order
  const PILE = { eyes: 'stones', arms: 'stick' } // where each comes from (a thing to tap)
  const FETCH_FROM = 60 // he stands this far left of a pile to pick from it
  const ROLL_LEFT = 300 // the base is rolled from this far left of where it ends up…
  const ROLL_RIGHT = 420 // …and the middle ball from this far right
  const FIRST_X = 560 // the snowman's rolling starts no nearer the house than this: past the doghouse
  const GREET_FROM = 300 // the boy out and Reksio further off than this: left alone, he runs over to him
  const GREET_AT = 170 // he sits this far from the boy to watch
  const BONE_FROM = 90 // he puts his head in at the doghouse door from this far left of it
  const TOSS_PAST_DOOR = 80 // the bone lands this far right of the door

  const SVG_NS = 'http://www.w3.org/2000/svg'
  const $ = (id) => document.getElementById(id)
  const random = Debug.random('snowman') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
    parent.appendChild(n)
    return n
  }

  // where: worked out at load (where), drawn at init
  let S = 1500 // the snowman's middle
  let stonesX = 1000
  let stickX = 2000
  // the story so far: none, rolling, asking, nose, carrot, hat, done
  let stage = 'none'
  const has = { eyes: false, arms: false, bone: false, carrot: false, hat: false }
  let askedAt = 0 // when the boy asked for what he's waiting for
  let fetching = null // what Reksio is bringing, if anything
  let greeted = false // Reksio has run over to the boy (once a play)
  const handed = new Set() // what Reksio has given the boy, before (or after) it's on the snowman: not to be fetched again
  let doghouse = () => 560 // its door's x: the game says (init)
  let isEnded = () => false
  let layer = null
  let g = {} // the drawing's parts

  // ------------------------------------------------------------ where

  /** Clear ground from x0 to x1: no puddle (ice) in it. */
  const clear = (x0, x1) => !Layout.puddles.some((p) => p.x + p.rx > x0 && p.x - p.rx < x1)

  /** A place `half` wide either side, inside a gap and clear, nearest the
   * gap's middle; null if none. */
  function spotIn([a, b], half) {
    const mid = (a + b) / 2
    for (let d = 0; d < (b - a) / 2; d += 20) {
      for (const x of [mid - d, mid + d]) if (x - half >= a && x + half <= b && clear(x - half, x + half)) return x
    }
    return null
  }

  /** The snowman in the first free place out from the house with room to
   * roll its balls either side (so the boy is soon out to it, and in view),
   * the stones and the stick in the gaps nearest it. */
  function where() {
    const byX = [...Layout.gaps].sort((p, q) => p[0] - q[0])
    const fits = (x) => x !== null && x - ROLL_LEFT >= FIRST_X && x + ROLL_RIGHT <= Layout.MAX_X
    const i = byX.findIndex((gap) => fits(spotIn(gap, R.base + 10)))
    S = i >= 0 ? spotIn(byX[i], R.base + 10) : FIRST_X + ROLL_LEFT
    const others = byX.filter((_, j) => j !== i).map((gap) => spotIn(gap, SPOT_ROOM)).filter((x) => x !== null && Math.abs(x - S) > R.base + SPOT_ROOM + BOY_SIDE)
    others.sort((p, q) => Math.abs(p - S) - Math.abs(q - S))
    ;[stonesX, stickX] = [others[0] ?? S - 420, others[1] ?? S + 420].sort((p, q) => p - q)
  }

  // ------------------------------------------------------------ drawing

  /** A soft shadow inside a ball's lower right edge, so it reads round. */
  const shade = (r) => `M${(r * 0.78).toFixed(1)} ${(-r * 0.15).toFixed(1)} A${(r * 0.8).toFixed(1)} ${(r * 0.8).toFixed(1)} 0 0 1 ${(-r * 0.15).toFixed(1)} ${(r * 0.78).toFixed(1)}`

  function ball(r, parent = g.balls) {
    const b = el('g', { class: 'snowball' }, parent)
    el('circle', { class: 'snow-ball', r }, b)
    el('path', { class: 'snow-curl', d: shade(r) }, b)
    return { g: b, r, x: 0, y: 0, turn: 0 }
  }

  function setBall(b, x, y, r = b.r) {
    b.x = x
    b.y = y
    if (r.toFixed(1) !== b.r.toFixed(1)) {
      b.g.firstChild.setAttribute('r', r.toFixed(1))
      b.g.lastChild.setAttribute('d', shade(r))
    }
    b.r = r
    const at = `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${b.turn.toFixed(0)})`
    if (at !== b.at) b.g.setAttribute('transform', (b.at = at))
  }

  const top = (name) => GROUND - 2 * R.base + SINK - (name === 'head' ? 2 * R.middle - SINK + R.head : R.middle)
  const headY = () => top('head')

  function drawPieces() {
    // the stones poking out of the snow
    g.stones = el('g', { class: 'thing', 'data-thing': 'stones', transform: `translate(${stonesX} ${GROUND})` }, layer)
    el('circle', { class: 'hit', cx: 0, cy: -16, r: 44 }, g.stones)
    for (const [x, y, rx] of [[-14, -4, 9], [2, -6, 10], [16, -3, 8]]) el('ellipse', { class: 'stone', cx: x, cy: y, rx, ry: rx * 0.7 }, g.stones)
    el('path', { class: 'snow-drift', d: 'M-30 2 Q-14 -6 0 -1 Q14 -7 30 2 Z' }, g.stones)
    // the stick, lying in the snow
    g.stick = el('g', { class: 'thing', 'data-thing': 'stick', transform: `translate(${stickX} ${GROUND})` }, layer)
    el('circle', { class: 'hit', cx: 0, cy: -16, r: 50 }, g.stick)
    el('path', { class: 'stick', d: STICK }, g.stick)
    g.balls = el('g', { class: 'thing', 'data-thing': 'snowman' }, layer)
    g.face = el('g', {}, layer) // what goes on the snowman, over its balls
  }
  const STICK = 'M-40 -4 L40 -9 M10 -7 L22 -20 M-18 -5 L-28 -15'
  const STONE = (x, y) => `<ellipse class="stone" cx="${x}" cy="${y}" rx="5" ry="4" />`
  const BONE = (d) => `<path class="bone" d="${d}" /><path class="bone-white" d="${d}" />` // ink under, white over
  /** What the boy holds, in his hand, until the returned stop(). */
  const inHand = (what) => follow(carried(what), () => Boy.handAt('far'))

  /** Something carried (in Reksio's mouth, or the boy's hand): it follows `at()` each frame until stop(). */
  function follow(node, at) {
    $('fx').appendChild(node) // in front of the things
    let shown = ''
    const place = () => {
      const p = at()
      const now = `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`
      if (now !== shown) node.setAttribute('transform', (shown = now))
    }
    place()
    const stop = Clock.every(0, place)
    return () => {
      stop()
      node.remove()
    }
  }

  function carried(what) {
    const n = document.createElementNS(SVG_NS, 'g')
    if (what === 'eyes') n.innerHTML = STONE(-5, 0) + STONE(6, 1)
    if (what === 'arms') n.innerHTML = `<path class="stick" d="${STICK}" transform="scale(0.8)" />`
    if (what === 'bone') n.innerHTML = BONE('M-14 0 H14 M-18 -5 a5 5 0 1 0 0 10 M18 -5 a5 5 0 1 1 0 10')
    if (what === 'carrot') n.innerHTML = '<path class="carrot" d="M-4 -6 L22 0 L-4 6 Z" /><path class="carrot-top" d="M-4 -3 l-8 -6 M-4 0 l-10 0 M-4 3 l-8 6" />'
    return n
  }

  /** The snowman gets a piece. */
  function put(what) {
    has[what] = true
    const h = headY()
    const mid = top('middle')
    const parts = {
      eyes: `${STONE(S - 10, h - 6)}${STONE(S + 12, h - 7)}`,
      arms: `<path class="stick" d="M${S - R.middle + 6} ${mid - 6} L${S - R.middle - 46} ${mid - 34} M${S - R.middle - 30} ${mid - 24} l-6 -16" /><path class="stick" d="M${S + R.middle - 6} ${mid - 6} L${S + R.middle + 46} ${mid - 36} M${S + R.middle + 30} ${mid - 26} l8 -14" />`,
      bone: `<g data-piece="bone">${BONE(`M${S + 18} ${h + 2} H${S + 50} M${S + 54} ${h - 4} a5 5 0 1 1 0 10`)}</g>`,
      carrot: `<path class="carrot" d="M${S + 14} ${h - 4} L${S + 52} ${h + 4} L${S + 14} ${h + 8} Z" />`,
    }
    if (what === 'hat') {
      // the boy's own cap, as he wore it (boyfigure.js), on its head
      const cap = BoyFigure.cap(g.face)
      cap.setAttribute('transform', `translate(${S} ${h - R.head + 46}) scale(0.62)`)
    } else g.face.insertAdjacentHTML('beforeend', parts[what])
    Sound.plop()
    Debug.trace('snowman gets', { what })
  }

  function takeOff(what) {
    has[what] = false
    g.face.querySelector(`[data-piece="${what}"]`)?.remove()
  }

  // ------------------------------------------------------------ the boy's part

  let queue = Promise.resolve()
  /** One step of the boy's part after another, never two at once. */
  const boyDo = (what, fn) => (queue = queue.then(() => Debug.ignoreCut(fn(), `boy ${what}`)))

  const cutShort = () => Object.assign(new Error('cut short'), { name: 'AbortError' })

  /** He walks there, or (sent in at dusk, or stopped) the step he is on ends here. */
  async function go(x, opts) {
    if (!(await Boy.walkTo(x, opts)) || stage === 'evening') throw cutShort()
  }

  /** Do fn while something follows him (a ball in his hands, what he carries); it stops however fn ends. */
  async function holding(stop, fn) {
    try {
      return await fn()
    } finally {
      stop()
    }
  }

  /** Push a ball along to `to` (its middle), growing to r as it goes. */
  async function roll(b, from, to, r0, r) {
    const dir = Math.sign(to - from)
    const ahead = (rr) => dir * (HAND_REACH + rr) // the ball's middle, from the boy
    await go(from - ahead(r0))
    Boy.face(dir)
    await Boy.settle('push', 400)
    const trail = el('rect', { class: 'trail', x: from, y: GROUND - 6, width: 0, height: 12, rx: 6 }, g.balls)
    g.balls.prepend(trail) // the grass showing where it rolled, under the balls
    setBall(b, from, GROUND - r0, r0)
    const pushing = Clock.every(0, () => {
      const k = Math.min(1, Math.abs(Boy.x + ahead(b.r) - from) / Math.abs(to - from))
      const rr = r0 + (r - r0) * k
      b.turn += dir * 4
      setBall(b, Boy.x + ahead(rr), GROUND - rr, rr)
      trail.setAttribute('x', (Math.min(from, b.x) - 10).toFixed(0))
      trail.setAttribute('width', (Math.abs(b.x - from) + 20).toFixed(0))
    })
    Sound.scrape()
    await holding(pushing, () => go(to - ahead(r), { speed: PUSH_SPEED }))
    setBall(b, to, GROUND - r, r)
    await Boy.stand()
  }

  /** A ball in his hands: it follows them until the returned stop(). */
  const inHands = (b) => Clock.every(0, () => {
    const h = Boy.handAt('far')
    setBall(b, h.x + Boy.facing * (b.r * 0.6), h.y - b.r * 0.4)
  })

  /** Into place, over a moment. */
  async function settleBall(b, x, y) {
    const [x0, y0] = [b.x, b.y]
    const t0 = Clock.now()
    for (;;) {
      const k = Math.min(1, (Clock.now() - t0) / 350)
      setBall(b, x0 + (x - x0) * k, y0 + (y - y0) * k)
      if (k >= 1) break
      await Clock.frame()
    }
    Sound.plop()
  }

  /** Cut short at dusk, a ball he was holding or pushing drops where it is, on the ground. */
  const drop = (b) => setBall(b, b.x, GROUND - b.r)

  async function build() {
    stage = 'rolling'
    Debug.trace('snowman begins', { x: Math.round(S) })
    Boy.comeOut(HOUSE_X, 1)
    const base = ball(R.base * 0.2)
    const middle = ball(R.middle * 0.25)
    middle.g.style.display = 'none'
    const head = ball(4)
    head.g.style.display = 'none'
    try {
      await roll(base, S - ROLL_LEFT + 40, S, R.base * 0.2, R.base)
      // the middle ball, from the other side, then lifted on
      middle.g.style.display = ''
      await roll(middle, S + ROLL_RIGHT - 90, S + 150, R.middle * 0.25, R.middle)
      await go(S + 150 + HAND_REACH + R.middle + 10)
      Boy.face(-1)
      await Boy.settle('crouch', 400)
      await holding(inHands(middle), async () => {
        await Boy.settle('lift', 600)
        await go(S + R.base + HAND_REACH + 20)
      })
      await settleBall(middle, S, top('middle'))
      await Boy.stand()
      // the head: patted together in his hands, and heaved on top
      await go(S + 160)
      Boy.face(-1)
      await Boy.settle('crouch', 400)
      head.g.style.display = ''
      await holding(inHands(head), async () => {
        for (let r = 6; r <= R.head; r += 5) {
          setBall(head, head.x, head.y, r)
          Sound.scrape()
          await Boy.pause(220)
        }
        await Boy.settle('heave', 600)
        await go(S + R.middle + HAND_REACH + 34)
      })
      await settleBall(head, S, headY())
      await Boy.stand()
    } catch (e) {
      ;[base, middle, head].forEach(drop) // the evening came: left as they are, on the ground
      throw e
    }
    built()
  }

  /** Built (by him, or at once for ?snowman=built): he asks Reksio for a face and arms. */
  function built() {
    if (stage === 'rolling' || stage === 'none') stage = 'asking'
    askedAt = Clock.now()
    Debug.trace('snowman built', {})
    boyDo('ask', ask)
  }

  /** "Come here, Reksio!": where he waits, facing Reksio, calling. */
  async function ask() {
    await go(S - BOY_SIDE)
    Boy.face(Reksio.x > Boy.x ? 1 : -1)
    await Boy.call(3)
    Boy.face(1)
    askedAt = Clock.now()
  }

  /** He takes what Reksio brought and puts it in. */
  async function takeAndPut(what) {
    if (stage === 'evening') return
    Boy.face(-1)
    await Boy.settle('crouch', 350)
    await holding(inHand(what), async () => {
      await Boy.stand(350)
      Boy.face(1)
      if (what === 'arms') {
        // over his knee: snap
        await Boy.settle('crouch', 250)
        Sound.snap()
        await Boy.stand(250)
      }
      await Boy.reach(300)
    })
    put(what)
    await Boy.look({ smile: 1 }, 500)
    askedAt = Clock.now()
    if (stage === 'asking' && PIECES.every((p) => has[p])) {
      stage = 'nose'
      Debug.trace('snowman wants a nose', {})
      await Boy.touchNose(1100)
      askedAt = Clock.now()
    }
  }

  /** The bone for a nose: he looks, laughs, tosses it back, and fetches a carrot. */
  async function boneNose() {
    if (stage === 'evening') return
    Boy.face(-1)
    await Boy.settle('crouch', 350)
    await holding(inHand('bone'), async () => {
      await Boy.stand(350)
      Boy.face(1)
      await Boy.reach(300)
    })
    put('bone')
    stage = 'carrot' // a nose, of a sort: Reksio has done his part
    await go(S - BOY_SIDE - 60)
    Boy.face(1)
    await Boy.look({ o: 1, open: 0.5, brows: 1 }, 600) // a bone?
    await Boy.laugh(5)
    await go(S - BOY_SIDE)
    await Boy.reach(250)
    takeOff('bone')
    Boy.face(-1)
    await toss()
    await go(HOUSE_X)
    Boy.goIn()
    await Boy.pause(CARROT_FETCH_MS)
    if (isEnded() || stage === 'evening') return
    Boy.comeOut(HOUSE_X, 1)
    await holding(inHand('carrot'), async () => {
      await go(S - BOY_SIDE)
      Boy.face(1)
      await Boy.reach(300)
    })
    put('carrot')
    await Boy.nod()
    await capOn()
  }

  /** Last, his own cap on its head; a cheer, and he admires it a while. */
  async function capOn() {
    stage = 'hat'
    await Boy.settle('heave', 400)
    Boy.capOff(true)
    put('hat')
    await Boy.stand()
    stage = 'done'
    Debug.trace('snowman done', {})
    Music.react.done()
    await Boy.cheer()
    await Boy.wave(2)
    await Boy.pause(STAY_MS)
    await go(HOUSE_X)
    Boy.goIn()
  }

  /** The bone, tossed back by his doghouse: an arc, then it's gone. */
  async function toss() {
    await Boy.settle('lift', 200)
    Sound.toss()
    const from = Boy.handAt('far')
    const to = { x: doghouse() + TOSS_PAST_DOOR, y: GROUND - 6 }
    const t0 = Clock.now()
    const flying = follow(carried('bone'), () => {
      const k = Math.min(1, (Clock.now() - t0) / 900)
      return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 160 }
    })
    await holding(flying, async () => {
      await Boy.stand(300)
      await Boy.pause(1400)
    })
  }

  // ------------------------------------------------------------ Reksio's part

  /** Bring `what` (eyes: the stones; arms: the stick) to the boy. */
  async function fetch(what) {
    const pile = g[PILE[what]]
    fetching = what
    let stop = null
    let given = false
    Debug.trace('fetches for the snowman', { what })
    try {
      Reksio.face(1)
      await Reksio.sniff(1)
      if (what === 'eyes') {
        Sound.dig()
        await Reksio.paddle(800)
      }
      await Reksio.nod(24, 400)
      pile.style.display = 'none'
      stop = follow(carried(what), () => {
        const m = Reksio.mouth()
        return { x: m.x, y: m.y + 4 }
      })
      Reksio.kit.perk('both', 600)
      if (!(await giveToBoy())) return
      stop()
      stop = null
      given = true
      handed.add(what)
      boyDo(`puts ${what}`, () => takeAndPut(what))
      await Reksio.hop()
    } finally {
      fetching = null
      if (!given) {
        stop?.()
        pile.style.display = '' // dropped on the way: back where it was, to fetch another time
      }
    }
  }

  /** Over to the boy, facing him, and wait for his hands to be free; false if cut short. */
  async function giveToBoy() {
    const mine = Reksio.kit.relaxes
    const waiting = () => Boy.out && stage !== 'evening' // the boy still there for it
    if (!(await Reksio.walkTo(S - BOY_SIDE - GIVE_FROM)) || !waiting()) return false
    Reksio.face(1)
    for (let i = 0; i < 40 && (Boy.busy || Boy.walking); i++) await Reksio.kit.pause(150)
    if (Reksio.kit.relaxes !== mine || !waiting() || Boy.busy || Boy.walking) return false
    await Reksio.nod(22, 450)
    return Reksio.kit.relaxes === mine && waiting()
  }

  /** His idea: his own bone, from the doghouse, for a nose. */
  async function fetchBone() {
    fetching = 'bone'
    let given = false
    Debug.trace('brings his bone for a nose', {})
    try {
      await Reksio.puzzled()
      Reksio.kit.perk('both', 800)
      if (!(await Reksio.walkTo(doghouse() - BONE_FROM))) return
      Reksio.face(1)
      await Reksio.nod(30, 500) // in at the doghouse door…
      Reksio.holdBone(true) // …and out with his bone
      await Reksio.showOff()
      if (!(await giveToBoy())) return
      Reksio.holdBone(false)
      given = true
      handed.add('bone')
      boyDo('bone nose', boneNose)
      await Reksio.hop()
    } finally {
      fetching = null
      if (!given) Reksio.holdBone(false)
    }
  }

  /** Does the boy still want this piece, and is Reksio free to bring it? */
  const wanted = (what) => stage === 'asking' && !handed.has(what) && !fetching && !isEnded() && Boy.out

  /** What Reksio should go for next, if the boy is waiting: a piece, or his bone. */
  function next() {
    if (fetching || isEnded() || !Boy.out) return null
    if (stage === 'asking') return PIECES.find(wanted) ?? null
    if (stage === 'nose' && !handed.has('bone')) return 'bone'
    return null
  }

  /** The boy is out: over to him, ears up, and sit to watch. */
  async function greet() {
    greeted = true
    Debug.trace('runs to the boy', {})
    Reksio.kit.perk('both', 800)
    const side = Reksio.x < Boy.x ? -1 : 1
    if (!(await Reksio.walkTo(Boy.x + side * GREET_AT))) return
    Reksio.face(-side)
    await Reksio.hop()
    await Reksio.sit()
  }

  /** At the snowman, when there's nothing to bring: a sniff, a look up at it. */
  async function admire() {
    await Reksio.sniff(2)
    await Reksio.lookUp(1200)
    if (stage === 'done') await Reksio.aww()
  }

  /** A pile to fetch from, for a piece: tapped, he brings it if the boy still wants it. */
  const pileThing = (what, x) => ({ at: () => x() - FETCH_FROM, face: 1, run: () => fetch(what), ready: () => wanted(what) })
  const things = {
    stones: pileThing('eyes', () => stonesX),
    stick: pileThing('arms', () => stickX),
    snowman: {
      at: () => S - R.base - 70,
      face: 1,
      run: () => (next() === 'bone' ? fetchBone() : admire()),
      ready: () => stage !== 'none' && stage !== 'rolling',
    },
  }

  // ------------------------------------------------------------ setup

  function init({ ended, door }) {
    isEnded = ended
    doghouse = () => door.x
    layer = $('snowman')
    where()
    if (Layout.season !== 'winter') return // no snowman, and no boy out to make it
    drawPieces()
    Boy.init({ parent: $('boy-layer'), winter: true, watch: () => Reksio.x })
    if (Layout.snowmanAt === 'built') return builtAtOnce()
    Clock.after((Layout.snowmanAt ?? rnd(...AT_S)) * 1000, () => isEnded() || boyDo('build', build))
  }

  /** ?snowman=built: there already, the boy beside it (tests, and a quick look). */
  function builtAtOnce() {
    const base = ball(R.base)
    setBall(base, S, GROUND - R.base)
    setBall(ball(R.middle), S, top('middle'))
    setBall(ball(R.head), S, headY())
    Boy.comeOut(S - BOY_SIDE - 200, 1)
    built()
  }

  /** At dusk he goes in, whatever he was doing. */
  function evening() {
    if (stage === 'none') return
    if (stage !== 'done') stage = 'evening'
    if (!Boy.out) return // inside (for the carrot): he stays in
    Boy.relax() // whatever he was doing
    boyDo('in for the evening', async () => {
      await Boy.walkTo(HOUSE_X)
      Boy.goIn()
    })
  }

  return {
    things,
    init,
    evening,
    /** Left alone, the boy just out and far off: run over to him? */
    greetDue: () => !greeted && Boy.out && stage === 'rolling' && Math.abs(Boy.x - S) < ROLL_RIGHT && Math.abs(Reksio.x - Boy.x) > GREET_FROM, // at the snowman, not on his way
    greet,
    /** Left alone, is it time he went for the next thing himself? */
    helpDue: () => next() !== null && Clock.now() - askedAt > (next() === 'bone' ? IDEA_AFTER_MS : HELP_AFTER_MS) && !Boy.busy,
    /** Go for it. */
    help() {
      const what = next()
      if (what === 'bone') return fetchBone()
      return what && Reksio.walkTo(things[PILE[what]].at()).then((ok) => ok && next() === what && fetch(what))
    },
    get stage() { return stage },
    get has() { return { ...has } },
    /** Where its action spot is (spots.js). */
    spotX: (name) => ({ stones: stonesX - 30, stick: stickX - 30, snowman: S - R.base - 30 })[name],
  }
})()
