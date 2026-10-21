// The film strip on the ground: five empty frames. Reksio rears up and
// stamps each with his front paws, and a little Reksio appears in each; the
// full strip rolls up into a reel that stays in the yard. After that, each
// time, something with the reel, a different thing each time
// (Things.VARIATIONS.film): it rolls off and he chases it back; he unrolls
// it and the little Reksios come to life, hopping up one after another; or
// one frame has come out blank, and he stamps it again, harder, and two
// little Reksios appear in it.
//
// Drawn in the strip's coordinates (index.html); Layout.x('film') moves it.

/* global Clock, Motion, Layout, Sound, Music, Reksio */
/* exported Film */
const Film = (() => {
  const X = () => Layout.x('film')
  const FRAMES_DRAWN = [2290, 2360, 2430, 2500, 2570] // frame centres as drawn
  const frame = (i) => FRAMES_DRAWN[i] + X() // …and where they are this play
  const PAW_REACH = 31 // from Reksio's middle to where his front paws land
  const ROLL = 170 // how far the reel rolls off
  const WATCH_FROM = 90 // he watches the strip come to life from this far before its first frame

  const $ = (id) => document.getElementById(id)
  const wait = Clock.wait
  let burst = () => {}
  let stamped = 0 // frames stamped so far
  let blanks = 0 // frames stamped twice so far (each gets a second little Reksio)

  const prints = () => document.querySelectorAll('#strip .print:not(.twin)') // a frame's own little Reksio, not a stamped-twice twin

  /** A stamp of his front paws on frame i: a little Reksio appears in it. */
  async function stampFrame(i, print = prints()[i], hard = false) {
    Reksio.face(1)
    await Reksio.stamp(() => {
      Sound.stamp(i)
      Music.react.stamp()
      print.setAttribute('opacity', '1')
      print.style.transformOrigin = `${print.getAttribute('x')}px 791px` // inside the moved strip
      print.animate([{ transform: 'scale(1.6)', opacity: 0.2 }, { transform: 'scale(1)', opacity: 1 }], { duration: 220, easing: 'ease-out' })
      burst(frame(i), 812, hard ? 10 : 5, 'dust', { height: hard ? 34 : 22, reach: hard ? 60 : 40, size: 3.5 })
    })
  }

  /** The little Reksios squeak back: a squash and stretch, all together. */
  function squeakBack() {
    Sound.squeaks()
    prints().forEach((p) => {
      p.style.transformOrigin = `${p.getAttribute('x')}px 800px`
      p.animate([{ transform: 'scale(1, 1)' }, { transform: 'scale(1.2, 0.75)' }, { transform: 'scale(0.9, 1.15)' }, { transform: 'scale(1.2, 0.75)' }, { transform: 'scale(1, 1)' }], { duration: 420 })
    })
  }

  /** The strip rolls up into the reel (or, back, the reel unrolls into the strip). */
  async function rollUp(up = true) {
    Sound.reel()
    const strip = $('strip')
    const reel = $('reel')
    strip.style.visibility = 'visible'
    reel.setAttribute('opacity', '1')
    reel.animate(up ? [{ transform: 'scale(0.2) rotate(0)' }, { transform: 'scale(1) rotate(900deg)' }] : [{ transform: 'scale(1) rotate(900deg)' }, { transform: 'scale(0.2) rotate(0)' }], { duration: 900, easing: 'ease-out' })
    await Motion.endAt(strip, up ? [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }] : [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 900, easing: up ? 'ease-in' : 'ease-out' })
    if (up) strip.style.visibility = 'hidden'
    else reel.setAttribute('opacity', '0')
  }

  /** The first time: each frame stamped in turn, the squeak back, rolled up. */
  async function stampAll() {
    for (let i = stamped; i < FRAMES_DRAWN.length; i++) {
      if (i > stamped) await Reksio.walkTo(frame(i) - PAW_REACH)
      await stampFrame(i)
      stamped = i + 1
    }
    await wait(250)
    squeakBack()
    await wait(650)
    await rollUp()
    await Reksio.hop(50, 2)
  }

  /** The reel rolls off; he chases it, then noses it back. */
  async function rollOff() {
    const reel = $('reel')
    const last = frame(FRAMES_DRAWN.length - 1) + 40
    const roll = (from, to, ms) => Motion.endAt(reel, [{ transform: `translateX(${from}px) rotate(${from * 2.4}deg)` }, { transform: `translateX(${to}px) rotate(${to * 2.4}deg)` }], { duration: ms, easing: 'ease-out' })
    Sound.reel()
    const away = roll(0, -ROLL, 1300)
    await wait(200)
    await Reksio.walkTo(last - ROLL - 120)
    Reksio.face(1)
    await away
    await Reksio.pounce(last - ROLL)
    await Reksio.walkTo(last - ROLL - 140)
    Reksio.face(1)
    Reksio.nod(12, 500)
    Sound.reel()
    await roll(-ROLL, 0, 1100)
    await Reksio.bark()
  }

  /** Unrolled, the little Reksios come to life: up they hop, one after
   * another, each with a squeak, and he hops along. */
  async function show() {
    await Reksio.walkTo(frame(0) - WATCH_FROM) // off the strip, to see them
    Reksio.face(1)
    await rollUp(false)
    const ps = [...prints()]
    for (const [i, p] of ps.entries()) {
      p.style.transformOrigin = `${p.getAttribute('x')}px 800px`
      p.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-10px) scale(1.15)' }, { transform: 'translateY(0)' }], { duration: 300, easing: 'ease-out' })
      Sound.squeak()
      if (i < ps.length - 1) await wait(220)
    }
    await Reksio.hop(40, 2)
    squeakBack()
    await wait(500)
    await rollUp()
  }

  /** One frame has come out blank: a puzzled look, a harder stamp, and two
   * little Reksios appear in it. */
  async function restamp() {
    await rollUp(false)
    const i = blanks % FRAMES_DRAWN.length
    blanks += 1
    const print = prints()[i]
    const twin = print.nextElementSibling?.classList.contains('twin') ? print.nextElementSibling : makeTwin(print)
    for (const p of [print, twin]) p.setAttribute('opacity', '0')
    await Reksio.walkTo(frame(i) - PAW_REACH)
    await Reksio.puzzled()
    await stampFrame(i, print, true)
    twin.setAttribute('opacity', '1')
    Sound.squeaks()
    await wait(700)
    await rollUp()
  }

  /** A second little Reksio beside a frame's own, the frame's moved over to make room. */
  function makeTwin(print) {
    const x = Number(print.getAttribute('x'))
    const twin = print.cloneNode()
    twin.classList.add('twin')
    twin.setAttribute('x', x + 12)
    print.after(twin)
    print.setAttribute('x', x - 12)
    return twin
  }

  const thing = {
    at: () => frame(Math.min(stamped, FRAMES_DRAWN.length - 1)) - PAW_REACH,
    face: 1,
    async run({ v }) {
      if (stamped < FRAMES_DRAWN.length) return stampAll()
      if (v === 'show') return show()
      if (v === 'restamp') return restamp()
      return rollOff()
    },
  }

  function init({ effects }) {
    burst = effects.burst
  }

  return {
    thing,
    init,
    get stamped() { return stamped },
  }
})()
