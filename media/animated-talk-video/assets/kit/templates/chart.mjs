// chart: bar or line chart of a few values; each value arrives when it is named (bar grows, line segment draws).
// Covers chart, barchart, linechart, curve. Pie charts are not built: use cards or stats.
// slide: { title, section, accent, variant:'bar'|'line', unit?:'%', items:[{text:'Alpha: 40'} | {label, value}] }
import { kit, esc } from './_kit.mjs'

export const layout = 'chart'
export const aliases = ['barchart', 'linechart', 'curve', 'piechart']
const parse = it => {
  if (it.value != null) return { label: it.label ?? it.text, value: Number(it.value) }
  const m = String(it.text).match(/^(.*?):\s*(-?[\d.,]+)/)
  return m ? { label: m[1], value: parseFloat(m[2].replace(/,/g, '')) } : { label: it.text, value: 0 }
}
export const units = slide => slide.items.map(i => parse(i).label)

export const css = `
.ch .bar { position: absolute; bottom: 150px; transform-origin: bottom center; border-radius: 10px 10px 0 0; }
.ch .val { position: absolute; text-align: center; font-size: 44px; font-weight: 700; }
.ch .lbl { position: absolute; bottom: 90px; text-align: center; font-size: 32px; font-weight: 700; line-height: 1.1; }
.ch .axis { position: absolute; left: 120px; width: 1680px; bottom: 146px; height: 4px; background: var(--ink); }
.ch > svg, .ch > .tbody > svg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
`

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'green', n = slide.items.length, b = k.B(n), sid = ctx.sid
  const P = slide.items.map(parse), max = Math.max(...P.map(p => p.value), 1), unit = slide.unit ?? ''
  const line = slide.variant === 'line'
  if (n > 8) k.warn(`chart has ${n} values; 8 is the readable maximum`)
  const x0 = 220, x1 = 1700, sp = n > 1 ? (x1 - x0) / (n - 1) : 0, bw = Math.min(200, Math.floor(1560 / n * 0.62)), slot = 1560 / n
  const top = 340, base = 930, hmax = base - top
  const cc = [A, 'blue', 'orange']
  let html = k.top(slide.kicker ?? '', slide.title, A), js = k.topJs()
  if (!line) {
    html += `<div class="axis"></div>` + P.map((p, i) => {
      const h = Math.max(6, Math.round(p.value / max * (hmax - 60))), cx = 120 + slot * (i + 0.5)
      return `<div class="bar" id="${sid}b${i}" style="left:${cx - bw / 2}px;width:${bw}px;height:${h}px;background:var(--${cc[i % 3]})"></div>` +
        `<div class="val" id="${sid}v${i}" style="left:${cx - 120}px;width:240px;bottom:${150 + h + 12}px;color:var(--${cc[i % 3]})">${esc(String(p.value) + unit)}</div>` +
        `<div class="lbl" id="${sid}l${i}" style="left:${cx - slot / 2}px;width:${slot}px">${esc(p.label)}</div>` }).join('')
    P.forEach((_, i) => { js += k.draw(`#${sid}b${i}`, b[i], 'Y', 0.7) + k.show(`#${sid}v${i}`, b[i] + 0.3, 'none') + k.show(`#${sid}l${i}`, b[i], 'none') })
  } else {
    const pts = P.map((p, i) => [Math.round(n > 1 ? x0 + i * sp : 960), Math.round(base - 40 - p.value / max * (hmax - 100))])
    html += `<div class="axis"></div><svg viewBox="0 0 1920 1080"><g stroke="var(--${A})" stroke-width="8" fill="none" stroke-linecap="round">${pts.slice(1).map((p, i) => `<path id="${sid}s${i + 1}" d="M${pts[i][0]} ${pts[i][1]} L${p[0]} ${p[1]}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="0"/>`).join('')}</g>` +
      pts.map((p, i) => `<circle id="${sid}d${i}" cx="${p[0]}" cy="${p[1]}" r="14" fill="var(--${A})"/>`).join('') + `</svg>` +
      P.map((p, i) => `<div class="val" id="${sid}v${i}" style="left:${pts[i][0] - 120}px;width:240px;top:${pts[i][1] - 70}px;font-size:36px">${esc(String(p.value) + unit)}</div><div class="lbl" id="${sid}l${i}" style="left:${pts[i][0] - 150}px;width:300px">${esc(p.label)}</div>`).join('')
    P.forEach((_, i) => {
      if (i) js += k.P.travel ? `tl.from(${JSON.stringify('#' + sid + 's' + i)}, { strokeDashoffset: 1, duration: 0.8, ease: "power2.inOut" }, ${k.at(b[i] - 0.3)});\n` : k.show(`#${sid}s${i}`, b[i], 'none')
      js += k.show(`#${sid}d${i}`, b[i] + (i ? 0.4 : 0), 'pop', { dur: 0.4 }) + k.show(`#${sid}v${i}`, b[i] + 0.4, 'none') + k.show(`#${sid}l${i}`, b[i], 'none')
    })
  }
  return { html, js, cls: 'ch' }
}
