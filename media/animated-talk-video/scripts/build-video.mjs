#!/usr/bin/env node
// plan.json (+ look.json) -> index.html, scenes.json, captions.vtt, transcript.md, chapters.txt in the project folder.
// Works in the skill folder and in a scaffolded project (this file lives in tools/; kit at ../kit or ../assets/kit).
// usage: node tools/build-video.mjs [project-dir=.] [--title-mode kicker|tab|intro-then-none|full|none] [--after-intro kicker]
// Prints compose() warnings and a build-source summary to stderr: read every one; fix it or list it in the report.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const kitDir = [path.join(here, '../kit'), path.join(here, '../assets/kit')].find(d => existsSync(path.join(d, 'templates/index.mjs')))
if (!kitDir) { console.error('kit not found next to this script'); process.exit(1) }
const K = await import(pathToFileURL(path.join(kitDir, 'templates/index.mjs')).href)
const { compose, cleanCaptions, captionsToVtt, chaptersFrom, resolveLayout, prepareScenes, sparseReason } = K

const argv = process.argv.slice(2), opt = {}
const pos = []
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[++i]; else pos.push(argv[i]) }
const proj = path.resolve(pos[0] ?? '.')
const read = f => JSON.parse(readFileSync(path.join(proj, f), 'utf8'))
if (!existsSync(path.join(proj, 'plan.json'))) { console.error(`no plan.json in ${proj}; run plan-from-timings.mjs first`); process.exit(1) }
const plan = read('plan.json')
const look = existsSync(path.join(proj, 'look.json')) ? read('look.json') : {}
delete look._note

const scenes = plan.scenes.map(sc => ({
  slide: sc.slide, start: sc.start, end: sc.end, builds: (sc.units ?? []).map(u => u.t),
  ...(sc.highlights?.length ? { highlights: sc.highlights } : {}),
  ...(sc.motion ? { motion: sc.motion } : {}), ...(sc.transition ? { transition: sc.transition } : {})
}))
// captionFixes: [["recogniser slip", "what was said"]]; "/regex/" for a pattern. Case-insensitive.
const fixRe = a => { const m = String(a).match(/^\/(.*)\/[a-z]*$/); return new RegExp(m ? m[1] : String(a).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') }
const fixes = (plan.captionFixes ?? []).map(([a, b]) => [fixRe(a), b])
const captions = plan.captions ?? cleanCaptions(plan.words ?? [], { fixes })
const duration = plan.duration

// audio length vs composition length
if (plan.audio) {
  const p = path.join(proj, plan.audio)
  if (!existsSync(p)) console.error(`warn audio file ${plan.audio} is not in the project yet (the render will fail until it is)`)
  else try {
    const len = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).toString())
    if (Math.abs(len - duration) > 0.1) console.error(`warn audio is ${len.toFixed(2)} s, composition ${duration} s: align them (plan.duration / last scene end) to within 0.1 s`)
  } catch { console.error('warn ffprobe not available: could not compare audio and composition length') }
}

// Templates that need files first (widget stills): captured now, so compose() stays synchronous.
const iconSets = process.env.ANIMATED_TALK_ICON_SETS ?? process.env.TALKWEAVER_ICONS ?? look.iconSets
await prepareScenes(scenes, { projDir: proj, warn: m => console.error('note ' + m) })

const { html, warnings, moves } = compose({
  projDir: proj, iconSets,
  look, duration, audio: plan.audio ? { src: plan.audio } : null, scenes, captions,
  titleMode: opt['title-mode'] ?? plan.titleMode ?? 'kicker', afterIntro: opt['after-intro'] ?? plan.afterIntro
})
const settleOf = Object.fromEntries(moves.map(m => [m.id, m.settle]))
writeFileSync(path.join(proj, 'index.html'), html)
// N32 empty-frame check: a sparse settled state while narration runs over it (>= 6 spoken words and >= 3 s)
function sparseOf(sc, i) {
  const why = sparseReason(sc.slide)
  if (!why) return null
  const spoken = (plan.words ?? []).filter(w => w.s >= sc.start && w.s < sc.end).length
  return spoken >= 6 && sc.end - sc.start >= 3 ? `${why}; ${spoken} words are spoken over it` : null
}
writeFileSync(path.join(proj, 'scenes.json'), JSON.stringify(plan.scenes.map((sc, i) => {
  // an inserted interlude (analogy) is timed by its own nodes, tags and loop, not by units
  const own = sc.slide.nodes ? [...sc.slide.nodes.flatMap(n => [n.t, n.tagT ?? 0]), sc.slide.loop?.t ?? 0] : []
  const last = own.length ? Math.max(...own) : sc.units?.length ? sc.units[sc.units.length - 1].t : sc.start + 1.5
  return { id: 's' + (i + 1), slideId: sc.slideId, layout: sc.slide.layout, title: sc.slide.title, start: sc.start, end: sc.end,
    sparse: sparseOf(sc, i), settle: settleOf['s' + (i + 1)] ?? sc.start, settled: +Math.min(sc.end - 0.4, last + 2.6).toFixed(2) }
}), null, 1) + '\n')
writeFileSync(path.join(proj, 'captions.vtt'), captionsToVtt(captions))
writeFileSync(path.join(proj, 'transcript.md'), `# ${plan.title ?? 'Transcript'}\n\n` + captions.map(c => c[2]).join(' ').replace(/([.?!]) /g, '$1\n\n') + '\n')
writeFileSync(path.join(proj, 'chapters.txt'), chaptersFrom(scenes) + '\n')

for (const w of warnings) console.error('warn ' + w)
for (const [i, sc] of plan.scenes.entries()) { const m = sparseOf(sc, i); if (m) console.error(`warn s${i + 1} (${sc.slideId}): EMPTY FRAME (N32) ${m}: illustrate it or merge it into the scene it belongs to`) }
for (const sc of plan.scenes) { const r = resolveLayout(sc.slide.layout); if (!r.exact) console.error(`fallback ${sc.slideId}: tag "${r.tag}" drawn as ${r.layout}`) }
console.error(`index.html written: ${plan.scenes.length} scenes, ${duration} s, ${captions.length} caption lines, ${warnings.length} compose warnings`)
if (plan.buildSources) console.error('build sources ' + JSON.stringify(plan.buildSources))
