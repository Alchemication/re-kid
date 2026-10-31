// Shared by every game: how a small creature of a scene's ambient life
// decides what to do and moves there (docs/WORLD_MODEL.md). A creature has
// traits (what it feeds on, what scares it, its hours, how it takes the
// wet) and drives that rise and fall; each frame think() picks what it goes
// for from what the world offers (world.js), and move() carries it there
// with a little momentum, so it eases into a turn instead of snapping, and
// the wind pushes it about as much as it is light (`blown`). Its look, and
// the few moves that are its own, stay with the game that draws it; so do
// encounters, which are hand-made.
//
// An errand a gag sends it on comes first (the yard's bee to the bramble).
// Then fear (a tap on it, a noise it minds within its range, the hero's
// nose too close if it is shy: off out of sight, quicker; or a startled dart
// a short way off, after which it carries on; or, for one that freezes,
// still a while), then going home (its stay is over, out of its hours, too
// dark, or too light for one of the night, rain coming or the wet if it minds it, the dry if it likes the
// wet), then hunger (to something on offer that it feeds on, a while there,
// and full again), and otherwise it wanders, over the view or about its
// haunt (closer in fog), now and then to something on show if it is curious, hovering a
// moment where it gets to if it is one that hovers.
//
// Plain rules, no drawing and no clock: the game passes the time and its
// own random stream, so a seeded play is the same play every time.

/* exported Creature */
const Creature = (() => {
  const ARRIVED = 6 // this near its goal, it is there
  const EASE_IN = 60 // it slows down over this last stretch
  const OFF = 400 // gone once this far out of the view
  const BLOW = 120 // a full gust pushes a creature that is all blown (blown: 1) this far a second, downwind
  const RAIN_COMING = 0.5 // overcast this much, one that minds the wet goes home before the rain
  const FOG_KEEPS_CLOSE = 0.6 // in the thickest fog its wanders are this much shorter
  const between = ([a, b], r) => a + r * (b - a)

  /**
   * A creature with these traits at x, y, out from time t. Traits:
   * - speed (scene units a second), flee (how much quicker it flees or
   *   darts), turn (how quickly it changes course, per second), blown (0 to
   *   1: how much the wind pushes it, unless it is feeding: it holds on),
   *   errandSpeed (sent on an errand, this fast);
   * - stayMs [lo, hi], hours [from, to], dark (it goes home below this
   *   light), bright (one of the night: it goes home above this light),
   *   wet ('avoid', 'likes' or null);
   * - feeds (an offer kind), hungerMs [lo, hi] (from fed to hungry),
   *   feedMs [lo, hi];
   * - startledBy (the kinds of noise that scare it, heard within their
   *   reach: a list, or { kind: range } to mind each only this near), shy
   *   ({ at, odds }: the hero's nose this near scares it, with these odds a
   *   frame), dart (scared, it darts this far off and carries on, instead of
   *   fleeing; dartsUp: always upwards, as a bird bursts up from the ground),
   *   freezeMs [lo, hi] (scared, it keeps still this long instead);
   * - band [top, bottom] (where it wanders, scene y), roam (how far it
   *   wanders at a time), haunt [x0, x1] (it keeps to this stretch),
   *   pauseMs [lo, hi] (it hovers this long where it wandered to), curious
   *   (this share of its wanders go to something on show: 'sight' offers),
   *   exitY (it leaves the view at this height; else up and away).
   * `home` {x, y}: where it goes home to (a hole, under the leaves); without
   * one it goes off out of sight. A game sets `c.errand` = {x, y} to send it
   * somewhere (it stays, hovering, until the game clears it), and `c.tapped`.
   */
  function make(traits, x, y, t, rnd, home = null) {
    return {
      traits, x, y, vx: 0, vy: 0, heardUpTo: null, home, // heardUpTo: the last noise it has heard (World.heardUpTo); null: none yet
      leaves: t + between(traits.stayMs, rnd()),
      hungry: t + between(traits.hungerMs || [0, 0], rnd()), // it gets hungry at this time
      goal: null, // { kind: 'errand' | 'wander' | 'pause' | 'feed' | 'dart' | 'freeze' | 'home' | 'flee', x, y, until? }
      tapped: false,
      errand: null,
    }
  }

  /** Home: to its own place, or off out of the view to the nearer side and up. */
  function away(c, world, kind) {
    if (c.home && kind === 'home') return { kind, x: c.home.x, y: c.home.y }
    const { x0, x1 } = world.state.view
    const dir = c.x - x0 < (x1 - x0) / 2 ? -1 : 1
    return { kind, x: c.x + dir * 1400, y: c.traits.exitY ?? -200 }
  }

  /** Where it may be along the scene: its haunt, or the view and a little past it. */
  function reach(c, world) {
    const { x0, x1 } = world.state.view
    return c.traits.haunt || [x0 - 100, x1 + 100]
  }

  const clampY = (c, y) => Math.max(c.traits.band[0], Math.min(c.traits.band[1], y))

  /** Somewhere to wander to, within its reach and band: now and then, if curious, something on show. */
  function somewhere(c, world, rnd) {
    const [lo, hi] = reach(c, world)
    if (c.traits.curious && rnd() < c.traits.curious) {
      const on = world.offered('sight', lo, hi)
      if (on.length) {
        const o = on[Math.floor(rnd() * on.length)]
        return { kind: 'wander', x: o.x + (rnd() - 0.5) * 60, y: o.y - rnd() * 40 }
      }
    }
    const roam = c.traits.roam * (1 - FOG_KEEPS_CLOSE * (world.state.fog || 0)) // in fog it keeps closer
    const x = Math.max(lo, Math.min(hi, c.x + (rnd() - 0.5) * roam))
    return { kind: 'wander', x, y: between(c.traits.band, rnd()) }
  }

  /** Does it mind this noise, here? */
  function minds(c, n) {
    const by = c.traits.startledBy || []
    if (Array.isArray(by)) return by.includes(n.kind)
    return n.kind in by && Math.abs(n.x - c.x) <= by[n.kind]
  }

  /** What scares it now, as where the fright came from ({ x, y }), or null: a tap, a noise, the hero's nose. */
  function scared(c, world, rnd) {
    if (c.tapped) return { x: c.x - c.vx, y: c.y - c.vy + 1 }
    const n = c.heardUpTo === null ? null : world.heard(c.x, c.heardUpTo).find((h) => minds(c, h)) // noises from before it came are not news
    if (n) return { x: n.x, y: n.y ?? c.y + 1 }
    const nose = world.state.hero?.nose
    const shy = c.traits.shy
    if (shy && nose && Math.hypot(nose.x - c.x, nose.y - c.y) < shy.at && rnd() < shy.odds) return nose
    return null
  }

  /** Must it go home: its stay over, out of its hours, too dark (or too light, if of the night), rain coming or the wet it minds, or the dry if it likes the wet? */
  function homeward(c, world, t) {
    const { hour, light, overcast = 0 } = world.state
    const [from, to] = c.traits.hours
    const wet = world.isWet(c.x)
    const minds = c.traits.wet === 'avoid' && (wet || overcast >= RAIN_COMING)
    const lit = light < c.traits.dark || light > (c.traits.bright ?? Infinity)
    return t > c.leaves || hour < from || hour >= to || lit || minds || (c.traits.wet === 'likes' && !wet)
  }

  /** Something it feeds on, on offer within its reach and a wander of it, and dry if it minds the wet. */
  function food(c, world, rnd) {
    if (!c.traits.feeds) return null
    const [lo, hi] = reach(c, world)
    const near = world.offered(c.traits.feeds, Math.max(lo, c.x - c.traits.roam / 2), Math.min(hi, c.x + c.traits.roam / 2))
      .filter((o) => c.traits.wet !== 'avoid' || !world.isWet(o.x))
    return near.length ? near[Math.floor(rnd() * near.length)] : null
  }

  /** Scared from `from`: a dart a short way off (at full speed at once), still a while if it freezes, else off out of sight. */
  function fright(c, world, t, rnd, from) {
    if (c.traits.dart) {
      const away = Math.atan2(c.y - from.y, c.x - from.x) + (rnd() - 0.5) * 1.2
      const a = c.traits.dartsUp ? Math.atan2(-Math.abs(Math.sin(away)) - 0.6, Math.cos(away)) : away // a bird bursts up, whichever side the fright
      const [lo, hi] = reach(c, world)
      const x = Math.max(lo, Math.min(hi, c.x + Math.cos(a) * c.traits.dart))
      const top = c.traits.speed * c.traits.flee
      c.vx = Math.cos(a) * top
      c.vy = Math.sin(a) * top
      return { kind: 'dart', x, y: clampY(c, c.y + Math.sin(a) * c.traits.dart * 0.5) }
    }
    if (c.traits.freezeMs) {
      c.vx = c.vy = 0 // still, at once
      return { kind: 'freeze', x: c.x, y: c.y, until: t + between(c.traits.freezeMs, rnd()) }
    }
    return away(c, world, 'flee')
  }

  /** Is it in the middle of something it keeps on with: fleeing, home, a dart, or a freeze, a feed or a pause not over yet? */
  function busy(c, t) {
    const g = c.goal
    if (!g) return false
    if (g.kind === 'flee' || g.kind === 'home' || g.kind === 'dart') return true
    return (g.kind === 'freeze' || g.kind === 'feed' || g.kind === 'pause') && (g.until === undefined || t < g.until)
  }

  /** After a feed, a pause, a freeze or an errand: fed if it fed, and free to choose again. */
  function done(c, t, rnd) {
    const was = c.goal?.kind
    if (was === 'feed') c.hungry = t + between(c.traits.hungerMs, rnd()) // fed
    if (was === 'feed' || was === 'pause' || was === 'freeze' || was === 'errand') c.goal = null
  }

  /** Decide what it goes for at time t. Returns the goal, new or kept. */
  function think(c, world, t, rnd) {
    if (c.errand) return errand(c)
    const scary = scared(c, world, rnd)
    c.heardUpTo = world.heardUpTo
    c.tapped = false
    if (c.goal?.kind === 'flee') return c.goal
    if (scary) return (c.goal = fright(c, world, t, rnd, scary))
    if (busy(c, t)) return c.goal
    if (homeward(c, world, t)) return (c.goal = away(c, world, 'home'))
    done(c, t, rnd)
    const o = t >= c.hungry ? food(c, world, rnd) : null
    if (o) return (c.goal = { kind: 'feed', x: o.x, y: o.y, offer: o.id })
    if (!c.goal) c.goal = somewhere(c, world, rnd)
    return c.goal
  }

  /** On an errand: there, and kept there (it hovers) until the game clears it. */
  function errand(c) {
    const e = c.errand
    if (c.goal?.kind !== 'errand' || c.goal.x !== e.x || c.goal.y !== e.y) c.goal = { kind: 'errand', x: e.x, y: e.y }
    return c.goal
  }

  /** Has it got there: home, or well out of the view going home or fleeing? */
  function gone(c, world, d) {
    const g = c.goal
    if (g.kind === 'home' && c.home) return d < ARRIVED
    const { x0, x1 } = world.state.view
    return (g.kind === 'home' || g.kind === 'flee') && (c.y < -100 || c.x < x0 - OFF || c.x > x1 + OFF)
  }

  /** It got where it was going: a feed starts, a hover starts, an errand is reached, or a wander or a dart is done. */
  function arrive(c, t, rnd) {
    const g = c.goal
    if (g.kind === 'feed') g.until = t + between(c.traits.feedMs, rnd())
    else if (g.kind === 'errand') g.reached = true
    else if (c.traits.pauseMs && g.kind === 'wander') c.goal = { kind: 'pause', x: c.x, y: c.y, until: t + between(c.traits.pauseMs, rnd()) }
    else c.goal = null // wandered (or darted) there: think() picks the next place
  }

  /** How fast it goes for its goal, d away. */
  function speedFor(c, g, d) {
    if (g.kind === 'freeze') return 0
    if (g.kind === 'errand') return (c.traits.errandSpeed || c.traits.speed) * Math.min(1, d / EASE_IN)
    const top = c.traits.speed * (g.kind === 'flee' || g.kind === 'dart' ? c.traits.flee : 1)
    return g.kind === 'flee' || g.kind === 'dart' || (g.kind === 'home' && !c.home) ? top : top * Math.min(1, d / EASE_IN)
  }

  /**
   * Move it dt ms towards its goal. Returns 'arrived' the moment it gets
   * there, 'gone' once it is home or well out of the view fleeing, or null.
   */
  function move(c, world, dt, t, rnd) {
    const g = c.goal
    if (g.kind === 'freeze') return null // stock still, wind or not
    const s = dt / 1000
    const k = Math.min(1, c.traits.turn * s)
    const dx = g.x - c.x
    const dy = g.y - c.y
    const d = Math.hypot(dx, dy)
    const speed = speedFor(c, g, d)
    c.vx += ((dx / (d || 1)) * speed - c.vx) * k
    c.vy += ((dy / (d || 1)) * speed - c.vy) * k
    c.x += c.vx * s + (g.kind === 'feed' ? 0 : (c.traits.blown || 0) * world.state.wind * BLOW * s)
    c.y += c.vy * s
    if (gone(c, world, d)) return 'gone'
    const near = g.kind === 'dart' ? ARRIVED * 4 : ARRIVED // a dart is done once it is about there
    if (d >= near || g.until !== undefined || g.reached || g.kind === 'home') return null
    arrive(c, t, rnd)
    return 'arrived'
  }

  /** Is it sitting at its food now? */
  const feeding = (c) => c.goal?.kind === 'feed' && c.goal.until !== undefined

  return { make, think, move, feeding }
})()
