#!/usr/bin/env node
// Makes the cover images the pre-release gate (N65, N73) asks for: cover.jpg 1920x1080, thumbnail.jpg 1280x720, cover-og.jpg 1200x630 (centre crop).
// usage: node tools/make-covers.mjs <project> [--from mp4|svg] [--mp4 file] [--at seconds]
//   --from mp4   cut the frame at --at (default 0, the first frame) from the rendered MP4 (default file: renders/<name>.mp4, else the newest renders/*.mp4)
//   --from svg   draw the first scene's frame JSON with the kit (rsvg-convert): a stand-in so the storyboard stage can pass before a render; rerun with --from mp4 after it
//   default      mp4 when a render exists, else svg. Needs ffmpeg; svg also needs rsvg-convert. Writes into the project folder, overwriting.
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2), opt = {}, pos = []
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[++i]; else pos.push(argv[i]) }
const proj = path.resolve(pos[0] ?? '.')
const die = m => { console.error(m); process.exit(1) }
const sh = (c, a) => { const r = spawnSync(c, a, { encoding: 'utf8' }); if (r.error || r.status) die(`${c} failed: ${r.error?.message ?? r.stderr.slice(-300)}`) }
const readJson = f => JSON.parse(readFileSync(f, 'utf8'))

const rdir = path.join(proj, 'renders')
const mp4s = existsSync(rdir) ? readdirSync(rdir).filter(f => /\.mp4$/i.test(f)).map(f => path.join(rdir, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs) : []
const mp4 = opt.mp4 ? path.resolve(opt.mp4) : mp4s.find(f => path.basename(f, '.mp4') === path.basename(proj)) ?? mp4s[0]
const from = opt.from ?? (mp4 ? 'mp4' : 'svg')
if (!['mp4', 'svg'].includes(from)) die('--from is mp4 or svg')

const tmp = mkdtempSync(path.join(tmpdir(), 'covers-'))
let src
if (from === 'mp4') {
  if (!mp4 || !existsSync(mp4)) die('no rendered MP4 found (renders/*.mp4); render first, or use --from svg')
  src = path.join(tmp, 'f.png')
  sh('ffmpeg', ['-v', 'error', '-y', '-ss', String(opt.at ?? 0), '-i', mp4, '-frames:v', '1', src])
} else {
  const kitDir = [path.join(here, '../kit'), path.join(here, '../assets/kit')].find(d => existsSync(path.join(d, 'templates/index.mjs')))
  if (!kitDir) die('kit not found next to this script')
  const { frameToSvg } = await import(pathToFileURL(path.join(kitDir, 'templates/_frame.mjs')).href)
  const { loadFrame } = await import(pathToFileURL(path.join(kitDir, 'templates/illustration.mjs')).href)
  const plan = existsSync(path.join(proj, 'plan.json')) ? readJson(path.join(proj, 'plan.json')) : null
  const slide = plan?.scenes?.[0]?.slide
  if (!slide || !(slide.frame || slide.frameData)) die('the first scene is not a frame JSON (illustration): render the video and use --from mp4')
  const look = existsSync(path.join(proj, 'look.json')) ? readJson(path.join(proj, 'look.json')) : {}
  delete look._note
  const frame = loadFrame(slide, proj); frame.id = frame.id ?? 's1'
  const svg = frameToSvg(frame, { look, iconSets: process.env.ANIMATED_TALK_ICON_SETS ?? process.env.TALKWEAVER_ICONS ?? look.iconSets, warn: m => console.error('warn ' + m) }).svg
    .replace(/<image href="([^":]+)"/g, (m, s) => existsSync(path.resolve(proj, s)) ? `<image href="${pathToFileURL(path.resolve(proj, s)).href}"` : m)
  const sf = path.join(tmp, 'f.svg'); writeFileSync(sf, svg)
  src = path.join(tmp, 'f.png')
  sh('rsvg-convert', ['-w', '1920', '-h', '1080', '-b', look.paper ?? '#ffffff', '-o', src, sf])
}
const out = (name, w, h) => sh('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`, '-frames:v', '1', '-q:v', '2', path.join(proj, name)])
out('cover.jpg', 1920, 1080); out('thumbnail.jpg', 1280, 720); out('cover-og.jpg', 1200, 630)
rmSync(tmp, { recursive: true, force: true })
console.log(`cover.jpg 1920x1080, thumbnail.jpg 1280x720, cover-og.jpg 1200x630 written to ${proj} (from ${from === 'mp4' ? mp4 : 'the first scene frame, drawn with rsvg-convert: a stand-in; rerun with --from mp4 after the render'})`)
