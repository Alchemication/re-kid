// Copied from shared/filmlook.js by `main.py shared` — edit that, not this.
// The look of an old cartoon print, laid over a game's picture: grain that
// changes as the film runs, faded warm colours, a soft vignette, and now and
// then a speck of dust or a hair caught in the gate. On unless the page
// address turns it off (`?film=0`). Its looks are set here, not in the
// game's stylesheet, so a game only calls mount().
//
// Tried and left out (Adam, 2026-10-18; docs/DECISIONS.md): drawing on twos,
// which made Reksio stutter; scratches down the picture, which looked like a
// glitch; flicker, and the picture weaving in the gate, which made the whole
// screen restless.
//
// For a toddler: it never catches a tap (pointer-events: none), and a speck
// is gone in a moment, so it isn't something to chase.
//
// Its random draws are its own stream and it moves on the game's Clock, so a
// seeded play is the same with it or without it, and it pauses with the game.

// Shared by every game: it uses only other shared parts (CLAUDE.md, "Shared parts").
/* global Clock, Debug */
/* exported FilmLook */
const FilmLook = (() => {
  const GRADE = 'saturate(0.88) sepia(0.06) contrast(1.03) brightness(1.02)' // faded and a little warmer, not sad (Adam's first try, at sepia 0.14, was)
  const TINT = 'radial-gradient(ellipse 75% 80% at 50% 50%, transparent 62%, rgba(35, 22, 8, 0.24)), rgba(255, 220, 160, 0.04)' // the vignette, over a warm wash
  const STEP_MS = 1000 / 12 // the grain moves on this often: a film's pace, not the screen's
  const GRAIN_PX = 256 // the grain tile, in canvas pixels…
  const GRAIN_CSS_PX = 160 // …shown this big: grains about two screen pixels on a phone
  const GRAIN_ALPHA = 46 // the strongest grain, of 255
  const SPECK_CHANCE = 0.03 // a dust speck on this share of steps: one every three seconds or so…
  const SPECK_STEPS = [1, 2] // …held a step or two
  const LIGHT_SPECK = 0.25 // this share of specks are light (dust on the negative), the rest dark
  const SPECK_PX = [2.5, 6] // a speck's size, big enough to read as dust on a phone
  const HAIR_CHANCE = 0.005 // a hair caught in the gate, about every fifteen seconds…
  const HAIR_STEPS = [2, 5] // …held for a few steps
  const INK = '#1b130b'
  const SVG_NS = 'http://www.w3.org/2000/svg'

  const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search)
  const on = params.get('film') !== '0'
  const random = Debug.random('film-look')
  const rnd = (lo, hi) => lo + random() * (hi - lo)

  /** A tile of grain: each pixel a little lighter or darker, made once from
   * the look's own stream. */
  function grainTile() {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = GRAIN_PX
    const ctx = canvas.getContext('2d')
    const img = ctx.createImageData(GRAIN_PX, GRAIN_PX)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = random() < 0.5 ? 20 : 255
      img.data[i] = v
      img.data[i + 1] = v * 0.94
      img.data[i + 2] = v * 0.84
      img.data[i + 3] = random() ** 2 * GRAIN_ALPHA
    }
    ctx.putImageData(img, 0, 0)
    return canvas.toDataURL()
  }

  /** A layer over the whole picture that never catches a tap. */
  function layer(picture, style) {
    const el = document.createElement('div')
    el.setAttribute('aria-hidden', 'true')
    Object.assign(el.style, { position: 'absolute', inset: '0', pointerEvents: 'none' }, style)
    picture.appendChild(el)
    return el
  }

  function svgEl(tag, parent, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    parent.appendChild(el)
    return el
  }

  /** A blot of dust: a rough round shape, never quite a circle. */
  function blot(x, y, r) {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2
      const k = r * rnd(0.6, 1.2)
      return `${(x + Math.cos(a) * k).toFixed(1)} ${(y + Math.sin(a) * k).toFixed(1)}`
    })
    return `M${pts.join(' L')} Z`
  }

  /** Lay the print over `picture` (an element that clips what's in it: the
   * yard's stage, the meadow's page) and run it, unless the page said not to. */
  function mount(picture) {
    if (!on) return
    picture.style.filter = GRADE
    layer(picture, { background: TINT })
    // a tile of grain, larger than the picture so it can shift each step
    const grain = layer(picture, {
      inset: `0 -${GRAIN_CSS_PX}px -${GRAIN_CSS_PX}px 0`,
      backgroundImage: `url(${grainTile()})`,
      backgroundSize: `${GRAIN_CSS_PX}px`,
      willChange: 'transform',
    })
    const marks = svgEl('svg', layer(picture), { width: '100%', height: '100%' })
    const speck = svgEl('path', marks)
    const hair = svgEl('path', marks, { fill: 'none', stroke: INK, 'stroke-width': 1.2, opacity: 0.7 })
    let speckLeft = 0
    let hairLeft = 0

    function step() {
      // a new piece of film: the grain shifts
      grain.style.transform = `translate(${-rnd(0, GRAIN_CSS_PX).toFixed(0)}px, ${-rnd(0, GRAIN_CSS_PX).toFixed(0)}px)`
      // dust: a speck for a moment, mostly dark, now and then light
      if (speckLeft > 0) speckLeft -= 1
      else if (random() < SPECK_CHANCE) {
        speckLeft = Math.round(rnd(...SPECK_STEPS))
        speck.setAttribute('d', blot(rnd(0, picture.clientWidth), rnd(0, picture.clientHeight), rnd(...SPECK_PX)))
        speck.setAttribute('fill', random() < LIGHT_SPECK ? '#fff6e2' : INK)
        speck.setAttribute('opacity', 0.8)
      }
      if (!speckLeft) speck.setAttribute('d', '')
      // a hair: a loose curl near an edge, held a few steps
      if (hairLeft > 0) hairLeft -= 1
      else if (random() < HAIR_CHANCE) {
        hairLeft = Math.round(rnd(...HAIR_STEPS))
        const w = picture.clientWidth
        const x = random() < 0.5 ? rnd(0, w * 0.15) : rnd(w * 0.85, w)
        const y = rnd(0, picture.clientHeight)
        const s = rnd(18, 40)
        hair.setAttribute('d', `M${x} ${y} c${s * 0.4} ${-s * 0.5} ${s} ${-s * 0.2} ${s * 0.7} ${s * 0.4} s${-s * 0.6} ${s * 0.5} ${-s * 0.2} ${s}`)
      }
      if (!hairLeft) hair.setAttribute('d', '')
    }

    Clock.every(STEP_MS, step)
  }

  return { on, mount }
})()
