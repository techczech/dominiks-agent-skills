// compare: two panels side by side. Covers compare and contrast.
//  compare : items = two columns [{text (heading), children:[{text}]}]; units = left children then right children
//  contrast: items = rows [{text:'Before / After'}]; units = rows (both sides appear together)
// slide: { title, section, accent, variant?:'compare'|'contrast', heads?:['Before','After'], items }
import { kit, esc, fit } from './_kit.mjs'

export const layout = 'compare'
export const aliases = ['contrast']
const rows = slide => slide.items.map(i => String(i.text).split(/\s+\/\s+/))
export const units = slide => slide.variant === 'contrast'
  ? slide.items.map(i => i.text)
  : slide.items.slice(0, 2).flatMap(c => c.children?.length ? c.children.map(x => x.text) : [c.text])

export const css = `
.cmp .panel { position: absolute; width: 780px; display: flex; flex-direction: column; border-radius: 22px; padding: 28px 32px; border: 2px solid color-mix(in srgb, var(--c) 28%, #fff); background: color-mix(in srgb, var(--c) 4%, #fff); }
/* N22: panel titles subtle (regular, 34 px, sentence case); N26: a head may carry an app logo (icon "svgl:openai") */
.cmp .ph { display: flex; align-items: center; gap: 0.45em; font-size: 34px; font-weight: 400; padding-bottom: 12px; border-bottom: 2px solid color-mix(in srgb, var(--c) 40%, #fff); margin-bottom: 18px; }
.cmp .ph .ico { font-size: 1.15em; }
.cmp .row { position: relative; isolation: isolate; flex: 1 1 0; font-weight: 400; line-height: 1.2; padding: 14px 24px; border-bottom: 2px solid rgba(16,20,24,0.07); border-radius: 8px; display: flex; align-items: center; gap: 0.55em; }
.cmp .row .ico { color: var(--c); font-size: 1.05em; }
.cmp .vs { position: absolute; left: 960px; margin: -44px 0 0 -44px; width: 88px; height: 88px; border-radius: 50%; background: var(--ink); color: var(--paper); font-family: var(--mono); font-weight: 700; font-size: 30px; display: flex; align-items: center; justify-content: center; z-index: 3; }
`

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'green', sid = ctx.sid
  const contrast = slide.variant === 'contrast'
  let L, R, heads, LI, RI, HI = slide.headIcons ?? []
  if (contrast) { const r = rows(slide); L = r.map(x => x[0]); R = r.map(x => x[1] ?? ''); heads = slide.heads ?? ['', '']; LI = slide.items.map(i => i.icons?.[0] ?? i.icon); RI = slide.items.map(i => i.icons?.[1]) }
  else { const [a, c] = slide.items; const la = a.children?.length ? a.children : [a], ra = c.children?.length ? c.children : [c]; L = la.map(x => x.text); R = ra.map(x => x.text); LI = la.map(x => x.icon); RI = ra.map(x => x.icon); heads = [a.text, c.text]; HI = [a.icon, c.icon] }
  // N13: every row carries an icon (the outline's, or one chosen by meaning); a missing one is reported, not drawn
  ;[...LI, ...RI].forEach((ic, i) => { if (!ic) k.warn(`compare: row text has no icon (give it icon "lucide:...")`) })
  const total = contrast ? L.length : L.length + R.length, b = k.B(total)
  const rowsMax = Math.max(L.length, R.length)
  const fl = [L, R].map(a => fit(a, { width: 716 - 48 - 80, sizes: [46, 42, 40, 36, 32, 28], pad: 28 + 3, maxH: 560, em: 0.5 }))
  const size = Math.min(...fl.map(p => p.size)), fits = fl.every(p => p.fits)
  if (!fits || rowsMax > 7) k.warn('compare panel is crowded; fewer or shorter rows')
  const cpl = Math.max(4, Math.floor((716 - 48 - 1.55 * size) / (size * 0.5)))
  const need = a => a.reduce((t, x) => t + Math.ceil(String(x).length / cpl) * size * 1.22 + 32, 0)
  const panelH = Math.min(700, Math.round(130 + Math.max(need(L), need(R)) + 14))   // rows share the panel height (flex 1), so no panel has an empty tail
  // kicker mode shifts .tbody up 62 px; centre the panels in the band between the title (ends ~90) and the caption band (990): body-space 225-990
  const panelTop = Math.round(225 + (765 - panelH) / 2)
  const side = (arr, icons, h, c, x, off) => `<div class="panel" id="${sid}P${off === 0 ? 'L' : 'R'}" style="top:${panelTop}px;height:${panelH}px;left:${x}px;--c:var(--${c})"><div class="ph" style="color:var(--${c})">${k.icon({ icon: HI[off === 0 ? 0 : 1] })}${esc(h)}</div>` +
    arr.map((t, i) => `<div class="row" id="${sid}${off === 0 ? 'L' : 'R'}${i}" style="font-size:${size}px;--hlc:${ctx.highlights?.length ? 'color-mix(in srgb, var(--c) 16%, #fff)' : 'rgba(255,255,255,0.7)'}">${k.hl}${k.icon({ icon: icons[i] })}<span>${esc(t)}</span></div>`).join('') + `</div>`
  const html = k.top(slide.kicker ?? '', slide.title, A) + side(L, LI, heads[0], 'blue', 120, 0) + side(R, RI, heads[1], 'orange', 1020, 1) + `<div class="vs" style="top:${panelTop + Math.round(panelH / 2)}px">vs</div>`
  let js = k.topJs()
  js += k.show(`#${sid}PL`, k.t0 + 0.3, 'none') + k.show(`#${sid}PR`, k.t0 + 0.3, 'none') + k.show(k.q('.vs'), k.t0 + 0.6, 'pop')
  const sel = [], tm = []
  if (contrast) L.forEach((_, i) => { js += k.show(`#${sid}L${i}`, b[i], 'l', { travel: 30 }) + k.show(`#${sid}R${i}`, b[i], 'r', { travel: 30 }); sel.push(`#${sid}L${i}`); tm.push(b[i]) })
  else {
    L.forEach((_, i) => { js += k.show(`#${sid}L${i}`, b[i], 'l', { travel: 30 }); sel.push(`#${sid}L${i}`); tm.push(b[i]) })
    R.forEach((_, i) => { js += k.show(`#${sid}R${i}`, b[L.length + i], 'r', { travel: 30 }); sel.push(`#${sid}R${i}`); tm.push(b[L.length + i]) })
  }
  js += k.focus(sel, tm) ?? k.now(sel, tm)   // slide highlights (ctx.highlights) take over from the per-build marker
  return { html, js, cls: 'cmp' }
}
