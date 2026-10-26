// The small life of the yard: creatures that go about their own business,
// notice Reksio, and meet each other — a fly that wanders, lands and dodges;
// a bumblebee that works the flowers; a spider that builds a web in the
// corner by the house, dangles on its thread, and catches the fly. A gag may
// send the bee on an errand (beeTo: the bramble's flower by Reksio's caught
// tail); it comes even if it isn't out this play, and goes home after.
//
// The fly and the bee live on the world model (docs/WORLD_MODEL.md): what
// they go for, what scares them and when they leave comes from creature.js,
// reading the world state (world.js) the yard writes: the light, the weather
// (rain coming, wet places), Reksio's bark and snap as noises, his nose, and
// what the yard offers (the flowers' nectar, places to land, things to look
// at). Their look, sounds and the web are this file's. The spider and the
// snail are small state machines of their own, with cartoon physics: damped
// pendulums for threads; they hear the world too.
//
// Subtle by design: small, mostly quiet, and never in the way of a tap.

/* global Clock, Creature, Debug, Motion, Sound, Reksio, Layout, Weather, World */
/* exported Creatures */
const Creatures = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const GROUND = 812
  const layer = document.getElementById('critters')
  const random = Debug.random('creatures') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)
  // A critter's invisible tap circle (scene units): about 80 CSS px across on
  // a tablet, so a small finger catches a small, moving fly. Where it covers
  // a thing or Reksio, yard.js lets the critter win only near its middle.
  const HIT_R = 64

  function el(tag, attrs = {}, parent = layer) {
    const node = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
    parent.appendChild(node)
    return node
  }

  // Where Reksio is, and the creatures' time, updated every frame; the rest they sense is the world state (world.js).
  const world = {
    t: 0,
    reksio: { x: 0, nose: { x: 0, y: 0 } },
  }
  const T = () => world.t * 1000 // the creatures' time, in ms: the world model runs on it (World.setup in init)
  const NOISES = { bark: 500, snap: 150 } // how far each of Reksio's noises carries (the spider minds a bark this near; the fly less far)
  const SIGHT_AT_WEB = { x: 382, y: 405 } // something to look at by the web: a curious fly may blunder in

  // ------------------------------------------------------------ the web

  // A corner web where the house wall meets the top of the yard wall.
  const CORNER = { x: 316, y: 336 }
  const WEB = {
    hub: { x: 372, y: 394 },
    // the frame of the web: down the house edge, along the wall top
    down: { x: 316, y: 512 },
    along: { x: 512, y: 336 },
  }
  /** Make a creature's sound as Reksio would hear it from where it is: quiet,
   * and fading with distance. Only creatures that really make a sound get
   * one (flies and bees buzz); the silent ones only make small cartoon
   * noises when they do something. */
  const hear = (x, play) => Sound.from(Math.abs(x - world.reksio.x), play)
  const SNAIL_NOSE = 22 // a snail's nose, ahead of her middle
  const SNAIL_REACH = 26 // she eats food this close to her nose
  const SNAIL_BITE_S = 1.3 // a bite this often…
  const SNAIL_BITES = 6 // …and it's gone after this many
  const WHINE_EVERY_S = 9 // on average, a passing fly whines this often
  const HUM_EVERY_S = 7 // …and a bee hums between flowers this often
  // The fly and the bee are visitors: they turn up a while into the play,
  // stay a while, fly off, and may come back later. Neither comes in the rain,
  // and both go home at sunset (evening()).
  const FLY_FIRST_S = [10, 60] // the fly first turns up this long into the play
  const FLY_STAY_S = [30, 80] // stays this long
  const FLY_GONE_S = [25, 70] // and is away this long before it may come back
  const BEE_FIRST_S = [15, 60]
  const BEE_STAY_S = [35, 90]
  const BEE_GONE_S = [30, 80]
  const ERRAND_SPEED = 260 // sent on an errand, it comes straight and quick: a slow bee across the yard keeps the gag waiting
  const ERRAND_HUM_S = 0.8 // and hums as it comes, so Reksio (and the child) hear it coming
  let dusk = false // the sun has set: the visitors go home
  /** Is it no time for a visitor to come: dusk, dim, rain coming or raining where Reksio is? */
  const staysAway = () => dusk || World.state.light < 0.5 || (World.state.overcast || 0) >= 0.5 || World.isWet(world.reksio.x)

  /** Is a point inside the web's triangle (where things get stuck)? */
  function inWeb(x, y) {
    if (!web.built) return false
    const { x: x0, y: y0 } = CORNER
    const u = (x - x0) / (WEB.along.x - x0)
    const v = (y - y0) / (WEB.down.y - y0)
    return u > 0.05 && v > 0.05 && u + v < 0.92
  }

  const web = {
    built: false,
    g: null,
    strands: [],
    make() {
      this.g = el('g', { class: 'web' })
      const { x: cx, y: cy } = CORNER
      const edge = (t, a, b) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
      // anchor points round the triangle, in angle order from the hub
      const anchors = [
        WEB.along, edge(0.66, CORNER, WEB.along), edge(0.33, CORNER, WEB.along), { x: cx, y: cy },
        edge(0.33, CORNER, WEB.down), edge(0.66, CORNER, WEB.down), WEB.down,
        edge(0.5, WEB.down, WEB.along),
      ]
      const lines = []
      lines.push(`M${WEB.down.x} ${WEB.down.y} L${WEB.along.x} ${WEB.along.y}`) // frame thread
      for (const a of anchors) lines.push(`M${WEB.hub.x} ${WEB.hub.y} L${a.x} ${a.y}`) // radials
      for (const f of [0.28, 0.48, 0.68, 0.86]) {
        // spiral rings: points part-way out along each radial
        const pts = anchors.map((a) => `${WEB.hub.x + (a.x - WEB.hub.x) * f},${WEB.hub.y + (a.y - WEB.hub.y) * f}`)
        lines.push(`M${pts.join(' L')} Z`)
      }
      this.strands = lines.map((d) => {
        const path = el('path', { d, class: 'strand' }, this.g)
        const len = path.getTotalLength()
        path.style.strokeDasharray = `${len}`
        path.style.strokeDashoffset = `${len}`
        return { path, len }
      })
      this.anchors = anchors
    },
    /** Reveal strand i over ms (the spider spinning it). */
    spin(i, ms) {
      const s = this.strands[i]
      return Motion.endAt(s.path, [{ strokeDashoffset: s.len }, { strokeDashoffset: 0 }], { duration: ms })
    },
    /** Tremble when something lands in it. */
    shiver() {
      this.g.animate(
        [0, 1.5, -1.2, 0.8, 0].map((d) => ({ transform: `translate(${d}px, ${-d * 0.6}px)` })),
        { duration: 500 },
      )
    },
  }

  // ------------------------------------------------------------ the fly

  // What the fly is, for the world model (creature.js): it wanders about
  // the yard, now and then lands on something to sit on (the doghouse roof,
  // the tap, the bowl, a flower: 'perch' offers), pesters Reksio's nose and
  // blunders near the web (it is curious: 'sight' offers), darts off from a
  // bark or a snap near it or his nose too close, and leaves before the rain
  // and at dusk.
  const FLY = {
    speed: 260, flee: 3.5, turn: 3, // a dart is about 900 a second, at once
    stayMs: [30000, 80000], hours: [0, 24], dark: 0.5, wet: 'avoid',
    feeds: 'perch', hungerMs: [3000, 10000], feedMs: [2500, 6000], // landing now and then, a while
    startledBy: { bark: 260, snap: 120 }, shy: { at: 45, odds: 0.05 }, dart: 400,
    band: [380, 760], roam: 1400, curious: 0.2, exitY: 400, // leaves sideways, at its own height
  }
  const FLY_DT_MAX = 0.05

  const fly = {
    c: null, // its Creature (creature.js) while it is out
    state: 'away', // out | stuck | wrapped | away
    stateUntil: rnd(...FLY_FIRST_S),
    g: null,
    get x() { return this.c ? this.c.x : 0 },
    get y() { return this.c ? this.c.y : 0 },
    make() {
      this.g = el('g', { class: 'critter fly', 'data-critter': 'fly' })
      el('circle', { r: HIT_R / 1.5, class: 'critter-hit' }, this.g) // the fly is drawn at 1.5×
      this.body = el('g', {}, this.g)
      el('ellipse', { cx: -2, cy: -5, rx: 6, ry: 3.5, class: 'fly-wing', transform: 'rotate(-25 -2 -5)' }, this.body)
      el('ellipse', { cx: 2, cy: -5, rx: 6, ry: 3.5, class: 'fly-wing', transform: 'rotate(25 2 -5)' }, this.body)
      el('ellipse', { cx: 0, cy: 0, rx: 6.5, ry: 4.5, class: 'fly-body' }, this.body)
      el('circle', { cx: 6, cy: -1, r: 3.2, class: 'fly-body' }, this.body)
      el('circle', { cx: 7.5, cy: -2, r: 1.3, class: 'fly-eye' }, this.body)
      this.cocoon = el('ellipse', { rx: 6, ry: 8, class: 'cocoon', opacity: 0 }, this.g)
      this.g.style.display = 'none' // not here yet
    },
    /** Gone (home, off out of sight): away a while before it may come back. */
    goAway(until) {
      this.g.style.display = 'none'
      this.state = 'away'
      this.c = null
      this.stateUntil = world.t + until
    },
    update(dt) {
      const now = world.t
      if (this.state === 'away') return this.arrive(now)
      if (this.state === 'wrapped') return
      if (this.state === 'stuck') {
        // struggles, buzzing its wings, until the spider comes
        this.body.setAttribute('transform', `rotate(${Math.sin(now * 40) * 18})`)
        return
      }
      const c = this.c
      const was = c.goal?.kind
      const goal = Creature.think(c, World, T(), random)
      if (goal.kind === 'dart' && was !== 'dart') hear(c.x, () => Sound.zip())
      const moved = Creature.move(c, World, Math.min(dt, FLY_DT_MAX) * 1000, T(), random)
      if (moved === 'gone') return this.goAway(rnd(...FLY_GONE_S))
      c.y = clamp(c.y, 300, 800)
      if (Creature.feeding(c)) this.body.setAttribute('transform', `translate(0 ${Math.sin(now * 30) * 0.6})`) // rubbing its hands
      else {
        if (random() < dt / WHINE_EVERY_S) hear(c.x, () => Sound.whine())
        this.body.setAttribute('transform', c.vx < 0 ? 'scale(-1 1)' : '')
        this.sense()
      }
      this.place()
    },
    /** Away: after a while (and not when the yard sends it home), it arrives from the side of the screen. */
    arrive(now) {
      if (now <= this.stateUntil || staysAway()) return
      this.state = 'out'
      this.c = Creature.make(FLY, world.reksio.x + (random() < 0.5 ? -900 : 900), rnd(400, 600), T(), random)
      if (dusk) this.c.leaves = 0
      this.g.style.display = ''
      this.cocoon.setAttribute('opacity', '0')
      this.body.style.display = ''
    },
    /** Stuck if it flies into the web. */
    sense() {
      if (inWeb(this.x, this.y) && !spider.busy && random() < 0.15) {
        this.state = 'stuck'
        web.shiver()
        hear(this.x, () => Sound.buzz(0.4))
        spider.prey(this)
      }
    },
    place() {
      this.g.setAttribute('transform', `translate(${this.x} ${this.y}) scale(1.5)`)
    },
    wrap() {
      this.state = 'wrapped'
      this.body.style.display = 'none'
      this.cocoon.setAttribute('opacity', '1')
    },
    /** After a while, the wrapped fly is gone and a new one comes along. */
    later() {
      Clock.after(15000, () => this.goAway(rnd(12, 25)))
    },
    /** Dusk: off home. */
    evening() {
      if (this.c) this.c.leaves = 0
    },
  }

  // ------------------------------------------------------------ the bumblebee

  // What the bee is, for the world model: it works the flowers (nectar),
  // hovering at each a while; huffy, it darts off if Reksio puts his nose in;
  // and it leaves before the rain and at dusk. A gag may send it on an
  // errand (beeTo), and then nothing else counts until it is let go.
  const FLOWERS = [{ x: 1604, y: 668 }, { x: 1648, y: 640 }, { x: 1706, y: 680 }].map((f) => ({ x: f.x + Layout.x('flowers'), y: f.y }))
  const BEE_HAUNT = 600 // it keeps this near its flowers, wherever the camera is
  const BEE = {
    speed: 120, flee: 1.8, turn: 2.5, errandSpeed: ERRAND_SPEED, // heavy, bumbling
    stayMs: [35000, 90000], hours: [0, 24], dark: 0.5, wet: 'avoid',
    feeds: 'nectar', hungerMs: [0, 0], feedMs: [2000, 4000], // flower to flower, hovering at each
    shy: { at: 110, odds: 1 }, dart: 220, // a huffy loop away
    band: [480, 640], roam: 900, haunt: [FLOWERS[0].x - BEE_HAUNT, FLOWERS[FLOWERS.length - 1].x + BEE_HAUNT],
  }
  const OVER_THE_WALL = 240 // where it comes in from, and goes home over

  const bee = {
    c: null,
    state: 'away', // out | away
    stateUntil: rnd(...BEE_FIRST_S),
    errand: null, // {x, y, arrived}: sent somewhere by a gag
    guest: false, // not out this play: came only for an errand, and doesn't come back
    FLOWERS,
    g: null,
    get x() { return this.c ? this.c.x : 0 },
    get y() { return this.c ? this.c.y : 0 },
    make() {
      this.g = el('g', { class: 'critter bee', 'data-critter': 'bee' })
      el('circle', { r: HIT_R / 1.3, class: 'critter-hit' }, this.g) // the bee is drawn at 1.3×
      this.body = el('g', {}, this.g)
      el('ellipse', { cx: -3, cy: -11, rx: 8, ry: 5, class: 'bee-wing', transform: 'rotate(-20 -3 -11)' }, this.body)
      el('ellipse', { cx: 4, cy: -11, rx: 8, ry: 5, class: 'bee-wing', transform: 'rotate(20 4 -11)' }, this.body)
      el('ellipse', { cx: 0, cy: 0, rx: 12, ry: 9, class: 'bee-body' }, this.body)
      el('path', { d: 'M-4 -8.5 Q-6 0 -4 8.5 M3 -9 Q1 0 3 9', class: 'bee-stripes' }, this.body)
      el('path', { d: 'M-12 0 L-17 1 L-12 3 Z', class: 'bee-sting' }, this.body)
      el('circle', { cx: 9, cy: -2, r: 1.6, class: 'fly-eye' }, this.body)
      this.g.style.display = 'none' // not here yet
    },
    update(dt) {
      const now = world.t
      if (this.state === 'away') {
        if (this.errand) this.appear(this.errand.x)
        else return this.arrive(now)
      }
      const c = this.c
      const was = c.goal?.kind
      const goal = Creature.think(c, World, T(), random)
      if (goal.kind === 'dart' && was !== 'dart') hear(c.x, () => Sound.buzz(0.8)) // huffy
      const moved = Creature.move(c, World, Math.min(dt, FLY_DT_MAX) * 1000, T(), random)
      if (moved === 'gone') return this.home(now)
      if (moved === 'arrived' && goal.kind === 'errand') this.there()
      const going = goal.kind !== 'feed' || !Creature.feeding(c)
      this.hum(goal, going, dt)
      if (!going || goal.reached) c.y += Math.sin(now * 6) * 0.25 // bobbing as it hovers
      this.draw()
    },
    /** Now and then a hum as it flies: often coming on an errand, so Reksio (and the child) hear it coming. */
    hum(goal, going, dt) {
      const c = this.c
      if (goal.kind === 'errand') {
        if (Math.hypot(goal.x - c.x, goal.y - c.y) > 60 && random() < dt / ERRAND_HUM_S) hear(c.x, () => Sound.buzz(0.5))
      } else if (going && random() < dt / HUM_EVERY_S) hear(c.x, () => Sound.buzz(0.6))
    },
    draw() {
      this.body.setAttribute('transform', this.c.vx < -5 ? 'scale(-1 1)' : '')
      this.g.setAttribute('transform', `translate(${this.x} ${this.y}) scale(1.3)`)
    },
    /** Away: after a while (and not when the yard sends it home), over the wall to the flowers. */
    arrive(now) {
      if (now <= this.stateUntil || staysAway() || this.guest) return
      this.appear(this.FLOWERS[0].x)
    },
    /** Over the wall, somewhere near x. */
    appear(x) {
      this.state = 'out'
      this.c = Creature.make(BEE, x + (random() < 0.5 ? -1 : 1) * rnd(300, 600), OVER_THE_WALL, T(), random)
      if (this.errand) this.c.errand = { x: this.errand.x, y: this.errand.y }
      if (dusk || this.guest) this.c.leaves = 0
      this.g.style.display = ''
    },
    /** Home over the wall: away a while before it may come back. */
    home(now) {
      this.g.style.display = 'none'
      this.state = 'away'
      this.c = null
      this.stateUntil = now + rnd(...BEE_GONE_S)
    },
    /** There on its errand: whoever waits on it hears. */
    there() {
      const e = this.errand
      if (e?.arrived) e.arrived()
      if (e) e.arrived = null
    },
    /** Let go of its errand: back to its flowers, or home if it was a guest. */
    letGo() {
      const e = this.errand
      this.errand = null
      if (e?.arrived) e.arrived() // nobody waits on an errand that's over
      if (!this.c) return
      this.c.errand = null
      if (this.guest) this.c.leaves = 0
    },
    /** Dusk: off home. */
    evening() {
      if (this.c && !this.errand) this.c.leaves = 0
    },
  }

  // ------------------------------------------------------------ the spider

  const spider = {
    x: CORNER.x + 6, y: CORNER.y + 6, // where it is (the top of its thread)
    hang: 0, // length of its dangling thread (0 = on the web)
    swing: 0, swingV: 0, // pendulum angle and speed while dangling
    mode: 'build', // build | idle | dangle | prey | hide — one thing at a time
    dropToken: 0,
    g: null,
    get busy() { return this.mode !== 'idle' },
    make() {
      this.thread = el('line', { class: 'thread', x1: 0, y1: 0, x2: 0, y2: 0 })
      this.g = el('g', { class: 'critter spider', 'data-critter': 'spider' })
      el('circle', { r: HIT_R, class: 'critter-hit' }, this.g)
      this.legs = el('g', { class: 'spider-legs' }, this.g)
      for (const s of [-1, 1]) {
        for (const [a, b] of [[-14, -10], [-15, -3], [-14, 4], [-12, 10]]) {
          el('path', { d: `M0 0 L${s * 8} ${a * 0.45} L${s * 14} ${b}` }, this.legs)
        }
      }
      el('circle', { r: 6.5, class: 'spider-body' }, this.g)
      el('circle', { cy: -7, r: 4, class: 'spider-body' }, this.g)
      el('circle', { cx: -1.6, cy: -8, r: 1.2, class: 'fly-eye' }, this.g)
      el('circle', { cx: 1.6, cy: -8, r: 1.2, class: 'fly-eye' }, this.g)
      this.place()
    },
    place() {
      const ax = this.x
      const ay = this.y
      const px = ax + Math.sin(this.swing) * this.hang
      const py = ay + Math.cos(this.swing) * this.hang
      this.thread.setAttribute('x1', ax)
      this.thread.setAttribute('y1', ay)
      this.thread.setAttribute('x2', px)
      this.thread.setAttribute('y2', py)
      this.thread.style.opacity = this.hang > 2 ? '1' : '0'
      this.g.setAttribute('transform', `translate(${px} ${py})`)
      this.legs.setAttribute('transform', `rotate(${Math.sin(world.t * 3) * 3})`)
    },
    /** Walk along the web to (x, y) at a spider's pace. */
    async crawl(x, y, speed = 90) {
      const sx = this.x
      const sy = this.y
      const ms = Math.max(1, (dist(sx, sy, x, y) / speed) * 1000)
      const start = Clock.now()
      await new Promise((resolve) => {
        const step = () => {
          const t = Clock.now()
          const k = Math.min(1, (t - start) / ms)
          this.x = sx + (x - sx) * k
          this.y = sy + (y - sy) * k
          this.legs.setAttribute('transform', `rotate(${Math.sin(t / 40) * 14})`)
          if (k < 1) Clock.after(0, step)
          else resolve()
        }
        Clock.after(0, step)
      })
    },
    /** Let out (or reel in) the thread to length to, over ms. A newer drop
     * cancels an older one, so a startled spider can reel in mid-dangle. */
    async drop(to, ms) {
      const token = ++this.dropToken
      const from = this.hang
      if (to - from > 30) hear(this.x, () => Sound.plink())
      const start = Clock.now()
      await new Promise((resolve) => {
        const step = () => {
          if (token !== this.dropToken) return resolve()
          const k = Math.min(1, (Clock.now() - start) / ms)
          this.hang = from + (to - from) * (1 - (1 - k) * (1 - k))
          if (k < 1) Clock.after(0, step)
          else resolve()
        }
        Clock.after(0, step)
      })
    },
    /** Build the web strand by strand, then wait at the hub. */
    async build() {
      this.mode = 'build'
      for (let i = 0; i < web.strands.length; i++) {
        const target = i === 0 ? WEB.along : i <= web.anchors.length ? web.anchors[i - 1] : WEB.hub
        await this.crawl(target.x, target.y, 140)
        await web.spin(i, 420)
      }
      await this.crawl(WEB.hub.x, WEB.hub.y, 120)
      web.built = true
      this.mode = 'idle'
    },
    /** A fly is stuck: run to it, wrap it, go back to the hub. */
    async prey(f) {
      if (this.mode !== 'idle' && this.mode !== 'dangle') return
      this.mode = 'prey'
      await this.drop(0, 300)
      await this.crawl(f.x, f.y, 200)
      hear(f.x, () => Sound.buzz(0.3))
      for (let i = 0; i < 6; i++) {
        this.legs.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(40deg)' }, { transform: 'rotate(0)' }], { duration: 160 })
        await Clock.wait(160)
      }
      f.wrap()
      f.later()
      await this.crawl(WEB.hub.x, WEB.hub.y, 100)
      this.mode = 'idle'
    },
    /** Let itself down on its thread, swing a bit, climb back up. */
    async dangle(depth = rnd(120, 240)) {
      if (this.mode !== 'idle' || !web.built) return
      this.mode = 'dangle'
      this.swingV = rnd(-0.8, 0.8)
      await this.drop(depth, 1400)
      if (this.mode !== 'dangle') return
      await Clock.wait(rnd(1500, 3500))
      if (this.mode !== 'dangle') return
      await this.drop(0, 1600)
      if (this.mode === 'dangle') this.mode = 'idle'
    },
    /** Lower itself down to a given height (Reksio's nose), then back up. */
    async visit(toY) {
      if (this.mode !== 'idle' || !web.built) return false
      this.mode = 'dangle'
      this.swing = 0
      this.swingV = 0.3
      await this.drop(Math.max(40, toY - this.y), 900)
      await Clock.wait(1300)
      await this.drop(0, 1200)
      if (this.mode === 'dangle') this.mode = 'idle'
      return true
    },
    /** Startled by a bark nearby: zip up into the corner, come back later. */
    async hide() {
      if (this.mode !== 'idle' && this.mode !== 'dangle') return
      this.mode = 'hide'
      await this.drop(0, 250)
      await this.crawl(CORNER.x + 4, CORNER.y + 4, 400)
      await Clock.wait(4000)
      await this.crawl(WEB.hub.x, WEB.hub.y, 80)
      this.mode = 'idle'
    },
    update(dt) {
      // pendulum: gravity pulls the swing back towards hanging straight down
      if (this.hang > 2) {
        const g = 900 / Math.max(this.hang, 40)
        this.swingV += -g * Math.sin(this.swing) * dt
        this.swingV *= 1 - 0.6 * dt
        this.swing += this.swingV * dt
      } else {
        this.swing *= 0.9
      }
      if (this.mode === 'idle' && random() < dt / 14) this.dangle()
      this.place()
    },
  }

  // ------------------------------------------------------------ after the rain: the snail

  const snail = {
    x: 0, y: GROUND + 20, dir: 1,
    out: false, // has it come out yet
    tucked: false, // hiding in its shell
    food: null, // a porcino Reksio has put down for her (mushrooms.js): {x, bite(k), done()}
    bites: 0,
    biteAt: 0,
    trail: [],
    g: null,
    make() {
      this.trailPath = el('path', { class: 'snail-trail' })
      this.g = el('g', { class: 'critter snail', 'data-critter': 'snail' })
      el('circle', { r: HIT_R, cy: -10, class: 'critter-hit' }, this.g)
      this.flip = el('g', {}, this.g)
      this.body = el('g', { class: 'snail-body' }, this.flip)
      el('path', { d: 'M-16 0 Q-18 -8 -6 -8 L14 -8 Q22 -8 24 -2 Q26 2 20 2 L-14 2 Z', class: 'snail-foot' }, this.body)
      this.stalks = el('g', { class: 'snail-stalks' }, this.body)
      el('path', { d: 'M17 -8 L22 -22 M20 -7 L28 -19' }, this.stalks)
      el('circle', { cx: 22, cy: -23, r: 2.4, class: 'fly-body' }, this.stalks)
      el('circle', { cx: 28, cy: -20, r: 2.4, class: 'fly-body' }, this.stalks)
      el('circle', { cx: 0, cy: -16, r: 13, class: 'snail-shell' }, this.flip)
      el('path', { d: 'M0 -16 m-1 0 a2 2 0 1 1 3 1 a5 5 0 1 1 -8 -3 a8 8 0 1 1 11 10', class: 'snail-swirl' }, this.flip)
      this.g.style.display = 'none'
    },
    comeOut() {
      // from beside a puddle (or the flowers), heading across the yard
      const ps = Weather.puddles
      const near = ps.length ? ps[Math.floor(random() * ps.length)].x : 1700 + Layout.x('flowers')
      this.x = near + rnd(-120, 120)
      this.dir = random() < 0.5 ? -1 : 1
      this.out = true
      this.g.style.display = ''
      this.body.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1500, easing: 'ease-out' })
    },
    tuck(on) {
      if (this.tucked === on) return
      this.tucked = on
      Motion.endAt(
        this.body,
        on ? [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }] : [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: on ? 250 : 1600, easing: 'ease-out' },
      )
      if (on) {
        this.peekAt = world.t + rnd(3, 6)
        hear(this.x, () => Sound.schlup())
      }
    },
    /** On along the ground at a snail's pace, leaving her shiny trail. */
    creep(dt) {
      this.x += this.dir * 9 * dt
      if (this.x < 420 || this.x > Layout.MAX_X) this.dir *= -1
      const last = this.trail[this.trail.length - 1]
      if (!last || Math.abs(last - this.x) > 4) this.trail.push(this.x)
      if (this.trail.length > 90) this.trail.shift()
      this.stalks.setAttribute('transform', `rotate(${Math.sin(world.t * 1.5) * 6} 18 -8)`)
    },
    /** Is she at the food (then a bite now and then, and it shrinks)? Turned
     * towards it if not. */
    eat() {
      const f = this.food
      const nose = this.x + this.dir * SNAIL_NOSE
      if (Math.abs(f.x - nose) > SNAIL_REACH) {
        this.dir = f.x > this.x ? 1 : -1
        return false
      }
      if (world.t < this.biteAt) return true
      this.biteAt = world.t + SNAIL_BITE_S
      this.bites += 1
      hear(this.x, () => Sound.nibble())
      f.bite(1 - this.bites / SNAIL_BITES)
      if (this.bites >= SNAIL_BITES) {
        f.done()
        this.food = null
        this.bites = 0
      }
      return true
    },
    update(dt) {
      if (!this.out) {
        const since = Weather.sinceRain
        if (since != null && since > 3) this.comeOut()
        return
      }
      const nose = world.reksio.nose
      if (dist(nose.x, nose.y, this.x, this.y - 10) < 120) this.tuck(true)
      else if (this.tucked && world.t > this.peekAt) this.tuck(false)
      if (!this.tucked && !(this.food && this.eat())) this.creep(dt) // eating, she stays put
      if (this.trail.length > 1) {
        this.trailPath.setAttribute('d', `M${this.trail[0]} ${this.y + 2} ` + this.trail.map((x) => `L${x} ${this.y + 2}`).join(' '))
      }
      this.flip.setAttribute('transform', `scale(${this.dir} 1)`)
      this.g.setAttribute('transform', `translate(${this.x} ${this.y})`)
    },
  }

  // ------------------------------------------------------------ after the rain: worms

  const worms = {
    list: [],
    made: false,
    make() {},
    comeUp() {
      this.made = true
      for (const p of Weather.puddles.slice(0, 2)) {
        const x = p.x + (random() < 0.5 ? -1 : 1) * (p.rx + rnd(20, 60))
        const g = el('g', { class: 'critter worm', 'data-critter': 'worm', transform: `translate(${x} ${GROUND + 26})` })
        const hit = el('circle', { r: HIT_R, cy: -20, class: 'critter-hit', display: 'none' }, g)
        const path = el('path', { class: 'worm-body' }, g)
        this.list.push({ x, y: GROUND + 10, g, hit, path, h: 0, age: 0, life: rnd(20, 30), eaten: false })
      }
    },
    update(dt) {
      if (!this.made && Weather.phase === 'after' && Weather.sinceRain > 1.5) this.comeUp()
      for (const w of this.list) {
        if (w.eaten) continue
        w.age += dt
        const going = w.age > w.life
        w.h = Math.max(0, Math.min(22, going ? w.h - dt * 10 : w.h + dt * 10))
        if (!w.popped && w.h > 4) {
          w.popped = true
          hear(w.x, () => Sound.pop())
        }
        const pts = []
        for (let k = 0; k <= 5; k++) {
          const y = -(w.h * k) / 5
          const x = Math.sin(world.t * 4 + k * 1.1) * (2 + k * 0.6)
          pts.push(`${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
        }
        w.path.setAttribute('d', pts.join(' '))
        w.hit.setAttribute('display', w.h > 4 ? 'inline' : 'none') // tappable only while it shows
        if (going && w.h <= 0) {
          w.eaten = true
          w.g.remove()
        }
      }
    },
    /** A worm that's up, for the bird. */
    get up() { return this.list.find((w) => !w.eaten && w.h > 12) || null },
  }

  // ------------------------------------------------------------ public

  const BY_NAME = { fly, bee, spider }
  let all = []
  let spiderHeard = 0 // the last noise the spider has heard (World.heardUpTo)

  /** What the yard offers its creatures: places to land, the flowers' nectar, the web's edge to look at. */
  function offer() {
    World.offer('roof', 'perch', 480, 612) // the doghouse roof
    World.offer('tap', 'perch', 1321 + Layout.x('tap'), 556) // the tap's spout
    if (!Layout.hidden.includes('bowl')) World.offer('bowl', 'perch', 880 + Layout.x('bowl'), 760)
    if (Layout.flowers) {
      World.offer('flower', 'perch', 1648 + Layout.x('flowers'), 646)
      bee.FLOWERS.forEach((f, i) => World.offer(`flower-${i}`, 'nectar', f.x, f.y - 26)) // where a bee hovers at a flower
    }
    World.offer('web', 'sight', SIGHT_AT_WEB.x, SIGHT_AT_WEB.y, () => web.built && !spider.busy)
  }

  /** Bring in this play's creatures (see layout.js). */
  function init(names = Layout.creatures) {
    World.setup(T)
    offer()
    all = names.map((n) => BY_NAME[n])
    if (Layout.rain) {
      snail.make()
      all.push(snail, worms)
    }
    if (names.includes('spider')) {
      web.make()
      spider.make()
      spider.build()
    }
    if (names.includes('fly')) fly.make()
    if (names.includes('bee')) bee.make()
  }
  const active = (c) => all.includes(c)

  function tick(dt) {
    world.t += dt
    world.reksio.x = Reksio.x
    world.reksio.nose = Reksio.mouth()
    World.set({ hero: { x: world.reksio.x, nose: world.reksio.nose } })
    World.offer('nose', 'sight', world.reksio.nose.x, world.reksio.nose.y) // a curious fly comes to bother him
    if (active(spider)) {
      const bark = World.heard(WEB.hub.x, spiderHeard).some((n) => n.kind === 'bark' && Math.abs(n.x - WEB.hub.x) < NOISES.bark)
      spiderHeard = World.heardUpTo
      if (bark) spider.hide()
    }
    for (const c of all) c.update(dt)
  }

  return {
    init,
    tick,
    /** Tell the creatures what Reksio just did: 'bark' or 'snap', where (a noise in the world, world.js). */
    notice(type, x) { World.noise(type, x, NOISES[type] ?? 200) },
    /** The sun has set: the fly and the bee go home, and don't come back. */
    evening() {
      dusk = true
      fly.evening()
      bee.evening()
    },
    /** Where the snail is, once it's out, and which way she's heading. */
    get snail() { return snail.out ? { x: snail.x, y: snail.y, dir: snail.dir } : null },
    /** Food put down for the snail (a porcino: mushrooms.js): she goes to it
     * and eats it bite by bite, bite(k) as it shrinks (k: what's left), done() at the end. */
    feedSnail(food) {
      snail.food?.done() // one still being eaten: finished, not left half-eaten
      snail.food = food
      snail.bites = 0
    },
    /** A worm that's up out of the ground (for the bird): {x, y, eat()}. */
    get worm() {
      const w = worms.up
      return w && { x: w.x, y: w.y, eat() { w.eaten = true; w.g.remove() } }
    },
    /** Send the bee to (x, y) and keep it hovering there until beeFree(): it
     * comes whether or not it is out this play, rain or not. Resolves when it
     * is there (or when let go first). */
    beeTo(x, y) {
      if (!active(bee)) {
        if (!bee.g) bee.make()
        bee.guest = true
        all.push(bee)
      }
      bee.letGo()
      return new Promise((arrived) => {
        bee.errand = { x, y, arrived }
        if (bee.c) bee.c.errand = { x, y }
      })
    },
    /** The errand is over: the bee goes back to its own business. */
    beeFree() { bee.letGo() },
    /** Where the bee feeds: the flowers' heads. */
    get flowers() { return bee.FLOWERS },
    /** Where the bee is. */
    get bee() { return active(bee) && bee.state !== 'away' ? { x: bee.x, y: bee.y } : null },
    /** Where the fly is, if it's about and free. */
    get fly() {
      return active(fly) && fly.state === 'out' ? { x: fly.x, y: fly.y } : null
    },
    /** Where Reksio should stand under the web, facing left, nose below it. */
    webSpot: () => ({ x: WEB.hub.x + 125, hub: WEB.hub }),
    spider,
  }
})()
