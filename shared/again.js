// Shared by every game: the corner sun shown after the end, for the
// grown-up. Held, it starts a new play (the page reloads); a tap there, or
// anywhere, does nothing (docs/DESIGN_PRINCIPLES.md: a new play only when a
// grown-up chooses). Not an intent, so a replay never reloads the page. One
// press at a time, followed by its own finger, so a second finger can't
// leave a timer running. The game draws the button (its page) and shows it
// at the end.

/* global Clock */
/* exported Again */
const Again = (() => {
  /** Watch the button: held holdMs, a new play. Its ring fills as long as the press takes. */
  function watch(button, holdMs) {
    let press = null
    button.style.setProperty('--hold', `${holdMs}ms`)
    button.addEventListener('pointerdown', (e) => {
      if (press) return
      button.classList.add('holding')
      press = { id: e.pointerId, timer: Clock.after(holdMs, () => location.reload()) }
    })
    const letGo = (e) => {
      if (!press || e.pointerId !== press.id) return
      button.classList.remove('holding')
      Clock.cancel(press.timer)
      press = null
    }
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(ev, letGo)
  }

  return { watch }
})()
