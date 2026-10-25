// Shared by every game: how a small creature of a scene's ambient life
// decides what to do and moves there (docs/WORLD_MODEL.md). A creature has
// traits (what it feeds on, what scares it, its hours, how it takes the
// wet) and drives that rise and fall; each frame think() picks what it goes
// for from what the world offers (world.js), and move() carries it there
// with a little momentum, so it eases into a turn instead of snapping. Its
// look, and the few moves that are its own, stay with the game that draws
// it; so do encounters, which are hand-made.
//
// Fear comes first (a tap on it, a noise near it: off out of sight,
// quicker, or, for one that freezes, still a while), then going home (its
// stay is over, out of its hours, too dark, the wet if it minds it or the
// dry if it likes the wet), then hunger (to something on offer that it
// feeds on, a while there, and full again), and otherwise it wanders, over
// the view or about its haunt, hovering a moment where it gets to if it is
// one that hovers.
//
// Plain rules, no drawing and no clock: the game passes the time and its
// own random stream, so a seeded play is the same play every time.

/* exported Creature */
const Creature = (() => {
  const ARRIVED = 6 // this near its goal, it is there
  const EASE_IN = 60 // it slows down over this last stretch
  const OFF = 400 // gone once this far out of the view
  const between = ([a, b], r) => a + r * (b - a)

  /**
   * A creature with these traits at x, y, out from time t. Traits:
   * - speed (scene units a second), flee (how much quicker it flees), turn
   *   (how quickly it changes course, per second);
   * - stayMs [lo, hi], hours [from, to], dark (it goes home below this
   *   light), wet ('avoid', 'likes' or null);
   * - feeds (an offer kind), hungerMs [lo, hi] (from fed to hungry),
   *   feedMs [lo, hi];
   * - startledBy (the kinds of noise that scare it, heard within their
   *   reach), freezeMs [lo, hi] (scared, it keeps still this long instead of
   *   fleeing);
   * - band [top, bottom] (where it wanders, scene y), roam (how far it
   *   wanders at a time), haunt [x0, x1] (it keeps to this stretch),
   *   pauseMs [lo, hi] (it hovers this long where it wandered to).
   * `home` {x, y}: where it goes home to (a hole, under the leaves); without
   * one it goes off out of sight.
   */
  function make(traits, x, y, t, rnd, home = null) {
    return {
      traits, x, y, vx: 0, vy: 0, heardAt: t, home,
      leaves: t + between(traits.stayMs, rnd()),
      hungry: t + between(traits.hungerMs || [0, 0], rnd()), // it gets hungry at this time
      goal: null, // { kind: 'wander' | 'pause' | 'feed' | 'freeze' | 'home' | 'flee', x, y, until? }
      tapped: false,
    }
  }

  /** Home: to its own place, or off out of the view to the nearer side and up. */
  function away(c, world, kind) {
    if (c.home && kind === 'home') return { kind, x: c.home.x, y: c.home.y }
    const { x0, x1 } = world.state.view
    const dir = c.x - x0 < (x1 - x0) / 2 ? -1 : 1
    return { kind, x: c.x + dir * 1400, y: -200 }
  }

  /** Where it may be along the scene: its haunt, or the view and a little past it. */
  function reach(c, world) {
    const { x0, x1 } = world.state.view
    return c.traits.haunt || [x0 - 100, x1 + 100]
  }

  /** Somewhere to wander to, within its reach and band. */
  function somewhere(c, world, rnd) {
    const [lo, hi] = reach(c, world)
    const x = Math.max(lo, Math.min(hi, c.x + (rnd() - 0.5) * c.traits.roam))
    return { kind: 'wander', x, y: between(c.traits.band, rnd()) }
  }

  /** Is it scared now: tapped, or a noise near it? */
  function scared(c, world) {
    if (c.tapped) return true
    return world.heard(c.x, c.heardAt).some((n) => (c.traits.startledBy || []).includes(n.kind))
  }

  /** Must it go home: its stay over, out of its hours, too dark, the wet it minds or the dry if it likes the wet? */
  function homeward(c, world, t) {
    const { hour, light } = world.state
    const [from, to] = c.traits.hours
    const wet = world.isWet(c.x)
    return t > c.leaves || hour < from || hour >= to || light < c.traits.dark || (c.traits.wet === 'avoid' && wet) || (c.traits.wet === 'likes' && !wet)
  }

  /** Something it feeds on, on offer within its reach and a wander of it, and dry if it minds the wet. */
  function food(c, world, rnd) {
    if (!c.traits.feeds) return null
    const [lo, hi] = reach(c, world)
    const near = world.offered(c.traits.feeds, Math.max(lo, c.x - c.traits.roam / 2), Math.min(hi, c.x + c.traits.roam / 2))
      .filter((o) => c.traits.wet !== 'avoid' || !world.isWet(o.x))
    return near.length ? near[Math.floor(rnd() * near.length)] : null
  }

  /** Scared: still a while if it freezes, else off out of sight. */
  function fright(c, world, t, rnd) {
    if (c.traits.freezeMs) return { kind: 'freeze', x: c.x, y: c.y, until: t + between(c.traits.freezeMs, rnd()) }
    return away(c, world, 'flee')
  }

  /** Is it in the middle of something it keeps on with: fleeing, home, or a freeze, a feed or a pause not over yet? */
  function busy(c, t) {
    const g = c.goal
    if (!g) return false
    if (g.kind === 'flee' || g.kind === 'home') return true
    return (g.kind === 'freeze' || g.kind === 'feed' || g.kind === 'pause') && (g.until === undefined || t < g.until)
  }

  /** Decide what it goes for at time t. Returns the goal, new or kept. */
  function think(c, world, t, rnd) {
    const scary = scared(c, world)
    c.heardAt = t
    c.tapped = false
    if (c.goal?.kind === 'flee') return c.goal
    if (scary) return (c.goal = fright(c, world, t, rnd))
    if (busy(c, t)) return c.goal
    if (homeward(c, world, t)) return (c.goal = away(c, world, 'home'))
    const was = c.goal?.kind
    if (was === 'feed') c.hungry = t + between(c.traits.hungerMs, rnd()) // fed
    if (was === 'feed' || was === 'pause' || was === 'freeze') c.goal = null
    const o = t >= c.hungry ? food(c, world, rnd) : null
    if (o) return (c.goal = { kind: 'feed', x: o.x, y: o.y, offer: o.id })
    if (!c.goal) c.goal = somewhere(c, world, rnd)
    return c.goal
  }

  /** Has it got there: home, or well out of the view going home or fleeing? */
  function gone(c, world, d) {
    const g = c.goal
    if (g.kind === 'home' && c.home) return d < ARRIVED
    const { x0, x1 } = world.state.view
    return (g.kind === 'home' || g.kind === 'flee') && (c.y < -100 || c.x < x0 - OFF || c.x > x1 + OFF)
  }

  /** It got where it was going: a feed starts, a hover starts, or a wander is done. */
  function arrive(c, t, rnd) {
    const g = c.goal
    if (g.kind === 'feed') g.until = t + between(c.traits.feedMs, rnd())
    else if (c.traits.pauseMs) c.goal = { kind: 'pause', x: c.x, y: c.y, until: t + between(c.traits.pauseMs, rnd()) }
    else c.goal = null // wandered there: think() picks the next place
  }

  /**
   * Move it dt ms towards its goal. Returns 'arrived' the moment it gets
   * there, 'gone' once it is home or well out of the view fleeing, or null.
   */
  function move(c, world, dt, t, rnd) {
    const g = c.goal
    const s = dt / 1000
    const k = Math.min(1, c.traits.turn * s)
    const dx = g.x - c.x
    const dy = g.y - c.y
    const d = Math.hypot(dx, dy)
    const top = g.kind === 'freeze' ? 0 : c.traits.speed * (g.kind === 'flee' ? c.traits.flee : 1)
    const speed = g.kind === 'flee' || (g.kind === 'home' && !c.home) ? top : top * Math.min(1, d / EASE_IN)
    c.vx += ((dx / (d || 1)) * speed - c.vx) * k
    c.vy += ((dy / (d || 1)) * speed - c.vy) * k
    c.x += c.vx * s
    c.y += c.vy * s
    if (gone(c, world, d)) return 'gone'
    if (d >= ARRIVED || g.until !== undefined || g.kind === 'home') return null
    arrive(c, t, rnd)
    return 'arrived'
  }

  /** Is it sitting at its food now? */
  const feeding = (c) => c.goal?.kind === 'feed' && c.goal.until !== undefined

  return { make, think, move, feeding }
})()
