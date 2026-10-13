// The cuckoo clock in the house, on the wall just inside its open window
// (invented: Eliot's grandfather keeps wall clocks, DESIGN_PRINCIPLES.md; an
// indoor clock, so it hangs indoors). A tap on the house is a tap on it. Its hands show the day's time (day.js:
// the minute hand goes round once each hour of the day), its pendulum swings
// without a sound, and on each hour the cuckoo comes out and calls once; at
// 20:00, bedtime, eight slow times. No ticking.
//
// Tapped, Reksio counts along: the cuckoo calls, he barks back up at it each
// time, very pleased, and turns his back on it, nose in the air. Then it
// calls once more, behind him: he spins round and barks too late, and the
// door snaps shut on him, the curtain fluttering. He gives it a cross look. The variation: he goes
// first, with a little howl, and it answers.
//
// The clock is drawn from its own state each frame (the door, how far the
// cuckoo is out, its beak), moved only on the game's Clock, so a play cut
// short or hidden leaves nothing half open.

/* global Clock, Debug, Sound, Reksio, Layout */
/* exported Cuckoo */
const Cuckoo = (() => {
  const X = 155 // where the clock hangs (index.html), scene units
  const SWING_MS = 1700 // the pendulum, there and back: a slow, calm beat
  const SWING_DEG = 9
  const DOOR_MS = 110 // the door flies open this fast
  const OUT_MS = 170 // and the cuckoo pops out
  const IN_MS = 220 // and goes back in
  const SNAP_MS = 70 // the door snapping shut on him
  const CALL_MS = 850 // one call, ku-ku, and the gap after it: longer than its take (0.8 s), so none is swallowed by the one before
  const SLOW_CALL_MS = 1050 // …at bedtime
  const NOTES_MS = [90, 230] // when "ku" and "ku" start in its take (effects/cuckoo/08.mp3): the beak opens on each, and the synth plays them then before the take is decoded
  const BEDTIME = 20 // the hour of the eight slow calls (day.js TO)
  const BEDTIME_CALLS = 8
  const FAR = 2600 // Reksio this far off (scene units) hears it quietest
  const COUNT = 2 // calls he answers on a tap
  const GLOAT_MS = [500, 900] // how long it lets him gloat before the call behind him
  const SNAP_AFTER_MS = 120 // the door snaps shut this far into his late bark

  const $ = (id) => document.getElementById(id)
  const wait = Clock.wait
  const random = Debug.random('cuckoo') // this part's own random stream (debug.js)
  const rnd = (lo, hi) => lo + random() * (hi - lo)

  let hourAt = () => BEDTIME - 12
  let onHour = () => {}
  let inView = () => true
  let hushed = () => false // the sun hurried down (day.js): the hands spin, the hours it crosses go uncalled
  let lastHour = null
  let owed = null // an hour that came while the cuckoo was busy: called once it's free
  let holder = null // while the hour's calls or the gag have the cuckoo: resolves once they let go
  const state = { door: 0, out: 0, beak: 0 } // 0 shut / in / closed … 1
  const moving = {} // key → { from, to, at, ms }
  let els = null // the clock's parts on the page (init)
  const drawn = { hour: null, minute: null, cuckoo: true } // what is on the page now: only changes are written

  /** The hands' angles at hour `h`, in degrees clockwise from twelve. */
  function hands(h) {
    return { hour: (h % 12) * 30, minute: (h % 1) * 360 }
  }

  /** Move `key` of the state to `value` over ms. */
  async function to(key, value, ms) {
    const move = { from: state[key], to: value, at: Clock.now(), ms }
    moving[key] = move
    await wait(ms)
    if (moving[key] !== move) return // a newer move took over
    delete moving[key]
    state[key] = value
  }

  /** Draw the clock: the pendulum every frame; the hands and the cuckoo only
   * when they have moved. */
  function draw(h) {
    if (!inView()) {
      drawn.cuckoo = true // drawn again once it's back in view
      return
    }
    const now = Clock.now()
    let cuckoo = false
    for (const key in moving) {
      const m = moving[key]
      const k = Math.min(1, (now - m.at) / m.ms)
      state[key] = m.from + (m.to - m.from) * k * (2 - k) // easing out
      cuckoo = true
    }
    const a = hands(h)
    const hour = a.hour.toFixed(0) // whole degrees: the minute hand moves about one a frame
    const minute = a.minute.toFixed(0)
    if (hour !== drawn.hour) els.hour.style.transform = `rotate(${(drawn.hour = hour)}deg)`
    if (minute !== drawn.minute) els.minute.style.transform = `rotate(${(drawn.minute = minute)}deg)`
    const swing = Math.sin((2 * Math.PI * now) / SWING_MS) * SWING_DEG
    els.pendulum.style.transform = `rotate(${swing.toFixed(2)}deg)`
    if (cuckoo || drawn.cuckoo) drawCuckoo()
    drawn.cuckoo = cuckoo // once more after the last move, at its end
  }

  function drawCuckoo() {
    els.door.style.transform = `scaleX(${(1 - 1.25 * state.door).toFixed(3)})` // opens outwards, to the left
    const bird = els.bird
    bird.setAttribute('opacity', state.out > 0.02 ? '1' : '0')
    bird.style.transform = `translate(${(13 * state.out).toFixed(2)}px, ${(-2 * state.out).toFixed(2)}px) scale(${(0.45 + 1.2 * state.out).toFixed(3)})` // out of the door and towards the yard
    els.beak.style.transform = `rotate(${(28 * state.beak).toFixed(1)}deg)`
  }

  /** Everything back in, shut (the end of a call, or of a gag cut short). */
  function shut() {
    for (const key of Object.keys(state)) {
      delete moving[key]
      state[key] = 0
    }
    drawn.cuckoo = true
  }

  async function come() {
    await to('door', 1, DOOR_MS)
    await to('out', 1, OUT_MS)
  }

  async function goIn(snap = false) {
    await to('out', 0, snap ? SNAP_MS : IN_MS)
    await to('door', 0, snap ? SNAP_MS : DOOR_MS)
    if (snap) {
      Sound.tok()
      Sound.curtain()
      $('curtain').animate([0, -8, 4, 0].map((d) => ({ transform: `skewX(${d}deg)` })), { duration: 900, easing: 'ease-in-out' }) // ends where it began
    }
  }

  function beak() {
    to('beak', 1, 60).then(() => to('beak', 0, 100)) // shut again before the next note
  }

  /** One call, ku-ku, its beak opening on each note; quieter the further
   * off he is, but heard right across the yard: it tells the hour. */
  async function call(slow = false) {
    Sound.scaled(1 - 0.75 * Math.min(1, Math.abs(Reksio.x - X) / FAR), () => Sound.cuckoo(slow, NOTES_MS.map((ms) => ms / 1000)))
    await wait(NOTES_MS[0])
    beak()
    await wait(NOTES_MS[1] - NOTES_MS[0])
    beak()
    await wait((slow ? SLOW_CALL_MS : CALL_MS) - NOTES_MS[1])
  }

  /** Have the cuckoo for `job` (async): once whatever has it now lets go;
   * shut after, however the job ends. */
  async function hold(job) {
    while (holder) await holder
    let release = null
    holder = new Promise((resolve) => (release = resolve))
    try {
      return await job()
    } finally {
      shut()
      holder = null
      release()
    }
  }

  /** The cuckoo comes out, calls `n` times and goes back in. */
  function strike(n, slow) {
    return hold(async () => {
      Debug.trace('cuckoo', { calls: n })
      await come()
      for (let i = 0; i < n; i++) await call(slow)
      await goIn()
    })
  }

  /** Each frame: the hands, the pendulum, the cuckoo; and on the hour, a
   * call (once the cuckoo is free, if the gag has it out). */
  function tick() {
    const h = hourAt()
    const whole = Math.floor(h + 1e-6)
    if (lastHour === null) lastHour = whole // the hour the play begins at: no call
    if (whole > lastHour) {
      lastHour = whole
      if (!hushed()) {
        owed = whole
        onHour(whole)
      }
    }
    if (owed !== null && !holder) {
      strike(owed === BEDTIME ? BEDTIME_CALLS : 1, owed === BEDTIME)
      owed = null
    }
    draw(h)
  }

  const thing = {
    at: () => Layout.MIN_X,
    face: -1,
    run: ({ extra }) => hold(() => countAlong(extra)), // the hour's calls finish first
  }

  async function countAlong(extra) {
    let calling = null // the call behind him, and the door snapping shut: not
    let snap = null // awaited by him, so waited for below if he's cut short
    try {
      await Reksio.lookUp(700)
      if (extra) await Reksio.howl() // he goes first, and it answers
      await come()
      for (let i = 0; i < COUNT; i++) {
        await call()
        if (!extra) await Reksio.barkUp() // he answers each call
      }
      if (extra) await Reksio.barkUp()
      await goIn()
      await Reksio.smugTurn()
      await wait(rnd(...GLOAT_MS))
      await come() // once more, behind him
      calling = call()
      await Reksio.spunRound()
      await calling
      snap = wait(SNAP_AFTER_MS).then(() => goIn(true))
      await Reksio.barkUp() // too late
      await snap
      await Reksio.glare()
    } finally {
      await Promise.all([calling, snap]) // they only wait on the Clock: they never fail
    }
  }

  /** Start the clock. hourAt: the day's hour now; onHour(h): the hour has
   * come (yard.js: he may look up); inView: the clock is on screen; hushed:
   * no calls now (the sun hurried down). */
  function init(hooks) {
    hourAt = hooks.hourAt
    onHour = hooks.onHour
    if (hooks.inView) inView = hooks.inView
    if (hooks.hushed) hushed = hooks.hushed
    els = { hour: $('clock-hour'), minute: $('clock-minute'), pendulum: $('cuckoo-pendulum'), door: $('cuckoo-door'), bird: $('cuckoo-bird'), beak: $('cuckoo-beak-low') }
    Clock.every(0, tick)
  }

  return {
    X, BEDTIME_CALLS, thing, hands, init,
    /** The cuckoo is out, or a call or the gag is under way. */
    get busy() { return !!holder },
    get out() { return state.out },
  }
})()
