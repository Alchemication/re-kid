// The evening's moon, as plain rules with no drawing and no clock of their own
// (Adam, 2026-11-10: each evening a little different). Each play draws its
// moon: a thin "banana" crescent, a half or a full moon, and, whichever it
// is, its own size, tilt, which side is lit, where it rises and how high, how
// warm its colour, and (a crescent) how thin. A full moon has faint grey seas
// of its own, a soft glow round it, and lightens the night a little; on a full
// moon's evening a wolf howls once, far off (meadow.js). meadow.js draws it
// from `shape` and moves it up the sky by Day.moon. Not from the films.

/* exported Moons */
const Moons = (() => {
  const KINDS = { crescent: 0.4, half: 0.3, full: 0.3 } // at these shares of plays
  const SIZE = [34, 48] // its radius, in the sky's units
  const TILT = [-30, 30] // degrees: a crescent or half leaning one way or the other (a full moon's seas turn with it)
  const X = [1020, 1320] // where across the sky it rises (behind the molehill's circle as it closes: Day.iris)
  const RISE = [330, 410] // how far it climbs through the last hour
  const THIN = [0.45, 0.75] // a crescent's thinness: how far its shadow's edge bulges into it, of its radius
  const TINTS = ['#f4f1d8', '#f7eab8'] // pale cream to warm butter, drawn between
  const SEAS = 4 // a full moon's faint grey patches
  const GLOW = [[1.25, 0.1], [1.6, 0.07], [2, 0.04]] // a full moon's glow: rings round it [of its radius, opacity], soft as they spread
  const BRIGHT = 0.18 // a full moon makes the night this much less dark
  const HOWL_UP = [0.35, 0.75] // the wolf howls once the moon is this far up (of its climb)

  const between = ([a, b], r) => a + r * (b - a)
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const mix = (a, b, t) => `#${hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('')}`

  /** This play's moon. Every draw made whatever the kind (and whether ?moon= asks for one), so the stream stays put. */
  function plan(random, asked = null) {
    let left = random()
    const names = Object.keys(KINDS)
    const drawn = names.find((n) => (left -= KINDS[n]) < 0) ?? names[names.length - 1]
    const moon = {
      kind: KINDS[asked] !== undefined ? asked : drawn,
      r: between(SIZE, random()),
      tilt: between(TILT, random()),
      lit: random() < 0.5 ? 'right' : 'left', // waxing or waning
      x: between(X, random()),
      rise: between(RISE, random()),
      thin: between(THIN, random()),
      tint: mix(TINTS[0], TINTS[1], random()),
      seas: Array.from({ length: SEAS }, (_, k) => { // [x, y] of the radius, and its size: one about each quarter, so they don't heap up
        const a = (k / SEAS) * Math.PI * 2 + random() * 1.2
        const d = 0.25 + random() * 0.35
        return [Math.cos(a) * d, Math.sin(a) * d, 0.14 + random() * 0.14]
      }),
      howlAt: between(HOWL_UP, random()),
    }
    return moon
  }

  /** The lit part as an SVG path about 0, 0, before its tilt: a circle, a half, or a crescent. */
  function shape({ kind, r, lit, thin }) {
    const f = (v) => v.toFixed(1)
    if (kind === 'full') return `M${f(-r)} 0 A${f(r)} ${f(r)} 0 1 1 ${f(r)} 0 A${f(r)} ${f(r)} 0 1 1 ${f(-r)} 0 Z`
    const side = lit === 'right' ? 1 : -1
    const edge = kind === 'half' ? 0 : r * thin // the shadow's edge: straight for a half, bulging towards the lit side for a crescent
    const out = side > 0 ? 1 : 0 // round the lit side from the top to the bottom
    return `M0 ${f(-r)} A${f(r)} ${f(r)} 0 0 ${out} 0 ${f(r)} A${f(edge)} ${f(r)} 0 0 ${1 - out} 0 ${f(-r)} Z`
  }

  return { KINDS, SIZE, TILT, X, RISE, THIN, GLOW, BRIGHT, plan, shape }
})()
