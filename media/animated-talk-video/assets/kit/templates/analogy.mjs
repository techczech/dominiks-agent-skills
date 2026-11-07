// analogy (interlude): a scene of its own for an analogy he speaks, e.g. "your brain, your hands, your computer,
// your eyes, and back to your brain". It is NOT a TalkWeaver layout: the agent inserts it between two slides, or
// after a dense slide, when the transcript supports it (Dominik, review 2026-10-16: "this should be split into two
// slides - the brain visualisation should be on its own"; "we can also add more interstitial slides").
// Every node needs `t` (when he says it) and `said` (the words he says, quoted from the transcript). Without both the
// template refuses to render: an interlude with no spoken source is decoration. Builds come from node.t, not ctx.builds.
// slide: { title?, section?, accent, inserted:true, nodes:[{text, icon?, t, said, tag?, tagT?, color?}], loop?:{t, said} }
import { kit, esc, f, edge, arrowMarker } from './_kit.mjs'

export const layout = 'analogy'
export const aliases = ['interlude']
export const units = slide => slide.nodes.map(n => n.text)

export const css = `
.an > svg, .an > .tbody > svg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 1; }
.an .sn { position: absolute; border: 2px solid rgba(16,20,24,0.28); border-radius: 60px; background: color-mix(in srgb, var(--ink) 2.5%, #fff); font-size: 38px; font-weight: 400; display: flex; align-items: center; justify-content: center; gap: 0.4em; z-index: 2; }
.an .sn .ico { font-size: 1.1em; }
.an .stag { position: absolute; text-align: center; font-family: var(--mono); font-size: 34px; letter-spacing: .12em; text-transform: uppercase; font-weight: 700; z-index: 2; }
`

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'orange', sid = ctx.sid, N = slide.nodes, n = N.length
  for (const nd of N) if (nd.t == null || !nd.said) throw new Error(`${sid}: analogy node "${nd.text}" has no spoken source (t, said)`)
  if (slide.loop && (slide.loop.t == null || !slide.loop.said)) throw new Error(`${sid}: analogy loop has no spoken source`)
  if (n > 5) k.warn(`analogy has ${n} nodes; 5 is the readable maximum`)
  const gap = 80, W = Math.floor((1680 - gap * (n - 1)) / n), H = 150
  // N3 centring on the whole block: tag line above the row (56 px) and return arc below the row (147 px) count as block height.
  // Band under the title is 255-990, centre 622.
  const anyTag = N.some(nd => nd.tag), tagUp = anyTag ? 56 : 0, arcDown = slide.loop ? 147 : 0
  const y = Math.round((slide.title ? 622 : 548) - (H + arcDown - tagUp) / 2)   // no title: centre on the whole slide (N12)
  const x = i => 120 + i * (W + gap), box = i => ({ cx: x(i) + W / 2, cy: y + H / 2, w: W, h: H })
  const arrows = N.slice(1).map((_, i) => { const e = edge(box(i), box(i + 1), 0)
    return `<path id="${sid}xa${i + 1}" d="M${f(e.x1)} ${f(e.y1)} L${f(e.x2)} ${f(e.y2)}" marker-end="url(#xah${sid})"/>` }).join('')
  const arc = slide.loop ? `<path id="${sid}xl" d="M${x(n - 1) + W / 2} ${y + H} C${x(n - 1) + W / 2} ${y + H + 190} ${x(0) + W / 2} ${y + H + 190} ${x(0) + W / 2} ${y + H}" marker-end="url(#xah${sid})"/>` : ''
  const html = (slide.title ? k.top(slide.kicker ?? '', slide.title, A) : '') +
    `<svg viewBox="0 0 1920 1080"><defs>${arrowMarker('xah' + sid)}</defs><g stroke="#101418" stroke-width="4" fill="none">${arrows}${arc}</g></svg>` +
    N.map((nd, i) => `<div class="sn" id="${sid}xn${i}" style="left:${x(i)}px;top:${y}px;width:${W}px;height:${H}px">${k.icon(nd)}${esc(nd.text)}</div>` +
      (nd.tag ? `<div class="stag" id="${sid}xt${i}" style="left:${x(i)}px;top:${y - 56}px;width:${W}px;color:var(--${nd.color ?? 'muted'})">${esc(nd.tag)}</div>` : '')).join('')
  let js = slide.title ? k.topJs() : ''
  N.forEach((nd, i) => {
    js += k.show(`#${sid}xn${i}`, nd.t, 'u', { travel: 30 })
    if (i) js += k.show(`#${sid}xa${i}`, nd.t - 0.3, 'none', { dur: 0.4 })
    if (nd.tag) js += k.show(`#${sid}xt${i}`, nd.tagT ?? nd.t, 'none', { dur: 0.5 })
  })
  if (slide.loop) js += k.show(`#${sid}xl`, slide.loop.t, 'none', { dur: 0.6 })
  return { html, js, cls: 'an' }
}
