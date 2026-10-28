// Shared by the sound, music and bed boards: one look (Reksio's yard and
// Krtek's meadow side by side, the two drawn by the games' own figure code),
// one thing playing at a time (Board.claim: a new play stops whatever plays,
// on this board or another one open), and folders (each generation run's
// takes under its name, so a click shows only what is new).
//
// The sound and music boards gather their items and call Board.mount(config):
// it lays out each sound (or piece) with its wordings and takes and keeps
// Adam's marks (keep, maybe, no, a note) in the browser until Save picks
// downloads them, in the shape its adopt.py reads ({...candidate, <nameKey>,
// verdict, note}). The bed board draws its own cards inside Board.frame().
const Board = (() => {
  const WORLDS = { reksio: 'Reksio', krtek: 'Krtek' }
  const EARLIER = 'Earlier' // takes made before runs had folders
  const NS = 'http://www.w3.org/2000/svg'
  const ICON = {
    play: '<svg viewBox="0 0 20 20"><path d="M6 3.5v13l11-6.5z" fill="currentColor"/></svg>',
    reksio: `<svg viewBox="0 0 24 24"><path d="M5 9c-2 0-3 3-2 6 1 2 3 1 3-1z" fill="#d29e5a" stroke="#1d1914" stroke-width="1.2"/>
      <path d="M6 7c2-4 10-4 12 0 2 4 1 10-6 11-6-1-8-7-6-11z" fill="#f6f8f6" stroke="#1d1914" stroke-width="1.4"/>
      <ellipse cx="9.5" cy="10" rx="3" ry="3.6" fill="#d29e5a"/><circle cx="10" cy="11" r="1.1" fill="#1d1914"/><circle cx="14.6" cy="11" r="1.1" fill="#1d1914"/>
      <ellipse cx="13" cy="14.6" rx="1.8" ry="1.2" fill="#1d1914"/></svg>`,
    krtek: `<svg viewBox="0 0 24 24"><path d="M6 22c0-8 2.5-13 6-13s6 5 6 13z" fill="#15140f"/>
      <ellipse cx="10" cy="13" rx="1.8" ry="2.4" fill="#fff"/><ellipse cx="14" cy="13" rx="1.8" ry="2.4" fill="#fff"/><circle cx="10.4" cy="13.6" r=".8"/><circle cx="14.4" cy="13.6" r=".8"/>
      <circle cx="17" cy="16" r="2" fill="#e0442c"/><path d="M12 9V5M11 9 9 5.5M13 9l2-3.5" stroke="#15140f" stroke-width="1" fill="none"/></svg>`,
  }

  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild }
  const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } } // no storage: this visit only
  const keep = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* no storage: kept in memory */ } }
  const escape = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])

  // ------------------------------------------------------------ one thing at a time

  // Every play goes through claim(stop): whatever played stops first, here or
  // on another board open in this browser (they hear of it through storage).
  const PAGE = Math.random().toString(36).slice(2)
  let current = null // the stop of what plays now
  function claim(stop) {
    const before = current
    current = stop
    if (before && before !== stop) before()
    keep('boards-now', { page: PAGE, at: Date.now() })
    document.body.classList.add('playing')
  }
  /** What played has ended (or stopped): nothing plays now, if it was the last claimed. */
  function release(stop) {
    if (current !== stop) return
    current = null
    document.body.classList.remove('playing')
  }
  function stopAll() {
    const stop = current
    current = null
    stop?.()
    document.body.classList.remove('playing')
  }
  addEventListener('storage', (e) => {
    if (e.key === 'boards-now' && JSON.parse(e.newValue || '{}').page !== PAGE) stopAll()
  })

  // ------------------------------------------------------------ the scene

  const FENCE = () => {
    let planks = ''
    for (let x = 0; x < 520; x += 26) planks += `<path d="M${x + 2} 64V${18 + ((x * 7) % 9)}l11-7 11 7V64z" fill="#c99a5b" stroke="#6b4a26" stroke-width="2"/>`
    return `<g class="fence">${planks}<path d="M0 30h520M0 52h520" stroke="#6b4a26" stroke-width="5"/></g>`
  }
  const TULIPS = () => {
    let out = ''
    for (let x = 760; x < 1400; x += 41 + ((x * 7) % 23)) {
      const h = 16 + ((x * 13) % 14)
      out += `<g transform="translate(${x} ${92 - h})"><path d="M0 ${h}V8" stroke="#3f7d22" stroke-width="2"/><path d="M0 ${h - 6}c-5-3-7-7-7-11 3 1 6 4 7 8" fill="#4d6d1f"/>
        <path d="M-5 0c0 6 2 9 5 9s5-3 5-9l-2.5 3L0-1l-2.5 4z" fill="${x % 3 ? '#e0453a' : '#f08fa6'}"/></g>`
    }
    return out
  }
  // The ground: the yard's trodden earth and grass on the left, running into the meadow on the right
  const GROUND = () => `<svg class="ground" viewBox="0 0 1400 96" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="turf" x1="0" x2="1"><stop offset="0" stop-color="#b9a46a"/><stop offset="0.42" stop-color="#9dbb6c"/><stop offset="1" stop-color="#80b068"/></linearGradient></defs>
    <g transform="translate(0 6)">${FENCE()}</g>
    <path d="M0 70C200 60 420 74 640 66s420-14 760-6V96H0z" fill="url(#turf)"/>
    <path d="M0 82c240-6 520 2 760-4s400-6 640 0V96H0z" fill="#a9cf7c" opacity="0.7"/>
    <path d="M400 88l36-30 36 30v8h-72z" fill="#a8743d" stroke="#5a3b1c" stroke-width="3"/><path d="M390 90l46-38 46 38" fill="none" stroke="#7d2f22" stroke-width="7" stroke-linecap="round"/>
    <path d="M424 96V84a12 12 0 0 1 24 0v12z" fill="#2b1d10"/>
    ${TULIPS()}
    <path d="M1140 96c6-22 30-32 62-32s56 10 62 32z" fill="#6e4a24"/><g fill="#38250a"><circle cx="1170" cy="90" r="4"/><circle cx="1196" cy="80" r="3"/><circle cx="1226" cy="92" r="4"/></g></svg>`

  /** Draw Reksio and Krtek into the scene's corners with the games' own art, if it loaded. */
  function cast(scene) {
    const corner = (cls, box) => {
      const svg = document.createElementNS(NS, 'svg')
      svg.setAttribute('class', `cast ${cls}`)
      svg.setAttribute('viewBox', box)
      svg.setAttribute('aria-hidden', 'true')
      scene.append(svg)
      return svg.appendChild(document.createElementNS(NS, 'g'))
    }
    const faces = []
    if (typeof Figure !== 'undefined') {
      const dog = Figure.mount(corner('dog', '-110 -330 220 334'))
      faces.push((on) => dog(on ? Figure.POSES.eager : Figure.POSES.content))
    }
    if (typeof MoleArt !== 'undefined') {
      const views = MoleArt.draw(corner('mole', '-110 -215 220 222'), [])
      for (const [k, v] of Object.entries(views)) v.view.style.display = k === 'three' ? '' : 'none'
      views.three.view.style.transform = 'scaleX(-1)' // turned to Reksio
      faces.push((on) => views.three.face(on ? { open: 0.8, curve: 0, width: 0.5, round: 1.3, brows: { lift: 6 } } : { open: 0, curve: 0.7, width: 0.75 }))
    }
    const show = (on) => faces.forEach((f) => f(on))
    show(false)
    new MutationObserver(() => show(document.body.classList.contains('playing'))).observe(document.body, { attributes: true, attributeFilter: ['class'] })
  }

  /**
   * The page's frame: the scene with its title and lead, a sticky bar (its
   * contents the caller's), and the folder strip. Returns { bar, folders, main }.
   */
  function frame({ title, lead }) {
    document.title = title
    document.body.innerHTML = ''
    const scene = el(`<header class="scene"><div class="words"><h1>${escape(title)}<span class="dot">.</span></h1><p class="lead">${lead}</p></div>
      ${GROUND()}</header>`)
    const bar = el('<div class="bar"></div>')
    const folders = el('<div class="folders" role="group" aria-label="Folders"></div>')
    const main = el('<div class="page"></div>')
    document.body.append(scene, bar, folders, main)
    cast(scene)
    return { bar, folders, main }
  }

  /**
   * The folder strip: All, then each run's folder, newest first, each with how
   * many of its takes are still unmarked. list: [{ folder, made, unmarked }]
   * (one per take or card); pick(name) is called with the folder chosen ('' for all).
   */
  function folderChips(strip, list, chosen, pick) {
    const by = new Map()
    for (const t of list) {
      const name = t.folder || EARLIER
      const f = by.get(name) || { name, made: t.made || '', n: 0, open: 0 }
      f.n += 1
      f.open += t.unmarked ? 1 : 0
      if ((t.made || '') > f.made) f.made = t.made
      by.set(name, f)
    }
    const all = [...by.values()].sort((a, b) => (a.name === EARLIER) - (b.name === EARLIER) || b.made.localeCompare(a.made))
    strip.innerHTML = '<span class="label">Folders</span>'
    const open = list.filter((t) => t.unmarked).length
    for (const f of [{ name: '', n: list.length, open }, ...all]) {
      const chip = el(`<button class="folder${f.open ? ' fresh' : ''}${f.name === EARLIER ? ' old' : ''}" aria-pressed="${f.name === chosen}">
        <span>${escape(f.name || 'Everything')}</span><span class="n">${f.open ? `${f.open} to mark` : `${f.n} ✓`}</span></button>`)
      chip.onclick = () => pick(f.name)
      strip.append(chip)
    }
  }

  // ------------------------------------------------------------ the sound and music boards

  function mount(cfg) {
    const picks = load(cfg.storageKey, {})
    const view = { world: '', source: '', unmarked: false, folder: '', ...load(`${cfg.storageKey}-view`, {}) }
    const state = load(`${cfg.storageKey}-saved`, { changed: 0, saved: 0 })
    const takes = [] // { node, id, item, c }
    let playing = null
    let focused = null

    const { bar, folders, main } = frame(cfg)
    const worlds = [...new Set(cfg.items.map((i) => i.world))]
    const sources = [...new Set(cfg.items.flatMap((i) => i.candidates.map((c) => c.source)))]
    bar.innerHTML = `
      <div class="worlds" role="group" aria-label="World"></div>
      ${sources.length > 1 ? '<label>Source <select id="source"><option value="">all</option></select></label>' : ''}
      <label><input id="unmarked" type="checkbox"> Only unmarked</label>
      <label>${escape(cfg.volumeLabel || 'Volume')} <input id="vol" type="range" min="0" max="1" step="0.05" value="0.6"></label>
      <span id="extra"></span>
      <button class="btn" id="stop" title="Stop (Esc)">■ Stop</button>
      <button class="btn" id="next" title="Play the next unmarked take (U)">▶ Next unmarked</button>
      <span class="spacer"></span>
      <span class="progress"><span class="meter"><i class="k"></i><i class="m"></i><i class="n"></i></span><span id="count"></span></span>
      <button class="btn primary" id="save" title="Download the picks for Claude">Save picks</button>
      <span class="keys"><kbd>←</kbd><kbd>→</kbd> move · <kbd>space</kbd> play · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> keep, maybe, no · <kbd>N</kbd> note · <kbd>U</kbd> next unmarked</span>`
    main.append(el('<div class="layout"><nav class="list" aria-label="Sounds"></nav><main id="board"></main></div>'))
    for (const node of cfg.extra || []) document.getElementById('extra').append(node)
    const vol = document.getElementById('vol')
    const board = document.getElementById('board')
    const list = document.querySelector('nav.list')
    const remember = () => keep(`${cfg.storageKey}-view`, view)

    const chips = bar.querySelector('.worlds')
    for (const w of ['', ...worlds]) {
      const chip = el(`<button class="chip" data-world="${w}">${w ? ICON[w] || '' : ''}${w ? WORLDS[w] || w : 'All'}</button>`)
      chip.onclick = () => { view.world = w; remember(); filter() }
      chips.append(chip)
    }
    const source = document.getElementById('source')
    if (source) {
      for (const s of sources) source.add(new Option(s, s))
      source.value = view.source
      source.onchange = () => { view.source = source.value; remember(); filter() }
    }
    const unmarked = document.getElementById('unmarked')
    unmarked.checked = view.unmarked
    unmarked.onchange = () => { view.unmarked = unmarked.checked; remember(); filter() }

    /** Stop the take playing here (Board.claim calls it when something else starts). */
    function stopHere() {
      if (!playing) return
      playing.audio.pause()
      done()
    }
    function done() {
      if (!playing) return
      playing.node.classList.remove('playing')
      playing.button.classList.remove('on')
      playing = null
      release(stopHere)
    }
    function play(t, src, button) {
      stopHere()
      const audio = new Audio(src)
      audio.volume = Number(vol.value)
      playing = { audio, node: t.node, button }
      claim(stopHere) // and whatever else plays stops
      t.node.classList.add('playing')
      button.classList.add('on')
      audio.onended = done
      audio.onerror = done
      audio.play().catch(done) // a refused play (no file, no gesture) just ends
      focus(t)
    }
    function focus(t, scroll) {
      if (focused) focused.node.classList.remove('focus')
      focused = t
      t.node.classList.add('focus')
      if (scroll) t.node.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }

    function setVerdict(t, v) {
      const mine = picks[t.id] || {}
      mine.verdict = mine.verdict === v ? undefined : v
      record(t, mine)
    }
    function record(t, mine) {
      picks[t.id] = { ...t.c, [cfg.nameKey]: t.item.name, verdict: mine.verdict, note: mine.note }
      keep(cfg.storageKey, picks)
      state.changed = Date.now()
      keep(`${cfg.storageKey}-saved`, state)
      paint(t)
      totals()
    }
    function paint(t) {
      const mine = picks[t.id] || {}
      t.node.classList.remove('keep', 'maybe', 'no')
      if (mine.verdict) t.node.classList.add(mine.verdict)
      t.node.querySelectorAll('.verdict button').forEach((b) => b.classList.toggle('on', b.dataset.v === mine.verdict))
      t.node.querySelector('.note-btn').classList.toggle('has', !!mine.note)
    }

    const inWorld = (t) => !view.world || t.item.world === view.world
    const inFolder = (t) => !view.folder || (t.c.folder || EARLIER) === view.folder
    const shownTake = (t) => inWorld(t) && inFolder(t) && (!view.source || t.c.source === view.source)
    const visible = (t) => shownTake(t) && !(view.unmarked && picks[t.id]?.verdict)
    function filter() {
      chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.world === view.world)))
      document.body.classList.toggle('unmarked', view.unmarked)
      for (const t of takes) t.node.classList.toggle('hidden', !shownTake(t))
      for (const sec of board.querySelectorAll('section.item')) {
        sec.querySelectorAll('.wording').forEach((w) => {
          w.style.display = [...w.querySelectorAll('.take')].some((n) => !n.classList.contains('hidden')) ? '' : 'none'
        })
        const shown = [...sec.querySelectorAll('.take')].some((n) => !n.classList.contains('hidden'))
        sec.style.display = shown ? '' : 'none'
        list.querySelector(`a[href="#${sec.id}"]`).style.display = shown ? '' : 'none'
      }
      totals()
    }
    function totals() {
      folderChips(folders, takes.filter(inWorld).map((t) => ({ folder: t.c.folder, made: t.c.made, unmarked: !picks[t.id]?.verdict })), view.folder, (name) => {
        view.folder = name
        remember()
        filter()
        scrollTo({ top: 0, behavior: 'smooth' })
      })
      const shown = takes.filter(shownTake)
      const n = (k) => shown.filter((t) => picks[t.id]?.verdict === k).length
      const [k, m, no] = [n('keep'), n('maybe'), n('no')]
      const all = shown.length || 1
      const meter = bar.querySelector('.meter')
      meter.querySelector('.k').style.width = `${(100 * k) / all}%`
      meter.querySelector('.m').style.width = `${(100 * m) / all}%`
      meter.querySelector('.n').style.width = `${(100 * no) / all}%`
      document.getElementById('count').textContent = `${k + m + no} of ${shown.length} marked · ${k} keep · ${m} maybe · ${no} no`
      for (const item of cfg.items) {
        const mine = takes.filter((t) => t.item === item && shownTake(t))
        const marked = mine.filter((t) => picks[t.id]?.verdict).length
        const link = list.querySelector(`a[href="#${item.anchor}"]`)
        link.querySelector('.n').textContent = `${marked}/${mine.length}`
        link.classList.toggle('done', marked === mine.length)
        document.querySelector(`#${item.anchor} .count`).textContent = `${marked} of ${mine.length} marked`
      }
      document.getElementById('save').classList.toggle('unsaved', state.changed > state.saved)
    }

    cfg.items.forEach((item, i) => {
      item.anchor = `item-${i}`
      const sec = el(`<section class="item" id="${item.anchor}" data-world="${item.world}">
        <header><h2>${escape(item.name)}</h2><span class="world ${item.world}">${escape(WORLDS[item.world] || item.world)}</span><span class="count"></span></header>
        <p class="for">${escape(item.for || '')}</p>${cfg.worldNote?.[item.world] ? `<p class="for world-note">${cfg.worldNote[item.world]}</p>` : ''}<div class="now"></div></section>`)
      const now = sec.querySelector('.now')
      for (const b of item.now || []) {
        const button = el(`<button class="btn">${escape(b.label)}</button>`)
        button.disabled = !!b.disabled
        button.onclick = () => {
          const stop = () => { cfg.stopCode?.(); release(stop) }
          claim(stop)
          b.run()
        }
        now.append(button)
      }
      if (item.nowNote) now.append(el(`<span class="meta">${escape(item.nowNote)}</span>`))
      const groups = new Map()
      for (const c of item.candidates) {
        const g = cfg.group(c)
        if (!groups.has(g.key)) groups.set(g.key, { ...g, list: [] })
        groups.get(g.key).list.push(c)
      }
      for (const g of groups.values()) {
        const box = el(`<div class="wording"><p class="prompt"><b>${escape(g.label)}</b>${escape(g.prompt)}</p><div class="takes"></div></div>`)
        for (const c of g.list) {
          const lab = cfg.takeLabel(c)
          const node = el(`<div class="take" tabindex="0" title="${escape(c.file)}">
            <div class="row"><span class="plays"></span><span class="label"><b>${escape(lab.title)}</b>${escape(lab.sub || '')}</span>
              <button class="note-btn" title="Note (N)">✎</button></div>
            <div class="verdict"><button data-v="keep" title="Keep (1)">Keep</button><button data-v="maybe" title="Maybe (2)">Maybe</button><button data-v="no" title="No (3)">No</button></div>
            <textarea placeholder="What is right or wrong?"></textarea></div>`)
          const t = { node, id: c.file, item, c }
          for (const p of cfg.plays(c)) {
            const button = el(`<button class="play${p.alt ? ' alt' : ''}" title="${escape(p.title)}">${p.label === '▶' ? ICON.play : escape(p.label)}</button>`)
            button.onclick = () => play(t, p.src, button)
            node.querySelector('.plays').append(button)
          }
          node.querySelectorAll('.verdict button').forEach((b) => (b.onclick = () => setVerdict(t, b.dataset.v)))
          const note = node.querySelector('textarea')
          note.value = picks[t.id]?.note || ''
          if (note.value) node.classList.add('noting')
          note.oninput = () => record(t, { ...picks[t.id], note: note.value })
          node.querySelector('.note-btn').onclick = () => { node.classList.toggle('noting'); if (node.classList.contains('noting')) note.focus() }
          node.addEventListener('focus', () => focus(t))
          takes.push(t)
          paint(t)
          box.querySelector('.takes').append(node)
        }
        sec.append(box)
      }
      board.append(sec)
      list.append(el(`<a href="#${item.anchor}"><span class="dot-world ${item.world}"></span><span>${escape(item.name)}</span><span class="n"></span></a>`))
    })
    if (!takes.length) board.append(el(`<p class="empty">${escape(cfg.empty)}</p>`))

    const playFirst = (t) => { const b = t.node.querySelector('.play'); play(t, cfg.plays(t.c)[0].src, b) }
    function next() {
      const shown = takes.filter(visible)
      const start = focused ? shown.indexOf(focused) + 1 : 0
      const t = [...shown.slice(start), ...shown.slice(0, start)].find((x) => !picks[x.id]?.verdict)
      if (t) { focus(t, true); playFirst(t) }
    }
    document.getElementById('stop').onclick = stopAll
    document.getElementById('next').onclick = next
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('textarea, input, select') || e.metaKey || e.ctrlKey || e.altKey) {
        if (e.key === 'Escape') e.target.blur()
        return
      }
      const shown = takes.filter(visible)
      const at = focused ? shown.indexOf(focused) : -1
      const k = e.key.toLowerCase()
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const t = shown[Math.max(0, Math.min(shown.length - 1, at + (e.key === 'ArrowRight' ? 1 : -1)))]
        if (t) { focus(t, true); t.node.focus({ preventScroll: true }) }
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (!focused || e.target.matches('button')) return
        playFirst(focused)
      } else if (['1', '2', '3'].includes(e.key) && focused) {
        setVerdict(focused, ['keep', 'maybe', 'no'][Number(e.key) - 1])
      } else if (k === 'n' && focused) {
        focused.node.classList.add('noting')
        focused.node.querySelector('textarea').focus()
      } else if (k === 'u') {
        next()
      } else if (e.key === 'Escape') {
        stopAll()
      } else return
      e.preventDefault()
    })

    document.getElementById('save').onclick = () => {
      const out = { saved: new Date().toISOString(), picks: Object.values(picks).filter((p) => p.verdict || p.note) }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }))
      a.download = cfg.saveName
      a.click()
      state.saved = Date.now()
      keep(`${cfg.storageKey}-saved`, state)
      totals()
    }
    filter()
    return { stop: stopAll }
  }

  return { mount, frame, folderChips, claim, release, stopAll, escape, EARLIER }
})()
