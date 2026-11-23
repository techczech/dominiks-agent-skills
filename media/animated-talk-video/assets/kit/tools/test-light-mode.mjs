#!/usr/bin/env node
// Checks the light-mode logo recolouring (N89): only a mark that paints nothing but white becomes ink.
// usage: node kit/tools/test-light-mode.mjs [iconSetsDir]   (the icon sets add the real Notion mark; without them the synthetic cases run)
import { lightModeFix, resolveIcon } from '../templates/_icons.mjs'
const INK = '#101418'
const cases = [
  ['white body + closed path with stroke="black", no fill (fills black: two-colour)', '<rect width="24" height="24" fill="#fff"/><path d="M4 4h16v16H4z" stroke="black"/>', 'keep'],
  ['<g fill="white"> + an unfilled sibling path (black: two-colour)', '<g fill="white"><rect width="24" height="24"/></g><path d="M6 6h12v12H6z"/>', 'keep'],
  ['white <use> of an unfilled path in <defs> (the visible instance is white)', '<defs><path id="p" d="M2 2h20v20H2z"/></defs><use href="#p" fill="white"/>', 'ink'],
  ['white fill + a stroke-only white path (the stroke must turn ink too)', '<rect width="24" height="24" fill="#fff"/><path d="M4 12h16" fill="none" stroke="#fff"/>', 'ink'],
  ['Notion-like: white page, unfilled black outline and N', '<path d="M2 2h20v20H2z" fill="#fff"/><path d="M2 2h20v20H2zM8 6v12M8 6l8 12M16 6v12" fill-rule="evenodd"/>', 'keep'],
  ['all-white one-colour mark', '<path d="M2 2h20v20H2z" fill="#ffffff"/>', 'ink'],
  ['CSS-styled mark (cannot resolve: kept, with a warning)', '<style>.a{fill:#fff}</style><path class="a" d="M2 2h20v20H2z"/>', 'keep-warn']
]
let fail = 0
for (const [name, svg, want] of cases) {
  const warns = []
  const out = lightModeFix(svg, INK, 'test', m => warns.push(m))
  const changed = out !== svg, white = /(fill|stroke)="(#fff|#ffffff|white)"/i.test(out)
  const ok = want === 'ink' ? changed && !white : want === 'keep' ? !changed && !warns.length : !changed && warns.length === 1
  if (!ok) fail++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${warns.length ? ' [' + warns[0] + ']' : ''}`)
}
const dir = process.argv[2] ?? process.env.TALKWEAVER_ICONS
if (dir) {
  const r = resolveIcon('svgl:notion', { dir, ink: INK, warn: m => console.log('  warn ' + m) })
  const ok = r && /fill="#fff"|fill="white"|fill="#ffffff"/i.test(r.inner)
  if (!ok) fail++
  console.log(`${ok ? 'ok  ' : 'FAIL'} real Notion mark from the icon sets keeps its white page`)
}
console.log(fail ? `${fail} failed` : 'all passed')
process.exit(fail ? 1 : 0)
