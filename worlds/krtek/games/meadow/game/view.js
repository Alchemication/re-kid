// The view onto the meadow: a screen's worth (1600 scene units) of the 4000
// wide meadow, following the mole where he is drawn, easing after him, never
// past either end. The sky stays put; the far trees scroll at half speed, for
// depth; everything on the ground scrolls with the view (#cam).
//
// The yard's painting.js does the same for Reksio, with its own painting.
// Once both scenes have settled, what is the same in the two (the camera, the
// fit to the screen) is the part to move into shared/ (CLAUDE.md, "Shared
// parts"); until then each world keeps its own.

/* global Clock, Layout */
/* exported View */
const View = (() => {
  const EASE = 0.12 // each frame the view goes this share of the way to where it should be
  const FAR_SPEED = 0.5 // the far trees scroll this much slower than the ground
  const DISTANT_SPEED = 0.1 // the church's hill, far off, barely moves: in sight wherever he is
  const MAX = Layout.WORLD_W - Layout.VIEW_W

  let camX = 0
  let target = () => 0 // where to keep in the middle (the mole, as drawn)
  let cam, far, distant, onMove

  /** Start following `follow()` (a scene x); `moved(camX)` hears each move. */
  function setup(follow, moved) {
    cam = document.getElementById('cam')
    far = document.getElementById('far-view')
    distant = document.getElementById('distant-view')
    target = follow
    onMove = moved
    camX = clamp(target() - Layout.VIEW_W / 2)
    draw()
    const frame = () => {
      const to = clamp(target() - Layout.VIEW_W / 2)
      if (Math.abs(to - camX) > 0.5) {
        camX += (to - camX) * EASE
        draw()
      } else if (onMove) onMove(camX) // he may move while the view stays (at either end): whoever follows him hears it
      Clock.after(0, frame)
    }
    Clock.after(0, frame)
  }

  const clamp = (x) => Math.max(0, Math.min(MAX, x))

  function draw() {
    cam.style.transform = `translateX(${-camX}px)`
    far.style.transform = `translateX(${-camX * FAR_SPEED}px)`
    distant.style.transform = `translateX(${-camX * DISTANT_SPEED}px)`
    if (onMove) onMove(camX)
  }

  /** A point on the screen's scene (as svg coordinates give it) in the meadow's own: add the view's offset. */
  const toWorld = (x) => x + camX

  /** Where something at x in the distant layer shows, as a meadow x (for the mole to look at it). */
  const fromDistant = (x) => camX + x - camX * DISTANT_SPEED

  return { setup, toWorld, fromDistant, get x() { return camX } }
})()
