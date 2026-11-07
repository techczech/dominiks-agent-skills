// section: a "##" divider. Variants: section (default), title, closing (also used for the deck title slide).
// slide: { title, accent, variant, kicker?, subtitle?, byline? }   (no kicker unless given: Dominik's note 1)
import { kit, esc } from './_kit.mjs'

export const layout = 'section'
export const aliases = ['title', 'closing']
export const units = () => []          // no builds: the words arrive by themselves just after the cut

export const css = `
.sect .bar { position: absolute; left: 100px; top: 340px; width: 12px; height: 400px; transform-origin: top center; }
.sect .wrap { position: absolute; left: 160px; top: 0; bottom: 0; width: 1500px; display: flex; flex-direction: column; justify-content: center; }
.sect h1 { font-size: 120px; line-height: 1.08; font-weight: 700; letter-spacing: -0.02em; }
.sect h1 .w { display: inline-block; margin-right: 0.18em; }
.ttl .wrap { position: absolute; left: 160px; top: 330px; width: 1600px; }
.ttl h1 { font-size: 104px; line-height: 1.08; font-weight: 700; letter-spacing: -0.02em; margin-top: 24px; }
.ttl h1 .w { display: inline-block; margin-right: 0.18em; }
.ttl .sub { font-size: 44px; margin-top: 34px; color: var(--muted); }
.ttl .by { font-family: var(--mono); font-size: 26px; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 40px; color: var(--muted); }
.ttl .bar { position: absolute; left: 100px; top: 330px; width: 12px; height: 380px; transform-origin: top center; }
`

export function render(slide, ctx) {
  const k = kit(ctx), A = `var(--${slide.accent ?? 'green'})`, v = slide.variant ?? 'section'
  const words = String(slide.title).split(' ').map(w => `<span class="w">${esc(w)}</span>`).join(' ')
  const T = k.t0
  if (v === 'section') {
    const html = `<div class="bar" style="background:${A}"></div><div class="wrap">${slide.kicker ? `<div class="kicker" style="color:${A}">${esc(slide.kicker)}</div>` : ''}<h1>${words}</h1></div>`
    const js = k.draw(k.q('.bar'), T, 'Y', 0.9) + (slide.kicker ? k.show(k.q('.kicker'), T + 0.2, 'u', { travel: 20 }) : '') +
      (k.P.travel ? `tl.from(${JSON.stringify(k.q('h1 .w'))}, { opacity: 0, y: 60, duration: 0.8, stagger: ${k.P.stagger}, ease: "power3.out" }, ${T + 0.5});\n`
                  : k.show(k.q('h1'), T + 0.4, 'none'))
    return { html, js, cls: 'sect', style: `background:var(--tint-${slide.accent ?? 'orange'})` }
  }
  // title / closing
  const html = `<div class="bar" style="background:${A}"></div><div class="wrap">${slide.kicker ? `<div class="kicker" style="color:${A}">${esc(slide.kicker)}</div>` : ''}<h1>${words}</h1>${slide.subtitle ? `<div class="sub">${esc(slide.subtitle)}</div>` : ''}${slide.byline ? `<div class="by">${esc(slide.byline)}</div>` : ''}</div>`
  const js = k.draw(k.q('.bar'), T, 'Y', 0.9) + (slide.kicker ? k.show(k.q('.kicker'), T + 0.2, 'u', { travel: 20 }) : '') +
    (k.P.travel ? `tl.from(${JSON.stringify(k.q('h1 .w'))}, { opacity: 0, y: 60, duration: 0.8, stagger: ${k.P.stagger}, ease: "power3.out" }, ${T + 0.5});\n`
                : k.show(k.q('h1'), T + 0.4, 'none')) +
    (slide.subtitle ? k.show(k.q('.sub'), T + 1.6, 'u') : '') + (slide.byline ? k.show(k.q('.by'), T + 2.2, 'none') : '')
  return { html, js, cls: 'ttl' }
}
