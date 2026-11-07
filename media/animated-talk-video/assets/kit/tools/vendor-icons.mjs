// Copies lucide icons (ISC licence) into kit/icons/ as plain SVG, from a pinned CDN copy.
// Run once per icon set you need; commit the result. Rendering never touches the network for icons.
// usage: node kit/tools/vendor-icons.mjs brain-circuit folder-code computer ...
// The pin is the lucide-static version the kit's icons came from: 1.21.0. Outline icon names
// look like "lucide:brain-circuit"; pass the part after the colon.
import { writeFileSync, mkdirSync } from 'node:fs'
const PIN = '1.21.0'
const out = new URL('../icons/', import.meta.url)
mkdirSync(out, { recursive: true })
for (const name of process.argv.slice(2)) {
  const r = await fetch(`https://cdn.jsdelivr.net/npm/lucide-static@${PIN}/icons/${name}.svg`)
  if (!r.ok) { console.error(`missing: ${name} (${r.status})`); continue }
  const svg = (await r.text()).replace(/<!--[\s\S]*?-->\s*/g, '').trim()
  writeFileSync(new URL(`${name}.svg`, out), svg + '\n')
  console.log('ok', name)
}
