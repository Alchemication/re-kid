// Where things stand in the meadow, and the page-address flags. The meadow
// is one screen wide (1600 by 900 scene units); the molehill, his home,
// stands left of the middle with the flower bed in front of it and the
// spring to the right, as in Krtek a buldozer.
//
// Flags (README): `?day=N` makes the day N seconds long instead of five
// minutes, for trying the evening and the ending; `?props=egg,poles` says
// which encounters come (things.js), and `?soon` brings the first at once.

/* exported Layout */
const Layout = (() => {
  const GROUND = 720 // the line the molehills stand on
  const HOME = 560 // his molehill
  const BED = { from: 660, to: 960 } // the flower bed, in front of the molehill
  const SPRING = 1250 // the spring and its pool
  const DIG = { from: 140, to: 1460 } // where a tap can send him

  const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
  const daySeconds = Number(params.get('day'))
  const props = params.has('props') ? params.get('props').split(',').filter(Boolean) : null
  const flags = { day: daySeconds > 0 ? daySeconds : null, props, soon: params.has('soon') }

  return { GROUND, HOME, BED, SPRING, DIG, flags, dayMs: flags.day ? flags.day * 1000 : null }
})()
