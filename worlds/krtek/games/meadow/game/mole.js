// The little mole: where he is, which way he looks, and his gestures. He is
// drawn by moleart.js in three views (facing us, three-quarter, profile);
// this file shows one at a time and poses its parts. As in the films
// (worlds/krtek/world.yaml, aesthetics.character_animation), he moves pose to
// pose: a pose held, then a quick snap to the next, his head turning between
// views as he looks about. Every gesture moves him with Motion.endAt on the
// Clock, so a tap can cut it short with relax(), and he always ends free and
// standing as he is drawn: nothing is frozen on an animation's last frame.
//
// Where he is: `x` along the meadow, and how much of him shows (`pose`):
// 'down' (under the ground), 'hill' (up to his middle in a molehill), 'out'
// (on the grass, feet and all) or 'listen' (in his molehill, chin on his
// hands, eyes half shut: the cricket is playing). Which way: `view` ('front',
// 'three' or 'side') and `facing` (1 right, -1 left).

/* global Clock, Debug, DOMMatrixReadOnly, Layout, MoleArt, Motion */
/* exported Mole */
const Mole = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const Y = Layout.GROUND // his feet-line
  const SCALE = 1.2 // drawn at this size: about a fifth of the screen high, out on the grass
  const SINK = { down: 240, hill: 16, out: 0, listen: 26 } // how far below his feet-line he sits, scene units
  const PEEK = 104 // coming up, how far down he is while only his hands show above the molehill
  const DIG_MS = 380 // diving down, or coming up
  const DIG_IN = { depths: [55, 110, 160], strokes: 3, strokeMs: 95, jerkMs: 170 } // digging himself in out on the grass: sunk this far at each jerk (his waist, his shoulders, just his hairs), his hands paddling this many strokes before each
  const SCRATCH = { rubs: 3, rubMs: 150 } // scratching his head: rubs to and fro, each this long
  const SNAP_MS = 90 // pose to pose: how quickly he moves from one held pose to the next
  const TUNNEL_MS_PER_UNIT = 0.9 // the bump of earth running under the grass
  // His gaits, in scene units and ms: a walk with short quick steps, a bob and an arm swinging, and
  // on a long trip a run, longer and quicker, leaning forward (the films: he walks, sometimes runs low)
  const WALK = { step: 38, stepMs: 210, reach: 9, lift: 7, bounce: 5, swing: 22, lean: 0 }
  const RUN = { step: 64, stepMs: 150, reach: 14, lift: 12, bounce: 10, swing: 40, lean: 9 }
  const RUN_FROM = 650 // a trip longer than this, he runs
  // His arms, in degrees about the shoulder from hanging (left arm first; the right is mirrored)
  const ARMS = { down: 0, up: 150, wide: 120, rim: 60, face: 172, point: 25 } // point: the far arm thrust out at something, about level
  const IDLE_MS = [2600, 5200] // left standing, now and then he looks about: another view, the other way
  const POINT_MS = 700 // pointing at something, held this long
  const POINT_REACH = 1.45 // …his arm stretched out this much longer, a cartoon reach: his own short arm read as a wave
  const GHOST_ARMS = 95 // playing a ghost, his arms flung out wide: any higher, his short arms read as hands to his face
  const PERK_MS = 650 // his hairs springing up when he notices something, and settling
  // His faces, after Krtek a autíčko's close-ups (moleart.js face): the mouth's numbers (open 0-1, curve
  // -1 corners down to +1 up, width, round, chin) and the brows' (lift, tilt > 0 worried), in plain numbers so
  // a word or a moment names one. The mouth carries most of it, as in the films (Adam, 2026-10-26).
  const FACES = {
    content: { open: 0, curve: 0.7, width: 0.75 }, // at rest: a small closed smile
    delighted: { open: 0.75, curve: 0.9, width: 1, chin: 1, brows: { lift: 4 } }, // 7:13, 11:41.5
    ooh: { open: 0.8, curve: 0, width: 0.5, round: 1.3, brows: { lift: 6 } }, // wonder: a round little mouth
    worried: { open: 0.55, curve: -0.35, width: 0.75, chin: 1, brows: { tilt: 1 } }, // 11:43
    glum: { open: 0, curve: -0.8, width: 0.65, brows: { tilt: 1 } }, // ach jo
    squeezed: { open: 0, curve: -1, width: 0.42, brows: { tilt: -1, lift: -2 } }, // 11:44.5: eyes shut tight, an effort
    fright: { open: 0.95, curve: -0.2, width: 0.6, round: 0.6, brows: { tilt: 1, lift: 7 } },
    puzzled: { open: 0.15, curve: -0.1, width: 0.45, round: 1, brows: { tilt: 0.5, lift: 3 } }, // hm? a small pursed mouth, one worry in his brows
    uneasy: { open: 0, curve: -0.45, width: 0.55, brows: { tilt: 1, lift: 2 } }, // a threat about: no smile, mouth shut and down, brows worried (Adam, 2026-11-02)
  }
  // the face each of his words comes with, held this long; how far the lids come down (0 open, 1 shut), how hard his hairs perk
  const WORDS = {
    ooh: { face: 'ooh', perk: 1, ms: 1000 },
    fright: { face: 'fright', perk: 1.6, ms: 900 },
    achJo: { face: 'glum', lids: 0.45, ms: 1400 },
    ahoj: { face: 'delighted', perk: 0.7, ms: 700 },
    giggle: { face: 'delighted', ms: 800 },
    gasp: { face: 'ooh', perk: 1.5, ms: 700 }, // a quick intake of breath: wonder, a little fright
    hm: { face: 'puzzled', ms: 1000 },
    tam: { face: 'delighted', perk: 1, ms: 700 },
  }
  const life = Debug.random('mole-life') // blinks, glances and looking about: their own stream

  const state = { x: 0, pose: 'down', busy: null, carrying: false, holdsUp: false, lift: 0, painted: null, facing: 1, view: 'front', face: 'content' }
  const skin = [] // what paint colours: his body, snout and arms in every view
  let lift = 0 // how far up he stands (on someone's shoulders, in the car)
  let views = null // moleart.js's three views
  let free = () => false // the meadow says when he is free to look about by himself
  let root, body, tilt, tunnel, inLayer, outLayer, carrySlot, hatSlot

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const cur = () => views[state.view]
  const all = () => Object.values(views)

  /** Draw him into `layer` (behind the molehills, so they hide his lower half), out on the grass into
   * `grass` (in front of them), and the tunnel bumps into `ground`. */
  function make(layer, grass, ground) {
    inLayer = layer
    outLayer = grass
    root = el('g', { class: 'mole' }, layer)
    body = el('g', { class: 'mole-body' }, root)
    tilt = el('g', { class: 'mole-tilt' }, body) // leaning: an ear to the egg, a tug at a pole, a squash
    tilt.style.transformOrigin = '0px 0px'
    const art = el('g', {}, tilt)
    art.style.transform = `scale(${SCALE})`
    views = MoleArt.draw(art, skin)
    mood('content')
    carrySlot = el('g', { class: 'mole-carry' }, art) // what he holds up over his head
    hatSlot = el('g', { class: 'mole-hat' }, art) // what sits on his head
    tunnel = el('g', { class: 'tunnel' }, ground)
    blink()
    glance()
    lookAbout()
    put(state.x, state.pose)
  }

  /** The meadow's hook: is he free (no gesture, no walk) to look about by himself? */
  function setFree(fn) {
    free = fn
  }

  /** Show him in `view` ('front', 'three' or 'side'), facing `dir` (1 right, -1 left). */
  function show(view, dir = state.facing) {
    state.view = view
    state.facing = dir || 1
    for (const [name, v] of Object.entries(views)) {
      v.view.style.display = name === view ? '' : 'none'
      v.view.style.transform = name !== 'front' && state.facing < 0 ? 'scaleX(-1)' : ''
    }
    const dx = view === 'front' ? 0 : state.facing * (view === 'side' ? 12 : 8)
    carrySlot.style.transform = `translate(${dx}px, -200px)`
    hatSlot.style.transform = `translate(${dx}px, -150px)`
    armsUp(state.holdsUp)
  }

  /** Facing `dir` in profile (walking), or facing us (0): the meadow's word for it. */
  function face(dir) {
    if (dir) show('side', dir)
    else show(state.pose === 'out' ? 'three' : 'front')
  }

  /** Look towards scene x: the first answer to a tap, before he goes. Standing, he turns to it. */
  function lookAt(x) {
    const dir = x >= state.x ? 1 : -1
    if (state.pose === 'out' && Math.abs(x - state.x) > 30) show('three', dir)
    const dx = Math.max(-6, Math.min(6, (x - state.x) / 40)) * (state.view === 'front' ? 1 : state.facing)
    cur().pupils.getAnimations().forEach((a) => a.cancel())
    cur().pupils.style.transform = `translate(${Math.round(dx)}px, -2px)`
  }

  /** Stand him at x in `pose`, as the end of whatever brought him there. */
  function put(x, pose) {
    state.x = x
    state.pose = pose
    lift = state.lift = 0
    root.style.transform = rootAt(x)
    const layer = pose === 'out' ? outLayer : inLayer
    if (root.parentNode !== layer) layer.appendChild(root)
    body.style.transform = `translateY(${SINK[pose]}px)`
    tilt.style.transform = ''
    for (const v of all()) for (const f of v.feet) f.style.visibility = pose === 'out' ? 'visible' : 'hidden'
    show(pose === 'out' ? 'three' : 'front')
    for (const v of all()) v.lids.style.transform = pose === 'listen' ? 'scaleY(0.55)' : 'scaleY(0)'
    if (pose === 'hill' || pose === 'listen') onRim()
  }

  /** In his molehill, his hands rest on its rim. */
  function onRim() {
    if (state.holdsUp) return
    const [l, r] = views.front.arms
    l.style.transform = `rotate(${ARMS.rim}deg)`
    r.style.transform = `rotate(${-ARMS.rim}deg)`
  }

  function blink() {
    Clock.after(2200 + life() * 3500, () => {
      if (state.pose !== 'listen' && state.pose !== 'down') {
        Debug.ignoreCut(Motion.endAt(cur().lids, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)', offset: 0.5 }, { transform: 'scaleY(0)' }], { duration: 160 }), 'blink')
      }
      blink()
    })
  }

  function glance() {
    Clock.after(1500 + life() * 3000, () => {
      const dx = Math.round((life() - 0.5) * 8)
      const dy = Math.round((life() - 0.6) * 5)
      Debug.ignoreCut(Motion.endAt(cur().pupils, [{ transform: `translate(${dx}px, ${dy}px)` }], { duration: 120, easing: 'ease-out' }), 'glance')
      glance()
    })
  }

  /** Left standing, now and then he looks about: a turn of his head to us, or the other way, held. */
  function lookAbout() {
    Clock.after(IDLE_MS[0] + life() * (IDLE_MS[1] - IDLE_MS[0]), () => {
      const roll = life() // drawn either way, so a still play draws as many
      if (free() && !state.holdsUp) {
        if (state.pose === 'out') show(roll < 0.4 ? 'front' : 'three', roll < 0.7 ? state.facing : -state.facing)
        else if (state.pose === 'hill') Debug.ignoreCut(lean((roll - 0.5) * 16, 700), 'look about')
      }
      lookAbout()
    })
  }

  /** Cut every gesture short. He stays where he is drawn now, mid-step (a cut walk must not jump him
   * to where it was going), and stands as he is. */
  function relax() {
    const moving = root.getAnimations().length > 0
    const x = moving ? drawnX() : state.x
    const parts = [root, body, tilt, carrySlot]
    for (const v of all()) parts.push(...v.arms, ...v.feet, v.lids, v.hair)
    for (const e of parts) e.getAnimations().forEach((a) => a.cancel())
    if (moving) {
      state.x = x
      root.style.transform = rootAt(x, lift)
    }
    for (const b of [...tunnel.children]) b.remove()
    for (const v of all()) for (const a of v.arms) a.style.transform = ''
    tilt.style.transform = ''
    laugh(false)
    show(state.pose === 'out' ? 'three' : 'front')
    if (state.pose === 'hill' || state.pose === 'listen') onRim()
    state.busy = null
  }

  let laughing = false // a gesture's laugh: a word's face waits for it
  let rest = 'content' // the face he settles back to after a word or a moment's feeling: uneasy while a threat is about
  let restOf = () => 'content' // the meadow says which (calm)

  /** The face he rests on now (FACES), as the meadow says; if he was resting on another, he shows this one. */
  function settle() {
    const name = restOf()
    if (name === rest) return rest
    const resting = state.face === rest
    rest = name
    if (resting && !laughing) mood(name)
    return rest
  }

  /** The meadow says which face he rests on (`content`, or `uneasy` while a threat is about: no smile then). */
  function calm(fn) {
    restOf = fn
  }

  /** A face he would show, as it may be now: while a threat is about, no grin; his mouth opens round instead. */
  const glad = (name) => (name === 'delighted' && settle() !== 'content' ? 'ooh' : name)

  /** Show one of his FACES in every view. */
  function mood(name) {
    state.face = name
    for (const v of all()) v.face(FACES[name])
  }

  /** Open his mouth in a laugh, or `face` (a fright), or close it again, back to his resting face. */
  function laugh(on, face = 'delighted') {
    laughing = on
    mood(on ? glad(face) : settle())
  }

  /** His hairs spring up and settle: he has noticed something (k: how hard). */
  function perk(k = 1) {
    for (const v of all()) {
      Debug.ignoreCut(Motion.endAt(v.hair, [
        { transform: 'none' },
        { transform: `scaleY(${1 + 0.22 * k}) rotate(${-7 * k}deg)`, offset: 0.2 },
        { transform: `scaleY(${1 - 0.06 * k}) rotate(${4 * k}deg)`, offset: 0.55 },
        { transform: 'none' },
      ], { duration: PERK_MS }), 'perk')
    }
  }

  let faceToken = null

  /** The face that goes with a word he says (WORDS), held a moment, then his resting face again. */
  function express(word) {
    const f = WORDS[word]
    if (!f || state.pose === 'down') return
    if (f.perk) perk(f.perk)
    if (!f.face && !f.lids) return
    const mine = (faceToken = Symbol(word))
    if (f.face && !laughing) mood(glad(f.face))
    if (f.lids) for (const v of all()) v.lids.style.transform = `scaleY(${f.lids})`
    Clock.after(f.ms, () => {
      if (faceToken !== mine) return
      if (state.face === glad(f.face) && !laughing) mood(settle())
      // the lids back only where they are still as the word left them (a stretch or peekaboo since has its own)
      if (f.lids) for (const v of all()) if (v.lids.style.transform === `scaleY(${f.lids})`) v.lids.style.transform = state.pose === 'listen' ? 'scaleY(0.55)' : 'scaleY(0)'
    })
  }

  /** A face (FACES) held ms, then his resting face again: a moment's feeling with no word (an effort, a worry). A word
   * or a newer feeling takes over; a cut (relax) ends it. */
  function feel(name, ms) {
    if (state.pose === 'down' || laughing) return
    const mine = (faceToken = Symbol(name))
    mood(glad(name))
    Clock.after(ms, () => {
      if (faceToken === mine && state.face === glad(name)) mood(settle())
    })
  }

  /** His two arms in this view to `left`/`right` degrees (from hanging), over ms with an ease, or at once. */
  function arms(left, right, ms = SNAP_MS, view = cur()) {
    const [l, r] = view.arms
    return Promise.all([
      Motion.endAt(l, [{ transform: `rotate(${left}deg)` }], { duration: ms, easing: 'ease-out' }),
      l === r ? null : Motion.endAt(r, [{ transform: `rotate(${right}deg)` }], { duration: ms, easing: 'ease-out' }),
    ])
  }

  const hold = (ms) => Clock.wait(ms)

  const sink = (pose, ms = DIG_MS, easing = 'ease-in') =>
    Motion.endAt(body, [{ transform: `translateY(${SINK[pose]}px)` }], { duration: ms, easing }).then(() => put(state.x, pose))

  /** Come up through the molehill he is under: his hands first, gripping the top, then up he pops between them. */
  async function comeUp(pose = 'hill') {
    for (const v of all()) for (const f of v.feet) f.style.visibility = pose === 'out' ? 'visible' : 'hidden'
    if (pose === 'out') {
      outLayer.appendChild(root) // climbing out in front of the molehill
      show('three')
      await sink('out', DIG_MS + 120, 'cubic-bezier(.3,1.5,.5,1)')
      return
    }
    show('front')
    if (state.pose === 'down') {
      const [l, r] = views.front.arms
      l.style.transform = `rotate(${ARMS.up}deg)`
      r.style.transform = `rotate(${-ARMS.up}deg)`
      await Motion.endAt(body, [{ transform: `translateY(${PEEK}px)` }], { duration: 260, easing: 'ease-out' })
      await hold(240) // just his hands, on the rim
      arms(ARMS.rim, -ARMS.rim, 200)
    }
    await sink(pose, DIG_MS, 'cubic-bezier(.3,1.6,.5,1)')
  }

  /** Dive down where he is: arms up, and in. */
  async function goDown() {
    for (const v of all()) for (const f of v.feet) f.style.visibility = 'hidden'
    inLayer.appendChild(root) // back behind the molehill he goes down into
    show('front')
    arms(ARMS.up, -ARMS.up, 120)
    await sink('down')
  }

  /**
   * Digging himself in where he stands, out on the grass where there is no molehill (Adam, 2026-11-02: so a
   * child sees him dig down, step by step): turned to us, both hands paddling fast at the ground, he sinks in
   * jerks behind the grass, to his waist, his shoulders, just his hairs; then down. `onJerk(i)` as each
   * starts: the game's hole widening round him, the earth flying.
   */
  async function digIn(onJerk = () => {}) {
    show('front')
    const v = cur()
    for (const f of v.feet) f.style.visibility = 'hidden'
    inLayer.appendChild(root) // behind the grass's edge: it hides what has gone below
    let at = SINK.out
    for (const [i, depth] of DIG_IN.depths.entries()) {
      onJerk(i)
      Debug.trace('dig in', { depth })
      for (let k = 0; k < DIG_IN.strokes; k++) await arms(k % 2 ? 20 : 70, k % 2 ? -70 : -20, DIG_IN.strokeMs, v) // scooping low at the ground, hand over hand
      await Motion.endAt(body, [{ transform: `translateY(${at}px)` }, { transform: `translateY(${depth}px)` }], { duration: DIG_IN.jerkMs, easing: 'cubic-bezier(.3,1.4,.5,1)' })
      at = depth
    }
    arms(ARMS.up, -ARMS.up, 120, v)
    await sink('down', 200)
  }

  /** Scratching his head, puzzled: in three-quarter view, the near hand up on top of his head, rubbing. */
  async function scratchHead() {
    if (state.holdsUp) return
    show('three')
    const v = cur()
    const hand = v.arms[1]
    const behind = hand.nextSibling
    v.view.appendChild(hand)
    feel('puzzled', SCRATCH.rubs * SCRATCH.rubMs * 2 + 300)
    try {
      await Motion.endAt(hand, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-150deg)' }], { duration: SNAP_MS * 2, easing: 'ease-out' })
      for (let k = 0; k < SCRATCH.rubs * 2; k++) await Motion.endAt(hand, [{ transform: `rotate(${k % 2 ? -138 : -150}deg)` }, { transform: `rotate(${k % 2 ? -150 : -138}deg)` }], { duration: SCRATCH.rubMs })
      await Motion.endAt(hand, [{ transform: 'rotate(-150deg)' }, { transform: 'rotate(0deg)' }], { duration: 160 })
    } finally {
      hand.style.transform = ''
      v.view.insertBefore(hand, behind)
    }
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
    root.style.transform = rootAt(x)
  }

  /** Walk along the grass to x (he is out), in profile, his feet stepping; on a long trip he runs, low. */
  async function walkTo(x) {
    const from = state.x
    const d = Math.abs(x - from)
    if (d < 2) return
    const g = d > RUN_FROM ? RUN : WALK
    const steps = Math.max(2, Math.round(d / g.step))
    const ms = steps * g.stepMs
    const dir = x > from ? 1 : -1
    state.x = x
    show('side', dir)
    const cycle = { duration: g.stepMs * 2, iterations: steps / 2 }
    const [back, ahead] = views.side.feet
    const stepping = (lead) => [
      { transform: 'translate(0px, 0px)' },
      { transform: `translate(${lead * g.reach}px, ${-g.lift}px)`, offset: 0.25 },
      { transform: `translate(${lead * g.reach}px, 0px)`, offset: 0.5 },
      { transform: `translate(${-lead * g.reach}px, 0px)`, offset: 0.75 },
      { transform: 'translate(0px, 0px)' },
    ]
    const bob = []
    for (let i = 0; i <= steps; i++) bob.push({ transform: `translate(${from + ((x - from) * i) / steps}px, ${Y - lift - (i % 2 ? g.bounce : 0)}px)` })
    bob[bob.length - 1] = { transform: rootAt(x, lift) }
    const moves = [
      Motion.endAt(root, bob, { duration: ms }),
      Motion.endAt(back, stepping(1), cycle),
      Motion.endAt(ahead, stepping(-1), cycle),
      Motion.endAt(tilt, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${g.lean}deg)`, offset: 0.12 }, { transform: `rotate(${g.lean}deg)`, offset: 0.88 }, { transform: 'rotate(0deg)' }], { duration: ms }),
    ]
    if (!state.carrying) moves.push(Motion.endAt(views.side.arms[0], [{ transform: 'rotate(0deg)' }, { transform: `rotate(${-g.swing}deg)`, offset: 0.25 }, { transform: `rotate(${g.swing}deg)`, offset: 0.75 }, { transform: 'rotate(0deg)' }], cycle))
    try {
      await Promise.all(moves)
    } finally {
      if (state.x === x) show('three', dir) // there: standing, still looking the way he went
    }
  }

  /** A jump of joy: a crouch, then up with arms flung wide and a laugh, held, and down with a squash.
   * In his molehill, a hop. */
  async function cheer() {
    const out = state.pose === 'out'
    if (out) show(life() < 0.5 ? 'front' : 'three')
    else show('front')
    const v = cur()
    const base = SINK[state.pose]
    const up = out ? 46 : 26
    laugh(true)
    try {
      await Motion.endAt(tilt, [{ transform: 'scale(1, 1)' }, { transform: 'scale(1.1, 0.86)' }], { duration: 110, easing: 'ease-out' }) // the crouch
      arms(ARMS.wide, -ARMS.wide, SNAP_MS, v)
      await Promise.all([
        Motion.endAt(body, [{ transform: `translateY(${base}px)` }, { transform: `translateY(${base - up}px)`, offset: 0.35 }, { transform: `translateY(${base - up}px)`, offset: 0.65 }, { transform: `translateY(${base}px)` }], { duration: 620, easing: 'ease-out' }),
        Motion.endAt(tilt, [{ transform: 'scale(1.1, 0.86)' }, { transform: 'scale(0.94, 1.1)', offset: 0.25 }, { transform: 'scale(1, 1)', offset: 0.65 }, { transform: 'scale(1.12, 0.88)', offset: 0.85 }, { transform: 'scale(1, 1)' }], { duration: 620 }),
      ])
      await arms(out ? 0 : ARMS.rim, out ? 0 : -ARMS.rim, 160, v)
    } finally {
      laugh(false)
    }
  }

  /** Stretch both arms up, slowly, eyes shut and mouth wide: waking, or bedtime. */
  async function stretch() {
    show('front')
    const v = cur()
    laugh(true)
    v.lids.style.transform = 'scaleY(1)'
    try {
      await arms(ARMS.up, -ARMS.up, 600, v)
      await hold(500)
      await arms(state.pose === 'out' ? 0 : ARMS.rim, state.pose === 'out' ? 0 : -ARMS.rim, 400, v)
    } finally {
      laugh(false)
      v.lids.style.transform = state.pose === 'listen' ? 'scaleY(0.55)' : 'scaleY(0)'
    }
  }

  /** Thinking: in three-quarter view, a hand to his chin, held (Krtek a autíčko 11:36).
   * The far arm is the one that reaches: it comes in front of him for it. */
  async function ponder(ms = 1100) {
    if (state.holdsUp) return
    show('three')
    const v = cur()
    const hand = v.arms[1]
    const behind = hand.nextSibling
    v.view.appendChild(hand)
    try {
      await Motion.endAt(hand, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-78deg)' }], { duration: SNAP_MS, easing: 'ease-out' })
      await hold(ms)
      await Motion.endAt(hand, [{ transform: 'rotate(0deg)' }], { duration: 160 })
    } finally {
      hand.style.transform = ''
      v.view.insertBefore(hand, behind)
    }
  }

  /** Both hands up, palms out, then clapped over his face, eyes shut: laughing too much (Krtek a autíčko 11:38), or,
   * with `face` 'fright', a fright. */
  async function handsToFace(ms = 900, face = 'delighted') {
    if (state.holdsUp) return
    show('front')
    const v = cur()
    laugh(true, face)
    try {
      await arms(ARMS.wide, -ARMS.wide, SNAP_MS, v)
      await hold(220)
      v.lids.style.transform = 'scaleY(1)'
      await arms(ARMS.face, -ARMS.face, SNAP_MS, v)
      await hold(ms)
    } finally {
      v.lids.style.transform = 'scaleY(0)'
      laugh(false)
      await arms(state.pose === 'out' ? 0 : ARMS.rim, state.pose === 'out' ? 0 : -ARMS.rim, 160, v)
    }
  }

  /** Pointing at x ("tam!"): turned three-quarters to it, his far arm
   * thrust out at it, stretched long, held a moment, then down. */
  async function point(x, ms = POINT_MS) {
    if (state.holdsUp) return
    show('three', x >= state.x ? 1 : -1)
    lookAt(x)
    perk(0.7)
    const v = cur()
    const hand = v.arms[1]
    const behind = hand.nextSibling
    v.view.appendChild(hand) // in front of him, as he reaches out
    const rest = state.pose === 'out' ? 0 : -ARMS.rim
    try {
      await Motion.endAt(hand, [{ transform: `rotate(${rest}deg)` }, { transform: `rotate(${-ARMS.point}deg) scale(${POINT_REACH})` }], { duration: SNAP_MS, easing: 'ease-out' })
      await hold(ms)
    } finally {
      await Motion.endAt(hand, [{ transform: `rotate(${rest}deg)` }], { duration: 180 })
      hand.style.transform = ''
      v.view.insertBefore(hand, behind)
    }
  }

  /** A wave hello: one hand up, waving to and fro, then down. */
  async function wave() {
    if (state.holdsUp) return
    show('front')
    const v = cur()
    const hand = v.arms[1]
    const rest = state.pose === 'out' ? 0 : -ARMS.rim
    perk(0.7)
    try {
      // up beside his head (further over, his hand would cover his eye), then to and fro
      await Motion.endAt(hand, [{ transform: `rotate(${rest}deg)` }, { transform: 'rotate(-100deg)' }], { duration: SNAP_MS, easing: 'ease-out' })
      await Motion.endAt(hand, [{ transform: 'rotate(-100deg)' }, { transform: 'rotate(-80deg)', offset: 0.17 }, { transform: 'rotate(-112deg)', offset: 0.34 }, { transform: 'rotate(-80deg)', offset: 0.5 }, { transform: 'rotate(-112deg)', offset: 0.67 }, { transform: 'rotate(-80deg)', offset: 0.84 }, { transform: 'rotate(-100deg)' }], { duration: 900 })
    } finally {
      await Motion.endAt(hand, [{ transform: `rotate(${rest}deg)` }], { duration: 180 })
    }
  }

  /** Peekaboo: hands over his face, eyes shut, held… then open wide, laughing, hairs up. */
  async function peekaboo() {
    if (state.holdsUp) return
    show('front')
    const v = cur()
    try {
      v.lids.style.transform = 'scaleY(1)'
      await arms(ARMS.face, -ARMS.face, SNAP_MS, v)
      await hold(800)
      v.lids.style.transform = 'scaleY(0)'
      laugh(true)
      perk(1.4)
      await Promise.all([arms(ARMS.wide, -ARMS.wide, SNAP_MS, v), Motion.endAt(tilt, [{ transform: 'scale(1, 1)' }, { transform: 'scale(1.08, 0.92)', offset: 0.4 }, { transform: 'scale(1, 1)' }], { duration: 300 })])
      await hold(500)
    } finally {
      v.lids.style.transform = 'scaleY(0)'
      laugh(false)
      await arms(state.pose === 'out' ? 0 : ARMS.rim, state.pose === 'out' ? 0 : -ARMS.rim, 160, v)
    }
  }

  /** Where he is drawn now, mid-move (state.x is where he is going): for the view to follow. */
  function drawnX() {
    const t = getComputedStyle(root).transform
    return t && t !== 'none' ? new DOMMatrixReadOnly(t).e : state.x
  }

  /** The middle of his head, in scene units: where something lands on it. */
  const head = () => ({ x: state.x, y: Y - lift + SINK[state.pose] - 150 * SCALE })


  /** Lie in his molehill to listen (dusk), or stop. */
  function listen(on) {
    put(state.x, on ? 'listen' : 'hill')
  }

  /** Both arms up (holding something over his head) or down, in every view. */
  function armsUp(on) {
    for (const v of all()) {
      const [l, r] = v.arms
      l.style.transform = on ? `rotate(${l === r ? -130 : ARMS.up}deg)` : ''
      if (l !== r) r.style.transform = on ? `rotate(${-ARMS.up}deg)` : ''
    }
  }

  /** Hold `node` (an SVG group drawn round 0,0) up over his head, or put it down (null). Returns what he held. */
  function carry(node) {
    const had = carrySlot.firstChild
    if (had) had.remove()
    if (node) carrySlot.appendChild(node)
    state.holdsUp = !!node
    state.carrying = !!node
    armsUp(!!node)
    if (!node && (state.pose === 'hill' || state.pose === 'listen')) onRim()
    return had
  }

  /** Put `node` on his head (null: take it off). Returns what was there. */
  function wear(node) {
    const had = hatSlot.firstChild
    if (had) had.remove()
    if (node) hatSlot.appendChild(node)
    return had
  }

  /** Dreamy: turned to us, eyes shut, a soft smile, swaying side to side with a scent. */
  async function sway(ms = 2000) {
    show('front')
    const v = cur()
    v.lids.style.transform = 'scaleY(1)'
    mood(settle())
    try {
      await Motion.endAt(tilt, [0, 14, -10, 11, -6, 0].map((d) => ({ transform: `rotate(${d}deg)` })), { duration: ms, easing: 'ease-in-out' })
    } finally {
      v.lids.style.transform = state.pose === 'listen' ? 'scaleY(0.55)' : 'scaleY(0)'
    }
  }

  /** Water in his face: eyes screwed shut, a quick shake of his whole self (the game's drops fly). */
  async function shakeOff(ms = 700) {
    feel('squeezed', ms)
    await Motion.endAt(tilt, [0, -11, 11, -9, 9, -4, 0].map((d) => ({ transform: `rotate(${d}deg)` })), { duration: ms })
  }

  /** Lean towards (deg > 0: to his right) and back: an ear to something, a tug, a look about. */
  async function lean(deg, ms = 900) {
    await Motion.endAt(tilt, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${deg}deg)`, offset: 0.2 }, { transform: `rotate(${deg}deg)`, offset: 0.8 }, { transform: 'rotate(0deg)' }], { duration: ms })
  }

  /** Knock twice with his near hand: on an egg, on a pole. */
  async function knock() {
    if (state.pose === 'out') show('three')
    const near = cur().arms[cur() === views.front ? 1 : 0]
    const sign = cur() === views.front ? 1 : -1
    await Motion.endAt(near, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${sign * -80}deg)`, offset: 0.15 }, { transform: `rotate(${sign * -45}deg)`, offset: 0.35 }, { transform: `rotate(${sign * -80}deg)`, offset: 0.55 }, { transform: `rotate(${sign * -45}deg)`, offset: 0.75 }, { transform: 'rotate(0deg)' }], { duration: 900 })
  }

  /** Playing a ghost, all red (Krtek malířem 1:58-2:04, the red blob that frightens the fox): turned to us,
   * arms up, mouth round, swaying side to side (hop: bobbing up and down on the spot instead). */
  async function ghost(ms = 1600, hop = false) {
    if (state.holdsUp) return
    show('front')
    const v = cur()
    feel('ooh', ms + 400)
    const frames = hop
      ? [0, -22, 0, -22, 0, -22, 0].map((y) => ({ transform: `translateY(${y}px)` }))
      : [0, -12, 12, -12, 12, 0].map((d) => ({ transform: `rotate(${d}deg)` }))
    try {
      await arms(GHOST_ARMS, -GHOST_ARMS, 300, v)
      await Motion.endAt(tilt, frames, { duration: ms, easing: 'ease-in-out' })
    } finally {
      await arms(state.pose === 'out' ? 0 : ARMS.rim, state.pose === 'out' ? 0 : -ARMS.rim, 220, v)
    }
  }

  /** Shake what he holds overhead: it wobbles in his hands. */
  async function wobble(ms = 900) {
    const at = carrySlot.style.transform || 'translate(0px, -200px)'
    await Motion.endAt(carrySlot, [{ transform: `${at} rotate(0deg)` }, { transform: `${at} rotate(-12deg)`, offset: 0.25 }, { transform: `${at} rotate(12deg)`, offset: 0.5 }, { transform: `${at} rotate(-8deg)`, offset: 0.75 }, { transform: `${at} rotate(0deg)` }], { duration: ms })
  }

  /** Paint him all over in `colour` (null: washed clean, black again). */
  function paint(colour) {
    state.painted = colour
    for (const s of skin) s.setAttribute(s.getAttribute('fill') === 'none' ? 'stroke' : 'fill', colour || '#15140f')
    if (!colour) dots(null)
  }

  /** Dab spots of `colour` on him (null: none). */
  function dots(colour) {
    for (const v of all()) {
      v.dots.style.display = colour ? '' : 'none'
      if (colour) v.dots.setAttribute('fill', colour)
    }
  }

  /** Where his whole figure stands: at x, `dy` above the ground. */
  const rootAt = (x, dy = 0) => `translate(${x}px, ${Y - dy}px)`

  /** Climb up `dy` (onto someone's shoulders) or back down (0). He must be out on the grass. */
  async function perch(dy, ms = 600) {
    const from = lift
    lift = state.lift = dy
    await Motion.endAt(root, [{ transform: rootAt(state.x, from) }, { transform: rootAt(state.x, (from + dy) / 2 + 40), offset: 0.5 }, { transform: rootAt(state.x, dy) }], { duration: ms, easing: 'ease-out' })
  }

  /** Glide smoothly to x, `dy` up (sitting in the car), over `ms`: riding, not walking. */
  async function glide(x, ms, dy, easing) {
    const from = rootAt(state.x, lift)
    state.x = x
    lift = state.lift = dy
    await Motion.endAt(root, [{ transform: from }, { transform: rootAt(x, dy) }], { duration: ms, easing })
  }

  return { SCALE, state, drawnX, face, mood, calm, settle, feel, digIn, scratchHead, show, lookAt, perk, express, setFree, head, carry, paint, dots, perch, glide, wear, lean, knock, wobble, ponder, handsToFace, point, wave, peekaboo, laugh, make, put, relax, sway, shakeOff, comeUp, goDown, tunnelTo, walkTo, cheer, stretch, ghost, listen }
})()
