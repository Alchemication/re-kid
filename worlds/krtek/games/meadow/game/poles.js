// The poles (to discover), after Krtek a buldozer, and Eliot's "cones":
// far off on the hill a little bulldozer comes puffing, and bullfinches (the
// film's birds) fly in one after another, each with a red-and-white survey
// pole in its feet, and drop it so it plants itself, in a line that runs
// straight at his flowers; then off they fly (nothing falls from the sky
// by itself: Adam, 2026-10-23). He knocks on the nearest and sighs. Then he tugs it out
// and throws it like a javelin: it sails off and plants itself far away on
// the hill, and the line bends away from his flowers. The next one too.
// The last is stuck: he tugs and tugs, it pops, he tumbles over, and the
// pole flies off on its own and lands just where it should (the surprise).
// The bulldozer follows the bent line away into the distance, and he
// cheers. The poles stay out for the rest of the day.
//
// A tap on a pole or on him hurries it on; a tap elsewhere waits for the step to end, then cuts it short
// (things.js): a pole in his hands is stood up where he is, and the next
// tap carries on with it.

/* global Clock, Debug, Friends, Layout, Mole, Motion, Sound, Things */
;(() => {
  const Y = Layout.GROUND
  // the line as planted, from the far right edge to just by his flowers...
  const LINE = [2000, 1760, 1520, 1330]
  // ...and where the three nearest land when thrown: away up the hill, smaller with distance
  // (left of the spring's rock, or right of it, never behind it)
  const FAR = [{ x: 1500, y: 596, s: 0.38 }, { x: 1640, y: 606, s: 0.46 }, { x: 1975, y: 640, s: 0.62 }]
  const PLANT_EVERY_MS = 650
  const THROW_MS = 900
  const DOZER = { from: 2600, at: 2150, y: 598, away: { x: 1450, y: 588, s: 0.3 } }

  const FLY_MS = 1500 // a bird flying in with its pole…
  const HIGH = Y - 330 // …from this high…
  const DROP_AT = Y - 250 // …to over its spot, where it lets go
  const HANG = 182 // the pole hangs this far under the bird (its top in the bird's feet)

  const poles = [] // { node, x, y, s, where: 'line' | 'carried' | 'far' }
  const flock = Friends.troupe() // the birds bringing them: not the encounter's cast
  let dozer = null
  const m = () => Things.meadow
  const el = (...args) => m().el(...args)

  /** A pole, drawn standing with its point at 0,0: red and white bands, 170 high. */
  function drawPole() {
    const g = el('g', { class: 'pole-shape' })
    el('path', { d: 'M-7 -170 h14 v160 l-7 12 l-7 -12 z', fill: '#fff', stroke: '#15140f', 'stroke-width': 3 }, g)
    for (let i = 0; i < 5; i++) el('rect', { x: -7, y: -170 + i * 32, width: 14, height: 16, fill: '#d8322b' }, g)
    return g
  }

  function drawDozer() {
    const g = el('g', { class: 'dozer' }, document.getElementById('far-things'))
    el('rect', { x: -40, y: -46, width: 64, height: 30, rx: 4, fill: '#e2762a', stroke: '#15140f', 'stroke-width': 3 }, g)
    el('rect', { x: -20, y: -70, width: 30, height: 26, fill: '#e2762a', stroke: '#15140f', 'stroke-width': 3 }, g)
    el('rect', { x: -14, y: -64, width: 18, height: 14, fill: '#cfe3f7' }, g)
    el('path', { d: 'M-60 -8 l10 -40 h8 v42 z', fill: '#9a9a9a', stroke: '#15140f', 'stroke-width': 3 }, g)
    el('rect', { x: -44, y: -18, width: 72, height: 18, rx: 9, fill: '#2b2b2b' }, g)
    for (const cx of [-34, -14, 6, 20]) el('circle', { cx, cy: -9, r: 5, fill: '#6b6b6b' }, g)
    el('rect', { x: 10, y: -86, width: 6, height: 18, fill: '#2b2b2b' }, g)
    const puffs = el('g', { class: 'puffs' }, g)
    for (let i = 0; i < 3; i++) el('circle', { class: `puff p${i}`, cx: 13, cy: -94, r: 8, fill: '#9aa0a6' }, puffs)
    return g
  }

  /** Stand pole i at x, y at scale s (1: in front, by him; less: far away up the hill). */
  function stand(p, x, y, s, layer) {
    Object.assign(p, { x, y, s })
    p.wrap.style.transform = `translate(${x}px, ${y}px) scale(${s})`
    p.wrap.appendChild(p.node)
    document.getElementById(layer).appendChild(p.wrap)
  }

  /** A bird flies in from off to the right with pole p, lets go over its spot (it plants itself), and flies off. */
  async function bring(p, x, i) {
    await Clock.wait(i * PLANT_EVERY_MS)
    const from = Friends.offscreen(1, x + 700)
    const bird = flock.call('bullfinch', from, -1)
    bird.g.classList.add('flying')
    const at = (bx, by) => [{ transform: `translate(${bx}px, ${by}px)` }, { transform: `translate(${bx}px, ${by + HANG}px) scale(1)` }]
    const [b0, p0] = at(from, HIGH)
    const [b1, p1] = at(x, DROP_AT)
    try {
      await Promise.all([Motion.endAt(bird.g, [b0, b1], { duration: FLY_MS, easing: 'ease-out' }), Motion.endAt(p.wrap, [p0, p1], { duration: FLY_MS, easing: 'ease-out' })])
      Motion.endAt(p.wrap, [p1, { transform: `translate(${x}px, ${Y + 4}px) scale(1)` }], { duration: 260, easing: 'ease-in' }).then(() => Sound.plink(), () => 'cut: it stands where it ends')
      const away = Friends.offscreen(1, x + 600)
      await Motion.endAt(bird.g, [b1, { transform: `translate(${away}px, ${HIGH - 120}px)` }], { duration: FLY_MS, easing: 'ease-in' })
    } catch {
      // bedtime came first: the birds are gone, and the poles stand in their line (restore)
    }
    if (bird.g.isConnected) bird.gone() // flown off out of sight (friends.js checks it is)
  }

  function appear() {
    dozer = drawDozer()
    const from = Friends.offscreen(1, DOZER.from) // up on the hill, coming from beyond the view
    dozer.style.transform = `translate(${from}px, ${DOZER.y}px) scale(0.55)`
    Motion.endAt(dozer, [{ transform: `translate(${DOZER.at}px, ${DOZER.y}px) scale(0.55)` }], { duration: 3500, easing: 'ease-out' }).catch(() => 'cut: it shows where it stopped')
    Sound.rumble(3.5)
    LINE.forEach((x, i) => {
      const wrap = el('g', { class: 'thing pole', 'data-thing': 'poles' })
      const p = { node: drawPole(), wrap, where: 'line' }
      poles.push(p)
      stand(p, x, Y + 4, 1, 'things') // where it ends: the bird brings it there, from the far end towards his flowers
      wrap.style.transform = `translate(${Friends.offscreen(1, x + 700)}px, ${HIGH + HANG}px) scale(1)` // until its bird comes
      Debug.ignoreCut(bring(p, x, i), 'a bird brings a pole')
    })
  }

  /** The nearest pole he hasn't sent away yet, and its place far off. */
  const next = () => {
    const i = [3, 2, 1].findIndex((k) => poles[k].where !== 'far')
    return i === -1 ? null : { p: poles[[3, 2, 1][i]], far: FAR[i] }
  }

  // ------------------------------------------------------------ the chain

  /** He finds the pole by his flowers: knock knock, a sigh. */
  async function notice(alive) {
    const p = poles[3]
    await m().goTo(p.x - 60)
    if (!alive()) return
    Sound.knock()
    await Mole.knock()
    if (!alive()) return
    await Mole.lean(10, 800)
    if (!alive()) return
    Sound.say('achJo')
  }

  /** Over to it, a tug or two, up over his head, and away it sails. */
  async function sendAway(alive, stuck = false) {
    const n = next()
    if (!n) return
    const { p, far } = n
    if (p.where === 'line') {
      await m().goTo(p.x - 50)
      if (!alive()) return
      for (let i = 0; i < (stuck ? 3 : 1); i++) {
        Sound.tug()
        await Mole.lean(-16, stuck ? 600 : 800)
        if (!alive()) return
      }
      if (stuck) {
        // it pops out of the ground, he tumbles over backwards, and it flies off by itself
        Sound.pop()
        Sound.say('fright')
        await Promise.all([fly(p, far, { x: p.x, y: Y - 80 }, 720), Mole.lean(-55, 1100)])
        if (!alive()) return
        Sound.say('giggle')
        return
      }
      p.where = 'carried'
      p.wrap.remove()
      p.node.style.transform = 'rotate(80deg) translate(0px, 85px)'
      Mole.carry(p.node)
    }
    await Mole.wobble(600)
    if (!alive()) return
    Sound.whoosh()
    Mole.carry(null)
    await fly(p, far, Mole.head())
  }

  /** The pole sails from `from` (his hands, or where it stood) to `far`, in front of everything, and plants itself there, away up the hill. */
  async function fly(p, far, from, spin = 0) {
    const { x, y } = from
    p.node.style.transform = ''
    p.where = 'far'
    p.wrap.removeAttribute('data-thing') // far off, it is the hill's: a tap there is a tap on the meadow
    stand(p, far.x, far.y, far.s, 'things')
    await Motion.endAt(p.wrap, [
      { transform: `translate(${x}px, ${y}px) scale(1) rotate(${70 + spin}deg)` },
      { transform: `translate(${(x + far.x) / 2}px, ${Math.min(y, far.y) - 260}px) scale(${(1 + far.s) / 2}) rotate(${20 + spin / 2}deg)`, offset: 0.5 },
      { transform: `translate(${far.x}px, ${far.y}px) scale(${far.s}) rotate(0deg)` },
    ], { duration: THROW_MS, easing: 'ease-in' })
    stand(p, far.x, far.y, far.s, 'far-things') // landed: behind the meadow's front, up on the hill
    Sound.plink()
    Debug.trace('pole far', { x: far.x })
  }

  /** The bulldozer follows the bent line away into the distance. */
  async function away(alive) {
    Sound.rumble(4)
    const a = DOZER.away
    await Promise.all([
      Motion.endAt(dozer, [{ transform: `translate(${DOZER.at}px, ${DOZER.y}px) scale(0.55)` }, { transform: `translate(${(DOZER.at + a.x) / 2 + 80}px, ${DOZER.y - 6}px) scale(0.45)`, offset: 0.5 }, { transform: `translate(${a.x}px, ${a.y}px) scale(${a.s})`, opacity: 0 }], { duration: 4200, easing: 'ease-in-out' }),
      (async () => {
        await Mole.cheer()
        if (alive()) await Mole.cheer()
      })(),
    ])
    if (!alive()) return
    dozer.remove()
    dozer = null
    for (const p of poles) p.wrap.removeAttribute('data-thing') // done: they're the meadow's now
  }

  /** Where a dropped pole can stand by him without standing on another. */
  function freeSpot(x) {
    const { from, to } = Layout.DIG
    x = Math.min(to, Math.max(from, x))
    for (let tries = 0; tries < 8 && poles.some((p) => p.where === 'line' && Math.abs(p.x - x) < 60); tries++) x = Math.max(from, x - 70)
    return x
  }

  /** Cut short: a pole in his hands stands up by him; one in the air lands; the bulldozer, if it was driving off, is back on the hill. */
  function restore() {
    for (const p of poles) p.wrap.getAnimations().forEach((a) => a.cancel())
    for (const p of poles) {
      if (p.where === 'line') stand(p, p.x, p.y, p.s, 'things') // planted, not hanging where a bird was cut short
      if (p.where === 'far') stand(p, p.x, p.y, p.s, 'far-things')
      if (p.where !== 'carried') continue
      Mole.carry(null)
      p.node.style.transform = ''
      p.where = 'line'
      stand(p, freeSpot(Mole.state.x + 40), Y + 4, 1, 'things')
    }
    if (dozer) {
      dozer.getAnimations().forEach((a) => a.cancel())
      dozer.style.opacity = ''
      dozer.style.transform = `translate(${DOZER.at}px, ${DOZER.y}px) scale(0.55)`
    }
  }

  function night() {
    flock.dismissAll(true) // bedtime: the birds gone, under the closing circle
    restore()
    if (dozer) dozer.remove()
    dozer = null
  }

  Things.add({
    name: 'poles',
    offer: 'discover',
    music: { 0: 'sad' }, // the line runs at his flowers, and he sighs (happy as the bulldozer goes)
    appear,
    steps: [notice, (alive) => sendAway(alive), (alive) => sendAway(alive), (alive) => sendAway(alive, true), away],
    restore,
    night,
    detail: () => ({ poles: poles.map((p) => p.where), dozer: !!dozer, cast: [] }),
  })
})()
