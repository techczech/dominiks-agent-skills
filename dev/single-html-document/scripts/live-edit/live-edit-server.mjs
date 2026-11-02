#!/usr/bin/env node
// Live-edit server: serves a page folder read-only on loopback and accepts
// passage-level edits (POST /__edit) and feedback (POST /__feedback).
// Node ESM, no dependencies. See README.md.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const MAX_BODY = 256 * 1024
const TEXT_EXT = new Set(['.md', '.markdown', '.html', '.htm', '.txt'])
const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.pdf': 'application/pdf',
}

export const RUNTIME_PATH = '/__live-edit/runtime.js'
// A page that already includes the runtime (by file name or inlined) is served as it is.
export function injectRuntime(html) {
  if (/live-edit-runtime|Live-edit page runtime/.test(html)) return html
  const tag = `<script src="${RUNTIME_PATH}"></script>`
  const at = html.search(/<\/body\s*>(?![\s\S]*<\/body\s*>)/i)
  return at >= 0 ? html.slice(0, at) + tag + html.slice(at) : html + tag
}

class HttpError extends Error { constructor(status, message) { super(message); this.status = status } }

const inside = (root, p) => p === root || p.startsWith(root + path.sep)
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-')
const today = () => new Date().toISOString().slice(0, 10)

export function slugify(heading) {
  return heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-')
}

// Returns [start, end) of the Markdown section for an anchor, or null.
export function findSection(text, anchor) {
  const lines = text.split('\n')
  let offset = 0, start = -1, level = 0, fence = false
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence
    const m = !fence && /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (m) {
      if (start >= 0 && m[1].length <= level) return [start, offset]
      if (start < 0 && (slugify(m[2]) === anchor || m[2].trim() === anchor)) { start = offset; level = m[1].length }
    }
    offset += line.length + 1
  }
  return start >= 0 ? [start, text.length] : null
}

function countOccurrences(hay, needle) {
  let n = 0, i = -1
  while ((i = hay.indexOf(needle, i + 1)) !== -1) { n++; if (n > 1) break }
  return n
}

function atomicWrite(file, content) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`)
  const mode = fs.statSync(file).mode
  fs.writeFileSync(tmp, content, { mode, flag: 'wx' })
  fs.renameSync(tmp, file)
}

function unifiedDiff(rel, before, after) {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR || '/tmp'), 'live-edit-'))
  try {
    fs.writeFileSync(path.join(dir, 'a'), before); fs.writeFileSync(path.join(dir, 'b'), after)
    const r = spawnSync('/usr/bin/diff', ['-u', '--label', `a/${rel}`, '--label', `b/${rel}`, path.join(dir, 'a'), path.join(dir, 'b')], { encoding: 'utf8' })
    if (r.error || r.status !== 1 || !r.stdout) throw new HttpError(500, `Could not compute diff; nothing was saved (${r.error ? r.error.message : 'diff status ' + r.status}).`)
    return r.stdout
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

const O_APPEND_NOFOLLOW = fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_CREAT | (fs.constants.O_NOFOLLOW || 0)
const pidAlive = pid => { try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' } }

export function startServer(opts) {
  const pagePath = fs.realpathSync(path.resolve(opts.page))
  const pageDir = path.dirname(pagePath)
  const root = fs.realpathSync(path.resolve(opts.root || pageDir))
  if (!inside(root, pagePath)) throw new Error('page must be inside --root')
  const sourcePath = opts.source ? fs.realpathSync(path.resolve(opts.source)) : null
  if (sourcePath && !inside(root, sourcePath)) throw new Error('--source must be inside --root')
  const port = opts.port ?? 8790
  const token = opts.token ?? process.env.LIVE_EDIT_TOKEN ?? ''
  const idleMs = (opts.idleHours ?? 4) * 3600 * 1000
  // opts.runtime: the page runtime's text. When given, it is served at RUNTIME_PATH and injected into the page response.
  const runtime = typeof opts.runtime === 'string' && opts.runtime ? opts.runtime : null
  // opts.editable: the only files /__edit may change (absolute paths). Any other target is kept aside, never written.
  const editable = Array.isArray(opts.editable) && opts.editable.length ? new Set(opts.editable.map(f => fs.realpathSync(path.resolve(f)))) : null
  const liveDir = path.join(root, '.live-edit')
  const rel = p => path.relative(root, p).split(path.sep).join('/')
  const backedUp = new Set()
  let queue = Promise.resolve()
  let idleTimer = null
  let okHosts = new Set()

  // Real-path containment: a directory must be a real directory (not a symlink) inside root.
  function realDirOk(dir) {
    let real
    try { real = fs.realpathSync(dir) } catch { return false }
    return real === dir && inside(root, real)
  }
  function ensureLiveDir(sub) {
    const d = sub ? path.join(liveDir, sub) : liveDir
    if (!realDirOk(path.dirname(d))) throw new HttpError(400, 'Unsafe path.')
    let st = null
    try { st = fs.lstatSync(d) } catch {}
    if (!st) fs.mkdirSync(d)
    else if (st.isSymbolicLink() || !st.isDirectory()) throw new HttpError(400, '.live-edit is not a plain directory.')
    if (!realDirOk(d)) throw new HttpError(400, 'Unsafe path.')
    return d
  }
  function safeAppend(file, data) {
    if (!realDirOk(path.dirname(file))) throw new HttpError(400, 'Unsafe path.')
    const fd = fs.openSync(file, O_APPEND_NOFOLLOW, 0o644)
    try {
      if (!fs.fstatSync(fd).isFile()) throw new HttpError(400, 'Unsafe path.')
      fs.writeSync(fd, data)
    } finally { fs.closeSync(fd) }
  }
  function safeCreate(file, data) {
    if (!realDirOk(path.dirname(file))) throw new HttpError(400, 'Unsafe path.')
    fs.writeFileSync(file, data, { flag: 'wx', mode: 0o644 })
  }
  function pending(rec) {
    const d = ensureLiveDir()
    safeAppend(path.join(d, 'pending.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...rec }) + '\n')
  }
  function realFile(file) {
    let st
    try { st = fs.lstatSync(file) } catch { return null }
    if (st.isSymbolicLink() || !st.isFile()) throw new HttpError(400, 'Symlinked or non-regular target refused.')
    if (fs.realpathSync(file) !== file || !inside(root, file)) throw new HttpError(400, 'Target is not a real path inside the served folder.')
    return file
  }

  const feedbackBase = () => {
    const s = sourcePath || pagePath
    return path.join(path.dirname(s), path.basename(s, path.extname(s)))
  }

  function resolveTarget(sourceRef) {
    const [refPath, ...rest] = String(sourceRef || '').split('#')
    const anchor = rest.join('#')
    let cand
    if (!refPath) cand = sourcePath || pagePath
    else {
      if (refPath.includes('\0') || path.isAbsolute(refPath)) throw new HttpError(400, 'Bad sourceRef path.')
      cand = path.resolve(pageDir, refPath)
      if (!inside(root, cand)) throw new HttpError(400, 'sourceRef is outside the served folder.')
      if (path.relative(root, cand).split(path.sep).some(seg => seg.startsWith('.'))) throw new HttpError(400, 'Dotfiles are not editable.')
    }
    if (!TEXT_EXT.has(path.extname(cand).toLowerCase())) throw new HttpError(400, 'Not an editable text file.')
    return { file: realFile(cand), cand, anchor }
  }

  function applyEdit(body) {
    const { oldText, newText } = body
    if (typeof oldText !== 'string' || typeof newText !== 'string' || !oldText) throw new HttpError(400, 'oldText and newText (strings) required.')
    const { file, cand, anchor } = resolveTarget(body.sourceRef)
    const keep = (reason, f) => {
      pending({ reason, file: rel(f), sourceRef: body.sourceRef || '', pageId: body.pageId || '', oldText, newText })
      return { status: 'kept-aside', reason }
    }
    if (editable && !editable.has(file || cand)) return keep("not this page's source", cand)
    if (!file) return keep('sourceRef file not found', cand)
    let text
    try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(fs.readFileSync(file)) } catch { return keep('file is not valid UTF-8', file) }
    const isMd = /\.(md|markdown)$/i.test(file)
    let range = [0, text.length]
    if (anchor && isMd) {
      range = findSection(text, anchor)
      if (!range) return keep(`anchor "#${anchor}" not found`, file)
    }
    const section = text.slice(range[0], range[1])
    const n = countOccurrences(section, oldText)
    if (n !== 1) return keep(n === 0 ? 'oldText not found' : 'oldText occurs more than once', file)
    const idx = range[0] + section.indexOf(oldText)
    const updated = text.slice(0, idx) + newText + text.slice(idx + oldText.length)
    const diff = updated === text ? '' : unifiedDiff(rel(file), text, updated)
    if (updated === text) return { status: 'saved', file: rel(file) }
    const d = ensureLiveDir()
    if (!backedUp.has(file)) {
      safeCreate(path.join(ensureLiveDir('backups'), `${stamp()}-${path.basename(file)}`), fs.readFileSync(file))
      backedUp.add(file)
    }
    safeAppend(path.join(d, `${today()}-${path.basename(file)}.diff`), diff)
    atomicWrite(file, updated)
    return { status: 'saved', file: rel(file) }
  }

  function applyFeedback(body) {
    const { questionId, sourceRef, text } = body
    if (typeof text !== 'string' || !text.trim()) throw new HttpError(400, 'text required.')
    if (!questionId && !sourceRef) throw new HttpError(400, 'questionId or sourceRef required.')
    const rec = { at: new Date().toISOString(), pageId: body.pageId || '', questionId: questionId || '', sourceRef: sourceRef || '', text }
    const base = feedbackBase()
    const md = `- ${rec.at} · ${rec.questionId || rec.sourceRef}${rec.pageId ? ` (${rec.pageId})` : ''}\n${text.trim().split('\n').map(l => '  > ' + l).join('\n')}\n\n`
    safeAppend(base + '.feedback.jsonl', JSON.stringify(rec) + '\n')
    safeAppend(base + '.feedback.md', md)
    return { status: 'saved', file: rel(base + '.feedback.jsonl') }
  }

  function send(res, status, obj) {
    const b = JSON.stringify(obj)
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
    res.end(b)
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = []; let size = 0
      req.on('data', c => {
        size += c.length
        if (size > MAX_BODY) { reject(new HttpError(413, 'Body too large.')); req.destroy() } else chunks.push(c)
      })
      req.on('end', () => {
        try { const v = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!v || typeof v !== 'object' || Array.isArray(v)) throw 0; resolve(v) }
        catch { reject(new HttpError(400, 'Invalid JSON.')) }
      })
      req.on('error', reject)
    })
  }

  function tokenOk(req) {
    if (!token) return true
    const got = Buffer.from(String(req.headers['x-live-edit-token'] || ''))
    const want = Buffer.from(token)
    return got.length === want.length && crypto.timingSafeEqual(got, want)
  }

  function serveStatic(req, res, pathname) {
    let rp
    try { rp = decodeURIComponent(pathname) } catch { throw new HttpError(400, 'Bad URL.') }
    if (rp.includes('\0')) throw new HttpError(400, 'Bad URL.')
    if (rp.split('/').some(s => s.startsWith('.'))) throw new HttpError(404, 'Not found.')
    let file = path.resolve(root, '.' + rp)
    if (rp === '/' ) file = pagePath
    if (!inside(root, file)) throw new HttpError(403, 'Forbidden.')
    let real
    try { real = fs.realpathSync(file) } catch { throw new HttpError(404, 'Not found.') }
    if (!inside(root, real)) throw new HttpError(403, 'Forbidden.')
    if (fs.statSync(real).isDirectory()) throw new HttpError(404, 'Not found.')
    let data = fs.readFileSync(real)
    // Serving only: the page itself gets a script tag for the runtime when it does not carry one. The file on disk is never changed.
    if (runtime && real === pagePath) data = Buffer.from(injectRuntime(data.toString('utf8')), 'utf8')
    res.writeHead(200, { 'content-type': MIME[path.extname(real).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
    res.end(req.method === 'HEAD' ? undefined : data)
  }

  const server = http.createServer(async (req, res) => {
    resetIdle()
    try {
      if (!okHosts.has(req.headers.host || '')) throw new HttpError(421, 'Wrong host.')
      let url
      try { url = new URL(req.url, 'http://' + req.headers.host) } catch { throw new HttpError(400, 'Bad URL.') }
      const p = url.pathname
      const isWrite = p === '/__edit' || p === '/__feedback'
      if (isWrite) {
        if (req.method !== 'POST') throw new HttpError(405, 'POST only.')
        const origin = req.headers.origin
        if (origin) { let oh = ''; try { oh = new URL(origin).host } catch {} if (!okHosts.has(oh)) throw new HttpError(403, 'Foreign origin.') }
        if (!tokenOk(req)) throw new HttpError(401, 'Token required.')
        if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) throw new HttpError(415, 'JSON only.')
        const body = await readBody(req)
        const result = await (queue = queue.then(() => (p === '/__edit' ? applyEdit(body) : applyFeedback(body)), () => (p === '/__edit' ? applyEdit(body) : applyFeedback(body))))
        return send(res, 200, result)
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Read-only.')
      if (p === '/__live') return send(res, 200, { live: true, page: rel(pagePath), source: sourcePath ? rel(sourcePath) : null, tokenRequired: !!token })
      if (p === RUNTIME_PATH && runtime) {
        res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
        return res.end(req.method === 'HEAD' ? undefined : runtime)
      }
      if (p.startsWith('/__')) throw new HttpError(404, 'Not found.')
      serveStatic(req, res, p)
    } catch (e) {
      if (e instanceof HttpError) { if (!res.headersSent) send(res, e.status, { ok: false, error: e.message }) }
      else { if (!res.headersSent) send(res, 500, { ok: false, error: 'Server error.' }); console.error(e) }
    }
  })

  function resetIdle() {
    if (!idleMs) return
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => { console.log('Idle; shutting down.'); server.close(); opts.onIdle?.() }, idleMs)
    idleTimer.unref?.()
  }

  const lockFile = path.join(liveDir, 'server.lock')
  let locked = false
  const unlock = () => { process.off('exit', unlock); if (locked) { locked = false; try { fs.unlinkSync(lockFile) } catch {} } }
  server.on('close', unlock)

  return new Promise((resolve, reject) => {
    try {
      ensureLiveDir()
      // Atomic acquire: the lock appears only fully written (link fails if it exists).
      const tmp = path.join(liveDir, `server.lock.${process.pid}.tmp`)
      fs.writeFileSync(tmp, JSON.stringify({ pid: process.pid, port: null }), { flag: 'w' })
      try {
        for (let attempt = 0; ; attempt++) {
          try { fs.linkSync(tmp, lockFile); locked = true; break }
          catch (e) {
            if (e.code !== 'EEXIST' || attempt > 0) throw e
            let old = null
            try { old = JSON.parse(fs.readFileSync(lockFile, 'utf8')) } catch {}
            if (old && Number.isInteger(old.pid) && pidAlive(old.pid)) throw new Error(`Another live-edit server (pid ${old.pid}, port ${old.port}) already serves ${root}. Stop it first.`)
            fs.unlinkSync(lockFile)
          }
        }
      } finally { try { fs.unlinkSync(tmp) } catch {} }
    } catch (e) { return reject(e) }
    server.once('error', (e) => { unlock(); reject(e) })
    process.once('exit', unlock)
    server.listen(port, '127.0.0.1', () => {
      const actual = server.address().port
      try { const t = lockFile + '.port.tmp'; fs.writeFileSync(t, JSON.stringify({ pid: process.pid, port: actual })); fs.renameSync(t, lockFile) }
      catch (e) { server.close(); return reject(new Error('Could not update .live-edit/server.lock: ' + e.message)) }
      okHosts = new Set([`127.0.0.1:${actual}`, `localhost:${actual}`, ...(opts.allowHosts || [])])
      resetIdle()
      resolve({ server, port: actual, root, pagePath, sourcePath, close: () => { clearTimeout(idleTimer); return new Promise(r => server.close(r)) } })
    })
  })
}

function parseArgs(argv) {
  const o = { allowHosts: [] }
  const pos = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--source') o.source = argv[++i]
    else if (a === '--port') o.port = Number(argv[++i])
    else if (a === '--root') o.root = argv[++i]
    else if (a === '--allow-host') o.allowHosts.push(argv[++i])
    else if (a === '--idle-hours') o.idleHours = Number(argv[++i])
    else if (a === '--editable') (o.editable = o.editable || []).push(argv[++i])
    else if (a === '--inject-runtime') o.runtime = fs.readFileSync(fileURLToPath(new URL('./live-edit-runtime.js', import.meta.url)), 'utf8')
    else pos.push(a)
  }
  return { o, pos }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { o, pos } = parseArgs(process.argv.slice(2))
  if (pos[0] !== 'serve' || !pos[1]) {
    console.error('usage: live-edit-server.mjs serve <page.html> [--source <file.md>] [--port 8790] [--root <dir>] [--allow-host <name>] [--idle-hours 4] [--inject-runtime] [--editable <file>]...')
    process.exit(2)
  }
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(0))
  startServer({ ...o, page: pos[1] }).then(s => {
    console.log(`Live edit on http://127.0.0.1:${s.port}/ (root ${s.root})`)
    console.log(process.env.LIVE_EDIT_TOKEN ? 'Write token required (LIVE_EDIT_TOKEN).' : 'No write token set.')
  }, e => { console.error(e.message); process.exit(1) })
}
