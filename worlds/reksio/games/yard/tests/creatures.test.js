// Unit tests for creatures.js: how the yard's creatures behave, stepped frame
// by frame on a pretend page, with a Reksio, weather and sounds the test
// controls. Seeded, so every run is the same.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const DT = 0.05 // one frame, about

/** A yard with only creatures in it. `query` picks them (layout.js flags). */
function yard(query) {
  const reksio = { x: 1500, nose: { x: 1560, y: 640 } }
  const weather = { phase: 'dry', raining: false, puddles: [], sinceRain: null }
  const sounds = []
  const bowl = { dx: 0, down: true } // the bowl (bowl.js): where it stands this play, and whether it is on the ground
  const page = load(['debug.js', 'layout.js', 'world.js', 'creature.js', 'creatures.js'], {
    query: `?seed=1&${query}`,
    dom: true,
    globals: {
      Reksio: { get x() { return reksio.x }, mouth: () => reksio.nose },
      Weather: weather,
      Bowl: { get x() { return 880 + bowl.dx }, get down() { return bowl.down } },
      Sound: new Proxy({}, { get: (_, name) => (name === 'from' ? (_d, play) => play() : () => sounds.push(name)) }),
    },
  })
  const Creatures = page.get('Creatures')
  const World = page.get('World')
  bowl.dx = page.get('Layout').x('bowl')
  Creatures.init()
  return {
    Creatures,
    World,
    bowl,
    reksio,
    weather,
    sounds,
    /** Let `seconds` pass. */
    run(seconds) {
      for (let i = 0; i < Math.round(seconds / DT); i++) Creatures.tick(DT)
    },
    /** Let time pass until `cond()` holds (at most `seconds`); how long it took, or null. */
    until(cond, seconds) {
      for (let i = 0; i < Math.round(seconds / DT); i++) {
        if (cond()) return i * DT
        Creatures.tick(DT)
      }
      return cond() ? seconds : null
    },
    /** It rains: as the yard's weather tells the world (weather.js), the sky over and the whole yard wet. */
    rain() {
      weather.phase = 'raining'
      weather.raining = true
      World.set({ overcast: 1 })
      World.wet(-500, 4500, 1e9)
    },
  }
}

const near = (a, b, r) => Math.hypot(a.x - b.x, a.y - b.y) < r

describe('the fly', () => {
  it('turns up within a minute of a dry play', () => {
    const y = yard('creatures=fly&rain=0')
    assert.equal(y.Creatures.fly, null)
    assert.ok(y.until(() => y.Creatures.fly, 61) != null)
  })

  it('never comes in the rain', () => {
    const y = yard('creatures=fly&rain=0')
    y.rain()
    y.run(150)
    assert.equal(y.Creatures.fly, null)
  })

  it('darts off when Reksio barks at it', () => {
    const y = yard('creatures=fly&rain=0')
    y.until(() => y.Creatures.fly, 61)
    y.run(1)
    const before = { ...y.Creatures.fly }
    y.Creatures.notice('bark', before.x, before.y)
    y.run(0.25)
    const moved = Math.hypot(y.Creatures.fly.x - before.x, y.Creatures.fly.y - before.y)
    assert.ok(moved > 120, `moved ${moved.toFixed(0)}: a dart, not its usual drift (about 65)`)
  })

  it('ignores a bark far away', () => {
    const y = yard('creatures=fly&rain=0')
    y.until(() => y.Creatures.fly, 61)
    y.run(1)
    const before = { ...y.Creatures.fly }
    y.Creatures.notice('bark', before.x + 800, before.y)
    y.run(0.25)
    assert.ok(Math.hypot(y.Creatures.fly.x - before.x, y.Creatures.fly.y - before.y) < 120)
  })

  it('goes when the rain comes, and stays away while it rains', () => {
    const y = yard('creatures=fly&rain=0')
    y.until(() => y.Creatures.fly, 61)
    y.rain()
    assert.ok(y.until(() => !y.Creatures.fly, 30) != null, 'still about after 30 s of rain')
    y.run(120)
    assert.equal(y.Creatures.fly, null)
  })

  it('stays in the yard, between the wall top and the ground', () => {
    const y = yard('creatures=fly&rain=0')
    y.until(() => y.Creatures.fly, 61)
    for (let i = 0; i < 400; i++) {
      y.run(0.1)
      const f = y.Creatures.fly
      if (f) assert.ok(f.y >= 300 && f.y <= 800, `y ${f.y}`)
    }
  })
})

describe('the bee', () => {
  it('turns up and works the flowers', () => {
    const y = yard('creatures=bee&rain=0&flowers=1')
    assert.ok(y.until(() => y.Creatures.bee, 61) != null, 'never came')
    const flowers = y.Creatures.flowers
    assert.ok(y.until(() => flowers.some((f) => near(y.Creatures.bee, { x: f.x, y: f.y - 26 }, 12)), 30) != null, 'never reached a flower')
  })

  it('makes a huffy loop away when Reksio puts his nose in', () => {
    const y = yard('creatures=bee&rain=0&flowers=1')
    y.until(() => y.Creatures.bee, 61)
    const flowers = y.Creatures.flowers
    y.until(() => flowers.some((f) => near(y.Creatures.bee, { x: f.x, y: f.y - 26 }, 12)), 30)
    const at = { ...y.Creatures.bee }
    y.reksio.nose = { x: at.x, y: at.y }
    y.run(0.1)
    y.reksio.nose = { x: -1000, y: 0 } // and away again
    y.run(2)
    assert.ok(!near(y.Creatures.bee, at, 60), 'still at the flower')
    assert.ok(y.sounds.includes('buzz'))
  })

  it('goes home when the rain comes', () => {
    const y = yard('creatures=bee&rain=0&flowers=1')
    y.until(() => y.Creatures.bee, 61)
    y.rain()
    assert.ok(y.until(() => !y.Creatures.bee, 30) != null)
  })
})

describe('the bee on an errand (the bramble)', () => {
  const FLOWER = { x: 2440, y: 668 }

  it('comes even when it is not out this play, hovers there, and once let go goes home for good', async () => {
    const y = yard('creatures=fly&rain=0')
    let there = false
    y.Creatures.beeTo(FLOWER.x, FLOWER.y).then(() => (there = true))
    const took = y.until(() => y.Creatures.bee && near(y.Creatures.bee, FLOWER, 12), 10)
    assert.ok(took != null && took < 5, `took ${took} s`)
    y.run(3)
    await Promise.resolve()
    assert.ok(there, 'beeTo resolves once it is there')
    assert.ok(near(y.Creatures.bee, FLOWER, 20), 'it stays, hovering')
    y.Creatures.beeFree()
    assert.ok(y.until(() => !y.Creatures.bee, 30) != null, 'never went home')
    assert.equal(y.until(() => y.Creatures.bee, 200), null, 'a guest does not come back')
  })

  it('comes in the rain too, and is not huffy with Reksio right by it', () => {
    const y = yard('creatures=bee&rain=0&flowers=1')
    y.rain()
    y.Creatures.beeTo(FLOWER.x, FLOWER.y)
    y.reksio.nose = { ...FLOWER }
    y.until(() => y.Creatures.bee && near(y.Creatures.bee, FLOWER, 12), 10)
    y.run(3)
    assert.ok(near(y.Creatures.bee, FLOWER, 20))
  })

  it('let go before it got there, whoever waited on it hears', async () => {
    const y = yard('creatures=bee&rain=0&flowers=1')
    let done = false
    y.Creatures.beeTo(FLOWER.x, FLOWER.y).then(() => (done = true))
    y.Creatures.beeFree()
    await Promise.resolve()
    assert.ok(done)
  })

  it('back to its flowers after, when it is out this play', () => {
    const y = yard('creatures=bee&rain=0&flowers=1')
    y.until(() => y.Creatures.bee, 61)
    y.Creatures.beeTo(FLOWER.x, FLOWER.y)
    y.until(() => near(y.Creatures.bee, FLOWER, 12), 10)
    y.Creatures.beeFree()
    const flowers = y.Creatures.flowers
    assert.ok(y.until(() => y.Creatures.bee && flowers.some((f) => near(y.Creatures.bee, { x: f.x, y: f.y - 26 }, 12)), 30) != null)
  })
})

describe('the spider', () => {
  it('hides when Reksio barks near its web', () => {
    const y = yard('creatures=spider&rain=0')
    y.Creatures.spider.mode = 'idle' // its web built
    y.Creatures.notice('bark', y.Creatures.webSpot().x, 600)
    y.run(DT)
    assert.equal(y.Creatures.spider.mode, 'hide')
  })

  it('pays no heed to a bark across the yard', () => {
    const y = yard('creatures=spider&rain=0')
    y.Creatures.spider.mode = 'idle'
    y.Creatures.notice('bark', 2500, 600)
    y.run(DT)
    assert.notEqual(y.Creatures.spider.mode, 'hide')
  })
})

describe('after the rain', () => {
  /** The rain stopped `sinceRain` seconds ago, a puddle still wet: as the yard's weather tells the world (weather.js). */
  const afterRain = (y, sinceRain) => {
    y.World.set({ overcast: 0 })
    y.World.offer('puddle-0', 'drink', 2000, 812)
    y.World.wet(1900, 2100, 1e9)
    y.run(sinceRain)
  }

  it('brings no snail and no worms to a dry play', () => {
    const y = yard('creatures=&rain=0')
    afterRain(y, 10)
    y.run(10)
    assert.equal(y.Creatures.snail, null)
    assert.equal(y.Creatures.worm, null)
  })

  it('brings the snail out by a puddle a few seconds after the rain', () => {
    const y = yard('creatures=&rain=1')
    afterRain(y, 2)
    y.run(1)
    assert.equal(y.Creatures.snail, null)
    afterRain(y, 4)
    y.run(DT)
    assert.ok(Math.abs(y.Creatures.snail.x - 2000) <= 120)
  })

  it('makes the snail stop in its shell while Reksio sniffs it, and go on after', () => {
    const y = yard('creatures=&rain=1')
    afterRain(y, 4)
    y.run(DT)
    const s = y.Creatures.snail
    y.reksio.nose = { x: s.x, y: s.y - 10 }
    y.run(0.1)
    const x = y.Creatures.snail.x
    y.run(3)
    assert.equal(y.Creatures.snail.x, x, 'crawled with Reksio\'s nose on it')
    y.reksio.nose = { x: -1000, y: 0 }
    y.run(8)
    assert.notEqual(y.Creatures.snail.x, x, 'never came out again')
  })

  it('lets the snail crawl about for minutes, arriving and setting off again (Adam\'s bug, 2026-10-27)', () => {
    // arriving where she wandered to clears her goal (creature.js): reading it
    // then threw on every frame, and the whole yard froze with Reksio in it
    const y = yard('creatures=&rain=1')
    afterRain(y, 4)
    y.run(DT)
    y.reksio.nose = { x: -1000, y: 0 }
    const xs = new Set()
    for (let i = 0; i < 300; i++) {
      y.run(1)
      xs.add(Math.round(y.Creatures.snail.x / 10))
    }
    assert.ok(xs.size > 3, 'she never went anywhere')
  })

  it('brings worms up by the puddles, which the bird can eat', () => {
    const y = yard('creatures=&rain=1')
    afterRain(y, 2)
    assert.ok(y.until(() => y.Creatures.worm, 5) != null, 'no worm came up')
    const w = y.Creatures.worm
    assert.ok(Math.abs(w.x - 2000) < 100 + 60 + 1)
    w.eat()
    assert.equal(y.Creatures.worm, null)
  })
})

describe('sparrows, in winter', () => {
  /** A winter play with his bowl out at x 880, as the yard's weather tells the world (cold). */
  const winter = () => {
    const y = yard('creatures=&rain=0&season=winter&props=bowl')
    y.World.set({ cold: 1 })
    return y
  }
  const atBowl = (y) => y.Creatures.sparrows.filter((s) => s.pecking).length

  it('come in a little flock to peck at his bowl, the ground being under snow', () => {
    const y = winter()
    y.reksio.x = -1000 // far off
    y.reksio.nose = { x: -1000, y: 0 }
    assert.ok(y.until(() => atBowl(y) >= 1, 60) != null, 'none came to peck')
    assert.ok(y.Creatures.sparrows.length >= 2)
  })

  it('never come in summer', () => {
    const y = yard('creatures=&rain=0&season=summer&props=bowl')
    y.run(90)
    assert.equal(y.Creatures.sparrows.length, 0)
  })

  it('burst up at a bark, and keep off while his nose is at the bowl', () => {
    const y = winter()
    y.reksio.x = -1000
    y.reksio.nose = { x: -1000, y: 0 }
    y.until(() => atBowl(y) >= 1, 60)
    const bowl = y.Creatures.sparrows.find((s) => s.pecking)
    y.Creatures.notice('bark', bowl.x)
    y.run(0.3)
    assert.equal(atBowl(y), 0, 'still pecking after a bark')
    assert.ok(y.Creatures.sparrows.every((s) => s.y < bowl.y - 30), 'they burst up, not along the ground')
    y.reksio.nose = { x: bowl.x + 60, y: 700 } // his nose by the bowl
    y.run(8)
    assert.equal(atBowl(y), 0, 'pecking with his nose right there')
    y.reksio.nose = { x: bowl.x + 400, y: 700 } // and off he goes
    assert.ok(y.until(() => atBowl(y) >= 1, 15) != null, 'never came back')
  })
})

describe('sparrows and the bowl', () => {
  it('never peck at the bowl while it is on his head', () => {
    const y = yard('creatures=&rain=0&season=winter&props=bowl')
    y.World.set({ cold: 1 })
    y.bowl.down = false
    y.reksio.x = -1000
    y.reksio.nose = { x: -1000, y: 0 }
    y.run(60)
    assert.equal(y.Creatures.sparrows.filter((s) => s.pecking).length, 0)
  })
})
