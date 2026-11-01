// The poles and the bulldozer (to discover), after Krtek a buldozer, and
// Eliot's "cones" (Adam, 2026-11-01: the tiny bulldozer far off was
// impossible to spot and did no harm, birds carrying the poles in looked
// ridiculous, and his throwing the poles changed nothing). One rule the
// child can see: the bulldozer goes where its poles are, flattening them.
//
// A rumble: it won't wait for a tap, so he drops what he is doing and
// hurries over to his flowers, the view taking it in with him. Far off, a
// tiny bulldozer comes up over the church's hill, beside the church, and
// winds down the slope, tearing a road in switchbacks (as the film's winds
// through the land, 5:06), into the far trees. Then, small, it comes up over
// the meadow's far edge and down its own winding road to us, growing, sand
// heaped along its edges (each play draws the road), until it stands half as
// tall again as him, puffing, its blade shoving a heap of earth (Krtek a
// buldozer 4:03-4:37), felling the young trees that stood on its road, birds
// bursting out of them (the film's bursts through a forest, 3:31), and turns
// to face his flowers. From a rack on its back
// it shoots red-and-white poles, thwip... ka-chunk, in a line marching
// straight at his flowers. He knocks on the one by his flowers: hm? He looks
// up at it and claps his hands to his face. It rolls to its first pole and
// flattens it under its tracks, and the wild flowers in its way; clods roll
// off its heap across the meadow and knock over two of his tulips (the
// film's clods bowl over the cricket, 3:58-4:04): ach jo. The harm is why
// the child wants it gone (Adam, 2026-11-01). He pulls out the next and throws
// it far up the hill: the bulldozer stops dead, puzzled, then turns on the
// last, by his flowers, and comes on. He dives into the ground in its path
// and digs a pit, and it nose-dives in, stuck, tracks spinning (the film's
// pit, 4:32). Then he pulls its last pole (some plays it is stuck: it pops,
// he tumbles over, and it flies off by itself) and throws it far up the
// bulldozer's own road; and the bulldozer, true to its rule, backs out and
// trundles off after it, up its road, smaller and smaller, and over the far
// edge, and he cheers. Then he stands his tulips up again, one by one, and the
// glad theme comes. The wild flowers come up slowly by themselves, with its
// roads, the pit and the heap greening over, in about a minute; sooner, if
// the rain cloud comes and rains on them (rain.js). All the while it is here
// the bed is uneasy (things.js `trouble`).
//
// A tap on a pole or on him hurries it on; a tap elsewhere waits for the step to end, then cuts it short
// (things.js): a pole in his hands is stood up where he is, the bulldozer
// stands where it was going, and the next tap carries on with it.

/* global Clock, Debug, Layout, Mole, Motion, Painting, Sound, Things, View, World */
;(() => {
  const Y = Layout.GROUND
  // the line as the bulldozer shoots it, from just ahead of it to by his flowers...
  const LINE = [1760, 1520, 1330]
  // ...the middle one, thrown, lands away up the hill, smaller with distance (left of the spring's rock,
  // never behind it); the last lands up the bulldozer's own road, this far along it from the far edge
  const THROWN = { x: 1640, y: 606, s: 0.46 }
  const UP_ROAD = 0.35
  const FLAT_MS = 450 // the pole toppling under it
  const TUMBLE = 0.5 // in this share of plays the last pole is stuck, pops, and he tumbles over
  const UP = 'rotate(0deg) scaleY(1)' // a flower standing
  const FLAT = 'rotate(-82deg) scaleY(0.8)' // a wild flower its blade went over: pushed flat, away from it
  const KNOCKED = 'rotate(-74deg)' // a tulip a clod knocked over
  const CLOD_MS = 1500 // a clod rolling off its heap, across the meadow, into his tulips (each a little later)
  const HIT = 2 // the clods knock over this many of his tulips, at the bed's end nearest it
  // young trees standing on the road it will make (planted as the play starts), felled as it comes: this
  // many, at these points of its way (WIND_POINTS + 1 of them, far to near), drawn each play; birds in them
  const SAPLINGS = { n: [1, 3], at: [5, 7, 9], birds: [1, 2], tall: 1.2 } // on the meadow's slope, not its edge (there, the edge hid its trunk); tall: against the bulldozer there
  const FELL_MS = 550 // a young tree going over, crack
  const BIRD = 0.6 // a bird in it, against the tree
  const SHOOT_EVERY_MS = 700 // the bulldozer shoots a pole this often…
  const SHOOT_MS = 750 // …each flying this long
  const RACK = { x: 22, y: -96 } // where they fly from: the rack on its back (its units)
  const THROW_MS = 900
  // the bulldozer: big in front, coming over the far edge and down to the line's far end, flattening its
  // first pole, then at the last pole into the pit; away up the hill it goes small, over the edge
  // (about half as tall again as him: at 5.2, twice his height, it filled the screen, Adam 2026-11-01)
  const DOZER = { s: 4, blade: 1850, lurch: 40 }
  const NOSE = 94 * DOZER.s // from the bulldozer's middle to its blade's edge, drawn at its size
  DOZER.stop = DOZER.blade + NOSE // where it stops, its blade just short of the line
  const CRUSH_AT = LINE[0] + NOSE - 40 // where it stops on its first pole, its blade just past it
  const FAR_S = 0.22 // its size far off, at the meadow's far edge
  // its road: over the meadow's far edge here it comes down to us, and goes back up it (in the
  // painting's open stretch, painting.js OPEN, clear of the spring's stones and trees that hid it).
  // Up to the left of where it stops, so the road it makes trails out from behind it as it comes:
  // coming straight at us, its body hid its own road
  const ROAD = { x: 1500, legs: [700, 1500, 1500, 900] } // each leg's ms, far to near
  const TURN_MS = 500 // here, it turns round to face his flowers
  const COME_MS = ROAD.legs.reduce((a, b) => a + b) // the whole way down
  const ROAD_DEPTH = 9 // half its road's depth on the ground, at its size 1 (far off, thinner)
  const WIND_POINTS = 14 // its winding way down: this many turns of the wheel
  const SWERVE = 34 // how far it swerves from the straight way, at its size 1 (each play draws a bit more or less)
  const SAND = '#b98a4e' // the sand it heaps up along the road
  const RUMBLE = { far: 0.18, edge: 0.4, here: 1, reach: 900 } // how loud its engine, far off on the hill, at the meadow's edge, here; how far off on the meadow creatures hear it
  const FINER = 4 // its road is torn up in this many pieces to each leg it drives: close behind it
  const SAND_R = 22 // a heap of sand's half width, at its size 1 (each draws its own, mostly small)
  // the church's hill far off (church.js; the distant layer's units): out from behind the church its
  // road winds down the slope in switchbacks, into the far trees, inside the hill's outline (each
  // play draws how many turns, how wide, how ragged)
  const HILL = {
    over: [715, 452], // behind the hill, right of the church, clear of it (out from behind the church, it looked
    top: [715, 429], // launched from it, Adam 2026-11-01)… up over the hill's shoulder (church.js: its outline)
    foot: [900, 600], // into the far trees
    middle: 560, // the hill's middle line…
    half: (y) => 88 + (y - 397) * 1.39, // …and its half width at y (church.js: its outline, near enough)
    turns: [3, 6], // this many switchbacks, from…to
    size: [0.1, 0.17], // the bulldozer up there, top and bottom
    depth: 3, // its road there drawn this much deeper than its size gives: up there, a hair's breadth was lost
    rise: 900, // up over the crest…
    ms: 4000, // …and all the way down (quick: the meadow's part is the show, Adam 2026-11-01)
  }
  const PIT_X = 1440 // where he digs the pit, in its path, just before the last pole: clear of the earth its blade shoves (at 1540, under it, the pit never showed)
  const PIT = { rx: 95, ry: 20, ms: 1800, every: 110 } // the pit: how wide and deep it opens; how long he digs, a clod flying out this often
  const DIVE = { deg: -9, dy: 8 } // nose down into the pit (at its size, a few degrees take the blade well down)
  const HEAP = [0.45, 0.75] // the earth it shoves grows from this to this as it comes (bigger, it buried him)
  const SCAR_MS = 60000 // its track, the pit and the heap green over in about a minute
  const EARTH = '#5b3a1c'
  const WATCH_X = Layout.BED.to - 40 // he hurries over to his flowers to see what is coming

  const poles = [] // { node, x, y, s, where: 'line' | 'carried' | 'far' }
  let dozer = null
  let far = null // the tiny bulldozer far off on the church's hill, coming down
  const random = Debug.random('meadow-dozer') // its own stream: the road's winding and its sand
  const state = { x: 0, stuck: false, pit: false, path: null, hill: false, tumble: false, flat: [], knocked: [], recovering: false, trees: [] } // the bulldozer's place, whether it is in the pit, what it harmed
  let scrape = null // the ground it tears up pushing on along the ground
  const scars = [] // its track, the pit and the heap, left behind on the meadow
  const m = () => Things.meadow
  const el = (...args) => m().el(...args)

  /** A pole, drawn standing with its point at 0,0: red and white bands, 170 high. */
  function drawPole() {
    const g = el('g', { class: 'pole-shape' })
    el('path', { d: 'M-7 -170 h14 v160 l-7 12 l-7 -12 z', fill: '#fff', stroke: '#15140f', 'stroke-width': 3 }, g)
    for (let i = 0; i < 5; i++) el('rect', { x: -7, y: -170 + i * 32, width: 14, height: 16, fill: '#d8322b' }, g)
    return g
  }

  /** The bulldozer, after the film's (4:03-4:37): a big rounded red hull with rivets and a grille, a
   * lilac blade shoving a heap of earth, tracks with white-ringed wheels, smoke from its pipe. Facing
   * left, its tracks on the ground at 0, 0. */
  function drawDozer(into = document.getElementById('things')) {
    const g = el('g', { class: 'dozer' }, into)
    const ink = { stroke: '#15140f', 'stroke-width': 3, 'stroke-linejoin': 'round' }
    const heap = el('g', { class: 'heap' }, g)
    heap.style.transformOrigin = '-92px 0px'
    heap.style.transform = `scale(${HEAP[0]})`
    el('path', { d: 'M-92 2 C-100 -40 -150 -46 -170 2 Z', fill: '#7a4f26', ...ink }, heap)
    for (const [cx, cy, r] of [[-110, -14, 5], [-130, -26, 4], [-150, -10, 5], [-122, -6, 3], [-140, -34, 3]]) el('circle', { cx, cy, r, fill: '#3e2810' }, heap)
    const body = el('g', { class: 'hull' }, g)
    body.style.transformOrigin = '60px 0px' // it tips about its back end: nose down into the pit
    el('path', { d: 'M-60 -40 L-88 -46 L-94 2 L-62 -2 Z', fill: '#a9a3d6', ...ink }, body) // the blade
    el('path', { d: 'M-56 -24 L-56 -52 Q-50 -80 -8 -82 L38 -82 Q60 -80 60 -52 L60 -24 Z', fill: '#e8562a', ...ink }, body)
    el('rect', { x: -56, y: -62, width: 16, height: 34, fill: '#c23f1c', ...ink, 'stroke-width': 2 }, body) // the grille
    for (const x of [-52, -48, -44]) el('path', { d: `M${x} -58 v26`, stroke: '#15140f', 'stroke-width': 2 }, body)
    el('rect', { x: -26, y: -74, width: 44, height: 7, rx: 3, fill: '#2b2b2b' }, body) // a slit of a window
    for (const [x, y] of [[-34, -44], [-14, -44], [6, -44], [26, -44], [46, -44], [-30, -60], [30, -60]]) el('circle', { cx: x, cy: y, r: 2.2, fill: '#15140f' }, body)
    el('rect', { x: 28, y: -102, width: 8, height: 22, fill: '#2b2b2b' }, body)
    const puffs = el('g', { class: 'puffs' }, body)
    for (let i = 0; i < 3; i++) el('circle', { class: `puff p${i}`, cx: 32, cy: -110, r: 9, fill: '#9aa0a6' }, puffs)
    const rack = el('g', { class: 'rack' }, body) // the poles it shoots, lying ready on its back
    el('rect', { x: -6, y: -90, width: 40, height: 8, fill: '#6b6b6b', ...ink, 'stroke-width': 2 }, rack)
    for (let i = 0; i < LINE.length; i++) {
      const r = el('g', { class: 'ready', transform: `translate(${2 + i * 9} -90) rotate(-62)` }, rack)
      el('rect', { x: -2, y: -34, width: 4, height: 34, fill: '#fff', stroke: '#15140f', 'stroke-width': 1 }, r)
      for (let k = 0; k < 3; k++) el('rect', { x: -2, y: -34 + k * 12, width: 4, height: 6, fill: '#d8322b' }, r)
    }
    const track = el('g', { class: 'track' }, body)
    el('rect', { x: -62, y: -26, width: 124, height: 26, rx: 13, fill: '#2b2b2b', ...ink }, track)
    for (const cx of [-44, -15, 15, 44]) {
      el('circle', { cx, cy: -13, r: 10, fill: '#fbf8ef', stroke: '#15140f', 'stroke-width': 2 }, track)
      el('circle', { cx, cy: -13, r: 4.5, fill: '#e8562a' }, track)
    }
    return g
  }

  /** The bulldozer at x, stood there (its end, before any animation to it, so a cut leaves it there). */
  const dozerAt = (x, y = Y + 4, s = DOZER.s, face = 1) => `translate(${x}px, ${y}px) scale(${s * face}, ${s})` // face -1: to the right

  /** It rolls (rumbling, the heap growing a little) from where it is drawn to x. */
  async function roll(x, ms) {
    const from = state.x
    if (from === x) return // there already (a step cut short and played again)
    state.x = x
    m().frame(x) // kept in sight with him
    scrapeTo(x, ms)
    flattenUnder(from - NOSE, x - NOSE, ms)
    World.noise('rumble', x, RUMBLE.reach) // the meadow's creatures flee it (critters.js, spring.js)
    Sound.rumble(ms / 1000)
    const grow = Math.min(HEAP[1], HEAP[0] + (DOZER.stop - x) / 1000) // more earth the further it pushes
    await Promise.all([
      Motion.endAt(dozer, [{ transform: dozerAt(from) }, { transform: dozerAt(x) }], { duration: ms, easing: 'ease-in-out' }),
      Motion.endAt(dozer.querySelector('.heap'), [{ transform: `scale(${grow})` }], { duration: ms }),
    ])
  }

  /** Stand pole i at x, y at scale s (1: in front, by him; less: far away up the hill). */
  function stand(p, x, y, s, layer) {
    Object.assign(p, { x, y, s })
    p.wrap.style.transform = `translate(${x}px, ${y}px) scale(${s})`
    p.wrap.style.visibility = '' // shot, or (cut short) planted at once
    p.wrap.appendChild(p.node)
    document.getElementById(layer).appendChild(p.wrap)
  }

  /** The bulldozer comes over the meadow's far edge, down the hill, and stops at the line. */
  async function drive() {
    await overTheHill() // there already, unless a cut (and bedtime) skipped it
    dozer = drawDozer()
    syncRack() // poles a cut planted already are off its rack
    const [below, crest] = way()
    state.path ||= winding(way()) // planted on as the play started
    dozer.style.transform = dozerAt(...below, -1) // coming down, it faces the way it goes: right
    state.x = DOZER.stop // where it is going: a cut leaves it there
    Debug.trace('bulldozer')
    const ground = road(finer(state.path), { into: document.getElementById('far-things'), start: ROAD.legs[0], step: (COME_MS - ROAD.legs[0]) / (state.path.length - 1) / FINER })
    scrapeIn(ground)
    Sound.rumble(COME_MS / 1000, RUMBLE.edge, RUMBLE.here) // over the edge and down to us: louder and louder
    const step = (COME_MS - ROAD.legs[0]) / (state.path.length - 1)
    for (const t of state.trees) Clock.after(ROAD.legs[0] + t.i * step, () => fell(t)) // as it reaches each
    const near = (y) => y > Y - 30 // down on the meadow, in front
    return travel([
      [...crest, 'beyond', ROAD.legs[0], -1], // up over the meadow's far edge
      ...state.path.slice(1).map(([x, y, size], i) => [x, y, size, near(y) ? 'things' : i ? null : 'far-things', step, -1]), // down its winding road, growing
      [...state.path[state.path.length - 1], null, TURN_MS, 1], // and round, to face his flowers (a cartoon turn, through flat)
    ])
  }

  /** Its way down, winding: points [x, y, size] from the far edge to here, swerving this way and
   * that (drawn from the play's own stream), straight at both ends. */
  function winding([, crest, ...rest]) {
    const base = [crest, ...rest]
    const legs = ROAD.legs.slice(1)
    const end = legs.reduce((a, b) => a + b)
    const at = (t) => { // the straight way's point at ms t
      let i = 0
      while (i < legs.length - 1 && t > legs[i]) t -= legs[i++]
      const k = Math.min(1, t / legs[i])
      return base[i].map((v, n) => v + (base[i + 1][n] - v) * k)
    }
    const phase = random() * Math.PI * 2
    const swerve = SWERVE * (0.6 + random() * 0.8)
    const points = []
    for (let n = 0; n <= WIND_POINTS; n++) {
      const [x, y, size] = at((end * n) / WIND_POINTS)
      const taper = Math.sin((Math.PI * n) / WIND_POINTS) // straight off the edge, straight up to its place
      const dx = (Math.sin(phase + n * 1.3) + (random() - 0.5) * 0.6) * swerve * size * taper
      points.push([x + dx, y, size])
    }
    return points
  }

  /** Its road's points, far to near: [x, y, size]: out of sight below the far edge, on it, down the
   * hill, nearly here, here. */
  function way() {
    const crest = crestY(ROAD.x)
    return [
      [ROAD.x, crest + 40, FAR_S],
      [ROAD.x, crest, FAR_S],
      [ROAD.x + (DOZER.stop - ROAD.x) * 0.3, crest + 34, 0.7],
      [DOZER.stop - 60, Y - 20, 2.2],
      [DOZER.stop, Y + 4, DOZER.s],
    ]
  }

  /** The height of the meadow's far edge at x (the back ground's line), where it comes over and goes. */
  function crestY(x) {
    const edge = document.querySelector('#back-ground path')
    let best = { x: Infinity, y: 620 }
    const length = edge.getTotalLength()
    for (let l = 0; l < length; l += 8) {
      const p = edge.getPointAtLength(l)
      if (p.y < Y - 40 && Math.abs(p.x - x) < Math.abs(best.x - x)) best = p
    }
    return best.y
  }

  /** It drives leg by leg ([x, y, size, layer, ms, face]: into that layer, the depth it is at, as the leg starts). */
  async function travel(legs) {
    for (const [x, y, size, layer, ms, face = 1] of legs) {
      if (layer) document.getElementById(layer).appendChild(dozer)
      if (y > Y - 30) World.noise('rumble', x, RUMBLE.reach) // down on the meadow: heard, and fled
      await Motion.endAt(dozer, [{ transform: dozer.style.transform }, { transform: dozerAt(x, y, size, face) }], { duration: ms })
    }
  }

  /** The road it tears coming down its winding way (points, far to near), torn up piece by piece as it
   * goes over: dug earth, tread marks across it, sand heaped up along its edges, more on one side here,
   * the other there, clods thrown about. */
  function road(points, { into, before = into.firstChild, start, step, depth = 1 }) {
    const g = el('g', { class: 'road' }, into)
    into.insertBefore(g, before) // under what stands there
    scars.push(g)
    const parts = [] // [element, when it shows (ms from now)]
    for (let n = 1; n < points.length; n++) {
      const [xa, ya, sa] = points[n - 1]
      const [xb, yb, sb] = points[n]
      const [ha, hb] = [ROAD_DEPTH * sa * depth, ROAD_DEPTH * sb * depth]
      const k0 = (sa + sb) / 2 * depth // how big things are drawn here
      const when = start + step * n
      parts.push([el('path', { d: `M${xa} ${ya - ha} L${xb} ${yb - hb} L${xb} ${yb + hb} L${xa} ${ya + ha} Z`, fill: EARTH, stroke: EARTH, 'stroke-width': 2 * k0 }, g), when])
      // tread marks across it
      for (let k = 0.25; k < 1; k += 0.25) {
        const [x, y, h] = [xa + (xb - xa) * k, ya + (yb - ya) * k, ha + (hb - ha) * k]
        parts.push([el('path', { d: `M${x - h * 0.3} ${y - h * 0.8} l${h * 0.5} ${h * 1.6}`, stroke: '#3e2810', 'stroke-width': Math.max(0.6, h * 0.25), 'stroke-linecap': 'round' }, g), when])
      }
      // sand heaped up along its edges: now more on the far side, now on the near, now hardly any
      for (const side of [-1, 1]) {
        if (random() < 0.25) continue
        const big = (0.4 + random() * random() * 1.4) * k0
        const x = xa + (xb - xa) * random()
        const y = (ya + yb) / 2 + side * (ha + hb) / 2
        parts.push([el('path', { d: fluffyHeap(x, y, SAND_R * big, side), fill: SAND, stroke: '#7a5530', 'stroke-width': 1.5 * Math.min(1, k0) }, g), when])
      }
      // and a clod or two thrown out
      if (random() < 0.5) parts.push([el('circle', { cx: xb + (random() - 0.5) * 40 * k0, cy: yb + (random() - 0.5) * 12 * k0, r: (1.5 + random() * 2) * k0, fill: '#3e2810' }, g), when])
    }
    const total = start + step * points.length
    for (const [part, when] of parts) {
      const show = Math.min(0.97, when / total)
      Debug.ignoreCut(Motion.endAt(part, [{ opacity: 0 }, { opacity: 0, offset: show }, { opacity: 1, offset: show + 0.02 }, { opacity: 1 }], { duration: total }), 'the road torn up')
    }
    g.setAttribute('opacity', 0.9)
    return g
  }

  /** Its way in FINER pieces to each leg ([x, y, size] points), so its road keeps up with it. */
  const finer = (points) => [points[0], ...points.slice(1).flatMap((p, n) => Array.from({ length: FINER }, (_, k) => p.map((v, i) => points[n][i] + ((v - points[n][i]) * (k + 1)) / FINER)))]

  /** The ground it will tear up pushing on along the meadow towards the pit, under its tracks (scrapeTo). */
  function scrapeIn(g) {
    const w = 62 * DOZER.s
    const from = PIT_X + NOSE - w
    scrape = el('rect', { class: 'scrape', x: from, y: Y - 8, width: DOZER.stop - from, height: 18, fill: EARTH }, g)
    scrape.style.transformBox = 'fill-box'
    scrape.style.transformOrigin = 'right'
    scrape.style.transform = 'scaleX(0)'
  }

  /** Its road down the hill, drawn for this play: out from behind the church, back and forth across the
   * slope, wider as the hill widens, a little ragged, and off into the far trees. */
  function switchbacks() {
    const turns = HILL.turns[0] + Math.floor(random() * (HILL.turns[1] - HILL.turns[0] + 1))
    const reach = 0.45 + random() * 0.3 // how far across the slope it swings
    const [, y0] = HILL.top
    const [x1, y1] = HILL.foot
    const points = [HILL.top]
    let side = random() < 0.5 ? -1 : 1
    for (let n = 1; n <= turns; n++) {
      const y = y0 + ((y1 - 40 - y0) * n) / (turns + 0.5) + (random() - 0.5) * 8
      const x = HILL.middle + side * HILL.half(y) * reach * (0.75 + random() * 0.5)
      points.push([x, y])
      side = -side
    }
    points.push([x1, y1])
    return points
  }

  /** Far off first: a tiny bulldozer comes up over the church's hill, beside the church, and winds down
   * it, tearing its road in switchbacks, until the far trees hide it. He watches. */
  async function overTheHill() {
    if (state.hill) return // a cut, then this again: it is down already
    state.hill = true
    const into = document.getElementById('distant')
    const church = into.querySelector('.church')
    const path = switchbacks()
    const points = path.map(([x, y], n) => [x, y, HILL.size[0] + ((HILL.size[1] - HILL.size[0]) * n) / (path.length - 1)])
    const step = HILL.ms / (points.length - 1)
    road(finer(points), { into, before: church, start: HILL.rise, step: step / FINER, depth: HILL.depth })
    far = drawDozer(into)
    into.insertBefore(far, into.querySelector('.hill')) // behind the hill (church.js), below its crest…
    far.style.transform = dozerAt(...HILL.over, HILL.size[0], -1)
    Sound.rumble((HILL.rise + HILL.ms) / 1000, RUMBLE.far, RUMBLE.edge) // far off: faint, a little louder as it comes down
    try {
      Mole.lookAt(View.fromDistant(HILL.over[0]))
      await Motion.endAt(far, [{ transform: far.style.transform }, { transform: dozerAt(...points[0], -1) }], { duration: HILL.rise })
      into.insertBefore(far, church) // …up over it, and on the slope, in front of the hill
      for (let n = 1; n < points.length; n++) {
        const [x, y, size] = points[n]
        const face = x > points[n - 1][0] ? -1 : 1 // it faces the way it goes
        Mole.lookAt(View.fromDistant(x))
        const leg = Motion.endAt(far, [{ transform: far.style.transform.replace(/scale\(-?[\d.]+, /, `scale(${size * face}, `) }, { transform: dozerAt(x, y, size, face) }], { duration: step })
        if (n < points.length - 1) {
          await leg
          continue
        }
        // the last, into the far trees, plays on while it comes up over the meadow's edge: the child never
        // loses it between (Adam, 2026-11-01: it was out of sight for long)
        const going = far
        far = null
        Debug.ignoreCut(leg.finally(() => going.remove()), 'into the far trees')
      }
    } finally {
      if (far) far.remove() // cut short: down behind the far trees
      far = null
    }
  }


  /** A low lumpy heap of sand at x, y, r wide: above the road's edge (side -1) or below it (1). */
  function fluffyHeap(x, y, r, side) {
    const h = r * (0.35 + random() * 0.3)
    const lump = () => (random() - 0.5) * r * 0.3
    return side < 0
      ? `M${x - r} ${y} Q${x - r * 0.5} ${y - h + lump()} ${x} ${y - h} Q${x + r * 0.5} ${y - h + lump()} ${x + r} ${y} Z`
      : `M${x - r} ${y} Q${x - r * 0.5} ${y + h * 0.6 + lump()} ${x} ${y + h * 0.5} Q${x + r * 0.5} ${y + h * 0.6 + lump()} ${x + r} ${y} Z`
  }

  /** The ground torn up under it as far as x, its middle (scrape: under its tracks, from where it stopped). */
  function scrapeTo(x, ms) {
    if (!scrape) return
    const w = 62 * DOZER.s
    const full = DOZER.stop - (PIT_X + NOSE - w)
    const k = Math.min(1, Math.max(0, (DOZER.stop - (x - w)) / full))
    Debug.ignoreCut(Motion.endAt(scrape, [{ transform: `scaleX(${k})` }], { duration: ms, easing: 'ease-in-out' }), 'the ground torn up')
  }

  /** It shoots pole p from its rack, thwip: it arcs over and sticks in at x, ka-chunk. */
  async function shoot(p, x, i) {
    const from = { x: state.x + RACK.x * DOZER.s, y: Y + 4 + RACK.y * DOZER.s }
    stand(p, x, Y + 4, 1, 'things')
    syncRack()
    Sound.whoosh()
    await Motion.endAt(p.wrap, [
      { transform: `translate(${from.x}px, ${from.y}px) scale(0.6) rotate(70deg)` },
      { transform: `translate(${(from.x + x) / 2}px, ${Math.min(from.y, Y) - 180}px) scale(0.85) rotate(20deg)`, offset: 0.5 },
      { transform: `translate(${x}px, ${Y + 4}px) scale(1) rotate(0deg)` },
    ], { duration: SHOOT_MS, easing: 'ease-in' })
    Sound.plink()
  }

  /** As the play starts: its road worked out already, and young trees standing on it, some with a bird or
   * two in them (they were always there: then it comes, and fells them). */
  function plant() {
    state.path = winding(way())
    const spots = [...SAPLINGS.at]
    const n = SAPLINGS.n[0] + Math.floor(random() * (SAPLINGS.n[1] - SAPLINGS.n[0] + 1))
    for (let k = 0; k < n; k++) {
      const i = spots.splice(Math.floor(random() * spots.length), 1)[0]
      const [x, y, size] = state.path[i]
      const layer = document.getElementById(y < Y - 30 ? 'far-things' : 'things')
      const g = el('g', { class: 'sapling', transform: `translate(${x} ${y}) scale(${size * SAPLINGS.tall})` })
      layer.insertBefore(g, layer.firstChild) // behind what comes on the road
      const body = drawSapling(g, size * SAPLINGS.tall)
      const birds = Array.from({ length: SAPLINGS.birds[0] + Math.floor(random() * (SAPLINGS.birds[1] - SAPLINGS.birds[0] + 1)) }, (_, b) => drawBird(g, b ? 30 : -24, b ? -150 : -186))
      state.trees.push({ g, body, birds, i, x, size, side: random() < 0.5 ? -1 : 1, felled: false })
    }
  }

  /** A young tree, its foot at 0, 0, painted as the meadow's trees are (Painting.tree), shown `big` times over. */
  function drawSapling(g, big) {
    const body = el('g', { class: 'sapling-body' }, g)
    Painting.tree(body, [120, 120], 110, random, big)
    return body
  }

  /** A little bird (a bullfinch, as at the spring) sitting at x, y in the tree. */
  function drawBird(g, x, y) {
    const b = el('g', { class: 'sapling-bird', transform: `translate(${x} ${y}) scale(${BIRD})` }, g)
    el('ellipse', { cx: 0, cy: 0, rx: 13, ry: 10, fill: '#5f6a72', stroke: '#15140f', 'stroke-width': 2 }, b)
    el('path', { d: 'M-9 2 Q0 12 9 2 Q4 -2 -9 2 Z', fill: '#e0453a' }, b)
    el('circle', { cx: 9, cy: -8, r: 7, fill: '#15140f' }, b)
    el('path', { d: 'M15 -8 l6 2 l-6 2 z', fill: '#2b2b2b' }, b)
    el('path', { d: 'M-12 -2 l-10 -4 l2 6 z', fill: '#15140f' }, b)
    return b
  }

  /** It reaches young tree t: crack, over it goes, sideways, and its birds burst out and away off the side. */
  function fell(t, now = false) {
    if (t.felled) return
    t.felled = true
    t.body.style.transformOrigin = '0px 0px'
    const over = `rotate(${t.side * 84}deg)`
    if (now) t.body.style.transform = over
    else {
      Sound.crack()
      Debug.trace('felled', { x: Math.round(t.x) })
      if (!state.trees.some((o) => o !== t && o.felled)) Sound.say('gasp') // the first: he sees what it does
      Debug.ignoreCut(Motion.endAt(t.body, [{ transform: 'rotate(0deg)' }, { transform: over }], { duration: FELL_MS, easing: 'ease-in' }), 'a young tree felled')
    }
    for (const [k, b] of t.birds.entries()) {
      const away = (k % 2 ? 1 : -1) * t.side // off to the sides, out of sight: they leave the way birds do
      const from = b.getAttribute('transform').match(/-?[\d.]+/g).map(Number)
      b.removeAttribute('transform')
      Motion.endAt(b, [{ transform: `translate(${from[0]}px, ${from[1]}px) scale(${BIRD})` }, { transform: `translate(${from[0] + away * 900}px, ${from[1] - 500}px) scale(${BIRD * 0.6})` }], { duration: now ? 1 : 1400, easing: 'ease-in' })
        .then(() => b.remove(), () => b.remove())
    }
    t.birds = []
  }

  /** It arrives: a rumble from off the right. The poles wait, unseen, to be shot; it won't wait for a
   * tap (urgent): he breaks off and hurries over to see. */
  function appear() {
    LINE.forEach((x) => {
      const wrap = el('g', { class: 'thing pole', 'data-thing': 'poles' })
      const p = { node: drawPole(), wrap, where: 'line' }
      poles.push(p)
      stand(p, x, Y + 4, 1, 'things') // where it ends, so a cut (restore) leaves it planted…
      wrap.style.visibility = 'hidden' // …until it is shot
    })
    state.tumble = random() < TUMBLE // this play's last pole: stuck, or not
    Sound.rumble(1.2, RUMBLE.far) // something far off: faint, and over before it comes
  }

  /** The rack on its back shows the poles still to be shot (a cut plants them all at once). */
  function syncRack() {
    if (dozer) dozer.querySelectorAll('.ready').forEach((r, i) => { r.style.display = poles[i].wrap.style.visibility === 'hidden' ? '' : 'none' })
  }

  // ------------------------------------------------------------ the chain

  /** A rumble: he hurries over to his flowers, and watches the tiny bulldozer far off wind down the
   * church's hill, tearing its road. (The way in is three steps, so a tap never waits long: the meadow
   * keeps each step short.) */
  async function farOff(alive) {
    await m().goTo(WATCH_X)
    if (!alive()) return
    m().frame(DOZER.stop) // the view between him and where it will stand, so the child sees it come
    if (!state.hill) m().music(Layout.flags.menace === 'notes' ? 'bulldozer' : 'menace') // trouble coming: a short uneasy turn (recorded; or written, to compare), then the rumble leads
    await overTheHill()
  }

  /** Over the meadow's far edge it comes (as the far one goes into the trees), down its winding road to
   * us, and turns to face his flowers. */
  async function comesIn(alive) {
    m().frame(DOZER.stop)
    Mole.lookAt(DOZER.stop)
    if (!dozer) await drive()
  }

  /** It shoots its line of poles at his flowers. */
  async function shootsLine(alive) {
    m().frame(DOZER.stop)
    if (!dozer) await drive() // bedtime took it, and this play goes on (a replay): it comes again
    for (const [i, p] of poles.entries()) {
      if (p.wrap.style.visibility !== 'hidden') continue // shot already (a cut, then this again)
      await Clock.wait(i ? SHOOT_EVERY_MS : 300)
      if (!alive()) return
      await shoot(p, LINE[i], i)
      if (!alive()) return
    }
  }

  /** He knocks on the pole by his flowers: hm? Then he looks up at the bulldozer, puffing at the end of
   * the line, and claps his hands to his face. */
  async function notice(alive) {
    const p = poles[poles.length - 1]
    if (dozer) m().frame(state.x)
    await m().goTo(p.x + 70) // beside his bed, not in front of it: the child sees his tulips
    if (!alive()) return
    Sound.knock()
    await Mole.knock()
    if (!alive()) return
    Sound.say('hm')
    await Mole.lean(10, 800)
    if (!alive()) return
    Mole.lookAt(state.x)
    Sound.rumble(1.2)
    Sound.say(['gasp', 'fright'])
    await Mole.handsToFace(700)
    if (!alive()) return
    Sound.say('achJo')
  }

  /** It rolls to its first pole and flattens it under its tracks: he winces. The rule, seen: it goes
   * where its poles are. */
  async function crush(alive) {
    const p = poles[0]
    if (p.where !== 'line') return // flat already (a cut, then this again)
    Mole.lookAt(state.x)
    await roll(CRUSH_AT, 1500)
    if (!alive()) return
    flatten(p)
    Sound.knock()
    Sound.say(['gasp', 'fright'])
    Mole.feel('squeezed', 900) // a wince
    await Motion.endAt(p.wrap, [{ transform: `translate(${p.x}px, ${Y + 4}px) rotate(0deg)` }, { transform: lying(p) }], { duration: FLAT_MS, easing: 'ease-in' })
    if (!alive()) return
    await spill(alive)
  }

  /** The wild flowers (rain.js) its blade goes over, moving from a to b, go flat as it reaches each. */
  function flattenUnder(a, b, ms) {
    for (const g of document.querySelectorAll('.wild-flower')) {
      const x = Number(g.dataset.x)
      if (x > a || x <= b || state.flat.includes(g)) continue
      state.flat.push(g)
      g.getAnimations().forEach((an) => an.cancel())
      Debug.ignoreCut(Motion.endAt(g, [{ transform: UP }, { transform: FLAT }], { duration: 260, delay: (ms * (a - x)) / (a - b), easing: 'ease-in' }), 'a wild flower flattened')
    }
  }

  /** Clods roll off its heap across the meadow and knock over his tulips at the bed's end: he turns, ach jo. */
  async function spill(alive) {
    if (state.knocked.length) return // spilled already (a cut, then this again)
    const bed = document.getElementById('bed')
    const blade = state.x - NOSE
    state.knocked = m().tulips().slice(-HIT).reverse() // nearest first
    const rolls = state.knocked.map((t, i) => {
      const ms = CLOD_MS + i * 250
      const clod = el('circle', { r: 13 + i * 3, fill: '#4a2f14', stroke: '#15140f', 'stroke-width': 2 }, bed)
      scars.push(clod)
      Clock.after(ms, () => { if (alive()) Sound.knock() })
      Debug.ignoreCut(Motion.endAt(t.bend, [{ transform: 'rotate(0deg)' }, { transform: KNOCKED }], { duration: 380, delay: ms, easing: 'ease-in' }), 'a tulip knocked over')
      return Motion.endAt(clod, [
        { transform: `translate(${blade - 30}px, ${Y - 14}px) rotate(0deg)` },
        { transform: `translate(${t.x + 16}px, ${t.base - 12}px) rotate(-${540 + i * 180}deg)` },
      ], { duration: ms, easing: 'ease-out' })
    })
    Sound.rumble(0.8)
    await Debug.ignoreCut(Promise.all(rolls), 'clods rolling')
    if (!alive()) return
    Mole.lookAt(state.knocked[0].x)
    Sound.say('achJo')
    await Mole.lean(-8, 1400) // a slump: his flowers
  }

  /** Pole p flat on the ground under it, out of the story: it greens over with the road. */
  function flatten(p) {
    p.where = 'flat'
    p.wrap.removeAttribute('data-thing')
    const layer = document.getElementById('things')
    layer.insertBefore(p.wrap, dozer) // under its tracks
    p.wrap.style.transform = lying(p)
    scars.push(p.wrap)
  }
  const lying = (p) => `translate(${p.x}px, ${Y + 4}px) rotate(90deg) scale(1, 0.7)` // toppled back under it, pressed flat

  /** He pulls the next pole out and throws it far up the hill: the bulldozer stops dead, puzzled (where
   * did it go?), then turns on the last, by his flowers, and comes on. */
  async function throwOne(alive) {
    await sendAway(alive, 1)
    if (!alive() || state.x < CRUSH_AT) return // it came on already (a cut, then this again)
    Sound.rumble(0.6)
    const hull = dozer.querySelector('.hull')
    await Motion.endAt(hull, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(4deg)', offset: 0.3 }, { transform: 'rotate(-2deg)', offset: 0.65 }, { transform: 'rotate(0deg)' }], { duration: 1100 }) // a puzzled rock, back and forth
    if (!alive()) return
    await roll(CRUSH_AT - DOZER.lurch, 900)
  }

  /** It rolls at the last pole: he dives into the ground in its path and digs a pit, and it nose-dives in. */
  async function pit(alive) {
    if (state.stuck) return
    m().frame(state.x)
    if (!state.pit) {
      await m().goTo(PIT_X)
      if (!alive()) return
      Sound.say('hm') // an idea
      Sound.dig()
      await Mole.goDown()
      if (!alive()) return
      await dig(alive) // under there, digging: earth flying out, the hole widening
      if (!alive()) return
      await Mole.tunnelTo(PIT_X - PIT.rx - 60) // out of its way, beyond the pit, by the last pole
      if (!alive()) return
      Sound.pop()
      await Mole.comeUp('out')
      if (!alive()) return
    }
    Mole.lookAt(PIT_X)
    await roll(PIT_X + NOSE, 1400)
    if (!alive()) return
    state.stuck = true
    Debug.trace('bulldozer stuck')
    Sound.clunk()
    const heap = dozer.querySelector('.heap')
    Debug.ignoreCut(Motion.endAt(heap, [{ transform: getComputedStyle(heap).transform }, { transform: `scale(${HEAP[0] * 0.5}) translateY(10px)` }], { duration: 380, easing: 'ease-in' }), 'its earth tumbling into the pit') // its earth goes in first
    await Motion.endAt(dozer.querySelector('.hull'), [{ transform: `rotate(${DIVE.deg}deg) translateY(${DIVE.dy}px)` }], { duration: 380, easing: 'ease-in' })
    if (!alive()) return
    dozer.classList.add('stuck') // tracks spinning, puffing hard (game.css)
    Sound.rumble(1.6)
    // stuck, but still here, puffing: he peeks at it, wary (no cheer till it has gone, Adam 2026-11-01)
    Mole.feel('worried', 1400)
    await Mole.lean(10, 900)
  }

  /** The pit, dug where he went down: a hole widening in the grass, a rim of loose earth piling up behind
   * it, and earth flying out of it in arcs, this way and that, while he digs down there. */
  async function dig(alive) {
    state.pit = true
    const layer = document.getElementById('things')
    const rim = el('path', { class: 'pit-rim', d: `M${PIT_X - PIT.rx - 30} ${Y + 10} Q${PIT_X} ${Y - 100} ${PIT_X + PIT.rx + 30} ${Y + 10} Z`, fill: '#6e4a24', stroke: '#15140f', 'stroke-width': 3 }, layer)
    const hole = el('ellipse', { class: 'pit', cx: PIT_X, cy: Y + 8, rx: PIT.rx, ry: PIT.ry, fill: '#2b1b0b', stroke: '#15140f', 'stroke-width': 3 }, layer)
    for (const e of [hole, rim]) {
      layer.insertBefore(e, layer.firstChild) // in the grass, under the pole and the bulldozer; the rim behind the hole
      e.style.transformBox = 'fill-box'
      e.style.transformOrigin = 'center bottom'
      scars.push(e)
      Debug.ignoreCut(Motion.endAt(e, [{ transform: 'scale(0.15)' }, { transform: 'scale(1)' }], { duration: PIT.ms, easing: 'ease-out' }), 'the pit opens')
    }
    const drops = document.getElementById('drops')
    for (let t = 0; t < PIT.ms; t += PIT.every) {
      Clock.after(t, () => {
        if (!alive()) return
        if (t % (PIT.every * 4) === 0) Sound.dig()
        const side = random() < 0.5 ? -1 : 1
        const [dx, up] = [side * (60 + random() * 150), 70 + random() * 110]
        const d = el('circle', { r: 7 + random() * 9, fill: random() < 0.5 ? '#6e4a24' : '#4a2f14', stroke: '#15140f', 'stroke-width': 1.5 }, drops)
        Motion.endAt(d, [
          { transform: `translate(${PIT_X + side * 20}px, ${Y}px)`, opacity: 1 }, // opacity given: Motion.endAt sets the end (faint) first
          { transform: `translate(${PIT_X + dx * 0.6}px, ${Y - up}px)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${PIT_X + dx}px, ${Y + 4}px)`, opacity: 0.2 },
        ], { duration: 650, easing: 'ease-out' }).then(() => d.remove(), () => d.remove())
      })
    }
    await Clock.wait(PIT.ms)
  }

  /** Over to pole k (1, the middle one: away up the hill; 2, by his flowers: up the bulldozer's road),
   * a tug or two, up over his head, and away it sails. Gone already (its step cut short after, and played
   * again): nothing. */
  async function sendAway(alive, k, stuck = false) {
    const p = poles[k]
    const far = k === 2 ? upItsRoad() : THROWN
    if (p.where === 'far') return
    if (p.where === 'line') {
      await m().goTo(p.x - 50)
      if (!alive()) return
      Mole.feel('squeezed', stuck ? 1900 : 900) // an effort: eyes shut tight, mouth pinched (Krtek a autíčko 11:44.5)
      for (let i = 0; i < (stuck ? 3 : 1); i++) {
        Sound.tug()
        await Mole.lean(-16, stuck ? 600 : 800)
        if (!alive()) return
      }
      if (stuck) {
        // it pops out of the ground, he tumbles over backwards, and it flies off by itself
        Sound.pop()
        Sound.say(['gasp', 'fright'])
        await Promise.all([fly(p, far, { x: p.x, y: Y - 80 }, 720), Mole.lean(-55, 1100)])
        return
      }
      p.where = 'carried'
      p.wrap.remove()
      p.node.style.transform = 'rotate(80deg) translate(0px, 85px)'
      Mole.carry(p.node)
    }
    await Mole.wobble(600)
    if (!alive()) return
    Sound.whoosh()
    Mole.carry(null)
    await fly(p, far, Mole.head())
  }

  /** The pole sails from `from` (his hands, or where it stood) to `far`, in front of everything, and plants itself there, away up the hill. */
  async function fly(p, far, from, spin = 0) {
    const { x, y } = from
    p.node.style.transform = ''
    p.where = 'far'
    p.wrap.removeAttribute('data-thing') // far off, it is the hill's: a tap there is a tap on the meadow
    stand(p, far.x, far.y, far.s, 'things')
    await Motion.endAt(p.wrap, [
      { transform: `translate(${x}px, ${y}px) scale(1) rotate(${70 + spin}deg)` },
      { transform: `translate(${(x + far.x) / 2}px, ${Math.min(y, far.y) - 260}px) scale(${(1 + far.s) / 2}) rotate(${20 + spin / 2}deg)`, offset: 0.5 },
      { transform: `translate(${far.x}px, ${far.y}px) scale(${far.s}) rotate(0deg)` },
    ], { duration: THROW_MS, easing: 'ease-in' })
    stand(p, far.x, far.y, far.s, 'far-things') // landed: behind the meadow's front, up on the hill
    Sound.plink()
    Debug.trace('pole far', { x: far.x })
  }

  /** Where its last pole lands, thrown: up its own road, a way from the far edge (small, far off). */
  function upItsRoad() {
    const path = state.path || winding(way())
    const [x, y, size] = path[Math.round((path.length - 1) * UP_ROAD)]
    return { x, y, s: size / DOZER.s }
  }

  /** He pulls its last pole (stuck, some plays: it pops, he tumbles, it flies by itself) and throws it up
   * the bulldozer's road; it backs out of the pit and trundles off after it, as its rule says, up its
   * road, smaller and smaller, and over the far edge, and he cheers. It leaves its track, the pit and its
   * heap, which green over. */
  async function away(alive) {
    if (!dozer) return
    await sendAway(alive, 2, state.tumble)
    if (!alive()) return
    if (state.stuck) {
      Mole.lookAt(state.x)
      dozer.classList.remove('stuck')
      Sound.rumble(1)
      await Motion.endAt(dozer.querySelector('.hull'), [{ transform: `rotate(${DIVE.deg}deg) translateY(${DIVE.dy}px)` }, { transform: 'rotate(0deg) translateY(0px)' }], { duration: 600, easing: 'ease-out' })
      state.stuck = false
      if (!alive()) return
    }
    leaveScars()
    Sound.rumble(4, RUMBLE.here, RUMBLE.far) // going away: fainter and fainter
    Mole.lookAt(ROAD.x) // he watches it go
    const [below] = way()
    const back = [...(state.path || way().slice(1))].reverse().slice(1) // back up its winding road, the way it came, after its pole
    const step = (COME_MS - ROAD.legs[0]) / back.length
    let behind = false
    await travel([
      ...back.map(([x, y, size]) => {
        const layer = !behind && y < Y - 30 ? 'far-things' : null // off the meadow's front, behind it
        if (layer) behind = true
        return [x, y, size, layer, step]
      }),
      [...below, 'beyond', ROAD.legs[0]], // over the edge, out of sight
    ])
    dozer.remove()
    dozer = null
    m().frame(null)
    for (const p of poles) p.wrap.removeAttribute('data-thing') // done: they're the meadow's now
    recover()
    if (!alive()) return
    Sound.say('giggle') // gone: now he cheers
    await Mole.cheer()
  }

  /** It has gone: what it flattened comes up again, slowly, by itself (his tulips sooner, by his hands). */
  function recover() {
    if (state.recovering) return
    state.recovering = true
    for (const g of state.flat) Debug.ignoreCut(Motion.endAt(g, [{ transform: FLAT }, { transform: UP }], { duration: SCAR_MS, easing: 'ease-in' }), 'a wild flower coming up')
    for (const t of state.knocked) if (!t.up) Debug.ignoreCut(Motion.endAt(t.bend, [{ transform: KNOCKED }, { transform: 'rotate(0deg)' }], { duration: SCAR_MS, easing: 'ease-in' }), 'a tulip coming up')
    for (const t of state.trees) if (t.felled) Debug.ignoreCut(Motion.endAt(t.body, [{ transform: `rotate(${t.side * 84}deg)` }, { transform: 'rotate(0deg)' }], { duration: SCAR_MS, easing: 'ease-in' }), 'a young tree standing up')
  }

  /** He goes to his knocked-over tulips and stands each up again, gently: it springs up. Then, glad. */
  async function mend(alive) {
    recover() // gone already (a cut, then this again): coming up by themselves meanwhile
    for (const t of state.knocked) {
      if (t.up) continue
      await m().goTo(t.x + 60)
      if (!alive()) return
      Mole.lookAt(t.x)
      await Mole.lean(14, 600) // he bends to it
      if (!alive()) return
      t.up = true
      const from = getComputedStyle(t.bend).transform
      t.bend.getAnimations().forEach((a) => a.cancel())
      Sound.plink()
      await Motion.endAt(t.bend, [{ transform: from === 'none' ? KNOCKED : from }, { transform: 'rotate(7deg)', offset: 0.7 }, { transform: 'rotate(0deg)' }], { duration: 650, easing: 'ease-out' })
      if (!alive()) return
    }
    Sound.say('tam')
    await Mole.cheer()
  }

  /** What it tore up stays where it was, on the meadow, and greens over. */
  function leaveScars() {
    const heap = dozer.querySelector('.heap')
    if (!heap) return // left already (away cut short and played again)
    const layer = document.getElementById('things')
    const left = el('g', { transform: `translate(${state.x} ${Y + 4}) scale(${DOZER.s})` }, layer)
    left.appendChild(heap) // its heap stays by the pit
    scars.push(left)
    for (const sc of scars) {
      // from as it is (the road shows at 0.85): Motion.endAt sets the end first, so a start must be given
      const from = getComputedStyle(sc).opacity
      Debug.ignoreCut(Motion.endAt(sc, [{ opacity: from }, { opacity: 0 }], { duration: SCAR_MS }).then(() => sc.remove()), 'it greens over')
    }
  }

  /** Where a dropped pole can stand by him without standing on another. */
  function freeSpot(x) {
    const { from, to } = Layout.DIG
    x = Math.min(to, Math.max(from, x))
    for (let tries = 0; tries < 8 && poles.some((p) => p.where === 'line' && Math.abs(p.x - x) < 60); tries++) x = Math.max(from, x - 70)
    return x
  }

  /** Cut short: a pole in his hands stands up by him; one in the air lands; the bulldozer stands where it was going, on the meadow, in the pit if it was stuck. */
  function restore() {
    m().frame(null) // he may go anywhere now: the view follows him
    if (far) far.getAnimations().forEach((a) => a.cancel()) // its walk down the hill rejects: overTheHill's finally takes it away
    for (const p of poles) p.wrap.getAnimations().forEach((a) => a.cancel())
    for (const p of poles) {
      if (p.where === 'line') stand(p, p.x, p.y, p.s, 'things') // planted, not in mid-air where its flight was cut short
      if (p.where === 'far') stand(p, p.x, p.y, p.s, 'far-things')
      if (p.where === 'flat') p.wrap.style.transform = lying(p)
      if (p.where !== 'carried') continue
      Mole.carry(null)
      p.node.style.transform = ''
      p.where = 'line'
      stand(p, freeSpot(Mole.state.x + 40), Y + 4, 1, 'things')
    }
    restoreFlowers()
    if (dozer) {
      for (const e of [dozer, ...dozer.querySelectorAll('.heap, .hull')]) e.getAnimations().forEach((a) => a.cancel())
      for (const t of state.trees) fell(t, true) // it passed them all, on its way to where it stands
      document.getElementById('things').appendChild(dozer) // back on the meadow, where it was going
      dozer.style.transform = dozerAt(state.x)
      dozer.querySelector('.hull').style.transform = state.stuck ? `rotate(${DIVE.deg}deg) translateY(${DIVE.dy}px)` : ''
      dozer.classList.toggle('stuck', state.stuck) // puffing hard in the pit, even if cut before it started
      syncRack()
    }
  }

  /** Cut short: what it harmed shows as it ends up (flat, knocked over); a tulip he stood up stands; once
   * it has gone, they keep coming up. */
  function restoreFlowers() {
    for (const t of state.knocked) {
      if (t.up) { // stood up by him: up, even if cut as it sprang
        t.bend.getAnimations().forEach((a) => a.cancel())
        t.bend.style.transform = 'rotate(0deg)'
      } else if (!state.recovering) t.bend.getAnimations().forEach((a) => a.cancel()) // knocked over (its end), not yet coming up
    }
    if (!state.recovering) for (const g of state.flat) g.getAnimations().forEach((a) => a.cancel()) // flat
  }

  function night() {
    restore()
    if (dozer) dozer.remove()
    dozer = null
    for (const sc of scars.splice(0)) sc.remove() // a new day: the meadow green again
    for (const e of [...state.flat, ...state.knocked.map((t) => t.bend)]) {
      e.getAnimations().forEach((a) => a.cancel())
      e.style.transform = '' // and every flower up
    }
    for (const t of state.trees) {
      t.body.getAnimations().forEach((a) => a.cancel())
      t.body.style.transform = '' // bent, not broken: up again
    }
    state.flat = []
    state.knocked = []
    state.recovering = false
  }

  Things.add({
    name: 'poles',
    offer: 'discover',
    urgent: true, // a bulldozer won't wait for a tap: he goes to see at once (things.js)
    engageMs: 3000, // when it can't break off his play (still waking), he goes to see soon: nothing shows till he does
    trouble: [0, 8], // from its rumble till it is gone: the bed uneasy, and no glad theme…
    music: { 8: 'happy' }, // …until he stands his tulips up again
    appear,
    plant,
    steps: [farOff, comesIn, shootsLine, notice, crush, throwOne, pit, away, mend],
    restore,
    night,
    detail: () => ({ poles: poles.map((p) => p.where), dozer: !!dozer, stuck: state.stuck, pit: state.pit, flat: state.flat.length, knocked: state.knocked.filter((t) => !t.up).length, cast: [] }),
  })
})()
