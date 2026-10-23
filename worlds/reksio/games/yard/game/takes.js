// Copied from shared/takes.js by `main.py shared` — edit that, not this.
// Recorded music takes (a game's tunes.js), played one at a time: a random
// take of a part, never the one before if the part has others, faded out
// when cut short. Each game's music.js says when which part comes; this is
// only the player (the yard's music.js puts its bed and touches round it,
// the meadow's its moods and the cricket).
//
// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* exported Takes */
const Takes = (() => {
  const FADE_S = 0.5 // a take cut short fades over about this long

  const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer

  /**
   * A player on the audio context `ctx`, into the node `out`.
   * volume: each take's gain (the takes are levelled when packed);
   * onStart(t): a take begins at audio time t; onEnd(): it ended or was cut
   * (another may have started since: check `playing`).
   */
  function player(ctx, out, { volume = 0.8, onStart = () => {}, onEnd = () => {} } = {}) {
    const takes = {} // part -> decoded takes
    const last = {} // part -> the take played last time
    let current = null // { src, gain, part }

    /** Decode a TUNES table ({part: [base64 mp3]}); a take that won't decode is left out. */
    function load(table) {
      const jobs = []
      for (const [part, list] of Object.entries(table || {})) {
        takes[part] ??= []
        for (const b64 of list) jobs.push(ctx.decodeAudioData(bytes(b64)).then((b) => takes[part].push(b), () => {})) // left out: the part plays from the others
      }
      return Promise.all(jobs)
    }

    /**
     * A random take of `part` from audio time t (random: the caller's
     * stream); then(), once it has played to its end (not when cut).
     * False if the part has no take.
     */
    function play(part, random, t, then = null) {
      const list = takes[part] || []
      if (!list.length) return false
      const others = list.map((_, i) => i).filter((i) => i !== last[part] || list.length === 1)
      const i = others[Math.floor(random() * others.length)]
      last[part] = i
      const src = ctx.createBufferSource()
      src.buffer = list[i]
      const gain = ctx.createGain()
      gain.gain.value = volume
      src.connect(gain).connect(out)
      const take = { src, gain, part }
      src.onended = () => {
        const whole = current === take // not cut short
        if (whole) current = null
        onEnd()
        if (whole && then) then()
      }
      current = take
      onStart(t)
      src.start(Math.max(t, ctx.currentTime))
      return true
    }

    /** Fade out the take playing now, if any. */
    function fade() {
      if (!current) return
      const now = ctx.currentTime
      current.gain.gain.setTargetAtTime(0.0001, now, FADE_S / 3)
      current.src.stop(now + FADE_S * 2)
      current = null
    }

    return {
      load, play, fade,
      FADE_S,
      /** Whether `part` has a take to play. */
      has: (part) => !!takes[part]?.length,
      get playing() { return !!current },
      /** The part playing now, or null. */
      get part() { return current?.part ?? null },
    }
  }

  return { player }
})()
