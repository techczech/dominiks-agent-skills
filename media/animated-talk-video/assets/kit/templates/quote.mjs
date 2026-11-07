// quote: a quotation and its source. Units: the quotation, then the source.
// slide: { accent, items:[{text}], source }
import { kit, esc } from './_kit.mjs'

export const layout = 'quote'
export const aliases = ['image-quote']   // image-quote renders the quotation only; see media.mjs for the image
export const units = slide => [slide.items[0].text, slide.source ?? '']

export const css = `
.qt .wrap { position: absolute; left: 260px; right: 200px; top: 70px; bottom: 90px; display: flex; flex-direction: column; justify-content: center; }
.qt .mark { font-size: 260px; line-height: 0.7; height: 120px; font-weight: 700; margin-left: -130px; }
.qt .body { font-size: 78px; line-height: 1.24; font-weight: 400; }   /* N22: a quotation is never bold; it is larger instead */
.qt .src { margin-top: 44px; font-family: var(--mono); font-size: 28px; letter-spacing: 0.1em; text-transform: uppercase; }
`

export function render(slide, ctx) {
  const k = kit(ctx), b = k.B(2), A = slide.accent ?? 'orange'
  const html = `<div class="wrap"><div class="mark" style="color:color-mix(in srgb, var(--${A}) 58%, #fff)">&ldquo;</div><div class="body">${esc(slide.items[0].text)}</div><div class="src" style="color:var(--${A})">${esc(slide.source ?? '')}</div></div>`
  const js = k.show(k.q('.mark'), k.t0, 'none') + k.show(k.q('.body'), b[0], 'u') + (slide.source ? k.show(k.q('.src'), b[1], 'none') : '')
  return { html, js, cls: 'qt' }
}
