#!/usr/bin/env node
// Headless stills with chrome-headless-shell (never the real Chrome), through the DevTools protocol; no npm dependencies (Node >= 22 has WebSocket).
//
// library:  import { findChrome, shoot } from './shoot.mjs'
//   await shoot({ url, width: 1920, height: 1080, wait: 400,
//                 shots: [{ out: 'a.png' }, { press: 'ArrowRight', times: 1, wait: 700, out: 'b.png' }, { click: true, out: 'c.png' }, { eval: 'js', out: 'd.png' }] })
//   Each shot runs its action (key presses / click / eval) on the page as it stands, waits, then saves a PNG. Widgets that step on a key or a click
//   are stepped by the same events a presenter would send; so the state of shot N is the widget's state after N actions.
// CLI:      node shoot.mjs <url-or-file> <out.png> [--w 1920 --h 1080 --wait 400]
//
// Browser: env CHROME_HEADLESS_SHELL, else the newest chrome-headless-shell in ~/.cache/puppeteer or ~/.cache/hyperframes/chrome.
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

export function findChrome() {
  const e = process.env.CHROME_HEADLESS_SHELL
  if (e && existsSync(e)) return e
  const found = []
  for (const base of [path.join(homedir(), '.cache/puppeteer/chrome-headless-shell'), path.join(homedir(), '.cache/hyperframes/chrome/chrome-headless-shell')]) {
    if (!existsSync(base)) continue
    for (const d of readdirSync(base)) {
      if (!/^(mac|linux|win)/.test(d)) continue
      const sub = readdirSync(path.join(base, d)).find(x => x.startsWith('chrome-headless-shell-'))
      if (!sub) continue
      for (const bin of ['chrome-headless-shell', 'chrome-headless-shell.exe']) { const p = path.join(base, d, sub, bin); if (existsSync(p)) found.push(p) }
    }
  }
  found.sort().reverse()
  if (!found.length) throw new Error('chrome-headless-shell not found: set CHROME_HEADLESS_SHELL (hyperframes downloads one to ~/.cache/hyperframes/chrome on first render)')
  return found[0]
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const KEYS = { ArrowRight: [39, 'ArrowRight'], ArrowLeft: [37, 'ArrowLeft'], Enter: [13, 'Enter'], ' ': [32, 'Space'], Space: [32, 'Space'], ArrowDown: [40, 'ArrowDown'], ArrowUp: [38, 'ArrowUp'] }

export async function shoot({ url, width = 1920, height = 1080, wait = 400, shots }) {
  const dir = mkdtempSync(path.join(tmpdir(), 'atv-shoot-'))
  const child = spawn(findChrome(), ['--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--remote-debugging-port=0', `--user-data-dir=${dir}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
  try {
    const wsUrl = await new Promise((res, rej) => {
      let buf = ''
      const t = setTimeout(() => rej(new Error('chrome-headless-shell did not start')), 15000)
      child.stderr.on('data', d => { buf += d; const m = buf.match(/ws:\/\/[^\s]+/); if (m) { clearTimeout(t); res(m[0]) } })
      child.on('exit', c => rej(new Error('chrome-headless-shell exited ' + c)))
    })
    const ws = new WebSocket(wsUrl)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('devtools socket failed')) })
    let id = 0
    const pending = new Map(), waiters = []
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data)
      if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result) }
      else if (m.method) for (const w of [...waiters]) if (w.method === m.method) { waiters.splice(waiters.indexOf(w), 1); w.res(m.params) }
    }
    const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })) })
    const once = method => new Promise(res => waiters.push({ method, res }))
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const S = (m, p) => send(m, p, sessionId)
    await S('Page.enable'); await S('Runtime.enable')
    await S('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    const loaded = once('Page.loadEventFired')
    await S('Page.navigate', { url })
    let tm; await Promise.race([loaded, new Promise(r => { tm = setTimeout(r, 20000) })]); clearTimeout(tm)
    await sleep(wait)
    const outs = []
    for (const sh of shots) {
      for (let k = 0; k < (sh.times ?? (sh.press || sh.click ? 1 : 0)); k++) {
        if (sh.press) {
          const [code, key] = KEYS[sh.press] ?? [sh.press.toUpperCase().charCodeAt(0), sh.press]
          for (const type of ['rawKeyDown', 'keyUp']) await S('Input.dispatchKeyEvent', { type, key: sh.press === 'Space' ? ' ' : sh.press, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code })
        } else if (sh.click) {
          for (const type of ['mousePressed', 'mouseReleased']) await S('Input.dispatchMouseEvent', { type, x: sh.x ?? width / 2, y: sh.y ?? height / 2, button: 'left', clickCount: 1 })
        }
        await sleep(150)
      }
      if (sh.eval) await S('Runtime.evaluate', { expression: sh.eval, awaitPromise: true })
      await sleep(sh.wait ?? (sh.press || sh.click || sh.eval ? 900 : 0))
      const { data } = await S('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      if (sh.out) writeFileSync(sh.out, Buffer.from(data, 'base64'))
      outs.push(sh.out)
    }
    try { await send('Browser.close') } catch {}
    ws.close()
    return outs
  } finally {
    child.kill('SIGKILL')
    rmSync(dir, { recursive: true, force: true })
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv.slice(2), o = {}, pos = []
  for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[++i]; else pos.push(argv[i]) }
  if (pos.length < 2) { console.error('usage: node shoot.mjs <url-or-file> <out.png> [--w 1920 --h 1080 --wait 400]'); process.exit(1) }
  const url = /^[a-z]+:/.test(pos[0]) ? pos[0] : pathToFileURL(path.resolve(pos[0])).href
  await shoot({ url, width: +(o.w ?? 1920), height: +(o.h ?? 1080), wait: +(o.wait ?? 400), shots: [{ out: path.resolve(pos[1]) }] })
  console.log('wrote ' + pos[1])
}
