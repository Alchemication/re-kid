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

/* exported Figure */
const Figure = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const COLOURS = { ink: '#1d1914', white: '#f6f8f6', ochre: '#e1a23a', red: '#c8371f', tongue: '#ee8b7c' }
  const OUTLINE = 4.5 // line width round the body and head
  const PELVIS_R = 24 // the bean's rear end…
  const CHEST_R = 18 // …and its front end
  // tubes: [outline width, white width]; the outline shows (a - b) / 2 each side
  const LEG = [17, 11]
  const ARM = [15, 9]
  const TAIL = [9, 4]
  const EAR = [24, 17]
  const EAR_LENGTHS = [18, 16] // base to bend, bend to tip
  const TOE = 6 // a foot reaches this far forward of the ankle
  // The head, in its own units about its centre: a tall egg, widest at the
  // jaw, with no neck. The muzzle grows out of it as he turns side-on.
  const JAW_DROP = 16 // how far his jaw drops with his mouth wide open
  const GRIN_WIDEN = 14 // how much wider a wide-open grin is than a closed smile (the cartoon's spans his face)
  const TEETH = 5 // teeth in a row
  const egg = (open) => {
    const b = 42 + JAW_DROP * open
    return `M0 -42 C18 -42 34 -22 34 4 C34 ${fmt(b - 14)} 20 ${fmt(b)} 0 ${fmt(b)} C-20 ${fmt(b)} -34 ${fmt(b - 14)} -34 4 C-34 -22 -18 -42 0 -42 Z`
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

  const FACE = { eyes: 1, joy: 0, brows: 0, lift: 0, smile: 0.6, open: 0, teeth: 0, o: 0 }
  const EARS = { near: [-20, -75], far: [14, 40] } // [angle from upright, bend at the middle], degrees

  const STAND = {
    pelvis: [0, -72], chest: [3, -106],
    head: { x: 8, y: -150, tilt: 0, turn: 0.35 },
    nearArm: [[13, -82], [15, -60]], farArm: [[-9, -84], [-10, -62]],
    nearLeg: [[9, -36], [9, 0]], farLeg: [[-5, -36], [-7, 0]],
    tail: [-34, -92],
    face: FACE, ears: EARS,
  }

  const ON_FOURS = {
    pelvis: [-32, -50], chest: [16, -54],
    head: { x: 50, y: -92, tilt: 0, turn: 1 },
    nearArm: [[18, -26], [18, 0]], farArm: [[8, -26], [6, 0]],
    nearLeg: [[-36, -24], [-34, 0]], farLeg: [[-28, -24], [-24, 0]],
    tail: [-62, -82],
    face: FACE, ears: { near: [-40, -60], far: [-10, 40] },
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
    }),
    armsWide: vary(STAND, {
      nearArm: [[42, -88], [62, -116]], farArm: [[-34, -88], [-54, -116]],
      nearLeg: [[13, -36], [17, 0]], farLeg: [[-10, -36], [-15, 0]],
      head: { tilt: -10, turn: 0.1 }, face: { eyes: 0, joy: 1, open: 1, smile: 0.2 },
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
    }),
    toothy: vary(STAND, {
      head: { turn: 0.15 }, face: { smile: 1, open: 0.45, teeth: 1 },
    }),
    worried: vary(STAND, {
      nearArm: [[16, -84], [12, -64]], head: { turn: 0, tilt: 4 }, face: { brows: 1, smile: -0.6 },
    }),
    cross: vary(STAND, {
      nearArm: [[30, -88], [15, -74]], farArm: [[-28, -90], [-10, -76]],
      head: { turn: 0.3, tilt: 6 }, face: { brows: -1, smile: -0.8 },
    }),
    surprised: vary(STAND, {
      nearArm: [[24, -96], [28, -116]], head: { turn: 0.1, tilt: -4 }, face: { lift: 1, open: 0.5, o: 1, smile: 0 },
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
      nearLeg: leg(hipNear, p.nearLeg),
      farLeg: leg(hipFar, p.farLeg),
      tail: bend(tailBase, tailMid, p.tail),
    }
  }

  function ear(base, [angle, bendBy]) {
    const knee = add(base, mul(toward(angle), EAR_LENGTHS[0]))
    const tip = add(knee, mul(toward(angle + bendBy), EAR_LENGTHS[1]))
    return bend(base, knee, tip)
  }

  /** The features' places on the egg for a turn from 0 (facing the viewer) to
   * 1 (side-on, facing right): they slide across, and the far eye goes round
   * the edge. */
  function layout(turn) {
    const t = clamp01(turn)
    return {
      nose: [52 * t, 10 - 4 * t],
      eyes: [[-13 + 33 * t, -8], [13 + 29 * t, -8]],
      farEye: clamp01((0.75 - t) / 0.25), // how much of the far eye shows
      mouth: [36 * t, 22 - 2 * t],
      ears: [[-15 + 10 * t, -36], [15 + 4 * t, -38]],
      muzzle: { c: [26 * t, 14], rx: 12 + 18 * t, ry: 17 - 3 * t },
    }
  }

  function eyes(L, f) {
    return L.eyes.map((e, i) => {
      const show = i === 0 ? 1 : L.farEye
      const shutness = clamp01((0.45 - f.eyes) / 0.3)
      const inner = Math.sign(L.nose[0] - e[0]) || 1
      const browY = e[1] - 12 - 4 * f.lift
      return {
        at: e, ry: 0.4 + 4.6 * f.eyes, open: show * (1 - shutness),
        shut: `M${pt([e[0] - 5, e[1]])} Q${pt([e[0], e[1] - 6 * f.joy])} ${pt([e[0] + 5, e[1]])}`,
        shutShow: show * shutness,
        brow: `M${pt([e[0] - 5 * inner, browY])} Q${pt([e[0], browY - 3])} ${pt([e[0] + 5 * inner, browY - 5 * f.brows])}`,
        browShow: show * clamp01(Math.abs(f.brows) * 1.5 + f.lift),
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

  function mouth(L, f) {
    const [mx, my] = L.mouth
    const w = lerp(13 + 5 * Math.max(f.smile, 0) + GRIN_WIDEN * f.open, 5, f.o)
    const corner = my - 3 * f.smile * (1 - f.o)
    const mid = my + 7 * f.smile * (1 - f.o)
    const depth = lerp((14 + JAW_DROP / 2) * f.open, 7 * f.open, f.o)
    const left = [mx - w, corner]
    const right = [mx + w, corner]
    const top = [mx, mid]
    const lower = mid + 2 * depth
    return {
      d: `M${pt(left)} Q${pt(top)} ${pt(right)} Q${pt([mx, lower])} ${pt(left)} Z`,
      tongue: { c: [mx + 2, lerp(mid, lower, 0.62)], rx: w * 0.45, ry: 8 * f.open },
      teeth: { ...teeth(left, top, right, 6 + 3 * f.open), show: f.teeth },
    }
  }

  function head(h, f, ears) {
    const L = layout(h.turn)
    const m = L.muzzle
    return {
      transform: `translate(${fmt(h.x)} ${fmt(h.y)}) rotate(${fmt(h.tilt)})`,
      skull: `${egg(f.open)} ${ellipsePath(m.c, m.rx, m.ry)}`,
      ears: [ear(L.ears[0], ears.near), ear(L.ears[1], ears.far)],
      patch: { c: [L.eyes[0][0] + 3, -16], rx: 17, ry: 22 },
      nose: noseAt(L.nose, h.turn),
      eyes: eyes(L, f),
      mouth: mouth(L, f),
    }
  }

  /** The big black nose: a rounded triangle, point down, narrower side-on. */
  function noseAt([x, y], turn) {
    const w = 10 - 3 * clamp01(turn)
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
    }
  }

  // ------------------------------------------------------------ drawing

  let mounted = 0 // each figure on a page needs its own clip-path ids

  function el(parent, tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
    parent.appendChild(node)
    return node
  }

  const tubeStyle = ([outer, inner], fill = COLOURS.white) => [
    { fill: 'none', stroke: COLOURS.ink, 'stroke-width': outer, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    { fill: 'none', stroke: fill, 'stroke-width': inner, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
  ]

  function tube(parent, size, fill) {
    const [a, b] = tubeStyle(size, fill)
    const paths = [el(parent, 'path', a), el(parent, 'path', b)]
    return (d) => paths.forEach((p) => p.setAttribute('d', d))
  }

  /** Two shapes merged into one outlined shape: the outline of both, under
   * the fill of both. */
  function merged(parent, fill, clipId) {
    const ink = el(parent, 'path', { fill: COLOURS.ink, stroke: COLOURS.ink, 'stroke-width': OUTLINE * 2, 'stroke-linejoin': 'round' })
    const clip = el(el(parent, 'clipPath', { id: clipId }), 'path')
    const white = el(parent, 'path', { fill })
    return (d) => [ink, clip, white].forEach((p) => p.setAttribute('d', d))
  }

  function setEllipse(node, { c, rx, ry, angle = 0 }) {
    node.setAttribute('cx', fmt(c[0]))
    node.setAttribute('cy', fmt(c[1]))
    node.setAttribute('rx', fmt(Math.max(rx, 0.01)))
    node.setAttribute('ry', fmt(Math.max(ry, 0.01)))
    node.setAttribute('transform', `rotate(${fmt(angle)} ${fmt(c[0])} ${fmt(c[1])})`)
  }

  function mountFace(g, clips) {
    const patch = el(g, 'ellipse', { fill: COLOURS.ochre, 'clip-path': `url(#${clips.head})` })
    const eyes = [0, 1].map(() => ({
      open: el(g, 'ellipse', { fill: COLOURS.ink, rx: 3.4 }),
      shut: el(g, 'path', { fill: 'none', stroke: COLOURS.ink, 'stroke-width': 2.6, 'stroke-linecap': 'round' }),
      brow: el(g, 'path', { fill: 'none', stroke: COLOURS.ink, 'stroke-width': 2.6, 'stroke-linecap': 'round' }),
    }))
    const nose = el(g, 'path', { fill: COLOURS.ink, stroke: COLOURS.ink, 'stroke-width': 2, 'stroke-linejoin': 'round' })
    const mouthClip = el(el(g, 'clipPath', { id: clips.mouth }), 'path')
    const mouthShape = el(g, 'path', { fill: COLOURS.red, stroke: 'none' })
    const inside = el(g, 'g', { 'clip-path': `url(#${clips.mouth})` })
    const tongue = el(inside, 'ellipse', { fill: COLOURS.tongue })
    const teethBand = el(inside, 'path', { fill: COLOURS.white })
    const teethLines = el(inside, 'path', { fill: 'none', stroke: COLOURS.ink, 'stroke-width': 1.6 })
    const lips = el(g, 'path', { fill: 'none', stroke: COLOURS.ink, 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })
    return (s) => {
      setEllipse(patch, s.patch)
      s.eyes.forEach((e, i) => {
        const v = eyes[i]
        v.open.setAttribute('cx', fmt(e.at[0]))
        v.open.setAttribute('cy', fmt(e.at[1]))
        v.open.setAttribute('ry', fmt(e.ry))
        v.open.setAttribute('opacity', fmt(e.open))
        v.shut.setAttribute('d', e.shut)
        v.shut.setAttribute('opacity', fmt(e.shutShow))
        v.brow.setAttribute('d', e.brow)
        v.brow.setAttribute('opacity', fmt(e.browShow))
      })
      nose.setAttribute('d', s.nose)
      for (const p of [mouthClip, mouthShape, lips]) p.setAttribute('d', s.mouth.d)
      const t = s.mouth.teeth
      teethBand.setAttribute('d', t.band)
      teethLines.setAttribute('d', t.lines)
      for (const node of [teethBand, teethLines]) node.setAttribute('opacity', fmt(t.show))
      setEllipse(tongue, s.mouth.tongue)
    }
  }

  /** Make a Reksio inside an SVG group; returns draw(pose). */
  function mount(parent) {
    const id = `fig${++mounted}`
    const clips = { body: `${id}-body`, head: `${id}-head`, mouth: `${id}-mouth` }
    const root = el(parent, 'g', { class: 'figure' })
    const farLeg = tube(root, LEG)
    const farArm = tube(root, ARM)
    const tail = tube(root, TAIL)
    const body = merged(root, COLOURS.white, clips.body)
    const bodyPatch = el(root, 'ellipse', { fill: COLOURS.ochre, 'clip-path': `url(#${clips.body})` })
    const nearLeg = tube(root, LEG)
    const headG = el(root, 'g')
    const farEar = tube(headG, EAR)
    const nearEar = tube(headG, EAR, COLOURS.ochre)
    const skull = merged(headG, COLOURS.white, clips.head)
    const face = mountFace(headG, clips)
    const nearArm = tube(root, ARM)
    return function draw(pose) {
      const s = shape(pose)
      farLeg(s.farLeg)
      farArm(s.farArm)
      tail(s.tail)
      body(s.body)
      setEllipse(bodyPatch, s.bodyPatch)
      nearLeg(s.nearLeg)
      headG.setAttribute('transform', s.head.transform)
      nearEar(s.head.ears[0])
      farEar(s.head.ears[1])
      skull(s.head.skull)
      face(s.head)
      nearArm(s.nearArm)
    }
  }

  return { POSES, mix, vary, shape, mount, capsule }
})()
