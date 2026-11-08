// The meadow's sounds. The mole's voice is recorded takes picked by ear
// (effects.yaml, packed into effects.js by `main.py effects`): one at random
// each time, never the same twice running, a little higher or lower. So is
// the far church bell: its two takes in turn, ding… dong, each fading as the
// next rings (the synthesised bell plays until they are decoded). The rest
// is made in the browser, quiet and short: digging, popping up, water.
// The music (the cricket's fiddle among it) is music.js's, on this audio
// context (bus).
//
// Its take player does what the yard's sound.js does for recorded effects;
// both are the next part to move into shared/ (CLAUDE.md, "Shared parts").

/* global EFFECTS, Clock, Debug */
/* exported Sound */
const Sound = (() => {
  const VOLUME = 0.5
  const VOICE_VOLUME = 0.9
  const VOICE_RATE = [0.95, 1.07] // each word a little lower or higher: never quite the same twice
  const CASUAL_GAP_S = 4 // an idle remark only if he hasn't spoken for this long
  const EFFECT_VOLUME = 0.9 // recorded effects, as his voice (each one's own level is its gain in effects.yaml)
  const ECHO_GAP_S = 0.42 // a word given back by the oak's hollow: this long after, each time
  const ECHO_FALL = 0.4 // ...each this much as loud as the last
  const ECHO_DULL_HZ = 2400 // ...and duller: the first cut above this, the next above half of it
  const HEARD_FAR = 700 // a creature's sound this far off the screen's edge (meadow units) is not heard: about half a screen…
  const HEARD_MIN = 0.03 // …nor one quieter than this
  const HEARD_PAN = 0.6 // and from its side, at most this far left or right
  const FADE_S = 0.05 // a fade's floor: how quiet "gone" is, as a share of the level
  const WATER_FADE_S = 0.3 // rain (its takes looped): faded out over this long as it stops
  const SOFT_RAIN = 0.35 // the storm's rain over the whole meadow, under everything: this much of the cloud's rain on the flowers
  let ctx = null
  let master = null
  let out = null // what a sound plays into: the master, or, heard from a place (from), that place's gain
  let view = () => null // the game's hook: what is on screen now, { left, right } in the meadow
  let noise = null
  const takes = {} // decoded takes, by sound: {gain, overlaps, inTurn, buffers (in the order listed), last, until}
  const echoing = new Set() // echoes started ahead on the audio clock, not yet heard out
  let lastSaid = -100 // when he last spoke (audio time)
  let heard = () => {} // the game's hook: a word he says, as he says it (his face goes with it)
  const whichWord = Debug.random('meadow-words') // which of several words he says: it shows on his face, so seeded

  Clock.onHold((held) => {
    if (!ctx) return
    if (held) ctx.suspend()
    else ctx.resume()
  })

  /** Create the audio context on the first tap (browsers require a gesture). */
  function ensure() {
    if (!ctx) {
      if (navigator.audioSession) navigator.audioSession.type = 'playback' // iPhone on silent: play like a video
      ctx = new (window.AudioContext || window.webkitAudioContext)()
      master = ctx.createGain()
      master.gain.value = VOLUME
      master.connect(ctx.destination)
      out = master
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const data = noise.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      for (const [name, e] of Object.entries(typeof EFFECTS !== 'undefined' ? EFFECTS : {})) {
        const mine = (takes[name] = { gain: e.gain, overlaps: !!e.overlaps, inTurn: !!e.inTurn, buffers: [], last: -1, until: 0 })
        e.takes.forEach((b64, i) => {
          ctx.decodeAudioData(bytes(b64)).then((b) => (mine.buffers[i] = b), () => {}) // in its place in the list; a take that won't decode is left out: the others play
        })
      }
    }
    if (ctx.state === 'suspended' && !Clock.held) ctx.resume()
    return ctx
  }

  const bytes = (b64) => Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)).buffer
  const ready = () => ctx && ctx.state !== 'closed'

  /** How a sound at x in the meadow is heard: full on screen, quieter the further off it is, gone a
   * screen-half away (HEARD_FAR), and from its side (Adam, 2026-11-08: the frog croaking and splashing
   * at the spring was loud with him over at the oak). */
  function hearing(x) {
    const v = view()
    if (!v) return { level: 1, pan: 0 }
    const off = Math.max(0, v.left - x, x - v.right)
    const level = off ? Math.max(0, 1 - off / HEARD_FAR) ** 2 : 1
    const half = (v.right - v.left) / 2
    const pan = Math.max(-1, Math.min(1, (x - (v.left + half)) / half)) * HEARD_PAN
    return { level, pan }
  }

  /** Play a creature's sound (play: () => Sound.splash()) as heard from x in the meadow: quieter off
   * screen, silent far off, from its side. Not for his own sounds (he is always on screen), the weather
   * (everywhere) or the far bell and the geese (meant far off, over everything). */
  function from(x, play) {
    if (!ready()) return play()
    const { level, pan } = hearing(x)
    if (level <= HEARD_MIN) return
    const g = ctx.createGain()
    g.gain.value = level
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner()
      p.pan.value = pan
      g.connect(p).connect(master)
    } else g.connect(master)
    out = g
    try {
      play()
    } finally {
      out = master
    }
  }

  /** One of the mole's words or noises ('giggle', 'ahoj', 'achJo', 'ooh', 'fright', 'gasp', 'hm',
   * 'tam', 'ghost'), if it has takes; given several (['gasp', 'fright']), one of them at random.
   * `casual`: an idle remark (a tap on him, a look at a thing), skipped if he spoke only just now,
   * so his voice is kept for real moments (docs/DESIGN_PRINCIPLES.md). `echoes`: that many times
   * more, each later, quieter and duller, as a hollow gives it back (the oak). */
  function say(words, casual = false, echoes = 0) {
    const name = Array.isArray(words) ? words[Math.floor(whichWord() * words.length)] : words
    if (casual && ready() && ctx.currentTime - lastSaid < CASUAL_GAP_S) return false
    heard(name) // his face says it even where the sound can't play
    if (!ready()) return false
    const e = takes[name]
    const decoded = e ? e.buffers.filter(Boolean) : []
    if (!decoded.length) return false
    lastSaid = ctx.currentTime // he spoke (only a word actually heard counts)
    const i = another(e, decoded.length)
    const src = ctx.createBufferSource()
    src.buffer = decoded[i]
    src.playbackRate.value = VOICE_RATE[0] + Math.random() * (VOICE_RATE[1] - VOICE_RATE[0])
    const g = ctx.createGain()
    g.gain.value = VOICE_VOLUME * e.gain
    src.connect(g).connect(out)
    src.start()
    for (let k = 1; k <= echoes; k++) echoing.add(echo(src, g.gain.value, k))
    return true
  }

  /** The `k`th echo of a word said at `level`: the same take at the same pitch, ECHO_GAP_S later each, quieter and duller. */
  function echo(said, level, k) {
    const src = ctx.createBufferSource()
    src.buffer = said.buffer
    src.playbackRate.value = said.playbackRate.value
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = ECHO_DULL_HZ / k
    const g = ctx.createGain()
    g.gain.value = level * ECHO_FALL ** k
    src.connect(f).connect(g).connect(out)
    src.start(ctx.currentTime + k * ECHO_GAP_S)
    src.onended = () => echoing.delete(src)
    return src
  }

  /** Echoes still to come, silenced: he has left the hollow (a tap cut the peek short). */
  function hushEchoes() {
    for (const src of echoing) src.stop()
    echoing.clear()
  }

  /** A random take of `n`, not the one played last (unless there is only one). */
  function another(e, n) {
    let i = Math.floor(Math.random() * n)
    if (i === e.last && n > 1) i = (i + 1) % n
    e.last = i
    return i
  }

  /** One of a sound's recorded effects, if any are decoded: its takes in
   * turn (inTurn: in the order listed, each at its own pitch) or one at
   * random, a little higher or lower; over the last one if it `overlaps`,
   * else not until that one ends. `fade`: [from, over] seconds, so it dies
   * away however long the take rings. `swell`: [from, to], its loudness
   * (times its own) growing or dying from the one to the other until it
   * fades; `loop`: played over and over until the fade, for a sound called
   * for longer than its takes. Played, or still playing: true. */
  /** The next take of a sound, to play: in turn at its own pitch, or one at random, a little higher or lower. */
  function source(e, decoded) {
    const i = e.inTurn ? (e.last = (e.last + 1) % decoded.length) : another(e, decoded.length)
    const src = ctx.createBufferSource()
    src.buffer = decoded[i]
    src.playbackRate.value = e.inTurn ? 1 : VOICE_RATE[0] + Math.random() * (VOICE_RATE[1] - VOICE_RATE[0])
    return src
  }

  /** How loud a take plays from t: `level`, swelling from swell[0] to swell[1] (times it) until it fades. */
  function envelope(gain, level, t, fade, swell) {
    const [from, to] = swell || [1, 1]
    gain.setValueAtTime(level * from, t)
    if (!fade) return
    gain.linearRampToValueAtTime(level * to, t + fade[0])
    gain.exponentialRampToValueAtTime(level * to * FADE_S, t + fade[0] + fade[1])
  }

  function recorded(name, fade = null, { swell = null, loop = false, rate = null } = {}) {
    if (!ready()) return false
    const e = takes[name]
    const decoded = e ? e.buffers.filter(Boolean) : []
    if (!decoded.length) return false
    if (ctx.currentTime < e.until && !e.overlaps) return true
    const src = source(e, decoded)
    if (rate) src.playbackRate.value = rate // pitched (the twig's scale): its own speed, not the usual small wobble
    const g = ctx.createGain()
    const level = EFFECT_VOLUME * e.gain
    const t = ctx.currentTime
    envelope(g.gain, level, t, fade, swell)
    src.loop = loop && !!fade // only with an end to it
    src.connect(g).connect(out)
    src.start()
    if (fade) src.stop(t + fade[0] + fade[1])
    const length = src.loop ? Infinity : src.buffer.duration / src.playbackRate.value
    e.until = t + (fade ? Math.min(length, fade[0] + fade[1]) : length) // cut short and faded: over when it stops
    return true
  }

  /** A burst of filtered noise: earth scraped, water poured. */
  function hiss(at, length, freq, q, peak) {
    const t = ctx.currentTime + at
    const src = ctx.createBufferSource()
    src.buffer = noise
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + length)
    src.connect(f).connect(g).connect(out)
    src.start(t, Math.random() * 0.5)
    src.stop(t + length + 0.05)
  }

  function note(freq, at, length, peak, type = 'sine', glide = 1) {
    const t = ctx.currentTime + at
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    o.frequency.exponentialRampToValueAtTime(freq * glide, t + length)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.04, length / 3))
    g.gain.exponentialRampToValueAtTime(0.0001, t + length)
    o.connect(g).connect(out)
    o.start(t)
    o.stop(t + length + 0.05)
    return o
  }

  /** Digging down: a few quick scrapes of earth. */
  function dig() {
    if (!ready()) return
    for (let i = 0; i < 3; i++) hiss(i * 0.11, 0.09, 900 + Math.random() * 500, 1.2, 0.35)
  }

  /** Popping up through a fresh molehill. */
  function pop() {
    if (!ready()) return
    hiss(0, 0.12, 600, 0.9, 0.25)
    note(330, 0.05, 0.14, 0.18, 'sine', 2.2)
  }

  /** Water: filling the can at the spring, or sprinkling it on the flowers. */
  function water(seconds = 0.8, { soft = false } = {}) {
    if (!ready() || recorded('water', [Math.max(0.2, seconds - WATER_FADE_S), WATER_FADE_S], { loop: true, swell: soft ? [SOFT_RAIN, SOFT_RAIN] : null })) return
    // soft: rain on the whole meadow, a high patter under everything (storm.js plays it again and again)
    const [step, length, low, spread, q, peak] = soft ? [0.12, 0.2, 3000, 2500, 1.5, 0.02] : [0.07, 0.1, 2600, 1800, 3, 0.08]
    for (let t = 0; t < seconds; t += step) hiss(t, length, low + Math.random() * spread, q, peak)
  }

  // A church bell, far off: its strike note and the partials a bell has (hum an octave below,
  // a minor third, a fifth, the nominal an octave up, and a few above), each fading at its own
  // pace, the low ones longest. Tuned to E (the meadow's key: beds.js), soft, and dulled by distance.
  const BELL_HZ = 164.8 // E3
  const BELL_PARTIALS = [[0.5, 0.5, 4.5], [1, 0.9, 3.4], [1.2, 0.45, 2.6], [1.5, 0.3, 2.1], [2, 0.5, 2.4], [2.51, 0.18, 1.4], [3.01, 0.12, 1.1]] // [ratio, loudness, seconds]
  const BELL_VOLUME = 0.09
  // The recorded bell rings this long, then fades away over this long: gone
  // before the stroke after next, there and gently away (Adam, 2026-10-31).
  const BELL_FADE = [0.6, 0.9]

  /** One stroke of the far church bell: its recorded takes, ding… dong, or
   * the synthesised one until they are decoded. */
  function bell() {
    if (!ready() || recorded('bell', BELL_FADE)) return
    const far = ctx.createBiquadFilter() // far off: the top dulled
    far.type = 'lowpass'
    far.frequency.value = 2400
    far.connect(out)
    const t = ctx.currentTime
    for (const [ratio, loud, secs] of BELL_PARTIALS) {
      const o = ctx.createOscillator()
      o.frequency.value = BELL_HZ * ratio
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(BELL_VOLUME * loud, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t + secs)
      o.connect(g).connect(far)
      o.start(t)
      o.stop(t + secs + 0.05)
    }
  }

  /** The fox's sly snicker as he sneaks (heh-heh-heh): his recorded takes, or a soft stand-in. */
  function snicker() {
    if (!ready() || recorded('snicker')) return
    for (let i = 0; i < 3; i++) note(330 - i * 30, i * 0.14, 0.09, 0.05, 'triangle', 0.8)
  }

  /** The fox looming over the nest: a low growl, his recorded takes, or a rumbling stand-in. */
  function growl() {
    if (!ready() || recorded('growl')) return
    note(90, 0, 0.9, 0.1, 'sawtooth', 0.85)
    hiss(0, 0.9, 260, 3, 0.05)
  }

  /** The frog: a low ribbit, twice. */
  function croak() {
    if (!ready() || recorded('croak')) return
    for (const at of [0, 0.32]) {
      note(150, at, 0.16, 0.12, 'square', 0.8)
      hiss(at, 0.12, 700, 4, 0.05)
    }
  }

  /** Something round rolling through the grass. */
  function roll(seconds) {
    if (!ready()) return
    for (let t = 0; t < seconds; t += 0.12) hiss(t, 0.14, 500 + Math.random() * 200, 2, 0.06 * (1 - t / seconds))
  }

  /** Knock knock, on an eggshell. */
  function knock() {
    if (!ready() || recorded('knock')) return
    for (const at of [0.18, 0.5]) {
      note(1400, at, 0.05, 0.22, 'triangle', 0.6)
      hiss(at, 0.03, 3000, 2, 0.12)
    }
  }

  /** The woodpecker's roll on the bark: quick dry taps, fading. */
  function drum() {
    if (!ready() || recorded('drum')) return
    for (let i = 0; i < 14; i++) {
      note(1150, i * 0.055, 0.03, 0.14 * (1 - i / 18), 'triangle', 0.7)
      hiss(i * 0.055, 0.02, 2600, 2, 0.06 * (1 - i / 18))
    }
  }

  /** A goose high over the meadow, far off: a soft nasal honk. */
  function honk() {
    if (!ready() || recorded('honk')) return
    note(330, 0, 0.16, 0.05, 'sawtooth', 0.92)
    note(310, 0.22, 0.14, 0.04, 'sawtooth', 0.9)
  }

  /** The hedgehog snuffling: quick little sniffs through his nose. */
  function snuffle() {
    if (!ready() || recorded('snuffle')) return
    for (let i = 0; i < 4; i++) hiss(i * 0.09, 0.06, 1800 + i * 150, 3, 0.07)
  }

  /** One peck of the woodpecker's beak on the bark: a small dry tok. */
  function peck() {
    if (!ready() || recorded('peck')) return
    note(1250, 0, 0.04, 0.2, 'triangle', 0.65)
    hiss(0, 0.025, 2800, 2, 0.08)
  }

  /** An acorn on his head: a small hollow wooden tok. */
  function bonk() {
    if (!ready() || recorded('bonk')) return
    note(950, 0, 0.09, 0.3, 'triangle', 0.55)
    note(420, 0.01, 0.12, 0.12, 'sine', 0.8)
    hiss(0, 0.04, 2500, 2, 0.12)
  }

  /** The mouse: two little squeaks. */
  function squeak() {
    if (!ready()) return
    note(2200, 0, 0.09, 0.08, 'sine', 1.3)
    note(2500, 0.14, 0.08, 0.07, 'sine', 1.25)
  }

  /** A small animal's sneeze: a breath in, then "tchoo". */
  function sneeze() {
    if (!ready() || recorded('sneeze')) return
    hiss(0, 0.25, 1400, 1, 0.05)
    hiss(0.3, 0.12, 3200, 1.5, 0.25)
    note(900, 0.3, 0.1, 0.06, 'triangle', 0.6)
  }

  /** The owl: its call, soft and calm, "hooo… hu-hoooo". */
  function hoot() {
    if (!ready() || recorded('hoot')) return
    note(410, 0, 0.6, 0.06, 'sine', 0.94)
    note(380, 1.0, 0.14, 0.04, 'sine', 0.97)
    note(395, 1.2, 0.75, 0.06, 'sine', 0.9)
  }

  /** The owl woken in its hole: one drowsy "hoo?", rising. */
  function hootSleepy() {
    if (!ready() || recorded('hootSleepy')) return
    note(300, 0, 0.45, 0.05, 'sine', 1.25)
  }

  /** The chick: a few high peeps. */
  function peep() {
    if (!ready()) return
    for (let i = 0; i < 3; i++) note(2600 + Math.random() * 400, i * 0.16, 0.08, 0.07, 'sine', 1.4)
  }

  /** The shell cracking. */
  function crack() {
    if (!ready()) return
    for (let i = 0; i < 4; i++) hiss(i * 0.04, 0.05, 2400 + i * 400, 4, 0.3)
  }

  /** The hen: a soft "bok bok bok". */
  function cluck() {
    if (!ready() || recorded('cluck')) return
    for (let i = 0; i < 3; i++) {
      note(420 - i * 20, i * 0.2, 0.11, 0.12, 'square', 0.7)
      hiss(i * 0.2, 0.06, 1200, 3, 0.05)
    }
  }

  /** A pole planted in the ground: a wooden tok. */
  function plink() {
    if (!ready() || recorded('plink')) return
    note(520, 0, 0.12, 0.2, 'triangle', 0.7)
    hiss(0, 0.05, 900, 2, 0.1)
  }

  /** A twig along the fence: one paling's soft wooden tok, `step` notes up a pentatonic scale from G:
   * its take, pitched, or a stand-in. */
  function tock(step) {
    if (!ready()) return
    const PENTA = [0, 2, 4, 7, 9]
    const semis = 12 * Math.floor(step / PENTA.length) + PENTA[((step % PENTA.length) + PENTA.length) % PENTA.length]
    if (recorded('tock', null, { rate: 2 ** (semis / 12) })) return // its take, pitched up the scale
    const f = 392 * 2 ** (semis / 12)
    note(f, 0, 0.14, 0.12, 'triangle', 0.98)
    note(f * 2, 0, 0.05, 0.03, 'sine')
    hiss(0, 0.02, 2600, 2, 0.05)
  }

  /** A tug at something stuck: a low strain. */
  function tug() {
    if (!ready() || recorded('tug')) return
    hiss(0, 0.35, 260, 1.5, 0.18)
  }

  /** Something thrown: a whoosh. */
  function whoosh() {
    if (!ready() || recorded('whoosh')) return
    hiss(0, 0.5, 1500, 0.8, 0.12)
  }

  const RUMBLE_FADE = 0.6 // a recorded rumble, played for less than its take: faded out over this long

  /** The bulldozer, rolling: its engine for `seconds` (its takes over and over, if it rolls longer),
   * recorded, or a soft low rumble; `from`, `to`: how loud as it starts and ends (far off, faint;
   * coming closer, louder). */
  function rumble(seconds, from = 1, to = from) {
    if (!ready() || recorded('rumble', [Math.max(0, seconds - RUMBLE_FADE), RUMBLE_FADE], { swell: [from, to], loop: true })) return
    for (let t = 0; t < seconds; t += 0.25) hiss(t, 0.3, 110 + Math.random() * 40, 1.2, 0.05 * (from + ((to - from) * t) / seconds))
  }

  /** The bulldozer tipping nose-first into the pit: a heavy clunk, recorded, or a low thud. */
  function clunk() {
    if (!ready() || recorded('clunk')) return
    note(70, 0, 0.35, 0.2, 'sine', 0.6)
    hiss(0, 0.25, 300, 1, 0.2)
  }

  // The far wildlife's voices (wildlife.js, flock.js, heron.js): recorded takes, soft and far off, or
  // nothing at all: far away, silence is better than a synth standing in
  /** A finch in the far trees: a soft chirp. */
  const chirp = () => { if (ready()) recorded('chirp') }
  /** The heron taking off: one hoarse croak. */
  const heron = () => { if (ready()) recorded('heron') }
  /** A wild boar rooting, or tapped: a short grunt. */
  const grunt = () => { if (ready()) recorded('grunt') }
  /** The żubr, tapped: one slow, deep snort. */
  const snort = () => { if (ready()) recorded('snort') }

  /** A splash: into a tin of paint, or the spring. */
  function splash() {
    if (!ready() || recorded('splash')) return
    hiss(0, 0.35, 900, 0.7, 0.3)
    hiss(0.05, 0.25, 2400, 1.5, 0.15)
  }

  /** A brush, swished. */
  function swish() {
    if (!ready() || recorded('swish')) return
    for (const at of [0, 0.22]) hiss(at, 0.16, 3200, 1.2, 0.1)
  }

  /** The monster's "boo": three voices low and loud, for a cartoon fright. */
  function boo() {
    if (!ready() || recorded('boo')) return
    for (const f of [150, 190, 230]) note(f, 0, 0.7, 0.12, 'sawtooth', 0.7)
  }

  /** The fox, frightened: a quick yelp, his recorded takes, or a squeak. */
  function yelp() {
    if (!ready() || recorded('yelp')) return
    note(900, 0, 0.18, 0.15, 'square', 1.6)
  }

  /** Winding a clockwork key: a ratchet. */
  function crank() {
    if (!ready()) return
    for (let t = 0; t < 1.1; t += 0.09) {
      note(1800, t, 0.03, 0.08, 'square', 0.8)
      hiss(t, 0.02, 4000, 3, 0.05)
    }
  }

  /** Wind in the background, always on and very quiet, as the yard's. Returns set(level), level 0
   * (still) to 1 (a gust): louder, and a little higher. */
  function wind() {
    const c = ensure()
    const src = c.createBufferSource()
    src.buffer = noise
    src.loop = true
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 0.7
    const g = c.createGain()
    g.gain.value = 0.0001
    src.connect(bp).connect(g).connect(out)
    src.start()
    return (level) => {
      const now = c.currentTime
      g.gain.setTargetAtTime(0.004 + level * 0.03, now, 0.4)
      bp.frequency.setTargetAtTime(320 + level * 520, now, 0.4)
    }
  }

  /** A clockwork toy car whizzing along: a whirr that rises. */
  function vroom(seconds) {
    if (!ready()) return
    note(180, 0, seconds, 0.07, 'sawtooth', 1.8)
    note(360, 0, seconds, 0.04, 'square', 1.7)
  }

  return {
    ensure,
    /** The audio context and the master gain, for the music. */
    bus() { ensure(); return { ctx, master } },
    /** The game's hook: fn() says what is on screen now, { left, right } in the meadow (from). */
    hearFrom(fn) { view = fn },
    from,
    /** The game's hook: fn(word) as he says each word. */
    listen(fn) { heard = fn },
    /** Is sound on (after the first tap, and not held)? */
    get running() { return ready() && ctx.state === 'running' },
    say, hushEchoes, ECHO_GAP_S, dig, pop, bonk, water, bell, snicker, growl, croak, roll, knock, tock, squeak, sneeze, peep, crack, cluck, plink, tug, whoosh, rumble, splash, swish, clunk, boo, yelp, crank, vroom, wind, chirp, heron, grunt, snort, hoot, hootSleepy, drum, peck, snuffle, honk }
})()
