// cards: 2-6 cards in a grid, one per build. Also the fallback for smartart, grid, system-map, mindmap.
// slide: { title, section, accent, items:[{text (heading), iconSvg?, children?:[{text}] (detail)}] }
import { kit, esc, fit } from './_kit.mjs'

export const layout = 'cards'
export const aliases = ['grid', 'smartart', 'system-map', 'mindmap', 'conceptmap']
// N27: units are the points inside the cards (card by card, left to right); a card with no points is one unit (its heading).
export const units = slide => slide.items.flatMap(i => i.children?.length ? i.children.map(c => c.text) : [i.text])

export const css = `
.cd .card { position: absolute; isolation: isolate; border: 2px solid color-mix(in srgb, var(--c) 32%, #fff); border-radius: 20px; background: color-mix(in srgb, var(--c) 5%, #fff); padding: 28px 28px 22px; overflow: hidden; }
.cd .card .hd { display: flex; align-items: center; gap: 20px; padding: 0 6px 18px; border-bottom: 2px solid color-mix(in srgb, var(--c) 30%, #fff); }
.cd .card .chip { flex: none; width: 64px; height: 64px; border-radius: 18px; background: color-mix(in srgb, var(--c) 14%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 38px; }
.cd .card .chip .ico { margin: 0; }
.cd .card h3 { font-size: 36px; line-height: 1.12; font-weight: 400; letter-spacing: 0; color: var(--c); }
.cd .card .pts { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
.cd .card .pt { position: relative; isolation: isolate; padding: 11px 22px; line-height: 1.22; border-radius: 10px; font-weight: 400; }
.cd .ico svg { width: 100%; height: 100%; }
`

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'green', n = slide.items.length, sid = ctx.sid
  const kidsOf = slide.items.map(i => i.children?.length ? i.children.map(c => c.text) : [])
  const total = kidsOf.reduce((a, x) => a + (x.length || 1), 0), b = k.B(total)
  if (n > 6) k.warn(`cards: ${n} cards; 6 is the readable maximum`)
  const cols = n <= 3 ? n : n === 4 ? 2 : 3, rowsN = Math.ceil(n / cols), gap = 40
  const W = Math.floor((1680 - gap * (cols - 1)) / cols), H = Math.floor((730 - gap * (rowsN - 1)) / rowsN)
  // N22/N27: points are regular weight, as large as the card allows; every point is its own highlight row
  const per = kidsOf.filter(x => x.length).map(x => fit(x, { width: W - 56 - 44, sizes: [46, 42, 38, 34, 30, 26], pad: 22 + 8, maxH: Math.min(H, 520) - 190, em: 0.5 }))
  const fs = { size: per.length ? Math.min(...per.map(p => p.size)) : 30, fits: per.every(p => p.fits) }
  if (!fs.fits) k.warn('card detail is tight; shorten the phrases')
  const cpl = Math.max(4, Math.floor((W - 56 - 44) / (fs.size * 0.5)))
  const need = Math.max(0, ...kidsOf.map(x => x.reduce((a, t) => a + Math.ceil(t.length / cpl) * fs.size * 1.22 + 30, 0)))
  const Hc = Math.min(H, 560, Math.round(50 + 82 + 14 + need + 30))   // fits its content, so the block centres without a dead lower half
  const top0 = Math.round(255 + (735 - (rowsN * Hc + (rowsN - 1) * gap)) / 2)
  const cc = [A, 'blue', 'orange']
  let idx = 0, js = k.topJs(), html = k.top(slide.kicker ?? '', slide.title, A)
  const hlSel = [], hlT = []
  slide.items.forEach((it, i) => {
    const r = Math.floor(i / cols), c = i % cols, ci = cc[i % 3]
    const kids = kidsOf[i].length ? kidsOf[i] : [it.text], solo = !kidsOf[i].length, first = b[idx]
    html += `<div class="card" id="${sid}c${i}" style="left:${120 + c * (W + gap)}px;top:${top0 + r * (Hc + gap)}px;width:${W}px;height:${Hc}px;--c:var(--${ci});--hlc:var(--tint-${ci})"><div class="hd">${k.icon(it) ? `<span class="chip">${k.icon(it)}</span>` : ''}<h3>${esc(it.text)}</h3></div>` +
      (solo ? '' : `<div class="pts" style="font-size:${fs.size}px">${kids.map((t, q) => `<div class="pt" id="${sid}u${idx + q}"><i class="hl" style="background:color-mix(in srgb, var(--${ci}) 16%, #fff)"></i>${esc(t)}</div>`).join('')}</div>`) + `</div>`
    js += k.show(`#${sid}c${i}`, Math.max(k.t0 + 0.3, first - 0.7), 'u', { travel: 36 })
    if (!solo) kids.forEach((_, q) => { js += k.show(`#${sid}u${idx + q}`, b[idx + q], 'l', { travel: 40 }); hlSel.push(`#${sid}u${idx + q}`); hlT.push(b[idx + q]) })
    idx += kids.length
  })
  js += k.now(hlSel, hlT)
  return { html, js, cls: 'cd' }
}
