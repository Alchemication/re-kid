// Shared by every game: a phone held upright shows the scene too small to
// play, so instead a picture asks (without words) to turn it on its side,
// and the game waits until it is. The game draws the picture (its page's
// #turn, with its own hero in the little phone) and says when to ask: each
// time the screen changes shape, with its own rule or `upright()`.

/* global Clock, Debug */
/* exported Turn */
const Turn = (() => {
  const PHONE_W = 600 // held upright and narrower than this: a phone (a tablet upright plays fine)

  /** Is the screen a phone held upright? */
  const upright = () => window.innerHeight > window.innerWidth && window.innerWidth < PHONE_W

  /** Show the picture and hold the game (on), or let it go on. The game is held
   * before the picture shows, and let go after it hides. */
  function ask(on) {
    const picture = document.getElementById('turn')
    if (!picture || picture.hidden !== on) return
    Debug.trace('turn me', { on })
    if (on) Clock.hold('turned', true)
    picture.hidden = !on
    if (!on) Clock.hold('turned', false)
  }

  return { ask, upright }
})()
