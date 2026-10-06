// Unit tests for debug.js: seeded streams, the trace, cut-short gestures, rules.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { load } = require('./load')

const draws = (page, name, n = 5) => page.json(`Array.from({ length: ${n} }, Debug.random('${name}'))`)
const abort = () => Object.assign(new Error('cancelled'), { name: 'AbortError' })

describe('seeded streams', () => {
  it('replays the same numbers from the same seed', () => {
    assert.deepEqual(draws(load(['debug.js'], { query: '?seed=42' }), 'yard'), draws(load(['debug.js'], { query: '?seed=42' }), 'yard'))
  })

  it('gives different numbers for another seed', () => {
    assert.notDeepEqual(draws(load(['debug.js'], { query: '?seed=42' }), 'yard'), draws(load(['debug.js'], { query: '?seed=43' }), 'yard'))
  })

  it('gives each part its own stream', () => {
    const page = load(['debug.js'], { query: '?seed=42' })
    assert.notDeepEqual(draws(page, 'yard'), draws(page, 'things'))
  })

  it('keeps a stream unchanged however much another one draws', () => {
    const page = load(['debug.js'], { query: '?seed=7' })
    const before = draws(page, 'yard')
    draws(page, 'fx', 1000)
    assert.deepEqual(draws(page, 'yard'), before)
  })

  it('draws numbers in [0, 1)', () => {
    const xs = draws(load(['debug.js'], { query: '?seed=1' }), 'yard', 10000)
    assert.ok(xs.every((x) => x >= 0 && x < 1))
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length
    assert.ok(Math.abs(mean - 0.5) < 0.02, `mean ${mean}`)
  })

  it('picks a seed when none is given, and says how to replay it', () => {
    const page = load(['debug.js'])
    assert.equal(page.get('Debug.seeded'), false)
    assert.match(page.logs.info[0], new RegExp(`replay with \\?seed=${page.get('Debug.seed')}`))
  })

  it('treats a seed as a 32-bit number', () => {
    assert.equal(load(['debug.js'], { query: '?seed=-1' }).get('Debug.seed'), 2 ** 32 - 1)
  })

  it('puts the seed into the replay address, keeping the other flags', () => {
    const url = load(['debug.js'], { query: '?mains=trap&seed=9' }).get('Debug.replayUrl()')
    assert.match(url, /mains=trap/)
    assert.match(url, /seed=9/)
  })
})

describe('trace', () => {
  it('keeps the latest events only', () => {
    const page = load(['debug.js'])
    page.get('for (let i = 0; i < 1000; i++) Debug.trace("tick", { i })')
    const events = page.json('Debug.events')
    assert.equal(events.length, 300)
    assert.equal(events.at(-1).i, 999)
  })

  it('dumps one line per event', () => {
    const page = load(['debug.js'])
    page.get('Debug.trace("ask", { what: "bark" }); Debug.trace("evening")')
    const lines = page.get('Debug.dump()').split('\n')
    assert.equal(lines.length, 2)
    assert.match(lines[0], /ask \{"what":"bark"\}/)
  })
})

describe('ignoreCut', () => {
  it('lets a cut-short gesture through quietly, noted in the trace', async () => {
    const page = load(['debug.js'])
    page.get('globalThis.abort = ' + abort.toString())
    await page.get('Debug.ignoreCut(Promise.reject(abort()), "sniff")')
    assert.deepEqual(page.logs.error, [])
    assert.equal(page.json('Debug.events').at(-1).kind, 'cut')
  })

  it('reports any other error, with the trace and the replay address', async () => {
    const page = load(['debug.js'], { query: '?seed=5' })
    await page.get('Debug.ignoreCut(Promise.reject(new TypeError("x is undefined")), "use bowl")')
    assert.equal(page.logs.error.length, 1)
    assert.match(page.logs.error[0], /use bowl.*x is undefined/s)
    assert.match(page.logs.error[0], /seed=5/)
    assert.equal(page.json('Debug.events').at(-1).kind, 'error')
  })

  it('resolves either way, so whoever awaits it carries on', async () => {
    const page = load(['debug.js'])
    assert.equal(await page.get('Debug.ignoreCut(Promise.reject(new Error("no")), "x").then(() => "on")'), 'on')
  })

  it('passes a finished gesture through', async () => {
    const page = load(['debug.js'])
    await page.get('Debug.ignoreCut(Promise.resolve(1), "x")')
    assert.deepEqual(page.logs.error, [])
    assert.deepEqual(page.json('Debug.events'), [])
  })
})

describe('uncaught errors', () => {
  it('silences a cut-short gesture nobody awaited', () => {
    const page = load(['debug.js'])
    let prevented = false
    page.fire('unhandledrejection', { reason: abort(), preventDefault: () => (prevented = true) })
    assert.ok(prevented)
  })

  it('notes other unhandled rejections in the trace and leaves them to the console', () => {
    const page = load(['debug.js'])
    let prevented = false
    page.fire('unhandledrejection', { reason: new Error('boom'), preventDefault: () => (prevented = true) })
    assert.equal(prevented, false)
    assert.equal(page.json('Debug.events').at(-1).message, 'boom')
  })
})

describe('rules', () => {
  it('reports a broken rule once while it stays broken', () => {
    const page = load(['debug.js'])
    page.get('Debug.check("r", false); Debug.check("r", false)')
    assert.equal(page.logs.error.length, 1)
    assert.match(page.logs.error[0], /rule broken: r/)
  })

  it('reports it again if it breaks again after holding', () => {
    const page = load(['debug.js'])
    page.get('Debug.check("r", false); Debug.check("r", true); Debug.check("r", false)')
    assert.equal(page.logs.error.length, 2)
  })

  it('stays quiet while a rule holds', () => {
    const page = load(['debug.js'])
    page.get('Debug.check("r", true)')
    assert.deepEqual(page.logs.error, [])
  })
})

describe('recorder', () => {
  it('notes every input from the start, and returns it', () => {
    const page = load(['debug.js'])
    assert.equal(page.get('Debug.input("go to bowl")'), 'go to bowl')
    page.get('Debug.input("walk to 1830")')
    assert.deepEqual(page.json('Debug.inputs.map((i) => i.intent)'), ['go to bowl', 'walk to 1830'])
  })

  it('keeps inputs from the start even when the trace has moved on', () => {
    const page = load(['debug.js'])
    page.get('Debug.input("press"); for (let i = 0; i < 1000; i++) Debug.trace("tick")')
    assert.equal(page.json('Debug.inputs')[0].intent, 'press')
  })

  it('snapshots the state on every tick, keeping the last two minutes', () => {
    const page = load(['debug.js'])
    page.get('let n = 0; Debug.record(() => ({ n: n++ }))')
    for (let i = 0; i < 300; i++) page.tick()
    const snaps = page.json('Debug.snapshots')
    assert.equal(snaps.length, 240)
    assert.equal(snaps.at(-1).n, 299)
  })

  it('puts everything needed for a replay into a bug report', () => {
    const page = load(['debug.js'], { query: '?seed=8&mains=trap' })
    page.get('Debug.record(() => ({ busy: true })); Debug.input("go to trap"); Debug.check("r", false)')
    page.tick()
    const r = page.json('Debug.bugReport("he froze at the trap")')
    assert.equal(r.version, 1)
    assert.equal(r.description, 'he froze at the trap')
    assert.equal(r.seed, 8)
    assert.match(r.replayUrl, /seed=8/)
    assert.match(r.replayUrl, /mains=trap/)
    assert.deepEqual(r.inputs.map((i) => i.intent), ['go to trap'])
    assert.deepEqual(r.state, { busy: true })
    assert.equal(r.snapshots.length, 1)
    assert.deepEqual(r.broken, ['r'])
    assert.deepEqual(r.viewport, { width: 1280, height: 720 })
  })

  it('includes the layout when there is one', () => {
    const page = load(['debug.js', 'layout.js'], { query: '?seed=8' })
    assert.deepEqual(page.json('Debug.bugReport("x").layout.mains'), page.json('Layout.mains'))
  })
})
