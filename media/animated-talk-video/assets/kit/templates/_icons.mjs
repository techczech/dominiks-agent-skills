// Icon and logo resolver. Plain ES module, no dependencies.
//
//   resolveIcon("lucide:brain")      kit/icons/brain.svg (shipped), else lucide.json of the icon sets
//   resolveIcon("tabler:users-group") tabler.json of the icon sets; names with no tabler entry fall back to lucide (TABLER_TO_LUCIDE)
//   resolveIcon("svgl:openai")       a brand mark: svgl.json, extra.json, simple-icons.json of the icon sets, then kit/icons/logo-openai.svg
//   resolveIcon("si:github")         simple-icons.json only
//
// The sets are TalkWeaver's bundled sets (compiler/assets/icons/: svgl.json, simple-icons.json, extra.json, tabler.json, lucide.json).
// They are NEVER copied into this skill (brand marks are trademarks; the skill is published). The folder comes from, in order:
//   opts.dir, look.json "iconSets", env ANIMATED_TALK_ICON_SETS, env TALKWEAVER_ICONS, the TalkWeaver checkout on Dominik's machine (if present).
// Result: { kind: 'stroke' | 'mark', inner, viewBox, w, h, source } or null (the caller names the thing in text and warns).
// A mark whose only fill is white (svgl keeps dark-mode variants) is recoloured to ink so it shows on paper.
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

// Optional extra icon sets (a TalkWeaver checkout's compiler/assets/icons): set TALKWEAVER_HOME or one of the variables below.
const DEFAULT_SETS = process.env.TALKWEAVER_HOME ? path.join(process.env.TALKWEAVER_HOME, 'compiler/assets/icons') : null
const KIT_ICONS = new URL('../icons/', import.meta.url)

// tabler names the kit's talks have used, with a lucide stand-in for when no tabler set is reachable
export const TABLER_TO_LUCIDE = {
  'users-group': 'users', 'chalkboard-teacher': 'graduation-cap', 'brain': 'brain', 'robot': 'bot', 'search': 'search', 'file-text': 'file-text',
  'message': 'message-square', 'message-circle': 'message-square', 'code': 'code', 'terminal': 'terminal', 'world': 'globe', 'bulb': 'lightbulb',
  'tools': 'wrench', 'settings': 'wrench', 'alert-triangle': 'triangle-alert', 'folder': 'folder-open', 'user': 'user', 'database': 'database',
  'chart-line': 'trending-up', 'chart-bar': 'chart-column', 'send': 'send', 'check': 'check', 'eye': 'eye', 'cpu': 'cpu', 'server': 'server'
}

const SETS = new Map()   // dir -> { name -> parsed json | null }
const dirOf = opts => {
  for (const d of [opts?.dir, opts?.look?.iconSets, process.env.ANIMATED_TALK_ICON_SETS, process.env.TALKWEAVER_ICONS, DEFAULT_SETS]) {
    if (d && existsSync(d)) return path.resolve(String(d).replace(/^~(?=\/)/, homedir()))
  }
  return null
}
export const iconSetsDir = dirOf
function setOf(dir, name) {
  if (!dir) return null
  if (!SETS.has(dir)) SETS.set(dir, {})
  const m = SETS.get(dir)
  if (!(name in m)) { const p = path.join(dir, name + '.json'); m[name] = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null }
  return m[name]
}

const attr = (tag, k) => (tag.match(new RegExp(`\\s${k}="([^"]*)"`)) ?? [])[1]
// whole <svg>…</svg> text -> { inner, viewBox, w, h }
function parseSvg(raw) {
  const m = raw.match(/<svg([^>]*)>([\s\S]*?)<\/svg>\s*$/)
  if (!m) return null
  const tag = m[1]
  let vb = attr(tag, 'viewBox'), w = parseFloat(attr(tag, 'width')), h = parseFloat(attr(tag, 'height'))
  if (!vb && w && h) vb = `0 0 ${w} ${h}`
  if (!vb) vb = '0 0 24 24'
  const [, , vw, vh] = vb.split(/[\s,]+/).map(Number)
  return { inner: m[2].replace(/<title>[\s\S]*?<\/title>/g, '').replace(/\n\s*/g, ' ').trim(), viewBox: vb, w: vw, h: vh, tag }
}
const WHITE = /^(#fff|#ffff|#ffffff|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))$/i
let WARN = null   // set per resolveIcon() call from opts.warn
// lightModeFix(): a one-colour white mark (a dark-mode variant) -> ink; any mark with another painted colour stays as drawn (N89).
// Every painted element is evaluated with its inherited fill and stroke: parent <g>, a <use> instance's context (the referenced
// element in <defs> paints with the <use>'s fill), the default black fill of a shape with no fill, and white strokes. When the
// paint cannot be resolved safely (CSS classes or <style>, an unknown reference, foreign content) the mark is kept as drawn and a
// warning names it. Exported for tools/test-light-mode.mjs.
const PAINTED = new Set(['path', 'circle', 'rect', 'ellipse', 'polygon', 'polyline', 'line', 'text', 'tspan'])
const CONTAINERS = new Set(['g', 'svg', 'symbol', 'a', 'switch'])
const NOT_DRAWN = new Set(['defs', 'clippath', 'mask', 'lineargradient', 'radialgradient', 'pattern', 'marker', 'filter', 'title', 'desc', 'metadata', 'stop'])
function parseAttrs(t) {
  const a = {}
  for (const m of t.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) a[m[1]] = m[2]
  for (const m of t.matchAll(/([\w:-]+)\s*=\s*'([^']*)'/g)) a[m[1]] = m[2]
  if (a.style) for (const d of a.style.split(';')) { const [k, v] = d.split(':').map(x => x?.trim()); if (k && v) a[k] = v }
  return a
}
function svgTree(inner) {
  const root = { name: 'root', attrs: {}, kids: [] }, stack = [root]
  for (const m of inner.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g)) {
    const [, close, name, rest, self] = m
    if (close) { if (stack.length > 1) stack.pop(); continue }
    const node = { name: name.toLowerCase(), attrs: parseAttrs(rest), kids: [] }
    stack.at(-1).kids.push(node)
    if (!self) stack.push(node)
  }
  return root
}
export function paintedColours(inner) {
  if (/<style\b/i.test(inner) || /\sclass\s*=/.test(inner)) return { unresolved: 'CSS styling' }
  const root = svgTree(inner), ids = new Map(), out = []
  const index = n => { if (n.attrs.id) ids.set(n.attrs.id, n); n.kids.forEach(index) }
  index(root)
  let unresolved = null
  const val = (v, inh) => (v === undefined || v === 'inherit' ? inh : v)
  const paint = (n, inh, depth = 0) => {
    if (unresolved) return
    if (depth > 24) { unresolved = 'reference loop'; return }
    if (NOT_DRAWN.has(n.name)) return
    const fill = val(n.attrs.fill, inh.fill), stroke = val(n.attrs.stroke, inh.stroke)
    if (n.name === 'use') {
      const ref = (n.attrs.href ?? n.attrs['xlink:href'] ?? '').replace(/^#/, ''), t = ids.get(ref)
      if (!t) { unresolved = `<use> of unknown #${ref}`; return }
      return paint(t.name === 'symbol' ? { ...t, name: 'g' } : t, { fill, stroke }, depth + 1)
    }
    if (n.name === 'root' || CONTAINERS.has(n.name)) { n.kids.forEach(k => paint(k, { fill, stroke }, depth + 1)); return }
    if (PAINTED.has(n.name)) {
      if (n.name !== 'line' && fill !== 'none') out.push(fill ?? 'black')
      if (stroke !== undefined && stroke !== 'none') out.push(stroke)
      n.kids.forEach(k => paint(k, { fill, stroke }, depth + 1))
      return
    }
    unresolved = `<${n.name}> content`
  }
  paint(root, { fill: undefined, stroke: undefined })
  return unresolved ? { unresolved } : { colours: out.map(c => String(c).trim().toLowerCase()) }
}
export function lightModeFix(inner, ink, label = 'mark', warn = WARN) {
  const r = paintedColours(inner)
  if (r.unresolved) { warn?.(`logo ${label}: kept as drawn (light-mode recolouring cannot resolve ${r.unresolved})`); return inner }
  if (!r.colours.length || !r.colours.every(c => WHITE.test(c))) return inner
  const W = '(#fff|#ffff|#ffffff|white|rgb\\(\\s*255\\s*,\\s*255\\s*,\\s*255\\s*\\))'
  return inner.replace(new RegExp(`\\b(fill|stroke)="${W}"`, 'gi'), `$1="${ink}"`).replace(new RegExp(`\\b(fill|stroke)\\s*:\\s*${W}`, 'gi'), `$1:${ink}`)
}
const mark = (parsed, source, ink) => ({ kind: 'mark', inner: lightModeFix(parsed.inner, ink, source).replace(/currentColor/g, ink), viewBox: parsed.viewBox, w: parsed.w, h: parsed.h, source })

function lucide(name, dir) {
  const p = new URL(`${name}.svg`, KIT_ICONS)
  if (existsSync(p)) {
    const raw = readFileSync(p, 'utf8')
    const body = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\n\s*/g, ' ').trim()
    return { kind: 'stroke', inner: body, viewBox: '0 0 24 24', w: 24, h: 24, source: 'kit/icons' }
  }
  const e = setOf(dir, 'lucide')?.[name]
  return e?.body ? { kind: 'stroke', inner: e.body, viewBox: '0 0 24 24', w: 24, h: 24, source: 'lucide.json' } : null
}

function brand(name, dir, ink) {
  const key = name.toLowerCase()
  const svgl = setOf(dir, 'svgl')
  if (svgl) {
    let e = svgl[key]
    if (!e || typeof e.svg !== 'string') e = Object.values(svgl).find(v => v?.tokens?.includes?.(key) || String(v?.title ?? '').toLowerCase() === key)
    if (e?.svg) { const p = parseSvg(e.svg); if (p) return mark(p, 'svgl.json', ink) }
  }
  const ex = setOf(dir, 'extra')?.[key]
  if (ex?.svg) { const p = parseSvg(ex.svg); if (p) return mark(p, 'extra.json', ink) }
  const si = setOf(dir, 'simple-icons')?.[key]
  if (si?.body) return mark({ inner: si.body, viewBox: `0 0 ${si.w ?? 24} ${si.h ?? 24}`, w: si.w ?? 24, h: si.h ?? 24 }, 'simple-icons.json', ink)
  const own = new URL(`logo-${key}.svg`, KIT_ICONS)   // a licensed file the user added
  if (existsSync(own)) { const p = parseSvg(readFileSync(own, 'utf8')); if (p) return mark(p, 'kit/icons', ink) }
  return null
}

export function resolveIcon(spec, opts = {}) {
  WARN = opts.warn ?? null
  const s = String(spec ?? '').trim()
  if (!s) return null
  const m = s.match(/^([a-z-]+):(.+)$/i)
  const prefix = m ? m[1].toLowerCase() : 'lucide', name = (m ? m[2] : s).trim()
  const dir = dirOf(opts), ink = opts.ink ?? '#101418'
  if (prefix === 'svgl' || prefix === 'logo' || prefix === 'brand') return brand(name, dir, ink)
  if (prefix === 'si' || prefix === 'simple-icons') {
    const si = setOf(dir, 'simple-icons')?.[name.toLowerCase()]
    return si?.body ? mark({ inner: si.body, viewBox: `0 0 ${si.w ?? 24} ${si.h ?? 24}`, w: si.w ?? 24, h: si.h ?? 24 }, 'simple-icons.json', ink) : null
  }
  if (prefix === 'tabler') {
    const e = setOf(dir, 'tabler')?.[name]
    if (e?.body) return { kind: 'stroke', inner: e.body, viewBox: `0 0 ${e.w ?? 24} ${e.h ?? 24}`, w: e.w ?? 24, h: e.h ?? 24, source: 'tabler.json', tabler: true }
    const alt = TABLER_TO_LUCIDE[name]
    return alt ? lucide(alt, dir) : null
  }
  if (prefix === 'lucide') return lucide(name, dir)
  return null
}

// A resolved icon as an inline SVG string for HTML templates ("<svg …>"), colour via currentColor. Marks keep their own colours.
export function iconHtml(r) {
  if (!r) return null
  if (r.kind === 'mark') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r.viewBox}" preserveAspectRatio="xMidYMid meet">${r.inner}</svg>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r.viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${r.inner}</svg>`
}
