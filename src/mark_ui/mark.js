// Reksio marking tool: select sounds and melodies by ear, name them, note
// what you hear. Talks to src/mark.py: GET /api/session, PUT /api/marks.

import WaveSurfer from '/ui/vendor/wavesurfer/wavesurfer.esm.js'
import RegionsPlugin from '/ui/vendor/wavesurfer/plugins/regions.esm.js'
import ZoomPlugin from '/ui/vendor/wavesurfer/plugins/zoom.esm.js'
import SpectrogramPlugin from '/ui/vendor/wavesurfer/plugins/spectrogram.esm.js'

const $ = (sel) => document.querySelector(sel)

// [keys, what they do] — the one list for the help dialog and the key bar.
const KEYS = [
  ['Space', 'Play / pause'],
  ['M', 'Mark by ear: press where a sound starts, then where it ends'],
  ['Enter', 'Play the selected mark once'],
  ['L', 'Loop the selected mark on / off'],
  ['Z', 'Zoom to the selected mark (or the current moment)'],
  ['F', 'Fit the whole intro'],
  ['← →', 'Move 0.1 s (with Shift: 1 s)'],
  ['↑ ↓', 'Previous / next moment'],
  ['1 2 3', 'Speed 100% / 75% / 50%'],
  ['S', 'Snap mark edges to musical beats on / off'],
  ['Delete', 'Delete the selected mark'],
  ['⌘Z', 'Undo the last delete (Ctrl+Z on Windows / Linux)'],
  ['Esc', 'Cancel marking · deselect · leave a text box · close this'],
  ['?', 'Show all shortcuts'],
  ['Drag', 'On the waveform: mark a new sound · on a mark: move it · on its edge: resize'],
  ['Scroll', 'On the waveform: zoom in and out'],
]
const KEY_BAR = ['Space', 'M', 'Enter', 'L', 'Z', 'F', '← →', '↑ ↓', '1 2 3', 'Delete', '?']

const KIND_LABEL = { effect: 'sound effect', melody: 'melody', other: 'other' }
const KIND_COLOR = {
  effect: ['rgba(201, 53, 31, 0.28)', 'rgba(201, 53, 31, 0.55)'],
  melody: ['rgba(58, 103, 173, 0.30)', 'rgba(58, 103, 173, 0.58)'],
  other: ['rgba(140, 128, 100, 0.30)', 'rgba(140, 128, 100, 0.58)'],
}
// wavesurfer renders inside a shadow DOM, which page styles can't reach, so
// the overlay (moment bands, beat lines, hits) and mark labels are styled here.
const SHADOW_CSS = `
.ovl { position: absolute; inset: 0; pointer-events: none; z-index: 10; }
.ovl .band { position: absolute; top: 0; bottom: 0; border-left: 1px solid rgba(251, 246, 232, 0.45); }
.ovl .band.alt { background: rgba(251, 246, 232, 0.05); }
.ovl .band.current { background: rgba(181, 147, 47, 0.16); }
.ovl .band span {
  position: absolute; top: 3px; left: 4px;
  font: 12px/1 var(--display); letter-spacing: 0.4px;
  color: var(--cream); background: rgba(46, 39, 23, 0.7);
  padding: 3px 5px 2px; border-radius: 5px; white-space: nowrap;
  max-width: calc(100% - 10px); overflow: hidden; text-overflow: ellipsis; box-sizing: border-box;
}
.ovl .beat { position: absolute; top: 20px; height: 80px; border-left: 1px dashed rgba(251, 246, 232, 0.22); }
.ovl .hit { position: absolute; top: 90px; transform: translateX(-50%); color: #f08a5d; font-size: 10px; line-height: 1; }
.ovl .tick { position: absolute; bottom: 0; height: 6px; border-left: 1px solid rgba(251, 246, 232, 0.55); }
.ovl .tick.major { height: 10px; }
.ovl .tick span {
  position: absolute; bottom: 9px; left: 3px;
  font: 10px/1 ui-monospace, Menlo, monospace; color: var(--cream);
  background: rgba(46, 39, 23, 0.65); padding: 1px 3px; border-radius: 3px;
}
.ovl[data-density="coarse"] .tick:not(.every5) { display: none; }
.ovl[data-density="coarse"] .tick.every5 span { display: inline; }
.ovl[data-density="mid"] .tick:not(.major) { display: none; }
.ovl .mark-in { position: absolute; top: 0; bottom: 0; border-left: 2px solid #ffd54a; }

.region-label {
  font: 12px/1 var(--display); letter-spacing: 0.4px; color: white;
  padding: 3px 5px 2px; margin: 22px 0 0 2px; display: inline-block;
  background: rgba(0, 0, 0, 0.35); border-radius: 4px; white-space: nowrap;
}
`
const MAX_PX_PER_SEC = 1000
const SAVE_DELAY_MS = 400

const state = {
  session: null,
  marks: [], // {uid, id, name, kind, start, end, note, region}
  selected: null,
  loop: null,
  markIn: null,
  snap: false,
  deleted: [],
  moment: -1,
  answerFor: -1, // index of the moment the answer box currently shows
}
const programmatic = new Set()
let pointerDown = false
document.addEventListener('pointerdown', () => { pointerDown = true }, true)
document.addEventListener('pointerup', () => { pointerDown = false }, true)
let ws, regions, overlay

// ---------------------------------------------------------------- helpers

function fmt(t, withMs = true) {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return withMs ? `${m}:${s.toFixed(3).padStart(6, '0')}` : `${m}:${String(Math.round(s)).padStart(2, '0')}`
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v)
    else node.setAttribute(k, v)
  }
  for (const c of children) node.append(c)
  return node
}

function toast(message, action) {
  const t = $('#toast')
  t.replaceChildren(el('span', {}, message))
  if (action) t.append(el('button', { onclick: () => { action.run(); t.hidden = true } }, action.label))
  t.hidden = false
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => (t.hidden = true), action ? 6000 : 2500)
}

function nearestBeat(t) {
  const beats = state.session.beats
  let best = beats[0]
  for (const b of beats) if (Math.abs(b - t) < Math.abs(best - t)) best = b
  return best
}

function momentAt(t) {
  const moments = state.session.moments
  let index = -1
  moments.forEach((m, i) => { if (t >= m.start - 1e-6) index = i })
  return index
}

function momentsFor(mark) {
  return state.session.moments
    .filter((m) => mark.start < m.end && mark.end > m.start)
    .map((m) => m.id)
}

const byUid = (uid) => state.marks.find((m) => m.uid === uid)
const typing = (e) => e.target.matches('input[type=text], input[type=number], textarea, select, input:not([type])')

// ---------------------------------------------------------------- saving

let saveTimer = null
let saving = false
let saveAgain = false

function setSaveState(kind, text) {
  const s = $('#save-state')
  s.className = `save ${kind}`
  s.textContent = text
}

function scheduleSave() {
  setSaveState('busy', 'Saving…')
  clearTimeout(saveTimer)
  saveTimer = setTimeout(flushSave, SAVE_DELAY_MS)
}

async function flushSave() {
  saveTimer = null
  if (saving) { saveAgain = true; return }
  saving = true
  const sent = [...state.marks].sort((a, b) => a.start - b.start)
  const body = sent.map((m, i) => ({
    id: m.id || '',
    name: m.name.trim() || `untitled ${i + 1}`,
    kind: m.kind,
    start_s: m.start,
    end_s: m.end,
    note: m.note,
  }))
  try {
    const res = await fetch('/api/marks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marks: body }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || res.statusText)
    data.ids.forEach((id, i) => { sent[i].id = id })
    sent.forEach(showClip)
    if (data.warning) toast(data.warning)
    setSaveState('idle', 'All saved')
  } catch (err) {
    setSaveState('error', 'Not saved')
    toast(String(err.message || err))
  } finally {
    saving = false
    if (saveAgain) { saveAgain = false; flushSave() }
  }
}

let answerTimer = null

function scheduleAnswer() {
  const i = state.answerFor
  const note = $('#answer').value.trim()
  clearTimeout(answerTimer)
  if (i < 0 || !note) { answerTimer = null; return }
  setSaveState('busy', 'Saving…')
  answerTimer = setTimeout(() => saveAnswer(i, note), SAVE_DELAY_MS)
}

async function saveAnswer(i, note) {
  answerTimer = null
  const moment = state.session.moments[i]
  try {
    const res = await fetch(`/api/moments/${encodeURIComponent(moment.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || res.statusText)
    moment.heard = true
    moment.sound = note
    if (state.answerFor === i) $('.answer').classList.add('heard')
    if (document.activeElement !== $('#answer')) showAnswer()
    setSaveState('idle', 'All saved')
  } catch (err) {
    setSaveState('error', 'Not saved')
    toast(String(err.message || err))
  }
}

window.addEventListener('beforeunload', (e) => {
  if (saveTimer || saving || answerTimer) { e.preventDefault(); e.returnValue = '' }
})

// ---------------------------------------------------------------- marks

function regionLabel(name) {
  return el('span', { class: 'region-label' }, name || 'untitled')
}

function paint(mark) {
  const [soft, strong] = KIND_COLOR[mark.kind]
  mark.region.setOptions({ color: mark === state.selected ? strong : soft })
}

function addRegion(mark) {
  programmatic.add(mark.uid)
  mark.region = regions.addRegion({
    id: mark.uid,
    start: mark.start,
    end: mark.end,
    color: KIND_COLOR[mark.kind][0],
    content: regionLabel(mark.name),
    drag: true,
    resize: true,
    minLength: 0.02,
  })
  programmatic.delete(mark.uid)
}

function snapRegion(mark) {
  if (!state.snap) return
  let start = nearestBeat(mark.start)
  let end = nearestBeat(mark.end)
  if (end <= start) end = state.session.beats.find((b) => b > start) ?? mark.end
  mark.start = start
  mark.end = end
  mark.region.setOptions({ start, end })
}

function select(mark, { seek = false } = {}) {
  const previous = state.selected
  state.selected = mark
  if (previous && previous.region) paint(previous)
  if (mark) {
    paint(mark)
    if (seek) ws.setTime(mark.start)
  }
  for (const li of document.querySelectorAll('.mark')) {
    li.classList.toggle('selected', mark && li.dataset.uid === mark.uid)
  }
  if (mark) document.querySelector(`.mark[data-uid="${mark.uid}"]`)?.scrollIntoView({ block: 'nearest' })
}

function createMark(start, end, region) {
  const n = state.marks.length + 1
  const mark = {
    uid: region ? region.id : `m${Date.now()}${n}`,
    id: '',
    name: `sound ${n}`,
    kind: 'effect',
    start,
    end,
    note: '',
    region,
  }
  state.marks.push(mark)
  if (region) {
    region.setOptions({ content: regionLabel(mark.name) })
  } else {
    addRegion(mark)
  }
  snapRegion(mark)
  renderList()
  select(mark)
  scheduleSave()
  // Let the listener type the name straight away, once the drag has ended.
  if (pointerDown) window.addEventListener('pointerup', () => setTimeout(() => focusName(mark)), { once: true })
  else focusName(mark)
  return mark
}

function deleteMark(mark) {
  if (state.loop === mark) setLoop(null)
  mark.region.remove()
  state.marks = state.marks.filter((m) => m !== mark)
  state.deleted.push({ ...mark, region: null })
  if (state.selected === mark) state.selected = null
  renderList()
  scheduleSave()
  toast(`Deleted “${mark.name}”.`, { label: 'Undo', run: undoDelete })
}

function undoDelete() {
  const mark = state.deleted.pop()
  if (!mark) { toast('Nothing to undo.'); return }
  state.marks.push(mark)
  addRegion(mark)
  renderList()
  select(mark)
  scheduleSave()
  toast(`Restored “${mark.name}”.`)
}

function setLoop(mark) {
  state.loop = mark
  if (mark) mark.region.play()
  renderList()
}

function playMark(mark) {
  setLoop(null)
  mark.region.play(true)
}

function focusName(mark) {
  const input = document.querySelector(`.mark[data-uid="${mark.uid}"] .mark-name`)
  if (input) { input.focus(); input.select() }
}

// ---------------------------------------------------------------- list

function rowTimes(mark, li) {
  li.querySelector('.start').value = mark.start.toFixed(2)
  li.querySelector('.end').value = mark.end.toFixed(2)
  li.querySelector('.len').textContent = `${(mark.end - mark.start).toFixed(2)} s`
  const where = momentsFor(mark)
  li.querySelector('.where').textContent = where.length ? `in: ${where.join(', ')}` : ''
}

function showClip(mark) {
  const span = document.querySelector(`.mark[data-uid="${mark.uid}"] .clip`)
  if (span) span.textContent = mark.id ? `clip: ${mark.id}.wav` : 'clip: saving…'
}

function renderList() {
  const list = $('#marks-list')
  const sorted = [...state.marks].sort((a, b) => a.start - b.start)
  list.replaceChildren(...sorted.map(renderRow))
  $('#marks-empty').hidden = sorted.length > 0
  $('#mark-count').textContent = `${sorted.length} mark${sorted.length === 1 ? '' : 's'}`
}

function renderRow(mark) {
  const name = el('input', { class: 'mark-name', type: 'text', value: mark.name, placeholder: 'Name this sound', 'aria-label': 'Name' })
  name.addEventListener('input', () => {
    mark.name = name.value
    mark.region.setContent(regionLabel(mark.name))
    scheduleSave()
  })
  name.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); li.querySelector('textarea').focus() }
  })

  const kinds = el('span', { class: 'kind', role: 'group', 'aria-label': 'Kind' })
  for (const kind of Object.keys(KIND_LABEL)) {
    kinds.append(el('button', {
      class: kind === mark.kind ? 'on' : '',
      type: 'button',
      onclick: (e) => { e.stopPropagation(); mark.kind = kind; paint(mark); renderList(); select(mark); scheduleSave() },
    }, KIND_LABEL[kind]))
  }

  const start = el('input', { class: 'start', type: 'number', step: '0.01', min: '0', 'aria-label': 'Start (s)' })
  const end = el('input', { class: 'end', type: 'number', step: '0.01', min: '0', 'aria-label': 'End (s)' })
  const onTime = () => {
    const s = Number(start.value)
    const e = Number(end.value)
    if (!(e > s) || s < 0 || e > ws.getDuration()) { toast('The end must be after the start, inside the clip.'); rowTimes(mark, li); return }
    mark.start = s
    mark.end = e
    mark.region.setOptions({ start: s, end: e })
    rowTimes(mark, li)
    scheduleSave()
  }
  start.addEventListener('change', onTime)
  end.addEventListener('change', onTime)

  const note = el('textarea', { placeholder: 'What do you hear? e.g. a real cymbal, right on the beat; strings underneath', 'aria-label': 'What you hear' })
  note.value = mark.note
  note.addEventListener('input', () => { mark.note = note.value; scheduleSave() })

  const btn = (cls, label, title, run) => el('button', { class: cls, type: 'button', title, onclick: (e) => { e.stopPropagation(); run() } }, label)
  const li = el('li', { class: `mark kind-${mark.kind}${state.selected === mark ? ' selected' : ''}`, 'data-uid': mark.uid },
    el('div', { class: 'mark-row' }, name, kinds),
    el('div', { class: 'mark-row' },
      el('span', { class: 'times' }, start, '→', end, 's'),
      el('span', { class: 'len' }),
      el('span', { class: 'where' }),
      el('span', { class: 'clip', title: 'Cut to audio/intro/marks/ on every save' }),
      el('span', { class: 'actions' },
        btn('play', '▶', 'Play once (Enter)', () => { select(mark); playMark(mark) }),
        btn(`loop${state.loop === mark ? ' on' : ''}`, '⟳', 'Loop on / off (L)', () => { select(mark); setLoop(state.loop === mark ? null : mark) }),
        btn('zoomto', '⌖', 'Zoom to it (Z)', () => { select(mark); zoomTo(mark.start, mark.end) }),
        btn('del', '✕', 'Delete (Delete)', () => deleteMark(mark)),
      ),
    ),
    note,
  )
  li.addEventListener('click', (e) => { if (!e.target.closest('input, textarea, button')) select(mark, { seek: true }) })
  li.addEventListener('focusin', () => { if (state.selected !== mark) select(mark) })
  rowTimes(mark, li)
  li.querySelector('.clip').textContent = mark.id ? `clip: ${mark.id}.wav` : 'clip: saving…'
  return li
}

// ---------------------------------------------------------------- view

function fitPx() {
  return $('#wave').clientWidth / ws.getDuration()
}

function zoomTo(start, end) {
  const span = Math.max(end - start, 0.2)
  ws.zoom(Math.min(MAX_PX_PER_SEC, $('#wave').clientWidth / (span * 1.2)))
  ws.setScrollTime(Math.max(0, start - span * 0.1))
}

function setZoomSlider(px) {
  const fit = fitPx()
  const v = Math.log(px / fit) / Math.log(MAX_PX_PER_SEC / fit)
  $('#zoom').value = String(Math.round(Math.max(0, Math.min(1, v)) * 100))
}

function injectShadowCss() {
  const root = ws.getWrapper().getRootNode()
  if (root instanceof ShadowRoot && !root.querySelector('style[data-reksio]')) {
    const style = el('style', { 'data-reksio': '' })
    style.textContent = SHADOW_CSS
    root.append(style)
  }
}

function drawOverlay() {
  injectShadowCss()
  const wrap = ws.getWrapper()
  overlay = wrap.querySelector(':scope > .ovl')
  if (overlay) return
  overlay = el('div', { class: 'ovl' })
  const d = ws.getDuration()
  const pct = (t) => `${(t / d) * 100}%`
  state.session.moments.forEach((m, i) => {
    overlay.append(el('div', {
      class: `band${i % 2 ? ' alt' : ''}`,
      style: `left:${pct(m.start)};width:${pct(m.end - m.start)}`,
      'data-i': String(i),
    }, el('span', {}, `${i + 1} ${m.id}`)))
  })
  for (const b of state.session.beats) overlay.append(el('div', { class: 'beat', style: `left:${pct(b)}` }))
  const strengths = state.session.onsets.map(([, s]) => s).sort((a, b) => a - b)
  const cut = strengths[Math.floor(strengths.length * 0.85)] ?? Infinity
  for (const [t, s] of state.session.onsets) {
    if (s >= cut) overlay.append(el('div', { class: 'hit', style: `left:${pct(t)}` }, '▲'))
  }
  // Time ruler: a tick every 0.5 s, labelled seconds; how many show depends on zoom.
  for (let k = 0; k * 0.5 <= d; k++) {
    const t = k * 0.5
    const whole = k % 2 === 0
    const cls = ['tick', whole ? 'major' : '', whole && (t % 5 === 0) ? 'every5' : ''].join(' ')
    overlay.append(el('div', { class: cls, style: `left:${pct(t)}` }, el('span', {}, whole ? `${t}s` : `${t.toFixed(1)}`)))
  }
  overlay.append(el('div', { class: 'mark-in', hidden: '' }))
  wrap.append(overlay)
  setDensity(ws.options.minPxPerSec)
}

function setDensity(pxPerSec) {
  if (!overlay) return
  overlay.dataset.density = pxPerSec < 60 ? 'coarse' : pxPerSec < 220 ? 'mid' : 'fine'
}

function showMarkIn(t) {
  drawOverlay()
  const line = overlay.querySelector('.mark-in')
  if (t == null) { line.hidden = true; return }
  line.style.left = `${(t / ws.getDuration()) * 100}%`
  line.hidden = false
}

function updateNow(t) {
  $('#clock').textContent = fmt(t)
  $('#now-time').textContent = fmt(t)
  const found = momentAt(t)
  const i = Math.max(0, found)
  const m = state.session.moments[i]
  $('#now-start').textContent = found < 0 ? `starts at ${m.start.toFixed(1)} s ·` : ''
  if (i === state.moment) return
  $('#now-moment').textContent = `${i + 1}/${state.session.moments.length} · ${m.id}`
  $('#now-moment').title = `Moment ${i + 1}: ${m.id}, ${m.start.toFixed(1)}–${m.end.toFixed(1)} s`
  state.moment = i
  document.querySelectorAll('.moments button').forEach((b, j) => b.classList.toggle('current', j === i))
  overlay?.querySelectorAll('.band').forEach((b, j) => b.classList.toggle('current', j === i))
  $('#now-action').textContent = m.action
  $('#now-text').textContent = m.text
  showAnswer()
}

function showAnswer() {
  const answer = $('#answer')
  if (document.activeElement === answer) return // don't swap text under the cursor
  const i = state.moment
  const m = state.session.moments[i]
  state.answerFor = i
  $('.question').hidden = m.heard
  $('#now-sound').textContent = m.heard ? '' : m.sound
  $('.answer').classList.toggle('heard', m.heard)
  $('#answer-label').textContent = m.heard ? `You heard in ${m.id} (edit to change)` : `Your answer for ${m.id}`
  answer.value = m.heard ? m.sound : ''
}

function goMoment(delta) {
  const moments = state.session.moments
  const i = Math.max(0, Math.min(moments.length - 1, (state.moment < 0 ? -1 : state.moment) + delta))
  const m = moments[i]
  ws.setTime(m.start)
  zoomTo(m.start, m.end)
}

function setRate(rate) {
  ws.setPlaybackRate(rate, true)
  document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', Number(b.dataset.rate) === rate))
}

function setSnap(on) {
  state.snap = on
  $('#snap').checked = on
  toast(on ? 'Snap to beats: on. New and moved edges jump to the nearest beat.' : 'Snap to beats: off.')
}

// ---------------------------------------------------------------- keys

function markKey() {
  const t = ws.getCurrentTime()
  if (state.markIn == null) {
    state.markIn = t
    showMarkIn(t)
    toast('Start marked. Press M again where the sound ends (Esc cancels).')
    return
  }
  const [a, b] = [state.markIn, t].sort((x, y) => x - y)
  state.markIn = null
  showMarkIn(null)
  if (b - a < 0.02) { toast('Too short — play a little, then press M again.'); return }
  createMark(a, b)
}

document.addEventListener('keydown', (e) => {
  if (!$('#help').hidden) {
    if (e.key === 'Escape' || e.key === '?') $('#help').hidden = true
    return
  }
  if (typing(e)) {
    if (e.key === 'Escape') e.target.blur()
    return
  }
  if (e.metaKey || e.ctrlKey) {
    if (e.key.toLowerCase() === 'z') { e.preventDefault(); undoDelete() }
    return
  }
  const t = ws.getCurrentTime()
  const sel = state.selected
  const key = e.key
  const handled = true
  switch (key) {
    case ' ': setLoop(null); ws.playPause(); break
    case 'm': case 'M': markKey(); break
    case 'Enter': if (sel) playMark(sel); else toast('Select a mark first (click it).'); break
    case 'l': case 'L': if (sel) setLoop(state.loop === sel ? null : sel); else toast('Select a mark first (click it).'); break
    case 'z': case 'Z': if (sel) zoomTo(sel.start, sel.end); else if (state.moment >= 0) { const m = state.session.moments[state.moment]; zoomTo(m.start, m.end) } break
    case 'f': case 'F': ws.zoom(fitPx()); break
    case 'ArrowLeft': ws.setTime(Math.max(0, t - (e.shiftKey ? 1 : 0.1))); break
    case 'ArrowRight': ws.setTime(Math.min(ws.getDuration(), t + (e.shiftKey ? 1 : 0.1))); break
    case 'ArrowUp': goMoment(-1); break
    case 'ArrowDown': goMoment(1); break
    case '1': setRate(1); break
    case '2': setRate(0.75); break
    case '3': setRate(0.5); break
    case 's': case 'S': setSnap(!state.snap); break
    case 'Delete': case 'Backspace': if (sel) deleteMark(sel); break
    case 'Escape':
      if (state.markIn != null) { state.markIn = null; showMarkIn(null); toast('Marking cancelled.') }
      else select(null)
      break
    case '?': $('#help').hidden = false; break
    default: return
  }
  if (handled) e.preventDefault()
})

function renderKeys() {
  const table = $('#help-table')
  table.replaceChildren(...KEYS.map(([k, what]) => el('tr', {}, el('td', {}, ...k.split(' ').flatMap((part, i) => (i ? [' ', el('kbd', {}, part)] : [el('kbd', {}, part)]))), el('td', {}, what))))
  const bar = $('#keys-bar')
  bar.replaceChildren(...KEY_BAR.map((k) => {
    const what = KEYS.find(([key]) => key === k)[1].split(' (')[0].split(':')[0]
    return el('span', {}, el('kbd', {}, k), ' ', what)
  }))
}

// ---------------------------------------------------------------- start

async function start() {
  const res = await fetch('/api/session')
  state.session = await res.json()
  const s = state.session
  $('#logo').textContent = s.world_title
  $('#title').textContent = s.title
  document.title = `${s.world_title} · Mark sounds`
  $('#duration').textContent = fmt(s.duration, false)
  $('#tempo').textContent = `pulse ≈ ${s.tempo} BPM (measured)`
  $('#moments').replaceChildren(...s.moments.map((m, i) => el('button', {
    type: 'button',
    title: `${m.start.toFixed(1)}–${m.end.toFixed(1)} s · ${m.action}`,
    onclick: () => { ws.setTime(m.start); zoomTo(m.start, m.end) },
  }, el('b', {}, String(i + 1)), m.id)))
  renderKeys()

  const video = $('#video')
  regions = RegionsPlugin.create()
  ws = WaveSurfer.create({
    container: '#wave',
    media: video,
    url: '/media',
    height: 100,
    waveColor: '#d9c48c',
    progressColor: '#f6e7b8',
    cursorColor: '#ff5a3c',
    cursorWidth: 2,
    sampleRate: 22050,
    normalize: true,
    autoScroll: true,
    autoCenter: true,
    dragToSeek: false,
    plugins: [
      regions,
      SpectrogramPlugin.create({ labels: true, height: 100, scale: 'mel', frequencyMax: 11025, useWebWorker: false, colorMap: 'roseus' }),
      ZoomPlugin.create({ scale: 0.25, maxZoom: MAX_PX_PER_SEC, exponentialZooming: true }),
    ],
  })
  window.reksioMark = { ws, regions, state } // for debugging in the console

  ws.on('ready', () => {
    ws.zoom(fitPx())
    drawOverlay()
    for (const m of s.marks) {
      const mark = { uid: `saved-${m.id}`, id: m.id, name: m.name, kind: m.kind, start: m.start_s, end: m.end_s, note: m.note, region: null }
      state.marks.push(mark)
      addRegion(mark)
    }
    renderList()
    regions.enableDragSelection({ color: KIND_COLOR.effect[0] })
    updateNow(0)
  })
  ws.on('redrawcomplete', drawOverlay)
  ws.on('zoom', (px) => { setZoomSlider(px); setDensity(px) })
  ws.on('timeupdate', (t) => {
    updateNow(t)
    const loop = state.loop
    if (loop && ws.isPlaying()) {
      if (t < loop.start - 0.3 || t > loop.end + 0.3) setLoop(null) // moved away: stop looping
      else if (t >= loop.end - 0.01) ws.setTime(loop.start)
    }
  })
  ws.on('play', () => { $('#play').textContent = '❚❚ Pause'; $('#video-hint').hidden = true })
  ws.on('pause', () => ($('#play').textContent = '▶ Play'))
  ws.on('error', (err) => toast(`Audio problem: ${err.message || err}`))

  regions.on('region-created', (region) => {
    if (programmatic.has(region.id) || byUid(region.id)) return
    createMark(region.start, region.end, region)
  })
  regions.on('region-updated', (region) => {
    const mark = byUid(region.id)
    if (!mark) return
    mark.start = region.start
    mark.end = region.end
    snapRegion(mark)
    const li = document.querySelector(`.mark[data-uid="${mark.uid}"]`)
    if (li) rowTimes(mark, li)
    renderList()
    select(mark)
    scheduleSave()
  })
  regions.on('region-clicked', (region, e) => {
    e.stopPropagation()
    const mark = byUid(region.id)
    if (mark) select(mark)
  })

  $('#play').addEventListener('click', () => { setLoop(null); ws.playPause() })
  document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => setRate(Number(b.dataset.rate))))
  $('#zoom').addEventListener('input', (e) => {
    const fit = fitPx()
    ws.zoom(fit * Math.pow(MAX_PX_PER_SEC / fit, Number(e.target.value) / 100))
  })
  $('#snap').addEventListener('change', (e) => setSnap(e.target.checked))
  $('#answer').addEventListener('input', scheduleAnswer)
  $('#answer').addEventListener('blur', () => { if (!answerTimer) showAnswer() })
  $('#help-open').addEventListener('click', () => ($('#help').hidden = false))
  $('#help-close').addEventListener('click', () => ($('#help').hidden = true))
  $('#help').addEventListener('click', (e) => { if (e.target.id === 'help') $('#help').hidden = true })
}

start().catch((err) => {
  document.body.prepend(el('p', { class: 'toast' }, `Could not start: ${err.message || err}. Is main.py mark still running?`))
})
