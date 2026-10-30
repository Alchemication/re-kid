// What only a grown-up does in the yard: a press held, not a tap (a toddler
// taps). Holding the house brings the evening now: the sun hurries down
// (yard.js, day.js); a quick tap on it is still a tap, answered as the finger
// lifts. After the end, holding the sun in the corner starts a new morning
// (again.js, shared). One press at a time, followed by its own finger, so a
// second finger can't leave a timer running.

/* global Clock, Again */
/* exported GrownUp */
const GrownUp = (() => {
  const HOLD_MS = 2000 // held this long, a press is a grown-up's

  let perform = () => {}
  let housePress = null // { id, timer }

  /** A press on the house began (yard.js passes it here instead of tapping). */
  function pressHouse(e) {
    if (housePress) return
    housePress = { id: e.pointerId, timer: Clock.after(HOLD_MS, () => {
      housePress = null
      perform('evening now')
    }) }
  }

  /** A finger lifted (tapped) or the press was lost: the house's tap, if
   * that was its finger and it wasn't held. */
  function letGoOfHouse(e, tapped) {
    if (!housePress || (e.pointerId !== undefined && e.pointerId !== housePress.id)) return
    Clock.cancel(housePress.timer)
    housePress = null
    if (tapped) perform('go to house')
  }

  /** hooks.perform: the yard's way to act on an intent. */
  function init(hooks) {
    perform = hooks.perform
    Again.watch(document.getElementById('again'), HOLD_MS) // the corner sun, shown after the end (yard.js)
  }

  return { HOLD_MS, init, pressHouse, letGoOfHouse }
})()
