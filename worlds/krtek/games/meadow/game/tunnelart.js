// His tunnel, seen: while he tunnels, the ground under the grass opens in a
// cutaway, as the films show the earth (dark, with pale flecks: Krtek a
// autíčko 0:50), and his tunnel is dug through it as he goes: down from
// where he went in, along, and up to where he will come out, with him
// crawling at its front and whoever follows him behind (Adam, 2026-11-11:
// without it they went into the ground in one place and came out in another).
//
// Only drawing here: mole.js moves it (tunnelTo) and takes it away.

/* global Debug, Layout, MoleArt */
/* exported TunnelArt */
const TunnelArt = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const Y = Layout.GROUND
  const TOP = Y + 16 // the cutaway's top, just under the grass's edge
  const DEEP = 172 // how far down it shows: to the foot of the picture
  const RUN_Y = Y + 106 // the tunnel's middle, where it runs along
  const BORE = 104 // how wide the tunnel is: room for the hare on all fours
  const SIDE = 110 // the earth shown either side of the two ends
  const FLOOR = RUN_Y + BORE / 2 - 8 // where feet go
  const EARTH = '#2b1d12'
  const WALL = '#8a5a2c'
  const AIR = '#d9a25a' // the tunnel's inside: the den's ochre, a little darker
  const FOLLOW_GAP = 104 // each one behind the one ahead
  const CRAWLER = 1.3 // his small crawling figure, drawn up to fill the tunnel's height
  const random = Debug.random('tunnel-art') // the flecks: its own stream
  let cuts = 0 // how many have been drawn, for each one's own clip

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /** Him crawling, small, facing left: on all fours, digging hands ahead. */
  function crawler(parent) {
    const g = el('g', { class: 'crawler', transform: `scale(${CRAWLER})` }, parent)
    const { BODY, PINK, NOSE } = MoleArt
    el('path', { d: 'M34 0 C40 -30 20 -52 -6 -52 C-30 -52 -44 -38 -44 -22 C-44 -8 -34 0 -22 0 Z', fill: BODY }, g)
    el('path', { d: 'M-44 -24 l-14 4 l13 6 Z', fill: BODY }, g) // his snout
    el('circle', { cx: -59, cy: -20, r: 5.5, fill: NOSE }, g)
    el('ellipse', { cx: -32, cy: -34, rx: 5, ry: 6.5, fill: '#fff' }, g)
    el('circle', { cx: -33.5, cy: -33, r: 2.6, fill: BODY }, g)
    el('path', { d: 'M-12 -52 q-4 -12 2 -14 M-6 -52 q2 -13 8 -12 M0 -51 q8 -10 13 -6', stroke: BODY, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, g)
    const hands = el('g', { class: 'digging' }, g)
    el('ellipse', { cx: -46, cy: -6, rx: 11, ry: 7, fill: PINK, stroke: '#b9705a', 'stroke-width': 1.2, transform: 'rotate(-20 -46 -6)' }, hands)
    for (const x of [-8, 20]) el('ellipse', { cx: x, cy: -2, rx: 10, ry: 5, fill: PINK, stroke: '#b9705a', 'stroke-width': 1.2 }, g)
    return g
  }

  /**
   * The cutaway for a tunnel from `from` to `to`, drawn into `layer`, nothing dug yet. It gives back:
   * - el: all of it (fade it in and out);
   * - dug: the tunnel's paths from the foot of the way down, each of length 1 (pathLength): show 0 to
   *   1 of them (stroke-dashoffset 1 to 0) as he digs;
   * - run: what moves along it, drawn at the tunnel's start, facing the way he goes: translate it by
   *   the distance dug. He is at its front; `followers` ([{ draw(g), scale }]) come behind him in turn.
   */
  function cut(layer, from, to, followers = []) {
    const dir = to < from ? -1 : 1
    const [l, r] = [Math.min(from, to) - SIDE, Math.max(from, to) + SIDE]
    const g = el('g', { class: 'cutaway' }, layer)
    el('path', { d: `M${l + 26} ${TOP} H${r - 26} Q${r} ${TOP} ${r} ${TOP + 26} V${TOP + DEEP} H${l} V${TOP + 26} Q${l} ${TOP} ${l + 26} ${TOP} Z`, fill: EARTH }, g)
    for (let i = 0; i < (r - l) / 26; i++) {
      const [x, y, s] = [l + 14 + random() * (r - l - 28), TOP + 10 + random() * (DEEP - 20), 3 + random() * 4]
      el('path', { d: `M${x} ${y} l${s} ${-s * 0.6} l${s * 0.4} ${s} Z`, fill: '#cbb894', opacity: 0.5 }, g)
    }
    // the way down where he went in is there already; along, and up to where he comes out, is dug as he goes
    const tube = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }
    const down = `M${from} ${TOP + 4} V${RUN_Y}`
    const along = { ...tube, d: `M${from} ${RUN_Y} H${to} V${TOP + 4}`, pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 }
    el('path', { ...tube, d: down, stroke: WALL, 'stroke-width': BORE + 10 }, g)
    const dug = [el('path', { ...along, stroke: WALL, 'stroke-width': BORE + 10 }, g)]
    el('path', { ...tube, d: down, stroke: AIR, 'stroke-width': BORE }, g)
    dug.push(el('path', { ...along, stroke: AIR, 'stroke-width': BORE }, g))
    // only those in the tunnel show: who follows him is out of sight until it passes the way down
    const clip = el('clipPath', { id: `tunnel-${++cuts}` }, g)
    el('rect', { x: Math.min(from, to) - BORE / 2, y: TOP, width: Math.abs(to - from) + BORE, height: DEEP }, clip)
    const run = el('g', { class: 'tunnellers' }, el('g', { 'clip-path': `url(#${clip.id})` }, g))
    const facing = el('g', { transform: `translate(${from} ${FLOOR}) scale(${-dir} 1)` }, run) // drawn facing left: turned the way they go
    followers.forEach(({ draw, scale }, n) => {
      const f = el('g', { transform: `translate(${(n + 1) * FOLLOW_GAP} 0) scale(${scale})` }, facing)
      draw(f)
    })
    crawler(facing)
    return { el: g, dug, run }
  }

  return { cut, FOLLOW_GAP }
})()
