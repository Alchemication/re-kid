// The world model (game/world.js, game/creature.js, copies of shared/; the
// runner, ambient.js, draws and is tested in the browser): plain
// rules, no page. A creature is stepped as the game steps it, a frame at a time.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

/** A fresh World and Creature on a pretend clock. */
function load() {
  const sandbox = {}
  vm.createContext(sandbox)
  for (const f of ['world.js', 'creature.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'game', f), 'utf8'), sandbox)
  vm.runInContext('this.World = World; this.Creature = Creature', sandbox)
  const clock = { t: 0 }
  sandbox.World.setup(() => clock.t)
  sandbox.World.set({ hour: 12, light: 1, view: { x0: 0, x1: 1600 } })
  return { World: sandbox.World, Creature: sandbox.Creature, clock }
}

/** A seeded random stream (mulberry32), as Debug.random gives the game. */
function stream(seed = 1) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The ids of what is offered, as an array of this realm (the sandbox's arrays aren't). */
const ids = (offers) => Array.from(offers, (o) => o.id)

const BUTTERFLY = {
  speed: 140, flee: 3, turn: 3, stayMs: [60000, 60000], hours: [8.3, 18.6], dark: 0.5, wet: 'avoid',
  feeds: 'nectar', hungerMs: [3000, 3000], feedMs: [2000, 2000], startledBy: ['vroom'], band: [420, 690], roam: 900,
}

/** Step it for ms, a frame at a time; returns what move() said at each frame that said something. */
function run(w, c, ms, rnd, onFrame = () => {}) {
  const said = []
  for (let k = 0; k < ms / 16; k++) {
    w.clock.t += 16
    w.Creature.think(c, w.World, w.clock.t, rnd)
    const r = w.Creature.move(c, w.World, 16, w.clock.t, rnd)
    if (r) said.push({ r, t: w.clock.t, goal: c.goal?.kind })
    onFrame(c)
    if (r === 'gone') break
  }
  return said
}

test.describe('the world state', () => {
  test('offers what is open, of the kind asked, where asked', () => {
    const { World } = load()
    let open = true
    World.offer('a', 'nectar', 100, 600, () => open)
    World.offer('b', 'nectar', 900, 600)
    World.offer('c', 'drink', 120, 700)
    assert.deepEqual(ids(World.offered('nectar')), ['a', 'b'])
    assert.deepEqual(ids(World.offered('nectar', 0, 500)), ['a'])
    open = false
    assert.deepEqual(ids(World.offered('nectar')), ['b'])
    World.withdraw('b')
    assert.deepEqual(ids(World.offered('nectar')), [])
  })

  test('a wet place is wet only there, and only while it rains', () => {
    const { World, clock } = load()
    World.wet(1500, 1700, 2000)
    assert.ok(World.isWet(1600))
    assert.ok(!World.isWet(1400))
    clock.t = 2001
    assert.ok(!World.isWet(1600))
  })

  test('a noise is heard within its reach, and only as news', () => {
    const { World, clock } = load()
    clock.t = 100
    World.noise('vroom', 1000, 300)
    assert.equal(World.heard(1200, 0).length, 1)
    assert.equal(World.heard(1400, 0).length, 0) // out of reach
    assert.equal(World.heard(1200, World.heardUpTo).length, 0) // heard already
    World.noise('vroom', 1000, 300) // in the same ms: still news
    assert.equal(World.heard(1200, 1).length, 1)
  })
})

test.describe('a creature', () => {
  test('wanders over the view, within its band, while not hungry', () => {
    const w = load()
    const rnd = stream()
    const c = w.Creature.make({ ...BUTTERFLY, feeds: null }, 800, 500, 0, rnd)
    run(w, c, 20000, rnd, (b) => {
      assert.ok(b.x > -200 && b.x < 1800, `x ${b.x}`)
      assert.ok(b.y > 380 && b.y < 730, `y ${b.y}`)
    })
    assert.equal(c.goal?.kind ?? 'wander', 'wander')
  })

  test('hungry, it goes to a flower on offer, sits a while, and moves on fed', () => {
    const w = load()
    const rnd = stream()
    w.World.offer('tulip', 'nectar', 400, 620)
    const c = w.Creature.make(BUTTERFLY, 700, 500, 0, rnd)
    const said = run(w, c, 15000, rnd)
    const sat = said.find((s) => s.goal === 'feed')
    assert.ok(sat, 'it reached the flower')
    assert.ok(Math.hypot(c.x - 400, c.y - 620) > 6 || w.Creature.feeding(c), 'still there only while feeding')
    // it sat feedMs, then left fed: the next arrival is a wander, after the feed ended
    const after = said.find((s) => s.t > sat.t && s.goal !== 'feed')
    assert.ok(!after || after.t >= sat.t + BUTTERFLY.feedMs[0])
  })

  test('looks for food near it, not across the whole meadow', () => {
    const w = load()
    const rnd = stream()
    w.World.set({ view: { x0: 0, x1: 4000 } })
    w.World.offer('far', 'nectar', 3500, 620)
    const c = w.Creature.make(BUTTERFLY, 500, 500, 0, rnd)
    c.hungry = 0
    w.Creature.think(c, w.World, 1, rnd)
    assert.equal(c.goal.kind, 'wander')
  })

  test('keeps away from flowers in the rain, and leaves when the rain reaches it', () => {
    const w = load()
    const rnd = stream()
    w.World.offer('wild', 'nectar', 1600, 600)
    w.World.wet(1500, 1700, 60000)
    const c = w.Creature.make(BUTTERFLY, 1000, 500, 0, rnd)
    c.hungry = 0
    run(w, c, 5000, rnd)
    assert.notEqual(c.goal?.kind, 'feed')
    c.x = 1600 // the cloud drifts over it
    w.Creature.think(c, w.World, w.clock.t, rnd)
    assert.equal(c.goal.kind, 'home')
  })

  test('tapped, it flees quicker than it wanders, out of sight', () => {
    const w = load()
    const rnd = stream()
    const c = w.Creature.make(BUTTERFLY, 800, 500, 0, rnd)
    c.tapped = true
    const said = run(w, c, 10000, rnd)
    assert.equal(said.at(-1).r, 'gone')
    assert.ok(said.at(-1).t < 4500, 'quicker than a wander off would be')
  })

  test('a noise it minds scares it off; one it doesn\'t, doesn\'t', () => {
    const w = load()
    const rnd = stream()
    const c = w.Creature.make(BUTTERFLY, 800, 500, 0, rnd)
    w.clock.t = 10
    w.World.noise('bell', 800, Infinity)
    w.Creature.think(c, w.World, w.clock.t, rnd)
    assert.notEqual(c.goal.kind, 'flee')
    w.clock.t = 20
    w.World.noise('vroom', 900, 300)
    w.Creature.think(c, w.World, w.clock.t, rnd)
    assert.equal(c.goal.kind, 'flee')
  })

  test('goes home when its stay is over, out of its hours, or when the light goes', () => {
    for (const [why, setup] of [
      ['stay', (w, c) => (w.clock.t = c.leaves + 1)],
      ['hours', (w) => w.World.set({ hour: 18.7 })],
      ['dark', (w) => w.World.set({ light: 0.3 })], // an eclipse, as much as dusk
    ]) {
      const w = load()
      const rnd = stream()
      const c = w.Creature.make(BUTTERFLY, 800, 500, 0, rnd)
      setup(w, c)
      w.Creature.think(c, w.World, w.clock.t, rnd)
      assert.equal(c.goal.kind, 'home', why)
    }
  })

  test('one that freezes keeps still a while when scared, then goes on', () => {
    const w = load()
    const rnd = stream()
    const c = w.Creature.make({ ...BUTTERFLY, freezeMs: [3000, 3000] }, 800, 500, 0, rnd)
    run(w, c, 1000, rnd)
    c.tapped = true
    w.Creature.think(c, w.World, w.clock.t, rnd)
    assert.equal(c.goal.kind, 'freeze')
    const at = c.x
    run(w, c, 2500, rnd)
    assert.ok(Math.abs(c.x - at) < 60, 'it eased to a stop, and stayed')
    assert.equal(c.goal.kind, 'freeze')
    run(w, c, 1000, rnd)
    assert.notEqual(c.goal.kind, 'freeze')
  })

  test('keeps to its haunt, and hovers where it gets to', () => {
    const w = load()
    const rnd = stream()
    const c = w.Creature.make({ ...BUTTERFLY, feeds: null, haunt: [700, 900], pauseMs: [500, 500] }, 800, 500, 0, rnd)
    let paused = 0
    run(w, c, 20000, rnd, (b) => {
      assert.ok(b.x > 650 && b.x < 950, `x ${b.x}`)
      if (b.goal?.kind === 'pause') paused += 1
    })
    assert.ok(paused > 0, 'it hovered')
  })

  test('one with a home goes back to it, not off out of sight', () => {
    const w = load()
    const rnd = stream()
    const home = { x: 820, y: 760 }
    const c = w.Creature.make({ ...BUTTERFLY, speed: 40 }, 800, 700, 0, rnd, home)
    w.World.set({ hour: 19 })
    const said = run(w, c, 10000, rnd)
    assert.equal(said.at(-1).r, 'gone')
    assert.ok(Math.hypot(c.x - home.x, c.y - home.y) < 6)
  })

  test('one that likes the wet goes home when it dries', () => {
    const w = load()
    const rnd = stream()
    w.World.wet(0, 1600, 5000)
    const c = w.Creature.make({ ...BUTTERFLY, wet: 'likes' }, 800, 500, 0, rnd, { x: 800, y: 760 })
    run(w, c, 4000, rnd)
    assert.notEqual(c.goal.kind, 'home')
    run(w, c, 1500, rnd)
    assert.equal(c.goal.kind, 'home')
  })

  test('the wind pushes a light one downwind, but not while it feeds', () => {
    const w = load()
    const rnd = stream()
    w.World.set({ wind: 1 })
    const still = w.Creature.make({ ...BUTTERFLY, feeds: null }, 800, 500, 0, rnd)
    const light = w.Creature.make({ ...BUTTERFLY, feeds: null, blown: 1 }, 800, 500, 0, stream())
    for (const c of [still, light]) c.goal = { kind: 'pause', x: 800, y: 500, until: 1e9 } // hovering where it is
    run(w, still, 1000, rnd)
    run(w, light, 1000, stream())
    assert.ok(light.x - still.x > 40, `pushed ${light.x - still.x}`)
    const feeding = w.Creature.make({ ...BUTTERFLY, blown: 1 }, 800, 500, 0, rnd)
    feeding.goal = { kind: 'feed', x: 800, y: 500, until: 1e9 }
    run(w, feeding, 1000, rnd)
    assert.ok(Math.abs(feeding.x - 800) < 2)
  })

  test('startled, one that darts goes a short way off at once, then carries on', () => {
    const w = load()
    const rnd = stream()
    const c = w.Creature.make({ ...BUTTERFLY, feeds: null, speed: 260, flee: 3.5, startledBy: { bark: 260 }, dart: 400 }, 800, 500, 0, rnd) // the yard's fly
    run(w, c, 500, rnd)
    const at = { x: c.x, y: c.y }
    w.World.noise('bark', at.x + 100, 500)
    run(w, c, 250, rnd)
    assert.ok(Math.hypot(c.x - at.x, c.y - at.y) > 120, 'a dart, at once')
    run(w, c, 1500, rnd)
    assert.notEqual(c.goal?.kind ?? 'wander', 'flee', 'and on it goes, not off out of sight')
  })

  test('a noise minded only within its range', () => {
    const w = load()
    const rnd = stream()
    const c = w.Creature.make({ ...BUTTERFLY, feeds: null, startledBy: { bark: 260 }, dart: 400 }, 800, 500, 0, rnd)
    w.clock.t = 10
    w.World.noise('bark', 1500, 1000)
    w.Creature.think(c, w.World, w.clock.t, rnd)
    assert.notEqual(c.goal.kind, 'dart')
  })

  test('a shy one darts from the hero\'s nose when it comes close', () => {
    const w = load()
    const rnd = stream()
    const c = w.Creature.make({ ...BUTTERFLY, feeds: null, shy: { at: 100, odds: 1 }, dart: 200 }, 800, 500, 0, rnd)
    w.World.set({ hero: { x: 800, nose: { x: 810, y: 505 } } })
    w.Creature.think(c, w.World, 1, rnd)
    assert.equal(c.goal.kind, 'dart')
  })

  test('sent on an errand it goes there whatever else, stays, and when let go carries on', () => {
    const w = load()
    const rnd = stream()
    const c = w.Creature.make({ ...BUTTERFLY, errandSpeed: 300, startledBy: ['vroom'] }, 200, 500, 0, rnd)
    c.errand = { x: 900, y: 600 }
    const said = run(w, c, 4000, rnd, () => w.World.noise('vroom', c.x, 500)) // scary all the way: no matter
    assert.ok(said.some((x) => x.r === 'arrived' && x.goal === 'errand'))
    assert.ok(Math.hypot(c.x - 900, c.y - 600) < 10)
    c.errand = null
    w.Creature.think(c, w.World, w.clock.t, rnd)
    assert.notEqual(c.goal.kind, 'errand')
  })

  test('one that minds the wet goes home when the sky clouds over, before the rain', () => {
    const w = load()
    const rnd = stream()
    const c = w.Creature.make(BUTTERFLY, 800, 500, 0, rnd)
    w.World.set({ overcast: 0.8 })
    w.Creature.think(c, w.World, 1, rnd)
    assert.equal(c.goal.kind, 'home')
  })

  test('a curious one wanders now and then to something on show', () => {
    const w = load()
    const rnd = stream(3)
    w.World.offer('nose', 'sight', 1000, 600)
    const c = w.Creature.make({ ...BUTTERFLY, feeds: null, curious: 1 }, 800, 500, 0, rnd)
    w.Creature.think(c, w.World, 1, rnd)
    assert.ok(Math.abs(c.goal.x - 1000) < 40 && c.goal.y <= 600)
  })

  test('the same stream makes the same flight', () => {
    const flight = () => {
      const w = load()
      const rnd = stream(7)
      w.World.offer('tulip', 'nectar', 400, 620)
      const c = w.Creature.make(BUTTERFLY, 1200, 500, 0, rnd)
      const path = []
      run(w, c, 8000, rnd, (b) => path.push(Math.round(b.x), Math.round(b.y)))
      return path.join(',')
    }
    assert.equal(flight(), flight())
  })
})
