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
    holdingBone: false,
    pose: 'stand',
    worn: [],
    /** What a gag puts on him: noted as '<name> on' and '<name> off'. */
    wear(name, change) {
      if (!!change === r.wearing(name)) return
      calls.push(`${name} ${change ? 'on' : 'off'}`)
      r.worn = change ? [...r.worn, name] : r.worn.filter((n) => n !== name)
    },
    wearing: (name) => r.worn.includes(name),
    /** Any point of his (the bowl's top, where the bird lands): above his head. */
    pointAt: () => ({ x: r.x + 10 * r.facing, y: 600 }),
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
    /** What a gag reaches in the kit for: an ear perked, a noise told, his scale. */
    kit: { perk() {}, tell() {}, SCALE: 1.2 },
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

/** Sound and Music: every call is noted; Sound.from and Sound.scaled play their sound. */
function fakeSound() {
  const played = []
  const anything = () =>
    new Proxy(() => {}, {
      get: (_t, name) => (name === 'from' || name === 'scaled' ? (_d, play) => play() : (...a) => played.push(name) && undefined),
      apply: () => undefined,
    })
  return { Sound: anything(), Music: { react: anything(), setDusk() {}, setRain() {}, evening() {} }, played }
}

module.exports = { fakeReksio, fakeSound }
