// Where things stand in the meadow, and the page-address flags. The meadow
// is one screen wide (1600 by 900 scene units); the molehill, his home,
// stands left of the middle with the flower bed in front of it and the
// spring to the right, as in Krtek a buldozer.
//
// Flags: `?day=N` makes the day N seconds long instead of five minutes, for
// trying the evening and the ending (README).

/* exported Layout */
const Layout = (() => {
  const GROUND = 720 // the line the molehills stand on
  const HOME = 560 // his molehill
  const BED = { from: 660, to: 960 } // the flower bed, in front of the molehill
  const SPRING = 1250 // the spring and its pool
  const DIG = { from: 140, to: 1460 } // where a tap can send him

  const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
  const daySeconds = Number(params.get('day'))
  const flags = { day: daySeconds > 0 ? daySeconds : null }

  return { GROUND, HOME, BED, SPRING, DIG, flags, dayMs: flags.day ? flags.day * 1000 : null }
})()
