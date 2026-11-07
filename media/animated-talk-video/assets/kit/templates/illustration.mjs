// illustration: a full-frame line-art picture (people, objects, interfaces, the talk's charts) whose build groups arrive at the spoken words.
// The picture is a frame JSON (format and element types: _frame.mjs header; fields: references/inputs.md). The generator draws it as SVG here,
// so no manual step sits between the frame file and the video.
//
// slide: { title, frame: "frames/search.json" (relative to the project folder) | frameData: {frame object}, items?: ignored }
//   outline:  ### Search by a person {illustration frame=frames/search.json id=search}
//             (or an image line ![](frames/search.json))
//   units     one per build, text = the build's `cue` words, so the planner finds them in the speech like any bullet; a build with `at`
//             (seconds from the scene start) is a hand time (handTimes()).
//   key       the frame's one key phrase (<= 9 words, top-left, 58 px); with none given the slide title is used.
// Motion: rise | fade | pop | slide | move | wipe per build or element (every one has a job); calm = fade only.
// Ids are prefixed with the scene id, so scenes never clash.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { kit } from './_kit.mjs'
import { frameToSvg } from './_frame.mjs'

export const layout = 'illustration'
export const css = `
.il { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
.il svg { width: 1920px; height: 1080px; display: block; overflow: visible; }
.il text { font-family: var(--sans); }
`
const f2 = n => +Number(n).toFixed(2)

export function loadFrame(slide, projDir) {
  if (slide.frameData) return JSON.parse(JSON.stringify(slide.frameData))
  const src = slide.frame ?? slide.images?.find(i => /\.json$/i.test(i.src))?.src
  if (!src) throw new Error('illustration slide needs frame=<file.json> (or an image line ![](frames/x.json))')
  return JSON.parse(readFileSync(path.resolve(projDir ?? process.cwd(), src), 'utf8'))
}
export const units = (slide, ctx) => (loadFrame(slide, ctx?.projDir).builds ?? []).map(b => b.cue ?? b.text ?? '')
// seconds from the scene start for builds that carry `at` (null = from the speech)
export const handTimes = (slide, ctx) => (loadFrame(slide, ctx?.projDir).builds ?? []).map(b => b.at ?? null)

export function motionJs(sel, mot, tt, calm, hasTransform = false) {
  const [name, arg = ''] = String(mot).split(':')
  const fade = `tl.fromTo(${sel}, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out" }, ${tt});\n`
  if (calm || name === 'fade') return fade
  if (name === 'rise') return `tl.fromTo(${sel}, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, ${tt});\n`
  if (name === 'pop') return `tl.fromTo(${sel}, { opacity: 0, scale: 0.9, transformOrigin: "50% 50%", transformBox: "fill-box" }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" }, ${tt});\n`
  if (name === 'slide') {
    const [dx = 0, dy = 0, dd = 0.8] = arg.split(',').map(Number)
    return `tl.fromTo(${sel}, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "none" }, ${tt});\ntl.fromTo(${sel}, { x: ${dx}, y: ${dy} }, { x: 0, y: 0, duration: ${dd}, ease: "power2.out" }, ${tt});\n`
  }
  if (name === 'move') { const [dx = 0, dy = 0] = arg.split(',').map(Number); return `tl.from(${sel}, { x: "+=${dx}", y: "+=${dy}", duration: 0.9, ease: "power2.inOut" }, ${tt});\n` }
  if (name === 'wipe') {
    const [dir = 'r', dur = '0.8'] = arg.split(',')
    const hid = { r: 'inset(0% 100% 0% 0%)', l: 'inset(0% 0% 0% 100%)', d: 'inset(0% 0% 100% 0%)', u: 'inset(100% 0% 0% 0%)' }[dir] ?? 'inset(0% 100% 0% 0%)'
    return `tl.fromTo(${sel}, { clipPath: ${JSON.stringify(hid)} }, { clipPath: "inset(0% 0% 0% 0%)", duration: ${Number(dur)}, ease: "power1.inOut" }, ${tt});\ntl.set(${sel}, { clipPath: "none" }, ${f2(tt + Number(dur) + 0.02)});\n`
  }
  throw new Error(`unknown motion "${mot}"`)
}

export function render(slide, ctx) {
  const k = kit(ctx), sid = ctx.sid
  const frame = loadFrame(slide, ctx.projDir)
  if (!frame.key && frame.key !== false) frame.key = slide.title
  frame.id = frame.id ?? sid
  const r = frameToSvg(frame, { prefix: `${sid}-`, look: ctx.look, iconSets: ctx.iconSets, warn: m => k.warn(m) })
  const n = r.builds.length
  const b = k.B(n)
  const calm = ctx.motion === 'calm'
  const q = id => JSON.stringify(`#${sid}-${id}`)
  let js = ''
  r.builds.forEach((bd, i) => {
    const t = b[i]
    bd.items.forEach((it, j) => { js += motionJs(q(it.id), it.motion, f2(t + j * bd.stagger), calm) })
    for (const id of bd.hide) js += `tl.to(${q(id)}, { opacity: 0, duration: 0.3, ease: "power1.out" }, ${f2(t)});\n`
    for (const [id, v] of Object.entries(bd.dim)) js += `tl.to(${q(id)}, { opacity: ${v}, duration: 0.5, ease: "power1.inOut" }, ${f2(t)});\n`
  })
  if (!n) k.warn('illustration has no builds: nothing arrives while the voice runs (N32); add builds')
  const html = `<div class="il" id="${sid}fig">${r.svg.replace(/<svg ([^>]*)>/, '<svg $1 font-family="Inter, system-ui, sans-serif">').replace(/<title>[\s\S]*?<\/title>/, '')}</div>`
  return { html, js, cls: 'il-scene' }
}
