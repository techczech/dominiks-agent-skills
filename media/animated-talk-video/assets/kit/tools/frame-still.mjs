#!/usr/bin/env node
// A PNG of one frame JSON as the browser draws it, with the look's real faces loaded (rsvg cannot load @font-face; this can).
//   node kit/tools/frame-still.mjs <frame.json> <out.png> [--look look.json] [--type fraunces-alegreya|geist|inter]
// Uses chrome-headless-shell (tools/shoot.mjs). Images and icons resolve against the project, as in the build: the folder above frames/ (or --base dir); look.json there is used unless --look is given. The settled picture (all builds shown).
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'
import { frameStill } from '../templates/_frame.mjs'
import { lookCss, defaultLook, baseCss } from '../templates/index.mjs'
import { shoot } from './shoot.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2), pos = [], o = {}
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[++i]; else pos.push(argv[i]) }
if (pos.length < 2) { console.error('usage: node frame-still.mjs <frame.json> <out.png> [--look look.json] [--type preset] [--base project-dir]'); process.exit(2) }
const [framePath, outPath] = pos.map(p => path.resolve(p))
const frame = JSON.parse(readFileSync(framePath, 'utf8'))
const baseDir = o.base ? path.resolve(o.base) : path.basename(path.dirname(framePath)) === 'frames' ? path.dirname(path.dirname(framePath)) : path.dirname(framePath)
const lookPath = o.look ? path.resolve(o.look) : path.join(baseDir, 'look.json')
let look = existsSync(lookPath) ? JSON.parse(readFileSync(lookPath, 'utf8')) : {}
if (o.type) look = { ...look, type: o.type }
const L = { ...defaultLook, ...look, accents: { ...defaultLook.accents, ...look.accents }, tints: { ...defaultLook.tints, ...look.tints } }
const { svg, warnings } = frameStill(frame, { look: L, warn: m => console.error('warn ' + m) })
const fontBase = pathToFileURL(path.join(here, '../fonts') + '/').href
const html = `<!doctype html><html><head><meta charset="utf-8"><base href="${pathToFileURL(baseDir + '/').href}"><style>${lookCss(L, { fontBase })}${baseCss}</style></head><body>${svg.replace('<svg ', '<svg style="display:block" ')}</body></html>`
const tmp = path.join(mkdtempSync(path.join(tmpdir(), 'atv-still-')), 'frame.html')
writeFileSync(tmp, html)
await shoot({ url: pathToFileURL(tmp).href, wait: 1200, shots: [{ out: outPath }] })
console.log(outPath)
