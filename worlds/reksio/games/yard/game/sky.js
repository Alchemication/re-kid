// The sky over the yard, drawn from the hour (day.js): the sun comes up over
// the wall in the morning, climbs, and goes down in the afternoon, yellow
// turning orange and red as the sky warms, until it sets behind the wall at
// 19:00; the moon comes up through the last hour. Each play starts at dawn
// (the sun still behind the wall), and the sunrise lifts it to where the
// hour puts it. The moon is a different one every evening (layout.js draws
// it). The sun is under the evening shade; the moon is on a layer of its own
// above it, so it still shines when night falls.

/* global Clock, Day, Debug, Layout, Music */
/* exported Sky */
const Sky = (() => {
  const RISE_H = 6 // the hour the sun would clear the wall: at 08:00 it is already a little up
  const X_RISE = 160 // where the sun comes up and goes down across the sky (screen units, the sky stays put)
  const X_SET = 1440
  const HORIZON = 408 // the sun's centre here is behind the wall (its top at 334), glow and all
  const BELOW = 420 // and at dawn, a little further down still
  // the sun's colour and how warm the sky is, through the day; in between, a blend
  const LIGHT = [
    [8, '#fbd57a', 0.12], // the morning: a little warm
    [10, '#fbe08a', 0],
    [15, '#fbe08a', 0],
    [16, '#fbd57a', 0.1],
    [17, '#f6a64a', 0.25],
    [18, '#ef8a3e', 0.4],
    [18.6, '#e46c34', 0.5],
    [19, '#d9542e', 0.57], // set: red, the sky at its warmest
  ]
  const DUSK_FROM = 15 // from here to the sunset the music slows and softens, up to level 6 (music.js)
  const DAWN_TINT = 0.45 // at dawn the sky is this much warmer and dimmer
  const WALL_TOP = 334 // the moon comes up from behind the wall (and is clipped there)
  const SVG_NS = 'http://www.w3.org/2000/svg'

  const $ = (id) => document.getElementById(id)
  let moonG = null
  let moonUp = 0 // 0 behind the wall … 1 up

  /** The lit part of a moon of radius r, lit side to the right: the limb on
   * the right, the terminator a half-ellipse. `lit` is how much is lit, from
   * a sliver (near 0) to full (1). */
  function moonPath(r, lit) {
    const rx = Math.abs(1 - 2 * lit) * r
    const sweep = lit > 0.5 ? 1 : 0 // past half the terminator bulges the other way
    return `M0 ${-r} A${r} ${r} 0 0 1 0 ${r} A${rx.toFixed(1)} ${r} 0 0 ${sweep} 0 ${-r} Z`
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /** Draw this play's moon, out of sight behind the wall. */
  function makeMoon() {
    const m = Layout.moon
    moonG = el('g', { id: 'moon' }, $('moon-sky'))
    const face = el('g', { transform: `rotate(${m.tilt}) scale(${m.waning ? -1 : 1} 1)` }, moonG)
    el('circle', { r: m.r * 1.7, class: 'moon-glow', fill: m.tint }, face)
    el('circle', { r: m.r, class: 'moon-dark' }, face) // the unlit part, just showing
    el('path', { id: 'moon-lit', d: moonPath(m.r, m.lit), class: 'moon-lit', fill: m.tint }, face)
    const clip = el('clipPath', { id: 'moon-clip' }, face)
    el('use', { href: '#moon-lit' }, clip)
    const marks = el('g', { 'clip-path': 'url(#moon-clip)' }, face)
    for (const k of m.marks) el('circle', { cx: k.x * m.r, cy: k.y * m.r, r: k.r * m.r, class: 'moon-mark' }, marks)
    placeMoon()
  }

  let hour = Day.FROM
  let dawnK = 0 // 1 at dawn … 0 once the sun is up
  let musicDusk = -1

  function placeMoon() {
    const m = Layout.moon
    const low = WALL_TOP + m.r * 1.8 // wholly behind the wall, glow and all
    const eased = 1 - (1 - moonUp) * (1 - moonUp)
    moonG.setAttribute('transform', `translate(${m.x} ${(low + (m.y - low) * eased).toFixed(1)})`)
  }

  const clamp01 = (v) => Math.max(0, Math.min(1, v))
  const mix = (a, b, k) => a + (b - a) * k
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

  /** The sky at hour `h`, as plain numbers: where the sun is (x, y), its
   * colour, how warm the sky is (tint, 0–1), how far up the moon is (0–1). */
  function look(h) {
    const k = clamp01((h - RISE_H) / (Day.SUNSET - RISE_H))
    const up = 1 - (2 * k - 1) ** 2 // 0 at the wall, 1 at noon
    const y = HORIZON - up * (HORIZON - Layout.sun.noon)
    const next = LIGHT.findIndex(([at]) => at > h)
    const i = next === -1 ? LIGHT.length - 1 : Math.max(0, next - 1) // past the last: as at the last
    const [h0, c0, t0] = LIGHT[i]
    const [h1, c1, t1] = LIGHT[Math.min(i + 1, LIGHT.length - 1)]
    const f = h1 > h0 ? clamp01((h - h0) / (h1 - h0)) : 0
    const [a, b] = [rgb(c0), rgb(c1)]
    const color = `rgb(${a.map((v, j) => Math.round(mix(v, b[j], f))).join(' ')})`
    return { x: mix(X_RISE, X_SET, k), y, color, tint: mix(t0, t1, f), moonUp: clamp01((h - Day.SUNSET) / (Day.TO - Day.SUNSET)) }
  }

  /** Draw the sky for the hour, with what's left of the dawn on top. */
  function render() {
    const l = look(hour)
    const y = mix(l.y, BELOW, dawnK)
    for (const c of document.querySelectorAll('#sun circle')) {
      c.setAttribute('cx', l.x.toFixed(1))
      c.setAttribute('cy', y.toFixed(1))
      c.style.fill = l.color
    }
    $('sunset').style.opacity = mix(l.tint, Math.max(l.tint, DAWN_TINT), dawnK).toFixed(3)
    moonUp = l.moonUp
    placeMoon()
    const level = Math.round(6 * clamp01((hour - DUSK_FROM) / (Day.SUNSET - DUSK_FROM)) * 10) / 10
    if (level !== musicDusk) Music.setDusk((musicDusk = level))
  }

  /** The sky at hour `h` (yard.js, as the day goes on). */
  function show(h) {
    hour = h
    render()
  }

  /** Dawn: the sun still behind the wall, the sky dim and warm. */
  function dawn() {
    dawnK = 1
    render()
  }

  /** The sun comes up over ms, from dawn to where the hour puts it. Resolves
   * once it is up. */
  function sunrise(ms) {
    const start = Clock.now()
    Debug.trace('sunrise', { ms })
    return new Promise((resolve) => {
      function rise() {
        const k = Math.min(1, (Clock.now() - start) / ms)
        dawnK = (1 - k) * (1 - k) // fast at first, easing into place
        render()
        if (k < 1) Clock.after(0, rise)
        else resolve()
      }
      Clock.after(0, rise)
    })
  }

  /** The sun has set: the light goes (the moon comes up with the hour). */
  function dusk() {
    $('evening').classList.add('dusk')
  }

  /** Night: the yard goes dark under the moon. */
  function night() {
    $('evening').classList.add('on')
    $('sunset').classList.add('night')
    $('night-blue').classList.add('on')
  }

  function init() {
    makeMoon()
    render()
  }

  return { look, moonPath, init, show, dawn, sunrise, dusk, night, get moonUp() { return moonUp } }
})()
