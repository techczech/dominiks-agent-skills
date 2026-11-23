// Geometry of frame elements, no drawing and no palette. One place that knows where each element sits, so the drawing code (_draw.mjs),
// the `focus` / `pointer` elements (they point at another element by id) and the frame lint (tools/lint-frames.mjs) agree.
//
//   bbox(e)  -> { x, y, w, h,                       the outer box
//                 textBoxes: [{ x, y, w, h, size, text, role?, label?, within? }],   every piece of text; `within` = [x,y,w,h] of the box that holds it
//                 solids:    [[x, y, w, h], ...],  boxes other elements' text must not run into (empty for scenery and the relationship composites)
//                 segs:      [[x1, y1, x2, y2], ...], connector paths (line, arrow, pointer, cycle arrows); `connector` {sw, color, dash} describes them
//                 parts:     { name: [x, y, w, h] } for composite types (cycle, quote, stat, step, chat), already limited to e.parts when given
//                 kind:      'text' | 'container' | 'connector' | 'scenery' | 'relation' | 'picture' | 'composite' | 'highlight' }
//   The layout functions (quoteLayout ... chatLayout) hold the numbers the drawing code needs; bbox() reads them.
//
// Text width is an estimate (em per character for Inter, which runs a little wide for Fraunces and Alegreya Sans, so wraps are on the safe side); it can be a little off, so checks leave a small margin.

// ---------------------------------------------------------------- text measurement
export const emOf = s => [...String(s ?? '')].reduce((a, c) => a + (/[ijlI.,:;'|!]/.test(c) ? 0.27 : /[ frt()\-]/.test(c) ? 0.36 : /[mwMW]/.test(c) ? 0.86 : /[A-Z0-9]/.test(c) ? 0.66 : 0.55), 0)
export const twEst = (s, size) => emOf(s) * size
export const MONO_EM = 0.62        // monospace face, em per character; tracking is added by the caller
export const ASC = 0.8             // text box: this much of the size above the baseline, the rest below (total height = size)
const R = (x, y, w, h) => [x, y, w, h]
const box = (x, y, w, h) => ({ x, y, w, h })

// greedy word wrap to maxW; "\n" forces a break
export function wrap(text, size, maxW) {
  const out = []
  for (const para of String(text ?? '').split('\n')) {
    let cur = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = cur ? cur + ' ' + word : word
      if (cur && twEst(next, size) > maxW) { out.push(cur); cur = word } else cur = next
    }
    out.push(cur)
  }
  return out
}
// a text box for text drawn at (x, baseline) with an SVG text-anchor
export function tb(x, base, text, size, anchor = 'start', o = {}) {
  const w = twEst(text, size) * (o.weight >= 700 ? 1.06 : 1) + (o.track ? o.track * size * String(text).length : 0)
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x
  return { x: left, y: base - ASC * size, w, h: size, size, text: String(text), ax: x, anchor, base, ...(o.face ? { face: o.face } : {}), ...(o.role ? { role: o.role } : {}), ...(o.label ? { label: true } : {}), ...(o.within ? { within: o.within } : {}) }
}
const baseCentred = (cy, size) => cy + size * 0.35     // baseline for text centred on cy (as the kit's chips do)
const union = bs => {
  const b = bs.filter(Boolean)
  if (!b.length) return [0, 0, 0, 0]
  const x1 = Math.min(...b.map(q => q[0])), y1 = Math.min(...b.map(q => q[1])), x2 = Math.max(...b.map(q => q[0] + q[2])), y2 = Math.max(...b.map(q => q[1] + q[3]))
  return [x1, y1, x2 - x1, y2 - y1]
}
// which parts of a composite an element draws: `parts` names match themselves and their prefixes ("node" = every node, "node:1" = that one)
export const wants = e => name => {
  if (!e.parts) return true
  const want = [].concat(e.parts), k = name.split(':')[0]
  return want.includes(name) || want.includes(k)
}

// ---------------------------------------------------------------- label fitting (box, cycle node)
// The largest size in [min, max] at which `text` wraps into w x h (after padding), centred both ways. Returns lines, size, line height.
export function fitLabel(text, w, h, o = {}) {
  const { min = 40, max = 56, pad = 28, iconH = 0 } = o
  const iw = w - 2 * pad, ih = h - 2 * pad - (iconH ? iconH + 16 : 0)
  for (let s = max; s >= min; s -= 2) {
    const lines = wrap(text, s, iw), lh = Math.round(s * 1.2)
    if (lines.length * lh <= ih + 0.2 * s && lines.every(l => twEst(l, s) <= iw)) return { size: s, lines, lh, fits: true }
  }
  const lines = wrap(text, min, iw)
  return { size: min, lines, lh: Math.round(min * 1.2), fits: false }
}

// ---------------------------------------------------------------- box
export function boxLayout(e) {
  const { x, y, w, h } = e, iconH = e.icon ? Math.min(72, Math.round(h * 0.3)) : 0
  const inlineIcon = e.icon && h < 190
  const lab = fitLabel(e.text ?? '', inlineIcon ? w - 96 : w, h, { iconH: inlineIcon ? 0 : iconH })
  const blockH = lab.lines.length * lab.lh
  const total = blockH + (iconH && !inlineIcon ? iconH + 16 : 0)
  const top = y + (h - total) / 2
  const iconBox = e.icon ? (inlineIcon ? R(x + 28, y + (h - 56) / 2, 56, 56) : R(x + w / 2 - iconH / 2, top, iconH, iconH)) : null
  const textTop = top + (iconH && !inlineIcon ? iconH + 16 : 0)
  const cx = inlineIcon ? x + 96 + (w - 96) / 2 : x + w / 2
  const textBoxes = lab.lines.map((l, i) => tb(cx, textTop + i * lab.lh + lab.lh * 0.5 + lab.size * 0.35, l, lab.size, 'middle', { label: true, within: R(x, y, w, h) }))
  return { x, y, w, h, lab, cx, textTop, iconBox, inlineIcon, textBoxes }
}

// ---------------------------------------------------------------- message (chat bubble / short label)
export function messageLayout(e) {
  const { x, y, w, h } = e, size = Math.max(34, e.size ?? 34), rows = [].concat(e.rows ?? e.text ?? ''), pad = 28, lh = Math.round(size * 1.3)
  const centred = rows.length === 1 && twEst(rows[0], size) <= w - 2 * pad
  const textBoxes = centred
    ? [tb(x + w / 2, baseCentred(y + h / 2, size), rows[0], size, 'middle', { label: true, within: R(x, y, w, h) })]
    : rows.map((r, i) => tb(x + pad, y + pad + size * ASC + i * lh, r, size, 'start', { within: R(x, y, w, h) }))
  return { x, y, w, h, size, rows, centred, pad, lh, textBoxes }
}

// ---------------------------------------------------------------- quote (D10)
export function quoteLayout(e) {
  const hasFig = !!e.figure, figW = hasFig ? (e.figW ?? 380) : 0
  const W = Math.min(e.w ?? 1380, 1380), hang = 150
  const tx = e.x ?? (hasFig ? 160 + figW + 70 + hang : Math.round((1920 - W) / 2) + hang - 30)
  const textW = Math.min(W, 1920 - 90 - tx)
  const len = String(e.text ?? '').length
  let size = e.size ?? (len < 90 ? 80 : len < 170 ? 72 : 64)
  size = Math.max(64, Math.min(80, size))
  let lines = wrap(e.text, size, textW)
  const lh = Math.round(size * 1.24), srcSize = 34, gap = 44
  const src = e.source ? '— ' + String(e.source).toUpperCase() + (e.date ? ' · ' + String(e.date).toUpperCase() : '') : ''
  const blockH = lines.length * lh + (src ? gap + srcSize : 0)
  const ty = e.y ?? Math.max(100, Math.round((1080 - blockH) / 2) - 20)
  const parts = {}, textBoxes = []
  const mark = R(tx - hang, ty - 6, 130, 190)
  parts.mark = mark
  const tbxs = lines.map((l, i) => tb(tx, ty + size * ASC + i * lh, l, size, 'start'))
  textBoxes.push(...tbxs)
  parts.text = union(tbxs.map(t => R(t.x, t.y, t.w, t.h)))
  let srcBase = 0
  if (src) {
    srcBase = ty + lines.length * lh + gap + srcSize * ASC
    const t = tb(tx, srcBase, src, srcSize, 'start', { track: 0.1 + (MONO_EM - 0.55) , role: 'source' })
    textBoxes.push(t); parts.source = R(t.x, t.y, t.w, t.h)
  }
  if (hasFig) parts.figure = R(160, Math.round(ty - 10), figW, Math.max(320, Math.round(blockH + 20)))
  const sel = wants(e)
  const keep = Object.entries(parts).filter(([k]) => sel(k))
  const outer = union(keep.map(([, b]) => b))
  return { x: outer[0], y: outer[1], w: outer[2], h: outer[3], size, lines, lh, tx, ty, src, srcBase, srcSize, parts: Object.fromEntries(keep), textBoxes: textBoxes.filter((t, i) => sel(i < lines.length ? 'text' : 'source')), mark }
}

// ---------------------------------------------------------------- stat and stats (D12)
export function statsLayout(e) {
  // one stat: {value, label, x, y} (x = centre, y = top). stats: items[], x?, y?, w? laid out as columns.
  const items = e.type === 'stat' ? [{ value: e.value, label: e.label, x: e.x, y: e.y }] : (e.items ?? []).slice(0, 4)
  const n = items.length, W = e.w ?? 1680, X = e.x ?? 120, y = e.y ?? 330
  const colW = e.type === 'stat' ? (e.w ?? 900) : (W - 60 * (n - 1)) / Math.max(1, n)
  const cells = items.map((it, i) => {
    const cx = e.type === 'stat' ? (e.x ?? 960) : X + i * (colW + 60) + colW / 2
    const cy = e.type === 'stat' ? (e.y ?? y) : y
    const vs = Math.max(96, Math.min(e.size ?? 150, Math.floor((colW * 0.94) / Math.max(0.5, emOf(it.value) * 1.06))))
    const ls = 48, lines = wrap(it.label ?? '', ls, colW)
    const vBase = cy + vs * 0.8, vt = tb(cx, vBase, it.value, vs, 'middle', { weight: 700, face: 'display' })
    const lts = lines.map((l, k) => tb(cx, vBase + 28 + ls * 0.8 + k * Math.round(ls * 1.2), l, ls, 'middle'))
    return { cx, cy, vs, ls, lines, vBase, vt, lts }
  })
  const parts = {}
  cells.forEach((c, i) => { parts[`value:${i}`] = R(c.vt.x, c.vt.y, c.vt.w, c.vt.h); if (c.lts.length) parts[`label:${i}`] = union(c.lts.map(t => R(t.x, t.y, t.w, t.h))) })
  const sel = wants(e), keep = Object.entries(parts).filter(([k]) => sel(k)), outer = union(keep.map(([, b]) => b))
  const textBoxes = cells.flatMap((c, i) => [...(sel(`value:${i}`) ? [c.vt] : []), ...(sel(`label:${i}`) ? c.lts : [])])
  return { x: outer[0], y: outer[1], w: outer[2], h: outer[3], cells, parts: Object.fromEntries(keep), textBoxes }
}

// ---------------------------------------------------------------- measure (D19)
export const MEASURE_EM = 30, MEASURE_CAP = 1320, MEASURE_WARN = 1400
export const isImageSrc = v => typeof v === 'string' && (/\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(v) || /^(data:|https?:|file:|\.{0,2}\/)/.test(v))

// ---------------------------------------------------------------- step card (D6)
// Per the 13 Nov mockup (s3): one left axis for the number and the sentence; "of N" small on the number's baseline; sentence in the display
// face 96-104 px; optional second clause in the accent (`accent` string, or `accent: true` and a "\n" in the text); optional picture right.
export const STEP = { numS: 200, ofS: 48, left: 150, picW: 560, picH: 315, textMaxPic: 1000, textMaxFull: 1320 }
// balanced wrap: the same number of lines as a greedy wrap at maxW, at the narrowest width that keeps it, so no line ends in an orphan word
export function wrapBalanced(text, size, maxW) {
  let best = wrap(text, size, maxW); const n = best.length
  if (n < 2) return best
  for (let w = maxW - 20; w >= maxW * 0.45; w -= 20) { const r = wrap(text, size, w); if (r.length > n) break; best = r }
  return best
}
export function stepLayout(e) {
  const size = Math.max(96, Math.min(104, e.size ?? 100)), hasN = e.n != null, pic = e.picture
  const { numS, ofS, picW, picH } = STEP, maxW = pic ? STEP.textMaxPic : STEP.textMaxFull
  const accClause = typeof e.accent === 'string' && !/^(#|rgb)/i.test(e.accent) ? e.accent : null
  const rows = []
  String(e.text ?? '').split('\n').forEach((para, i) => wrapBalanced(para, size, maxW).forEach(l => rows.push({ l, acc: e.accent === true && i > 0 })))
  if (accClause) wrapBalanced(accClause, size, maxW).forEach(l => rows.push({ l, acc: true }))
  const lh = Math.round(size * 1.1), subS = 44
  const subLines = e.sub ? wrap(e.sub, subS, maxW) : []
  const nCap = Math.round(numS * 0.72)
  const first = hasN ? nCap + Math.round(size * 1.3) : Math.round(size * 0.8)       // first text baseline, from the block top
  const lastBase = first + (rows.length - 1) * lh
  const subFirst = lastBase + 36 + Math.round(subS * 0.8), subLh = Math.round(subS * 1.3)
  const bottom = (subLines.length ? subFirst + (subLines.length - 1) * subLh : lastBase) + Math.round(size * 0.25)
  const top = Math.round((1080 - bottom) / 2) - 20
  const numW = hasN ? Math.round(String(e.n).length * 0.6 * numS) : 0
  const ofW = hasN && e.of != null ? 22 + twEst(`of ${e.of}`, ofS) : 0
  const widest = Math.max(numW + ofW, ...rows.map(r => twEst(r.l, size)), ...subLines.map(l => twEst(l, subS)))
  const left = pic ? STEP.left : Math.max(120, Math.round((1920 - widest) / 2))
  const parts = {}, textBoxes = []
  if (hasN) {
    const nBase = top + nCap, nt = tb(left, nBase, String(e.n), numS, 'start', { weight: 600, face: 'display' })
    textBoxes.push({ ...nt, part: 'num' })
    let w = nt.w
    if (e.of != null) { const ot = tb(left + numW + 22, nBase, `of ${e.of}`, ofS, 'start'); textBoxes.push({ ...ot, part: 'of' }); w = numW + ofW }
    parts.num = R(left, nBase - nCap, w, nCap)
  }
  const lt = rows.map((r, i) => ({ ...tb(left, top + first + i * lh, r.l, size, 'start', { weight: 600, face: 'display' }), part: 'text', acc: r.acc }))
  parts.text = union(lt.map(t => R(t.x, t.y, t.w, t.h))); textBoxes.push(...lt)
  const st = subLines.map((l, i) => ({ ...tb(left, top + subFirst + i * subLh, l, subS, 'start'), part: 'sub' }))
  if (st.length) { parts.sub = union(st.map(t => R(t.x, t.y, t.w, t.h))); textBoxes.push(...st) }
  let picBox = null
  if (pic) {
    const textBlock = union(Object.values(parts)), cy = textBlock[1] + textBlock[3] / 2
    picBox = R(1920 - STEP.left - picW, Math.round(cy - picH / 2), picW, picH); parts.picture = picBox
  }
  const sel = wants(e), keep = Object.entries(parts).filter(([k]) => sel(k)), outer = union(keep.map(([, b]) => b))
  return { x: outer[0], y: outer[1], w: outer[2], h: outer[3], size, lines: rows, lh, subLines, subS, left, top, numS, numW, ofS, ofW, nBase: top + nCap, picBox, parts: Object.fromEntries(keep), textBoxes: textBoxes.filter(t => sel(t.part === 'of' ? 'num' : t.part)), solids: picBox && sel('picture') ? [picBox] : [] }
}

// ---------------------------------------------------------------- steps list (D16)
// A lead line (display face) above up to six numbered rows: number (display, accent), optional thumbnail or icon, label in the text face.
export function stepsLayout(e) {
  const items = (e.items ?? []).slice(0, 6), n = items.length
  // split (default when there is a lead; Dominik 13 Nov, D16): the lead sits in a left column (640 px, display face, 78 px) and the rows in a
  // right column, both centred vertically. split: false stacks the lead above the rows.
  const split = !!(e.lead && e.split !== false), SPL = { x: 140, leadW: 640, rowsX: 860, right: 1800 }
  const leadS = split ? 78 : 70, leadLh = Math.round(leadS * 1.12), labelS = Math.max(44, Math.min(48, e.size ?? 48))
  const leadLines = e.lead ? (split ? wrapBalanced(e.lead, leadS, SPL.leadW) : wrap(e.lead, leadS, MEASURE_CAP - 20)) : []
  const hasPic = items.some(i => i.thumb || i.icon)
  const rowH = n <= 5 ? 140 : 118, thumbH = Math.min(124, rowH - 16), thumbW = Math.round(thumbH * 16 / 9)
  const numCol = 84, offset = numCol + (hasPic ? 28 + thumbW + 40 : 40)
  // split rows: a two-line label is balanced, so no line holds one word
  const labels = items.map(it => (split ? wrapBalanced(it.label ?? it.text ?? '', labelS, SPL.right - SPL.rowsX - offset) : wrap(it.label ?? it.text ?? '', labelS, MEASURE_CAP - offset)).slice(0, 2))
  const rowsW = offset + Math.max(0, ...labels.flat().map(l => twEst(l, labelS)))
  const leadW = Math.max(0, ...leadLines.map(l => twEst(l, leadS)))
  const left = split ? SPL.rowsX : Math.max(80, Math.round((1920 - Math.max(rowsW, leadW)) / 2))
  const leadH = split ? 0 : leadLines.length ? leadLines.length * leadLh + 48 : 0
  const H = leadH + n * rowH, top = Math.max(48, Math.round((1080 - H) / 2) - 20)
  const parts = {}, textBoxes = [], rowsOut = []
  const leadTop = split ? Math.round((1080 - leadLines.length * leadLh) / 2) - 20 : top
  const lead = leadLines.map((l, i) => ({ ...tb(split ? SPL.x : left, leadTop + Math.round(leadS * 0.8) + i * leadLh, l, leadS, 'start', { weight: 600, face: 'display' }), part: 'lead' }))
  if (lead.length) { parts.lead = union(lead.map(t => R(t.x, t.y, t.w, t.h))); textBoxes.push(...lead) }
  items.forEach((it, i) => {
    const cy = top + leadH + i * rowH + rowH / 2, nb = tb(left + numCol, cy + 72 * 0.35, String(it.n ?? i + 1), 72, 'end', { weight: 600, face: 'display' })
    const lb = labels[i].map((l, k) => tb(left + offset, cy + labelS * 0.35 + (k - (labels[i].length - 1) / 2) * Math.round(labelS * 1.15), l, labelS, 'start'))
    const pic = it.thumb || it.icon ? R(left + numCol + 28, cy - thumbH / 2, thumbW, thumbH) : null
    rowsOut.push({ i, it, nb, lb, pic, cy })
    parts[`item:${i}`] = union([R(nb.x, nb.y, nb.w, nb.h), ...lb.map(t => R(t.x, t.y, t.w, t.h)), pic])
    textBoxes.push({ ...nb, part: `item:${i}` }, ...lb.map(t => ({ ...t, part: `item:${i}` })))
  })
  const sel = wants(e), keep = Object.entries(parts).filter(([k]) => sel(k)), outer = union(keep.map(([, b]) => b))
  return { x: outer[0], y: outer[1], w: outer[2], h: outer[3], left, top, rowH, thumbW, thumbH, labelS, leadS, rows: rowsOut, hasPic, bottom: top + H, fits: top + H <= 990, parts: Object.fromEntries(keep), textBoxes: textBoxes.filter(t => sel(t.part)), solids: [] }
}

// ---------------------------------------------------------------- textblock (D5, D19)
// Lines wrap to a measure (about 30 em, at most 1320 px) and the block is centred. Optional `picture` (image src or icon name) centred above.
export function textblockLayout(e) {
  const align = e.align ?? 'middle', pic = e.picture, imgPic = pic && isImageSrc(pic)
  const picW = !pic ? 0 : imgPic ? 640 : 240, picH = !pic ? 0 : imgPic ? 360 : 240, picGap = pic ? 56 : 0
  const sized = (e.lines ?? []).map(l => typeof l === 'string' ? { text: l } : l).map(r => ({ ...r, size: r.size ?? 56 }))
  const flat = sized.flatMap(r => wrap(r.text, r.size, Math.min(e.measure ?? MEASURE_CAP, MEASURE_EM * r.size)).map(l => ({ ...r, text: l })))
  const gapOf = s => Math.round(s * 1.3)
  const total = flat.reduce((a, r) => a + gapOf(r.size), 0) + picH + picGap
  const y0 = e.y ?? Math.round((1080 - total) / 2) - 20
  const widest = Math.max(0, ...flat.map(r => twEst(r.text, r.size)))
  const x = e.x ?? (align === 'middle' ? 960 : Math.max(120, Math.round((1920 - widest) / 2)))
  let yy = y0 + picH + picGap
  const textBoxes = flat.map(r => { const t = tb(x, yy + r.size * ASC + (gapOf(r.size) - r.size) / 2, r.text, r.size, align === 'middle' ? 'middle' : 'start', r.size >= 64 ? { face: 'display', weight: 600 } : {}); yy += gapOf(r.size); return { ...t, color: r.color, part: 'text' } })
  const parts = { text: union(textBoxes.map(t => R(t.x, t.y, t.w, t.h))) }
  let picBox = null
  if (pic) { picBox = R(960 - picW / 2, y0, picW, picH); parts.picture = picBox }
  const sel = wants(e), keep = Object.entries(parts).filter(([k]) => sel(k)), outer = union(keep.map(([, b]) => b))
  return { x: outer[0], y: outer[1], w: outer[2], h: outer[3], rows: flat, align, ax: x, picBox, imgPic, parts: Object.fromEntries(keep), textBoxes: textBoxes.filter(t => sel('text')), solids: picBox && sel('picture') ? [picBox] : [] }
}

// ---------------------------------------------------------------- cycle (D7)
export function cycleLayout(e) {
  const nodes = e.nodes ?? [], n = nodes.length, W = e.w ?? 1680, X = e.x ?? 120, Y = e.y ?? 250
  const nh = e.nodeH ?? 280
  const nw = Math.min(e.nodeW ?? 440, Math.floor((W - (n - 1) * 130) / Math.max(1, n)))
  const gap = n > 1 ? Math.min(200, (W - n * nw) / (n - 1)) : 0
  const total = n * nw + (n - 1) * gap, x0 = X + (W - total) / 2
  const iconH = 96
  const nodeBoxes = nodes.map((nd, i) => {
    const bx = box(x0 + i * (nw + gap), Y, nw, nh)
    return { ...bx, lay: boxLayout({ ...bx, text: nd.label, icon: nd.icon }), nd }
  })
  // fit all labels to one size so the row reads evenly
  const size = Math.min(...nodeBoxes.map(b => b.lay.lab.size), 56)
  const nodeLays = nodeBoxes.map(b => boxLayout({ x: b.x, y: b.y, w: b.w, h: b.h, text: b.nd.label, icon: b.nd.icon }))
  // forward arrows: node i right edge -> node i+1 left edge, square on the edge mid-height
  const arrows = []
  for (let i = 0; i < n - 1; i++) arrows.push([nodeBoxes[i].x + nw, Y + nh / 2, nodeBoxes[i + 1].x, Y + nh / 2])
  // return: one cubic from the bottom centre of the last node to the bottom centre of the first, vertical tangents, arrowhead up into the first
  let ret = null, label = null
  if (n > 1) {
    const sx = nodeBoxes[n - 1].x + nw / 2, ex = nodeBoxes[0].x + nw / 2, by = Y + nh, d = Math.min(300, Math.max(150, Math.abs(sx - ex) * 0.16))
    const ctrl = d * 4 / 3                                   // a cubic with both controls at depth `ctrl` reaches 3/4 of it
    ret = { sx, ex, by, d, ctrl, low: by + d, d_path: `M${sx} ${by} C${sx} ${by + ctrl} ${ex} ${by + ctrl} ${ex} ${by + 24}` }
    if (e.returnLabel) {
      const ls = 40, lt = tb((sx + ex) / 2, by + d + 24 + ls * ASC, e.returnLabel, ls, 'middle')
      label = lt
    }
  }
  const parts = {}
  nodeBoxes.forEach((b, i) => { parts[`node:${i}`] = R(b.x, b.y, b.w, b.h) })
  arrows.forEach((a, i) => { parts[`step:${i}`] = R(a[0], a[1] - 12, a[2] - a[0], 24) })
  if (ret) parts.return = R(Math.min(ret.sx, ret.ex), ret.by, Math.abs(ret.sx - ret.ex), ret.d)
  if (label) parts.label = R(label.x, label.y, label.w, label.h)
  const sel = wants(e), keep = Object.entries(parts).filter(([k]) => sel(k)), outer = union(keep.map(([, b]) => b))
  const segs = []
  arrows.forEach((a, i) => { if (sel(`step:${i}`)) segs.push(a) })
  if (ret && sel('return')) {
    let prev = [ret.sx, ret.by]
    for (let k = 1; k <= 12; k++) {
      const t = k / 12, u = 1 - t, y = u ** 3 * ret.by + 3 * u * u * t * (ret.by + ret.ctrl) + 3 * u * t * t * (ret.by + ret.ctrl) + t ** 3 * (ret.by + 16)
      const x = u ** 3 * ret.sx + 3 * u * u * t * ret.sx + 3 * u * t * t * ret.ex + t ** 3 * ret.ex
      segs.push([prev[0], prev[1], x, y]); prev = [x, y]
    }
  }
  const textBoxes = nodeLays.flatMap((l, i) => sel(`node:${i}`) ? l.textBoxes : []).concat(label && sel('label') ? [label] : [])
  return { x: outer[0], y: outer[1], w: outer[2], h: outer[3], n, nw, nh, gap, nodeBoxes, nodeLays, size, arrows, ret, label, parts: Object.fromEntries(keep), segs, textBoxes }
}

// ---------------------------------------------------------------- chat (D11)
export const CHAT_KINDS = {
  thought: { color: '#6d47c9', tint: '#f1ecfa', icon: 'sparkles', label: 'Thought' },
  search: { color: '#7a6200', tint: '#f6f1d9', icon: 'search', label: 'Searched' },
  tool: { color: '#b45309', tint: '#fdf0e0', icon: 'wrench', label: 'Used' },
  result: { color: '#a21caf', tint: '#fae9fb', icon: 'check', label: 'Result' }
}
export function chatLayout(e) {
  // D19: the window is at most 1320 px wide (60-70 characters a line at 34 px) and centred, unless a narrower window is placed with x
  const W = Math.min(e.w ?? MEASURE_CAP, MEASURE_CAP), X = e.x != null && W < MEASURE_CAP ? e.x : Math.round((1920 - W) / 2)
  const Y = e.y ?? 120, H = e.h ?? 800, bar = 64, size = 34, lh = Math.round(size * 1.35)
  let yy = Y + bar + 36
  const items = [], textBoxes = [], parts = { frame: R(X, Y, W, H) }
  const maxUser = Math.round(W * 0.6), avW = 52, left = X + 40
  ;(e.messages ?? []).forEach((m, i) => {
    const who = m.who === 'user' ? 'user' : 'agent'
    let b
    if (who === 'user') {
      const lines = wrap(m.text, size, maxUser - 60), bw = Math.min(maxUser, Math.max(...lines.map(l => twEst(l, size))) + 60), bh = lines.length * lh + 36
      const bx = X + W - 40 - bw
      b = { i, who, kind: 'user', x: bx, y: yy, w: bw, h: bh, lines }
      lines.forEach((l, k) => textBoxes.push({ ...tb(bx + 30, yy + 18 + size * ASC + k * lh, l, size), msg: i }))
      yy += bh + 26
    } else if (m.kind && CHAT_KINDS[m.kind]) {
      const k = CHAT_KINDS[m.kind], txt = m.text ?? '', iw = size + 14
      const bw = Math.min(W - 80 - avW - 18, twEst(txt, size) + 56 + iw), bh = Math.round(size * 1.9)
      const bx = left + avW + 18
      b = { i, who, kind: m.kind, x: bx, y: yy, w: bw, h: bh, lines: [txt] }
      textBoxes.push({ ...tb(bx + 28 + iw, yy + bh / 2 + size * 0.35, txt, size), msg: i })
      yy += bh + 22
    } else {
      const tx = left + avW + 18, lines = wrap(m.text, size, Math.min(W * 0.78, X + W - 40 - tx)), bh = lines.length * lh
      b = { i, who, kind: 'text', x: tx, y: yy, w: Math.max(...lines.map(l => twEst(l, size))), h: bh, lines, avatar: true }
      lines.forEach((l, k) => textBoxes.push({ ...tb(tx, yy + size * ASC + k * lh, l, size), msg: i }))
      yy += bh + 26
    }
    items.push(b); parts[`msg:${i}`] = R(b.x, b.y, b.w, b.h)
  })
  const fits = yy - 26 <= Y + H - 24
  const sel = wants(e), keep = Object.entries(parts).filter(([k]) => sel(k)), outer = union(keep.map(([, b]) => b))
  return { x: outer[0], y: outer[1], w: outer[2], h: outer[3], X, Y, W, H, bar, size, lh, items, left, avW, fits, used: yy, parts: Object.fromEntries(keep), textBoxes: textBoxes.filter(t => sel(`msg:${t.msg}`)) }
}

// ---------------------------------------------------------------- focus and pointer
export const FOCUS_MIN_PAD = 24
export function focusRect(target, pad = FOCUS_MIN_PAD) {
  const p = Math.max(FOCUS_MIN_PAD, pad), [x, y, w, h] = target
  return [x - p, y - p, w + 2 * p, h + 2 * p]
}
// the point on `box`'s edge on the line from `from` to the box centre, pulled back `gap` px toward `from`
export function edgePoint(from, boxR, gap = 16) {
  const [x, y, w, h] = boxR, cx = x + w / 2, cy = y + h / 2
  let dx = cx - from[0], dy = cy - from[1]
  const len = Math.hypot(dx, dy) || 1
  dx /= len; dy /= len
  // march from `from` toward the centre until inside the box, then step back
  let t = 0
  while (t < len) { const px = from[0] + dx * t, py = from[1] + dy * t; if (px >= x && px <= x + w && py >= y && py <= y + h) break; t += 1 }
  const tt = Math.max(0, t - gap)
  return [from[0] + dx * tt, from[1] + dy * tt]
}
export function pointerLayout(e, targetBox) {
  const from = e.from ?? [0, 0], gap = 16
  let end
  if (targetBox) end = edgePoint(from, targetBox, gap)
  else {
    const to = e.to ?? [0, 0], dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy) || 1
    end = [to[0] - dx / len * gap, to[1] - dy / len * gap]
  }
  const dx = end[0] - from[0], dy = end[1] - from[1], len = Math.hypot(dx, dy) || 1
  const diagonal = Math.abs(dx) > 24 && Math.abs(dy) > 24
  const bend = diagonal ? len * 0.16 : 0, mx = (from[0] + end[0]) / 2 - dy / len * bend, my = (from[1] + end[1]) / 2 + dx / len * bend
  const segs = []
  let prev = from
  for (let k = 1; k <= 10; k++) {
    const t = k / 10, u = 1 - t, x = u * u * from[0] + 2 * u * t * mx + t * t * end[0], y = u * u * from[1] + 2 * u * t * my + t * t * end[1]
    segs.push([prev[0], prev[1], x, y]); prev = [x, y]
  }
  const tang = [end[0] - mx, end[1] - my], tl = Math.hypot(...tang) || 1, tu = [tang[0] / tl, tang[1] / tl]
  let label = null
  if (e.label) {
    const ls = 34, horiz = Math.abs(dx) >= Math.abs(dy)
    if (horiz) label = tb(dx >= 0 ? from[0] - 18 : from[0] + 18, from[1] + ls * 0.35, e.label, ls, dx >= 0 ? 'end' : 'start')
    else label = tb(from[0], dy >= 0 ? from[1] - 20 : from[1] + 20 + ls * 0.8, e.label, ls, 'middle')
  }
  return { from, end, ctrl: [mx, my], segs, tu, label, diagonal, textBoxes: label ? [label] : [] }
}

// ---------------------------------------------------------------- window title bar (agent)
export const AGENT_BAR = 72
// The agent window: tab inside the title bar after the dots; the title at the bar's right end, or, when the bar has no room for it,
// centred just under the bar (never dropped, never over the tab).
export function agentLayout(e) {
  const x = e.x, y = e.y, w = e.w, bar = AGENT_BAR, tabW = 196, tabX = x + 112
  const tab = R(tabX, y + 10, tabW, bar - 20)
  const tabText = e.chatbot ? tb(tabX + 98, y + bar / 2 + 12, 'Chatbot', 34, 'middle', { role: 'tab' }) : tb(tabX + 62, y + bar / 2 + 12, 'Agent', 34, 'start', { role: 'tab' })
  let title = null, below = false
  if (e.title) {
    const room = x + w - 40 - (tabX + tabW + 28)
    if (twEst(e.title, 34) <= room) title = tb(x + w - 40, y + bar / 2 + 12, e.title, 34, 'end', { role: 'title', weight: 500 })
    else { below = true; title = tb(x + w / 2, y + bar + 24 + 34 * ASC, e.title, 34, 'middle', { role: 'title', weight: 500 }) }
  }
  return { tab, tabText, title, below, bar }
}

// ---------------------------------------------------------------- bbox for every element type
const sceneryBox = (x, y, w, h) => ({ ...box(x, y, w, h), kind: 'scenery', textBoxes: [], solids: [], segs: [] })
const solidBox = (x, y, w, h, extra = {}) => ({ ...box(x, y, w, h), kind: 'picture', textBoxes: [], solids: [R(x, y, w, h)], segs: [], ...extra })
const textEl = (boxes, kind = 'text') => { const u = union(boxes.map(t => R(t.x, t.y, t.w, t.h))); return { x: u[0], y: u[1], w: u[2], h: u[3], kind, textBoxes: boxes, solids: boxes.map(t => R(t.x, t.y, t.w, t.h)), segs: [] } }

export function bbox(e, ctx = {}) {
  const t = e.type
  const o = (() => {
    switch (t) {
      case 'floor': return sceneryBox(e.x1 ?? 0, e.y ?? 940, (e.x2 ?? 1920) - (e.x1 ?? 0), 20)
      case 'plant': return sceneryBox((e.x ?? 0) - 60 * (e.s ?? 1), (e.y ?? 940) - 240 * (e.s ?? 1), 120 * (e.s ?? 1), 240 * (e.s ?? 1))
      case 'window': return sceneryBox(e.x, e.y, e.w ?? 260, e.h ?? 320)
      case 'clock': return sceneryBox(e.x - (e.r ?? 46), e.y - (e.r ?? 46), 2 * (e.r ?? 46), 2 * (e.r ?? 46))
      case 'picture': return sceneryBox(e.x, e.y, e.w ?? 200, e.h ?? 140)
      case 'desk': case 'table': return sceneryBox(e.x1, e.y, e.x2 - e.x1, (e.floorY ?? 940) - e.y)
      case 'keyboard': return sceneryBox(e.x, e.y - 16, e.w ?? 210, 16)
      case 'monitor': return { ...box(e.x, e.y, e.w, e.h), kind: 'picture', textBoxes: [], solids: [R(e.x, e.y, e.w, e.h)], segs: [] }
      case 'headset': case 'stress': return sceneryBox((e.x ?? 0) - 70, (e.y ?? 0) - 120, 140, 140)
      case 'person': { const s = e.s ?? 1; return sceneryBox((e.x ?? 0) - 100 * s, (e.y ?? 936) - 430 * s, 200 * s, 430 * s) }
      case 'crowd': return sceneryBox(e.x ?? 0, (e.y ?? 936) - 360, 200 * ((e.who ?? [1, 2, 3]).length), 360)
      case 'bubble': {
        const rows = e.rows ?? [], sz = e.size ?? 30, tbs = rows.map((r, i) => tb(e.x + 28, e.y + 28 + sz + i * Math.round(sz * 1.3), r, sz, 'start', { within: R(e.x, e.y, e.w, e.h) }))
        return { ...box(e.x, e.y, e.w, e.h), kind: 'container', textBoxes: tbs, solids: [], segs: [] }
      }
      case 'thought': return { ...box(e.x, e.y, e.w, e.h), kind: 'container', textBoxes: [], solids: [], segs: [] }
      case 'agent': {
        const A = agentLayout(e)
        return { ...box(e.x, e.y, e.w, e.h), kind: 'container', textBoxes: [A.tabText, ...(A.title ? [A.title] : [])], solids: [], segs: [], parts: { tab: A.tab, window: R(e.x, e.y, e.w, e.h) } }
      }
      case 'tray': return { ...box(e.x, e.y, e.w, e.h), kind: 'container', textBoxes: [tb(e.x + 22, e.y + e.h - 22 + 9, e.label ?? "Model's context", 26, 'start')], solids: [], segs: [] }
      case 'tool': {
        const [x1, y1] = e.from ?? [0, 0], [x2, y2] = e.to ?? [0, 0], lx = e.labelAt?.[0] ?? (x1 + x2) / 2, ly = e.labelAt?.[1] ?? (y1 + y2) / 2
        const cw = e.label ? twEst(e.label, 26) + 44 + (e.icon ? 40 : 0) : 0
        return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), kind: 'tool', textBoxes: e.label ? [tb(lx + 24 + (e.icon ? 40 : 0), ly + 25 + 9, e.label, 26, 'start')] : [], solids: [], segs: [] }
      }
      case 'message': {
        const m = messageLayout(e)
        return { ...box(e.x, e.y, e.w, e.h), kind: 'container', textBoxes: m.textBoxes, solids: [], segs: [], single: m.centred }
      }
      case 'page': return { ...box(e.x, e.y, e.w ?? 200, e.h ?? 260), kind: 'picture', textBoxes: e.title ? [tb(e.x + 20, e.y + 20 + (e.tsize ?? 26), e.title, e.tsize ?? 26, 'start', { weight: 700 })] : [], solids: [R(e.x, e.y, e.w ?? 200, e.h ?? 260)], segs: [] }
      case 'slip': return { ...box(e.x, e.y, e.w ?? 420, e.h ?? 260), kind: 'picture', textBoxes: [tb(e.x + 56, e.y + 38, e.name ?? 'file.txt', 26, 'start', { weight: 700 })], solids: [R(e.x, e.y, e.w ?? 420, e.h ?? 260)], segs: [] }
      case 'filename': case 'chip': case 'tag': {
        const label = e.label ?? e.name ?? e.text ?? (t === 'tag' ? 'Illustrative example' : 'file.pdf'), size = t === 'tag' ? 26 : (e.size ?? 26), h = e.h ?? Math.round(size * 1.9)
        const ic = t === 'filename' ? (e.ic ?? 'file-text') : e.icon, w = e.w ?? Math.round(String(label).length * size * 0.56 + 44 + (ic ? size + 14 : 0)), x = t === 'tag' ? (e.x ?? 1500) : e.x, y = t === 'tag' ? (e.y ?? 40) : e.y
        return { ...box(x, y, w, h), kind: 'chip', textBoxes: [tb(x + (ic ? 18 + size + 12 : 24), y + h / 2 + size * 0.35, label, size, 'start', { weight: e.weight })], solids: [R(x, y, w, h)], segs: [] }
      }
      case 'stack': return solidBox(e.x, e.y - 14 * ((e.n ?? 3) - 1), (e.w ?? 170) + 16 * ((e.n ?? 3) - 1), (e.h ?? 230) + 14 * ((e.n ?? 3) - 1))
      case 'folder': return { ...box(e.x, e.y, e.w ?? 220, e.h ?? 160), kind: 'picture', textBoxes: e.label ? [tb(e.x + (e.w ?? 220) / 2, e.y + (e.h ?? 160) / 2 + 18, e.label, 26, 'middle')] : [], solids: [R(e.x, e.y, e.w ?? 220, e.h ?? 160)], segs: [] }
      case 'envelope': return solidBox(e.x, e.y, e.w ?? 120, e.h ?? 84)
      case 'receipt': return solidBox(e.x, e.y, e.w ?? 100, e.h ?? 150)
      case 'sheet': {
        const w = e.w ?? 460, h = e.h ?? 300, rows = [].concat(e.rows ?? e.sub ?? ['']), tbs = [tb(e.x + 66, e.y + 43, e.title ?? 'Instructions', 30, 'start', { weight: 700 }), ...rows.map((r, i) => tb(e.x + 24, e.y + 108 + i * 34, r, 26, 'start'))]
        return { ...box(e.x, e.y, w, h), kind: 'picture', textBoxes: tbs, solids: [R(e.x, e.y, w, h)], segs: [] }
      }
      case 'cabinets': { const cols = (e.cols ?? ['a', 'b', 'c', 'd', 'e']).length, cw = e.cw ?? 190, rows = e.rows ?? 4, dh = e.dh ?? 150; return solidBox(e.x, e.y - 50, cols * cw, rows * dh + 72) }
      case 'searchBox': { const w = e.w ?? 760, h = e.h ?? 96, size = e.size ?? 38; return { ...box(e.x, e.y, w, h), kind: 'container', textBoxes: [tb(e.x + 104, e.y + h / 2 + size * 0.35, e.query || 'Search', size, 'start')], solids: [], segs: [] } }
      case 'inbox': return solidBox(e.x, e.y, e.w ?? 760, e.h ?? 520)
      case 'chart': return solidBox(e.x, e.y, e.w ?? 1100, e.h ?? 640)
      case 'ladder': return solidBox((e.x ?? 0) - 380, e.ytop ?? 220, 380 + (e.w ?? 290), (e.ybot ?? 940) - (e.ytop ?? 220))
      case 'logo': return solidBox(e.x, e.y, e.size ?? 120, e.size ?? 120)
      case 'logoCard': { const s = e.size ?? 150, w = s * 1.9, h = s * 1.5 + (e.labels === false ? 0 : 64); return solidBox(e.x - w / 2, e.y, w, h) }
      case 'logoRow': { const items = e.items ?? [], s = e.size ?? 150, gap = e.gap ?? 380, w = s * 1.9, h = s * 1.5 + (e.labels === false ? 0 : 64); return solidBox(e.x - w / 2, e.y, (items.length - 1) * gap + w, h) }
      case 'icon': return solidBox(e.x, e.y, e.size ?? 64, e.size ?? 64, { kind: 'icon' })
      case 'lens': return solidBox((e.x ?? 0) - (e.r ?? 34), (e.y ?? 0) - (e.r ?? 34), 2.8 * (e.r ?? 34), 2.8 * (e.r ?? 34))
      case 'pen': return solidBox((e.x ?? 0) - 10, (e.y ?? 0) - 80, 90, 90)
      case 'book': return solidBox(e.x - (e.w ?? 86) / 2, e.y - (e.h ?? 58) / 2, e.w ?? 86, e.h ?? 58)
      case 'badge': { const r = e.r ?? 24; return solidBox(e.x - r, e.y - r, 2 * r, 2 * r, { kind: 'icon' }) }
      case 'agentMark': { const r = e.r ?? 22; return solidBox(e.x - r, e.y - r, 2 * r, 2 * r, { kind: 'icon' }) }
      case 'transform': case 'relate': case 'tagged': return { ...box(e.x ?? 160, e.y ?? 170, e.w ?? 1600, e.h ?? 720), kind: 'relation', textBoxes: [], solids: [], segs: [] }
      case 'text': {
        const tbx = tb(e.x, e.y, e.text ?? '', e.size ?? 32, e.anchor ?? 'start', { weight: e.weight ?? 400, role: e.role })
        return textEl([tbx])
      }
      case 'lines': {
        const sz = e.size ?? 32, step = e.step ?? Math.round(sz * 1.25)
        return textEl((e.rows ?? []).map((r, i) => tb(e.x, e.y + i * step, r, sz, e.anchor ?? 'start', { weight: e.weight ?? 400, role: e.role })))
      }
      case 'rect': return { ...box(e.x, e.y, e.w, e.h), kind: 'container', textBoxes: [], solids: [], segs: [], outline: (e.fill ?? 'none') === 'none' }
      case 'circle': return { ...box(e.x - e.r, e.y - e.r, 2 * e.r, 2 * e.r), kind: 'container', textBoxes: [], solids: [], segs: [], outline: (e.fill ?? 'none') === 'none' }
      case 'line': case 'arrow': {
        const sw = e.sw ?? 3.5
        return { x: Math.min(e.x1, e.x2), y: Math.min(e.y1, e.y2), w: Math.abs(e.x2 - e.x1), h: Math.abs(e.y2 - e.y1), kind: 'connector', textBoxes: [], solids: [], segs: [[e.x1, e.y1, e.x2, e.y2]], connector: { sw, color: e.color, dash: e.dash ?? null, arrow: t === 'arrow' } }
      }
      case 'image': return { ...box(e.x ?? 0, e.y ?? 0, e.w ?? 1920, e.h ?? 1080), kind: 'picture', textBoxes: [], solids: (e.w ?? 1920) >= 1900 ? [] : [R(e.x ?? 0, e.y ?? 0, e.w ?? 1920, e.h ?? 1080)], segs: [] }
      // ---- new elements
      case 'box': {
        const b = boxLayout(e)
        return { ...box(e.x, e.y, e.w, e.h), kind: 'container', textBoxes: b.textBoxes, solids: [], segs: [], iconBox: b.iconBox }
      }
      case 'quote': { const q = quoteLayout(e); return { x: q.x, y: q.y, w: q.w, h: q.h, kind: 'composite', textBoxes: q.textBoxes, solids: q.parts.figure ? [q.parts.figure] : [], segs: [], parts: q.parts, decor: ['mark'] } }
      case 'stat': case 'stats': { const s = statsLayout(e); return { x: s.x, y: s.y, w: s.w, h: s.h, kind: 'composite', textBoxes: s.textBoxes, solids: [], segs: [], parts: s.parts } }
      case 'step': { const s = stepLayout(e); return { x: s.x, y: s.y, w: s.w, h: s.h, kind: 'composite', textBoxes: s.textBoxes, solids: s.solids, segs: [], parts: s.parts, screen: 'step' } }
      case 'steps': { const s = stepsLayout(e); return { x: s.x, y: s.y, w: s.w, h: s.h, kind: 'composite', textBoxes: s.textBoxes, solids: [], segs: [], parts: s.parts, screen: 'steps' } }
      case 'textblock': { const s = textblockLayout(e); return { x: s.x, y: s.y, w: s.w, h: s.h, kind: 'text', textBoxes: s.textBoxes, solids: s.solids, segs: [], parts: s.parts } }
      case 'cycle': { const c = cycleLayout(e); return { x: c.x, y: c.y, w: c.w, h: c.h, kind: 'composite', textBoxes: c.textBoxes, solids: [], segs: c.segs, connector: { sw: 4, color: null, dash: null, arrow: true, own: true }, parts: c.parts } }
      case 'chat': { const c = chatLayout(e); return { x: c.x, y: c.y, w: c.w, h: c.h, kind: 'composite', textBoxes: c.textBoxes, solids: [], segs: [], parts: c.parts } }
      case 'focus': {
        const tg = resolveTarget(e.target, ctx)
        if (!tg) return { x: 0, y: 0, w: 0, h: 0, kind: 'highlight', textBoxes: [], solids: [], segs: [], unresolved: true }
        const r = focusRect(tg, e.pad)
        return { ...box(...r), kind: 'highlight', textBoxes: [], solids: [], segs: [], target: tg, ring: r }
      }
      case 'pointer': {
        const tg = typeof e.to === 'string' ? resolveTarget(e.to, ctx) : null
        const p = pointerLayout(e, tg)
        const xs = p.segs.flatMap(s => [s[0], s[2]]), ys = p.segs.flatMap(s => [s[1], s[3]])
        return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), kind: 'connector', textBoxes: p.textBoxes, solids: [], segs: p.segs, connector: { sw: 4, color: e.color ?? null, dash: null, arrow: true, own: true }, target: tg, end: p.end }
      }
      default: return { x: e.x ?? 0, y: e.y ?? 0, w: 0, h: 0, kind: 'unknown', textBoxes: [], solids: [], segs: [] }
    }
  })()
  return { type: t, ...o, textBoxes: o.textBoxes ?? [], solids: o.solids ?? [], segs: o.segs ?? [] }
}

// a focus / pointer target: [x, y, w, h], or the id of another element in the same frame (ctx.byId: id -> element, ctx.depth guards loops)
export function resolveTarget(target, ctx = {}) {
  if (Array.isArray(target)) return target
  if (typeof target !== 'string') return null
  // "id/part" targets one part of a composite element, e.g. "loop/node:1" (a cycle's second node) or "row/value:0"
  const [id, part] = target.split('/')
  const el = ctx.byId?.get(id)
  if (!el || (ctx.depth ?? 0) > 3) return null
  const b = bbox(el, { ...ctx, depth: (ctx.depth ?? 0) + 1 })
  if (part) { const q = b.parts?.[part]; if (!q) return null; return Array.isArray(q) ? q : [q.x, q.y, q.w, q.h] }
  return [b.x, b.y, b.w, b.h]
}
