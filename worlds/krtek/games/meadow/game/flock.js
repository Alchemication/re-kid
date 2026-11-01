// The birds of the far trees (invented, Adam 2026-11-01: wildlife there most
// of the day): a few small finches, red-breasted as the spring's, living in
// the trees along the meadow's far edge. They sit a while in a crown, then
// flit to another, now and then two at once; small and far off, so they never
// take the eye from what happens in front.
//
// What they do comes from the world model (creature.js on world.js): the
// trees' crowns offer a `perch` (painting.js paints them and says where);
// a bird goes from one to the next, sits there a while, and wanders the air
// between. The bulldozer's rumble, the car and thunder send them up and away
// out of sight; a tap on one, that one. They come back by ones and twos once
// it has been quiet a while (the meadow all right again), and go into the
// trees as the light falls.
//
// They are there as the day starts, sitting in the trees. A still play
// (?still) has none, unless ?critters=flock asks for them.

/* global Ambient, Clock, Creature, Debug, Painting, Sound, WildArt, World */
/* exported Flock */
const Flock = (() => {
  const BIRDS = [3, 5] // how many live in the far trees (each play draws)
  const SIZE = 0.6 // against their own drawing: small, far off
  const QUIET_MS = 25000 // after a fright, this long quiet before they start to come back…
  const BACK_MS = [4000, 9000] // …then one comes back about this often
  const LOOK_MS = 2000 // how often the flock looks whether one may come back
  const SCARY = ['rumble', 'thunder', 'vroom'] // what sends them off, and keeps them away a while
  const CHIRPS = 0.3 // this share of landings come with a chirp: now and then, never a chorus
  const BIRD = {
    speed: 170, flee: 2.4, turn: 4, blown: 0.2, // a quick flit; scared, off fast; a gust nudges them
    stayMs: [600000, 900000], // they live here: they go only when scared, or at dusk
    hours: [8, 19.2], dark: 0.45, wet: 'avoid', // into the trees as the light falls, and out of the rain
    feeds: 'perch', hungerMs: [3000, 12000], feedMs: [7000, 18000], // from one tree to the next, sitting a good while
    startledBy: SCARY,
    band: [430, 590], roam: 700, haunt: [80, 3920], // in the air above the far edge
  }

  const comings = Debug.random('meadow-flock') // how many, where they sit, when they come back
  const flits = Debug.random('meadow-flock-flits') // their flying, every frame: its own
  let layer = null
  let want = 0
  const out = new Map() // id → { c, g }
  let nextId = 1
  let quietSince = 0 // the last fright heard
  let heard = 0
  let nextBack = 0

  /** Each crown of the far trees offers a perch (painting.js says where it painted them). */
  function offerPerches() {
    Painting.perches.forEach((p, i) => World.offer(`far-tree-${i}`, 'perch', p.x, p.y, () => true))
  }

  /** A bird at x, y: sitting already (the day's start), or flying in from out of sight. */
  function bird(x, y, sitting) {
    const id = nextId++
    const c = Creature.make(BIRD, x, y, Clock.now(), comings)
    if (sitting) c.hungry = Clock.now() + 2000 + comings() * 10000 // sat a while already
    const g = WildArt.el('g', { class: 'far-bird', 'data-critter': `flock ${id}` }, layer)
    WildArt.bird(g)
    out.set(id, { c, g })
    Ambient.add(c, {
      name: 'flock', id, rnd: flits,
      arrived: (b, kind) => { if (kind === 'feed' && flits() < CHIRPS) Sound.chirp() }, // landed in a crown: now and then a chirp
      draw: (b) => {
        const perched = b.goal?.kind === 'feed' && Math.hypot(b.vx, b.vy) < 8
        if (g.flying !== !perched) g.classList.toggle('flying', (g.flying = !perched))
        const face = b.vx > 2 ? -1 : b.vx < -2 ? 1 : (g.face ?? 1) // drawn facing left; sitting, as it came
        g.face = face
        const at = `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) scale(${SIZE * face} ${SIZE})`
        if (at !== g.at) g.setAttribute('transform', (g.at = at)) // a sitting bird: no write
      },
      gone: () => {
        g.remove()
        out.delete(id)
      },
    })
  }

  /** Every couple of seconds: a fright heard keeps them away a while; once it has been quiet, one comes back. */
  function look() {
    const t = Clock.now()
    if (World.heard(World.state.view.x0, heard).some((n) => SCARY.includes(n.kind))) quietSince = t
    heard = World.heardUpTo
    if (out.size >= want || t - quietSince < QUIET_MS || t < nextBack) return
    const hour = World.state.hour
    if (hour < BIRD.hours[0] || hour > BIRD.hours[1] - 0.3 || World.state.light < 0.6 || World.isWet(World.state.view.x0)) return
    const { x0, x1 } = World.state.view
    bird(comings() < 0.5 ? x0 - 200 : x1 + 200, BIRD.band[0] + comings() * 80, false)
    nextBack = t + BACK_MS[0] + comings() * (BACK_MS[1] - BACK_MS[0])
    Debug.trace('flock', { back: out.size })
  }

  /** As the day starts: a few birds sitting in the far trees, near where he is. */
  function setup(into, { still = false, now = false } = {}) {
    layer = into
    want = BIRDS[0] + Math.floor(comings() * (BIRDS[1] - BIRDS[0] + 1))
    const perches = [...Painting.perches]
    const firstAt = perches.map(() => comings()) // drawn either way, so asking for them shifts nothing
    offerPerches()
    if (still && !now) return
    const { x0, x1 } = World.state.view.x1 ? World.state.view : { x0: 0, x1: 1600 }
    const near = perches.map((p, i) => ({ p, r: firstAt[i] })).filter(({ p }) => p.x > x0 - 400 && p.x < x1 + 400).sort((a, b) => a.r - b.r)
    for (const { p } of near.slice(0, want)) bird(p.x, p.y, true)
    Clock.every(LOOK_MS, look)
  }

  /** A tap on one: it flies off (it comes back later, with the others). */
  function tap(id) {
    const b = out.get(id)
    if (!b) return null
    b.c.tapped = true
    return { x: b.c.x }
  }

  return { setup, tap, get count() { return out.size } }
})()
