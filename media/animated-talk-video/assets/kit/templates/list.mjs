// list: title left, points right, one point per build. Covers list, numbered, iconlist, plainlist, stmt-list, links.
// slide: { title, section, accent, variant: 'dots'|'numbers', items:[{text, tone?:'warn', iconSvg?, children?:[{text}]}] }
import { kit, esc, fit } from './_kit.mjs'

export const layout = 'list'
export const aliases = ['numbered', 'iconlist', 'icons', 'plainlist', 'stmt-list', 'links', 'logos']
export const units = slide => slide.items.map(i => i.text)

export const css = `
.ltitle { position: absolute; left: 120px; top: 70px; bottom: 90px; width: 620px; display: flex; flex-direction: column; justify-content: center; }
.ltitle .kicker { font-size: 21px; }
.ltitle h1 { font-size: 68px; line-height: 1.12; font-weight: 400; letter-spacing: -0.01em; margin-top: 22px; }
.ltitle.sm h1 { font-size: 54px; }
.lbar { height: 10px; width: 220px; margin-top: 36px; transform-origin: left center; }
.lst { position: absolute; left: 840px; top: 70px; bottom: 90px; width: 960px; list-style: none; counter-reset: n; display: flex; flex-direction: column; justify-content: center; }
.lst.wide { left: 260px; top: 255px; width: 1400px; }
/* N23: the highlight has 28 px of padding on the left (text and marker never touch the tinted edge); N24: the marker or number is a flex item centred on the text */
.lst li { position: relative; isolation: isolate; font-weight: 400; padding: 22px 28px; border-bottom: 3px solid var(--hairline); display: flex; align-items: center; flex-wrap: wrap; column-gap: 28px; border-radius: 10px; }
.lst li::before { content: ""; flex: none; width: 22px; height: 22px; border-radius: 50%; background: var(--accent, var(--orange)); }
.lst.num li::before { content: counter(n); counter-increment: n; width: 1.5em; height: auto; border-radius: 0; background: none; color: var(--accent, var(--orange)); font-family: var(--mono); font-size: 0.9em; line-height: 1; text-align: center; }
.lst li.warn { color: var(--red); } .lst li.warn::before { background: var(--red); }
.lst li .sub { display: block; font-weight: 400; font-size: 0.62em; color: var(--muted); margin-top: 6px; flex-basis: 100%; padding-left: 50px; }
.lst li .tx { flex: 1 1 0; min-width: 0; }   /* wrapped text stays beside the marker, which the flex row centres on it (pilot fix) */
.lst li.ic::before { display: none; }
.lst li .ico { color: var(--accent, var(--orange)); margin-right: 0.45em; } .lst li.warn .ico { color: var(--red); }
`

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'orange', n = slide.items.length, b = k.B(n)
  if (n > 7) k.warn(`list has ${n} items; split the slide or use calm motion`)
  const { size, fits } = fit(slide.items.map(i => i.text), { width: ctx.titleMode && ctx.titleMode !== 'full' ? 1290 : 850, sizes: [54, 48, 44, 40, 36, 32], pad: 52, maxH: 760, em: 0.5 })
  if (!fits) k.warn('list text does not fit at the smallest size; shorten the phrases')
  // Title modes (N10): full = the title column on the left (centred on the slide, no kicker unless slide.kicker is given);
  // kicker / tab / none = a small title block (or nothing) on top and the list centred, wide, under it.
  const mode = ctx.titleMode ?? 'full', full = mode === 'full'
  const lead = full
    ? `<div class="ltitle${slide.title.length > 40 ? ' sm' : ''}">${slide.kicker ? `<div class="kicker" style="color:var(--${A})">${esc(slide.kicker)}</div>` : ''}<h1>${esc(slide.title)}</h1><div class="lbar" style="background:var(--${A})"></div></div>`
    : k.top(slide.kicker ?? '', slide.title, A)
  const html = lead +
    `<ul class="lst${full ? '' : ' wide'}${slide.variant === 'numbers' ? ' num' : ''}" style="font-size:${size}px;--accent:var(--${A})">${slide.items.map((it, i) =>
      `<li id="${ctx.sid}i${i}" class="${[it.tone === 'warn' ? 'warn' : '', (it.icon || it.iconSvg) ? 'ic' : ''].join(' ').trim()}"${ctx.highlights?.length ? ' style="--hlc:color-mix(in srgb, var(--accent) 14%, #fff)"' : ''}>${k.hl}${k.icon(it)}<span class="tx">${esc(it.text)}</span>${it.children?.length ? `<span class="sub">${esc(it.children.map(c => c.text).join(' · '))}</span>` : ''}</li>`).join('')}</ul>`
  let js = full ? k.show(k.q('.ltitle'), k.t0, 'r') + k.draw(k.q('.lbar'), k.t0 + 0.4, 'X', 0.9) : k.topJs()
  slide.items.forEach((_, i) => { js += k.show(`#${ctx.sid}i${i}`, b[i], 'l', { travel: 60 }) })
  const sels = slide.items.map((_, i) => `#${ctx.sid}i${i}`)
  js += k.focus(sels, b) ?? k.now(sels, b)   // slide highlights (ctx.highlights) take over from the per-build marker
  return { html, js }
}
