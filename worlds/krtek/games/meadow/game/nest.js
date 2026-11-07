// The bullfinch's nest, up on the spring's top boulder: three chicks that
// bob up and peep now and then by day. It is there all day, so when the fox
// comes for it (paint.js, after Krtek malířem, where the fox raids a nest)
// the child sees what he is after: the chicks huddle up, trembling and
// peeping the alarm, and settle once he has run. They stay in sight: ducked
// down out of it, nobody saw what the fox was after. Invented, after the film:
// the nest on the spring's rocks and the bullfinch as its mother are ours.

/* global Clock, Debug, Layout, Motion, Sound, World */
/* exported Nest */
const Nest = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const INK = '#2f2a22'
  const AT = { x: Layout.SPRING + 290, y: 398 } // on top of the round stone over the cliff (painting.js rocks): just above a tall fox's reach
  const PEEP_EVERY_MS = [14000, 28000] // by day, now and then the chicks bob up and peep: quietly, not often
  const DAY = [8.5, 18.8] // they peep only in these hours
  const BOB = 6 // how far up they bob as they peep
  const SIZE = 1.4 // drawn this much bigger than its units: small, it read as a lump of moss
  const ALARM_MS = 1100 // trembling this often while danger is near…
  const ALARM_PEEPS = 3 // …peeping the alarm only the first few times: then quiet (calm first)
  const DIM = 0.5 // no chirping in a light this low (an eclipse), as the spring's life
  const TREMBLE_MS = 180 // one tremble, side to side

  const random = Debug.random('meadow-nest') // its own stream: it doesn't shift the rest of the play
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    parent.appendChild(e)
    return e
  }
  let chicks = null
  let nest = null // the nest's group: tappable while an encounter is about it (mark)
  let alarmed = false
  let alarm = null // the alarm peeps' timer
  let hourNow = () => 12

  function draw(into) {
    const g = (nest = el('g', { class: 'nest', transform: `translate(${AT.x} ${AT.y}) scale(${SIZE}) translate(${-AT.x} ${-AT.y})` }, into))
    // the chicks first, behind the nest's front rim
    chicks = el('g', { class: 'chicks' }, g)
    for (const [dx, tilt] of [[-18, -10], [0, 0], [18, 10]]) {
      const c = el('g', { transform: `translate(${AT.x + dx} ${AT.y - 14}) rotate(${tilt})` }, chicks)
      el('circle', { cx: 0, cy: 0, r: 9, fill: '#8d8478', stroke: INK, 'stroke-width': 2 }, c)
      el('path', { d: 'M-4 -9 l-2 -6 M1 -9 l1 -7 M5 -8 l3 -5', stroke: INK, 'stroke-width': 1.5 }, c) // fluff
      el('circle', { cx: -3, cy: -2, r: 1.8, fill: INK }, c)
      el('path', { d: 'M1 1 l9 -2 l-8 6 z', fill: '#f2a83a', stroke: INK, 'stroke-width': 1.2 }, c) // an open beak
    }
    el('path', { d: `M${AT.x - 34} ${AT.y - 8} Q${AT.x} ${AT.y + 16} ${AT.x + 34} ${AT.y - 8} Q${AT.x} ${AT.y - 2} ${AT.x - 34} ${AT.y - 8} Z`, fill: '#7a5532', stroke: INK, 'stroke-width': 2.5 }, g)
    for (let k = 0; k < 6; k++) el('path', { d: `M${AT.x - 30 + k * 11} ${AT.y - 6} l14 ${k % 2 ? 6 : 3}`, stroke: '#5a3d22', 'stroke-width': 2 }, g) // twigs
  }

  const lift = (y, ms) => Motion.endAt(chicks, [{ transform: `translateY(${y}px)` }], { duration: ms, easing: 'ease-out' })

  /** By day, now and then: the chicks bob up and peep. */
  function chirp() {
    const h = hourNow()
    if (!alarmed && h >= DAY[0] && h < DAY[1] && World.state.light >= DIM) {
      Sound.peep()
      Debug.ignoreCut(lift(-BOB, 180).then(() => (alarmed ? null : lift(0, 260))), 'chicks peep')
    }
    Clock.after(PEEP_EVERY_MS[0] + random() * (PEEP_EVERY_MS[1] - PEEP_EVERY_MS[0]), chirp)
  }

  /** Danger near (on): up they huddle, trembling, peeping the alarm until it has gone (off). */
  function fear(on) {
    if (on === alarmed) return
    alarmed = on
    Debug.trace('chicks', { alarmed: on })
    if (alarm) alarm()
    alarm = null
    const still = () => chicks.getAnimations().forEach((a) => a.cancel()) // a tremble under way: not to shake on after this
    still()
    if (!on) return Debug.ignoreCut(Motion.endAt(chicks, [{ transform: 'translate(0px, 0px)' }], { duration: 200 }), 'chicks settle')
    let peeps = 0
    const shiver = () => {
      still()
      if (peeps++ < ALARM_PEEPS) Sound.peep()
      const frames = [{ transform: `translate(0px, ${-BOB}px)` }]
      for (let i = 0; i < 4; i++) frames.push({ transform: `translate(-2px, ${-BOB}px)` }, { transform: `translate(2px, ${-BOB}px)` })
      frames.push({ transform: `translate(0px, ${-BOB}px)` })
      Debug.ignoreCut(Motion.endAt(chicks, frames, { duration: TREMBLE_MS * 4 }), 'chicks tremble')
    }
    shiver()
    alarm = Clock.every(ALARM_MS, shiver)
  }

  /** Into `into` (the spring's layer); `hour()` says the hour, for when they peep. */
  function setup(into, hour) {
    hourNow = hour
    draw(into)
    Clock.after(PEEP_EVERY_MS[0] * random(), chirp)
  }

  /** A tap on the nest is a tap on this encounter (its name), or on nothing (null): the paint's, until its tins are down. */
  function mark(name) {
    if (name) nest.setAttribute('data-thing', name)
    else nest.removeAttribute('data-thing')
  }

  return { AT, setup, fear, mark, get alarmed() { return alarmed } }
})()
