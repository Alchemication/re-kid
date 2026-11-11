// Reksio wet and muddy. Puddles muddy his paws (it fades after a while).
// Rain, a jump into a puddle, or splashing through plenty of water soaks him:
// fur a touch darker, drips. Soaked, as soon as he stops out of the rain, he
// shakes himself dry, like every dog (yard.js decides when). While he stands
// in a puddle, its near edge is drawn in front of his paws.

/* global Clock, Debug, Sound, Reksio, Weather, Things */
/* exported Wet */
const Wet = (() => {
  const SOAK_PER_SPLASH = 0.15 // each splashing step through a puddle (about 3 per puddle)
  const SOAKED = 0.7 // soaked from here on: drips, and a shake when he stops
  const DRY_S = 40 // without a shake, the wet slowly dries off over this long
  const MUDDY_S = 10 // muddy paws last this long after the last puddle
  const DRIP_EVERY_MS = 350
  const SPLASH_EVERY_MS = 280 // walking through a puddle, a splash at most this often

  const SVG_NS = 'http://www.w3.org/2000/svg'
  const drips = Debug.random('drips') // drawn as frames go by, so a stream of its own (debug.js)
  let soak = 0 // 0 dry … 1 soaked through
  let muddyUntil = 0
  let lastDrip = 0
  let lastFrame = 0
  let lastSplash = 0
  const pawWater = document.createElementNS(SVG_NS, 'path')
  pawWater.setAttribute('class', 'paw-water')
  pawWater.setAttribute('d', 'M-44 814 A44 10 0 0 0 44 814 Z')
  document.getElementById('fx').appendChild(pawWater)

  const soaked = () => soak >= SOAKED

  /** Wetter by `amount` (1 = soaked through at once), and muddy. */
  function wetten(amount) {
    soak = Math.min(1, soak + amount)
    muddyUntil = Clock.now() + MUDDY_S * 1000
  }

  /** Pounce into a puddle: splish, splash. He'll shake once he steps out. */
  async function splashIn(p) {
    await Reksio.pounce(p.x)
    Weather.splash(p.x)
    Sound.splash()
    wetten(1)
    await Reksio.hop(30, 2)
  }

  /** Out of the puddle, on its far side. */
  const stepOut = (p) => Reksio.walkTo(p.x + Math.sign(p.x - Reksio.x || 1) * (p.rx + 50))

  /** The wet-dog shake, spray flying; dry after it. */
  async function shakeDry() {
    Sound.shake()
    const stopSpray = Clock.every(120, () => Things.burst(Reksio.x, 740, 8, 'drop', { height: 60, reach: 110, size: 3.5 }))
    try {
      await Reksio.shakeDry()
    } finally {
      stopSpray()
    }
    soak = 0
  }

  /** Every frame: rain soaks him, the air dries him, puddles splash and muddy
   * him as he walks through them, and soaked he drips. */
  function frame(t) {
    const dt = Math.min(0.1, (t - lastFrame) / 1000)
    lastFrame = t
    if (Weather.raining && !Weather.frozen) soak = 1 // snow doesn't soak him: he stays white
    else soak = Math.max(0, soak - dt / DRY_S)
    const inPuddle = Weather.puddleAt(Reksio.x)
    pawWater.classList.toggle('on', !!inPuddle)
    pawWater.setAttribute('transform', `translate(${Reksio.x} 0)`)
    Reksio.setWet(soaked())
    Reksio.setMuddy(t < muddyUntil)
    if (soaked() && !Weather.raining && t - lastDrip > DRIP_EVERY_MS) {
      lastDrip = t
      Things.burst(Reksio.x + (drips() - 0.5) * 80, 770, 1, 'drop', { height: 4, reach: 6, size: 2.5 })
    }
    if (Reksio.walking && t - lastSplash > SPLASH_EVERY_MS && Weather.splash(Reksio.x)) {
      lastSplash = t
      wetten(SOAK_PER_SPLASH)
      Sound.splash()
      Things.burst(Reksio.x, 830, 4, 'drop', { height: 34, reach: 50, size: 3 })
    }
  }

  return {
    frame, splashIn, stepOut, shakeDry,
    /** Soaked through: he drips, and shakes once he stops out of the rain. */
    get soaked() { return soaked() },
    /** How wet he is: 0 dry … 1 soaked through. */
    get soak() { return soak },
  }
})()
