// The poles and the bulldozer (to discover), after Krtek a buldozer, and
// Eliot's "cones", told as the film tells it (Adam, 2026-11-01: the tiny
// bulldozer far off was impossible to spot and did no harm, and birds
// carrying the poles in looked ridiculous). A rumble from off the right:
// it won't wait for a tap, so he drops what he is doing and hurries over
// to his flowers, the view taking it in with him. A big red bulldozer,
// twice his height, rolls in from off the right, as everyone comes,
// puffing, its blade shoving a heap of earth, a brown track torn in the
// grass behind it (Krtek a buldozer 4:03-4:37), and stops. From a rack on
// its back it shoots red-and-white survey poles, thwip... ka-chunk, one by
// one, in a line marching straight at his flowers: where it means to go.
// He knocks on the one by his flowers: hm? Then he looks up at the
// bulldozer and claps his hands to his face. He tugs out the
// pole nearest it and throws it like a javelin: it sails off and plants
// itself far up the hill, and the line bends away from his flowers. The
// next one too, and each time the bulldozer lurches on. Then it rolls at
// the last pole, the one by his flowers: he dives into the ground in its path and digs a pit, and
// it nose-dives in, stuck, tracks spinning (the film's pit, 4:32). While
// it is stuck he tugs at the last pole: it is stuck too, it pops, he
// tumbles over, and the pole flies off on its own and lands just where it
// should (the surprise). The bulldozer backs out and follows the bent line
// away up the hill, smaller and smaller, and he cheers. Its track, the pit
// and the heap green over in about a minute; the poles stay out.
//
// A tap on a pole or on him hurries it on; a tap elsewhere waits for the step to end, then cuts it short
// (things.js): a pole in his hands is stood up where he is, the bulldozer
// stands where it was going, and the next tap carries on with it.

/* global Clock, Debug, Friends, Layout, Mole, Motion, Sound, Things */
;(() => {
  const Y = Layout.GROUND
  // the line as the bulldozer shoots it, from just ahead of it to by his flowers...
  const LINE = [1760, 1520, 1330]
  // ...and where they land when thrown: away up the hill, smaller with distance
  // (left of the spring's rock, or right of it, never behind it)
  const FAR = [{ x: 1500, y: 596, s: 0.38 }, { x: 1640, y: 606, s: 0.46 }, { x: 1975, y: 640, s: 0.62 }]
  const SHOOT_EVERY_MS = 700 // the bulldozer shoots a pole this often…
  const SHOOT_MS = 750 // …each flying this long
  const RACK = { x: 22, y: -96 } // where they fly from: the rack on its back (its units)
  const THROW_MS = 900
  // the bulldozer: big in front, coming from off the right to the line's far end, lurching on as
  // each pole goes, then at the last pole into the pit; away up the hill it goes small, behind the meadow
  // (twice his height, as the film's towers over him: at 2, and at 3.2, it stood no taller than him)
  const DOZER = { s: 5.2, stop: 2340, lurch: 70, from: 2700, comeMs: 4200, away: { x: 1450, y: 588, s: 0.3 } }
  const NOSE = 94 * DOZER.s // from the bulldozer's middle to its blade's edge, drawn at its size
  const PIT_X = 1600 // where he digs the pit, in its path: between the bulldozer and the last pole, by his flowers
  const DIVE = { deg: -9, dy: 8 } // nose down into the pit (at its size, a few degrees take the blade well down)
  const HEAP = [0.45, 0.75] // the earth it shoves grows from this to this as it comes (bigger, it buried him)
  const SCAR_MS = 60000 // its track, the pit and the heap green over in about a minute
  const EARTH = '#5b3a1c'
  const TRAIL_H = 6 // its torn-up track, this high in its units
  const WATCH_X = Layout.BED.to - 40 // he hurries over to his flowers to see what is coming

  const poles = [] // { node, x, y, s, where: 'line' | 'carried' | 'far' }
  let dozer = null
  const state = { x: 0, stuck: false, pit: false } // the bulldozer's place and whether it is in the pit
  const scars = [] // its track, the pit and the heap, left behind on the meadow
  const m = () => Things.meadow
  const el = (...args) => m().el(...args)

  /** A pole, drawn standing with its point at 0,0: red and white bands, 170 high. */
  function drawPole() {
    const g = el('g', { class: 'pole-shape' })
    el('path', { d: 'M-7 -170 h14 v160 l-7 12 l-7 -12 z', fill: '#fff', stroke: '#15140f', 'stroke-width': 3 }, g)
    for (let i = 0; i < 5; i++) el('rect', { x: -7, y: -170 + i * 32, width: 14, height: 16, fill: '#d8322b' }, g)
    return g
  }

  /** The bulldozer, after the film's (4:03-4:37): a big rounded red hull with rivets and a grille, a
   * lilac blade shoving a heap of earth, tracks with white-ringed wheels, smoke from its pipe, and the
   * brown track it tears in the grass trailing behind it. Facing left, its tracks on the ground at 0, 0. */
  function drawDozer() {
    const g = el('g', { class: 'dozer' }, document.getElementById('things'))
    const ink = { stroke: '#15140f', 'stroke-width': 3, 'stroke-linejoin': 'round' }
    el('rect', { class: 'trail', x: 50, y: -TRAIL_H / 2, width: 1600, height: TRAIL_H, fill: EARTH, opacity: 0.9 }, g) // torn up behind it
    const heap = el('g', { class: 'heap' }, g)
    heap.style.transformOrigin = '-92px 0px'
    heap.style.transform = `scale(${HEAP[0]})`
    el('path', { d: 'M-92 2 C-100 -40 -150 -46 -170 2 Z', fill: '#7a4f26', ...ink }, heap)
    for (const [cx, cy, r] of [[-110, -14, 5], [-130, -26, 4], [-150, -10, 5], [-122, -6, 3], [-140, -34, 3]]) el('circle', { cx, cy, r, fill: '#3e2810' }, heap)
    const body = el('g', { class: 'hull' }, g)
    body.style.transformOrigin = '60px 0px' // it tips about its back end: nose down into the pit
    el('path', { d: 'M-60 -40 L-88 -46 L-94 2 L-62 -2 Z', fill: '#a9a3d6', ...ink }, body) // the blade
    el('path', { d: 'M-56 -24 L-56 -52 Q-50 -80 -8 -82 L38 -82 Q60 -80 60 -52 L60 -24 Z', fill: '#e8562a', ...ink }, body)
    el('rect', { x: -56, y: -62, width: 16, height: 34, fill: '#c23f1c', ...ink, 'stroke-width': 2 }, body) // the grille
    for (const x of [-52, -48, -44]) el('path', { d: `M${x} -58 v26`, stroke: '#15140f', 'stroke-width': 2 }, body)
    el('rect', { x: -26, y: -74, width: 44, height: 7, rx: 3, fill: '#2b2b2b' }, body) // a slit of a window
    for (const [x, y] of [[-34, -44], [-14, -44], [6, -44], [26, -44], [46, -44], [-30, -60], [30, -60]]) el('circle', { cx: x, cy: y, r: 2.2, fill: '#15140f' }, body)
    el('rect', { x: 28, y: -102, width: 8, height: 22, fill: '#2b2b2b' }, body)
    const puffs = el('g', { class: 'puffs' }, body)
    for (let i = 0; i < 3; i++) el('circle', { class: `puff p${i}`, cx: 32, cy: -110, r: 9, fill: '#9aa0a6' }, puffs)
    const rack = el('g', { class: 'rack' }, body) // the poles it shoots, lying ready on its back
    el('rect', { x: -6, y: -90, width: 40, height: 8, fill: '#6b6b6b', ...ink, 'stroke-width': 2 }, rack)
    for (let i = 0; i < LINE.length; i++) {
      const r = el('g', { class: 'ready', transform: `translate(${2 + i * 9} -90) rotate(-62)` }, rack)
      el('rect', { x: -2, y: -34, width: 4, height: 34, fill: '#fff', stroke: '#15140f', 'stroke-width': 1 }, r)
      for (let k = 0; k < 3; k++) el('rect', { x: -2, y: -34 + k * 12, width: 4, height: 6, fill: '#d8322b' }, r)
    }
    const track = el('g', { class: 'track' }, body)
    el('rect', { x: -62, y: -26, width: 124, height: 26, rx: 13, fill: '#2b2b2b', ...ink }, track)
    for (const cx of [-44, -15, 15, 44]) {
      el('circle', { cx, cy: -13, r: 10, fill: '#fbf8ef', stroke: '#15140f', 'stroke-width': 2 }, track)
      el('circle', { cx, cy: -13, r: 4.5, fill: '#e8562a' }, track)
    }
    return g
  }

  /** The bulldozer at x, stood there (its end, before any animation to it, so a cut leaves it there). */
  const dozerAt = (x, y = Y + 4, s = DOZER.s) => `translate(${x}px, ${y}px) scale(${s})`

  /** It rolls (rumbling, the heap growing a little) from where it is drawn to x. */
  async function roll(x, ms) {
    const from = state.x
    if (from === x) return // there already (a step cut short and played again)
    state.x = x
    m().frame(x) // kept in sight with him
    Sound.rumble(ms / 1000)
    const grow = Math.min(HEAP[1], HEAP[0] + (DOZER.from - x) / 3000)
    await Promise.all([
      Motion.endAt(dozer, [{ transform: dozerAt(from) }, { transform: dozerAt(x) }], { duration: ms, easing: 'ease-in-out' }),
      Motion.endAt(dozer.querySelector('.heap'), [{ transform: `scale(${grow})` }], { duration: ms }),
    ])
  }

  /** Stand pole i at x, y at scale s (1: in front, by him; less: far away up the hill). */
  function stand(p, x, y, s, layer) {
    Object.assign(p, { x, y, s })
    p.wrap.style.transform = `translate(${x}px, ${y}px) scale(${s})`
    p.wrap.style.visibility = '' // shot, or (cut short) planted at once
    p.wrap.appendChild(p.node)
    document.getElementById(layer).appendChild(p.wrap)
  }

  /** The bulldozer, from off the right, rolls in and stops at the line. */
  function drive() {
    dozer = drawDozer()
    syncRack() // poles a cut planted already are off its rack
    state.x = Friends.offscreen(1, DOZER.from) + NOSE // its blade out of sight too
    dozer.style.transform = dozerAt(state.x)
    Debug.trace('bulldozer')
    return roll(DOZER.stop, DOZER.comeMs)
  }

  /** It shoots pole p from its rack, thwip: it arcs over and sticks in at x, ka-chunk. */
  async function shoot(p, x, i) {
    const from = { x: state.x + RACK.x * DOZER.s, y: Y + 4 + RACK.y * DOZER.s }
    stand(p, x, Y + 4, 1, 'things')
    syncRack()
    Sound.whoosh()
    await Motion.endAt(p.wrap, [
      { transform: `translate(${from.x}px, ${from.y}px) scale(0.6) rotate(70deg)` },
      { transform: `translate(${(from.x + x) / 2}px, ${Math.min(from.y, Y) - 180}px) scale(0.85) rotate(20deg)`, offset: 0.5 },
      { transform: `translate(${x}px, ${Y + 4}px) scale(1) rotate(0deg)` },
    ], { duration: SHOOT_MS, easing: 'ease-in' })
    Sound.plink()
  }

  /** It arrives: a rumble from off the right. The poles wait, unseen, to be shot; it won't wait for a
   * tap (urgent): he breaks off and hurries over to see. */
  function appear() {
    LINE.forEach((x) => {
      const wrap = el('g', { class: 'thing pole', 'data-thing': 'poles' })
      const p = { node: drawPole(), wrap, where: 'line' }
      poles.push(p)
      stand(p, x, Y + 4, 1, 'things') // where it ends, so a cut (restore) leaves it planted…
      wrap.style.visibility = 'hidden' // …until it is shot
    })
    Sound.rumble(1.2) // short: over before it rolls in, so it doesn't swallow that rumble
  }

  /** The rack on its back shows the poles still to be shot (a cut plants them all at once). */
  function syncRack() {
    if (dozer) dozer.querySelectorAll('.ready').forEach((r, i) => { r.style.display = poles[i].wrap.style.visibility === 'hidden' ? '' : 'none' })
  }

  // ------------------------------------------------------------ the chain

  /** He hurries over to his flowers; the bulldozer rolls in and shoots its line of poles at them. */
  async function comesIn(alive) {
    await m().goTo(WATCH_X)
    if (!alive()) return
    Mole.lookAt(DOZER.stop)
    m().frame(DOZER.stop) // the view between him and it, so the child sees it come
    if (!dozer) await drive()
    if (!alive()) return
    for (const [i, p] of poles.entries()) {
      if (p.wrap.style.visibility !== 'hidden') continue // shot already (a cut, then this again)
      await Clock.wait(i ? SHOOT_EVERY_MS : 300)
      if (!alive()) return
      await shoot(p, LINE[i], i)
      if (!alive()) return
    }
  }

  /** He knocks on the pole by his flowers: hm? Then he looks up at the bulldozer, puffing at the end of
   * the line, and claps his hands to his face. */
  async function notice(alive) {
    const p = poles[poles.length - 1]
    if (dozer) m().frame(state.x)
    await m().goTo(p.x - 60)
    if (!alive()) return
    Sound.knock()
    await Mole.knock()
    if (!alive()) return
    Sound.say('hm')
    await Mole.lean(10, 800)
    if (!alive()) return
    Mole.lookAt(state.x)
    Sound.rumble(1.2)
    Sound.say(['gasp', 'fright'])
    await Mole.handsToFace(700)
    if (!alive()) return
    Sound.say('achJo')
  }

  /** As a pole goes, the bulldozer lurches on along the line. */
  async function lurch(alive, n) {
    if (!alive() || state.stuck) return
    await roll(Math.min(state.x, DOZER.stop - n * DOZER.lurch), 900)
  }

  /** It rolls at the last pole: he dives into the ground in its path and digs a pit, and it nose-dives in. */
  async function pit(alive) {
    if (state.stuck) return
    m().frame(state.x)
    if (!state.pit) {
      await m().goTo(PIT_X)
      if (!alive()) return
      Sound.say('hm') // an idea
      Sound.dig()
      await Mole.goDown()
      if (!alive()) return
      dig()
      Sound.dig()
      await Mole.tunnelTo(PIT_X - 320) // out of its way, by the last pole
      if (!alive()) return
      Sound.pop()
      await Mole.comeUp('out')
      if (!alive()) return
    }
    Mole.lookAt(PIT_X)
    await roll(PIT_X + NOSE, 2200)
    if (!alive()) return
    state.stuck = true
    Debug.trace('bulldozer stuck')
    Sound.clunk()
    await Motion.endAt(dozer.querySelector('.hull'), [{ transform: `rotate(${DIVE.deg}deg) translateY(${DIVE.dy}px)` }], { duration: 380, easing: 'ease-in' })
    if (!alive()) return
    dozer.classList.add('stuck') // tracks spinning, puffing hard (game.css)
    Sound.rumble(1.6)
    Sound.say('giggle')
    await Mole.cheer()
  }

  /** The pit, dug where he went down: earth flies, and a dark hole opens in the grass. */
  function dig() {
    state.pit = true
    const layer = document.getElementById('things')
    const hole = el('ellipse', { class: 'pit', cx: PIT_X, cy: Y + 6, rx: 120, ry: 16, fill: '#2b1b0b', stroke: '#15140f', 'stroke-width': 3 }, layer)
    layer.insertBefore(hole, layer.firstChild) // in the grass, under the pole and the bulldozer
    scars.push(hole)
    Debug.ignoreCut(Motion.endAt(hole, [{ transform: 'scaleX(0.1)' }, { transform: 'scaleX(1)' }], { duration: 400, easing: 'ease-out' }), 'the pit opens')
    hole.style.transformBox = 'fill-box'
    hole.style.transformOrigin = 'center'
    const drops = document.getElementById('drops')
    for (let i = 0; i < 8; i++) {
      const d = el('circle', { r: 6 + (i % 3) * 3, fill: '#6e4a24' }, drops)
      const a = Math.PI * (0.15 + (0.7 * i) / 7)
      Motion.endAt(d, [{ transform: `translate(${PIT_X}px, ${Y}px)` }, { transform: `translate(${PIT_X + Math.cos(a) * 130}px, ${Y - Math.sin(a) * 120}px)`, opacity: 0 }], { duration: 700, easing: 'ease-out' }).then(() => d.remove(), () => d.remove())
    }
  }

  /** Over to pole k (from the bulldozer's end: the last, k 2, is the one by his flowers), a tug or two,
   * up over his head, and away it sails. Gone already (its step cut short after, and played again): nothing. */
  async function sendAway(alive, k, stuck = false) {
    const p = poles[k]
    const far = FAR[k]
    if (p.where === 'far') return
    if (p.where === 'line') {
      await m().goTo(p.x - 50)
      if (!alive()) return
      Mole.feel('squeezed', stuck ? 1900 : 900) // an effort: eyes shut tight, mouth pinched (Krtek a autíčko 11:44.5)
      for (let i = 0; i < (stuck ? 3 : 1); i++) {
        Sound.tug()
        await Mole.lean(-16, stuck ? 600 : 800)
        if (!alive()) return
      }
      if (stuck) {
        // it pops out of the ground, he tumbles over backwards, and it flies off by itself
        Sound.pop()
        Sound.say(['gasp', 'fright'])
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

  /** It backs out of the pit and follows the bent line away up the hill, smaller and smaller; it leaves
   * its track, the pit and its heap, which green over. */
  async function away(alive) {
    if (!dozer) return
    if (state.stuck) {
      dozer.classList.remove('stuck')
      Sound.rumble(1)
      await Motion.endAt(dozer.querySelector('.hull'), [{ transform: 'rotate(0deg) translateY(0px)' }], { duration: 600, easing: 'ease-out' })
      state.stuck = false
      if (!alive()) return
    }
    leaveScars()
    const a = DOZER.away
    const mid = { x: (state.x + a.x) / 2 + 120, y: (Y + 4 + a.y) / 2, s: (DOZER.s + a.s) / 2 }
    Sound.rumble(4)
    const cheering = (async () => {
      await Mole.cheer()
      if (alive()) await Mole.cheer()
    })()
    await Motion.endAt(dozer, [{ transform: dozerAt(state.x) }, { transform: dozerAt(mid.x, mid.y, mid.s) }], { duration: 2000, easing: 'ease-in' })
    if (alive()) {
      document.getElementById('far-things').appendChild(dozer) // up the hill now: behind the meadow
      await Motion.endAt(dozer, [{ transform: dozerAt(mid.x, mid.y, mid.s) }, { transform: dozerAt(a.x, a.y, a.s), opacity: 0 }], { duration: 2400, easing: 'ease-out' })
    }
    await cheering
    if (!alive()) return
    dozer.remove()
    dozer = null
    m().frame(null)
    for (const p of poles) p.wrap.removeAttribute('data-thing') // done: they're the meadow's now
  }

  /** What it tore up stays where it was, on the meadow, and greens over. */
  function leaveScars() {
    if (!dozer.querySelector('.trail')) return // left already (away cut short and played again)
    const layer = document.getElementById('things')
    const trail = el('rect', { x: state.x + 50 * DOZER.s, y: Y - 1, width: Layout.WORLD_W, height: TRAIL_H * DOZER.s, fill: EARTH, opacity: 0.9 }, layer)
    layer.insertBefore(trail, layer.firstChild) // under everything standing there
    scars.push(trail)
    dozer.querySelector('.trail').remove()
    const heap = dozer.querySelector('.heap')
    const left = el('g', { transform: `translate(${state.x} ${Y + 4}) scale(${DOZER.s})` }, layer)
    left.appendChild(heap) // its heap stays by the pit
    scars.push(left)
    for (const sc of scars) Debug.ignoreCut(Motion.endAt(sc, [{ opacity: 1 }, { opacity: 0 }], { duration: SCAR_MS }).then(() => sc.remove()), 'it greens over')
  }

  /** Where a dropped pole can stand by him without standing on another. */
  function freeSpot(x) {
    const { from, to } = Layout.DIG
    x = Math.min(to, Math.max(from, x))
    for (let tries = 0; tries < 8 && poles.some((p) => p.where === 'line' && Math.abs(p.x - x) < 60); tries++) x = Math.max(from, x - 70)
    return x
  }

  /** Cut short: a pole in his hands stands up by him; one in the air lands; the bulldozer stands where it was going, on the meadow, in the pit if it was stuck. */
  function restore() {
    m().frame(null) // he may go anywhere now: the view follows him
    for (const p of poles) p.wrap.getAnimations().forEach((a) => a.cancel())
    for (const p of poles) {
      if (p.where === 'line') stand(p, p.x, p.y, p.s, 'things') // planted, not in mid-air where its flight was cut short
      if (p.where === 'far') stand(p, p.x, p.y, p.s, 'far-things')
      if (p.where !== 'carried') continue
      Mole.carry(null)
      p.node.style.transform = ''
      p.where = 'line'
      stand(p, freeSpot(Mole.state.x + 40), Y + 4, 1, 'things')
    }
    if (dozer) {
      for (const e of [dozer, ...dozer.querySelectorAll('.heap, .hull')]) e.getAnimations().forEach((a) => a.cancel())
      dozer.style.opacity = ''
      document.getElementById('things').appendChild(dozer) // back on the meadow, where it was going
      dozer.style.transform = dozerAt(state.x)
      dozer.querySelector('.hull').style.transform = state.stuck ? `rotate(${DIVE.deg}deg) translateY(${DIVE.dy}px)` : ''
      dozer.classList.toggle('stuck', state.stuck) // puffing hard in the pit, even if cut before it started
      syncRack()
    }
  }

  function night() {
    restore()
    if (dozer) dozer.remove()
    dozer = null
    for (const sc of scars.splice(0)) sc.remove() // a new day: the meadow green again
  }

  Things.add({
    name: 'poles',
    offer: 'discover',
    urgent: true, // a bulldozer won't wait for a tap: he goes to see at once (things.js)
    engageMs: 3000, // when it can't break off his play (still waking), he goes to see soon: nothing shows till he does
    music: { 1: 'sad' }, // the bulldozer rolls at his flowers, and he sighs (happy as it goes)
    appear,
    steps: [
      comesIn,
      notice,
      async (alive) => { await sendAway(alive, 0); await lurch(alive, 1) },
      async (alive) => { await sendAway(alive, 1); await lurch(alive, 2) },
      pit,
      (alive) => sendAway(alive, 2, true),
      away,
    ],
    restore,
    night,
    detail: () => ({ poles: poles.map((p) => p.where), dozer: !!dozer, stuck: state.stuck, pit: state.pit, cast: [] }),
  })
})()
