// Builds a gallery project: every motion template once, with sample content from one of Dominik's talks
// ("AI Agents for Research: Beyond the Chatbot"). No audio. Build times are even spacing: the gallery shows the
// templates, not a real talk. Use it to see what each layout looks like before choosing tags, and to test a font or look.
// usage: node scripts/build-gallery.mjs <project-dir>   (a scaffolded project has it as tools/build-gallery.mjs; scaffold a throwaway project for it)
// Writes index.html, scenes.json and assets/sample-*.svg into the project.
import { writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
const here = path.dirname(fileURLToPath(import.meta.url))
const kitDir = [path.join(here, '../kit'), path.join(here, '../assets/kit')].find(d => existsSync(path.join(d, 'templates/index.mjs')))
const { compose, unitsFor, cleanCaptions, suggestMotion, prepareScenes } = await import(pathToFileURL(path.join(kitDir, 'templates/index.mjs')).href)
const proj = path.resolve(process.argv[2] ?? '.')
const samples = path.join(kitDir, 'samples')
mkdirSync(path.join(proj, 'assets'), { recursive: true })
if (existsSync(samples)) cpSync(samples, path.join(proj, 'assets'), { recursive: true })

const A = 'What do you need to know about agents?'
const S = []   // { slide, motion?, extras?, hold?, say? }
const add = (slide, o = {}) => S.push({ slide, ...o })
const T = text => ({ text })
const kids = (head, ...c) => ({ text: head, children: c.map(T) })

add({ layout: 'section', title: A, accent: 'orange' })
add({ layout: 'statement', title: 'I have been using Codex every day', accent: 'green', images: [{ src: 'assets/sample-b.svg', alt: 'Sample image' }] })
add({ layout: 'quote', title: 'People are doing more things than ever', accent: 'orange', items: [T("I'm now more productive than ever. But I'm exhausted.")], source: 'Senior researcher' })
add({ layout: 'iconlist', title: 'Harness = Orchestration', accent: 'orange',
  items: [{ text: 'Software', icon: 'lucide:binary' }, { text: 'Runs on a computer', icon: 'lucide:computer' }, { text: 'Parses model output', icon: 'lucide:file-search' },
          { text: 'Triggers commands, sends back results', icon: 'lucide:terminal' }, { text: 'DOES NOT HAVE INTELLIGENCE', icon: 'lucide:bot-off', tone: 'warn' }] },
  { say: ['So the harness is software.  Uh, it runs on a, a computer.', 'It does not have intelligence.'] })
add({ layout: 'numbered', title: 'What to do', accent: 'green', items: ['Unzip sample folder on your computer', 'Open messy-research-archive in Codex', 'Ask Codex to analyse it'].map(T) })
add({ layout: 'iconrow', title: 'The model and the harness', accent: 'orange', colors: ['orange', 'blue'],
  items: [{ text: 'Harness', icon: 'lucide:folder-code', children: [{ text: 'sends prompts to model', icon: 'lucide:send' }, { text: 'receives messages from model', icon: 'lucide:message-square' }, { text: 'parses commands and sends to computer', icon: 'lucide:terminal' }, { text: 'sends command results to model', icon: 'lucide:repeat' }] },
          { text: 'Model', icon: 'lucide:brain-circuit', children: [{ text: 'interprets intent', icon: 'lucide:lightbulb' }, { text: 'makes plans and considers options', icon: 'lucide:workflow' }, { text: 'writes command for harness to run', icon: 'lucide:square-terminal' }, { text: 'interprets command results', icon: 'lucide:eye' }] }] })
// inserted interlude: the analogy he speaks after the two columns gets a scene of its own (review note 4)
add(null, { n: 4, hold: 17, make: ({ start }) => ({ layout: 'analogy', inserted: true, title: 'The model and the harness', accent: 'orange',
  nodes: [{ text: 'Your brain', icon: 'lucide:brain', t: start + 2.2, said: 'your brain' },
          { text: 'Your hands', icon: 'lucide:hand', t: start + 4.2, said: 'your hands', tag: 'harness', color: 'orange' },
          { text: 'Your computer', icon: 'lucide:computer', t: start + 6.2, said: 'your computer', tag: 'tool' },
          { text: 'Your eyes', icon: 'lucide:eye', t: start + 8.2, said: 'your eyes', tag: 'harness', color: 'orange' }],
  loop: { t: start + 10.6, said: 'and back to your brain' } }) })
add({ layout: 'equation=circle', title: 'Clarifying vocabulary', accent: 'orange', items: [{ text: 'Model', color: 'blue' }, { text: 'Harness', color: 'orange' }, { text: 'Loop', spin: true }, { text: 'Agent' }] })
add({ layout: 'cycle', title: 'The agentic loop', accent: 'orange', laps: true,
  items: [{ ...kids('Harness', 'Sends instructions / results to model'), icon: 'lucide:folder-code' }, { ...kids('Model', 'Makes a plan'), icon: 'lucide:brain-circuit' }, { ...kids('Model', 'Sends commands to harness'), icon: 'lucide:brain-circuit' }, { ...kids('Harness', 'Passes command to computer'), icon: 'lucide:folder-code' }, { ...kids('Computer', 'Executes command and returns to harness'), icon: 'lucide:computer' }] })
add({ layout: 'timeline', title: 'Week map', accent: 'green', items: [{ label: 'Day 1', text: 'AI the assistant' }, { label: 'Day 2', text: 'AI the tool maker' }, { label: 'Day 3', text: 'Agentic AI: AI the tool user' }] })
add({ layout: 'process', title: 'From messy folder to website', accent: 'green', items: [{ text: 'Folder with files', icon: 'lucide:folder-open' }, { text: 'Rename the files', icon: 'lucide:file-text' }, { text: 'Make a webpage', icon: 'lucide:code' }, { text: 'Upload it to the website', icon: 'lucide:globe' }] })
add({ layout: 'compare', title: 'ChatGPT v Codex key differences', accent: 'green',
  items: [{ text: 'ChatGPT', icon: 'lucide:message-square', children: [{ text: 'Web-based app', icon: 'lucide:globe' }, { text: 'Uses basic tools', icon: 'lucide:wrench' }, { text: 'Works on uploaded files', icon: 'lucide:file-plus' }] },
          { text: 'Codex', icon: 'lucide:square-terminal', children: [{ text: 'Desktop app', icon: 'lucide:computer' }, { text: 'Uses tools in local sandbox', icon: 'lucide:terminal' }, { text: 'Works on local files', icon: 'lucide:folder-open' }] }] })
add({ layout: 'contrast', title: 'Chatbot or agent?', accent: 'green', heads: ['Chatbot', 'Agent'],
  items: [{ text: 'Answers / Acts', icons: ['lucide:message-square', 'lucide:bot'] }, { text: 'Waits for you / Makes a plan', icons: ['lucide:user', 'lucide:workflow'] }, { text: 'One reply / Many steps', icons: ['lucide:send', 'lucide:repeat'] }] })
add({ layout: 'cards', title: 'Uses of AI in research', accent: 'green',
  items: [{ ...kids('Personal assistant', 'Search and note', 'Draft and summarise', 'Organise and help'), icon: 'lucide:user' }, { ...kids('Tool for research', 'Write software', 'Code text', 'Ideation and checking'), icon: 'lucide:wrench' }, { ...kids('Subject of research', 'How models work', 'Training / finetuning', 'Impact of use'), icon: 'lucide:brain' }] })
add({ layout: 'stats', title: 'Codex user growth', accent: 'blue', items: [{ value: '100,000', label: 'users in January' }, { value: '10,000,000', label: 'users in July' }].map(s => ({ ...s, value: Number(s.value.replace(/,/g, '')), suffix: '' })) })
add({ layout: 'linechart', title: 'Codex user growth', accent: 'blue', unit: 'M', items: [{ label: 'January', value: 0.1 }, { label: 'February', value: 1 }, { label: 'June', value: 5 }, { label: 'July', value: 10 }] })
add({ layout: 'code', variant: 'code', title: 'AGENTS.md as project rule', accent: 'green',
  code: { text: 'This project uses Python only. Never JavaScript.\nAlways save outputs in ./figures/.' }, focus: [[1, 1], [2, 2]] })
add({ layout: 'trace', title: 'Visualise data', accent: 'green',
  code: { text: ['user: USER', 'Make a chart of monthly visitors from data.csv', 'model: MODEL → HARNESS', '<tool_call name="read_file" args={"path": "data.csv"}/>', 'tool: HARNESS → MODEL',
    'month,visitors', '2026-01,1240', '2026-02,1387', '2026-03,1522', '2026-04,1498', 'model: MODEL → HARNESS', '<tool_call name="run_python" args={"file": "plot.py"}/>',
    'tool: HARNESS → MODEL', 'saved figures/visitors.png', 'model: MODEL → USER', 'Saved figures/visitors.png. It shows steady growth, with a dip in April.'].join('\n') } }, { gap: 1.7 })
add({ layout: 'chat', title: 'List a folder', accent: 'green',
  items: [{ role: 'user', who: 'You', text: 'How many PDFs are in my Downloads folder?' }, { role: 'tool', who: 'Used list_dir', text: 'list_dir("~/Downloads")' }, { role: 'result', text: '12 files | 3 PDFs' }, { role: 'assistant', who: 'Agent', text: 'There are 12 files in Downloads. Three are PDFs.' }] })
add({ layout: 'table', title: 'Trade-offs of local work', accent: 'orange', head: ['Aspect', 'Advantage', 'Trade-off'],
  items: [kids('Retrieval', 'Outputs are easier to find later', 'You need to save and name things well'), kids('Scale', 'Easier to work across many local files', 'You must know what folder you share'), kids('Privacy', 'Some tasks stay mostly local', 'Some tasks still use remote models')] })
add({ layout: 'image-claim', title: 'Consequence of better models', accent: 'orange', images: [{ src: 'assets/sample-folder.svg', alt: 'Sample image' }], items: ['Simpler harness', 'Shorter system prompt', 'More tools'].map(T), hold: 16 })
// illustrated scenes (frame JSON in assets/frames/, see references/inputs.md) and a widget scene (stills of assets/sample-widget.html)
add({ layout: 'illustration', title: 'Searching starts with a person', frame: 'assets/frames/search-person.json' }, { hold: 11 })
add({ layout: 'illustration', title: 'The agent searches, then reads', frame: 'assets/frames/agent-tools.json' }, { hold: 12 })
add({ layout: 'illustration', title: 'Three assistants people already use', frame: 'assets/frames/logo-row.json' }, { hold: 11 })
add({ layout: 'widget', title: 'A widget as a scene', src: 'assets/sample-widget.html', steps: 2, items: ['second bar', 'third bar'].map(T) }, { hold: 11 })
add({ layout: 'image-grid', title: 'Before you start', accent: 'green', images: [{ src: 'assets/sample-a.svg', alt: 'Sample A' }, { src: 'assets/sample-b.svg', alt: 'Sample B' }, { src: 'assets/sample-c.svg', alt: 'Sample C' }], items: ['Set model and reasoning', 'Open the folder', 'Ask for a video'].map(T) }, { hold: 21, gap: 4.4 })

// ---- timing: 1.4 s settle after the cut, then 1.3 s per unit, 2.5 s to read at the end
let clock = 0
const scenes = S.map((s, i) => {
  const n = s.n ?? unitsFor(s.slide, { projDir: proj }).length
  const dur = s.hold ?? Math.max(5.5, 1.6 + n * (s.gap ?? 1.3) + 2.5)
  const start = +clock.toFixed(2), end = +(clock + dur).toFixed(2)
  clock = end
  const builds = Array.from({ length: n }, (_, k) => +(start + 1.9 + k * (s.gap ?? 1.3)).toFixed(2))
  let slide = s.make ? s.make({ start, end }) : s.slide
  if (slide.laps) slide = { ...slide, laps: { t: builds[n - 1] + 1.2, count: 1 } }
  return { slide, start, end, builds, motion: s.motion, say: s.say, hold: s.hold }
})

// ---- captions: clean, with fillers and a stutter on purpose, to show what cleanCaptions removes
const captions = []
scenes.forEach(sc => {
  if (!sc.say) return
  let t = sc.start + 2
  const words = sc.say.join('  ').split(/\s+/).filter(Boolean).map(w => { const o = { w, s: t, e: t + 0.28 }; t += 0.32; return o })
  captions.push(...cleanCaptions(words, { fixes: [] }))
})

await prepareScenes(scenes, { projDir: proj })   // widget stills (needs chrome-headless-shell; CHROME_HEADLESS_SHELL)
const { html, warnings, moves } = compose({ duration: clock, scenes, captions, projDir: proj })
const settleOf = Object.fromEntries(moves.map(m => [m.id, m.settle]))
// scenes.json: layout and the time each scene has settled (all builds done), for snapshots and stills
writeFileSync(path.join(proj, 'scenes.json'), JSON.stringify(scenes.map((sc, i) => ({ id: 's' + (i + 1), layout: sc.slide.layout, start: sc.start, end: sc.end, settle: settleOf['s' + (i + 1)] ?? sc.start, settled: +Math.min(sc.end - 0.4, sc.hold ? sc.end - 0.8 : (sc.builds[sc.builds.length - 1] ?? sc.start + 1.5) + 2.6).toFixed(2) })), null, 1))
writeFileSync(path.join(proj, 'index.html'), html)
for (const w of warnings) process.stderr.write(`warn ${w}\n`)
process.stderr.write(`scenes ${scenes.length}, duration ${clock.toFixed(1)} s\n`)
