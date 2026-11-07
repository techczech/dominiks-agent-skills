// Shared helpers for the motion templates. Plain ES module, no dependencies.
// A template calls kit(ctx) once and uses it to place builds and emit GSAP statements.
//
// ctx (what the caller passes to render(slide, ctx)):
//   sid      scene element id, e.g. "s3"
//   start    seconds: the slide-change time from the log (the cut)
//   end      seconds: the next slide-change time
//   t0       seconds: earliest time for the scene's own furniture (title, rule, panels); they ride in with the transition
//   settle   seconds: earliest time for a build (after the incoming transition has finished); defaults to t0
//   builds   number[]  one time per build unit, in the order units(slide) returns them
//   motion   "calm" | "standard"   (calm = fade only, no travel, no highlight; for dense or beginner content)
//   warnings string[]  the template pushes messages here; the caller reports them
//   highlights [{item, at}]  optional focus cues (data, from plan/hand-cues): item = unit index (same order as builds), at = seconds
//            (the word where he names or returns to it); item null = clear the focus. See focus() below.

import { readFileSync, existsSync } from 'node:fs'
import { resolveIcon, iconHtml } from './_icons.mjs'

export const f = n => +Number(n).toFixed(2)
export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Frequency and speed are set separately (principles.md "What Animation Is For"): both presets change
// focus at the speaker's pace; calm removes travel, scale and highlight so the learner can read.
export const PRESETS = {
  calm:     { dur: 0.5,  travel: 0,  pop: 1,    ease: 'power1.out', now: false, count: false, stagger: 0.12 },
  standard: { dur: 0.55, travel: 28, pop: 0.92, ease: 'power3.out', now: true,  count: true,  stagger: 0.18 }
}

// Icons: see _icons.mjs (lucide vendored in ../icons/, tabler and brand marks from TalkWeaver's sets, never copied here).
export function loadIcon(name, dir) { return iconHtml(resolveIcon(name, { dir })) }

// Focus look: calm and slow. dim = opacity of built items that are not being talked about; tint = opacity of the item's .hl layer.
export const FOCUS = { dim: 0.62, tint: 1, dur: 0.45, ease: 'power2.inOut', buildIn: 0.5 }

export function kit(ctx) {
  const P = PRESETS[ctx.motion ?? 'standard']
  if (!P) throw new Error(`unknown motion "${ctx.motion}" (use calm or standard)`)
  const sid = ctx.sid
  const t0 = ctx.t0 ?? ctx.start + 0.1          // earliest time for the scene's own furniture (title, rule, panels): it rides in with the move
  const settle = ctx.settle ?? t0               // earliest time for a build (something he says): after the incoming move has ended
  const warnings = ctx.warnings ?? []
  const q = (s = '') => `#${sid} ${s}`.trim()
  const at = t => f(Math.max(t, t0))

  const api = {
    P, sid, t0, end: ctx.end, start: ctx.start, q, at,
    warn: m => warnings.push(`${sid}: ${m}`),

    // One time per unit. Missing times are spread evenly and reported, never silent.
    B(n) {
      const given = (ctx.builds ?? []).slice(0, n)
      if (given.length === n) return given.map(t => Math.max(t, settle))
      const span = Math.max(1, ctx.end - settle - 1.5)
      api.warn(`${n} build units but ${given.length} build times; missing ones spread evenly (check against the speech)`)
      return Array.from({ length: n }, (_, k) => given[k] != null ? Math.max(given[k], settle) : f(settle + 0.8 + span * (k + 0.5) / n))
    },

    // Reveal: opacity always; travel only in standard. dir: l r u d pop none
    show(sel, t, dir = 'u', o = {}) {
      const p = { opacity: 0 }
      const tr = o.travel ?? P.travel
      if (dir === 'l') p.x = -tr
      else if (dir === 'r') p.x = tr
      else if (dir === 'u') p.y = tr
      else if (dir === 'd') p.y = -tr
      else if (dir === 'pop' && P.pop < 1) p.scale = P.pop
      for (const key of ['x', 'y']) if (p[key] === 0) delete p[key]
      p.duration = o.dur ?? P.dur
      p.ease = dir === 'pop' && P.pop < 1 ? 'back.out(2)' : P.ease
      return `tl.from(${JSON.stringify(sel)}, ${JSON.stringify(p)}, ${at(t)});\n`
    },

    // Draw a line or bar (scale from its origin). Calm turns the draw into a fade.
    draw(sel, t, axis = 'X', dur = 0.8) {
      if (!P.travel) return api.show(sel, t, 'none')
      return `tl.from(${JSON.stringify(sel)}, { scale${axis}: 0, duration: ${dur}, ease: "power2.inOut" }, ${at(t)});\n`
    },

    // Title block shared by most layouts. Mode (ctx.titleMode): full | kicker | tab | none (see TITLE_MODES below).
    //   full   : section kicker, big heading, hairline rule (the original look)
    //   kicker : the slide title alone, small, in the kicker style, top-left; no heading, no rule
    //   tab    : a strip of pills along the top; ctx.tabs = titles of the section's slides, ctx.tabIndex = the current one
    //            (without ctx.tabs: one pill holding the title)
    //   none   : no title block at all (an empty .topbar stays so transitions find it)
    // The block ends with <!--/tb--> so applyTitleMode() can wrap everything after it.
    top(kicker, title, accent = 'green') {
      const mode = ctx.titleMode ?? 'full'
      if (mode === 'none') return `<div class="topbar tb-none"></div><!--/tb-->`
      if (mode === 'kicker') return `<div class="topbar tb-kicker"><div class="kicker" style="color:var(--${accent})">${esc(title)}</div></div><!--/tb-->`
      if (mode === 'tab') {
        const tabs = ctx.tabs?.length ? ctx.tabs : [title], cur = ctx.tabs?.length ? (ctx.tabIndex ?? 0) : 0
        if (tabs.join('').length > 80) api.warn(`tab strip is ${tabs.join('').length} characters; shorten the titles or show fewer tabs`)
        return `<div class="topbar tb-tab">${tabs.map((x, i) => `<span class="tab${i === cur ? ' on' : ''}" style="--tc:var(--${accent})">${esc(x)}</span>`).join('')}</div><!--/tb-->`
      }
      const len = String(title).length
      const size = len <= 30 ? 54 : len <= 44 ? 48 : 40   // N22: titles are regular weight and smaller; the content carries the slide
      if (len > 60) api.warn(`title is ${len} characters; shorten it for the video`)
      // N12: no small kicker over the title unless the slide supplies one (slide.kicker); without it the block sits a little lower
      return `<div class="topbar${kicker ? '' : ' nk'}">${kicker ? `<div class="kicker" style="color:var(--${accent})">${esc(kicker)}</div>` : ''}<h2 style="font-size:${size}px">${esc(title)}</h2><div class="rule"></div></div><!--/tb-->`
    },
    topJs(t = t0) {
      const mode = ctx.titleMode ?? 'full'
      if (mode === 'none') return ''
      if (mode !== 'full') return api.show(q('.topbar'), t, 'd', { travel: 12, dur: 0.5 })
      return api.show(q('.topbar'), t, 'd', { travel: 16, dur: 0.5 }) + api.draw(q('.rule'), t + 0.3, 'X', 0.9)
    },

    // "Now" marker: tint the unit being spoken about, from its time until the next unit (max 6 s).
    // Standard only. Needs <i class="hl"></i> inside each unit element.
    now(selectors, times) {
      if (!P.now) return ''
      return selectors.map((sel, k) => {
        const a = at(times[k])
        const next = times[k + 1] ?? ctx.end - 0.4
        const b = f(Math.max(a + 0.8, Math.min(next, a + 6)))
        return `tl.to(${JSON.stringify(sel + ' .hl')}, { opacity: 1, duration: 0.3 }, ${a});\ntl.to(${JSON.stringify(sel + ' .hl')}, { opacity: 0, duration: 0.4 }, ${b});\n`
      }).join('')
    },

    // Focus ("highlight each item as he mentions it"): opt-in for list/column templates. After the build-in, the item
    // named in ctx.highlights gets its tint (<i class="hl"> at FOCUS.tint) and the other built items dim to FOCUS.dim, moving item to item
    // at the cue times (0.45 s, power2.inOut; no scale, no weight change). {item: null, at} clears it (he is not on any item).
    // A focus never starts within FOCUS.buildIn of its item's build. Standard motion only. Returns the GSAP statements, or
    // null when there are no cues (the template then falls back to now()). Needs <i class="hl"></i> in each unit element.
    focus(selectors, builds, cues = ctx.highlights) {
      if (!P.now || !cues?.length) return null
      const n = selectors.length
      const ev = []
      for (const c of cues) {
        if (c.item != null && !(Number.isInteger(c.item) && c.item >= 0 && c.item < n)) { api.warn(`highlight item ${c.item} at ${c.at} s is not a unit (0-${n - 1}); ignored`); continue }
        ev.push({ item: c.item, T: c.item == null ? at(c.at) : at(Math.max(c.at, builds[c.item] + FOCUS.buildIn)) })
      }
      ev.sort((a, b) => a.T - b.T)
      const st = selectors.map(() => ({ o: 1, h: 0 }))
      let js = '', last = -9
      for (const e of ev) {
        if (e.T - last < 0.3 && last > 0) api.warn(`highlights ${f(last)} s and ${f(e.T)} s are under 0.3 s apart`)
        last = e.T
        selectors.forEach((sel, i) => {
          const built = builds[i] + FOCUS.buildIn <= e.T
          if (!built) return
          const active = e.item === i
          const o = e.item == null || active ? 1 : FOCUS.dim, h = active ? FOCUS.tint : 0
          const tw = (target, from, to, prop) => `tl.fromTo(${JSON.stringify(target)}, { opacity: ${from} }, { opacity: ${to}, duration: ${FOCUS.dur}, ease: "${FOCUS.ease}", immediateRender: false }, ${e.T});\n`
          if (o !== st[i].o) { js += tw(sel, st[i].o, o); st[i].o = o }
          if (h !== st[i].h) { js += tw(sel + ' .hl', st[i].h, h); st[i].h = h }
        })
      }
      return js
    },

    // Inline icon. item.iconSvg (exporter) wins; else item.icon = "lucide:brain", "tabler:users-group" (mapped via the TalkWeaver tabler set or a lucide
    // stand-in), "svgl:openai" / "si:github" (brand marks from the TalkWeaver sets, see _icons.mjs). Never hand-drawn, never emoji:
    // an unknown name is reported and shows nothing.
    icon: item => {
      if (!item) return ''
      let svg = item.iconSvg ?? null
      if (!svg && item.icon) {
        const r = resolveIcon(item.icon, { dir: ctx.iconSets, look: ctx.look, ink: ctx.look?.ink })
        svg = iconHtml(r)
        if (!svg) api.warn(/^(svgl|si|simple-icons):/.test(String(item.icon)) ? `logo "${item.icon}" not found in the icon sets (set look.json "iconSets" or env TALKWEAVER_ICONS to TalkWeaver's compiler/assets/icons); name only, no mark` : `icon "${item.icon}" cannot be drawn (not in kit/icons or the icon sets; run: node kit/tools/vendor-icons.mjs ${String(item.icon).replace(/^lucide:/, '')})`)
      }
      return svg ? `<span class="ico">${svg}</span>` : ''
    },
    hl: '<i class="hl"></i>'
  }
  return api
}

// Words in a string, for the "short phrases" lint.
export const wc = s => String(s ?? '').trim().split(/\s+/).filter(Boolean).length

// Estimate wrapped height of text blocks and pick the largest font size that fits (average sans glyph ~0.54 em per char).
// Returns { size, fits }. Used so long outline text shrinks before it clips.
export function fit(texts, { width, sizes, lh = 1.2, pad = 0, gap = 0, maxH, em = 0.54 }) {
  for (const s of sizes) {
    const cpl = Math.max(4, Math.floor(width / (s * em)))
    const h = texts.reduce((a, t) => a + Math.ceil(String(t).length / cpl) * s * lh + pad + gap, 0)
    if (h <= maxH) return { size: s, fits: true }
  }
  return { size: sizes[sizes.length - 1], fits: false }
}

// Like fit(), but each text sits in its own box: the tallest single text must fit maxH.
export function fitEach(texts, { width, sizes, lh = 1.2, maxH, em = 0.54 }) {
  for (const s of sizes) {
    const cpl = Math.max(4, Math.floor(width / (s * em)))
    if (texts.every(t => Math.ceil(String(t).length / cpl) * s * lh <= maxH)) return { size: s, fits: true }
  }
  return { size: sizes[sizes.length - 1], fits: false }
}

// Connector between two boxes (centre + size), clipped to each box edge. gap = 0 (default): both ends sit exactly on the
// box borders, so the line touches the boxes it joins (N11) and the head, drawn with refX at its tip, is whole.
// Returns { x1, y1, x2, y2, len }. The marker tip should sit at (x2, y2).
export function edge(a, b, gap = 0) {
  const dx = b.cx - a.cx, dy = b.cy - a.cy
  const hit = (box, sx, sy) => {   // distance along (sx, sy) from the box centre to its border, plus the gap
    const tx = sx ? (box.w / 2 + gap) / Math.abs(sx) : Infinity, ty = sy ? (box.h / 2 + gap) / Math.abs(sy) : Infinity
    return Math.min(tx, ty)
  }
  const L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L
  const d1 = hit(a, ux, uy), d2 = hit(b, ux, uy)
  const p = { x1: a.cx + ux * d1, y1: a.cy + uy * d1, x2: b.cx - ux * d2, y2: b.cy - uy * d2 }
  return { ...p, len: Math.max(0, L - d1 - d2) }
}

// ---- Title modes -------------------------------------------------------------------------------------------------
// Chosen per video (compose({ titleMode })) and overridable per scene (scene.titleMode). Values:
//   full            the prominent title (default)
//   kicker          the title as a small kicker line, top-left; the content re-centres in the freed space
//   tab             a tab strip (the section's slide titles, the current one highlighted); content re-centres
//   none            no title; content re-centres
//   intro-then-none a title card (section/title layout) introduces the topic; the scenes after it show no title
//                   (or a kicker only, with opts.afterIntro = 'kicker'); a new section card starts a new topic
export const TITLE_MODES = ['full', 'kicker', 'tab', 'none', 'intro-then-none']
// How far the content block moves up when the title block is small or gone: the old band was y 255-990 (centre 622);
// the new band starts under the small title and runs to 1020 (kicker 120, tab 130) or the whole slide (none 50-1030).
export const TITLE_DY = { full: 0, kicker: -62, tab: -57, none: -82 }

const CARD_LAYOUTS = ['section', 'title', 'closing']
// Resolve the mode for each scene: scene override first, then the video mode. Returns a string[] parallel to scenes.
export function resolveTitleModes(scenes, videoMode = 'kicker', opts = {}) {
  if (!TITLE_MODES.includes(videoMode)) throw new Error(`unknown titleMode "${videoMode}" (use ${TITLE_MODES.join(', ')})`)
  return scenes.map(sc => {
    if (sc.titleMode) { if (!TITLE_MODES.includes(sc.titleMode) || sc.titleMode === 'intro-then-none') throw new Error(`bad scene titleMode "${sc.titleMode}"`); return sc.titleMode }
    if (videoMode === 'intro-then-none') return CARD_LAYOUTS.includes(sc.slide?.layout) ? 'full' : (opts.afterIntro ?? 'none')
    return videoMode
  })
}

// Wrap everything after the title block in <div class="tbody" style="top:dy"> so the content re-centres. 'full' is untouched.
// out = a template's render() result. Templates' `.xx > svg` rules also match inside .tbody (see their css).
export function applyTitleMode(out, mode) {
  const dy = TITLE_DY[mode] ?? 0
  const mark = '<!--/tb-->'
  const i = out.html.indexOf(mark)
  if (!dy || i < 0) return out
  const head = out.html.slice(0, i + mark.length), rest = out.html.slice(i + mark.length)
  return { ...out, html: `${head}<div class="tbody" style="top:${dy}px">${rest}</div>` }
}

// Arrowhead marker whose tip sits exactly on the path end (refX = tip). Use with edge() / arcs ending on a box border.
export const arrowMarker = id => `<marker id="${id}" markerUnits="userSpaceOnUse" markerWidth="18" markerHeight="18" refX="16" refY="9" orient="auto"><path d="M1 1 L16 9 L1 17 Z" fill="#101418"/></marker>`

export const titleModeCss = `
.tbody { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
.tb-kicker { top: 52px; }
.tb-kicker .kicker { font-family: var(--sans); font-size: 32px; font-weight: 400; letter-spacing: 0; text-transform: none; }   /* N30: sentence case, small, regular */
.tb-tab { top: 40px; display: flex; flex-wrap: nowrap; gap: 14px; align-items: center; }
.tb-tab .tab { font-family: var(--mono); font-size: 25px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; padding: 10px 24px; border-radius: 999px; border: 2px solid rgba(16,20,24,0.18); color: var(--muted); white-space: nowrap; }
.tb-tab .tab.on { background: var(--tc); border-color: var(--tc); color: #fff; }
.tb-none { top: 0; height: 0; }
`

// For tab mode: for each scene, the titles of the consecutive content scenes that share its slide.section, and its place among them.
export function sectionTabs(scenes) {
  const out = scenes.map(() => null)
  let i = 0
  while (i < scenes.length) {
    const sec = scenes[i].slide?.section
    let j = i
    while (j < scenes.length && scenes[j].slide?.section === sec && !CARD_LAYOUTS.includes(scenes[j].slide?.layout)) j++
    if (j === i) { i++; continue }
    const tabs = scenes.slice(i, j).map(sc => sc.slide.title)
    for (let k = i; k < j; k++) out[k] = { tabs, index: k - i }
    i = j
  }
  return out
}
