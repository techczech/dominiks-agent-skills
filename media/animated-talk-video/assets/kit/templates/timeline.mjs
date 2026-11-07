// timeline: a track draws left to right; each dated event pops on it as it is named, text alternating above/below.
// Covers timeline, timelinehorizontal/vertical/spine/pills, timetable, timeline-visual.
// slide: { title, section, accent, items:[{label?, text}]}  label defaults to the text before the first ": " (max 14 chars)
import { kit, esc } from './_kit.mjs'

export const layout = 'timeline'
export const aliases = ['timetable', 'timeline-visual', 'timelinehorizontal', 'timelinevertical', 'timelinespine', 'timeline-pills', 'timelinepills', 'timelinedynamic', 'sigmoid']
const parse = it => {
  if (it.label) return { label: it.label, text: it.text }
  const m = String(it.text).match(/^(.{1,14}?):\s+(.*)$/)
  return m ? { label: m[1], text: m[2] } : { label: '', text: it.text }
}
export const units = slide => slide.items.map(i => parse(i).text || i.text)

export const css = `
.tl .track { position: absolute; left: 140px; top: 616px; width: 1640px; height: 8px; background: var(--ink); border-radius: 4px; transform-origin: left center; }
.tl .ev { position: absolute; isolation: isolate; }
.tl .pill { position: absolute; left: 0; top: 0; margin: -30px 0 0 -90px; width: 180px; height: 60px; border-radius: 30px; border: 5px solid var(--c); background: var(--paper); color: var(--c); font-family: var(--mono); font-weight: 700; font-size: 28px; display: flex; align-items: center; justify-content: center; z-index: 2; }
.tl .stem { position: absolute; left: -2px; width: 4px; background: var(--c); }
.tl .txt { position: absolute; font-size: 40px; line-height: 1.2; font-weight: 400; text-align: center; border-radius: 12px; padding: 10px 14px; isolation: isolate; }
`

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'green', n = slide.items.length, b = k.B(n), sid = ctx.sid
  const P = slide.items.map(parse)
  if (n > 7) k.warn(`timeline has ${n} events; 7 is the readable maximum on one track`)
  const left = 240, right = 1680, sp = n > 1 ? (right - left) / (n - 1) : 0
  const tw = Math.round(Math.min(420, Math.max(240, (sp || 800) * 1.85)))
  const cols = ['green', 'blue', 'orange']
  const html = k.top(slide.kicker ?? '', slide.title, A) + `<div class="track" id="${sid}trk"></div>` + P.map((e, i) => {
    const x = n > 1 ? left + i * sp : 960, up = i % 2 === 0, c = cols[i % 3]
    return `<div class="ev" id="${sid}e${i}" style="left:${x}px;top:620px;--c:var(--${c});--hlc:var(--tint-${c})">` +
      `<div class="stem" style="${up ? 'top:-100px;height:70px' : 'top:30px;height:70px'}"></div>` +
      (e.label ? `<div class="pill">${esc(e.label)}</div>` : `<div class="pill" style="width:60px;margin-left:-30px"></div>`) +
      `<div class="txt" style="width:${tw}px;left:${Math.max(120, Math.min(1800 - tw, x - tw / 2)) - x}px;${up ? 'bottom:100px' : 'top:100px'}">${k.hl}${esc(e.text)}</div></div>`
  }).join('')
  let js = k.topJs() + k.draw(`#${sid}trk`, k.t0 + 0.5, 'X', 1.6)
  P.forEach((_, i) => { js += k.show(`#${sid}e${i}`, b[i], 'pop', { dur: 0.5 }) })
  js += k.now(P.map((_, i) => `#${sid}e${i} .txt`), b)
  return { html, js, cls: 'tl' }
}
