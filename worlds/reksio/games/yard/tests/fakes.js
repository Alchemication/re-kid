// Stand-ins for the parts of the game a unit test isn't about, so a script
// can be loaded on its own (see load.js, `globals`). Each records what it was
// asked to do.

/** A Reksio whose gestures end at once. walkTo moves him there, unless the
 * test sets `cut` (a tap elsewhere): then it resolves false and he stays. */
function fakeReksio(x = 1500) {
  const calls = []
  const r = {
    calls,
    cut: false,
    x,
    facing: 1,
    MIN_X: 380,
    MAX_X: 3650,
    holdingBone: false,
    async walkTo(to) {
      calls.push('walkTo')
      if (r.cut) return false
      r.x = to
      return true
    },
    face(dir) {
      r.facing = dir
    },
    mouth: () => ({ x: r.x + 60 * r.facing, y: 640 }),
    async stamp(onThump) {
      calls.push('stamp')
      if (onThump) onThump()
    },
  }
  // any other gesture: noted, and over at once
  return new Proxy(r, {
    get: (target, name) => (name in target || name === 'then' ? target[name] : async () => calls.push(name)),
  })
}

/** Sound and Music: every call is noted; Sound.from plays its sound. */
function fakeSound() {
  const played = []
  const anything = () =>
    new Proxy(() => {}, {
      get: (_t, name) => (name === 'from' ? (_d, play) => play() : (...a) => played.push(name) && undefined),
      apply: () => undefined,
    })
  return { Sound: anything(), Music: { react: anything(), setDusk() {}, setRain() {}, evening() {} }, played }
}

module.exports = { fakeReksio, fakeSound }
