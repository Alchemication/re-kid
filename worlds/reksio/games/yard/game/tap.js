// The water tap on the wall: a little story over three uses, then again
// (a mum's idea at a playtest, 2026-10-29). The water runs and he drinks;
// next time it only drips (he waits under it, head back, and the drop lands
// on his nose); the third time nothing comes at all. He peers up into the
// spout, puzzled, hops up and knocks on the pipe: nothing; again: nothing;
// a third, harder knock, and a gurgle runs down the pipe, a burp of air, and
// the water gushes all over him. Soaked, he drinks, shakes, and is proud.
// In the cold the drips freeze: an icicle grows on the spout, and the third
// time he huffs warm breath on it until it drops off, and out gushes the
// water. After the first round the running water comes with something on
// top (Things.VARIATIONS.tap: it sprays sideways and soaks him, or he drinks
// so fast he gets hiccups).
//
// Drawn in the tap's coordinates (index.html); Layout.x('tap') moves it.

/* global Clock, Debug, Motion, Layout, Sound, Music, Reksio, Figure, Weather */
/* exported Tap */
const Tap = (() => {
  const X = () => Layout.x('tap')
  const STAGES = ['flow', 'drips', 'dry'] // the story, one stage a use, then again
  const SPOUT = { x: 1320, y: 566 } // where the water comes out, as drawn
  const UNDER_SPOUT = 50 // he stands this far short of the spout, so his upturned nose is under it
  const UNDER_PIPE = 134 // back from the spout to knock: his head clear of the pipe, his paw reaching forward onto it
  const UNDER_ICICLE = 110 // back from the spout to huff: the icicle's tip just past his nose
  const PIPE_AT = { x: 1270, y: 545 } // where his paw knocks the pipe, as drawn
  const PIPE = [[0, 0], [0, 70], [30, 70], [48, 92]] // the gurgle's way down the pipe and out of the spout, from its top (1270, 470)
  const ICICLE_TIP = 636 // y of the icicle's tip, as drawn
  const GROUND = 790 // where drops land, under the tap
  const HUFFS = 2 // warm breaths before the icicle lets go

  const SVG_NS = 'http://www.w3.org/2000/svg'
  const $ = (id) => document.getElementById(id)
  const wait = Clock.wait
  const spout = () => ({ x: SPOUT.x + X(), y: SPOUT.y })
  const nose = () => Reksio.pointAt(Figure.noseTipAt)
  /** A new SVG element with these attributes, in parent. */
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    return parent.appendChild(e)
  }
  let burst = () => {}
  let fx = null
  let iced = false // the drips froze on the spout: the next use thaws it
  let told = 0 // stages played to the end: the story moves on only past one seen (a use cut short tells it again)

  /** A drop falling from one point to another (the ground, or his nose). */
  function drip(from, to, ms = 700) {
    const d = el('circle', { class: 'drop', r: 7, cx: from.x, cy: from.y }, fx)
    return d.animate([{ transform: 'translate(0, 0)' }, { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px)` }], { duration: ms, easing: 'ease-in' }).finished.then(() => d.remove())
  }

  /** It only drips: he waits under it, head up, mouth open; two drops miss,
   * the third lands on his nose, he sneezes, and gives the tap a puzzled
   * look. In the cold, the last drop freezes on the spout as he looks. */
  async function drips(close) {
    const at = spout()
    if (!(await Reksio.walkTo(at.x - UNDER_SPOUT))) return // under it, nose up (sent elsewhere: not)
    Reksio.face(1)
    const waiting = Reksio.waitForDrop(2700)
    await wait(400)
    for (let i = 0; i < 2; i++) {
      await drip(at, { x: at.x + 14 * (i ? 1 : -1), y: GROUND }) // just missing him
      Sound.plink()
      await wait(350)
    }
    await drip(at, nose())
    Sound.plink()
    told += 1 // the drop is on his nose: seen
    await waiting
    Sound.sneeze()
    Music.react.sneeze()
    await Reksio.nod(-24, 380)
    close()
    const growing = Weather.frozen ? freeze() : null
    try {
      await Reksio.puzzled(growing ? 1600 : undefined)
    } finally {
      await growing // grown before anything else, even cut short: the next use may thaw it at once
    }
  }

  /** The icicle grows down from the spout. */
  function freeze() {
    iced = true
    const icicle = $('icicle')
    icicle.style.display = ''
    Sound.crack()
    return Motion.endAt(icicle, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 1400, easing: 'ease-out' })
  }

  /** Nothing comes: he goes under it, peers up into the spout, and gives it
   * a puzzled look; then gets it going again. False if he never got there. */
  async function unblock() {
    if (!(await Reksio.walkTo(spout().x - (iced ? UNDER_ICICLE : UNDER_PIPE)))) return false
    Reksio.face(1)
    await Reksio.lookUp(900)
    await Reksio.puzzled()
    if (iced) await thaw()
    else await knock()
    return true
  }

  /** Knock, nothing; knock, nothing (crosser); a hard knock, and a gurgle
   * runs down the pipe as he watches it, and out of the spout comes a burp
   * of air. */
  async function knock() {
    for (let i = 0; i < 3; i++) {
      const hard = i === 2
      await Reksio.knockPipe(hard, () => {
        Sound.clonk()
        if (hard) Sound.rattle() // the whole pipe rattles
        shudder(hard)
        Reksio.kit.tell('knock', { x: PIPE_AT.x + X(), y: PIPE_AT.y }) // a fly on the spout minds it
      })
      if (!hard) await (i ? Reksio.glare() : Reksio.puzzled(600))
    }
    Debug.trace('tap', { knocked: true })
    Sound.gurgle()
    await Promise.all([gurgle(), Reksio.lookUp(1000)])
    Sound.burp()
    const at = spout()
    burst(at.x, at.y, 5, 'drop', { dir: -1, height: 20, reach: 40, size: 3 })
  }

  /** The pipe shudders under his knock. */
  const shudder = (hard) => {
    const d = hard ? 5 : 2.5
    $('tap-pipe').animate([0, d, -d, d / 2, 0].map((x) => ({ transform: `translate(${x}px, 0)` })), { duration: hard ? 380 : 240 })
  }

  /** A bulge of water and air running down the pipe and out at the spout. */
  async function gurgle() {
    const b = el('circle', { class: 'bulge', r: 13, cx: 1270, cy: 470 }, $('tap-pipe')) // in the tap's own group: Layout.x already moves it
    try {
      await b.animate(PIPE.map(([x, y]) => ({ transform: `translate(${x}px, ${y}px)` })), { duration: 1000, easing: 'ease-in' }).finished
    } finally {
      b.remove()
    }
  }

  /** In the cold: warm huffs at the icicle until it drips, cracks, and
   * drops off into the snow. */
  async function thaw() {
    const icicle = $('icicle')
    const tip = { x: spout().x, y: ICICLE_TIP }
    try {
      for (let i = 0; i < HUFFS; i++) {
        await Reksio.huff(() => {
          Sound.huff()
          breath(Reksio.mouth(), tip)
        })
        Sound.plink()
        await drip(tip, { x: tip.x, y: GROUND })
      }
      Sound.crack()
      const falling = Motion.endAt(icicle, [{ transform: 'translateY(0) rotate(0)' }, { transform: `translateY(${GROUND - ICICLE_TIP}px) rotate(20deg)`, opacity: 0 }], { duration: 450, easing: 'ease-in' })
      iced = false // off the spout: cut short now, it has fallen
      await falling
      Sound.poof()
      burst(tip.x, GROUND, 6, 'drop', { height: 24, reach: 30, size: 3 })
      Debug.trace('tap', { thawed: true })
    } finally {
      // fallen: gone, drawn as new for next time; cut short before: still on the spout
      if (!iced) icicle.style.display = 'none'
      icicle.style.transform = ''
      icicle.style.opacity = ''
    }
  }

  /** A warm puff of breath from his mouth up to `to`, fading. */
  function breath(from, to) {
    for (let i = 0; i < 4; i++) {
      const c = el('circle', { class: 'breath', r: 9 + i * 4, cx: from.x, cy: from.y }, fx)
      c.animate([{ transform: 'translate(0, 0)', opacity: 0.8 }, { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px)`, opacity: 0 }], { duration: 700, delay: i * 90, easing: 'ease-out', fill: 'backwards' }).finished.then(() => c.remove())
    }
  }

  const thing = {
    at: () => 1201 + X(),
    face: 1,
    /** variation(round): what the running water brings on top, drawn for
     * the flow stage only (round 1: nothing, unless asked for). */
    async run({ variation }) {
      const stage = STAGES[told % STAGES.length] // an icicle grows only at the drips' end: the next stage is dry until it is thawed
      const v = stage === 'flow' ? variation(Math.floor(told / STAGES.length) + 1) : null
      Debug.trace('tap', { stage, iced })
      const handle = $('tap-handle')
      const water = $('water')
      Sound.squeak()
      Motion.endAt(handle, [{ transform: 'rotate(0)' }, { transform: 'rotate(90deg)' }], { duration: 300 })
      let flow = null
      let open = true
      /** Water off and the handle back, once, however the use ends. */
      const close = () => {
        flow?.cancel()
        water.style.opacity = '0'
        if (open) Motion.endAt(handle, [{ transform: 'rotate(90deg)' }, { transform: 'rotate(0)' }], { duration: 300 })
        open = false
      }
      const gushed = stage === 'dry'
      try {
        await wait(300)
        if (stage === 'drips') return await drips(close)
        if (stage === 'dry' && !(await unblock())) return
        water.style.opacity = '1'
        flow = water.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -80 }], { duration: 400, iterations: Infinity })
        await drink(v, gushed)
        told += 1 // drips count themselves, as the drop lands
      } finally {
        close()
      }
      await dryOff(v, gushed)
    },
  }

  /** The water running: he drinks; gushed (back after it was dry), it comes
   * all over his upturned face first; v 'spray', it sprays sideways over him. */
  async function drink(v, gushed) {
    const at = spout()
    Sound.water(1.9)
    if (gushed) {
      Sound.splash()
      burst(at.x, at.y + 4, 30, 'drop', { dir: -1, height: 50, reach: 160, size: 5 })
      await Reksio.startle()
    }
    const drinking = Reksio.nod(-10, 1700)
    for (let i = 0; i < 5; i++) {
      burst(at.x + 2, GROUND, 3, 'drop', { height: 30, reach: 30, size: 3 })
      if (v === 'spray' && i >= 2) {
        burst(at.x, at.y + 4, 24, 'drop', { dir: -1, height: 40, reach: 200, size: 4.5 })
        Sound.splash()
      }
      await wait(320)
    }
    await drinking
  }

  /** After drinking, the tap shut: a shake (two if soaked), the hiccups if he
   * drank too fast, and pride if he got the water going again. */
  async function dryOff(v, gushed) {
    const soaked = v === 'spray' || gushed
    if (v === 'spray') await Reksio.startle()
    if (v === 'hiccups') await Reksio.hiccups()
    await wait(250)
    for (let i = 0; i < (soaked ? 2 : 1); i++) {
      Sound.shake()
      burst(Reksio.x, 730, soaked ? 22 : 14, 'drop', { height: 70, reach: 90, size: 3.5 })
      await Reksio.shake()
    }
    if (gushed) await Reksio.showOff()
  }

  function init({ effects, layer }) {
    burst = effects.burst
    fx = layer
  }

  return {
    thing, init,
    get iced() { return iced },
    /** Where the story is, for the game's state (and a replay's). */
    get state() { return { told, iced } },
  }
})()
