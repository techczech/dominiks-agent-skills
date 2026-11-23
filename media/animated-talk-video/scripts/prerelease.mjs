#!/usr/bin/env node
// Pre-release gate (decision D14). Read-only: writes nothing into the project.
// usage: node tools/prerelease.mjs <project> [--mp4 file]      (from a project: node tools/prerelease.mjs .)
// Prints one line per check: `status  rule  check  detail` with status pass | warn | fail | not-run, then the rules it does not
// check automatically. Exit 1 on any fail. Whole run stays under about 4 minutes (each step has a time cap).
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { scanJumps } from './jump-scan.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2), pos = []
let mp4Arg = null
for (let i = 0; i < argv.length; i++) { if (argv[i] === '--mp4') mp4Arg = argv[++i]; else pos.push(argv[i]) }
const proj = path.resolve(pos[0] ?? '.')
const P = (...a) => path.join(proj, ...a)
const t0 = Date.now(), BUDGET = 230000
const left = () => BUDGET - (Date.now() - t0)
const rows = []
const add = (status, rule, check, detail = '') => rows.push({ status, rule, check, detail })
const readJson = f => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return null } }
// Runs a command with a hard time cap; on timeout the whole process group is killed (a browser child would otherwise keep the pipe open).
const run = (cmd, args, cap, opts = {}) => new Promise(resolve => {
  const ms = Math.min(cap, left())
  if (ms < 5000) return resolve({ skipped: 'time budget used up' })
  const p = spawn(cmd, args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'], ...opts })
  let stdout = '', stderr = '', timedOut = false
  p.stdout.on('data', d => { stdout += d }); p.stderr.on('data', d => { stderr += d })
  const timer = setTimeout(() => { timedOut = true; try { process.kill(-p.pid, 'SIGKILL') } catch {} }, ms)
  p.on('error', e => { clearTimeout(timer); resolve({ skipped: e.message }) })
  p.on('close', status => { clearTimeout(timer); resolve(timedOut ? { skipped: `timed out after ${Math.round(ms / 1000)} s` } : { status, stdout, stderr }) })
})
// The HyperFrames CLI records state in <project>/.hyperframes on every check. Snapshot it and put it back, so this gate writes nothing.
const hfDir = P('.hyperframes')
const walk = d => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : []
const hfSnapshot = () => new Map(walk(hfDir).map(f => [f, readFileSync(f)]))
function hfRestore(snap, existed) {
  if (!existed) { rmSync(hfDir, { recursive: true, force: true }); return }
  for (const f of walk(hfDir)) if (!snap.has(f)) rmSync(f, { force: true })
  for (const [f, b] of snap) if (!existsSync(f) || !readFileSync(f).equals(b)) writeFileSync(f, b)
  const prune = d => { for (const e of readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) { prune(path.join(d, e.name)); if (!readdirSync(path.join(d, e.name)).length) rmSync(path.join(d, e.name), { recursive: true }) } }
  prune(hfDir)
}
const lines = s => (s || '').split('\n').filter(l => l.trim())

if (!existsSync(proj)) { console.error(`no such folder: ${proj}`); process.exit(1) }
const plan = readJson(P('plan.json'))
const scenes = plan?.scenes ?? []
const narrated = scenes.filter(s => (s.narration || '').trim())
const frameFiles = existsSync(P('frames')) ? readdirSync(P('frames')).filter(f => f.endsWith('.json')).map(f => P('frames', f)) : []

// Visible text of frames and plan titles (no narration, ids or style words).
const SKIP = new Set(['narration', 'id', 'cue', 'scene', 'type', 'mark', 'icon', 'src', 'key', 'motion', 'stagger', 'tone', 'role', 'kind', 'pages', 'parts', 'hide', 'dim', 'target', 'font', 'color', 'fill', 'stroke', 'anchor', 'align', 'transition', 'layout', 'frame'])
function strings(o, out = [], k = '') {
  if (typeof o === 'string') { if (!SKIP.has(k) && o.length > 1) out.push(o) }
  else if (Array.isArray(o)) o.forEach(v => strings(v, out, k))
  else if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) strings(v, out, kk)
  return out
}
const frameText = frameFiles.flatMap(f => strings(readJson(f)).map(t => ({ f: path.basename(f), t })))
const planTitles = scenes.map(s => ({ f: s.slideId, t: s.slide?.title || '' })).filter(x => x.t)
const chapterLines = existsSync(P('chapters.txt')) ? lines(readFileSync(P('chapters.txt'), 'utf8')).map(t => ({ f: 'chapters.txt', t })) : []

// 0. Kit drift (D13, D15): a fix made in this project's kit/ copy must go back to the skill kit, or the next video repeats the defect.
{
  const man = readJson(P('kit/.kit-manifest.json'))
  if (!existsSync(P('kit'))) add('not-run', 'D15', 'kit changes taken back to the skill', 'no kit/ folder')
  else if (!man?.files) add('warn', 'D15', 'kit changes taken back to the skill', 'no kit/.kit-manifest.json (project made before 13 Nov 2026): compare kit/ with the skill kit by hand and take any fix back')
  else {
    const changed = Object.entries(man.files).filter(([f, h]) => !existsSync(P('kit', f)) || createHash('sha256').update(readFileSync(P('kit', f))).digest('hex') !== h).map(([f]) => f)
    add(changed.length ? 'warn' : 'pass', 'D15', 'kit changes taken back to the skill', changed.length ? `${changed.length} kit file(s) changed in this project: ${changed.slice(0, 6).join(', ')}${changed.length > 6 ? ' …' : ''}; take each fix back to the skill kit (assets/kit) and say so in the build report` : 'kit/ matches the copy made at scaffold')
  }
}

// 1. Frame lint (Parcel A)
{
  const own = P('kit/tools/lint-frames.mjs'), fallback = path.resolve(here, '../assets/kit/tools/lint-frames.mjs')
  const lint = existsSync(own) ? own : existsSync(fallback) ? fallback : null
  if (!lint) add('not-run', 'D1-D13', 'frame lint', 'kit/tools/lint-frames.mjs is absent')
  else if (!frameFiles.length) add('not-run', 'D1-D13', 'frame lint', 'no frames/*.json')
  else {
    const r = await run('node', [lint, proj], 100000, { cwd: proj })
    if (r.skipped) add('not-run', 'D1-D13', 'frame lint', r.skipped)
    else {
      const out = lines(r.stdout + '\n' + r.stderr), nErr = out.filter(l => /^\s*error\b/i.test(l)).length, nWarn = out.filter(l => /^\s*warn/i.test(l)).length
      const show = out.filter(l => /^\s*(error|warn)/i.test(l)).slice(0, 5).map(l => '\n        ' + l.trim()).join('')
      add(r.status ? 'fail' : nWarn ? 'warn' : 'pass', 'D1-D13', 'frame lint', `${nErr} error(s), ${nWarn} warning(s)${show}${nErr + nWarn > 5 ? '\n        ... run: node kit/tools/lint-frames.mjs .' : ''}`)
    }
  }
}

// 2. HyperFrames check (errors fail; contrast AA). hf.mjs skips its own prerelease call when PRERELEASE_INNER is set.
{
  const hf = existsSync(P('tools/hf.mjs')) ? P('tools/hf.mjs') : path.join(here, 'hf.mjs')
  if (!existsSync(P('index.html'))) add('not-run', 'N32', 'HyperFrames check', 'no index.html (run the build first)')
  else if (process.env.PRERELEASE_HF_STATUS !== undefined) {   // called from `hf.mjs check`, which has just run it: do not run twice
    const st = +process.env.PRERELEASE_HF_STATUS
    add(st ? 'fail' : 'pass', 'N32', 'HyperFrames check', `exit ${st} (run by hf.mjs check just above; contrast is in its output)`)
  } else {
    const existed = existsSync(hfDir), snap = existed ? hfSnapshot() : null
    const r = await run('node', [hf, 'check'], 110000, { cwd: proj, env: { ...process.env, PRERELEASE_INNER: '1' } })
    hfRestore(snap, existed)
    if (r.skipped) add('not-run', 'N32', 'HyperFrames check', `${r.skipped}; run node tools/hf.mjs check on its own`)
    else {
      const out = (r.stdout + '\n' + r.stderr).replace(/\x1b\[[0-9;]*m/g, ''), c = out.match(/(\d+)\s*\/\s*(\d+)\s+text checks pass/i)
      const nErr = [...out.matchAll(/(\d+) errors?(?:\(s\))?\b/g)].reduce((a, m) => a + +m[1], 0)
      const noBrowser = /Browser session never ran/.test(out)
      const contrastBad = c && c[1] !== c[2]
      const bad = lines(out).filter(l => /✗|check_runtime_failure|Browser session never ran/.test(l)).slice(0, 3).map(l => '\n        ' + l.trim().slice(0, 200)).join('')
      add(r.status || contrastBad || noBrowser ? 'fail' : 'pass', 'N32', 'HyperFrames check', `exit ${r.status}, ${nErr} error(s)${c ? `, contrast ${c[1]}/${c[2]} AA` : ', contrast line not found'}${noBrowser ? ', browser never ran' : ''}${bad}`)
    }
  }
}

// 3. Title page and thumbnail
{
  const thumb = existsSync(P('thumbnail.jpg'))
  const first = scenes[0]
  let titleOk = first && /title|cover|hook/i.test(`${first.slideId} ${first.slide?.role ?? ''} ${first.slide?.layout ?? ''}`)
  // D16: a silent film opens by saying what it is about, so a textblock, step or steps list (frame with only those elements) or a statement slide is a valid opening.
  const silent = (plan?.profile ?? readJson(P('look.json'))?.profile) === 'silent'
  if (!titleOk && silent && first) {
    const fr = first.slide?.frameData ?? (first.slide?.frame ? readJson(P(first.slide.frame)) : null)
    const els = fr ? [...(fr.elements ?? []), ...(fr.builds ?? []).flatMap(b => b.elements ?? [])] : []
    titleOk = els.length ? els.every(e => ['textblock', 'step', 'steps'].includes(e.type)) : /^(statement|quote)$/.test(first.slide?.layout ?? '')
  }
  if (!plan && !thumb) add('not-run', 'N65, N73', 'title page and thumbnail', 'no plan.json and no thumbnail.jpg yet')
  else if (!thumb) add('fail', 'N73', 'title page and thumbnail', 'thumbnail.jpg is missing: run node tools/make-covers.mjs . (from the first frame; add --from mp4 after the render)')
  else if (!plan) add('warn', 'N65', 'title page and thumbnail', 'thumbnail.jpg present; no plan.json to confirm the first scene is a title page')
  else add(titleOk ? 'pass' : 'fail', 'N65, N73', 'title page and thumbnail', titleOk ? `thumbnail.jpg present; first scene "${first.slideId}"${silent && !/title|cover|hook/i.test(first.slideId) ? ' (silent profile: opens with a statement)' : ''}` : `first scene "${first?.slideId}" is not a title page: add frames/title.json (house card: kit/samples/frames/title-card.json) as the first scene, render, then node tools/make-covers.mjs . --from mp4 so the covers are that card`)
}

// 4. Storyboard newer than frames
{
  const sb = P('storyboard.html')
  if (!frameFiles.length) add('not-run', 'N44', 'storyboard is current', 'no frames/*.json')
  else if (!existsSync(sb)) add('fail', 'N44', 'storyboard is current', 'storyboard.html is missing')
  else {
    const newest = frameFiles.map(f => ({ f, m: statSync(f).mtimeMs })).sort((a, b) => b.m - a.m)[0]
    const sm = statSync(sb).mtimeMs
    add(sm >= newest.m ? 'pass' : 'fail', 'N44', 'storyboard is current', sm >= newest.m ? 'storyboard.html is newer than every frame' : `storyboard.html is older than ${path.basename(newest.f)} by ${Math.round((newest.m - sm) / 60000)} min: rebuild it (node tools/storyboard.mjs .)`)
  }
}

// 5. Narration lint
const narrationOf = s => (s.narration || '').normalize('NFC').trim()
{
  if (!narrated.length) {
    for (const [rule, c] of [['N50', 'narration opening'], ['N41', 'numbered steps'], ['N42', 'hedge phrases'], ['N74', 'speaker named once'], ['N67', 'words per minute']]) add('not-run', rule, c, 'no narration in plan.json')
  } else {
    const where = (re, list = narrated) => list.filter(s => re.test(narrationOf(s))).map(s => s.slideId)
    const first = narrationOf(narrated[0])
    add(/^\W*(in )?this (short )?video\b/i.test(first) ? 'fail' : 'pass', 'N50', 'narration opening', /^\W*(in )?this (short )?video\b/i.test(first) ? `opens "${first.slice(0, 50)}"` : 'does not open with "This video"')
    const steps = where(/\bstep (one|two|three|four|five|six|\d+)\b|\bfirst step\b|\bnext step\b/i)
    add(steps.length ? 'fail' : 'pass', 'N41', 'numbered steps', steps.length ? `in ${steps.slice(0, 6).join(', ')}` : 'none')
    const hedge = /\b(it does(n'?t| not) mean|this does(n'?t| not) mean|not to say|it'?s worth (noting|saying)|it is worth (noting|saying)|it is important to (note|remember)|arguably|to be fair|of course|in some ways|it could be argued|perhaps|might be)\b/i
    const hs = where(hedge)
    add(hs.length ? 'warn' : 'pass', 'N42', 'hedge phrases', hs.length ? `in ${hs.slice(0, 8).join(', ')}${hs.length > 8 ? ` (+${hs.length - 8})` : ''}` : 'none')
    // N74: speaker surname from companion.json citation ("Surname, I.") or a `speaker` field
    const comp = readJson(P('companion.json'))
    const sur = (comp?.speaker?.split(/\s+/).pop() ?? comp?.citation?.match(/^([^,.]+),/)?.[1]?.trim())?.normalize('NFC')
    if (!sur) add('not-run', 'N74', 'speaker named once', 'no speaker or citation in companion.json')
    else {
      const re = new RegExp(`(?<!\\p{L})\\p{Lu}\\p{L}+\\s+${sur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\p{L})`, 'gu')
      const all = narrated.flatMap(s => (narrationOf(s).match(re) || []).map(() => s.slideId))
      add(all.length > 1 ? 'warn' : 'pass', 'N74', 'speaker named once', all.length > 1 ? `full name ${all.length} times (${all.slice(0, 6).join(', ')}); use first name after the first` : `full name ${all.length} time(s)`)
    }
    const secs = narrated.reduce((a, s) => a + (s.end - s.start), 0), words = narrated.reduce((a, s) => a + narrationOf(s).split(/\s+/).length, 0)
    const wpm = words / (secs / 60)
    add(wpm < 140 || wpm > 165 ? 'fail' : 'pass', 'N67', 'words per minute', `${wpm.toFixed(0)} wpm over ${secs.toFixed(0)} s of narrated scenes (target 140-165)`)
  }
}

// 5b. N35 key phrases, N86 labels
{
  const phr = []
  if (existsSync(P('script.md'))) for (const l of readFileSync(P('script.md'), 'utf8').split('\n')) { const m = l.match(/^\s*(?:Key phrase|Hook)\s*:\s*(.+)/i); if (m) phr.push({ f: 'script.md', t: m[1] }) }
  for (const x of planTitles) phr.push(x)
  if (!phr.length) add('not-run', 'N35', 'key phrases up to nine words', 'no key phrases or titles found')
  else {
    const long = phr.filter(x => x.t.trim().split(/\s+/).length > 9)
    add(long.length ? 'warn' : 'pass', 'N35', 'key phrases up to nine words', long.length ? `${long.length} over nine words, e.g. "${long[0].t.slice(0, 60)}" (${long[0].f})` : `${phr.length} phrase(s) checked`)
  }
  const labels = [...frameText, ...planTitles, ...chapterLines]
  if (!labels.length) add('not-run', 'N86', 'no "journey" in labels', 'no frames, titles or chapters')
  else {
    const j = labels.filter(x => /\bjourney/i.test(x.t))
    add(j.length ? 'fail' : 'pass', 'N86', 'no "journey" in labels', j.length ? `${j.length} label(s), e.g. "${j[0].t.slice(0, 50)}" (${j[0].f})` : 'none')
  }
}

// 6. Visual cadence
{
  if (!narrated.length) add('not-run', 'N68', 'visual cadence', 'no plan.json narration')
  else {
    const gaps = []
    for (const s of narrated) {
      const ev = [s.start, ...(s.units || []).map(u => u.t).filter(t => t >= s.start && t <= s.end)].sort((a, b) => a - b)
      ev.push(s.end)
      for (let i = 1; i < ev.length; i++) if (ev[i] - ev[i - 1] > 4) gaps.push({ id: s.slideId, at: ev[i - 1], gap: ev[i] - ev[i - 1] })
    }
    gaps.sort((a, b) => b.gap - a.gap)
    add(gaps.length ? 'warn' : 'pass', 'N68', 'visual cadence', gaps.length ? `${gaps.length} gap(s) over 4 s without a visual event while the voice runs; longest ${gaps[0].gap.toFixed(1)} s in ${gaps[0].id} at ${gaps[0].at.toFixed(1)} s` : 'no gap over 4 s')
  }
  const sc = readJson(P('scenes.json'))
  if (!sc) add('not-run', 'N32', 'arrival on landing', 'no scenes.json')
  else {
    const sp = sc.filter(s => s.sparse)
    add(sp.length ? 'warn' : 'pass', 'N32', 'arrival on landing', sp.length ? `${sp.length} nearly empty scene(s): ${sp.slice(0, 5).map(s => s.id).join(', ')}` : `${sc.length} scene(s), none nearly empty`)
  }
}

// 7. MP4
{
  let mp4 = mp4Arg ? path.resolve(mp4Arg) : null
  if (!mp4) {
    const c = [...(existsSync(proj) ? readdirSync(proj).filter(f => f.endsWith('.mp4')).map(f => P(f)) : []), ...(existsSync(P('renders')) ? readdirSync(P('renders')).filter(f => f.endsWith('.mp4')).map(f => P('renders', f)) : [])]
    mp4 = c.find(f => /web/i.test(f)) ?? c.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] ?? null
  }
  const N = ['jump scan', 'loudness -16 LUFS', 'duration matches the plan', 'web file under 25 MB']
  if (!mp4 || !existsSync(mp4)) for (const c of N) add('not-run', 'D14', c, mp4 ? `${mp4} not found` : 'no MP4 given or found')
  else {
    const name = path.basename(mp4)
    // duration
    const pr = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], 20000)
    const dur = pr.skipped ? NaN : parseFloat(pr.stdout)
    if (!Number.isFinite(dur)) add('not-run', 'D14', 'duration matches the plan', pr.skipped ?? 'ffprobe could not read the file')
    else if (!plan?.duration) add('not-run', 'D14', 'duration matches the plan', `${dur.toFixed(1)} s; no plan.json duration`)
    else add(Math.abs(dur - plan.duration) > 1.5 ? 'fail' : 'pass', 'D14', 'duration matches the plan', `${name} ${dur.toFixed(1)} s, plan ${plan.duration.toFixed(1)} s`)
    // size
    const mb = statSync(mp4).size / 1048576
    if (!/web/i.test(name)) add('not-run', 'D14', 'web file under 25 MB', `${name} (${mb.toFixed(1)} MB) is not named as a web encode`)
    else add(mb > 25 ? 'fail' : 'pass', 'D14', 'web file under 25 MB', `${mb.toFixed(1)} MB`)
    // loudness
    const lr = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', mp4, '-vn', '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], 70000)
    const lm = lr.skipped ? null : [...(lr.stderr || '').matchAll(/\bI:\s+(-?[\d.]+)\s+LUFS/g)].pop()
    if (!lm) add('not-run', 'D14', 'loudness -16 LUFS', lr.skipped ?? 'no integrated loudness in ffmpeg output (no audio track?)')
    else { const I = parseFloat(lm[1]); add(Math.abs(I + 16) > 0.5 ? 'fail' : 'pass', 'D14', 'loudness -16 LUFS', `${I.toFixed(1)} LUFS (allowed -16.5 to -15.5)`) }
    // jump scan
    const cap = Math.min(110, Math.floor(left() / 1000) - 5)
    if (cap < 10) add('not-run', 'D14', 'jump scan', 'time budget used up')
    else {
      try {
        const r = await scanJumps(mp4, { maxSeconds: cap })
        const bounds = scenes.slice(1).map(s => ({ t: s.start, cut: s.transition === 'cut' || s.transition?.name === 'cut' }))
        const near = t => bounds.find(b => Math.abs(b.t - t) <= 0.15)
        const unplanned = r.jumps.filter(j => !near(j.t) || !near(j.t).cut)
        const txt = `${r.jumps.length} hard jump(s) at ${r.scannedSeconds}s scanned${r.partial ? ' (PARTIAL, time cap)' : ''}${unplanned.length ? `; ${unplanned.length} not at a planned cut: ${unplanned.slice(0, 6).map(j => j.t.toFixed(2) + 's').join(', ')}` : ''}`
        add(r.partial || unplanned.length ? 'warn' : 'pass', 'D14', 'jump scan', txt)
      } catch (e) { add('not-run', 'D14', 'jump scan', e.message) }
    }
  }
}

// 8. Companion
{
  if (!existsSync(P('companion.json'))) add('not-run', 'N63', 'companion page', 'no companion.json')
  else if (!existsSync(P('companion/index.html'))) add('fail', 'N63', 'companion page', 'companion/index.html is missing')
  else {
    const h = readFileSync(P('companion/index.html'), 'utf8'), miss = []
    if (!/<video\b|<iframe\b|<source\b|\.(mp4|webm)\b/i.test(h)) miss.push('video')
    if (!/chapter/i.test(h)) miss.push('chapters')
    if (!/transcript/i.test(h)) miss.push('transcript')
    add(miss.length ? 'fail' : 'pass', 'N63', 'companion page', miss.length ? `index.html lacks: ${miss.join(', ')}` : 'index.html has video, chapters and transcript')
  }
}

// 9. Deny list
{
  const dl = P('prerelease-deny.txt')
  if (!existsSync(dl)) add('not-run', 'N78', 'private-string deny list', 'no prerelease-deny.txt in the project (optional)')
  else {
    const terms = lines(readFileSync(dl, 'utf8')).map(l => l.trim()).filter(l => !l.startsWith('#'))
    const hay = [...narrated.map(s => ({ f: `narration ${s.slideId}`, t: narrationOf(s) })), ...frameText, ...planTitles, ...chapterLines]
    const hits = []
    for (const term of terms) for (const x of hay) if (x.t.toLowerCase().includes(term.toLowerCase())) hits.push(`"${term}" in ${x.f}`)
    add(hits.length ? 'fail' : 'pass', 'N78', 'private-string deny list', hits.length ? hits.slice(0, 6).join('; ') + (hits.length > 6 ? ` (+${hits.length - 6})` : '') : `${terms.length} term(s), no hits`)
  }
}

// Output
const w = Math.max(...rows.map(r => r.rule.length))
console.log(`prerelease check: ${proj}${mp4Arg ? `  (mp4: ${mp4Arg})` : ''}`)
for (const r of rows) console.log(`${r.status.padEnd(8)}${r.rule.padEnd(w + 2)}${r.check}: ${r.detail}`)
const n = s => rows.filter(r => r.status === s).length
console.log(`\n${n('pass')} pass, ${n('warn')} warn, ${n('fail')} fail, ${n('not-run')} not run (${Math.round((Date.now() - t0) / 1000)} s)`)
console.log(`
Not checked automatically; look at these in the stills and the storyboard:
  N33, N68   every claim has a picture; a problem is shown as a problem (only the timing of visual events is checked)
  N5, N16    connector ends touch box edges and arrowheads are whole (lint covers position and style only)
  N44        Dominik approved the storyboard (only its freshness is checked)
  N50        bridges between sections read as a story (only the opening words are checked)
  N65, N73   the title page is a hook with one striking picture, not a slide heading
  N78        no private detail in pictures, screenshots, tabs, sidebars (the deny list covers text only)
  N87, N88   a relationship is drawn only when the narration states one
  D5, D6     facts are plain text; sequences get a step card
  D9-D12     highlight, quote, chat and stat look right in the stills
  N63        companion content quality: section steppers, links that seek the video
A warning needs one sentence in the build report. A fail blocks the release.`)
process.exit(n('fail') ? 1 : 0)
