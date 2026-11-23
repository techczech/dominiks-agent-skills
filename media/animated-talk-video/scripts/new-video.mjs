#!/usr/bin/env node
// Scaffolds a HyperFrames video project wired to the kit.
// usage: node new-video.mjs <dir> [--title "Talk title"] [--outline path/to/outline.md] [--install]
//   --outline   copy this outline into the project (default: a stub; assets/sample-outline.md shows every layout tag used by the smoke test)
//   --install   run `npm install --save-exact hyperframes@0.8.214` in the project (131 MB; skip it and the CLI runs through npx instead)
// Creates: kit/ (templates, icons, review tools; yours to edit), tools/ (plan, build, hf, join-clips, prerelease, make-covers, jump-scan), look.json, outline.md, hyperframes.json,
// package.json, .gitignore, fonts/ audio/ assets/. House fonts (Fraunces, Alegreya Sans, Geist, Inter; OFL) come with the kit in kit/fonts/ and load by @font-face from there; look.json `type` picks the preset (D18).
import { cpSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const skill = path.resolve(here, '..')
const argv = process.argv.slice(2), o = {}, pos = []
for (let i = 0; i < argv.length; i++) { if (argv[i] === '--install') o.install = true; else if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[++i]; else pos.push(argv[i]) }
if (!pos[0]) { console.error('usage: node new-video.mjs <dir> [--title T] [--outline file] [--install]'); process.exit(1) }
const dir = path.resolve(pos[0])
if (existsSync(dir) && readdirSync(dir).length) { console.error(`${dir} is not empty; pick a new folder`); process.exit(1) }
const name = path.basename(dir).toLowerCase().replace(/[^a-z0-9-]+/g, '-')
const PIN = '0.8.214'
mkdirSync(dir, { recursive: true })
for (const d of ['fonts', 'audio', 'assets', 'tools']) mkdirSync(path.join(dir, d), { recursive: true })
cpSync(path.join(skill, 'assets/kit'), path.join(dir, 'kit'), { recursive: true })
// Fingerprint of the kit as copied: prerelease.mjs lists any kit file this project later changes, so the fix goes back to the skill (D15).
{
  const { createHash } = await import('node:crypto'), files = {}
  const walk = (d, rel = '') => { for (const n of readdirSync(d, { withFileTypes: true })) { const r = rel ? rel + '/' + n.name : n.name; if (n.isDirectory()) walk(path.join(d, n.name), r); else files[r] = createHash('sha256').update(readFileSync(path.join(d, n.name))).digest('hex') } }
  walk(path.join(dir, 'kit'))
  writeFileSync(path.join(dir, 'kit/.kit-manifest.json'), JSON.stringify({ made: new Date().toISOString(), files }, null, 1) + '\n')
}
for (const f of ['plan-from-timings.mjs', 'build-video.mjs', 'hf.mjs', 'join-clips.mjs', 'build-gallery.mjs', 'align-words.mjs', 'storyboard.mjs', 'companion.mjs', 'companion-player.mjs', 'companion-series.mjs', 'prerelease.mjs', 'jump-scan.mjs', 'make-covers.mjs']) cpSync(path.join(here, f), path.join(dir, 'tools', f))
const put = (f, s) => writeFileSync(path.join(dir, f), s)
put('hyperframes.json', JSON.stringify({
  $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
  registry: 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry',
  paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
  media: { autoProxy: true }
}, null, 2) + '\n')
put('meta.json', JSON.stringify({ id: name, name, createdAt: new Date().toISOString() }) + '\n')
put('package.json', JSON.stringify({
  name, private: true, type: 'module',
  scripts: {
    plan: 'node tools/plan-from-timings.mjs --outline outline.md --out plan.json',
    build: 'node tools/build-video.mjs .',
    check: 'node tools/hf.mjs check',
    prerelease: 'node tools/prerelease.mjs .',
    covers: 'node tools/make-covers.mjs .',
    snapshot: 'node tools/hf.mjs snapshot --scenes',
    render: 'node tools/hf.mjs render',
    status: 'node tools/hf.mjs status',
    storyboard: 'node tools/storyboard.mjs .',
    review: 'node kit/tools/review-page.mjs .',
    serve: 'node kit/tools/review-page.mjs serve .'
  }
}, null, 2) + '\n')
put('.gitignore', 'node_modules/\nfonts/\nsnaps/\nrenders/\nrender.*\n*.log\nfeedback/\n')
put('look.json', JSON.stringify({
  _note: 'Overrides for the kit look (see defaultLook in kit/templates/index.mjs). Keys: paper, ink, muted, hairline, accents{green,blue,orange,red}, tints{...}, type (fraunces-alegreya | geist | inter; kit/fonts/ holds the files), fonts{display,text,mono} (family names), fontFaces[{family,weight,src}] for your own files, mono. Delete this _note line or leave it.'
}, null, 2) + '\n')
const stub = o.outline ? readFileSync(o.outline, 'utf8') : `# ${o.title ?? 'Video title'}\n\n## First section\n\n### First slide\n{list}\n- First point\n- Second point\n> Narration for this slide, one paragraph, in the words to be spoken.\n`
put('outline.md', stub)
if (o.install) {
  const r = spawnSync('npm', ['install', '--save-exact', '--no-fund', '--no-audit', `hyperframes@${PIN}`], { cwd: dir, stdio: 'inherit' })
  if (r.status) console.error('npm install failed: the CLI will run through npx instead')
}
console.log(`project ready: ${dir}
next (from that folder):
  1. edit outline.md (layout tags and narration: references/inputs.md)
  2. npm run plan            (route A: estimated timings; route B: node tools/plan-from-timings.mjs --outline outline.md --timings timings.csv --words words.json --audio audio/voice.m4a --out plan.json)
  3. npm run build           (writes index.html, scenes.json, captions.vtt, chapters.txt)
  4. npm run check && npm run snapshot   then LOOK at every still in snaps/
  5. npm run render          (detached; npm run status to follow it)`)
