#!/usr/bin/env node
// Runs the pinned HyperFrames CLI with telemetry, update checks and skill installs off.
// usage (from the project folder): node tools/hf.mjs check (HyperFrames check + the N32 empty-frame warnings from scenes.json + prerelease) | prerelease [--mp4 file] | snapshot [--at 4,17,36 | --scenes] | render [--wait] | status | doctor | <any hyperframes command>
//   snapshot --scenes   one still per scene at its "settled" time from scenes.json, into snaps/
//   render              starts a DETACHED render (a render tied to a shell that exits is cancelled); log in render.log; returns at once.
//                       `status` shows the log tail. Add --wait to block (use only for short videos; keep any single wait under 4 minutes).
// Uses a project-local install (node_modules/hyperframes, version-checked) if there is one, else `npx --yes hyperframes@<PIN>`.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, openSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PIN = '0.8.214'
const proj = process.cwd()
const env = { ...process.env, HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1', HYPERFRAMES_SKIP_SKILLS: '1', HYPERFRAMES_NO_UPDATE_CHECK: '1' }
// Real Chrome is never used: point at chrome-headless-shell when one is cached (puppeteer or HyperFrames).
if (!env.HYPERFRAMES_BROWSER_PATH && process.env.CHROME_HEADLESS_SHELL) env.HYPERFRAMES_BROWSER_PATH = process.env.CHROME_HEADLESS_SHELL

function cli() {
  const local = path.join(proj, 'node_modules/hyperframes/package.json')
  if (existsSync(local)) {
    const v = JSON.parse(readFileSync(local, 'utf8')).version
    if (v !== PIN) console.error(`warn local hyperframes is ${v}, the kit is tested with ${PIN}`)
    const bin = path.join(proj, 'node_modules/.bin/hyperframes')
    if (existsSync(bin)) return [bin, []]
  }
  return ['npx', ['--yes', `hyperframes@${PIN}`]]
}
const [cmd, base] = cli()
const [sub, ...rest] = process.argv.slice(2)
if (!sub) { console.error('usage: node tools/hf.mjs check | prerelease | snapshot | render | status | doctor'); process.exit(1) }

const run = args => spawnSync(cmd, [...base, ...args], { stdio: 'inherit', env, cwd: proj }).status ?? 1

if (sub === 'telemetry-off') process.exit(run(['telemetry', 'disable']))
if (sub === 'snapshot') {
  let at = null, args = rest.filter(a => a !== '--scenes')
  if (rest.includes('--scenes')) {
    const sc = JSON.parse(readFileSync(path.join(proj, 'scenes.json'), 'utf8'))
    at = sc.map(s => s.settled).join(',')
    const mid = sc.slice(1).map(s => (s.start + (s.settle - s.start) / 2).toFixed(2))   // middle of each move
    if (rest.includes('--moves')) at += ',' + mid.join(',')
    args = args.filter(a => a !== '--moves')
  }
  if (!args.includes('-o')) args.push('-o', 'snaps')
  process.exit(run(['snapshot', ...(at ? ['--at', at] : []), ...args]))
}
if (sub === 'render') {
  const wait = rest.includes('--wait'), args = rest.filter(a => a !== '--wait')
  const name = path.basename(proj)
  mkdirSync(path.join(proj, 'renders'), { recursive: true })
  if (!args.includes('-o')) args.push('-o', `renders/${name}.mp4`)
  if (wait) process.exit(run(['render', ...args]))
  const log = openSync(path.join(proj, 'render.log'), 'w')
  const child = spawn(cmd, [...base, 'render', ...args], { cwd: proj, env: { ...env, HYPERFRAMES_RENDER_DETACHED: '1' }, detached: true, stdio: ['ignore', log, log] })
  child.unref()
  console.log(`render started (pid ${child.pid}); log: render.log; output: ${args[args.indexOf('-o') + 1]}\ncheck with: node tools/hf.mjs status`)
  process.exit(0)
}
if (sub === 'status') {
  const p = path.join(proj, 'render.log')
  if (!existsSync(p)) { console.log('no render.log'); process.exit(0) }
  console.log(readFileSync(p, 'utf8').split('\n').slice(-15).join('\n'))
  process.exit(0)
}
// Known HyperFrames lint codes that do not apply to this kit's design: shown as one line, not 12 repeated warnings (nothing is hidden).
// nested_structure_needs_subcomposition: every kit scene is a div with child elements inside one root timeline (one GSAP timeline, one
// shared clock for scenes, builds and captions); HyperFrames wants each scene in its own data-composition-src file. Splitting would give each
// scene its own timeline and break the cross-scene moves, so the kit keeps one composition. The timeline panel shows one row per scene either way.
const silent = (() => { try { return JSON.parse(readFileSync(path.join(proj, 'plan.json'), 'utf8')).profile === 'silent' || JSON.parse(readFileSync(path.join(proj, 'look.json'), 'utf8')).profile === 'silent' } catch { return false } })()
// Under the silent profile (D16) short step cards use a 1.2 s floor; HyperFrames' own line_unread floor (0.5 s + 0.3 s a word) is not configurable, so only lines held >= 1.2 s are listed as known; film_silent is the point of a silent film.
const KNOWN = {
  nested_structure_needs_subcomposition: [() => true, 'kit scenes are nested divs in one root timeline by design (shared clock for moves, builds, captions)'],
  ...(silent ? {
    line_unread: [t => +(t.match(/on screen ([\d.]+) s/)?.[1] ?? 0) >= 1.2, 'silent profile (D16): short step cards are held 1.2 s or more; the HyperFrames floor cannot be tuned'],
    film_silent: [() => true, 'silent profile (D16): the film is silent on purpose']
  } : {})
}
function runCheck(args) {
  const r = spawnSync(cmd, [...base, ...args], { env, cwd: proj, encoding: 'utf8', maxBuffer: 1 << 28 })
  const out = (r.stdout ?? '') + (r.stderr ?? ''), lines = out.split('\n'), keep = [], seen = {}
  const at = []   // keep-index where a finding was dropped: its section's count line is the next one
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*⚠ (\w+):/)
    if (m && KNOWN[m[1]]?.[0](lines[i])) {
      seen[m[1]] = (seen[m[1]] ?? 0) + 1; at.push(keep.length)
      while (i + 1 < lines.length && /^\s{4}\S/.test(lines[i + 1])) i++
      continue
    }
    keep.push(lines[i])
  }
  for (const p of at) { const k = keep.findIndex((l, j) => j >= p && /\d+ warning\(s\)/.test(l)); if (k >= 0) keep[k] = keep[k].replace(/(\d+) warning\(s\)/, (_, n) => `${Math.max(0, n - 1)} warning(s)`) }
  console.log(keep.join('\n').replace(/\n+$/, ''))
  for (const [k, n] of Object.entries(seen)) console.log(`known    ${k} x${n}: ${KNOWN[k][1]}`)
  return r.status ?? 1
}
if (sub === 'check') {
  const code = runCheck(['check', ...rest])
  // N32 empty-frame check (build-video writes scenes.json `sparse`): warnings only, they never fail the check
  const sj = path.join(proj, 'scenes.json')
  if (existsSync(sj)) {
    const bad = JSON.parse(readFileSync(sj, 'utf8')).filter(s => s.sparse)
    for (const s of bad) console.log(`warn ${s.id} (${s.slideId ?? s.layout}): EMPTY FRAME (N32) ${s.sparse}`)
    console.log(bad.length ? `${bad.length} scene(s) nearly empty while the voice runs: illustrate them (frame JSON / widget) or merge them` : 'empty-frame check: ok')
  }
  // D14 pre-release gate: runs after the HyperFrames check unless prerelease.mjs itself called this check (PRERELEASE_INNER)
  if (!process.env.PRERELEASE_INNER) {
    console.log('\n--- prerelease ---')
    const pr = spawnSync(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), 'prerelease.mjs'), proj], { stdio: 'inherit', env: { ...env, PRERELEASE_HF_STATUS: String(code) }, cwd: proj }).status ?? 1
    process.exit(code || pr)
  }
  process.exit(code)
}
if (sub === 'prerelease') process.exit(spawnSync(process.execPath, [path.join(path.dirname(fileURLToPath(import.meta.url)), 'prerelease.mjs'), proj, ...rest], { stdio: 'inherit', env, cwd: proj }).status ?? 1)
process.exit(run([sub, ...rest]))
