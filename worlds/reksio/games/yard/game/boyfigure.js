// Reksio's boy drawn from a pose, the way the films draw him (world.yaml,
// characters[boy]; Kompan 1976, 2:42-7:24): a big cloud of pale blond curls,
// nearly half his height, over a small round face with dot eyes and a little
// bump of a nose; a white T-shirt, red-orange shorts, white knee socks and
// black shoes; thin arms and legs drawn as plain tubes. In winter (our
// reading: no frames of him in the snow are public) a knitted red cap over
// the curls, a scarf, a blue coat, trousers, boots and red mittens.
//
// A pose is plain numbers, as Reksio's is (figure.js): where his hips, chest,
// head, elbows, hands, knees and ankles are (facing right, feet on y = 0),
// how far his head is turned (0 to the child, 1 side-on), and what his face
// is doing. So any two poses blend (Figure.mix), and shape() is pure: the
// same pose always gives the same drawing. mount() makes the SVG once; its
// draw(pose) only sets attributes.

// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* global Figure */
/* exported BoyFigure */
const BoyFigure = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const LINE = 2.5 // the ink line, thin and one weight all over, as Reksio's (figure.js)
  const COLOURS = {
    ink: '#1d1914',
    skin: '#f1b98f', // a warm peach (Kompan 2:54, 4:00)
    hair: '#efd99b', // pale straw, lighter than Reksio's patch (Kompan 2:54)
    white: '#f6f8f6',
    shorts: '#e0602d', // red-orange (Kompan 4:00)
    shoe: '#22201c', // near black (Kompan 4:00; brownish at 2:42)
    mouth: '#7a2a22',
    // winter, our reading
    coat: '#4c7aa8', // the blue of his pyjamas (Kompan 7:24)
    trousers: '#5d5866',
    wool: '#c8402a', // cap, scarf and mittens: one knitted red
    rib: '#a3301e', // the cap's turned-up band
    pom: '#f6f1e4',
  }
  const LIMB = 7.5 // arms and legs: thin tubes, inside their outline (Kompan 4:00)
  const SLEEVE = 17 // the T-shirt's short sleeve, wider than the arm
  const SLEEVE_LONG = 15 // how far down the arm it reaches
  const COAT_ARM = 13 // a coat's sleeve, to the wrist
  const SHOULDER = 22 // half his shoulders, front-on
  const HEM = 25 // half the shirt at its hem: a little wider than the shoulders
  const SHORTS = 23 // half the shorts' width at the waist
  const SHORTS_LEG = 19 // each leg of them: wide, so they flare (Kompan 4:00)…
  const SHORTS_LONG = 16 // …and this far down the thigh, cut straight
  const HAND = 6.5 // a small round hand…
  const MITTEN = 8 // …a little bigger in a mitten
  const THUMB = 3.6
  // The face, in its own units about its centre: a round face a little taller
  // than wide, its features low under the fringe (Kompan 2:54, 4:00).
  const FACE_R = [38, 40]
  const EYE = { rx: 3.5, ry: 5.4, y: 1, apart: 0.42 } // dots, a little taller than wide; `apart` is radians round the head from its middle
  const TURNS = 1.15 // radians his face turns round the head going from front-on (0) to side-on (1)
  const FAR_EYE_GONE = 0.86 // past this share of the radius across, the far eye is behind the nose (Kompan 3:12, 4:00: side-on, one eye)
  const NOSE = { y: 8, out: 9, w: 6 } // a small bump on the profile, just under the eyes; none front-on (Kompan 2:54)
  const MOUTH = { y: 21, w: 9 }
  const EAR = { y: 4, rx: 7, ry: 10 } // a C with a curl inside, at the back of his cheek (Kompan 3:12)

  // ------------------------------------------------------------ his hair

  // The curls: overlapping circles drawn ink first and fill over, so they
  // read as one cloud with a scalloped edge, as the films' (Kompan 2:54). Each
  // is [x, y, r] in the face's units, front-on and side-on; a turn mixes the
  // two, the cloud moving behind his face as he turns. The fringe is drawn
  // over his face (its scallops along his brow), the rest behind it.
  const CROWN = [
    // front-on                 side-on
    [[0, -78, 40], [-12, -80, 40]],
    [[-40, -66, 31], [-50, -64, 32]],
    [[40, -66, 31], [24, -74, 30]],
    [[-60, -38, 24], [-68, -34, 24]],
    [[60, -38, 24], [42, -46, 20]],
    [[-48, -10, 21], [-52, -8, 24]],
    [[50, -8, 18], [-34, -20, 22]],
    [[-22, -102, 24], [-32, -100, 24]],
    [[20, -102, 24], [6, -104, 24]],
    // down the back of his head to the nape, behind the ear, and beside his
    // cheeks front-on: the curls hold his face, never a wig sat on top (Adam,
    // 2026-10-26; Kompan 3:12, 4:00)
    [[-44, 16, 13], [-44, 20, 18]],
    [[44, 16, 13], [-28, 32, 13]],
  ]
  const UNDER_CAP = [1, 2, 7, 8] // the upper curls, pressed flat under a winter cap: no puffs sticking out above his ears (Adam, 2026-10-27)
  const COVER_ABOVE = -60 // the curls higher than this are drawn again over the fringe's top, so it joins the cloud
  const FRINGE = [
    [[-28, -33, 16], [-4, -33, 16]],
    [[-8, -31, 15], [14, -32, 15]],
    [[12, -31, 15], [28, -34, 14]],
    [[30, -32, 16], [38, -34, 14]],
  ]
  // short curls drawn inside the cloud, as the films' inner strokes (Kompan 2:54, 7:24)
  const CURLS = [
    [[-30, -58], [-40, -56]],
    [[18, -74], [2, -74]],
    [[-50, -26], [-56, -22]],
  ]
  const CAP = { band: -60, top: -128, half: 62, pom: 9 } // the winter cap, a knitted beanie low over the crown; the curls spill out below its band
  const CAP_LOW = 8 // worn this far down over his curls, pressing them in

  // ------------------------------------------------------------ poses

  const STAND = {
    hip: [0, -112],
    chest: [3, -182],
    head: [8, -234],
    turn: 0.6,
    tilt: 0,
    arms: { near: [[-12, -148], [-11, -112]], far: [[22, -148], [24, -113]] },
    legs: { near: [[-6, -56], [-7, -12]], far: [[10, -56], [11, -12]] },
    feet: { near: 0, far: 0 }, // shoe angles, degrees: toes up (-) or down (+)
    face: { blink: 0, smile: 0.5, open: 0, o: 0, brows: 0, joy: 0, look: 0 }, // o: a round open mouth, surprised
    scarf: 0, // the scarf's end swinging back (+) or forward (-), winter
  }
  const vary = Figure.vary
  const POSES = {
    stand: STAND,
    // talking to the child, front-on
    front: vary(STAND, { turn: 0.08, head: [3, -234], chest: [1, -182], arms: { near: [[-24, -146], [-27, -110]], far: [[26, -146], [29, -110]] }, legs: { near: [[-12, -56], [-14, -12]], far: [[12, -56], [14, -12]] } }),
    // down on his heels, knees up (to pat Reksio, pick something up)
    crouch: vary(STAND, {
      hip: [-16, -44], chest: [8, -114], head: [22, -164],
      arms: { near: [[22, -90], [50, -62]], far: [[38, -90], [62, -60]] },
      legs: { near: [[34, -62], [14, -12]], far: [[44, -58], [28, -12]] },
      feet: { near: 0, far: 0 },
    }),
    // bent over, both hands low and forward: pushing a snowball along
    push: vary(STAND, {
      hip: [-18, -106], chest: [26, -160], head: [46, -198], turn: 0.75,
      arms: { near: [[38, -130], [62, -108]], far: [[52, -132], [72, -112]] },
      legs: { near: [[-30, -58], [-46, -12]], far: [[0, -58], [8, -12]] },
      feet: { near: 12, far: 0 },
    }),
    // both arms forward at his chest, holding something heavy up: a snowball onto another
    lift: vary(STAND, {
      chest: [-4, -184], head: [-2, -236], turn: 0.7, tilt: -4,
      arms: { near: [[18, -156], [44, -178]], far: [[38, -158], [62, -182]] },
      face: { smile: 0, brows: 0.3, open: 0.2 },
    }),
    // both arms up and forward, heaving something up high: a snowman's head onto it
    heave: vary(STAND, {
      chest: [-4, -184], head: [-6, -234], turn: 0.7, tilt: -8,
      arms: { near: [[10, -206], [40, -236]], far: [[30, -208], [60, -240]] },
      face: { smile: 0.2, brows: 0.4, open: 0.3 },
    }),
    // calling a dog: leaning to him, patting his knees, "come here!" (the pat is the gesture's)
    call: vary(STAND, {
      turn: 0.5, hip: [-4, -110], chest: [12, -176], head: [24, -224], tilt: 6,
      arms: { near: [[-2, -140], [10, -96]], far: [[30, -140], [36, -96]] },
      face: { open: 0.8, smile: 0.7, brows: 0.5 },
    }),
    // one arm up, waving (the hand's side to side is the gesture's)
    wave: vary(STAND, { turn: 0.3, arms: { near: [[-34, -192], [-38, -238]] }, face: { smile: 1, open: 0.3 } }),
    // pointing far ahead, the arm straight
    point: vary(STAND, { turn: 0.85, arms: { far: [[40, -168], [74, -170]] }, face: { open: 0.25 } }),
    // a finger on his own nose: "a nose!" (side-on, so it shows)
    nose: vary(STAND, { turn: 0.85, arms: { far: [[30, -190], [50, -228]] }, face: { open: 0.35, brows: 0.4 } }),
    // puzzled: scratching in his curls
    scratch: vary(STAND, { turn: 0.5, tilt: 8, arms: { near: [[-26, -196], [-10, -262]] }, face: { smile: -0.2, brows: 0.8 } }),
    // both arms up, glad
    cheer: vary(STAND, {
      turn: 0.25, head: [6, -238], tilt: -4,
      arms: { near: [[-30, -196], [-40, -238]], far: [[38, -196], [48, -238]] },
      face: { smile: 1, open: 0.7, joy: 1 },
    }),
    // laughing: head back, eyes shut in a smile
    laugh: vary(STAND, { head: [4, -236], tilt: -12, arms: { near: [[-14, -148], [-6, -118]], far: [[26, -150], [24, -122]] }, face: { smile: 1, open: 0.8, joy: 1 } }),
    // reaching ahead with the near hand at chest height (putting a stone in a snowman's face)
    reach: vary(STAND, { turn: 0.85, chest: [8, -182], head: [14, -232], arms: { near: [[18, -160], [52, -170]] } }),
    // winding up to throw: leaning back, the far hand up behind his head
    windup: vary(STAND, { turn: 0.85, chest: [-6, -180], head: [-4, -232], tilt: -6, arms: { far: [[-8, -184], [-30, -214]], near: [[14, -156], [36, -160]] }, face: { smile: 0.3, brows: 0.3, open: 0.2 } }),
    // the throw: leaning in, the far arm swung forward and up, let go
    throw: vary(STAND, { turn: 0.85, chest: [10, -180], head: [16, -230], tilt: 4, arms: { far: [[36, -176], [66, -196]], near: [[-12, -150], [-22, -118]] }, face: { smile: 0.6, open: 0.5 } }),
  }

  // ------------------------------------------------------------ points

  const add = (a, b) => [a[0] + b[0], a[1] + b[1]]
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
  const mul = (a, k) => [a[0] * k, a[1] * k]
  const len = (a) => Math.hypot(a[0], a[1])
  const unit = (a) => (len(a) > 1e-6 ? mul(a, 1 / len(a)) : [0, 1])
  const fmt = (n) => Math.round(n * 10) / 10
  const pt = (p) => `${fmt(p[0])} ${fmt(p[1])}`

  /** A point in the face's own units, turned and tilted with his head, in his units. */
  function onHead(p, local) {
    const a = (p.tilt * Math.PI) / 180
    const [x, y] = local
    return add(p.head, [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)])
  }

  /** How far across the face (−1 to 1 of its radius) a point `a` radians round from the middle shows at this turn. */
  const across = (turn, a) => Math.sin(a + turn * TURNS)

  /** The torso's frame: down its middle (u) and across it (n). */
  function frame(p) {
    const u = unit(sub(p.hip, p.chest))
    return { u, n: [u[1], -u[0]] }
  }

  // ------------------------------------------------------------ shape

  /** His face's outline: round, with the profile (brow, nose, chin) coming
   * onto its front edge as he turns side-on. */
  function faceOutline(p) {
    const [rx, ry] = FACE_R
    const side = p.turn
    const pts = []
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2
      let x = rx * Math.cos(a)
      const y = ry * Math.sin(a)
      if (x > 0) {
        const front = (x / rx) ** 2 * side
        x += front * (NOSE.out * Math.exp(-(((y - NOSE.y) / NOSE.w) ** 2)) - 3 * Math.exp(-(((y - 30) / 8) ** 2)))
      }
      pts.push(onHead(p, [x, y]))
    }
    return `M${pts.map(pt).join(' L')} Z`
  }

  function eyes(p) {
    const out = []
    for (const a of [-EYE.apart, EYE.apart]) {
      const s = across(p.turn, a)
      const shown = s < FAR_EYE_GONE ? 1 : 0
      const c = onHead(p, [FACE_R[0] * s * 0.92 + p.face.look * 3, EYE.y])
      const shut = Math.max(p.face.blink, p.face.joy)
      out.push({ c, rx: EYE.rx, ry: Math.max(0.6, EYE.ry * (1 - shut)), shown, joy: p.face.joy })
    }
    return out
  }

  /** A brow over each eye: a thin arc, its inner end up when worried, down when cross. */
  function brows(p, es) {
    return es.map((e, i) => {
      const inner = i === 0 ? 1 : -1 // which way is towards his nose, front-on
      const lift = 3 * Math.max(0, p.face.brows)
      const tip = 4 * p.face.brows * inner
      const [x, y] = e.c
      return { d: `M${pt([x - 6, y - 8 - lift + (inner < 0 ? tip : 0)])} Q${pt([x, y - 11 - lift])} ${pt([x + 6, y - 8 - lift + (inner > 0 ? -tip : 0)])}`, shown: e.shown }
    })
  }

  function mouth(p) {
    const s = across(p.turn, 0)
    const w = MOUTH.w * (1 - 0.4 * p.turn) * (1 - 0.45 * p.face.o)
    const [x, y] = onHead(p, [FACE_R[0] * s * 0.86 - MOUTH.w * 0.7 * p.turn, MOUTH.y]) // side-on, kept inside his cheek
    const curve = 5.5 * p.face.smile * (1 - p.face.o)
    const line = `M${pt([x - w, y - curve * 0.4])} Q${pt([x, y + curve])} ${pt([x + w, y - curve * 0.4])}`
    const o = p.face.open
    let open = ''
    if (p.face.o > 0.3) open = `M${pt([x - w, y + 2])} a${fmt(w)} ${fmt(4 + 6 * o)} 0 1 0 ${fmt(2 * w)} 0 a${fmt(w)} ${fmt(4 + 6 * o)} 0 1 0 ${fmt(-2 * w)} 0 Z` // "oh!"
    else if (o > 0.05) open = `M${pt([x - w - 1, y - 1 - curve * 0.4])} Q${pt([x, y + curve * 0.5])} ${pt([x + w + 1, y - 1 - curve * 0.4])} Q${pt([x, y + 5 + 11 * o])} ${pt([x - w - 1, y - 1 - curve * 0.4])} Z`
    return { line: p.face.o > 0.3 ? '' : line, open }
  }

  function ear(p) {
    const s = -Math.cos(p.turn * TURNS) * 0.95 // on his cheek's back edge, coming round to the middle of his head side-on
    const c = onHead(p, [FACE_R[0] * s, EAR.y])
    const shown = p.turn > 0.22 ? 1 : 0 // front-on it is behind his curls
    return { c, shown, curl: `M${pt(add(c, [2, -4]))} Q${pt(add(c, [-3, -3]))} ${pt(add(c, [-2, 1]))} Q${pt(add(c, [0, 4]))} ${pt(add(c, [2, 2]))}` }
  }

  function curls(set, p) {
    return set.map(([front, side]) => {
      const [x, y, r] = Figure.mix(front, side, p.turn)
      return [...onHead(p, [x, y]), r]
    })
  }

  /** Where each part of him goes, in his own units, for a pose. Pure. */
  function shape(p) {
    const { u, n } = frame(p)
    const wide = 1 - 0.35 * p.turn // his shoulders and hips narrow as he turns side-on
    const shoulder = (side) => add(add(p.chest, mul(n, side * SHOULDER * 0.72 * wide)), mul(u, 7))
    const hipJoint = (side) => add(add(p.hip, mul(n, side * 10 * wide)), mul(u, 10))
    const hemAt = add(p.hip, mul(u, -12))
    const torso = [
      add(p.chest, mul(n, -SHOULDER * wide)),
      add(p.chest, mul(n, SHOULDER * wide)),
      add(hemAt, mul(n, HEM * wide)),
      add(hemAt, mul(n, -HEM * wide)),
    ]
    const coatHem = add(p.hip, mul(u, 24))
    const coat = [torso[0], torso[1], add(coatHem, mul(n, (HEM + 4) * wide)), add(coatHem, mul(n, -(HEM + 4) * wide))]
    const waist = add(p.hip, mul(u, -16))
    const seat = add(p.hip, mul(u, 10))
    const shorts = [
      add(waist, mul(n, -SHORTS * wide)), add(waist, mul(n, SHORTS * wide)),
      add(seat, mul(n, (SHORTS - 4) * wide)), add(seat, mul(n, -(SHORTS - 4) * wide)),
    ]
    // the near side is the one towards the child: on the left as he faces right
    const arm = (which, side) => [shoulder(side), ...p.arms[which]]
    const leg = (which, side) => [hipJoint(side), ...p.legs[which]]
    const chin = onHead(p, [0, FACE_R[1] - 4])
    const es = eyes(p)
    return {
      torso, coat, shorts, neck: [p.chest, chin],
      arms: { near: arm('near', -1), far: arm('far', 1) },
      legs: { near: leg('near', -1), far: leg('far', 1) },
      feet: p.feet,
      face: faceOutline(p), eyes: es, brows: brows(p, es), mouth: mouth(p), ear: ear(p),
      crown: curls(CROWN, p), fringe: curls(FRINGE, p),
      curls: CURLS.map(([front, side]) => onHead(p, Figure.mix(front, side, p.turn))),
      cap: { at: onHead(p, [-12 * p.turn, CAP_LOW]), tilt: p.tilt },
      scarf: p.scarf, u, n,
    }
  }

  // ------------------------------------------------------------ drawing

  const cache = new WeakMap()
  /** Set an attribute only when it changed: most of him is still most frames. */
  function set(node, k, v) {
    let seen = cache.get(node)
    if (!seen) cache.set(node, (seen = {}))
    if (seen[k] === v) return
    seen[k] = v
    node.setAttribute(k, v)
  }
  function el(parent, tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
    parent.appendChild(node)
    return node
  }
  const stroked = (colour, w) => ({ fill: 'none', stroke: colour, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  const inked = (fill) => ({ fill, stroke: COLOURS.ink, 'stroke-width': LINE, 'stroke-linejoin': 'round' })
  const poly = (pts) => `M${pts.map(pt).join(' L')} Z`
  const line = (pts) => `M${pts.map(pt).join(' L')}`
  const showing = (node, show) => set(node, 'display', show ? 'inline' : 'none')

  /** An arm: a short sleeve (or a coat's to the wrist), the arm, and a hand (or a mitten) with its thumb. */
  function armOf(parent) {
    const g = el(parent, 'g')
    const ink = el(g, 'path', stroked(COLOURS.ink, LIMB + 2 * LINE))
    const skin = el(g, 'path', stroked(COLOURS.skin, LIMB))
    const sleeveInk = el(g, 'path', { ...stroked(COLOURS.ink, SLEEVE + 2 * LINE), 'stroke-linecap': 'butt' })
    const sleeve = el(g, 'path', { ...stroked(COLOURS.white, SLEEVE), 'stroke-linecap': 'butt' })
    const thumb = el(g, 'circle', inked(COLOURS.skin))
    const hand = el(g, 'circle', inked(COLOURS.skin))
    return {
      draw([s, e, h], winter) {
        set(ink, 'd', line([s, e, h]))
        set(skin, 'd', line([s, e, h]))
        const along = unit(sub(e, s))
        const cuff = winter ? null : add(s, mul(along, Math.min(SLEEVE_LONG, len(sub(e, s)))))
        const top = add(s, mul(along, -6)) // from inside the shirt, so its seam doesn't show
        set(sleeveInk, 'd', winter ? line([top, e, h]) : line([top, cuff]))
        set(sleeve, 'd', winter ? line([top, e, h]) : line([top, cuff]))
        set(sleeveInk, 'stroke-width', (winter ? COAT_ARM : SLEEVE) + 2 * LINE)
        set(sleeve, 'stroke-width', winter ? COAT_ARM : SLEEVE)
        const r = winter ? MITTEN : HAND
        const fwd = unit(sub(h, e))
        set(hand, 'cx', fmt(h[0] + fwd[0] * 3))
        set(hand, 'cy', fmt(h[1] + fwd[1] * 3))
        set(hand, 'r', r)
        const t = add(h, add(mul(fwd, 2), mul([fwd[1], -fwd[0]], r * 0.8)))
        set(thumb, 'cx', fmt(t[0]))
        set(thumb, 'cy', fmt(t[1]))
        set(thumb, 'r', THUMB)
      },
      dress(winter) {
        set(sleeve, 'stroke', winter ? COLOURS.coat : COLOURS.white)
        for (const n of [hand, thumb]) set(n, 'fill', winter ? COLOURS.wool : COLOURS.skin)
      },
    }
  }

  /** A leg: a bare thigh (or a trouser leg), a white sock to below the knee, and a shoe (or a boot). */
  function legOf(parent) {
    const g = el(parent, 'g')
    const ink = el(g, 'path', stroked(COLOURS.ink, LIMB + 2 * LINE))
    const thigh = el(g, 'path', stroked(COLOURS.skin, LIMB))
    const sock = el(g, 'path', stroked(COLOURS.white, LIMB))
    const shoe = el(g, 'path', inked(COLOURS.shoe))
    const legInk = el(g, 'path', { ...stroked(COLOURS.ink, SHORTS_LEG + 2 * LINE), 'stroke-linecap': 'butt' })
    const leg = el(g, 'path', { ...stroked(COLOURS.shorts, SHORTS_LEG), 'stroke-linecap': 'butt' })
    return {
      draw([h, k, a], angle, winter) {
        set(ink, 'd', line([h, k, a]))
        set(thigh, 'd', line([h, k]))
        const along = unit(sub(k, h))
        const hem = line([add(h, mul(along, -8)), add(h, mul(along, SHORTS_LONG))]) // the shorts' leg, following the thigh
        set(legInk, 'd', hem)
        set(leg, 'd', hem)
        set(sock, 'd', line([add(k, mul(unit(sub(a, k)), winter ? 0 : 6)), a]))
        // the shoe: a rounded toe forward of the ankle; a boot climbs higher
        const top = winter ? 14 : 6
        set(shoe, 'd', `M-7 ${-top} H4 Q6 -6 12 -6 Q20 -5 20 2 Q20 7 13 7 H-8 Q-11 7 -11 0 Z`)
        set(shoe, 'transform', `translate(${pt(a)}) rotate(${fmt(angle)})`)
      },
      dress(winter) {
        set(thigh, 'stroke', winter ? COLOURS.trousers : COLOURS.skin)
        set(sock, 'stroke', winter ? COLOURS.trousers : COLOURS.white)
        set(leg, 'stroke', winter ? COLOURS.trousers : COLOURS.shorts)
      },
    }
  }

  /** The cloud of curls: every circle in ink a line wider, then every fill over them. */
  function cloudOf(parent, count) {
    const g = el(parent, 'g')
    const inks = Array.from({ length: count }, () => el(g, 'circle', { fill: COLOURS.ink }))
    const fills = Array.from({ length: count }, () => el(g, 'circle', { fill: COLOURS.hair }))
    return (circles, hidden = null) => circles.forEach(([x, y, r], i) => {
      for (const [node, rr] of [[inks[i], r + LINE], [fills[i], r]]) {
        showing(node, !hidden?.includes(i))
        set(node, 'cx', fmt(x))
        set(node, 'cy', fmt(y))
        set(node, 'r', fmt(rr))
      }
    })
  }

  /** The winter coat over his shirt, with its buttons. */
  function coatOf(parent) {
    const coat = el(parent, 'path', inked(COLOURS.coat))
    const buttons = el(parent, 'path', stroked(COLOURS.ink, 3.4))
    return {
      nodes: [coat, buttons],
      draw(s, turn) {
        set(coat, 'd', poly(s.coat))
        const mid = mul(add(s.coat[0], s.coat[1]), 0.5)
        set(buttons, 'd', [24, 46, 68].map((k) => `M${pt(add(add(mid, mul(s.u, k)), mul(s.n, 4 * (1 - turn))))} l0.1 0`).join(' '))
      },
    }
  }

  /** The scarf: a band round his neck and an end that swings as he walks. */
  function scarfOf(parent) {
    const g = el(parent, 'g')
    const end = el(g, 'path', inked(COLOURS.wool))
    const band = el(g, 'path', inked(COLOURS.wool))
    return {
      nodes: [g],
      draw(s, scarf) {
        const [c, chin] = s.neck
        const b = add(c, mul(sub(chin, c), 0.25))
        set(band, 'd', `M${pt(add(b, [-15, -5]))} Q${pt(add(b, [0, 6]))} ${pt(add(b, [15, -5]))} L${pt(add(b, [14, 4]))} Q${pt(add(b, [0, 14]))} ${pt(add(b, [-14, 4]))} Z`)
        const swing = scarf * 14
        const tip = add(b, [-8 - swing, 44])
        set(end, 'd', `M${pt(add(b, [-12, 2]))} Q${pt(add(b, [-14 - swing * 0.4, 22]))} ${pt(add(tip, [-6, 0]))} L${pt(add(tip, [6, 2]))} Q${pt(add(b, [-2 - swing * 0.4, 22]))} ${pt(add(b, [-2, 4]))} Z`)
      },
    }
  }

  /** His face: its outline, the ear, eyes (shut in a smile when he laughs), brows and mouth. */
  function faceOf(parent) {
    const face = el(parent, 'path', inked(COLOURS.skin))
    const earG = el(parent, 'g') // over his cheek's edge
    const earShape = el(earG, 'ellipse', { ...inked(COLOURS.skin), rx: EAR.rx, ry: EAR.ry })
    const earCurl = el(earG, 'path', stroked(COLOURS.ink, 1.6))
    const eyeNodes = [0, 1].map(() => el(parent, 'ellipse', { fill: COLOURS.ink, rx: EYE.rx }))
    const gladNodes = [0, 1].map(() => el(parent, 'path', stroked(COLOURS.ink, 2.2))) // laughing: shut eyes curving up
    const browNodes = [0, 1].map(() => el(parent, 'path', stroked(COLOURS.ink, 2)))
    const mouthOpen = el(parent, 'path', inked(COLOURS.mouth))
    const mouthLine = el(parent, 'path', stroked(COLOURS.ink, 2))
    const shownAs = (node, d) => {
      showing(node, !!d)
      if (d) set(node, 'd', d)
    }
    return (s) => {
      set(face, 'd', s.face)
      showing(earG, s.ear.shown > 0)
      set(earShape, 'cx', fmt(s.ear.c[0]))
      set(earShape, 'cy', fmt(s.ear.c[1]))
      set(earCurl, 'd', s.ear.curl)
      s.eyes.forEach((e, i) => {
        const glad = e.joy > 0.5 && e.shown
        shownAs(gladNodes[i], glad && `M${pt([e.c[0] - 4.5, e.c[1] + 1.5])} Q${pt([e.c[0], e.c[1] - 5])} ${pt([e.c[0] + 4.5, e.c[1] + 1.5])}`)
        showing(eyeNodes[i], !glad && e.shown > 0)
        set(eyeNodes[i], 'cx', fmt(e.c[0]))
        set(eyeNodes[i], 'cy', fmt(e.c[1]))
        set(eyeNodes[i], 'ry', fmt(e.ry))
      })
      s.brows.forEach((b, i) => shownAs(browNodes[i], b.shown && b.d))
      shownAs(mouthLine, s.mouth.line)
      shownAs(mouthOpen, s.mouth.open)
    }
  }

  /** The knitted cap: a dome, a ribbed band turned up, a pompom. */
  function capOf(parent) {
    const cap = el(parent, 'g')
    el(cap, 'path', { ...inked(COLOURS.wool), d: `M${-CAP.half} ${CAP.band} C${-CAP.half} -112 -26 ${CAP.top + 6} 0 ${CAP.top + 6} C26 ${CAP.top + 6} ${CAP.half} -112 ${CAP.half} ${CAP.band} Z` })
    el(cap, 'path', { ...inked(COLOURS.rib), d: `M${-CAP.half - 3} ${CAP.band - 12} Q0 ${CAP.band - 20} ${CAP.half + 3} ${CAP.band - 12} L${CAP.half + 1} ${CAP.band + 2} Q0 ${CAP.band - 6} ${-CAP.half - 1} ${CAP.band + 2} Z` })
    el(cap, 'path', { ...stroked(COLOURS.ink, 1.2), d: [-36, -18, 0, 18, 36].map((x) => `M${x} ${CAP.band - 15 + Math.abs(x) * 0.09} v12`).join(' ') })
    el(cap, 'circle', { ...inked(COLOURS.pom), cx: 0, cy: CAP.top, r: CAP.pom })
    return cap
  }

  /** Make his SVG in `parent` (a <g>), dressed for summer or winter;
   * returns { draw(pose), dress(winter), capOff(off) }. */
  function mount(parent, { winter = false } = {}) {
    const farArm = armOf(parent)
    const farLeg = legOf(parent)
    const nearLeg = legOf(parent)
    const shorts = el(parent, 'path', inked(COLOURS.shorts))
    const shirt = el(parent, 'path', inked(COLOURS.white))
    const coat = coatOf(parent)
    const neck = el(parent, 'path', stroked(COLOURS.skin, 10))
    const scarf = scarfOf(parent)
    const crown = cloudOf(parent, CROWN.length)
    const face = faceOf(parent)
    const fringe = cloudOf(parent, FRINGE.length)
    const cover = el(parent, 'g') // the upper curls' fill again, over the fringe's top: one cloud, scalloped only along his brow
    const covers = CROWN.map(([front]) => front[1] < COVER_ABOVE && el(cover, 'circle', { fill: COLOURS.hair }))
    const curlNodes = CURLS.map(() => el(parent, 'path', stroked(COLOURS.ink, 1.6)))
    const cap = capOf(parent)
    const nearArm = armOf(parent)

    let dressed = null
    let capped = true // a winter cap on (it may be given away: the snowman)
    function dress(w) {
      if (dressed === w) return
      dressed = w
      for (const part of [farArm, nearArm, farLeg, nearLeg]) part.dress(w)
      for (const node of [...coat.nodes, ...scarf.nodes]) showing(node, w)
      showing(cap, w && capped)
      showing(shirt, !w)
      showing(shorts, !w)
    }
    dress(winter)

    function draw(pose) {
      const s = shape(pose)
      const w = dressed
      const flat = w && capped ? UNDER_CAP : [] // the curls flattened under his cap
      farArm.draw(s.arms.far, w)
      nearArm.draw(s.arms.near, w)
      farLeg.draw(s.legs.far, s.feet.far, w)
      nearLeg.draw(s.legs.near, s.feet.near, w)
      set(shorts, 'd', poly(s.shorts))
      set(shirt, 'd', poly(s.torso))
      if (w) {
        coat.draw(s, pose.turn)
        scarf.draw(s, pose.scarf)
        set(cap, 'transform', `translate(${pt(s.cap.at)}) rotate(${fmt(s.cap.tilt)})`)
      }
      set(neck, 'd', line(s.neck))
      crown(s.crown, flat)
      face(s)
      fringe(s.fringe)
      s.crown.forEach(([x, y, r], i) => {
        if (!covers[i]) return
        showing(covers[i], !flat.includes(i))
        set(covers[i], 'cx', fmt(x))
        set(covers[i], 'cy', fmt(y))
        set(covers[i], 'r', fmt(r))
      })
      s.curls.forEach(([x, y], i) => set(curlNodes[i], 'd', `M${pt([x + 6, y - 5])} Q${pt([x - 6, y - 7])} ${pt([x - 5, y + 2])} Q${pt([x - 2, y + 7])} ${pt([x + 4, y + 4])}`))
    }

    /** His cap off (true) or on: his curls spring up without it. */
    function capOff(off) {
      capped = !off
      showing(cap, dressed && capped)
    }

    return { draw, dress, capOff, get winter() { return dressed } }
  }

  /** Where his hand is, in his own units: for something he holds. */
  const handAt = (pose, which = 'near') => pose.arms[which][1]

  return {
    POSES, shape, mount, handAt,
    /** His winter cap on its own, in `parent` (a <g>): given away, it looks as it did on him. */
    cap: capOf,
  }
})()
