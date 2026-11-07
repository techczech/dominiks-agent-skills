// node tools/test-captions.mjs : cleanCaptions must keep ordinary words (regression: \p{L} without the u flag dropped every word), drop fillers and stutters,
// and alignWords must give script words their transcript times.
import assert from 'node:assert/strict'
import { cleanCaptions } from '../templates/index.mjs'
import { alignWords } from './align-words.mjs'
const sample = 'Um so the agent, uh, calls tools and and the model plans. Naïve café users don\'t mind.'.split(' ').map((w, i) => ({ w, s: i * 0.3, e: i * 0.3 + 0.25 }))
const text = cleanCaptions(sample).map(c => c[2]).join(' ')
for (const w of ['agent,', 'calls', 'tools', 'model', 'plans.', 'Naïve', 'café', "don't"]) assert.ok(text.includes(w), `caption lost "${w}": ${text}`)
assert.ok(!/\bUm\b|\buh,/.test(text), 'filler survived: ' + text)
assert.ok(!/\band and\b/.test(text), 'stutter survived: ' + text)
const sc = alignWords(['Hello, world.'], [{ w: ' Hel', s: 0, e: 0.2 }, { w: 'lo', s: 0.2, e: 0.4 }, { w: ' world', s: 0.5, e: 0.9 }])
assert.deepEqual(sc[0].map(w => [w.w, w.s, w.e]), [['Hello,', 0, 0.4], ['world.', 0.5, 0.9]])
assert.throws(() => alignWords(['Hello there'], [{ w: 'hello', s: 0, e: 1 }, { w: 'where', s: 1, e: 2 }]), /does not match/)
console.log('ok: captions kept', JSON.stringify(text))
