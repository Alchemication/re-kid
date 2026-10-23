// Shared by the sound and music boards: lays out each sound (or piece) with
// its wordings and takes, plays one take at a time, and keeps Adam's marks
// (keep, maybe, no, a note) in the browser until Save picks downloads them.
// A board page gathers its items and calls Board.mount(config); the picks it
// saves keep the shape its adopt.py reads ({...candidate, <nameKey>, verdict, note}).
const Board = (() => {
  const WORLDS = { reksio: 'Reksio', krtek: 'Krtek' }
  const ICON = {
    play: '<svg viewBox="0 0 20 20"><path d="M6 3.5v13l11-6.5z" fill="currentColor"/></svg>',
    krtek: `<svg viewBox="0 0 24 24"><path d="M3 22c1-6 4-9 9-9s8 3 9 9z" fill="#6e4a24"/><path d="M6 22c0-8 2.5-13 6-13s6 5 6 13z" fill="#15140f"/>
      <ellipse cx="10" cy="13" rx="1.8" ry="2.4" fill="#fff"/><ellipse cx="14" cy="13" rx="1.8" ry="2.4" fill="#fff"/><circle cx="10.4" cy="13.6" r=".8"/><circle cx="14.4" cy="13.6" r=".8"/>
      <circle cx="17" cy="16" r="2" fill="#d8322b"/><path d="M12 9V5M11 9 9 5.5M13 9l2-3.5" stroke="#15140f" stroke-width="1" fill="none"/></svg>`,
    reksio: `<svg viewBox="0 0 24 24"><path d="M3 11 12 3l9 8v11H3z" fill="#b07a3c"/><path d="M1.5 11.5 12 2l10.5 9.5" stroke="#7a4f22" stroke-width="2" fill="none"/>
      <path d="M8 22v-6a4 4 0 0 1 8 0v6z" fill="#2b1d10"/></svg>`,
  }
  const TULIP = (x, h, c) => `<g transform="translate(${x} ${56 - h})"><path d="M0 ${h}V8" stroke="#3f7d22" stroke-width="2"/><path d="M0 ${h - 6}c-5-3-7-7-7-11 3 1 6 4 7 8" fill="#4d6d1f"/>
    <path d="M-5 0c0 6 2 9 5 9s5-3 5-9l-2.5 3L0-1l-2.5 4z" fill="${c}"/></g>`
  const MEADOW = () => {
    let tulips = ''
    for (let x = 30; x < 1400; x += 47 + ((x * 7) % 23)) tulips += TULIP(x, 18 + ((x * 13) % 14), x % 3 ? '#e0453a' : '#f08fa6')
    return `<svg class="meadow" viewBox="0 0 1400 56" preserveAspectRatio="xMinYMax slice">
      <path d="M0 30C120 18 260 26 400 22s300-10 450 0 330 14 550 4V56H0z" fill="#80b068"/>
      <path d="M0 40c150-8 320-2 480-6s350-8 520 0 300 6 400 2V56H0z" fill="#a9cf7c"/>${tulips}</svg>`
  }
  const MOLE = `<svg class="mole" viewBox="0 0 120 100" aria-hidden="true">
    <g class="him"><path d="M36 92c0-34 10-58 24-58s24 24 24 58z" fill="#15140f"/>
      <ellipse cx="60" cy="74" rx="12" ry="16" fill="#5d6b57"/>
      <ellipse cx="53" cy="52" rx="6" ry="8.5" fill="#fff"/><ellipse cx="66" cy="52" rx="6" ry="8.5" fill="#fff"/>
      <ellipse cx="54.5" cy="54" rx="2.6" ry="3.4" fill="#15140f"/><ellipse cx="67.5" cy="54" rx="2.6" ry="3.4" fill="#15140f"/>
      <circle cx="78" cy="62" r="7" fill="#d8322b"/>
      <g class="hair" stroke="#15140f" stroke-width="2" fill="none" stroke-linecap="round"><path d="M60 35q-2-12 2-20"/><path d="M57 36q-8-8-10-16"/><path d="M63 36q8-7 12-14"/></g>
      <path d="M36 80c-8 2-12 6-12 10h14zM84 80c8 2 12 6 12 10H82z" fill="#f2a0a6"/></g>
    <path d="M4 100c4-16 20-24 56-24s52 8 56 24z" fill="#6e4a24"/>
    <g fill="#38250a"><circle cx="30" cy="92" r="4"/><circle cx="52" cy="86" r="3"/><circle cx="74" cy="94" r="4"/><circle cx="92" cy="88" r="3"/><circle cx="16" cy="98" r="3"/></g></svg>`

  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild }
  const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } } // no storage: this visit only
  const keep = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* no storage: kept in memory */ } }
  const escape = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])

  function mount(cfg) {
    const picks = load(cfg.storageKey, {})
    const view = load(`${cfg.storageKey}-view`, { world: '', source: '', unmarked: false })
    const state = load(`${cfg.storageKey}-saved`, { changed: 0, saved: 0 })
    const takes = [] // { node, id, item, c }
    let playing = null
    let focused = null

    document.title = cfg.title
    document.body.innerHTML = ''
    const worlds = [...new Set(cfg.items.map((i) => i.world))]
    const sources = [...new Set(cfg.items.flatMap((i) => i.candidates.map((c) => c.source)))]
    document.body.append(
      el(`<header class="sky"><h1>${escape(cfg.title)}<span class="dot">.</span></h1><p class="lead">${cfg.lead}</p>${MEADOW()}${MOLE}</header>`),
      el(`<div class="bar">
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
        <span class="keys"><kbd>←</kbd><kbd>→</kbd> move · <kbd>space</kbd> play · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> keep, maybe, no · <kbd>N</kbd> note · <kbd>U</kbd> next unmarked</span>
      </div>`),
      el('<div class="layout"><nav class="list" aria-label="Sounds"></nav><main id="board"></main></div>'),
    )
    for (const node of cfg.extra || []) document.getElementById('extra').append(node)
    const vol = document.getElementById('vol')
    const board = document.getElementById('board')
    const list = document.querySelector('nav.list')

    const chips = document.querySelector('.worlds')
    for (const w of ['', ...worlds]) {
      const chip = el(`<button class="chip" data-world="${w}">${w ? ICON[w] || '' : ''}${w ? WORLDS[w] || w : 'All'}</button>`)
      chip.onclick = () => { view.world = w; keep(`${cfg.storageKey}-view`, view); filter() }
      chips.append(chip)
    }
    const source = document.getElementById('source')
    if (source) {
      for (const s of sources) source.add(new Option(s, s))
      source.value = view.source
      source.onchange = () => { view.source = source.value; keep(`${cfg.storageKey}-view`, view); filter() }
    }
    const unmarked = document.getElementById('unmarked')
    unmarked.checked = view.unmarked
    unmarked.onchange = () => { view.unmarked = unmarked.checked; keep(`${cfg.storageKey}-view`, view); filter() }

    function stop() {
      if (playing) { playing.audio.pause(); done() }
    }
    function done() {
      if (!playing) return
      playing.node.classList.remove('playing')
      playing.button.classList.remove('on')
      document.body.classList.remove('playing')
      playing = null
    }
    function play(t, src, button) {
      stop()
      const audio = new Audio(src)
      audio.volume = Number(vol.value)
      playing = { audio, node: t.node, button }
      t.node.classList.add('playing')
      button.classList.add('on')
      document.body.classList.add('playing')
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

    const visible = (t) => !t.node.classList.contains('hidden') && t.node.closest('section').style.display !== 'none' &&
      !(view.unmarked && picks[t.id]?.verdict)
    function filter() {
      chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.world === view.world)))
      document.body.classList.toggle('unmarked', view.unmarked)
      for (const t of takes) t.node.classList.toggle('hidden', !!view.source && t.c.source !== view.source)
      for (const sec of board.querySelectorAll('section.item')) {
        const shown = !view.world || sec.dataset.world === view.world
        sec.style.display = shown ? '' : 'none'
        list.querySelector(`a[href="#${sec.id}"]`).style.display = shown ? '' : 'none'
        sec.querySelectorAll('.wording').forEach((w) => {
          w.style.display = [...w.querySelectorAll('.take')].some((n) => !n.classList.contains('hidden')) ? '' : 'none'
        })
      }
      totals()
    }
    function totals() {
      const shown = takes.filter((t) => !view.world || t.item.world === view.world)
      const n = (k) => shown.filter((t) => picks[t.id]?.verdict === k).length
      const [k, m, no] = [n('keep'), n('maybe'), n('no')]
      const all = shown.length || 1
      const meter = document.querySelector('.meter')
      meter.querySelector('.k').style.width = `${(100 * k) / all}%`
      meter.querySelector('.m').style.width = `${(100 * m) / all}%`
      meter.querySelector('.n').style.width = `${(100 * no) / all}%`
      document.getElementById('count').textContent = `${k + m + no} of ${shown.length} marked · ${k} keep · ${m} maybe · ${no} no`
      for (const item of cfg.items) {
        const mine = takes.filter((t) => t.item === item)
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
        <header><h2>${escape(item.name)}</h2><span class="world">${escape(WORLDS[item.world] || item.world)}</span><span class="count"></span></header>
        <p class="for">${escape(item.for || '')}</p>${cfg.worldNote?.[item.world] ? `<p class="for world-note">${cfg.worldNote[item.world]}</p>` : ''}<div class="now"></div></section>`)
      const now = sec.querySelector('.now')
      for (const b of item.now || []) {
        const button = el(`<button class="btn">${escape(b.label)}</button>`)
        button.disabled = !!b.disabled
        button.onclick = () => { stop(); b.run() }
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
    document.getElementById('stop').onclick = stop
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
        stop()
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
    return { stop }
  }

  return { mount }
})()
