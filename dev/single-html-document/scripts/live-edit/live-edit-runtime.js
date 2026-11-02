// Live-edit page runtime. Include with <script src="live-edit-runtime.js"></script>, or let the server inject it
// (live-edit-server.mjs with the runtime option serves it at /__live-edit/runtime.js and adds the tag to the page it serves).
// If a live-edit server answers at this origin, a bar at the top of the page offers "Edit text" (key E): while it is on,
// [data-source-ref] elements become editable and a changed passage is sent when you leave the paragraph. A page with no
// [data-source-ref] at all makes its text blocks editable instead; those edits go to the HTML file itself.
// [data-feedback-id] text answers get a "Save answer" button; other feedback controls (select, radio, checkbox) send on change.
// Not live (file:, report:, or no server answering): does nothing, so the page behaves exactly as before.
(function () {
  if (!/^https?:$/.test(location.protocol)) return
  if (window.__liveEditRuntime) return
  window.__liveEditRuntime = true
  var token = ''
  try { token = window.sessionStorage.getItem('live-edit-token') || '' } catch (e) {}

  function post(url, body) {
    var h = { 'content-type': 'application/json' }
    if (token) h['x-live-edit-token'] = token
    return fetch(url, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(function (r) {
      return r.json().then(function (j) { j.httpStatus = r.status; return j })
    })
  }

  fetch('/__live', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null }).then(function (info) {
    if (!info || !info.live) return
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { start(info) })
    else start(info)
  }).catch(function () {})

  var CSS = [
    '.le-bar{position:sticky;top:0;z-index:2147483000;display:flex;align-items:center;gap:10px;padding:7px 14px;background:#ffffffee;border-bottom:1px solid #e0e4e8;box-sizing:border-box;width:100%;font:12.5px/1.4 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#1c252d;text-align:left}',
    '.le-bar .le-grow{flex:1}',
    '.le-btn{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #cbd2d8;border-radius:7px;padding:5px 10px;font:12.5px/1.3 -apple-system,BlinkMacSystemFont,sans-serif;color:#1c252d;white-space:nowrap}',
    '.le-btn:hover{background:#eef1f3}.le-btn:focus-visible{outline:2px solid #1e6b59;outline-offset:2px}',
    '.le-btn.le-primary{color:#fff;background:#1e6b59;border-color:#1e6b59}.le-btn.le-primary:hover{background:#154f42}',
    '.le-btn svg,.le-chip svg,.le-note svg,.le-toast svg{width:14px;height:14px;flex:none}',
    '.le-kbd{font:11px/1 ui-monospace,"SF Mono",Menlo,monospace;color:#5d6974;background:#f0f2f4;border:1px solid #e0e4e8;border-bottom-width:2px;border-radius:4px;padding:2px 5px}',
    '.le-chip{display:inline-flex;align-items:center;gap:4px;font-size:11px;border-radius:10px;padding:1px 8px;background:#fff4d6;color:#8a5a00;border:1px solid #e2bf4f}',
    '.le-toast{display:inline-flex;align-items:center;gap:6px;font:12px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;color:#154f42}.le-toast.le-warn{color:#9c321f}',
    '.le-note{display:flex;gap:5px;align-items:center;margin:2px 0 10px 6px;font:12px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;color:#154f42;text-align:left}',
    '.le-note.le-warn{display:block;border:1px solid #e3b2a5;background:#fdf0ec;color:#6b2414;border-radius:8px;padding:10px 12px;font-size:12.5px}',
    '.le-note code,.le-toast code{font:12px ui-monospace,"SF Mono",Menlo,monospace}',
    '.le-link{color:#1e6b59;font-size:12px;margin-left:4px;text-decoration:none}.le-link:hover{text-decoration:underline}',
    '.le-fbrow{display:flex;gap:8px;align-items:center;margin-top:8px;font:12.5px/1.4 -apple-system,BlinkMacSystemFont,sans-serif}',
    'html.le-editing [data-le-editable]{outline:1px dashed #d9c27a;outline-offset:2px;cursor:text}',
    'html.le-editing [data-le-editable]:hover{background:#fffaf0}',
    'html.le-editing [data-le-editable]:focus{outline:2px solid #e2bf4f;background:#fffdf5}',
  ].join('\n')
  var ICON = {
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>',
    radio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.247 7.761a6 6 0 0 1 0 8.478"/><path d="M19.075 4.933a10 10 0 0 1 0 14.134"/><path d="M4.925 19.067a10 10 0 0 1 0-14.134"/><path d="M7.753 16.239a6 6 0 0 1 0-8.478"/><circle cx="12" cy="12" r="2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  }
  var BLOCKS = 'p,li,h1,h2,h3,h4,h5,h6,blockquote,td,th,figcaption,dt,dd'
  var NOTE_AFTER = /^(P|H[1-6]|BLOCKQUOTE|FIGCAPTION|DIV|SECTION)$/
  var TEXT_CONTROL = 'textarea,input:not([type]),input[type=text],input[type=search],input[type=email],input[type=url]'

  function el(tag, cls, html) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (html != null) e.innerHTML = html
    return e
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  // Text as it appears in an HTML file: the characters the parser turned back into text are escaped again.
  function htmlText(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;') }

  // The smallest changed passage, widened to whole words and then by whole words until it is at least 24 characters
  // and occurs once in the element's own text. The server still requires an exact single match in the file.
  function passage(before, after) {
    var a = 0
    while (a < before.length && a < after.length && before[a] === after[a]) a++
    var b = 0
    while (b < before.length - a && b < after.length - a && before[before.length - 1 - b] === after[after.length - 1 - b]) b++
    var s = a, e = before.length - b
    while (s > 0 && /\S/.test(before[s - 1])) s--
    while (e < before.length && /\S/.test(before[e])) e++
    function unique(t) { return before.indexOf(t) === before.lastIndexOf(t) }
    var left = true
    while ((e - s < 24 || !unique(before.slice(s, e))) && (s > 0 || e < before.length)) {
      if ((left && s > 0) || e >= before.length) {
        while (s > 0 && /\s/.test(before[s - 1])) s--
        while (s > 0 && /\S/.test(before[s - 1])) s--
      } else {
        while (e < before.length && /\s/.test(before[e])) e++
        while (e < before.length && /\S/.test(before[e])) e++
      }
      left = !left
    }
    return { oldText: before.slice(s, e), newText: after.slice(s, after.length - (before.length - e)) }
  }
  window.__liveEditPassage = passage

  function start(info) {
    var pageId = document.documentElement.getAttribute('data-page-id') || info.page
    var pageFile = String(info.page || '').split('/').pop()
    var style = el('style'); style.setAttribute('data-live-edit-ui', ''); style.textContent = CSS
    document.head.appendChild(style)

    var bar = el('div', 'le-bar'); bar.setAttribute('data-live-edit-ui', '')
    var toggle = el('button', 'le-btn', ICON.pencil + '<span>Edit text</span> <span class="le-kbd">E</span>')
    toggle.type = 'button'
    toggle.title = 'Edit text (E): change a paragraph and click outside it to save it to the source'
    var badge = el('span', 'le-chip', ICON.radio + 'Editing live')
    var status = el('span', 'le-toast'); status.setAttribute('role', 'status')
    bar.appendChild(toggle); bar.appendChild(badge); bar.appendChild(el('span', 'le-grow')); bar.appendChild(status)
    document.body.insertBefore(bar, document.body.firstChild)
    var kept = 0
    function say(html, warn) { status.innerHTML = html; status.classList.toggle('le-warn', !!warn) }

    if (info.tokenRequired && !token) {
      var t = null
      try { t = window.prompt('Live edit token') } catch (e) {}
      if (t) { token = t; try { sessionStorage.setItem('live-edit-token', t) } catch (e) {} }
    }

    function ours(node) { return node.closest && node.closest('[data-live-edit-ui]') }
    // Elements marked with data-source-ref; on a page with none, its text blocks (innermost only), which edit the HTML file.
    var withRef = document.querySelectorAll('[data-source-ref]').length > 0
    function editables() {
      if (withRef) return Array.prototype.slice.call(document.querySelectorAll('[data-source-ref]'))
      return Array.prototype.slice.call(document.body.querySelectorAll(BLOCKS)).filter(function (n) {
        return !ours(n) && !n.closest('[data-feedback-id],script,style,template,noscript') && !n.querySelector(BLOCKS) && /\S/.test(n.textContent)
      })
    }
    // No data-source-ref: the page's source when the server has one (empty ref = the source), else the HTML file itself.
    function refOf(n) { return n.getAttribute('data-source-ref') || (info.source ? '' : pageFile) }
    function isHtmlRef(ref) { return ref ? /\.html?$/i.test(ref.split('#')[0]) : !info.source }
    // Inside ReportScout, "See change" opens its Saved edits panel (the app catches this address; elsewhere it is not shown).
    var inApp = /ReportScout\//.test(navigator.userAgent)

    var editing = false, before = new WeakMap()
    function setEditing(on) {
      editing = on
      document.documentElement.classList.toggle('le-editing', on)
      editables().forEach(function (n) {
        if (on) { n.setAttribute('contenteditable', 'plaintext-only'); n.setAttribute('data-le-editable', ''); if (!before.has(n)) before.set(n, n.textContent) }
        else { n.removeAttribute('contenteditable'); n.removeAttribute('data-le-editable') }
      })
      toggle.classList.toggle('le-primary', on)
      toggle.querySelector('span').textContent = on ? 'Editing text' : 'Edit text'
    }
    toggle.addEventListener('click', function () { setEditing(!editing) })
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'e' && e.key !== 'E') return
      if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing || e.defaultPrevented) return
      var t = e.target
      if (t && t.closest && t.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return
      e.preventDefault()
      setEditing(!editing)
    })

    function noteAfter(n, html, warn) {
      var old = n.__leNote
      if (old && old.parentNode) old.parentNode.removeChild(old)
      n.__leNote = null
      if (!NOTE_AFTER.test(n.tagName)) return
      var note = el('div', 'le-note' + (warn ? ' le-warn' : ''), html)
      note.setAttribute('data-live-edit-ui', '')
      n.parentNode.insertBefore(note, n.nextSibling)
      n.__leNote = note
    }

    document.addEventListener('focusout', function (e) {
      var n = e.target
      if (!editing || !n || !n.hasAttribute || !n.hasAttribute('data-le-editable')) return
      var oldAll = before.get(n), newAll = n.textContent
      if (oldAll == null || oldAll === newAll) return
      var ref = refOf(n), change = passage(oldAll, newAll)
      if (!change.oldText) { say('Not saved: there was no text to change', true); return }
      if (isHtmlRef(ref)) change = { oldText: htmlText(change.oldText), newText: htmlText(change.newText) }
      post('/__edit', { sourceRef: ref, oldText: change.oldText, newText: change.newText, pageId: pageId }).then(function (r) {
        if (r.status === 'saved') {
          before.set(n, newAll)
          noteAfter(n, ICON.check + 'Saved to <code>' + esc(r.file) + '</code>' + (inApp ? ' <a class="le-link" href="/__live-edit/show-edits">See change</a>' : ''))
          say(ICON.check + 'Saved')
        } else if (r.status === 'kept-aside') {
          kept++
          noteAfter(n, '<b>Kept aside, not saved to source.</b> ' + esc(r.reason) + ' in <code>' + esc(ref.split('#')[0] || info.source || pageFile) + '</code>. Your text is held as a pending edit; an agent or you can place it later.', true)
          say(kept === 1 ? '1 edit kept aside' : kept + ' edits kept aside', true)
        } else {
          noteAfter(n, '<b>Not saved.</b> ' + esc(r.error || ('server answered ' + r.httpStatus)), true)
          say('Not saved', true)
        }
      }).catch(function () { say('Not saved: the live server is not answering', true) })
    })

    // Feedback: text answers get a Save answer button; other controls send when they change.
    function sendFeedback(id, text, where) {
      if (!text || !String(text).trim()) { where.textContent = 'Write an answer first'; where.classList.add('le-warn'); return }
      post('/__feedback', { questionId: id, text: String(text), pageId: pageId }).then(function (r) {
        where.classList.toggle('le-warn', r.status !== 'saved')
        where.innerHTML = r.status === 'saved' ? ICON.check + 'Answer saved to <code>' + esc(String(r.file).replace(/\.jsonl$/, '.md')) + '</code>' : 'Not saved: ' + esc(r.error || r.httpStatus)
      }).catch(function () { where.classList.add('le-warn'); where.textContent = 'Not saved: the live server is not answering' })
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-feedback-id]'), function (box) {
      if (ours(box)) return
      var control = box.matches(TEXT_CONTROL) ? box : box.querySelector(TEXT_CONTROL)
      if (!control || box.querySelector('[data-feedback-save]')) return
      var row = el('div', 'le-fbrow'); row.setAttribute('data-live-edit-ui', '')
      var save = el('button', 'le-btn le-primary', 'Save answer'); save.type = 'button'
      var where = el('span', 'le-toast'); where.setAttribute('role', 'status')
      row.appendChild(save); row.appendChild(where)
      control.parentNode.insertBefore(row, control.nextSibling)
      save.addEventListener('click', function () { sendFeedback(box.getAttribute('data-feedback-id'), control.value, where) })
      control.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save.click() } })
    })
    document.addEventListener('change', function (e) {
      var c = e.target, box = c && c.closest && c.closest('[data-feedback-id]')
      if (!box || ours(c) || !('value' in c) || c.matches(TEXT_CONTROL)) return
      if ((c.type === 'radio' || c.type === 'checkbox') && !c.checked) return
      sendFeedback(box.getAttribute('data-feedback-id'), c.value, status)
    })
  }
})()
