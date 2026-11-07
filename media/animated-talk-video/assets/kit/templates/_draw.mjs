// Line-art drawing kit for illustrated scenes: ink outlines on paper, one green accent, red for errors only.
// JS port of the approved storyboard-v3 generator (Python kit.py / props.py), 2026-11-03/04. Every function returns an SVG string.
// Coordinates are the 1920x1080 frame; the floor line sits at y 940 and the caption zone (y > 990) stays empty.
import { resolveIcon } from './_icons.mjs'

// Palette. Defaults are the kit's; setPalette(look) swaps ink, paper, muted, green, tint and red for a project's look.json.
export let INK = '#101418', PAPER = '#fdfdfb', MUTED = '#5c6570', HAIR = '#cfcdc4'
export let GREEN = '#0a7a5c', GT = '#e4f3ee', RED = '#b42318'
export let SOFT = '#f1f0ea', DARK = '#2a3036', TINT2 = '#cfe9e1'
export const SW = 3.5
export const FONT = 'Inter, Helvetica, Arial, sans-serif'
export const FLOOR = 940
export function setPalette(look = {}) {
  INK = look.ink ?? '#101418'; PAPER = look.paper ?? '#fdfdfb'; MUTED = look.muted ?? '#5c6570'
  GREEN = look.accents?.green ?? '#0a7a5c'; GT = look.tints?.green ?? '#e4f3ee'; RED = look.accents?.red ?? '#b42318'
}

// Warnings and icon-set options for the render in progress (frameToSvg sets them).
export const ctxState = { warn: m => console.error('warn ' + m), icons: {}, marks: 0 }

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
export function text(x, y, s, size = 28, weight = 400, fill = INK, anchor = 'start', extra = '') {
  if (size < 26) ctxState.warn(`text "${String(s).slice(0, 24)}" is ${size} px; labels in illustrations are 26 px or larger`)
  return `<text x="${num(x)}" y="${num(y)}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" ${extra}>${esc(s)}</text>`
}
export const lines = (x, y, rows, size = 28, step = null, weight = 400, fill = INK, anchor = 'start') => {
  step = step ?? Math.round(size * 1.25)
  return rows.map((r, i) => text(x, y + i * step, r, size, weight, fill, anchor)).join('')
}
export const g = (id, parts, extra = '') => `<g id="${id}"${extra ? ' ' + extra : ''}>${[].concat(parts).join('')}</g>`
export function arrow(x1, y1, x2, y2, stroke = INK, sw = SW, head = 16, dash = null) {
  const an = Math.atan2(y2 - y1, x2 - x1)
  const p1 = [x2 - head * Math.cos(an - 0.45), y2 - head * Math.sin(an - 0.45)], p2 = [x2 - head * Math.cos(an + 0.45), y2 - head * Math.sin(an + 0.45)]
  return line(x1, y1, x2, y2, stroke, sw, dash) + path(`M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L${x2} ${y2} L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`, 'none', stroke, sw)
}

// ---------------------------------------------------------------- icons and logos
// icon(): a line icon (lucide / tabler) top-left at (x, y), `size` px wide. Unknown -> nothing (a warning).
export function icon(name, x, y, size = 48, color = INK, sw = 2.0) {
  const r = resolveIcon(name, { ...ctxState.icons, ink: INK })
  if (!r) { ctxState.warn(`icon "${name}" cannot be drawn (not in kit/icons or the icon sets)`); return '' }
  if (r.kind === 'mark') return logoMark(r, x, y, size)
  return `<g transform="translate(${num(x)} ${num(y)}) scale(${(size / (r.w || 24)).toFixed(4)})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" color="${color}">${r.inner}</g>`
}
// ids inside a mark (gradients, masks, filters) are made unique per mark so two marks in one document never clash
function uniqueIds(inner) {
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
  const r = resolveIcon(spec, { ...ctxState.icons, ink: INK })
  if (!r) {
    ctxState.warn(`logo "${spec}" not found in the icon sets (set look.json "iconSets" or env TALKWEAVER_ICONS to TalkWeaver's compiler/assets/icons); name only, no mark`)
    return text(x + size / 2, y + size / 2 + 10, name ?? String(spec).replace(/^[a-z-]+:/i, ''), 32, 700, INK, 'middle')
  }
  return r.kind === 'mark' ? logoMark(r, x, y, size) : icon(spec, x, y, size, INK, 2)
}

// ---------------------------------------------------------------- furniture
export function window_(x, y, w, h, title = '', bar = 56, rx = 18, dots = true) {
  let s = rect(x, y, w, h, rx)
  s += path(`M${x} ${y + bar} V${y + rx} Q${x} ${y} ${x + rx} ${y} H${x + w - rx} Q${x + w} ${y} ${x + w} ${y + rx} V${y + bar} Z`, '#f1f0ea')
  s += line(x, y + bar, x + w, y + bar, INK, 2.5)
  if (dots) for (let i = 0; i < 3; i++) s += circle(x + 30 + i * 28, y + bar / 2, 7, PAPER, INK, 2.5)
  if (title) s += text(x + w / 2, y + bar / 2 + 9, title, 26, 500, MUTED, 'middle')
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
export function agentWindow(id, x, y, w, h, o = {}) {
  const { title = '', trayH = 0, trayLabel = "Model's context", chatbot = false } = o
  let s = window_(x, y, w, h, title)
  if (chatbot) s += rect(x + 22, y - 48, 196, 56, 16, PAPER, INK) + text(x + 120, y - 9, 'Chatbot', 28, 700, INK, 'middle')
  else s += rect(x + 22, y - 48, 196, 56, 16, GREEN, GREEN) + agentMark(x + 56, y - 20, 18, PAPER, GREEN) + text(x + 86, y - 9, 'Agent', 28, 700, PAPER)
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
export function chatMsg(x, y, w, h, rows, size = 28, fill = PAPER, stroke = INK) {
  return rect(x, y, w, h, 24, fill, stroke, 2.5) + lines(x + 24, y + 12 + size, rows, size, Math.round(size * 1.3))
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
