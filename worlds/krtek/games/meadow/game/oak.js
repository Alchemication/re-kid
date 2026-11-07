// The old oak at the meadow's left end, after the oak in Krtek a hodinářem
// (1:00-1:24): where the meadow ends, the edge of the wood. painting.js
// paints it (Layout.OAK, its shape); this file draws what moves about it
// and what a tap on it does. A tap on the oak and he peeks into the arch
// between its root legs, a different way each time (rounds):
// - the echo: he calls "hm?" into the hollow and it answers him, quieter
//   each time; a start, a giggle, and an "ooh" that echoes too (on a play
//   with an owl asleep up the trunk, from his second call it answers: owl.js);
// - the dark: he goes in and is lost in its shadow, only his eyes blinking
//   in the dark, looking about; out he comes with an oak leaf on his head,
//   and shakes it off, and it lies where it falls (they gather over the
//   play, as the acorns do);
// - the acorns: one drops on his head, bonk; he rubs it and looks up; the
//   next he catches, and tucks it into the hollow, where they pile up over
//   the play (a few, then no more show).
//
// Its drawing: the tap target over its trunk and crown, and the acorns kept
// in the hollow (#oak, behind him); the leaves on the grass (#oak-ground, in
// front of the grass, behind him); the hollow's dark, his eyes in it and
// the falling acorns in front of him (#oak-front). All of it moves only on
// the Clock (Motion.endAt), and restore() puts everything back at once when
// a tap cuts a peek short (what is falling falls on to the grass).

/* global Clock, Debug, DOMMatrixReadOnly, Layout, Mole, Motion, Owl, Sound */
/* exported Oak */
const Oak = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const INK = '#2f2a22'
  const { x: ARCH, arch, trunk, crown, hit: HIT_TO } = Layout.OAK
  const Y = Layout.GROUND
  const BESIDE = ARCH + 80 // where he stands to call into the arch, or to look up under the right limb
  const LEAN_IN = -16 // leaning into the arch from beside it (to his left)
  const ECHOES = 2 // the hollow answers his word this many times, quieter each
  const ECHO_MS = ECHOES * Sound.ECHO_GAP_S * 1000 + 560 // ...and they have died away after this long: the last comes in, a short word long
  const LEAN_MS = 1100 // leaning in to call, and back
  const DARK_MS = 500 // the hollow's shadow closing over him, or opening again
  const BLINK_MS = 160
  const LOOK_MS = 700 // his eyes in the dark, looking one way, then the other
  const DROP_MS = 600 // an acorn falling from the crown
  const LEAF = 1.7
  const IN_DARK = 22 // in the dark, turned to go in, he stands this far right of the arch's middle: his snout inside it too
  const ACORN = 1.5 // an acorn, this much bigger than true to his size: a toddler must see it fall
  const DROP_FROM = 210 // ...from this high (in among the leaves)
  const KEPT = [[140, 706], [168, 709], [196, 706], [154, 688], [182, 688], [168, 670]] // where the acorns he tucks in lie, in turn
  const random = Debug.random('meadow-oak') // which way first, where an acorn bounces: its own stream
  const strew = Debug.random('meadow-oak-leaves') // where a leaf lies and how it is turned: its own, so leaves shift nothing else
  const LIE = [-0.6, 0.6] // a leaf on the grass lies turned this much (radians), either way…
  const LIE_FLAT = 0.5 // …and seen this flat, lying down

  let front = null // #oak-front
  let ground = null // #oak-ground: the leaves he has shaken off
  let veil = null // the hollow's dark, in front of him
  let store = null // the acorns kept in the hollow
  let kept = 0
  let held = null // the acorn in his hands
  let leaf = null // the leaf on his head
  const dropping = new Set() // acorns falling at him just now: a cut lets them fall on into the grass

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  /** Draw the oak's live parts: the tap target into `back` (#oak, over the painting), the dark into `over` (#oak-front),
   * the leaves he shakes off into `grass` (#oak-ground).
   * The meadow's side: its `goTo`, `rounds` (a pool to draw the peeks from), and `dropHat` (off his head and down). */
  function setup(back, over, grass, meadow) {
    front = over
    ground = grass
    goTo = meadow.goTo
    dropHat = meadow.dropHat
    next = meadow.rounds(Object.keys(PEEKS), random)
    const hit = el('g', { class: 'oak-hit', fill: 'none', 'pointer-events': 'all' }, back) // nothing painted: it only takes taps
    const clip = el('clipPath', { id: 'oak-hit-clip' }, hit)
    el('rect', { x: -200, y: -200, width: 800, height: HIT_TO + 200 }, clip)
    el('path', { d: trunk, 'clip-path': 'url(#oak-hit-clip)' }, hit) // its foot is the meadow's ground: a tap there walks him
    el('path', { d: arch }, hit)
    for (const [x, y, rad] of crown) el('circle', { cx: x, cy: y, r: rad }, hit)
    store = el('g', { class: 'oak-acorns' }, back)
    veil = el('path', { d: arch, fill: '#1e1813', opacity: 0 }, over)
    veil.style.pointerEvents = 'none'
  }

  /** An acorn drawn round 0,0, about as big as his hand (s: how much bigger). */
  function acorn(s = ACORN) {
    const g = el('g', {})
    const k = el('g', { transform: `scale(${s})` }, g)
    el('ellipse', { cx: 0, cy: 3, rx: 7, ry: 9, fill: '#b9852f', stroke: INK, 'stroke-width': 1.6 }, k)
    el('path', { d: 'M-8 -1 Q-8 -9 0 -9 Q8 -9 8 -1 Z', fill: '#6b4a24', stroke: INK, 'stroke-width': 1.6 }, k)
    el('path', { d: 'M0 -9 L1 -13', stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round' }, k)
    return g
  }

  /** An oak leaf drawn round 0,0: lobes on a stalk, LEAF times the size of one in the crown (on his head, it must show). */
  function oakLeaf() {
    const g = el('g', { class: 'oak-leaf' })
    const k = el('g', { transform: `scale(${LEAF})` }, g)
    el('path', { d: 'M0 14 C-4 10 -12 10 -10 4 C-16 2 -14 -6 -8 -5 C-12 -12 -4 -16 0 -11 C4 -16 12 -12 8 -5 C14 -6 16 2 10 4 C12 10 4 10 0 14 Z', fill: '#7fae95', stroke: INK, 'stroke-width': 1.4 }, k)
    el('path', { d: 'M0 16 L0 -8', stroke: '#2f5548', 'stroke-width': 1.2 }, k)
    return g
  }

  const wait = async (ms, alive) => {
    await Clock.wait(ms)
    return alive()
  }

  /** A word called into the hollow, leaning in, and its echoes heard out (none: the owl answers instead):
   * still his to carry on? */
  async function call(word, alive, echoes = ECHOES) {
    Sound.say(word, false, echoes)
    await Promise.all([Mole.lean(LEAN_IN, LEAN_MS), Clock.wait(echoes ? ECHO_MS : 0)])
    return alive()
  }

  /** The hollow's shadow over him (k 1) or open again (0). */
  const darken = (k, ms = DARK_MS) => Motion.endAt(veil, [{ opacity: veil.style.opacity || 0 }, { opacity: k }], { duration: ms, easing: 'ease-in-out' })

  /** Something that falls or flies off, in front of him: gone once it ends (or is cut short). */
  function fly(node, frames, opts) {
    front.appendChild(node)
    const done = Motion.endAt(node, frames, opts)
    done.then(() => node.remove(), () => node.remove())
    return done
  }

  // ------------------------------------------------------------ the peeks

  const PEEKS = {
    /** "Hm?" into the hollow, and it answers him back, quieter and quieter: a start; then he giggles and tries an "ooh". */
    async echo(alive) {
      await goBeside()
      if (!alive()) return
      if (Owl.called()) { // the owl asleep up the trunk (owl.js) answers him instead of the hollow
        if (!(await call('hm', alive, 0))) return
        return Owl.answerCall(alive)
      }
      if (!(await call('hm', alive))) return
      Mole.perk(1.5) // it answered!
      await Mole.handsToFace(700, 'fright')
      if (!alive()) return
      Sound.say('giggle')
      await Mole.handsToFace(500)
      if (!alive()) return
      if (!(await call('ooh', alive))) return
      Sound.say('giggle')
      await Mole.cheer()
    },

    /** In he goes, lost in the dark but for his eyes, blinking and looking about; out again with a leaf on his head. */
    async dark(alive) {
      await goTo(ARCH + IN_DARK)
      if (!alive()) return
      Mole.show('side', -1) // turned to go in (turned to us, his hands would stick out of the dark either side)
      await darken(1)
      if (!alive()) return
      const eyes = drawEyes()
      try {
        Sound.say('ooh', false, 1)
        for (const [dx, ms] of [[0, 500], [-5, LOOK_MS], [5, LOOK_MS], [0, 300]]) {
          await Motion.endAt(eyes.pupils, [{ transform: `translateX(${dx}px)` }], { duration: 160 })
          if (!(await wait(ms, alive))) return
          await blink(eyes.lids)
        }
      } finally {
        eyes.g.remove()
      }
      if (!alive()) return
      if (!Mole.wearing()) { // in his cap (the eggshell), he keeps it on: no leaf
        leaf = oakLeaf()
        Mole.wear(leaf)
      }
      await darken(0)
      if (!alive()) return
      if (leaf) {
        Mole.feel('puzzled', 900)
        if (!(await wait(900, alive))) return
        shakeLeaf()
        await Mole.shakeOff(700)
        if (!alive()) return
      }
      Sound.say('giggle')
      await Mole.handsToFace(600)
    },

    /** Bonk: an acorn on his head; a rub, a look up; the next he catches, and tucks into the hollow. */
    async acorns(alive) {
      await goBeside()
      if (!alive()) return
      const top = Mole.head()
      await drop(acorn(), top.x, top.y - 45)
      if (!alive()) return
      Sound.bonk()
      Mole.feel('squeezed', 500)
      const dir = random() < 0.5 ? -1 : 1
      bounceOff(top.x, top.y - 45, dir)
      await Mole.lean(dir * -8, 400)
      if (!alive()) return
      await Mole.scratchHead()
      if (!alive()) return
      Mole.show('three', -1) // three-quarter: facing us, both arms up read as hands over his eyes
      Mole.perk(1.2)
      Mole.feel('ooh', 1200)
      if (!(await wait(700, alive))) return
      const hands = el('g', {})
      Mole.carry(hands) // arms up, ready
      held = hands
      const above = Mole.head().y - 60 // where his hands are, holding up (mole.js: what he carries)
      await drop(acorn(), Mole.state.x, above)
      if (!alive()) return
      hands.appendChild(acorn(ACORN / Mole.SCALE)) // caught: drawn in his own units
      Sound.plink()
      Sound.say('ooh')
      if (!(await wait(800, alive))) return
      await goTo(ARCH + 50)
      if (!alive()) return
      Mole.show('three', -1)
      await Mole.lean(LEAN_IN, 700)
      if (!alive()) return
      putAway()
      Sound.plink()
      Sound.say('giggle')
      await Mole.cheer()
    },
  }

  /** Beside the arch, turned to it. */
  async function goBeside() {
    await goTo(BESIDE)
    Mole.show('three', -1)
  }

  /** His eyes alone in the dark, where they are on him: whites, pupils and lids (to blink). */
  function drawEyes() {
    const { x, y } = Mole.head()
    const g = el('g', { class: 'oak-eyes', transform: `translate(${x}, ${y - 14})` }, front)
    const whites = el('g', {}, g)
    const pupils = el('g', {}, g)
    const lids = el('g', {}, g)
    for (const dx of [-13, 13]) {
      el('ellipse', { cx: dx, cy: 0, rx: 9, ry: 12, fill: '#f6f2e4' }, whites)
      el('ellipse', { cx: dx, cy: 1, rx: 3.6, ry: 5, fill: '#15140f' }, pupils)
      el('ellipse', { cx: dx, cy: 0, rx: 10, ry: 13, fill: '#1e1813' }, lids)
    }
    lids.style.transformBox = 'fill-box'
    lids.style.transformOrigin = 'center top'
    lids.style.transform = 'scaleY(0)'
    return { g, pupils, lids }
  }

  /** A blink: the lids down and up. */
  const blink = (lids) => Motion.endAt(lids, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)', offset: 0.5 }, { transform: 'scaleY(0)' }], { duration: BLINK_MS })

  /** An acorn falling out of the crown onto (x, y). */
  function drop(node, x, y) {
    dropping.add(node)
    const done = fly(node, [{ transform: `translate(${x}px, ${DROP_FROM}px)` }, { transform: `translate(${x}px, ${y}px)` }], { duration: DROP_MS, easing: 'ease-in' })
    done.then(() => dropping.delete(node), () => dropping.delete(node))
    return done
  }

  /** An acorn that was falling at him when a tap cut the peek short: on down from where it is, into the grass. */
  function fallOn(node) {
    const at = new DOMMatrixReadOnly(getComputedStyle(node).transform)
    node.remove()
    Debug.ignoreCut(fly(acorn(), [{ transform: `translate(${at.e}px, ${at.f}px)`, opacity: 1 }, { transform: `translate(${at.e}px, ${Y + 4}px)`, opacity: 1, offset: 0.6 }, { transform: `translate(${at.e}px, ${Y + 8}px)`, opacity: 0 }], { duration: DROP_MS * 2, easing: 'ease-in' }), 'the acorn falls on')
  }

  /** The acorn off his head: up and away to one side, into the grass, where it lies a moment and is lost among the blades. */
  function bounceOff(x, y, dir) {
    const node = acorn()
    const to = x + dir * 110
    Debug.ignoreCut(fly(node, [
      { transform: `translate(${x}px, ${y}px) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${x + dir * 50}px, ${y - 60}px) rotate(${dir * 180}deg)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${to}px, ${Y + 4}px) rotate(${dir * 400}deg)`, opacity: 1, offset: 0.7 },
      { transform: `translate(${to + dir * 12}px, ${Y + 10}px) rotate(${dir * 440}deg)`, opacity: 0 },
    ], { duration: 2600, easing: 'ease-out' }), 'the acorn bounces off')
  }

  /** The leaf shaken off his head: it see-saws down to the grass (the meadow's dropHat) and lies there, the
   * play long, with any he shook off before. */
  function shakeLeaf() {
    if (!leaf) return
    leaf = null
    const dx = strew() * 40 - 10 // where it lands, beside him
    const turn = LIE[0] + strew() * (LIE[1] - LIE[0])
    let at = null
    const landed = dropHat((x, y, s) => {
      at = x + dx
      return [
        { transform: `translate(${x}px, ${y}px) rotate(0deg) ${s}` },
        { transform: `translate(${x + 40}px, ${y + 80}px) rotate(30deg) ${s}`, offset: 0.3 },
        { transform: `translate(${x - 10}px, ${y + 150}px) rotate(-25deg) ${s}`, offset: 0.6 },
        { transform: `translate(${at}px, ${Y + 6}px) rotate(${turn}rad) ${s} scale(1, ${LIE_FLAT})` },
      ]
    }, 2200, front) // in front of him as it falls: behind, his body hid it
    if (!landed) return
    landed.then(() => lie(at, turn))
  }

  /** A leaf lying in the grass at x, turned `turn`: where the one that fell lands, behind him now. */
  function lie(x, turn) {
    const g = oakLeaf()
    g.setAttribute('class', 'oak-fallen')
    g.setAttribute('transform', `translate(${x} ${Y + 6}) rotate(${(turn * 180) / Math.PI}) scale(${Mole.SCALE}) scale(1 ${LIE_FLAT})`)
    ground.appendChild(g)
    Debug.trace('leaf lies', { x: Math.round(x), leaves: ground.childElementCount })
  }

  /** The acorn in his hands into the hollow: it lies with the others there (a few show; past those it goes in behind). */
  function putAway() {
    if (!held) return
    Mole.carry(null)
    held = null
    if (kept < KEPT.length) el('g', { transform: `translate(${KEPT[kept].join(', ')})` }, store).appendChild(acorn())
    kept += 1
    Debug.trace('acorns kept', { kept })
  }

  // ------------------------------------------------------------ the game's side

  let goTo, dropHat, next // the meadow's (setup)

  /** A tap on the oak: he peeks into it, a different way each time (`rounds`: the meadow's pool). */
  async function peek(alive) {
    const how = next()
    Debug.trace('peeks', { how })
    await PEEKS[how](alive) // each ends with everything back as it was; a cut has restore()
  }

  /** A peek cut short: put back at once what it left. The dark opens, his eyes go, the acorn in his hands is
   * put down (lost in the grass), the leaf falls off his head, and an acorn dropping at him falls on past. */
  function restore() {
    for (const a of veil.getAnimations()) a.cancel()
    veil.style.opacity = 0
    for (const e of front.querySelectorAll('.oak-eyes')) e.remove()
    Sound.hushEchoes()
    if (held && held.isConnected) Mole.carry(null)
    held = null
    for (const node of [...dropping]) fallOn(node)
    dropping.clear()
    if (leaf) shakeLeaf()
  }

  return {
    setup,
    peek,
    restore,
    /** Is the hollow's dark over him (for the rules: never once he is free)? */
    get dark() { return Number(veil?.style.opacity || 0) > 0 },
    get kept() { return kept },
    /** How many leaves lie in the grass. */
    get fallen() { return ground?.childElementCount || 0 },
  }
})()
