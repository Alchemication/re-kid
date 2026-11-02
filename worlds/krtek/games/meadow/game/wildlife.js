// The meadow's wild animals (invented, Adam 2026-11-01: "make the world truly
// alive"): one kind a play, drawn from the play's own stream, coming out now
// and then at its own hours, far off along the meadow's far edge, small, so
// they never take the eye from what happens in front (Adam: far in the
// distance, now and then a bit closer).
//
// - Roe deer (sarny), morning and evening: a doe with a fawn or two, or a
//   few together with a buck. They graze, lift their heads to look about,
//   the fawns hop about their mother; startled, they bound off.
// - Wild boar, from the afternoon: a sow with a line of striped piglets, or a
//   male alone. She roots with her snout down; the piglets pair off to
//   wrestle, shoving and hopping; startled, they trot off in a line.
// - The żubr, about midday: a bull alone, or a cow with her calf. Slow,
//   grazing a long while; a tap only has him turn his head and look, chewing;
//   only something big (the bulldozer, thunder) sends him off, and then at a
//   lumber.
//
// What they do comes from the world model (creature.js on world.js): the
// herd's leader is a creature that wanders, kept inside the view (they are
// there to be seen), pauses to graze, goes home out of its hours or in the
// dim, and flees the noises it minds (the bulldozer's rumble, the car,
// thunder). The others follow it, each a little behind, each with its own
// life while they graze: a step or two now and then, a swish of the tail.
//
// Each one's legs move with the ground it covers, never on a loop of their
// own (Adam, 2026-11-02: they slid, stiff): walking, each leg in turn, the
// body rising a little with each step and the head nodding; running, a
// gallop, the body lifting off with each bound. Short legs swing wider and
// quicker, so the piglets patter after their mother. The church bell has them lift
// their heads a moment. A tap on them: deer and boar look up, then off; the
// żubr looks back. They come and go out of sight, never in view.
//
// ?wild=deer|boar|bison asks for that kind at once (layout.js), ?wild=now the
// play's own; a still play (?still) has none unless asked. The draws are made
// either way, so asking shifts nothing else.

/* global Ambient, Clock, Creature, Debug, Sound, WildArt, World */
/* exported Wildlife */
const Wildlife = (() => {
  const FAR = { y: 642, k: 0.3 } // along the meadow's far edge, at this size (the bushes start at 628: painting.js)…
  const NEAR = { y: 690, k: 0.5 } // …and at most this near, this big: never down in front, where the story plays
  const NEARER = 0.3 // in this share of visits they wander nearer, the rest stay far off
  const LOOK_MS = 4000 // how often the meadow looks whether they may come
  const GAP_HOURS = 1.6 // after a visit, at least this long before the next
  const VISITS = 2 // at most this many a day
  const FOLLOW_MS = 450 // the others catch up with the leader over about this long
  const BELL_LOOK_MS = 2200 // the bell: heads up this long
  const TAP_LOOK_MS = 900 // a tap: heads up this long, then (deer, boar) off
  const INSIDE = 260 // the leader keeps this far inside the view's edges, the others trailing behind it still in view
  const OUT = 160 // they come in from this far out of sight
  const WALK = {
    phases: [0.75, 0.25, 0.5, 0], // each leg in turn: hind near, fore near, hind far, fore far
    swing: 20, // degrees each way at the hip
    bob: 0.025, nod: 4, // the body's rise with each step (of its leg's length), the head's nod (degrees)
  }
  const RUN = {
    phases: [0, 0.08, 0.5, 0.58], // a gallop: the forelegs nearly together, then the hind
    swing: 34,
    airborne: 1.7, // a bound carries this much further than the legs reach
    leap: 0.16, // the body lifts this much (of its leg's length) with each bound
  }
  const YOUNG_SWING = 1.4 // a piglet's, a fawn's, a calf's legs swing this much wider
  const STEPPING = 10 // going at least this fast (its own units a second), its legs step; slower, they settle
  const SETTLE_MS = 250 // legs come to stand, or start out, over about this long
  const LEGS_EVERY = 2 // legs and heads drawn every this many frames, whole degrees: far off and small, nobody sees finer, and each write costs
  const SHUFFLE = { every: [3000, 9000], step: 36, most: 40 } // grazing, now and then a step or two along (its own units)
  const HEAD_MS = 350 // a head goes down to graze, or up, over about twice this
  const SWISH = { every: [3000, 8000], ms: 900, deg: 26 } // grazing, a boar or a żubr swishes its tail

  // Each kind: when it comes (windows of hours), its traits as a creature (its leader), how it grazes,
  // and the herds it comes in (each a list of members: art, its options, how far behind the leader)
  const KINDS = {
    deer: {
      windows: [[8.4, 10.4], [16, 18.4]],
      traits: {
        speed: 42, flee: 7, turn: 2, // a slow walk; startled, a bounding run
        stayMs: [45000, 80000], hours: [8.3, 18.8], dark: 0.45, wet: 'avoid',
        startledBy: ['rumble', 'thunder', 'vroom'],
        feeds: 'drink', hungerMs: [15000, 40000], feedMs: [5000, 9000], // passing the far pond, they stop to drink (heron.js)
        roam: 700, pauseMs: [5000, 11000], // they keep to the stretch in view, wherever it is (no haunt): there to be seen
      },
      graze: -46, // head down to the grass (deg)
      tapFlees: true,
      herds: [
        [['deer', {}, 0], ['deer', { fawn: true }, 70]],
        [['deer', {}, 0], ['deer', { fawn: true }, 60], ['deer', { fawn: true }, 120]],
        [['deer', { buck: true }, 0], ['deer', {}, 110], ['deer', {}, 220]],
      ],
    },
    boar: {
      windows: [[14.6, 18.2]],
      traits: {
        speed: 28, flee: 4.5, turn: 2.5, // a busy walk; startled, off at a run
        stayMs: [50000, 80000], hours: [14.5, 19], dark: 0.4,
        startledBy: ['rumble', 'thunder', 'vroom'],
        roam: 600, pauseMs: [6000, 12000],
      },
      graze: -22, // snout down, rooting
      tapFlees: true,
      herds: [
        [['boar', {}, 0], ...[60, 100, 140, 180, 220].map((d) => ['boar', { piglet: true }, d])],
        [['boar', {}, 0], ...[60, 100, 140, 180].map((d) => ['boar', { piglet: true }, d])],
        [['boar', { male: true }, 0]],
      ],
    },
    bison: {
      windows: [[10.6, 15]],
      traits: {
        speed: 20, flee: 1.8, turn: 1, // a slow amble; startled, a lumber
        stayMs: [60000, 100000], hours: [10.5, 16.5], dark: 0.4,
        startledBy: ['rumble', 'thunder'], // the car is beneath his notice
        roam: 500, pauseMs: [8000, 15000],
      },
      graze: -24,
      tapFlees: false, // a tap: he turns his head and looks, chewing
      herds: [
        [['bison', {}, 0]],
        [['bison', {}, 0], ['bison', { calf: true }, 130]],
      ],
    },
  }

  const comings = Debug.random('meadow-wild') // which kind, its herds, its visits
  const life = Debug.random('meadow-wild-life') // their looking about and play, drawn every frame: its own
  const between = ([a, b], r) => a + r * (b - a)
  const pick = (list, r) => list[Math.floor(r() * list.length)]

  let layer = null
  let kind = null // this play's
  let herd = null // the one out now: { c, g, members, kind, ... }
  let visits = 0
  let nextAt = null // the hour the next may come from
  let asked = false
  let heard = 0 // the last bell heard (World.heardUpTo)

  /** How big an animal is drawn where it stands: far off small, nearer bigger. */
  const sizeAt = (y) => FAR.k + ((y - FAR.y) / (NEAR.y - FAR.y)) * (NEAR.k - FAR.k)

  /** They come out of sight at the nearer side of the view and walk in. */
  function come(opened = false) {
    const K = KINDS[kind]
    const near = comings() < NEARER
    const make = pick(K.herds, comings)
    const { x0, x1 } = World.state.view
    const left = comings() < 0.5
    const x = left ? x0 - OUT : x1 + OUT
    const traits = { ...K.traits, inside: INSIDE, band: [FAR.y, near ? NEAR.y : FAR.y + 14], exitY: FAR.y + 6, ...(opened ? { hours: [0, 24] } : {}) } // asked for: its hours opened
    const c = Creature.make(traits, x, FAR.y + 6, Clock.now(), comings)
    const g = WildArt.el('g', { class: `wild ${kind}`, 'data-critter': 'wild' }, null)
    layer.insertBefore(g, layer.firstChild) // behind what else stands at the far edge
    const members = make.map(([art, opts, behind], i) => {
      const m = { g: WildArt.el('g', { class: 'wild-one' }, g), x: x + (left ? -behind : behind), y: c.y, behind, i, art, opts }
      m.body = WildArt[art](m.g, opts)
      m.head = m.g.querySelector('.head')
      m.legs = [...m.g.querySelectorAll('.leg')]
      m.tail = m.g.querySelector('.tail')
      m.young = !!(opts.piglet || opts.fawn || opts.calf)
      Object.assign(m, { drawnX: m.x, phase: life(), amp: 0, angles: [], headA: 0, nodA: 0, face: left ? -1 : 1, shuffle: 0, nextShuffle: 0, swishFrom: 0, nextSwish: Clock.now() + between(SWISH.every, life()) })
      m.lookUntil = 0
      m.nextLook = Clock.now() + between([1500, 6000], life())
      m.side = (i % 2 ? 1 : -1) * (6 + life() * 10) // a little off the leader's line, so they don't stand in a file
      return m
    })
    herd = { c, g, members, kind, facing: left ? -1 : 1, play: null, lookAll: 0 }
    visits++
    Debug.trace('wild', { kind, n: members.length, near })
    Ambient.add(c, { name: 'wild', id: kind, rnd: comings, draw, gone })
  }

  /** Each frame: the leader where the world model has it, the others following, each living its own life. */
  function draw(c, dt) {
    const h = herd
    const t = Clock.now()
    if (Math.abs(c.vx) > 3) h.facing = c.vx > 0 ? -1 : 1 // drawn facing left: -1 mirrors it to face right
    const goal = c.goal?.kind
    const moving = Math.hypot(c.vx, c.vy) > 4
    h.running = goal === 'flee'
    const grazing = goal === 'pause' || (goal === 'feed' && !moving) // grazing, or drinking at the pond: heads down
    if (t > (h.play?.until ?? 0)) h.play = grazing ? playful(h, t) : null
    for (const m of h.members) follow(h, c, m, dt, t, grazing)
  }

  /** One of them: following the leader, a little behind, or at play; drawn only in view, and only when moved. */
  function follow(h, c, m, dt, t, grazing) {
    const back = m.behind * h.facing * -1 // behind it: the other way from where it faces
    const k = Math.min(1, dt / FOLLOW_MS)
    if (grazing) shuffle(m, t)
    m.x += (c.x - back * sizeAt(c.y) * 2 + m.shuffle * sizeAt(m.y) - m.x) * k
    m.y += (c.y + (m.i ? m.side * 0.4 : 0) - m.y) * k
    const played = h.play?.who.includes(m) ? playing(h.play, m, t) : null
    const [dx, dy] = played ?? [0, 0]
    const shown = m.x > World.state.view.x0 - 200 && m.x < World.state.view.x1 + 200
    if (shown !== m.shown) {
      m.shown = shown
      m.g.style.display = shown ? '' : 'none' // out of view: not drawn at all
    }
    if (!shown) return
    const s = sizeAt(m.y)
    const lift = stride(h, m, (m.x + dx - m.drawnX) / s, dt, played?.[2])
    m.drawnX = m.x + dx
    const at = `translate(${m.drawnX.toFixed(1)} ${(m.y + dy - lift * s).toFixed(1)}) scale(${(s * m.face).toFixed(3)} ${s.toFixed(3)})`
    if (at !== m.at) m.g.setAttribute('transform', (m.at = at)) // only when it moved: each write costs the browser
    lookOrGraze(h, m, grazing, t, dt)
    swish(m, grazing, t)
  }

  /** Grazing, now and then a step or two along, as grazing animals go. */
  function shuffle(m, t) {
    if (t < m.nextShuffle) return
    if (m.nextShuffle) m.shuffle = Math.max(-SHUFFLE.most, Math.min(SHUFFLE.most, m.shuffle + (life() - 0.5) * 2 * SHUFFLE.step))
    m.nextShuffle = t + between(SHUFFLE.every, life())
  }

  /**
   * Its legs, from how far it went this frame (`went`, its own units): each leg turns as far as the
   * ground it covered, so its feet never slide; it faces where it goes (or as its play says).
   * Returns how high its body is lifted (its own units).
   */
  function stride(h, m, went, dt, face) {
    const v = (Math.abs(went) / Math.max(dt, 1)) * 1000
    if (face) m.face = face
    else if (v > STEPPING) m.face = went > 0 ? -1 : 1
    const gait = h.running ? RUN : WALK
    const swing = gait.swing * (m.young ? YOUNG_SWING : 1)
    const reach = 2 * m.body.leg * Math.sin((swing * Math.PI) / 180) * (gait.airborne ?? 1) // ground one cycle covers
    m.phase = (m.phase + Math.abs(went) / reach) % 1
    m.amp += ((v > STEPPING ? 1 : 0) - m.amp) * Math.min(1, dt / SETTLE_MS)
    m.frame = ((m.frame ?? m.i) + 1) % LEGS_EVERY // the members take turns, so the writes spread over the frames
    if (!m.frame) {
      m.legs.forEach((leg, i) => {
        const a = Math.round(m.amp * swing * Math.sin(2 * Math.PI * (m.phase + gait.phases[i])))
        if (a !== m.angles[i]) leg.style.transform = `rotate(${(m.angles[i] = a)}deg)`
      })
    }
    m.nodA = gait.nod ? m.amp * gait.nod * Math.sin(4 * Math.PI * m.phase) : 0 // a nod with each step
    const rise = gait.leap ? gait.leap * Math.abs(Math.sin(Math.PI * m.phase)) : gait.bob * Math.abs(Math.sin(2 * Math.PI * m.phase))
    return m.amp * rise * m.body.leg
  }

  /** Grazing, a boar or a żubr now and then swishes its tail. */
  function swish(m, grazing, t) {
    if (!m.tail || m.art === 'deer') return
    if (grazing && t > m.nextSwish) {
      m.swishFrom = t
      m.nextSwish = t + SWISH.ms + between(SWISH.every, life())
    }
    const p = (t - m.swishFrom) / SWISH.ms
    const a = p < 1 ? Math.round(SWISH.deg * Math.sin(p * 2 * Math.PI) * (1 - p)) : 0
    if (a !== m.tailA) m.tail.style.transform = `rotate(${(m.tailA = a)}deg)`
  }

  /** Heads: up while walking, or looking about (the bell, a tap, now and then); down to the grass while grazing; going down and up gently. */
  function lookOrGraze(h, m, grazing, t, dt) {
    if (!m.head) return
    if (grazing && t > m.nextLook && t > m.lookUntil) {
      m.lookUntil = t + between([1200, 2600], life())
      m.nextLook = m.lookUntil + between([2500, 7000], life())
    }
    const up = !grazing || t < m.lookUntil || t < h.lookAll
    m.headA += ((up ? 0 : KINDS[h.kind].graze) - m.headA) * Math.min(1, dt / HEAD_MS)
    const a = Math.round(m.headA + m.nodA)
    if (a !== m.headDrawn && !m.frame) m.head.style.transform = `rotate(${(m.headDrawn = a)}deg)`
  }

  /** While they graze, now and then some play: two piglets wrestle, a fawn hops about its mother. */
  function playful(h, t) {
    const young = h.members.filter((m) => m.opts.piglet || m.opts.fawn)
    if (!young.length || life() < 0.5) return { who: [], until: t + between([2000, 5000], life()) }
    if (young[0].opts.piglet && young.length > 1) {
      const a = Math.floor(life() * (young.length - 1))
      return { kind: 'wrestle', who: [young[a], young[a + 1]], from: t, until: t + between([2500, 4500], life()) }
    }
    return { kind: 'hop', who: [pick(young, life)], from: t, until: t + between([1500, 2500], life()) }
  }

  /** Where a playing one is drawn, against where it would be: [dx, dy, facing]. */
  function playing(p, m, t) {
    const s = (t - p.from) / 1000
    if (p.kind === 'wrestle') {
      const first = p.who[0] === m
      const shove = Math.sin(s * 7) * 8 // pushing to and fro
      return [first ? 14 + shove : -14 + shove, -Math.abs(Math.sin(s * 9)) * 6, first ? 1 : -1] // face to face, little hops
    }
    return [Math.sin(s * 4) * 20, -Math.abs(Math.sin(s * 8)) * 14, Math.cos(s * 4) > 0 ? -1 : 1] // a fawn's hops to and fro
  }

  function gone() {
    herd.g.remove()
    herd = null
    nextAt = World.state.hour + GAP_HOURS
    Debug.trace('wild gone', { kind })
  }

  /** A tap on them: they all look up; deer and boar then make off; the żubr only looks back, chewing. */
  function tap() {
    if (!herd) return null
    const h = herd
    h.lookAll = Clock.now() + TAP_LOOK_MS + (KINDS[h.kind].tapFlees ? 0 : 1600)
    Debug.trace('wild tapped', { kind: h.kind })
    if (h.kind === 'boar') Sound.grunt()
    if (h.kind === 'bison') Sound.snort()
    if (KINDS[h.kind].tapFlees) Clock.after(TAP_LOOK_MS, () => { if (herd === h) h.c.tapped = true })
    return { x: h.c.x }
  }

  /** Every few seconds: may they come now (their hours, the gap since the last, dry, light)? And did the bell ring? */
  function look() {
    if (herd) {
      const bell = World.heard(herd.c.x, heard).some((n) => n.kind === 'bell')
      heard = World.heardUpTo
      if (bell) herd.lookAll = Clock.now() + BELL_LOOK_MS
      return
    }
    heard = World.heardUpTo
    const hour = World.state.hour
    const open = KINDS[kind].windows.some(([a, b]) => hour >= a && hour <= b)
    if (asked) {
      asked = false
      return come(true)
    }
    if (visits >= VISITS || hour < nextAt || !open) return
    if (World.state.light < 0.6 || World.isWet(World.state.view.x0)) return
    come()
  }

  /**
   * Draws into `into` (the far things); this play's kind and when it may first come are drawn now.
   * `wild`: the ?wild flag (a kind, or 'now'); `still`: a still play has none unless asked.
   */
  function setup(into, { wild = null, still = false } = {}) {
    layer = into
    kind = pick(Object.keys(KINDS), comings)
    if (KINDS[wild]) kind = wild
    const first = pick(KINDS[kind].windows, comings)
    nextAt = between(first, comings() * 0.5) // somewhere in the first half of one of its windows
    asked = !!wild
    if (still && !asked) return
    Clock.every(LOOK_MS, look)
    if (asked) look()
  }

  return {
    setup,
    tap,
    /** The kind out now and its members' places, for the overlay and the tests. */
    get out() { return herd ? { kind: herd.kind, n: herd.members.length, x: Math.round(herd.c.x), vx: Math.round(herd.c.vx), goal: herd.c.goal?.kind ?? null } : null },
    get kind() { return kind },
    KINDS,
  }
})()
