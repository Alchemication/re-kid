// What comes after rain (the rain cloud's, rain.js; the storm's,
// umbrella.js): a rainbow arching over the meadow, which fades in, stays a
// while and fades (nothing vanishes in view), drawn far off up the hill,
// behind everything near; and drops shaken off someone wet, flying out to
// either side.

/* global Clock, Motion */
/* exported AfterRain */
const AfterRain = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const COLOURS = ['#e0453a', '#f0913a', '#f2c94c', '#6fae4c', '#4d79c7', '#7a5bb5']
  const STAYS_MS = 9000

  /** A rainbow over x, `half` its half-width, in `layer`. */
  function rainbow(layer, x, half = 620) {
    const bow = document.createElementNS(SVG, 'g')
    bow.setAttribute('class', 'rainbow')
    layer.appendChild(bow)
    COLOURS.forEach((c, k) => {
      const p = document.createElementNS(SVG, 'path')
      for (const [a, v] of Object.entries({ d: `M${x - half + k * 9} 640 A${half - k * 9} ${430 - k * 9} 0 0 1 ${x + half - k * 9} 640`, stroke: c, 'stroke-width': 9, fill: 'none', opacity: 0.55 })) p.setAttribute(a, v)
      bow.appendChild(p)
    })
    Motion.endAt(bow, [{ opacity: 0 }, { opacity: 1 }], { duration: 1500 })
      .then(() => Clock.wait(STAYS_MS))
      .then(() => Motion.endAt(bow, [{ opacity: 1 }, { opacity: 0 }], { duration: 3000 })) // a rainbow fades
      .then(() => bow.remove(), () => bow.remove())
  }

  /** A spray of `n` drops shaken off at x, y, flying out `reach` to either side. */
  function shake(x, y, n = 10, reach = 110) {
    const drops = document.getElementById('drops')
    for (let k = 0; k < n; k++) {
      const d = document.createElementNS(SVG, 'circle')
      d.setAttribute('r', '3.5')
      d.setAttribute('fill', '#6f9ad6')
      drops.appendChild(d)
      const a = Math.PI + (k / (n - 1)) * Math.PI
      Motion.endAt(d, [{ transform: `translate(${x}px, ${y}px)` }, { transform: `translate(${x + Math.cos(a) * reach}px, ${y + Math.sin(a) * reach * 0.45 + 60}px)`, opacity: 0 }], { duration: 600, easing: 'ease-out' })
        .then(() => d.remove(), () => d.remove())
    }
  }

  return { rainbow, shake }
})()
