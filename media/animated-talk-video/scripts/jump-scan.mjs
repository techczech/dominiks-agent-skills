#!/usr/bin/env node
// Still-difference scan of a rendered MP4: lists hard picture jumps (one-frame change in the content band, caption band masked).
// usage: node tools/jump-scan.mjs video.mp4 [out.json] [threshold=6] [--max-seconds N]
// A hard jump = mean absolute difference between consecutive frames (320x180 grey, top 90% only) at or above the threshold
// while the neighbouring frame-to-frame differences are less than half of it. Dissolves spread the same change over many
// frames, so they never register. Jumps closer than 0.2 s are merged. Port of the ALT project's frames-src/jump-scan.py (no numpy).
// Importable: `import { scanJumps } from './jump-scan.mjs'`. Never runs longer than --max-seconds (default 200): a partial scan is flagged.
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const W = 320, H = 180, FPS = 30, BAND = Math.floor(H * 0.9), FRAME = W * H

export function scanJumps(file, { threshold = 6, maxSeconds = 200 } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-vf', `fps=${FPS},scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], { stdio: ['ignore', 'pipe', 'inherit'] })
    const d = []
    let prev = null, buf = Buffer.alloc(0), partial = false
    const timer = setTimeout(() => { partial = true; p.kill('SIGKILL') }, maxSeconds * 1000)
    p.on('error', e => { clearTimeout(timer); reject(e) })
    p.stdout.on('data', chunk => {
      buf = buf.length ? Buffer.concat([buf, chunk]) : chunk
      let off = 0
      while (buf.length - off >= FRAME) {
        const cur = buf.subarray(off, off + FRAME).subarray(0, BAND * W)
        if (prev) { let s = 0; for (let i = 0; i < cur.length; i++) s += Math.abs(cur[i] - prev[i]); d.push(s / cur.length) }
        prev = Uint8Array.from(cur)
        off += FRAME
      }
      buf = off ? Buffer.from(buf.subarray(off)) : buf
    })
    p.on('close', () => {
      clearTimeout(timer)
      if (!d.length && !partial) return reject(new Error('no video frames decoded'))
      const jumps = []
      for (let i = 0; i < d.length; i++) {
        if (d[i] < threshold) continue
        const nb = Math.max(i ? d[i - 1] : 0, i + 1 < d.length ? d[i + 1] : 0)
        if (nb < d[i] * 0.5) jumps.push({ t: +((i + 1) / FPS).toFixed(3), diff: +d[i].toFixed(2) })
      }
      const res = []
      for (const j of jumps) { if (res.length && j.t - res[res.length - 1].t < 0.2) continue; res.push(j) }
      resolve({ video: file, threshold, frames: d.length + 1, scannedSeconds: +((d.length + 1) / FPS).toFixed(1), partial, jumps: res })
    })
  })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2)
  const mi = args.indexOf('--max-seconds'), maxSeconds = mi >= 0 ? +args.splice(mi, 2)[1] : 200
  const [file, out, thr] = args
  if (!file) { console.error('usage: node tools/jump-scan.mjs video.mp4 [out.json] [threshold] [--max-seconds N]'); process.exit(1) }
  const r = await scanJumps(file, { threshold: thr ? +thr : 6, maxSeconds })
  console.log(`${r.frames} frames, ${r.jumps.length} hard jumps (threshold ${r.threshold})${r.partial ? ` PARTIAL: stopped after ${r.scannedSeconds}s` : ''}`)
  for (const j of r.jumps) console.log(`${j.t.toFixed(3).padStart(8)}s  diff ${j.diff}`)
  if (out) writeFileSync(out, JSON.stringify(r, null, 1))
}
