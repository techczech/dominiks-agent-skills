// table: header shown first, rows arrive one per build. Units = rows.
// slide: { title, section, accent, head:['Aspect','Advantage','Trade-off'], items:[{text (first cell), children:[{text}] (other cells)}] }
import { kit, esc, fit } from './_kit.mjs'

export const layout = 'table'
export const aliases = []
export const units = slide => slide.items.map(i => i.text)

export const css = `
.tb .row { position: absolute; left: 120px; width: 1680px; display: grid; isolation: isolate; border-bottom: 3px solid var(--hairline); align-items: center; }
.tb .row > div { padding: 12px 22px; line-height: 1.22; }
/* N28: banded rows (every second row carries a light ink band); the highlight tints over the band */
.tb .row.band { background: rgba(16,20,24,0.05); }
.tb .row > div:first-of-type { font-weight: 700; }
.tb .hd { border-bottom: 5px solid var(--ink); font-family: var(--mono); letter-spacing: .1em; text-transform: uppercase; font-weight: 700; color: var(--muted); font-size: 26px; }
`

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'green', n = slide.items.length, b = k.B(n), sid = ctx.sid
  const rows = slide.items.map(i => [i.text, ...(i.children ?? []).map(c => c.text)])
  const nc = Math.max(slide.head?.length ?? 0, ...rows.map(r => r.length))
  const colW = Math.floor((1680 - 44 * nc) / nc)
  const rowH = Math.min(130, Math.floor(640 / (n + 1)))
  let fs = [32, 28, 26, 24].find(s => rows.every(r => Math.ceil(Math.max(...r.map(c => c.length)) / Math.floor(colW / (s * 0.52))) * s * 1.22 + 24 <= rowH)) ?? 24
  if (rows.some(r => Math.ceil(Math.max(...r.map(c => c.length)) / Math.floor(colW / (24 * 0.52))) * 24 * 1.22 + 24 > rowH)) k.warn('table cell text is too long for the row height; shorten the cells')
  const tTop = Math.round(255 + (735 - (80 + n * rowH)) / 2)
  const grid = `grid-template-columns: repeat(${nc}, 1fr)`
  const html = k.top(slide.kicker ?? '', slide.title, A) +
    (slide.head ? `<div class="row hd" id="${sid}hd" style="top:${tTop}px;height:70px;${grid}">${slide.head.map(h => `<div>${esc(h)}</div>`).join('')}</div>` : '') +
    rows.map((r, i) => `<div class="row${i % 2 === 0 ? ' band' : ''}" id="${sid}r${i}" style="top:${tTop + 80 + i * rowH}px;height:${rowH}px;font-size:${fs}px;${grid};--hlc:var(--tint-${['green', 'blue', 'orange'][i % 3]})">${k.hl}${r.map(c => `<div>${esc(c)}</div>`).join('')}</div>`).join('')
  let js = k.topJs() + (slide.head ? k.show(`#${sid}hd`, k.t0 + 0.3, 'none') : '')
  rows.forEach((_, i) => { js += k.show(`#${sid}r${i}`, b[i], 'u', { travel: 20 }) })
  js += k.now(rows.map((_, i) => `#${sid}r${i}`), b)
  return { html, js, cls: 'tb' }
}
