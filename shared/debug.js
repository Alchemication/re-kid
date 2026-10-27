// Finding and replaying bugs in a game, and the game's clock. Loaded
// first, so every other script can use them. The source is shared/debug.js;
// `main.py shared` copies it into each game that loads it.
//
// - The clock (`Clock`): game time, timers and waits. It moves on only as
//   frames are drawn, a frame counting for at most MAX_STEP_MS, so when the
//   page is hidden (another tab, a covered window, a locked phone) the game
//   pauses rather than running on unseen; its animations and sound pause too.
//   Clock.hold pauses it the same way for other reasons (a phone held
//   upright, in the yard).
//   Everything that plays out over time uses it, never setTimeout or
//   performance.now (sound's own audio clock aside).
// - Motion.endAt: animate something to where it ends up, setting the end on
//   the element first, so the drawing never depends on an animation frozen on
//   its last frame (fill: 'forwards'), which a cut-short gag can leave behind.
// - Motion.blends: a character's numbers moved to a target over game time,
//   all cut short at once when he is asked to do something else (Reksio's
//   and the boy's engines both move only through one).
//
// - Random numbers: every part of the game draws from its own stream, made
//   from one seed. `?seed=N` in the page address replays a play: the layout
//   exactly, what happens in it closely (it still runs on the real clock, so
//   anything that depends on frame timing drifts). The seed of every play is
//   printed in the console at start.
// - A trace: the last few hundred things that happened (taps, moves, cut-short
//   gestures, errors), which a game can show (the yard: `yardGame.trace()`).
// - Cut-short gestures: relax() cancels animations, and whoever awaits them
//   sees an AbortError. `ignoreCut` lets that one through quietly and reports
//   anything else, so a real error never just leaves Reksio standing still.
// - Rules that should always hold, checked while playing; a broken one is
//   reported once, with the trace.
// - `?debug`: an overlay with the game's state and the latest trace, and every
//   trace event in the console.
// - A recorder, always on: every input since the start, and the game's state
//   every half second for the last two minutes. Ctrl+Shift+B (or the button
//   under ?debug) asks what went wrong and saves it all as a bug report file,
//   which `main.py replay` plays back. See README.
// - `?still`: Reksio does nothing unless asked (no left-alone moves or thought
//   bubbles, no bird hunting), so one gesture or gag can be tried, or tested,
//   on its own.

// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* exported Clock, Motion, Debug */
const Clock = (() => {
  const MAX_STEP_MS = 100 // a longer frame (the page was hidden, or very busy) counts as this: the game pauses, it doesn't jump
  let now = 0
  let last = null
  let seq = 0
  const due = [] // {at, seq, fn}, soonest first
  const listeners = []
  const paused = new Set() // animations the clock paused while it was held
  const holds = new Set() // why the game is paused now: 'hidden' (the page), or a reason given to hold()

  function frame(t) {
    if (last !== null && !holds.size) now += Math.max(0, Math.min(MAX_STEP_MS, t - last))
    last = t
    const before = seq // timers set during this frame wait for the next one
    while (due.length && due[0].at <= now && due[0].seq < before) due.shift().fn()
    requestAnimationFrame(frame)
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(frame)

  function cancel(timer) {
    const i = due.indexOf(timer)
    if (i >= 0) due.splice(i, 1)
  }

  /** Run fn after ms of game time (whole frames: about 16 ms apart). */
  function after(ms, fn) {
    const timer = { at: now + Math.max(0, ms || 0), seq: seq++, fn }
    due.push(timer)
    due.sort((a, b) => a.at - b.at || a.seq - b.seq)
    return timer
  }

  /** Pause the game for `why` (on) or stop doing so (off): game time stands
   * still and what is playing pauses; once nothing holds it, it plays on.
   * The listeners (sound) hear when it pauses and plays on. */
  function hold(why, on) {
    const was = holds.size > 0
    if (on) holds.add(why)
    else holds.delete(why)
    const held = holds.size > 0
    if (held === was) return
    if (held) {
      for (const a of document.getAnimations()) {
        if (a.playState === 'running') {
          a.pause()
          paused.add(a)
        }
      }
    } else {
      paused.forEach((a) => a.playState === 'paused' && a.play())
      paused.clear()
    }
    listeners.forEach((fn) => fn(held))
  }

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => hold('hidden', document.hidden))
  }

  return {
    /** Game time, ms since the page started. */
    now: () => now,
    after,
    /** Run fn every ms of game time until the returned stop() is called (by fn itself too). */
    every(ms, fn) {
      let timer = null
      let stopped = false
      const tick = () => {
        fn()
        if (!stopped) timer = after(ms, tick) // fn may have stopped it
      }
      timer = after(ms, tick)
      return () => {
        stopped = true
        cancel(timer)
      }
    },
    /** Stop a timer `after` returned, if it hasn't run. */
    cancel,
    /** A promise that resolves after ms of game time. */
    wait: (ms) => new Promise((resolve) => after(ms, resolve)),
    /** A promise that resolves at the next frame. */
    frame: () => new Promise((resolve) => after(0, resolve)),
    hold,
    /** Is the game paused now (the page hidden, or held)? */
    get held() { return holds.size > 0 },
    /** fn(held) whenever the game pauses or plays on. */
    onHold(fn) {
      listeners.push(fn)
    },
  }
})()

const Motion = (() => {
  const NOT_STYLE = new Set(['offset', 'easing', 'composite'])

  /**
   * Animate `el` through `keyframes` and leave it where they end: the end is
   * set on the element first (its style), so the animation only covers the
   * move; whether it finishes or is cut short, the element shows the end.
   * With a delay, it keeps the first keyframe until it starts. Resolves when
   * it gets there; rejects if cut short (callers that await it decide).
   */
  function endAt(el, keyframes, opts = {}) {
    for (const [k, v] of Object.entries(keyframes[keyframes.length - 1])) {
      if (!NOT_STYLE.has(k)) el.style[k] = v
    }
    const anim = el.animate(keyframes, { ...opts, fill: opts.delay ? 'backwards' : 'none' })
    const done = anim.finished
    done.catch(() => 'cut short: the element already shows its end') // whoever awaits it hears; nobody else need
    return done
  }

  const EASE = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
  const cutShort = () => Object.assign(new Error('cut short'), { name: 'AbortError' })

  /** A promise that may be cut short with nobody waiting on it: whoever
   * awaits it hears; nobody else need. */
  function loose(promise) {
    promise.catch(() => {}) // cut short, unawaited: nothing to do
    return promise
  }

  /**
   * A character's blends: `blend(obj, key, to, ms, ease)` moves obj[key] to
   * `to` over ms of game time, resolving when it gets there; a newer blend of
   * the same number takes over from wherever this one got to. `run()` moves
   * them, once a frame; `cut()` rejects every one with an AbortError (his
   * relax). `pause(ms)` is a gesture's wait that cut() cuts short like any
   * blend (a plain Clock.wait would let a gesture carry on after a tap);
   * `moving(test)` says whether a blend (not a pause) that passes the test is
   * under way.
   */
  function blends() {
    const list = [] // {obj, key, from, to, start, ms, ease, resolve, reject}
    function blend(obj, key, to, ms, ease = EASE) {
      for (const b of list.filter((b) => b.obj === obj && b.key === key)) {
        list.splice(list.indexOf(b), 1)
        b.resolve()
      }
      return loose(new Promise((resolve, reject) => {
        list.push({ obj, key, from: obj[key], to, start: Clock.now(), ms: Math.max(1, ms), ease, resolve, reject })
      }))
    }
    function run() {
      const now = Clock.now()
      for (const b of [...list]) {
        const k = Math.min(1, (now - b.start) / b.ms)
        b.obj[b.key] = b.from + (b.to - b.from) * b.ease(k)
        if (k >= 1) {
          list.splice(list.indexOf(b), 1)
          b.resolve()
        }
      }
    }
    return {
      blend,
      run,
      pause: (ms) => blend({ k: 0, waiting: true }, 'k', 1, ms),
      cut: () => list.splice(0).forEach((b) => b.reject(cutShort())),
      moving: (test = () => true) => list.some((b) => !b.obj.waiting && test(b)),
    }
  }

  return { endAt, blends, loose, EASE }
})()

const Debug = (() => {
  const TRACE_SIZE = 300 // events kept: a few minutes of play, enough to see how a bug came about
  const OVERLAY_EVENTS = 8 // latest trace events shown in the ?debug overlay
  const SNAPSHOT_MS = 500 // how often the recorder notes the game's state: enough to see a pose go wrong
  const SNAPSHOTS = 240 // snapshots kept: the last two minutes
  const INPUTS = 5000 // inputs kept, from the start (a busy play has a few hundred)
  const REPORT_VERSION = 1 // bump when a bug report's shape changes (main.py replay reads it)

  const params = new URLSearchParams(location.search)
  const on = params.has('debug')
  const still = params.has('still')
  const seeded = params.has('seed')
  const seed = (seeded ? Number(params.get('seed')) : Math.floor(Math.random() * 2 ** 32)) >>> 0

  /** mulberry32: a small, fast seeded generator, plenty for a game. */
  function generator(a) {
    return () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  /** FNV-1a: turns a stream's name into a number to mix with the seed. */
  function hash(s) {
    let h = 0x811c9dc5
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
    return h >>> 0
  }

  /** A random stream of its own for one part of the game (use it like
   * Math.random). Separate streams keep one part's draws from shifting
   * another's: extra rain splashes don't change which act Reksio picks. */
  const random = (name) => generator(seed ^ hash(name))

  // ------------------------------------------------------------ the trace

  const events = []

  /** Note something that happened: `kind` is a short word, `data` small. */
  function trace(kind, data = {}) {
    events.push({ t: Math.round(Clock.now()), kind, ...data })
    if (events.length > TRACE_SIZE) events.shift()
    if (on) console.debug('[game]', kind, data)
  }

  /** The trace as text, one event a line, oldest first. */
  function dump(list = events) {
    return list.map(({ t, kind, ...data }) => `${(t / 1000).toFixed(1).padStart(6)}s ${kind} ${Object.keys(data).length ? JSON.stringify(data) : ''}`).join('\n')
  }

  // ------------------------------------------------------------ the recorder

  const inputs = []
  const snapshots = []
  let stateOf = () => ({})

  /** Note an input (an intent, e.g. "go to bowl") for replays; returns it. */
  function input(intent) {
    if (inputs.length < INPUTS) inputs.push({ t: Math.round(Clock.now()), intent })
    trace('input', { intent })
    return intent
  }

  /** Start noting `state()` every SNAPSHOT_MS. */
  function record(state) {
    stateOf = state
    setInterval(() => {
      snapshots.push({ t: Math.round(Clock.now()), ...state() })
      if (snapshots.length > SNAPSHOTS) snapshots.shift()
    }, SNAPSHOT_MS)
  }

  /** Everything needed to see, and replay, what just happened. `moment` is
   * when it happened, noted before asking for the description (asking pauses
   * the page, so the time after it is late by however long the typing took). */
  function bugReport(description, moment = { at: Math.round(Clock.now()), state: stateOf() }) {
    return {
      version: REPORT_VERSION,
      description,
      at: moment.at,
      saved: new Date().toISOString(),
      seed,
      url: location.href,
      replayUrl: replayUrl(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      userAgent: navigator.userAgent,
      layout: pinned.layout,
      state: moment.state,
      inputs,
      snapshots,
      trace: events,
      broken: [...broken],
    }
  }

  /** The game's folder name, for the report's file name: `yard` from
   * …/games/yard/game/index.html on disk or …/reksio/yard/ on the site. */
  function gameName() {
    const dirs = location.pathname.split('/').filter((d) => d && !d.includes('.'))
    const last = dirs[dirs.length - 1] === 'game' ? dirs[dirs.length - 2] : dirs[dirs.length - 1]
    return last || 'game'
  }

  /** Ask what went wrong, then download the report as a file. */
  function saveBugReport() {
    const moment = { at: Math.round(Clock.now()), state: stateOf() }
    const description = window.prompt('What went wrong? (Saved with the last two minutes of play.)')
    if (description === null) return // cancelled
    const report = bugReport(description, moment)
    trace('bug report', { description })
    const stamp = report.saved.replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(report, null, 1)], { type: 'application/json' }))
    a.download = `${gameName()}-bug-${stamp}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyB') {
        e.preventDefault()
        saveBugReport()
      }
    })
  }

  // What the game pinned about this play (pin()): the page-address flags
  // that rebuild it, and its layout, for the bug report.
  let pinned = { flags: {}, layout: null }

  /** The game says what this play is, once it is decided: `flags`, the
   * page-address flags that build the same play again (an unseeded play may
   * pick its things partly from the browser's memory of the last one, which a
   * replay won't have, so the seed alone wouldn't), and `layout`, kept in a
   * bug report. */
  function pin({ flags = {}, layout = null }) {
    pinned = { flags, layout }
  }

  /** This play's address: seeded, with what the game pinned. (Forced flags
   * still make their random draws: the rest is unchanged.) */
  function replayUrl() {
    const url = new URL(location.href)
    url.searchParams.set('seed', String(seed))
    for (const [k, v] of Object.entries(pinned.flags)) url.searchParams.set(k, String(v))
    return url.href
  }

  // ------------------------------------------------------------ errors

  const isCut = (e) => e?.name === 'AbortError'

  function report(where, e) {
    trace('error', { where, message: String(e?.message || e) })
    console.error(`[game] ${where}:`, e, `\nreplay: ${replayUrl()}\ntrace:\n${dump()}`)
  }

  /** Await a gesture that a tap may cut short: a cut is fine (noted in the
   * trace), any other error is reported. Resolves either way. */
  function ignoreCut(promise, where) {
    return Promise.resolve(promise).catch((e) => {
      if (isCut(e)) trace('cut', { where })
      else report(where, e)
    })
  }

  window.addEventListener('error', (e) => trace('error', { where: 'uncaught', message: e.message }))
  window.addEventListener('unhandledrejection', (e) => {
    if (isCut(e.reason)) return e.preventDefault() // a cut-short gesture nobody awaited
    trace('error', { where: 'unhandled rejection', message: String(e.reason?.message || e.reason) })
  })

  // ------------------------------------------------------------ rules

  const broken = new Set()

  /** A rule that should always hold. Reported once each time it breaks (it
   * can be reported again once it has held again). */
  function check(rule, holds, detail) {
    if (holds) return broken.delete(rule)
    if (broken.has(rule)) return
    broken.add(rule)
    report(`rule broken: ${rule}`, detail ? JSON.stringify(detail) : '')
  }

  // ------------------------------------------------------------ overlay

  let overlay = null

  /** Under ?debug, show `state` (a plain object) and the latest trace. */
  function show(state) {
    if (!on) return
    if (!overlay) {
      overlay = document.createElement('pre')
      overlay.id = 'debug'
      document.body.appendChild(overlay)
      const button = document.createElement('button')
      button.id = 'bug-button'
      button.textContent = 'report a bug (ctrl+shift+B)'
      button.addEventListener('click', saveBugReport)
      document.body.appendChild(button)
    }
    const lines = Object.entries(state).filter(([k]) => k !== 'seed').map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    overlay.textContent = `seed ${seed}${broken.size ? `\nBROKEN: ${[...broken].join(', ')}` : ''}\n${lines.join('\n')}\n\n${dump(events.slice(-OVERLAY_EVENTS))}`
  }

  console.info(`[game] seed ${seed}`)

  /** Game time (Clock), the clock of the trace, inputs and snapshots. */
  const now = () => Math.round(Clock.now())

  return { on, still, seed, seeded, now, random, trace, dump, pin, replayUrl, ignoreCut, check, show, events, input, inputs, record, snapshots, bugReport, saveBugReport }
})()
