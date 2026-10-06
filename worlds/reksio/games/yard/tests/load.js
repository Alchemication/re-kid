// Loads the game's classic scripts into a fresh sandbox for unit tests, with
// just enough of a browser around them (the page address, localStorage,
// window events, a console that records, and on request a pretend page).

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const GAME = path.join(__dirname, '..', 'game')

/** A pretend SVG element: it keeps its attributes and children, and its
 * animations end at once. Enough for scripts that draw, so their logic can be
 * tested without a browser. */
function fakeElement(tag = 'g') {
  const attrs = new Map()
  const node = {
    tag,
    style: {},
    children: [],
    parent: null,
    setAttribute: (k, v) => attrs.set(k, String(v)),
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    appendChild(child) {
      child.parent = node
      node.children.push(child)
      return child
    },
    remove() {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      node.parent = null
    },
    animate: () => ({ finished: Promise.resolve(), cancel() {} }),
    getAnimations: () => [],
    getTotalLength: () => 100,
  }
  return node
}

/** A pretend page: every element asked for by id exists (made on first ask). */
function fakeDocument() {
  const byId = new Map()
  return {
    getElementById: (id) => byId.get(id) ?? byId.set(id, fakeElement()).get(id),
    createElementNS: (_ns, tag) => fakeElement(tag),
    addEventListener() {},
  }
}

/**
 * Run `files` (from game/) in order, in one sandbox.
 * @param {string[]} files
 * @param {{query?: string, storage?: object, storageThrows?: boolean, dom?: boolean, globals?: object}} options
 *   query: the page address's `?…` part; storage: localStorage to start from;
 *   storageThrows: localStorage blocked, as in some private windows;
 *   dom: a pretend page (document), with timers and animation frames that
 *   wait until runTimers() instead of running on their own; globals: stand-ins
 *   for other scripts (say a Weather the test controls).
 */
function load(files, { query = '', storage = {}, storageThrows = false, dom = false, globals = {} } = {}) {
  const store = new Map(Object.entries(storage))
  const listeners = {}
  const logs = { info: [], debug: [], error: [] }
  const intervals = []
  const timers = []
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
    ...(dom && {
      document: fakeDocument(),
      setTimeout: (fn) => timers.push(fn),
      requestAnimationFrame: (fn) => timers.push(() => fn(performance.now())),
    }),
    ...globals,
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
    /** Run the timers and animation frames waiting so far (dom only). */
    runTimers: () => timers.splice(0).forEach((fn) => fn()),
    logs,
    store,
  }
}

module.exports = { load }
