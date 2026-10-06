// The sky over the yard: the sun sinks a step with each new thing Reksio does,
// and at dusk the moon comes up, slowly, behind the wall. Both stand somewhere
// new each play, and the moon is a different one every evening (layout.js
// draws it). The sun is under the evening shade; the moon is on a layer of
// its own above it, so it still shines when night falls.

/* global Debug, Layout, Music */
/* exported Sky */
const Sky = (() => {
  const STEPS = 6 // the sunset, from high afternoon to the sun behind the wall
  const SUN_COLORS = ['#fbe08a', '#fbd57a', '#f9c05a', '#f6a64a', '#ef8a3e', '#e46c34', '#d9542e'] // per step: yellow, through orange, to red
  const SUN_STEP = 44 // how far the sun sinks per step, scene units
  const SUNSET_TINT = 0.095 // how much warmer the sky gets per step
  const DUSK_AFTER_MS = 1800 // the last step of the sunset is seen before the light goes
  const MOON_RISE_S = 40 // how long the moon takes to come up: slow enough to watch, and the time left to play at dusk
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

  function placeMoon() {
    const m = Layout.moon
    const low = WALL_TOP + m.r * 1.8 // wholly behind the wall, glow and all
    const eased = 1 - (1 - moonUp) * (1 - moonUp)
    moonG.setAttribute('transform', `translate(${m.x} ${(low + (m.y - low) * eased).toFixed(1)})`)
  }

  /** The sun at `step` (0 high … STEPS set): lower, redder, the sky warmer, the music slower. */
  function setStep(step) {
    $('sun').style.transform = `translateY(${step * SUN_STEP}px)`
    document.querySelector('#sun .sun').style.fill = SUN_COLORS[step]
    document.querySelector('#sun .sun-glow').style.fill = SUN_COLORS[step]
    $('sunset').style.opacity = String(step * SUNSET_TINT)
    Music.setDusk(step)
  }

  /** The sun has set: the light goes and the moon comes up. Resolves once it is up. */
  function dusk() {
    setStep(STEPS)
    const riseMs = (Layout.moonRise ?? MOON_RISE_S) * 1000
    return new Promise((resolve) => {
      setTimeout(() => {
        $('evening').classList.add('dusk')
        Debug.trace('moon rising', { ms: riseMs })
        const start = performance.now()
        function rise(t) {
          moonUp = Math.min(1, Math.max(0, (t - start) / riseMs))
          placeMoon()
          if (moonUp < 1) requestAnimationFrame(rise)
          else resolve()
        }
        requestAnimationFrame(rise)
      }, DUSK_AFTER_MS)
    })
  }

  /** Night: the yard goes dark under the moon. */
  function night() {
    $('evening').classList.add('on')
    $('sunset').classList.add('night')
    $('night-blue').classList.add('on')
  }

  function init() {
    for (const c of document.querySelectorAll('#sun circle')) c.setAttribute('cx', Layout.sun.x)
    makeMoon()
  }

  return { STEPS, moonPath, init, setStep, dusk, night, get moonUp() { return moonUp } }
})()
