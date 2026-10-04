// The small life of the yard: creatures that go about their own business,
// notice Reksio, and meet each other — a fly that wanders, lands and dodges;
// a bumblebee that works the flowers; a spider that builds a web in the
// corner by the house, dangles on its thread, and catches the fly.
//
// Each creature is a small state machine stepped every frame, with cartoon
// physics: steering with momentum, damped pendulums for threads, quick
// startled darts. They share a "world" they can sense (Reksio's position and
// nose, his barks and snaps, the web) so more creatures and weather can be
// added the same way.
//
// Subtle by design: small, mostly quiet, and never in the way of a tap.

/* global Sound, Reksio, Layout */
/* exported Creatures */
const Creatures = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const GROUND = 812
  const layer = document.getElementById('critters')
  const rnd = (lo, hi) => lo + Math.random() * (hi - lo)
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)

  function el(tag, attrs = {}, parent = layer) {
    const node = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
    parent.appendChild(node)
    return node
  }

  // What creatures can sense. Updated every frame from Reksio.
  const world = {
    t: 0,
    reksio: { x: 0, nose: { x: 0, y: 0 } },
    events: [], // this frame's {type, x, y}: 'bark', 'snap'
  }

  // ------------------------------------------------------------ the web

  // A corner web where the house wall meets the top of the yard wall.
  const CORNER = { x: 316, y: 336 }
  const WEB = {
    hub: { x: 372, y: 394 },
    // the frame of the web: down the house edge, along the wall top
    down: { x: 316, y: 512 },
    along: { x: 512, y: 336 },
  }
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
      return s.path.animate([{ strokeDashoffset: s.len }, { strokeDashoffset: 0 }], { duration: ms, fill: 'forwards' }).finished
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

  const fly = {
    x: 900, y: 520, vx: 0, vy: 0,
    target: null,
    state: 'fly', // fly | land | stuck | wrapped | away
    stateUntil: 0,
    landedOn: null,
    g: null,
    make() {
      this.g = el('g', { class: 'critter fly', 'data-critter': 'fly' })
      el('circle', { r: 26, class: 'critter-hit' }, this.g)
      this.body = el('g', {}, this.g)
      el('ellipse', { cx: -2, cy: -5, rx: 6, ry: 3.5, class: 'fly-wing', transform: 'rotate(-25 -2 -5)' }, this.body)
      el('ellipse', { cx: 2, cy: -5, rx: 6, ry: 3.5, class: 'fly-wing', transform: 'rotate(25 2 -5)' }, this.body)
      el('ellipse', { cx: 0, cy: 0, rx: 6.5, ry: 4.5, class: 'fly-body' }, this.body)
      el('circle', { cx: 6, cy: -1, r: 3.2, class: 'fly-body' }, this.body)
      el('circle', { cx: 7.5, cy: -2, r: 1.3, class: 'fly-eye' }, this.body)
      this.cocoon = el('ellipse', { rx: 6, ry: 8, class: 'cocoon', opacity: 0 }, this.g)
      this.pick()
    },
    /** Where next: mostly wandering about, sometimes a place to land. */
    pick() {
      const r = Math.random()
      const spots = [
        { x: 480, y: 612, name: 'roof' }, // the doghouse roof
        { x: 1321, y: 556, name: 'tap' }, // the tap's spout
      ]
      if (!Layout.hidden.includes('bowl')) spots.push({ x: 880 + Layout.x('bowl'), y: 760, name: 'bowl' })
      if (Layout.flowers) spots.push({ x: 1648 + Layout.x('flowers'), y: 646, name: 'flower' })
      if (r < 0.25) {
        this.target = { ...spots[Math.floor(Math.random() * spots.length)], land: true }
      } else if (r < 0.35 && web.built && !spider.busy) {
        this.target = { x: rnd(345, 420), y: rnd(370, 440) } // drifts near the web…
      } else if (r < 0.45) {
        const n = world.reksio.nose // …or comes to bother Reksio
        this.target = { x: n.x + rnd(-40, 40), y: n.y - rnd(20, 70) }
      } else {
        const x = clamp(world.reksio.x + rnd(-700, 700), 200, 2900)
        this.target = { x, y: rnd(380, 760) }
      }
    },
    /** Startled: dart away from (x, y). */
    dodge(x, y) {
      if (this.state === 'stuck' || this.state === 'wrapped' || this.state === 'away') return
      const a = Math.atan2(this.y - y, this.x - x) + rnd(-0.6, 0.6)
      this.vx = Math.cos(a) * 900
      this.vy = Math.sin(a) * 900 - 200
      this.state = 'fly'
      this.landedOn = null
      this.target = { x: clamp(this.x + Math.cos(a) * 400, 200, 2900), y: clamp(this.y - 150, 360, 760) }
      Sound.zip()
    },
    update(dt) {
      const now = world.t
      if (this.state === 'away') {
        if (now > this.stateUntil) {
          // a new fly arrives from the side of the screen
          this.state = 'fly'
          this.x = world.reksio.x + (Math.random() < 0.5 ? -900 : 900)
          this.y = rnd(400, 600)
          this.g.style.display = ''
          this.cocoon.setAttribute('opacity', '0')
          this.body.style.display = ''
          this.pick()
        }
        return
      }
      if (this.state === 'wrapped') return
      if (this.state === 'stuck') {
        // struggles, buzzing its wings, until the spider comes
        this.body.setAttribute('transform', `rotate(${Math.sin(now * 40) * 18})`)
        return
      }
      if (this.state === 'land') {
        // rubs its hands, and keeps an eye out
        this.body.setAttribute('transform', `translate(0 ${Math.sin(now * 30) * 0.6})`)
        const near = dist(world.reksio.nose.x, world.reksio.nose.y, this.x, this.y)
        if (now > this.stateUntil || (near < 70 && Math.random() < 0.03)) {
          this.state = 'fly'
          this.landedOn = null
          this.vy = -260
          this.pick()
        }
        this.place()
        return
      }
      // flying: steer towards the target with a little zig-zag
      const tx = this.target.x + Math.sin(now * 7) * 30
      const ty = this.target.y + Math.cos(now * 9) * 22
      const dx = tx - this.x
      const dy = ty - this.y
      const d = Math.hypot(dx, dy) || 1
      const speed = 260
      this.vx += ((dx / d) * speed - this.vx) * Math.min(1, dt * 3)
      this.vy += ((dy / d) * speed - this.vy) * Math.min(1, dt * 3)
      this.x += this.vx * dt
      this.y = clamp(this.y + this.vy * dt, 300, 800)
      if (d < 18) {
        if (this.target.land) {
          this.state = 'land'
          this.landedOn = this.target.name
          this.x = this.target.x
          this.y = this.target.y
          this.stateUntil = now + rnd(2.5, 6)
        } else {
          this.pick()
        }
      }
      // flies too close to Reksio's nose get startled
      if (dist(world.reksio.nose.x, world.reksio.nose.y, this.x, this.y) < 45 && Math.random() < 0.05) {
        this.dodge(world.reksio.nose.x, world.reksio.nose.y)
      }
      if (inWeb(this.x, this.y) && !spider.busy && Math.random() < 0.15) {
        this.state = 'stuck'
        web.shiver()
        Sound.buzz(0.4)
        spider.prey(this)
      }
      this.body.setAttribute('transform', this.vx < 0 ? 'scale(-1 1)' : '')
      this.place()
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
      setTimeout(() => {
        this.g.style.display = 'none'
        this.state = 'away'
        this.stateUntil = world.t + rnd(12, 25)
      }, 15000)
    },
  }

  // ------------------------------------------------------------ the bumblebee

  const bee = {
    x: 1700, y: 560, vx: 0, vy: 0,
    flower: 0,
    state: 'fly', // fly | hover | huff
    stateUntil: 0,
    FLOWERS: [{ x: 1604, y: 668 }, { x: 1648, y: 640 }, { x: 1706, y: 680 }].map((f) => ({ x: f.x + Layout.x('flowers'), y: f.y })),
    g: null,
    make() {
      this.g = el('g', { class: 'critter bee', 'data-critter': 'bee' })
      el('circle', { r: 30, class: 'critter-hit' }, this.g)
      this.body = el('g', {}, this.g)
      el('ellipse', { cx: -3, cy: -11, rx: 8, ry: 5, class: 'bee-wing', transform: 'rotate(-20 -3 -11)' }, this.body)
      el('ellipse', { cx: 4, cy: -11, rx: 8, ry: 5, class: 'bee-wing', transform: 'rotate(20 4 -11)' }, this.body)
      el('ellipse', { cx: 0, cy: 0, rx: 12, ry: 9, class: 'bee-body' }, this.body)
      el('path', { d: 'M-4 -8.5 Q-6 0 -4 8.5 M3 -9 Q1 0 3 9', class: 'bee-stripes' }, this.body)
      el('path', { d: 'M-12 0 L-17 1 L-12 3 Z', class: 'bee-sting' }, this.body)
      el('circle', { cx: 9, cy: -2, r: 1.6, class: 'fly-eye' }, this.body)
    },
    update(dt) {
      const now = world.t
      const f = this.FLOWERS[this.flower]
      const reksioNear = dist(world.reksio.nose.x, world.reksio.nose.y, this.x, this.y) < 110
      if (reksioNear && this.state !== 'huff') {
        // a huffy loop up and away, with a buzz
        this.state = 'huff'
        this.stateUntil = now + rnd(4, 7)
        Sound.buzz(0.8)
      }
      let tx = f.x
      let ty = f.y - 26
      if (this.state === 'huff') {
        tx = f.x + Math.cos(now * 2.2) * 140
        ty = 470 + Math.sin(now * 2.2) * 60
        if (now > this.stateUntil) this.state = 'fly'
      } else if (this.state === 'hover') {
        ty += Math.sin(now * 6) * 5 // bobbing in the flower
        if (now > this.stateUntil) {
          this.state = 'fly'
          this.flower = (this.flower + 1 + Math.floor(Math.random() * 2)) % this.FLOWERS.length
        }
      }
      const dx = tx - this.x
      const dy = ty - this.y
      const d = Math.hypot(dx, dy) || 1
      const speed = this.state === 'huff' ? 220 : 120
      this.vx += ((dx / d) * Math.min(speed, d * 3) - this.vx) * Math.min(1, dt * 2.5)
      this.vy += ((dy / d) * Math.min(speed, d * 3) - this.vy) * Math.min(1, dt * 2.5)
      this.x += this.vx * dt
      this.y += this.vy * dt + Math.sin(now * 4) * 0.4 // a heavy, bumbling flight
      if (this.state === 'fly' && d < 8) {
        this.state = 'hover'
        this.stateUntil = now + rnd(2, 4)
      }
      this.body.setAttribute('transform', this.vx < -5 ? 'scale(-1 1)' : '')
      this.g.setAttribute('transform', `translate(${this.x} ${this.y}) scale(1.3)`)
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
      el('circle', { r: 26, class: 'critter-hit' }, this.g)
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
      const start = performance.now()
      await new Promise((resolve) => {
        const step = (t) => {
          const k = Math.min(1, (t - start) / ms)
          this.x = sx + (x - sx) * k
          this.y = sy + (y - sy) * k
          this.legs.setAttribute('transform', `rotate(${Math.sin(t / 40) * 14})`)
          if (k < 1) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
      })
    },
    /** Let out (or reel in) the thread to length to, over ms. A newer drop
     * cancels an older one, so a startled spider can reel in mid-dangle. */
    async drop(to, ms) {
      const token = ++this.dropToken
      const from = this.hang
      const start = performance.now()
      await new Promise((resolve) => {
        const step = (t) => {
          if (token !== this.dropToken) return resolve()
          const k = Math.min(1, (t - start) / ms)
          this.hang = from + (to - from) * (1 - (1 - k) * (1 - k))
          if (k < 1) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
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
      Sound.buzz(0.3)
      for (let i = 0; i < 6; i++) {
        this.legs.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(40deg)' }, { transform: 'rotate(0)' }], { duration: 160 })
        await new Promise((r) => setTimeout(r, 160))
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
      await new Promise((r) => setTimeout(r, rnd(1500, 3500)))
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
      await new Promise((r) => setTimeout(r, 1300))
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
      await new Promise((r) => setTimeout(r, 4000))
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
      if (this.mode === 'idle' && Math.random() < dt / 14) this.dangle()
      this.place()
    },
  }

  // ------------------------------------------------------------ public

  const BY_NAME = { fly, bee, spider }
  let all = []

  /** Bring in this play's creatures (see layout.js). */
  function init(names = Layout.creatures) {
    all = names.map((n) => BY_NAME[n])
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
    for (const e of world.events) {
      if (e.type === 'bark') {
        if (active(spider) && dist(e.x, GROUND - 120, WEB.hub.x, WEB.hub.y) < 500) spider.hide()
        if (active(fly) && dist(e.x, e.y, fly.x, fly.y) < 260) fly.dodge(e.x, e.y)
      }
      if (e.type === 'snap' && active(fly) && dist(e.x, e.y, fly.x, fly.y) < 120) fly.dodge(e.x, e.y)
    }
    world.events.length = 0
    for (const c of all) c.update(dt)
  }

  return {
    init,
    tick,
    /** Tell the creatures what Reksio just did: 'bark' or 'snap', where. */
    notice(type, x, y) { world.events.push({ type, x, y }) },
    /** Where the bee is. */
    get bee() { return active(bee) ? { x: bee.x, y: bee.y } : null },
    /** Where the fly is, if it's about and free. */
    get fly() {
      return active(fly) && (fly.state === 'fly' || fly.state === 'land') ? { x: fly.x, y: fly.y } : null
    },
    /** Where Reksio should stand under the web, facing left, nose below it. */
    webSpot: () => ({ x: WEB.hub.x + 125, hub: WEB.hub }),
    spider,
  }
})()
