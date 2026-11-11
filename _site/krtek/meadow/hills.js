// The mole's molehills: his home's, and those he leaves about the meadow
// where he dug himself in or came up (the oldest sinks back once there are
// too many). A tap on one sends him to it under the grass (burrow): what he
// did stays, and can be used again (Adam, 2026-11-10: the world should
// answer a touch). meadow.js says what a tap means and runs burrow as his
// gesture, so a new tap cuts it short like any other.

/* global Debug, Layout, Mole, Motion, Sound */
/* exported Hills */
const Hills = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const { GROUND, HOME } = Layout
  const MAX = 6 // molehills he has left about the meadow; the oldest sinks back
  const SIZE = { home: [240, 64], other: [180, 50] } // a molehill's width and height: his home's is bigger
  const REACH = 8 // a tap this far above or below a molehill (scene units) still means it: lower is the grass, to walk on
  const NEAR = 50 // within this of a molehill's middle, he is in it
  const COVERS = 70 // a molehill this near x stands there: no second one beside it
  const burrows = Debug.random('meadow-burrows') // which other molehill he comes up in, tapped in his own

  const hills = [] // those he has left about, oldest first: { x, g }
  let layer, grass, paint
  let dropHat = () => {}

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /** Drawn in `layer`, behind `grass` (the grass in front stays in front of every molehill), its clods from
   * `random`; `dropHat()` has whatever is on his head fall off as he dives. */
  function setup(hooks) {
    ;({ layer, grass, random: paint, dropHat } = hooks)
  }

  const path = (w, h) => `M${-w / 2} 6 C${-w * 0.42} ${-h * 0.7} ${-w * 0.22} ${-h} 0 ${-h} C${w * 0.22} ${-h} ${w * 0.42} ${-h * 0.7} ${w / 2} 6 Z`

  /** A molehill at x: a heap of earth with clods (big: his home's), growing up out of the grass. */
  function make(x, big = false, grow = true) {
    const [w, h] = big ? SIZE.home : SIZE.other
    const g = el('g', { class: 'hill' })
    layer.insertBefore(g, grass)
    g.style.transform = `translate(${x}px, ${GROUND}px)`
    const inner = el('g', {}, g)
    el('path', { d: path(w, h), fill: '#6e4a24', stroke: '#2b1b0b', 'stroke-width': 3 }, inner)
    for (let i = 0; i < (big ? 16 : 10); i++) {
      el('circle', { cx: (paint() - 0.5) * w * 0.75, cy: -paint() * h * 0.8, r: 4 + paint() * 7, fill: paint() < 0.5 ? '#38250a' : '#8a5d2e' }, inner)
    }
    if (grow) Debug.ignoreCut(Motion.endAt(inner, [{ transform: 'scaleY(0.05)' }, { transform: 'scaleY(1)' }], { duration: 320, easing: 'cubic-bezier(.3,1.5,.5,1)' }), 'hill grows')
    if (big) return
    hills.push({ x, g })
    if (hills.length > MAX) sink(hills.shift())
  }

  function sink(h) {
    Motion.endAt(h.g, [{ transform: `translate(${h.x}px, ${GROUND + 80}px)` }], { duration: 900, easing: 'ease-in' }).then(() => h.g.remove(), () => h.g.remove())
  }

  /** Does a molehill stand at x (his home's, or one he left)? */
  const at = (x) => Math.abs(x - HOME) < COVERS || hills.some((h) => Math.abs(h.x - x) < COVERS)

  /** The molehill drawn at this point of the meadow (scene units), his home's among them: its x, or null. */
  function under(x, y) {
    const on = (hx, [w, tall]) => Math.abs(x - hx) < w / 2 && y > GROUND - tall - REACH && y < GROUND + REACH
    if (on(HOME, SIZE.home)) return HOME
    return hills.find((h) => on(h.x, SIZE.other))?.x ?? null
  }

  /**
   * A tap on a molehill: he tunnels to it. Down he goes where he is (out on the grass he digs himself in,
   * step by step, and leaves a molehill there: one more to tap), the bump of his tunnel runs under the grass,
   * and up he pops in it. Tapped in the one he is in, he comes up in another he has left about; with no
   * other, a jump of joy.
   */
  async function burrow(x, alive) {
    x = Layout.clampX(x)
    const m = Mole.state
    const pick = burrows() // drawn either way
    if (m.pose !== 'out' && Math.abs(x - m.x) < NEAR) {
      const others = [HOME, ...hills.map((h) => h.x)].filter((hx) => Math.abs(hx - m.x) >= NEAR)
      if (!others.length) return Mole.cheer()
      x = others[Math.floor(pick * others.length)]
    }
    Debug.trace('burrows', { from: Math.round(m.x), to: Math.round(x) })
    const kept = hills.findIndex((h) => Math.abs(h.x - x) < NEAR)
    if (kept >= 0) hills.push(...hills.splice(kept, 1)) // the one he is going to is the newest now: a new one never sinks it
    Mole.lookAt(x) // he looks first: the tap was heard
    dropHat()
    Sound.dig()
    if (m.pose === 'out') {
      if (!at(m.x)) make(m.x)
      await Mole.digIn()
    } else await Mole.goDown()
    if (!alive()) return
    await Mole.tunnelTo(x)
    if (!alive()) return
    if (!at(x)) make(x)
    Sound.pop()
    await Mole.comeUp('hill')
    Mole.perk(0.7)
    Sound.say('giggle', true) // now and then: here I am
  }

  return { setup, make, at, under, burrow, /** How many he has left about (not his home's). */ get count() { return hills.length } }
})()
