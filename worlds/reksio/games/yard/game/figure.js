// Reksio drawn from a pose, the way the cartoon draws him (world.yaml,
// characters[reksio].moves): a bean of a body, limbs as plain tubes that bend
// and stretch, and a tall egg of a head whose face slides across it as he
// turns from side-on to facing the viewer.
//
// A pose is plain numbers: where his hips, chest, head, elbows, paws, knees
// and feet are (facing right, feet on y = 0), how far his head is turned, and
// what his face and ears are doing. So any two poses blend (mix), and shape()
// is pure: the same pose always gives the same drawing, testable without a
// page. mount() makes the SVG once; its draw(pose) only sets attributes.

// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* exported Figure */
const Figure = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const COLOURS = { ink: '#1d1914', white: '#f6f8f6', ochre: '#d29e5a', red: '#c8371f', tongue: '#ee8b7c' }
  // The ink line round him, the same all over: thin, as the films' is
  // (about 2.5% of his head's width, Sportowiec 142 s, Kompan 135 s), but
  // thick enough to hold when he is small on a phone. A heavy one made him
  // look like a sticker.
  const LINE = 2.5
  const PELVIS_R = 27 // the bean's rear end…
  const CHEST_R = 20 // …and its front end
  // tubes: [outline width, white width]; the outline shows LINE each side
  const tubeOf = (white) => [white + 2 * LINE, white]
  const LEG = tubeOf(15) // short and thick, as the films draw them
  const ARM = tubeOf(9)
  const TAIL = tubeOf(4)
  // The ears are short, wide flaps. At rest both fold over at the middle
  // (Kompan 66 s, Sportowiec 360 s); when something catches his attention
  // one or both stand straight up like antennae (Kompan 70 s and 74 s,
  // Sportowiec 318 s): EARS_UP, perked(). Long thin ones made him look like
  // a rabbit.
  const EAR = tubeOf(23)
  const EAR_LENGTHS = [14, 14] // base to bend, bend to tip
  const TOE = 6 // a foot reaches this far forward of the ankle
  // his hands, upright: white mittens with a thumb, as the films draw them
  // when he gestures or holds something (Kompan 70 s, the bird frames)
  const MITTEN = tubeOf(12)
  const THUMB_W = 5.5 // the thumb's width, inside its outline
  const MITTEN_LONG = 7 // how far the mitten reaches past the wrist
  const THUMB_OUT = [1, 9] // where the thumb's tip is: along the hand, and out to its side
  // The head, in its own units about its centre: a round dome, widest at the
  // jaw, with no neck. The long muzzle grows out of it as he turns, already
  // past the egg's edge at three-quarters, the nose on its tip (Aktor 240 s,
  // Kompan 135 s): without it he looks like a cat or a rabbit. Drawn this much bigger
  // than its units: the films' head is nearly half his height.
  const HEAD_SCALE = 1.05
  const EYE = { rx: 3.4, ry: 5.4 } // a tall oval, as the films draw it
  const JAW_DROP = 22 // how far his jaw drops with his mouth wide open: the films' grin is half his face (Sportowiec 318 s)
  const GRIN_WIDEN = 22 // how much wider a wide-open grin is than a closed smile (the cartoon's spans his face)
  const MOUTH_MARGIN = 4 // …but its corners stay this far inside his head
  const TEETH = 5 // teeth in a row
  // A tall dome over the face: the films' eyes and nose sit in the lower half
  // of his head, under a big forehead (Reksio i ptaki, the doghouse frames
  // Adam found, 2026-10-19), which is much of what makes him endearing.
  // Seen from the front the head is a pear: the dome narrower, the cheeks
  // and jowls below the widest part (Kompan 70 s and 74 s, the doghouse
  // frame). An egg wider at the top made him generic.
  const DOME = 50 // how far the top of his head is above its centre: tall (Kompan 70 s), but not so big he looks a mutant on all fours (Adam, 2026-10-19)
  const TEMPLE = [31, -16] // where the dome meets the cheeks (half-width, height)
  const CHEEK = [40, 20] // the widest part of his face, low down
  const egg = (open) => {
    const b = fmt(42 + JAW_DROP * open)
    const [tx, ty] = TEMPLE
    const [cx, cy] = CHEEK
    return `M0 ${-DOME} C18 ${-DOME} 30 ${fmt(-DOME * 0.66)} ${tx} ${ty} C32 0 ${cx} 4 ${cx} ${cy} C${cx} ${fmt(b - 8)} 22 ${b} 0 ${b}` +
      ` C-22 ${b} ${-cx} ${fmt(b - 8)} ${-cx} ${cy} C${-cx} 4 -32 0 ${-tx} ${ty} C-30 ${fmt(-DOME * 0.66)} -18 ${-DOME} 0 ${-DOME} Z`
  }

  // ------------------------------------------------------------ points

  const add = (a, b) => [a[0] + b[0], a[1] + b[1]]
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
  const mul = (a, k) => [a[0] * k, a[1] * k]
  const len = (a) => Math.hypot(a[0], a[1])
  const unit = (a) => (len(a) > 1e-6 ? mul(a, 1 / len(a)) : [0, -1])
  const fmt = (n) => Math.round(n * 10) / 10
  const pt = (p) => `${fmt(p[0])} ${fmt(p[1])}`
  const clamp01 = (v) => Math.max(0, Math.min(1, v))
  const lerp = (a, b, t) => a + (b - a) * t
  const toward = (deg) => [Math.sin((deg * Math.PI) / 180), -Math.cos((deg * Math.PI) / 180)] // 0 is up

  /** A soft bend from a through k to b, passing through k (a rubber-hose limb). */
  function bend(a, k, b) {
    const c = sub(mul(k, 2), mul(add(a, b), 0.5))
    return `M${pt(a)} Q${pt(c)} ${pt(b)}`
  }

  /** The outline round two circles and the lines touching both: a bean. */
  function capsule(p1, r1, p2, r2) {
    const d = sub(p2, p1)
    const L = len(d)
    if (L <= Math.abs(r1 - r2) + 0.01) return ellipsePath(p1, r1, r1)
    const theta = Math.atan2(d[1], d[0])
    const phi = Math.acos((r1 - r2) / L)
    const on = (p, r, a) => add(p, [r * Math.cos(a), r * Math.sin(a)])
    const a1 = on(p1, r1, theta + phi)
    const a2 = on(p2, r2, theta + phi)
    const b2 = on(p2, r2, theta - phi)
    const b1 = on(p1, r1, theta - phi)
    return `M${pt(a1)} L${pt(a2)} A${fmt(r2)} ${fmt(r2)} 0 0 0 ${pt(b2)} L${pt(b1)} A${fmt(r1)} ${fmt(r1)} 0 1 0 ${pt(a1)} Z`
  }

  /** An ellipse drawn clockwise, like every outline here, so shapes that
   * overlap in one path merge rather than cutting holes in each other. */
  function ellipsePath(c, rx, ry) {
    return `M${pt([c[0] - rx, c[1]])} A${fmt(rx)} ${fmt(ry)} 0 1 1 ${pt([c[0] + rx, c[1]])} A${fmt(rx)} ${fmt(ry)} 0 1 1 ${pt([c[0] - rx, c[1]])} Z`
  }

  // ------------------------------------------------------------ poses

  /** Blend two poses (or any two matching trees of numbers): t = 0 is a, 1 is b. */
  function mix(a, b, t) {
    if (typeof a === 'number') return lerp(a, b, t)
    if (Array.isArray(a)) return a.map((v, i) => mix(v, b[i], t))
    const out = {}
    for (const k of Object.keys(a)) out[k] = mix(a[k], b[k], t)
    return out
  }

  /** A pose from a base and changes to it, merged part by part. */
  function vary(base, changes) {
    const out = JSON.parse(JSON.stringify(base)) // poses are plain numbers
    for (const [k, v] of Object.entries(changes)) {
      out[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...out[k], ...v } : v
    }
    return out
  }

  // eyes: how far open, the upper lid coming down over them as they close
  // (the lid slopes with his brows: worried, cross); joy: shut eyes curving
  // up (1, laughing) or down (-1, asleep); brows: inner ends up (1, worried)
  // or down (-1, cross); lines: short creases on his forehead (puzzled,
  // worried, cross); small: a little mouth for a quiet feeling (a dash, a
  // small frown); grit: teeth clenched in a box, cross; tongue: hanging
  // out (0 to 1); bone: carried in his mouth (0 or 1); bowl: his bowl stuck
  // upside down over his head, eyes and all (0 or 1); blink: lids closing
  // (0 to 1) whatever the eyes are doing; look: his eyes turned back (-1) or
  // forward (1)
  const FACE = { eyes: 1, joy: 0, brows: 0, lift: 0, lines: 0, smile: 0.6, small: 0, open: 0, teeth: 0, grit: 0, o: 0, tongue: 0, bone: 0, bowl: 0, blink: 0, look: 0 }
  const EARS = { near: [-45, -80], far: [40, 85] } // [angle from upright, bend at the middle], degrees: both folded
  const EARS_UP = { near: [-12, 8], far: [10, -6] } // standing straight up
  const FOLD = 45 // an ear bent this far (degrees) is folded, and shows its crease (a half-shown one greys his outline)

  // Standing at ease, as the films never stand straight: leaning back a
  // little, chin up, his weight on the back leg and the front one easy
  // (Kompan 70 s, 74 s). Parallel legs made him a toy.
  const STAND = {
    pelvis: [6, -68], chest: [-4, -104],
    head: { x: 6, y: -150, tilt: -5, turn: 0.35 },
    nearArm: [[13, -82], [15, -60]], farArm: [[-9, -84], [-10, -62]],
    nearLeg: [[20, -30], [24, 0]], farLeg: [[0, -36], [-4, 0]],
    tail: [-30, -96],
    face: FACE, ears: EARS,
    neckless: 1, // standing, his head runs into his body as one shape (Kompan 70 s)
    mittens: 1, // his hands, upright: mittens with a thumb
  }

  const ON_FOURS = {
    pelvis: [-32, -50], chest: [16, -54],
    head: { x: 50, y: -92, tilt: 0, turn: 1 },
    nearArm: [[18, -26], [18, 0]], farArm: [[8, -26], [6, 0]],
    nearLeg: [[-36, -24], [-34, 0]], farLeg: [[-28, -24], [-24, 0]],
    tail: [-62, -82],
    face: FACE, ears: { near: [-40, -60], far: [-10, 40] },
    neckless: 0, // on all fours or sitting his head is its own shape (Kompan 54 s), or he's one lump
    mittens: 0, // on all fours: plain paws
  }

  // The moves from the study (world.yaml, characters[reksio].moves), one
  // pose each, named after the move they come from.
  const POSES = {
    stand: STAND,
    handsOnHips: vary(STAND, {
      nearArm: [[32, -88], [15, -74]], farArm: [[-28, -90], [-10, -76]],
      head: { turn: 0.2 }, face: { smile: 0.9 },
    }),
    pawOnChin: vary(STAND, {
      nearArm: [[30, -96], [24, -124]], farArm: [[-12, -86], [6, -118]],
      head: { tilt: -8, turn: 0.4 }, face: { eyes: 0, joy: -1, brows: 0.3, smile: -0.1 },
    }),
    idea: vary(STAND, {
      nearArm: [[42, -108], [52, -140]],
      head: { turn: 0.3, tilt: -4 }, face: { lift: 1, open: 0.35, o: 0.7, smile: 0 },
      ears: EARS_UP, // both up (Kompan 74 s)
    }),
    armsWide: vary(STAND, {
      nearArm: [[42, -88], [62, -116]], farArm: [[-34, -88], [-54, -116]],
      nearLeg: [[13, -36], [17, 0]], farLeg: [[-10, -36], [-15, 0]],
      head: { tilt: -10, turn: 0.1 }, face: { eyes: 0, joy: 1, open: 1, smile: 0.2 },
      ears: EARS_UP, // a cheer: both up
    }),
    handOnHip: vary(STAND, {
      nearArm: [[32, -88], [15, -74]], head: { turn: 0.3 },
    }),
    scratchHead: vary(STAND, {
      nearArm: [[40, -128], [26, -170]], farArm: [[-28, -90], [-10, -76]],
      head: { tilt: 8, turn: 0.4 }, face: { brows: 0.4, smile: 0.2 },
    }),
    flex: vary(STAND, {
      nearArm: [[48, -98], [46, -130]], farArm: [[-28, -90], [-10, -76]],
      head: { turn: 0.5 }, face: { smile: 1 },
    }),
    shrug: vary(STAND, {
      nearArm: [[28, -84], [46, -98]], farArm: [[-22, -84], [-40, -98]],
      head: { tilt: 8, turn: 0.1 }, face: { smile: 1, open: 0.7, brows: 0.6 },
    }),
    grin: vary(STAND, {
      head: { turn: 0 }, face: { eyes: 0, joy: 1, smile: 1, open: 1, teeth: 1 },
      ears: { ...EARS, near: EARS_UP.near }, // the brown one up (Sportowiec 318 s)
    }),
    toothy: vary(STAND, {
      head: { turn: 0.15 }, face: { smile: 1, open: 0.45, teeth: 1 },
    }),
    // The faces of the films' quiet moments are in the lids and brows, the
    // mouth small (Adam's frames, 2026-10-19: the doghouse, the bird):
    worried: vary(STAND, {
      nearArm: [[16, -84], [12, -64]], head: { turn: 0.2, tilt: 6 },
      face: { eyes: 0.75, brows: 1, lines: 0.7, small: 0.7, smile: -0.6 },
    }),
    puzzled: vary(STAND, {
      head: { turn: 0, tilt: 7 }, face: { eyes: 1, brows: 0.6, lift: 0.5, lines: 1, small: 1, smile: 0 },
      ears: EARS_UP, // both up, as at his doghouse
    }),
    content: vary(STAND, {
      head: { turn: 0.55, tilt: -6 }, face: { eyes: 0, joy: 0.8, brows: 0.15, smile: 0.9, small: 0.15 },
    }),
    eager: vary(STAND, {
      head: { turn: 0.7, tilt: 8 }, face: { eyes: 1, lift: 1, open: 0.85, smile: 0.6, tongue: 0.7 },
      ears: { ...EARS, far: EARS_UP.far },
    }),
    cross: vary(STAND, {
      nearArm: [[30, -88], [15, -74]], farArm: [[-28, -90], [-10, -76]],
      head: { turn: 0.3, tilt: 6 }, face: { eyes: 0.7, brows: -1, lines: 0.8, grit: 1, smile: 0 },
    }),
    surprised: vary(STAND, {
      nearArm: [[24, -96], [28, -116]], head: { turn: 0.1, tilt: -4 }, face: { lift: 1, open: 0.5, o: 1, smile: 0 },
      ears: EARS_UP,
    }),
    sitUp: vary(STAND, {
      pelvis: [0, -26], chest: [4, -62], head: { x: 10, y: -106, turn: 0.45, tilt: -6 },
      nearArm: [[22, -54], [26, -70]], farArm: [[14, -56], [18, -72]],
      nearLeg: [[24, -22], [30, 0]], farLeg: [[16, -20], [22, 0]],
      tail: [-34, -16], face: { open: 0.45, smile: 0.4 },
    }),
    onBack: vary(STAND, {
      pelvis: [20, -22], chest: [-26, -22], head: { x: -64, y: -36, tilt: -70, turn: 0.1 },
      nearArm: [[-16, -50], [-24, -66]], farArm: [[-30, -48], [-38, -62]],
      nearLeg: [[38, -50], [32, -70]], farLeg: [[24, -50], [18, -66]],
      tail: [48, -14], face: { eyes: 0, joy: -1, open: 0.3, smile: 1 },
    }),
    onFours: ON_FOURS,
    sniff: vary(ON_FOURS, {
      pelvis: [-32, -58], chest: [14, -44], head: { x: 56, y: -52, tilt: 26 },
      nearArm: [[20, -20], [22, 0]], farArm: [[10, -20], [10, 0]],
      tail: [-52, -100], face: { eyes: 0.6 },
    }),
    // resting, as a dog does: these replace the yard's old resting poses
    // asleep in his doghouse's doorway, seen from the front: head down on
    // his front paws, eyes shut (things.js clips him to the door)
    doorNap: vary(STAND, {
      pelvis: [0, -4], chest: [0, -12], head: { x: 0, y: -50, tilt: 0, turn: 0 },
      nearArm: [[26, -8], [36, -1]], farArm: [[-24, -8], [-34, -1]], mittens: 0, // a paw each side of him, over the sill
      nearLeg: [[6, -6], [10, -2]], farLeg: [[-6, -6], [-10, -2]],
      tail: [18, -24], face: { eyes: 0, joy: -1, smile: 0.3 },
    }),
    sitDog: vary(ON_FOURS, {
      pelvis: [-8, -24], chest: [6, -60], head: { x: 18, y: -104, turn: 0.6 },
      nearArm: [[14, -32], [16, 0]], farArm: [[8, -32], [8, 0]],
      nearLeg: [[12, -16], [16, 0]], farLeg: [[6, -16], [10, 0]],
      tail: [-40, -12], ears: EARS,
    }),
    lie: vary(ON_FOURS, {
      pelvis: [-34, -22], chest: [10, -26], head: { x: 40, y: -66, turn: 0.9 },
      nearArm: [[26, -10], [48, -2]], farArm: [[20, -10], [42, -2]],
      nearLeg: [[-30, -12], [-8, -2]], farLeg: [[-36, -12], [-14, -2]],
      tail: [-68, -10],
    }),
    nap: vary(ON_FOURS, {
      pelvis: [-34, -22], chest: [10, -24], head: { x: 44, y: -46, tilt: 18, turn: 0.9 },
      nearArm: [[26, -10], [48, -2]], farArm: [[20, -10], [42, -2]],
      nearLeg: [[-30, -12], [-8, -2]], farLeg: [[-36, -12], [-14, -2]],
      tail: [-68, -8], face: { eyes: 0, joy: -1, smile: 0.4 },
    }),
    curl: vary(ON_FOURS, {
      pelvis: [-20, -22], chest: [12, -24], head: { x: 26, y: -42, tilt: 40, turn: 0.7 },
      nearArm: [[10, -8], [28, -4]], farArm: [[4, -8], [22, -4]],
      nearLeg: [[-8, -10], [6, -4]], farLeg: [[-14, -10], [0, -4]],
      tail: [-30, -4], face: { eyes: 0, joy: -1, smile: 0.4 },
    }),
    sprawl: vary(ON_FOURS, {
      pelvis: [-30, -20], chest: [16, -20], head: { x: 52, y: -38, tilt: 12, turn: 1 },
      nearArm: [[38, -12], [62, -6]], farArm: [[32, -12], [56, -6]],
      nearLeg: [[-56, -12], [-82, -6]], farLeg: [[-52, -12], [-78, -6]],
      tail: [-64, -24], face: { eyes: 0, joy: -1, smile: 0.4 },
    }),
    bowStretch: vary(ON_FOURS, {
      pelvis: [-30, -56], chest: [12, -26], head: { x: 44, y: -58, tilt: -14 },
      nearArm: [[34, -10], [58, 0]], farArm: [[28, -10], [52, 0]],
      nearLeg: [[-34, -28], [-36, 0]], farLeg: [[-28, -28], [-28, 0]],
      tail: [-56, -98], face: { eyes: 0, joy: 1, open: 0.6, smile: 0.2 },
    }),
    backStretch: vary(ON_FOURS, {
      pelvis: [-26, -44], chest: [16, -56], head: { x: 52, y: -96, tilt: -6 },
      nearArm: [[18, -28], [18, 0]], farArm: [[10, -28], [10, 0]],
      nearLeg: [[-48, -24], [-70, 0]], farLeg: [[-44, -24], [-64, 0]],
      tail: [-60, -60],
    }),
    // the gallop, two poses in turn (world.yaml, moves[gallop]): gathered,
    // legs bunched under him, rump high…
    runGather: vary(ON_FOURS, {
      pelvis: [-24, -60], chest: [12, -52], head: { x: 46, y: -98, tilt: -4 },
      nearArm: [[16, -26], [0, -2]], farArm: [[10, -26], [-6, 0]],
      nearLeg: [[-10, -30], [6, -2]], farLeg: [[-16, -30], [0, 0]],
      tail: [-54, -92], face: { smile: 1 },
    }),
    // …and stretched flat and long, back legs flung out, front paws forward
    runStretch: vary(ON_FOURS, {
      pelvis: [-44, -50], chest: [24, -54], head: { x: 58, y: -96, tilt: -8 },
      nearArm: [[46, -50], [66, -42]], farArm: [[42, -46], [62, -36]],
      nearLeg: [[-66, -46], [-92, -40]], farLeg: [[-62, -42], [-88, -34]],
      tail: [-78, -70], face: { smile: 1 },
    }),
    leap: vary(ON_FOURS, {
      pelvis: [-44, -96], chest: [36, -104], head: { x: 80, y: -134, tilt: -10 },
      nearArm: [[64, -98], [94, -92]], farArm: [[58, -104], [88, -102]],
      nearLeg: [[-74, -90], [-106, -84]], farLeg: [[-70, -98], [-102, -96]],
      tail: [-80, -120], face: { open: 0.4, smile: 0.8 },
      ears: { near: [-70, -30], far: [-50, -40] },
    }),
  }

  // ------------------------------------------------------------ shapes

  /** Where the limbs join the body: a frame along the body (u, towards the
   * chest) and across it (n, the belly side). */
  function bodyFrame(p) {
    const u = unit(sub(p.chest, p.pelvis))
    const n = [-u[1], u[0]]
    return { u, n }
  }

  function limbs(p, { u, n }) {
    const shoulderNear = add(p.chest, add(mul(n, 8), mul(u, -4)))
    const shoulderFar = add(p.chest, add(mul(n, -6), mul(u, -2)))
    const hipNear = add(p.pelvis, add(mul(n, 6), mul(u, -10)))
    const hipFar = add(p.pelvis, add(mul(n, -4), mul(u, -10)))
    const leg = (hip, [knee, foot]) => `${bend(hip, knee, foot)} L${pt(add(foot, [TOE, 0]))}`
    const tailBase = add(p.pelvis, add(mul(n, -18), mul(u, -2)))
    const tailMid = add(mul(add(tailBase, p.tail), 0.5), mul(n, -3))
    return {
      nearArm: bend(shoulderNear, ...p.nearArm),
      farArm: bend(shoulderFar, ...p.farArm),
      nearHand: hand(shoulderNear, p.nearArm, p.mittens),
      farHand: hand(shoulderFar, p.farArm, p.mittens),
      nearLeg: leg(hipNear, p.nearLeg),
      farLeg: leg(hipFar, p.farLeg),
      tail: bend(tailBase, tailMid, p.tail),
    }
  }

  /** A hand at the end of an arm, along its forearm: a mitten and a thumb
   * on its front side. Shown only where the pose has mittens (upright); on
   * all fours or asleep his paws are plain. */
  function hand(shoulder, [elbow, paw], mittens) {
    if (mittens < 0.5) return { show: 0 } // nothing to draw, nothing to work out
    const control = sub(mul(elbow, 2), mul(add(shoulder, paw), 0.5))
    const d = unit(sub(paw, control))
    const across = [-d[1], d[0]]
    const side = across[0] - 0.01 * across[1] < 0 ? mul(across, -1) : across // the hand's forward side (upward, held out level)
    const thumbFrom = add(paw, mul(d, 1))
    const thumbTo = add(paw, add(mul(d, THUMB_OUT[0]), mul(side, THUMB_OUT[1])))
    return {
      // the mitten, and the thumb as a narrower stroke out of it: one shape
      mitten: `M${pt(paw)} L${pt(add(paw, mul(d, MITTEN_LONG)))}`,
      thumb: `M${pt(thumbFrom)} L${pt(thumbTo)}`,
      show: 1,
    }
  }

  /** An ear: the whole flap, base to fold to tip, and its tip again, laid
   * over it once it is folded far enough, its outline making the crease (a
   * flap folding back on itself reads as a lump without one). */
  function ear(base, [angle, bendBy]) {
    const knee = add(base, mul(toward(angle), EAR_LENGTHS[0]))
    const tip = add(knee, mul(toward(angle + bendBy), EAR_LENGTHS[1]))
    return { flap: `M${pt(base)} L${pt(knee)} L${pt(tip)}`, tip: `M${pt(knee)} L${pt(tip)}`, crease: Math.abs(bendBy) >= FOLD ? 1 : 0 }
  }

  /** The pose with his ears raised towards standing straight up, by how much
   * each is perked: [near, far], 0 (as the pose has them) to 1 (up); a
   * little past 1 or under 0 as they overshoot on a spring. */
  function perked(p, [near, far]) {
    if (!near && !far) return p
    return vary(p, { ears: { near: mix(p.ears.near, EARS_UP.near, near), far: mix(p.ears.far, EARS_UP.far, far) } })
  }

  /** The features' places on the egg for a turn from 0 (facing the viewer) to
   * 1 (side-on, facing right): they slide across, and the far eye goes round
   * the edge. The eyes sit close together just above the nose; the muzzle
   * (and the nose and mouth on it) comes out faster than the eyes slide, so
   * a three-quarter head already has its snout. */
  function layout(turn) {
    const t = clamp01(turn)
    const s = 1 - (1 - t) ** 3 // how far out the muzzle is
    // the muzzle: a short, deep, round bulb low on his face, the nose on its
    // upper front, its underside rounding into his jaw (the bird frames)
    const muzzle = { c: [38 * s, 19], rx: 18 + 6 * s, ry: 23 } // its bottom on his jaw's, so the two merge
    const front = muzzle.c[0] + muzzle.rx * 0.72 * s
    return {
      nose: [front, 19 - muzzle.ry * (0.42 + 0.3 * s)],
      eyes: [[-9 + 27 * t, -4], [9 + 25 * t, -4]],
      farEye: clamp01((0.75 - t) / 0.25), // how much of the far eye shows
      mouth: [front - 14 * s, 24 - 2 * t],
      ears: [[-15 + 10 * t, -DOME + 4], [15 + 4 * t, -DOME + 2]],
      muzzle,
      // under his chin, between jaw and muzzle, so they meet in one curve
      jaw: { c: [muzzle.c[0] * 0.5, 32], rx: 12 + 20 * s, ry: 10 },
    }
  }

  /** The upper lid's edge across an eye at (x, y), `down` of the way from
   * its top to its bottom, sloping by `slope` (rise towards the nose): a
   * function of x. */
  const lidEdge = ([x, y], down, slope, inner) => (px) => y - EYE.ry + 2 * EYE.ry * down - (px - x) * inner * slope

  function eyes(L, f) {
    const eyesOpen = f.eyes * (1 - clamp01(f.blink))
    const down = clamp01(1 - eyesOpen) * 0.85 // how far the lid is down; the rest is the shut arc
    return L.eyes.map((e, i) => {
      const show = i === 0 ? 1 : L.farEye // the far eye narrows as it goes round the edge…
      const seen = show > 0.4 ? 1 : 0 // …and its lines go with it, never half-faded to grey
      const shutness = clamp01((0.3 - eyesOpen) / 0.2)
      const inner = i === 0 ? 1 : -1 // towards the other eye (not the nose: turned, it is past both)
      const browY = e[1] - 11 - 4 * f.lift
      const at = [e[0] + 2.4 * f.look, e[1]]
      const lid = lidEdge(at, down, 0.9 * f.brows, inner)
      const [l, r] = [at[0] - 7, at[0] + 7]
      const [a, b] = [at[0] - EYE.rx - 1.2, at[0] + EYE.rx + 1.2]
      // creases: arcs round the top of the eye, above the brow, a little to
      // its outer side (the doghouse frame)
      const crease = (k) => {
        const r = 9.5 + 3 * k
        const c = [e[0], e[1] - 1]
        const from = add(c, mul(toward(-inner * 95), r))
        const to = add(c, mul(toward(-inner * 50), r))
        return `M${pt(from)} A${fmt(r)} ${fmt(r)} 0 0 ${inner > 0 ? 1 : 0} ${pt(to)}`
      }
      return {
        at, rx: EYE.rx * show, open: (show > 0.05 ? 1 : 0) * (1 - shutness),
        lidClip: down > 0.005 ? `M${pt([l, lid(l)])} L${pt([r, lid(r)])} L${pt([r, at[1] + 12])} L${pt([l, at[1] + 12])} Z` : '', // only while the lid is down
        lid: `M${pt([a, lid(a)])} L${pt([b, lid(b)])}`,
        lidDown: down > 0.005,
        lidShow: seen * (1 - shutness) * clamp01((down - 0.12) / 0.12),
        shut: `M${pt([e[0] - 5, e[1]])} Q${pt([e[0], e[1] - 6 * f.joy])} ${pt([e[0] + 5, e[1]])}`,
        shutShow: seen * shutness,
        brow: `M${pt([e[0] - 5 * inner, browY])} Q${pt([e[0], browY - 3])} ${pt([e[0] + 5 * inner, browY - 5 * f.brows])}`,
        browShow: seen, // always there, as in the films: a line that acts
        lines: `${crease(0)} ${crease(1)}`,
        linesShow: seen * clamp01(f.lines),
      }
    })
  }

  /** A curve from a through control c to b, as a function of t (0 to 1). */
  const along = (a, c, b) => (t) => [
    (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t ** 2 * b[0],
    (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t ** 2 * b[1],
  ]

  /** A row of top teeth hanging from the upper lip, with lines between them. */
  function teeth(left, top, right, h) {
    const down = (p) => [p[0], p[1] + h]
    const lip = along(left, top, right)
    const lines = []
    for (let i = 1; i < TEETH; i++) {
      const at = lip(i / TEETH)
      lines.push(`M${pt(at)} L${pt(down(at))}`)
    }
    return {
      band: `M${pt(left)} Q${pt(top)} ${pt(right)} L${pt(down(right))} Q${pt(down(top))} ${pt(down(left))} Z`,
      lines: lines.join(' '),
    }
  }

  /** How far his head reaches either side at height y (head units): the egg,
   * its jaw dropped by `open`, and on the right his muzzle as he turns. */
  function headSpan(y, L, open) {
    const bottom = 42 + JAW_DROP * open
    const across = (dy, r) => Math.sqrt(Math.max(0, 1 - (dy / r) ** 2))
    const dome = TEMPLE[0] * across(y - TEMPLE[1], DOME + TEMPLE[1])
    const cheeks = y > CHEEK[1] ? CHEEK[0] * across(y - CHEEK[1], bottom - CHEEK[1]) : lerp(TEMPLE[0], CHEEK[0], clamp01((y - TEMPLE[1]) / (CHEEK[1] - TEMPLE[1])))
    const egg = y < TEMPLE[1] ? dome : cheeks
    const m = L.muzzle
    const muzzle = m.c[0] + m.rx * across(y - m.c[1], m.ry)
    const j = jawAt(L, open)
    const jaw = j.c[0] + j.rx * across(y - j.c[1], j.ry)
    return [-egg, Math.max(egg, muzzle, jaw)]
  }

  /** The bridge under his chin, dropped with his jaw as his mouth opens. */
  function jawAt(L, open) {
    return { ...L.jaw, c: [L.jaw.c[0], L.jaw.c[1] + JAW_DROP * open] }
  }

  function mouth(L, f) {
    const [mx, my] = L.mouth
    const wide = lerp(15 + 7 * Math.max(f.smile, 0) + GRIN_WIDEN * f.open, 5, f.o) * (1 - 0.55 * f.small)
    const corner = my - 4 * f.smile * (1 - f.o)
    const mid = my + 8 * f.smile * (1 - f.o)
    const depth = lerp((14 + JAW_DROP / 2) * f.open, 7 * f.open, f.o)
    // however wide the grin, its corners stay inside his head
    const [edgeL, edgeR] = headSpan(corner, L, f.open)
    const left = [Math.max(mx - wide, edgeL + MOUTH_MARGIN), corner]
    const right = [Math.min(mx + wide, edgeR - MOUTH_MARGIN), corner]
    const w = (right[0] - left[0]) / 2
    const top = [mx, mid]
    const lower = mid + 2 * depth
    return {
      d: `M${pt(left)} Q${pt(top)} ${pt(right)} Q${pt([(left[0] + right[0]) / 2, lower])} ${pt(left)} Z`,
      tongue: { c: [mx + 2, lerp(mid, lower, 0.62)], rx: w * 0.45, ry: 8 * f.open },
      teeth: { ...teeth(left, top, right, 6 + 3 * f.open), show: Math.max(f.teeth, smiling(f)) },
      // hanging out over his chin: lapping, catching drops, panting
      tongueOut: tongueFrom([mx + w * 0.25, (corner + lower) / 2 - 3], f.tongue),
      bone: { at: [mx + w * 0.2, mid + 1], show: f.bone },
      grit: gritted([mx, my + 2], f.grit),
    }
  }

  /** Teeth clenched, cross: a box of them, a line between top and bottom
   * rows and lines between teeth (the films' cross face). */
  function gritted([x, y], grit) {
    const w = 17
    const h = 8
    const rows = `M${pt([x - w, y])} H${fmt(x + w)}`
    const gaps = [-0.5, 0, 0.5].map((k) => `M${pt([x + k * w, y - h])} V${fmt(y + h)}`).join(' ')
    return {
      box: `M${pt([x - w, y - h])} H${fmt(x + w)} V${fmt(y + h)} H${fmt(x - w)} Z`,
      lines: `${rows} ${gaps}`,
      show: clamp01(grit),
    }
  }

  /** How much a smiling open mouth shows his top teeth, as the cartoon's
   * nearly always does (Sportowiec 318 s, Aktor 166 s): not a yawn, a shout
   * or a cross face, which smile little or not at all. */
  const smiling = (f) => clamp01((f.open - 0.25) / 0.2) * clamp01((f.smile - 0.45) / 0.3) * (1 - f.o)

  /** A tongue hanging from under his lower lip at `from` (its root), as far
   * out as `out` (0 to 1): a rounded tip, a crease down the middle. */
  function tongueFrom([x, y], out) {
    const r = 4.5 + 1.5 * out // half its width
    const tip = y + 4 + 11 * out // the bottom of its rounded tip
    const body = `M${pt([x - r, y])} L${pt([x - r, tip - r])} A${fmt(r)} ${fmt(r)} 0 0 0 ${pt([x + r, tip - r])} L${pt([x + r, y])} Z`
    return { d: body, crease: `M${pt([x, y + 2])} L${pt([x, tip - r * 0.8])}`, show: out > 0.02 ? 1 : 0 }
  }

  /** Where his mouth is, in the figure's own units (feet on y = 0, facing
   * right): for effects that come from it (a bark, crumbs, a snap). */
  function mouthAt(p) {
    const L = layout(p.head.turn)
    return onHead(p, [L.mouth[0], L.mouth[1] + 6])
  }

  /** The top of his nose, in his own units (a drop or a petal lands on it). */
  function noseTipAt(p) {
    const L = layout(p.head.turn)
    return onHead(p, [L.nose[0], L.nose[1] - 6])
  }

  /** A point given in head units (about its centre, before the tilt) in his own units. */
  function onHead(p, local) {
    const a = (p.head.tilt * Math.PI) / 180
    const [x, y] = mul(local, HEAD_SCALE)
    const turned = [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
    return add([p.head.x, p.head.y], turned)
  }

  // The bowl stuck over his head, upside down, in head units: its rim at his
  // nose, so his eyes are hidden and only his nose and mouth show under it.
  const BOWL = { rim: 8, top: -DOME - 2, half: 48, base: 36 }

  /** The upside-down bowl, centred over his face as it turns. */
  function bowlOver(turn) {
    const c = 10 * clamp01(turn)
    const { rim, top, half, base } = BOWL
    return {
      body: `M${pt([c - half, rim])} L${pt([c - base, top])} H${fmt(c + base)} L${pt([c + half, rim])} Z`,
      rim: `M${pt([c - half - 2, rim])} H${fmt(c + half + 2)}`,
    }
  }

  /** The top of the bowl stuck on his head, in his own units (where the bird lands). */
  const bowlTopAt = (p) => onHead(p, [10 * clamp01(p.head.turn), BOWL.top])

  function head(h, f, ears) {
    const L = layout(h.turn)
    const m = L.muzzle
    return {
      transform: `translate(${fmt(h.x)} ${fmt(h.y)}) rotate(${fmt(h.tilt)}) scale(${HEAD_SCALE})`,
      skull: `${egg(f.open)} ${ellipsePath(m.c, m.rx, m.ry)} ${ellipsePath(...Object.values(jawAt(L, f.open)))}`,
      ears: [ear(L.ears[0], ears.near), ear(L.ears[1], ears.far)],
      patch: { c: [L.eyes[0][0] - 7 - 8 * clamp01(h.turn), -26], rx: 15, ry: 40 }, // a band round his eye and up to his brown ear
      nose: noseAt(L.nose, h.turn),
      eyes: eyes(L, f),
      mouth: mouth(L, f),
      bowl: { ...bowlOver(h.turn), show: f.bowl >= 0.5 ? 1 : 0 },
    }
  }

  /** The big black nose: a rounded triangle, point down, narrower side-on. */
  function noseAt([x, y], turn) {
    const w = 12 - 3 * clamp01(turn)
    return `M${pt([x - w, y - 5])} Q${pt([x, y - 9])} ${pt([x + w, y - 5])} Q${pt([x + w, y + 4])} ${pt([x, y + 7])} Q${pt([x - w, y + 4])} ${pt([x - w, y - 5])} Z`
  }

  /** Everything to draw for a pose: path data and places, all plain values. */
  function shape(p) {
    const frame = bodyFrame(p)
    const angle = (Math.atan2(frame.u[1], frame.u[0]) * 180) / Math.PI
    return {
      body: capsule(p.pelvis, PELVIS_R, p.chest, CHEST_R),
      bodyPatch: { c: add(p.pelvis, mul(frame.n, -13)), rx: 15, ry: 11, angle },
      ...limbs(p, frame),
      head: head(p.head, p.face, p.ears),
      neckless: p.neckless >= 0.5,
    }
  }

  // ------------------------------------------------------------ drawing

  let mounted = 0 // each figure on a page needs its own clip-path ids

  // The attributes last written to each node: drawing every frame only
  // touches what changed, so a still Reksio costs the page nothing.
  const written = new WeakMap()
  function set(node, k, v) {
    let m = written.get(node)
    if (!m) written.set(node, (m = new Map()))
    const value = typeof v === 'number' ? fmt(v) : v
    if (m.get(k) === value) return
    m.set(k, value)
    node.setAttribute(k, value)
  }

  function el(parent, tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
    parent.appendChild(node)
    return node
  }

  const tubeStyle = ([outer, inner], fill, cls) => [
    { fill: 'none', stroke: COLOURS.ink, 'stroke-width': outer, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    { fill: 'none', stroke: fill, 'stroke-width': inner, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: cls },
  ]

  /** A limb: an outline tube under a coloured one. cls lets the page restyle
   * it (fig-leg: muddy paws). */
  function tube(parent, size, fill = COLOURS.white, cls = fill === COLOURS.white ? 'fig-tube' : 'fig-tube-ochre') {
    const [a, b] = tubeStyle(size, fill, cls)
    const paths = [el(parent, 'path', a), el(parent, 'path', b)]
    return (d) => paths.forEach((p) => set(p, 'd', d))
  }

  const OUTLINE_INK = { fill: COLOURS.ink, stroke: COLOURS.ink, 'stroke-width': LINE * 2, 'stroke-linejoin': 'round' } // a shape's outline, under its fill

  /** Shapes merged into one outlined shape: the outline of all of them (in
   * inkParent), under the fill of all of them (in parent). Two of these
   * whose inks both go under both fills merge into one too (his head and
   * body: no neck). */
  function merged(parent, fill, clipId, inkParent = parent) {
    const ink = el(inkParent, 'path', OUTLINE_INK)
    const clip = el(el(parent, 'clipPath', { id: clipId }), 'path')
    const white = el(parent, 'path', { fill, class: 'fig-white' })
    return (d) => [ink, clip, white].forEach((p) => set(p, 'd', d))
  }

  /** Show a node by `show` (its opacity), and bring its shape up to date
   * only while it shows: a hidden part costs nothing, however his head
   * moves. */
  function showing(node, show, attrs) {
    set(node, 'display', show > 0 ? 'inline' : 'none') // hidden, out of the drawing altogether: opacity 0 still costs the browser
    if (show <= 0) return
    set(node, 'opacity', show)
    for (const [k, v] of Object.entries(attrs)) set(node, k, v)
  }

  /** Show a group (display), and update what is in it only while shown. */
  function shownIf(g, show, update) {
    set(g, 'display', show ? 'inline' : 'none')
    if (show) update()
  }

  function setEllipse(node, { c, rx, ry, angle = 0 }) {
    set(node, 'cx', c[0])
    set(node, 'cy', c[1])
    set(node, 'rx', Math.max(rx, 0.01))
    set(node, 'ry', Math.max(ry, 0.01))
    set(node, 'transform', `rotate(${fmt(angle)} ${fmt(c[0])} ${fmt(c[1])})`)
  }

  /** A bone held level in his teeth. */
  const BONE = (x, y) => `M${pt([x - 13, y])} H${fmt(x + 13)} M${pt([x - 17, y - 5])} a5 5 0 1 0 0 10 M${pt([x + 17, y - 5])} a5 5 0 1 1 0 10`

  const stroke = (width) => ({ fill: 'none', stroke: COLOURS.ink, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })

  /** His eyes: each an oval under its lid (clipped at the lid's edge, the
   * edge drawn as a line), the shut arc, the brow, and creases above. */
  function mountEyes(g, clips) {
    const eyes = [0, 1].map((i) => ({
      clip: el(el(g, 'clipPath', { id: `${clips.eye}${i}` }), 'path'),
      open: el(g, 'ellipse', { fill: COLOURS.ink, rx: EYE.rx, ry: EYE.ry }),
      lid: el(g, 'path', stroke(2.2)),
      shut: el(g, 'path', stroke(2.6)),
      brow: el(g, 'path', stroke(2.6)),
      lines: el(g, 'path', stroke(1.8)),
    }))
    return (all) => all.forEach((e, i) => {
      const v = eyes[i]
      // clipped under the lid only while it is down: an open eye needs no clip
      set(v.open, 'clip-path', e.lidDown ? `url(#${clips.eye}${i})` : 'none')
      if (e.lidDown) set(v.clip, 'd', e.lidClip)
      showing(v.open, e.open, { cx: e.at[0], cy: e.at[1], rx: Math.max(e.rx, 0.01) })
      for (const k of ['lid', 'shut', 'brow', 'lines']) showing(v[k], e[`${k}Show`], { d: e[k] })
    })
  }

  /** Clenched teeth over his mouth, shown by how cross he is. */
  function mountGrit(g) {
    const box = el(g, 'path', { fill: COLOURS.white, stroke: COLOURS.ink, 'stroke-width': 2.2, 'stroke-linejoin': 'round' })
    const lines = el(g, 'path', stroke(1.6))
    return (grit) => {
      showing(box, grit.show, { d: grit.box })
      showing(lines, grit.show, { d: grit.lines })
    }
  }

  function mountFace(g, clips) {
    const patch = el(g, 'ellipse', { fill: COLOURS.ochre, class: 'fig-ochre', 'clip-path': `url(#${clips.head})` })
    const eyes = mountEyes(g, clips)
    const nose = el(g, 'path', { fill: COLOURS.ink, stroke: COLOURS.ink, 'stroke-width': 2, 'stroke-linejoin': 'round' })
    const mouthClip = el(el(g, 'clipPath', { id: clips.mouth }), 'path')
    const mouthShape = el(g, 'path', { fill: COLOURS.red, stroke: 'none' })
    const inside = el(g, 'g', { 'clip-path': `url(#${clips.mouth})` })
    const tongue = el(inside, 'ellipse', { fill: COLOURS.tongue })
    const teethBand = el(inside, 'path', { fill: COLOURS.white })
    const teethLines = el(inside, 'path', { fill: 'none', stroke: COLOURS.ink, 'stroke-width': 1.6 })
    const tongueOut = el(g, 'path', { fill: COLOURS.tongue, stroke: COLOURS.ink, 'stroke-width': 1.8, 'stroke-linejoin': 'round' })
    const crease = el(g, 'path', { fill: 'none', stroke: '#c96a5d', 'stroke-width': 1.4, 'stroke-linecap': 'round' })
    const lips = el(g, 'path', { fill: 'none', stroke: COLOURS.ink, 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })
    const bone = [11, 5].map((w, i) => el(g, 'path', { fill: 'none', stroke: i ? COLOURS.white : COLOURS.ink, 'stroke-width': w, 'stroke-linecap': 'round' }))
    const grit = mountGrit(g)
    return (s) => {
      setEllipse(patch, s.patch)
      eyes(s.eyes)
      set(nose, 'd', s.nose)
      for (const p of [mouthClip, mouthShape, lips]) set(p, 'd', s.mouth.d)
      for (const p of [mouthShape, lips, inside]) set(p, 'opacity', 1 - s.mouth.grit.show)
      grit(s.mouth.grit)
      const t = s.mouth.teeth
      showing(teethBand, t.show, { d: t.band })
      showing(teethLines, t.show, { d: t.lines })
      setEllipse(tongue, s.mouth.tongue)
      const out = s.mouth.tongueOut
      showing(tongueOut, out.show, { d: out.d })
      showing(crease, out.show, { d: out.crease })
      for (const b of bone) showing(b, s.mouth.bone.show, { d: BONE(...s.mouth.bone.at) })
    }
  }

  /** An ear: its flap, then its tip over it, shown only when it is folded. */
  function earOf(parent, fill) {
    const flap = tube(parent, EAR, fill)
    const tipG = el(parent, 'g')
    const tip = tube(tipG, EAR, fill)
    return (e) => {
      flap(e.flap)
      shownIf(tipG, e.crease, () => tip(e.tip))
    }
  }

  /** A hand: mitten and thumb in one outline (their inks under both fills,
   * the thumb narrower), so the thumb grows out of the mitten. */
  function handOf(parent) {
    const g = el(parent, 'g')
    const [ink, white] = tubeStyle(MITTEN, COLOURS.white, 'fig-tube')
    const inks = [el(g, 'path', ink), el(g, 'path', { ...ink, 'stroke-width': THUMB_W + 2 * LINE })]
    const whites = [el(g, 'path', white), el(g, 'path', { ...white, 'stroke-width': THUMB_W })]
    return (h) => shownIf(g, h.show, () => {
      for (const [i, d] of [h.mitten, h.thumb].entries()) {
        set(inks[i], 'd', d)
        set(whites[i], 'd', d)
      }
    })
  }

  /** Make a Reksio inside an SVG group; returns draw(pose). */
  function mount(parent) {
    const id = `fig${++mounted}`
    const clips = { body: `${id}-body`, head: `${id}-head`, mouth: `${id}-mouth`, eye: `${id}-eye` }
    const root = el(parent, 'g', { class: 'figure' })
    const farLeg = tube(root, LEG, COLOURS.white, 'fig-tube fig-leg')
    const farArm = tube(root, ARM)
    const farHand = handOf(root)
    const tail = tube(root, TAIL)
    // the head's outline goes under the body's fill, and the body's under
    // the head's: head and body are one shape, with no neck (Kompan 70 s)
    const bodyInk = el(root, 'g')
    const headInk = el(root, 'g')
    const body = merged(root, COLOURS.white, clips.body, bodyInk)
    const bodyPatch = el(root, 'ellipse', { fill: COLOURS.ochre, class: 'fig-ochre', 'clip-path': `url(#${clips.body})` })
    const nearLeg = tube(root, LEG, COLOURS.white, 'fig-tube fig-leg')
    const headG = el(root, 'g')
    const farEar = earOf(headG, COLOURS.white)
    const nearEar = earOf(headG, COLOURS.ochre)
    // …or, not standing, the head's own outline, drawn over the body
    const ownInk = el(headG, 'path', OUTLINE_INK)
    const skull = merged(headG, COLOURS.white, clips.head, headInk)
    const face = mountFace(headG, clips)
    const bowl = [el(headG, 'path', { class: 'bowl' }), el(headG, 'path', { class: 'bowl-rim' })]
    const nearArm = tube(root, ARM)
    const nearHand = handOf(root)
    return function draw(pose) {
      const s = shape(pose)
      farLeg(s.farLeg)
      farArm(s.farArm)
      farHand(s.farHand)
      tail(s.tail)
      body(s.body)
      setEllipse(bodyPatch, s.bodyPatch)
      nearLeg(s.nearLeg)
      set(headG, 'transform', s.head.transform)
      set(headInk, 'transform', s.head.transform)
      set(headInk, 'display', s.neckless ? 'inline' : 'none')
      shownIf(ownInk, !s.neckless, () => set(ownInk, 'd', s.head.skull))
      nearEar(s.head.ears[0])
      farEar(s.head.ears[1])
      skull(s.head.skull)
      face(s.head)
      for (const [b, d] of [[bowl[0], s.head.bowl.body], [bowl[1], s.head.bowl.rim]]) shownIf(b, s.head.bowl.show, () => set(b, 'd', d))
      nearArm(s.nearArm)
      nearHand(s.nearHand)
    }
  }

  return { POSES, mix, vary, perked, shape, mouthAt, noseTipAt, bowlTopAt, mount, capsule }
})()
