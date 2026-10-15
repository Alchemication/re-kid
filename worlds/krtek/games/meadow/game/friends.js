// The meadow's other animals, drawn in code the series' way (flat, outlined,
// a few round shapes): the mouse, the hare, the hen with her spotted head
// (Krtek a vejce) and her chick. An encounter calls one in, moves it with
// Motion.endAt on the Clock, and sends it home (gone()) when it is done, or
// in its restore() when it is cut short (things.js), so nobody is left
// standing about.

/* global Layout, Motion */
/* exported Friends */
const Friends = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const Y = Layout.GROUND
  const INK = '#15140f'
  let layer = null

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const line = { stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }

  const DRAW = {
    mouse(g) {
      el('path', { d: 'M24 -10 q30 6 44 -14', fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, g)
      el('ellipse', { cx: 0, cy: -26, rx: 30, ry: 24, fill: '#8e8577', ...line }, g)
      const head = el('g', { class: 'head' }, g)
      for (const cx of [-26, 4]) {
        el('circle', { cx, cy: -76, r: 17, fill: '#8e8577', ...line }, head)
        el('circle', { cx, cy: -76, r: 9, fill: '#f2a0a6' }, head)
      }
      el('ellipse', { cx: -10, cy: -54, rx: 20, ry: 17, fill: '#8e8577', ...line }, head)
      el('circle', { cx: -16, cy: -58, r: 4, fill: INK }, head)
      el('circle', { cx: -2, cy: -58, r: 4, fill: INK }, head)
      el('circle', { cx: -30, cy: -50, r: 5, fill: INK }, head)
      return head
    },
    hare(g) {
      el('ellipse', { cx: 0, cy: -50, rx: 42, ry: 48, fill: '#9a6a3c', ...line }, g)
      el('ellipse', { cx: 0, cy: -40, rx: 24, ry: 30, fill: '#f3ead8' }, g)
      const head = el('g', { class: 'head' }, g)
      for (const [cx, r] of [[-18, -12], [16, 10]]) {
        el('ellipse', { cx, cy: -168, rx: 12, ry: 40, fill: '#9a6a3c', ...line, transform: `rotate(${r} ${cx} -132)` }, head)
      }
      el('circle', { cx: 0, cy: -112, r: 32, fill: '#f3ead8', ...line }, head)
      el('circle', { cx: 0, cy: -114, r: 24, fill: '#9a6a3c' }, head)
      el('circle', { cx: -9, cy: -120, r: 4.5, fill: INK }, head)
      el('circle', { cx: 9, cy: -120, r: 4.5, fill: INK }, head)
      el('ellipse', { cx: 0, cy: -106, rx: 6, ry: 4.5, fill: INK }, head)
      el('rect', { x: -6, y: -101, width: 12, height: 9, fill: '#fff', ...line, 'stroke-width': 1.5 }, head)
      return head
    },
    hen(g) {
      el('path', { d: 'M30 -60 q40 -40 30 -80 q-20 30 -40 40 z', fill: INK }, g)
      el('ellipse', { cx: 0, cy: -48, rx: 48, ry: 40, fill: INK }, g)
      el('path', { d: 'M-20 -50 q20 -14 44 0 q-20 18 -44 0 z', fill: '#5e5a66' }, g)
      for (const x of [-12, 12]) el('path', { d: `M${x} -10 v12 h-8 M${x} 2 h8`, stroke: '#e0a020', 'stroke-width': 4, fill: 'none' }, g)
      const head = el('g', { class: 'head' }, g)
      el('ellipse', { cx: -40, cy: -98, rx: 20, ry: 30, fill: '#fff', ...line }, head)
      for (const [cx, cy] of [[-46, -110], [-34, -100], [-44, -88], [-36, -116], [-32, -84]]) el('circle', { cx, cy, r: 3, fill: INK }, head)
      el('path', { d: 'M-48 -128 q4 -12 10 -2 q4 -12 10 0 q4 -8 6 4 z', fill: '#d8322b', ...line, 'stroke-width': 2 }, head)
      el('path', { d: 'M-60 -100 l-14 5 l14 4 z', fill: '#e0a020', ...line, 'stroke-width': 2 }, head)
      el('circle', { cx: -48, cy: -104, r: 4, fill: '#fff' }, head)
      el('circle', { cx: -49, cy: -104, r: 2.2, fill: INK }, head)
      el('path', { d: 'M-56 -88 q4 10 10 2', fill: '#d8322b' }, head)
      return head
    },
    chick(g) {
      el('ellipse', { cx: 0, cy: -20, rx: 20, ry: 18, fill: '#f6d23b', ...line, 'stroke-width': 2.5 }, g)
      const head = el('g', { class: 'head' }, g)
      el('circle', { cx: -10, cy: -42, r: 13, fill: '#f6d23b', ...line, 'stroke-width': 2.5 }, head)
      el('circle', { cx: -14, cy: -45, r: 2.6, fill: INK }, head)
      el('path', { d: 'M-22 -42 l-9 3 l9 3 z', fill: '#e08a20' }, head)
      for (const x of [-6, 6]) el('path', { d: `M${x} -3 v5`, stroke: '#e08a20', 'stroke-width': 3 }, g)
      return head
    },
  }

  /** Set the layer they walk on (in front of the molehills). */
  function setup(where) {
    layer = where
  }

  /** Call one in: drawn at x, facing left (face: 1 turns it right), hidden until shown. */
  function make(kind, x, face = -1) {
    const g = el('g', { class: `friend ${kind}` }, layer)
    const riser = el('g', {}, g) // up out of a hole, or down into it
    const inner = el('g', {}, riser) // facing left or right
    const head = DRAW[kind](inner)
    head.style.transformOrigin = '0px -60px'
    const f = {
      kind, g, x, face,
      place(nx) {
        f.x = nx
        g.style.transform = `translate(${nx}px, ${Y}px)`
      },
      turn(dir) {
        f.face = dir
        inner.style.transform = dir > 0 ? 'scaleX(-1)' : ''
      },
      /** Walk (small steps) or hop (high bounces) to x. */
      async go(nx, ms, hop = 0) {
        const from = f.x
        f.x = nx
        const steps = Math.max(2, Math.round(ms / (hop ? 360 : 200)))
        const frames = []
        for (let i = 0; i <= steps; i++) {
          const up = i % 2 ? hop || 5 : 0
          frames.push({ transform: `translate(${from + ((nx - from) * i) / steps}px, ${Y - up}px)` })
        }
        frames[frames.length - 1] = { transform: `translate(${nx}px, ${Y}px)` }
        await Motion.endAt(g, frames, { duration: ms })
      },
      /** "Not mine": a shake of the head. */
      async no() {
        await Motion.endAt(head, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-14deg)', offset: 0.2 }, { transform: 'rotate(14deg)', offset: 0.45 }, { transform: 'rotate(-14deg)', offset: 0.7 }, { transform: 'rotate(0deg)' }], { duration: 1000 })
      },
      /** A bob of the head: a peck, a sniff, a nod. */
      async bob(times = 2) {
        const frames = [{ transform: 'rotate(0deg)' }]
        for (let i = 0; i < times; i++) frames.push({ transform: 'rotate(-18deg) translateY(6px)' }, { transform: 'rotate(0deg)' })
        await Motion.endAt(head, frames, { duration: 360 * times })
      },
      /** Rise out of a hole in the ground (the mouse), or sink back. */
      async rise(up) {
        await Motion.endAt(riser, [{ transform: `translateY(${up ? 0 : 110}px)` }], { duration: 420, easing: up ? 'cubic-bezier(.3,1.5,.5,1)' : 'ease-in' })
      },
      /** Start down in a hole (rise() brings it up). */
      under() {
        riser.style.transform = 'translateY(110px)'
      },
      gone() {
        g.getAnimations({ subtree: true }).forEach((a) => a.cancel())
        g.remove()
      },
    }
    f.place(x)
    f.turn(face)
    return f
  }

  return { setup, make }
})()
