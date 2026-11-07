// The owl in the oak (invented, not from the films; Adam's pick, 2026-11-07):
// on some plays a tawny owl lives in the knot-hole up the oak's trunk. By
// day it sleeps there, sitting in the hole, eyes shut. When he calls into
// the arch below (oak.js, the echo), the first time the hollow answers
// him; after that, while the owl sleeps, a sleepy "hoo?" comes down
// instead: he looks up, it opens its eyes at him, blinks, shuts them again,
// and he creeps off, a hand to his mouth. From OUT_AT it wakes, hops out
// and flies down onto the broken-off limb below it (Layout.OAK.perch), and sits there the evening and
// night through, its eyes following him; it hoots only between the
// cricket's tunes (Music.between), never over them. A tap on it: by day it
// opens an eye at him and shuts it; once it is out, he goes and stands
// under it and they play, a different way each time (rounds): it tilts its
// head over and he copies it till he nearly topples; it turns its head
// right round and he looks behind himself for what it saw; it winks and he
// tries to, and screws up both eyes.
//
// Drawn in code into the oak's layer (#oak), over the tap target, in its
// own units (its feet at 0, 0, its neck at NECK). It moves only on the
// Clock (Motion.endAt; its wings beat on a CSS loop as it flies,
// game.css .owl), and restore() puts it back as it sits at once when a tap
// cuts a visit short.

/* global Clock, Debug, Layout, Mole, Motion, Music, Sound */
/* exported Owl */
const Owl = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const INK = '#2f2a22'
  const COAT = '#8a6340' // a tawny owl's brown
  const WING = '#6e4c2e'
  const DISC = '#e3c99b' // its face, and its lids
  const BELLY = '#d4b48a'
  const CHANCE = 0.6 // on this share of plays an owl lives in the oak
  const [KX, KY, , KRY] = Layout.OAK.knot // the knot-hole it sleeps in
  const IN_HOLE = { x: KX, y: KY + KRY * 0.82, s: 0.7 } // sitting in the hole: its feet on the hole's lip, smaller (further in)
  const PERCH = { ...Layout.OAK.perch, s: 1 } // on the broken-off limb out of the trunk's right side
  const STAND = PERCH.x - 6 // where he stands to look up at it
  const NECK = -80 // its neck, in its units: its head turns and tilts about this
  const OUT_AT = 18.5 // the hour it wakes and comes out: the sun low, before the cricket
  const POP_MS = 700 // out of the hole and towards us
  const FLY_MS = 1900 // over onto the limb, wings beating
  const HOOT_REST_S = 4 // after each of the cricket's tunes (one or two a play), it hoots, and he waits this much longer before the next
  const HOOT_AFTER_MS = 1200 // into that quiet, it hoots
  const GAZE_MAX = 4 // its pupils, at most this far across (its units)
  const TILT = 70 // its head over this far, tilting at him (degrees)
  const ROUND = 26 // its face, turned right round, gone this far to the side as it goes
  const random = Debug.random('meadow-owl') // whether it lives here, how a visit goes: its own stream

  let g = null // the whole, where it sits
  let bob = null // lifts its head as it hoots
  let head = null // turns and tilts about the neck
  let face = null // the disc, eyes and beak: what slides away as it turns its head round
  let back = null // the back of its head, shown as it does
  let pupils = null
  const lids = [] // left, right
  let state = 'none' // 'none' (not this play), 'asleep', 'coming', 'perched'
  let calls = 0 // his calls into the arch below it
  let posing = false // its head over or round (a visit): the rule says never once he is free
  let gazeNow = 0
  let goTo, next // the meadow's (setup)

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const line = (w = 2.2) => ({ stroke: INK, 'stroke-width': w, 'stroke-linejoin': 'round' })
  const at = ({ x, y, s }) => `translate(${x}px, ${y}px) scale(${s})`

  /** A wing, its shoulder at 0, 0, hanging down along its side (`dir` -1 its left, 1 its right). */
  function wing(dir, parent) {
    const outer = el('g', { transform: `translate(${dir * 30} -68) scale(${-dir} 1)` }, parent)
    const w = el('g', { class: 'owl-wing' }, outer)
    el('path', { d: 'M0 0 C14 16 16 44 -2 64 C-8 42 -8 18 0 0 Z', fill: WING, ...line() }, w)
    for (const y of [22, 36, 50]) el('path', { d: `M2 ${y} Q6 ${y + 4} 9 ${y - 2}`, fill: 'none', stroke: INK, 'stroke-width': 1.2 }, w)
    return w
  }

  /** The owl, facing us, its feet at 0, 0. */
  function draw(into) {
    const body = el('g', { class: 'owl-body' }, into)
    for (const dx of [-11, 11]) el('ellipse', { cx: dx, cy: -2, rx: 7, ry: 4, fill: '#c9a24a', ...line(1.6) }, body)
    el('ellipse', { cx: 0, cy: -46, rx: 34, ry: 44, fill: COAT, ...line() }, body)
    el('ellipse', { cx: 0, cy: -40, rx: 22, ry: 31, fill: BELLY }, body)
    for (const [x, y] of [[-9, -56], [8, -52], [-2, -42], [-11, -32], [9, -30], [0, -20]]) el('path', { d: `M${x - 3} ${y} L${x} ${y + 5} L${x + 3} ${y}`, fill: 'none', stroke: WING, 'stroke-width': 1.6 }, body)
    wing(-1, body)
    wing(1, body)
    const neck = el('g', { transform: `translate(0 ${NECK})` }, into)
    bob = el('g', { class: 'owl-bob' }, neck) // up a little as it hoots: apart from the head's turns, so neither undoes the other
    head = el('g', { class: 'owl-head' }, bob)
    el('circle', { cx: 0, cy: -22, r: 31, fill: COAT, ...line() }, head)
    back = el('g', { class: 'owl-back', opacity: 0 }, head)
    for (const [x, y] of [[-12, -34], [8, -30], [-2, -18], [14, -14], [-14, -12]]) el('path', { d: `M${x - 5} ${y} Q${x} ${y + 5} ${x + 5} ${y}`, fill: 'none', stroke: WING, 'stroke-width': 1.6 }, back)
    face = el('g', { class: 'owl-face' }, head)
    for (const dx of [-13, 13]) el('circle', { cx: dx, cy: -22, r: 16, fill: DISC, stroke: '#6a4a2c', 'stroke-width': 1.5 }, face)
    el('path', { d: 'M-24 -38 Q-13 -34 0 -28 Q13 -34 24 -38', fill: 'none', stroke: WING, 'stroke-width': 2.4 }, face) // its brow
    pupils = el('g', {}, face)
    for (const dx of [-13, 13]) {
      el('circle', { cx: dx, cy: -22, r: 9, fill: '#1b1510' }, pupils)
      el('circle', { cx: dx + 3, cy: -25, r: 2.6, fill: '#fff' }, pupils)
    }
    for (const dx of [-13, 13]) {
      const lid = el('g', { class: 'owl-lid' }, face)
      el('circle', { cx: dx, cy: -22, r: 10.5, fill: DISC }, lid)
      el('path', { d: `M${dx - 10} -20 Q${dx} -14 ${dx + 10} -20`, fill: 'none', stroke: INK, 'stroke-width': 1.8, 'stroke-linecap': 'round' }, lid)
      lid.style.transformBox = 'fill-box'
      lid.style.transformOrigin = 'center top'
      lids.push(lid)
    }
    el('path', { d: 'M-4 -15 L4 -15 L0 -5 Z', fill: '#d9b44a', ...line(1.2) }, face)
  }

  /** Its lids: 1 shut, 0 open (each, or [left, right]). */
  function eyes(k, ms = 0) {
    const ks = Array.isArray(k) ? k : [k, k]
    return Promise.all(lids.map((lid, i) => (ms
      ? Motion.endAt(lid, [{ transform: `scaleY(${ks[i]})` }], { duration: ms, easing: 'ease-in-out' })
      : void (lid.style.transform = `scaleY(${ks[i]})`))))
  }

  const blink = () => Promise.all(lids.map((lid) => Motion.endAt(lid, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)', offset: 0.5 }, { transform: 'scaleY(0)' }], { duration: 260 })))

  /** Its face slid round towards `dir` (-1, 1: away, the back of its head to us) or back to us (0), over ms
   * (0: at once). */
  function turnFace(dir, ms, easing = 'ease-in-out') {
    const to = { transform: dir ? `translateX(${dir * ROUND}px) scaleX(0.2)` : 'translateX(0px) scaleX(1)', opacity: dir ? 0 : 1 }
    if (!ms) {
      Object.assign(face.style, { transform: '', opacity: '' })
      back.style.opacity = 0
      return Promise.resolve()
    }
    return Promise.all([Motion.endAt(face, [to], { duration: ms, easing }), Motion.endAt(back, [{ opacity: dir ? 1 : 0 }], { duration: ms })])
  }

  const turnHead = (frames, ms) => Motion.endAt(head, frames, { duration: ms, easing: 'ease-in-out' })

  /** Draw it, on this play's share: asleep in the knot-hole. `meadow`: its `goTo` and `rounds`. */
  function setup(layer, meadow) {
    goTo = meadow.goTo
    const forced = Layout.flags.owl // '1' always, '0' never, 'out' out on its limb from the start
    const here = random() < CHANCE // drawn either way, so a flag shifts nothing else
    if (forced === '0' || (!forced && !here)) return
    g = el('g', { class: 'owl' }, layer)
    draw(g)
    el('circle', { cx: 0, cy: -60, r: 72, fill: 'none', 'pointer-events': 'all' }, g) // the tap target: the owl and a little round it
    next = meadow.rounds(Object.keys(VISITS), random)
    Music.between(rest)
    if (forced === 'out') return sit(PERCH, 'perched')
    sit(IN_HOLE, 'asleep')
  }

  function sit(where, now) {
    state = now
    g.style.transform = at(where)
    eyes(now === 'asleep' ? 1 : 0)
  }

  /** The hour: at OUT_AT, once he is free (not at it, nor at the oak), it wakes and comes out; out, its eyes
   * follow him. */
  function tick(h, free) {
    if (state === 'asleep' && h >= OUT_AT && free) Debug.ignoreCut(comeOut(), 'the owl comes out')
    if (state === 'perched' && !posing) gaze(Mole.state.x - PERCH.x)
  }

  /** Its pupils towards something dx away across the meadow. */
  function gaze(dx) {
    const to = Math.round(Math.max(-GAZE_MAX, Math.min(GAZE_MAX, dx / 80)))
    if (to === gazeNow) return
    gazeNow = to
    pupils.style.transform = `translateX(${to}px)`
  }

  /** Awake: a blink or two, out of the hole towards us, and over onto the limb, wings beating. */
  async function comeOut() {
    state = 'coming'
    Debug.trace('owl', { out: true })
    await eyes(0, 600)
    await blink()
    await Clock.wait(500)
    const hop = { x: KX + 14, y: IN_HOLE.y + 26, s: 0.95 }
    await Motion.endAt(g, [{ transform: at(IN_HOLE) }, { transform: at(hop) }], { duration: POP_MS, easing: 'ease-out' })
    g.classList.add('flying')
    const mid = { x: (hop.x + PERCH.x) / 2, y: Math.min(hop.y, PERCH.y) - 90, s: 1 } // up in an arc, and down onto it
    await Motion.endAt(g, [{ transform: at(hop) }, { transform: at(mid), offset: 0.55 }, { transform: at(PERCH) }], { duration: FLY_MS, easing: 'ease-in-out' })
    g.classList.remove('flying')
    state = 'perched'
    Debug.trace('owl', { perched: true })
  }

  /** The cricket has played a tune (Music.between): if it is out, it hoots into a longer quiet before the next.
   * Seconds the cricket waits longer. */
  function rest() {
    if (state !== 'perched') return 0
    Clock.after(HOOT_AFTER_MS, hoot)
    return HOOT_REST_S
  }

  /** Its hoot, into the quiet: booked on the game's clock, the next tune on the audio clock, so if the page
   * stalled between, a tune may have begun: then it keeps quiet. */
  function hoot() {
    if (state !== 'perched') return
    const over = Music.part
    Debug.trace('owl', { hoots: !over, over })
    if (over) return
    Sound.hoot()
    Debug.ignoreCut(Motion.endAt(bob, [{ transform: 'translateY(0px)' }, { transform: 'translateY(-6px)', offset: 0.3 }, { transform: 'translateY(0px)' }], { duration: 900 }), 'the owl hoots')
  }

  /** His call into the arch below, counted: does it wake the sleeping owl? The first call of the play the hollow
   * answers him; after that, while it sleeps, the owl does. */
  function called() {
    if (state !== 'asleep') return false
    calls += 1
    return calls > 1
  }

  /** It answered his call ("hoo?"): he looks up, it opens its eyes at him, blinks, and shuts them; he
   * creeps off, a hand to his mouth. */
  async function answerCall(alive) {
    if (!(await wake(alive))) return
    await creepOff(alive)
  }

  /** Woken in its hole: a sleepy "hoo?", its eyes open at him, a blink, shut again. True if still his. */
  async function wake(alive) {
    Sound.hoot(true)
    Debug.trace('owl', { woken: true })
    await Clock.wait(400)
    if (!alive()) return false
    Mole.lookAt(KX)
    Mole.perk(1.4)
    Mole.feel('ooh', 1400)
    await eyes([0, 1], 300) // one eye first
    await Clock.wait(300)
    if (!alive()) return false
    await eyes(0, 250)
    gaze(Mole.state.x - KX)
    await Clock.wait(700)
    if (!alive()) return false
    await blink()
    await Clock.wait(500)
    if (!alive()) return false
    await eyes(1, 700)
    return alive()
  }

  async function creepOff(alive) {
    await Mole.handsToFace(800)
    if (!alive()) return
    await goTo(Mole.state.x + 140)
  }

  // ------------------------------------------------------------ a tap on it, once it is out

  const VISITS = {
    /** It tilts its head over at him; he tilts too, more, as it goes further, till he nearly topples; a giggle. */
    async tilt(alive) {
      const dir = random() < 0.5 ? -1 : 1
      await turnHead([{ transform: `rotate(${dir * TILT * 0.4}deg)` }], 500)
      if (!alive()) return
      await Mole.lean(dir * 12, 900)
      if (!alive()) return
      await turnHead([{ transform: `rotate(${dir * TILT}deg)` }], 500)
      if (!alive()) return
      Sound.say('hm')
      await Mole.totter(dir)
      if (!alive()) return
      await turnHead([{ transform: 'rotate(0deg)' }], 400)
      if (!alive()) return
      Sound.say('giggle')
      await Mole.handsToFace(600)
    },

    /** Its head turns right round, its face gone; he looks behind himself for what it saw; nothing. It comes
     * round the other side to face him again, and he jumps. */
    async turn(alive) {
      const dir = random() < 0.5 ? -1 : 1
      await turnFace(dir, 700, 'ease-in')
      if (!alive()) return
      Mole.show('side', dir)
      Sound.say('hm')
      await Clock.wait(1000)
      if (!alive()) return
      Mole.show('side', -dir)
      await Clock.wait(900)
      if (!alive()) return
      face.style.transform = `translateX(${-dir * ROUND}px) scaleX(0.2)` // round the other side
      await turnFace(0, 600, 'ease-out')
      if (!alive()) return
      Mole.show('front')
      Sound.say('gasp')
      await Mole.handsToFace(600, 'fright')
      if (!alive()) return
      Sound.say('giggle')
      await Mole.handsToFace(500)
    },

    /** It winks at him, slowly; he tries it back and screws up both eyes. */
    async wink(alive) {
      const side = random() < 0.5 ? 0 : 1
      await eyes(side ? [0, 1] : [1, 0], 400)
      await Clock.wait(500)
      if (!alive()) return
      await eyes(0, 300)
      if (!alive()) return
      Mole.feel('squeezed', 1100)
      await Mole.lean(side ? 6 : -6, 1100)
      if (!alive()) return
      Sound.say('giggle')
      await Mole.cheer()
    },
  }

  /** A tap on the owl: by day, in its hole, it opens an eye at him and shuts it; out, he goes and stands
   * under it, and they play (VISITS, a different way each time). */
  async function visit(alive) {
    if (state === 'asleep') {
      Mole.lookAt(KX)
      await goTo(Layout.OAK.x + 80)
      if (!alive()) return
      Mole.show('three', -1)
      await eyes([0, 1], 300)
      gaze(Mole.state.x - KX)
      await Clock.wait(900)
      if (!alive()) return
      await eyes(1, 400)
      if (!alive()) return
      Sound.say('giggle', true)
      return void (await Mole.handsToFace(600))
    }
    if (state !== 'perched') return void Mole.lookAt(PERCH.x) // on its way up: he only looks
    await goTo(STAND)
    if (!alive()) return
    Mole.show('front')
    Mole.perk(1)
    const how = next()
    Debug.trace('owl visit', { how })
    posing = true
    try {
      await VISITS[how](alive)
    } finally {
      if (alive()) posing = false
    }
  }

  /** A visit cut short: its head upright, its face round to us, its eyes as they were (shut in its hole). */
  function restore() {
    if (state !== 'asleep' && state !== 'perched') return // not here, or coming out on its own: nothing of his to undo
    posing = false
    for (const e of [head, face, back, ...lids]) e.getAnimations().forEach((a) => a.cancel())
    head.style.transform = ''
    turnFace(0, 0)
    eyes(state === 'asleep' ? 1 : 0)
  }

  return {
    setup,
    tick,
    called,
    answerCall,
    visit,
    restore,
    /** After each of the cricket's tunes (Music.between): seconds of quiet more, a hoot booked into them. */
    rest,
    /** 'none', 'asleep', 'coming' or 'perched' (for the tests and the overlay). */
    get state() { return state },
    /** Its head over or round (a visit under way)? */
    get posing() { return posing },
  }
})()
