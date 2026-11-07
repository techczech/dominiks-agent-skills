// Scene-to-scene transitions done with GSAP on the scene elements (no HyperShader). Plain ES module.
// Deterministic and seekable: only tl.fromTo / tl.to / tl.set on the paused timeline `tl`.
//
//   import { transition, TRANSITIONS } from './templates/transitions.mjs'
//   const t = transition('push-left', { from: 's3', to: 's4', t: 12.0 })   // t = when the move starts, seconds
//   js += t.js                                   // GSAP statements, placed after the scenes' own tweens
//   // t.end = when the outgoing scene can be hidden; t.dur = length of the move
//
// Scene elements: `from` is the outgoing scene id, `to` the incoming one (ids without '#'). The incoming scene
// must come later in the DOM (it paints over the outgoing one) and be visible from t; the outgoing scene must stay
// visible until t.end. Both are plain 1920x1080 divs; `holdSel` names the parts that stay put in 'title-stays'
// (the kit's .topbar, or .ltitle for the list layout; options holdFrom / holdTo per scene); everything else in the scene is "the body".
//
// Options common to all: dur (seconds), ease. Per style: dist (px, slide-fade / slide-up), eps (see below).
// Light backgrounds assumed: no blur, no scale-up, nothing translucent that smears text.

const f = n => +Number(n).toFixed(3)
const q = id => JSON.stringify('#' + id)
const HOLD = '.topbar, .ltitle'
const NOT_HOLD = ':not(.topbar):not(.ltitle)'
const TRANSPARENT = 'rgba(253,253,251,0)'

export const TRANSITIONS = {
  // 1. Push: whole frame offset, A out left while B comes in from the right.
  'push-left': {
    label: 'Push left', defaults: { dur: 1.2, ease: 'sine.inOut' },
    js: ({ from, to, t, dur, ease }) =>
      `tl.fromTo(${q(from)}, { x: 0 }, { x: -1920, duration: ${f(dur)}, ease: "${ease}" }, ${f(t)});\n` +
      `tl.fromTo(${q(to)}, { x: 1920 }, { x: 0, duration: ${f(dur)}, ease: "${ease}" }, ${f(t)});\n`
  },

  // 2. Short slide + fade: A leaves 60 px left while fading, B arrives from 60 px right while fading in.
  //    A takes the first two thirds, B the last two thirds: one third of overlap, so the text never ghosts.
  'slide-fade': {
    label: 'Short slide + fade', defaults: { dur: 1.0, dist: 80, ease: 'sine.inOut', axis: 'x' },
    js: ({ from, to, t, dur, dist, axis, ease }) => slideFade({ from, to, t, dur, dist, axis, ease })
  },

  // 3. Same as 2 but vertical: A up, B from below.
  'slide-up': {
    label: 'Slide up', defaults: { dur: 1.0, dist: 80, ease: 'sine.inOut', axis: 'y' },
    js: ({ from, to, t, dur, dist, axis, ease }) => slideFade({ from, to, t, dur, dist, axis, ease })
  },

  // 4. Title stays: the title block never crossfades (overlapping title text is unreadable). Three or four separate steps:
  //    old content slides out left; old title slides out fully; THEN the new title slides in from the right; new content slides in.
  //    Identical titles (sameTitle: true): the title holds still and only the content changes.
  //    Four steps share dur as 0.3 / 0.2 / 0.2 / 0.3. Never two titles on screen at once.
  'title-stays': {
    label: 'Title stays, content then title then content', defaults: { dur: 1.8, ease: 'sine.inOut', sameTitle: false, holdFrom: HOLD, holdTo: HOLD, bodyFrom: true, noTitle: false, bgTo: null },
    js: o => titleSteps(o)
  },

  // 4b. Title first: same steps, other order: the title changes first (old out, new in), then the content swaps.
  'title-first': {
    label: 'Title first, then content', defaults: { dur: 1.8, ease: 'sine.inOut', sameTitle: false, holdFrom: HOLD, holdTo: HOLD, bodyFrom: true, noTitle: false, bgTo: null },
    js: o => titleSteps({ ...o, titleFirst: true })
  },

  // 5. Card stack: A steps back (scale 0.97, a little darker); B slides over it from the right with a soft shadow edge.
  'card-stack': {
    label: 'Card stack', defaults: { dur: 1.2, ease: 'sine.inOut', back: 0.97, dim: 0.94 },
    js: ({ from, to, t, dur, ease, back, dim }) =>
      `tl.set(${q(to)}, { boxShadow: "-28px 0 60px rgba(16,20,24,0.16)" }, 0);\n` +
      `tl.fromTo(${q(from)}, { scale: 1, filter: "brightness(1)" }, { scale: ${back}, filter: "brightness(${dim})", transformOrigin: "50% 50%", duration: ${f(dur)}, ease: "${ease}" }, ${f(t)});\n` +
      `tl.fromTo(${q(to)}, { x: 1920 }, { x: 0, duration: ${f(dur)}, ease: "${ease}" }, ${f(t)});\n`
  },

  // 6. Baseline: near-cut, B fades in over A.
  'crossfade-cut': {
    label: 'Cut with short crossfade', defaults: { dur: 0.6, ease: 'sine.inOut' },
    js: ({ from, to, t, dur, ease }) =>
      `tl.fromTo(${q(to)}, { opacity: 0 }, { opacity: 1, duration: ${f(dur)}, ease: "${ease}" }, ${f(t)});\n`
  }
}


// Title and content change as separate steps. Options: holdFrom / holdTo = selectors (comma list of .classes) for the title
// parts of each scene; bodyFrom: false when the outgoing scene has nothing but title parts (a section card);
// noTitle: neither scene has a title block (title mode "none"): content out, content in.
// bgTo: the incoming scene's background colour (hex); the outgoing scene's background is tweened to it during the title step.
function titleSteps({ from, to, t, dur, ease, sameTitle, holdFrom, holdTo, bodyFrom, noTitle, bgTo, titleFirst }) {
  const sel = (id, list) => list.split(',').map(s => `#${id} ${s.trim()}`).join(', ')
  const notOf = list => list.split(',').map(s => `:not(${s.trim()})`).join('')
  const bodyA = `#${from} > ${notOf(holdFrom)}`, bodyB = `#${to} > ${notOf(holdTo)}`
  const hasTitle = !noTitle
  const swap = hasTitle && !sameTitle                 // does a title change happen at all?
  const cT = swap ? dur * 0.3 : dur * 0.5, tT = dur * 0.2
  // schedule: [content out, title out, title in, content in]
  const cOut = titleFirst && swap ? t + 2 * tT : t
  const tOut = titleFirst ? t : t + cT
  const cIn = titleFirst && swap ? cOut + cT : t + cT + (swap ? 2 * tT : 0)
  const endAt = t + dur
  const mv = (target, fromV, toV, d, at) => `tl.fromTo(${JSON.stringify(target)}, { x: ${fromV} }, { x: ${toV}, duration: ${f(d)}, ease: "${ease}", immediateRender: false }, ${f(at)});\n`
  let js = `tl.set(${q(to)}, { backgroundColor: "${TRANSPARENT}" }, 0);\n`   // A's background shows until the move is over
  if (bodyFrom) js += mv(bodyA, 0, -1920, cT, cOut)
  // the incoming body waits off-screen from time 0 (render-time start state)
  js += `tl.set(${JSON.stringify(bodyB)}, { x: 1920 }, 0);\n`
  if (hasTitle && !sameTitle) {
    js += `tl.set(${JSON.stringify(sel(to, holdTo))}, { x: 1920 }, 0);\n`
    js += mv(sel(from, holdFrom), 0, -1920, tT, tOut)
    js += mv(sel(to, holdTo), 1920, 0, tT, tOut + tT)
  } else if (hasTitle) {
    js += `tl.set(${JSON.stringify(sel(to, holdTo))}, { opacity: 0 }, 0);\n`          // A's title keeps standing; B's is hidden...
    js += `tl.set(${JSON.stringify(sel(to, holdTo))}, { opacity: 1 }, ${f(endAt - 0.02)});\n`   // ...and takes over in the last frames
  }
  if (bgTo) js += `tl.to(${q(from)}, { backgroundColor: "${bgTo}", duration: ${f(swap ? 2 * tT : cT)}, ease: "${ease}" }, ${f(swap ? tOut : cOut)});\n`
  js += mv(bodyB, 1920, 0, cT, cIn)
  js += `tl.set(${q(to)}, { backgroundColor: "${bgTo ?? 'rgb(253,253,251)'}" }, ${f(endAt - 0.02)});\n`
  return js
}

function slideFade({ from, to, t, dur, dist, axis, ease }) {
  const a = dur * 2 / 3, b0 = dur / 3
  const sgn = axis === 'y' ? { A: { y: -dist }, B: { y: dist }, Z: { y: 0 } } : { A: { x: -dist }, B: { x: dist }, Z: { x: 0 } }
  const k = o => Object.entries(o).map(([p, v]) => `${p}: ${v}`).join(', ')
  return `tl.set(${q(from)}, { backgroundColor: "${TRANSPARENT}" }, 0);\ntl.set(${q(to)}, { backgroundColor: "${TRANSPARENT}" }, 0);\n` +
    `tl.fromTo(${q(from)}, { ${k(sgn.Z)}, opacity: 1 }, { ${k(sgn.A)}, opacity: 0, duration: ${f(a)}, ease: "${ease}" }, ${f(t)});\n` +
    `tl.fromTo(${q(to)}, { ${k(sgn.B)}, opacity: 0 }, { ${k(sgn.Z)}, opacity: 1, duration: ${f(a)}, ease: "${ease}" }, ${f(t + b0)});\n`
}

export const transitionNames = Object.keys(TRANSITIONS)

// name: key of TRANSITIONS. opts: { from, to, t, ...overrides of the style's defaults }.
// Returns { js, dur, end, label }. `end` is when the outgoing scene may be hidden.
export function transition(name, opts) {
  const T = TRANSITIONS[name]
  if (!T) throw new Error(`unknown transition "${name}" (use ${transitionNames.join(', ')})`)
  const o = { ...T.defaults, ...opts }
  if (!o.from || !o.to || o.t == null) throw new Error('transition needs from, to and t')
  return { js: T.js(o), dur: o.dur, end: f(o.t + o.dur), label: T.label }
}
