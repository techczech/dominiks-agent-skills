import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { startServer } from '../live-edit-server.mjs'

const MD = '# Title\n\n## Purpose\n\nAlpha beta.\n\n## Scope\n\nAlpha beta.\nUnique line.\n'

function setup(extra = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'le-test-')))
  fs.mkdirSync(path.join(dir, 'site'))
  fs.mkdirSync(path.join(dir, 'site', 'pages'))
  const site = path.join(dir, 'site')
  fs.writeFileSync(path.join(site, 'page.html'), '<p>Hello world</p>')
  fs.writeFileSync(path.join(site, 'pages', 'a.md'), MD)
  return startServer({ page: path.join(site, 'page.html'), port: 0, ...extra }).then(s => ({ s, dir: site, outer: dir }))
}

function req(s, method, url, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: s.port, path: url, method, headers: { host: `127.0.0.1:${s.port}`, ...(body ? { 'content-type': 'application/json' } : {}), ...headers } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => { let j; try { j = JSON.parse(d) } catch {} resolve({ status: res.statusCode, json: j, text: d }) })
    })
    r.on('error', reject); if (body) r.write(JSON.stringify(body)); r.end()
  })
}
const edit = (s, o, h) => req(s, 'POST', '/__edit', { body: { sourceRef: 'pages/a.md#purpose', pageId: 'p', ...o }, headers: h })
const read = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8')

test('single exact match saves, backs up, writes diff', async () => {
  const { s, dir } = await setup()
  const r = await edit(s, { oldText: 'Alpha beta.', newText: 'Gamma.' })
  assert.deepEqual(r.json, { status: 'saved', file: 'pages/a.md' })
  assert.equal(read(dir, 'pages/a.md'), MD.replace('## Purpose\n\nAlpha beta.', '## Purpose\n\nGamma.'))
  const le = path.join(dir, '.live-edit')
  const backups = fs.readdirSync(path.join(le, 'backups'))
  assert.equal(backups.length, 1)
  assert.equal(fs.readFileSync(path.join(le, 'backups', backups[0]), 'utf8'), MD)
  const diff = fs.readdirSync(le).find(f => f.endsWith('-a.md.diff'))
  assert.match(fs.readFileSync(path.join(le, diff), 'utf8'), /-Alpha beta\.\n\+Gamma\./)
  await edit(s, { oldText: 'Gamma.', newText: 'Delta.' })
  assert.equal(fs.readdirSync(path.join(le, 'backups')).length, 1, 'one backup per session')
  await s.close()
})

test('zero or multiple matches are kept aside, file untouched', async () => {
  const { s, dir } = await setup()
  const multi = await edit(s, { sourceRef: 'pages/a.md', oldText: 'Alpha beta.', newText: 'X' })
  const none = await edit(s, { oldText: 'Nope', newText: 'X' })
  assert.equal(multi.json.status, 'kept-aside')
  assert.equal(none.json.status, 'kept-aside')
  assert.equal(read(dir, 'pages/a.md'), MD)
  assert.equal(read(dir, '.live-edit/pending.jsonl').trim().split('\n').length, 2)
  await s.close()
})

test('anchor scopes the match to its section', async () => {
  const { s } = await setup()
  assert.equal((await edit(s, { sourceRef: 'pages/a.md#scope', oldText: 'Unique line.', newText: 'Changed.' })).json.status, 'saved')
  assert.equal((await edit(s, { oldText: 'Changed.', newText: 'Z' })).json.status, 'kept-aside')
  await s.close()
})

test('no Markdown source: edits the HTML itself', async () => {
  const { s, dir } = await setup()
  const r = await edit(s, { sourceRef: '#x', oldText: 'Hello world', newText: 'Hi' })
  assert.deepEqual(r.json, { status: 'saved', file: 'page.html' })
  assert.equal(read(dir, 'page.html'), '<p>Hi</p>')
  await s.close()
})

test('traversal and dotfiles rejected', async () => {
  const { s, dir, outer } = await setup()
  fs.writeFileSync(path.join(outer, 'outside.md'), 'secret')
  fs.writeFileSync(path.join(dir, '.secret'), 'x')
  assert.equal((await edit(s, { sourceRef: '../outside.md', oldText: 'secret', newText: 'x' })).status, 400)
  assert.equal(read(outer, 'outside.md'), 'secret')
  assert.equal((await edit(s, { sourceRef: '.secret', oldText: 'x', newText: 'y' })).status, 400)
  assert.equal((await req(s, 'GET', '/%2e%2e/outside.md')).status >= 400, true)
  assert.equal((await req(s, 'GET', '/.secret')).status, 404)
  assert.equal((await req(s, 'GET', '/pages/a.md')).status, 200)
  await s.close()
})

test('foreign Host and non-POST writes rejected', async () => {
  const { s, dir } = await setup()
  const r = await req(s, 'POST', '/__edit', { body: { sourceRef: 'pages/a.md', oldText: 'Unique line.', newText: 'X' }, headers: { host: 'evil.example' } })
  assert.equal(r.status, 421)
  assert.equal((await req(s, 'GET', '/__edit')).status, 405)
  assert.equal(read(dir, 'pages/a.md'), MD)
  await s.close()
})

test('token enforced when set', async () => {
  const { s, dir } = await setup({ token: 'sekret' })
  const body = { sourceRef: 'pages/a.md', oldText: 'Unique line.', newText: 'X' }
  assert.equal((await req(s, 'POST', '/__edit', { body })).status, 401)
  assert.equal((await req(s, 'POST', '/__edit', { body, headers: { 'x-live-edit-token': 'wrong' } })).status, 401)
  assert.equal(read(dir, 'pages/a.md'), MD)
  assert.equal((await req(s, 'POST', '/__edit', { body, headers: { 'x-live-edit-token': 'sekret' } })).json.status, 'saved')
  await s.close()
})

test('feedback appends jsonl and md; /__live; body limit', async () => {
  const { s, dir } = await setup()
  assert.equal((await req(s, 'GET', '/__live')).json.live, true)
  assert.equal((await req(s, 'POST', '/__feedback', { body: { questionId: 'q1', text: 'Looks good', pageId: 'p' } })).json.status, 'saved')
  assert.match(read(dir, 'page.feedback.jsonl'), /"questionId":"q1"/)
  assert.match(read(dir, 'page.feedback.md'), /Looks good/)
  const big = await req(s, 'POST', '/__feedback', { body: { questionId: 'q', text: 'x'.repeat(300 * 1024) } }).catch(() => ({ status: 'closed' }))
  assert.ok(big.status === 413 || big.status === 'closed')
  await s.close()
})

// ---- fix round (Sol review) ----

test('diff failure: source untouched, 500', async () => {
  const { s, dir } = await setup()
  const saved = process.env.TMPDIR
  process.env.TMPDIR = path.join(dir, 'does-not-exist') // makes the diff step fail
  const r = await edit(s, { oldText: 'Alpha beta.', newText: 'Gamma.' })
  process.env.TMPDIR = saved
  assert.equal(r.status, 500)
  assert.equal(read(dir, 'pages/a.md'), MD)
  await s.close()
})

test('missing sourceRef file is kept aside, no fallback, with and without --source', async () => {
  for (const withSource of [false, true]) {
    const { s, dir } = await setup()
    if (withSource) await s.close()
    const s2 = withSource ? await startServer({ page: path.join(dir, 'page.html'), source: path.join(dir, 'pages/a.md'), port: 0 }) : s
    const r = await edit(s2, { sourceRef: 'pages/missing.md#x', oldText: 'Hello world', newText: 'Hi' })
    assert.equal(r.json.status, 'kept-aside')
    assert.equal(read(dir, 'page.html'), '<p>Hello world</p>')
    assert.equal(read(dir, 'pages/a.md'), MD)
    await s2.close()
  }
})

test('symlinked feedback sidecar and .live-edit refused', async () => {
  const { s, dir, outer } = await setup()
  fs.writeFileSync(path.join(outer, 'victim.js'), 'v')
  fs.symlinkSync(path.join(outer, 'victim.js'), path.join(dir, 'page.feedback.jsonl'))
  const r = await req(s, 'POST', '/__feedback', { body: { questionId: 'q', text: 'x' } })
  assert.ok(r.status >= 400)
  assert.equal(read(outer, 'victim.js'), 'v')
  fs.mkdirSync(path.join(outer, 'elsewhere'))
  fs.rmSync(path.join(dir, '.live-edit'), { recursive: true, force: true })
  fs.symlinkSync(path.join(outer, 'elsewhere'), path.join(dir, '.live-edit'))
  const e = await edit(s, { oldText: 'Alpha beta.', newText: 'G' })
  assert.ok(e.status >= 400)
  assert.equal(fs.readdirSync(path.join(outer, 'elsewhere')).length, 0)
  assert.equal(read(dir, 'pages/a.md'), MD)
  await s.close()
})

test('source directory swapped for a symlink after start is refused', async () => {
  const { s: first, dir, outer } = await setup()
  await first.close()
  const s = await startServer({ page: path.join(dir, 'page.html'), source: path.join(dir, 'pages/a.md'), port: 0 })
  fs.renameSync(path.join(dir, 'pages'), path.join(outer, 'moved'))
  fs.symlinkSync(path.join(outer, 'moved'), path.join(dir, 'pages'))
  const r = await edit(s, { sourceRef: '#purpose', oldText: 'Alpha beta.', newText: 'G' })
  assert.ok(r.status >= 400)
  assert.equal(read(outer, 'moved/a.md'), MD)
  await s.close()
})

test('second server for the same root refused; stale lock replaced; lock removed on close', async () => {
  const { s, dir } = await setup()
  const lock = path.join(dir, '.live-edit/server.lock')
  assert.ok(fs.existsSync(lock))
  await assert.rejects(startServer({ page: path.join(dir, 'page.html'), port: 0 }), /already serves/)
  await s.close()
  assert.ok(!fs.existsSync(lock))
  fs.mkdirSync(path.join(dir, '.live-edit'), { recursive: true })
  fs.writeFileSync(lock, JSON.stringify({ pid: 2 ** 22 + 12345, port: 1 }))
  const s2 = await startServer({ page: path.join(dir, 'page.html'), port: 0 })
  assert.equal(JSON.parse(fs.readFileSync(lock, 'utf8')).pid, process.pid)
  await s2.close()
})

test('non-UTF-8 file is kept aside, bytes untouched', async () => {
  const { s, dir } = await setup()
  const bytes = Buffer.concat([Buffer.from('# T\n\nAlpha\n\nCaf'), Buffer.from([0xe9]), Buffer.from('\n')])
  fs.writeFileSync(path.join(dir, 'pages/latin.md'), bytes)
  const r = await edit(s, { sourceRef: 'pages/latin.md', oldText: 'Alpha', newText: 'Beta' })
  assert.deepEqual(r.json, { status: 'kept-aside', reason: 'file is not valid UTF-8' })
  assert.ok(fs.readFileSync(path.join(dir, 'pages/latin.md')).equals(bytes))
  await s.close()
})

test('leading BOM is kept when a passage is edited', async () => {
  const { s, dir } = await setup()
  fs.writeFileSync(path.join(dir, 'pages/bom.md'), '﻿# T\n\nAlpha\n')
  const r = await edit(s, { sourceRef: 'pages/bom.md', oldText: 'Alpha', newText: 'Beta' })
  assert.equal(r.json.status, 'saved')
  assert.ok(fs.readFileSync(path.join(dir, 'pages/bom.md')).equals(Buffer.from('﻿# T\n\nBeta\n')))
  await s.close()
})

test('lock is complete when visible; parallel starts admit exactly one', async () => {
  const { s, dir } = await setup()
  await s.close()
  const starts = await Promise.allSettled([1, 2, 3].map(() => startServer({ page: path.join(dir, 'page.html'), port: 0 })))
  const ok = starts.filter(x => x.status === 'fulfilled')
  assert.equal(ok.length, 1)
  const lock = JSON.parse(read(dir, '.live-edit/server.lock'))
  assert.equal(lock.port, ok[0].value.port)
  await ok[0].value.close()
})

test('runtime injection: served page gets the script tag, file on disk unchanged, runtime served', async () => {
  const { s, dir } = await setup({ runtime: '/* rt */' })
  const page = await req(s, 'GET', '/page.html')
  assert.equal(page.text, '<p>Hello world</p><script src="/__live-edit/runtime.js"></script>')
  assert.equal(read(dir, 'page.html'), '<p>Hello world</p>', 'the file itself is not changed')
  const rt = await req(s, 'GET', '/__live-edit/runtime.js')
  assert.equal(rt.status, 200)
  assert.equal(rt.text, '/* rt */')
  fs.writeFileSync(path.join(dir, 'other.html'), '<p>x</p>')
  assert.equal((await req(s, 'GET', '/other.html')).text, '<p>x</p>', 'only the page is injected')
  await s.close()
  const { s: s2 } = await setup()
  assert.equal((await req(s2, 'GET', '/page.html')).text, '<p>Hello world</p>', 'no runtime option: served as before')
  assert.equal((await req(s2, 'GET', '/__live-edit/runtime.js')).status, 404)
  await s2.close()
})

test('runtime injection goes before the last </body> and skips pages that carry the runtime', async () => {
  const { injectRuntime } = await import('../live-edit-server.mjs')
  assert.equal(injectRuntime('<body><p>a</p></body></html>'), '<body><p>a</p><script src="/__live-edit/runtime.js"></script></body></html>')
  const own = '<body><script src="live-edit-runtime.js"></script></body>'
  assert.equal(injectRuntime(own), own)
})

test('editable allow-list: edits to any other file are kept aside, never written', async () => {
  const dir0 = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'le-test-')))
  fs.mkdirSync(path.join(dir0, 'pages'))
  fs.writeFileSync(path.join(dir0, 'page.html'), '<p>Hello world</p>')
  fs.writeFileSync(path.join(dir0, 'pages', 'a.md'), MD)
  fs.writeFileSync(path.join(dir0, 'pages', 'b.md'), MD)
  const s = await startServer({ page: path.join(dir0, 'page.html'), source: path.join(dir0, 'pages', 'a.md'), editable: [path.join(dir0, 'pages', 'a.md')], port: 0 })
  const other = await edit(s, { sourceRef: 'pages/b.md#purpose', oldText: 'Alpha beta.', newText: 'X' })
  assert.deepEqual(other.json, { status: 'kept-aside', reason: "not this page's source" })
  const html = await edit(s, { sourceRef: 'page.html', oldText: 'Hello', newText: 'Bye' })
  assert.equal(html.json.status, 'kept-aside')
  assert.equal(read(dir0, 'pages/b.md'), MD)
  assert.equal(read(dir0, 'page.html'), '<p>Hello world</p>')
  assert.equal((await edit(s, { oldText: 'Alpha beta.', newText: 'Gamma.' })).json.status, 'saved', 'the page source itself is editable')
  await s.close()
})
