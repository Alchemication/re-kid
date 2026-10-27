// Unit tests for ice.js: how rarely he slips on the winter ice. Once for each
// patch stepped onto, only at a trot, never in the first half minute nor
// twice within two minutes.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

function ice({ frozen = true } = {}) {
  const walker = () => ({ slipOn() {}, slipped: () => Promise.resolve() })
  const page = load(['debug.js', 'ice.js'], {
    query: '?seed=1',
    dom: true,
    globals: { Reksio: walker(), Boy: walker(), Sound: { plop() {} }, Layout: { puddles: [{ x: 1000, rx: 80 }, { x: 2000, rx: 80 }] }, Weather: { frozen } },
  })
  const Ice = page.get('Ice')
  return { page, slips: (x, v = 300, who = 'reksio') => !!Ice[who](x, v) }
}

/** Steps on and off both patches `times` times, at speed v; how many slips. */
function cross(t, times, v = 300, who = 'reksio') {
  let n = 0
  for (let i = 0; i < times; i++) for (const x of [500, 1000, 1500, 2000]) n += t.slips(x, v, who)
  return n
}

describe('slipping on the ice', () => {
  it('never in the first half minute', () => {
    const t = ice()
    assert.equal(cross(t, 50), 0)
  })

  it('now and then after that, and never twice within two minutes', async () => {
    const t = ice()
    await t.page.advance(31000)
    assert.equal(cross(t, 50), 1)
    await t.page.advance(60000)
    assert.equal(cross(t, 50), 0, 'again within two minutes')
    await t.page.advance(61000)
    assert.equal(cross(t, 50), 1)
  })

  it('only at a trot: walking carefully he keeps his feet', async () => {
    const t = ice()
    await t.page.advance(31000)
    assert.equal(cross(t, 50, 80), 0)
  })

  it('a draw only as he steps onto a patch, not every frame on it', async () => {
    const t = ice()
    await t.page.advance(31000)
    let n = 0
    for (let i = 0; i < 200; i++) n += t.slips(1000)
    assert.ok(n <= 1, `${n}`)
  })

  it('the boy slips too, and shares the two minutes: never one right after the other', async () => {
    const t = ice()
    await t.page.advance(31000)
    assert.equal(cross(t, 50, 300, 'boy'), 1)
    assert.equal(cross(t, 50), 0, 'Reksio right after the boy')
  })

  it('no ice, no slip (the puddles thawed)', async () => {
    const t = ice({ frozen: false })
    await t.page.advance(31000)
    assert.equal(cross(t, 50), 0)
  })
})
