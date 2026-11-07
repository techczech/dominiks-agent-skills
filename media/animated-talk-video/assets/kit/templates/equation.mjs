// equation: terms joined by operators; the last term is the result. Terms pop in as they are said.
// slide: { title, section, accent, variant:'pills'|'circle', ops?:['+','+','→'], items:[{text, color?, spin?}] }
//   color: accent name for a term (blue/orange/green/red) or omitted for ink. spin: true = one slow turn
//   of a dashed ring while the term is spoken about (use only when he describes a loop aloud).
import { kit, esc } from './_kit.mjs'

export const layout = 'equation'
export const aliases = []
export const units = slide => slide.items.map(i => i.text)

export const css = `
.eq { position: absolute; left: 0; right: 0; top: 255px; bottom: 90px; display: flex; align-items: center; justify-content: center; gap: 36px; }
.term { display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--c); background: var(--paper); border: 6px solid var(--c); position: relative; text-align: center; line-height: 1.1; }
.term.pill { height: 140px; padding: 0 64px; border-radius: 70px; font-size: 64px; white-space: nowrap; }
.term.circ { width: 260px; height: 260px; border-radius: 50%; font-size: 52px; }
.term.res { background: var(--green); color: #fff; border-color: var(--green); }
.term.pill.res { padding: 0 72px; } .term.circ.res { width: 300px; height: 300px; font-size: 60px; }
.term .spin { position: absolute; inset: -22px; border-radius: 50%; border: 6px dashed var(--muted); border-left-color: transparent; border-bottom-color: transparent; }
.op { font-size: 80px; color: var(--muted); font-weight: 400; }
`

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'green', n = slide.items.length, b = k.B(n)
  const circle = slide.variant === 'circle'
  // fit: estimate row width, shrink with CSS zoom so the row never leaves the 1680 px safe width
  const termW = it => circle ? 260 : String(it.text).length * 36 + 140
  const est = slide.items.reduce((a, it) => a + termW(it), 0) + (n - 1) * (50 + 72)
  const zoom = Math.min(1, 1680 / est)
  if (zoom < 0.8) k.warn(`equation row is wide (zoom ${zoom.toFixed(2)}); fewer terms or shorter words`)
  const ops = slide.ops ?? slide.items.map((_, i) => i === 0 ? '' : i === n - 1 ? '→' : '+')
  const parts = slide.items.map((it, i) => {
    const last = i === n - 1
    const term = `<div class="term ${circle ? 'circ' : 'pill'}${last ? ' res' : ''}" id="${ctx.sid}t${i}" style="${last ? '' : `--c:${it.color ? `var(--${it.color})` : 'var(--ink)'}`}">${esc(it.text)}${it.spin ? '<span class="spin"></span>' : ''}</div>`
    return (i ? `<div class="op" id="${ctx.sid}o${i}">${esc(ops[i])}</div>` : '') + term
  })
  const html = k.top(slide.kicker ?? '', slide.title, A) + `<div class="eq" style="zoom:${f2(zoom)}">${parts.join('')}</div>`
  let js = k.topJs()
  slide.items.forEach((it, i) => {
    js += k.show(`#${ctx.sid}t${i}`, b[i], 'pop', { dur: 0.6 })
    if (i) js += k.show(`#${ctx.sid}o${i}`, Math.max(b[i], b[i - 1]) - 0.3, 'none', { dur: 0.4 })
    if (it.spin && k.P.travel) js += `tl.fromTo(${JSON.stringify(`#${ctx.sid}t${i} .spin`)}, { rotation: 0 }, { rotation: 360, duration: 4, ease: "power1.inOut" }, ${k.at(b[i])});\n`
  })
  return { html, js }
}
const f2 = z => +z.toFixed(3)
