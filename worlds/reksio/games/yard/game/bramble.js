// The blackberry bramble by the wall. Reksio nips a berry off, flicks it up
// high and catches it (or, the variation, misses and gobbles it off the
// ground).
//
// His tail caught in it: the variation, the first time and then every other
// one (not in the rain: no bee would come), or once a play when left alone
// (`helped`, yard.js). Pleased after a berry, he turns his back to the bush and
// wags, and a cane sticking out with a flower on it catches his tail. He sets
// off and is yanked back, strains and is snapped back onto his bottom, and
// sits glum; a tap is another try. Then a bumblebee comes for the flower by
// his tail. He hears it, freezes, looks round, and leaps up in fright, which
// tears his tail free. The bee never noticed: it is busy with its flower. He
// checks his tail is all there, and wags.

/* global Clock, Debug, Motion, Layout, Sound, Music, Reksio, Creatures, Weather, Figure, Bird */
/* exported Bramble */
const Bramble = (() => {
  // Berries on the bramble, as drawn; the ones nearest Reksio (on the left,
  // where he stands) go first.
  const ON_BUSH = [[2418, 758], [2436, 718], [2462, 686], [2500, 676], [2470, 744], [2540, 668], [2512, 728], [2582, 684], [2556, 742], [2612, 722], [2628, 760]]
  const BERRY_SCALE = 1.7 // on the bush
  const FLYING_BERRY = 2.2 // bigger in the air, so the child can follow it
  const TOSS_UP = 300 // how high he flicks a berry above his nose
  const CATCH_HOP = 60 // and how high he jumps to catch it
  const STANDS = 2380 // caught: where he stands, his back to the bush, as drawn (his tail's tip lands on the snag)
  const SNAG = { x: 2422, y: 702 } // the tip of the cane that catches his tail, as drawn (index.html #snag)
  const FLOWER = { x: 2440, y: 668 } // where the bee hovers over the cane's flower
  const BEHIND = 46 // …and then right behind him, by his bottom (scene units)
  const BEE_COMES_MS = [4500, 6500] // sitting glum this long before the bee comes: long enough to see him stuck, and for a tap or two
  const TRY_GAP_MS = 900 // taps faster than this while caught don't each start a try: one try at a time
  const SHARE_NEAR = 600 // he flicks a berry up to the bird only if it sits this near: on screen, to see it caught
  const LEAP = 160 // how far forward the fright throws him

  const SVG_NS = 'http://www.w3.org/2000/svg'
  const $ = (id) => document.getElementById(id)
  const X = () => Layout.x('berries')
  const wait = Clock.wait
  const random = Debug.random('bramble') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)
  let fx = { burst: () => {} } // effects, from things.js
  let hold = () => {} // from things.js: hold(answer) makes every tap his answer, hold(null) lets go
  let onBush = []
  let caughtTimes = 0
  const owed = [] // variations the first catch stood in for: played when the pool next says 'caught'

  function makeBerries() {
    const bush = $('berry-bush')
    onBush = ON_BUSH.map(([x, y]) => {
      const u = document.createElementNS(SVG_NS, 'use')
      u.setAttribute('href', '#berry')
      u.setAttribute('transform', `translate(${x} ${y}) scale(${BERRY_SCALE})`)
      bush.appendChild(u)
      return { x, y, el: u }
    })
  }

  /** A berry flying from (x, y) to (tx, ty), up over `up` on the way:
   * resolves when it's there; the berry stays to be removed. */
  function fly(berry, [x, y], [tx, ty], up, ms) {
    berry.style.opacity = ''
    const at = (px, py) => ({ transform: `translate(${px}px, ${py}px) scale(${FLYING_BERRY})` })
    return Motion.endAt(berry, [{ ...at(x, y), easing: 'ease-out' }, { ...at((x + tx) / 2, Math.min(y, ty) - up), offset: 0.5, easing: 'ease-in' }, at(tx, ty)], { duration: ms })
  }

  /** A berry nipped off the bush, in his mouth: its drawing, flying. */
  async function nip() {
    await Reksio.sniff(2)
    const b = onBush.shift()
    await Reksio.nod(16, 320)
    b.el.remove()
    Sound.snap()
    const berry = document.createElementNS(SVG_NS, 'use')
    berry.setAttribute('href', '#berry')
    berry.style.opacity = '0' // in his mouth, not to be seen until it flies
    $('fx').appendChild(berry)
    return berry
  }

  /** Flicked up high, and caught with a jump at the top. */
  async function flickAndCatch(berry, m) {
    const catchY = m.y - CATCH_HOP * 1.3
    Reksio.nod(-30, 380) // the flick
    Sound.toss()
    berry.style.opacity = ''
    const flightDone = Motion.endAt(
      berry,
      [{ transform: `translate(${m.x}px, ${m.y}px) scale(${FLYING_BERRY})`, easing: 'ease-out' }, { transform: `translate(${m.x + 12}px, ${m.y - TOSS_UP}px) scale(${FLYING_BERRY})`, offset: 0.55, easing: 'ease-in' }, { transform: `translate(${m.x + 4}px, ${catchY}px) scale(${FLYING_BERRY})` }],
      { duration: 1100 },
    )
    await wait(1100 - (480 + CATCH_HOP * 3) * 0.55) // jump so he's at the top as it comes down
    const jump = Reksio.hop(CATCH_HOP, 1)
    await flightDone
    berry.remove()
    Sound.snap()
    Music.react.wish()
    await jump
  }

  /** Too far: it sails over his head, and he spins round and gobbles it off the ground. */
  async function miss(berry, m) {
    Reksio.nod(-30, 380)
    Sound.toss()
    const lands = m.x - Reksio.facing * 170
    const flightDone = fly(berry, [m.x, m.y], [lands, 806], TOSS_UP, 1300)
    await wait(500)
    await Reksio.hop(CATCH_HOP, 1)
    Sound.snap() // snaps at nothing
    await flightDone
    Sound.plop()
    await Reksio.lookAround(500)
    Reksio.face(-Reksio.facing)
    await Reksio.pounce(lands)
    berry.remove()
  }

  /** Flicked up to the bird on the wall: it catches it, and chirps. */
  async function share(berry, m) {
    const to = Bird.perch
    Reksio.face(to.x > Reksio.x ? 1 : -1)
    await Reksio.lookUp(500)
    Sound.toss()
    await fly(berry, [m.x, m.y], [to.x, to.y - 10], 160, 1200)
    berry.remove()
    Sound.chirp()
    await Reksio.swish(2) // pleased with that
  }

  /** Nip a berry off, flick it up high, jump and catch it, chew, lick his
   * lips; v, the variation: miss it, share it with the bird, juggle two, or
   * catch it and find his tongue gone purple. */
  async function berryToss(v) {
    if (!onBush.length) {
      // all eaten: a puzzled sniff
      await Reksio.sniff(3)
      await Reksio.lookAround(700)
      return
    }
    const berry = await nip()
    const m = Reksio.mouth()
    if (v === 'share' && !Bird.flying && Math.abs(Bird.perch.x - Reksio.x) < SHARE_NEAR) return share(berry, m)
    if (v === 'miss' || v === 'share') await miss(berry, m)
    else if (v === 'juggle' && onBush.length) {
      // two: one up, caught, and the other straight after
      const second = await nip()
      await flickAndCatch(berry, Reksio.mouth())
      await flickAndCatch(second, Reksio.mouth())
    } else await flickAndCatch(berry, m)
    for (let i = 0; i < 3; i++) {
      Sound.munch()
      await Reksio.nod(6, 220)
    }
    if (v === 'tongue') return purpleTongue()
    await Reksio.lick()
    await wait(150)
    await Reksio.lick()
  }

  /** His tongue out to lick his lips: it's gone purple! He looks at it, and grins. */
  async function purpleTongue() {
    const rk = $('reksio')
    rk.classList.add('purple')
    try {
      await Reksio.lookAtTongue()
    } finally {
      rk.classList.remove('purple')
    }
  }

  /** The thorny tip of the cane, drawn over his tail's tip (he is drawn in
   * front of the bush): shown while it holds him. */
  function hook(on) {
    $('snag-hook')?.remove()
    if (!on) return
    const u = document.createElementNS(SVG_NS, 'use')
    u.id = 'snag-hook'
    u.setAttribute('href', '#snag-tip')
    u.setAttribute('transform', `translate(${SNAG.x + X()} ${SNAG.y})`)
    $('fx').appendChild(u)
  }

  /** His tail's tip held at the snag, stretched to it as he moves. */
  const pinned = (p, toFigure) => Figure.vary(p, { tail: toFigure({ x: SNAG.x + X(), y: SNAG.y }) })

  /** His tail let go: taps are ordinary again. */
  function letGo() {
    hold(null)
    Reksio.wear('tail', null)
    hook(false)
  }

  /** The cane that caught him springs about; leaves fly. */
  function shakeSnag() {
    Sound.rustle()
    $('snag').animate([0, -9, 6, -3, 0].map((d) => ({ transform: `rotate(${d}deg)` })), { duration: 450 })
    fx.burst(SNAG.x + X(), SNAG.y, 4, 'leaf', { height: 30, reach: 50, size: 4 })
  }

  /** His tail caught: see the top of this file (from a tap, after a berry;
   * left alone, after a sniff round the bush). Whatever cuts it short, his
   * tail is let go and the bee goes about its business. */
  async function caught() {
    let stage = 'tries' // tries (his own, scripted) | stuck (a tap is a try) | bee (frozen)
    let asked = false // tapped during his own tries: one more try once they're over
    let trying = Promise.resolve()
    let lastTry = -Infinity
    let beeSent = false
    const tryAgain = () => {
      if (stage === 'stuck') {
        trying = Debug.ignoreCut(trying.then(async () => {
          if (stage !== 'stuck') return
          await Reksio.strain(rnd(0.6, 0.85))
          if (stage === 'stuck') await Reksio.sulk()
        }), 'a try at his tail')
      } else asked = true
    }
    try {
      if (!(await Reksio.walkTo(STANDS + X()))) return
      Reksio.face(-1) // his back to the bush
      await Reksio.swish(2) // a tap now still cuts a left-alone go short, before anything is caught
      Reksio.wear('tail', pinned)
      hook(true)
      caughtTimes += 1
      Debug.trace('tail caught')
      Sound.snap()
      shakeSnag()
      hold(() => {
        if (Clock.now() - lastTry < TRY_GAP_MS) return Debug.trace('tail tap', { too: 'soon' })
        lastTry = Clock.now()
        Debug.trace('tail tap', { stage })
        if (stage !== 'bee') tryAgain() // frozen at the hum: he doesn't dare
      })
      await Reksio.swish(2) // the tail stays put
      await Reksio.yanked()
      await Reksio.strain()
      stage = 'stuck'
      if (asked) tryAgain()
      else await Reksio.sulk()
      await wait(rnd(...BEE_COMES_MS))
      stage = 'bee'
      await trying
      beeSent = true
      Debug.trace('bee comes')
      await Creatures.beeTo(FLOWER.x + X(), FLOWER.y)
      await wait(rnd(500, 900)) // busy about the flower
      await Reksio.hearsBee()
      await Creatures.beeTo(Reksio.x - Reksio.facing * BEHIND, 752) // closer… right by his bottom
      await wait(250)
      // up he goes, and the tail tears free
      letGo()
      Debug.trace('tail free')
      Sound.pop()
      shakeSnag()
      const backToFlower = Creatures.beeTo(FLOWER.x + X(), FLOWER.y) // never noticed
      await Reksio.leapFright(LEAP)
      await Reksio.freed()
      await Reksio.chaseTail(2) // is it all there?
      Reksio.face(1)
      Music.react.wish()
      await Reksio.swish(3)
      await backToFlower
    } finally {
      letGo()
      if (beeSent) Creatures.beeFree()
    }
  }

  /** Can his tail get caught now? Not in the rain: no bee would come out. */
  const canCatch = () => !Weather.raining

  /** Left alone by the bramble (yard.js walks him there): a sniff round
   * it, and his tail gets caught. A tap before then cuts it short, as any
   * left-alone move; once it's caught, a tap is another try. */
  async function sniffAndCatch() {
    await Reksio.sniff(2)
    await caught()
  }

  const thing = {
    at: () => 2310 + X(),
    face: 1,
    // v, the variation (Things.VARIATIONS.berries): his tail caught (when it
    // can be: else he misses instead), or one of the toss's own. The first
    // variation always catches his tail, if it can: it's the bramble's story
    async run({ v }) {
      if (v && caughtTimes === 0 && canCatch() && v !== 'caught') {
        owed.push(v) // the one it stands in for comes instead of the pool's 'caught', later
        v = 'caught'
      } else if (v === 'caught' && caughtTimes > 0 && owed.length) v = owed.shift()
      if (v !== 'caught') return berryToss(v)
      if (!canCatch()) return berryToss('miss')
      await berryToss(null)
      await caught()
    },
    // someone helps him out of it: left alone, a sniff round the bush
    helped: { act: 'bramble', can: canCatch, alone: sniffAndCatch, get times() { return caughtTimes } },
  }

  function init({ effects, hold: holdTaps }) {
    fx = effects
    hold = holdTaps
    if (!Layout.hidden.includes('berries')) makeBerries()
  }

  return {
    thing,
    init,
    /** How often his tail has been caught this play. */
    get caughtTimes() { return caughtTimes },
  }
})()
