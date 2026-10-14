// His food bowl. He laps it empty, bits flying; the variation, an empty bowl:
// he licks it clean and noses it along.
//
// The bowl on his head: licking an empty bowl clean, he pushes his nose right
// in and it sticks. He shakes, stumbles about blind, and sits down glum until
// the bird (bird.js) comes and pulls it off, sooner if the child taps: he
// barks inside the bowl and the bird hears. It comes on the second use (the
// bowl's variation), then every other empty bowl, or he goes back for the
// last bits on his own, once a play, when left alone (`helped`, yard.js).
//
// At bedtime, if the bowl is out, his supper comes in it (things.js).

/* global Clock, Debug, Motion, Layout, Sound, Reksio, Figure, Bird */
/* exported Bowl */
const Bowl = (() => {
  const BOWL_MIDDLE = { x: 880, y: 784 } // the bowl as drawn, before its per-play offset: it turns about here
  const BIRD_COMES_MS = [5000, 7000] // left alone, the bird comes this long after he sits down stuck: long enough to see him glum, short enough not to worry
  const BOWL_BARK_GAP_MS = 350 // taps faster than this while he's stuck don't each bark: a din, not a joke

  const $ = (id) => document.getElementById(id)
  const X = () => Layout.x('bowl')
  const wait = Clock.wait
  const random = Debug.random('bowl') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)
  let fx = { burst: () => {} } // effects, from things.js
  let hold = () => {} // from things.js: hold(answer) makes every tap his answer, hold(null) lets go
  const food = $('food')
  let foodLeft = 1
  let bowlPushed = 0 // how far his nose has pushed the bowl
  let emptyLicks = 0 // empty bowls licked: the first gets stuck on his head, then every other one
  let stuckTimes = 0 // how often the bowl has stuck on his head this play
  let lastBowlBark = -Infinity

  /** The bowl over his head, upside down (figure.js draws it). */
  const onHead = (p) => Figure.vary(p, { face: { bowl: 1 } })

  /** Full again. */
  function refill() {
    foodLeft = 1
    food.style.transform = 'scaleY(1)'
  }

  /** The bowl, off his head, spins through the air and lands back in its place. */
  async function bowlHome(body, from) {
    const x0 = from.x - (BOWL_MIDDLE.x + X())
    const y0 = from.y + 30 - BOWL_MIDDLE.y // its middle, under the top
    body.style.transformOrigin = `${BOWL_MIDDLE.x}px ${BOWL_MIDDLE.y}px`
    body.style.visibility = ''
    await Motion.endAt(body, [
      { transform: `translate(${x0}px, ${y0}px) rotate(180deg)` },
      { transform: `translate(${(x0 + bowlPushed) / 2}px, ${y0 - 160}px) rotate(270deg)`, offset: 0.45 },
      { transform: `translate(${bowlPushed}px, 0px) rotate(360deg)` },
    ], { duration: 750, easing: 'ease-in-out' })
    Sound.clang(0, 0.7)
  }

  /** Licking the empty bowl, he pushes his nose right in, and it sticks on
   * his head. He shakes, takes a few blind steps, and sits down glum until
   * the bird pulls it off (sooner if he barks for it, at a tap); then he is
   * delighted, thanks the bird, and eyes the bowl with suspicion. */
  async function stuckInBowl() {
    const body = $('bowl-body')
    let call
    const called = new Promise((resolve) => (call = resolve))
    let up
    const freed = new Promise((resolve) => (up = resolve))
    let birdCame = false
    try {
      await Reksio.nod(26, 450) // right in, to lick the bottom
      Sound.clang()
      body.style.visibility = 'hidden'
      Reksio.wear('bowl', onHead)
      stuckTimes += 1
      Debug.trace('bowl stuck')
      hold(() => {
        call()
        if (Clock.now() - lastBowlBark < BOWL_BARK_GAP_MS) return
        lastBowlBark = Clock.now()
        Debug.ignoreCut(Reksio.bowlBark(), 'bark in the bowl')
      })
      await Reksio.bowlShake()
      await Reksio.walkTo(Reksio.x - rnd(70, 110)) // blind steps, the wrong way
      await Reksio.lookAround(rnd(500, 800))
      await Reksio.walkTo(Reksio.x + rnd(30, 60))
      await Reksio.slump()
      const moping = Reksio.mope(freed)
      await Promise.race([wait(rnd(...BIRD_COMES_MS)), called])
      birdCame = true
      const land = await Bird.rescue((top) => {
        Reksio.wear('bowl', null)
        hold(null) // off: taps wait for him again
        Sound.pop()
        Sound.clang()
        return bowlHome(body, top)
      })
      up()
      await moping
      await Reksio.freed()
      Reksio.face(land.x > Reksio.x ? 1 : -1)
      Sound.chirp()
      await Reksio.playBow()
      Reksio.face(-Reksio.facing) // the bowl: and you stay there
      await Reksio.squint()
      await Bird.flyAway(land)
      birdCame = false
    } finally {
      // however it ends, the bowl is back in its place and the bird free
      hold(null)
      up()
      Reksio.wear('bowl', null)
      if (birdCame) Bird.home() // cut short on its way: back on its perch
      body.style.visibility = ''
      refill()
    }
  }

  /** Lap the bowl empty, bits flying. */
  async function eat() {
    const lapping = Reksio.lap(10)
    for (let i = 0; i < 5; i++) {
      await wait(380)
      fx.burst(880 + X() + bowlPushed, 760, 3, 'crumb', { height: 34, reach: 36, size: 3 })
      foodLeft -= 0.16
      food.style.transform = `scaleY(${Math.max(foodLeft, 0.15)})`
    }
    await lapping
    Sound.slurp()
  }

  /** Left alone by his bowl (yard.js walks him there): he eats what is
   * left, licks the bottom, and gets stuck. A tap before it sticks cuts it
   * short, as any left-alone move; once it's on, a tap is a bark in it. */
  async function lickBowlClean() {
    if (foodLeft > 0.2) await eat()
    await Reksio.lap(4)
    emptyLicks += 1 // this empty bowl stuck: the next one is nosed along
    return stuckInBowl()
  }

  /** Supper in his bowl (things.js, at bedtime): full again, and steaming. */
  function serveSupper() {
    refill()
    $('bowl').classList.add('supper')
  }

  /** He eats his supper up, and the steam goes with it. */
  async function eatSupper() {
    try {
      await eat()
    } finally {
      $('bowl').classList.remove('supper')
    }
  }

  const thing = {
    at: () => 764 + X() + bowlPushed,
    face: 1,
    async run({ extra }) {
      if (foodLeft <= 0.2 && !extra) {
        refill()
        await wait(200)
      }
      if (foodLeft <= 0.2) {
        // the extra: an empty bowl — he licks it clean and noses it along,
        // or pushes his nose right in, and it sticks
        await Reksio.lap(4)
        if (emptyLicks++ % 2 === 0) return stuckInBowl()
        const push = bowlPushed ? -bowlPushed : 28
        Sound.scrape()
        const body = $('bowl-body')
        Reksio.nod(14, 500)
        const from = bowlPushed
        bowlPushed += push // the state first: the animation only covers the move
        await Motion.endAt(body, [{ transform: `translateX(${from}px)` }, { transform: `translateX(${bowlPushed}px)` }], { duration: 500, easing: 'ease-out' })
        await Reksio.lick()
        refill()
        return
      }
      await eat()
      await Reksio.lick()
    },
    // someone helps him out of it: left alone, he goes back for the last bits
    helped: { act: 'bowl', can: () => true, alone: lickBowlClean, get times() { return stuckTimes } },
  }

  function init({ effects, hold: holdTaps }) {
    fx = effects
    hold = holdTaps
  }

  return {
    thing,
    init,
    serveSupper,
    eatSupper,
    /** How often the bowl has stuck on his head this play. */
    get stuckTimes() { return stuckTimes },
  }
})()
