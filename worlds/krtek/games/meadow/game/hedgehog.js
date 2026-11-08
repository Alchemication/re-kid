// The hedgehog's winter bed (he helps someone: autumn's, in the egg's place; invented, after the hedgehog of
// Krtek a ježek, who trots about with fruit stuck on his spines, 1:14). Built while Adam was away
// (2026-11-08), his to judge.
//
// Fallen leaves lie in the grass between the chestnut and his molehill all day. When this encounter's
// hour comes, the hedgehog trots in from the wood, sniffs at the leaves and shivers: winter is coming and
// he has no bed, and a leaf he takes in his mouth blows away. The mole goes and scoops up an armful for
// him, and a gust blows them off his arms all over the grass (and the hedgehog). Then the idea: the
// hedgehog curls up, the mole gives him a push, and he rolls through the leaves, picking them all up on
// his spines, and uncurls a walking heap of leaves with a nose (the laugh). He shakes them off into a
// heap, turns round twice, burrows in, and falls asleep: the heap rises and falls with his breath the rest
// of the day, and the mole tiptoes off. A tap on the heap after: his nose pokes out and sniffs, and goes
// back in.
//
// A tap on him or the leaves hurries it on; a tap elsewhere waits for the step to end, then cuts it short
// (things.js): the hedgehog waits on where he is, uncurled, with what he has on his spines (he is the
// meadow's once he has come, as the egg's hen and hare are, not a troupe's: he waits for the mole); what
// the mole held falls to the grass. At bedtime he goes, under the closing circle. Nothing comes from nowhere: the leaves were always there (the chestnut drops them), the
// hedgehog comes from out of sight and goes into his heap, which stays.

/* global Autumn, Clock, Debug, Friends, Layout, Mole, Motion, Sound, Things */
;(() => {
  const Y = Layout.GROUND
  const SPOT = 640 // where he comes to, in the grass left of the molehill (the egg's, in spring)
  const BED = 530 // where his heap goes, nearer the chestnut (clear of the swing, swing.js)
  const LEAVES = 9 // lying in the grass, from BED to SPOT + 120
  const ARMFUL = 4 // the leaves the mole scoops up
  const TROT_MS = 3200
  const ROLL_MS = 2400
  const random = Debug.random('meadow-hedgehog') // where the leaves lie, how they blow: its own stream
  const state = { lying: [], stuck: 0, heap: null, asleep: false, carried: null }
  let hog = null // the hedgehog, while he is out
  const m = () => Things.meadow
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const layer = () => document.getElementById('things')
  const at = (x, turn) => `translate(${x}px, ${Y + 4}px) rotate(${turn}deg) scale(2.2, 1.2)`

  /** A leaf lying in the grass at x (data-thing: a tap on the leaves is a tap on this). */
  function leaf(x) {
    const g = el('g', { class: 'hedgehog-leaf', 'data-thing': 'hedgehog' }, layer())
    Autumn.piece(g, random)
    const turn = Math.round(random() * 360)
    g.style.transform = at(x, turn)
    const l = { g, x, turn }
    state.lying.push(l)
    return l
  }

  /** The leaves lying about all day (an autumn play only: the encounter is autumn's). */
  function plant() {
    for (let i = 0; i < LEAVES; i++) leaf(BED + 40 + (i * (SPOT + 120 - BED - 40)) / (LEAVES - 1) + (random() - 0.5) * 30)
  }

  /** The hedgehog: out if he is already, else he trots in from the wood (off the left). */
  async function bring(alive) {
    let h = hog
    if (!h) {
      hog = h = Friends.make('hedgehog', Friends.offscreen(-1, -200), 1)
      h.stick(state.stuck)
      await h.go(SPOT, TROT_MS)
      if (!alive()) return null
    }
    return h
  }

  // ------------------------------------------------------------ the chain

  function appear() {
    Debug.ignoreCut(bring(() => true), 'the hedgehog trots in')
  }

  /** He sniffs at the leaves and shivers; one he takes in his mouth blows away. The mole comes over. */
  async function notice(alive) {
    const h = await bring(alive)
    if (!h) return
    const coming = m().goTo(SPOT + 170) // he comes over while the hedgehog sniffs about
    await h.bob(3) // sniffing at the leaves
    if (!alive()) return
    Sound.snuffle()
    const l = state.lying[state.lying.length - 1]
    if (l) await blowAway(l, -1)
    if (!alive()) return
    await h.no() // a shiver
    if (!alive()) return
    await h.droop()
    if (!alive()) return
    await coming
    if (!alive()) return
    Mole.lookAt(h.drawnX())
    Mole.feel('worried', 1400)
    await Mole.ponder(800)
  }

  /** He scoops up an armful for him, and a gust blows them off his arms all over the grass. */
  async function gather(alive) {
    if (state.stuck) return // he has them on his spines already
    const h = await bring(alive)
    if (!h) return
    await m().goTo(SPOT + 110)
    if (!alive()) return
    const bundle = el('g', {})
    for (let i = 0; i < ARMFUL; i++) {
      const g = el('g', { transform: `translate(${(i - 1.5) * 9} ${-(i % 2) * 6}) rotate(${i * 70}) scale(1.4)` }, bundle)
      Autumn.piece(g, random)
    }
    await Mole.lean(10, 400) // down to scoop them up
    if (!alive()) return
    Sound.swish()
    Mole.carry(bundle)
    state.carried = bundle
    Mole.feel('delighted', 1200)
    await m().goTo(SPOT + 70)
    if (!alive()) return
    Sound.whoosh() // a gust
    Mole.carry(null)
    state.carried = null
    for (let i = 0; i < ARMFUL; i++) Debug.ignoreCut(blowAway(leaf(Mole.state.x), i % 2 ? -1 : 1, 120 + i * 50, true), 'a leaf blows off his arms')
    Sound.say('achJo')
    await Mole.handsToFace(700, 'fright')
    if (!alive()) return
    await h.no()
  }

  /** The idea: he curls up, the mole gives him a push, and he rolls through the leaves, picking them up on
   * his spines; he uncurls a walking heap of leaves (the laugh). */
  async function roll(alive) {
    const h = await bring(alive)
    if (!h) return
    if (!state.stuck) {
      const start = Math.min(SPOT + 240, Math.max(h.drawnX(), ...state.lying.map((l) => l.x)) + 40) // beyond the last leaf: he rolls through them all
      await Promise.all([h.go(start, Math.abs(start - h.drawnX()) * 8 + 200), m().goTo(start + 90)])
      if (!alive()) return
      Mole.perk(1.5)
      Sound.say('ooh') // the idea
      await Mole.ponder(600)
      if (!alive()) return
      await h.curl(true)
      if (!alive()) return
      Mole.show('three', -1)
      await Mole.lean(-14, 300) // a push
      Sound.roll(ROLL_MS / 1000)
      const from = h.drawnX()
      const to = BED - 10
      const rolling = Promise.all([h.go(to, ROLL_MS), h.roll(-4, ROLL_MS)])
      for (const l of [...state.lying].sort((a, b) => b.x - a.x)) { // as he passes each, it sticks to him
        const k = Math.max(0, Math.min(1, (from - l.x) / (from - to))) // where along his roll he passes it
        Clock.after(k * ROLL_MS * 0.9, () => pickUp(l, h))
      }
      await rolling
      if (!alive()) return
      h.stick(6) // a ball of leaves
      state.stuck = 6
      await h.curl(false)
      if (!alive()) return
    }
    Mole.lookAt(h.drawnX())
    Sound.say('giggle')
    await Mole.handsToFace(800)
  }

  /** He shakes them off into a heap, turns round, burrows in and falls asleep; the mole tiptoes off. */
  async function bed(alive) {
    if (state.asleep) return
    const h = await bring(alive)
    if (!h) return
    await m().goTo(BED + 170)
    if (!alive()) return
    Sound.swish()
    await h.no()
    h.shed()
    state.stuck = 0
    heap(h.drawnX())
    if (!alive()) return
    h.turn(-1)
    await Clock.wait(400)
    h.turn(1)
    await Clock.wait(400)
    if (!alive()) return
    Sound.snuffle()
    await h.rise(false) // into the heap
    h.gone()
    hog = null
    state.asleep = true
    state.heap.classList.add('asleep')
    Mole.feel('content', 1600)
    await Mole.handsToFace(700) // shh
    if (!alive()) return
    await m().goTo(Mole.state.x + 140)
  }

  /** A leaf blown off along the grass (dir -1 left, 1 right) and lying again further on. */
  function blowAway(l, dir, far = 160, up = false) {
    const to = Math.max(BED + 10, Math.min(SPOT + 220, l.x + dir * far)) // never past his heap's place: he rolls up all of them
    const turn = l.turn + dir * 300
    const from = l.g.style.transform
    const mid = (l.x + to) / 2
    l.x = to
    l.turn = turn
    return Motion.endAt(l.g, [{ transform: from }, { transform: `translate(${mid}px, ${Y - (up ? 140 : 60)}px) rotate(${turn - dir * 150}deg) scale(2.2)`, offset: 0.4 }, { transform: at(to, turn) }], { duration: 1400, easing: 'ease-out' })
  }

  /** A leaf in the grass onto his spines as he rolls by. */
  function pickUp(l, h) {
    if (!state.lying.includes(l)) return
    state.lying = state.lying.filter((o) => o !== l)
    l.g.remove()
    state.stuck = Math.min(6, state.stuck + 1)
    h.stick(state.stuck)
  }

  /** His heap of leaves at x: it breathes while he sleeps in it (game.css .hedgehog-heap.asleep). */
  function heap(x) {
    if (state.heap) return
    const g = el('g', { class: 'hedgehog-heap', 'data-thing': 'hedgehog' }, layer())
    g.style.transform = `translate(${x}px, ${Y + 6}px)`
    const pile = el('g', { class: 'heap' }, g)
    el('path', { d: 'M-60 0 C-56 -40 -24 -58 0 -58 C26 -58 56 -40 60 0 Z', fill: '#b5652a', stroke: '#5a3416', 'stroke-width': 2.5 }, pile)
    for (let i = 0; i < 14; i++) {
      const a = Math.PI * (1.05 + random() * 0.9)
      const r = 20 + random() * 30
      const lg = el('g', { transform: `translate(${(Math.cos(a) * r * 1.3).toFixed(0)} ${(Math.sin(a) * r * 0.9).toFixed(0)}) rotate(${Math.round(random() * 360)}) scale(1.7)` }, pile)
      Autumn.piece(lg, random)
    }
    const nose = el('g', { class: 'heap-nose' }, g) // his nose, poking out as he sleeps
    el('circle', { cx: -52, cy: -8, r: 6, fill: '#e6a7a2', stroke: '#15140f', 'stroke-width': 2 }, nose)
    for (const [i, [zx, zy]] of [[-10, -76], [4, -96]].entries()) {
      const z = el('path', { class: 'heap-z', d: `M${zx} ${zy} h12 l-12 13 h12`, fill: 'none', stroke: '#fbf6e8', 'stroke-width': 3, 'stroke-linejoin': 'round' }, g)
      z.style.animationDelay = `${i * 1.8}s`
    }
    state.heap = g
  }

  /** Done, a tap on his heap: his nose pokes out and sniffs, and goes back in. */
  async function again(alive) {
    if (!state.heap) return
    await m().goTo(Number(state.heap.style.transform.match(/-?\d+/)[0]) + 150)
    if (!alive()) return
    const nose = state.heap.querySelector('.heap-nose')
    Sound.snuffle()
    await Motion.endAt(nose, [{ transform: 'translate(0px, 0px)' }, { transform: 'translate(-10px, -4px)', offset: 0.3 }, { transform: 'translate(-6px, -2px)', offset: 0.5 }, { transform: 'translate(-10px, -4px)', offset: 0.7 }, { transform: 'translate(0px, 0px)' }], { duration: 1400 })
    if (!alive()) return
    Sound.say('giggle', true)
    await Mole.handsToFace(500)
  }

  /** Cut short: he uncurls where he is, and waits; what the mole held falls to the grass. */
  function restore() {
    if (state.carried) {
      Mole.carry(null)
      state.carried = null
      for (let i = 0; i < ARMFUL; i++) leaf(Mole.state.x + (i - 1.5) * 24)
    }
    if (hog) Debug.ignoreCut(hog.curl(false, 0), 'he uncurls')
  }

  /** Bedtime: he goes, under the closing circle (or is asleep in his heap already). */
  function night() {
    restore()
    hog?.gone(true)
    hog = null
  }

  Things.add({
    name: 'hedgehog',
    offer: 'help',
    plant, // the leaves lie there only on a play it comes
    music: { 0: 'sad', 2: 'happy' }, // cold, no bed; the laugh as he rolls up the leaves
    appear,
    steps: [notice, gather, roll, bed],
    again,
    restore,
    night,
    detail: () => ({ lying: state.lying.length, stuck: state.stuck, asleep: state.asleep, out: !!hog, cast: [] }),
  })
})()
