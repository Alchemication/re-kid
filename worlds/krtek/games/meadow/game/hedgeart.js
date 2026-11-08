// How the hedgehog is drawn, after Krtek a ježek (1970; world.yaml `jezek`): on all fours as he trots
// with fruit stuck on his spines (1:14), his spines black and standing out all round like a dark sun, his
// face pale pink with a big round-tipped nose, a small eye and a pink cheek (8:16–8:26). His own moves:
// leaves stuck on his spines (stick), shaken off (shed), and curling up into a ball (curl) that rolls.
//
// Only drawing and his own moves here: hedgehog.js says when.

/* global Autumn, Debug, Motion */
/* exported HedgeArt */
const HedgeArt = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const INK = '#15140f'
  const FACE = '#f2cfc4'
  const CENTRE = [10, -30] // the middle of his round back: he curls up round it, and rolls about it
  const SPIKES = 26
  const STUCK = [[-8, -56], [14, -62], [32, -50], [2, -46], [24, -40], [40, -30]] // where leaves stick on his spines, in turn
  const leafy = Debug.random('meadow-hedgehog-leaves') // the stuck leaves' colours: their own stream

  const parts = new WeakMap() // inner -> { ball, leaves, head, legs }

  /** Him on all fours facing left, his feet at 0, 0; returns his head (his face, which nods and shakes). */
  function draw(g, { el }) {
    const legs = el('g', {}, g)
    for (const x of [-16, 0, 22, 36]) el('ellipse', { cx: x, cy: -3, rx: 6, ry: 4, fill: '#3a2a22', stroke: INK, 'stroke-width': 2 }, legs)
    const ball = el('g', { class: 'hedgehog-ball' }, g)
    ball.style.transformOrigin = `${CENTRE[0]}px ${CENTRE[1]}px`
    let d = ''
    for (let i = 0; i <= SPIKES; i++) { // a fan of spikes over his back, from his face round to his tail
      const a = Math.PI * (1.02 + (i / SPIKES) * 1.08) // from the left, over the top, down the right
      const r = i % 2 ? 30 : 46
      d += `${i ? 'L' : 'M'}${(CENTRE[0] + Math.cos(a) * r * 1.15).toFixed(1)} ${(CENTRE[1] + Math.sin(a) * r).toFixed(1)} `
    }
    el('path', { d: `${d}L${CENTRE[0] + 40} ${CENTRE[1] + 22} L${CENTRE[0] - 30} ${CENTRE[1] + 24} Z`, fill: INK, stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round' }, ball)
    el('ellipse', { cx: CENTRE[0], cy: CENTRE[1] + 8, rx: 36, ry: 20, fill: '#2a221d' }, ball)
    const leaves = el('g', { class: 'hedgehog-leaves' }, ball)
    const head = el('g', { class: 'head' }, g)
    el('path', { d: 'M-12 -40 C-24 -42 -40 -34 -52 -24 C-44 -14 -24 -10 -10 -16 Z', fill: FACE, stroke: INK, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, head)
    el('circle', { cx: -53, cy: -23, r: 6.5, fill: '#e6a7a2', stroke: INK, 'stroke-width': 2.2 }, head) // the big round nose
    el('circle', { cx: -26, cy: -31, r: 3.4, fill: INK }, head)
    el('circle', { cx: -27, cy: -32.2, r: 1.1, fill: '#fff' }, head)
    el('ellipse', { cx: -22, cy: -21, rx: 5, ry: 3, fill: '#ec8f8f', opacity: 0.7 }, head) // his cheek
    parts.set(g, { ball, leaves, head, legs })
    return head
  }

  /** His own moves, on his drawing (`inner`, as friends.js gives it). */
  function moves(inner) {
    const p = parts.get(inner)
    return {
      /** Leaves stuck on his spines: as many as n (up to six). */
      stick(n) {
        const ns = 'http://www.w3.org/2000/svg'
        while (p.leaves.childElementCount < Math.min(n, STUCK.length)) {
          const [x, y] = STUCK[p.leaves.childElementCount]
          const g = document.createElementNS(ns, 'g')
          g.setAttribute('transform', `translate(${x} ${y}) rotate(${Math.round(leafy() * 360)}) scale(1.6)`)
          Autumn.piece(g, leafy)
          p.leaves.appendChild(g)
        }
      },
      /** How many leaves he has on him. */
      get stuck() { return p.leaves.childElementCount },
      /** The leaves off his spines (into his bed): gone from him. */
      shed() { p.leaves.replaceChildren() },
      /** Curl up into a ball (his face and feet tucked in), or uncurl. */
      async curl(on, ms = 400) {
        const hide = { transform: on ? 'translate(30px, -6px) scale(0.1)' : 'translate(0px, 0px) scale(1)' }
        await Promise.all([
          Motion.endAt(p.head, [hide], { duration: ms, easing: 'ease-in-out' }),
          Motion.endAt(p.legs, [{ opacity: on ? 0 : 1 }], { duration: ms }),
          Motion.endAt(p.ball, [{ transform: on ? 'scale(0.9, 1.25) translateY(-4px)' : 'scale(1, 1) translateY(0px)' }], { duration: ms, easing: 'ease-in-out' }),
        ])
      },
      /** Rolled: his ball turned `turns` times (negative: rolling left), over ms. */
      roll(turns, ms) {
        return Motion.endAt(p.ball, [{ transform: 'scale(0.9, 1.25) translateY(-4px) rotate(0deg)' }, { transform: `scale(0.9, 1.25) translateY(-4px) rotate(${turns * 360}deg)` }], { duration: ms, easing: 'ease-out' })
      },
    }
  }

  return { draw, moves }
})()
