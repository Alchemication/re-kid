// The day in the meadow, as plain rules with no drawing and no clock of its
// own (meadow.js tells it how long the mole has been up): a day on the sun,
// from 08:00 to 20:00, the same length whatever the child does, run only on
// what is always in the meadow (brief.yaml, principles). The sun crosses the
// sky and sets at 19:00; the tulips close as it goes down; the cricket comes
// out and fiddles; through the last hour the picture closes in a circle
// around the molehill; at 20:00 it is bedtime, and he goes down to sleep.

/* exported Day */
const Day = (() => {
  const START = 8 // the hour he wakes
  const END = 20 // bedtime
  const DAY_MS = 5 * 60 * 1000 // 08:00 to 20:00 in five minutes of play, as long as a day in Reksio's yard
  const SUNSET = 19 // the sun goes down behind the meadow
  const CRICKET = 19.2 // the cricket comes out and starts to fiddle
  const IRIS_FROM = 19 // the circle starts to close...
  const IRIS_LEFT = 0.16 // ...and by 20:00 is this much of the picture's width: the molehill and a little round it
  const TULIPS_OPEN = [8.2, 9] // the tulips open through the first part of the morning...
  const TULIPS_CLOSE = [18, 19.1] // ...and close as the sun goes down

  // The sky's colour through the day, top and bottom, by hour: a cool
  // morning, a clear blue day, the dusk orange, the night blue of Buldozer
  const SKY = [
    [8, '#c9dcf2', '#f4e3c2'],
    [10, '#8fb9ee', '#d7e7fb'],
    [17, '#8fb9ee', '#d7e7fb'],
    [18.6, '#e9a76b', '#f6d39a'],
    [19.3, '#4e4f86', '#d98a5b'],
    [20, '#1d2a5a', '#3e4b80'],
  ]

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
  const ease = (t) => t * t * (3 - 2 * t)
  /** 0 before `a`, 1 after `b`, smoothly between. */
  const between = (h, a, b) => ease(clamp((h - a) / (b - a)))

  /** The hour, from how long he has been up (ms of game time); `dayMs` makes a shorter day for trying it. */
  function hour(upMs, dayMs = DAY_MS) {
    return clamp(START + ((END - START) * upMs) / dayMs, START, END)
  }

  /** What part of the day it is: 'day', 'dusk' (the sun down, the cricket out) or 'bedtime'. */
  function phase(h) {
    if (h >= END) return 'bedtime'
    if (h >= SUNSET) return 'dusk'
    return 'day'
  }

  /** Is the cricket out and fiddling? */
  const cricket = (h) => h >= CRICKET && h < END

  /** How open the tulips are, 0 (a closed bud) to 1. */
  function tulips(h) {
    return between(h, ...TULIPS_OPEN) * (1 - between(h, ...TULIPS_CLOSE))
  }

  /** The circle round the molehill, as a share of the picture's width: 1 (all of it) until 19:00, IRIS_LEFT at 20:00. */
  function iris(h) {
    return 1 - (1 - IRIS_LEFT) * clamp((h - IRIS_FROM) / (END - IRIS_FROM))
  }

  /** Where the sun is: `across` 0 (left) to 1 (right), `up` 0 (on the horizon) to 1 (highest); null once it has set. */
  function sun(h) {
    if (h >= SUNSET) return null
    const t = (h - START) / (SUNSET - START)
    return { across: 0.08 + 0.84 * t, up: Math.sin(Math.PI * clamp(t * 1.04)) }
  }

  /** The moon after sunset: `up` 0 to 1 through the last hour; null before. */
  function moon(h) {
    return h < SUNSET ? null : { up: between(h, SUNSET, END) }
  }

  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const mix = (a, b, t) => `#${hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('')}`

  /** The sky's top and bottom colours at this hour. */
  function sky(h) {
    let i = SKY.findIndex(([at]) => at > h)
    if (i === -1) return { top: SKY[SKY.length - 1][1], bottom: SKY[SKY.length - 1][2] }
    if (i === 0) return { top: SKY[0][1], bottom: SKY[0][2] }
    const [a, b] = [SKY[i - 1], SKY[i]]
    const t = (h - a[0]) / (b[0] - a[0])
    return { top: mix(a[1], b[1], t), bottom: mix(a[2], b[2], t) }
  }

  /** The hour as a clock would show it, for the overlay and the trace. */
  const clock = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`

  return { START, END, DAY_MS, SUNSET, hour, phase, cricket, tulips, iris, sun, moon, sky, clock }
})()
