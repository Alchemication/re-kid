// The mound of earth, and the bone that goes round: dug up and carried off,
// buried again, dug up again… Each time after the first, something on top,
// a different thing each time (Things.VARIATIONS: dig and bury). Digging it
// up: nothing there at first and he digs harder; an old boot comes up first,
// sniffed, puzzled at, and flung over his shoulder; or a molehill pops up
// beside him, and again on his other side, and he pounces too late.
// Burying it: a sly look round first; or the bird comes to watch from the
// wall, and he gives it a look and pats the earth down extra hard.
//
// Drawn in the mound's coordinates (index.html); Layout.x('dig') moves it.

/* global Clock, Motion, Layout, Sound, Music, Reksio, Bird */
/* exported Mound */
const Mound = (() => {
  const X = () => Layout.x('dig')
  const MOLEHILL_AT = [2210, 1955] // where the molehill pops up, as drawn: beside him, then behind
  const BOOT_LANDS = -190 // the boot lands this far behind him (scene units, along his facing)

  const $ = (id) => document.getElementById(id)
  const wait = Clock.wait
  let burst = () => {}

  /** Paws going, earth flying, for ms. */
  async function digFor(ms, clods) {
    const digging = Reksio.paddle(ms)
    Sound.dig()
    for (let i = 0; i < clods; i++) {
      burst(2040 + X(), 790, 3, 'clod', { dir: -1, height: 80, reach: 120, size: 4.5 })
      await wait(200)
    }
    await digging
  }

  /** Something comes up out of the hole: up, a bounce, and held there. */
  const upOut = (el) =>
    Motion.endAt(el, [{ transform: 'translateY(30px) scale(0.4)' }, { transform: 'translateY(-50px) scale(1.2)' }, { transform: 'translateY(-30px) scale(1)' }], { duration: 600, easing: 'ease-out' })

  /** An old boot comes up instead: a sniff, a puzzled look, and over his
   * shoulder it goes. */
  async function boot() {
    const b = $('found-boot')
    b.style.opacity = '1'
    await upOut(b)
    Sound.plop()
    await Reksio.sniff(1)
    await Reksio.puzzled()
    Reksio.nod(-30, 380) // the toss
    Sound.toss()
    const dx = BOOT_LANDS * Reksio.facing
    await Motion.endAt(b, [{ transform: 'translate(0, -30px) rotate(0)' }, { transform: `translate(${dx / 2}px, -140px) rotate(-200deg)`, offset: 0.5 }, { transform: `translate(${dx}px, 40px) rotate(-360deg)` }], { duration: 800, easing: 'ease-in' })
    Sound.bonk()
    await b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).finished
    b.style.opacity = '0'
    b.style.transform = ''
    Reksio.face(1)
  }

  /** A molehill pops up beside him, then on his other side: he pounces on
   * it, too late, and it's gone. */
  async function molehill() {
    const hill = $('molehill')
    for (const [i, x] of MOLEHILL_AT.entries()) {
      hill.setAttribute('transform', `translate(${x} 0)`)
      Sound.pop()
      await Motion.endAt(hill, [{ opacity: 0, transform: `translate(${x}px, 0) scaleY(0.1)` }, { opacity: 1, transform: `translate(${x}px, 0) scaleY(1)` }], { duration: 250, easing: 'ease-out' })
      Reksio.face(x + X() > Reksio.x ? 1 : -1)
      Reksio.kit.perk('both', 600)
      await wait(i ? 300 : 700)
      if (i) {
        const pounce = Reksio.pounce(x + X())
        await wait(250)
        await Motion.endAt(hill, [{ opacity: 1, transform: `translate(${x}px, 0) scaleY(1)` }, { opacity: 0, transform: `translate(${x}px, 0) scaleY(0.1)` }], { duration: 200 })
        await pounce
        await Reksio.puzzled()
      } else {
        await Motion.endAt(hill, [{ opacity: 1, transform: `translate(${x}px, 0) scaleY(1)` }, { opacity: 0, transform: `translate(${x}px, 0) scaleY(0.1)` }], { duration: 200 })
      }
    }
    await Reksio.walkTo(Mound.thing.at())
    Reksio.face(1)
  }

  /** Dig the bone up and carry it off. */
  async function digUp(v) {
    if (v === 'molehill') await molehill()
    await digFor(1300, 6)
    if (v === 'harder') {
      // nothing there… a puzzled look, then dig harder
      await Reksio.lookAround(800)
      Reksio.face(1)
      await digFor(1500, 9)
    }
    if (v === 'boot') {
      await boot()
      await digFor(900, 4)
    }
    const bone = $('found-bone')
    bone.style.opacity = '1'
    await upOut(bone)
    Music.react.wish()
    await wait(500)
    bone.style.transform = ''
    bone.style.opacity = '0'
    Reksio.holdBone(true)
    Sound.original('bark') // easter egg: his original quick barks, if the clip exists
    await Reksio.nod(-14, 700)
  }

  /** Bury it: dig a hole, drop it in, nose the earth back, pat it down. */
  async function bury(v) {
    const watching = v === 'watched' && !Bird.flying ? Bird.watch(2100 + X(), 3200) : null // the bird busy elsewhere: no watcher
    if (v === 'sly') {
      await Reksio.lookAround(700)
      Reksio.face(1)
      await Reksio.lookAround(500)
      Reksio.face(1)
    }
    await digFor(1000, 4)
    if (watching) {
      // somebody's watching: a look up at the wall, narrowed eyes
      await Reksio.lookUp(900)
      await Reksio.squint(700)
    }
    Reksio.holdBone(false)
    const bone = $('found-bone')
    bone.style.opacity = '1'
    await Motion.endAt(bone, [{ transform: 'translateY(-30px) scale(1)', opacity: 1 }, { transform: 'translateY(26px) scale(0.6)', opacity: 0 }], { duration: 500, easing: 'ease-in' })
    bone.style.opacity = '0'
    for (let i = 0; i < 3; i++) {
      Sound.from(150, Sound.dig)
      burst(2010 + X(), 800, 3, 'clod', { dir: 1, height: 20, reach: 40, size: 4 })
      await Reksio.nod(22, 380)
    }
    for (let i = 0; i < (watching ? 3 : 1); i++) {
      // patted down (extra hard, watched)
      await Reksio.stamp(() => {
        Sound.stamp(0)
        burst(2040 + X(), 806, 4, 'dust', { height: 16, reach: 30, size: 3 })
      })
    }
    await Reksio.nod(-12, 500) // pleased with that
    await watching
  }

  const thing = {
    at: () => 2000 + X(),
    face: 1,
    async run({ v }) {
      if (Reksio.holdingBone) await bury(v)
      else await digUp(v)
    },
  }

  function init({ effects }) {
    burst = effects.burst
  }

  return { thing, init }
})()
