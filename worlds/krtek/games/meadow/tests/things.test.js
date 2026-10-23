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
  assert.deepEqual([...plan.map((p) => p.at)], [9, 11, 13, 15.2])
})

test('?props forces which come, in that order; ?soon brings the first now', () => {
  const plan = Things.choose(ENCOUNTERS, seq(0.5), { props: ['car', 'egg', 'nope'], soon: true })
  assert.deepEqual([...plan.map((p) => p.name)], ['car', 'egg'])
  assert.deepEqual([...plan.map((p) => p.at)], [8, 11])
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
