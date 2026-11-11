// The painter's paling fence at the meadow's right end, after Krtek malířem
// (the painter's cottage behind it, painting.js): it runs along the meadow's
// back edge, then at its corner turns towards us and comes forward to the
// picture's foot. He goes no further than that corner (Layout.FENCE). A tap
// on it, and he does something there, a different way each time (rounds):
// - the twig: he picks up the twig lying by the fence and runs it along the
//   palings, each one a note up a scale (down it, going back the other way:
//   the twig lies where he left it);
// - the gap: by the gap in the back fence, "hm?", and the hen comes along
//   behind the palings and puts her head through it, cluck; he starts, then
//   giggles;
// - the hops: he hops to see over the corner, once, twice; on the third the
//   hare hops up on the other side, and they look at each other, then both
//   hop and he waves, "ahoj!".
//
// Its drawing: the back fence and the twig (#fence, behind him), the corner
// (#fence-near, in front of visitors coming in from the right), and who is
// about behind it (#garden-life, behind both). The hen and the hare are the
// meadow's friends drawn behind the fence (Friends `behind`): it hides them
// as they come and go. All of it moves only on the Clock (Motion.endAt), and
// restore() puts everything back at once when a tap cuts a turn short.

/* global Clock, Debug, Friends, Layout, Mole, Motion, Sound */
/* exported Fence */
const Fence = (() => {
  const INK = '#2f2a22'
  const F = Layout.FENCE
  const WOOD = ['#b08a5a', '#a07a4c', '#bb966a', '#9c7448'] // the palings, weathered
  const PALING_W = 14 // a paling's width at the back fence (the corner's grow as they come forward)
  const NEAR = 1.9 // the corner's nearest paling, this much bigger than one at the back
  const CORNER_PALINGS = 9 // along the corner's run, from the back to the picture's foot
  const TOUCH = 20 // the twig touches the palings this far ahead of him
  const TWIG_AT = F.from - TOUCH // where the twig lies at first, by the back fence's far end: from here it touches the first paling
  const NOTES = 10 // the twig's notes along the whole fence: two octaves of the scale
  const TICK_MS = 30 // how often the twig looks for the paling it is passing
  const JIGGLE_MS = 260 // a paling the twig knocks, jiggling
  const HARE_AT = F.corner + (F.near - F.corner) * 0.6 // where the hare crouches, behind the corner's palings
  const HEN_FROM = F.near + 260 // the hen comes along the garden from past the meadow's end
  const BESIDE_GAP = 190 // he stands this far left of the gap, facing it: nearer, he hides it
  const HARE_UP = 96 // how high the hare hops up behind the corner, to be seen over it
  const random = Debug.random('meadow-fence') // which way first: its own stream

  let back = null // #fence
  let life = null // #garden-life
  let palings = [] // the back fence's: { x, el }
  let twigX = TWIG_AT
  let lying = null // the twig on the grass
  let held = false // the twig in his hands
  let ticker = null // the twig's notes as he runs along
  const out = new Set() // the hen or the hare, about behind the fence
  let goTo, next, el // the meadow's (setup)


  /** A paling standing at x on `foot`, `s` times the back fence's size: a board with a pointed top. */
  function paling(parent, x, foot, s) {
    const [w, h] = [(PALING_W * s) / 2, F.tall * s]
    return el('path', { d: `M${x - w} ${foot} V${foot - h + w} L${x} ${foot - h} L${x + w} ${foot - h + w} V${foot} Z`, fill: WOOD[Math.floor(random() * WOOD.length)], stroke: INK, 'stroke-width': 2.4, class: 'paling' }, parent)
  }

  /** Draw the fence: the back run into `behind` (#fence), the corner into `front` (#fence-near); `garden`
   * (#garden-life) is where the hen and the hare are drawn behind it. The meadow's side: its `goTo` and
   * `rounds`. Both runs take taps (.fence-hit). */
  function setup(behind, front, garden, meadow) {
    back = behind
    life = garden
    goTo = meadow.goTo
    el = meadow.el
    next = meadow.rounds(Object.keys(TURNS), random)
    const run = el('g', { class: 'fence-hit' }, back)
    for (const y of [F.foot - 40, F.foot - F.tall + 40]) el('rect', { x: F.from - 10, y: y - 6, width: F.corner - F.from + 20, height: 10, fill: '#8a6a40', stroke: INK, 'stroke-width': 2 }, run) // its rails
    palings = []
    for (let x = F.from; x <= F.corner; x += F.every) if (Math.abs(x - F.gap) > F.every) palings.push({ x, el: paling(run, x, F.foot, 1) }) // two left out: the gap
    for (const p of palings) {
      p.el.style.transformBox = 'fill-box'
      p.el.style.transformOrigin = '50% 100%'
    }
    // the corner, coming forward: its rails, then its palings from the back, the nearer over the farther
    const corner = el('g', { class: 'fence-hit' }, front)
    const along = (t) => ({ x: F.corner + (F.near - F.corner) * t, y: F.foot + (F.front - F.foot) * t, s: 1 + (NEAR - 1) * t })
    for (const k of [40, F.tall - 40]) {
      const [a, b] = [along(0), along(1)]
      el('path', { d: `M${a.x} ${a.y - k * a.s} L${b.x} ${b.y - k * b.s}`, stroke: '#8a6a40', 'stroke-width': 10, fill: 'none' }, corner)
    }
    for (let k = 0; k <= CORNER_PALINGS; k++) {
      const at = along((k / CORNER_PALINGS) ** 0.85)
      paling(corner, at.x, at.y, at.s)
    }
    layTwig(TWIG_AT)
  }

  /** The twig, lying on the grass. */
  function twigNode() {
    const g = el('g', { class: 'fence-twig' })
    el('path', { d: 'M-48 0 L44 -6 M12 -3 L30 -22 M-16 -1 L-28 -18', stroke: '#3e2914', 'stroke-width': 6, 'stroke-linecap': 'round', fill: 'none' }, g)
    return g
  }

  /** The twig in his hands, held up over his head and slanting down ahead of him (dir), so its end runs
   * along the palings' tops. */
  function heldTwig(dir) {
    const g = el('g', { class: 'fence-twig' })
    g.setAttribute('transform', `scale(${dir} 1)`)
    el('path', { d: 'M-14 -10 L74 52 M38 26 L58 4 M16 10 L8 30', stroke: '#3e2914', 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }, g)
    return g
  }

  function layTwig(x) {
    lying?.remove()
    twigX = x
    lying = twigNode()
    lying.setAttribute('transform', `translate(${x} ${Layout.GROUND - 4})`)
    back.appendChild(lying)
  }

  /** Put the twig in his hands down, where he stands. */
  function dropTwig() {
    if (!held) return
    held = false
    Mole.carry(null)
    layTwig(Math.max(TWIG_AT, Math.min(F.x, Mole.state.x)))
  }

  /** The twig's notes: each paling he passes (where he is drawn now) knocks and jiggles. */
  function startNotes(dir) {
    const top = palings.filter((p) => p.x <= F.x + TOUCH).length - 1 // the last he reaches: the top of the scale
    let last = null
    const tick = () => {
      const x = Mole.drawnX() + dir * TOUCH // where the twig touches the palings, just ahead of his hands
      const k = palings.findIndex((p) => Math.abs(p.x - x) < F.every / 2)
      if (k < 0 || k === last) return
      last = k
      Sound.tock(Math.round((k * NOTES) / top))
      Motion.endAt(palings[k].el, [{ transform: 'rotate(0deg)' }, { transform: `rotate(${dir * 6}deg)`, offset: 0.3 }, { transform: `rotate(${-dir * 3}deg)`, offset: 0.65 }, { transform: 'rotate(0deg)' }], { duration: JIGGLE_MS })
      Debug.trace('twig note', { k })
    }
    tick() // the paling at hand, before he moves on
    ticker = Clock.every(TICK_MS, tick)
  }

  function stopNotes() {
    ticker?.()
    ticker = null
  }

  /** One of the garden's friends, behind the fence at x: `kind` facing him. */
  function behindFence(kind, x) {
    const f = Friends.make(kind, x, -1, { behind: life })
    out.add(f)
    return f
  }

  /** Down behind the corner's palings (the hare), then gone. */
  async function duck(f) {
    try {
      await f.lift(0, 200)
      await f.rise(false)
    } finally {
      f.gone()
    }
  }

  /** Off back along the garden, past the meadow's end, then gone. */
  async function away(f, ms = 1600) {
    try {
      f.turn(1)
      await f.go(Friends.offscreen(1, HEN_FROM), ms)
    } finally {
      out.delete(f)
      f.gone()
    }
  }

  const wait = async (ms, alive) => {
    await Clock.wait(ms)
    return alive()
  }

  // ------------------------------------------------------------ the turns

  const TURNS = {
    /** The twig along the palings, a note each, up the scale (or down it, from the other end). */
    async twig(alive) {
      const from = twigX
      const dir = from < (F.from + F.x) / 2 ? 1 : -1
      await goTo(from)
      if (!alive()) return
      Mole.show('three', dir)
      await Mole.lean(dir * 14, 600) // he bends for it
      if (!alive()) return
      lying?.remove()
      lying = null
      held = true
      Mole.carry(heldTwig(dir))
      startNotes(dir)
      try {
        await goTo(dir > 0 ? F.x : TWIG_AT) // the whole run, either way: the scale up, or down
      } finally {
        stopNotes()
      }
      if (!alive()) return
      dropTwig()
      Sound.say('giggle')
      await Mole.cheer()
    },

    /** "Hm?" at the gap, and the hen's head pops into it: cluck! A start, then a giggle. */
    async gap(alive) {
      await goTo(F.gap - BESIDE_GAP)
      if (!alive()) return
      Mole.show('side', 1)
      Sound.say('hm', true)
      await Mole.lean(14, 900)
      if (!alive()) return
      const hen = behindFence('hen', Friends.offscreen(1, HEN_FROM)) // out of sight, however wide the screen
      await hen.go(F.gap, 2200)
      if (!alive()) return
      Sound.cluck()
      Mole.perk(1.5)
      await Promise.all([Mole.handsToFace(700, 'fright'), hen.bob(2)])
      if (!alive()) return
      Sound.say('giggle')
      await Promise.all([Mole.handsToFace(600), hen.no()])
      if (!alive()) return
      await away(hen)
    },

    /** Hops to see over the corner; on the third the hare hops up on the other side. "Ahoj!" */
    async hops(alive) {
      await goTo(F.x)
      if (!alive()) return
      Mole.show('side', 1)
      const hare = behindFence('hare', HARE_AT)
      hare.under() // crouched low behind the palings
      for (let i = 0; i < 2; i++) {
        await Mole.hop()
        if (!(await wait(300, alive))) return
      }
      await Promise.all([Mole.hop(56, 700), (async () => { await hare.rise(true); await hare.lift(HARE_UP, 260) })()])
      if (!alive()) return
      Mole.perk(1.5)
      Sound.say('ooh', true)
      if (!(await wait(500, alive))) return
      Sound.say('ahoj')
      await Promise.all([Mole.wave(), hare.glad(hare.bob(2))])
      if (!alive()) return
      out.delete(hare)
      await duck(hare)
    },
  }

  /** A tap on the fence: he does something there, a different way each time (`rounds`: the meadow's pool). */
  async function play(alive) {
    const how = next()
    Debug.trace('fence', { how })
    await TURNS[how](alive)
  }

  /** A turn cut short: the twig put down where he is, the notes stopped, the hen and the hare back behind
   * the palings and gone. */
  function restore() {
    stopNotes()
    dropTwig()
    for (const f of [...out]) {
      out.delete(f)
      if (f.kind === 'hare') Debug.ignoreCut(duck(f), 'down behind the corner') // up over it, he must not vanish
      else Debug.ignoreCut(away(f, 1000), 'off along the garden')
    }
  }

  /** Bedtime: nobody left about behind it. */
  function night() {
    stopNotes()
    for (const f of [...out]) {
      out.delete(f)
      f.gone(true)
    }
  }

  return {
    setup,
    play,
    restore,
    night,
    /** Is the twig in his hands (for the rules: never once he is free)? */
    get holding() { return held },
    /** Who is about behind the fence (for the rules: nobody once he is free, but those going). */
    get about() { return out.size },
    get twigX() { return twigX },
  }
})()
