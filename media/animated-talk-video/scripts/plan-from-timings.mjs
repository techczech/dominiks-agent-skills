#!/usr/bin/env node
// Outline (+ optional slide timings, word timings, narration) -> plan.json for build-video.mjs.
// Works in the skill folder (kit at ../assets/kit) and in a scaffolded project (kit at ../kit; this file lives in tools/).
//
// usage: node plan-from-timings.mjs --outline outline.md [options] > plan.json     (or --out plan.json)
//   --timings <file>     route B: slide changes. TalkWeaver run JSON (slideTimeIndex), a JSON array, or CSV. See references/inputs.md.
//   --words <file>       word timings of the audio: [{w,s,e}], [{words:[{w,s,e}]}] or Whisper JSON. Seconds on the audio file's clock.
//   --cues <file>        hand cues {slideId:[seconds per build unit]} on the output clock, for builds the speech match gets wrong.
//   --durations <file>   route A: {slideId: seconds} from generated narration clips (join-clips.mjs writes it).
//   --audio <path>       narration file the video plays (relative to the project), e.g. audio/voice.m4a.
//   --from <s> --to <s>  cut a stretch out of a long recording: timings are on the recording clock, words and audio on the cut clock.
//   --end <s>            end of the last scene when no --to / audio length is known.
//   --title <text>       video title (default: the outline's "# " heading).
// With no --timings the scenes run in outline order, lengths from --durations, else estimated from the narration (2.6 words/s) or the unit count.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const kitDir = [path.join(here, '../kit'), path.join(here, '../assets/kit')].find(d => existsSync(path.join(d, 'templates/index.mjs')))
if (!kitDir) { console.error('kit not found next to this script'); process.exit(1) }
const { unitsFor, handTimesFor, resolveLayout } = await import(pathToFileURL(path.join(kitDir, 'templates/index.mjs')).href)

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2), A = {}
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) A[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true
if (!A.outline) { console.error(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(3, 15).map(l => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(1) }
const warnings = []
const warn = m => { warnings.push(m); process.stderr.write('warn ' + m + '\n') }
const readJson = p => JSON.parse(readFileSync(p, 'utf8'))
const r2 = n => Math.round(n * 100) / 100
// Markdown emphasis is never drawn literally (N22: regular weight): `**bold**` loses its markers; the words stay.
const plain = t => String(t).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*\*/g, '')

// ---------------------------------------------------------------- outline
const PALETTE = ['green', 'orange', 'blue', 'red']
const KEYED = new Set(['id', 'layout', 'accent', 'variant', 'motion', 'transition', 'from', 'kicker', 'head', 'heads', 'focus', 'titlemode', 'dense', 'continues', 'frame', 'src', 'steps', 'stepmode', 'stepmap', 'wait', 'key'])
const CHAT_ROLES = new Set(['user', 'reasoning', 'context', 'tool', 'result', 'assistant'])

function parseOutline(text) {
  const slides = [], deck = { title: '' }
  let cur = null, section = '', secIdx = -1, fence = null
  const open = (level, title) => {
    cur = { level, title, tags: {}, layout: null, bullets: [], narration: [], code: null, images: [], section, accent: PALETTE[Math.max(secIdx, 0) % PALETTE.length], n: slides.length + 1 }
    slides.push(cur)
  }
  const applyTags = (s, str) => {
    for (const m of str.matchAll(/\{([^}]*)\}/g)) for (const tok of m[1].trim().split(/\s+/).filter(Boolean)) {
      const k = tok.split('=')[0].toLowerCase()
      if (KEYED.has(k)) s.tags[k] = tok.includes('=') ? tok.slice(tok.indexOf('=') + 1) : true
      else if (!s.layout) s.layout = tok
    }
  }
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '')
    if (fence) {
      if (/^```/.test(line.trim())) { cur.code = { text: fence.lines.join('\n'), lang: fence.lang || undefined }; fence = null } else fence.lines.push(raw)
      continue
    }
    if (/^```/.test(line.trim()) && cur) { fence = { lang: line.trim().slice(3).trim(), lines: [] }; continue }
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      let title = plain(h[2].trim()); const tagStr = (title.match(/(\{[^}]*\}\s*)+$/) ?? [''])[0]
      title = title.slice(0, title.length - tagStr.length).trim()
      if (level === 1) { deck.title = deck.title || title; cur = null; deck.tags = tagStr; continue }
      if (level === 2) { section = title; secIdx++ }
      open(level, title); applyTags(cur, tagStr)
      continue
    }
    if (!cur) continue
    if (/^\{.*\}\s*$/.test(line.trim()) && !cur.bullets.length) { applyTags(cur, line); continue }
    const nar = line.match(/^>\s?(.*)$/)
    if (nar) { if (nar[1].trim()) cur.narration.push(plain(nar[1].trim())); continue }
    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/)
    if (img) { cur.images.push({ src: img[2], alt: img[1] }); continue }
    const b = raw.match(/^(\s*)[-*]\s+(.*)$/)
    if (b) {
      const depth = Math.floor(b[1].replace(/\t/g, '  ').length / 2)
      const o = { depth, icon: null, color: null, tone: null, spin: false }
      const textRaw = b[2].replace(/\{([^}]*)\}/g, (_, t) => { for (const tok of t.trim().split(/\s+/)) { const [k, v] = tok.split('='); if (k === 'icon') o.icon = v; else if (k === 'color') o.color = v; else if (k === 'tone') o.tone = v; else if (k === 'spin') o.spin = true }; return '' })
      o.text = plain(textRaw.trim()).replace(/:$/, '');
      cur.bullets.push(o)
    }
  }
  return { deck, slides }
}

const tree = bs => {
  const out = []; let last = null
  for (const b of bs) {
    const n = { text: b.text }
    if (b.icon) n.icon = b.icon; if (b.color) n.color = b.color; if (b.tone) n.tone = b.tone; if (b.spin) n.spin = true
    if (b.depth === 0) { n.children = []; out.push(n); last = n } else if (last) last.children.push(n)
  }
  for (const n of out) if (!n.children.length) delete n.children
  return out
}

function slideObject(s) {
  const t = s.tags
  const layoutTag = s.level === 2 && !s.layout ? 'section' : (s.layout ?? 'list')
  const slide = { layout: layoutTag, title: s.title, section: s.section, accent: t.accent ?? s.accent }
  if (s.level === 2 && layoutTag !== 'section') slide.chapter = true   // N47: an illustrated or widget section card still starts a chapter
  let items = tree(s.bullets)
  const lay = resolveLayout(layoutTag).layout
  if (t.variant) slide.variant = t.variant
  if (t.kicker) slide.kicker = t.kicker === true ? undefined : t.kicker.replace(/_/g, ' ')
  if (t.dense) slide.dense = true
  if (t.continues) slide.continues = true
  if (t.head) slide.head = t.head.split('|').map(x => x.replace(/_/g, ' '))
  if (t.heads) slide.heads = t.heads.split('|').map(x => x.replace(/_/g, ' '))
  if (s.images.length) slide.images = s.images
  if (lay === 'illustration') { slide.frame = t.frame ?? s.images.find(i => /\.json$/i.test(i.src))?.src; if (t.key) slide.key = t.key.replace(/_/g, ' ') }
  if (lay === 'widget') { slide.src = t.src ?? s.images.find(i => /\.html?$/i.test(i.src))?.src; if (t.steps != null) slide.steps = Number(t.steps); if (t.stepmode) slide.stepmode = t.stepmode; if (t.stepmap) slide.stepmap = String(t.stepmap).replace(/[|;]/g, ','); if (t.wait) slide.wait = Number(t.wait) }
  if (lay === 'quote') {
    const src = items.find(i => /^[—–]\s*|^--\s+/.test(i.text))
    if (src) { slide.source = src.text.replace(/^[—–]\s*|^--\s+/, ''); items = items.filter(i => i !== src) }
  }
  if (lay === 'chat') items = items.map(i => { const m = i.text.match(/^(\w+):\s+(.*)$/); return m && CHAT_ROLES.has(m[1]) ? { ...i, role: m[1], text: m[2] } : { ...i, role: 'assistant' } })
  if (lay === 'code') {
    slide.code = s.code ?? { text: items.map(i => i.text).join('\n') }
    if (!s.code) items = []
    if (t.focus) slide.focus = t.focus.split(',').map(r => { const [a, b] = r.split('-').map(Number); return [a, b ?? a] })
    else if (!slide.variant || slide.variant === 'code') slide.focus = []
  }
  if (lay === 'section' && !slide.variant) slide.variant = resolveLayout(layoutTag).variant
  if (lay === 'illustration') items = []   // the frame's builds are the units
  if (items.length || !['section', 'code', 'media', 'illustration'].includes(lay)) slide.items = items
  if (lay === 'media' && items.length) slide.items = items
  return { slide, motion: t.motion, transition: t.transition, titleMode: t.titlemode }
}

const outlineText = readFileSync(A.outline, 'utf8')
const { deck, slides } = parseOutline(outlineText)
const title = A.title ?? deck.title ?? 'Untitled'
const byId = new Map(), byTitle = new Map()
slides.forEach(s => { byId.set(String(s.tags.id ?? `s${s.n}`), s); byTitle.set(s.title.toLowerCase(), s) })   // slides without {id=...} are s1, s2, ... in heading order
const refSlide = ref => {
  const k = String(ref).trim()
  if (byId.has(k)) return byId.get(k)
  if (/^\d+$/.test(k) && slides[Number(k) - 1]) return slides[Number(k) - 1]
  if (/^title$/i.test(k) && deck.title) return titleSlide()
  return byTitle.get(k.toLowerCase())
}
let tsCache = null
const titleSlide = () => tsCache ??= { level: 0, title: deck.title, tags: { id: 'title' }, layout: 'title', bullets: [], narration: [], images: [], section: '', accent: 'green', n: 0 }

// ---------------------------------------------------------------- inputs: words
function loadWords(p) {
  const j = readJson(p)
  const flat = []
  const push = (w, s, e) => { if (w != null && Number.isFinite(s)) flat.push({ w: String(w).trim(), s: +s, e: Number.isFinite(e) ? +e : +s + 0.3 }) }
  const arr = Array.isArray(j) ? j : (j.segments ?? j.words ?? [])
  for (const x of arr) {
    if (x.words) for (const w of x.words) push(w.w ?? w.word ?? w.text, w.s ?? w.start, w.e ?? w.end)
    else push(x.w ?? x.word ?? x.text, x.s ?? x.start, x.e ?? x.end)
  }
  return flat.filter(w => w.w)
}
const FROM = Number(A.from ?? 0), TO = A.to != null ? Number(A.to) : null
let words = A.words ? loadWords(A.words) : []
const haveWords = words.length > 0

// ---------------------------------------------------------------- inputs: timings
const tsec = v => {
  if (typeof v === 'number') return v
  const s = String(v).trim()
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s)
  const m = s.match(/^(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/)
  if (!m) throw new Error(`cannot read time "${v}" (use seconds or m:ss)`)
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3])
}
function loadTimings(p) {
  const txt = readFileSync(p, 'utf8')
  let marks = []
  if (/\.csv$|\.txt$/i.test(p) || !/^\s*[[{]/.test(txt)) {
    for (const [i, raw] of txt.split('\n').entries()) {
      const line = raw.trim(); if (!line || line.startsWith('#')) continue
      const cells = line.split(',').map(c => c.trim())
      let t; try { t = tsec(cells[1]) } catch { if (i === 0) continue; throw new Error(`timings line ${i + 1}: "${line}"`) }
      marks.push({ ref: cells[0], t, event: 'enter' })
      for (const r of (cells[2] ?? '').split(';').map(x => x.trim()).filter(Boolean)) marks.push({ ref: cells[0], t: tsec(r), event: 'reveal' })
    }
    return marks
  }
  const j = JSON.parse(txt)
  if (j.slideTimeIndex) {
    for (const m of j.slideTimeIndex) {
      if (m.event === 'enter' || m.event === 'reveal') marks.push({ ref: m.slideId, t: m.tMs / 1000, event: m.event })
      else if (m.event === 'pause' || m.event === 'resume') warn(`run has ${m.event} events: check that the audio omits paused time; slide times are used as logged`)
    }
    if (j.talkTitle && !A.title) deck.title = deck.title || j.talkTitle
    return marks
  }
  for (const e of (Array.isArray(j) ? j : j.slides ?? [])) {
    const ref = e.slide ?? e.slideId ?? e.id ?? e.title
    marks.push({ ref, t: tsec(e.t ?? e.start ?? e.at), event: 'enter' })
    for (const r of e.reveals ?? e.builds ?? []) marks.push({ ref, t: tsec(r), event: 'reveal' })
  }
  return marks
}

// ---------------------------------------------------------------- scenes
const wordsOf = text => text.split(/\s+/).filter(Boolean)
const narrationOf = s => s.narration.join(' ')
const UCTX = { projDir: path.dirname(path.resolve(A.outline)) }   // frame / widget paths in the outline are relative to the project folder
const estUnits = sl => unitsFor(sl, UCTX).length
let scenes = []   // { src (outline slide), start, end, reveals[] }
if (A.timings) {
  const marks = loadTimings(A.timings).map(m => ({ ...m, slide: refSlide(m.ref) }))
  for (const m of marks) if (!m.slide) warn(`timings name "${m.ref}", which is not in the outline; skipped`)
  const ok = marks.filter(m => m.slide).sort((a, b) => a.t - b.t)
  const enters = ok.filter(m => m.event === 'enter' && m.t >= FROM - 0.01 && (TO == null || m.t < TO))
  const endAll = TO != null ? TO - FROM : (A.end != null ? Number(A.end) : null)
  enters.forEach((m, i) => {
    const next = enters[i + 1]
    const start = Math.max(0, r2(m.t - FROM)), end = next ? r2(next.t - FROM) : endAll
    const reveals = ok.filter(r => r.event === 'reveal' && r.slide === m.slide && r.t >= m.t && r.t < (next ? next.t : Infinity)).map(r => r2(r.t - FROM))
    scenes.push({ src: m.slide, start, end, reveals })
  })
  if (scenes.length && scenes[0].start > 0.3) { warn(`first slide enters at ${scenes[0].start} s; its scene is extended back to 0`); scenes[0].start = 0 }
  else if (scenes.length) scenes[0].start = 0
  const last = scenes[scenes.length - 1]
  if (last && last.end == null) {
    const wEnd = words.length ? words[words.length - 1].e : null
    last.end = r2(wEnd != null ? Math.max(wEnd + 1.5, last.start + 5) : last.start + 8)
    warn(`no end time given (--to / --end): the last scene ends at ${last.end} s (${wEnd != null ? 'last word + 1.5 s' : 'start + 8 s'})`)
  }
} else {
  const durations = A.durations ? readJson(A.durations) : {}
  const list = [...(deck.title ? [titleSlide()] : []), ...slides]
  let clock = 0
  for (const s of list) {
    const id = s.tags.id ?? `s${s.n}`
    const nar = wordsOf(narrationOf(s)).length
    const sl = slideObject(s).slide
    let d = durations[id] ?? durations[s.title]
    let est = false
    if (d == null) {
      est = true
      d = s.level <= 2 && !nar ? 4.5 : nar ? Math.max(5, 1.6 + nar / 2.6 + 1.0) : Math.max(5.5, 1.6 + estUnits(sl) * 1.6 + 2.5)
    }
    scenes.push({ src: s, start: r2(clock), end: r2(clock + d), reveals: [], estimated: est })
    clock += d
  }
  if (scenes.some(s => s.estimated)) warn('scene lengths are estimates (no --timings, no --durations for some slides); regenerate with durations from the real narration before the final render')
}
if (!scenes.length) { console.error('no scenes: check the timings against the outline ids'); process.exit(1) }
const duration = r2(Math.max(...scenes.map(s => s.end)))

// cut clock: words are already on the output clock (see header). Drop words outside the video.
words = words.filter(w => w.e > 0 && w.s < duration).map(w => ({ ...w, s: r2(w.s), e: r2(w.e) }))

// ---------------------------------------------------------------- build units
const SETTLE = 1.4   // a new scene's move (1.2 s) plus margin: no build before this
const stem = w => w.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(ing|ed|es|s|ly)$/, '')
const STOP = new Set('the a an and or of to in on is are it its this that with for from by as at be so do does not'.split(' ').map(stem))
const toks = t => t.split(/[^A-Za-z0-9]+/).map(stem).filter(x => x && !STOP.has(x))
const cues = A.cues ? readJson(A.cues) : {}
const estWords = []
const sources = { 'reveal-event': 0, 'hand-cue': 0, 'speech-match': 0, 'narration-estimate': 0, fallback: 0 }

const out = scenes.map((sc, idx) => {
  const { slide, motion, transition, titleMode } = slideObject(sc.src)
  const sid = sc.src.tags.id ?? `s${sc.src.n}`
  const units = unitsFor(slide, UCTX)
  const hand = handTimesFor(slide, UCTX)   // illustration builds that carry `at` (seconds from the scene start)
  let pool = words.filter(w => w.s >= sc.start - 0.2 && w.s < sc.end)
  let estimated = false
  if (!haveWords && sc.src.narration.length) {   // route A before any audio: pretend the narration is spoken at 2.6 words/s
    estimated = true
    pool = wordsOf(narrationOf(sc.src)).map((w, i) => ({ w, s: r2(sc.start + SETTLE + i / 2.6), e: r2(sc.start + SETTLE + (i + 0.8) / 2.6) }))
    estWords.push(...pool)
  }
  let fromI = 0, prev = sc.start + SETTLE
  const manual = cues[sid]
  const hls = cues._highlights?.[sid]   // [{item, at}]: focus cues, item = unit index, null clears (kit.focus)
  const res = []
  const useReveals = sc.reveals.length >= units.length && units.length > 0
  if (sc.reveals.length && !useReveals) warn(`${sid}: ${sc.reveals.length} reveal events for ${units.length} build units; reveals ignored, builds timed from speech`)
  units.forEach((text, k) => {
    let u
    if (useReveals) u = { text, t: sc.reveals[k], source: 'reveal-event' }
    else if (manual && manual[k] != null) u = { text, t: manual[k], source: 'hand-cue' }
    else if (hand?.[k] != null) u = { text, t: r2(sc.start + hand[k]), source: 'hand-cue' }
    else {
      const B = new Set(toks(text)); let best = -1, bi = -1
      for (let i = fromI; i < pool.length; i++) {
        const win = new Set(pool.slice(i, i + 9).flatMap(x => toks(x.w)))
        const score = B.size ? [...B].filter(x => win.has(x)).length / B.size : 0
        if (score > best + 1e-9) { best = score; bi = i }
        if (score >= 0.99) break
      }
      if (best >= 0.34 && bi >= 0) {
        while (bi < pool.length - 1 && !toks(pool[bi].w).some(x => B.has(x))) bi++
        fromI = bi + 1
        u = { text, t: r2(Math.max(prev + 0.4, pool[bi].s)), source: estimated ? 'narration-estimate' : 'speech-match', score: r2(best) }   // never ahead of the word (rule 2.2)
      } else {
        const left = units.length - k, room = Math.max(0, sc.end - 1.5 - prev)
        u = { text, t: r2(prev + Math.min(2.5, Math.max(0.8, room / (left + 1)))), source: 'fallback' }
      }
    }
    if (res.length && u.t < res[res.length - 1].t) warn(`${sid}: build ${k + 1} ("${text.slice(0, 30)}") at ${u.t} s comes before build ${k} (${res[res.length - 1].t} s): spoken out of outline order; kept as timed`)
    if (u.t >= sc.end) warn(`${sid}: build ${k + 1} at ${u.t} s is after the scene ends (${sc.end} s)`)
    prev = Math.max(prev, u.t)
    sources[u.source]++
    res.push(u)
  })
  if (res.some(u => u.source === 'fallback')) warn(`${sid}: ${res.filter(u => u.source === 'fallback').length} build(s) spread evenly (no spoken match, no cue): report them`)
  const dwell = sc.end - Math.max(sc.start, res.length ? res[res.length - 1].t : sc.start)
  if (!res.length && sc.end - sc.start > 25) warn(`${sid}: ${r2(sc.end - sc.start)} s with no builds (long dwell; hold still, report for review)`)
  else if (res.length && dwell > 25) warn(`${sid}: ${r2(dwell)} s after the last build (long dwell; report for review)`)
  const o = { slideId: sid, start: sc.start, end: sc.end, slide, units: res }
  if (hls?.length) o.highlights = hls
  if (motion) o.motion = motion
  if (transition) o.transition = transition
  if (titleMode) slide.titleMode = titleMode
  if (sc.src.narration.length) o.narration = narrationOf(sc.src)
  return o
})

const plan = {
  title, duration, audio: A.audio ?? null, titleMode: 'kicker',
  captionFixes: [],   // [["recogniser slip", "what was said"]]: add after reading the captions against the outline
  wordsEstimated: !haveWords && estWords.length > 0,   // true = draft captions from the narration text at 2.6 words/s; replace with real word timings
  scenes: out, words: haveWords ? words : estWords, buildSources: sources, warnings
}
const json = JSON.stringify(plan, null, 1)
if (A.out) writeFileSync(A.out, json + '\n'); else process.stdout.write(json + '\n')
process.stderr.write(`scenes ${out.length}, duration ${duration} s, builds ${JSON.stringify(sources)}, words ${words.length}\n`)
