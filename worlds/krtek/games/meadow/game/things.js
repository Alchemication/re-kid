// The meadow's encounters, and when they come. The meadow is one screen, so
// its things don't all stand about from the start: each arrives at its own
// hour (an egg rolls in, poles get planted...), at most one at a time, and
// waits. A tap on it sets the mole going; left alone a while, he goes by
// himself. Each is a chain of steps that then plays on like a little
// cartoon; a tap on the thing hurries it to its next step, a tap anywhere
// else cuts it short, and next time it picks up at the step it stopped on.
//
// Which encounters come is decided once, from the page's seed: first one
// where he helps someone, one where someone helps him, and one to discover,
// as in the yard (docs/DECISIONS.md, "Helping is the yard's theme"), then
// the rest, as many as there are hours for (children wanted more to happen
// in a day: the yard's lesson). None is needed for the day to end.
//
// An encounter registers itself (Things.add) with:
//   name, offer ('help', 'helped' or 'discover'),
//   appear(): it arrives (drawn, with its entrance),
//   steps: async functions (alive) => …, each one beat of the chain; they
//     return early once alive() is false (cut short),
//   restore(): after a cut, put everything it moved back in a state the
//     next step can start from, and send its visitors home,
//   night(): the day is over (bedtime): tidy up, nobody left out,
//   again (optional): async (alive) => …, what a tap on it does once it is
//     done (the car: another ride),
//   ask (optional), for a try-and-see encounter where the child picks
//     what he tries (docs/DESIGN_PRINCIPLES.md: a tap is a choice, not a
//     skip): after its steps, it waits for a choice instead of ending.
//     ask(who, alive): try `who` (a tap on something carrying
//       data-choice="who" inside the thing's data-thing, the intent
//       "use egg hen"); next(): what he tries himself when left alone;
//       resolved(): it is over; fidget(alive): a tap on the thing itself
//       while it waits for a choice (he looks at it again); holds(): he
//       holds it up as he waits (the egg), which a free mole otherwise
//       never does (checkRules).
//   music (optional): { [step]: 'sad' | 'happy' | 'hush' }, the music's
//     moment as that step starts (music.js: the theme sad at its trouble,
//     happy as it comes right, stepping back at a fright). The theme comes
//     curious as any encounter arrives, and happy as it is done unless a
//     step has had it already.
//   detail(): its own state, for the overlay and the tests; `cast`, the
//     visitors it has out now (none once the mole is free: checkRules).
// It draws on the meadow's helpers (Things.meadow: goTo) for the mole's
// trips, and tells the meadow the music's moments (Things.meadow.music).

/* global Clock, Day, Debug, Layout */
/* exported Things */
const Things = (() => {
  const HOURS = [9, 11, 13, 15.2] // when the chosen ones arrive, in their (seeded) order: one every 2 hours or so, about 50 s of play apart
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
   * there is, then the others, chosen from `rand` (pure: the unit tests call it). `props`
   * (the ?props flag) forces a list instead; `soon` brings the first now.
   * The draws are made either way, so forcing one doesn't shift the rest.
   */
  function choose(encounters, rand, { props = null, soon = false } = {}) {
    const shuffle = (list) => {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[list[i], list[j]] = [list[j], list[i]]
      }
      return list
    }
    const byOffer = {}
    for (const e of encounters) (byOffer[e.offer] ||= []).push(e.name)
    const first = Object.keys(byOffer).sort().map((offer) => {
      const list = byOffer[offer]
      return list[Math.floor(rand() * list.length)]
    })
    const rest = encounters.map((e) => e.name).filter((n) => !first.includes(n))
    let names = [...shuffle(first), ...shuffle(rest)]
    if (props) names = props.filter((n) => encounters.some((e) => e.name === n))
    return names.slice(0, HOURS.length).map((name, i) => ({ name, at: soon && i === 0 ? SOON_HOUR : HOURS[i] }))
  }

  /** Decide this play's encounters; `meadow` lends its run(), free(), alone(), music() and notice(). */
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
        api.music?.('curious')
        api.notice?.()
        break
      }
    }
    // left alone, he goes to a waiting thing himself (or tries its next choice); not after sunset,
    // when he goes home to listen
    const waiting = plan.map((p) => all[p.name]).find((e) => e.out && !e.done)
    const waited = waiting && Math.min(api.alone(), Clock.now() - Math.max(waiting.arrived, waiting.tried || 0))
    if (waiting && hour < Day.SUNSET && !Debug.still && api.free() && waited > ENGAGE_MS) use(waiting.name, false)
  }

  /** Its steps, from where they stopped; true once they are all done. */
  async function stepsOn(e, alive) {
    while (e.step < e.steps.length) {
      Debug.trace('step', { thing: e.name, step: e.step })
      if (e.music?.[e.step]) api.music?.(e.music[e.step])
      await e.steps[e.step](alive)
      if (!alive()) return false
      e.step++
      if (e.step < e.steps.length && !e.hurry) await breath()
      e.hurry = false
      if (!alive()) return false
    }
    return true
  }

  function finish(e) {
    e.done = true
    Debug.trace('done', { thing: e.name })
    if (!Object.values(e.music || {}).includes('happy')) api.music?.('happy')
  }

  /**
   * A tap on `name` (or, with `who`, on one of its choices), or, not tapped, the mole going by
   * himself. Its steps play on from where they stopped; a tap while they play hurries them on;
   * then a choice encounter waits for the child to pick what he tries.
   */
  function use(name, tapped = true, who = null) {
    const e = all[name]
    if (!e || !e.out) return false
    if (e.done) return again(e)
    if (api.busyWith() === name && whileBusy(e, tapped, who)) return true
    if (e.ask) tryChoice(e, who || (tapped || e.step < e.steps.length ? null : e.next()))
    else api.run(name, async (alive) => { if ((await stepsOn(e, alive)) && !e.ask) finish(e) }, () => e.restore())
    return true
  }

  /** A tap on it while it plays: true if that's taken care of; false if it should start afresh
   * (another choice than the one being tried: he goes to that one instead). */
  function whileBusy(e, tapped, who) {
    if (who && e.step < e.steps.length) e.pending = who // a choice tapped while its steps play: tried after them, not a restart
    else if (who && who !== e.trying) return false
    else hurry(e, tapped)
    return true
  }

  /** A done thing tapped: its `again` (the car's ride), if it has one; a tap while that plays is part of it. */
  function again(e) {
    if (!e.again) return false
    if (api.busyWith() !== e.name) api.run(e.name, e.again, () => e.restore())
    return true
  }

  /** A tap on it while it plays hurries it on: the breath before the next step is skipped. */
  function hurry(e, tapped) {
    if (tapped && skip) skip()
    else if (tapped && e.step < e.steps.length) e.hurry = true // a choice under way plays on as it is
  }

  /** Its steps if any are left, then `pick` tried (none: a tap on the thing itself, and he looks at it again). */
  function tryChoice(e, pick) {
    e.trying = pick
    e.pending = null
    const finding = e.step < e.steps.length // its steps are still to play (he finds the egg first)
    api.run(e.name, async (alive) => {
      if (!(await stepsOn(e, alive))) return
      const who = e.pending || pick // a choice tapped while the steps played
      e.pending = null
      e.trying = who
      if (!who) return finding ? undefined : e.fidget(alive) // found: it waits for a choice; already found, a look at it again
      Debug.trace('try', { thing: e.name, who })
      try {
        await e.ask(who, alive)
      } finally {
        e.trying = null
        if (e.resolved()) finish(e) // resolved even if a tap cut its aftermath short
      }
      if (alive()) e.tried = Clock.now()
    }, () => {
      e.trying = null
      e.restore()
      if (e.resolved() && !e.done) finish(e)
    })
  }

  /** Put down whatever an encounter has him holding up as he waits (the egg): another gesture is starting. */
  function putDown() {
    for (const e of Object.values(all)) if (e.out && !e.done && e.holds && e.holds()) e.restore()
  }

  /** The encounter whose thing he is holding up as he waits, if any: a tap on it is a tap on that encounter. */
  const holder = () => Object.values(all).find((e) => e.out && !e.done && e.holds && e.holds())?.name ?? null

  /** Whether an encounter waiting for a choice has him holding something up (the egg): allowed while free. */
  const holding = () => Object.values(all).some((e) => e.out && !e.done && e.holds && e.holds())

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

  const stateOf = (e) => (e.done ? 'done' : !e.out ? null : e.ask && e.step >= e.steps.length ? 'choosing' : `step ${e.step}`)
  const state = () => Object.fromEntries(plan.map((p) => [p.name, stateOf(all[p.name]) || `at ${p.at}`]))

  return { names: () => Object.keys(all), add, choose, setup, tick, use, night, state, cast, holding, holder, putDown, get: (name) => all[name], /** The meadow's helpers (goTo, el), for the encounters. */ get meadow() { return api } }
})()
