// process: steps in a row joined by arrows; each step and its arrow arrive when the step is named.
// Covers process, agenda, steps, stairs, flow. Variant 'stairs' lifts each step above the last.
// slide: { title, section, accent, variant?:'row'|'stairs', items:[{text, children?:[{text}] (detail)}] }
import { kit, esc, fitEach, edge, arrowMarker } from './_kit.mjs'

export const layout = 'process'
export const aliases = ['agenda', 'steps', 'stairs', 'flow']
export const units = slide => slide.items.map(i => i.text)

export const css = `
.pr .step { position: absolute; isolation: isolate; border: 2px solid color-mix(in srgb, var(--c) 34%, #fff); border-radius: 18px; background: color-mix(in srgb, var(--c) 5%, #fff); padding: 20px 22px; font-weight: 400; line-height: 1.18; display: flex; flex-direction: column; justify-content: center; }
.pr .step .no { display: flex; justify-content: space-between; align-items: center; font-family: var(--mono); font-size: 26px; letter-spacing: .1em; color: var(--c); margin-bottom: 8px; }
.pr .step .no .ico { font-size: 40px; margin: 0; }
.pr .step .d { font-weight: 400; font-size: 0.66em; color: var(--muted); margin-top: 10px; }
.pr > svg, .pr > .tbody > svg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
`

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'green', n = slide.items.length, b = k.B(n), sid = ctx.sid
  if (n > 6) k.warn(`process has ${n} steps; 6 is the readable maximum in one row`)
  const stairs = slide.variant === 'stairs'
  const gap = 76, W = Math.floor((1680 - gap * (n - 1)) / n), H = 260
  const { size, fits } = fitEach(slide.items.map(i => i.text), { width: W - 52, sizes: [52, 46, 40, 34, 30], maxH: 150, em: 0.5 })
  if (!fits) k.warn('process step text is tight; shorten the phrases')
  const cols = [A, 'blue', 'orange']
  const dy = stairs ? Math.min(110, 400 / n) : 0, span = (n - 1) * dy, y0 = 255 + (735 - (H + span)) / 2
  const pos = slide.items.map((_, i) => ({ x: 120 + i * (W + gap), y: Math.round(y0 + span - i * dy) }))
  const arrows = pos.slice(1).map((p, i) => { const q = pos[i]
    const e = edge({ cx: q.x + W / 2, cy: q.y + H / 2, w: W, h: H }, { cx: p.x + W / 2, cy: p.y + H / 2, w: W, h: H }, 0)
    return `<path id="${sid}a${i + 1}" d="M${e.x1.toFixed(1)} ${e.y1.toFixed(1)} L${e.x2.toFixed(1)} ${e.y2.toFixed(1)}" marker-end="url(#ah${sid})"/>` }).join('')
  const html = k.top(slide.kicker ?? '', slide.title, A) +
    `<svg viewBox="0 0 1920 1080"><defs>${arrowMarker('ah' + sid)}</defs><g stroke="#101418" stroke-width="4" fill="none">${arrows}</g></svg>` +
    slide.items.map((it, i) => `<div class="step" id="${sid}p${i}" style="left:${pos[i].x}px;top:${pos[i].y}px;width:${W}px;height:${H}px;font-size:${size}px;--c:var(--${cols[i % 3]});--hlc:var(--tint-${cols[i % 3]})">${k.hl}<div class="no"><span>${String(i + 1).padStart(2, '0')}</span>${k.icon(it)}</div>${esc(it.text)}${it.children?.length ? `<div class="d">${esc(it.children.map(c => c.text).join(' · '))}</div>` : ''}</div>`).join('')
  let js = k.topJs()
  slide.items.forEach((_, i) => {
    js += k.show(`#${sid}p${i}`, b[i], 'pop', { dur: 0.5 })
    if (i) js += k.show(`#${sid}a${i}`, b[i] - 0.25, 'none', { dur: 0.4 })
  })
  js += k.now(slide.items.map((_, i) => `#${sid}p${i}`), b)
  return { html, js, cls: 'pr' }
}
