// The toy car (to discover), after Krtek a autíčko: a toy car lies broken in
// the grass beyond the spring, its two wheels off beside it. He knocks on it ("ooh"), fetches
// a wheel and pops it on; the second slips out of his hands and rolls off
// back towards the spring, and he chases it (the laugh). He winds the key
// on its back, climbs in, and it shoots off backwards (the surprise), then
// zooms to the far end of the meadow, turns, and brings him all the way back
// to park by his molehill, where it stays, as the film ends with the car parked by
// the molehill at night. Tapped again once it's mended, it gives him a ride.
//
// A tap on the car or on him hurries it on; a tap elsewhere cuts it short
// (things.js): a wheel in his hands goes down by him, and if he was riding,
// he climbs out where the car stopped.

/* global Debug, Layout, Mole, Motion, Sound, Things */
;(() => {
  const Y = Layout.GROUND
  const LIES_AT = 3000 // where it lies broken, in the grass beyond the spring
  const WHEELS_AT = [2860, 3100] // where its wheels lie
  const ROLLS_TO = 2680 // the second wheel rolls off this far, back towards the spring
  const PARK_AT = 560 // where he parks it, by his molehill
  const TURN_AT = 3780 // where it turns, at the far end of the meadow
  const SEAT = 34 // how far up he sits in it
  const ZOOM_MS_PER_UNIT = 1.6

  const car = { x: LIES_AT, wheels: 0, wound: false, riding: false, face: 1, back: null, front: null, loose: [] }
  const m = () => Things.meadow
  const el = (...args) => m().el(...args)

  function drawWheel() {
    const g = el('g', { class: 'car-wheel' })
    el('circle', { r: 20, fill: '#2b2b2b', stroke: '#15140f', 'stroke-width': 3 }, g)
    el('circle', { r: 8, fill: '#e8e8e8' }, g)
    return g
  }

  /** The car in two layers: its back behind him (he sits in it), its side panel in front. */
  function drawCar() {
    car.back = el('g', { class: 'thing car', 'data-thing': 'car' }, document.getElementById('things'))
    const back = el('g', { class: 'car-shape' }, car.back)
    el('path', { d: 'M-96 -40 q6 -30 40 -34 l20 -30 h64 q16 0 24 30 q40 4 46 34 z', fill: '#c9302c', stroke: '#15140f', 'stroke-width': 3 }, back)
    el('path', { d: 'M-30 -100 l14 -22 h34 q10 0 16 22', fill: '#cfe3f7', stroke: '#15140f', 'stroke-width': 3 }, back)
    const key = el('g', { class: 'car-key' }, back)
    el('path', { d: 'M-104 -56 h-14 m0 -10 v20 a10 10 0 1 1 -12 -10 a10 10 0 1 1 12 -10', fill: '#d9b45a', stroke: '#15140f', 'stroke-width': 2.5 }, key)
    key.style.transformOrigin = '-110px -56px'
    car.key = key
    car.front = el('g', { class: 'thing car', 'data-thing': 'car' }, document.getElementById('friends'))
    const front = el('g', { class: 'car-shape' }, car.front)
    el('path', { d: 'M-110 -10 v-34 q0 -10 14 -10 h192 q14 0 18 14 v30 z', fill: '#e2453f', stroke: '#15140f', 'stroke-width': 3 }, front)
    el('path', { d: 'M-90 -34 h170', stroke: '#fff', 'stroke-width': 4, opacity: 0.7 }, front)
    el('circle', { cx: 110, cy: -30, r: 7, fill: '#f6e27a', stroke: '#15140f', 'stroke-width': 2 }, front)
    car.slots = [el('g', { transform: 'translate(-62 -6)' }, front), el('g', { transform: 'translate(66 -6)' }, front)]
  }

  /** The car's transform: at x, facing `face`, tilted (lying broken), `dy` up (a shake). */
  const carAt = (x, face = car.face, tilt = 0, dy = 0) => `translate(${x}px, ${Y + 4 - dy}px) scaleX(${face}) rotate(${tilt}deg)`

  /** Stand the car at x, facing `face`, lying tilted while it has no wheels. */
  function place(x, face = car.face, tilt = car.wheels < 2 ? 6 : 0) {
    car.x = x
    car.face = face
    car.back.style.transform = car.front.style.transform = carAt(x, face, tilt)
  }

  /** Both of its layers through these keyframes (transforms). */
  const move = (frames, opts) => Promise.all([car.back, car.front].map((g) => Motion.endAt(g, frames.map((t) => ({ transform: t })), opts)))

  /** Move the car to x over ms, and him with it if he's riding, with the whirr for as long. */
  async function drive(x, ms, easing = 'ease-in-out') {
    const from = carAt(car.x)
    car.x = x
    Sound.vroom(ms / 1000)
    const rides = car.riding ? [Mole.glide(x - car.face * 10, ms, SEAT, easing)] : []
    await Promise.all([move([from, carAt(x)], { duration: ms, easing }), ...rides])
  }

  function appear() {
    drawCar()
    place(LIES_AT, 1)
    for (const [i, x] of WHEELS_AT.entries()) {
      const w = el('g', { class: 'thing car-wheel-lies', 'data-thing': 'car' }, document.getElementById('things'))
      w.appendChild(drawWheel())
      w.style.transform = `translate(${x}px, ${Y - 16}px)`
      car.loose[i] = { g: w, x }
    }
    Sound.plink()
  }

  // ------------------------------------------------------------ the chain

  /** He finds it: knock knock on the bonnet, "ooh". */
  async function find(alive) {
    await m().goTo(car.x + 150)
    if (!alive()) return
    Sound.knock()
    await Mole.knock()
    if (!alive()) return
    Sound.say('ooh')
    await Mole.lean(-12, 800)
  }

  /** Fetch wheel i and pop it on. The second slips and rolls away; he runs after it. */
  async function wheel(alive, i) {
    if (car.wheels > i) return
    const w = car.loose[i]
    await m().goTo(w.x + 40)
    if (!alive()) return
    w.g.remove()
    const held = drawWheel()
    Mole.carry(held)
    w.held = true
    if (i === 1 && !w.rolled) {
      // it slips out of his hands and rolls off towards his flowers
      Mole.carry(null)
      w.held = false
      document.getElementById('things').appendChild(w.g)
      Sound.say('fright')
      Sound.roll(1.2)
      const from = w.x
      w.x = ROLLS_TO // where it ends up, even if a tap cuts the roll short
      w.rolled = true
      await Motion.endAt(w.g, [{ transform: `translate(${from}px, ${Y - 16}px) rotate(0deg)` }, { transform: `translate(${ROLLS_TO}px, ${Y - 16}px) rotate(540deg)` }], { duration: 1300, easing: 'ease-out' })
      if (!alive()) return
      await m().goTo(ROLLS_TO - 40)
      if (!alive()) return
      w.g.remove()
      Mole.carry(held)
      w.held = true
      Sound.say('giggle')
    }
    await m().goTo(car.x + (i === 0 ? -150 : 150))
    if (!alive()) return
    Mole.carry(null)
    w.held = false
    car.slots[i].appendChild(drawWheel())
    car.wheels = i + 1
    place(car.x)
    Sound.pop()
    await Mole.cheer()
  }

  /** He winds the key on its back: it shakes, ready. */
  async function wind(alive) {
    if (car.wound) return
    await m().goTo(car.x - 150)
    if (!alive()) return
    Sound.crank()
    await Promise.all([
      Motion.endAt(car.key, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }, { transform: 'rotate(720deg)' }], { duration: 1200 }),
      Mole.knock(),
    ])
    if (!alive()) return
    car.wound = true
    const x = car.x
    await move([carAt(x), carAt(x, car.face, 0, 4), carAt(x), carAt(x, car.face, 0, 4), carAt(x)], { duration: 600 })
  }

  /** In he climbs; it shoots off backwards, then zooms across the meadow, turns, and comes back. */
  async function ride(alive, first = true) {
    if (car.face !== 1) place(car.x, 1, 0) // it always sets off facing the spring
    await m().goTo(car.x - 150) // up beside it (never a molehill under the car)...
    if (!alive()) return
    await Mole.walkTo(car.x) // ...and in
    if (!alive()) return
    await Mole.perch(SEAT, 500)
    if (!alive()) return
    car.riding = true
    Sound.say('ahoj')
    if (first) {
      Sound.say('fright')
      await drive(Math.max(160, car.x - 120 * car.face), 500, 'ease-out')
      if (!alive()) return
    }
    await drive(TURN_AT, Math.abs(TURN_AT - car.x) * ZOOM_MS_PER_UNIT)
    if (!alive()) return
    place(car.x, -1, 0)
    Sound.say('giggle')
    await Mole.cheer()
    if (!alive()) return
    await drive(PARK_AT, Math.abs(car.x - PARK_AT) * ZOOM_MS_PER_UNIT)
    if (!alive()) return
    place(car.x, 1, 0)
  }

  /** Parked by his molehill: out he climbs, delighted. */
  async function park(alive) {
    car.riding = false
    await Mole.perch(0, 400)
    if (!alive()) return
    await m().goTo(car.x + 150)
    if (!alive()) return
    Sound.say('giggle')
    await Mole.cheer()
    Debug.trace('parked', { x: car.x })
  }

  /** Cut short: a wheel in his hands goes down by him; if he was riding, he climbs out where the car stopped. */
  function restore() {
    for (const g of [car.back, car.front, car.key]) g.getAnimations().forEach((a) => a.cancel())
    place(car.x, 1) // turned round to face the spring, ready for the next ride
    if (car.riding) {
      car.riding = false
      Mole.put(Math.min(Layout.DIG.to, Math.max(Layout.DIG.from, car.x + 150)), 'out')
    }
    for (const [i, w] of car.loose.entries()) {
      if (!w || car.wheels > i) continue
      w.g.getAnimations().forEach((a) => a.cancel())
      if (w.held) {
        Mole.carry(null)
        w.held = false
        w.x = Math.max(Layout.DIG.from, Math.min(Layout.DIG.to, Mole.state.x - 40))
      }
      w.g.style.transform = `translate(${w.x}px, ${Y - 16}px)`
      if (!w.g.parentNode) document.getElementById('things').appendChild(w.g)
    }
  }

  Things.add({
    name: 'car',
    offer: 'discover',
    music: { 4: 'happy' }, // it goes: the ride
    appear,
    steps: [find, (alive) => wheel(alive, 0), (alive) => wheel(alive, 1), wind, (alive) => ride(alive, true), park],
    again: async (alive) => {
      Debug.trace('ride again')
      await ride(alive, false)
      if (alive()) await park(alive)
    },
    restore,
    night: restore,
    detail: () => ({ x: Math.round(car.x), wheels: car.wheels, wound: car.wound, riding: car.riding, cast: [] }),
  })
})()
