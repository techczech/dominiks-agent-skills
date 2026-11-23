#!/usr/bin/env node
// Frame lint: reads frames/*.json (and plan.json for build times when present) and reports the screen defects Dominik keeps finding,
// before a video goes out. Each line: `error|warn  <frame>  <element>  <rule> (D.., N..): message`. Exit 1 on any error.
//
//   node kit/tools/lint-frames.mjs <project-or-frames-dir> [--rules]
//
// Geometry comes from templates/_geom.mjs (the same numbers the kit draws with); text width is an estimate, so checks keep a small margin.
// Rules are written D<n> (the 13 Nov 2026 consolidation plan decisions); N<n> are the older motion-principles ids where the plan names them.
// A `_lint-skip.json` in the frames directory ({ "skip": { "file.json": "why" } }) leaves out frames kept only as legacy examples; they are listed.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bbox } from '../templates/_geom.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const target = args.find(a => !a.startsWith('--'))
if (!target) { console.error('usage: node lint-frames.mjs <project-or-frames-dir> [--rules]'); process.exit(2) }

// ---------------------------------------------------------------- rule table
const RULES = {
  'text-floor': ['D1', 'N22 N35', 'text below the 34 px floor (26 px only for role axis / source)'],
  'label-size': ['D1', 'N35', 'box label below 40 px'],
  'text-padding': ['D2', 'N22', 'text closer than 28 px to the border of the box that holds it'],
  'overlap': ['D3', '', 'an element runs into another element\'s text'],
  'edge-crosses-text': ['D3', '', 'a box, window or highlight edge cuts through another element\'s text'],
  'connector-clearance': ['D7', '', 'text or icon within 16 px of a connector it is not the end of'],
  'measure': ['D19', '', 'a text box wider than 1400 px (about 60-70 characters a line is the measure; centre a narrower block)'],
  'heading': ['D4', 'N54 N56', 'a heading on a screen (top-left title, accent bar over a heading, key phrase)'],
  'raw-highlight': ['D13 D9', '', 'a no-fill rounded rect used as a highlight: use `focus`'],
  'highlight-clearance': ['D9', '', 'highlight edge under 24 px from its content'],
  'raw-quote': ['D13 D10', 'N29', 'quote drawn from raw text, icon or box: use `quote`'],
  'raw-polyline': ['D13 D7', '', 'lines and arrows chained into a polyline: use `cycle` (or one straight connector)'],
  'arrow-style': ['D8', '', 'connector red, over 6 px wide, or long and diagonal: use `pointer`'],
  'arrow-dashed': ['D8', '', 'dashed connector (only a tool call is dashed)'],
  'focus-fast': ['D9', '', 'more than one highlight change within 2 s'],
  'focus-repeat': ['D9', '', 'the same target highlighted twice in a row'],
  'focus-only': ['D9', '', 'highlight on the only content on the screen'],
  'too-many': ['N49', 'N49', 'more than five content elements on one screen at once'],
  'relation-facts': ['D5', 'N87 N88', 'a relationship drawing of names, organisations or dates: plain text instead'],
  'unknown-type': ['', '', 'unknown element type'],
  'render': ['', '', 'the frame does not render'],
  'kit-warning': ['', '', 'warning from the kit while drawing'],
  'bad-json': ['', '', 'the file is not valid JSON']
}
if (args.includes('--rules')) { for (const [k, [d, n, t]] of Object.entries(RULES)) console.log(`${k.padEnd(20)} ${d.padEnd(7)} ${n.padEnd(8)} ${t}`); process.exit(0) }

// ---------------------------------------------------------------- geometry helpers
const inset = ([x, y, w, h], d) => [x + d, y + d, Math.max(0, w - 2 * d), Math.max(0, h - 2 * d)]
const R = t => [t.x, t.y, t.w, t.h]
// a text box for the checks: the width estimate runs 5-20% high, so shrink it toward its anchor and trim the line's empty top and bottom
const TR = t => { const w = t.w * 0.9, x = t.anchor === 'middle' ? t.x + (t.w - w) / 2 : t.anchor === 'end' ? t.x + t.w - w : t.x; return [x, t.y + t.size * 0.1, w, t.size * 0.85] }
const hit = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]
const inside = (inner, outer, tol = 0) => inner[0] >= outer[0] - tol && inner[1] >= outer[1] - tol && inner[0] + inner[2] <= outer[0] + outer[2] + tol && inner[1] + inner[3] <= outer[1] + outer[3] + tol
const area = b => b[2] * b[3]
const centre = b => [b[0] + b[2] / 2, b[1] + b[3] / 2]
const pt = (p, b) => p[0] >= b[0] && p[0] <= b[0] + b[2] && p[1] >= b[1] && p[1] <= b[1] + b[3]
function dPtSeg(p, s) {
  const [x1, y1, x2, y2] = s, dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - x1) * dx + (p[1] - y1) * dy) / l2)) : 0
  return Math.hypot(p[0] - (x1 + t * dx), p[1] - (y1 + t * dy))
}
const ccw = (a, b, c) => (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])
const segX = (s, t) => { const a = [s[0], s[1]], b = [s[2], s[3]], c = [t[0], t[1]], d = [t[2], t[3]]; return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d) }
function dSegRect(s, b) {
  if (pt([s[0], s[1]], b) || pt([s[2], s[3]], b)) return 0
  const [x, y, w, h] = b, edges = [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]]
  if (edges.some(e => segX(s, e))) return 0
  return Math.min(...edges.map(e => Math.min(dPtSeg([s[0], s[1]], e), dPtSeg([s[2], s[3]], e), dPtSeg([e[0], e[1]], s), dPtSeg([e[2], e[3]], s))))
}
const num = n => Math.round(n)

// ---------------------------------------------------------------- load
function findDirs(p) {
  const abs = path.resolve(p)
  const fr = path.join(abs, 'frames')
  const framesDir = fs.existsSync(fr) && fs.statSync(fr).isDirectory() ? fr : abs
  const planPath = [path.join(abs, 'plan.json'), path.join(path.dirname(framesDir), 'plan.json')].find(fs.existsSync)
  return { project: abs, framesDir, planPath }
}
const { project, framesDir, planPath } = findDirs(target)
let TYPES = null
try { TYPES = (await import('../templates/_frame.mjs')).TYPES } catch { /* the kit's drawing code is not beside this file; skip the render check */ }
let frameToSvg = null
try { frameToSvg = (await import('../templates/_frame.mjs')).frameToSvg } catch { /* as above */ }
let look = {}
for (const lp of [path.join(project, 'look.json'), path.join(framesDir, '..', 'look.json')]) if (fs.existsSync(lp)) { try { look = JSON.parse(fs.readFileSync(lp, 'utf8')) } catch { /* ignore */ } break }
const iconSets = look.iconSets ? path.resolve(project, look.iconSets) : undefined

let skip = {}
const skipFile = path.join(framesDir, '_lint-skip.json')
if (fs.existsSync(skipFile)) skip = JSON.parse(fs.readFileSync(skipFile, 'utf8')).skip ?? {}
const files = fs.readdirSync(framesDir).filter(f => f.endsWith('.json') && !f.startsWith('_')).sort()
let plan = null
if (planPath) { try { plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) } catch { /* ignore */ } }
const sceneOf = id => plan?.scenes?.find(s => (s.slideId ?? s.slide?.id) === id)

const out = []   // { level, frame, el, rule, msg }
const report = (level, frame, el, rule, msg) => out.push({ level, frame, el: el ?? '-', rule, msg })

// ---------------------------------------------------------------- per-frame model
const HIGHLIGHT_ID = /focus|ring|highlight|halo|spot/i
const CONNECTOR_TYPES = new Set(['line', 'arrow'])
const isRed = c => { if (!c) return false; const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim()); if (!m) return /^red$/i.test(c); const v = parseInt(m[1], 16), r = v >> 16, g = (v >> 8) & 255, b = v & 255; return r > 150 && g < 100 && b < 100 }
const SCREEN_ID = /^(title|section|step|chapter)(\b|-|_|\d)/i
// a frame whose only content is a `steps` list is a screen too: its lead line is allowed (D4, D16)
const isScreen = (frame, els) => SCREEN_ID.test(frame.id ?? '') || ['title', 'section', 'step'].includes(frame.kind ?? frame.screen ?? frame.role) || els.some(i => i.e.type === 'step') || (els.length > 0 && els.every(i => i.e.type === 'steps'))

function lintFrame(frame, file) {
  const fid = frame.id ?? file.replace(/\.json$/, '')
  const all = []
  const byId = new Map()
  const addEl = (e, b) => { const it = { id: e.id ?? `${e.type}@${all.length}`, e, b }; all.push(it); if (e.id) byId.set(e.id, e) }
  for (const e of frame.elements ?? []) addEl(e, -1)
  ;(frame.builds ?? []).forEach((bd, i) => (bd.elements ?? []).forEach(e => addEl(e, i)))
  const ctx = { byId }

  // unknown types
  for (const it of all) if (TYPES && !TYPES[it.e.type]) report('error', fid, it.id, 'unknown-type', `type "${it.e.type}"`)
  const known = all.filter(it => !TYPES || TYPES[it.e.type])
  for (const it of known) { try { it.g = bbox(it.e, ctx) } catch (err) { report('error', fid, it.id, 'render', `geometry failed: ${err.message}`); it.g = null } }
  const items = known.filter(it => it.g)

  // the kit's own render (catches exceptions; its warnings that no rule below covers)
  if (frameToSvg) {
    try {
      const r = frameToSvg(frame, { look, iconSets, warn: () => {} })
      const seen = new Set()
      for (const w of r.warnings) {
        const m = w.replace(/^[^:]*:\s*/, '')
        if (/labels in illustrations are 26 px or larger/.test(m) || /key phrase/.test(m) || seen.has(m)) continue
        seen.add(m); report('warn', fid, (/^[^/]*\/([^:]+):/.exec(m) ?? [])[1] ?? '-', 'kit-warning', m)
      }
    } catch (err) { report('error', fid, '-', 'render', err.message) }
  }

  // states: what is on screen together (the base, then after each build; `hide` removes elements)
  const nB = (frame.builds ?? []).length
  const states = []
  for (let k = -1; k < nB; k++) {
    const hidden = new Set((frame.builds ?? []).slice(0, k + 1).flatMap(b => b.hide ?? []))
    states.push(items.filter(it => it.b <= k && !hidden.has(it.id)))
  }
  const reported = new Set()
  const once = (level, el, rule, msg, key = `${rule}|${el}|${msg}`) => { if (reported.has(key)) return; reported.add(key); report(level, fid, el, rule, msg) }

  // ---- D1: text floor, box labels
  const floorSeen = new Set()
  for (const it of items) {
    for (const t of it.g.textBoxes) {
      const role = t.role ?? it.e.role
      const min = (role === 'axis' || role === 'source') ? 26 : 34
      if (t.size < min && !floorSeen.has(it.id)) { floorSeen.add(it.id); once('error', it.id, 'text-floor', `"${t.text.slice(0, 40)}" is ${t.size} px; the floor is ${min} px${min === 34 ? ' (26 px only with role "axis" or "source")' : ''}`) }
    }
  }
  // composites whose geometry reports no text boxes (relation drawings and the like): measure the kit's own SVG
  if (frameToSvg) for (const it of items.filter(i => !i.g.textBoxes.length && ['tagged', 'relate', 'transform', 'cycle', 'agent', 'chat', 'stats'].includes(i.e.type))) {
    if (floorSeen.has(it.id)) continue
    try {
      const svg = frameToSvg({ ...frame, elements: [it.e], builds: [] }, { look, iconSets, warn: () => {} }).svg
      const re = /font-size="([\d.]+)"[^>]*>([^<]*)</g
      let m
      while ((m = re.exec(svg))) {
        const size = parseFloat(m[1]), txt = m[2].trim()
        if (txt && size < 34) { floorSeen.add(it.id); once('error', it.id, 'text-floor', `"${txt.slice(0, 40)}" is ${size} px inside ${it.e.type}; the floor is 34 px`); break }
      }
    } catch { /* render errors are reported above */ }
  }
  // text with a box around it: own container (message, box) or a rect element that holds its centre
  const rects = items.filter(it => it.e.type === 'rect' && it.g.w > 0 && area(R(it.g)) < 1200000 && it.e.stroke !== null && !HIGHLIGHT_ID.test(`${it.id} ${it.e.role ?? ''}`))
  const holder = (t, own) => {
    if (t.within) return { box: t.within, id: own.id, own: true }
    const c = centre(TR(t)), cands = rects.filter(r => r.id !== own.id && pt(c, R(r.g)))
    if (!cands.length) return null
    const r = cands.sort((a, b) => area(R(a.g)) - area(R(b.g)))[0]
    return { box: R(r.g), id: r.id }
  }
  const padPairs = new Set()
  for (const it of items) {
    if (['chip'].includes(it.g.kind) || it.e.type === 'tool') continue
    const pads = []
    for (const t of it.g.textBoxes) {
      const h = holder(t, it)
      if (!h) continue
      const [x, y, w, hh] = h.box, tr = TR(t)
      const pad = Math.min(tr[0] - x, x + w - (tr[0] + tr[2]), tr[1] - y, y + hh - (tr[1] + tr[3]))
      pads.push(pad)
      if (pad < 27.5 && !(it.e.type === 'message' && !it.g.single && pad > 24)) { padPairs.add(`${it.id}|${h.id}`); once('error', it.id, 'text-padding', `"${t.text.slice(0, 40)}" is ${num(pad)} px from the border of ${h.own ? 'its box' : `"${h.id}"`}; keep 28 px or more and centre a single label`) }
      if (it.e.type === 'message') { if (it.g.single && !it.e.agent) once('warn', it.id, 'label-size', `message holding one label "${t.text.slice(0, 40)}" at ${t.size} px; a labelled box is \`box\` (centred both ways, 40-56 px, 28 px clear); \`message\` is for chat text`) }
      else if ((t.size < 40 && ['text', 'lines'].includes(it.e.type)) || (t.label && t.size < 40)) once('warn', it.id, 'label-size', `label "${t.text.slice(0, 40)}" is ${t.size} px in a box; labels in boxes are 40 px or more`)
    }
  }
  // older kits drew the agent window's tab above the window (x+22..x+218, y-48..y+8); a label there was covered. The current kit draws the tab in the bar.
  for (const a of items.filter(i => i.e.type === 'agent')) {
    const zone = [a.e.x + 22, a.e.y - 48, 196, 56]
    for (const o of items) if (o !== a) for (const t of o.g.textBoxes) if (hit(zone, TR(t)) && !hit(R(a.g), TR(t))) once('warn', o.id, 'overlap', `"${t.text.slice(0, 32)}" sits where the agent window "${a.id}" drew its tab in kits before 13 Nov 2026 (it covered the label); the current kit puts the tab inside the title bar, so copy the new kit`, `tab|${a.id}|${o.id}`)
  }

  // ---- D3 + D7: overlaps, edges, connectors, per state
  for (const st of states) {
    for (const A of st) {
      for (const B of st) {
        if (A === B) continue
        // A's solid shapes (not boxes that hold text, not scenery) against B's text
        for (const T of B.g.textBoxes) {
          const tr = inset(TR(T), 2)
          for (const S of A.g.solids) {
            if (hit(inset(S, 3), tr) && !(A.g.kind === 'text' && B.g.kind === 'text' && A.id === B.id)) once('error', A.id, 'overlap', `runs into the text "${T.text.slice(0, 32)}" of "${B.id}"`, `ov|${[A.id, B.id].sort().join('|')}`)
          }
          // box / window / highlight edges
          if (['container', 'highlight'].includes(A.g.kind) && A.g.w > 0 && !(A.g.w >= 1800 && A.g.h >= 1000) && !(A.e.type === 'rect' && A.e.stroke === null)) {
            const box = A.g.ring ?? R(A.g)
            if (hit(box, tr) && !inside(tr, box, 4) && !inside(box, tr, 0) && !padPairs.has(`${B.id}|${A.id}`)) once('error', A.id, 'edge-crosses-text', `its edge cuts through the text "${T.text.slice(0, 32)}" of "${B.id}"`, `ed|${A.id}|${B.id}`)
          }
        }
      }
      // connectors: clearance of other elements' text and icons
      if (A.g.segs.length && A.e.type !== 'tool') {
        for (const B of st) {
          if (B === A) continue
          const boxes = [...B.g.textBoxes.map(t => ({ b: TR(t), what: `"${t.text.slice(0, 28)}"` })), ...(B.g.kind === 'icon' ? [{ b: R(B.g), what: 'an icon' }] : [])]
          for (const { b, what } of boxes) {
            let best = Infinity, endHit = false
            for (const s of A.g.segs) {
              const d = dSegRect(s, b)
              if (d < best) best = d
              if (pt([s[0], s[1]], inset(b, -24)) || pt([s[2], s[3]], inset(b, -24))) endHit = true
            }
            if (best < 16 && !endHit) once('error', B.id, 'connector-clearance', `${what} is ${num(best)} px from the connector "${A.id}"; a label sits beside it with 16 px or more clear`, `cc|${A.id}|${B.id}|${what}`)
          }
        }
      }
    }
  }

  // ---- D4: headings
  const screen = isScreen(frame, items)
  if (!screen) {
    const keyed = frame.key !== undefined && frame.key !== false && [].concat(frame.key).join('').trim()
    if (keyed) once('error', 'key', 'heading', `the key phrase "${[].concat(frame.key).join(' ').slice(0, 40)}" is a heading drawn top-left; set "key": false`)
    for (const it of items) {
      for (const t of it.g.textBoxes) {
        if (t.size >= 48 && t.y < 220 && !t.within && !holder(t, it) && !['container'].includes(it.g.kind)) once('error', it.id, 'heading', `"${t.text.slice(0, 40)}" is ${t.size} px in the top 220 px; no headings on screens (big text only on title, section and step screens)`)
      }
      if (it.e.type === 'rect' && it.g.h <= 14 && it.g.w <= 220 && it.g.y < 260) {
        const near = items.some(o => o !== it && o.g.textBoxes.some(t => t.size >= 48 && t.y >= it.g.y && t.y - (it.g.y + it.g.h) < 70 && t.x < it.g.x + it.g.w + 40 && t.x + t.w > it.g.x - 40))
        if (near) once('error', it.id, 'heading', 'a short bar above a heading')
      }
    }
  }

  // ---- D19: measure. Text never runs the full width of a wide screen (titles, step and quote text have their own caps).
  for (const it of items) {
    if (['step', 'steps', 'textblock', 'quote', 'stat', 'stats', 'cycle', 'box'].includes(it.e.type)) continue
    for (const t of it.g.textBoxes) if (t.w > 1400) { once('warn', it.id, 'measure', `"${t.text.slice(0, 40)}" is about ${num(t.w)} px wide; keep text to 1400 px (60-70 characters a line) and centre the block`); break }
  }

  // ---- D13 / D9 / D10: raw compositions
  const raw = (rule, els, msg) => { if (els.length) once('error', els[0].id, rule, `${msg}${els.length > 1 ? ` (${els.length} elements: ${els.slice(0, 4).map(x => x.id).join(', ')}${els.length > 4 ? ', ...' : ''})` : ''}`, `${rule}|${fid}`) }
  const ringEls = items.filter(it => ['rect', 'circle'].includes(it.e.type) && it.g.outline && HIGHLIGHT_ID.test(`${it.id} ${it.e.role ?? ''}`))
  raw('raw-highlight', ringEls, 'a no-fill rect used as a highlight; use the `focus` element (orange wash plus 4 px outline, radius 24, 24 px clear)')
  for (const r of ringEls.slice(0, 40)) {
    const box = R(r.g), best = items.filter(o => o !== r && !HIGHLIGHT_ID.test(o.id) && o.g.w > 0 && o.g.kind !== 'scenery' && !(o.e.type === 'rect' && o.g.outline) && inside(R(o.g), inset(box, -1)) && !(o.g.kind === 'connector')).map(o => {
      const b = R(o.g); return { o, d: Math.min(b[0] - box[0], box[0] + box[2] - (b[0] + b[2]), b[1] - box[1], box[1] + box[3] - (b[1] + b[3])) }
    }).sort((a, b) => a.d - b.d)[0]
    if (best && best.d < 24) { once('error', r.id, 'highlight-clearance', `highlight edge is ${num(best.d)} px from "${best.o.id}"; keep 24 px or more clear on every side`, `hc|${fid}`); break }
  }
  const QUOTE_START = /^\s*["“”‘„«]/, QUOTE_END = /["”’»]\s*$/
  const quoteEls = items.filter(it => it.e.type !== 'quote' && ((['text', 'lines'].includes(it.e.type) && ((it.g.textBoxes.some(t => QUOTE_START.test(t.text) || (QUOTE_END.test(t.text) && QUOTE_START.test(it.g.textBoxes[0]?.text ?? ''))))) || /(^|[-_ ])quote([-_ ]|$)/i.test(`${it.id} ${it.e.role ?? ''}`)) && ['text', 'lines', 'rect', 'icon'].includes(it.e.type)))
  const quoteIcon = items.filter(it => it.e.type === 'icon' && /^(book-open|book|quote|quote-left|quotes|message-square-quote|text-quote)$/i.test(String(it.e.icon).replace(/^[a-z]+:/, '')) && items.some(o => ['text', 'lines'].includes(o.e.type) && (/quote/i.test(o.id) || o.g.textBoxes.some(t => QUOTE_START.test(t.text)))))
  raw('raw-quote', [...quoteEls, ...quoteIcon.filter(q => !quoteEls.includes(q))], 'quote drawn from raw text/icons (a book-open or quote icon beside quoted text); use the `quote` element')
  // polyline: line/arrow segments that share an end and turn
  const cons = items.filter(it => CONNECTOR_TYPES.has(it.e.type))
  const poly = new Set()
  for (let i = 0; i < cons.length; i++) for (let j = i + 1; j < cons.length; j++) {
    const a = cons[i].g.segs[0], b = cons[j].g.segs[0]
    const ends = [[[a[0], a[1]], [a[2], a[3]]], [[b[0], b[1]], [b[2], b[3]]]]
    for (const ea of [0, 1]) for (const eb of [0, 1]) {
      const pa = ends[0][ea], pb = ends[1][eb]
      if (Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) <= 8) {
        const va = [ends[0][1 - ea][0] - pa[0], ends[0][1 - ea][1] - pa[1]], vb = [ends[1][1 - eb][0] - pb[0], ends[1][1 - eb][1] - pb[1]]
        const cos = (va[0] * vb[0] + va[1] * vb[1]) / ((Math.hypot(...va) * Math.hypot(...vb)) || 1)
        if (cos > -0.94) { poly.add(cons[i]); poly.add(cons[j]) }
      }
    }
  }
  raw('raw-polyline', [...poly], 'lines and arrows chained into a polyline; a cycle\'s return is one curved path: use `cycle` (or a single straight connector)')
  // D8
  for (const it of cons) {
    const c = it.g.connector, s = it.g.segs[0], dx = Math.abs(s[2] - s[0]), dy = Math.abs(s[3] - s[1]), len = Math.hypot(dx, dy)
    const why = []
    if (isRed(c.color)) why.push('red')
    if (c.sw > 6) why.push(`${c.sw} px wide`)
    if (dx > 12 && dy > 12 && len > 120) why.push(`diagonal and ${num(len)} px long`)
    if (why.length) once('error', it.id, 'arrow-style', `${why.join(', ')}; pointers are 4 px, ink or the accent, curved when diagonal: use \`pointer\``)
    if (c.dash) once('warn', it.id, 'arrow-dashed', 'dashed connector; only a tool call is dashed')
  }
  for (const it of items.filter(i => i.e.type === 'pointer')) if (isRed(it.e.color)) once('error', it.id, 'arrow-style', 'pointer in red; use ink or the accent')

  // ---- D9: highlight sequence (kit `focus` and raw rings), with times from plan.json when known
  const hl = []
  ;(frame.builds ?? []).forEach((bd, i) => {
    for (const e of bd.elements ?? []) {
      const it = items.find(x => x.e === e)
      if (!it) continue
      if (e.type === 'focus' || (it.g.outline && HIGHLIGHT_ID.test(`${it.id} ${e.role ?? ''}`) && ['rect', 'circle'].includes(e.type))) {
        const tg = e.type === 'focus' ? (it.g.target ?? [0, 0, 0, 0]) : R(it.g)
        hl.push({ i, id: it.id, key: tg.map(v => Math.round(v / 6)).join(','), t: buildTime(frame, bd, i) })
        break
      }
    }
  })
  for (let k = 1; k < hl.length; k++) {
    if (hl[k].key === hl[k - 1].key) once('warn', hl[k].id, 'focus-repeat', `highlights the same target as "${hl[k - 1].id}" again; never re-highlight the target already highlighted`)
    if (hl[k].t != null && hl[k - 1].t != null && hl[k].t - hl[k - 1].t < 2) once('warn', hl[k].id, 'focus-fast', `${(hl[k].t - hl[k - 1].t).toFixed(1)} s after the previous highlight; at most one change every 2 s`)
  }
  const final = states[states.length - 1] ?? []
  const contentOf = st => st.filter(it => isContent(it))
  const focusEls = final.filter(it => it.e.type === 'focus')
  if (focusEls.length) {
    const content = contentOf(final)
    for (const f of focusEls) {
      const tid = typeof f.e.target === 'string' ? f.e.target : null
      // a region [x, y, w, h] picks out part of a screenshot or picture: fine unless it covers most of the only element
      const region = Array.isArray(f.e.target) && content.length === 1 && f.e.target[2] * f.e.target[3] < 0.7 * content[0].g.w * content[0].g.h
      if (content.length <= 1 && !region && (!tid || content.some(c => c.id === tid))) once('warn', f.id, 'focus-only', 'highlights the only content element on the screen')
    }
  }

  // ---- N49: how much is on screen at once
  let maxN = 0, maxAt = 0
  states.forEach((st, k) => { const n = countContent(st); if (n > maxN) { maxN = n; maxAt = k } })
  if (maxN > 5) once('warn', '-', 'too-many', `${maxN} content elements on screen at once${maxAt >= 0 ? ` (after build ${maxAt + 1})` : ''}; about five at most, then a new screen`)

  // ---- D5: relationship drawings of facts
  const seenRel = new Set()
  for (const it of items.filter(i => ['tagged', 'relate', 'transform'].includes(i.e.type))) {
    const key = JSON.stringify({ ...it.e, id: undefined, parts: undefined })
    if (seenRel.has(key)) continue
    seenRel.add(key)
    const strs = relStrings(it.e)
    if (strs.length && strs.every(isFact)) once('warn', it.id, 'relation-facts', `every card and tag is a name, organisation or date (${strs.slice(0, 4).join('; ')}); facts about who, when and where are plain text (\`textblock\`)`)
  }
}

// ---------------------------------------------------------------- helpers for the checks
const FACT_MONTH = /\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\b/i
const isDate = s => /\b(19|20)\d{2}\b/.test(s) || (FACT_MONTH.test(s) && /\d/.test(s))
const WORD = /^\p{Lu}[\p{L}'’.-]*$/u
const isName = s => { const t = s.trim().split(/\s+/); return t.length >= 2 && t.every(w => WORD.test(w) || /^(of|the|and|for|de|van|von|der|&)$/i.test(w)) || /^\p{Lu}{2,6}(\s+\p{Lu}{2,6})*$/u.test(s.trim()) }
const isFact = s => isDate(s) || isName(s)
function relStrings(e) {
  const s = []
  const add = v => { if (typeof v === 'string' && v.trim()) s.push(v.trim()) }
  if (e.type === 'tagged') for (const c of e.cards ?? []) { add(c.name); add(c.caption); add(c.badge?.text); for (const t of c.tags ?? []) add(t.text) }
  if (e.type === 'relate') for (const r of e.rows ?? []) { add(r.subject?.name); add(r.subject?.caption); add(r.result?.label); add(r.result?.caption) }
  if (e.type === 'transform') { add(e.actor?.name); add(e.actor?.caption); add(e.input?.label); add(e.output?.label) }
  return s
}
const SCENERY_OR_MARK = new Set(['floor', 'plant', 'window', 'clock', 'picture', 'desk', 'table', 'keyboard', 'monitor', 'headset', 'stress', 'person', 'crowd'])
function isContent(it) {
  const t = it.e.type
  if (SCENERY_OR_MARK.has(t) || ['rect', 'circle', 'line', 'arrow', 'icon', 'badge', 'agentMark', 'focus', 'pointer', 'tool', 'lens', 'pen', 'thought'].includes(t)) return false
  return true
}
function countContent(st) {
  let n = 0
  const texts = []
  const rel = new Set()
  for (const it of st) {
    const t = it.e.type
    if (t === 'text' || t === 'lines') { texts.push(it); continue }
    if (!isContent(it)) continue
    const key = JSON.stringify({ ...it.e, id: undefined, parts: undefined, motion: undefined })   // one spec in pieces (parts) is one element
    if (rel.has(key)) continue
    rel.add(key)
    n += t === 'cycle' ? (it.e.nodes ?? []).length : t === 'stats' ? (it.e.items ?? []).length : 1
  }
  // text lines of one paragraph (same x and size, next line within 1.7 sizes) count once
  const tx = texts.flatMap(it => it.g.textBoxes.map(b => ({ b, it }))).sort((a, b) => a.b.y - b.b.y)
  const groups = []
  for (const x of tx) {
    const g = groups.find(g => Math.abs(g.ax - x.b.ax) < 6 && g.size === x.b.size && x.b.base - g.base <= x.b.size * 1.7 && x.b.base >= g.base)
    if (g) g.base = x.b.base; else groups.push({ ax: x.b.ax, size: x.b.size, base: x.b.base })
  }
  // a short text on a box (label inside a rect) is the box's label, not a second element
  return n + groups.filter(g => !st.some(it => it.e.type === 'rect' && it.g.w > 0 && g.ax >= it.g.x && g.ax <= it.g.x + it.g.w && g.base >= it.g.y && g.base <= it.g.y + it.g.h)).length
}
function buildTime(frame, bd, i) {
  const sc = sceneOf(frame.id)
  if (bd.at != null) return bd.at
  if (!sc) return null
  const u = (sc.units ?? []).find(x => String(x.text).toLowerCase() === String(bd.cue ?? '').toLowerCase())
  return u?.t != null ? u.t - sc.start : null
}

// ---------------------------------------------------------------- run
const skipped = []
let nFrames = 0
for (const f of files) {
  if (skip[f]) { skipped.push([f, skip[f]]); continue }
  let frame
  try { frame = JSON.parse(fs.readFileSync(path.join(framesDir, f), 'utf8')) } catch (err) { report('error', f.replace(/\.json$/, ''), '-', 'bad-json', err.message); continue }
  nFrames++
  lintFrame(frame, f)
}
out.sort((a, b) => a.frame.localeCompare(b.frame, 'en', { numeric: true }) || (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1))
for (const o of out) { const r = RULES[o.rule] ?? ['', '', '']; const tags = [r[0], r[1]].filter(Boolean).join(' '); console.log(`${o.level.padEnd(5)}  ${o.frame}  ${o.el}  ${o.rule}${tags ? ` (${tags})` : ''}: ${o.msg}`) }
for (const [f, why] of skipped) console.log(`skip   ${f}  (${why})`)
const counts = {}
for (const o of out) { const k = `${o.level} ${o.rule}`; counts[k] = (counts[k] ?? 0) + 1 }
const nErr = out.filter(o => o.level === 'error').length, nWarn = out.length - nErr
console.log(`\nchecked ${nFrames} frames${skipped.length ? ` (${skipped.length} skipped as legacy)` : ''}: ${nErr} errors, ${nWarn} warnings${plan ? '' : '; no plan.json, so highlight timing was not checked'}`)
for (const [k, v] of Object.entries(counts).sort()) console.log(`  ${String(v).padStart(4)}  ${k}`)
console.log(`rules checked: ${Object.keys(RULES).filter(k => !['bad-json', 'render', 'unknown-type', 'kit-warning'].includes(k)).join(', ')}`)
process.exit(nErr ? 1 : 0)
