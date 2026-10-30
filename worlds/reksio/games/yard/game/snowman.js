// The snowman (a winter play; invented, Adam's idea, 2026-10-26, with the
// boy from the films: Kompan 1976). Some way into the morning the boy comes
// out from behind the house and rolls a snowman: a big ball pushed along
// until it is as big as it gets, a middle one lifted onto it, a head patted
// together and heaved on top. Then he calls Reksio ("come here!", patting his
// knees) and stands by it, at a loss: he scratches his curls, shakes his
// head. A tap on him or on the snowman, and Reksio runs for something: a
// stick (the boy snaps it over his knee for two arms), stones dug out of the
// snow for eyes, in an order of the play's own. Left alone a while, Reksio
// goes for the next one himself.
//
// Then the boy touches his own nose: a nose! At the next tap Reksio brings
// his bone from the doghouse, and the boy puts it in. He steps back, looks,
// and laughs (the joke: a snowman with a bone for a nose), tosses the bone
// back by the doghouse, goes in, and comes out with a carrot. Last, he takes
// off his own cap and puts it on the snowman's head, his curls springing up,
// and cheers. He stays out with it until dusk.
//
// A tap on the finished snowman, and something happens around it, a
// different thing each time (snowplay.js). If its head is knocked off, it
// breaks in the snow, and the boy gathers it up, pats a new head together and
// puts it back, with its eyes, its carrot and his cap.
//
// Everything is in scene units, in the #snowman layer among the things. The
// boy's part runs on his own (Boy, boy.js), one step at a time in a queue;
// Reksio's part is a thing (the snowman, or the boy beside it) or a
// left-alone move (help), each cut short by a tap like any other.

/* global Clock, Debug, Layout, Sound, Music, Reksio, Boy, BoyFigure, SnowPlay */
/* exported Snowman */
const Snowman = (() => {
  const GROUND = 812
  const AT_S = [20, 45] // the boy comes out this long into a winter play
  const R = { base: 58, middle: 41, head: 29 } // the balls' radii as finished: up to the boy's chin
  const SINK = 6 // each ball sits this far into the one under it
  const HOUSE_X = 230 // he comes out from behind the house, here (its wall is at 310)
  const BOY_SIDE = 95 // he stands this far left of the snowman's middle, facing it
  const LEFT_ROOM = 210 // its middle is this far into its ground (layout.js keeps it clear): the boy on its left (Adam, 2026-10-27: it was crammed against the doghouse)
  const GIVE_FROM = 115 // Reksio brings things to this far left of the boy
  const PUSH_SPEED = 70 // pushing a ball along, slowly
  const HAND_REACH = 22 // a ball he holds sits this far ahead of his hands
  const HELP_AFTER_MS = 9000 // asked and left alone this long, Reksio goes for the next thing himself
  const IDEA_AFTER_MS = 4000 // the boy touched his nose: left alone, Reksio has his idea after this long
  const CARROT_FETCH_MS = 2500 // inside, finding a carrot
  const WONDER_MS = 2500 // waiting by it, the boy may scratch his head (or, done, look it over) this often
  const SPOT_ROOM = 70 // a pile or the stick wants this much clear ground either side
  const PILE = { eyes: 'stones', arms: 'stick' } // where each comes from
  const FETCH_FROM = 60 // he stands this far left of a pile to pick from it
  const ROLL_LEFT = 300 // the base is rolled from this far left of where it ends up…
  const ROLL_RIGHT = 420 // …and the middle ball from this far right
  const FIRST_X = 560 // its base is rolled from no nearer the house than this: the doghouse
  const GREET_FROM = 300 // the boy out and Reksio further off than this: left alone, he runs over to him
  const GREET_AT = 170 // he sits this far from the boy to watch
  const BONE_FROM = 90 // he puts his head in at the doghouse door from this far left of it
  const TOSS_PAST_DOOR = 80 // the bone lands this far right of the door
  const AT_RIGHT = 75 // Reksio stands this far right of its base, facing it
  const KNOCKED_MS = 520 // its head, knocked off, flying to the ground
  const KNOCKED_TO = 95 // …landing this far from its middle
  const CAP_ON = { y: 44, scale: 0.47 } // the boy's cap on its head: down from its top, and how big (boyfigure.js draws it for him)

  const SVG_NS = 'http://www.w3.org/2000/svg'
  const $ = (id) => document.getElementById(id)
  const random = Debug.random('snowman') // this part's own random stream (debug.js)
  const mind = Debug.random('snowman-boy') // the boy's idle ways, drawn now and then: their own stream
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
  // what Reksio brings, in this play's order (a tap, or left alone, brings the next)
  const PIECES = random() < 0.5 ? ['arms', 'eyes'] : ['eyes', 'arms']
  // the story so far: none, rolling, asking, nose, carrot, hat, done, fallen (its head knocked off), evening
  let stage = 'none'
  const has = { eyes: false, arms: false, bone: false, carrot: false, hat: false }
  let askedAt = 0 // when the boy asked for what he's waiting for
  let fetching = null // what Reksio is bringing, if anything
  let greeted = false // Reksio has run over to the boy (once a play)
  const handed = new Set() // what Reksio has given the boy, before (or after) it's on the snowman: not to be fetched again
  let doghouse = () => 560 // its door's x: the game says (init)
  let isEnded = () => false
  let layer = null
  let headBall = null // the head ball, once it's on: it can fall
  let fallenAt = 0 // where it broke
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

  /** The snowman on its own ground (layout.js keeps it, first out from the
   * house); the stones and the stick in the gaps nearest it. */
  function where() {
    S = Layout.FOOTPRINTS.snowman[0] + Layout.x('snowman') + LEFT_ROOM
    const others = Layout.gaps.map((gap) => spotIn(gap, SPOT_ROOM)).filter((x) => x !== null)
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
    // the stones poking out of the snow, and a stick: Reksio's to fetch
    g.stones = el('g', { transform: `translate(${stonesX} ${GROUND})` }, layer)
    for (const [x, y, rx] of [[-14, -4, 9], [2, -6, 10], [16, -3, 8]]) el('ellipse', { class: 'stone', cx: x, cy: y, rx, ry: rx * 0.7 }, g.stones)
    el('path', { class: 'snow-drift', d: 'M-30 2 Q-14 -6 0 -1 Q14 -7 30 2 Z' }, g.stones)
    // the stick, lying in the snow
    g.stick = el('g', { transform: `translate(${stickX} ${GROUND})` }, layer)
    el('path', { class: 'stick', d: STICK }, g.stick)
    // the snowman, and the boy standing by it: one thing to tap
    g.balls = el('g', { class: 'thing', 'data-thing': 'snowman', 'data-hint-y': GROUND - 2 * R.base - 2 * R.middle }, layer)
    el('rect', { class: 'hit', x: S - BOY_SIDE - 50, y: GROUND - 330, width: BOY_SIDE + 50 + R.base + 20, height: 330 }, g.balls)
    g.head = el('g', {}, layer) // its head ball and what's on it: it can fall
    g.face = el('g', {}, layer) // its arms, over its balls
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

  /** Carried in his teeth (Reksio.inMouth) until stop(), which takes it away. */
  function inTeeth(node) {
    Reksio.inMouth(node)
    return () => {
      Reksio.inMouth(null)
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

  /** What goes on its head, drawn about the head's middle. */
  const ON_HEAD = {
    eyes: `${STONE(-8, -5)}${STONE(9, -5)}`,
    bone: `<g data-piece="bone">${BONE('M14 2 H38 M42 -4 a5 5 0 1 1 0 10')}</g>`,
    carrot: '<path class="carrot" data-piece="carrot" d="M11 -3 L40 3 L11 6 Z" />',
  }

  /** The snowman gets a piece. */
  function put(what) {
    has[what] = true
    const mid = top('middle')
    if (what === 'arms') {
      g.face.insertAdjacentHTML('beforeend', `<path class="stick" d="M${S - R.middle + 5} ${mid - 5} L${S - R.middle - 36} ${mid - 27} M${S - R.middle - 23} ${mid - 19} l-5 -12" /><path class="stick" d="M${S + R.middle - 5} ${mid - 5} L${S + R.middle + 36} ${mid - 28} M${S + R.middle + 23} ${mid - 20} l6 -11" />`)
    } else if (what === 'hat') {
      // the boy's own cap, as he wore it (boyfigure.js), on its head
      BoyFigure.cap(g.head).setAttribute('transform', `translate(0 ${CAP_ON.y - R.head}) scale(${CAP_ON.scale})`)
    } else g.head.insertAdjacentHTML('beforeend', ON_HEAD[what])
    Sound.plop()
    Debug.trace('snowman gets', { what })
  }

  function takeOff(what) {
    has[what] = false
    g.head.querySelector(`[data-piece="${what}"]`)?.remove()
  }

  /** The head ball on top, at its place, carrying what's put on it. */
  function mountHead(b) {
    headBall = b
    g.head.prepend(b.g)
    setBall(b, 0, 0)
    g.head.setAttribute('transform', `translate(${S} ${headY().toFixed(1)})`)
  }

  // ------------------------------------------------------------ the boy's part

  let queue = Promise.resolve()
  let pending = 0 // steps queued or under way
  /** One step of the boy's part after another, never two at once. */
  function boyDo(what, fn) {
    pending += 1
    queue = queue.then(() => Debug.ignoreCut(fn(), `boy ${what}`)).finally(() => (pending -= 1))
    return queue
  }

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
      await roll(base, Math.max(FIRST_X, S - ROLL_LEFT + 40), S, R.base * 0.2, R.base)
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
          Sound.pat()
          await Boy.pause(220)
        }
        await Boy.settle('heave', 600)
        await go(S + R.middle + HAND_REACH + 34)
      })
      await settleBall(head, S, headY())
      mountHead(head)
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

  /** Waiting by it, at a loss (what does a snowman need?), or, done, pleased with it. */
  const AT_A_LOSS = [
    () => Boy.scratch(),
    async () => {
      await Boy.look({ brows: 1, o: 0.4 }, 700)
      await Boy.nod(true)
    },
    async () => {
      Boy.face(Reksio.x > Boy.x ? 1 : -1) // you, Reksio?
      await Boy.look({ brows: 1 }, 900)
      Boy.face(1)
    },
  ]
  const PLEASED = [() => Boy.look({ smile: 1 }, 1200), () => Boy.nod(), () => Boy.wave()]

  /** Now and then, while he waits by it with nothing else to do. */
  function wonder() {
    if (pending || Boy.busy || Boy.walking || !Boy.out || fetching || mind() < 0.5) return
    const ways = stage === 'asking' || stage === 'nose' ? AT_A_LOSS : stage === 'done' ? PLEASED : null
    if (ways) boyDo('wonders', ways[Math.floor(mind() * ways.length)])
  }

  /** He takes what Reksio brought (picked() takes it from where it lay) and puts it in. */
  async function takeAndPut(what, picked = () => {}) {
    if (stage === 'evening') return
    Boy.face(-1)
    await Boy.settle('crouch', 350)
    picked() // up from where it lay (if it lay somewhere): now it's in his hand
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

  /** It broke where it fell: he gathers it up, pats a new head together and
   * puts it back, with what was on it. */
  async function rebuild() {
    if (stage !== 'fallen') return
    const side = Math.sign(fallenAt - S) || 1 // he kneels on its far side from the snowman, not in its base
    await go(fallenAt + side * 50)
    Boy.face(-side)
    await Boy.settle('crouch', 400)
    g.lumps?.remove() // gathered up
    g.lumps = null
    for (const n of [...g.head.children]) if (n !== headBall.g) n.remove()
    g.head.removeAttribute('transform')
    g.head.style.display = ''
    layer.insertBefore(g.head, g.face)
    const head = headBall
    await holding(inHands(head), async () => {
      for (let r = 6; r <= R.head; r += 5) {
        setBall(head, head.x, head.y, r)
        Sound.pat()
        await Boy.pause(200)
      }
      await Boy.settle('heave', 500)
      await go(S + R.middle + HAND_REACH + 30)
    })
    await settleBall(head, S, headY())
    mountHead(head)
    await Boy.stand()
    Boy.face(-1)
    for (const what of ['eyes', 'carrot', 'hat']) {
      if (!has[what]) continue
      await Boy.reach(250)
      put(what)
    }
    stage = 'done'
    Debug.trace('snowman mended', {})
    await Boy.nod()
  }

  /** Where its fallen head lies, broken, with what was on it; `away` (1 or
   * -1) is the side it flew to, where the carrot ends up. */
  function breakHead(x, away) {
    fallenAt = Math.min(Layout.MAX_X - 60, Math.max(Layout.MIN_X + 60, x))
    layer.appendChild(g.head) // out of #fx, and hidden: what's left of it is on the ground
    g.head.style.display = 'none'
    g.lumps = el('g', { transform: `translate(${fallenAt.toFixed(0)} ${GROUND}) scale(${away} 1)` }, layer)
    el('ellipse', { class: 'snow-ball', cx: 0, cy: 2, rx: 46, ry: 6 }, g.lumps) // the splat
    for (const [cx, r] of [[-26, 12], [4, 15], [32, 9]]) el('circle', { class: 'snow-ball', cx, cy: 3 - r, r }, g.lumps) // lumps apart, not a row of beads
    if (has.eyes) g.lumps.insertAdjacentHTML('beforeend', STONE(-44, -2) + STONE(50, -1))
    if (has.carrot) g.lumps.insertAdjacentHTML('beforeend', '<path class="carrot" d="M-2 -4 L26 0 L-2 4 Z" transform="translate(18 -26) rotate(-35)" />')
    if (has.hat) BoyFigure.cap(g.lumps).setAttribute('transform', `translate(-4 ${(40 - R.head).toFixed(0)}) rotate(-20) scale(${CAP_ON.scale})`)
    Sound.thud()
    Debug.trace('snowman head broken', { x: Math.round(fallenAt) })
    boyDo('mends it', rebuild)
  }

  /** Its head knocked off towards `dir` (1: right): it flies in an arc, tumbling,
   * lands and breaks, and the boy will mend it. Resolves as it lands; nothing
   * stops it on the way. */
  function knockOff(dir) {
    stage = 'fallen'
    Debug.trace('snowman head knocked off', { dir })
    $('fx').appendChild(g.head) // in front of everyone, on its way
    const [x0, y0] = [S, headY()]
    const x1 = S + dir * KNOCKED_TO
    const y1 = GROUND - R.head * 0.7
    const t0 = Clock.now()
    return new Promise((resolve) => {
      const stop = Clock.every(0, () => {
        const k = Math.min(1, (Clock.now() - t0) / KNOCKED_MS)
        const x = x0 + (x1 - x0) * k
        const y = y0 + (y1 - y0) * k * k - 40 * Math.sin(Math.PI * k) // up a little, then down faster
        g.head.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(dir * 200 * k).toFixed(0)})`)
        if (k < 1) return
        stop()
        breakHead(x1, dir)
        resolve()
      })
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
      stop = inTeeth(carried(what))
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

  /** Tapped (the snowman, or the boy by it): the next piece, his bone,
   * something around the finished snowman, or a sniff and a look up at it. */
  function tapped() {
    const what = next()
    if (what === 'bone') return fetchBone()
    if (what) return fetch(what)
    if (stage === 'done') return SnowPlay.run()
    return admire()
  }

  const things = {
    snowman: {
      // to the pile for the next piece, or to the snowman: on its right, the boy being on its left
      at: () => (PILE[next()] ? (PILE[next()] === 'stones' ? stonesX : stickX) - FETCH_FROM : S + R.base + AT_RIGHT),
      get face() { return PILE[next()] ? 1 : -1 },
      run: tapped,
      ready: () => stage !== 'none' && stage !== 'rolling' && stage !== 'evening',
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
    Clock.every(WONDER_MS, wonder)
    if (Layout.snowmanAt === 'built') return builtAtOnce()
    Clock.after((Layout.snowmanAt ?? rnd(...AT_S)) * 1000, () => isEnded() || boyDo('build', build))
  }

  /** ?snowman=built: there already, the boy beside it (tests, and a quick look). */
  function builtAtOnce() {
    setBall(ball(R.base), S, GROUND - R.base)
    setBall(ball(R.middle), S, top('middle'))
    mountHead(ball(R.head))
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
      return what && Reksio.walkTo(things.snowman.at()).then((ok) => ok && next() === what && fetch(what))
    },
    get stage() { return stage },
    get has() { return { ...has } },
    /** The boy out and doing nothing: free for something new (ice.js: helping Reksio up). */
    get boyFree() { return Boy.out && !pending && !Boy.busy && !Boy.walking && !Boy.slipping && stage !== 'evening' },
    /** What the finished snowman's encounters (snowplay.js) work with. */
    kit: { R, GROUND, BOY_SIDE, AT_RIGHT, boyDo, go, holding, follow, inTeeth, carried, inHand, giveToBoy, takeAndPut, knockOff, put, takeOff, at: () => S, headY, layer: () => layer },
    /** Where its action spot is (spots.js). */
    spotX: () => S + R.base + AT_RIGHT - 20,
  }
})()
