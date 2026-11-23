// Frame JSON -> SVG. A frame is one illustrated picture (1920x1080) with a key phrase, base elements and build groups.
//
//   { "id": "s01-search", "scene": "Search", "key": "A person types a query",       key phrase, <= 9 words, top-left, drawn by the kit
//     "narration": "...", "motion": "what moves, for the storyboard page",         storyboard text only
//     "elements": [ { "type": "floor" }, { "type": "person", "id": "me", "who": "main", "pose": "think", "x": 300, "y": 936 } ],
//     "builds": [ { "cue": "types a query", "motion": "pop", "elements": [ { "type": "searchBox", ... } ], "hide": ["id"], "dim": { "id": 0.45 } } ] }
//
//   elements   drawn from the start (the base)
//   builds     one per spoken moment, in order: `cue` = the words that trigger it (matched to the speech, like any outline bullet);
//              `at` = seconds from the scene start, a hand time that wins over the speech match (optional);
//              `elements` arrive together at the cue; `hide` ids fade out at the cue (a state swapped for the next); `dim` {id: opacity}.
//   motion     per build or per element: rise (default) | fade | pop | slide:dx,dy[,sec] | move:dx,dy | wipe:r|l|d|u[,sec]. Every one has a job:
//              pop = an object arrives, slide = travel that shows a sequence, wipe = a line / arrow / drawer fills in along its direction.
//
// Element types: see TYPES below (people, props, logos, relationships, text, shapes). Coordinates are absolute on the 1920x1080 frame.
// Relationships (N87, N88): `transform`, `relate`, `tagged` draw what a sentence links (fields: _draw.mjs above each function). Each element
//   draws the `parts` it names (default all) from a layout computed on the whole spec, so a relationship is split over cues by repeating
//   the same spec with different `parts` and ids: e.g. base { type: "transform", id: "t-in", parts: ["input"], ...spec }, then a build at
//   the verb with { ...spec, id: "t-verb", parts: ["node", "verb"] } and one at the output noun with parts ["output"]. splitRelation() does this.
//   Which form, and which items belong together, is decided by reading the sentence and written into the frame; never inferred from counts.
import * as D from './_draw.mjs'
import * as C from './_cast.mjs'
import * as G from './_geom.mjs'

const P = (o, k, d) => (o[k] ?? d)
const pt = (v, d) => (Array.isArray(v) ? v : d)

// type -> (element, id) => svg string. `id` is the element's id (inner ids are derived from it).
export const TYPES = {
  // scenery
  floor: (e) => D.floor(P(e, 'y', D.FLOOR), P(e, 'x1', 0), P(e, 'x2', 1920)),
  plant: (e) => D.plant(e.x, e.y ?? D.FLOOR, P(e, 's', 1)),
  window: (e) => D.wallWindow(e.x, e.y, e.w ?? 260, e.h ?? 320),
  clock: (e) => D.wallClock(e.x, e.y, P(e, 'r', 46)),
  picture: (e) => D.picture(e.x, e.y, e.w ?? 200, e.h ?? 140),
  desk: (e) => D.deskFront(e.x1, e.x2, e.y, P(e, 'floorY', D.FLOOR)),
  table: (e) => D.tableTop(e.x1, e.x2, e.y, P(e, 'floorY', D.FLOOR)),
  keyboard: (e) => D.keyboardFront(e.x, e.y, P(e, 'w', 210)),
  monitor: (e, id) => D.monitorFront(id + '-m', e.x, e.y, e.w, e.h, P(e, 'ground', e.y + e.h + 60), P(e, 'title', '')),
  headset: (e) => D.headset(e.x, e.y, P(e, 's', 1)),
  stress: (e) => D.stress(e.x, e.y, P(e, 's', 1)),
  // people (x, y = the floor point under the person; seated: y = floor, `desk` = y of the desk top)
  person: (e, id) => C.person(id + '-fig', e.x, e.y ?? D.FLOOR - 4, { pose: P(e, 'pose', 'stand'), s: P(e, 's', 1), who: P(e, 'who', 'main'), mood: P(e, 'mood', 'neutral'), look: P(e, 'look', 0), flip: !!e.flip, walk: P(e, 'walk', 0), seated: e.seated, desk: e.desk, L: e.L, R: e.R, hands: e.hands, elbow: e.elbow, chair: e.chair }),
  crowd: (e, id) => C.extraRow(id + '-row', e.x, e.y ?? D.FLOOR - 4, P(e, 's', 0.8), e.who ?? ['xa', 'xb', 'xc'], P(e, 'gap', 200)),
  // speech and thought
  bubble: (e, id) => D.bubble(id + '-shape', e.x, e.y, e.w, e.h, e.tail ?? null, P(e, 'fill', D.PAPER), e.dash ?? null) + (e.mark ? D.agentMark(e.x + e.w / 2, e.y + e.h / 2 - 8, P(e, 'markR', 40)) + D.bubbleDots(e.x + e.w / 2 - 24, e.y + e.h - 28) : '') + (e.rows ? D.lines(e.x + 28, e.y + 28 + P(e, 'size', 30), e.rows, P(e, 'size', 30), Math.round(P(e, 'size', 30) * 1.3)) : ''),
  thought: (e, id) => D.thought(id + '-shape', e.x, e.y, e.w, e.h, e.tail),
  // the agent system
  agent: (e, id) => D.agentWindow(id + '-win', e.x, e.y, e.w, e.h, { title: P(e, 'title', ''), trayH: P(e, 'tray', 0), trayLabel: P(e, 'trayLabel', "Model's context"), chatbot: !!e.chatbot }),
  tray: (e, id) => D.tray(id + '-tray', e.x, e.y, e.w, e.h, P(e, 'label', "Model's context")),
  tool: (e, id) => D.toolArrow(id + '-arrow', ...pt(e.from, [0, 0]), ...pt(e.to, [0, 0]), { label: e.label, ic: e.icon, lx: e.labelAt?.[0], ly: e.labelAt?.[1] }),
  message: (e) => D.chatMsg(e.x, e.y, e.w, e.h, [].concat(e.rows ?? e.text ?? ''), P(e, 'size', 34), e.agent ? D.GT : D.PAPER, e.agent ? D.GREEN : D.INK),
  // documents and records
  page: (e, id) => D.page(id + '-p', e.x, e.y, e.w ?? 200, e.h ?? 260, e),
  slip: (e, id) => D.slip(id + '-s', e.x, e.y, e.w ?? 420, e.h ?? 260, e.name ?? 'file.txt', e),
  filename: (e, id) => D.filename(id + '-f', e.x, e.y, e.label ?? e.name ?? 'file.pdf', e),
  stack: (e, id) => D.stack(id + '-st', e.x, e.y, e.w ?? 170, e.h ?? 230, P(e, 'n', 3), e),
  folder: (e) => D.folder(e.x, e.y, e.w ?? 220, e.h ?? 160, e.label ?? null),
  envelope: (e) => D.envelope(e.x, e.y, P(e, 'w', 120), P(e, 'h', 84)),
  receipt: (e) => D.receipt(e.x, e.y, P(e, 'w', 100), P(e, 'h', 150), P(e, 'rot', 0)),
  sheet: (e, id) => D.sheetCard(id + '-sh', e.x, e.y, e.w ?? 460, e.h ?? 300, e.title ?? 'Instructions', e.rows ?? e.sub ?? ['']),
  cabinets: (e, id) => D.bank(id + '-bank', e.x, e.y, { ...e, tabs: e.tabs ?? {} }),
  searchBox: (e, id) => D.searchBox(id + '-sb', e.x, e.y, P(e, 'w', 760), P(e, 'h', 96), e.query ?? '', e),
  inbox: (e, id) => D.inbox(id + '-in', e.x, e.y, P(e, 'w', 760), P(e, 'h', 520), e),
  chart: (e, id) => D.chartFrame(id + '-ch', e.x, e.y, e.w ?? 1100, e.h ?? 640, e),
  ladder: (e, id) => D.laddered(id + '-lad', e.x, P(e, 'ytop', 220), P(e, 'ybot', D.FLOOR), P(e, 'w', 290), e.labels ?? ['One', 'Two', 'Three', 'Four'], P(e, 'at', 1)),
  // marks and small things
  logo: (e) => D.logo(e.logo ?? e.icon, e.x, e.y, P(e, 'size', 120), e.name),
  logoCard: (e, id) => D.logoCard(id + '-c', e.x, e.y, { logo: e.logo ?? e.icon, name: e.name }, e),
  logoRow: (e, id) => D.logoRow(id + '-row', e.x, e.y, e.items ?? [], e),
  icon: (e) => D.icon(e.icon, e.x, e.y, P(e, 'size', 64), e.color ?? D.INK, P(e, 'sw', 2)),
  lens: (e) => D.lens(e.x, e.y, P(e, 'r', 34)),
  pen: (e) => D.pen(e.x, e.y, P(e, 'angle', -35), P(e, 'len', 70)),
  book: (e, id) => D.book(id + '-b', e.x, e.y, P(e, 'w', 86), P(e, 'h', 58)),
  badge: (e) => D.numBadge(e.x, e.y, e.n ?? 1, P(e, 'r', 24)),
  agentMark: (e) => D.agentMark(e.x, e.y, P(e, 'r', 22)),
  // relationships (N87, N88): what a sentence links, drawn as the link. Each takes `parts` so one relationship can arrive over several cues.
  transform: (e, id) => D.transform(id + '-tf', e),   // input as it looks -> verb node (actor's mark or AI spark) -> output as it looks; first choice
  relate: (e, id) => D.relate(id + '-rl', e),         // subject card -> verb pill on an arrow -> result card, one row per subject; "X does Y"
  tagged: (e, id) => D.tagged(id + '-tg', e),         // card + caption (is) + tags / corner badge (has); with no tags, a peer row that fits one view
  // house elements (D1-D13): drawn from kit geometry, no title/kicker/footer. See _draw.mjs above each function for the fields; `parts` splits one over cues.
  box: (e, id) => D.boxEl(id + '-bx', e),                         // {x,y,w,h,text,icon?,tone?}  labelled box, label centred and auto-fitted 40-56 px
  quote: (e, id) => D.quoteEl(id + '-q', e),                      // {text,source,date?,figure?,x?,y?,w?}  parts: mark text source figure
  stat: (e, id) => D.statEl(id + '-s', e),                        // {value,label,x,y}  x = centre
  stats: (e, id) => D.statEl(id + '-s', e),                       // {items:[{value,label}] (up to 4),x?,y?,w?}  parts: value:i label:i
  step: (e, id) => D.stepEl(id + '-st', e),                       // {n?,of?,text,accent?,sub?,picture?}  full-screen step card  parts: num text sub picture
  steps: (e, id) => D.stepsEl(id + '-ss', e),                     // {lead?,items:[{label,thumb?|icon?}]} up to 6  parts: lead item:i
  textblock: (e, id) => D.textblockEl(id + '-tb', e),             // {lines:[{text,size?,color?}],align?,x?,y?,picture?}  parts: text picture
  cycle: (e, id) => D.cycleEl(id + '-cy', e),                     // {nodes:[{label,icon}],returnLabel?,x?,y?,w?}  parts: node:i step:i return label
  focus: (e, id, cx) => D.focusEl(id + '-f', e, cx.target(e.target)),   // {target: id | [x,y,w,h], pad?}  the one highlight style
  pointer: (e, id, cx) => D.pointerEl(id + '-pt', e, typeof e.to === 'string' ? cx.target(e.to) : null),   // {from:[x,y],to:id|[x,y],label?,color?}
  chat: (e, id) => D.chatEl(id + '-ch', e),                       // {messages:[{who:"user"|"agent",text,kind?}],title?,x,y,w,h}  parts: frame msg:i
  // text and shapes
  text: (e) => D.text(e.x, e.y, e.text ?? '', P(e, 'size', 32), P(e, 'weight', 400), e.color ?? D.INK, P(e, 'anchor', 'start')),
  lines: (e) => D.lines(e.x, e.y, e.rows ?? [], P(e, 'size', 32), e.step ?? null, P(e, 'weight', 400), e.color ?? D.INK, P(e, 'anchor', 'start')),
  chip: (e) => D.chip(e.x, e.y, e.text ?? '', P(e, 'size', 26), { ic: e.icon, w: e.w, h: e.h, fill: e.green ? D.GT : D.PAPER, stroke: e.green ? D.GREEN : D.INK, tcolor: e.green ? D.GREEN : D.INK, weight: P(e, 'weight', 400) }),
  tag: (e) => D.chip(P(e, 'x', 1500), P(e, 'y', 40), e.text ?? 'Illustrative example', 26, { fill: D.GT, stroke: D.GREEN }),   // a small green label, e.g. top right on a worked example
  rect: (e) => D.rect(e.x, e.y, e.w, e.h, P(e, 'r', 0), e.fill ?? 'none', e.stroke === null ? null : (e.stroke ?? D.INK), P(e, 'sw', D.SW)),
  circle: (e) => D.circle(e.x, e.y, e.r, e.fill ?? 'none', e.stroke === null ? null : (e.stroke ?? D.INK), P(e, 'sw', D.SW)),
  line: (e) => D.line(e.x1, e.y1, e.x2, e.y2, e.color ?? D.INK, P(e, 'sw', D.SW), e.dash ?? null),
  arrow: (e) => D.arrow(e.x1, e.y1, e.x2, e.y2, e.color ?? D.INK, P(e, 'sw', D.SW), 16, e.dash ?? null),
  // an external picture (screenshot, the talk's chart PNG, a widget still): path relative to the project, kept as an <image>
  image: (e) => `<image href="${String(e.src).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" x="${e.x ?? 0}" y="${e.y ?? 0}" width="${e.w ?? 1920}" height="${e.h ?? 1080}" preserveAspectRatio="xMidYMid meet"/>`
}

// splitRelation(spec, groups): one element per group of part names (same spec, ids `${spec.id}-<n>`), ready to put in builds.
//   groups = [["card:0"], ["caption:0", "badge:0"], ...]; every part is drawn once only if the groups cover relationParts(spec) once.
export const relationParts = D.relationParts
//   Warns (warn, default console.warn) when a part is drawn by two groups or by none.
export function splitRelation(spec, groups, warn = m => console.warn('warn ' + m)) {
  const all = D.relationParts(spec), count = new Map(all.map(p => [p, 0]))
  for (const g of groups) for (const p of D.matchParts(spec, g)) count.set(p, (count.get(p) ?? 0) + 1)
  const twice = all.filter(p => count.get(p) > 1), never = all.filter(p => !count.get(p))
  if (twice.length) warn(`splitRelation ${spec.id ?? spec.type}: drawn more than once: ${twice.join(', ')}`)
  if (never.length) warn(`splitRelation ${spec.id ?? spec.type}: never drawn: ${never.join(', ')}`)
  return groups.map((parts, i) => ({ ...spec, id: `${spec.id ?? spec.type}-${i}`, parts }))
}

// a motion an element type has unless it or its build names one: a highlight fades in
export const DEFAULT_MOTION = { focus: 'fade' }
const MOTIONS = new Set(['rise', 'fade', 'pop', 'slide', 'move', 'wipe', 'turn'])
const nWords = s => String(s ?? '').trim().split(/\s+/).filter(Boolean).length

// frame -> { svg, inner, base: [ids], builds: [{ cue, at, items: [{id, motion}], hide, dim }], warnings }
//   opts.prefix  put before every id (the template passes the scene id); opts.look palette; opts.iconSets / opts.warn
export function frameToSvg(frame, opts = {}) {
  const warnings = []
  const warn = m => { warnings.push(`${frame.id ?? 'frame'}: ${m}`); opts.warn?.(`${frame.id ?? 'frame'}: ${m}`) }
  D.setPalette(opts.look ?? {})
  D.ctxState.warn = warn
  D.ctxState.icons = { dir: opts.iconSets, look: opts.look }
  D.ctxState.marks = 0
  const prefix = opts.prefix ?? ''
  const seen = new Set()
  let auto = 0
  // element lookup for `focus` / `pointer` targets: any element of this frame, base or builds, by id
  const byId = new Map()
  for (const e of frame.elements ?? []) if (e.id) byId.set(e.id, e)
  for (const b of frame.builds ?? []) for (const e of b.elements ?? []) if (e.id) byId.set(e.id, e)
  const cx = { target: t => (Array.isArray(t) ? t : G.resolveTarget(t, { byId })) }
  const draw = (e, where) => {
    if (!TYPES[e.type]) throw new Error(`${frame.id}: unknown element type "${e.type}" in ${where} (use ${Object.keys(TYPES).join(', ')})`)
    const id = e.id ?? `${e.type}-${++auto}`
    if (seen.has(id)) throw new Error(`${frame.id}: duplicate element id "${id}"`)
    seen.add(id)
    let body
    D.ctxState.el = `${frame.id ?? 'frame'}/${id}`
    try { body = TYPES[e.type](e, id, cx).replace(/^<g id="(floor|plant|window|clock|stress-marks)"/, `<g id="${id}-in"`) } catch (err) { throw new Error(`${frame.id}: element "${id}" (${e.type}): ${err.message}`) }
    // highlights may sit over other elements: tell the HyperFrames layout check (12 Nov, ALT AGM project)
    return { id, svg: `<g id="${id}"${e.type === 'focus' || id.includes('picture-focus-') ? ' data-layout-allow-overlap="true"' : ''}>${body}</g>` }
  }
  const keyLines = frame.key === false ? [] : [].concat(frame.key ?? [])
  const words = nWords(keyLines.join(' '))
  if (words > 9) warn(`key phrase is ${words} words; at most 9`)
  if (!words && frame.key !== false) warn('no key phrase (N35: one key phrase per frame, top-left)')
  let inner = ''
  const base = []
  const baseSvg = (frame.elements ?? []).map(e => { const d = draw(e, 'elements'); base.push(d.id); return d.svg }).join('')
  inner += `${frame.clipPictures ? '<defs><clipPath id="picture-clip"><rect x="80" y="100" width="1760" height="800"/></clipPath></defs>' : ''}<g id="base"${frame.clipPictures ? ' clip-path="url(#picture-clip)"' : ''}>${baseSvg}${keyLines.length ? D.key(keyLines) : ''}</g>`
  const builds = (frame.builds ?? []).map((b, i) => {
    if (b.motion && !MOTIONS.has(String(b.motion).split(':')[0])) throw new Error(`${frame.id}: build ${i + 1}: unknown motion "${b.motion}"`)
    const items = (b.elements ?? []).map(e => {
      const d = draw(e, `build ${i + 1}`)
      const mo = e.motion ?? DEFAULT_MOTION[e.type] ?? b.motion ?? 'rise'
      if (!MOTIONS.has(String(mo).split(':')[0])) throw new Error(`${frame.id}: element "${d.id}": unknown motion "${mo}"`)
      inner += d.svg.replace(`<g id="${d.id}"`, `<g id="${d.id}" class="build" data-build="${i + 1}"`)
      return { id: d.id, motion: mo }
    })
    for (const h of b.hide ?? []) if (![...seen].includes(h)) warn(`build ${i + 1} hides "${h}", which is not an element`)
    if (!b.cue && b.at == null) warn(`build ${i + 1} has no cue (words) and no at (seconds); it will be spread by the planner`)
    return { cue: b.cue ?? b.text ?? `build ${i + 1}`, at: b.at ?? null, items, hide: b.hide ?? [], dim: b.dim ?? {}, stagger: b.stagger ?? 0.14, zoom: b.zoom }
  })
  // ids a build hides or dims must exist
  for (const b of builds) for (const id of Object.keys(b.dim)) if (!seen.has(id)) warn(`dim names "${id}", which is not an element`)
  const pref = s => s.replace(/\bid="([^"]+)"/g, `id="${prefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`).replace(/(href="#)([^"]+)"/g, `$1${prefix}$2"`)
  inner = pref(inner)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1920 1080" width="1920" height="1080"><title>${(frame.id ?? '').replace(/&/g, '&amp;')}</title><rect id="${prefix}bg-paper" width="1920" height="1080" fill="${D.PAPER}"/>${inner}</svg>`
  // every id in a frame is unique: animation selectors address elements by id, and a duplicate would be moved twice. The build fails on any.
  const dup = duplicateIds(svg)
  if (dup.length) throw new Error(`${frame.id}: duplicate SVG ids ${dup.slice(0, 8).join(', ')}${dup.length > 8 ? ' …' : ''}`)
  return { svg, inner, base, builds, warnings, prefix }
}

// ids that occur more than once in an SVG string (the build fails on any)
export function duplicateIds(svg) {
  const n = new Map()
  for (const m of svg.matchAll(/\sid="([^"]+)"/g)) n.set(m[1], (n.get(m[1]) ?? 0) + 1)
  return [...n].filter(([, k]) => k > 1).map(([id]) => id)
}

// the settled picture: everything built, nothing hidden by a swap or dimmed (what the storyboard page shows). Hidden-by-swap
// elements are removed so a swapped state never overlaps its replacement.
export function frameStill(frame, opts = {}) {
  const r = frameToSvg(frame, { ...opts, prefix: '' })
  let svg = r.svg
  const hidden = new Set(r.builds.flatMap(b => b.hide))
  for (const id of hidden) svg = removeGroup(svg, id)
  for (const [id, op] of new Map(r.builds.flatMap(b => Object.entries(b.dim)))) svg = svg.replace(new RegExp(`<g id="${id}"`), `<g id="${id}" opacity="${op}"`)
  for (const b of [...new Map(r.builds.filter(b => b.zoom).map(b => [b.zoom.id, b])).values()]) { const z = zoomTransform(b.zoom); svg = svg.replace(`<g id="${b.zoom.id}"`, `<g transform="translate(${z.x} ${z.y}) scale(${z.scale})" id="${b.zoom.id}"`); }
  return { ...r, svg }
}
export function zoomTransform(z) { const scale = z.scale ?? 1; return { scale, x: 960 - scale * (z.cx ?? 960), y: 490 - scale * (z.cy ?? 490) }; }
function removeGroup(svg, id) {
  const open = svg.indexOf(`<g id="${id}"`)
  if (open < 0) return svg
  let depth = 0, i = open
  const re = /<g\b|<\/g>/g
  re.lastIndex = open
  let m
  while ((m = re.exec(svg))) {
    depth += m[0] === '</g>' ? -1 : 1
    if (depth === 0) { i = m.index + 4; break }
  }
  return svg.slice(0, open) + svg.slice(i)
}
