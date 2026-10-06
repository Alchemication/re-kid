// What a tap or a key means, as plain rules with no page of their own
// (yard.js reads what is under the finger and passes it in): every input
// becomes an intent, a short line of text ("go to bowl", "walk to 1830",
// "press") that yard.js carries out and the recorder keeps. And what an ask
// does while Reksio is busy: it waits its turn.

/* exported Input */
const Input = (() => {
  const PUDDLE_REACH = 40 // a ground tap this far past a puddle's edge (scene units) still means "jump in"
  const RESTART_AFTER_MS = 2500 // at the end, taps are ignored this long, then one starts a new play
  const IGNORED_KEYS = ['Shift', 'Meta', 'Control', 'Alt', 'CapsLock', 'Tab', 'Escape']

  /**
   * What a tap means.
   * @param {{critter: string|null, nearMiddle: boolean, under: {thing?: string, reksio?: boolean, spot?: string}, x: number, y: number}} hit
   *   critter: a creature whose (wide) tap circle is hit, if any; nearMiddle:
   *   near where it is drawn; under: what else is there, the topmost first
   *   that isn't a creature; x, y: where, in the yard (scene units).
   * @param {{groundTop: number, puddles: {x: number, rx: number}[]}} yard
   */
  function tap({ critter, nearMiddle, under, x, y }, { groundTop, puddles }) {
    // a critter's tap circle is wide; over a thing or Reksio it gives way, except near its middle
    if (critter && (nearMiddle || !(under.thing || under.reksio))) return `chase ${critter}`
    if (under.thing) return `go to ${under.thing}`
    if (under.reksio) return 'press'
    // a puddle is drawn on the ground, so it wins over the faint action spots
    const puddle = y > groundTop && puddles.find((p) => Math.abs(p.x - x) < p.rx + PUDDLE_REACH)
    if (puddle) return `jump in puddle at ${Math.round(puddle.x)}`
    if (under.spot) return `go to ${under.spot}`
    return `walk to ${Math.round(x)}`
  }

  /** A puddle a "jump in puddle at x" intent still finds (it may have dried up since). */
  const puddleAt = (x, puddles) => puddles.find((p) => Math.abs(p.x - x) < p.rx + PUDDLE_REACH) || null

  /** Is this key the game's (so the browser shouldn't act on it too, held or not)? */
  const ownsKey = ({ key, modified }) => !modified && !IGNORED_KEYS.includes(key)

  /**
   * What a key press means, or null for none. Arrows walk to that end of the
   * yard; space or enter uses the thing he stands by (or barks); any other key
   * is a press on Reksio: tap to bark, hold to stretch.
   * @param {{key: string, repeat: boolean, modified: boolean}} e
   * @param {{nearest: string|null, minX: number, maxX: number}} at
   */
  function keyDown({ key, repeat, modified }, { nearest, minX, maxX }) {
    if (!ownsKey({ key, modified })) return null
    if (key === 'ArrowLeft' || key === 'ArrowRight') return repeat ? null : `walk to ${key === 'ArrowLeft' ? minX : maxX}`
    if (repeat) return null
    if (key === ' ' || key === 'Enter') return nearest ? `go to ${nearest}` : 'bark'
    return 'press'
  }

  /** What letting go of a key means: an arrow stops him; the key held for a press lets go. */
  function keyUp(key, held) {
    if (key === 'ArrowLeft' || key === 'ArrowRight') return 'stop'
    if (key === held) return 'release'
    return null
  }

  /**
   * What an ask does: 'run' now, 'wait' its turn (replacing any ask already
   * waiting), 'restart' the play, or 'ignore' it (just after the end).
   * @param {{busy: boolean, ended: boolean, endedAt: number, now: number}} s
   *   endedAt: when the end's closing circle finished (0 while it is closing).
   */
  function ask({ busy, ended, endedAt, now }) {
    if (ended) return endedAt && now - endedAt > RESTART_AFTER_MS ? 'restart' : 'ignore'
    return busy ? 'wait' : 'run'
  }

  return { PUDDLE_REACH, RESTART_AFTER_MS, tap, puddleAt, ownsKey, keyDown, keyUp, ask }
})()
