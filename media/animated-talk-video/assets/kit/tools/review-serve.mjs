// `node review-page.mjs serve <project> [--port 4777]`: serves <project> read-only on 127.0.0.1 and takes POST /__feedback.
// The only write: <project>/review/feedback/<YYYY-MM-DD-HHMMSS>-feedback.json and .md, names made here, never from the request.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'

const { toMarkdown } = createRequire(import.meta.url)('./review-feedback-format.cjs')
const MAX_BODY = 1024 * 1024, MAX_NOTES = 500
const CAP = { project: 200, hash: 64, savedAt: 40, general: 20000, id: 64, title: 300, text: 5000, sceneId: 64 }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.vtt': 'text/vtt; charset=utf-8', '.txt': 'text/plain; charset=utf-8' }

class Bad extends Error { constructor(msg, status = 400) { super(msg); this.status = status } }
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
function onlyKeys(o, allowed, where) { for (const k of Object.keys(o)) if (!allowed.includes(k)) throw new Bad(`Unexpected field "${k.slice(0, 40)}" in ${where}.`) }
function str(v, cap, where, required = true) {
  if (v === undefined || v === null) { if (required) throw new Bad(`Missing ${where}.`); return '' }
  if (typeof v !== 'string') throw new Bad(`${where} must be text.`)
  if (v.length > cap) throw new Bad(`${where} is too long (limit ${cap} characters).`)
  return v
}
function num(v, lo, hi, where) { if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) throw new Bad(`${where} must be a number from ${lo} to ${hi}.`); return v }

// Rebuilds the feedback from known fields only; anything unexpected is rejected, not dropped.
export function validate(body) {
  if (!isObj(body)) throw new Bad('Feedback must be a JSON object.')
  onlyKeys(body, ['version', 'project', 'compositionHash', 'savedAt', 'general', 'notes'], 'the feedback')
  if (body.version !== 1) throw new Bad('Unknown feedback version.')
  if (!Array.isArray(body.notes)) throw new Bad('notes must be a list.')
  if (body.notes.length > MAX_NOTES) throw new Bad(`Too many notes (limit ${MAX_NOTES}).`)
  const notes = body.notes.map((n, i) => {
    const w = `note ${i + 1}`
    if (!isObj(n)) throw new Bad(`${w} must be an object.`)
    onlyKeys(n, ['id', 'scene', 't', 'pin', 'text'], w)
    if (!isObj(n.scene)) throw new Bad(`${w}: scene must be an object.`)
    onlyKeys(n.scene, ['n', 'id', 'title'], w + ' scene')
    const sn = num(n.scene.n, 1, 10000, w + ' scene number')
    if (!Number.isInteger(sn)) throw new Bad(`${w}: scene number must be a whole number.`)
    let pin = null
    if (n.pin !== null && n.pin !== undefined) {
      if (!isObj(n.pin)) throw new Bad(`${w}: pin must be an object or null.`)
      onlyKeys(n.pin, ['x', 'y'], w + ' pin')
      pin = { x: num(n.pin.x, 0, 100, w + ' pin x'), y: num(n.pin.y, 0, 100, w + ' pin y') }
    }
    return { id: str(n.id, CAP.id, w + ' id'), scene: { n: sn, id: str(n.scene.id, CAP.sceneId, w + ' scene id', false), title: str(n.scene.title, CAP.title, w + ' scene title', false) }, t: num(n.t, 0, 86400, w + ' time'), pin, text: str(n.text, CAP.text, w + ' text') }
  })
  notes.sort((a, b) => a.t - b.t)
  return { version: 1, project: str(body.project, CAP.project, 'project'), compositionHash: str(body.compositionHash, CAP.hash, 'compositionHash'), savedAt: str(body.savedAt, CAP.savedAt, 'savedAt', false), general: str(body.general, CAP.general, 'general note', false), notes }
}

function stamp(d = new Date()) { const p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}` }

function writeFeedback(proj, fb) {
  const dir = path.join(proj, 'review', 'feedback')
  try { const st = fs.lstatSync(dir); if (!st.isDirectory() || st.isSymbolicLink()) throw new Bad('The feedback folder is not a plain folder; not writing.', 500) }
  catch (e) { if (e instanceof Bad) throw e; fs.mkdirSync(dir) }
  const base = stamp()
  for (let k = 1; k < 100; k++) {
    const name = base + (k > 1 ? '-' + k : '') + '-feedback'
    let fd
    try { fd = fs.openSync(path.join(dir, name + '.json'), 'wx') } catch (e) { if (e.code === 'EEXIST') continue; throw e }
    fs.writeSync(fd, JSON.stringify(fb, null, 2) + '\n'); fs.closeSync(fd)
    fs.writeFileSync(path.join(dir, name + '.md'), toMarkdown(fb), { flag: 'wx' })
    return { json: 'review/feedback/' + name + '.json', md: 'review/feedback/' + name + '.md' }
  }
  throw new Bad('Could not find a free file name.', 500)
}

function send(res, status, obj) { const b = JSON.stringify(obj); res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(b) }

export function serve(argv) {
  const i = argv.indexOf('--port'); let port = 4777
  if (i >= 0) { port = parseInt(argv[i + 1], 10); argv.splice(i, 2) }
  if (!argv[0] || !Number.isInteger(port) || port < 1 || port > 65535) { console.error('usage: node review-page.mjs serve <project-folder> [--port 4777]'); process.exit(1) }
  const proj = fs.realpathSync(path.resolve(argv[0]))
  if (!fs.existsSync(path.join(proj, 'review', 'review.html'))) console.warn('note: no review.html yet; run `node review-page.mjs ' + argv[0] + '` first')
  const okHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`])
  const project = path.basename(proj)

  const server = http.createServer((req, res) => {
    // DNS-rebinding guard: only answer requests addressed to this loopback port.
    if (!okHosts.has(req.headers.host || '')) return send(res, 421, { ok: false, error: 'Wrong host.' })
    let url
    try { url = new URL(req.url, 'http://' + req.headers.host) } catch { return send(res, 400, { ok: false, error: 'Bad URL.' }) }

    if (url.pathname === '/__feedback') {
      if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Use POST to save feedback.' })
      const origin = req.headers.origin
      if (origin && !okHosts.has(origin.replace(/^http:\/\//, ''))) return send(res, 403, { ok: false, error: 'Feedback can only be saved from the review page itself.' })
      if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return send(res, 415, { ok: false, error: 'Feedback must be sent as JSON.' })
      if (+req.headers['content-length'] > MAX_BODY) { send(res, 413, { ok: false, error: 'Feedback is larger than 1 MB.' }); return req.destroy() }
      const chunks = []; let size = 0, over = false
      req.on('data', (c) => { if (over) return; size += c.length; if (size > MAX_BODY) { over = true; send(res, 413, { ok: false, error: 'Feedback is larger than 1 MB.' }); req.destroy() } else chunks.push(c) })
      req.on('end', () => {
        if (over) return
        try {
          let body
          try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new Bad('Feedback is not valid JSON.') }
          const fb = validate(body)
          fb.savedAt = new Date().toISOString() // server time, whatever the page sent
          const files = writeFeedback(proj, fb)
          console.log('saved ' + files.json + ' (' + fb.notes.length + ' notes)')
          send(res, 200, { ok: true, file: files.json, md: files.md, notes: fb.notes.length })
        } catch (e) {
          if (e instanceof Bad) return send(res, e.status, { ok: false, error: e.message })
          console.error(e); send(res, 500, { ok: false, error: 'The server could not write the feedback: ' + (e.code || 'error') })
        }
      })
      return
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { ok: false, error: 'This server is read-only apart from POST /__feedback.' })
    let rel
    try { rel = decodeURIComponent(url.pathname) } catch { return send(res, 400, { ok: false, error: 'Bad path.' }) }
    if (rel.includes('\0')) return send(res, 400, { ok: false, error: 'Bad path.' })
    if (rel === '/') rel = '/review/review.html'
    const file = path.resolve(proj, '.' + rel)
    if (file !== proj && !file.startsWith(proj + path.sep)) return send(res, 403, { ok: false, error: 'Outside the project folder.' })
    let real
    try { real = fs.realpathSync(file) } catch { return send(res, 404, { ok: false, error: 'Not found.' }) }
    if (!real.startsWith(proj + path.sep)) return send(res, 403, { ok: false, error: 'Outside the project folder.' })
    const st = fs.statSync(real)
    if (!st.isFile()) return send(res, 404, { ok: false, error: 'Not found.' })
    res.writeHead(200, { 'content-type': TYPES[path.extname(real).toLowerCase()] || 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
    if (req.method === 'HEAD') return res.end()
    fs.createReadStream(real).pipe(res)
  })
  server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `port ${port} is in use; try --port ${port + 1}` : e.message); process.exit(1) })
  server.listen(port, '127.0.0.1', () => {
    console.log(`serving ${proj} (${project})\nopen http://127.0.0.1:${port}/review/review.html\nfeedback is written to ${path.join(proj, 'review', 'feedback')}/\nCtrl+C to stop`)
  })
  return server
}
