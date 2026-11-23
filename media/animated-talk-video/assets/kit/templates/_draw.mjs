// Line-art drawing kit for illustrated scenes: ink outlines on paper, one green accent, red for errors only.
// JS port of the approved storyboard-v3 generator (Python kit.py / props.py), 2026-11-03/04. Every function returns an SVG string.
// Coordinates are the 1920x1080 frame; the floor line sits at y 940 and the caption zone (y > 990) stays empty.
import { resolveIcon } from './_icons.mjs'
import * as G from './_geom.mjs'
import { emOf, twEst } from './_geom.mjs'
import { resolveFonts } from './_fonts.mjs'

// Palette. Defaults are the kit's; setPalette(look) swaps ink, paper, muted, green, tint and red for a project's look.json.
export let INK = '#101418', PAPER = '#fdfdfb', MUTED = '#5c6570', HAIR = '#cfcdc4'
export let GREEN = '#0a7a5c', GT = '#e4f3ee', RED = '#b42318'
export let SOFT = '#f1f0ea', DARK = '#2a3036', TINT2 = '#cfe9e1'
export let ORANGE = '#d9730d'   // the second accent: highlights (`focus`), quote source lines, pointers in the accent
export const SW = 3.5
// Faces (D18): FONT = the text face; DISPLAY = the display face (big type), DW its weight. setPalette(look) sets all three from the look tokens.
export let FONT = resolveFonts().text, DISPLAY = resolveFonts().display, DW = resolveFonts().dw
export const FLOOR = 940
export function setPalette(look = {}) {
  INK = look.ink ?? '#101418'; PAPER = look.paper ?? '#fdfdfb'; MUTED = look.muted ?? '#5c6570'
  GREEN = look.accents?.green ?? '#0a7a5c'; GT = look.tints?.green ?? '#e4f3ee'; RED = look.accents?.red ?? '#b42318'
  ORANGE = look.accents?.orange ?? '#d9730d'
  const F = resolveFonts(look); FONT = F.text; DISPLAY = F.display; DW = F.dw
}

// Warnings and icon-set options for the render in progress (frameToSvg sets them).
export const ctxState = { warn: m => console.error('warn ' + m), icons: {}, marks: 0, el: null }   // el = the frame/element being drawn, for warnings

const a = (fill, stroke, sw, extra = '') => {
  let s = `fill="${fill}"`
  if (stroke) s += ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`
  return s + (extra ? ' ' + extra : '')
}
const num = n => +Number(n).toFixed(2)
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const rect = (x, y, w, h, rx = 0, fill = PAPER, stroke = INK, sw = SW, extra = '') => `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" rx="${num(rx)}" ${a(fill, stroke, sw, extra)}/>`
export const circle = (cx, cy, r, fill = PAPER, stroke = INK, sw = SW, extra = '') => `<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}" ${a(fill, stroke, sw, extra)}/>`
export const ellipse = (cx, cy, rx, ry, fill = PAPER, stroke = INK, sw = SW, extra = '') => `<ellipse cx="${num(cx)}" cy="${num(cy)}" rx="${num(rx)}" ry="${num(ry)}" ${a(fill, stroke, sw, extra)}/>`
export const path = (d, fill = 'none', stroke = INK, sw = SW, extra = '') => `<path d="${d}" ${a(fill, stroke, sw, extra)}/>`
export const line = (x1, y1, x2, y2, stroke = INK, sw = SW, dash = null) => `<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`
export function text(x, y, s, size = 28, weight = 400, fill = INK, anchor = 'start', extra = '', face = 'text') {
  if (size < 26) ctxState.warn(`text "${String(s).slice(0, 24)}" is ${size} px; labels in illustrations are 26 px or larger`)
  return `<text x="${num(x)}" y="${num(y)}" font-family="${face === 'display' ? DISPLAY : FONT}" font-size="${size}" font-weight="${face === 'display' ? DW : weight}" fill="${fill}" text-anchor="${anchor}" ${extra}>${esc(s)}</text>`
}
export const lines = (x, y, rows, size = 28, step = null, weight = 400, fill = INK, anchor = 'start') => {
  step = step ?? Math.round(size * 1.25)
  return rows.map((r, i) => text(x, y + i * step, r, size, weight, fill, anchor)).join('')
}
export const g = (id, parts, extra = '') => `<g id="${id}"${extra ? ' ' + extra : ''}>${[].concat(parts).join('')}</g>`
// Arrows end in a solid head sized to the stroke (13 Nov: "ugly indistinct arrows"): the line stops at the head's base so the tip stays sharp.
export function arrowHead(x2, y2, an, stroke = INK, sw = SW, head = 16) {
  const L = Math.max(head, sw * 7), W = L * 0.45
  const bx = x2 - L * Math.cos(an), by = y2 - L * Math.sin(an), nx = -Math.sin(an) * W, ny = Math.cos(an) * W
  return path(`M${x2} ${y2} L${(bx + nx).toFixed(1)} ${(by + ny).toFixed(1)} L${(bx - nx).toFixed(1)} ${(by - ny).toFixed(1)} Z`, stroke, stroke, 1)
}
export function arrow(x1, y1, x2, y2, stroke = INK, sw = SW, head = 16, dash = null) {
  const an = Math.atan2(y2 - y1, x2 - x1), L = Math.max(head, sw * 7) * 0.8
  return line(x1, y1, x2 - L * Math.cos(an), y2 - L * Math.sin(an), stroke, sw, dash) + arrowHead(x2, y2, an, stroke, sw, head)
}

// ---------------------------------------------------------------- icons and logos
// icon(): a line icon (lucide / tabler) top-left at (x, y), `size` px wide. Unknown -> nothing (a warning).
export function icon(name, x, y, size = 48, color = INK, sw = 2.0) {
  const r = resolveIcon(name, { ...ctxState.icons, ink: INK, warn: ctxState.warn })
  if (!r) { ctxState.warn(`icon "${name}" cannot be drawn (not in kit/icons or the icon sets)`); return '' }
  if (r.kind === 'mark') return logoMark(r, x, y, size)
  return `<g transform="translate(${num(x)} ${num(y)}) scale(${(size / (r.w || 24)).toFixed(4)})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" color="${color}">${r.inner}</g>`
}
// ids inside a mark (gradients, masks, filters) are made unique per mark so two marks in one document never clash
function uniqueIds(inner) {
  // Supplied marks can repeat ids internally. Keep the first target (SVG reference semantics), removing later duplicate attributes only; paint is unchanged.
  const seenIds = new Set()
  inner = inner.replace(/\bid="([^"]+)"/g, (m, id) => { if (seenIds.has(id)) return ''; seenIds.add(id); return m })
  const ids = [...inner.matchAll(/\bid="([^"]+)"/g)].map(m => m[1])
  if (!ids.length) return inner
  const n = ++ctxState.marks
  let out = inner
  for (const id of ids) {
    const e = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`id="${e}"`, 'g'), `id="${id}-m${n}"`).replace(new RegExp(`url\\(#${e}\\)`, 'g'), `url(#${id}-m${n})`).replace(new RegExp(`href="#${e}"`, 'g'), `href="#${id}-m${n}"`)
  }
  return out
}
function logoMark(r, x, y, size) {
  const [, , vw, vh] = r.viewBox.split(/[\s,]+/).map(Number)
  const sc = size / Math.max(vw, vh), w = vw * sc, h = vh * sc
  return `<svg x="${num(x + (size - w) / 2)}" y="${num(y + (size - h) / 2)}" width="${num(w)}" height="${num(h)}" viewBox="${r.viewBox}" preserveAspectRatio="xMidYMid meet" overflow="visible">${uniqueIds(r.inner)}</svg>`
}
// logo(): an official mark (svgl:openai, si:github, ...) drawn as supplied, never redrawn, from the TalkWeaver icon sets.
// Not found -> the name alone in plain text, plus a warning (N38).
export function logo(spec, x, y, size = 96, name = null) {
  const r = resolveIcon(spec, { ...ctxState.icons, ink: INK, warn: ctxState.warn })
  if (!r) {
    ctxState.warn(`logo "${spec}" not found in the icon sets (set look.json "iconSets" or env TALKWEAVER_ICONS to TalkWeaver's compiler/assets/icons); name only, no mark`)
    return text(x + size / 2, y + size / 2 + 10, name ?? String(spec).replace(/^[a-z-]+:/i, ''), 34, 700, INK, 'middle')
  }
  return r.kind === 'mark' ? logoMark(r, x, y, size) : icon(spec, x, y, size, INK, 2)
}

// ---------------------------------------------------------------- furniture
export function window_(x, y, w, h, title = '', bar = 56, rx = 18, dots = true, titleSize = 34) {
  let s = rect(x, y, w, h, rx)
  s += path(`M${x} ${y + bar} V${y + rx} Q${x} ${y} ${x + rx} ${y} H${x + w - rx} Q${x + w} ${y} ${x + w} ${y + rx} V${y + bar} Z`, '#f1f0ea')
  s += line(x, y + bar, x + w, y + bar, INK, 2.5)
  if (dots) for (let i = 0; i < 3; i++) s += circle(x + 30 + i * 28, y + bar / 2, 7, PAPER, INK, 2.5)
  if (title) s += text(x + w / 2, y + bar / 2 + titleSize * 0.35, title, titleSize, 500, MUTED, 'middle')
  return s
}
export const chip = (x, y, label, size = 26, o = {}) => {
  const { w: W, h: H, fill = PAPER, stroke = INK, ic = null, weight = 400, tcolor = INK } = o
  const h = H ?? Math.round(size * 1.9)
  const w = W ?? Math.round(String(label).length * size * 0.56 + 44 + (ic ? size + 14 : 0))
  let s = rect(x, y, w, h, h / 2, fill, stroke, 2.5)
  let tx = x + 24
  if (ic) { s += icon(ic, x + 18, y + (h - size) / 2, size, tcolor, 2); tx = x + 18 + size + 12 }
  return s + text(tx, y + h / 2 + size * 0.35, label, size, weight, tcolor)
}
export const dot = (cx, cy, c, r = 13) => circle(cx, cy, r, c, null)

// ---------------------------------------------------------------- frame furniture
// The key phrase: <= 9 words, top left, 58 px (the approved system); one per frame.
export function key(ls, x = 80, y = 124, size = 58) {
  ls = typeof ls === 'string' ? [ls] : ls
  return g('key-phrase', [rect(x, y - size - 4, 84, 8, 4, GREEN, null), ...ls.map((l, i) => text(x, y + i * Math.round(size * 1.15), l, size, 700))])
}
export const tagIllustrative = (x = 1500, y = 40) => g('tag-illustrative', chip(x, y, 'Illustrative example', 26, { fill: GT, stroke: GREEN }))
export const floor = (y = FLOOR, x1 = 0, x2 = 1920) => {
  const t = []
  for (let x = x1 + 60; x < x2; x += 210) t.push(line(x, y + 14, x + 40, y + 14, HAIR, 3))
  return g('floor', [line(x1, y, x2, y, INK, 3), ...t])
}
export function plant(x, y, s = 1.0) {
  let p = rect(x - 40 * s, y - 70 * s, 80 * s, 70 * s, 8 * s, SOFT)
  for (const [dx, dy, r] of [[-30, -150, 40], [0, -190, 46], [32, -148, 38], [-6, -126, 30]]) {
    p += path(`M${x} ${y - 70 * s} Q${x + dx * s * 1.3} ${y + (dy - 20) * s} ${x + dx * s} ${y + dy * s}`, 'none', INK, 3)
    p += ellipse(x + dx * s, y + dy * s, r * s * 0.55, r * s * 0.9, GT, GREEN, 3, `transform="rotate(${dx * 0.6} ${x + dx * s} ${y + dy * s})"`)
  }
  return g('plant', p)
}
export function wallWindow(x, y, w, h) {
  let s = rect(x, y, w, h, 6, '#f4f8f7', INK, 3) + line(x + w / 2, y, x + w / 2, y + h, INK, 3) + line(x, y + h / 2, x + w, y + h / 2, INK, 3)
  s += line(x + 20, y + h - 20, x + 90, y + h - 90, PAPER, 8) + line(x + 60, y + h - 20, x + 130, y + h - 90, PAPER, 8)
  return g('window', s)
}
export const wallClock = (cx, cy, r = 46) => g('clock', circle(cx, cy, r) + line(cx, cy, cx, cy - r * 0.6, INK, 4) + line(cx, cy, cx + r * 0.45, cy + 6, INK, 4))
export const picture = (x, y, w, h) => rect(x, y, w, h, 4, PAPER, INK, 3) + path(`M${x + 14} ${y + h - 16} L${x + w * 0.4} ${y + h * 0.42} L${x + w * 0.6} ${y + h * 0.68} L${x + w * 0.74} ${y + h * 0.5} L${x + w - 14} ${y + h - 16} Z`, SOFT, INK, 3)
export const deskFront = (x1, x2, ytop, floorY = FLOOR) =>
  rect(x1, ytop, x2 - x1, 26, 6) + rect(x1 + 24, ytop + 26, x2 - x1 - 48, floorY - ytop - 26, 4, SOFT) +
  rect(x1 + 24 + 30, ytop + 60, 160, 90, 6, PAPER, INK, 2.5) + line(x1 + 54 + 30, ytop + 105, x1 + 130 + 30, ytop + 105, INK, 3)
export const keyboardFront = (x, y, w = 210) => {
  let s = rect(x, y - 16, w, 16, 5, PAPER)
  for (let i = 0; i < Math.floor((w - 28) / 22); i++) s += line(x + 14 + i * 22, y - 8, x + 24 + i * 22, y - 8, HAIR, 3)
  return s
}
export function monitorFront(id, x, y, w, h, groundY, title = '') {
  const cx = x + w / 2
  return g(id, [rect(cx - 22, y + h, 44, groundY - (y + h) - 10, 4), rect(cx - 90, groundY - 14, 180, 14, 6), window_(x, y, w, h, title)])
}
export function headset(x, y, s = 1.0, hc = -402) {
  const cy = y + hc * s
  return path(`M${x - 56 * s} ${cy + 6 * s} Q${x - 62 * s} ${cy - 72 * s} ${x} ${cy - 70 * s} Q${x + 62 * s} ${cy - 72 * s} ${x + 56 * s} ${cy + 6 * s}`, 'none', INK, 6 * s) +
    rect(x - 66 * s, cy - 8 * s, 18 * s, 38 * s, 7 * s, INK) + rect(x + 48 * s, cy - 8 * s, 18 * s, 38 * s, 7 * s, INK) +
    path(`M${x - 52 * s} ${cy + 30 * s} Q${x - 50 * s} ${cy + 66 * s} ${x - 14 * s} ${cy + 62 * s}`, 'none', INK, 4 * s) + circle(x - 12 * s, cy + 62 * s, 7 * s, INK)
}
export const stress = (cx, cy, s = 1.0) => g('stress-marks', [[-60, 0], [10, -26], [62, 0]].map(([dx, dy]) => path(`M${cx + dx * s} ${cy + dy * s} q${6 * s} ${-10 * s} ${12 * s} 0 t${12 * s} 0`, 'none', RED, 3.5)))

// ---------------------------------------------------------------- bubbles
export function bubble(id, x, y, w, h, tail = null, fill = PAPER, dash = null, rx = 36) {
  let s = '', bx, by
  if (tail) {
    const [tx, ty] = tail
    bx = Math.min(Math.max(tx, x + 60), x + w - 60); by = ty > y + h / 2 ? y + h : y
    s += path(`M${bx - 26} ${by} L${tx} ${ty} L${bx + 26} ${by}`, fill)
  }
  s += rect(x, y, w, h, rx, fill, INK, SW, dash ? `stroke-dasharray="${dash}"` : '')
  if (tail) s += line(bx - 24, by, bx + 24, by, fill, SW + 2)
  return g(id, s)
}
export function thought(id, x, y, w, h, tail, fill = PAPER) {
  const [tx, ty] = tail
  let s = rect(x, y, w, h, 60, fill, INK, SW, 'stroke-dasharray="14 9"')
  const sx = x + 90, sy = y + h
  ;[20, 14, 9].forEach((r, i) => { const t = (i + 1) / 4; s += circle(Math.round(sx + (tx - sx) * t), Math.round(sy + (ty - sy) * t + 6), r, fill) })
  return g(id, s)
}
export const bubbleDots = (x, y) => circle(x, y, 7, INK, null) + circle(x + 24, y, 7, INK, null) + circle(x + 48, y, 7, INK, null)

// ---------------------------------------------------------------- the agent
export function agentMark(cx, cy, r = 22, bg = GREEN, fg = PAPER) {
  let s = circle(cx, cy, r, bg, null)
  for (const an of [0, 60, 120]) {
    const d = an * Math.PI / 180
    s += line((cx - r * 0.6 * Math.cos(d)).toFixed(1), (cy - r * 0.6 * Math.sin(d)).toFixed(1), (cx + r * 0.6 * Math.cos(d)).toFixed(1), (cy + r * 0.6 * Math.sin(d)).toFixed(1), fg, Math.max(2.5, r / 6))
  }
  return s
}
// The model's context: a shallow green tray; only what tools return lands on it.
export function tray(id, x, y, w, h, label = "Model's context") {
  const lip = 44
  let s = path(`M${x + 34} ${y} H${x + w - 34} L${x + w} ${y + h - lip} H${x} Z`, GT, GREEN)
  s += rect(x, y + h - lip, w, lip, 8, TINT2, GREEN)
  s += text(x + 22, y + h - lip / 2 + 9, label, 26, 700, GREEN)
  return g(id, s)
}
// The agent: always a chat window with a green "Agent" tab (no face, no robot). chatbot=true: plain "Chatbot" tab (rungs 1-2).
// The tab sits inside the title bar (D3): it can never cover a label above the window. The title, when given, is at the bar's right end.
export function agentWindow(id, x, y, w, h, o = {}) {
  const { title = '', trayH = 0, trayLabel = "Model's context", chatbot = false } = o
  const bar = G.AGENT_BAR
  let s = window_(x, y, w, h, '', bar)
  if (chatbot) s += rect(x + 112, y + 10, 196, bar - 20, 16, PAPER, INK) + text(x + 112 + 98, y + bar / 2 + 12, 'Chatbot', 34, 700, INK, 'middle')
  else s += rect(x + 112, y + 10, 196, bar - 20, 16, GREEN, GREEN) + agentMark(x + 112 + 32, y + bar / 2, 16, PAPER, GREEN) + text(x + 112 + 62, y + bar / 2 + 12, 'Agent', 34, 700, PAPER)
  const A = G.agentLayout({ x, y, w, title, chatbot })
  if (A.title) s += text(A.title.ax, A.title.base, title, 34, 500, MUTED, A.title.anchor)
  const parts = [g(id + '-frame', s)]
  if (trayH) parts.push(tray(id + '-tray', x + 26, y + h - trayH - 24, w - 52, trayH, trayLabel))
  return g(id, parts)
}
// A tool call: dashed green arrow leaving the agent, with a chip naming the tool.
export function toolArrow(id, x1, y1, x2, y2, o = {}) {
  const { label = null, ic = null, lx = null, ly = null, size = 26 } = o
  let s = arrow(x1, y1, x2, y2, GREEN, 4, 18, '14 10')
  if (label) s += chip(lx ?? (x1 + x2) / 2, ly ?? (y1 + y2) / 2, label, size, { ic, fill: GT, stroke: GREEN })
  return g(id, s)
}
// A message box. Padding 28, text 34 px or larger (the old 28 px and 24 px padding failed D1 and D2); one short label is centred both ways,
// anything longer is left-aligned rows (a chat message).
export function chatMsg(x, y, w, h, rows, size = 34, fill = PAPER, stroke = INK) {
  const L = G.messageLayout({ x, y, w, h, rows, size })
  return rect(x, y, w, h, 24, fill, stroke, 2.5) + L.textBoxes.map(t => text(t.ax, t.base, t.text, t.size, L.centred ? 500 : 400, INK, t.anchor)).join('')
}

// ---------------------------------------------------------------- documents
// Document card; `hit` = row index highlighted green (the passage that matters).
export function page(id, x, y, w, h, o = {}) {
  const { title = null, rows = 5, hit = null, rot = 0, fill = PAPER, stroke = INK, tsize = 26, sw = 3.2, dashed = false, empty = false } = o
  const cx = x + w / 2, cy = y + h / 2, f = 18
  const t = rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''
  let s = `<g${t}>` + path(`M${x} ${y} H${x + w - f} L${x + w} ${y + f} V${y + h} H${x} Z`, fill, stroke, sw, dashed ? 'stroke-dasharray="12 8"' : '')
  s += path(`M${x + w - f} ${y} V${y + f} H${x + w}`, 'none', stroke, sw)
  let ty = y + 28
  if (title) { s += text(x + 20, y + 20 + tsize, title, tsize, 700); ty = y + 46 + tsize }
  for (let i = 0; i < rows; i++) {
    const ww = (w - 40) * (i % 3 === 0 ? 0.92 : i % 3 === 1 ? 0.7 : 0.82), yy = ty + i * 26
    if (yy > y + h - 16) break
    if (hit === i) s += rect(x + 14, yy - 11, w - 28, 24, 6, TINT2, GREEN, 2.5)
    s += line(x + 22, yy, x + 22 + ww, yy, hit === i ? GREEN : HAIR, 6)
  }
  if (empty) s += path(`M${x + w * 0.3} ${y + h - 70} L${x + w * 0.7} ${y + h - 30} M${x + w * 0.7} ${y + h - 70} L${x + w * 0.3} ${y + h - 30}`, 'none', RED, 5)
  return g(id, s + '</g>')
}
export const filename = (id, x, y, label, o = {}) => g(id, chip(x, y, label, o.size ?? 26, { w: o.w, fill: o.fill ?? PAPER, stroke: o.stroke ?? INK, ic: o.ic ?? 'file-text' }))
export const stack = (id, x, y, w, h, n = 3, o = {}) => g(id, [...Array(n).keys()].reverse().map(i => page(`${id}-${i}`, x + i * 16, y - i * 14, w, h, { ...o, rows: 3 })))
export const envelope = (x, y, w = 120, h = 84, fill = PAPER, stroke = INK) => rect(x, y, w, h, 8, fill, stroke) + path(`M${x} ${y + 4} L${x + w / 2} ${y + h * 0.58} L${x + w} ${y + 4}`, 'none', stroke)
export function receipt(x, y, w = 100, h = 150, rot = 0) {
  const cx = x + w / 2, cy = y + h / 2, n = 6
  let zig = ''
  for (let k = 0; k < n; k++) zig += ` L${(x + w - (k + 0.5) * w / n).toFixed(1)} ${y + h - 12} L${(x + w - (k + 1) * w / n).toFixed(1)} ${y + h}`
  let s = `<g transform="rotate(${rot} ${cx} ${cy})">` + path(`M${x} ${y} H${x + w} V${y + h}` + zig + ' Z', PAPER)
  for (let i = 0; i < 4; i++) s += line(x + 16, y + 28 + i * 22, x + w - 16 - (i % 2) * 20, y + 28 + i * 22, HAIR, 5)
  return s + '</g>'
}
export function folder(x, y, w, h, label = null, fill = SOFT, size = 26, stroke = INK) {
  let s = path(`M${x} ${y + 16} Q${x} ${y} ${x + 16} ${y} H${x + w * 0.36} L${x + w * 0.36 + 22} ${y + 22} H${x + w - 16} Q${x + w} ${y + 22} ${x + w} ${y + 38} V${y + h - 14} Q${x + w} ${y + h} ${x + w - 16} ${y + h} H${x + 16} Q${x} ${y + h} ${x} ${y + h - 14} Z`, fill, stroke)
  if (label) s += text(x + w / 2, y + h / 2 + 18, label, size, 600, INK, 'middle')
  return s
}
// Instruction sheet: the thing the agent follows.
export function sheetCard(id, x, y, w, h, title, sub, size = 26) {
  let s = rect(x, y, w, h, 18, PAPER, GREEN, 3.5) + rect(x, y, w, 62, 18, GT, GREEN, 3.5) + rect(x + 3, y + 40, w - 6, 24, 0, GT, null) + line(x, y + 62, x + w, y + 62, GREEN, 3)
  s += icon('clipboard-list', x + 16, y + 12, 38, GREEN, 2) + text(x + 66, y + 43, title, 30, 700)
  s += lines(x + 24, y + 108, [].concat(sub), size, Math.round(size * 1.3))
  return g(id, s)
}
// Extracted text as it sits on the tray: filename header, grey bars, and the passage that matters in words. hitRows: [[row, [lines]]].
export function slip(id, x, y, w, h, name, o = {}) {
  const { rows = 4, hitRows = [], dim = false, fill = PAPER, stroke = INK, ic = 'file-text' } = o
  let s = rect(x, y, w, h, 12, fill, stroke, 3)
  s += icon(ic, x + 14, y + 12, 32, stroke !== INK ? stroke : INK, 2) + text(x + 56, y + 38, name, 26, 700)
  s += line(x + 12, y + 56, x + w - 12, y + 56, HAIR, 2.5)
  let yy = y + 90
  const hr = new Map(hitRows)
  for (let i = 0; i < rows; i++) {
    if (hr.has(i)) {
      const ls = hr.get(i), hh = 36 * ls.length + 14
      s += rect(x + 12, yy - 28, w - 24, hh, 8, TINT2, GREEN, 2.5)
      ls.forEach((t, k) => { s += text(x + 24, yy + 4 + k * 36, t, 28, 700) })
      yy += hh + 4
    } else { s += line(x + 24, yy, x + 24 + (w - 60) * (i % 2 === 0 ? 0.9 : 0.7), yy, HAIR, 7); yy += 30 }
  }
  return g(id, s, dim ? 'opacity="0.45"' : '')
}

// ---------------------------------------------------------------- records room: cabinets and drawers
export const COLS = ['Handovers', 'Reports', 'Notes', 'Presentations', 'Drafts']
// Cabinets side by side. opened = [[col,row]], hl = [[col,row]] drawers tinted green, tabs = {"col,row": [[label, hit]...]} folder tabs in an open drawer.
export function bank(id, x, y, o = {}) {
  const { cw = 190, dh = 150, rows = 4, opened = [], hl = [], tabs = {}, cols = COLS, labels = true, dim = false } = o
  const has = (list, c, r) => list.some(k => k[0] === c && k[1] === r)
  const H = rows * dh + 22
  const column = (c) => {
    const cx0 = x + c * cw
    let s = rect(cx0 + 4, y, cw - 8, H, 10, SOFT) + rect(cx0 + 4, y, cw - 8, 14, 6, PAPER, INK, 2.5)
    for (let r = 0; r < rows; r++) {
      let dy = y + 20 + r * dh
      const isopen = has(opened, c, r), ish = has(hl, c, r)
      if (isopen) {
        s += rect(cx0 + 12, dy + 2, cw - 24, 30, 6, DARK, INK)
        const tl = tabs[`${c},${r}`] ?? [['', false], ['', false], ['', false]]
        const tw = (cw - 44) / tl.length
        tl.forEach(([lab, hit], i) => {
          const tx = cx0 + 20 + i * tw, th = 44 + (i % 2) * 10
          s += path(`M${tx} ${dy + 30} V${dy + 30 - th + 8} Q${tx} ${dy + 30 - th} ${tx + 8} ${dy + 30 - th} H${tx + tw - 12} Q${tx + tw - 4} ${dy + 30 - th} ${tx + tw - 4} ${dy + 30 - th + 8} V${dy + 30} Z`, hit ? TINT2 : PAPER, hit ? GREEN : INK, 2.8)
          if (lab) s += text(tx + tw / 2 - 2, dy + 30 - th + 29, lab, 26, 600, INK, 'middle')
        })
        dy += 30
      }
      const fh = dh - 30
      s += rect(cx0 + 12, dy + 6, cw - 24, fh - 8, 10, ish ? GT : PAPER, ish ? GREEN : INK, ish ? 4 : 3)
      s += rect(cx0 + cw / 2 - 30, dy + 6 + fh * 0.5, 60, 12, 6, SOFT, INK, 2.5)
      s += rect(cx0 + cw / 2 - 40, dy + 22, 80, 22, 4, PAPER, INK, 2) + line(cx0 + cw / 2 - 28, dy + 33, cx0 + cw / 2 + 28, dy + 33, HAIR, 4)
    }
    return s
  }
  const out = cols.map((_, c) => g(`${id}-col${c}`, column(c)))
  const lab = labels ? cols.map((name, c) => text(x + c * cw + cw / 2, y - 16, name, 26, 700, INK, 'middle')).join('') : ''
  return g(id, [...out, g(`${id}-labels`, lab)], dim ? 'opacity="0.9"' : '')
}
export const colX = (x, c, cw = 190) => x + c * cw + cw / 2

// ---------------------------------------------------------------- ladder (climbed upwards: rung 1 at the bottom)
export function ladder(id, x, ytop, ybot, w, rungs, rail = 16) {
  let s = rect(x, ytop, rail, ybot - ytop, 6, SOFT) + rect(x + w - rail, ytop, rail, ybot - ytop, 6, SOFT)
  for (const ry of rungs) s += rect(x + rail - 2, ry - 8, w - 2 * rail + 4, 16, 5, PAPER)
  return g(id, s)
}
export const numBadge = (cx, cy, n, r = 24, fill = GREEN, fg = PAPER) => circle(cx, cy, r, fill, null) + text(cx, cy + 10, String(n), 30, 700, fg, 'middle')
// Ladder with labelled rungs. labels bottom to top; `at` = how many rungs are reached (the one at `at` is lit green, those below ink, above grey).
export function laddered(id, x, ytop, ybot, w, labels, at = 1) {
  const n = labels.length, step = (ybot - 40 - (ytop + 60)) / Math.max(1, n - 1)
  const rungs = labels.map((_, i) => ybot - 20 - i * step)
  let s = ladder(id + '-rails', x, ytop, ybot, w, rungs)
  labels.forEach((lab, i) => {
    const state = i < at - 1 ? 'ink' : i === at - 1 ? 'green' : 'hair'
    const col = state === 'hair' ? MUTED : INK, badge = state === 'green' ? GREEN : state === 'ink' ? INK : MUTED
    s += numBadge(x - 52, rungs[i] - 4, i + 1, 24, badge) + text(x - 90, rungs[i] + 8, lab, 28, state === 'green' ? 700 : 500, col, 'end')
  })
  return g(id, s)
}

// ---------------------------------------------------------------- small things
export const lens = (cx, cy, r = 34) => circle(cx, cy, r, '#f4fbf8', GREEN, 5) + line(cx + r * 0.7, cy + r * 0.7, cx + r * 1.8, cy + r * 1.8, GREEN, 8)
export function pen(x, y, ang = -35, L = 70) {
  const an = ang * Math.PI / 180
  return line(x, y, Math.round(x + L * Math.cos(an)), Math.round(y + L * Math.sin(an)), INK, 10) + line(x, y, Math.round(x - 14 * Math.cos(an)), Math.round(y - 14 * Math.sin(an)), GREEN, 10)
}
export const tableTop = (x1, x2, y, fl = FLOOR) => rect(x1, y, x2 - x1, 24, 6) + rect(x1 + 30, y + 24, 26, fl - y - 24, 4, SOFT) + rect(x2 - 56, y + 24, 26, fl - y - 24, 4, SOFT)
export function book(id, cx, cy, w = 86, h = 58) {
  const x = cx - w / 2, y = cy - h / 2
  let s = path(`M${x} ${y + 8} L${cx} ${y} L${cx} ${y + h} L${x} ${y + h - 8} Z`, PAPER) + path(`M${x + w} ${y + 8} L${cx} ${y} L${cx} ${y + h} L${x + w} ${y + h - 8} Z`, PAPER)
  for (let i = 0; i < 3; i++) s += line(x + 10, y + 22 + i * 10, cx - 8, y + 20 + i * 10, HAIR, 3) + line(cx + 8, y + 20 + i * 10, x + w - 10, y + 22 + i * 10, HAIR, 3)
  return g(id, s)
}

// ---------------------------------------------------------------- props added for the kit (not in the storyboard-v3 generator)
// A search box with a typed query: rounded field, lens, query text, and an optional button.
export function searchBox(id, x, y, w = 760, h = 96, query = '', o = {}) {
  const { size = 38, button = 'Search', hint = 'Search' } = o
  let s = rect(x, y, w, h, h / 2, PAPER, INK, 4)
  s += lens(x + 56, y + h / 2 - 6, 22).replace(/stroke-width="5"/, 'stroke-width="5"')
  s += text(x + 104, y + h / 2 + size * 0.35, query || hint, size, 400, query ? INK : MUTED)
  if (query) s += rect(x + 104 + Math.round(query.length * size * 0.455) + 12, y + h / 2 - size * 0.55, 3, size * 1.1, 1, INK, null)   // caret
  if (button) { const bw = Math.round(button.length * 26 * 0.6 + 56); s += rect(x + w - bw - 14, y + 14, bw, h - 28, (h - 28) / 2, GREEN, GREEN) + text(x + w - bw / 2 - 14, y + h / 2 + 9, button, 26, 700, PAPER, 'middle') }
  return g(id, s)
}
// Inbox: a window of message rows (sender line + subject bar), the newest at the top; unread rows carry a green dot.
export function inbox(id, x, y, w = 760, h = 520, o = {}) {
  const { title = 'Inbox', rows = [['Name', 'Subject line'], ['Name', 'Subject line'], ['Name', 'Subject line']], unread = [0], highlight = null } = o
  let s = window_(x, y, w, h, title)
  rows.forEach(([who, subj], i) => {
    const ry = y + 56 + 22 + i * 108
    if (ry + 96 > y + h) return
    s += rect(x + 22, ry, w - 44, 92, 14, highlight === i ? GT : PAPER, highlight === i ? GREEN : INK, highlight === i ? 3.5 : 2.5)
    s += unread.includes(i) ? circle(x + 52, ry + 46, 10, GREEN, null) : ''
    s += envelope(x + 84, ry + 20, 60, 44, PAPER, INK)
    s += text(x + 166, ry + 38, who, 28, 700) + text(x + 166, ry + 74, subj, 26, 400, MUTED)
  })
  return g(id, s)
}
// Chart frame: axes, a title, optional y labels, a polyline / bars from data (the talk's own numbers), or an embedded image (the talk's chart PNG).
// data = [[x, y], ...] in 0..1 units of the plot box; or image = path/data URI of a chart still. Axis labels are 26 px or larger.
export function chartFrame(id, x, y, w, h, o = {}) {
  const { title = '', xLabel = '', yLabel = '', data = [], kind = 'line', image = null, accent = true } = o
  let s = rect(x, y, w, h, 16, PAPER, INK, 3)
  if (image) {
    s += `<image href="${esc(image)}" x="${x + 8}" y="${y + 8}" width="${w - 16}" height="${h - 16}" preserveAspectRatio="xMidYMid meet"/>`
    return g(id, s)
  }
  const px = x + 110, py = y + 80, pw = w - 160, ph = h - 190
  if (title) s += text(x + 28, y + 52, title, 30, 700)
  s += line(px, py, px, py + ph, INK, 3) + line(px, py + ph, px + pw, py + ph, INK, 3)
  for (let i = 1; i <= 3; i++) s += line(px, py + ph - ph * i / 4, px + pw, py + ph - ph * i / 4, HAIR, 2)
  if (kind === 'bars') {
    const bw = pw / (data.length * 1.6)
    data.forEach(([, v], i) => { const bh = ph * v; s += rect(px + 20 + i * bw * 1.6, py + ph - bh, bw, bh, 6, i === data.length - 1 && accent ? GREEN : GT, GREEN, 3) })
  } else if (data.length) {
    const pts = data.map(([dx, dy]) => [px + pw * dx, py + ph - ph * dy])
    s += path('M' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L'), 'none', GREEN, 6)
    const last = pts[pts.length - 1]; s += circle(last[0], last[1], 11, GREEN, null)
  }
  if (xLabel) s += text(px + pw / 2, py + ph + 56, xLabel, 28, 400, MUTED, 'middle')
  if (yLabel) s += text(x + 34, py + ph / 2, yLabel, 28, 400, MUTED, 'middle', `transform="rotate(-90 ${x + 34} ${py + ph / 2})"`)
  return g(id, s)
}
// Logo card: one official mark (from the TalkWeaver sets) in a rounded card with the product name under it. cx = centre x, y = card top.
export function logoCard(id, cx, y, item, o = {}) {
  const { size = 150, labels = true } = o
  const name = item.name ?? String(item.logo).replace(/^[a-z-]+:/i, '')
  const w = size * 1.9, h = size * 1.5 + (labels ? 64 : 0)
  let s = rect(cx - w / 2, y, w, h, 28, PAPER, INK, 3)
  s += logo(item.logo, cx - size / 2, y + size * 0.25, size, name)
  if (labels) s += text(cx, y + size * 1.5 + 36, name, 32, 500, INK, 'middle')
  return g(id, s)
}
// Logo row: several cards side by side. items: [{logo:"svgl:openai", name:"OpenAI"}]
export function logoRow(id, x, y, items, o = {}) {
  const { gap = 380 } = o
  return g(id, items.map((it, i) => logoCard(`${id}-${i}`, x + i * gap, y, it, o)))
}

// ---------------------------------------------------------------- relationships (N87, N88): transform, relate, tagged
// One relationship is one spec; `parts` (optional) names the pieces this element draws, so the same spec can be repeated in several
// elements that arrive on separate cues and still line up (the layout is always computed from the whole spec). A part name matches
// itself and its prefixes: "tag" = every tag, "tag:0" = every tag of card 0, "tag:0.1" = tag 1 of card 0. relationParts(e) lists them.
// Colours: e.accent (default the look's green), e.tint (card fill), e.hair (card outline).
// A mark is "svgl:x" / "si:x" (official logo), a picture path ("assets/logos/x.jpg", or "src:path"), a lucide icon name, or a list
// of these (drawn side by side). `plate` on an item puts a coloured square behind a white mark.
// text width estimate for Inter: emOf / twEst live in _geom.mjs
// fitTo(): the largest size up to `size` at which the text fits maxW; never below `min` (26 px, the readable floor). When even `min`
// does not fit, it warns with the frame and element id so the text is shortened or given room (labels are not wrapped).
function fitTo(s, size, maxW, min = 34) {   // min: the D1 floor; text that cannot fit at 34 px must be shortened (the lint reports it)
  const em = Math.max(0.5, emOf(s)), fit = Math.floor(maxW / em)
  if (s && fit < min) ctxState.warn(`${ctxState.el ?? 'element'}: "${String(s).slice(0, 48)}" needs ${Math.round(em * min)} px at ${min} px but has ${Math.round(maxW)} px; shorten it or give it room`)
  return Math.max(min, Math.min(size, fit))
}
const relStyle = e => ({ accent: e.accent ?? GREEN, tint: e.tint ?? GT, hair: e.hair ?? HAIR })
// matchParts(e, names): the parts of e that a `parts` list selects (prefixes included)
export const matchParts = (e, names) => relationParts(e).filter(wantPart({ parts: names }))
export const wantPart = e => name => {
  if (!e.parts) return true
  const want = [].concat(e.parts)
  const [k, rest = ''] = name.split(':'), [i] = rest.split('.')
  return want.includes(name) || want.includes(k) || (rest.includes('.') && want.includes(`${k}:${i}`))
}
export function spark(cx, cy, r, fill = GREEN) {
  const a = r * 0.12, b = r * 0.24
  return path(`M${num(cx)} ${num(cy - r)} C${num(cx + a)} ${num(cy - b)} ${num(cx + b)} ${num(cy - a)} ${num(cx + r)} ${num(cy)} C${num(cx + b)} ${num(cy + a)} ${num(cx + a)} ${num(cy + b)} ${num(cx)} ${num(cy + r)} C${num(cx - a)} ${num(cy + b)} ${num(cx - b)} ${num(cy + a)} ${num(cx - r)} ${num(cy)} C${num(cx - b)} ${num(cy - a)} ${num(cx - a)} ${num(cy - b)} ${num(cx)} ${num(cy - r)}Z`, fill, null)
}
export function star(cx, cy, r, fill, stroke = null) {
  const p = []
  for (let k = 0; k < 10; k++) { const an = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; p.push(`${num(cx + rr * Math.cos(an))} ${num(cy + rr * Math.sin(an))}`) }
  return path(`M${p.join(' L')}Z`, fill, stroke, 2.5)
}
// markW(): the drawn width of a mark at `size` (a list or a wide picture is wider than `size`; o.maxW caps it). mark() centres that width on the size box.
export function markW(spec, size, o = {}) {
  if (Array.isArray(spec)) { const n = spec.length, s = n > 1 ? size * 0.8 : size, W = n * s + (n - 1) * s * 0.2; return o.maxW ? Math.min(W, o.maxW) : W }
  const W = o.aspect ? size * o.aspect : size
  return o.maxW ? Math.min(W, o.maxW) : W
}
export function mark(spec, x, y, size, color = INK, o = {}) {
  if (Array.isArray(spec)) {
    const n = spec.length, W = markW(spec, size, o), s = W / (n + (n - 1) * 0.2), gap = s * 0.2, x0 = x + size / 2 - W / 2
    return spec.map((m, i) => mark(m, x0 + i * (s + gap), y + (size - s) / 2, s, color, { ...o, maxW: null })).join('')
  }
  if (!spec) return ''
  let s = o.plate ? rect(x - size * 0.06, y - size * 0.06, size * 1.12, size * 1.12, size * 0.2, o.plate, null) : ''
  const str = String(spec)
  if (/^src:/.test(str) || /\.(png|jpe?g|svg|webp)$/i.test(str)) {
    // a wide picture (a wordmark): `aspect` = width / height; drawn that wide, centred on the size box, never wider than maxW
    const W = markW(str, size, o), H = o.aspect ? W / o.aspect : size
    return s + `<image href="${esc(str.replace(/^src:/, '')).replace(/"/g, '&quot;')}" x="${num(x + size / 2 - W / 2)}" y="${num(y + (size - H) / 2)}" width="${num(W)}" height="${num(H)}" preserveAspectRatio="xMidYMid meet"/>`
  }
  if (/^[a-z-]+:/i.test(str) && !/^(lucide|tabler):/i.test(str)) return s + logo(str, x, y, size)
  return s + icon(str, x, y, size, color, 2)
}
const cross = (cx, cy, r) => line(cx - r, cy - r, cx + r, cy + r, RED, 9) + line(cx + r, cy - r, cx - r, cy + r, RED, 9)

// thing(): an object as it looks, centred in the box, label underneath. Used for a transformation's input and output and a relate result.
//   look: reviews (rows with stars; n) | stack (pages; n) | page (title, rows) | message (a prompt bubble; text) | summary (title, bars)
//         | list (rows: [text]) | app (title; spark: true adds an AI spark) | receipts (n) | card (mark + label inside; default) | mark (the mark alone)
// `caption`: a muted line under the label (any look). Returns { svg, cap, w } (cap = the caption alone, w = drawn width, for arrows).
export function thing(id, o, x, y, w, h, st) {
  const { accent, tint, hair } = st
  const look = o.look ?? 'card', cx = x + w / 2
  const lab = o.label && look !== 'card' ? fitTo(o.label, o.labelSize ?? 34, w) : 0
  const cap = o.caption && look !== 'card' ? fitTo(o.caption, 34, w) : 0
  const room = h - (lab ? lab + 24 : 0) - (cap ? cap + 12 : 0)
  // size first, then centre the object and its label together in the box
  let dw = w, dh = room
  const n = o.n ?? (look === 'reviews' ? 4 : 3)
  if (look === 'reviews') { dw = Math.min(w, 520); dh = Math.min(n * 86 + (n - 1) * 16, room) }
  else if (look === 'stack' || look === 'receipts') { const ph = Math.min(room - (n - 1) * 14, 300); dh = ph + (n - 1) * 14; dw = Math.min(w * 0.6, ph * 0.78) + (n - 1) * (look === 'stack' ? 16 : 26) }
  else if (look === 'page') { dh = Math.min(room, 360); dw = Math.min(w * 0.7, dh * 0.78) }
  else if (look === 'message') { dw = Math.min(w, 460); dh = Math.min(room - 26, 150) + 26 }
  else if (look === 'summary' || look === 'list' || look === 'app') { dw = Math.min(w, 520); dh = Math.min(room, look === 'list' ? 60 + (o.rows ?? ['', '', '']).length * 64 : 300) }
  else if (look === 'mark') { dw = dh = Math.min(room, w, o.size ?? 220) }
  const x0 = cx - dw / 2, y0 = y + (h - (dh + (lab ? lab + 24 : 0) + (cap ? cap + 12 : 0))) / 2
  let s = ''
  if (look === 'reviews') {
    const gp = 16, rh = (dh - gp * (n - 1)) / n, sr = Math.min(15, rh * 0.2), barMax = dw - 56 - 5 * sr * 2.4
    for (let i = 0; i < n; i++) {
      const yy = y0 + i * (rh + gp), filled = [4, 2, 5, 3][i % 4]
      s += rect(x0, yy, dw, rh, 14, PAPER, hair, 3) + rect(x0 + 26, yy + rh / 2 - 8, barMax * [0.9, 1, 0.66, 0.82][i % 4], 16, 8, hair, null)
      for (let k = 0; k < 5; k++) s += star(x0 + dw - 26 - sr - (4 - k) * sr * 2.4, yy + rh / 2, sr, k < filled ? accent : PAPER, k < filled ? null : hair)
    }
  } else if (look === 'stack' || look === 'receipts') {
    const ph = dh - (n - 1) * 14, pw = Math.min(w * 0.6, ph * 0.78), step = look === 'stack' ? 16 : 26
    for (let i = n - 1; i >= 0; i--) s += look === 'stack' ? page(`${id}-p${i}`, x0 + i * step, y0 + (n - 1 - i) * 14, pw, ph, { rows: 6, title: i === 0 ? o.title ?? null : null, tsize: 34 }) : receipt(x0 + i * step, y0 + (n - 1 - i) * 14, pw * 0.7, ph, (i - 1) * 6)
  } else if (look === 'page') {
    s += page(`${id}-pg`, x0, y0, dw, dh, { rows: o.rows ?? 8, title: o.title ?? null, tsize: 34 })
  } else if (look === 'message') {
    const mh = dh - 26
    s += rect(x0, y0, dw, mh, 30, PAPER, INK, 3) + path(`M${num(x0 + dw - 70)} ${num(y0 + mh - 1)} L${num(x0 + dw - 40)} ${num(y0 + mh + 26)} L${num(x0 + dw - 46)} ${num(y0 + mh - 1)}`, PAPER, INK, 3) + line(x0 + dw - 68, y0 + mh - 1, x0 + dw - 48, y0 + mh - 1, PAPER, 5)
    if (o.text) s += text(x0 + 30, y0 + mh / 2 + 11, o.text, fitTo(o.text, 36, dw - 60), 400, INK)
    else for (let i = 0; i < 2; i++) s += line(x0 + 32, y0 + mh / 2 - 16 + i * 32, x0 + 32 + (dw - 80) * (i ? 0.6 : 0.9), y0 + mh / 2 - 16 + i * 32, hair, 12)
  } else if (look === 'summary' || look === 'list' || look === 'app') {
    if (look === 'app') s += window_(x0, y0, dw, dh, o.title && o.title !== o.label ? o.title : '', 56)   // a title that repeats the label is dropped
    else s += rect(x0, y0, dw, dh, 24, look === 'summary' ? tint : PAPER, accent, 4)
    const top = look === 'app' ? y0 + 56 : y0
    if (look === 'summary' && o.title) s += text(x0 + 36, y0 + 62, o.title, fitTo(o.title, 34, dw - 72), 500, accent)
    if (look === 'list') {
      const rows = o.rows ?? ['', '', ''], rh = (dh - 40) / rows.length
      rows.forEach((r, i) => { const yy = top + 20 + i * rh + rh / 2; s += numBadge(x0 + 50, yy, i + 1, 20, accent, PAPER).replace(/font-size="30"/, 'font-size="26"'); s += r ? text(x0 + 90, yy + 10, r, fitTo(r, 34, dw - 120), 400, INK) : line(x0 + 90, yy, x0 + 90 + (dw - 140) * [0.9, 0.7, 0.8][i % 3], yy, hair, 12) })
    } else {
      const yb = top + (look === 'summary' && o.title ? 100 : 46), k = Math.min(5, Math.max(2, Math.floor((y0 + dh - 30 - yb) / 40) + 1))
      for (let i = 0; i < k; i++) s += rect(x0 + 36, yb + i * 40, (dw - 72) * [0.95, 0.85, 1, 0.7, 0.9][i], 18, 9, look === 'summary' ? accent : hair, null, 0, look === 'summary' ? 'fill-opacity="0.45"' : '')
    }
    if (o.spark) s += circle(x0 + dw - 18, y0 + 18, 40, accent, null) + spark(x0 + dw - 18, y0 + 18, 24, PAPER)
  } else if (look === 'mark') {
    s += mark(o.mark, x0, y0, dw, accent, o)
  } else {
    const cw = Math.min(w, o.w ?? 520), ch = Math.min(h, o.h ?? 300), cx0 = cx - cw / 2, cy0 = y + (h - ch) / 2, m = Math.min(ch * 0.42, 150)
    const ls = o.label ? fitTo(o.label, o.labelSize ?? 42, cw - 40) : 0, cs = o.caption ? fitTo(o.caption, 34, cw - 40) : 0
    const inner = m + (ls ? 22 + ls : 0) + (cs ? 14 + cs : 0), iy = cy0 + (ch - inner) / 2
    s += rect(cx0, cy0, cw, ch, 24, PAPER, accent, 4)
    if (o.mark) s += mark(o.mark, cx - m / 2, iy, m, accent, o)
    else s += spark(cx, iy + m / 2, m * 0.32, accent)
    if (ls) s += text(cx, iy + m + 22 + ls * 0.8, o.label, ls, 400, INK, 'middle')
    if (o.spark) s += circle(cx0 + cw - 18, cy0 + 18, 40, accent, null) + spark(cx0 + cw - 18, cy0 + 18, 24, PAPER)
    return { svg: s, cap: cs ? text(cx, iy + m + 22 + ls + 14 + cs * 0.8, o.caption, cs, 400, MUTED, 'middle') : '', w: cw }
  }
  if (lab) s += text(cx, y0 + dh + 24 + lab * 0.8, o.label, lab, 400, MUTED, 'middle')
  const capSvg = cap ? text(cx, y0 + dh + (lab ? lab + 24 : 0) + 12 + cap * 0.8 + (lab ? 0 : 12), o.caption, cap, 400, MUTED, 'middle') : ''
  return { svg: s, cap: capSvg, w: dw }
}

// transform: the change drawn as a change (N88, first choice). Input as it looks -> arrow -> a small accent node carrying the verb
// (the actor's mark or an AI spark) -> arrow -> output as it looks. Optional actor (mark + name + caption) top-left of the box.
//   { type: "transform", x, y, w, h, actor: { mark, name, caption }, input: { look, label, ... }, verb: { text, mark, note }, output: { look, label, ... },
//     parts: ["actor", "caption", "input", "node", "verb", "note", "output"] }   node = the circle and its mark (it may land before the verb when
//     the actor is named first); verb = the arrow in and the verb label; note = a muted line under the verb; output = arrow out and the output
export function transform(id, e) {
  const st = relStyle(e), want = wantPart(e), X = e.x ?? 160, Y = e.y ?? 170, W = e.w ?? 1600, H = e.h ?? 720
  let s = ''
  const actorH = e.actor ? Math.min(110, H * 0.2) : 0
  if (e.actor) {
    const m = actorH * 0.86, aw = markW(e.actor.mark, m, e.actor), budget = W * 0.6 - aw - 26
    const ns = e.actor.name ? fitTo(e.actor.name, Math.min(46, actorH * 0.42), budget) : 0, acs = e.actor.caption ? fitTo(e.actor.caption, 34, budget) : 0
    if (want('actor')) s += mark(e.actor.mark, X + aw / 2 - m / 2, Y + (actorH - m) / 2, m, st.accent, e.actor) + (e.actor.name ? text(X + aw + 26, Y + actorH / 2 + (e.actor.caption ? -4 : ns * 0.36), e.actor.name, ns, 400, INK) : '')
    if (e.actor.caption && want('caption')) s += text(X + aw + 26, Y + actorH / 2 + 36, e.actor.caption, acs, 400, MUTED)
  }
  const my = Y + actorH + (actorH ? 24 : 0), mh = H - (my - Y)
  const v = e.verb ?? {}, vs = v.text ? fitTo(v.text, 36, W * 0.26) : 0
  const r = Math.min(92, mh * 0.2), ncx = X + W / 2, ncy = my + (mh - (vs ? vs + 30 : 0) - (v.note ? 44 : 0)) / 2
  const side = W * 0.34, inB = [X, my, side, mh], outB = [X + W - side, my, side, mh]
  const inn = e.input ? thing(id + '-in', e.input, ...inB, st) : null, out = e.output ? thing(id + '-out', e.output, ...outB, st) : null
  if (inn && want('input')) s += inn.svg + inn.cap
  if (want('node')) {
    if (v.mark && /^[a-z-]+:/i.test(String(v.mark)) && !/^(lucide|tabler):/i.test(String(v.mark)) || /\.(png|jpe?g|svg|webp)$/i.test(String(v.mark ?? ''))) {
      s += circle(ncx, ncy, r, PAPER, st.accent, 5) + mark(v.mark, ncx - r * 0.6, ncy - r * 0.6, r * 1.2, st.accent, v)
    } else {
      s += circle(ncx, ncy, r, st.accent, null) + (v.mark ? mark(v.mark, ncx - r * 0.55, ncy - r * 0.55, r * 1.1, PAPER) : spark(ncx, ncy, r * 0.5, PAPER))
    }
  }
  if (want('verb')) {
    const ax1 = inn ? inB[0] + side / 2 + inn.w / 2 + 24 : X + side
    s += arrow(ax1, ncy, ncx - r - 18, ncy, INK, 5, 18)
    if (vs) s += text(ncx, ncy + r + 22 + vs * 0.8, v.text, vs, 500, st.accent, 'middle')
  }
  if (v.note && want('note')) s += text(ncx, ncy + r + 22 + vs + 14 + 24, v.note, fitTo(v.note, 34, W * 0.28), 400, MUTED, 'middle')
  if (want('output')) {
    const ax2 = out ? outB[0] + side / 2 - out.w / 2 - 24 : X + W - side
    s += arrow(ncx + r + 18, ncy, ax2, ncy, st.accent, 6, 18)
    if (out) s += out.svg + out.cap
  }
  return g(id, s)
}

// relate: the action arrow (N88, second choice), "X does Y" where nothing visibly changes. One row per subject (two fit well, three at most):
// subject card -> arrow with the verb in an accent pill -> result card at the arrow end. Rows stay up while later rows arrive.
//   { type: "relate", x, y, w, h, rows: [ { subject: { mark, name, caption }, verb: "summarises", result: { mark, label, caption, look } } ],
//     parts: ["subject:0", "scap:0", "verb:0", "result:0", "rcap:0", ...] }   scap / rcap = the subject's / result's caption line
export function relate(id, e) {
  const st = relStyle(e), want = wantPart(e), X = e.x ?? 160, Y = e.y ?? 170, W = e.w ?? 1600, H = e.h ?? 720
  const rows = e.rows ?? [], n = rows.length, gap = e.gap ?? 60
  const rh = Math.min(e.rowH ?? 340, (H - gap * (n - 1)) / Math.max(1, n)), total = n * rh + (n - 1) * gap, y0 = Y + (H - total) / 2
  const sw = W * (e.subjectShare ?? 0.28), rw = W * (e.resultShare ?? 0.34)
  let s = ''
  rows.forEach((row, i) => {
    const ry = y0 + i * (rh + gap), cy = ry + rh / 2, sub = row.subject ?? {}, res = row.result ?? {}
    const m = Math.min(rh * 0.42, 150), ns = fitTo(sub.name, Math.min(46, rh * 0.14), sw - 40), cs = sub.caption ? fitTo(sub.caption, 34, sw - 30) : 0
    const inner = m + (sub.name ? 22 + ns : 0) + (cs ? 12 + cs : 0), iy = ry + (rh - inner) / 2
    if (want(`subject:${i}`)) {
      s += rect(X, ry, sw, rh, 24, st.tint, st.hair, 3) + mark(sub.mark, X + sw / 2 - m / 2, iy, m, st.accent, { ...sub, maxW: sw - 48 })
      if (sub.name) s += text(X + sw / 2, iy + m + 22 + ns * 0.8, sub.name, ns, 400, INK, 'middle')
    }
    if (cs && want(`scap:${i}`)) s += text(X + sw / 2, iy + m + 22 + ns + 12 + cs * 0.8, sub.caption, cs, 400, MUTED, 'middle')
    const ax1 = X + sw + 26, ax2 = X + W - rw - 26
    if (want(`verb:${i}`)) {
      s += arrow(ax1, cy, ax2, cy, st.accent, 6, 20)
      if (row.verb) {
        const vs = fitTo(row.verb, 34, ax2 - ax1 - 120), pw = twEst(row.verb, vs) + 64, ph = Math.round(vs * 1.9)
        s += rect((ax1 + ax2) / 2 - pw / 2 - 10, cy - ph / 2, pw, ph, ph / 2, st.accent, null) + text((ax1 + ax2) / 2 - 10, cy + vs * 0.35, row.verb, vs, 500, PAPER, 'middle')
      }
    }
    const rx = X + W - rw
    if (res.look && res.look !== 'card') {
      const t = thing(`${id}-r${i}`, res, rx, ry, rw, rh, st)
      if (want(`result:${i}`)) s += t.svg
      if (res.caption && want(`rcap:${i}`)) s += t.cap
    } else {
      const rm = Math.min(rh * 0.4, 140), ls = res.label ? fitTo(res.label, Math.min(44, rh * 0.13), rw - 40) : 0, rcs = res.caption ? fitTo(res.caption, 34, rw - 30) : 0
      const inn = rm + (ls ? 22 + ls : 0) + (rcs ? 12 + rcs : 0), jy = ry + (rh - inn) / 2
      if (want(`result:${i}`)) {
        s += rect(rx, ry, rw, rh, 24, PAPER, st.accent, 4) + (res.mark ? mark(res.mark, rx + rw / 2 - rm / 2, jy, rm, st.accent, res) : spark(rx + rw / 2, jy + rm / 2, rm * 0.36, st.accent))
        if (ls) s += text(rx + rw / 2, jy + rm + 22 + ls * 0.8, res.label, ls, 400, INK, 'middle')
      }
      if (rcs && want(`rcap:${i}`)) s += text(rx + rw / 2, jy + rm + 22 + ls + 12 + rcs * 0.8, res.caption, rcs, 400, MUTED, 'middle')
    }
  })
  return g(id, s)
}

// tagged: tag and badge (N88, third choice), "X is Y" / "X has Y". One card per subject: what it is as a caption under its name, what it
// has as tags joined to the card by short lines, or a corner badge. Cards with no tags make a plain peer row: up to 4 in a row, two rows
// for 5-8, all in one view (N87). join: "+" draws a plus between neighbouring cards. A card or tag with no: true is crossed out in red.
//   { type: "tagged", x, y, w, h, cards: [ { mark, name, caption, badge: { text | mark }, tags: [ { text, mark, no } ], no } ],
//     parts: ["card:0", "caption:0", "badge:0", "no:0", "tag:0.0", ...] }
export function tagged(id, e) {
  const st = relStyle(e), want = wantPart(e), X = e.x ?? 160, Y = e.y ?? 170, W = e.w ?? 1600, H = e.h ?? 720
  const cards = e.cards ?? [], n = cards.length
  const per = e.perRow ?? (n <= 4 ? n : Math.ceil(n / 2)), R = Math.ceil(n / Math.max(1, per)), gap = e.gap ?? (e.join ? 120 : 56), rowGap = e.rowGap ?? 50
  const slot = (W - gap * (per - 1)) / per
  const cw = Math.min(slot, e.cardW ?? (n === 1 ? 640 : 600))
  const ts = e.tagSize ?? (n === 1 ? 40 : slot >= 700 ? 36 : 34), th = Math.round(ts * 2.1), stem = 46, tgap = 22
  const anyCap = cards.some(c => c.caption)
  let m = e.markSize ?? Math.max(60, Math.min(170, cw * 0.3))
  const nsOf = mm => Math.max(34, Math.min(46, mm * 0.3 + 8))
  const tagW = (t, f) => (t.text ? twEst(t.text, f) + 48 : 40) + (t.mark ? markW(t.mark, f * 1.2, t) + (t.text ? 14 : 0) : 0) + 4   // + 4: the outline's stroke
  // the largest size (<= ts, >= 34, the D1 floor) at which a tag fits maxW; null when even 34 px does not fit
  const fitTag = (t, maxW) => { for (let f = ts; f >= 34; f -= 1) if (tagW(t, f) <= maxW) return f; return null }
  // tags, each kept inside the room its card owns (its slot, or the box for a single card):
  //   bus    one row joined by a bus, when all fit at full size;
  //   spine  two columns either side of a centre spine, sizes shrunk to the column;
  //   stack  one column hanging from a spine at the card's left, when two columns cannot fit;
  //   a tag that still cannot fit at 34 px is drawn at 34 px and the build warns with its text.
  const tagLayout = c => {
    const tg = c.tags ?? []
    if (!tg.length) return { h: 0, mode: 'none' }
    const room = n === 1 ? W : slot
    const full = tg.map(t => tagW(t, ts)), row = full.reduce((a, b) => a + b, 0) + tgap * (tg.length - 1)
    if (row <= room && (tg.length <= 3 || n === 1)) return { h: stem + th, mode: 'bus', fs: tg.map(() => ts), ws: full, row, room }
    const col = room / 2 - 30, two = tg.map(t => fitTag(t, col))
    if (two.every(f => f !== null)) { const rows = Math.ceil(tg.length / 2); return { h: stem + rows * th + (rows - 1) * 20, mode: 'spine', fs: two, ws: tg.map((t, i) => tagW(t, two[i])), rows, room } }
    const one = room / 2 + cw / 2 - 58, fs = tg.map(t => fitTag(t, one))
    fs.forEach((f, i) => { if (f === null) ctxState.warn(`${ctxState.el ?? id}: tag "${tg[i].text}" does not fit ${Math.round(one)} px even at 34 px; shorten it, use fewer cards per row or a wider box`) })
    const f2 = fs.map(f => f ?? 34)
    return { h: stem + tg.length * th + (tg.length - 1) * 16, mode: 'stack', fs: f2, ws: tg.map((t, i) => Math.min(tagW(t, f2[i]), one)), rows: tg.length, room }
  }
  const lay = cards.map(tagLayout)
  const cardH = mm => 34 + mm + 22 + nsOf(mm) + (anyCap ? 12 + (e.captionSize ?? Math.max(34, Math.round(nsOf(mm) * 0.75))) + 4 : 0) + 30
  const rowH = (mm, r) => cardH(mm) + Math.max(0, ...lay.slice(r * per, r * per + per).map(l => l.h))
  const totalH = mm => [...Array(R).keys()].reduce((a, r) => a + rowH(mm, r), 0) + rowGap * (R - 1)
  while (totalH(m) > H && m > 60) m -= 4
  if (totalH(m) > H) ctxState.warn(`tagged "${id}": ${Math.round(totalH(m))} px of cards and tags do not fit ${H} px; use fewer tags or a taller box`)
  const ns = nsOf(m), csz = e.captionSize ?? Math.max(34, Math.round(ns * 0.75)), ch = cardH(m)
  let s = '', yy = Y + (H - totalH(m)) / 2
  for (let r = 0; r < R; r++) {
    const idx = [...Array(n).keys()].slice(r * per, r * per + per), k = idx.length
    const rowW = k * slot + (k - 1) * gap, x0 = X + (W - rowW) / 2
    idx.forEach((ci, j) => {
      const c = cards[ci], cnx = x0 + j * (slot + gap) + slot / 2, lx = cnx - cw / 2
      if (want(`card:${ci}`)) {
        s += rect(lx, yy, cw, ch, 24, st.tint, st.hair, 3) + mark(c.mark, cnx - m / 2, yy + 34, m, st.accent, { ...c, maxW: cw - 48 })
        if (c.name) s += text(cnx, yy + 34 + m + 22 + ns * 0.8, c.name, fitTo(c.name, ns, cw - 36), 400, INK, 'middle')
        if (e.join && j > 0) s += text(cnx - (slot + gap) / 2, yy + ch / 2 + 22, e.join, 64, 400, st.accent, 'middle')
      }
      if (c.caption && want(`caption:${ci}`)) s += text(cnx, yy + 34 + m + 22 + ns + 12 + csz * 0.8, c.caption, fitTo(c.caption, csz, cw - 30), 400, MUTED, 'middle')
      if (c.no && want(`no:${ci}`)) s += cross(cnx, yy + 34 + m / 2, m * 0.55)
      if (c.badge && want(`badge:${ci}`)) {
        const br = Math.max(38, Math.min(70, m * 0.45)), bx = lx + cw - br * 0.28, by = yy + br * 0.2
        s += circle(bx, by, br, st.accent, null)
        if (c.badge.mark) s += mark(c.badge.mark, bx - br * 0.55, by - br * 0.55, br * 1.1, PAPER)
        else { const bs = fitTo(c.badge.text, br * 0.7, br * 1.6, 26); s += text(bx, by + bs * 0.36, c.badge.text, bs, 600, PAPER, 'middle') }
      }
      const L = lay[ci], tg = c.tags ?? [], cb = yy + ch
      tg.forEach((t, ti) => {
        if (!want(`tag:${ci}.${ti}`)) return
        let tx, ty, conn
        if (L.mode === 'bus') {
          const sx = cnx - L.row / 2 + L.ws.slice(0, ti).reduce((a, b) => a + b, 0) + tgap * ti
          tx = sx; ty = cb + stem
          const tcx = sx + L.ws[ti] / 2, busY = cb + stem / 2
          conn = tg.length === 1 ? line(cnx, cb, cnx, ty, st.accent, 4) : line(cnx, cb, cnx, busY, st.accent, 4) + line(cnx, busY, tcx, busY, st.accent, 4) + line(tcx, busY, tcx, ty, st.accent, 4)
        } else if (L.mode === 'spine') {
          const rI = Math.floor(ti / 2), right = ti % 2 === 1, rowY = cb + stem + rI * (th + 20)
          tx = right ? cnx + 30 : cnx - 30 - L.ws[ti]; ty = rowY
          conn = line(cnx, cb, cnx, rowY + th / 2, st.accent, 4) + line(cnx, rowY + th / 2, right ? tx : tx + L.ws[ti], rowY + th / 2, st.accent, 4)
        } else {
          const sx = lx + 24, rowY = cb + stem + ti * (th + 16)
          tx = sx + 30; ty = rowY
          conn = line(sx, cb, sx, rowY + th / 2, st.accent, 4) + line(sx, rowY + th / 2, tx, rowY + th / 2, st.accent, 4)
        }
        s += conn + tagPill(t, tx, ty, L.ws[ti] - 4, th, L.fs[ti], st)
      })
    })
    yy += rowH(m, r) + rowGap
  }
  return g(id, s)
}
function tagPill(t, x, y, w, h, ts, st) {
  const col = t.no ? RED : st.accent
  let s = rect(x, y, w, h, h / 2, PAPER, col, 3.5), tx = x + 24
  if (t.mark) { const mw = markW(t.mark, ts * 1.2, t); s += mark(t.mark, x + 20 + mw / 2 - ts * 0.6, y + (h - ts * 1.2) / 2, ts * 1.2, t.no ? MUTED : st.accent, t); tx = x + 20 + mw + 14 }
  // a tag that could not fit (the build has warned) is cut with an ellipsis so it never runs into its neighbour
  let label = String(t.text ?? '')
  while (label.length > 1 && twEst(label, ts) > x + w - 20 - tx) label = label.slice(0, -2) + '…'
  if (label) s += text(tx, y + h / 2 + ts * 0.36, label, ts, 400, t.no ? MUTED : INK)
  if (t.no) s += line(x + 14, y + h / 2, x + w - 14, y + h / 2, RED, 5)
  return s
}
// every part name of a relationship element, in drawing order (for generators that split one spec over several cues)
export function relationParts(e) {
  if (e.type === 'transform') return [...(e.actor ? ['actor'] : []), ...(e.actor?.caption ? ['caption'] : []), ...(e.input ? ['input'] : []), 'node', 'verb', ...(e.verb?.note ? ['note'] : []), 'output']
  if (e.type === 'relate') return (e.rows ?? []).flatMap((r, i) => [`subject:${i}`, ...(r.subject?.caption ? [`scap:${i}`] : []), `verb:${i}`, `result:${i}`, ...(r.result?.caption ? [`rcap:${i}`] : [])])
  if (e.type === 'tagged') return (e.cards ?? []).flatMap((c, i) => [`card:${i}`, ...(c.caption ? [`caption:${i}`] : []), ...(c.badge ? [`badge:${i}`] : []), ...(c.no ? [`no:${i}`] : []), ...(c.tags ?? []).map((_, j) => `tag:${i}.${j}`)])
  return []
}

// ---------------------------------------------------------------- house elements (D1-D13): box, quote, stat, step, textblock, cycle, focus, pointer, chat
// Geometry is in _geom.mjs (the same numbers the frame lint reads). No element draws a title, kicker or footer. Composite types take `parts`.
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'
const tbText = (t, weight = 400, fill = INK, extra = '') => text(t.ax, t.base, t.text, t.size, weight, fill, t.anchor, extra, t.face)
const wantG = e => G.wants(e)

const TONES = () => ({ ink: [PAPER, INK], accent: [GT, GREEN], muted: [SOFT, HAIR], orange: ['#fdf0e0', ORANGE] })
// box: a labelled box (D2). Label centred both ways, 28 px or more to the border, auto-fitted 40-56 px; optional icon above (or left in a low box).
export function boxEl(id, e) {
  const L = G.boxLayout(e), [fill, stroke] = TONES()[e.tone ?? 'ink'] ?? TONES().ink
  if (!L.lab.fits) ctxState.warn(`${ctxState.el ?? id}: label "${String(e.text).slice(0, 40)}" does not fit ${e.w} x ${e.h} at 40 px; shorten it or make the box larger`)
  let s = rect(e.x, e.y, e.w, e.h, 24, fill, stroke, 3.5)
  if (L.iconBox) s += icon(e.icon, L.iconBox[0], L.iconBox[1], L.iconBox[2], stroke === HAIR ? MUTED : stroke, 2)
  s += L.textBoxes.map(t => tbText(t, 500)).join('')
  return g(id, s)
}

// quote (D10): no box; words 64-80 px regular, <= 1380 px wide; a pale oversized quotation mark hangs left; the source in the mono face, capitals, accent.
export function quoteEl(id, e) {
  const L = G.quoteLayout(e), want = wantG(e), A = e.accent ?? ORANGE
  let s = ''
  if (want('mark')) s += `<text x="${num(L.mark[0] + 6)}" y="${num(L.ty + 175)}" font-family="Georgia, 'Times New Roman', serif" font-size="260" font-weight="700" fill="${A}" fill-opacity="0.3">&#8220;</text>`
  if (want('figure') && e.figure) { const f = L.parts.figure; s += `<image href="${esc(e.figure)}" x="${num(f[0])}" y="${num(f[1])}" width="${num(f[2])}" height="${num(f[3])}" preserveAspectRatio="xMidYMid meet"/>` }
  if (want('text')) s += L.lines.map((l, i) => text(L.tx, L.ty + L.size * G.ASC + i * L.lh, l, L.size, 400, INK)).join('')
  if (want('source') && L.src) s += `<text x="${num(L.tx)}" y="${num(L.srcBase)}" font-family='${MONO}' font-size="${L.srcSize}" letter-spacing="3.4" fill="${A}">${esc(L.src)}</text>`
  return g(id, s)
}

// stat / stats (D12): a big number in the accent, bold, about 150 px; the label 48 px; no box.
export function statEl(id, e) {
  const L = G.statsLayout(e), want = wantG(e)
  let s = ''
  L.cells.forEach((c, i) => {
    if (want(`value:${i}`)) s += tbText(c.vt, 700, e.accent ?? GREEN, '')
    if (want(`label:${i}`)) s += c.lts.map(t => tbText(t, 400, INK)).join('')
  })
  return g(id, s)
}

// A picture box (step, opening and section cards, steps rows): an image cropped to rounded corners, or an icon on a tinted panel.
// `pic` = image src (path, URL or data: URI) or an icon name; box = [x, y, w, h].
function pictureBox(id, pic, [x, y, w, h], r = 28, tint = GT, ink = GREEN) {
  if (G.isImageSrc(pic)) return `<defs><clipPath id="${id}-clip"><rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" rx="${r}"/></clipPath></defs><image href="${esc(pic)}" x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}-clip)"/>` + rect(x, y, w, h, r, 'none', HAIR, 2)
  const s = Math.round(Math.min(w, h) * 0.5)
  return rect(x, y, w, h, r, tint, null, 0) + icon(pic, x + (w - s) / 2, y + (h - s) / 2, s, ink, 2)
}

// step (D6): a full-screen step card (mockup s3). Big number in the display face and the accent, "of N" small on its baseline (one text,
// two tspans, so the baseline is shared whatever the font), the sentence in the display face below on the same left axis, an optional second
// clause in the accent, an optional picture on the right. Parts: num (number and "of N"), text, sub, picture.
export function stepEl(id, e) {
  const L = G.stepLayout(e), want = wantG(e), col = e.color ?? (/^(#|rgb)/i.test(e.accent ?? '') ? e.accent : GREEN)
  let s = ''
  for (const t of L.textBoxes) {
    if (t.part === 'num') s += `<text x="${num(t.ax)}" y="${num(t.base)}" font-family="${DISPLAY}" font-size="${L.numS}" font-weight="${DW}" fill="${col}">${esc(t.text)}${e.of != null ? `<tspan dx="22" font-family="${FONT}" font-size="${L.ofS}" font-weight="400" fill="${MUTED}">of ${esc(e.of)}</tspan>` : ''}</text>`
    else if (t.part === 'sub') s += tbText(t, 400, MUTED)
    else if (t.part === 'text') s += tbText(t, 400, t.acc ? col : INK)
  }
  if (L.picBox && want('picture')) s += pictureBox(id, e.picture, L.picBox)
  return g(id, s)
}

// steps (D16): a numbered list of up to six items under an optional lead line (mockup s2). item = { label, thumb? (image src), icon? , n? }.
// Parts: lead, item:i (the whole row).
export function stepsEl(id, e) {
  const L = G.stepsLayout(e), want = wantG(e), col = e.color ?? GREEN
  if (!L.fits) ctxState.warn(`${ctxState.el ?? id}: the list ends at y ${Math.round(L.bottom)}, into the caption zone; fewer items or a shorter lead`)
  if ((e.items ?? []).length > 6) ctxState.warn(`${ctxState.el ?? id}: ${(e.items ?? []).length} items; the list shows six at most`)
  let s = ''
  for (const t of L.textBoxes.filter(t => t.part === 'lead')) s += tbText(t, 400, INK)
  for (const r of L.rows) {
    if (!want(`item:${r.i}`)) continue
    s += tbText(r.nb, 600, col) + r.lb.map(t => tbText(t, 400, INK)).join('')
    if (r.pic) s += pictureBox(`${id}-p${r.i}`, r.it.thumb ?? r.it.icon, r.pic, 18)
  }
  return g(id, s)
}

// textblock (D5, D19): plain text lines for a screen that states a name, a date or a claim; lines of 64 px or more use the display face.
// Wrapped to about 30 em (at most 1320 px) and centred. Optional `picture` (image src or icon name) above the lines: opening and section cards.
export function textblockEl(id, e) {
  const L = G.textblockLayout(e), want = wantG(e)
  let s = ''
  if (L.picBox && want('picture')) s += pictureBox(id, e.picture, L.picBox, L.imgPic ? 28 : 40)
  if (want('text')) s += L.textBoxes.map(t => tbText(t, t.size >= 64 ? 500 : 400, t.color ?? INK)).join('')
  return g(id, s)
}

// cycle (D7): nodes in a row, forward arrows meeting the edges square, one curved return beneath from the last node to the first,
// the label under the curve's lowest point. Parts: node:i, step:i (the arrow after node i), return, label.
export function cycleEl(id, e) {
  const L = G.cycleLayout(e), want = wantG(e)
  let s = ''
  L.nodeBoxes.forEach((b, i) => {
    if (!want(`node:${i}`)) return
    const lay = L.nodeLays[i], [fill, stroke] = TONES()[b.nd.tone ?? 'ink'] ?? TONES().ink
    if (!lay.lab.fits) ctxState.warn(`${ctxState.el ?? id}: node label "${b.nd.label}" does not fit at 40 px; shorten it`)
    s += rect(b.x, b.y, b.w, b.h, 24, fill, stroke, 3.5)
    if (lay.iconBox) s += icon(b.nd.icon, lay.iconBox[0], lay.iconBox[1], lay.iconBox[2], GREEN, 2)
    s += lay.textBoxes.map(t => tbText(t, 500)).join('')
  })
  L.arrows.forEach((a, i) => { if (want(`step:${i}`)) s += arrow(a[0], a[1], a[2], a[3], INK, 4, 22) })
  if (L.ret && want('return')) s += path(L.ret.d_path, 'none', INK, 4) + arrowHead(L.ret.ex, L.ret.by, -Math.PI / 2, INK, 4, 22)
  if (L.label && want('label')) s += tbText(L.label, 500, INK)
  return g(id, s)
}

// focus (D9): a soft orange wash plus a 4 px outline, radius 24, at least 24 px clear of the target on every side. `target` = an element id
// of the same frame (resolved through _geom.mjs) or [x, y, w, h]. Its motion defaults to a fade (see TYPES); to move it, hide the old one in the build.
export function focusEl(id, e, target) {
  if (!target) { ctxState.warn(`${ctxState.el ?? id}: focus target ${JSON.stringify(e.target)} is not an element id of this frame nor an [x, y, w, h]`); return '' }
  if (e.pad != null && e.pad < G.FOCUS_MIN_PAD) ctxState.warn(`${ctxState.el ?? id}: focus pad ${e.pad} is under ${G.FOCUS_MIN_PAD} px; using ${G.FOCUS_MIN_PAD}`)
  const [x, y, w, h] = G.focusRect(target, e.pad)
  return g(id, rect(x, y, w, h, 24, ORANGE, ORANGE, 4, 'fill-opacity="0.12"'))
}

// pointer (D8): a thin arrow (4 px, ink or the accent), a small head, curved when diagonal, ending 16 px short of its target.
//   from [x, y]; to = element id of this frame or [x, y]; label = a short text at the tail; color "ink" (default) | "accent"
export function pointerEl(id, e, target) {
  if (typeof e.to === 'string' && !target) { ctxState.warn(`${ctxState.el ?? id}: pointer target "${e.to}" is not an element of this frame`); return '' }
  const P = G.pointerLayout(e, target), col = e.color === 'accent' ? ORANGE : (e.color && e.color !== 'ink' ? e.color : INK)
  const an = Math.atan2(P.tu[1], P.tu[0])
  let s = path(`M${num(P.from[0])} ${num(P.from[1])} Q${num(P.ctrl[0])} ${num(P.ctrl[1])} ${num(P.end[0] - 14 * Math.cos(an))} ${num(P.end[1] - 14 * Math.sin(an))}`, 'none', col, 4)
  s += arrowHead(P.end[0], P.end[1], an, col, 4, 22)
  if (P.label) s += tbText(P.label, 500, INK)
  return g(id, s)
}

// chat (D11): TalkWeaver's chat design. A window; the user's words in a grey bubble on the right; the agent's words as plain text on the left
// beside a small round avatar; a tool or search step as a coloured chip by kind (thought, search, tool, result). Parts: frame, msg:i.
export function chatEl(id, e) {
  const L = G.chatLayout(e), want = wantG(e)
  if (!L.fits) ctxState.warn(`${ctxState.el ?? id}: the messages need ${Math.round(L.used - L.Y)} px; the window is ${L.H} px tall; fewer or shorter messages`)
  let s = ''
  if (want('frame')) s += window_(L.X, L.Y, L.W, L.H, e.title ?? '', L.bar, 18, true, 34)
  const T = i => L.textBoxes.filter(t => t.msg === i)
  for (const b of L.items) {
    if (!want(`msg:${b.i}`)) continue
    if (b.who === 'user') s += rect(b.x, b.y, b.w, b.h, 30, '#eceef1', null) + T(b.i).map(t => tbText(t, 400, INK)).join('')
    else if (b.kind !== 'text') {
      const k = G.CHAT_KINDS[b.kind]
      s += agentMark(L.left + L.avW / 2, b.y + b.h / 2, 20) + rect(b.x, b.y, b.w, b.h, b.h / 2, k.tint, k.color, 2.5) + icon(k.icon, b.x + 22, b.y + (b.h - 34) / 2, 34, k.color, 2) + T(b.i).map(t => tbText(t, 400, INK)).join('')
    } else s += agentMark(L.left + L.avW / 2, b.y + 26, 26) + T(b.i).map(t => tbText(t, 400, INK)).join('')
  }
  return g(id, s)
}
