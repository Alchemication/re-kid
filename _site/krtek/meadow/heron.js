// The far pond and its heron (invented, Adam 2026-11-01: "a distant bird might
// be a heron, obviously would need a small pond"). A little pond lies at the
// meadow's far edge, reeds at its ends, there all day; where, and how big,
// each play draws (Adam, 2026-11-02). Now and then a grey heron comes flying
// in from out of sight on slow wingbeats, lands in the shallows at one end,
// somewhere new each visit, and fishes as herons do, facing out over the water
// (Adam, 2026-11-02: like it would in real life): hunched, still as a post;
// now and then its neck slowly out over the water, head low, watching; a
// freeze; then a strike quicker than the eye, tipping right over, legs bent,
// its bill in the water with a splash. Mostly nothing, and it eases back to
// wait; sometimes it comes up with a little silver fish, head up, bill to the
// sky, and down it goes. Then it flies off the way herons do, legs
// trailing. Each visit its own heron: its own size, and now and then a young
// one, greyer, its black crest not grown yet (Adam: make it look real). Far
// off and small, as all the wildlife (Adam: far in the distance, so it
// doesn't distract).
//
// What it does comes from the world model (creature.js on world.js): the pond
// offers a `fish` where it stands, and a `drink` at either end (the deer come
// to it: wildlife.js); the heron goes home out of its hours, in the dim and
// the rain, and flees the bulldozer's rumble, the car, thunder, and a tap.
// Its fishing is its own, here.
//
// ?critters=heron asks for it at once; a still play has none unless asked.

/* global Ambient, Clock, Creature, Debug, Motion, Sound, WildArt, World */
/* exported Heron */
const Heron = (() => {
  const POND = { x: 640, y: 650, rx: 110, ry: 12 } // where it lies this play (setup draws x and rx)
  const SPOTS = [[420, 700], [2850, 3100]] // its middle in one of these stretches of the far edge: clear of his molehill and flower bed, the poles' hill, the spring's ferns and the painter's garden…
  const NEAR_HOME = 0.6 // …in this share of plays the first, near his home, where the child is most
  const SIZE_RX = [85, 130] // how wide (half its width)
  const WADE = [0.5, 0.85] // the heron stands this far out from the middle towards an end (of its half width): in the shallows
  const SIZE = [0.36, 0.48] // far off; each heron its own size…
  const YOUNG = { share: 0.25, size: [0.3, 0.36] } // …and in this share of visits a young one, smaller, its crest not grown
  const VISITS = 2 // at most this many a day
  const LOOK_MS = 5000
  const FIRST = [9, 13] // the first may come between these hours…
  const GAP_HOURS = 2.5 // …the next at least this long after it left
  // Its poses, [lean, neck, crouch]: its body tipped at the hip (deg, < 0 forward), its neck from the body,
  // its body sunk this much (its own units) as its legs bend
  const POSE = {
    wait: [0, 8, 0], // hunched, neck drawn in
    stalk: [-15, -25, 0], // neck out over the water, head low, watching
    strike: [-55, -50, 22], // tipped right over, legs bent, bill in the water
    gulp: [6, 24, 0], // head up, bill to the sky: down it goes
  }
  const WAIT_MS = [3000, 8000] // still as a post this long…
  const STALK_MS = 1800 // …then its neck slowly out…
  const FREEZE_MS = [600, 2200] // …a freeze…
  const STRIKES = 0.6 // …and this share of them end in a strike; the rest, it eases back and waits
  const STRIKE_MS = 170 // quicker than the eye
  const DOWN_MS = 300 // its bill in the water this long
  const CATCH = 0.4 // this share of strikes come up with a fish
  const UP_MS = 500
  const GULP_MS = 700 // the fish in its bill, bill to the sky, this long before it's gone
  const SPLASH = { x: -100, ms: 900 } // where its bill goes in (its own units, ahead of its feet), the rings spreading this long
  const HERON = {
    speed: 120, flee: 1.6, turn: 1.4, blown: 0.1, // slow, heavy wingbeats
    stayMs: [45000, 80000], hours: [8.5, 18.3], dark: 0.5, wet: 'avoid',
    feeds: 'fish', hungerMs: [0, 0], feedMs: [35000, 60000], // it comes to fish: it stands there a long while
    startledBy: ['rumble', 'thunder', 'vroom'],
    band: [430, POND.y], roam: 1600, exitY: 360, // roam: it sees the pond from far off (its haunt: about the pond, come)
  }

  const comings = Debug.random('meadow-heron')
  const life = Debug.random('meadow-heron-life')
  let layer = null
  let heron = null // { c, g, nextStab }
  let visits = 0
  let nextAt = null

  /** The pond: dark water with a light rim, reeds at its ends; it offers fish where the heron stands, and a drink at either end. */
  function drawPond() {
    const g = WildArt.el('g', { class: 'far-pond' }, null)
    layer.insertBefore(g, layer.firstChild) // on the ground, under whatever comes to it
    WildArt.el('ellipse', { cx: POND.x, cy: POND.y, rx: POND.rx + 6, ry: POND.ry + 3, fill: '#7a8f5a' }, g)
    WildArt.el('ellipse', { cx: POND.x, cy: POND.y, rx: POND.rx, ry: POND.ry, fill: '#5d86a8', stroke: '#3d5f7a', 'stroke-width': 2 }, g)
    const k = POND.rx / 110 // its glints and reeds drawn for a pond this much the first one's size
    WildArt.el('path', { d: `M${POND.x - 70 * k} ${POND.y - 3} h${50 * k} M${POND.x + 10 * k} ${POND.y + 2} h${40 * k}`, stroke: '#a9c6dc', 'stroke-width': 2, 'stroke-linecap': 'round' }, g)
    for (const [dx, h] of [[-8, 34], [2, 26], [12, 38], [-6, 30], [4, 40], [14, 24]].map(([d, h], i) => [i < 3 ? -POND.rx + d : POND.rx + d, h * (0.8 + comings() * 0.4)])) {
      WildArt.el('path', { d: `M${POND.x + dx} ${POND.y + 2} q2 ${-h / 2} -2 ${-h}`, stroke: '#4f6b2e', 'stroke-width': 2.5, fill: 'none' }, g)
      if (h > 32) WildArt.el('ellipse', { cx: POND.x + dx - 1, cy: POND.y - h + 2, rx: 2.6, ry: 6, fill: '#6b4a2b' }, g) // a bulrush head
    }
    World.offer('far-pond-left', 'drink', POND.x - POND.rx - 20, POND.y + 4, () => true)
    World.offer('far-pond-right', 'drink', POND.x + POND.rx + 20, POND.y + 4, () => true)
  }

  /** It comes flying in from out of sight, high, and down to the pond. */
  function come(opened = false) {
    const { x0, x1 } = World.state.view
    const x = comings() < 0.5 ? Math.min(x0, POND.x - 900) - 200 : Math.max(x1, POND.x + 900) + 200
    const end = comings() < 0.5 ? -1 : 1 // where it fishes this visit: the shallows at one end, somewhere new
    World.offer('far-pond', 'fish', POND.x + end * POND.rx * (WADE[0] + comings() * (WADE[1] - WADE[0])), POND.y - 2 + comings() * 4, () => true)
    const traits = { ...HERON, haunt: [POND.x - 900, POND.x + 900], ...(opened ? { hours: [0, 24] } : {}) } // asked for: its hours opened
    const c = Creature.make(traits, x, 420, Clock.now(), comings)
    const g = WildArt.el('g', { class: 'far-heron flying', 'data-critter': 'heron' }, layer)
    const young = comings() < YOUNG.share
    const [lo, hi] = young ? YOUNG.size : SIZE
    const art = WildArt.heron(g, { young })
    heron = { c, g, art, size: lo + comings() * (hi - lo), young, lean: art.querySelector('.lean'), neck: art.querySelector('.neck'), pose: 'wait', fishing: false, hunting: false }
    visits++
    Debug.trace('heron', { comes: true })
    Ambient.add(c, { name: 'heron', id: visits, rnd: comings, draw, gone })
  }

  function draw(c) {
    const h = heron
    const fishing = c.goal?.kind === 'feed' && Math.hypot(c.vx, c.vy) < (h.fishing ? 40 : 10) // once down, settling doesn't lift it
    if (fishing !== h.fishing) {
      h.fishing = fishing
      Debug.trace('heron', { fishing })
      h.g.classList.toggle('flying', !fishing)
      if (fishing && !h.hunting) hunt(h)
      if (!fishing && h.pose !== 'wait') Debug.ignoreCut(pose(h, 'wait', 250), 'the heron straightens to fly') // off: straight up out of whatever it was at
    }
    if (fishing) h.face = c.x < POND.x ? -1 : 1 // out over the water (drawn facing left: -1 mirrors it)
    else if (Math.abs(c.vx) > 3) h.face = c.vx > 0 ? -1 : 1 // flying: the way it goes
    h.g.setAttribute('transform', `translate(${c.x} ${c.y}) scale(${h.size * (h.face ?? 1)} ${h.size})`)
  }

  const between = ([a, b]) => a + life() * (b - a)
  const leanAt = ([lean, , crouch]) => `translate(0px, ${crouch}px) rotate(${lean}deg)`
  const neckAt = ([, neck]) => `rotate(${neck}deg)`

  /** From the pose it is in to another (POSE), over ms. */
  function pose(h, name, ms, easing = 'ease-in-out') {
    const from = POSE[h.pose]
    const to = POSE[name]
    h.pose = name
    return Promise.all([
      Motion.endAt(h.lean, [{ transform: leanAt(from) }, { transform: leanAt(to) }], { duration: ms, easing }),
      Motion.endAt(h.neck, [{ transform: neckAt(from) }, { transform: neckAt(to) }], { duration: ms, easing }),
    ])
  }

  /** Its fishing, as herons do, for as long as it stands in the shallows: wait, stalk, freeze, and now and then strike. */
  async function hunt(h) {
    h.hunting = true
    const on = () => heron === h && h.fishing
    const move = (name, ms, easing) => Debug.ignoreCut(pose(h, name, ms, easing), 'the heron fishes')
    while (on()) {
      await Clock.wait(between(WAIT_MS))
      if (!on()) break
      await move('stalk', STALK_MS)
      await Clock.wait(between(FREEZE_MS))
      if (!on()) break
      if (life() >= STRIKES) {
        await move('wait', 1200) // nothing worth it: back to waiting
        continue
      }
      await move('strike', STRIKE_MS, 'ease-in')
      splash(h)
      Debug.trace('heron', { strike: true })
      await Clock.wait(DOWN_MS)
      if (!on()) break
      const f = life() < CATCH ? fish(h) : null
      await move(f ? 'gulp' : 'wait', UP_MS)
      if (!f) continue
      await Clock.wait(GULP_MS)
      f.remove() // down it goes
      if (on()) await move('wait', 600)
    }
    h.hunting = false
  }

  /** Rings spreading on the water where its bill went in. */
  function splash(h) {
    const r = WildArt.el('ellipse', { cx: SPLASH.x, cy: 2, rx: 8, ry: 2.5, fill: 'none', stroke: '#e3eef5', 'stroke-width': 3 }, h.art)
    r.style.transformBox = 'fill-box'
    r.style.transformOrigin = 'center'
    Motion.endAt(r, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(4)', opacity: 0 }], { duration: SPLASH.ms, easing: 'ease-out' })
      .then(() => r.remove(), () => r.remove())
  }

  /** A little silver fish in its bill: it comes up with it. */
  function fish(h) {
    Debug.trace('heron', { fish: true })
    return WildArt.el('path', { d: 'M-84 -202 q8 -6 16 0 q-8 6 -16 0 z M-68 -202 l6 -4 l0 8 z', fill: '#c9d3da', stroke: '#15140f', 'stroke-width': 1.5 }, h.neck)
  }

  function gone() {
    heron.g.remove()
    heron = null
    nextAt = World.state.hour + GAP_HOURS
  }

  /** Every few seconds: may it come (its hours, the gap since the last, dry, light)? */
  function look(asked = false) {
    if (heron) return
    const hour = World.state.hour
    if (!asked && (visits >= VISITS || hour < nextAt || hour > HERON.hours[1] - 1 || World.state.light < 0.6 || World.isWet(POND.x))) return
    come(asked)
  }

  /** The pond, drawn now (there all day); the heron's first visit drawn now. `now`: ?critters=heron. */
  function setup(into, { still = false, now = false } = {}) {
    layer = into
    const [lo, hi] = SPOTS[comings() < NEAR_HOME ? 0 : 1]
    POND.x = Math.round(lo + comings() * (hi - lo))
    POND.rx = Math.round(SIZE_RX[0] + comings() * (SIZE_RX[1] - SIZE_RX[0]))
    drawPond()
    nextAt = FIRST[0] + comings() * (FIRST[1] - FIRST[0])
    if (still && !now) return
    Clock.every(LOOK_MS, () => look())
    if (now) look(true)
  }

  /** A tap on it: it lifts its head, and flies off, croaking. */
  function tap() {
    if (!heron) return null
    heron.c.tapped = true
    Sound.heron()
    return { x: heron.c.x }
  }

  return { setup, tap, POND, get out() { return heron ? { x: Math.round(heron.c.x), goal: heron.c.goal?.kind ?? null, face: heron.face ?? 1, pose: heron.pose } : null } }
})()
