// Which encounters come, and when (game/things.js `choose`): a pure rule.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const sandbox = {}
vm.createContext(sandbox)
vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'game', 'things.js'), 'utf8')}\nthis.Things = Things`, sandbox)
const { Things } = sandbox

const ENCOUNTERS = [
  { name: 'egg', offer: 'help' },
  { name: 'paint', offer: 'helped' },
  { name: 'poles', offer: 'discover' },
  { name: 'car', offer: 'discover' },
]
const seq = (...values) => { let i = 0; return () => values[i++ % values.length] }

test('one of each offer comes first, then the rest, each at its own hour', () => {
  const plan = Things.choose(ENCOUNTERS, seq(0.1, 0.9, 0.5, 0.3, 0.7))
  assert.equal(plan.length, 4)
  const offers = [...plan.slice(0, 3).map((p) => ENCOUNTERS.find((e) => e.name === p.name).offer)].sort()
  assert.deepEqual(offers, ['discover', 'help', 'helped'])
  assert.deepEqual([...plan.map((p) => p.name)].sort(), ['car', 'egg', 'paint', 'poles'])
  assert.deepEqual([...plan.map((p) => p.at)], [9, 10.7, 12.4, 14.1])
})

test('?props forces which come, in that order; ?soon brings the first now', () => {
  const plan = Things.choose(ENCOUNTERS, seq(0.5), { props: ['car', 'egg', 'nope'], soon: true })
  assert.deepEqual([...plan.map((p) => p.name)], ['car', 'egg'])
  assert.deepEqual([...plan.map((p) => p.at)], [8, 10.7])
})

test('forcing them makes the same draws, so the rest of the play is unchanged', () => {
  let draws = 0
  const counting = () => { draws++; return 0.4 }
  Things.choose(ENCOUNTERS, counting)
  const plain = draws
  draws = 0
  Things.choose(ENCOUNTERS, counting, { props: ['egg'] })
  assert.equal(draws, plain)
})

test('an empty ?props brings none', () => {
  assert.equal(Things.choose(ENCOUNTERS, seq(0.5), { props: [] }).length, 0)
})

test('one with a chance comes in that share of plays, instead of the one it replaces, never both', () => {
  const withStorm = [...ENCOUNTERS, { name: 'rain', offer: 'help' }, { name: 'storm', offer: 'help', instead: 'rain', chance: 0.25 }]
  const names = (first) => [...Things.choose(withStorm, seq(first, 0.5)).map((p) => p.name)]
  assert.ok(names(0.1).includes('storm') && !names(0.1).includes('rain'))
  assert.ok(names(0.9).includes('rain') && !names(0.9).includes('storm'))
  const forced = [...Things.choose(withStorm, seq(0.9), { props: ['storm'] }).map((p) => p.name)]
  assert.deepEqual(forced, ['storm']) // ?props=storm brings it whatever the draw
})
