#!/usr/bin/env node
// The approval gate (N44): every frame as a still on one HTML page, with its key phrase, narration or excerpt, and movement note.
// Show this page to the author. Voice and render only after he approves it.
//
// usage: node tools/storyboard.mjs <project-dir> [--out storyboard.html] [--title "Video title"] [--png]
//   Frames come from, in order of preference:
//     <dir>/plan.json            every scene in plan order: illustration scenes (frame JSON drawn as its settled picture), widget scenes (one still per state,
//                                captured with chrome-headless-shell), other layouts as a flagged text card (N33: illustrate it). Narration = the scene's
//                                narration text, else the words spoken in its time span.
//     <dir>/frames/*.json        a folder of frame JSON files, in file-name order (before any plan exists).
//   --png   also writes each illustration still as <dir>/storyboard-stills/<n>-<id>.png (for opening and checking the pictures one by one).
// Self-contained output: stills are embedded; opens by double-click. No server, no network.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const kitDir = [path.join(here, '../kit'), path.join(here, '../assets/kit')].find(d => existsSync(path.join(d, 'templates/index.mjs')))
if (!kitDir) { console.error('kit not found next to this script'); process.exit(1) }
const T = p => import(pathToFileURL(path.join(kitDir, p)).href)
const { frameStill } = await T('templates/_frame.mjs')
const widget = await T('templates/widget.mjs')
const { loadFrame } = await T('templates/illustration.mjs')
const { shoot } = await T('tools/shoot.mjs')

const argv = process.argv.slice(2), opt = {}, pos = []
for (let i = 0; i < argv.length; i++) { if (argv[i] === '--png') opt.png = true; else if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[++i]; else pos.push(argv[i]) }
const proj = path.resolve(pos[0] ?? '.')
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const look = existsSync(path.join(proj, 'look.json')) ? JSON.parse(readFileSync(path.join(proj, 'look.json'), 'utf8')) : {}
delete look._note
const iconSets = process.env.ANIMATED_TALK_ICON_SETS ?? process.env.TALKWEAVER_ICONS ?? look.iconSets
const warnings = []
const warn = m => { warnings.push(m); console.error('warn ' + m) }
const b64 = (buf, mime) => `data:${mime};base64,${Buffer.from(buf).toString('base64')}`

// <image href="assets/x.png"> inside a data-URI SVG cannot load relative files: embed them
function embedImages(svg) {
  return svg.replace(/<image href="([^"]+)"/g, (m, src) => {
    if (/^data:/.test(src)) return m
    const p = path.resolve(proj, src.replace(/&amp;/g, '&'))
    if (!existsSync(p)) { warn(`image ${src} not found`); return m }
    return `<image href="${b64(readFileSync(p), /\.png$/i.test(p) ? 'image/png' : /\.svg$/i.test(p) ? 'image/svg+xml' : 'image/jpeg')}"`
  })
}

// plain-language movement note from the builds (used when the frame has no hand-written `motion`)
function movementNote(frame, builds) {
  if (frame.motion) return frame.motion
  if (!builds.length) return 'Nothing arrives after the scene lands (add builds).'
  const verb = { rise: 'rises in', fade: 'fades in', pop: 'pops in', slide: 'slides in', move: 'moves', wipe: 'draws in' }
  return builds.map(b => `At "${b.cue}"${b.at != null ? ` (${b.at} s)` : ''}: ` + b.items.map(i => `${i.id.replace(/-/g, ' ')} ${verb[String(i.motion).split(':')[0]] ?? i.motion}`).join(', ') + (b.hide.length ? `; ${b.hide.join(', ')} fades out` : '')).join('. ') + '.'
}

const cards = []   // { n, id, scene, key, narration[], motion, kind, img?, imgs?, notes[] }
let png = null
if (opt.png) { png = path.join(proj, 'storyboard-stills'); mkdirSync(png, { recursive: true }) }

async function frameCard(frame, extra = {}) {
  const r = frameStill(frame, { look, iconSets, warn })
  const svg = embedImages(r.svg)
  const n = cards.length + 1
  if (png) {
    const f = path.join(png, `${String(n).padStart(2, '0')}-${String(frame.id ?? 'frame').replace(/[^a-z0-9-]+/gi, '-')}.svg`)
    writeFileSync(f, svg)
    await shoot({ url: pathToFileURL(f).href, shots: [{ out: f.replace(/\.svg$/, '.png') }] })
    console.error('still ' + f.replace(/\.svg$/, '.png'))
    rmSync(f)   // the svg was only the intermediate: the png is the still
  }
  cards.push({ n, id: frame.id, scene: frame.scene ?? extra.scene, key: [].concat(frame.key ?? []).join(' '), narration: extra.narration?.length ? extra.narration : [].concat(frame.narration ?? []), motion: movementNote(frame, r.builds), kind: 'illustration', img: b64(svg, 'image/svg+xml'), cues: r.builds.map(b => b.cue), notes: r.warnings })
}

if (existsSync(path.join(proj, 'plan.json'))) {
  const plan = JSON.parse(readFileSync(path.join(proj, 'plan.json'), 'utf8'))
  opt.title ??= plan.title
  for (const sc of plan.scenes) {
    const spoken = (plan.words ?? []).filter(w => w.s >= sc.start && w.s < sc.end).map(w => w.w).join(' ').replace(/\s+/g, ' ').trim()
    const narration = sc.narration ? [sc.narration] : spoken ? [spoken] : []
    const lay = sc.slide.layout
    if (['illustration', 'illustrated', 'frame', 'storyboard'].includes(lay)) {
      const frame = loadFrame(sc.slide, proj)
      if (!frame.key && frame.key !== false) frame.key = sc.slide.title
      frame.id = frame.id ?? sc.slideId
      await frameCard({ ...frame, scene: frame.scene ?? sc.slide.section }, { narration })
      cards[cards.length - 1].timing = `scene ${sc.start} to ${sc.end} s; builds at ${(sc.units ?? []).map(u => `${u.t}s`).join(', ') || 'none'}`
    } else if (lay === 'widget' || lay === 'embed') {
      await widget.prepare(sc.slide, { projDir: proj, warn })
      const { abs } = widget.stillsFor(sc.slide, proj)
      cards.push({ n: cards.length + 1, id: sc.slideId, scene: sc.slide.section, key: sc.slide.title, narration, kind: 'widget', imgs: abs.map(p => b64(readFileSync(p), 'image/png')),
        motion: `The widget's own picture, cross-fading from state to state at ${(sc.units ?? []).map(u => `"${u.text}" (${u.t} s)`).join(', ') || 'no steps'}.`, cues: (sc.units ?? []).map(u => u.text), notes: [] })
    } else {
      const items = (sc.slide.items ?? []).map(i => i.text)
      cards.push({ n: cards.length + 1, id: sc.slideId, scene: sc.slide.section, key: sc.slide.title, narration, kind: 'text', layout: lay, items, motion: `Text template "${lay}": ${items.length} item(s) build at the spoken words.`, cues: items,
        notes: ['section', 'title', 'closing'].includes(lay) ? [] : [`NOT ILLUSTRATED (N33): "${lay}" scene with ${items.length} text line(s); draw it as a frame unless the content is a quotation or a definition`] })
    }
  }
} else {
  const dir = existsSync(path.join(proj, 'frames')) ? path.join(proj, 'frames') : proj
  const files = readdirSync(dir).filter(f => /\.json$/i.test(f)).sort()
  for (const f of files) {
    let frame
    try { frame = JSON.parse(readFileSync(path.join(dir, f), 'utf8')) } catch { continue }
    if (!frame || !(frame.elements || frame.builds)) continue
    frame.id = frame.id ?? f.replace(/\.json$/, '')
    await frameCard(frame)
  }
  if (!cards.length) { console.error(`no frames found in ${dir} (frames/*.json) and no plan.json`); process.exit(1) }
}

// ---------------------------------------------------------------- page
const css = `body{margin:0;background:#f4f3ee;font-family:Inter,Helvetica,Arial,sans-serif;color:#101418}
.badge{position:fixed;top:14px;left:14px;background:#0a7a5c;color:#fff;font-weight:700;font-size:15px;padding:8px 16px;border-radius:999px;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,.18)}
main{max-width:1280px;margin:0 auto;padding:78px 24px 60px}
h1{font-size:34px;margin:0 0 6px}.lede{color:#5c6570;font-size:16px;margin:0 0 28px;max-width:900px;line-height:1.5}
h2{font-size:22px;margin:46px 0 14px;padding-top:10px;border-top:3px solid #0a7a5c}
.card{background:#fff;border:1px solid #cfcdc4;border-radius:14px;padding:16px;margin:0 0 26px}
.card img{width:100%;display:block;border:1px solid #e3e2dc;border-radius:8px}
.states{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px}
.meta{display:flex;gap:18px;margin-top:12px;font-size:15px;line-height:1.5}
.meta>div{flex:1}.lab{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#5c6570;font-weight:700;margin-bottom:3px}
.narr{border-left:4px solid #0a7a5c;padding-left:12px}.mot{color:#33403a}
.fid{font-family:ui-monospace,Menlo,monospace;font-size:13px;color:#5c6570;margin-bottom:8px}
.key{font-size:20px;font-weight:700;margin:12px 0 0}
.warn{margin-top:10px;padding:8px 12px;border-radius:8px;background:#fbe9e7;color:#b42318;font-size:14px}
.textcard{border:2px dashed #b42318;border-radius:8px;padding:28px;font-size:22px;color:#5c6570}`
let out = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>${esc(opt.title ?? 'Storyboard')} · storyboard</title><style>${css}</style></head><body>`
out += `<div class="badge">Storyboard · approve before voice or render</div><main><h1>${esc(opt.title ?? 'Storyboard')}</h1>`
out += `<p class="lede">${cards.length} frame${cards.length === 1 ? '' : 's'} in order, 1920 by 1080, each as its settled picture with its key phrase, the narration it covers and what moves. Nothing is voiced or rendered until this page is approved.</p>`
let sec = null
for (const c of cards) {
  if (c.scene && c.scene !== sec) { sec = c.scene; out += `<h2>${esc(sec)}</h2>` }
  out += `<div class="card"><div class="fid">${String(c.n).padStart(2, '0')} · ${esc(c.id)} · ${c.kind}${c.layout ? ' · ' + esc(c.layout) : ''}${c.timing ? ' · ' + esc(c.timing) : ''}</div>`
  if (c.img) out += `<img src="${c.img}" alt="${esc(c.id)}">`
  else if (c.imgs) out += `<div class="states">${c.imgs.map((s, k) => `<div><img src="${s}" alt="state ${k}"><div class="lab" style="margin-top:4px">State ${k}</div></div>`).join('')}</div>`
  else out += `<div class="textcard"><b>${esc(c.key)}</b><br>${(c.items ?? []).map(esc).join('<br>')}</div>`
  out += `<div class="key">${esc(c.key)}</div>`
  out += `<div class="meta"><div class="narr"><div class="lab">Narration</div>${c.narration?.length ? c.narration.map(esc).join('<br>') : '<i>none yet</i>'}</div><div class="mot"><div class="lab">What moves</div>${esc(c.motion)}</div></div>`
  for (const n of c.notes ?? []) out += `<div class="warn">${esc(n)}</div>`
  out += `</div>`
}
out += `</main></body></html>`
const dest = path.resolve(proj, opt.out ?? 'storyboard.html')
writeFileSync(dest, out)
console.error(`storyboard: ${cards.length} frame(s), ${warnings.length} warning(s) -> ${dest}`)
console.log(dest)
