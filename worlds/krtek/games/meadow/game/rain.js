// The little rain cloud (he helps someone: the flowers), Adam's pick of three
// (2026-10-25), and the meadow's watering now: it comes now and then, as an
// encounter, instead of a watering can always to hand.
//
// A patch of wild flowers stands in the middle of the meadow all day. When
// this encounter's hour comes, the sun beats down and they droop, and a small
// lonely cloud drifts in from off the right and stops just past them. He goes to the flowers, sighs,
// and looks up at the cloud. He blows at it: it drifts the wrong way, over
// him, and rains on him (the laugh). He tries from the other side just as the
// hare hops by: it rains on the hare, who shakes the drops off all over him.
// Then he gets right under it and pushes it along with both hands over the
// flowers, and it rains on them: they stand up one after another. A rainbow
// arches over the meadow (the surprise), the cloud drifts off, and the
// flowers stay up for the rest of the day.
//
// A tap on the cloud or the flowers hurries it on; a tap elsewhere waits for
// the step to end, then cuts it short (things.js): the hare goes home, the
// cloud stays where it is, and the next tap carries on from the next step.
// Nothing comes from nowhere: the flowers were always there, the cloud and
// the hare come in from out of sight and go off again, the rainbow fades.

/* global Clock, Debug, DOMMatrixReadOnly, Friends, Layout, Mole, Motion, Sound, Things, World */
;(() => {
  const Y = Layout.GROUND
  const PATCH = { x: 1640, w: 190 } // the wild flowers, in the middle of the meadow
  const FLOWERS = 7
  const CLOUD_Y = 420 // how high the cloud drifts: just over his head, so it reads as near
  const CLOUD_SIZE = 1.35
  const CLOUD_WAITS = PATCH.x + 430 // it drifts in from off the right and stops just past the flowers
  const DRIFT_MS = 6000
  const RAIN_MS = 1800
  const QUICK = 0.5 // picked up after a cut: everyone hurries
  const WET_AFTER_MS = 45000 // the grass under it stays wet this long after it rains: long enough for the snail's outing

  const flowers = [] // { g, head, x }
  const cast = Friends.troupe()
  const state = { cloud: null, x: CLOUD_WAITS, drooped: false, wet: false, hare: false, watered: false, again: false }
  const m = () => Things.meadow
  /** Its own drawing helper: the flowers are planted as the page loads, before the meadow lends its. */
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const pace = (ms) => (state.again ? ms * QUICK : ms)

  /** The patch of wild flowers, standing all day (moved from its place only by drooping and standing up). */
  function plant() {
    const layer = document.getElementById('things')
    for (let i = 0; i < FLOWERS; i++) {
      const x = PATCH.x - PATCH.w / 2 + (i * PATCH.w) / (FLOWERS - 1)
      const top = Y - 78 - (i % 3) * 18
      const g = el('g', { class: 'wild-flower', 'data-thing': 'rain' }, layer)
      const sway = el('g', { class: 'sway' }, g) // leans in the wind (weather.js); g droops
      sway.style.transformOrigin = `${x}px ${Y + 6}px`
      el('path', { d: `M${x} ${Y + 6} Q${x + 5} ${(Y + top) / 2} ${x} ${top}`, stroke: '#3f7d22', 'stroke-width': 5, fill: 'none' }, sway)
      el('path', { d: `M${x} ${Y - 10} c-22 -8 -28 -24 -22 -38 c12 8 20 20 22 34`, fill: '#4d6d1f' }, sway)
      const head = el('g', {}, sway)
      const colour = ['#e0453a', '#f2c94c', '#f08fa6'][i % 3]
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2
        el('ellipse', { cx: x + Math.cos(a) * 12, cy: top + Math.sin(a) * 12, rx: 11, ry: 7, fill: colour, stroke: '#7a1f17', 'stroke-width': 1.5, transform: `rotate(${(a * 180) / Math.PI} ${x + Math.cos(a) * 12} ${top + Math.sin(a) * 12})` }, head)
      }
      el('circle', { cx: x, cy: top, r: 7, fill: '#f2c230', stroke: '#7a1f17', 'stroke-width': 1.2 }, head)
      g.style.transformOrigin = `${x}px ${Y + 6}px`
      flowers.push({ g, x })
      World.offer(`wild-${i}`, 'nectar', x, top, () => !state.drooped || state.watered) // drooping, nothing for a butterfly
    }
  }

  /** The flowers droop (k = 1) or stand up (0): each bends over from its foot. */
  const droop = (f, k, ms) => Motion.endAt(f.g, [{ transform: `rotate(${k * 38}deg) scaleY(${1 - k * 0.12})` }], { duration: ms, easing: 'ease-out' })

  function drawCloud() {
    const g = el('g', { class: 'rain-cloud', 'data-thing': 'rain' }, document.getElementById('things'))
    const puffs = [[-48, 6, 30], [-16, -10, 38], [24, -4, 34], [52, 10, 24], [0, 14, 30]]
    for (const [x, y, r] of puffs) el('circle', { cx: x, cy: y, r: r + 2.5, fill: '#5f6a72' }, g) // its outline
    for (const [x, y, r] of puffs) el('circle', { cx: x, cy: y, r, fill: '#e9edf2' }, g)
    el('path', { d: 'M-70 22 H76', stroke: '#c9d1da', 'stroke-width': 10, 'stroke-linecap': 'round' }, g)
    // a face, a little sleepy, as cartoon clouds have
    el('path', { d: 'M-14 4 q5 4 10 0 M10 4 q5 4 10 0', stroke: '#5f6a72', 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round' }, g)
    return g
  }

  const cloudAt = (x) => `translate(${x}px, ${CLOUD_Y}px) scale(${CLOUD_SIZE})`

  /** The cloud drifts to x over ms. */
  function drift(x, ms, easing = 'ease-in-out') {
    const from = cloudAt(state.x)
    state.x = x
    return Motion.endAt(state.cloud, [{ transform: from }, { transform: cloudAt(x) }], { duration: ms, easing })
  }

  /** It rains from the cloud for ms: drops from under it, wherever it is drawn. */
  function rain(ms) {
    const drops = document.getElementById('drops')
    const n = Math.round(ms / 22)
    Sound.water(ms / 1000)
    World.wet(state.x - 110, state.x + 110, ms + WET_AFTER_MS) // under the cloud, and wet underfoot a while after
    for (let i = 0; i < n; i++) {
      Clock.after(i * 22, () => {
        if (!state.cloud) return
        const t = getComputedStyle(state.cloud).transform
        const cx = t && t !== 'none' ? new DOMMatrixReadOnly(t).e : state.x
        const x = cx + ((i * 37) % 170) - 85
        const d = el('path', { d: 'M0 0 l-3 22', stroke: '#4f7fc6', 'stroke-width': 5, 'stroke-linecap': 'round' }, drops)
        Motion.endAt(d, [{ transform: `translate(${x}px, ${CLOUD_Y + 40}px)` }, { transform: `translate(${x - 8}px, ${Y - 10}px)`, opacity: 0.5 }], { duration: 420, easing: 'ease-in' })
          .then(() => d.remove(), () => d.remove())
      })
    }
    return Clock.wait(ms)
  }

  /** A spray of drops shaken off at x, flying out to either side. */
  function shakeDrops(x, y) {
    const drops = document.getElementById('drops')
    for (let k = 0; k < 10; k++) {
      const d = el('circle', { r: 3.5, fill: '#6f9ad6' }, drops)
      const a = Math.PI + (k / 9) * Math.PI
      Motion.endAt(d, [{ transform: `translate(${x}px, ${y}px)` }, { transform: `translate(${x + Math.cos(a) * 110}px, ${y + Math.sin(a) * 50 + 60}px)`, opacity: 0 }], { duration: 600, easing: 'ease-out' })
        .then(() => d.remove(), () => d.remove())
    }
  }

  /** A shake, as a wet dog does: side to side, quick. */
  async function shake(alive) {
    for (const deg of [-10, 10, -8, 8]) {
      await Mole.lean(deg, 160)
      if (!alive()) return
    }
  }

  function appear() {
    // the sun beats down: the flowers droop; a little cloud drifts in from off the left
    if (!state.cloud) {
      state.cloud = drawCloud()
      state.x = Friends.offscreen(1, CLOUD_WAITS + 600)
      state.cloud.style.transform = cloudAt(state.x)
    }
    Debug.ignoreCut(drift(CLOUD_WAITS, DRIFT_MS, 'ease-out'), 'the cloud drifts in')
    flowers.forEach((f, i) => Clock.after(i * 250, () => Debug.ignoreCut(droop(f, 1, 1600), 'a flower droops')))
    state.drooped = true
  }

  // ------------------------------------------------------------ the chain

  /** He comes to the flowers, sighs, and looks up at the cloud. */
  async function notice(alive) {
    await m().goTo(PATCH.x - PATCH.w / 2 - 70)
    if (!alive()) return
    Sound.say('achJo')
    await Mole.lean(14, 900)
    if (!alive()) return
    Mole.lookAt(state.x)
    Mole.perk(1)
    await Mole.ponder(700)
  }

  /** He blows at the cloud: it drifts the wrong way, over him, and rains on him. */
  async function blow(alive) {
    if (state.wet) return
    await m().goTo(state.x + 160)
    if (!alive()) return
    Mole.lookAt(state.x)
    Sound.whoosh()
    await Mole.lean(-16, 600)
    if (!alive()) return
    await drift(Mole.state.x, pace(1400)) // off it goes… straight over him
    if (!alive()) return
    Sound.say('fright')
    await rain(pace(RAIN_MS))
    if (!alive()) return
    state.wet = true
    shakeDrops(Mole.state.x, Y - 120)
    await shake(alive)
    if (!alive()) return
    Sound.say('giggle')
  }

  /** From the other side, just as the hare hops by: it rains on the hare, who shakes it all over him. */
  async function hare(alive) {
    if (state.hare) return
    const h = cast.call('hare', Friends.offscreen(1, state.x + 700), -1)
    await m().goTo(state.x - 150)
    if (!alive()) return
    await h.go(state.x + 40, pace(2000), 30)
    if (!alive()) return
    Sound.whoosh()
    await Promise.all([Mole.lean(18, 600), drift(state.x + 40, pace(900))])
    if (!alive()) return
    await rain(pace(RAIN_MS))
    if (!alive()) return
    Sound.splash()
    shakeDrops(h.x, Y - 90)
    await Promise.all([h.jolt(), shake(alive)])
    if (!alive()) return
    state.hare = true
    cast.dismiss(h) // off he hops, dripping
  }

  /** He gets right under it and pushes it with both hands over the flowers; it rains on them, and up they stand. */
  async function push(alive) {
    if (state.watered) return
    await m().goTo(state.x)
    if (!alive()) return
    Mole.carry(el('g')) // both hands up, against the cloud
    try {
      const to = PATCH.x
      Sound.say('ooh')
      await Promise.all([Mole.walkTo(to), drift(to, Math.abs(to - state.x) * 4.5 + 300, 'linear')])
      if (!alive()) return
    } finally {
      Mole.carry(null)
    }
    await m().goTo(PATCH.x - PATCH.w / 2 - 90) // out from under it
    if (!alive()) return
    const raining = rain(2600)
    for (const [i, f] of flowers.entries()) {
      Clock.after(300 + i * 350, () => {
        droop(f, 0, 500)
        Sound.pop()
      })
    }
    await raining
    if (!alive()) return
    state.watered = true
    Debug.trace('watered')
  }

  /** A rainbow arches over the meadow; he cheers; the cloud drifts off. */
  async function rainbow(alive) {
    const bow = el('g', { class: 'rainbow' }, document.getElementById('far-things'))
    ;['#e0453a', '#f0913a', '#f2c94c', '#6fae4c', '#4d79c7', '#7a5bb5'].forEach((c, k) => {
      el('path', { d: `M${PATCH.x - 620 + k * 9} 640 A${620 - k * 9} ${430 - k * 9} 0 0 1 ${PATCH.x + 620 - k * 9} 640`, stroke: c, 'stroke-width': 9, fill: 'none', opacity: 0.55 }, bow)
    })
    Motion.endAt(bow, [{ opacity: 0 }, { opacity: 1 }], { duration: 1500 })
      .then(() => Clock.wait(9000))
      .then(() => Motion.endAt(bow, [{ opacity: 1 }, { opacity: 0 }], { duration: 3000 })) // a rainbow fades
      .then(() => bow.remove(), () => bow.remove())
    Sound.say('ooh')
    const off = Friends.offscreen(1, state.x + 900) // on its way, off to the right
    await Promise.all([Mole.cheer(), drift(off, DRIFT_MS, 'ease-in')])
    if (!alive()) return
    state.cloud.remove()
    state.cloud = null
    for (const f of flowers) f.g.removeAttribute('data-thing') // done: they're the meadow's now
  }

  /** Cut short: the hare goes home; the cloud stays where it drifted to; the flowers as they are. */
  function restore() {
    cast.dismissAll()
    Mole.carry(null)
    state.again = true
    if (state.cloud) {
      state.cloud.getAnimations().forEach((a) => a.cancel())
      const t = getComputedStyle(state.cloud).transform
      state.x = t && t !== 'none' ? new DOMMatrixReadOnly(t).e : state.x // where it is drawn now, not where it was going
      state.cloud.style.transform = cloudAt(state.x)
    }
  }

  /** Bedtime: the hare home, the cloud gone with the dark. */
  function night() {
    restore()
    cast.dismissAll(true)
    if (state.cloud) state.cloud.remove()
    state.cloud = null
  }

  plant()
  World.offer('wild-leaves', 'shelter', PATCH.x - 40, Y + 40) // down in the grass under the wild flowers' leaves: the snail's

  Things.add({
    name: 'rain',
    offer: 'help',
    music: { 0: 'sad', 3: 'happy' }, // drooping flowers; the rain on them
    appear,
    steps: [notice, blow, hare, push, rainbow],
    restore,
    night,
    detail: () => ({ cloud: Math.round(state.x), wet: state.wet, hare: state.hare, watered: state.watered, cast: cast.kinds() }),
  })
})()
