// Where things stand in the meadow, and the page-address flags. The meadow
// is 4000 scene units wide and 900 high, and the view (1600 wide) follows
// the mole (view.js). From the left: the old oak at the edge of the wood
// (where the meadow ends: he stops at its arch), the egg's grass, his molehill (home) with the flower bed in front of it as in Krtek
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
  // The old oak (painting.js paints it, oak.js answers taps on it), whole in the first screen: the
  // arch between its root legs (x its middle, where he stops), its trunk's outline and its crown's
  // clumps of leaves [x, y, radius], in scene units
  const OAK = {
    x: 170,
    reach: 200, // the space bar this near its arch peeks into it
    hit: 640, // a tap on the trunk below this (its foot, at the meadow's edge) walks him there, except in the arch
    arch: 'M95 716 C95 610 118 478 170 444 C222 478 245 610 245 716 Z',
    trunk: 'M-14 716 C24 684 38 610 44 530 C50 450 34 370 52 300 C64 240 52 170 26 96 L96 70 C116 150 128 214 150 258 C168 196 172 126 166 40 L242 34 C240 130 236 196 246 252 C292 212 346 176 420 158 L432 206 C374 224 322 266 304 330 C290 404 300 500 318 580 C332 648 352 690 382 716 Z',
    crown: [[-30, 110, 92], [92, 48, 104], [226, 26, 98], [350, 96, 92], [416, 186, 62], [18, 214, 62], [168, 134, 74], [292, 176, 62], [-40, 250, 54]],
  }
  const DIG = { from: OAK.x, to: WORLD_W - 140 } // where a tap can send him: at the left, the oak's arch
  /** x kept within where he can go. */
  const clampX = (x) => Math.max(DIG.from, Math.min(DIG.to, x))

  const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
  const daySeconds = Number(params.get('day'))
  const props = params.has('props') ? params.get('props').split(',').filter(Boolean) : null
  const flags = { day: daySeconds > 0 ? daySeconds : null, props, soon: params.has('soon'), critters: params.get('critters'), wind: params.get('wind'), eclipse: params.get('eclipse') === 'now' ? 0 : Number(params.get('eclipse')) || null, menace: params.get('menace'), wild: params.get('wild') }

  return { WORLD_W, VIEW_W, GROUND, HOME, BED, SPRING, OAK, DIG, clampX, flags, dayMs: flags.day ? flags.day * 1000 : null }
})()
