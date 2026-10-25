// The village church far off on a hill behind the meadow, and its bell: the
// meadow's sign that the day goes on, as the cuckoo clock is the yard's
// (Adam, 2026-10-25: a church you can see, its bell you can see and hear).
// Invented: a white country church with a red roof and an open belfry, as
// Czech villages have; not from the films.
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

  let layer = null
  let bell = null
  let rang = FIRST - 1 // the last hour rung
  let heard = () => {}

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    if (parent) parent.appendChild(e)
    return e
  }
  const line = { stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round' }

  /** The hill and the church on it. */
  function draw() {
    el('path', { d: `M${X - 420} 660 C${X - 260} 520 ${X - 140} 384 ${X} 380 C${X + 150} 384 ${X + 280} 520 ${X + 440} 660 Z`, fill: '#a7c4ad', opacity: 0.9 }, layer)
    const g = el('g', { class: 'church', opacity: 0.92 }, layer) // a touch of the haze between
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
    el('rect', { x: X - 32, y: 318, width: 20, height: 26, rx: 10, fill: '#7d93b8', ...line, 'stroke-width': 2 }, g)
    // the bell, hanging from its pivot so it can swing
    bell = el('g', { class: 'bell' }, g)
    bell.style.transformOrigin = `${BELL.x}px ${BELL.y}px`
    el('path', { d: `M${BELL.x - 12} ${BELL.y + 24} C${BELL.x - 12} ${BELL.y + 6} ${BELL.x - 8} ${BELL.y} ${BELL.x} ${BELL.y} C${BELL.x + 8} ${BELL.y} ${BELL.x + 12} ${BELL.y + 6} ${BELL.x + 12} ${BELL.y + 24} Z`, fill: '#c99a3a', ...line, 'stroke-width': 2 }, bell)
    el('circle', { cx: BELL.x, cy: BELL.y + 27, r: 3.5, fill: '#8a6a2a' }, bell)
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
    const h = Math.floor(hour)
    if (h <= rang || h < FIRST || h > EVENING) return
    rang = h
    const strokes = h === EVENING ? EVENING_STROKES : STROKES
    Debug.trace('bell', { hour: h, strokes })
    heard(h, strokes)
    Clock.after(0, () => toll(strokes))
  }

  return { setup, tick, X, get rang() { return rang } }
})()
