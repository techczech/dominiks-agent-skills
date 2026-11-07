// statement: one sentence that lands. items = lines (each a build). A single line has one build.
// slide: { title?, accent, items:[{text}], images?:[{src, alt}] }  (title is the slide heading when there are body lines)
// N15: the block (accent bar + lines) is centred vertically; the bar is the block's own left edge, so it is always
// as tall as the text. An optional image sits beside the block, also centred (slide.images[0]).
import { kit, esc, wc } from './_kit.mjs'

export const layout = 'statement'
export const aliases = []
const lines = slide => slide.items?.length ? slide.items : [{ text: slide.title }]   // the heading is the statement when there is no body
export const units = slide => lines(slide).map(i => i.text)

export const css = `
.stmt .fr { position: absolute; left: 160px; right: 160px; top: 255px; bottom: 90px; display: flex; align-items: center; gap: 90px; }
.stmt.notitle .fr { top: 70px; }
.stmt .blk { position: relative; flex: 1; min-width: 0; padding-left: 58px; display: flex; flex-direction: column; gap: 34px; }
.stmt .bar { display: block; position: absolute; left: 0; top: 0; bottom: 0; width: 12px; transform-origin: top center; }
.stmt .ln { position: relative; font-size: 104px; line-height: 1.14; font-weight: 400; letter-spacing: -0.01em; }
.stmt.long .ln, .stmt.img .ln { font-size: 76px; }
.stmt.img.long .ln { font-size: 62px; }
.stmt .ln:nth-of-type(n+2) { color: var(--muted); font-weight: 400; font-size: 64px; }
.stmt.img .ln:nth-of-type(n+2) { font-size: 50px; }
.stmt .simg { flex: none; width: 620px; height: 620px; border-radius: 18px; overflow: hidden; border: 2px solid var(--hairline); background: #fff; }
.stmt .simg img { width: 100%; height: 100%; object-fit: contain; display: block; }
`

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'green', L = lines(slide), n = L.length, b = k.B(n)
  const long = L.some(i => wc(i.text) > 14), img = slide.images?.[0]
  const hasTitle = !!slide.items?.length
  const head = hasTitle ? k.top(slide.kicker ?? '', slide.title ?? '', A).replace('<div class="rule"></div>', '') : `<div class="topbar tb-none"></div>`
  const html = head + `<div class="fr"><div class="blk"><i class="bar" style="background:var(--${A})"></i>${L.map((it, i) => `<div class="ln" id="${ctx.sid}l${i}">${esc(it.text)}</div>`).join('')}</div>` +
    (img ? `<div class="simg" id="${ctx.sid}img"><img src="${esc(img.src)}" alt="${esc(img.alt ?? '')}"></div>` : '') + `</div>`
  let js = k.show(k.q('.topbar'), k.t0, 'none') + k.draw(k.q('.bar'), k.t0, 'Y', 0.9)
  if (img) js += k.show(`#${ctx.sid}img`, k.t0 + 0.3, 'r', { travel: 40, dur: 0.7 })
  L.forEach((_, i) => { js += k.show(`#${ctx.sid}l${i}`, b[i], 'u') })
  return { html, js, cls: 'stmt' + (long ? ' long' : '') + (img ? ' img' : '') + (hasTitle ? '' : ' notitle') }
}
