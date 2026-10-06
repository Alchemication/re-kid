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
    insertBefore(child, before) {
      child.parent = node
      const i = node.children.indexOf(before)
      node.children.splice(i < 0 ? node.children.length : i, 0, child)
      return child
    },
    replaceChildren(...kids) {
      node.children.length = 0
      kids.forEach((k) => node.appendChild(k))
    },
    remove() {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      node.parent = null
    },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    // asked for something inside it: a stand-in, like the page's own lookups
    querySelector: () => fakeElement(),
    querySelectorAll: () => Array.from({ length: 12 }, () => fakeElement()),
    cloneNode: () => fakeElement(tag),
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
    querySelector: () => fakeElement(),
    querySelectorAll: () => Array.from({ length: 12 }, () => fakeElement()), // enough for any row of things (the film's five prints)
    addEventListener() {},
  }
}

/** A clock the test moves on: timers and animation frames run when
 * advance() reaches them, in order, and performance.now() reads it. */
function fakeClock() {
  let now = 0
  let seq = 0
  const due = [] // {at, seq, fn}
  const add = (fn, ms) => due.push({ at: now + Math.max(0, ms || 0), seq: seq++, fn })
  /** Let the promise chains a callback started run on to their next wait. */
  const settle = () => new Promise((r) => setImmediate(r))
  return {
    now: () => now,
    setTimeout: (fn, ms) => add(fn, ms),
    requestAnimationFrame: (fn) => add(() => fn(now), 16),
    /** Time passes with no frames and no timers, as for a hidden page: then
     * everything due runs late, as a browser's would. */
    skip(ms) {
      now += ms
    },
    async advance(ms) {
      const end = now + ms
      await settle()
      for (;;) {
        due.sort((a, b) => a.at - b.at || a.seq - b.seq)
        if (!due.length || due[0].at > end) break
        const next = due.shift()
        now = Math.max(now, next.at) // never backwards: after a skip, what fell due runs late
        next.fn()
        await settle()
      }
      now = end
    },
  }
}

/**
 * Run `files` (from game/) in order, in one sandbox.
 * @param {string[]} files
 * @param {{query?: string, storage?: object, storageThrows?: boolean, dom?: boolean, globals?: object}} options
 *   query: the page address's `?…` part; storage: localStorage to start from;
 *   storageThrows: localStorage blocked, as in some private windows;
 *   dom: a pretend page (document) on a pretend clock: timers, animation
 *   frames and performance.now() move only when the test calls advance(ms);
 *   globals: stand-ins for other scripts (say a Weather the test controls).
 */
function load(files, { query = '', storage = {}, storageThrows = false, dom = false, globals = {} } = {}) {
  const store = new Map(Object.entries(storage))
  const listeners = {}
  const logs = { info: [], debug: [], error: [] }
  const intervals = []
  const clock = fakeClock()
  const blocked = () => {
    throw new Error('storage blocked')
  }
  const sandbox = {
    location: { search: query, href: `file:///yard/index.html${query}` },
    URL,
    URLSearchParams,
    performance: dom ? { now: clock.now } : performance,
    console: Object.fromEntries(Object.keys(logs).map((k) => [k, (...a) => logs[k].push(a.map(String).join(' '))])),
    localStorage: storageThrows
      ? { getItem: blocked, setItem: blocked }
      : { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
    window: { addEventListener: (type, fn) => (listeners[type] ||= []).push(fn), innerWidth: 1280, innerHeight: 720 },
    navigator: { userAgent: 'test' },
    setInterval: (fn) => intervals.push(fn),
    ...(dom && {
      document: fakeDocument(),
      setTimeout: clock.setTimeout,
      requestAnimationFrame: clock.requestAnimationFrame,
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
    /** Move the pretend clock on by `ms`, running what falls due (dom only). */
    advance: clock.advance,
    /** Let ms pass with no frames drawn (a hidden page), then carry on (dom only). */
    skip: clock.skip,
    logs,
    store,
  }
}

module.exports = { load }
