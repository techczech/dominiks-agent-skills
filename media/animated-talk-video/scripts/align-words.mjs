#!/usr/bin/env node
// Word times for TTS narration whose text you already know. Transcribe the generated audio (Parakeet gives sub-word tokens, Whisper whole words),
// then align the SCRIPT's letters to the transcript's letters: the display words keep the script's spelling and punctuation, the times come from the audio.
// usage: node align-words.mjs --script script.json --transcript tr.json [--key track.wav] [--offset 0] --out words.json
//   script.json      [ "paragraph for scene 1", ... ]  or  [ { "cap": "..." }, ... ]  (also "text"); one entry per scene, in the order spoken in the audio
//   tr.json          one of: { "<file>": { words:[{w,s,e}] } } (scripts/transcribe*.py with several files; --key picks the file, default the only one),
//                    { words:[{w,s,e}] }, or a flat [{w,s,e}] list. Sub-word tokens are fine: only the letters a-z, 0-9 and ' are compared.
//   words.json       { scenes: [[{w,s,e}, ...], ...], words: [flat list] } : feed `words` to plan-from-timings.mjs / cleanCaptions, `scenes` to your per-scene cues.
// Numbers and abbreviations: if the TTS said "twenty" where the script has "20", the letters differ and this stops with the first divergence. Write the script
// as it is spoken (or keep a display text and a spoken text per scene, and pass the SPOKEN text here), then it aligns.
// Also exports alignWords(scriptTexts, tokens) for use from a build script.
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '')

export function alignWords(texts, tokens) {
  const stream = []   // one entry per transcript letter: [token time, letter]
  for (const t of tokens) for (const ch of norm(t.w)) stream.push({ s: t.s, e: t.e, ch })
  const scenes = []; let ptr = 0
  texts.forEach((text, si) => {
    const out = []
    for (const raw of text.split(/\s+/)) {
      const letters = norm(raw); if (!letters) continue
      for (let k = 0; k < letters.length; k++) {
        const got = stream[ptr + k]
        if (!got || got.ch !== letters[k]) {
          const heard = stream.slice(Math.max(0, ptr - 12), ptr + 24).map(x => x.ch).join('')
          throw new Error(`scene ${si + 1}: script word "${raw}" does not match the transcript at letter ${ptr + k} (transcript there: "...${heard}..."). Regenerate the take, or fix the spoken text.`)
        }
      }
      out.push({ w: raw, s: stream[ptr].s, e: stream[ptr + letters.length - 1].e }); ptr += letters.length
    }
    scenes.push(out)
  })
  if (ptr !== stream.length) throw new Error(`the script has ${ptr} letters, the transcript ${stream.length}: the audio has extra or missing speech`)
  return scenes
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), opt = (n, d = null) => { const i = a.indexOf(n); return i < 0 ? d : a[i + 1] }
  const [sf, tf, out] = [opt('--script'), opt('--transcript'), opt('--out')]
  if (!sf || !tf || !out) { console.error('usage: node align-words.mjs --script script.json --transcript tr.json [--key file] [--offset s] --out words.json'); process.exit(1) }
  const script = JSON.parse(readFileSync(sf, 'utf8')).map(x => typeof x === 'string' ? x : x.cap ?? x.text)
  let tr = JSON.parse(readFileSync(tf, 'utf8'))
  if (!Array.isArray(tr) && !tr.words) { const keys = Object.keys(tr), k = opt('--key') ?? (keys.length === 1 ? keys[0] : null); if (!k || !tr[k]) { console.error('several files in the transcript; pass --key one of: ' + keys.join(', ')); process.exit(1) } tr = tr[k] }
  const off = parseFloat(opt('--offset', '0'))
  const tokens = (Array.isArray(tr) ? tr : tr.words).map(t => ({ w: t.w ?? t.word ?? t.text, s: t.s ?? t.start, e: t.e ?? t.end }))
  const scenes = alignWords(script, tokens).map(sc => sc.map(w => ({ w: w.w, s: +(w.s + off).toFixed(3), e: +(w.e + off).toFixed(3) })))
  writeFileSync(out, JSON.stringify({ scenes, words: scenes.flat() }, null, 1))
  console.log(`aligned ${scenes.flat().length} words in ${scenes.length} scenes -> ${out}`)
}
