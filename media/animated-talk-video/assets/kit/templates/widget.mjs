// widget: a talk's existing self-contained HTML widget (chart, diagram, simulation) shown as a scene at 1920x1080, built up in step with the speech (N39).
//
// How: STILLS, not a live embed. A live iframe has its own clock, fonts and network, and HyperFrames seeks frames deterministically, so a live widget
// drifts or renders blank. prepare() opens the widget once in chrome-headless-shell at 1920x1080, presses it through its states exactly as a presenter
// would, saves one PNG per state into <project>/assets/widget-stills/ (named by a hash of the file, so an edited widget re-captures), and render() stacks
// the stills and cross-fades state k over state k-1 at build k. State 0 shows from the start of the scene.
//
// slide: { title, src: "widgets/x.html" (relative to the project, or absolute), steps?: N, stepmode?: key|click|param|attr, wait?: ms, items?: [{text}] }
//   outline:  ### Chart builds {widget src=widgets/x.html steps=2 stepmode=key}
//             - the line rises          <- one bullet per step = the words that trigger it (speech match / hand cue like any other build)
//             - the lab rings appear
//   units     = steps; with no bullets the unit texts are "step 1"... and the planner spreads them (give bullets or cues).
//   stepmode  key (default): ArrowRight is pressed once per step (widgets in the Mapping the Landscape set step on Space / ArrowRight / Enter).
//             click: a click at the middle of the page per step.
//             param: loads <src>?step=N for each state.        attr: sets data-step=N on <html> and fires a "stepchange" event (and calls window.setStep(N) if defined).
// Motion: cross-fade (calm and standard alike); a widget is the picture, it does not travel.
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { kit, esc } from './_kit.mjs'

export const layout = 'widget'
export const css = `
.wd { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; background: var(--paper); }
/* Fit the 1920x1080 still above the caption zone (captions live below y 990): scale 0.9 => 1728x972, centred horizontally, top 8 px. */
.wd img { position: absolute; left: 96px; top: 8px; width: 1728px; height: 972px; display: block; }
`
const f2 = n => +Number(n).toFixed(2)
export const stepCount = slide => Math.max(0, Number(slide.steps ?? (slide.items ?? []).length) || 0)
export const units = slide => Array.from({ length: stepCount(slide) }, (_, i) => slide.items?.[i]?.text ?? `step ${i + 1}`)

const srcPath = (slide, projDir) => path.resolve(projDir ?? process.cwd(), String(slide.src ?? '').replace(/^~(?=\/)/, process.env.HOME))
// Where the stills live and what they are called (deterministic: render() and prepare() agree without sharing state).
export function stillsFor(slide, projDir) {
  const src = srcPath(slide, projDir)
  if (!slide.src) throw new Error('widget slide needs src=<widget.html>')
  if (!existsSync(src)) throw new Error(`widget file not found: ${src}`)
  const n = stepCount(slide), mode = slide.stepmode ?? 'key'
  const hash = createHash('sha1').update(readFileSync(src)).update(`${mode}|${n}|${slide.stepmap ?? ''}`).digest('hex').slice(0, 8)
  const stem = path.basename(src).replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]+/gi, '-').slice(0, 48)
  const rel = Array.from({ length: n + 1 }, (_, k) => `assets/widget-stills/${stem}-${hash}-s${k}.png`)
  return { src, rel, abs: rel.map(r => path.resolve(projDir ?? process.cwd(), r)), n, mode }
}

// Called by build-video before compose(): capture missing stills. async because the capture drives a browser.
export async function prepare(slide, { projDir, warn = m => console.error('warn ' + m) } = {}) {
  const { src, abs, n, mode } = stillsFor(slide, projDir)
  if (abs.every(p => existsSync(p))) return { captured: 0 }
  // stepmap=a,b,c (outline tag): build k shows widget step map[k-1]; state 0 stays step 0
  const map = String(slide.stepmap ?? '').split(',').filter(x => x.trim() !== '').map(Number)
  const stepAt = k => (k > 0 && map.length ? map[k - 1] ?? k : k)
  const { shoot } = await import(pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), '../tools/shoot.mjs')).href)
  mkdirSync(path.dirname(abs[0]), { recursive: true })
  const wait = Number(slide.wait ?? 900)
  const base = pathToFileURL(src).href
  if (mode === 'param') {
    for (let k = 0; k <= n; k++) await shoot({ url: `${base}?step=${stepAt(k)}`, wait, shots: [{ out: abs[k] }] })
  } else {
    const act = mode === 'click' ? { click: true } : mode === 'attr'
      ? { eval: k => `document.documentElement.dataset.step=${k};window.dispatchEvent(new Event('stepchange'));if(window.setStep)window.setStep(${k})` }
      : { press: 'ArrowRight' }
    const shots = abs.map((out, k) => k === 0 ? { out } : mode === 'attr' ? { eval: act.eval(k), out, wait: 700 } : { ...act, out, wait: 800 })
    await shoot({ url: base, wait, shots })
  }
  warn(`widget ${path.basename(src)}: captured ${n + 1} state(s) (${mode}) into assets/widget-stills/; open them and check each state differs`)
  return { captured: n + 1 }
}

export function render(slide, ctx) {
  const k = kit(ctx), sid = ctx.sid
  const { rel, abs, n } = stillsFor(slide, ctx.projDir)
  const missing = abs.filter(p => !existsSync(p))
  if (missing.length) throw new Error(`${sid}: widget stills missing (${missing.length}); build-video captures them first (prepareScenes), or run the capture again`)
  const b = n ? k.B(n) : []
  const html = `<div class="wd" id="${sid}fig">${rel.map((r, i) => `<img id="${sid}w${i}" src="${esc(r)}" alt="${esc(slide.title ?? 'widget')} state ${i}"${i ? ' style="opacity:0"' : ''}>`).join('')}</div>`
  let js = ''
  for (let i = 1; i <= n; i++) js += `tl.fromTo("#${sid}w${i}", { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power1.inOut" }, ${f2(b[i - 1])});\n`
  if (!n) k.warn('widget has no steps: it shows as one still; add steps=N and a bullet per step if the widget builds up')
  return { html, js, cls: 'wd-scene' }
}
