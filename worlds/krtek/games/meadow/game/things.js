// The meadow's encounters, and when they come. The meadow is one screen, so
// its things don't all stand about from the start: each arrives at its own
// hour (an egg rolls in, poles get planted...), at most one at a time, and
// waits. A tap on it sets the mole going; left alone a while, he goes by
// himself. Each is a chain of steps that then plays on like a little
// cartoon; a tap on the thing hurries it to its next step, a tap anywhere
// else cuts it short, and next time it picks up at the step it stopped on.
//
// Not everything every play (brief.yaml, principles): which encounters come
// is decided once, from the page's seed: always one where he helps someone,
// one where someone helps him, and one to discover, as in the yard
// (docs/DECISIONS.md, "Helping is the yard's theme"), from what exists.
// None is needed for the day to end.
//
// An encounter registers itself (Things.add) with:
//   name, offer ('help', 'helped' or 'discover'),
//   appear(): it arrives (drawn, with its entrance),
//   steps: async functions (alive) => …, each one beat of the chain; they
//     return early once alive() is false (cut short),
//   restore(): after a cut, put everything it moved back in a state the
//     next step can start from, and send its visitors home,
//   night(): the day is over (bedtime): tidy up, nobody left out,
//   detail(): its own state, for the overlay and the tests; `cast`, the
//     visitors it has out now (none once the mole is free: checkRules).
// It draws on the meadow's helpers (Things.meadow: goTo) for the mole's trips.

/* global Clock, Day, Debug, Layout */
/* exported Things */
const Things = (() => {
  const HOURS = [9.2, 12.2, 15.2] // when the chosen ones arrive, in their (seeded) order
  const SOON_HOUR = 8 // ?soon: the first arrives as he wakes, for trying it
  const ENGAGE_MS = 7000 // a thing out and the mole left alone this long: he goes to it himself
  const BETWEEN_MS = 1300 // a breath between steps, so each reads (a tap on the thing skips it)

  const all = {} // by name
  let api = null // the meadow's: run, alone, free
  let plan = [] // [{ name, at }], the order they come
  let skip = null // resolves the breath between steps early

  function add(encounter) {
    all[encounter.name] = { step: 0, out: false, done: false, ...encounter }
  }

  /**
   * Which encounters come this play, and at what hour: one of each offer
   * there is, chosen from `rand` (pure: the unit tests call it). `props`
   * (the ?props flag) forces a list instead; `soon` brings the first now.
   * The draws are made either way, so forcing one doesn't shift the rest.
   */
  function choose(encounters, rand, { props = null, soon = false } = {}) {
    const byOffer = {}
    for (const e of encounters) (byOffer[e.offer] ||= []).push(e.name)
    let names = Object.keys(byOffer).sort().map((offer) => {
      const list = byOffer[offer]
      return list[Math.floor(rand() * list.length)]
    })
    for (let i = names.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[names[i], names[j]] = [names[j], names[i]]
    }
    if (props) names = props.filter((n) => encounters.some((e) => e.name === n))
    return names.slice(0, HOURS.length).map((name, i) => ({ name, at: soon && i === 0 ? SOON_HOUR : HOURS[i] }))
  }

  /** Decide this play's encounters; `meadow` lends its run(), free() and alone(). */
  function setup(meadow) {
    api = meadow
    plan = choose(Object.values(all), Debug.random('things'), Layout.flags)
    Debug.trace('things', { plan: plan.map((p) => `${p.name}@${p.at}`).join(' ') })
    return plan.map((p) => p.name)
  }

  /** The meadow's tick: things arrive on time; a waiting one draws the mole to it when he's left alone. */
  function tick(hour) {
    // one at a time: the next arrives at its hour, or once the one before is done, whichever is later
    const waitingNow = plan.some((p) => all[p.name].out && !all[p.name].done)
    for (const p of plan) {
      const e = all[p.name]
      if (!e.out && !waitingNow && hour >= p.at) {
        e.out = true
        e.arrived = Clock.now()
        Debug.trace('arrives', { thing: e.name })
        e.appear()
        break
      }
    }
    // left alone, he goes to a waiting thing himself; not after sunset, when he goes home to listen
    const waiting = plan.map((p) => all[p.name]).find((e) => e.out && !e.done)
    const waited = waiting && Math.min(api.alone(), Clock.now() - waiting.arrived)
    if (waiting && hour < Day.SUNSET && !Debug.still && api.free() && waited > ENGAGE_MS) use(waiting.name, false)
  }

  /** Go to `name` and play its chain on from where it stopped; a tap while it plays hurries it on. */
  function use(name, tapped = true) {
    const e = all[name]
    if (!e || !e.out || e.done) return false
    if (api.busyWith() === name) {
      // a tap on it while it plays hurries it on: the breath before the next step is skipped
      if (tapped && skip) skip()
      else if (tapped) e.hurry = true
      return true
    }
    api.run(name, async (alive) => {
      while (e.step < e.steps.length) {
        Debug.trace('step', { thing: name, step: e.step })
        await e.steps[e.step](alive)
        if (!alive()) return
        e.step++
        if (e.step < e.steps.length && !e.hurry) await breath()
        e.hurry = false
        if (!alive()) return
      }
      e.done = true
      Debug.trace('done', { thing: name })
    }, () => e.restore())
    return true
  }

  function breath() {
    return new Promise((resolve) => {
      const timer = Clock.after(BETWEEN_MS, done)
      function done() {
        Clock.cancel(timer)
        skip = null
        resolve()
      }
      skip = done
    })
  }

  /** Bedtime: every thing tidies up. */
  function night() {
    for (const e of Object.values(all)) if (e.out) e.night()
  }

  /** Every visitor out now, from every encounter. */
  const cast = () => Object.values(all).filter((e) => e.out).flatMap((e) => e.detail().cast)

  const state = () => Object.fromEntries(plan.map((p) => [p.name, all[p.name].done ? 'done' : all[p.name].out ? `step ${all[p.name].step}` : `at ${p.at}`]))

  return { names: () => Object.keys(all), add, choose, setup, tick, use, night, state, cast, get: (name) => all[name], /** The meadow's helpers (goTo, el), for the encounters. */ get meadow() { return api } }
})()
