// Reksio asleep in his doghouse's doorway: head on his front paws, front
// view, his paws over the sill, breathing slowly. The one sleeping Reksio,
// drawn by figure.js: in the morning before he wakes (yard.js), when the
// child sends him in for a nap (things.js, the doghouse), and at bedtime as
// the picture closes.
//
// A nap is the same each time at its core (three snores, Zs rising), and
// after the first, one thing happens on top, never the same twice running
// and all of them before any comes again (Adam, 2026-10-19: "variety when
// we put him to bed second and third and any time"): he dreams of a bone,
// paws twitching; a fly whines past and his ears twitch up one after the
// other; he dreams of supper, smiling and licking his chops; or he woofs in
// his sleep, ears up, paws paddling.

/* global Clock, Debug, Sound, Music, Figure, Things, Reksio */
/* exported Nap */
const Nap = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const DOOR_R = [44, 50] // the door's half-width and half-height, as drawn (index.html)
  const SCALE = 0.8 // his head fills the door…
  const SILL = 6 // …and his paws lie this far over the sill (scene units)
  const SNORE_MS = 1700 // one slow breath, a snore and a Z at the top of it
  const SNORES = 3 // a nap's snores
  const VARIATION_AT_MS = 1700 // what happens on top starts with the second snore
  const Z_FROM = [26, -44] // where his Zs rise from, from the door's centre
  const random = Debug.random('nap')

  /** 0 to 1 and back over a..b of k (0 to 1), nothing outside it. */
  const hump = (k, a, b) => (k < a || k > b ? 0 : Math.sin((Math.PI * (k - a)) / (b - a)))
  /** His front paws, lifted by `up` each (his units). */
  const paws = (p, near, far) => ({ nearArm: [p.nearArm[0], [p.nearArm[1][0], p.nearArm[1][1] - near]], farArm: [p.farArm[0], [p.farArm[1][0], p.farArm[1][1] - far]] })

  // What can happen on top of a nap: how long it takes, what starts it, and
  // what it does to his pose at k (0 to 1) of the way through.
  const VARIATIONS = {
    // he dreams of a bone (the bubble), his paws twitching as if he ran
    dream: {
      ms: 3400,
      start: () => dreamBubble(3400),
      pose: (p, k) => Figure.vary(p, paws(p, 4 * hump(k, 0.15, 0.85) * Math.abs(Math.sin(k * 60)), 4 * hump(k, 0.15, 0.85) * Math.abs(Math.cos(k * 60)))),
    },
    // a fly whines past: one ear twitches up, then the other; he smacks his lips
    fly: {
      ms: 2600,
      start: () => Sound.whine(),
      pose: (p, k) => {
        const lips = hump(k, 0.7, 1) // smacking his lips, once the ears are down
        return Figure.vary(Figure.perked(p, [hump(k, 0.05, 0.45), hump(k, 0.3, 0.7)]), { face: { small: lips, smile: p.face.smile * (1 - lips), open: 0.15 * hump(k, 0.75, 0.95) } })
      },
    },
    // he dreams of supper: a sleepy smile, and he licks his chops twice
    supper: {
      ms: 2600,
      start: () => [0.3, 0.65].forEach((at) => Clock.after(2600 * at, () => Sound.lap())),
      pose: (p, k) => {
        const glad = hump(k, 0.05, 0.95) // the smile comes and goes with the dream
        return Figure.vary(p, { face: { joy: p.face.joy + (1 - p.face.joy) * glad, smile: p.face.smile + (1 - p.face.smile) * glad, tongue: 0.8 * (hump(k, 0.25, 0.45) + hump(k, 0.6, 0.8)) } })
      },
    },
    // he woofs in his sleep, muffled: both ears up, paws paddling, then he settles
    woof: {
      ms: 2400,
      start: () => Clock.after(300, () => Sound.bowlBark()),
      pose: (p, k) => {
        const up = hump(k, 0.08, 0.6)
        return Figure.vary(Figure.perked(p, [up, up]), { ...paws(p, 5 * up * Math.abs(Math.sin(k * 40)), 5 * up * Math.abs(Math.cos(k * 40))), face: { open: 0.45 * hump(k, 0.1, 0.3) } })
      },
    },
  }

  let drawn = null // the figure in the doorway, made on first use
  let order = [] // the variations still to come before any repeats
  let last = null
  let snores = 0 // a nap's snores so far: the music's touch rises with them

  function door() {
    if (drawn) return drawn
    const D = Things.DOOR
    const house = document.getElementById('doghouse')
    // clipped to the dark door, and below its middle a little wider and
    // lower, so his paws lie over the sill
    const clip = document.createElementNS(SVG_NS, 'clipPath')
    clip.setAttribute('id', 'door-clip')
    const shapes = [
      ['ellipse', { cx: D.x, cy: D.y, rx: DOOR_R[0], ry: DOOR_R[1] }],
      ['rect', { x: D.x - DOOR_R[0] - 10, y: D.y, width: 2 * DOOR_R[0] + 20, height: DOOR_R[1] + SILL + 8 }],
    ]
    for (const [tag, attrs] of shapes) {
      const shape = document.createElementNS(SVG_NS, tag)
      for (const [k, v] of Object.entries(attrs)) shape.setAttribute(k, v)
      clip.appendChild(shape)
    }
    house.appendChild(clip)
    const g = document.createElementNS(SVG_NS, 'g')
    g.setAttribute('clip-path', 'url(#door-clip)')
    g.setAttribute('pointer-events', 'none')
    g.style.display = 'none'
    house.appendChild(g)
    const inner = document.createElementNS(SVG_NS, 'g')
    inner.setAttribute('transform', `translate(${D.x} ${D.y + DOOR_R[1] + SILL}) scale(${SCALE})`)
    g.appendChild(inner)
    drawn = { g, draw: Figure.mount(inner) }
    return drawn
  }

  /** His pose asleep: breath (0 to 1) lifts his head and chest and parts his
   * lips; smiling: a contented sleep (bedtime). */
  function asleepPose(breath, smiling) {
    const p = Figure.POSES.doorNap
    return Figure.vary(p, {
      head: { y: p.head.y - 3 * breath, tilt: -3 * breath },
      chest: [p.chest[0], p.chest[1] - 2 * breath],
      face: { open: smiling ? 0 : 0.15 * breath, ...(smiling ? { smile: 0.9, joy: 1 } : {}) },
    })
  }

  const breathAt = (ms) => (1 - Math.cos((2 * Math.PI * ms) / SNORE_MS)) / 2

  /** A snore and a Z from the door. */
  function snore() {
    Sound.snore() // silent until a tap lets sound play (sound.js)
    Music.react.snore(snores++ % SNORES) // three falling notes, again from the top
    const D = Things.DOOR
    Reksio.floatZ({ x: D.x + Z_FROM[0], y: D.y + Z_FROM[1] })
  }

  /** The bone dream's bubble, shown for ms. */
  function dreamBubble(ms) {
    document.getElementById('dream').animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: ms })
  }

  /**
   * Show him asleep in the doorway, breathing, snoring now and then (snoring:
   * the morning; a contented smile instead: bedtime), until the returned
   * stop() is called. on(ms) may add to his pose as time goes (a variation).
   */
  function asleep({ snoring = true, smiling = false, on = null } = {}) {
    const d = door()
    d.g.style.display = ''
    const from = Clock.now()
    const stopBreathing = Clock.every(0, () => {
      const ms = Clock.now() - from
      const p = asleepPose(breathAt(ms), smiling)
      d.draw(on ? on(p, ms) : p)
    })
    const stopSnores = snoring ? Clock.every(SNORE_MS, snore) : () => {}
    return () => {
      stopBreathing()
      stopSnores()
      d.g.style.display = 'none'
    }
  }

  /** The next variation: all of them before any comes again, and never the
   * same twice running. */
  function next() {
    if (!order.length) {
      order = Object.keys(VARIATIONS)
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      if (order[0] === last) order.push(order.shift())
    }
    last = order.shift()
    return last
  }

  /** A nap in the doorway (the doghouse thing): the snores, and on top the
   * named variation (or none). Resolves when he is ready to come out. */
  async function nap(variation = null) {
    const v = VARIATIONS[variation] ?? null
    snores = 0
    Debug.trace('nap', { variation })
    const on = v ? (p, ms) => v.pose(p, Math.max(0, Math.min(1, (ms - VARIATION_AT_MS) / v.ms))) : null
    const stop = asleep({ on })
    try {
      if (v) Clock.after(VARIATION_AT_MS, v.start)
      await Clock.wait(Math.max(SNORES * SNORE_MS, v ? VARIATION_AT_MS + v.ms : 0) + 300)
    } finally {
      stop()
    }
  }

  return { VARIATIONS, asleep, next, nap }
})()
