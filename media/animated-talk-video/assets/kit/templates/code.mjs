// code: a stable code or terminal panel. Code stays fully visible from the start (a code example must be inspectable);
// builds only move a highlight to the lines being discussed. Terminal and trace panels reveal one turn at a time
// because the sequence is the content. No typing effect: it makes the learner wait for text that is already known.
//  variant 'code'    : slide.code = { text, lang? }, slide.focus = [[firstLine,lastLine], ...] (1-based, inclusive); units = focus ranges
//  variant 'terminal': slide.code.text, a turn starts at each line beginning "$ "; units = turns
//  variant 'trace'   : slide.code.text, a turn starts at each line like "user: ..." / "model: ..."; units = turns.
//                      N17: the scene's larger text (36 px); the transcript is never truncated or shrunk to fit: the panel is a
//                      window and the turns scroll up through it, each scroll timed with the turn that arrives.
// slide: { title, section, accent, variant, code:{text}, focus? }
import { kit, esc } from './_kit.mjs'

export const layout = 'code'
export const aliases = ['terminal', 'trace', 'terminal-agent']

function turns(slide) {
  const lines = String(slide.code?.text ?? '').replace(/\n+$/, '').split('\n')
  const start = slide.variant === 'terminal' ? l => /^\$ /.test(l) : l => /^[A-Za-z][\w -]{0,20}:(\s|$)/.test(l)
  const out = []
  lines.forEach(l => { if (!out.length || start(l)) out.push([]); out[out.length - 1].push(l) })
  return out
}
export const units = slide => (slide.variant ?? 'code') === 'code'
  ? (slide.focus ?? []).map(r => `lines ${r[0]}-${r[1]}`)
  : turns(slide).map(t => t[0])

export const css = `
.cdp .twin { overflow: hidden; }
.cdp .tscroll { position: relative; width: 100%; }
.cdp .panel { position: absolute; left: 120px; right: 120px; border-radius: 20px; background: #101418; color: #f2f1ea; padding: 30px 40px; overflow: hidden; font-family: var(--mono); }
.cdp .ln { position: relative; isolation: isolate; white-space: pre; padding: 0 14px; margin: 0 -14px; border-radius: 6px; line-height: 1.5; }
.cdp .ln .hl { background: rgba(255,255,255,0.16); }
.cdp .tn { position: relative; margin-bottom: 14px; padding-left: 18px; border-left: 6px solid var(--c, #8a949e); }
.cdp .tn.you { --c: #6aa2ff; } .cdp .tn.cmd { --c: #ffb089; }
.cdp .tn .ln { color: #d8d7cf; } .cdp .tn .ln:first-child { color: #fff; font-weight: 700; }
/* trace = TalkWeaver terminal-agent look (N29) */
.cdp .panel.term { background: #0a0d12; padding: 26px 40px 24px; text-align: left; }
.cdp .term .tn { border-left: 0; padding-left: 0; margin-bottom: 20px; --c: transparent; }
.cdp .term .lab { font-size: 22px; line-height: 34px; letter-spacing: .12em; text-transform: uppercase; color: #7f8ea3; }
.cdp .term .ln { position: relative; white-space: pre-wrap; word-break: break-word; line-height: 1.5; font-weight: 400; color: #e6edf3; padding-left: 1.7em; text-indent: 0; margin: 0; }
.cdp .term .tn .ln:first-child { font-weight: 400; color: #e6edf3; }
.cdp .term .pbox { border: 2px solid #3a4757; border-radius: 12px; padding: 10px 22px 10px 56px; position: relative; }
.cdp .term .pbox .ln { padding-left: 0; color: #7cc4f5; }
.cdp .term .pbox .gt { position: absolute; left: 22px; top: 10px; color: #fff; font-weight: 700; line-height: 1.5; }
.cdp .term .dot { position: absolute; left: 0.3em; top: 0.55em; width: 0.5em; height: 0.5em; border-radius: 50%; background: #ffb86b; }
.cdp .term .call { color: #e6edf3; } .cdp .term .call b { color: #ffb86b; font-weight: 700; }
.cdp .term .ans { color: #5eead4; } .cdp .term .ans .dot { background: #5eead4; }
.cdp .term .res { color: #f0a6f5; } .cdp .term .res .el { position: absolute; left: 0.1em; font-style: normal; color: #c78ccc; }
.cdp .term .thk { color: #b49cf5; font-style: italic; } .cdp .term .thk .st { position: absolute; left: 0; font-style: normal; }

`

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'green', sid = ctx.sid, v = slide.variant ?? 'code'
  const all = String(slide.code?.text ?? '').replace(/\n+$/, '').split('\n')
  const maxlen = Math.max(...all.map(l => l.length), 10)
  let size = Math.max(22, Math.min(44, Math.floor(1560 / (0.6 * maxlen))))
  if (maxlen > 88) k.warn(`longest code line is ${maxlen} characters; text shrinks to ${size}px, consider cropping the code`)
  const fitH = 640 / (size * 1.5)
  if (all.length + (v === 'code' ? 0 : turns(slide).length * 0.4) > fitH) {
    size = Math.max(20, Math.floor(640 / (all.length * 1.5 * 1.1)))
    if (all.length * size * 1.5 > 650) k.warn(`${all.length} lines do not fit; crop the code to the lines he discusses`)
  }
  if (v === 'trace') return renderTrace(slide, ctx, k, A)
  let html = k.top(slide.kicker ?? '', slide.title, A), js = k.topJs()
  const panelH = Math.min(735, Math.round(all.length * size * 1.5 + (v === 'code' ? 0 : turns(slide).length * 14) + 80))
  const panelTop = Math.round(255 + (735 - panelH) / 2)
  if (v === 'code') {
    html += `<div class="panel" id="${sid}pn" style="top:${panelTop}px;height:${panelH}px;font-size:${size}px">${all.map((l, i) => `<div class="ln" id="${sid}L${i + 1}"><i class="hl"></i>${esc(l) || ' '}</div>`).join('')}</div>`
    js += k.show(`#${sid}pn`, k.t0 + 0.3, 'none')
    const fo = slide.focus ?? [], b = fo.length ? k.B(fo.length) : []
    fo.forEach((r, i) => {
      const sel = []; for (let n = r[0]; n <= r[1]; n++) sel.push(`#${sid}L${n} .hl`)
      const t = k.at(b[i]), tEnd = k.at(fo[i + 1] ? Math.max(b[i] + 0.8, b[i + 1] - 0.05) : Math.min(ctx.end - 0.4, b[i] + 8))
      js += `tl.to(${JSON.stringify(sel.join(', '))}, { opacity: 1, duration: 0.3 }, ${t});\ntl.to(${JSON.stringify(sel.join(', '))}, { opacity: 0, duration: 0.3 }, ${tEnd});\n`
    })
  } else {
    const T = turns(slide), b = k.B(T.length)
    html += `<div class="panel" style="top:${panelTop}px;height:${panelH}px;font-size:${size}px">${T.map((t, i) => {
      const cls = v === 'terminal' ? 'cmd' : /^(you|user)\b/i.test(t[0]) ? 'you' : ''
      return `<div class="tn ${cls}" id="${sid}T${i}">${t.map(l => `<div class="ln">${esc(l) || ' '}</div>`).join('')}</div>` }).join('')}</div>`
    T.forEach((_, i) => { js += k.show(`#${sid}T${i}`, b[i], 'u', { travel: 18 }) })
  }
  return { html, js, cls: 'cdp' }
}

// Trace (N29): the terminal-agent look of Dominik's TalkWeaver app (locked 2026-10-08): near-black panel,
// the prompt in an outlined box, "thinking" in violet italics, tool calls as an orange dot and name(args), results under a
// corner mark in magenta, the answer under a teal dot. A small mono line above each turn keeps who-sends-to-whom visible.
// Fixed 36 px text in a window; turns pile up and the pile scrolls so the newest turn is always whole in view.
const TC = /^<tool_call\s+name="([^"]+)"\s+args=(.*?)\/>$/
function traceKind(t) {
  const head = t[0], role = (head.match(/^([A-Za-z][\w -]*):/) ?? [])[1]?.toLowerCase() ?? '', route = head.replace(/^[^:]*:\s*/, '')
  const body = t.slice(1)
  if (/^(you|user)$/.test(role)) return { kind: 'prompt', route, body }
  if (role === 'tool') return { kind: 'result', route, body }
  if (body.length === 1 && TC.test(body[0].trim())) { const m = body[0].trim().match(TC); return { kind: 'call', route, name: m[1], args: m[2].replace(/^\{|\}$/g, m => m), body } }
  if (/→\s*user/i.test(route)) return { kind: 'answer', route, body }
  return { kind: 'think', route, body }
}
function renderTrace(slide, ctx, k, A) {
  const sid = ctx.sid, T = turns(slide), b = k.B(T.length), size = 36, lh = size * 1.5
  const innerW = 1680 - 80 - 4
  const cpl = Math.max(10, Math.floor(innerW / (0.6 * size)))  // mono advance 0.6 em
  const K = T.map(traceKind)
  const lines = (tk, pre) => tk.kind === 'call' ? Math.max(1, Math.ceil((tk.name.length + tk.args.length + 3) / (cpl - 2))) : tk.body.reduce((a, l) => a + Math.max(1, Math.ceil((l.length + pre) / cpl)), 0)
  const th = K.map(tk => 34 + lines(tk, tk.kind === 'result' ? 3 : tk.kind === 'prompt' ? 2 : 2) * lh + (tk.kind === 'prompt' ? 28 : 0) + 20)   // label + text + box padding + gap
  const total = th.reduce((a, x) => a + x, 0)
  const winH = Math.min(735, Math.round(total + 54))            // window: the whole transcript if it fits, else the band
  const panelTop = Math.round(255 + (735 - winH) / 2), inner = winH - 50
  const row = (tk, i) => {
    const lab = `<div class="lab">${esc(tk.route || tk.kind)}</div>`
    const ls = tk.body.map(l => esc(l) || ' ')
    if (tk.kind === 'prompt') return `${lab}<div class="pbox"><span class="gt">&gt;</span>${ls.map(l => `<div class="ln">${l}</div>`).join('')}</div>`
    if (tk.kind === 'call') return `${lab}<div class="ln call"><i class="dot"></i><b>${esc(tk.name)}</b>(${esc(tk.args)})</div>`
    if (tk.kind === 'result') return `${lab}${ls.map(l => `<div class="ln res"><i class="el">&#9492;</i>${l}</div>`).join('')}`
    if (tk.kind === 'answer') return `${lab}${ls.map(l => `<div class="ln ans"><i class="dot"></i>${l}</div>`).join('')}`
    return `${lab}${ls.map(l => `<div class="ln thk"><i class="st">&#10043;</i>${l}</div>`).join('')}`
  }
  const html = k.top(slide.kicker ?? '', slide.title, A) +
    `<div class="panel term" style="top:${panelTop}px;height:${winH}px;font-size:${size}px"><div class="twin" style="height:${inner}px"><div class="tscroll" id="${sid}sc">${K.map((tk, i) => `<div class="tn ${tk.kind}" id="${sid}T${i}">${row(tk, i)}</div>`).join('')}</div></div></div>`
  let js = k.topJs(), y = 0
  T.forEach((_, i) => {
    js += k.show(`#${sid}T${i}`, b[i], 'u', { travel: 18 })
    const bottom = th.slice(0, i + 1).reduce((a, x) => a + x, 0)
    if (bottom - y > inner) {   // scroll in whole turns: the first turn in the window starts at its top, nothing is cut mid-turn
      const starts = th.map((_, q) => th.slice(0, q).reduce((a, x) => a + x, 0))
      y = starts.find(st => bottom - st <= inner) ?? bottom - inner; js += `tl.to(${JSON.stringify('#' + sid + 'sc')}, { y: ${-y}, duration: 0.8, ease: "power2.inOut" }, ${k.at(b[i])});\n` }
  })
  if (total > inner + 1) k.warn(`trace is ${Math.round(total)} px tall in a ${inner} px window; it scrolls (${T.length} turns, last at ${b[T.length - 1]} s)`)
  return { html, js, cls: 'cdp' }
}
