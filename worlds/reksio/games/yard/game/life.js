// What keeps Reksio alive between gestures. In the cartoon he is never quite
// still (world.yaml, characters[reksio].moves): he glances about and turns to
// face the viewer, shifts how he stands (hands on hips, a paw on his chin,
// scratching his head), and his face changes with his mood. Here he also
// blinks, his eyes dart before his head follows, and his ears and tail swing
// after his body and settle.
//
// Pure: step() is told the time and what he is doing, and says what to add
// to his pose; reksio.js applies it. Nothing here waits or draws. Its own
// random stream (how often it draws depends on time, so it must not shift
// the rest of a seeded play).

/* exported Life */
const Life = (() => {
  // Moods drift every so often; each colours his face, how he stands and how
  // far he turns to look about. proud walks with a strut (Sportowiec, 298 s).
  const MOODS = {
    happy: { face: { smile: 0.9, brows: 0, lift: 0.2 }, stands: ['stand', 'handsOnHips', 'handOnHip'], turn: [0.05, 0.6] },
    curious: { face: { smile: 0.35, brows: 0.35, lift: 0.7 }, stands: ['stand', 'pawOnChin', 'scratchHead', 'handOnHip'], turn: [0.1, 0.8] },
    proud: { face: { smile: 0.8, brows: -0.25, lift: 0 }, stands: ['handsOnHips', 'stand'], turn: [0.3, 0.7] },
    dreamy: { face: { smile: 0.6, brows: 0.1, lift: 0, eyes: 0.55 }, stands: ['stand', 'handOnHip'], turn: [0.2, 0.5] },
  }
  const MOOD_S = [8, 16] // a mood lasts this long
  const STAND_S = [3, 7] // he changes how he stands this often…
  const GLANCE_S = [1.2, 3.5] // …and looks somewhere new this often
  const BLINK_S = [2, 5.5] // between blinks
  const BLINK_MS = 150 // one blink, closed and open again
  const TO_VIEWER = 0.15 // the chance a glance turns him to the child, grinning
  const TO_VIEWER_S = [1, 1.6]
  // the ears' and tail's springs: how stiff, how damped, how far they trail
  // per unit of his head's speed (degrees per unit/s), and how far they may
  // swing (degrees)
  const SPRING = { k: 170, c: 9, drag: 0.06, max: 30 }

  const pick = (random, list) => list[Math.floor(random() * list.length)]
  const between = (random, [lo, hi]) => lo + random() * (hi - lo)
  /** Approach a target, frame-rate independent: tau seconds to get most of the way. */
  const ease = (v, target, dt, tau) => v + (target - v) * (1 - Math.exp(-dt / tau))
  const clamp = (v, m) => Math.max(-m, Math.min(m, v))

  /** One damped spring, thrown by a force; returns its new {x, v}. */
  function spring(s, force, dt, { k, c, max } = SPRING) {
    const v = s.v + (-k * s.x - c * s.v + force) * dt
    return { x: clamp(s.x + v * dt, max), v }
  }

  // Each part of a life, as its own small function of the state `s` (which
  // carries its random stream).

  function newMood(s, t) {
    s.mood = pick(s.random, Object.keys(MOODS))
    s.moodAt = t + between(s.random, MOOD_S)
  }

  function newStand(s, t) {
    s.standFrom = s.stand
    s.stand = pick(s.random, MOODS[s.mood].stands)
    s.standK = 0
    s.standAt = t + between(s.random, STAND_S)
  }

  function newGlance(s, t) {
    const m = MOODS[s.mood]
    s.glanceAt = t + between(s.random, GLANCE_S)
    if (s.random() < TO_VIEWER) {
      s.turnTo = 0 // face the child…
      s.viewerUntil = t + between(s.random, TO_VIEWER_S) // …with a grin, for a moment
      s.tiltTo = between(s.random, [-6, 4])
    } else {
      s.turnTo = between(s.random, m.turn)
      s.tiltTo = between(s.random, [-9, 7])
    }
    s.lookTo = between(s.random, [-1, 1]) // the eyes go first; the head follows
  }

  function startBlink(s, t) {
    s.blinkStart = t
    s.doubleBlink = s.random() < 0.25
    s.blinkAt = t + between(s.random, BLINK_S)
  }

  /** How closed his lids are for a blink now (0 open, 1 shut). */
  function blinkNow(s, t) {
    const since = (t - s.blinkStart) * 1000
    if (since >= 0 && since < BLINK_MS) return Math.sin((Math.PI * since) / BLINK_MS)
    const again = since - BLINK_MS * 1.6
    if (s.doubleBlink && again >= 0 && again < BLINK_MS) return Math.sin((Math.PI * again) / BLINK_MS)
    return 0
  }

  /** The ears and tail trail behind his head as it moves, by how fast it
   * goes, and swing back and settle when it stops. */
  function swing(s, dt, head) {
    if (!s.head || dt <= 0) {
      s.head = head
      return
    }
    const v = [(head[0] - s.head[0]) / dt, (head[1] - s.head[1]) / dt]
    s.head = head
    const trailX = clamp(-v[0] * SPRING.drag, SPRING.max)
    const trailY = clamp(v[1] * SPRING.drag, SPRING.max)
    s.ears = [spring(s.ears[0], SPRING.k * trailX, dt), spring(s.ears[1], SPRING.k * trailY, dt)]
    s.tail = spring(s.tail, -SPRING.k * trailX, dt)
  }

  /** The head turns and tilts on a spring: it overshoots a little and
   * settles. The eyes get there first. */
  function turnHead(s, dt) {
    const turn = spring({ x: s.turn - s.turnTo, v: s.turnV }, 0, dt, { k: 90, c: 13, max: 1 })
    s.turn = s.turnTo + turn.x
    s.turnV = turn.v
    const tilt = spring({ x: s.tilt - s.tiltTo, v: s.tiltV }, 0, dt, { k: 110, c: 12, max: 30 })
    s.tilt = s.tiltTo + tilt.x
    s.tiltV = tilt.v
    s.look = ease(s.look, s.lookTo, dt, 0.05)
  }

  /** His face eases to his mood's (or to a grin, turned to the child). */
  function moodFace(s, t, dt) {
    const mood = MOODS[s.mood]
    const to = t < s.viewerUntil ? { ...mood.face, smile: 1, open: 0.5, eyes: 1, lift: 0.3 } : mood.face
    for (const [k, v] of Object.entries({ eyes: 1, open: 0, ...to })) s.face[k] = ease(s.face[k] ?? v, v, dt, 0.25)
  }

  function step(s, dt, nowMs, ctx) {
    const t = nowMs / 1000
    if (t >= s.moodAt) newMood(s, t)
    if (ctx.free && t >= s.standAt) newStand(s, t)
    if (t >= s.glanceAt) newGlance(s, t)
    if (t >= s.blinkAt) startBlink(s, t)
    moodFace(s, t, dt)
    s.standK = ease(s.standK, 1, dt, 0.18)
    s.standW = ease(s.standW, ctx.free && !ctx.fours ? 1 : 0, dt, ctx.free ? 0.2 : 0.06)
    s.faceW = ease(s.faceW, ctx.free ? 1 : ctx.walking ? 0.6 : 0, dt, 0.15)
    turnHead(s, dt)
    swing(s, dt, ctx.head)
    return {
      mood: s.mood,
      stand: s.stand, standFrom: s.standFrom, standK: s.standK, standW: s.standW,
      turn: s.turn, tilt: s.tilt, look: s.look, blink: blinkNow(s, t),
      face: { ...s.face }, faceW: s.faceW,
      ears: [s.ears[0].x, s.ears[1].x], tail: s.tail.x,
    }
  }

  /**
   * A life for one Reksio, drawing from `random`. step(dt, now, ctx) moves it
   * on and returns what to add to his pose:
   *   ctx: { free (standing still, no gesture), walking, fours, head: [x, y]
   *          (where his head is, along the way he faces, in his own units) }
   *   returns: { mood, stand, standFrom, standK, standW (how much of that way
   *              of standing shows), turn, tilt, look, blink, face, faceW,
   *              ears: [swing, flop], tail }
   */
  function create(random) {
    const s = {
      random,
      mood: 'happy', moodAt: between(random, MOOD_S),
      stand: 'stand', standFrom: 'stand', standK: 1, standAt: between(random, STAND_S),
      glanceAt: between(random, GLANCE_S), turn: 0.35, turnTo: 0.35, turnV: 0,
      tilt: 0, tiltTo: 0, tiltV: 0, look: 0, lookTo: 0,
      viewerUntil: 0, blinkAt: between(random, BLINK_S), blinkStart: -1, doubleBlink: false,
      standW: 0, faceW: 0, face: { ...MOODS.happy.face },
      head: null, ears: [{ x: 0, v: 0 }, { x: 0, v: 0 }], tail: { x: 0, v: 0 },
    }
    return { step: (dt, nowMs, ctx) => step(s, dt, nowMs, ctx), get mood() { return s.mood } }
  }

  return { MOODS, create, spring }
})()
