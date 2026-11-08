// Where things stand in the meadow, and the page-address flags. The meadow
// is 4000 scene units wide and 900 high, and the view (1600 wide) follows
// the mole (view.js). From the left: the old oak at the edge of the wood
// (where the meadow ends: he stops at its arch), the egg's grass, his molehill (home) with the flower bed in front of it as in Krtek
// a buldozer, the poles' line, the spring and its pool, the car's grass, and
// the painter's garden behind its paling fence (where the meadow ends at the
// right: he stops at its corner).
//
// Flags (README): `?day=N` makes the day N seconds long instead of five
// minutes, for trying the evening and the ending; `?props=egg,poles` says
// which encounters come (things.js), and `?soon` brings the first at once;
// `?critters=now` brings a butterfly at once (critters.js), even in a still play;
// `?critters=snail` the snail, its shelter under the wild flowers wet from the start;
// `?critters=fireflies` the fireflies, at once, in daylight too; `?critters=geese` (autumn) geese going over at once;
// `?wind=gust` a strong gust that carries something, three seconds after he wakes;
// `?eclipse=11` an eclipse at 11:00 (and none other), `?eclipse=now` as he wakes
// (the sun is low then, behind the trees: 11 shows the moon over it);
// `?owl=1` an owl in the oak this play, `?owl=0` none, `?owl=out` out on its limb from the start;
// `?season=autumn` (or `spring`) this play's season; `?woodpecker=out` the autumn woodpecker out on the trunk from the start (`0` none).

/* global Debug */
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
    trunk: 'M-60 716 C-20 708 4 682 14 640 C26 588 8 540 12 480 C16 410 34 350 22 290 C14 246 -14 212 -60 186 L-60 120 C-14 140 32 176 58 214 C70 150 66 86 44 18 C36 -12 30 -50 26 -80 L146 -80 C146 -30 152 20 168 64 C178 100 182 150 176 196 C214 156 262 132 316 120 C370 108 400 76 452 64 C482 58 516 66 544 54 L556 84 C524 100 490 96 462 104 C414 118 384 150 330 166 C300 182 282 214 284 262 C286 330 290 396 298 456 C306 520 314 590 336 646 C352 684 384 704 430 716 Z',
    knot: [152, 300, 40, 52, -0.06], // the knot-hole up its trunk, where the owl sleeps (owl.js): x, y, its radii, its tilt
    perch: { x: 336, y: 340 }, // a broken-off limb out of the trunk's right side (painting.js paints it round this), low enough to be in every screen's picture: where the owl sits from dusk (owl.js)
    crown: [[-34, 34, 100], [82, -24, 108], [208, -20, 104], [326, 30, 92], [440, 18, 70], [536, 34, 50], [-46, 168, 58], [140, 82, 62], [276, 100, 52]],
  }
  // The painter's garden at the right end (after Krtek malířem: his thatched cottage, a ladder, paint tins,
  // a paling fence), painted by painting.js; fence.js draws the fence and answers taps on it. The fence
  // runs along the meadow's back edge from `from`, then at `corner` turns towards us and comes forward to the
  // picture's foot (`near`): he stops at x, side-on to that corner, all of it on the last screen. `gap`:
  // where two palings are missing from the back run, and the hen looks through.
  const FENCE = { x: 3700, from: 3300, corner: 3780, near: 3880, foot: 692, front: 905, tall: 168, every: 22, gap: 3566, cottage: 3540 }
  // the painter's colours (Krtek malířem): his tins about the garden (painting.js), and the three the hare
  // and the mouse bring from it for the fox (paint.js), each play three of these: bright, each reading on
  // the mole's black, the hare's brown and the mouse's grey
  const PAINTS = ['#e0453a', '#f2c94c', '#5b8fd6', '#f08fa6', '#8e6cc4', '#f2994a', '#5fb36a', '#ffffff']
  const DIG = { from: OAK.x, to: FENCE.x } // where a tap can send him: at the left, the oak's arch; at the right, the fence's corner
  /** x kept within where he can go. */
  const clampX = (x) => Math.max(DIG.from, Math.min(DIG.to, x))

  // The seasons (Adam, 2026-11-08: the meadow felt like spring only, the yard's winter gives it a variety the
  // meadow lacked). Each play is one season from start to bed, drawn from its own stream (drawn either way, so
  // ?season shifts nothing else), at these shares: autumn after Krtek a zápalky (world.yaml `autumn`), its oak
  // a horse chestnut. What belongs to one season only is listed in IN_SEASON (anything not listed is in both):
  // the egg and the owl are spring's; the hedgehog's leaves, the woodpecker and the swing are autumn's.
  const SEASONS = { spring: 0.5, autumn: 0.5 }
  const IN_SEASON = { egg: ['spring'], owl: ['spring'], hedgehog: ['autumn'], woodpecker: ['autumn'], swing: ['autumn'] }
  const inSeason = (name, season) => !IN_SEASON[name] || IN_SEASON[name].includes(season)

  const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')
  const daySeconds = Number(params.get('day'))
  const props = params.has('props') ? params.get('props').split(',').filter(Boolean) : null
  const flags = { day: daySeconds > 0 ? daySeconds : null, props, soon: params.has('soon'), critters: params.get('critters'), wind: params.get('wind'), eclipse: params.get('eclipse') === 'now' ? 0 : Number(params.get('eclipse')) || null, owl: params.get('owl'), woodpecker: params.get('woodpecker'), menace: params.get('menace'), wild: params.get('wild') }

  const drawn = (() => { // drawn whether or not ?season forces it
    let left = Debug.random('meadow-season')()
    const names = Object.keys(SEASONS)
    return names.find((n) => (left -= SEASONS[n]) < 0) ?? names[names.length - 1]
  })()
  const season = SEASONS[params.get('season')] !== undefined ? params.get('season') : drawn

  return { SEASONS, season, inSeason: (name) => inSeason(name, season), WORLD_W, VIEW_W, GROUND, HOME, BED, SPRING, OAK, FENCE, PAINTS, DIG, clampX, flags, dayMs: flags.day ? flags.day * 1000 : null }
})()
