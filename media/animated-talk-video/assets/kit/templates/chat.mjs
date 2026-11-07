// chat: a conversation drawn with the chat window of Dominik's TalkWeaver app (locked 2026-10-08). N29: not an invented bubble cascade.
// One message or part per build. roles (colours are TalkWeaver's --k-* kinds):
//   user       grey bubble, right
//   reasoning  violet "Thought" row with an italic text behind a left rule
//   context    olive "Searched" row; text = sources separated by " | " (chips)
//   tool       orange "Used <tool>" row; text = the call, in a tinted mono box
//   result     magenta "Tool results" box; text lines separated by " | " or newlines
//   assistant  green round avatar and the answer text
// slide: { title, section, accent, items:[{role, text, label?}] }   (label overrides the part's heading)
import { kit, esc } from './_kit.mjs'

export const layout = 'chat'
export const aliases = ['chat-lanes']
export const units = slide => slide.items.map(i => i.text)

export const css = `
.ct .band { position: absolute; left: 0; right: 0; top: 255px; bottom: 90px; display: flex; align-items: center; justify-content: center; }
.ct .win { width: 1500px; background: #fff; border-radius: 26px; box-shadow: 0 0 0 2px #d5d8dd; padding: 34px 54px 38px; font-size: 34px; line-height: 1.35; color: #101418; --k-reasoning: #6d47c9; --k-context: #7a6200; --k-call: #b45309; --k-result: #a21caf; --k-answer: #0f766e; }
.ct .m { position: relative; }
.ct .m + .m { margin-top: 22px; }
.ct .user { display: flex; justify-content: flex-end; }
.ct .bub { max-width: 900px; background: #eceef1; border-radius: 30px; padding: 14px 30px; }
.ct .part { --k: var(--k-reasoning); }
.ct .part.context { --k: var(--k-context); } .ct .part.tool { --k: var(--k-call); } .ct .part.result { --k: var(--k-result); }
.ct .ph { display: flex; align-items: center; gap: 12px; font-size: 0.84em; font-weight: 700; color: var(--k); }
.ct .ph .ico { font-size: 0.9em; }
.ct .reasoning .body { margin: 6px 0 0 14px; padding-left: 22px; border-left: 5px solid var(--k); font-style: italic; color: #3b434c; }
.ct .chips { display: flex; flex-wrap: wrap; gap: 14px; margin: 8px 0 0 14px; }
.ct .chip { display: flex; align-items: center; gap: 10px; border: 2px solid #d5d8dd; border-radius: 14px; padding: 8px 18px; font-size: 0.8em; }
.ct .chip .ico { color: var(--k-context); }
.ct .tool .body { margin: 6px 0 0 14px; padding-left: 22px; border-left: 5px solid var(--k); }
.ct .call { font-family: var(--mono); font-size: 0.8em; background: #fdf0e0; border: 2px solid #f0cfa3; border-radius: 12px; padding: 10px 20px; overflow-wrap: anywhere; }
.ct .result .body { margin: 6px 0 0 14px; font-family: var(--mono); font-size: 0.8em; background: #fae9fb; border: 2px solid #e8c3ec; border-radius: 12px; padding: 10px 20px; line-height: 1.4; }
.ct .ans { display: flex; align-items: flex-start; gap: 18px; }
.ct .avatar { flex: none; width: 52px; height: 52px; margin-top: 2px; border-radius: 50%; background: var(--k-answer); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 30px; }
.ct .avatar .ico { margin: 0; }
`

const LABEL = { reasoning: 'Thought', context: 'Searched sources', tool: 'Used a tool', result: 'Tool results' }
const ICON = { reasoning: 'sparkles', context: 'search', tool: 'wrench', result: 'check' }

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'green', n = slide.items.length, b = k.B(n), sid = ctx.sid
  const rows = slide.items.map(m => {
    const role = m.role === 'user' || m.role === 'assistant' ? m.role : (LABEL[m.role] ? m.role : 'assistant')
    const label = m.who && !['You', 'Agent'].includes(m.who) ? m.who : LABEL[role]
    const ic = k.icon({ icon: ICON[role] })
    if (role === 'user') return `<div class="user"><div class="bub">${esc(m.text)}</div></div>`
    if (role === 'assistant') return `<div class="ans"><span class="avatar">${k.icon({ icon: 'sparkles' })}</span><div>${esc(m.text)}</div></div>`
    const head = `<div class="ph">${ic}<span>${esc(label)}</span></div>`
    if (role === 'reasoning') return `<div class="part reasoning">${head}<div class="body">${esc(m.text)}</div></div>`
    if (role === 'context') return `<div class="part context">${head}<div class="chips">${m.text.split(/\s+\|\s+/).map(t => `<span class="chip">${k.icon({ icon: 'file-text' })}${esc(t)}</span>`).join('')}</div></div>`
    if (role === 'tool') return `<div class="part tool">${head}<div class="body"><div class="call">${esc(m.text)}</div></div></div>`
    return `<div class="part result">${`<div class="ph">${ic}<span>${esc(label)}</span></div>`}<div class="body">${m.text.split(/\s+\|\s+|\n/).map(esc).join('<br>')}</div></div>`
  })
  const est = slide.items.reduce((a, m) => a + (m.role === 'user' || m.role === 'assistant' ? 1 + Math.floor(m.text.length / 55) : m.role === 'result' ? 1.6 + (m.text.split(/\s+\|\s+|\n/).length) * 0.8 : 2.4) * 46 + 22, 72)
  if (est > 735) k.warn(`chat is about ${Math.round(est)} px tall for a 735 px band; fewer or shorter messages`)
  const html = k.top(slide.kicker ?? '', slide.title, A) + `<div class="band"><div class="win">${rows.map((r, i) => `<div class="m" id="${sid}m${i}">${r}</div>`).join('')}</div></div>`
  let js = k.topJs() + k.show(k.q('.win'), k.t0 + 0.2, 'none')
  slide.items.forEach((m, i) => { js += k.show(`#${sid}m${i}`, b[i], 'u', { travel: 24 }) })
  return { html, js, cls: 'ct' }
}
