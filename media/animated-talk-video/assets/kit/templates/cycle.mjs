// cycle: nodes on an ellipse, clockwise from the top, arrows between. A marker rides the ring to the node being
// named (standard motion only). Optional laps: only when he says "round and round" aloud (slide.laps = {t, count}).
// slide: { title, section, accent, laps?:{t,count}, items:[{text (label), children:[{text}] (body)}] }
import { kit, esc, f, arrowMarker, fitEach } from './_kit.mjs'

export const layout = 'cycle'
export const aliases = []
export const units = slide => slide.items.map(i => (i.children?.map(c => c.text).join(' ') || i.text))

export const css = `
.cy > svg, .cy > .tbody > svg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
.node { position: absolute; margin: 0; border: 2px solid rgba(16,20,24,0.26); border-radius: 18px; background: color-mix(in srgb, var(--ink) 2.5%, #fff); padding: 14px 22px; z-index: 2; overflow: hidden; isolation: isolate; }
.node .who { display: flex; align-items: center; gap: 0.4em; font-family: var(--mono); font-size: 22px; letter-spacing: .12em; text-transform: uppercase; color: var(--orange); font-weight: 400; }
.node .who .ico { width: 30px; height: 30px; margin-right: 0.2em; flex: none; }
.node .who .ico svg { width: 100%; height: 100%; }
.node p { font-weight: 400; line-height: 1.15; margin-top: 6px; }
.cdot { position: absolute; left: 0; top: 0; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%; background: var(--orange); z-index: 1; }
`

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'green', n = slide.items.length, b = k.B(n), sid = ctx.sid
  if (n > 8) k.warn(`cycle has ${n} nodes; max 8`)
  if (n > 6) k.warn(`cycle has ${n} nodes; boxes shrink, consider calm motion`)
  // N3: the block (top node top 285 to bottom node bottom 960) is centred in the band under the title (255-990, centre 622)
  const cx = 960, cy = 628, rx = 620, ry = 280
  const ang = i => (-90 + i * 360 / n) * Math.PI / 180
  const pos = slide.items.map((_, i) => [Math.round(cx + rx * Math.cos(ang(i))), Math.round(cy + ry * Math.sin(ang(i)))])
  const chord = 2 * Math.sqrt((rx * rx + ry * ry) / 2) * Math.sin(Math.PI / n)
  const W = Math.round(Math.max(250, Math.min(450, chord * 0.8))), H = n > 6 ? 140 : 164, who = n > 6 ? 22 : 24
  // N22: node text is regular weight and as large as the box allows (was 30 px bold)
  const fe = fitEach(slide.items.map(i => i.children?.map(c => c.text).join(' ') ?? ''), { width: W - 48, sizes: [40, 36, 34, 32, 30, 28, 26, 24], lh: 1.15, maxH: H - 28 - who * 1.3 - 6, em: 0.6 })   // 0.6 em/char: bodies wrap in a narrow box (pilot 2026-11-04 fix; 0.5 let text overflow)
  if (!fe.fits) k.warn('cycle node text is tight at the smallest size; shorten the phrases')
  const fs = fe.size
  // N11/N14: connectors are arcs of the ring itself. Each runs from the point where the ring leaves box i to the point where
  // it enters box i+1 (found by bisection on the box rectangles), so both ends sit exactly on the borders and the head is whole.
  const P = t => [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]
  const outside = (t, i) => { const [x, y] = P(t); return Math.abs(x - pos[i][0]) > W / 2 || Math.abs(y - pos[i][1]) > H / 2 }
  const bis = (i, dir) => { let lo = 0, hi = dir * 2 * Math.PI / n   // lo inside the box, hi outside (or the far node)
    for (let q = 0; q < 40; q++) { const mid = (lo + hi) / 2; if (outside(ang(i) + mid, i)) hi = mid; else lo = mid }
    return hi }
  const lines = pos.map((_, i) => {
    const j = (i + 1) % n, t1 = ang(i) + bis(i, 1), t2 = ang(i) + 2 * Math.PI / n + bis(j, -1)
    if (t2 - t1 < 0.12) k.warn(`cycle: arrow ${i + 1} is almost no arc; fewer nodes or smaller boxes`)
    const [x1, y1] = P(t1), [x2, y2] = P(t2)
    return `<path id="${sid}ln${i}" d="M${f(x1)} ${f(y1)} A${rx} ${ry} 0 0 1 ${f(x2)} ${f(y2)}" marker-end="url(#ah${sid})"/>` }).join('')
  const html = k.top(slide.kicker ?? '', slide.title, A) +
    `<svg viewBox="0 0 1920 1080"><defs>${arrowMarker('ah' + sid)}</defs>` +
    `<ellipse id="${sid}ring" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="rgba(16,20,24,0.18)" stroke-width="4" stroke-dasharray="14 12" pathLength="1"/>` +
    `<g stroke="#101418" stroke-width="4" fill="none">${lines}</g></svg>` +
    slide.items.map((it, i) => `<div class="node" id="${sid}n${i}" style="left:${pos[i][0] - W / 2}px;top:${pos[i][1] - H / 2}px;width:${W}px;height:${H}px"><i class="hl"></i><div class="who" style="font-size:${who}px">${k.icon(it)}${esc(it.text)}</div><p style="font-size:${fs}px">${esc(it.children?.map(c => c.text).join(' ') ?? '')}</p></div>`).join('') +
    (k.P.now ? `<div class="cdot" id="${sid}dot"></div>` : '')
  let js = k.topJs() + (k.P.travel ? `tl.from(${JSON.stringify('#' + sid + 'ring')}, { strokeDashoffset: 1, duration: 2.4, ease: "power2.inOut" }, ${k.at(k.t0 + 0.8)});\n` : k.show('#' + sid + 'ring', k.t0 + 0.8, 'none'))
  slide.items.forEach((_, i) => {
    js += k.show(`#${sid}n${i}`, b[i], 'pop', { dur: 0.5 })
    if (i) js += k.show(`#${sid}ln${i - 1}`, b[i] - 0.1, 'none', { dur: 0.4 })
  })
  const last = b[n - 1]
  js += k.show(`#${sid}ln${n - 1}`, last + 1.2, 'none', { dur: 0.4 })
  js += k.now(slide.items.map((_, i) => `#${sid}n${i}`), b)
  if (k.P.now) {
    // marker position is a function of an angle proxy, so seeking is deterministic (no motion paths)
    js += `const ${sid}p = { a: ${f(ang(0))} };\nconst ${sid}go = () => gsap.set(${JSON.stringify('#' + sid + 'dot')}, { x: ${cx} + ${rx} * Math.cos(${sid}p.a), y: ${cy} + ${ry} * Math.sin(${sid}p.a) });\n`
    js += `tl.set(${JSON.stringify('#' + sid + 'dot')}, { opacity: 0 }, 0);\ntl.set(${JSON.stringify('#' + sid + 'dot')}, { opacity: 1 }, ${k.at(b[0])});\n`
    js += `tl.fromTo(${sid}p, { a: ${f(ang(0))} }, { a: ${f(ang(0))}, duration: 0.01, onUpdate: ${sid}go }, ${k.at(b[0])});\n`
    for (let i = 1; i < n; i++) {
      const d = Math.min(0.9, Math.max(0.4, b[i] - b[i - 1] - 0.1))
      js += `tl.to(${sid}p, { a: ${f(ang(i - 1) + 2 * Math.PI / n)}, duration: ${f(d)}, ease: "power1.inOut", onUpdate: ${sid}go }, ${f(Math.max(b[i] - d, b[i - 1] + 0.05))});\n`
    }
    let end = last
    if (slide.laps) {
      const lap = 0.7 * n
      for (let c = 0; c < (slide.laps.count ?? 1); c++) js += `tl.to(${sid}p, { a: ${f(ang(n - 1) + 2 * Math.PI * (c + 1))}, duration: ${f(lap)}, ease: "none", onUpdate: ${sid}go }, ${f(slide.laps.t + c * lap)});\n`
      end = slide.laps.t + (slide.laps.count ?? 1) * lap
    }
    js += `tl.set(${JSON.stringify('#' + sid + 'dot')}, { opacity: 0 }, ${f(Math.min(Math.max(end + 1, last + 2), ctx.end - 0.2))});\n`
  }
  return { html, js, cls: 'cy' }
}
