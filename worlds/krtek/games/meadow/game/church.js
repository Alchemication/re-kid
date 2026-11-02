// The village church far off on a hill behind the meadow, and its bell: the
// meadow's sign that the day goes on, as the cuckoo clock is the yard's
// (Adam, 2026-10-25: a church you can see, its bell you can see and hear).
// Invented: a white country church with a red roof and an open belfry, as
// Czech villages have; not from the films.
//
// An old clock on the tower tells the play's own hour (asked for by a
// small player, 2026-11-02): a cream face gone yellow with age in a
// carved frame, its hands moving with the day, so the hour the bell rings
// is the hour it shows.
//
// On each hour from 09:00 the bell swings and rings twice, ding… dong, rings
// spreading from the belfry; at sunset (19:00) it rings longer, the evening
// bell, before the cricket comes out. The meadow hears each hour (onHour)
// and has the mole look up at it.
//
// It stands so far off that it barely moves as he walks (View: a tenth of
// the ground's pace), so it is in sight wherever he is, high enough to show
// over most of the trees. Its bell moves only with Motion.endAt on the Clock,
// and comes back to hang still.

/* global Clock, Debug, Motion, Sound, World */
/* exported Church */
const Church = (() => {
  const SVG = 'http://www.w3.org/2000/svg'
  const INK = '#5f5a55' // far off: a fainter line than the meadow's
  const X = 560 // where it stands, in the distant layer's own units (View: DISTANT_SPEED)
  const BELL = { x: X - 22, y: 272 } // the bell's pivot, at the top of the belfry
  const FIRST = 9 // the first hour it rings (he wakes at 8)
  const EVENING = 19 // sunset: the evening bell, rung longer
  const STROKES = 2 // each hour: ding… dong
  const EVENING_STROKES = 6
  const STROKE_MS = 1100 // one swing, there and back: a big bell's slow beat
  const SWING_DEG = 26
  const RING_MS = 1300 // a ring of sound spreading from the belfry
  const CLOCK = { x: X - 22, y: 322, r: 12 } // on the tower, under the belfry
  const CLOCK_STEP = 5 / 60 // its hands move in steps of this much of an hour: far off, finer can't be seen
  const TOP = 382 // the hill's level top, where the church stands

  let layer = null
  let bell = null
  let rang = FIRST - 1 // the last hour rung
  let heard = () => {}
  let hands = null // { hour, minute }
  let shown = null // the time the hands show

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const line = { stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round' }

  /** The hill, its top levelled where the church stands, and the church on it. */
  function draw() {
    el('path', { class: 'hill', d: `M${X - 440} 660 C${X - 300} 520 ${X - 190} ${TOP + 2} ${X - 80} ${TOP} L${X + 150} ${TOP} C${X + 260} ${TOP + 2} ${X + 340} 520 ${X + 470} 660 Z`, fill: '#a7c4ad', opacity: 0.9 }, layer)
    const g = el('g', { class: 'church', opacity: 0.92 }, layer) // a touch of the haze between
    // its ground: a churchyard's grass round its foot, a path from the door down the hill, bushes at its corners
    el('path', { d: `M${X - 78} ${TOP + 1} Q${X + 36} ${TOP + 12} ${X + 148} ${TOP + 1} L${X + 140} ${TOP - 1} L${X - 70} ${TOP - 1} Z`, fill: '#93b39a' }, g)
    el('path', { d: `M${X + 22} ${TOP} C${X + 24} ${TOP + 30} ${X + 70} ${TOP + 50} ${X + 67} ${TOP + 96} L${X + 70} ${TOP + 96} C${X + 82} ${TOP + 48} ${X + 36} ${TOP + 28} ${X + 34} ${TOP} Z`, fill: '#d9cfae', opacity: 0.8 }, g)
    for (const [bx, r] of [[X - 62, 13], [X - 48, 9], [X + 128, 12], [X + 140, 8]]) el('circle', { cx: bx, cy: TOP - r * 0.55, r, fill: '#6f9372', stroke: INK, 'stroke-width': 1.5 }, g)
    // the nave, its roof, a round window, a door
    el('rect', { x: X - 4, y: 330, width: 120, height: 52, fill: '#f4efe2', ...line }, g)
    el('path', { d: `M${X - 10} 332 L${X + 56} 296 L${X + 122} 332 Z`, fill: '#c0634c', ...line }, g)
    el('circle', { cx: X + 56, cy: 350, r: 7, fill: '#7d93b8', ...line, 'stroke-width': 2 }, g)
    el('path', { d: `M${X + 20} 382 v-18 a8 8 0 0 1 16 0 v18 z`, fill: '#6b4a2b', ...line, 'stroke-width': 2 }, g)
    // the tower, its open belfry, the spire and its cross
    el('rect', { x: X - 50, y: 250, width: 56, height: 132, fill: '#f4efe2', ...line }, g)
    el('path', { d: `M${X - 40} 300 V266 a12 12 0 0 1 36 0 V300 Z`, fill: '#3b3530', ...line, 'stroke-width': 2 }, g)
    el('path', { d: `M${X - 56} 252 L${X - 22} 176 L${X + 12} 252 Z`, fill: '#c0634c', ...line }, g)
    el('path', { d: `M${X - 22} 176 V156 M${X - 30} 164 H${X - 14}`, stroke: INK, 'stroke-width': 3 }, g)
    el('rect', { x: X - 30, y: 342, width: 16, height: 22, rx: 8, fill: '#7d93b8', ...line, 'stroke-width': 2 }, g)
    drawClock(g)
    // the bell, hanging from its pivot so it can swing
    bell = el('g', { class: 'bell' }, g)
    bell.style.transformOrigin = `${BELL.x}px ${BELL.y}px`
    el('path', { d: `M${BELL.x - 12} ${BELL.y + 24} C${BELL.x - 12} ${BELL.y + 6} ${BELL.x - 8} ${BELL.y} ${BELL.x} ${BELL.y} C${BELL.x + 8} ${BELL.y} ${BELL.x + 12} ${BELL.y + 6} ${BELL.x + 12} ${BELL.y + 24} Z`, fill: '#c99a3a', ...line, 'stroke-width': 2 }, bell)
    el('circle', { cx: BELL.x, cy: BELL.y + 27, r: 3.5, fill: '#8a6a2a' }, bell)
  }

  /** The old clock: a carved frame, a face yellowed with age, twelve marks, two black hands. */
  function drawClock(g) {
    const { x, y, r } = CLOCK
    el('path', { d: `M${x - r - 4} ${y + r + 4} V${y - r} L${x} ${y - r - 5} L${x + r + 4} ${y - r} V${y + r + 4} Z`, fill: '#cdbf9c', ...line, 'stroke-width': 1.5 }, g) // the carved frame, a little gable on top
    el('circle', { cx: x, cy: y, r, fill: '#efe2bd', ...line, 'stroke-width': 2 }, g)
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6
      const long = i % 3 === 0
      el('line', { x1: x + Math.sin(a) * (r - (long ? 4.5 : 3)), y1: y - Math.cos(a) * (r - (long ? 4.5 : 3)), x2: x + Math.sin(a) * (r - 1.5), y2: y - Math.cos(a) * (r - 1.5), stroke: '#3b3530', 'stroke-width': long ? 1.6 : 1 }, g)
    }
    hands = {
      hour: el('line', { class: 'clock-hour', x1: x, y1: y + 1.5, x2: x, y2: y - r * 0.5, stroke: '#2b2622', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, g),
      minute: el('line', { x1: x, y1: y + 2, x2: x, y2: y - r * 0.8, stroke: '#2b2622', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, g),
    }
    el('circle', { cx: x, cy: y, r: 1.6, fill: '#2b2622' }, g)
  }

  /** The hands to the hour (08.5 = half past eight), in steps; written only when they move. */
  function showTime(hour) {
    const t = Math.floor(hour / CLOCK_STEP + 1e-6) * CLOCK_STEP
    if (t === shown) return
    shown = t
    hands.hour.setAttribute('transform', `rotate(${((t % 12) * 30).toFixed(1)} ${CLOCK.x} ${CLOCK.y})`)
    hands.minute.setAttribute('transform', `rotate(${(((t % 1) * 360)).toFixed(1)} ${CLOCK.x} ${CLOCK.y})`)
  }

  /** A ring of sound spreading out from the belfry, fading. */
  function ring() {
    const r = el('circle', { cx: BELL.x, cy: BELL.y + 14, r: 16, fill: 'none', stroke: '#fbf8ef', 'stroke-width': 3 }, layer)
    r.style.transformBox = 'fill-box'
    r.style.transformOrigin = 'center'
    Motion.endAt(r, [{ transform: 'scale(1)', opacity: 0.9 }, { transform: 'scale(4)', opacity: 0 }], { duration: RING_MS, easing: 'ease-out' })
      .then(() => r.remove(), () => r.remove())
  }

  /** The bell swings `n` times, ringing at each end of its swing. */
  async function toll(n) {
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? -1 : 1
      Sound.bell()
      World.noise('bell', 0, Infinity) // heard all over the meadow
      ring()
      await Debug.ignoreCut(Motion.endAt(bell, [
        { transform: 'rotate(0deg)' },
        { transform: `rotate(${side * SWING_DEG}deg)`, offset: 0.35 },
        { transform: 'rotate(0deg)' },
      ], { duration: STROKE_MS, easing: 'ease-in-out' }), 'the bell swings')
    }
  }

  /** Stand it in `into` (the distant layer); onHour(hour, strokes) hears each hour as it rings. */
  function setup(into, onHour = () => {}) {
    layer = into
    heard = onHour
    draw()
  }

  /** The meadow's tick: ring the hour once it has come (not before the first, not after the evening bell). */
  function tick(hour) {
    showTime(hour)
    const h = Math.floor(hour)
    if (h <= rang || h < FIRST || h > EVENING) return
    rang = h
    const strokes = h === EVENING ? EVENING_STROKES : STROKES
    Debug.trace('bell', { hour: h, strokes })
    heard(h, strokes)
    Clock.after(0, () => toll(strokes))
  }

  return { setup, tick, X, get rang() { return rang }, get shows() { return shown } }
})()
