// Where things stand in the meadow, and the page-address flags. The meadow
// is 4000 scene units wide and 900 high, and the view (1600 wide) follows
// the mole (view.js). From the left: the edge of the forest, the egg's
// grass, his molehill (home) with the flower bed in front of it as in Krtek
// a buldozer, the poles' line, the spring and its pool, and the car's grass
// on the far side.
//
// Flags (README): `?day=N` makes the day N seconds long instead of five
// minutes, for trying the evening and the ending; `?props=egg,poles` says
// which encounters come (things.js), and `?soon` brings the first at once;
// `?critters=now` brings a butterfly at once (critters.js), even in a still play;
// `?critters=snail` the snail, its shelter under the wild flowers wet from the start;
// `?critters=fireflies` the fireflies, at once, in daylight too;
// `?wind=gust` a strong gust that carries something, three seconds after he wakes;
// `?eclipse=11` an eclipse at 11:00 (and none other), `?eclipse=now` as he wakes
// (the sun is low then, behind the trees: 11 shows the moon over it).

/* exported Layout */
const Layout = (() => {
  const WORLD_W = 4000 // the whole meadow: about two and a half screens, room to go somewhere
  const VIEW_W = 1600 // what a screen shows of it
  const GROUND = 720 // the line the molehills stand on
  const HOME = 900 // his molehill
  const BED = { from: 1000, to: 1300 } // the flower bed, in front of the molehill
  const SPRING = 2350 // the spring and its pool
  const DIG = { from: 140, to: WORLD_W - 140 } // where a tap can send him

  const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
  const daySeconds = Number(params.get('day'))
  const props = params.has('props') ? params.get('props').split(',').filter(Boolean) : null
  const flags = { day: daySeconds > 0 ? daySeconds : null, props, soon: params.has('soon'), critters: params.get('critters'), wind: params.get('wind'), eclipse: params.get('eclipse') === 'now' ? 0 : Number(params.get('eclipse')) || null }

  return { WORLD_W, VIEW_W, GROUND, HOME, BED, SPRING, DIG, flags, dayMs: flags.day ? flags.day * 1000 : null }
})()
