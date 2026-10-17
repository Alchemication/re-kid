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

/* global Clock, Debug, DOMMatrixReadOnly, Layout, Motion */
/* exported Mole */
const Mole = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const Y = Layout.GROUND // his feet-line
  const SCALE = 1.2 // drawn at this size: about a fifth of the screen high, out on the grass
  const SINK = { down: 240, hill: 16, out: 0, listen: 26 } // how far below his feet-line he sits, scene units
  const DIG_MS = 380 // diving down, or coming up
  const TUNNEL_MS_PER_UNIT = 0.9 // the bump of earth running under the grass
  // His gaits, in scene units and ms: a walk with short quick steps, a bob and an arm swinging, and
  // on a long trip a run, longer and quicker, leaning forward (the films: he walks, sometimes runs)
  const WALK = { step: 38, stepMs: 210, reach: 9, lift: 7, bounce: 5, swing: 22, lean: 0 }
  const RUN = { step: 64, stepMs: 150, reach: 14, lift: 12, bounce: 10, swing: 40, lean: 7 }
  const RUN_FROM = 650 // a trip longer than this, he runs
  const life = Debug.random('mole-life') // blinks and glances: their own stream

  const state = { x: 0, pose: 'down', busy: null, carrying: false, can: false, holdsUp: false, lift: 0, painted: null, facing: 0 }
  let skin = [] // what paint colours: his body and his arms
  let lift = 0 // how far up he stands (on someone's shoulders)
  let spots = null // the friends' paint dabs on him
  const views = { front: null, side: null } // facing us, or in profile
  let sideFeet = [] // his two feet in profile, for the walk cycle
  let sideArm = null
  let root, body, tilt, eyes, lids, pupils, arms, can, feet, tunnel, inLayer, outLayer, carrySlot, hatSlot

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
    tilt = el('g', { class: 'mole-tilt' }, body) // leaning: an ear to the egg, a tug at a pole
    const art = el('g', {}, tilt)
    art.style.transform = `scale(${SCALE})`
    const front = el('g', { class: 'mole-front' }, art) // facing us: standing, in his molehill
    views.front = front
    feet = el('g', { class: 'mole-feet' }, front)
    el('ellipse', { cx: -20, cy: -6, rx: 20, ry: 9, fill: '#f2a0a6', stroke: '#15140f', 'stroke-width': 3 }, feet)
    el('ellipse', { cx: 22, cy: -6, rx: 20, ry: 9, fill: '#f2a0a6', stroke: '#15140f', 'stroke-width': 3 }, feet)
    skin.push(el('path', { d: 'M-46 -8 C-52 -80 -34 -150 0 -150 C34 -150 52 -80 46 -8 Q0 6 -46 -8 Z', fill: '#15140f' }, front))
    el('ellipse', { cx: 0, cy: -48, rx: 24, ry: 34, fill: '#5d6b57' }, front)
    const hair = el('g', { class: 'mole-hair', stroke: '#15140f', 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round' }, front)
    for (const d of ['M0 -148 Q-3 -168 3 -182', 'M-6 -146 Q-18 -160 -20 -174', 'M6 -146 Q20 -158 26 -170']) el('path', { d }, hair)
    spots = el('g', { class: 'mole-spots' }, front)
    for (const [cx, cy] of [[-26, -40], [22, -30], [-8, -18], [30, -66], [-30, -78], [12, -48]]) el('circle', { cx, cy, r: 7 }, spots)
    spots.style.display = 'none'
    eyes = el('g', { class: 'mole-eyes' }, front)
    for (const cx of [-15, 15]) el('ellipse', { cx, cy: -108, rx: 13, ry: 18, fill: '#fff', stroke: '#15140f', 'stroke-width': 2 }, eyes)
    pupils = el('g', {}, eyes)
    for (const cx of [-12, 18]) el('ellipse', { cx, cy: -104, rx: 5.5, ry: 7.5, fill: '#15140f' }, pupils)
    lids = el('g', { class: 'mole-lids' }, eyes)
    for (const cx of [-15, 15]) el('path', { d: `M${cx - 14} -126 H${cx + 14} V-108 Q${cx} -100 ${cx - 14} -108 Z`, fill: '#15140f' }, lids)
    lids.style.transformOrigin = '0px -126px'
    lids.style.transform = 'scaleY(0)'
    el('circle', { cx: 4, cy: -84, r: 15, fill: '#d8322b', stroke: '#15140f', 'stroke-width': 2 }, front)
    el('path', { d: 'M-10 -64 Q2 -56 14 -64', stroke: '#15140f', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, front)
    arms = el('g', { class: 'mole-arms' }, front)
    for (const side of [-1, 1]) {
      const arm = el('g', { class: `mole-arm side${side}` }, arms)
      arm.style.transformOrigin = `${side * 40}px -70px`
      skin.push(el('path', { d: `M${side * 40} -70 Q${side * 58} -52 ${side * 54} -36`, stroke: '#15140f', 'stroke-width': 14, fill: 'none', 'stroke-linecap': 'round' }, arm))
      el('ellipse', { cx: side * 54, cy: -32, rx: 12, ry: 9, fill: '#f2a0a6', stroke: '#15140f', 'stroke-width': 2.5 }, arm)
    }
    views.side = drawSide(art) // in profile: walking, running
    views.side.style.display = 'none'
    can = el('g', { class: 'mole-can' }, art)
    el('path', { d: 'M36 -66 h46 l-6 40 h-34 z', fill: '#3a67ad', stroke: '#15140f', 'stroke-width': 3 }, can)
    el('path', { d: 'M80 -56 l34 -22 l4 6 l-32 24 z', fill: '#3a67ad', stroke: '#15140f', 'stroke-width': 2.5 }, can)
    el('path', { d: 'M44 -66 q15 -22 30 0', stroke: '#15140f', 'stroke-width': 4, fill: 'none' }, can)
    can.style.transformOrigin = '58px -46px'
    can.style.display = 'none'
    carrySlot = el('g', { class: 'mole-carry', transform: 'translate(0 -196)' }, art) // what he holds up over his head
    hatSlot = el('g', { class: 'mole-hat', transform: 'translate(2 -142)' }, art) // what sits on his head
    tunnel = el('g', { class: 'tunnel' }, ground)
    blink()
    glance()
    put(state.x, state.pose)
  }

  /** His profile, facing right (scaleX(-1) for left): leaning a little forward, a long grey snout
   * with the red nose at its tip, one big eye, an arm, two feet that step. As the films draw him
   * walking (Krtek a autíčko, and riding the snail). */
  function drawSide(art) {
    const side = el('g', { class: 'mole-side' }, art)
    const ink = { stroke: '#15140f', 'stroke-width': 3 }
    sideFeet = [-14, 16].map((cx) => {
      const f = el('ellipse', { cx, cy: -5, rx: 17, ry: 8, fill: '#f2a0a6', ...ink, 'stroke-width': 2.5 }, side)
      f.style.transformOrigin = `${cx}px -5px`
      return f
    })
    skin.push(el('path', { d: 'M-38 -8 C-50 -70 -36 -142 4 -148 C38 -152 56 -116 54 -82 C52 -44 40 -12 30 -6 Q-4 4 -38 -8 Z', fill: '#15140f' }, side))
    el('path', { d: 'M18 -92 C40 -88 46 -50 32 -18 C24 -10 6 -12 4 -28 C2 -52 4 -84 18 -92 Z', fill: '#5d6b57' }, side)
    el('path', { d: 'M40 -124 C64 -124 92 -114 104 -104 C94 -94 66 -94 44 -100 Z', fill: '#8f9692', ...ink, 'stroke-width': 2.5 }, side)
    el('circle', { cx: 105, cy: -104, r: 8, fill: '#d8322b', ...ink, 'stroke-width': 2 }, side)
    el('path', { d: 'M92 -98 l20 6 M92 -100 l22 -2', stroke: '#15140f', 'stroke-width': 1.5, fill: 'none' }, side)
    el('ellipse', { cx: 30, cy: -126, rx: 11, ry: 15, fill: '#fff', ...ink, 'stroke-width': 2 }, side)
    el('ellipse', { cx: 35, cy: -123, rx: 4.5, ry: 6.5, fill: '#15140f' }, side)
    const hair = el('g', { stroke: '#15140f', 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round' }, side)
    for (const d of ['M2 -147 Q0 -166 8 -180', 'M-6 -145 Q-16 -160 -16 -174', 'M10 -147 Q22 -158 30 -168']) el('path', { d }, hair)
    sideArm = el('g', { class: 'mole-side-arm' }, side)
    sideArm.style.transformOrigin = '14px -78px'
    skin.push(el('path', { d: 'M14 -78 Q34 -66 44 -54', stroke: '#15140f', 'stroke-width': 14, fill: 'none', 'stroke-linecap': 'round' }, sideArm))
    el('ellipse', { cx: 48, cy: -50, rx: 11, ry: 8, fill: '#f2a0a6', ...ink, 'stroke-width': 2.5 }, sideArm)
    return side
  }

  /** Look towards scene x (his eyes, facing us): the first answer to a tap, before he goes. */
  function lookAt(x) {
    const dx = Math.max(-7, Math.min(7, (x - state.x) / 40))
    pupils.getAnimations().forEach((a) => a.cancel())
    pupils.style.transform = `translate(${Math.round(dx)}px, -2px)`
  }

  /** Show him in profile facing `dir` (1 right, -1 left), or facing us (0). */
  function face(dir) {
    state.facing = dir
    views.front.style.display = dir ? 'none' : ''
    views.side.style.display = dir ? '' : 'none'
    views.side.style.transform = dir < 0 ? 'scaleX(-1)' : ''
  }

  /** Stand him at x in `pose`, as the end of whatever brought him there. */
  function put(x, pose) {
    state.x = x
    state.pose = pose
    lift = state.lift = 0
    root.style.transform = `translate(${x}px, ${Y}px)`
    face(0)
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

  /** Cut every gesture short. He stays where he is drawn now, mid-step (a cut walk must not jump him
   * to where it was going), and faces us again. */
  function relax() {
    const walking = root.getAnimations().length > 0
    const x = walking ? drawnX() : state.x
    for (const e of [root, body, tilt, ...arms.children, can, carrySlot, sideArm, ...sideFeet]) e.getAnimations().forEach((a) => a.cancel())
    if (walking) {
      state.x = x
      root.style.transform = `translate(${x}px, ${Y - lift}px)`
    }
    face(0)
    for (const b of [...tunnel.children]) b.remove()
    armsUp(!!carrySlot.firstChild)
    can.style.transform = ''
    tilt.style.transform = ''
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

  /** Walk along the grass to x (he is out), in profile, his feet stepping; on a long trip he runs. */
  async function walkTo(x) {
    const from = state.x
    const d = Math.abs(x - from)
    if (d < 2) return
    const g = d > RUN_FROM ? RUN : WALK
    const steps = Math.max(2, Math.round(d / g.step))
    const ms = steps * g.stepMs
    state.x = x
    face(x > from ? 1 : -1)
    const cycle = { duration: g.stepMs * 2, iterations: steps / 2 }
    const [back, ahead] = sideFeet
    const stepping = (lead) => [
      { transform: 'translate(0px, 0px)' },
      { transform: `translate(${lead * g.reach}px, ${-g.lift}px)`, offset: 0.25 },
      { transform: `translate(${lead * g.reach}px, 0px)`, offset: 0.5 },
      { transform: `translate(${-lead * g.reach}px, 0px)`, offset: 0.75 },
      { transform: 'translate(0px, 0px)' },
    ]
    const bob = []
    for (let i = 0; i <= steps; i++) bob.push({ transform: `translate(${from + ((x - from) * i) / steps}px, ${Y - lift - (i % 2 ? g.bounce : 0)}px)` })
    bob[bob.length - 1] = { transform: `translate(${x}px, ${Y - lift}px)` }
    const moves = [
      Motion.endAt(root, bob, { duration: ms }),
      Motion.endAt(back, stepping(1), cycle),
      Motion.endAt(ahead, stepping(-1), cycle),
      Motion.endAt(tilt, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${g.lean}deg)`, offset: 0.15 }, { transform: `rotate(${g.lean}deg)`, offset: 0.85 }, { transform: 'rotate(0deg)' }], { duration: ms }),
    ]
    if (!state.carrying) moves.push(Motion.endAt(sideArm, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${-g.swing}deg)`, offset: 0.25 }, { transform: `rotate(${g.swing}deg)`, offset: 0.75 }, { transform: 'rotate(0deg)' }], cycle))
    try {
      await Promise.all(moves)
    } finally {
      if (state.x === x) face(0) // there: facing us again (a cut has turned him round already)
    }
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
    can.style.display = on ? '' : 'none'
    state.can = on
    state.carrying = on || state.holdsUp
  }

  /** Where he is drawn now, mid-move (state.x is where he is going): for the view to follow. */
  function drawnX() {
    const t = getComputedStyle(root).transform
    return t && t !== 'none' ? new DOMMatrixReadOnly(t).e : state.x
  }

  /** The middle of his head, in scene units: where something lands on it. */
  const head = () => ({ x: state.x, y: Y - lift + SINK[state.pose] - 150 * SCALE })


  /** Tip the can: filling it at the spring (down) or watering (forward). */
  async function tip(deg, ms) {
    await Motion.endAt(can, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${deg}deg)`, offset: 0.25 }, { transform: `rotate(${deg}deg)`, offset: 0.8 }, { transform: 'rotate(0deg)' }], { duration: ms })
  }

  /** Lie in his molehill to listen (dusk), or stop. */
  function listen(on) {
    put(state.x, on ? 'listen' : 'hill')
  }

  /** Both arms up (holding something over his head) or down. */
  function armsUp(on) {
    arms.children[0].style.transform = on ? 'rotate(150deg)' : ''
    arms.children[1].style.transform = on ? 'rotate(-150deg)' : ''
    sideArm.style.transform = on ? 'rotate(-130deg)' : ''
  }

  /** Hold `node` (an SVG group drawn round 0,0) up over his head, or put it down (null). Returns what he held. */
  function carry(node) {
    const had = carrySlot.firstChild
    if (had) had.remove()
    if (node) carrySlot.appendChild(node)
    armsUp(!!node)
    state.holdsUp = !!node
    state.carrying = !!node || state.can
    return had
  }

  /** Put `node` on his head (null: take it off). Returns what was there. */
  function wear(node) {
    const had = hatSlot.firstChild
    if (had) had.remove()
    if (node) hatSlot.appendChild(node)
    return had
  }

  /** Lean towards (deg > 0: forward, to his right) and back: an ear to something, a tug. */
  async function lean(deg, ms = 900) {
    await Motion.endAt(tilt, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${deg}deg)`, offset: 0.3 }, { transform: `rotate(${deg}deg)`, offset: 0.75 }, { transform: 'rotate(0deg)' }], { duration: ms })
  }

  /** Knock twice with his right hand: on an egg, on a pole. */
  async function knock() {
    const right = arms.children[1]
    await Motion.endAt(right, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-70deg)', offset: 0.2 }, { transform: 'rotate(-30deg)', offset: 0.4 }, { transform: 'rotate(-70deg)', offset: 0.6 }, { transform: 'rotate(-30deg)', offset: 0.8 }, { transform: 'rotate(0deg)' }], { duration: 900 })
  }

  /** Shake what he holds overhead: it wobbles in his hands. */
  async function wobble(ms = 900) {
    await Motion.endAt(carrySlot, [{ transform: 'translate(0px, -196px) rotate(0deg)' }, { transform: 'translate(-6px, -196px) rotate(-12deg)', offset: 0.25 }, { transform: 'translate(6px, -196px) rotate(12deg)', offset: 0.5 }, { transform: 'translate(-4px, -196px) rotate(-8deg)', offset: 0.75 }, { transform: 'translate(0px, -196px) rotate(0deg)' }], { duration: ms })
  }

  /** Paint him all over in `colour` (null: washed clean, black again). */
  function paint(colour) {
    state.painted = colour
    for (const s of skin) s.setAttribute(s.getAttribute('fill') === 'none' ? 'stroke' : 'fill', colour || '#15140f')
    if (!colour) dots(null)
  }

  /** Dab spots of `colour` on him (null: none). */
  function dots(colour) {
    spots.style.display = colour ? '' : 'none'
    if (colour) spots.setAttribute('fill', colour)
  }

  /** Climb up `dy` (onto someone's shoulders) or back down (0). He must be out on the grass. */
  async function perch(dy, ms = 600) {
    const from = lift
    lift = state.lift = dy
    await Motion.endAt(root, [{ transform: rootAt(state.x, from) }, { transform: rootAt(state.x, (from + dy) / 2 + 40), offset: 0.5 }, { transform: rootAt(state.x, dy) }], { duration: ms, easing: 'ease-out' })
  }

  /** Where his whole figure stands: at x, `dy` above the ground. */
  const rootAt = (x, dy = 0) => `translate(${x}px, ${Y - dy}px)`

  /** Glide smoothly to x, `dy` up (sitting in the car), over `ms`: riding, not walking. */
  async function glide(x, ms, dy, easing) {
    const from = rootAt(state.x, lift)
    state.x = x
    lift = state.lift = dy
    await Motion.endAt(root, [{ transform: from }, { transform: rootAt(x, dy) }], { duration: ms, easing })
  }

  /** Where the can's spout is now, in scene units, while he waters. */
  const spout = () => ({ x: state.x + 116 * SCALE, y: Y + SINK[state.pose] - 70 * SCALE })

  return { SCALE, state, drawnX, face, lookAt, spout, head, carry, paint, dots, perch, glide, wear, lean, knock, wobble, make, put, relax, comeUp, goDown, tunnelTo, walkTo, cheer, stretch, hold, tip, listen }
})()
