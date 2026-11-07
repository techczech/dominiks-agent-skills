// iconrow: 1-4 columns, each a heading and a chained set of boxes (TalkWeaver's {iconrow}: icon + title + points).
// Units: every child of every column, left column first (speaking order). A column with no children is one box.
// Icons: column and box `icon` ("lucide:brain-circuit"), from the outline when it has one, else chosen by meaning.
// The block (heads + boxes) is centred vertically in the space between the title and the caption band (see .cols).
// Item text: 32 px regular (fit() takes the largest size that fits); boxes are at least 124 px tall so the block fills the band.
// slide: { title, section, accent, colors?:['blue','green'], items:[{text, icon?, children:[{text, icon?}]}] }
import { kit, esc, fit } from './_kit.mjs'

export const layout = 'iconrow'
export const aliases = ['icon-row', 'columns', '2col', '3col']
export const units = slide => slide.items.flatMap(c => c.children?.length ? c.children.map(x => x.text) : [c.text])

export const css = `
.cols { position: absolute; left: 120px; right: 120px; top: 225px; bottom: 90px; display: flex; align-items: center; }   /* kicker mode shifts .tbody up 62 px: band 225-990 in body space = ~163-928 on screen, centre ~545, between the title (ends ~90) and the caption band (990) */
.colsin { display: flex; width: 100%; align-items: flex-start; }
.col { flex: none; }
.colhead { display: flex; align-items: center; font-family: var(--mono); font-size: 26px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 400; padding-bottom: 8px; border-bottom: 2px solid; margin-bottom: 20px; }   /* N22: column titles subtle: smaller, regular */
.colhead .ico { margin-right: 0.4em; }
.colx { display: flex; flex-direction: column; gap: 26px; }
.it { position: relative; isolation: isolate; min-height: 124px; padding: 20px 34px; border: 2px solid color-mix(in srgb, var(--c) 34%, #fff); border-radius: 16px; background: color-mix(in srgb, var(--c) 5%, #fff); font-weight: 400; line-height: 1.22; display: flex; align-items: center; }
.it .ico { color: var(--c); margin-right: 0.5em; }
.it .link { position: absolute; left: 54px; bottom: -26px; width: 3px; height: 26px; background: color-mix(in srgb, var(--c) 55%, #fff); transform-origin: top center; }
`

export function render(slide, ctx) {
  const k = kit(ctx), cols = slide.items, nc = cols.length, A = slide.accent ?? 'green'
  const palette = slide.colors ?? [A, 'blue', 'orange', 'green']
  const gap = nc === 1 ? 0 : 80, W = Math.floor((1680 - gap * (nc - 1)) / nc)
  const total = cols.reduce((a, c) => a + (c.children?.length || 1), 0), b = k.B(total)
  const maxRows = Math.max(...cols.map(c => c.children?.length || 1))
  const per = cols.map(c => fit((c.children?.length ? c.children : [c]).map(x => x.text), { width: W - 68 - 70, sizes: [48, 44, 40, 36, 32, 28, 24], pad: 74, gap: 26, maxH: 600, em: 0.5 }))
  const size = Math.min(...per.map(p => p.size)), fits = per.every(p => p.fits)
  if (maxRows > 6) k.warn(`a column has ${maxRows} boxes; consider splitting the slide`)
  if (!fits) k.warn('iconrow text is tight at the smallest size; shorten the phrases')
  let idx = 0, inner = '', js = k.topJs()
  const hlSel = [], hlT = []
  cols.forEach((c, ci) => {
    const col = palette[ci % palette.length]
    const kids = c.children?.length ? c.children : [{ text: c.text, only: true }]
    const first = b[idx]
    inner += `<div class="col" style="width:${W}px;margin-right:${ci < nc - 1 ? gap : 0}px"><div class="colhead" data-c="${ci}" style="color:var(--${col});border-color:var(--${col})">${k.icon(c)}${esc(c.text)}</div><div class="colx">` + kids.map((ch, ii) => {
      const u = idx + ii
      return `<div class="it" id="${ctx.sid}u${u}" style="--c:var(--${col});--hlc:color-mix(in srgb, var(--c) 16%, #fff);font-size:${size}px">${k.hl}${k.icon(ch)}<span>${esc(ch.text)}</span>${ii < kids.length - 1 ? `<span class="link" id="${ctx.sid}k${u}"></span>` : ''}</div>`
    }).join('') + `</div></div>`
    js += k.show(k.q(`.colhead[data-c='${ci}']`), Math.max(k.t0 + 0.4, first - 0.7), 'd', { travel: 16, dur: 0.5 })
    kids.forEach((_, ii) => {
      const u = idx + ii
      js += k.show(`#${ctx.sid}u${u}`, b[u], ci % 2 ? 'r' : 'l', { travel: 50 })
      if (ii > 0) js += k.draw(`#${ctx.sid}k${u - 1}`, b[u] - 0.05, 'Y', 0.35)
      hlSel.push(`#${ctx.sid}u${u}`); hlT.push(b[u])
    })
    idx += kids.length
  })
  js += k.focus(hlSel, hlT) ?? k.now(hlSel, hlT)   // slide highlights (ctx.highlights) take over from the per-build marker
  return { html: k.top(slide.kicker ?? '', slide.title, A) + `<div class="cols"><div class="colsin">${inner}</div></div>`, js }
}
