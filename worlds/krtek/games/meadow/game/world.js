// Copied from shared/world.js by `main.py shared` — edit that, not this.
// Shared by every game: the world state, what every living part of a scene
// reads instead of reaching into the others (docs/WORLD_MODEL.md). Each part
// of it has one writer: the day its hour and light, the camera the view, the
// weather its wet places, whatever makes a sound its noise, and each thing
// what it offers (a flower nectar, a pool a drink). A field joins it when
// something reads it. A creature reads it and goes
// for what it wants (creature.js); it never asks the frog or the rain cloud
// directly, so a new creature or a new weather needs no change to the others.
//
// Light and hour are apart on purpose: the hour only ever moves with the
// day (the same for every child), the light may dip at an eclipse or under
// a storm, and creatures and flowers answer to the light.
//
// Plain data and rules, no drawing and no clock of its own: setup(now) gives
// it the game's clock (Clock.now), and the tests a pretend one. Things may
// offer before that, as their scripts load.

/* exported World */
const World = (() => {
  const HEARD_MS = 1500 // a noise is news this long: long enough for a creature stepped every frame to hear it
  let now = () => 0
  const offers = new Map() // id -> { id, kind, x, y, open() }
  let wets = [] // { x0, x1, until }
  let noises = [] // { kind, x, reach, t }
  const state = {
    hour: 8,
    light: 1, // 1 broad day, 0 night
    view: { x0: 0, x1: 1600 }, // the stretch of the scene the child sees
  }

  /** Run on this clock. */
  function setup(clock) {
    now = clock
  }

  /** Its writers set their part: set({ hour }), set({ view: { x0, x1 } }). */
  function set(fields) {
    Object.assign(state, fields)
  }

  /**
   * A thing offers something at x, y while open() says so: kind is one of
   * 'nectar', 'perch', 'drink', 'bathe', 'food', 'shelter', 'sight', 'sun'.
   */
  function offer(id, kind, x, y, open = () => true) {
    offers.set(id, { id, kind, x, y, open })
  }

  /** It stops offering. */
  const withdraw = (id) => offers.delete(id)

  /** What is on offer now of this kind, between x0 and x1 if given. */
  function offered(kind, x0 = -Infinity, x1 = Infinity) {
    return [...offers.values()].filter((o) => o.kind === kind && o.x >= x0 && o.x <= x1 && o.open())
  }

  /** It is raining (or wet underfoot) from x0 to x1 for ms. */
  function wet(x0, x1, ms) {
    wets = wets.filter((w) => w.until > now())
    wets.push({ x0, x1, until: now() + ms })
  }

  /** Is it wet at x now? */
  const isWet = (x) => wets.some((w) => w.until > now() && x >= w.x0 && x <= w.x1)

  /** Something made a sound at x, heard out to `reach` either side. */
  function noise(kind, x, reach = 300) {
    const t = now()
    noises = noises.filter((n) => t - n.t < HEARD_MS)
    noises.push({ kind, x, reach, t })
  }

  /** The noises heard at x since `since` (ms on the clock). */
  const heard = (x, since) => noises.filter((n) => n.t > since && Math.abs(n.x - x) <= n.reach)

  return { setup, set, offer, withdraw, offered, wet, isWet, noise, heard, state }
})()
