// Motion kit entry point. Plain ES module; no dependencies beyond what a HyperFrames project already loads
// (gsap 3.14.2 from the CDN; scene changes are GSAP moves, see transitions.mjs).
//
//   import { compose, resolveLayout, unitsFor, cleanCaptions, suggestMotion, defaultLook } from './templates/index.mjs'
//
//   const { html, warnings } = compose({ look, duration, audio: { src: 'audio/voice.m4a' }, scenes, captions })
//
// scene = { slide, start, end, builds, motion?, transition? }
// (the incoming scene's move starts at `start` and ends at start + its duration; builds never start before it ends)
//   slide      content object (see the header of each template file); slide.layout = an outline layout tag (see TAG_MAP) or template name
//   start,end  seconds on the output clock: the logged slide change and the next one
//   builds     one time per unit, in the order unitsFor(slide) lists them
//   motion     'calm' | 'standard' (default: suggestMotion(slide))
//   transition 'cut' | 'crossfade' | a key of TRANSITIONS ('push-left', ...) | { name, dur?, ...options of that style }
//              default: 'push-left' (N11, Dominik 2026-10-16); an inserted interlude crossfades; a slide that `continues` cuts

import { transition, TRANSITIONS } from './transitions.mjs'
import { resolveTitleModes, applyTitleMode, titleModeCss, sectionTabs } from './_kit.mjs'
import * as section from './section.mjs'
import * as statement from './statement.mjs'
import * as quote from './quote.mjs'
import * as list from './list.mjs'
import * as iconrow from './iconrow.mjs'
import * as equation from './equation.mjs'
import * as cycle from './cycle.mjs'
import * as timeline from './timeline.mjs'
import * as processTpl from './process.mjs'
import * as compare from './compare.mjs'
import * as cards from './cards.mjs'
import * as stats from './stats.mjs'
import * as code from './code.mjs'
import * as media from './media.mjs'
import * as table from './table.mjs'
import * as chart from './chart.mjs'
import * as chat from './chat.mjs'
import * as analogy from './analogy.mjs'
import * as illustration from './illustration.mjs'
import * as widget from './widget.mjs'
import { f, esc, wc } from './_kit.mjs'
import { kit } from './_kit.mjs'

export const TEMPLATES = { section, statement, quote, list, iconrow, equation, cycle, timeline, process: processTpl, compare, cards, stats, code, media, table, chart, chat, analogy, illustration, widget }
export { f, esc }
export { TITLE_MODES, TITLE_DY, resolveTitleModes, applyTitleMode, titleModeCss, sectionTabs } from './_kit.mjs'

// ---------------------------------------------------------------- look
export const defaultLook = {   // paper/ink/accent tokens from Dominik's talk decks; replace per project via look.json
  paper: '#fdfdfb', ink: '#101418', muted: '#5c6570', hairline: '#e3e2dc',
  accents: { green: '#0a7a5c', blue: '#0f4bd8', orange: '#c2410c', red: '#b42318' },
  tints: { green: '#e4f3ee', blue: '#e8eefc', orange: '#fcece3', red: '#fbe9e7' },
  // The renderer ignores system fonts. With no `fonts` entry, HyperFrames maps "Inter" to a bundled Google font at render
  // time (needs network once; cached). To use your own font, put the .ttf files in fonts/ and list them in look.json:
  //   "fonts": [{ "family": "My Font", "weight": 400, "src": "fonts/my-font-regular.ttf" }, { ... "weight": 700 ... }]
  //   "sans": "\"My Font\", Inter, sans-serif"
  // Never ship a font you are not licensed to redistribute (see references/hyperframes-setup.md).
  sans: 'Inter, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fonts: []
}

export function lookCss(look = defaultLook) {
  const L = { ...defaultLook, ...look, accents: { ...defaultLook.accents, ...look.accents }, tints: { ...defaultLook.tints, ...look.tints } }
  return L.fonts.map(x => `@font-face { font-family: "${x.family}"; font-weight: ${x.weight}; src: url("${x.src}") format("truetype"); }`).join('\n') + `
:root { --paper: ${L.paper}; --ink: ${L.ink}; --muted: ${L.muted}; --hairline: ${L.hairline};
${Object.entries(L.accents).map(([k, v]) => `  --${k}: ${v};`).join('\n')}
${Object.entries(L.tints).map(([k, v]) => `  --tint-${k}: ${v};`).join('\n')}
  --sans: ${L.sans}; --mono: ${L.mono}; }`
}

export const baseCss = `
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1920px; height: 1080px; overflow: hidden; background: var(--paper); }
body { font-family: var(--sans); color: var(--ink); }
#root { position: relative; width: 1920px; height: 1080px; background: var(--paper); }
.scene { position: absolute; inset: 0; width: 1920px; height: 1080px; background: var(--paper); overflow: hidden; }
.kicker { font-family: var(--mono); font-size: 26px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.topbar { position: absolute; left: 120px; right: 120px; top: 70px; }
.topbar.nk { top: 104px; }
.topbar.nk h2 { margin-top: 0; }
.topbar h2 { font-size: 62px; font-weight: 400; letter-spacing: 0; margin-top: 12px; line-height: 1.1; }
.rule { height: 3px; background: rgba(16,20,24,0.14); margin-top: 22px; transform-origin: left center; }
.hl { position: absolute; inset: 0; z-index: -1; opacity: 0; border-radius: inherit; background: var(--hlc, var(--tint-orange)); pointer-events: none; }
.ico { display: inline-flex; flex: none; width: 1em; height: 1em; }
.ico svg { width: 100%; height: 100%; }
/* captions live outside the scenes (shader transitions capture the scene DOM). Content stays above y=990. */
#captions { position: absolute; left: 0; right: 0; bottom: 34px; height: 80px; z-index: 50; pointer-events: none; }
.cap-line { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); max-width: 1760px; padding: 12px 32px; border-radius: 14px; background: rgba(16,20,24,0.88); color: #fff; font-size: 38px; line-height: 1.25; text-align: center; opacity: 0; white-space: nowrap; }
`

// ---------------------------------------------------------------- layout resolution
// Outline layout tag (the tags TalkWeaver uses; plain outlines may use them too) -> template + variant.
// exact:false means the template is a stand-in, not a drawing of that layout (report it).
const T = (layout, variant, exact = true) => ({ layout, variant, exact })
export const TAG_MAP = {
  statement: T('statement'), quote: T('quote'), 'image-quote': T('media', undefined, false),
  list: T('list'), numbered: T('list', 'numbers'), iconlist: T('list'), icons: T('list'), plainlist: T('list'), 'stmt-list': T('list'), links: T('list', undefined, false), logos: T('list', undefined, false), logolist: T('list', undefined, false),
  iconrow: T('iconrow'), 'icon-row': T('iconrow'), columns: T('iconrow', undefined, false), '2col': T('iconrow', undefined, false), '3col': T('iconrow', undefined, false),
  compare: T('compare'), contrast: T('compare', 'contrast'),
  equation: T('equation', 'pills'), 'equation=pills': T('equation', 'pills'), 'equation=circle': T('equation', 'circle'),
  cycle: T('cycle'),
  timeline: T('timeline'), timetable: T('timeline'), 'timeline-visual': T('timeline', undefined, false), sigmoid: T('timeline', undefined, false),
  process: T('process'), agenda: T('process'), steps: T('process'), flow: T('process'), stairs: T('process', 'stairs'),
  cards: T('cards'), grid: T('cards', undefined, false), smartart: T('cards', undefined, false), 'system-map': T('cards', undefined, false), mindmap: T('cards', undefined, false), conceptmap: T('cards', undefined, false),
  pyramid: T('list', undefined, false), orgchart: T('list', undefined, false), carousel: T('statement', undefined, false),
  stats: T('stats'),
  code: T('code', 'code'), terminal: T('code', 'terminal'), 'terminal-agent': T('code', 'terminal'), trace: T('code', 'trace'),
  media: T('media'), 'copy-visual': T('media'), 'image-claim': T('media'), 'image-grid': T('media'), imagegrid: T('media'), 'cta-screenshots': T('media'), 'list-visual': T('media', undefined, false),
  table: T('table'), chart: T('chart', 'bar'), barchart: T('chart', 'bar'), linechart: T('chart', 'line'), curve: T('chart', 'line'), piechart: T('cards', undefined, false),
  chat: T('chat'), 'chat-lanes': T('chat'),
  analogy: T('analogy'), interlude: T('analogy'),
  illustration: T('illustration'), illustrated: T('illustration'), frame: T('illustration'), storyboard: T('illustration'),
  widget: T('widget'), embed: T('widget'),
  title: T('section', 'title'), closing: T('section', 'closing'), section: T('section', 'section')
}

// tags: a string or array of tags as they appear in the outline ("iconrow", "equation=circle", "layout=cycle")
export function resolveLayout(tags) {
  const tagList = [].concat(tags ?? []).map(t => String(t).replace(/^layout=/, ''))
  for (const t of tagList) if (TAG_MAP[t]) return { ...TAG_MAP[t], tag: t, template: TEMPLATES[TAG_MAP[t].layout] }
  return { layout: 'list', variant: undefined, exact: false, tag: tagList[0] ?? '(none)', template: list }   // untagged slide = plain list
}

function prepare(slide) {
  const r = resolveLayout(slide.layout)
  return { r, slide: { ...slide, variant: slide.variant ?? r.variant } }
}
export const unitsFor = (slide, ctx) => { const { r, slide: s } = prepare(slide); return r.template.units(s, ctx) }
// build times that the slide itself fixes (seconds from the scene start; null = from the speech): illustration builds with `at`
export const handTimesFor = (slide, ctx) => { const { r, slide: s } = prepare(slide); return r.template.handTimes ? r.template.handTimes(s, ctx) : null }

// Async pre-step for templates that need files made before render (widget stills). build-video calls it before compose().
export async function prepareScenes(scenes, opts = {}) {
  for (const [i, sc] of scenes.entries()) {
    const { r, slide } = prepare(sc.slide)
    if (r.template.prepare) await r.template.prepare(slide, { ...opts, warn: m => (opts.warn ?? console.error)(`s${i + 1}: ${m}`) })
  }
}

// ---------------------------------------------------------------- motion level and lint
const DENSE_LAYOUTS = new Set(['code', 'table'])
export function suggestMotion(slide) {
  const { r, slide: s } = prepare(slide)
  const words = (s.items ?? []).reduce((a, i) => a + wc(i.text) + (i.children ?? []).reduce((b, c) => b + wc(c.text), 0), 0)
  return s.dense || DENSE_LAYOUTS.has(r.layout) || words > 60 ? 'calm' : 'standard'
}

// N32: a scene whose settled state is only a title plus <= 2 short text lines, with no image, icon, illustration, widget or chart, is a
// failure while the voice runs over it. Returns the reason (string) or null. build-video turns it into a warning when narration runs over the scene.
const PICTURE_LAYOUTS = new Set(['illustration', 'widget', 'chart', 'analogy', 'chat', 'stats', 'code', 'table', 'equation'])
export function sparseReason(slide) {
  const { r, slide: s } = prepare(slide)
  if (PICTURE_LAYOUTS.has(r.layout)) return null
  if (s.images?.length || s.image) return null
  const all = [...(s.items ?? []), ...(s.items ?? []).flatMap(i => i.children ?? [])]
  if (all.some(i => i.icon || i.iconSvg || i.icons)) return null
  const lines = all.map(i => i.text).filter(Boolean)
  if (lines.length > 2 || lines.some(t => wc(t) > 8)) return null
  return `only a title and ${lines.length} short text line${lines.length === 1 ? '' : 's'} (${r.layout}), no image, illustration, widget or icon`
}

const PHRASE_LAYOUTS = new Set(['list', 'iconrow', 'cycle', 'process', 'cards', 'compare', 'timeline', 'equation', 'stats'])
export function lint(slide) {
  const { r, slide: s } = prepare(slide), out = []
  if (!r.exact) out.push(`layout "${r.tag}" has no template of its own; drawn as "${r.layout}" (check it still reads)`)
  if (PHRASE_LAYOUTS.has(r.layout)) {
    for (const it of [...(s.items ?? []), ...(s.items ?? []).flatMap(i => i.children ?? [])]) {
      if (wc(it.text) > 9) out.push(`"${it.text.slice(0, 40)}..." is ${wc(it.text)} words; on-screen text is short changing phrases, not the spoken sentence`)
    }
  }
  return out
}

// ---------------------------------------------------------------- transitions
// N11: the default is push-left (1.2 s, sine.inOut), done with GSAP on the scene elements (templates/transitions.mjs). No
// shader is used any more. Returns { name, d, opts? }; d is when the move ends after the scene start.
export const DEFAULT_TRANSITION = 'push-left'
export function pickTransition(prev, cur, i) {
  const x = cur.transition
  const named = name => { if (!TRANSITIONS[name]) throw new Error(`unknown transition "${name}" (use ${Object.keys(TRANSITIONS).join(', ')})`); return name }
  if (x === 'cut') return { name: 'crossfade-cut', d: 0.08, opts: { dur: 0.08 } }
  if (x === 'crossfade') return { name: 'crossfade-cut', d: 0.5, opts: { dur: 0.5 } }
  if (typeof x === 'string') return { name: named(x), d: TRANSITIONS[x].defaults.dur }
  if (x?.name) return { name: named(x.name), d: x.dur ?? TRANSITIONS[x.name].defaults.dur, opts: x }
  if (x?.shader) return { name: DEFAULT_TRANSITION, d: TRANSITIONS[DEFAULT_TRANSITION].defaults.dur, legacyShader: x.shader }
  if (cur.slide.inserted) return { name: 'crossfade-cut', d: 0.5, opts: { dur: 0.5 } }   // inserted interlude: plain crossfade in
  if (cur.slide.continues) return { name: 'crossfade-cut', d: 0.08, opts: { dur: 0.08 } }  // same idea carried over
  return { name: DEFAULT_TRANSITION, d: TRANSITIONS[DEFAULT_TRANSITION].defaults.dur }
}

// ---------------------------------------------------------------- captions
const FILLER = /^(u+h+|u+m+|e+r+m*|e+m+|a+h+|h+m+|m+h*m+|uh-huh)$/i
// words: [{w, s, e}] seconds on the output clock. Returns [[t0, t1, text], ...].
// Fillers and stutters are dropped; `fixes` = [[RegExp|string, replacement]] repairs recogniser slips per line
// (supplied by the agent after reading the transcript against the outline's vocabulary).
export function cleanCaptions(words, { fixes = [], maxWords = 8, maxDur = 3.4, maxGap = 0.7 } = {}) {
  const kept = []
  for (const w of words) {
    const bare = w.w.replace(/[^\p{L}\p{N}'-]/gu, '')
    if (!bare || FILLER.test(bare)) { if (kept.length && /[.?!]$/.test(w.w)) kept[kept.length - 1].w += w.w.match(/[.?!]$/)[0]; continue }
    const prev = kept[kept.length - 1]
    if (prev && prev.w.replace(/[^\p{L}\p{N}'-]/gu, '').toLowerCase() === bare.toLowerCase() && !/[.?!]$/.test(prev.w) && bare.length < 6) { prev.e = w.e; prev.w = w.w; continue }   // "the the", "I I"
    kept.push({ ...w })
  }
  const lines = []
  let cur = []
  const flush = () => { if (cur.length) lines.push(cur); cur = [] }
  kept.forEach((w, i) => {
    if (cur.length && (w.s - cur[cur.length - 1].e > maxGap || w.e - cur[0].s > maxDur || cur.length >= maxWords)) flush()
    cur.push(w)
    if (/[.?!]$/.test(w.w) && cur.length >= 3) flush()
  })
  flush()
  return lines.map((ln, i) => {
    let text = ln.map(x => x.w).join(' ')
    for (const [a, b] of fixes) text = text.replace(a, b)
    const next = lines[i + 1]?.[0]?.s ?? Infinity
    return [f(ln[0].s), f(Math.min(ln[ln.length - 1].e + 0.2, next - 0.05)), text.replace(/\s+/g, ' ').trim()]
  }).filter(l => l[2] && l[1] - l[0] > 0.2)
}

// ---------------------------------------------------------------- compose
const GSAP_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js'

// titleMode (default 'kicker', N30): 'full' | 'kicker' | 'tab' | 'intro-then-none' | 'none' for the video; scene.titleMode overrides it per scene; afterIntro: 'kicker' keeps a kicker after the intro card.
export function compose({ look = defaultLook, duration, audio = null, scenes, captions = [], iconSets, projDir, titleMode = 'kicker', afterIntro }) {
  const warnings = []
  const L = { ...defaultLook, ...look, accents: { ...defaultLook.accents, ...look.accents }, tints: { ...defaultLook.tints, ...look.tints } }
  const used = new Set(), plan = []
  const modes = resolveTitleModes(scenes, titleMode, { afterIntro }), tabsOf = sectionTabs(scenes)
  scenes.forEach((sc, i) => {
    const prev = scenes[i - 1]
    const tr = i === 0 ? { d: 0 } : pickTransition(prev, sc, i)
    if (tr.legacyShader) warnings.push(`s${i + 1}: shader "${tr.legacyShader}" is no longer supported; used ${DEFAULT_TRANSITION}`)
    if (i && sc.end - sc.start < tr.d + 2) warnings.push(`s${i + 1}: scene is ${(sc.end - sc.start).toFixed(1)} s long and its ${tr.name} takes ${tr.d} s; the content has under 2 s to read`)
    plan.push({ ...sc, tr })
  })
  let html = '', js = '', css = ''
  const ids = []
  plan.forEach((sc, i) => {
    const sid = 's' + (i + 1); ids.push(sid)
    const { r, slide } = prepare(sc.slide)
    const motion = sc.motion ?? suggestMotion(sc.slide)
    for (const m of lint(sc.slide)) warnings.push(`${sid}: ${m}`)
    const dIn = sc.tr.d, dOut = plan[i + 1]?.tr.d ?? 0
    const ctx = { sid, start: sc.start, end: sc.end, t0: sc.start + 0.02, settle: sc.start + dIn + 0.05, builds: sc.builds ?? [], highlights: sc.highlights, motion, warnings, iconsDir: iconSets, iconSets, look: L, projDir, titleMode: modes[i], tabs: tabsOf[i]?.tabs, tabIndex: tabsOf[i]?.index }
    const expected = r.template.units(slide, ctx).length
    if ((sc.builds ?? []).length > expected) warnings.push(`${sid}: ${(sc.builds ?? []).length} build times for ${expected} units; extra times ignored`)
    const out = applyTitleMode(r.template.render(slide, ctx), modes[i])
    used.add(r.template)
    if (slide.inserted) warnings.push(`${sid}: INSERTED scene "${r.layout}" (not in the outline)${slide.nodes ? ' from speech: ' + slide.nodes.map(n => `"${n.said}"@${n.t}`).join('; ') : ''}`)
    const ds = sc.start, de = Math.min(duration, sc.end + dOut)   // visible from its move's start until the next scene's move has finished
    html += `<div id="${sid}" class="scene clip ${out.cls ?? ''}" ${out.style ? `style="${out.style}" ` : ''}data-start="${f(ds)}" data-duration="${f(de - ds)}">${out.html}</div>\n`
    js += out.js
  })
  const moves = []
  plan.forEach((sc, i) => {
    if (!i) return
    const t = transition(sc.tr.name, { ...(sc.tr.opts ?? {}), from: ids[i - 1], to: ids[i], t: sc.start })
    js += t.js
    moves.push({ id: ids[i], start: sc.start, dur: t.dur, settle: f(sc.start + t.dur) })
  })
  css = [...used].map(t => t.css).join('\n') + '\n' + titleModeCss
  const out = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="${GSAP_SRC}"></script>
    <style>
${lookCss(L)}
${baseCss}
${css}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(duration)}" data-width="1920" data-height="1080">
${audio ? `<audio id="voice" src="${esc(audio.src)}" data-start="0" data-duration="${f(duration)}" data-track-index="0" data-volume="${audio.volume ?? 1}"></audio>\n` : ''}${html}      <div id="captions"></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
${js}
      const caps = ${JSON.stringify(captions)};
      const capBox = document.getElementById("captions");
      caps.forEach(([t0, t1, text], i) => {
        const el = document.createElement("div");
        el.className = "cap-line"; el.id = "cap" + i; el.textContent = text;
        capBox.appendChild(el);
        tl.to(el, { opacity: 1, duration: 0.15 }, t0);
        tl.to(el, { opacity: 0, duration: 0.15 }, Math.max(t0 + 0.2, t1 - 0.15));
      });
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`
  return { html: out, warnings, moves }
}

// ---------------------------------------------------------------- learner-control outputs
const stamp = (t, ms = false) => { const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}` }
export function captionsToVtt(captions) {
  return 'WEBVTT\n\n' + captions.map(([a, b, t], i) => `${i + 1}\n${stamp(a)} --> ${stamp(b)}\n${t}\n`).join('\n')
}
// chapters from the section slides (layout 'section', variant 'section'): "0:00 Title" lines
export function chaptersFrom(scenes) {
  return scenes.filter(s => { if (s.slide.chapter) return true; const r = resolveLayout(s.slide.layout); return r.layout === 'section' && (s.slide.variant ?? r.variant) === 'section' })
    .map(s => `${Math.floor(s.start / 60)}:${String(Math.floor(s.start % 60)).padStart(2, '0')} ${s.slide.title}`).join('\n')
}
