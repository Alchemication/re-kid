// The storm and the umbrella (he helps someone), after the end of Krtek a
// paraplíčko, where it rains and the mole and the animals shelter under his
// umbrella (worlds/krtek/episodes/index.yaml); made a storm, with a squeeze
// and a molehill (Adam's pick, 2026-10-26). One play in four, instead of the
// rain cloud (rain.js), and never with the eclipse (meadow.js).
//
// Grey clouds roll in and the wind gets up (storm.js). He looks up - ach jo
// - goes down into his den and comes up with his umbrella, furled; he takes
// it out to the open grass past his flowers, plants it, and up it pops. The
// rain comes. The mouse, the hare and the hen come running through it and
// stop near, dripping, looking at him: the child picks whom he waves in
// (ahoj!), and in each one runs, under the umbrella (a tap on one already in
// waves in the next still out). Left alone, he waves
// them in himself: the mouse, the hare, the hen. The hen squeezes in last,
// they all shuffle, and he is squeezed out into the rain (the laugh); ach jo
// - and down he goes, and pops up in a new molehill right in the middle,
// under the umbrella (the surprise). The rain stops, they shake off the
// drops, a rainbow, they nod and go home, and he closes the umbrella, which
// stays planted there all day.
//
// A tap on the umbrella, the clouds or a friend hurries it on; a tap
// elsewhere waits for the step to end, then cuts it short (things.js): the
// friends stay where they are, waiting or sheltering (like the egg's hare
// and hen, they are the meadow's, not a visiting cast), a furled umbrella in
// his hands is put down in the grass, and the next tap carries on from
// there. The rain stops in its own time (storm.js RAIN_MAX_MS) even if it is
// never finished: then nobody new comes running, and he just closes up.

/* global AfterRain, Clock, Debug, Friends, Layout, Mole, Motion, Sound, Storm, Things */
;(() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const Y = Layout.GROUND
  const PLANT_AT = 1420 // in the open grass between his flowers and the wild patch: nothing else stands there
  const POLE = 270 // the umbrella's height to its canopy, above the grass
  const HALF = 150 // half the canopy's width: room for him and three friends, just
  const ORDER = ['mouse', 'hare', 'hen'] // whom he waves in himself, left alone: the hen, biggest, last
  const FROM = { mouse: 1, hare: -1, hen: 1 } // which side each comes running from
  const WAITS = { mouse: 340, hare: -360, hen: 470 } // where each stops, dripping, from the umbrella: out in the rain
  const SLOT = { mouse: 95, hare: -110, hen: 150 } // where each stands under it
  const SQUEEZED = 290 // how far out he is squeezed, into the rain
  const OUT_IN_THE_RAIN = [12, -8, 8] // out there he leans glum, and shakes his head...
  const OUT_PAUSE_MS = 500 // ...and stands a moment more before he thinks of digging
  const ARRIVE_MS = [2200, 2600, 2900] // the friends' runs in, one after another
  const STAGGER_MS = 1100
  const WAIT_POLL_MS = 300 // how often he looks whether the rain has come yet
  const WAVE_IN_MS = 2500 // left alone, he waves the next one in this soon: time for a child to pick, not long in the rain (Adam: they stood out there too long)
  const INK = '#15140f'
  const RED = '#d9473a'

  const state = {
    umbrella: null, // planted: { g, canopy, x, open }
    lying: null, // furled in the grass where a cut made him put it down: { g, x }
    friends: {}, // by kind: waiting in the rain, or under the umbrella
    under: new Set(),
    popped: false, // he has popped up in the middle
    rainbow: false,
    resolved: false,
    leaving: [], // walking home: bedtime takes them at once
  }
  const m = () => Things.meadow

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }

  // ------------------------------------------------------------ the umbrella

  /** Furled, held up over his head (Mole.carry). */
  function furled() {
    const g = el('g', { class: 'umbrella-furled' })
    el('path', { d: 'M0 70 V-150', stroke: '#5a3a1a', 'stroke-width': 5 }, g)
    el('path', { d: 'M0 70 q0 14 -12 14', stroke: '#5a3a1a', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }, g)
    el('path', { d: 'M-12 -10 L0 -150 L12 -10 Q0 -2 -12 -10 Z', fill: RED, stroke: INK, 'stroke-width': 2 }, g)
    return g
  }

  /** Furled, lying in the grass at x: a tap on it carries on. */
  function lay(x) {
    const g = el('g', { class: 'thing umbrella', 'data-thing': 'storm' }, document.getElementById('things'))
    g.style.transform = `translate(${x}px, ${Y - 6}px) rotate(-84deg) scale(0.9)`
    g.appendChild(furled())
    return { g, x }
  }

  /** Planted in the grass at x, its canopy closed until it opens. */
  function plant(x) {
    const g = el('g', { class: 'thing umbrella', 'data-thing': 'storm' }, document.getElementById('things'))
    g.style.transform = `translate(${x}px, ${Y}px)`
    el('path', { d: `M0 8 V${-POLE}`, stroke: '#5a3a1a', 'stroke-width': 6 }, g)
    const canopy = el('g', { class: 'canopy' }, g)
    const top = -POLE
    const scallops = 6
    let d = `M${-HALF} ${top + 20} Q${-HALF} ${top - 95} 0 ${top - 100} Q${HALF} ${top - 95} ${HALF} ${top + 20}`
    for (let k = 0; k < scallops; k++) d += ` q${-HALF / scallops} -18 ${(-2 * HALF) / scallops} 0`
    el('path', { d: `${d} Z`, fill: RED, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }, canopy)
    for (let k = 1; k < scallops; k++) {
      const rx = -HALF + (k * 2 * HALF) / scallops
      el('path', { d: `M0 ${top - 100} Q${rx * 0.6} ${top - 70} ${rx} ${top + 20}`, stroke: '#8f2a21', 'stroke-width': 2, fill: 'none' }, canopy)
    }
    el('path', { d: `M0 ${top - 100} V${top - 122}`, stroke: INK, 'stroke-width': 4 }, canopy)
    el('rect', { x: -HALF, y: top - 110, width: HALF * 2, height: POLE + 110, fill: 'transparent' }, g) // a tap anywhere under it is a tap on it
    canopy.style.transform = 'scaleX(0.08)'
    return { g, canopy, x, open: false }
  }

  /** Up it pops (or down it folds, closing). */
  async function openUp(open) {
    const u = state.umbrella
    u.open = open
    if (open) Sound.pop()
    Storm.shelter(open ? { x: u.x, top: Y - POLE - 10, half: HALF - 10 } : null)
    await Debug.ignoreCut(Motion.endAt(u.canopy, [{ transform: `scaleX(${open ? 1 : 0.08})` }], { duration: open ? 260 : 600, easing: open ? 'cubic-bezier(.3,1.6,.5,1)' : 'ease-in' }), open ? 'the umbrella opens' : 'the umbrella closes')
  }

  // ------------------------------------------------------------ the friends

  /** `who` comes running in from out of sight, to where it waits in the rain, dripping and glum. Like the egg's
   * hare and hen, those who wait to be picked are the meadow's, not a visiting cast: a free mole may have them
   * about (checkRules); they go home on their own feet (home()). */
  async function runIn(who, ms) {
    const u = state.umbrella
    const f = Friends.make(who, Friends.offscreen(FROM[who], u.x), -FROM[who])
    f.g.dataset.thing = 'storm'
    f.g.dataset.choice = who
    state.friends[who] = f
    await Debug.ignoreCut(f.go(u.x + WAITS[who], ms, who === 'hare' ? 26 : 0), `the ${who} runs in`)
    if (state.friends[who] !== f) return
    f.turn(Math.sign(-WAITS[who]) || -1)
    await Debug.ignoreCut(f.droop(), `the ${who}, dripping`)
  }

  /** Wait for the rain (it comes in its own time), checking now and then. */
  async function rainCome(alive) {
    while (alive() && Storm.phase === 'gathering') await Clock.wait(WAIT_POLL_MS)
  }

  /** Everyone home, walking off (now: at once, and those already walking too: bedtime). */
  function home(now = false) {
    for (const f of Object.values(state.friends)) {
      if (now) f.gone(true)
      else {
        state.leaving.push(f)
        Debug.ignoreCut(f.leave(), `the ${f.kind} goes home`).then(() => { state.leaving = state.leaving.filter((c) => c !== f) })
      }
    }
    if (now) for (const f of state.leaving.splice(0)) f.gone(true)
    state.friends = {}
    state.under.clear()
  }

  // ------------------------------------------------------------ its steps

  function appear() {
    Storm.gather()
    for (const c of document.querySelectorAll('.storm-cloud')) c.dataset.thing = 'storm' // a tap on the clouds: he goes to see to it
  }

  /** He looks up (ach jo), fetches his umbrella (from his den, or from the grass where he put it down), takes it
   * out to the open grass, plants it and opens it. */
  async function fetch(alive) {
    if (!state.umbrella) {
      await getIt(alive)
      if (!alive()) return
      try {
        await m().goTo(PLANT_AT - 40)
      } finally {
        putDown(alive()) // planted where it goes, or, cut short on his way, laid in the grass where he is
      }
      if (!alive()) return
    }
    if (!state.umbrella.open) {
      await m().goTo(state.umbrella.x - 30)
      if (!alive()) return
      await openUp(true)
      if (!alive()) return
    }
    await m().goTo(state.umbrella.x)
  }

  /** Into his den for it, up he comes with it furled over his head; or, put down by a cut, he picks it up. */
  async function getIt(alive) {
    if (state.lying) {
      await m().goTo(state.lying.x)
      if (!alive()) return
      state.lying.g.remove()
      state.lying = null
      Mole.carry(furled())
      return
    }
    Mole.perk(1.3)
    Sound.say('achJo')
    await m().goTo(Layout.HOME)
    if (!alive()) return
    await Mole.goDown()
    if (!alive()) return
    await Clock.wait(600) // rummaging in his den
    if (!alive()) return
    Mole.carry(furled())
    try {
      await Mole.comeUp('out')
    } finally {
      if (!alive()) putDown(false)
    }
  }

  /** Out of his hands: planted at its place, or (cut short) laid in the grass where he is, unless it is already down. */
  function putDown(planted) {
    Mole.carry(null)
    if (planted) state.umbrella = plant(PLANT_AT)
    else if (!state.umbrella && !state.lying) state.lying = lay(Mole.state.x + 30)
  }

  /** The rain comes; the friends come running through it, one after another, and wait near, dripping. */
  async function friendsCome(alive) {
    await rainCome(alive)
    if (!alive() || Storm.phase !== 'raining') return // the rain has been and gone (a busy child): nobody comes running
    Sound.say('ooh', true)
    await Promise.all(ORDER.map((who, i) => Clock.wait(i * STAGGER_MS).then(() => (alive() && !state.friends[who] ? runIn(who, ARRIVE_MS[i]) : null))))
  }

  /** He waves `who` in from the rain (ahoj!), and in it runs, under the umbrella; the last one in squeezes him out. */
  async function waveIn(who, alive) {
    const u = state.umbrella
    if (Storm.phase !== 'raining') return after(alive) // it has stopped by itself: just close up
    if (state.under.size === ORDER.length) return squeeze(alive) // all in already: cut short in the squeeze
    if (state.under.has(who)) who = ORDER.find((w) => !state.under.has(w)) // already in: he waves in the next one still out (a toddler taps the same one again and again)
    if (!state.friends[who]) {
      await runIn(who, ARRIVE_MS[0]) // not here (its run in was cut short before it began): in it comes, running
      if (!alive()) return
    }
    if (Math.abs(Mole.state.x - u.x) > 20) await m().goTo(u.x)
    if (!alive()) return
    const f = state.friends[who]
    Mole.lookAt(f.x)
    Sound.say('ahoj', true)
    await Mole.wave()
    if (!alive()) return
    await Debug.ignoreCut(f.go(u.x + SLOT[who], 700, who === 'hare' ? 22 : 0), `the ${who} runs under`)
    if (!alive()) return
    f.turn(SLOT[who] > 0 ? -1 : 1)
    state.under.add(who)
    Debug.trace('under', { who, under: [...state.under].join(' ') })
    if (state.under.size === ORDER.length) await squeeze(alive)
  }

  /** All three in: they shuffle, and he is squeezed out into the rain - ach jo - and pops up in the middle. */
  async function squeeze(alive) {
    if (!state.popped) {
      if (Storm.phase !== 'raining') return after(alive) // no rain to be squeezed out into
      const u = state.umbrella
      Sound.squeak()
      await Promise.all(ORDER.map((who) => Debug.ignoreCut(state.friends[who].go(u.x + SLOT[who] * 0.7, 300), 'shuffling in')))
      if (!alive()) return
      Debug.trace('squeezed out', {})
      await Mole.glide(u.x + SQUEEZED, 420, 0, 'ease-out') // out he pops, into the rain
      if (!alive()) return
      Mole.lookAt(u.x) // back at them, all dry under there
      Sound.say('achJo')
      for (const deg of OUT_IN_THE_RAIN) {
        await Mole.lean(deg, 550) // glum, and a shake of the head
        if (!alive()) return
      }
      await Clock.wait(OUT_PAUSE_MS) // the laugh: long enough for a child to see him standing there, wet
      if (!alive()) return
      await m().digTo(u.x) // down, along under the grass, and up in a molehill right in the middle
      if (!alive()) return
      state.popped = true
      Sound.say('giggle')
      for (const who of ORDER) state.friends[who]?.turn(SLOT[who] > 0 ? -1 : 1)
    }
    await after(alive)
  }

  /** The rain stops; they shake off the drops; a rainbow (once); they nod and go home; he closes the umbrella. */
  async function after(alive) {
    Storm.clear()
    await Clock.wait(2500)
    if (!alive()) return
    for (const f of Object.values(state.friends)) {
      AfterRain.shake(f.x, Y - 50)
      Sound.swish()
      await Debug.ignoreCut(f.bob(1), `the ${f.kind} shakes off`)
      if (!alive()) return
    }
    if (!state.rainbow) {
      state.rainbow = true
      AfterRain.rainbow(document.getElementById('far-things'), state.umbrella.x)
      Sound.say('ooh')
      await Mole.cheer()
      if (!alive()) return
    }
    for (const f of Object.values(state.friends)) {
      await Debug.ignoreCut(f.bob(1), `the ${f.kind} nods`)
      if (!alive()) return
    }
    home()
    state.resolved = true
    await openUp(false)
  }

  /** Cut short: the friends stay where they are, waiting or sheltering; a furled umbrella in his hands goes down in
   * the grass by him (fetch's finally lays it there); a planted one stays as it is. */
  function restore() {
    if (Mole.state.carrying) putDown(false)
  }

  /** Bedtime: the storm gone, everyone home at once; the umbrella stays where it stands, closed. */
  function night() {
    Storm.night()
    home(true)
    if (state.umbrella?.open) openUp(false)
  }

  Things.add({
    name: 'storm',
    offer: 'help',
    instead: 'rain',
    chance: 0.25, // one play in four (Adam, 2026-10-26)
    engageMs: WAVE_IN_MS,
    music: { 0: 'sad' }, // a storm coming: ach jo (happy once they are all dry)
    appear,
    steps: [fetch, friendsCome],
    ask: waveIn,
    next: () => ORDER.find((who) => !state.under.has(who)) || 'hen',
    resolved: () => state.resolved,
    restore,
    night,
    detail: () => ({ umbrella: state.umbrella ? { x: Math.round(state.umbrella.x), open: state.umbrella.open } : null, lying: state.lying ? Math.round(state.lying.x) : null, under: [...state.under], storm: Storm.phase, out: Object.keys(state.friends), cast: [] }),
  })
})()
