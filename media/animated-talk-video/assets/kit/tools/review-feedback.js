// Review notes for review.html (copied into the project by review-page.mjs). Classic script; uses SCENES, p, go, now, fmt and FEEDBACK from the page.
(function () {
  const F = window.ReviewFeedbackFormat
  const served = location.protocol === 'http:' && /^(127\.0\.0\.1|localhost)$/.test(location.hostname)
  const KEY = 'hf-review:' + FEEDBACK.project + ':' + FEEDBACK.hash
  const PREFIX = 'hf-review:' + FEEDBACK.project + ':'
  const $ = (id) => document.getElementById(id)
  const rail = $('rail'), frame = document.querySelector('.frame'), hit = $('hit'), pins = $('pins')
  let state = { notes: [], general: '' }
  let draft = null // { id|null, t, scene, pin, text }
  let hoverId = null

  // ---- storage (drafts only; never required for the page to work)
  function load() { try { const s = localStorage.getItem(KEY); if (s) { const o = JSON.parse(s); if (o && Array.isArray(o.notes)) state = { notes: o.notes, general: o.general || '' } } } catch (e) {} }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify({ hash: FEEDBACK.hash, notes: state.notes, general: state.general, at: new Date().toISOString() })) } catch (e) {} }
  function otherVersions() { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX) && k !== KEY) { const o = JSON.parse(localStorage.getItem(k) || '{}'); if (o && Array.isArray(o.notes) && (o.notes.length || (o.general || '').trim())) out.push({ key: k, o }) } } } catch (e) {} return out }

  // ---- helpers
  const sorted = () => state.notes.slice().sort((a, b) => a.t - b.t)
  const numberOf = (id) => sorted().findIndex((n) => n.id === id) + 1
  const sceneFor = (t) => { let k = 0; SCENES.forEach((s, i) => { if (t >= s.start - 1e-6) k = i }); const s = SCENES[k]; return { n: s.n, id: s.id, title: s.title } }
  const newId = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const typing = (el) => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'range' && el.type !== 'button') || el.isContentEditable)
  window.reviewTyping = typing

  // The composition is letterboxed 16:9 inside .frame; pins use % of the video picture, not of the box.
  function videoRect() { const w = frame.clientWidth, h = frame.clientHeight, r = 16 / 9; let vw = w, vh = w / r; if (vh > h) { vh = h; vw = h * r } return { left: (w - vw) / 2, top: (h - vh) / 2, width: vw, height: vh } }
  function placeLayers() { const r = videoRect();[hit, pins].forEach((el) => { el.style.left = r.left + 'px'; el.style.top = r.top + 'px'; el.style.width = r.width + 'px'; el.style.height = r.height + 'px' }) }
  addEventListener('resize', placeLayers)

  // ---- feedback panel at the top of the rail
  const panel = document.createElement('section'); panel.className = 'fb'
  panel.innerHTML = '<div class="fb-head"><b>Feedback</b><span class="fb-count" id="fbCount"></span></div>' +
    '<div class="fb-warn" id="fbWarn" hidden></div>' +
    '<label class="fb-lab" for="fbGeneral">General note for the whole video</label><textarea id="fbGeneral" rows="2" placeholder="Anything that applies to the whole video"></textarea>' +
    '<div class="fb-actions" id="fbActions"></div><div class="fb-msg" id="fbMsg" role="status"></div>' +
    '<div class="fb-hint">N or the Note button adds a note at the current time. Click the picture to add a note with a pin there.</div>'
  rail.prepend(panel)
  const actions = $('fbActions'), msg = $('fbMsg'), general = $('fbGeneral')
  function button(label, fn, cls) { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (cls) b.className = cls; b.onclick = fn; actions.appendChild(b); return b }
  if (served) {
    button('Save feedback', save, 'primary').id = 'fbSave'
  } else {
    button('Copy feedback', copy, 'primary').id = 'fbCopy'
    button('Download feedback.json', download).id = 'fbDownload'
    const h = document.createElement('div'); h.className = 'fb-file'; h.id = 'fbFileHint'
    h.innerHTML = 'Opened as a file, so this page cannot save into the project. Paste the copied feedback to the agent, or to save it straight into the project run <code></code> and open <code>http://127.0.0.1:4777/review/review.html</code>.'
    h.querySelector('code').textContent = FEEDBACK.serveHint
    panel.insertBefore(h, $('fbMsg').nextSibling)
  }
  general.oninput = () => { state.general = general.value; persist() }
  function say(text, kind) { msg.textContent = text; msg.className = 'fb-msg ' + (kind || '') }

  const noteBtn = $('noteBtn'); if (noteBtn) noteBtn.onclick = () => openDraft(null)

  // ---- payload
  function payload() {
    return { version: 1, project: FEEDBACK.project, compositionHash: FEEDBACK.hash, savedAt: new Date().toISOString(), general: state.general,
      notes: sorted().map((n) => ({ id: n.id, scene: n.scene, t: n.t, pin: n.pin || null, text: n.text })) }
  }
  async function save() {
    if (!state.notes.length && !state.general.trim()) return say('Nothing to save yet: add a note first.', 'err')
    say('Saving…')
    let res, body
    try { res = await fetch('/__feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload()) }) }
    catch (e) { return say('Could not reach the review server. Is the serve command still running?', 'err') }
    try { body = await res.json() } catch (e) { body = null }
    if (res.ok && body && body.ok) say('Saved: ' + body.file, 'ok')
    else say('Not saved: ' + ((body && body.error) || ('the server answered ' + res.status)), 'err')
  }
  function asText() { const fb = payload(); return F.toMarkdown(fb) + '\n```json\n' + JSON.stringify(fb, null, 2) + '\n```\n' }
  async function copy() {
    const text = asText()
    try { await navigator.clipboard.writeText(text); return say('Copied ' + F.plural(state.notes.length) + '. Paste them to the agent.', 'ok') } catch (e) {}
    let ta = $('fbCopyText')
    if (!ta) { ta = document.createElement('textarea'); ta.id = 'fbCopyText'; ta.className = 'fb-copy'; ta.readOnly = true; panel.appendChild(ta) }
    ta.value = text; ta.focus(); ta.select()
    let ok = false; try { ok = document.execCommand('copy') } catch (e) {}
    say(ok ? 'Copied ' + F.plural(state.notes.length) + '. Paste them to the agent.' : 'The browser blocked copying. The text below is selected: press ⌘C.', ok ? 'ok' : 'err')
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload(), null, 2) + '\n'], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = 'feedback.json'; document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000); say('Downloaded feedback.json.', 'ok')
  }

  // ---- draft editor
  function openDraft(note, pin) {
    p.pause(); setTimeout(() => { const b = $('play'); if (b) b.textContent = 'Play' }, 0)
    if (note) draft = { id: note.id, t: note.t, scene: note.scene, pin: note.pin ? { ...note.pin } : null, text: note.text }
    else if (draft && !draft.id) { if (pin) draft.pin = pin }
    else { const t = Math.round(now() * 100) / 100; draft = { id: null, t, scene: sceneFor(t), pin: pin || null, text: '' } }
    render(); const ta = $('draftText'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length) }
  }
  function closeDraft() { draft = null; render() }
  function commitDraft() {
    if (!draft) return
    const text = $('draftText').value.trim()
    if (!text) { $('draftText').focus(); return say('Write something in the note, or press Esc to cancel.', 'err') }
    if (draft.id) { const n = state.notes.find((x) => x.id === draft.id); if (n) { n.text = text; n.pin = draft.pin } }
    else state.notes.push({ id: newId(), scene: draft.scene, t: draft.t, pin: draft.pin, text })
    persist(); draft = null; say(''); render()
  }
  hit.addEventListener('click', (e) => {
    const r = hit.getBoundingClientRect()
    const pin = { x: Math.round(Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)) * 10) / 10, y: Math.round(Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100)) * 10) / 10 }
    if (draft) { draft.pin = pin; render(); const ta = $('draftText'); if (ta) ta.focus() } else openDraft(null, pin)
  })

  function draftBox() {
    const box = document.createElement('div'); box.className = 'draft'; box.id = 'draft'
    const head = document.createElement('div'); head.className = 'draft-head'
    head.textContent = (draft.id ? 'Edit note ' + numberOf(draft.id) : 'New note') + ' · ' + fmt(draft.t) + ' · scene ' + draft.scene.n
    const ta = document.createElement('textarea'); ta.id = 'draftText'; ta.rows = 3; ta.value = draft.text; ta.placeholder = 'What should change here?'
    ta.oninput = () => { draft.text = ta.value }
    const pinLine = document.createElement('div'); pinLine.className = 'draft-pin'
    if (draft.pin) { pinLine.textContent = 'Pin at ' + draft.pin.x.toFixed(0) + '%, ' + draft.pin.y.toFixed(0) + '% of the picture. '; const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'link'; rm.textContent = 'Remove pin'; rm.onclick = () => { draft.pin = null; render(); $('draftText').focus() }; pinLine.appendChild(rm) }
    else pinLine.textContent = 'Optional: click the picture to place a pin.'
    const row = document.createElement('div'); row.className = 'draft-actions'
    const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'primary'; ok.id = 'draftSave'; ok.textContent = 'Save note (⌘↩)'; ok.onclick = commitDraft
    const no = document.createElement('button'); no.type = 'button'; no.textContent = 'Cancel (Esc)'; no.onclick = closeDraft
    row.append(ok, no); box.append(head, ta, pinLine, row)
    return box
  }

  // ---- rail rendering: notes under their scene
  function render() {
    rail.querySelectorAll('.notes,.draft').forEach((e) => e.remove())
    const list = sorted()
    $('fbCount').textContent = list.length ? F.plural(list.length) : 'no notes yet'
    SCENES.forEach((s) => {
      const row = rail.querySelector('.scene[data-n="' + s.n + '"]'); if (!row) return
      const mine = list.filter((n) => n.scene.n === s.n)
      let after = row
      if (mine.length) {
        const ul = document.createElement('ol'); ul.className = 'notes'
        mine.forEach((n) => {
          const li = document.createElement('li'); li.className = 'note'; li.dataset.id = n.id
          const num = document.createElement('b'); num.className = 'nn'; num.textContent = numberOf(n.id)
          const body = document.createElement('div'); body.className = 'nb'
          const meta = document.createElement('div'); meta.className = 'nm'; meta.textContent = fmt(n.t) + (n.pin ? ' · pin' : '')
          const txt = document.createElement('div'); txt.className = 'nt'; txt.textContent = n.text
          body.append(meta, txt)
          const tools = document.createElement('span'); tools.className = 'ntools'
          const ed = document.createElement('button'); ed.type = 'button'; ed.className = 'link'; ed.textContent = 'Edit'; ed.onclick = (e) => { e.stopPropagation(); go(n.t); openDraft(n) }
          const del = document.createElement('button'); del.type = 'button'; del.className = 'link danger'; del.textContent = 'Delete'; del.onclick = (e) => { e.stopPropagation(); state.notes = state.notes.filter((x) => x.id !== n.id); if (draft && draft.id === n.id) draft = null; persist(); render() }
          tools.append(ed, del)
          li.append(num, body, tools)
          li.onclick = () => { p.pause(); go(n.t) }
          li.onmouseenter = () => { hoverId = n.id; drawPins() }; li.onmouseleave = () => { hoverId = null; drawPins() }
          ul.appendChild(li)
        })
        row.after(ul); after = ul
      }
      if (draft && draft.scene.n === s.n) { const box = draftBox(); after.after(box); box.scrollIntoView({ block: 'nearest' }) }
    })
    drawPins()
  }

  // ---- pins over the picture: a note's pin shows while playback is within 1 s of it, or while hovering it in the list
  let lastPins = ''
  function drawPins() {
    const t = now(), list = sorted(), show = []
    list.forEach((n, i) => { if (n.pin && (Math.abs(n.t - t) <= 1 || n.id === hoverId) && !(draft && draft.id === n.id)) show.push({ x: n.pin.x, y: n.pin.y, label: String(i + 1), cls: n.id === hoverId ? 'hover' : '' }) })
    if (draft && draft.pin) show.push({ x: draft.pin.x, y: draft.pin.y, label: draft.id ? String(numberOf(draft.id)) : '+', cls: 'draft' })
    const sig = JSON.stringify(show); if (sig === lastPins) return; lastPins = sig
    pins.textContent = ''
    show.forEach((s) => { const el = document.createElement('span'); el.className = 'pin ' + s.cls; el.style.left = s.x + '%'; el.style.top = s.y + '%'; el.textContent = s.label; pins.appendChild(el) })
  }
  setInterval(drawPins, 120)

  // ---- keys: N new note, Esc cancel, ⌘/Ctrl+Enter save; nothing fires while typing except the two editor keys
  addEventListener('keydown', (e) => {
    const inDraft = e.target && e.target.id === 'draftText'
    if (inDraft && e.key === 'Escape') { e.preventDefault(); closeDraft(); return }
    if (inDraft && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commitDraft(); return }
    if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openDraft(null) }
    else if (e.key === 'Escape' && draft) { e.preventDefault(); closeDraft() }
  }, true)

  // ---- start
  load(); general.value = state.general
  const old = otherVersions()
  if (!state.notes.length && !state.general.trim() && old.length) {
    const w = $('fbWarn'); w.hidden = false
    const count = old.reduce((a, x) => a + x.o.notes.length, 0)
    w.innerHTML = '<span></span> <button type="button" id="fbOldShow">Load them anyway</button> <button type="button" id="fbOldDrop">Discard them</button>'
    w.firstChild.textContent = 'This page has changed since you last wrote notes on it (' + F.plural(count) + ', from an earlier version of the video). Their times may no longer match.'
    $('fbOldShow').onclick = () => { old.forEach((x) => { state.notes.push(...x.o.notes); if ((x.o.general || '').trim()) state.general = (state.general ? state.general + '\n' : '') + x.o.general }); general.value = state.general; persist(); try { old.forEach((x) => localStorage.removeItem(x.key)) } catch (e) {} w.hidden = true; render() }
    $('fbOldDrop').onclick = () => { try { old.forEach((x) => localStorage.removeItem(x.key)) } catch (e) {} w.hidden = true }
  }
  placeLayers(); render()
  window.reviewFeedback = { state: () => state, payload }
})()
