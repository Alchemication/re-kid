// The far pond and its heron (invented, Adam 2026-11-01: "a distant bird might
// be a heron, obviously would need a small pond"). A little pond lies at the
// meadow's far edge, reeds at its ends, there all day. Now and then a grey
// heron comes flying in from out of sight on slow wingbeats, lands at the
// water's edge and stands there, still as a post; every so often it leans,
// stretches its neck, and stabs at the water, sometimes coming up with a
// little silver fish, gone in a gulp. Then it flies off the way herons do,
// legs trailing. Far off and small, as all the wildlife (Adam: far in the
// distance, so it doesn't distract).
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
  const POND = { x: 640, y: 650, rx: 110, ry: 12 } // at the meadow's far edge behind his home end, where the child looks most; clear of the poles' hill and the spring
  const SIZE = 0.42 // far off
  const VISITS = 2 // at most this many a day
  const LOOK_MS = 5000
  const FIRST = [9, 13] // the first may come between these hours…
  const GAP_HOURS = 2.5 // …the next at least this long after it left
  const STAB_MS = [4000, 9000] // standing this long between stabs
  const CATCH = 0.4 // this share of stabs come up with a fish
  const HERON = {
    speed: 120, flee: 1.6, turn: 1.4, blown: 0.1, // slow, heavy wingbeats
    stayMs: [45000, 80000], hours: [8.5, 18.3], dark: 0.5, wet: 'avoid',
    feeds: 'fish', hungerMs: [0, 0], feedMs: [35000, 60000], // it comes to fish: it stands there a long while
    startledBy: ['rumble', 'thunder', 'vroom'],
    band: [430, POND.y], roam: 1600, haunt: [POND.x - 900, POND.x + 900], exitY: 360, // roam: it sees the pond from far off
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
    WildArt.el('path', { d: `M${POND.x - 70} ${POND.y - 3} h50 M${POND.x + 10} ${POND.y + 2} h40`, stroke: '#a9c6dc', 'stroke-width': 2, 'stroke-linecap': 'round' }, g)
    for (const [dx, h] of [[-118, 34], [-108, 26], [-98, 38], [104, 30], [114, 40], [124, 24]]) {
      WildArt.el('path', { d: `M${POND.x + dx} ${POND.y + 2} q2 ${-h / 2} -2 ${-h}`, stroke: '#4f6b2e', 'stroke-width': 2.5, fill: 'none' }, g)
      if (h > 32) WildArt.el('ellipse', { cx: POND.x + dx - 1, cy: POND.y - h + 2, rx: 2.6, ry: 6, fill: '#6b4a2b' }, g) // a bulrush head
    }
    World.offer('far-pond', 'fish', POND.x - POND.rx + 30, POND.y - 2, () => true)
    World.offer('far-pond-left', 'drink', POND.x - POND.rx - 20, POND.y + 4, () => true)
    World.offer('far-pond-right', 'drink', POND.x + POND.rx + 20, POND.y + 4, () => true)
  }

  /** It comes flying in from out of sight, high, and down to the pond. */
  function come(opened = false) {
    const { x0, x1 } = World.state.view
    const x = comings() < 0.5 ? Math.min(x0, POND.x - 900) - 200 : Math.max(x1, POND.x + 900) + 200
    const c = Creature.make(opened ? { ...HERON, hours: [0, 24] } : HERON, x, 420, Clock.now(), comings) // asked for: its hours opened
    const g = WildArt.el('g', { class: 'far-heron flying', 'data-critter': 'heron' }, layer)
    const art = WildArt.heron(g)
    heron = { c, g, art, neck: art.querySelector('.neck'), nextStab: 0 }
    visits++
    Debug.trace('heron', { comes: true })
    Ambient.add(c, { name: 'heron', id: visits, rnd: comings, draw, gone })
  }

  function draw(c) {
    const h = heron
    const fishing = c.goal?.kind === 'feed' && Math.hypot(c.vx, c.vy) < 10
    h.g.classList.toggle('flying', !fishing)
    const face = c.vx > 3 ? -1 : 1 // drawn facing left
    if (fishing || Math.abs(c.vx) > 3) h.face = face
    h.g.setAttribute('transform', `translate(${c.x} ${c.y}) scale(${SIZE * (h.face ?? 1)} ${SIZE})`)
    if (fishing && Clock.now() > h.nextStab) stab(h)
    if (!fishing) h.nextStab = Clock.now() + 2000 + life() * 3000 // landed: it stands a moment before the first
  }

  /** It leans and stabs at the water; sometimes a little silver fish, gone in a gulp. */
  function stab(h) {
    h.nextStab = Clock.now() + STAB_MS[0] + life() * (STAB_MS[1] - STAB_MS[0])
    Debug.ignoreCut(Motion.endAt(h.neck, [
      { transform: 'rotate(0deg) translate(0px, 0px)' },
      { transform: 'rotate(-14deg) translate(-6px, 0px)', offset: 0.45 }, // leaning, stretching out
      { transform: 'rotate(-58deg) translate(-12px, 26px)', offset: 0.55 }, // stab!
      { transform: 'rotate(-30deg) translate(-6px, 10px)', offset: 0.75 },
      { transform: 'rotate(0deg) translate(0px, 0px)' },
    ], { duration: 1600, easing: 'ease-in-out' }), 'the heron stabs')
    if (life() < CATCH) Clock.after(1150, () => fish(h))
  }

  /** A little silver fish in its bill, flicking, gone in a gulp. */
  function fish(h) {
    if (heron !== h) return
    const f = WildArt.el('path', { d: 'M-84 -202 q8 -6 16 0 q-8 6 -16 0 z M-68 -202 l6 -4 l0 8 z', fill: '#c9d3da', stroke: '#15140f', 'stroke-width': 1.5 }, h.neck)
    Motion.endAt(f, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 700 }).then(() => f.remove(), () => f.remove())
    Debug.trace('heron', { fish: true })
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

  return { setup, tap, POND, get out() { return heron ? { x: Math.round(heron.c.x), goal: heron.c.goal?.kind ?? null } : null } }
})()
