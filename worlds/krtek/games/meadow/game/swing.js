// The swing under the chestnut (autumn's; after Krtek a zápalky 2:30, where the mole and the mouse swing on
// one hung from the chestnut). Built while Adam was away (2026-11-08), his to judge.
//
// Two ropes hang from the tree's long right limb to a plank seat, all play. A tap on it: he climbs on and
// swings, a different way each time (rounds): higher and higher, leaves shaken down on him from the
// branch, and he hops off giggling; or, at the top of a swing, he lets go, flies out and lands in the
// leaves at the tree's foot, and they fly up round him. A cut puts him down by the seat at once, and the
// swing swings itself still.
//
// Drawn into the tree's layer (#oak), behind him: he sits on its seat. It moves only on the Clock
// (Motion.endAt).

/* global Autumn, Debug, Layout, Mole, Motion, Sound */
/* exported Swing */
const Swing = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const INK = '#2f2a22'
  const X = 440 // the seat's middle, under the limb
  const PIVOT = [X, 112] // where the ropes hang from, under the limb (Layout.OAK.trunk)
  const SEAT_Y = 640 // the seat, at rest
  const SIT = 82 // standing on its seat, he is lifted this much off the ground
  const SWING_MS = 1100 // one swing, front to back
  const ARC = [6, 10, 14] // how far each swing goes (degrees), higher and higher
  const LEN = SEAT_Y - PIVOT[1]
  const random = Debug.random('meadow-swing')

  let g = null
  let swinging = false // he is on it
  let next = null
  let goTo = null

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const swung = (deg) => `rotate(${deg}deg)`
  const along = (deg) => X - LEN * Math.sin((deg * Math.PI) / 180) // where the seat is, swung so far (turned clockwise, it swings left)

  function draw(layer) {
    g = el('g', { class: 'swing' }, layer)
    g.style.transformOrigin = `${PIVOT[0]}px ${PIVOT[1]}px`
    for (const dx of [-30, 30]) {
      el('path', { d: `M${X + dx} ${PIVOT[1]} L${X + dx} ${SEAT_Y}`, stroke: '#6b5434', 'stroke-width': 3.5 }, g)
      el('path', { d: `M${X + dx} ${PIVOT[1]} L${X + dx} ${SEAT_Y}`, stroke: 'transparent', 'stroke-width': 26, 'pointer-events': 'stroke' }, g) // a rope is thin: a wider band takes the tap
    }
    el('rect', { x: X - 44, y: SEAT_Y, width: 88, height: 11, rx: 3, fill: '#9a6a3c', stroke: INK, 'stroke-width': 2.4 }, g)
  }

  /** Swing from `from` degrees to `to`, him on it (lifted, gliding with the seat). */
  async function swing(from, to, ms = SWING_MS) {
    await Promise.all([
      Motion.endAt(g, [{ transform: swung(from) }, { transform: swung(to) }], { duration: ms, easing: 'ease-in-out' }),
      Mole.glide(along(to), ms, SIT, 'ease-in-out'), // upright on the seat: Mole.lean dips and comes back, it can't hold a tilt with the ropes
    ])
  }

  /** Onto the seat: to it, and a hop up. */
  async function climbOn(alive) {
    await goTo(X)
    if (!alive()) return false
    Mole.show('front')
    Sound.squeak()
    await Mole.perch(SIT, 500)
    swinging = true
    return alive()
  }

  /** The swing swings itself still, from where it is. */
  function settle(fromDeg) {
    const frames = [fromDeg, -fromDeg * 0.6, fromDeg * 0.3, 0].map((d) => ({ transform: swung(d) }))
    Debug.ignoreCut(Motion.endAt(g, frames, { duration: SWING_MS * 2.4, easing: 'ease-in-out' }), 'the swing comes to rest')
  }

  const RIDES = {
    /** Higher and higher; leaves shaken down on him from the branch; he hops off, giggling. */
    async higher(alive) {
      if (!(await climbOn(alive))) return
      Sound.say('ooh')
      let at = 0
      for (const deg of ARC) {
        for (const to of [deg, -deg]) {
          await swing(at, to)
          at = to
          if (!alive()) return
        }
        Autumn.drop() // the branch shakes: a leaf comes down
      }
      Sound.say('giggle')
      await swing(at, 0, SWING_MS * 0.7)
      if (!alive()) return
      await Mole.perch(0, 400)
      swinging = false
      await Mole.cheer()
    },

    /** At the top of a swing he lets go, flies out, and lands in the leaves at the tree's foot. */
    async jump(alive) {
      if (!(await climbOn(alive))) return
      let at = 0
      for (const to of [-ARC[0], ARC[0], -ARC[1], ARC[2]]) { // back, then high towards the tree (left)
        await swing(at, to)
        at = to
        if (!alive()) return
      }
      Sound.say('gasp')
      swinging = false
      const land = Layout.clampX(along(at) - 130) // out, towards the tree's foot
      settle(at)
      await Promise.all([Mole.glide(land, 700, SIT + 60, 'ease-out'), Mole.lean(-20, 1000)]) // flung out, a dip and back
      if (!alive()) return
      await Mole.glide(land, 300, 0, 'ease-in')
      Sound.swish()
      Autumn.burst(land) // the leaves fly up round him
      if (!alive()) return
      Mole.feel('delighted', 1200)
      Sound.say('giggle')
      await Mole.handsToFace(700)
    },
  }

  /** Hang it under the chestnut, on an autumn play. `meadow`: its goTo and rounds. */
  function setup(layer, meadow) {
    random() // drawn either way
    if (!Layout.inSeason('swing')) return
    goTo = meadow.goTo
    next = meadow.rounds(Object.keys(RIDES), random)
    draw(layer)
  }

  /** A tap on it: he climbs on and swings (RIDES, a different way each time). */
  async function ride(alive) {
    if (!g) return
    const how = next()
    Debug.trace('swing', { how })
    await RIDES[how](alive)
  }

  /** Cut short: he is put down by the seat, and the swing swings itself still. */
  function restore() {
    if (!g) return
    const t = getComputedStyle(g).transform
    const deg = t && t !== 'none' ? (Math.atan2(new DOMMatrixReadOnly(t).b, new DOMMatrixReadOnly(t).a) * 180) / Math.PI : 0
    g.getAnimations().forEach((a) => a.cancel())
    g.style.transform = swung(0)
    if (swinging) {
      swinging = false
      Mole.put(Layout.clampX(X + 70), 'out')
    }
    if (Math.abs(deg) > 1) settle(deg)
  }

  return {
    setup, ride, restore,
    /** Is he on it? */
    get on() { return swinging },
  }
})()
