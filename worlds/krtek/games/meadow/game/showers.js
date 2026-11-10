// Autumn's rain, as plain rules with no drawing and no clock of their own
// (Adam, 2026-11-10: a little rain every few autumn plays, varying in how
// hard, and only sometimes). About one autumn play in three, once, by day,
// it rains for a while: a drizzle most often, a shower now and then, a
// downpour rarely. Never thunder: that is the storm's (umbrella.js), and on
// its play there is no shower; nor on an eclipse's (meadow.js: one weather a
// day). It waits while an encounter is out (one thing at a time: the little
// rain cloud's flowers droop in the sun), and no encounter comes while it
// rains (meadow.js). storm.js draws it, at the strength drawn here.

/* exported Showers */
const Showers = (() => {
  const CHANCE = { autumn: 0.35 } // of a season's plays that have one: about one in three in autumn, none in spring
  const KINDS = { drizzle: 0.55, shower: 0.33, downpour: 0.12 } // how hard it rains, at these shares (storm.js STRENGTHS)
  const HOURS = [9.5, 16] // it is due at an hour between these
  const LATEST = 17 // held back past this (an encounter out), it doesn't come: it must clear well before sunset (19)
  const SOON = 0.15 // ?rain=: this many of the day's hours after he wakes

  /** This play's: { at, kind } (its hour, how hard), or null for none. All drawn either way, so the stream
   * stays put. `asked`: a kind from ?rain= (any season), brought soon after `start`. */
  function plan(random, season, { asked = null, start = 8 } = {}) {
    const has = random() < (CHANCE[season] || 0)
    const at = HOURS[0] + random() * (HOURS[1] - HOURS[0])
    let left = random()
    const names = Object.keys(KINDS)
    const kind = names.find((n) => (left -= KINDS[n]) < 0) ?? names[names.length - 1]
    if (KINDS[asked] !== undefined) return { at: start + SOON, kind: asked }
    return has ? { at, kind } : null
  }

  /** Whether `shower` starts at this hour: due, nothing raining already, and not held back (`held`: an encounter out). */
  const due = (shower, hour, { raining = false, held = false } = {}) => !!shower && hour >= shower.at && hour <= LATEST && !raining && !held

  return { CHANCE, KINDS, HOURS, LATEST, plan, due }
})()
