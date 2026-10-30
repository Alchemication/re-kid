// The bird on the wall: it hops and chirps on its perch, flies off to another
// when Reksio barks at it, and after rain may come down for a worm. When the
// bowl gets stuck on his head, it comes and pulls it off; from then on it is
// his friend, and a tap brings it down to say hello instead of a chase.
// It goes down for the fruit tree's last fruit, and when he shakes it out of
// the tree it gives him a piece of its mind.

/* global Clock, Debug, Motion, Layout, Sound, Music, Reksio, Figure */
/* exported Bird */
const Bird = (() => {
  const GROUND = 812 // where feet stand
  const TUGS = 3 // pulling the bowl off his head, this many tugs; the last one gets it
  const TUMBLE = 130 // how far back the bowl's pop throws it

  const $ = (id) => document.getElementById(id)
  const wait = Clock.wait
  const random = Debug.random('bird') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)
  const bird = $('bird')
  const wing = $('bird-wing')
  const body = $('bird-body')
  const PERCHES = [
    { x: Layout.perches[0], y: 330 }, // on the wall, over open ground (layout.js)
    { x: 560, y: 552 }, // on the doghouse roof
    { x: Layout.perches[1], y: 330 }, // further along the wall
    { x: 2880 + Layout.x('gate'), y: 602 }, // on the fence rail
  ]
  let perch = 0
  let flying = false
  let friend = false // it has pulled the bowl off his head: friends since
  let isEnded = () => false
  /** The top of the bowl stuck on his head, in the scene (where it lands). */
  const bowlTop = () => Reksio.pointAt(Figure.bowlTopAt)
  // where it is drawn among the things: behind Reksio, as on the wall
  const place = { parent: bird.parentNode, next: bird.nextSibling }

  function at(p, facing = 1) {
    bird.style.transform = `translate(${p.x}px, ${p.y}px) scaleX(${facing})`
  }

  /** While it's on or beside him, it is drawn in front of him; then back in its place. */
  function inFront(on) {
    if (on) $('critters').before(bird)
    else place.parent.insertBefore(bird, place.next)
  }

  /** Fly from one point to another in an arc, wings flapping. Resolves to
   * the way it faces. */
  async function flyBetween(from, to) {
    const flap = wing.animate(
      [{ transform: 'rotate(0)' }, { transform: 'rotate(-55deg)' }, { transform: 'rotate(0)' }],
      { duration: 160, iterations: Infinity },
    )
    Sound.flutter()
    const top = Math.min(from.y, to.y) - 180
    const mid = { x: (from.x + to.x) / 2, y: top }
    const facing = to.x < from.x ? -1 : 1
    await bird.animate(
      [
        { transform: `translate(${from.x}px, ${from.y}px) scaleX(${facing})` },
        { transform: `translate(${mid.x}px, ${mid.y}px) scaleX(${facing})` },
        { transform: `translate(${to.x}px, ${to.y}px) scaleX(${facing})` },
      ],
      { duration: 1200 + Math.abs(to.x - from.x) * 0.5, easing: 'ease-in-out' },
    ).finished
    flap.cancel()
    return facing
  }

  /** Off to the perch furthest from Reksio, so the chase can go on. */
  async function flyAway(from = PERCHES[perch]) {
    flying = true
    const choices = PERCHES.map((p, i) => i).filter((i) => i !== perch)
    perch = choices.sort((a, b) => Math.abs(PERCHES[b].x - Reksio.x) - Math.abs(PERCHES[a].x - Reksio.x))[Math.floor(random() * 2)]
    const to = PERCHES[perch]
    Music.react.bird()
    await flyBetween(from, to)
    home()
    Sound.chirp()
  }

  /** On its perch, free, behind him: where it ends up, however a flight ends. */
  function home() {
    at(PERCHES[perch])
    inFront(false)
    flying = false
  }

  /** After rain: down to a worm, a few pecks, and back up to a perch. */
  async function hunt(worm) {
    if (flying) return
    flying = true
    const land = { x: worm.x + 30, y: worm.y + 6 }
    await flyBetween(PERCHES[perch], land)
    at(land, -1)
    for (let i = 0; i < 3; i++) {
      await body.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-30deg)' }, { transform: 'rotate(0)' }], { duration: 260 }).finished
    }
    worm.eat()
    Sound.chirp()
    await wait(500)
    await flyAway(land)
  }

  /** A peck of its beak. */
  const peck = () => body.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(35deg)' }, { transform: 'rotate(0)' }], { duration: 220 }).finished

  /** Keep it standing on the bowl on his head as his head moves, until stop(). */
  function ride(facing) {
    const stay = () => at(bowlTop(), facing)
    stay()
    return Clock.every(0, stay)
  }

  /** Two pecks at the bowl, then tugs that fail, and the last that gets it. */
  async function tug() {
    for (let i = 0; i < 2; i++) {
      await peck()
      Sound.tok()
      Sound.clang(0, 0.6)
      await wait(160)
    }
    await wait(300)
    Sound.chirp()
    const flap = wing.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-60deg)' }, { transform: 'rotate(0)' }], { duration: 110, iterations: Infinity })
    try {
      for (let i = 0; i < TUGS - 1; i++) {
        Sound.flutter()
        const lean = body.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-28deg)', offset: 0.6 }, { transform: 'rotate(0)' }], { duration: 760 })
        await Reksio.tugged(760)
        lean.cancel()
        await wait(rnd(250, 450)) // a breath, and again
      }
      Sound.flutter()
      body.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-34deg)' }], { duration: 300 })
      await Reksio.tugged(300)
    } finally {
      flap.cancel()
    }
  }

  /**
   * Pull the bowl off his head: down onto it, pecks, tugs that fail, and one
   * that pops it off and tumbles the bird back onto the ground beside him.
   * Resolves to where it landed, once the bowl is home; it stays there,
   * flying, until flyAway() (or home(), if this is cut short).
   * @param {(top: {x: number, y: number}) => Promise<void>} pop sends the bowl home from the top of his head
   */
  async function rescue(pop) {
    while (flying) await wait(100) // busy with a worm: it comes when it's done
    flying = true
    inFront(true)
    Debug.trace('bird to the rescue')
    const facing = await flyBetween(PERCHES[perch], bowlTop())
    const stop = ride(facing)
    Debug.trace('bird on the bowl')
    try {
      await tug()
    } finally {
      stop()
    }
    const top = bowlTop()
    const land = { x: top.x - facing * TUMBLE, y: GROUND }
    friend = true
    Debug.trace('bowl off')
    await Promise.all([
      pop(top),
      Motion.endAt(bird, [
        { transform: `translate(${top.x}px, ${top.y}px) scaleX(${facing}) rotate(0deg)` },
        { transform: `translate(${(top.x + land.x) / 2}px, ${top.y - 90}px) scaleX(${facing}) rotate(-200deg)`, offset: 0.45 }, // backwards head over heels, whichever way it faces (rotated inside its mirroring)
        { transform: `translate(${land.x}px, ${land.y}px) scaleX(${facing}) rotate(-360deg)` },
      ], { duration: 800, easing: 'ease-in' }),
    ])
    at(land, -Math.sign(land.x - Reksio.x) || 1) // facing him
    return land
  }

  /**
   * Not yet his friend, it answers his bark by landing on his head: he looks
   * up (lookUp), it pecks twice at the top of his head and chirps, and he
   * shakes it off (shakeOff) as it flies to another perch.
   * @param {{lookUp: () => Promise<void>, shakeOff: () => Promise<void>}} r his part
   */
  async function onHead({ lookUp, shakeOff }) {
    if (flying) return // off after a worm while he barked: not this time
    flying = true
    inFront(true)
    Debug.trace('bird on his head')
    try {
      const facing = await flyBetween(PERCHES[perch], bowlTop())
      const stop = ride(facing)
      try {
        const looking = lookUp()
        for (let i = 0; i < 2; i++) {
          await peck()
          Sound.tok()
          await wait(220)
        }
        Sound.chirp()
        await looking
      } finally {
        stop()
      }
      await Promise.all([shakeOff(), flyAway(bowlTop())])
    } finally {
      home()
    }
  }

  /** Over to the wall above x, to watch for ms (what is he burying?), and
   * back to its perch. Not if it's already flying. */
  async function watch(x, ms) {
    if (flying) return
    flying = true
    try {
      const spot = { x, y: 330 }
      await flyBetween(PERCHES[perch], spot)
      at(spot, -1)
      Sound.chirp()
      await wait(ms)
      await flyBetween(spot, PERCHES[perch])
    } finally {
      home()
    }
  }

  /** Down into the fruit tree to peck at its last fruit, at spot (tree.js).
   * It stays there, busy, until shooed() or home(). False if it's busy. */
  async function toFruit(spot) {
    if (flying) return false
    flying = true
    Debug.trace('bird to the fruit')
    try {
      await flyBetween(PERCHES[perch], spot)
    } catch (e) {
      home()
      throw e
    }
    at(spot, -1)
    await peck()
    Sound.tok()
    return true
  }

  /** Shaken out of the tree from spot: it tumbles out in a flurry, down to
   * `to` beside his head, and scolds him there with cross chirps while he
   * takes it (his part, `takeIt`); then it is off to a perch. */
  async function shooed(spot, to, takeIt) {
    inFront(true)
    Debug.trace('bird shaken out')
    try {
      Sound.chirp()
      const facing = await flyBetween(spot, to)
      at(to, Math.sign(Reksio.x - to.x) || facing) // turned to face him
      const his = takeIt()
      await scold(5)
      await Debug.ignoreCut(his, 'told off') // cut short, he's off: it still flies home on its wings
      await flyAway(to)
    } finally {
      home()
    }
  }

  /** Cross chirps, a peck at the air with each. */
  async function scold(times) {
    for (let i = 0; i < times; i++) {
      Sound.chirp()
      await peck()
      await wait(rnd(60, 140))
    }
  }

  /** From its perch, a cross word at him (he shook it out of the tree):
   * a hop and two chirps. Not if it's busy. */
  async function tut() {
    if (flying) return
    body.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }], { duration: 260 })
    await scold(2)
  }

  /** His friend now, it comes down to him: a hop and a chirp, his play-bow,
   * and back up to its perch. */
  async function visit() {
    flying = true
    inFront(true)
    Debug.trace('bird visits')
    try {
      const land = { x: Reksio.x + Reksio.facing * 120, y: GROUND }
      await flyBetween(PERCHES[perch], land)
      at(land, -Reksio.facing)
      Sound.chirp()
      const hops = body.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }], { duration: 260, iterations: 2 })
      await Reksio.playBow()
      await hops.finished
      Sound.chirp()
      await flyBetween(land, PERCHES[perch])
    } finally {
      home()
    }
  }

  function idle() {
    if (!flying && !isEnded()) {
      body.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }],
        { duration: 300 },
      )
      if (random() < 0.6) Sound.from(Math.abs(PERCHES[perch].x - Reksio.x), Sound.chirp)
    }
    Clock.after(4000 + random() * 4000, idle)
  }

  function init({ ended }) {
    isEnded = ended
    at(PERCHES[0])
    Clock.after(3000, idle)
  }

  return {
    PERCHES, flyAway, hunt, rescue, visit, onHead, watch, toFruit, shooed, tut, home, init,
    get perch() { return PERCHES[perch] },
    get flying() { return flying },
    get friend() { return friend },
    /** Drawn in front of him (on or beside him), not in its place among the things. */
    get front() { return bird.parentNode !== place.parent },
  }
})()
