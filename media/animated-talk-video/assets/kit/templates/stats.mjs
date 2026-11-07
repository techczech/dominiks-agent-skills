// stats: big numbers with labels. Standard motion counts the number up while it is spoken; calm just fades.
// slide: { title, section, accent, items:[{text:'75%: of teams'} | {value:75, suffix:'%', label:'of teams'}] }
import { kit, esc } from './_kit.mjs'

export const layout = 'stats'
export const aliases = []
const parse = it => {
  if (it.value != null) return { value: it.value, prefix: it.prefix ?? '', suffix: it.suffix ?? '', label: it.label ?? '' }
  const m = String(it.text).match(/^\s*([^\d\s]*)([\d][\d,.]*)\s*([^\s:]*)\s*:\s*(.*)$/)
  return m ? { prefix: m[1], value: parseFloat(m[2].replace(/,/g, '')), suffix: m[3], label: m[4], dec: (m[2].split('.')[1] ?? '').length } : { prefix: '', value: null, suffix: '', label: it.text }
}
const fmt = (v, d) => Number(v).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d })
export const units = slide => slide.items.map(i => parse(i).label || i.text)

export const css = `
.st .stat { position: absolute; top: 255px; bottom: 90px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
.st .num { font-size: 180px; line-height: 1; font-weight: 700; letter-spacing: -0.03em; color: var(--c); }
.st .lab { font-size: 40px; line-height: 1.2; margin-top: 18px; font-weight: 700; }
.st .u { width: 36px; height: 8px; margin: 28px 0 0; background: var(--c); transform-origin: center; }
`

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'green', n = slide.items.length, b = k.B(n), sid = ctx.sid
  if (n > 4) k.warn(`stats: ${n} figures; 4 is the readable maximum`)
  const P = slide.items.map(parse), gap = 60, W = Math.floor((1680 - gap * (n - 1)) / n), cc = [A, 'blue', 'orange', 'green']
  const numSize = Math.max(80, Math.min(n > 3 ? 140 : 180, ...P.map(p => Math.floor((W * 0.94) / ((fmt(p.value ?? 0, p.dec ?? 0).length + p.prefix.length + p.suffix.length) * 0.6)))))
  const html = k.top(slide.kicker ?? '', slide.title, A) + P.map((s, i) =>
    `<div class="stat" id="${sid}s${i}" style="left:${120 + i * (W + gap)}px;width:${W}px;--c:var(--${cc[i % 4]})"><div class="num" id="${sid}v${i}" style="font-size:${numSize}px">${esc(s.prefix)}${s.value != null ? fmt(s.value, s.dec ?? 0) : ''}${esc(s.suffix)}</div><div class="u"></div><div class="lab">${esc(s.label)}</div></div>`).join('')
  let js = k.topJs()
  P.forEach((s, i) => {
    js += k.show(`#${sid}s${i}`, b[i], 'u', { travel: 30 })
    if (s.value != null && k.P.count) js += `{ const o = { v: 0 }; tl.to(o, { v: ${s.value}, duration: 1.2, ease: "power2.out", onUpdate: () => { document.getElementById(${JSON.stringify(sid + 'v' + i)}).textContent = ${JSON.stringify(s.prefix)} + o.v.toLocaleString('en-GB', { minimumFractionDigits: ${s.dec ?? 0}, maximumFractionDigits: ${s.dec ?? 0} }) + ${JSON.stringify(s.suffix)}; } }, ${k.at(b[i])}); }\n`
  })
  return { html, js, cls: 'st' }
}
