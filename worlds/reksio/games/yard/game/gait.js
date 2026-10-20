// How Reksio goes from place to place: which gait for a trip, and each
// gait's stride added to his pose. Upright he walks, arms swinging; on all
// fours he trots (nose down, sniffing, when he's following his nose); a run
// is the cartoon's gallop, gathered and stretched in turn, off the ground as
// he stretches (world.yaml, characters[reksio].moves[gallop]).
//
// Pure: given a pose and where he is in his stride, returns the pose to
// draw; reksio.js keeps the stride's phase and speed.

// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* global Figure */
/* exported Gait */
const Gait = (() => {
  const F = Figure.POSES
  const GAITS = {
    // speed in scene units/s; cadence in stride radians/s; stride, lift and
    // arm swing in his own units; bob: how much he rises and falls; fours:
    // upright (0) or on all fours (1)
    walk: { name: 'walk', speed: 250, cadence: 11, stride: 18, lift: 19, swing: 15, bob: 6, fours: 0 },
    // a gallop: about four strides a second, a hop in each (hop: how high)
    run: { name: 'run', speed: 600, cadence: 26, stride: 22, lift: 14, swing: 20, bob: 1, hop: 14, fours: 1 },
    // nose down on all fours, sniffing as he goes
    sniff: { name: 'sniff', speed: 170, cadence: 12, stride: 9, lift: 6, swing: 0, bob: 2, fours: 1 },
  }
  const RUN_FROM = 400 // trips longer than this are run, not walked…
  const RUN_FOR_JOY = [220, 0.3] // …and from this long, this share of them too: he's an energetic dog
  const SNIFF_TRIP = [300, 0.2] // trips shorter than this, this share are a sniffing trot
  const PLAIN = { lift: 1, swing: 1, bob: 1, tilt: 0 } // a walk's swagger, as is
  // walking upright, the films' springy walk (Adam's frame of him carrying
  // a ladder, 2026-10-19): knees well bent, the back foot kicked up behind,
  // heel high, as the leg comes through; his body upright, head high, nose
  // up, nodding with every step. Legs under his hips, not his at-ease stance.
  const WALK_LEGS = { nearLeg: [[12, -34], [10, 0]], farLeg: [[2, -34], [0, 0]] }
  const LEAN = 2 // how far forward his chest and head lean, walking (his units): barely
  const SWAY = 2 // his chest's sway with each step
  const NOD = 4 // his head's nod with each step (degrees)
  const NOSE_UP = -5 // his head held high, walking (degrees)
  const KNEE_UP = 1 // a lifting leg's knee comes forward this much of its lift…
  const HEEL_KICK = 1.3 // …and, as it leaves the ground, its foot kicks up behind this much

  /** Which gait for a trip of dist: a run for a long way (and some middling
   * ways, for joy), now and then a sniffing trot for a short one, otherwise
   * a walk. sniffing: he's following his nose. */
  function choose(dist, sniffing, random) {
    if (sniffing) return GAITS.sniff
    if (dist > RUN_FROM || (dist > RUN_FOR_JOY[0] && random() < RUN_FOR_JOY[1])) return GAITS.run
    if (dist < SNIFF_TRIP[0] && random() < SNIFF_TRIP[1]) return GAITS.sniff
    return GAITS.walk
  }

  /** A walk's swagger: a strut when he's proud (Sportowiec, 298 s), otherwise
   * a little different each time. */
  function swagger(gait, proud, random) {
    const r = () => 0.85 + random() * 0.35
    if (proud && gait === GAITS.walk) return { lift: 1.7 * r(), swing: 1.5 * r(), bob: 1.4, tilt: -6 }
    return { lift: r(), swing: r(), bob: r(), tilt: 0 }
  }

  /** How far through a gallop's stride he is: 0 gathered, 1 stretched. */
  const gathered = (phase) => (1 - Math.cos(phase)) / 2

  /** The gallop: gathered and stretched in turn, his head held high and
   * level while his body whips along underneath. */
  function gallop(p, phase, amount) {
    const g = Figure.mix(F.runGather, F.runStretch, gathered(phase))
    const body = {}
    for (const part of ['pelvis', 'chest', 'nearArm', 'farArm', 'nearLeg', 'farLeg', 'tail']) body[part] = Figure.mix(p[part], g[part], amount)
    body.head = { x: p.head.x + (g.head.x - p.head.x) * amount, y: p.head.y + (g.head.y - p.head.y) * amount, tilt: p.head.tilt + g.head.tilt * amount }
    return Figure.vary(p, body)
  }

  /**
   * The stride added to a pose. s: { gait, phase (radians through the
   * stride), amount (0 standing still, 1 at full speed), fours (on all
   * fours now), swagger }.
   */
  function stride(p, { gait: g, phase, amount, fours, swagger: sw = PLAIN }) {
    const lift0 = g.lift * sw.lift
    const limb = (pair, offset, lift, swing = g.stride, knee = 0, kick = 0) => {
      const a = phase + offset
      const out = Math.sin(a) * swing * amount
      const up = Math.max(0, Math.cos(a)) * lift * amount
      const back = Math.max(0, -Math.sin(a)) * up * kick // still behind him as it lifts: the heel kicks up
      return [[pair[0][0] + out * 0.6 + up * knee, pair[0][1] - up * 0.6], [pair[1][0] + out - back, pair[1][1] - up - back]]
    }
    // going somewhere, he looks where he goes: his head turns side-on
    p = Figure.vary(p, { head: { turn: p.head.turn + (0.85 - p.head.turn) * Math.min(1, amount * 1.5), tilt: p.head.tilt + sw.tilt * amount } })
    if (!fours) return walking(p, { g, phase, amount, sw, limb, lift0 })
    if (g === GAITS.run) return gallop(p, phase, amount)
    // on all fours at a trot: diagonal pairs together; sniffing, nose down
    if (g === GAITS.sniff) p = Figure.vary(p, { head: { x: F.sniff.head.x, y: F.sniff.head.y, tilt: F.sniff.head.tilt }, face: { eyes: 0.5, brows: 0.3 } })
    return Figure.vary(p, {
      nearLeg: limb(p.nearLeg, 0, lift0), farLeg: limb(p.farLeg, Math.PI, lift0),
      nearArm: limb(p.nearArm, Math.PI, lift0), farArm: limb(p.farArm, 0, lift0),
    })
  }

  /** Upright: legs in turn under his hips, arms swinging against them, his
   * body leaning in and his head nodding with each step. */
  function walking(p, { g, phase, amount, sw, limb, lift0 }) {
    const legs = Figure.mix({ nearLeg: p.nearLeg, farLeg: p.farLeg }, WALK_LEGS, Math.min(1, amount * 1.5))
    const step = Math.sin(phase * 2) // twice a stride: once a step
    return Figure.vary(p, {
      nearLeg: limb(legs.nearLeg, 0, lift0, g.stride, KNEE_UP, HEEL_KICK), farLeg: limb(legs.farLeg, Math.PI, lift0, g.stride, KNEE_UP, HEEL_KICK),
      nearArm: limb(p.nearArm, Math.PI, 0, g.swing * sw.swing), farArm: limb(p.farArm, 0, 0, g.swing * sw.swing),
      chest: [p.chest[0] + (LEAN + SWAY * step) * amount, p.chest[1]],
      head: { x: p.head.x + LEAN * amount, tilt: p.head.tilt + (NOSE_UP + NOD * step) * amount },
    })
  }

  /** How far he rises off the ground at this point of his stride (negative
   * is up): a gallop leaves the ground as he stretches; a walk bobs. */
  function rise({ gait: g, phase, amount, swagger: sw = PLAIN }) {
    if (amount <= 0) return 0
    if (g === GAITS.run) return -g.hop * sw.bob * amount * gathered(phase) ** 1.5
    return -Math.abs(Math.sin(phase)) * g.bob * sw.bob * amount
  }

  return { GAITS, RUN_FROM, choose, swagger, stride, rise }
})()
