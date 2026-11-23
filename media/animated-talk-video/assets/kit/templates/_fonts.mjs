// House typography (D18). Look tokens: `type` names a preset; `fonts: { display, text, mono }` overrides single families.
//   look.json: { "type": "fraunces-alegreya" | "geist" | "inter" }      (default "geist": Dominik, 13 Nov, "sans serif for videos")
//              { "fonts": { "display": "Fraunces", "text": "Alegreya Sans" } }   (family names; bundled ones load from kit/fonts/)
// A family without bundled files is used by name (system font; the renderer ignores system fonts, so ship the files yourself with
// `fontFaces: [{ family, weight, src }]`, the older `fonts: [...]` array form still works). Every stack ends in a generic family.
// display = big type (step cards, title page, section cards, textblock lines of 64 px or more, stat values); text = everything else.
export const FONT_DIR = 'kit/fonts/'                // relative to the composition (index.html in the project root)
// single quotes inside stacks: they are written into SVG attributes (font-family="...") as well as CSS
const SANS = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif", SERIF = "Georgia, 'Times New Roman', serif"
export const MONO_DEFAULT = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace"

// family -> bundled files (weights actually shipped) and the generic fallback
export const FACES = {
  Fraunces: { generic: SERIF, files: [[400, 'fraunces-latin-400-normal.woff2'], [600, 'fraunces-latin-600-normal.woff2']] },
  'Alegreya Sans': { generic: SANS, files: [[400, 'alegreya-sans-latin-400-normal.woff2'], [500, 'alegreya-sans-latin-500-normal.woff2'], [700, 'alegreya-sans-latin-700-normal.woff2']] },
  Geist: { generic: SANS, files: [['100 900', 'geist-latin-wght-normal.woff2']] },
  Inter: { generic: SANS, files: [[400, 'inter-latin-400-normal.woff2'], [600, 'inter-latin-600-normal.woff2'], [700, 'inter-latin-700-normal.woff2']] }
}
// preset -> families, display weight, display tracking (em)
export const PRESETS = {
  'fraunces-alegreya': { display: 'Fraunces', text: 'Alegreya Sans', dw: 600, track: -0.01 },
  geist: { display: 'Geist', text: 'Geist', dw: 600, track: -0.025 },
  inter: { display: 'Inter', text: 'Inter', dw: 600, track: -0.02 }
}
export const DEFAULT_TYPE = 'geist'

const q = n => (/^[A-Za-z][A-Za-z0-9-]*$/.test(n) ? n : `'${n}'`)
export const stackOf = family => (family ? `${q(family)}, ${FACES[family]?.generic ?? SANS}` : SANS)

// -> { type, display, text, mono (stacks), families (names), dw, track }
export function resolveFonts(look = {}) {
  const type = PRESETS[look.type] ? look.type : DEFAULT_TYPE
  const P = PRESETS[type], tok = look.fonts && !Array.isArray(look.fonts) ? look.fonts : {}
  const display = tok.display ?? P.display, text = tok.text ?? P.text
  // `sans` (older look.json key) still wins for the text stack when given
  return {
    type, dw: P.dw, track: P.track, families: [...new Set([display, text])],
    display: stackOf(display), text: look.sans && !tok.text ? look.sans : stackOf(text),
    mono: tok.mono ? `${q(tok.mono)}, ${MONO_DEFAULT}` : (look.mono ?? MONO_DEFAULT)
  }
}

// @font-face rules for the bundled families in use (+ the project's own `fontFaces` and the older `fonts: [...]` array)
export function fontFaceCss(look = {}, base = FONT_DIR) {
  const R = resolveFonts(look), out = []
  for (const fam of R.families) for (const [w, file] of FACES[fam]?.files ?? []) out.push(`@font-face { font-family: ${q(fam)}; font-weight: ${w}; font-style: normal; font-display: block; src: url("${base}${file}") format("woff2"); }`)
  const own = [...(Array.isArray(look.fonts) ? look.fonts : []), ...(look.fontFaces ?? [])]
  for (const x of own) out.push(`@font-face { font-family: "${x.family}"; font-weight: ${x.weight}; src: url("${x.src}") format("${/\.woff2$/.test(x.src) ? 'woff2' : 'truetype'}"); }`)
  return out.join('\n')
}
