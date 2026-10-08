// The lab: draws every pose in Figure.POSES in a grid, and one Reksio acting
// through a sequence of them, blending from each to the next with a little
// overshoot. A workbench only: it keeps its own time (requestAnimationFrame),
// not the game's Clock.

/* global Figure */
;(() => {
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const P = Figure.POSES

  // what the big Reksio does, in order: [pose, ms to get there, ms to hold]
  const SEQUENCE = [
    ['stand', 500, 900], ['handsOnHips', 350, 900], ['pawOnChin', 400, 1100],
    ['idea', 220, 900], ['grin', 260, 1000], ['shrug', 300, 900],
    ['stand', 350, 500], ['onFours', 420, 600], ['sniff', 380, 1100],
    ['onFours', 300, 300], ['leap', 260, 500], ['onFours', 300, 400],
    ['stand', 420, 500], ['armsWide', 300, 1000], ['flex', 320, 1000],
    ['worried', 300, 900], ['cross', 260, 900], ['surprised', 160, 900],
    ['toothy', 260, 900], ['sitUp', 420, 1000], ['onBack', 500, 1200],
  ]

  /** Ease out with a small overshoot: a move lands past its mark and settles. */
  function overshoot(t) {
    const s = 1.4
    const u = t - 1
    return 1 + u * u * ((s + 1) * u + s)
  }

  function cell(name) {
    const div = document.createElement('div')
    div.className = 'cell'
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('viewBox', '-140 -230 300 250')
    div.appendChild(svg)
    const label = document.createElement('span')
    label.textContent = name
    div.appendChild(label)
    document.getElementById('grid').appendChild(div)
    Figure.mount(svg)(P[name])
  }

  for (const name of Object.keys(P)) cell(name)
  const reference = document.getElementById('reference')
  reference.addEventListener('error', () => reference.parentElement.remove())

  const draw = Figure.mount(document.getElementById('stage'))
  const nowLabel = document.getElementById('now')
  const turnInput = document.getElementById('turn')
  // ?pose=grin holds the big Reksio still in that pose
  const held = new URLSearchParams(location.search).get('pose')
  let paused = false
  let turnOverride = null
  document.getElementById('stage').addEventListener('click', () => { paused = !paused })
  turnInput.addEventListener('input', () => { turnOverride = Number(turnInput.value) })

  let step = 0
  let from = P.stand
  let started = performance.now()
  let pausedAt = 0

  function frame(now) {
    if (held && P[held]) {
      draw(turnOverride === null ? P[held] : Figure.vary(P[held], { head: { turn: turnOverride } }))
      nowLabel.textContent = held
      requestAnimationFrame(frame)
      return
    }
    if (paused) {
      if (!pausedAt) pausedAt = now
      requestAnimationFrame(frame)
      return
    }
    if (pausedAt) { started += now - pausedAt; pausedAt = 0 }
    const [name, moveMs, holdMs] = SEQUENCE[step]
    const t = now - started
    const k = t < moveMs ? overshoot(t / moveMs) : 1
    let pose = Figure.mix(from, P[name], k)
    // breathing while held: the chest rises and falls a little
    pose = Figure.vary(pose, { chest: [pose.chest[0], pose.chest[1] - 1.5 * Math.sin(now / 420)] })
    if (turnOverride !== null) pose = Figure.vary(pose, { head: { turn: turnOverride } })
    draw(pose)
    nowLabel.textContent = name
    if (t > moveMs + holdMs) {
      from = P[name]
      step = (step + 1) % SEQUENCE.length
      started = now
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
})()
