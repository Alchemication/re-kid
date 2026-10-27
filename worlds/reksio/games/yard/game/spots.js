// The action spots: where Reksio must stand to use each thing, a wide oval
// on the ground, drawn faintly, lit when he stands in it or the mouse is
// over its thing. Generous on purpose. Every spot looks the same: nothing is
// a goal. yard.js decides when one lights up; this says where they are.

/* global Layout, Things, Bird, Reksio, Mushrooms, Snowman */
/* exported Spots */
const Spots = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const X = (name) => Layout.x(name)
  // x = centre, r = half-width, both scene units
  const SPOTS = {
    house: () => ({ x: 410, r: 70 }),
    doghouse: () => ({ x: 560, r: 130 }),
    bowl: () => ({ x: 830 + X('bowl'), r: 120 }),
    tap: () => ({ x: 1260 + X('tap'), r: 120 }),
    flowers: () => ({ x: 1570 + X('flowers'), r: 130 }),
    dig: () => ({ x: 2060 + X('dig'), r: 130 }),
    film: () => ({ x: 2430 + X('film'), r: 220 }),
    gate: () => ({ x: Layout.MAX_X + 20, r: 90 }),
    bird: () => ({ x: Bird.perch.x - 30, r: 130 }), // on the ground, under the bird
    trap: () => ({ x: (Things.mouse === 'fed' ? 960 : 1000) + X('trap'), r: 110 }),
    tree: () => ({ x: 1600 + X('tree'), r: 120 }),
    berries: () => ({ x: 2330 + X('berries'), r: 110 }),
    hen: () => ({ x: Things.THINGS.hen.at() + 20, r: 100 }), // by the ladder, wherever it leans now
    porcino: () => ({ x: Mushrooms.spotX('porcino'), r: 60 }), // by the nearest porcino
    agaric: () => ({ x: Mushrooms.spotX('agaric'), r: 60 }),
    stones: () => ({ x: Snowman.spotX('stones'), r: 70 }), // the snowman's, in winter
    stick: () => ({ x: Snowman.spotX('stick'), r: 70 }),
    snowman: () => ({ x: Snowman.spotX('snowman'), r: 90 }),
  }
  const MOVING = ['trap', 'hen', 'porcino'] // these spots move (the mouse fed, the ladder moved, a porcino picked)
  const WAITING = ['trap', 'tree', 'hen', 'porcino', 'agaric', 'stones', 'stick', 'snowman'] // hidden until there's something to do there
  const els = {}

  /** Make the spots of the things out this play. */
  function init() {
    for (const name of Object.keys(SPOTS)) {
      if (Layout.hidden.includes(name)) continue
      const e = document.createElementNS(SVG_NS, 'ellipse')
      e.setAttribute('class', 'spot')
      e.setAttribute('data-thing', name)
      e.setAttribute('cy', '826')
      e.setAttribute('ry', '30')
      document.getElementById('spots').appendChild(e)
      els[name] = e
      const { x, r } = SPOTS[name]()
      e.setAttribute('cx', x)
      e.setAttribute('rx', r)
    }
  }

  /** The thing whose spot Reksio is standing in (nearest centre wins). */
  function nearest() {
    let best = null
    for (const name of Object.keys(els)) {
      if (!Things.ready(name)) continue
      const { x, r } = SPOTS[name]()
      const d = Math.abs(Reksio.x - x)
      if (d <= r && (!best || d < best.d)) best = { name, d }
    }
    return best && best.name
  }

  /** Every frame: the spots that move, and those that wait for someone. */
  function frame() {
    if (els.bird) {
      els.bird.setAttribute('cx', SPOTS.bird().x)
      els.bird.style.opacity = Bird.flying ? '0' : ''
    }
    for (const n of MOVING) if (els[n]) els[n].setAttribute('cx', SPOTS[n]().x)
    for (const n of WAITING) if (els[n]) els[n].style.opacity = Things.ready(n) ? '' : '0'
  }

  return {
    init, nearest, frame,
    /** Is this thing out this play (it has a spot)? */
    out: (name) => !!els[name],
    /** Light the spot Reksio stands in (or none). */
    show(name) {
      for (const [n, e] of Object.entries(els)) e.classList.toggle('on', n === name)
    },
    /** The mouse over a thing: its spot lit too. */
    hover(name, on) {
      els[name]?.classList.toggle('hover', on)
    },
  }
})()
