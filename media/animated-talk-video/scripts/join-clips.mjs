#!/usr/bin/env node
// Joins per-scene narration clips into one narration file without seams, and writes durations.json for plan-from-timings.mjs.
// usage: node join-clips.mjs <clips-dir> <out.m4a> [--gap 0.2] [--lufs -16] [--durations durations.json]
// Clips are named "<order>-<slideId>.wav" (e.g. 01-title.wav, 02-intro.wav, ...) or "<slideId>.wav" (sorted by name).
// Each clip is loudness-normalised to the same target, then joined with <gap> s of silence (150-250 ms; room tone if you have it: replace the silence by hand).
// Needs ffmpeg and ffprobe. Listen to every join afterwards: a join that sounds like a new recording is a defect to fix.
import { readdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2), pos = [], o = { gap: '0.2', lufs: '-16', durations: 'durations.json' }
for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) o[args[i].slice(2)] = args[++i]; else pos.push(args[i]) }
const [dir, out] = pos
if (!dir || !out) { console.error('usage: node join-clips.mjs <clips-dir> <out.m4a> [--gap 0.2] [--lufs -16]'); process.exit(1) }
const files = readdirSync(dir).filter(f => /\.(wav|mp3|m4a|flac|aiff?)$/i.test(f)).sort()
if (!files.length) { console.error('no audio clips in ' + dir); process.exit(1) }
const tmp = mkdtempSync(path.join(os.tmpdir(), 'join-clips-'))
const gap = Number(o.gap), durations = {}
let clock = 0
const parts = []
try {
  const silence = (name, sec) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(sec), path.join(tmp, name)])
  silence('gap.wav', gap); silence('tail.wav', 0.6)   // the tail lets the last build settle
  files.forEach((f, i) => {
    const id = f.replace(/\.[^.]+$/, '').replace(/^\d+[-_]/, '')
    const norm = path.join(tmp, `c${i}.wav`)
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(dir, f), '-af', `loudnorm=I=${o.lufs}:TP=-1.5:LRA=11`, '-ar', '44100', '-ac', '1', norm])
    const len = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', norm]).toString())
    const last = i === files.length - 1
    const d = +(len + (last ? 0.6 : gap)).toFixed(3)
    durations[id] = d   // scene length = clip + the silence after it, so the scenes add up to the audio length exactly
    clock += d
    parts.push(norm, path.join(tmp, last ? 'tail.wav' : 'gap.wav'))
  })
  const list = path.join(tmp, 'list.txt')
  writeFileSync(list, parts.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'))
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c:a', 'aac', '-b:a', '160k', out])
  writeFileSync(o.durations, JSON.stringify(durations, null, 1) + '\n')
  console.log(`${files.length} clips, ${clock.toFixed(1)} s -> ${out}; scene lengths -> ${o.durations}`)
} finally { rmSync(tmp, { recursive: true, force: true }) }
