#!/usr/bin/env node
// Runs the pinned HyperFrames CLI with telemetry, update checks and skill installs off.
// usage (from the project folder): node tools/hf.mjs check (HyperFrames check + the N32 empty-frame warnings from scenes.json) | snapshot [--at 4,17,36 | --scenes] | render [--wait] | status | doctor | <any hyperframes command>
//   snapshot --scenes   one still per scene at its "settled" time from scenes.json, into snaps/
//   render              starts a DETACHED render (a render tied to a shell that exits is cancelled); log in render.log; returns at once.
//                       `status` shows the log tail. Add --wait to block (use only for short videos; keep any single wait under 4 minutes).
// Uses a project-local install (node_modules/hyperframes, version-checked) if there is one, else `npx --yes hyperframes@<PIN>`.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, openSync, mkdirSync } from 'node:fs'
import path from 'node:path'

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
if (!sub) { console.error('usage: node tools/hf.mjs check | snapshot | render | status | doctor'); process.exit(1) }

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
if (sub === 'check') {
  const code = run(['check', ...rest])
  // N32 empty-frame check (build-video writes scenes.json `sparse`): warnings only, they never fail the check
  const sj = path.join(proj, 'scenes.json')
  if (existsSync(sj)) {
    const bad = JSON.parse(readFileSync(sj, 'utf8')).filter(s => s.sparse)
    for (const s of bad) console.log(`warn ${s.id} (${s.slideId ?? s.layout}): EMPTY FRAME (N32) ${s.sparse}`)
    console.log(bad.length ? `${bad.length} scene(s) nearly empty while the voice runs: illustrate them (frame JSON / widget) or merge them` : 'empty-frame check: ok')
  }
  process.exit(code)
}
process.exit(run([sub, ...rest]))
