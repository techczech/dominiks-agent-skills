// Shared by the review page (copied into the project as review-feedback-format.js, a classic script) and by review-serve.mjs (require).
// Turns a feedback object into the readable Markdown file: one line per note.
(function (root) {
  function fmtTime(t) { t = Math.max(0, +t || 0); const m = Math.floor(t / 60); return m + ':' + (t - m * 60).toFixed(1).padStart(4, '0') }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes') }
  function oneLine(s) { return String(s || '').replace(/\s*\n\s*/g, ' / ').trim() }
  function toMarkdown(fb) {
    const out = ['# Feedback: ' + oneLine(fb.project), '', 'Saved ' + oneLine(fb.savedAt) + ' · composition ' + oneLine(fb.compositionHash) + ' · ' + plural(fb.notes.length), '']
    out.push('## General', '', fb.general && fb.general.trim() ? fb.general.trim() : '(none)', '', '## Notes', '')
    if (!fb.notes.length) out.push('(none)')
    fb.notes.forEach((n, i) => {
      const pin = n.pin ? ' · pin ' + n.pin.x.toFixed(1) + '%, ' + n.pin.y.toFixed(1) + '%' : ''
      out.push((i + 1) + '. Scene ' + n.scene.n + ' "' + oneLine(n.scene.title) + '" · ' + fmtTime(n.t) + ' (' + n.t.toFixed(2) + ' s)' + pin + ' · ' + oneLine(n.text))
    })
    return out.join('\n') + '\n'
  }
  const api = { fmtTime, plural, toMarkdown }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.ReviewFeedbackFormat = api
})(this)
