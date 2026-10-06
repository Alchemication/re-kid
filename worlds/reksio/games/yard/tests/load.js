// Loads the game's classic scripts into a fresh sandbox for unit tests, with
// just enough of a browser around them (the page address, localStorage,
// window events, a console that records).

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const GAME = path.join(__dirname, '..', 'game')

/**
 * Run `files` (from game/) in order, in one sandbox.
 * @param {string[]} files
 * @param {{query?: string, storage?: object, storageThrows?: boolean}} options
 *   query: the page address's `?…` part; storage: localStorage to start from;
 *   storageThrows: localStorage blocked, as in some private windows.
 */
function load(files, { query = '', storage = {}, storageThrows = false } = {}) {
  const store = new Map(Object.entries(storage))
  const listeners = {}
  const logs = { info: [], debug: [], error: [] }
  const intervals = []
  const blocked = () => {
    throw new Error('storage blocked')
  }
  const sandbox = {
    location: { search: query, href: `file:///yard/index.html${query}` },
    URL,
    URLSearchParams,
    performance,
    console: Object.fromEntries(Object.keys(logs).map((k) => [k, (...a) => logs[k].push(a.map(String).join(' '))])),
    localStorage: storageThrows
      ? { getItem: blocked, setItem: blocked }
      : { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
    window: { addEventListener: (type, fn) => (listeners[type] ||= []).push(fn), innerWidth: 1280, innerHeight: 720 },
    navigator: { userAgent: 'test' },
    setInterval: (fn) => intervals.push(fn),
  }
  vm.createContext(sandbox)
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(GAME, f), 'utf8'), sandbox, { filename: f })
  return {
    /** Evaluate `expr` in the sandbox (its top-level consts are visible). */
    get: (expr) => vm.runInContext(expr, sandbox),
    /** The same, copied out as plain data, so deepStrictEqual can compare it. */
    json: (expr) => JSON.parse(vm.runInContext(`JSON.stringify(${expr})`, sandbox)),
    /** Fire a window event at the scripts' listeners. */
    fire: (type, event) => (listeners[type] || []).forEach((fn) => fn(event)),
    /** Run every setInterval callback once, as if its interval had passed. */
    tick: () => intervals.forEach((fn) => fn()),
    logs,
    store,
  }
}

module.exports = { load }
