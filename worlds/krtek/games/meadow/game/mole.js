// The little mole: drawn in code from the series' look (black and
// pear-shaped, a grey-green belly, big white eyes, a round red nose, pink
// hands, a few hairs standing up; worlds/krtek/world.yaml, characters), and
// his gestures. Every gesture moves him with Motion.endAt on the Clock, so a
// tap can cut it short with relax() and he always ends free and standing,
// as he is drawn: nothing is frozen on an animation's last frame.
//
// Where he is: `x` along the meadow, and how much of him shows (`pose`):
// 'down' (under the ground), 'hill' (up to his middle in a molehill), 'out'
// (on the grass, feet and all) or 'listen' (in his molehill, chin on his
// hands, eyes half shut: the cricket is playing).

/* global Clock, Debug, Layout, Motion */
/* exported Mole */
const Mole = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const Y = Layout.GROUND // his feet-line
  const SCALE = 1.2 // drawn at this size: about a fifth of the screen high, out on the grass
  const SINK = { down: 240, hill: 16, out: 0, listen: 26 } // how far below his feet-line he sits, scene units
  const DIG_MS = 380 // diving down, or coming up
  const TUNNEL_MS_PER_UNIT = 0.9 // the bump of earth running under the grass
  const WALK_MS_PER_UNIT = 3.2 // a mole's waddle on the grass
  const life = Debug.random('mole-life') // blinks and glances: their own stream

  const state = { x: 0, pose: 'down', busy: null, carrying: false }
  let root, body, eyes, lids, pupils, arms, can, feet, tunnel, inLayer, outLayer

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /** Draw him into `layer` (behind the molehills, so they hide his lower half), out on the grass into
   * `grass` (in front of them), and the tunnel bumps into `ground`. */
  function make(layer, grass, ground) {
    inLayer = layer
    outLayer = grass
    root = el('g', { class: 'mole' }, layer)
    body = el('g', { class: 'mole-body' }, root)
    const art = el('g', {}, body)
    art.style.transform = `scale(${SCALE})`
    feet = el('g', { class: 'mole-feet' }, art)
    el('ellipse', { cx: -20, cy: -6, rx: 20, ry: 9, fill: '#f2a0a6', stroke: '#15140f', 'stroke-width': 3 }, feet)
    el('ellipse', { cx: 22, cy: -6, rx: 20, ry: 9, fill: '#f2a0a6', stroke: '#15140f', 'stroke-width': 3 }, feet)
    el('path', { d: 'M-46 -8 C-52 -80 -34 -150 0 -150 C34 -150 52 -80 46 -8 Q0 6 -46 -8 Z', fill: '#15140f' }, art)
    el('ellipse', { cx: 0, cy: -48, rx: 24, ry: 34, fill: '#5d6b57' }, art)
    const hair = el('g', { class: 'mole-hair', stroke: '#15140f', 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round' }, art)
    for (const d of ['M0 -148 Q-3 -168 3 -182', 'M-6 -146 Q-18 -160 -20 -174', 'M6 -146 Q20 -158 26 -170']) el('path', { d }, hair)
    eyes = el('g', { class: 'mole-eyes' }, art)
    for (const cx of [-15, 15]) el('ellipse', { cx, cy: -108, rx: 13, ry: 18, fill: '#fff', stroke: '#15140f', 'stroke-width': 2 }, eyes)
    pupils = el('g', {}, eyes)
    for (const cx of [-12, 18]) el('ellipse', { cx, cy: -104, rx: 5.5, ry: 7.5, fill: '#15140f' }, pupils)
    lids = el('g', { class: 'mole-lids' }, eyes)
    for (const cx of [-15, 15]) el('path', { d: `M${cx - 14} -126 H${cx + 14} V-108 Q${cx} -100 ${cx - 14} -108 Z`, fill: '#15140f' }, lids)
    lids.style.transformOrigin = '0px -126px'
    lids.style.transform = 'scaleY(0)'
    el('circle', { cx: 4, cy: -84, r: 15, fill: '#d8322b', stroke: '#15140f', 'stroke-width': 2 }, art)
    el('path', { d: 'M-10 -64 Q2 -56 14 -64', stroke: '#15140f', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, art)
    arms = el('g', { class: 'mole-arms' }, art)
    for (const side of [-1, 1]) {
      const arm = el('g', { class: `mole-arm side${side}` }, arms)
      arm.style.transformOrigin = `${side * 40}px -70px`
      el('path', { d: `M${side * 40} -70 Q${side * 58} -52 ${side * 54} -36`, stroke: '#15140f', 'stroke-width': 14, fill: 'none', 'stroke-linecap': 'round' }, arm)
      el('ellipse', { cx: side * 54, cy: -32, rx: 12, ry: 9, fill: '#f2a0a6', stroke: '#15140f', 'stroke-width': 2.5 }, arm)
    }
    can = el('g', { class: 'mole-can' }, art)
    el('path', { d: 'M36 -66 h46 l-6 40 h-34 z', fill: '#3a67ad', stroke: '#15140f', 'stroke-width': 3 }, can)
    el('path', { d: 'M80 -56 l34 -22 l4 6 l-32 24 z', fill: '#3a67ad', stroke: '#15140f', 'stroke-width': 2.5 }, can)
    el('path', { d: 'M44 -66 q15 -22 30 0', stroke: '#15140f', 'stroke-width': 4, fill: 'none' }, can)
    can.style.transformOrigin = '58px -46px'
    can.style.display = 'none'
    tunnel = el('g', { class: 'tunnel' }, ground)
    blink()
    glance()
    put(state.x, state.pose)
  }

  /** Stand him at x in `pose`, as the end of whatever brought him there. */
  function put(x, pose) {
    state.x = x
    state.pose = pose
    root.style.transform = `translate(${x}px, ${Y}px)`
    const layer = pose === 'out' ? outLayer : inLayer
    if (root.parentNode !== layer) layer.appendChild(root)
    body.style.transform = `translateY(${SINK[pose]}px)`
    feet.style.visibility = pose === 'out' ? 'visible' : 'hidden'
    lids.style.transform = pose === 'listen' ? 'scaleY(0.55)' : 'scaleY(0)'
  }

  function blink() {
    Clock.after(2200 + life() * 3500, () => {
      if (state.pose !== 'listen' && state.pose !== 'down') {
        Debug.ignoreCut(Motion.endAt(lids, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)', offset: 0.5 }, { transform: 'scaleY(0)' }], { duration: 160 }), 'blink')
      }
      blink()
    })
  }

  function glance() {
    Clock.after(1500 + life() * 3000, () => {
      const dx = Math.round((life() - 0.5) * 8)
      const dy = Math.round((life() - 0.6) * 5)
      Debug.ignoreCut(Motion.endAt(pupils, [{ transform: `translate(${dx}px, ${dy}px)` }], { duration: 180, easing: 'ease-out' }), 'glance')
      glance()
    })
  }

  /** Cut every gesture short: he stays where it was taking him. */
  function relax() {
    for (const e of [root, body, ...arms.children, can]) e.getAnimations().forEach((a) => a.cancel())
    for (const b of [...tunnel.children]) b.remove()
    arms.children[0].style.transform = arms.children[1].style.transform = ''
    can.style.transform = ''
    state.busy = null
  }

  const sink = (pose, ms = DIG_MS, easing = 'ease-in') =>
    Motion.endAt(body, [{ transform: `translateY(${SINK[pose]}px)` }], { duration: ms, easing }).then(() => put(state.x, pose))

  /** Come up through the molehill he is under. */
  async function comeUp(pose = 'hill') {
    feet.style.visibility = pose === 'out' ? 'visible' : 'hidden'
    if (pose === 'out') outLayer.appendChild(root) // climbing out in front of the molehill
    await sink(pose, DIG_MS + 120, 'cubic-bezier(.3,1.5,.5,1)')
  }

  /** Dive down where he is. */
  async function goDown() {
    feet.style.visibility = 'hidden'
    inLayer.appendChild(root) // back behind the molehill he goes down into
    await sink('down')
  }

  /** Bumps of earth running under the grass from where he is to x, as he tunnels. */
  async function tunnelTo(x) {
    const from = state.x
    const ms = Math.max(300, Math.abs(x - from) * TUNNEL_MS_PER_UNIT)
    const bump = el('ellipse', { cx: 0, cy: 0, rx: 30, ry: 12, fill: '#6e4a24' }, tunnel)
    bump.style.transform = `translate(${from}px, ${Y + 14}px)`
    state.x = x // he is on his way there: a cut leaves him there
    try {
      await Motion.endAt(bump, [{ transform: `translate(${from}px, ${Y + 14}px)` }, { transform: `translate(${x}px, ${Y + 14}px)` }], { duration: ms, easing: 'ease-in-out' })
    } finally {
      bump.remove()
    }
    root.style.transform = `translate(${x}px, ${Y}px)`
  }

  /** Waddle along the grass to x (he is out). */
  async function walkTo(x) {
    const ms = Math.max(250, Math.abs(x - state.x) * WALK_MS_PER_UNIT)
    const from = state.x
    state.x = x
    const steps = Math.max(2, Math.round(ms / 180))
    const frames = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      frames.push({ transform: `translate(${from + (x - from) * t}px, ${Y + (i % 2 ? -8 : 0)}px)` })
    }
    frames[frames.length - 1] = { transform: `translate(${x}px, ${Y}px)` }
    await Motion.endAt(root, frames, { duration: ms })
  }

  /** A hop with both arms flung up. */
  async function cheer() {
    const [left, right] = arms.children
    const up = (side) => [{ transform: 'rotate(0deg)' }, { transform: `rotate(${side * -130}deg)`, offset: 0.35 }, { transform: `rotate(${side * -130}deg)`, offset: 0.7 }, { transform: 'rotate(0deg)' }]
    const hop = [{ transform: `translateY(${SINK[state.pose]}px)` }, { transform: `translateY(${SINK[state.pose] - 34}px)`, offset: 0.4 }, { transform: `translateY(${SINK[state.pose]}px)` }]
    await Promise.all([
      Motion.endAt(left, up(-1), { duration: 700 }),
      Motion.endAt(right, up(1), { duration: 700 }),
      Motion.endAt(body, hop, { duration: 700, easing: 'ease-out' }),
    ])
  }

  /** Stretch both arms up, slowly: waking, or bedtime. */
  async function stretch() {
    const [left, right] = arms.children
    const up = (side) => [{ transform: 'rotate(0deg)' }, { transform: `rotate(${side * -150}deg)`, offset: 0.5 }, { transform: 'rotate(0deg)' }]
    await Promise.all([Motion.endAt(left, up(-1), { duration: 1300 }), Motion.endAt(right, up(1), { duration: 1300 })])
  }

  /** Take up the watering can, or put it down. */
  function hold(on) {
    state.carrying = on
    can.style.display = on ? '' : 'none'
  }

  /** Tip the can: filling it at the spring (down) or watering (forward). */
  async function tip(deg, ms) {
    await Motion.endAt(can, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${deg}deg)`, offset: 0.25 }, { transform: `rotate(${deg}deg)`, offset: 0.8 }, { transform: 'rotate(0deg)' }], { duration: ms })
  }

  /** Lie in his molehill to listen (dusk), or stop. */
  function listen(on) {
    put(state.x, on ? 'listen' : 'hill')
  }

  /** Where the can's spout is now, in scene units, while he waters. */
  const spout = () => ({ x: state.x + 116 * SCALE, y: Y + SINK[state.pose] - 70 * SCALE })

  return { state, spout, make, put, relax, comeUp, goDown, tunnelTo, walkTo, cheer, stretch, hold, tip, listen }
})()
