// The mouse and her trap. Some plays, a mouse trap baited with cheese stands
// by a mouse hole in the wall. After a while a mouse comes out, wants the
// cheese, and can't get it past the trap. Reksio stamps beside the trap: it
// snaps shut on nothing and flings the cheese to the mouse, who eats it and
// thanks him, and he noses the sprung trap away. After that she comes out
// to say hello, nose to nose, and each time something on top, a different
// thing each time (Things.VARIATIONS.trap): a crumb for him, her baby, hide
// and seek from her other hole along the wall, or a ride on his head.
//
// Everything here is drawn in the trap's coordinates; Layout.x('trap')
// moves it.

/* global Clock, Debug, Motion, Layout, Sound, Music, Reksio, Figure */
/* exported Mouse */
const Mouse = (() => {
  const X = Layout.x
  const PAW_REACH = 31 // from Reksio's middle to where his front paws land
  const MOUSE_AT_S = [14, 30] // the mouse comes out this long after the start
  const MOUSE_SCALE = 1.7 // cartoon-big, so a small child can see what she does
  const MOUSE_SPEED = 120 // scene units per second, scurrying
  // the trap thing as drawn (index.html), before its per-play offset
  const HOLE = { x: 1150, y: 706 } // the mouse hole at the foot of the wall
  const OTHER_HOLE = { x: 790, y: 706 } // her other hole, along the wall, behind him as he waits at the first: hide and seek
  const TRAP_X = 1080 // the trap's hinge
  const CHEESE = { x: 1100, y: 798 } // cheese on the trap's trigger
  const CHEESE_LANDS = 1175 // where the snap flings it, by the mouse
  const MOUSE_WAITS = 1195 // where she sits looking at the cheese she can't have
  const RIDE = 110 // how far he carries her on his head, and back
  const GROUND = 812

  const $ = (id) => document.getElementById(id)
  const wait = Clock.wait
  const random = Debug.random('mouse') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)
  let isEnded = () => false
  let burst = () => {}
  let heart = () => {}

  // mouse: 'away' (not out yet) | 'wanting' (out, can't reach the cheese) |
  // 'rescuing' | 'fed' (back in her hole, happy to say hello)
  let mouse = 'away'
  let visiting = false
  const mouseEl = $('mouse')
  const mousePos = { x: HOLE.x, y: HOLE.y, dir: -1 }

  function mouseAt(x, y, dir = mousePos.dir, el = mouseEl, scale = MOUSE_SCALE) {
    el.style.transform = `translate(${x + X('trap')}px, ${y}px) scale(${dir * scale}, ${scale})`
    if (el === mouseEl) Object.assign(mousePos, { x, y, dir })
  }

  /** Scurry to (x, y), little hops all the way. */
  async function scurry(x, y = GROUND, el = mouseEl, from = mousePos, scale = MOUSE_SCALE) {
    const dir = x < from.x ? -1 : 1
    const ms = (Math.hypot(x - from.x, y - from.y) / MOUSE_SPEED) * 1000 + 120
    const at = (px, py, lift = 0) => `translate(${px + X('trap')}px, ${py - lift}px) scale(${dir * scale}, ${scale})`
    const steps = Math.max(2, Math.round(ms / 110))
    const frames = []
    for (let i = 0; i <= steps; i++) {
      const k = i / steps
      frames.push({ transform: at(from.x + (x - from.x) * k, from.y + (y - from.y) * k, i % 2 ? 3 : 0) })
    }
    await el.animate(frames, { duration: ms }).finished
    if (el === mouseEl) mouseAt(x, y, dir)
    else el.style.transform = at(x, y)
  }

  /** Out of the hole: she grows from the dark. */
  async function peekOut(el = mouseEl) {
    el.style.opacity = '1'
    await el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 }).finished
  }

  async function goHome(el = mouseEl, from = mousePos, scale = MOUSE_SCALE) {
    await scurry(HOLE.x, HOLE.y, el, from, scale)
    await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250 }).finished
    el.style.opacity = '0'
  }

  /** Nose forward, a few quick sniffs. */
  async function mouseSniff(n = 3) {
    const head = $('mouse-head')
    for (let i = 0; i < n; i++) {
      await head.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], { duration: 160 }).finished
    }
  }

  /** Squeak n times; from afar (while she waits) it's heard as from where she is. */
  async function squeak(n = 1, afar = false) {
    for (let i = 0; i < n; i++) {
      if (afar) Sound.from(Math.abs(mousePos.x + X('trap') - Reksio.x), Sound.mouse)
      else Sound.mouse()
      await $('mouse-head').animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(0)' }], { duration: 220 }).finished
    }
  }

  /** Out she comes, and the trap becomes something to help with. */
  async function mouseComesOut() {
    if (mouse !== 'away' || isEnded()) return
    mouse = 'wanting'
    $('trap').classList.remove('not-yet')
    // a rescue cancels her animations mid-way: that ends this loop, quietly
    Debug.ignoreCut(mouseWants(), 'mouse wants')
  }

  /** While she can't get the cheese: creep up, reach, flinch back, look to Reksio. */
  async function mouseWants() {
    mouseAt(HOLE.x, HOLE.y, -1)
    await peekOut()
    await scurry(MOUSE_WAITS + 20)
    while (mouse === 'wanting' && !isEnded()) {
      await mouseSniff(2)
      if (mouse !== 'wanting') return
      await scurry(CHEESE.x + 50)
      if (mouse !== 'wanting') return
      // reaching for the cheese… and the trap: no!
      await $('mouse-head').animate([{ transform: 'rotate(0)' }, { transform: 'translateX(5px) rotate(10deg)' }], { duration: 400 }).finished
      Sound.from(Math.abs(mousePos.x + X('trap') - Reksio.x), Sound.mouse)
      if (mouse !== 'wanting') return
      await scurry(MOUSE_WAITS + rnd(0, 30))
      if (mouse !== 'wanting') return
      // turn to Reksio, a squeak: help?
      mouseAt(mousePos.x, mousePos.y, Reksio.x < mousePos.x + X('trap') ? -1 : 1)
      await squeak(2, true)
      await wait(rnd(2500, 5000))
      if (mouse !== 'wanting') return
      mouseAt(mousePos.x, mousePos.y, -1)
      if (random() < 0.25) {
        // back into the hole for a moment, then out again
        await goHome()
        await wait(rnd(1500, 3000))
        if (mouse !== 'wanting') return
        mouseAt(HOLE.x, HOLE.y, -1)
        await peekOut()
        await scurry(MOUSE_WAITS + 20)
      }
    }
  }

  async function rescue() {
    mouse = 'rescuing'
    mouseEl.getAnimations().forEach((a) => a.cancel())
    if (mouseEl.style.opacity !== '1') {
      mouseAt(HOLE.x, HOLE.y, -1)
      await peekOut()
    }
    await scurry(MOUSE_WAITS + 30)
    mouseAt(mousePos.x, mousePos.y, -1)
    Reksio.face(1)
    await Reksio.sniff(2)
    const trapBody = $('trap-body')
    const bar = $('trap-bar')
    const cheese = $('cheese')
    await Reksio.stamp(() => {
      Sound.stamp(0)
      Music.react.stamp()
      burst(Reksio.x + PAW_REACH, GROUND, 5, 'dust', { height: 22, reach: 40, size: 3.5 })
      // the thump sets the trap off: SNAP, it jumps, and the cheese flies
      Sound.trap()
      Motion.endAt(bar, [{ transform: 'rotate(0)' }, { transform: 'rotate(180deg)' }], { duration: 90, easing: 'ease-in' })
      trapBody.animate(
        [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-46px) rotate(-14deg)', offset: 0.45 }, { transform: 'translateY(0) rotate(0)' }],
        { duration: 520, easing: 'ease-out' },
      )
      const dx = CHEESE_LANDS - CHEESE.x
      Motion.endAt(
        cheese,
        [
          { transform: 'translate(0, 0) rotate(0)' },
          { transform: `translate(${dx * 0.5}px, -90px) rotate(200deg)`, offset: 0.5 },
          { transform: `translate(${dx}px, ${GROUND - CHEESE.y - 4}px) rotate(360deg)` },
        ],
        { duration: 700, easing: 'ease-in-out' },
      )
    })
    await Reksio.startle()
    await wait(500)
    // the mouse to her cheese
    mouseAt(mousePos.x, mousePos.y, -1)
    await squeak(1)
    await scurry(CHEESE_LANDS + 44)
    const cheeks = $('mouse-cheek')
    for (let i = 0; i < 5; i++) {
      Sound.nibble()
      cheese.style.opacity = String(1 - (i + 1) * 0.18)
      await $('mouse-head').animate([{ transform: 'rotate(0)' }, { transform: 'rotate(7deg)' }, { transform: 'rotate(0)' }], { duration: 260 }).finished
      cheeks.setAttribute('r', String(2 + i * 1.4))
      burst(CHEESE_LANDS + X('trap'), GROUND - 6, 1, 'cheese-crumb', { height: 14, reach: 16, size: 2 })
    }
    cheese.style.opacity = '0'
    await wait(300)
    cheeks.setAttribute('r', '0')
    // thank you
    mouseAt(mousePos.x, mousePos.y, Reksio.x < mousePos.x + X('trap') ? -1 : 1)
    await squeak(2)
    heart(mousePos.x + X('trap'), GROUND - 50)
    Music.react.wish()
    await wait(700)
    const home = goHome()
    // and the sprung trap: he noses it away, out of the yard
    if (await Reksio.walkTo(TRAP_X + X('trap') - 150)) {
      Reksio.face(1)
      Reksio.nod(16, 600)
      Sound.scrape()
      await Motion.endAt(
        $('trap-body'),
        [{ transform: 'translateX(0) rotate(0)', opacity: 1 }, { transform: 'translateX(70px) rotate(8deg)', opacity: 1, offset: 0.5 }, { transform: 'translateX(120px) rotate(20deg)', opacity: 0 }],
        { duration: 1000, easing: 'ease-out' },
      )
    }
    await home
    mouse = 'fed'
  }

  /** Once she's been fed: Reksio sniffs by her hole and she comes out to say
   * hello, nose to nose. Each time after, something on top (v): she brings
   * him a crumb, a baby mouse comes too, she plays hide and seek from her
   * other hole, or she rides on his head. */
  async function visit(v) {
    Reksio.face(1)
    await Reksio.sniff(2)
    if (visiting) return
    visiting = true
    try {
      await hello(v)
    } finally {
      visiting = false
    }
  }

  async function hello(v) {
    const front = { x: HOLE.x - 40, y: GROUND } // on the ground, under his nose
    if (v === 'hide') await hideAndSeek()
    else {
      mouseAt(HOLE.x, HOLE.y, -1)
      await peekOut()
    }
    await scurry(front.x, front.y)
    mouseAt(front.x, front.y, -1)
    await squeak(2)
    // nose to nose
    Sound.mouse()
    await Reksio.nod(18, 450)
    if (v === 'ride') {
      await ride(front)
      return goHome()
    }
    if (v === 'crumb') {
      // she brings him a crumb of cheese
      burst(front.x + X('trap') - 40, GROUND - 6, 5, 'cheese-crumb', { dir: -1, height: 18, reach: 30, size: 2.5 })
      Sound.munch()
      await Reksio.nod(14, 400)
      Sound.munch()
      await Reksio.lick()
      heart(front.x + X('trap'), GROUND - 70)
    } else if (v === 'baby') {
      // and a little one comes out behind her
      const baby = $('mouse-baby')
      const babyAt = { x: HOLE.x + 10, y: GROUND }
      baby.style.transform = `translate(${HOLE.x + X('trap')}px, ${HOLE.y}px) scale(-1, 1)`
      await peekOut(baby)
      await scurry(babyAt.x, babyAt.y, baby, HOLE, 1)
      Sound.mouse()
      heart(babyAt.x + X('trap'), GROUND - 50)
      await wait(900)
      await goHome(baby, babyAt, 1)
    } else {
      await wait(400)
    }
    await goHome()
  }

  /** Hide and seek: a squeak from her other hole, along the wall; he turns,
   * she ducks back in… and pops out of the first one, behind him. */
  async function hideAndSeek() {
    await wait(500)
    mouseAt(OTHER_HOLE.x, OTHER_HOLE.y, 1)
    await peekOut()
    await squeak(1, true)
    Reksio.face(-1)
    Reksio.kit.perk('both', 800)
    await wait(500)
    await mouseEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).finished
    mouseEl.style.opacity = '0'
    await Reksio.puzzled()
    mouseAt(HOLE.x, HOLE.y, -1)
    await peekOut()
    await squeak(1)
    Reksio.face(1) // spun round: there she is
    await Reksio.startle()
    Reksio.face(1)
  }

  /** A ride: up his back onto his head, a few steps along, and down his tail. */
  async function ride(front) {
    const top = () => Reksio.pointAt(Figure.bowlTopAt)
    $('critters').before(mouseEl) // in front of him while she's on him
    try {
      const t = top()
      await scurry(t.x - X('trap'), t.y, mouseEl, mousePos)
      const stay = Clock.every(0, () => {
        const p = top()
        mouseAt(p.x - X('trap'), p.y, Reksio.facing)
      })
      try {
        Sound.mouse()
        await Reksio.walkTo(Reksio.x - RIDE)
        await Reksio.walkTo(Reksio.x + RIDE)
        Reksio.face(1)
      } finally {
        stay()
      }
      await scurry(Reksio.x - X('trap') - Reksio.facing * 70, GROUND) // down his back and off
      Sound.mouse()
    } finally {
      place.parent.insertBefore(mouseEl, place.next)
    }
    await scurry(front.x, front.y)
  }

  function startMouse() {
    if (Layout.hidden.includes('trap')) return
    $('trap').classList.add('not-yet')
    Clock.after((Layout.mouseAt ?? rnd(...MOUSE_AT_S)) * 1000, mouseComesOut)
  }

  const thing = {
    // before: stand so his paws land just short of the trap; after: nose at her hole
    at: () => (mouse === 'fed' ? HOLE.x - 210 : TRAP_X - 60 - PAW_REACH) + X('trap'),
    face: 1,
    ready: () => mouse === 'wanting' || mouse === 'fed',
    async run({ v }) {
      if (mouse === 'wanting') return rescue()
      if (mouse === 'fed') return visit(v)
    },
  }

  function init({ ended, effects }) {
    isEnded = ended
    ;({ burst, heart } = effects)
    startMouse()
  }

  // where she is drawn among the things: behind Reksio, but for a ride
  const place = { parent: mouseEl.parentNode, next: mouseEl.nextSibling }

  return {
    thing,
    init,
    get state() { return mouse },
  }
})()
