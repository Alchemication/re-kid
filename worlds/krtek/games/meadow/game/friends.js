// The meadow's other animals, drawn in code the series' way (flat, outlined,
// a few round shapes): the mouse, the hare, the hen with her spotted head
// (Krtek a vejce) and her chick, the fox. An encounter calls one in, moves it
// with Motion.endAt on the Clock, and sends it home when it is done, or in
// its restore() when it is cut short (things.js), so nobody is left standing
// about. Nobody vanishes in view: sent home, one walks or hops off the
// nearer edge of the screen (the mouse ducks into her hole) and only then is
// gone (leave()); gone() at once is for bedtime, under the closing circle.

/* global Debug, DOMMatrixReadOnly, Layout, Motion, View */
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

  /** A furry outline: an ellipse whose edge goes in and out in n points, as the films draw fur (the hare, the fox's ruff). */
  function fluffy(cx, cy, rx, ry, n, jag) {
    const pts = []
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2
      const k = i % 2 ? 1 : 1 + jag
      pts.push(`${(cx + Math.cos(a) * rx * k).toFixed(1)} ${(cy + Math.sin(a) * ry * k).toFixed(1)}`)
    }
    return `M${pts.join(' L')} Z`
  }

  const DRAW = {
    mouse(g) {
      el('path', { d: 'M24 -10 q30 6 44 -14', fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, g)
      el('path', { d: fluffy(0, -26, 29, 23, 14, 0.07), fill: '#8e8577', ...line }, g)
      el('ellipse', { cx: -6, cy: -22, rx: 14, ry: 13, fill: '#c9c0b2' }, g)
      const head = el('g', { class: 'head' }, g)
      for (const cx of [-26, 6]) {
        el('circle', { cx, cy: -78, r: 17, fill: '#8e8577', ...line }, head)
        el('circle', { cx, cy: -78, r: 9.5, fill: '#f2a0a6' }, head)
      }
      // a pointed snout, a pink nose at its tip, whiskers: a mouse's face as in Krtek a vejce
      el('path', { d: 'M8 -60 C6 -74 -16 -76 -26 -64 L-46 -52 C-30 -40 4 -40 8 -60 Z', fill: '#8e8577', ...line }, head)
      el('circle', { cx: -47, cy: -52, r: 5, fill: '#f2a0a6', ...line, 'stroke-width': 1.5 }, head)
      el('ellipse', { cx: -16, cy: -62, rx: 5, ry: 6.5, fill: '#fff', ...line, 'stroke-width': 1.5 }, head)
      el('circle', { cx: -17, cy: -61, r: 2.8, fill: INK }, head)
      el('path', { d: 'M-40 -52 l-18 -6 M-40 -50 l-19 2 M-40 -48 l-16 8', stroke: INK, 'stroke-width': 1.2, fill: 'none' }, head)
      return head
    },
    hare(g) {
      // sitting up, brown, with a white belly, big feet and a white ruff round his face (Krtek malířem)
      for (const x of [-26, 20]) el('ellipse', { cx: x, cy: -6, rx: 24, ry: 9, fill: '#8a5c32', ...line }, g)
      el('path', { d: fluffy(0, -50, 40, 46, 16, 0.07), fill: '#9a6a3c', ...line }, g)
      el('ellipse', { cx: -2, cy: -40, rx: 22, ry: 30, fill: '#f3ead8' }, g)
      for (const x of [-16, 10]) el('ellipse', { cx: x, cy: -66, rx: 9, ry: 7, fill: '#9a6a3c', ...line, 'stroke-width': 2 }, g)
      const head = el('g', { class: 'head' }, g)
      for (const [cx, r] of [[-18, -12], [14, 10]]) {
        const ear = el('g', { transform: `rotate(${r} ${cx} -132)` }, head)
        el('ellipse', { cx, cy: -172, rx: 13, ry: 42, fill: '#9a6a3c', ...line }, ear)
        el('ellipse', { cx, cy: -168, rx: 6, ry: 32, fill: '#d9b08a' }, ear)
      }
      el('path', { d: fluffy(-2, -108, 38, 30, 18, 0.16), fill: '#f6f1e4', ...line, 'stroke-width': 2 }, head)
      el('circle', { cx: -2, cy: -118, r: 25, fill: '#9a6a3c' }, head)
      for (const x of [-12, 8]) {
        el('ellipse', { cx: x, cy: -124, rx: 6.5, ry: 8, fill: '#fff', ...line, 'stroke-width': 1.5 }, head)
        el('circle', { cx: x - 1, cy: -122, r: 3.4, fill: INK }, head)
      }
      for (const x of [-10, 6]) el('circle', { cx: x, cy: -104, r: 9, fill: '#fbf8ef' }, head)
      el('ellipse', { cx: -2, cy: -110, rx: 5.5, ry: 4, fill: '#d98a8a', ...line, 'stroke-width': 1.5 }, head)
      el('rect', { x: -7, y: -100, width: 10, height: 8, fill: '#fff', ...line, 'stroke-width': 1.5 }, head)
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
    fox(g) {
      // a big bushy tail with a white tip, a sly face in a jagged white ruff, legs in dark socks (Krtek malířem)
      el('path', { d: 'M36 -44 C70 -40 104 -64 112 -112 C100 -96 86 -92 72 -94 C88 -106 92 -120 86 -128 C72 -96 52 -76 30 -66 Z', fill: '#c8642a', ...line }, g)
      el('path', { d: 'M112 -112 C110 -122 100 -130 86 -128 C92 -120 88 -106 72 -94 C86 -92 100 -96 112 -112 Z', fill: '#fbf8ef', ...line, 'stroke-width': 2 }, g)
      for (const x of [-30, -10, 16, 34]) {
        el('path', { d: `M${x - 6} -34 L${x - 4} -6 L${x + 4} -6 L${x + 6} -34 Z`, fill: '#c8642a', ...line, 'stroke-width': 2 }, g)
        el('path', { d: `M${x - 5} -12 L${x - 4} 0 L${x + 6} 0 L${x + 5} -12 Z`, fill: '#3a2414', ...line, 'stroke-width': 2 }, g)
      }
      el('path', { d: fluffy(6, -48, 46, 28, 14, 0.06), fill: '#c8642a', ...line }, g)
      el('path', { d: fluffy(-26, -56, 18, 20, 9, 0.22), fill: '#fbf8ef' }, g)
      const head = el('g', { class: 'head' }, g)
      for (const x of [-44, -14]) {
        el('path', { d: `M${x} -108 l-6 -36 l22 24 z`, fill: '#c8642a', ...line }, head)
        el('path', { d: `M${x - 4} -128 l-2 -14 l9 9 z`, fill: '#3a2414' }, head)
      }
      el('path', { d: fluffy(-34, -78, 34, 26, 12, 0.24), fill: '#fbf8ef', ...line, 'stroke-width': 2 }, head)
      el('path', { d: 'M-12 -100 C-4 -78 -20 -64 -44 -62 L-84 -74 C-72 -88 -54 -106 -12 -100 Z', fill: '#c8642a', ...line }, head)
      el('circle', { cx: -86, cy: -74, r: 5.5, fill: INK }, head)
      el('ellipse', { cx: -40, cy: -88, rx: 7, ry: 5, fill: '#fff', ...line, 'stroke-width': 1.5 }, head)
      el('circle', { cx: -42, cy: -88, r: 3, fill: INK }, head)
      el('path', { d: 'M-50 -95 l14 -3', stroke: INK, 'stroke-width': 2.5, 'stroke-linecap': 'round' }, head)
      el('path', { d: 'M-80 -66 q18 10 36 -2', fill: '#fff', ...line, 'stroke-width': 2 }, head)
      return head
    },
    bullfinch(g) {
      // the films' bird (Krtek a buldozer's opening): grey back, red-orange breast and cheeks, a black cap,
      // black wings with a white bar and a black tail. Drawn round its body, facing left; its wings beat in flight (game.css)
      el('path', { d: 'M18 -20 l26 -6 l-4 12 z', fill: '#15140f' }, g)
      el('ellipse', { cx: 2, cy: -20, rx: 24, ry: 16, fill: '#8d8f96', ...line, 'stroke-width': 2.5 }, g)
      el('ellipse', { cx: -8, cy: -14, rx: 16, ry: 11, fill: '#e2603a' }, g)
      const head = el('g', { class: 'head' }, g)
      el('circle', { cx: -18, cy: -32, r: 12, fill: '#e2603a', ...line, 'stroke-width': 2.5 }, head)
      el('path', { d: 'M-30 -33 a12 12 0 0 1 24 -4 q-12 -2 -24 4 z', fill: '#15140f' }, head)
      el('circle', { cx: -22, cy: -31, r: 2.2, fill: '#15140f' }, head)
      el('path', { d: 'M-29 -30 l-8 3 l8 3 z', fill: '#15140f' }, head)
      const wing = el('g', { class: 'wing' }, g)
      el('path', { d: 'M-2 -26 C12 -40 30 -36 34 -24 C24 -20 10 -18 -2 -22 z', fill: '#15140f', ...line, 'stroke-width': 2 }, wing)
      el('path', { d: 'M8 -30 C16 -32 24 -30 28 -27', stroke: '#fbf8ef', 'stroke-width': 3, fill: 'none' }, wing)
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

  const LEAVE_MS = 900 // sent home: off the screen in about this long
  const OFF = 140 // how far past the screen's edge it goes before it is gone

  /** Off home: down its hole, or off the screen (the nearer edge, or `dir`'s: -1 left, 1 right), and only then gone. */
  async function goHome(f, hole, dir = 0) {
    f.leaving = true
    try {
      if (hole) await f.rise(false)
      else {
        const x = f.drawnX()
        const leftwards = dir ? dir < 0 : x - View.x < View.x + Layout.VIEW_W - x
        // on past the edge, and on again if the view has followed the mole that way meanwhile
        for (let n = 0; n < 6 && (n === 0 || inSight(f.drawnX())); n++) {
          const at = f.drawnX()
          const to = leftwards ? Math.min(View.x - OFF, at - OFF) : Math.max(View.x + Layout.VIEW_W + OFF, at + OFF)
          f.turn(leftwards ? -1 : 1)
          await f.go(to, LEAVE_MS, f.kind === 'hare' ? 30 : 0)
        }
      }
    } catch { /* cut short by bedtime's gone(): gone already */ }
    f.gone()
  }

  /** Whether something at scene x shows on the screen now (with a body's width either side). */
  const inSight = (x) => x > View.x - 60 && x < View.x + Layout.VIEW_W + 60

  /** Off the screen to the left (-1) or right (1) of the view now, and at least as far as x. */
  const offscreen = (dir, x = dir < 0 ? Infinity : -Infinity) => (dir < 0 ? Math.min(x, View.x - OFF) : Math.max(x, View.x + Layout.VIEW_W + OFF))

  /** Call one in: drawn at x, facing left (face: 1 turns it right). Nobody appears in view out of
   * nowhere: it must be out of sight, unless it lives in a hole there (hole: the mouse, who
   * comes up and goes home down it) or is born there (born: the chick, out of the egg). */
  function make(kind, x, face = -1, { hole = false, born = false } = {}) {
    Debug.check('a visitor comes in from out of sight, never appearing in view', hole || born || !inSight(x), { kind, x: Math.round(x), view: Math.round(View.x) })
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
      /** Where it is drawn now, mid-walk (f.x is where it is going). */
      drawnX() {
        const t = getComputedStyle(g).transform
        return t && t !== 'none' ? new DOMMatrixReadOnly(t).e : f.x
      },
      /** Walk (small steps) or hop (high bounces) to x, from where it is drawn now. */
      async go(nx, ms, hop = 0) {
        const from = f.drawnX()
        g.getAnimations().forEach((a) => a.cancel()) // a new walk replaces the last: two at once, the older wins on screen
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
      /** A sneeze: the head jerks back, then forward. */
      async jolt() {
        await Motion.endAt(head, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(16deg) translateY(-6px)', offset: 0.35 }, { transform: 'rotate(-12deg) translateY(4px)', offset: 0.6 }, { transform: 'rotate(0deg)' }], { duration: 700 })
      },
      /** Disappointed: the head sinks, and comes slowly back up. */
      async droop() {
        await Motion.endAt(head, [{ transform: 'rotate(0deg) translateY(0px)' }, { transform: 'rotate(10deg) translateY(16px)', offset: 0.3 }, { transform: 'rotate(10deg) translateY(16px)', offset: 0.7 }, { transform: 'rotate(0deg) translateY(0px)' }], { duration: 1400 })
      },
      /** Paint on it: 'stripes' (the hare, a tiger) or 'spots' (the mouse), in `colour`. */
      daub(pattern, colour) {
        const marks = el('g', { class: 'paint' }, inner)
        if (pattern === 'stripes') for (let y = -96; y < -6; y += 18) el('path', { d: `M-40 ${y} q40 -10 80 0`, stroke: colour, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' }, marks)
        else for (const [cx, cy] of [[-14, -36], [10, -22], [16, -42], [-4, -16], [-24, -60], [-2, -66]]) el('circle', { cx, cy, r: 6, fill: colour }, marks)
      },
      /** Up onto someone's shoulders (dy) or back down (0). */
      async lift(dy, ms = 600) {
        await Motion.endAt(g, [{ transform: `translate(${f.x}px, ${Y - dy}px)` }], { duration: ms, easing: 'cubic-bezier(.3,1.4,.5,1)' })
      },
      /** Start down in a hole (rise() brings it up). */
      under() {
        riser.style.transform = 'translateY(110px)'
      },
      /** Off home, not to be seen vanishing (goHome). */
      leave: (dir = 0) => goHome(f, hole, dir),
      /** Gone: once out of sight (off the screen, down its hole), or at once at bedtime, under the closing circle. */
      gone(bedtime = false) {
        const x = f.drawnX()
        const inView = inSight(x)
        const down = /translateY\(110px\)/.test(riser.style.transform)
        Debug.check('a visitor goes home out of sight, never vanishing in view', bedtime || down || !inView || !g.isConnected, { kind, x: Math.round(x), view: Math.round(View.x) })
        g.getAnimations({ subtree: true }).forEach((a) => a.cancel())
        g.remove()
      },
    }
    f.place(x)
    f.turn(face)
    return f
  }

  /** A troupe: the visitors one encounter has out, so its restore() can send them all home. */
  function troupe() {
    let out = []
    let leaving = [] // sent home, walking off
    return {
      call(kind, x, face, opts) {
        const f = make(kind, x, face, opts)
        out.push(f)
        return f
      },
      /** Send one home: it walks off (leave; dir: which way, else the nearer edge), and is no longer
       * the encounter's (now = gone at once). */
      dismiss(f, now = false, dir = 0) {
        if (!f) return
        out = out.filter((c) => c !== f)
        leaving.push(f)
        if (now) f.gone(true)
        else if (!f.leaving) f.leave(dir).then(() => { leaving = leaving.filter((c) => c !== f) }) // already on its way: let it go
      },
      /** Everyone home: walking off (a cut), or at once (now: bedtime, which also takes those still leaving). */
      dismissAll(now = false, dir = 0) {
        for (const f of [...out]) this.dismiss(f, now, dir)
        if (now) for (const f of leaving) f.gone(true)
        if (now) leaving = []
      },
      kinds: () => out.map((f) => f.kind),
    }
  }

  return { setup, make, troupe, offscreen }
})()
