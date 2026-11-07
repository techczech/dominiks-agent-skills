#!/usr/bin/env node
// Node >=22. No runtime dependencies or browser fetches. Content belongs in companion.json.
// Rebuild: node tools/companion.mjs [project-dir] [--out companion]
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
let project = '.', outName = 'companion';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') outName = args[++i];
  else if (args[i].startsWith('--')) throw new Error(`Unknown argument: ${args[i]}`);
  else project = args[i];
}
const root = path.resolve(project), out = path.resolve(root, outName);
if (out === root || !out.startsWith(root + path.sep)) throw new Error('Output must be a subfolder of the project');
const read = p => readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));
const config = json(path.join(root, 'companion.json'));
globalThis.__companionKeep = config.keepChapterScreens || []
const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const js = v => JSON.stringify(v).replace(/</g, '\\u003c');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const warnings = [];
const warn = m => { warnings.push(m); console.error(`companion: ${m}`); };
const urlPath = p => p.split(path.sep).map(encodeURIComponent).join('/');
const save = (p, text) => { mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, text); };
const copy = (src, dst) => { mkdirSync(path.dirname(dst), { recursive: true }); copyFileSync(src, dst); };
const local = (base, rel) => {
  const dest = path.resolve(base, rel);
  if (dest !== base && !dest.startsWith(base + path.sep)) throw new Error(`Path escapes its source folder: ${rel}`);
  return dest;
};

function parseOutline(text) {
  const meta = {};
  text = text.replace(/^---\r?\n([\s\S]*?)\r?\n---\s*/, (_, fm) => {
    for (const line of fm.split(/\r?\n/)) {
      const m = line.match(/^([\w-]+):\s*(.*)$/);
      if (m) meta[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
    }
    return '';
  });
  const chapters = [], screens = [];
  let chapter, screen;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^(#{2,3})\s+(.+)$/);
    if (h) {
      const title = h[2].replace(/\s*\{[^}]+\}/g, '').trim();
      const tags = [...h[2].matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
      const attrs = Object.fromEntries(tags.join(' ').matchAll(/([\w-]+)=("[^"]*"|'[^']*'|[^\s}]+)/g).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]));
      if (h[1] === '##') {
        chapter = { title, id: `chapter-${slug(attrs.id || title)}`, screens: [] };
        chapters.push(chapter);
      }
      screen = null;
      const kind = tags.some(t => /^illustration\b/.test(t)) ? 'illustration' : tags.some(t => /^widget\b/.test(t)) ? 'widget' : null;
      if (kind) {
        if (!chapter) throw new Error(`Screen without chapter: ${title}`);
        screen = { ...attrs, id: attrs.id || slug(title), title, kind, narration: [], level: h[1].length };
        screens.push(screen); chapter.screens.push(screen);
      } else if (h[1] === '###') throw new Error(`Screen has no supported illustration/widget tag: ${title}`);
    } else if (screen && /^>\s?/.test(line)) screen.narration.push(line.replace(/^>\s?/, '').trim());
  }
  // Section cards (## scenes) mark progress in the video; on the page the h2 already does that job (N55, N63).
  // Keep a ## scene only when it is listed in companion.json "keepChapterScreens" (e.g. an opening screen).
  const keep = new Set(globalThis.__companionKeep || [])
  for (const ch of chapters) ch.screens = ch.screens.filter(sc => sc.level !== 2 || keep.has(sc.id))
  screens.splice(0, screens.length, ...chapters.flatMap(ch => ch.screens))
  if (!screens.length || new Set(screens.map(s => s.id)).size !== screens.length) throw new Error('No screens, or duplicate screen ids');
  return { meta, chapters, screens };
}

function parseBeats(text) {
  const beats = {};
  let beat;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^##\s+\S+\s+([\w-]+)/);
    if (h) { beat = {}; beats[h[1]] = beat; }
    if (!beat) continue;
    if (/^Visual:\s*/.test(line)) beat.visual = line.replace(/^Visual:\s*/, '');
    const pages = line.match(/^Narration:.*\[([^\]]+)\]\s*$/);
    if (pages) beat.pages = pages[1];
  }
  return beats;
}

const { meta, chapters, screens } = parseOutline(read(path.join(root, config.inputs?.outline || 'outline.md')));
const beatsPath = path.join(root, config.inputs?.beats || 'beats-v2.md');
const beats = existsSync(beatsPath) ? parseBeats(read(beatsPath)) : {};
const kit = p => import(pathToFileURL(path.join(root, 'kit/templates', p)).href);
const { loadFrame } = await kit('illustration.mjs');
const { frameToSvg, zoomTransform } = await kit('_frame.mjs');
const { defaultLook } = await kit('index.mjs');
const customLook = existsSync(path.join(root, 'look.json')) ? json(path.join(root, 'look.json')) : {};
const look = { ...defaultLook, ...customLook, accents: { ...defaultLook.accents, ...customLook.accents } };
const font = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const mime = f => ({ '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' })[path.extname(f).toLowerCase()];
function embedImages(svg) {
  return svg.replace(/(<image\b[^>]*?\bhref=")([^"]+)(")/g, (_, a, src, z) => {
    if (src.startsWith('data:')) return a + src + z;
    if (/^[a-z]+:/i.test(src)) throw new Error(`Frame image requires network: ${src}`);
    const p = local(root, src.replace(/&amp;/g, '&'));
    if (!existsSync(p) || !mime(p)) throw new Error(`Missing or unsupported image: ${p}`);
    return `${a}data:${mime(p)};base64,${readFileSync(p).toString('base64')}${z}`;
  });
}

// Draw once through the kit, then settle the kit's build groups. Never fork its drawing vocabulary.
function frameStates(frame, id, screenConfig, beat) {
  const r = frameToSvg(frame, { look, iconSets: process.env.ANIMATED_TALK_ICON_SETS || customLook.iconSets,
    warn: m => { if (!m.includes('no key phrase')) warn(m); } });
  const rendered = embedImages(r.svg).replace('<svg ', `<svg font-family="${esc(font)}" `);
  const states = [], opacity = new Map(r.builds.flatMap(b => b.items.map(i => [i.id, 0])));
  const transforms = new Map(), arrived = [...(frame.elements || [])];
  for (let k = 0; k <= r.builds.length; k++) {
    if (k) {
      const b = r.builds[k - 1];
      b.items.forEach(i => opacity.set(i.id, 1));
      Object.entries(b.dim).forEach(([i, v]) => opacity.set(i, v));
      b.hide.forEach(i => opacity.set(i, 0));
      arrived.push(...(frame.builds[k - 1].elements || []));
      const zoom = frame.builds[k - 1].zoom;
      if (zoom) {
        if (zoom.reset) transforms.delete(zoom.id);
        else {
          const z = zoomTransform(zoom);
          transforms.set(zoom.id, `translate(${z.x} ${z.y}) scale(${z.scale})`);
        }
      }
    }
    const labels = [];
    function collect(elements, inherited = 1) {
      for (const e of elements) {
        const op = opacity.has(e.id) ? opacity.get(e.id) : inherited;
        if (op === 0 || inherited === 0) continue;
        for (const key of ['text', 'label', 'title', 'rows']) if (e[key]) labels.push([].concat(e[key]).join(' '));
        if (e.elements) collect(e.elements, op);
      }
    }
    collect(arrived);
    const cue = k ? r.builds[k - 1].cue : '';
    const alt = screenConfig.altStates?.[k] || [screenConfig.altText || beat.visual || frame.motion || screenConfig.heading,
      `State ${k + 1} of ${r.builds.length + 1}.`, cue ? `At “${cue}”.` : '',
      labels.length ? `Visible labels: ${[...new Set(labels)].join('; ')}.` : '',
      k && r.builds[k - 1].hide.length ? `Removed: ${r.builds[k - 1].hide.join(', ')}.` : '',
      k && Object.keys(r.builds[k - 1].dim).length ? `De-emphasised: ${Object.keys(r.builds[k - 1].dim).join(', ')}.` : ''].filter(Boolean).join(' ');
    let svg = rendered.replace(/<g id="([^"]+)"/g, (m, group) => m + (opacity.has(group) ? ` opacity="${opacity.get(group)}"` : '') + (transforms.has(group) ? ` transform="${transforms.get(group)}"` : ''));
    svg = svg.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(screenConfig.heading)}</title><desc>${esc(alt)}</desc>`);
    const src = `figures/${id}-${k}.svg`;
    save(local(out, src), svg);
    states.push({ src, alt, cue, labels: labels.length });
  }
  return states;
}

// Copy linked study material and its local dependency graph, preserving relative paths.
// The same source can occur in both the video and talk widget sets: keep them in separate trees.
const copied = new Set();
function copyTreeFile(source, sourceBase, destBase) {
  const rel = path.relative(sourceBase, source);
  const dest = local(destBase, rel);
  const key = `${source}:${dest}`;
  if (copied.has(key)) return;
  copied.add(key);
  if (!existsSync(source)) throw new Error(`Missing linked study asset: ${source}`);
  copy(source, dest);
  if (!/\.(html?|css|svg)$/i.test(source)) return;
  const text = read(source);
  const refs = [...text.matchAll(/(?:\b(?:href|src|poster)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^)'"\s]+))/gi)].map(m => m[1] || m[2]);
  for (let ref of refs) {
    ref = ref.replace(/&amp;/g, '&');
    if (/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(ref)) continue;
    const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
    if (!clean) continue;
    const linked = path.resolve(path.dirname(source), clean);
    local(sourceBase, path.relative(sourceBase, linked));
    copyTreeFile(linked, sourceBase, destBase);
  }
}

mkdirSync(out, { recursive: true });
const sceneSources = ['plan.json', 'scenes.json'].filter(f => existsSync(path.join(root, f))).map(f => {
  const value = json(path.join(root, f));
  return { file: f, scenes: Array.isArray(value) ? value : value.scenes || [], estimated: value.wordsEstimated === true };
});
// The video may hold scenes the page leaves out (section cards), so match by id: every page screen must have a timed scene, in order.
const matching = sceneSources.find(s => {
  const at = new Map(s.scenes.filter(sc => Number.isFinite(sc.start)).map(sc => [sc.slideId || sc.id, sc.start]));
  const times = screens.map(sc => at.get(sc.id));
  return times.every(Number.isFinite) && times.every((t, i) => i === 0 || t >= times[i - 1]);
});
const timing = matching ? new Map(matching.scenes.map(sc => [sc.slideId || sc.id, sc.start])) : new Map();
if (!matching) warn('Timing manifests do not match the current outline. Video and seeking remain in production; no times are guessed.');
const chapterFile = path.join(root, config.inputs?.chapters || 'chapters.txt');
const chapterHints = new Map();
if (existsSync(chapterFile)) {
  for (const line of read(chapterFile).split(/\r?\n/)) {
    const m = line.match(/^(\d+:\d{2}(?::\d{2})?)\s+(.+)$/);
    if (m) chapterHints.set(m[2].trim(), m[1].split(':').reduce((total, part) => total * 60 + Number(part), 0));
  }
}
// A chapter list is usable only as a whole: never borrow an old chapter's time by position.
const matchingChapterList = chapters.every(ch => chapterHints.has(ch.title));
// Chapter starts: the built chapters.txt (it times the section card itself) when it matches as a whole, else the first screen.
for (const ch of chapters) ch.start = (matching && matchingChapterList ? chapterHints.get(ch.title) : undefined) ?? timing.get(ch.screens[0]?.id);
const videoPath = local(root, config.video.file);
const videoIsCurrent = existsSync(videoPath) && matching && statSync(videoPath).mtimeMs >= Math.max(statSync(path.join(root, config.inputs?.outline || 'outline.md')).mtimeMs, statSync(path.join(root, matching.file)).mtimeMs);
const hasVideo = !!(videoIsCurrent && !matching.estimated);
if (existsSync(videoPath) && !hasVideo) warn('Existing video is withheld because its timing manifest is stale or estimated.');
if (hasVideo) copy(videoPath, local(out, `media/${path.basename(config.video.file)}`));
const captionsPath = local(root, config.video.captions || 'captions.vtt');
if (hasVideo && existsSync(captionsPath)) copy(captionsPath, local(out, 'media/captions.vtt'));
else if (hasVideo) warn('The current video has no captions file.');

for (const s of screens) {
  const sc = config.screens[s.id] || { heading: s.title };
  const beat = beats[sc.sourceBeat || s.id] || {};
  s.heading = sc.heading || s.title;
  s.pages = sc.pages || beat.pages;
  s.start = timing.get(s.id);
  if (s.kind === 'illustration') {
    s.states = frameStates(loadFrame(s, root), s.id, { ...sc, heading: s.heading }, beat);
  } else {
    const [srcPath, query = ''] = s.src.split('?');
    const params = new URLSearchParams(query);
    params.delete('video'); params.delete('embed');
    params.set('step', s.stepmap?.split(',')[0] || '0'); params.set('notes', '1');
    const sourceBase = path.join(root, 'widgets');
    const source = local(root, srcPath);
    copyTreeFile(source, sourceBase, path.join(out, 'widgets'));
    s.widget = `widgets/${urlPath(path.relative(sourceBase, source))}?${params}`;
  }
}
const first = screens[0];
if (!first.states) throw new Error('The opening screen must be illustrated to supply a poster');
copy(local(out, first.states.at(-1).src), local(out, 'media/poster.svg'));

for (const link of config.furtherStudy) {
  const sourceBase = path.resolve(root, link.base || '.');
  const destBase = local(out, link.destination || 'study');
  copyTreeFile(local(sourceBase, link.file), sourceBase, destBase);
  link.href = urlPath(path.join(link.destination || 'study', link.file));
}

// ---- Page data: everything the app shows is computed here and embedded as JSON (no run-time fetches, so file:// works). ----
const ACCENTS = ['green', 'blue', 'orange', 'violet'];
chapters.forEach((ch, i) => { ch.accent = ACCENTS[i % ACCENTS.length]; ch.screens.forEach(s => { s.chapter = i; }); });

// Generic interface wording. companion.json "copy" overrides any key; Feng-specific text never lives here.
const c = {
  step: 'Step', first: 'First step', previous: 'Previous step', next: 'Next', play: 'Play automatically', pause: 'Pause',
  last: 'Last step', reset: 'Reset', jump: 'Jump to a screen', miniMap: 'All screens', openFullScreen: 'Open full screen',
  figure: 'Figure', menu: 'Menu', theme: 'Switch between light and dark', themeLight: 'Switch to light theme', themeDark: 'Switch to dark theme',
  chapterTimeline: 'Chapter timeline', chapterList: 'Chapters', transcriptEmpty: 'No lines match your search.', clearSearch: 'Clear search',
  descVideo: '{duration} · {chapters} chapters, with a searchable transcript', descWalkthrough: '{screens} screens, {steps} steps, one idea at a time',
  descFigures: '{n} interactive figures to explore at your own pace', descTerms: '{n} terms and how they connect', descGuides: '{n} guides to read alongside',
  descAbout: 'Source, shortcuts and how this page is made', cardVideo: 'Video', cardWalkthrough: 'Walkthrough', cardFigures: 'Figures', cardTerms: 'Key terms', cardGuides: 'Guides', cardAbout: 'About',
  progressWatched: 'Watched the video', progressSteps: 'Stepped through at least half the screens', progressFigure: 'Opened a figure',
  progressTerm: 'Viewed a key term', progressGuide: 'Read a guide', progressDone: '{n} of {total} done', progressReset: 'Reset progress',
  timeIn: 'Jump to {time} in the video', startAt: 'From {time}', openNewTab: 'Open in a new tab', guideSections: 'Sections', guideRead: 'Read',
  guidesHeading: 'Guides', howToHeading: 'How to use this page', figuresHeading: 'Figures', termsHeading: 'Key terms', aboutHeading: 'About this companion', sourceHeading: 'Source',
  conceptViewed: 'Viewed', conceptNotViewed: 'Not viewed yet', relatedTerms: 'Related terms', pageRef: 'Page in the paper', selectTerm: 'Select a term to see its definition.',
  shortcutsHeading: 'Keyboard shortcuts', countsHeading: 'What is here', builtOn: 'Built on', voiceHeading: 'Synthetic voice', previousFigure: 'Previous', nextFigure: 'Next',
  keyLeftRight: 'Previous or next step in the walkthrough', keyHomeEnd: 'First or last step', keySpace: 'Start or pause automatic stepping', keyEnter: 'Press Enter on a highlighted line to play from there',
  statScreens: 'Screens', statSteps: 'Steps', statFigures: 'Figures', statTerms: 'Key terms', statGuides: 'Guides',
  videoWithheld: 'The video is not shown on this build.', transcriptLine: 'Play from here', allChapters: 'All chapters',
  navArgument: 'Argument', navReading: 'Reading', navResearch: 'Research', navMaking: 'Making',
  contents: 'Contents', part: 'Part', inShort: 'In short', exploreFigure: 'Explore', termsInStep: 'Terms in this step', termsInPart: 'Terms in this part',
  previousPart: 'Previous part', nextPart: 'Next part', viewPictures: 'View the pictures', pictureOf: 'Picture {n} of {m}', close: 'Close', picturesCount: '{n} pictures',
  readingRoutes: 'Reading routes', readCritically: 'Read critically', fullGuides: 'Full guides', openGuide: 'Open in a new tab', nOfMRead: '{n} of {m} read',
  makingHeading: 'How this was made', skillsHeading: 'Skills used', viewSkill: 'View the skill', publishingAfterReview: 'Publishing after review', madeWithAgent: 'Made with an agent',
  processHeading: 'How it came together', numbersHeading: 'In numbers', statVideo: 'Video length', statChapters: 'Chapters', statPictures: 'Pictures',
  descArgument: '{chapters} parts, {screens} steps, each with its pictures and page references', descReading: 'Two reading routes and what to read critically',
  descResearch: '{n} cards translating the paper towards your own research', descMaking: 'The agent, the skills and the steps behind this page',
  progressArgument: 'Read the argument ({n} of {total} parts)', showInArgument: 'Where the argument uses it', exploreInFigures: 'Open in the figures',
  keyArrows: 'Previous or next picture in the picture viewer', keyEsc: 'Close the picture viewer', keyTab: 'Move between controls', researchHeading: 'Your research', readingHeading: 'Reading',
  citationHeading: 'Source and credits', checklistLabel: 'Tick items off as you go; ticks stay in this browser.',
  ...config.copy
};

// Cues: absolute video time of each build, per screen. Only trusted when the timing manifest matches the outline.
const cuesFile = path.join(root, config.inputs?.cues || 'cues.json');
const cues = matching && existsSync(cuesFile) ? json(cuesFile) : {};

// Captions -> transcript lines. Caption cues are short fragments; join them into sentence-sized lines.
function parseVtt(text) {
  const stamp = s => { const p = s.replace(',', '.').split(':').map(Number); return p.reduce((t, x) => t * 60 + x, 0); };
  const raw = [];
  for (const block of text.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n'); const i = lines.findIndex(l => l.includes('-->'));
    if (i < 0) continue;
    const m = lines[i].match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/);
    const t = lines.slice(i + 1).join(' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (m && t) raw.push({ start: stamp(m[1]), end: stamp(m[2]), text: t });
  }
  const merged = []; let cur = null;
  for (const r of raw) {
    if (cur && (r.start - cur.end > 1.5 || cur.text.length > 90 && /[.?!]["”)]?$/.test(cur.text))) { merged.push(cur); cur = null; }
    if (!cur) cur = { ...r }; else { cur.text += ' ' + r.text; cur.end = r.end; }
    if (/[.?!]["”)]?$/.test(cur.text) && cur.text.length > 40 || cur.text.length > 170) { merged.push(cur); cur = null; }
  }
  if (cur) merged.push(cur);
  return merged.map(l => ({ start: +l.start.toFixed(2), end: +l.end.toFixed(2), text: l.text }));
}
const transcript = hasVideo && existsSync(captionsPath) ? parseVtt(read(captionsPath)) : [];

// Further study: guides are listed as plain cards (opened in a new tab), figures feed the Figures view.
const study = config.furtherStudy.map(l => ({ kind: l.kind || 'guide', title: l.title, summary: l.summary || '', href: l.href }));
const guides = study.filter(l => l.kind === 'guide');
const figures = study.filter(l => l.kind === 'figure');
const figureIndexFor = s => s.widget ? figures.findIndex(f => path.basename(decodeURIComponent(f.href)) === path.basename(decodeURIComponent(s.widget.split('?')[0]))) : -1;

// Key terms (optional).
const concepts = config.concepts || [];
const conceptGroups = config.conceptGroups || [];
for (const k of concepts) for (const r of k.related || []) if (!concepts.some(o => o.id === r)) warn(`Concept ${k.id} lists unknown related term ${r}`);
for (const k of concepts) if (!conceptGroups.some(g => g.id === k.group)) warn(`Concept ${k.id} has unknown group ${k.group}`);

// Video length: the timing manifest's last scene end (the rendered length); captions end before the closing frames.
const sceneEnd = Math.max(...(matching?.scenes || []).map(sc => sc.end).filter(Number.isFinite));
const lastEnd = Number.isFinite(sceneEnd) ? sceneEnd : transcript.at(-1)?.end ?? (Object.values(cues).flat().at(-1) + 4);
const duration = hasVideo && Number.isFinite(lastEnd) ? Math.round(lastEnd) : null;
const pageData = {
  id: slug(config.title || meta.title || 'companion'), title: config.title || meta.title, shortTitle: config.shortTitle || config.title, citation: config.citation, doi: config.doi,
  date: config.date, built: new Date().toISOString().slice(0, 10), syntheticVoice: config.syntheticVoice, footer: (config.footer || []).map(line => line.replace('{date}', config.date)),
  copy: c, hasVideo, duration, videoSrc: hasVideo ? `media/${path.basename(config.video.file)}` : null,
  captions: hasVideo && existsSync(captionsPath) ? `data:text/vtt;base64,${readFileSync(captionsPath).toString('base64')}` : null,
  poster: 'media/poster.svg', posterAlt: first.states.at(-1).alt,
  chapters: chapters.map(ch => ({ id: ch.id, title: ch.title, start: ch.start ?? null, accent: ch.accent, screens: ch.screens.map(s => s.id) })),
  screens: screens.map(s => ({ id: s.id, heading: s.heading, kind: s.kind, chapter: s.chapter, narration: s.narration, pages: s.pages || null, start: s.start ?? null,
    states: s.states || null, widget: s.widget || null, figure: figureIndexFor(s) })),
  transcript, guides, figures, concepts, conceptGroups, conceptsSource: config.conceptsSource || '',
  argument: config.argument || null, figuresIntro: config.figuresIntro || [], reading: config.reading || null, research: config.research || null,
  skills: config.skills || [], making: config.making || null, guideDownloads: config.guideDownloads || {}
};
const chapterData = chapters.map(ch => ({ id: ch.id, start: ch.start ?? null }));

const css = `
:root{color-scheme:light;--paper:${look.paper};--surface:${look.paper};--ink:${look.ink};--muted:${look.muted};--line:${look.hairline};
--green:${look.accents.green};--blue:${look.accents.blue};--orange:${look.accents.orange};--red:${look.accents.red};--violet:${look.accents.violet || '#6a4c9c'};
--bg:color-mix(in srgb,var(--surface) 95%,var(--ink));--soft:color-mix(in srgb,var(--surface) 92%,var(--ink));--on-accent:#fff;--card-paper:${look.paper};
--shadow:0 1px 2px rgba(16,20,24,.05),0 8px 24px rgba(16,20,24,.07);--shadow-lg:0 2px 4px rgba(16,20,24,.06),0 16px 40px rgba(16,20,24,.1);
--s1:4px;--s2:8px;--s3:12px;--s4:16px;--s5:24px;--s6:32px;--s7:48px;--s8:72px;--r:12px;--bar:60px;--max:1240px;
font-family:${font};font-size:17px;line-height:1.6;color:var(--ink);background:var(--bg);-webkit-text-size-adjust:100%}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;--surface:#171c20;--ink:#e9edf0;--muted:#a0abb4;--line:#2b343b;
--green:color-mix(in srgb,${look.accents.green} 62%,#fff);--blue:color-mix(in srgb,${look.accents.blue} 62%,#fff);--orange:color-mix(in srgb,${look.accents.orange} 62%,#fff);--red:color-mix(in srgb,${look.accents.red} 62%,#fff);--violet:color-mix(in srgb,${look.accents.violet || '#6a4c9c'} 62%,#fff);
--bg:#0e1215;--soft:#1e252a;--on-accent:#0b1114;--shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.35);--shadow-lg:0 2px 4px rgba(0,0,0,.4),0 16px 40px rgba(0,0,0,.45)}}
:root[data-theme="dark"]{color-scheme:dark;--surface:#171c20;--ink:#e9edf0;--muted:#a0abb4;--line:#2b343b;
--green:color-mix(in srgb,${look.accents.green} 62%,#fff);--blue:color-mix(in srgb,${look.accents.blue} 62%,#fff);--orange:color-mix(in srgb,${look.accents.orange} 62%,#fff);--red:color-mix(in srgb,${look.accents.red} 62%,#fff);--violet:color-mix(in srgb,${look.accents.violet || '#6a4c9c'} 62%,#fff);
--bg:#0e1215;--soft:#1e252a;--on-accent:#0b1114;--shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.35);--shadow-lg:0 2px 4px rgba(0,0,0,.4),0 16px 40px rgba(0,0,0,.45)}
[hidden]{display:none!important}*{box-sizing:border-box}html{scroll-padding-top:calc(var(--bar) + var(--s4))}body{margin:0;min-height:100vh;display:flex;flex-direction:column;overflow-x:hidden}
a{color:var(--green);text-underline-offset:3px}button,select,input{font:inherit;color:inherit}button{cursor:pointer}
:focus-visible{outline:3px solid var(--blue);outline-offset:2px;border-radius:6px}
h1,h2,h3,h4{line-height:1.18;letter-spacing:-.02em;font-weight:650;margin:0}p{margin:0 0 var(--s3);max-width:68ch}ol,ul{padding:0;margin:0}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.ic{width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.skip{position:absolute;left:var(--s4);top:-100px;z-index:50;background:var(--surface);padding:var(--s3) var(--s4);border-radius:8px;box-shadow:var(--shadow)}.skip:focus{top:var(--s3)}
/* top bar */
.topbar{position:sticky;top:0;z-index:30;background:color-mix(in srgb,var(--surface) 88%,transparent);backdrop-filter:saturate(1.4) blur(12px);-webkit-backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid var(--line)}
.topbar-in{max-width:var(--max);margin:auto;height:var(--bar);padding:0 var(--s5);display:flex;align-items:center;gap:var(--s4)}
.brand{display:flex;align-items:center;gap:var(--s2);font-weight:700;letter-spacing:-.01em;color:var(--ink);text-decoration:none;min-width:0;flex:0 1 auto}
.brand-mark{width:28px;height:28px;border-radius:8px;background:var(--green);color:var(--on-accent);display:grid;place-items:center;flex:none}.brand-mark .ic{width:16px;height:16px}
.brand span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nav{display:flex;gap:var(--s1);flex:1;justify-content:center;min-width:0}
.nav a{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;color:var(--muted);text-decoration:none;font-size:.88rem;font-weight:550;white-space:nowrap;transition:background .15s,color .15s}
.nav a:hover{background:var(--soft);color:var(--ink)}.nav a[aria-current=page]{background:var(--green);color:var(--on-accent)}
.icon-btn{width:40px;height:40px;border-radius:999px;border:1px solid var(--line);background:var(--surface);display:inline-grid;place-items:center;color:var(--ink);transition:background .15s,border-color .15s}
.icon-btn:hover:enabled{background:var(--soft);border-color:var(--muted)}.icon-btn:disabled{opacity:.4;cursor:default}.icon-btn .ic{width:18px;height:18px}
.menu-btn{display:none}.bar-end{display:flex;gap:var(--s2);margin-left:auto}.nav+.bar-end{margin-left:0}
/* layout */
main{flex:1;outline:none}.view{max-width:var(--max);margin:auto;padding:var(--s6) var(--s5) var(--s7);animation:fade .28s ease}.view[hidden]{display:none}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.site-footer{border-top:1px solid var(--line);background:var(--surface);color:var(--muted);font-size:.82rem;margin-top:auto}
.site-footer div{max-width:var(--max);margin:auto;padding:var(--s5) var(--s5) var(--s6)}.site-footer p{margin:0 0 var(--s1)}
/* shared pieces */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--s2);min-height:46px;padding:10px 20px;border-radius:999px;border:1.5px solid transparent;font-weight:600;text-decoration:none;line-height:1.2;transition:transform .15s,box-shadow .15s,background .15s}
.btn:hover{transform:translateY(-1px);box-shadow:var(--shadow)}.btn-primary{background:var(--green);color:var(--on-accent)}.btn-blue{background:var(--blue);color:var(--on-accent)}
.btn-outline{background:var(--surface);border-color:var(--line);color:var(--ink)}.btn-outline:hover{border-color:var(--ink)}
.btn-sm{min-height:38px;padding:6px 14px;font-size:.88rem}
.pill{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;font-size:.78rem;font-weight:650;letter-spacing:.02em;background:color-mix(in srgb,var(--a,var(--green)) 14%,var(--surface));color:var(--a,var(--green))}
.chip{display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:999px;font-size:.78rem;font-weight:600;text-decoration:none;background:color-mix(in srgb,var(--a,var(--green)) 12%,var(--surface));color:var(--a,var(--green));border:1px solid color-mix(in srgb,var(--a,var(--green)) 22%,transparent);white-space:nowrap}
a.chip:hover{background:color-mix(in srgb,var(--a,var(--green)) 22%,var(--surface))}
.tile{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;flex:none;background:color-mix(in srgb,var(--a,var(--green)) 13%,var(--surface));color:var(--a,var(--green))}.tile .ic{width:22px;height:22px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);transition:box-shadow .2s,border-color .2s,transform .2s}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:var(--s5)}
.section{margin-top:var(--s7)}.section>h2{font-size:1.5rem;margin-bottom:var(--s5)}
.page-title{font-size:clamp(1.7rem,3vw,2.2rem);margin-bottom:var(--s2)}.lede{color:var(--muted);margin-bottom:var(--s5)}
.green{--a:var(--green)}.blue{--a:var(--blue)}.orange{--a:var(--orange)}.red{--a:var(--red)}.violet{--a:var(--violet)}
.paper-card{background:var(--card-paper);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;box-shadow:var(--shadow)}
.paper-card img{display:block;width:100%;height:100%;object-fit:contain}
.band{position:relative;overflow:hidden;background:var(--a);color:var(--on-accent);border-radius:var(--r);padding:var(--s5) var(--s6)}
.band::after{content:'';position:absolute;right:-60px;top:-80px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.12);pointer-events:none}
.band .pill{background:rgba(255,255,255,.2);color:inherit}.band h2{font-size:clamp(1.3rem,2.4vw,1.75rem);margin-top:var(--s2)}.band .band-kicker{font-size:.85rem;font-weight:600;opacity:.9}
.band .btn-outline{background:transparent;color:inherit;border-color:rgba(255,255,255,.55)}.band a{color:inherit}
/* home */
.hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(200px,250px);gap:var(--s5);align-items:center;padding:var(--s7) var(--s6);border-radius:20px;border:1px solid var(--line);
background:radial-gradient(900px 340px at 0% 0%,color-mix(in srgb,var(--green) 11%,transparent),transparent 70%),radial-gradient(700px 320px at 100% 100%,color-mix(in srgb,var(--blue) 10%,transparent),transparent 70%),var(--surface)}
.hero h1{font-size:clamp(1.9rem,3.2vw,2.6rem);margin:var(--s4) 0 var(--s4);max-width:24ch}.hero .lead{font-size:1.1rem;color:var(--ink);opacity:.86}
.hero .cite{font-size:.82rem;color:var(--muted);margin:var(--s4) 0 var(--s5)}.cta{display:flex;flex-wrap:wrap;gap:var(--s2)}.cta .btn{padding:10px 14px;font-size:.94rem;white-space:nowrap}
.hero-art{transform:rotate(1.2deg);aspect-ratio:16/9;box-shadow:var(--shadow-lg)}
.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s4)}
.xp{display:flex;gap:var(--s4);align-items:flex-start;padding:var(--s5);text-decoration:none;color:var(--ink)}
.xp:hover{box-shadow:var(--shadow);border-color:color-mix(in srgb,var(--a) 45%,var(--line));transform:translateY(-2px)}
.xp h3{font-size:1.1rem;margin-bottom:var(--s1)}.xp p{color:var(--muted);font-size:.92rem;margin:0}.xp-body{flex:1;min-width:0}.xp .go{color:var(--a);align-self:center;transition:transform .2s}.xp:hover .go{transform:translateX(3px)}
.qlist{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s3);counter-reset:q}
.qlist li{counter-increment:q;display:flex;gap:var(--s3);align-items:center;padding:var(--s4);background:var(--surface);border:1px solid var(--line);border-radius:var(--r)}
.qlist li::before{content:counter(q);width:32px;height:32px;border-radius:50%;flex:none;display:grid;place-items:center;font-weight:700;font-size:.9rem;background:color-mix(in srgb,var(--a) 14%,var(--surface));color:var(--a)}
.qlist .q-title{flex:1;min-width:0;font-weight:600;color:var(--ink);text-decoration:none;line-height:1.35}.qlist .q-title:hover{color:var(--a);text-decoration:underline}
.prog{display:grid;gap:var(--s4)}.prog-top{display:flex;align-items:center;gap:var(--s4)}.meter{flex:1;height:8px;border-radius:99px;background:var(--soft);overflow:hidden}.meter>i{display:block;height:100%;background:var(--green);border-radius:99px;transition:width .35s ease}
.checks{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s2) var(--s5)}
.checks li{display:flex;align-items:center;gap:var(--s3);padding:var(--s2) 0}
.box{width:24px;height:24px;border-radius:50%;border:2px solid var(--line);display:grid;place-items:center;flex:none;color:transparent;transition:all .2s}.box .ic{width:14px;height:14px;stroke-width:3}
.done .box{background:var(--green);border-color:var(--green);color:var(--on-accent)}.done{color:var(--ink)}
.linkbtn{background:none;border:0;color:var(--muted);text-decoration:underline;padding:var(--s2) 0;font-size:.88rem}.linkbtn:hover{color:var(--ink)}
/* video */
.vgrid{display:grid;grid-template-columns:minmax(0,1.62fr) minmax(0,1fr);gap:var(--s5);align-items:stretch}
.vwrap{border-radius:var(--r);overflow:hidden;background:#000;aspect-ratio:16/9;box-shadow:var(--shadow-lg)}.vwrap video{width:100%;height:100%;display:block;background:#000}
.vleft{min-width:0}.voice{font-size:.82rem;color:var(--muted);margin:var(--s3) 0 var(--s4)}
.timeline{position:relative;height:44px;margin:var(--s3) 0 var(--s5);border-radius:10px;background:var(--soft);overflow:hidden}
.seg{position:absolute;top:0;bottom:0;border:0;border-left:2px solid var(--surface);background:color-mix(in srgb,var(--a) 22%,var(--surface));color:var(--ink);padding:0 var(--s2);display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700;overflow:hidden;white-space:nowrap;transition:background .2s}
.seg:first-child{border-left:0}.seg b{flex:none}.seg span{overflow:hidden;text-overflow:ellipsis}.seg:hover{background:color-mix(in srgb,var(--a) 38%,var(--surface))}
.seg[aria-current=true]{background:var(--a);color:var(--on-accent)}
.playhead{position:absolute;top:0;bottom:0;width:3px;margin-left:-1px;background:var(--ink);border-radius:2px;pointer-events:none;box-shadow:0 0 0 1px var(--surface)}
.chlist{list-style:none;display:grid;gap:2px}.chlist button{width:100%;display:flex;gap:var(--s3);align-items:center;text-align:left;padding:10px var(--s3);border:0;border-radius:10px;background:none}
.chlist button:hover{background:var(--soft)}.chlist button[aria-current=true]{background:color-mix(in srgb,var(--a) 13%,var(--surface))}
.chlist time{font-variant-numeric:tabular-nums;font-size:.82rem;font-weight:700;color:var(--a);min-width:3.2em}.chlist .dot{width:10px;height:10px;border-radius:50%;background:var(--a);flex:none}
.tpanel{position:relative;min-height:420px}.tbox{position:absolute;inset:0;display:flex;flex-direction:column;padding:0;overflow:hidden}
.thead{padding:var(--s4) var(--s4) var(--s3);border-bottom:1px solid var(--line);display:grid;gap:var(--s3)}.thead h2{font-size:1.1rem}
.trow{display:flex;gap:var(--s3);align-items:center;flex-wrap:wrap}
.search{flex:1;min-width:140px;display:flex;align-items:center;gap:var(--s2);border:1px solid var(--line);border-radius:999px;padding:0 var(--s3);background:var(--bg)}
.search input{flex:1;min-width:0;border:0;background:none;padding:9px 0;outline:none}.search:focus-within{border-color:var(--blue);box-shadow:0 0 0 3px color-mix(in srgb,var(--blue) 25%,transparent)}
.switch{display:inline-flex;align-items:center;gap:var(--s2);font-size:.85rem;cursor:pointer;user-select:none}.switch input{position:absolute;opacity:0}
.switch i{width:36px;height:20px;border-radius:99px;background:var(--line);position:relative;transition:background .2s}.switch i::after{content:'';position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;background:var(--surface);transition:transform .2s;box-shadow:0 1px 2px rgba(0,0,0,.3)}
.switch input:checked+i{background:var(--green)}.switch input:checked+i::after{transform:translateX(16px)}.switch input:focus-visible+i{outline:3px solid var(--blue);outline-offset:2px}
.tlist{position:relative;overflow:auto;flex:1;padding:var(--s2) var(--s3) var(--s4);overscroll-behavior:contain}
.tch{position:sticky;top:0;z-index:1;background:var(--surface);font-size:.74rem;text-transform:uppercase;letter-spacing:.08em;font-weight:700;color:var(--a);padding:var(--s3) var(--s2) var(--s2);margin:0}
.tline{display:flex;gap:var(--s3);width:100%;text-align:left;border:0;background:none;border-radius:8px;padding:7px var(--s2);font-size:.95rem;line-height:1.5}
.tline time{flex:none;font-size:.74rem;font-variant-numeric:tabular-nums;color:var(--muted);padding-top:3px;min-width:3em}.tline:hover{background:var(--soft)}
.tline[aria-current=true]{background:color-mix(in srgb,var(--green) 16%,var(--surface));box-shadow:inset 3px 0 0 var(--green)}
.tline mark{background:color-mix(in srgb,var(--orange) 35%,transparent);color:inherit;border-radius:3px}.tempty{padding:var(--s5);color:var(--muted)}
.withheld{max-width:760px}.withheld .paper-card{aspect-ratio:16/9;margin-bottom:var(--s4)}.production{display:flex;align-items:center;gap:10px;font-weight:600}.production::before{content:'';width:10px;height:10px;border-radius:50%;background:var(--orange)}
.stage{position:relative;aspect-ratio:16/9;transition:aspect-ratio .2s}.stage.wide{aspect-ratio:16/10}
.stage img{position:absolute;inset:0;opacity:0;transition:opacity .25s ease}.stage img.on{opacity:1}.stage iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#f4f2e9}
.read-pane mark{background:color-mix(in srgb,var(--a) 22%,transparent);color:inherit;border-radius:4px;padding:1px 3px;box-shadow:0 0 0 1px color-mix(in srgb,var(--a) 35%,transparent)}
details.alt{border-top:1px solid var(--line);padding-top:var(--s3);font-size:.9rem;color:var(--muted)}details.alt summary{cursor:pointer;font-weight:600;color:var(--ink)}details.alt p{margin-top:var(--s3)}
/* figures */
.split{display:grid;grid-template-columns:minmax(260px,330px) minmax(0,1fr);gap:var(--s5);align-items:start}
.flist{list-style:none;display:grid;gap:var(--s2);position:sticky;top:calc(var(--bar) + var(--s4))}
.fitem{display:flex;gap:var(--s3);align-items:flex-start;padding:var(--s3) var(--s4);text-decoration:none;color:var(--ink)}.fitem:hover{box-shadow:var(--shadow)}
.fitem h3{font-size:.95rem;margin-bottom:2px;line-height:1.3}.fitem p{font-size:.82rem;color:var(--muted);margin:0;line-height:1.4}.fitem .tile{width:36px;height:36px;border-radius:10px}.fitem .tile .ic{width:18px;height:18px}
.fitem[aria-current=page]{border-color:var(--a);background:color-mix(in srgb,var(--a) 8%,var(--surface));box-shadow:inset 3px 0 0 var(--a)}
.viewer{padding:var(--s4)}.viewer-frame{aspect-ratio:16/10}.viewer-frame iframe{width:100%;height:100%;border:0;background:#f4f2e9}
.viewer-head{display:flex;flex-wrap:wrap;gap:var(--s3);justify-content:space-between;align-items:flex-start;margin-top:var(--s4)}.viewer-head h2{font-size:1.3rem}.viewer-head p{color:var(--muted);margin:var(--s1) 0 0}
.pager{display:flex;gap:var(--s2);margin-top:var(--s4);flex-wrap:wrap}
/* key terms */
.tools{display:flex;flex-wrap:wrap;gap:var(--s3);align-items:center;justify-content:space-between;margin-bottom:var(--s4)}
.seg2{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:3px;background:var(--surface)}.seg2 button{border:0;background:none;border-radius:999px;padding:6px 16px;font-size:.88rem;font-weight:600;color:var(--muted)}
.seg2 button[aria-pressed=true]{background:var(--green);color:var(--on-accent)}.legend{display:flex;gap:var(--s4);font-size:.82rem;color:var(--muted);align-items:center}.legend span{display:inline-flex;gap:6px;align-items:center}
.legend i{width:14px;height:14px;border-radius:5px;border:1.5px solid var(--line);background:var(--surface);display:inline-grid;place-items:center;color:var(--green)}.legend i .ic{width:10px;height:10px;stroke-width:3.5}
.tgrid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:var(--s5);align-items:start}
.cmap{position:relative;padding:var(--s5) var(--s5) var(--s5) 40px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s7);align-items:start}
.cmap>svg{position:absolute;left:0;top:0;pointer-events:none;z-index:0;overflow:visible}.cmap .col{position:relative;z-index:1;display:grid;gap:var(--s3)}
.cmap h3{font-size:.76rem;text-transform:uppercase;letter-spacing:.09em;color:var(--a);margin-bottom:var(--s1)}
.node{position:relative;display:flex;align-items:center;justify-content:space-between;gap:var(--s2);width:100%;text-align:left;padding:10px var(--s3);border-radius:10px;border:1.5px solid color-mix(in srgb,var(--a) 35%,var(--line));background:var(--surface);font-weight:600;font-size:.92rem;line-height:1.3;transition:opacity .2s,background .2s,border-color .2s,box-shadow .2s}
.node:hover{background:color-mix(in srgb,var(--a) 9%,var(--surface))}.node .ic{width:14px;height:14px;stroke-width:3;color:var(--a);opacity:0}.node.viewed .ic{opacity:1}
.node.sel{background:var(--a);border-color:var(--a);color:var(--on-accent);box-shadow:var(--shadow)}.node.sel .ic{color:var(--on-accent)}
.node.rel{border-color:var(--a);background:color-mix(in srgb,var(--a) 14%,var(--surface))}.cmap.focus .node:not(.sel):not(.rel){color:var(--muted);border-color:var(--line);background:var(--surface);font-weight:500}
.edge{fill:none;stroke:var(--muted);stroke-width:1.5;opacity:.38;transition:opacity .2s,stroke .2s}.cmap.focus .edge{opacity:.08}.cmap.focus .edge.on{opacity:.95;stroke:var(--blue);stroke-width:2.5}
.detail{position:sticky;top:calc(var(--bar) + var(--s4));padding:var(--s5)}.detail h3{font-size:1.3rem;margin:var(--s2) 0 var(--s3)}.detail .empty{color:var(--muted)}
.detail h4{font-size:.76rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:var(--s4) 0 var(--s2)}.chips{display:flex;flex-wrap:wrap;gap:var(--s2)}.chips button.chip{cursor:pointer;font:inherit;font-size:.8rem;font-weight:600}
.walklinks{list-style:none;display:grid;gap:var(--s1)}.walklinks a{font-size:.92rem}
.src{font-size:.82rem;color:var(--muted);margin-top:var(--s4)}
.dl{display:grid;gap:var(--s5);max-width:860px}.dl dt{font-weight:700;font-size:1.05rem;margin-top:var(--s4)}.dl dd{margin:var(--s1) 0 0}.dl h3{font-size:.8rem;text-transform:uppercase;letter-spacing:.09em;color:var(--a)}
/* about */
.about{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s4)}.about .panel h2{font-size:1.1rem;margin-bottom:var(--s3)}.about .wide{grid-column:1/-1}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:var(--s3)}.stat{padding:var(--s3) var(--s4);border-radius:10px;background:var(--soft)}.stat b{display:block;font-size:1.7rem;line-height:1.1;letter-spacing:-.02em}.stat span{font-size:.82rem;color:var(--muted)}
table.keys{border-collapse:collapse;width:100%;font-size:.92rem}.keys td{padding:9px 0;border-top:1px solid var(--line);vertical-align:top}.keys td:first-child{white-space:nowrap;padding-right:var(--s4)}
kbd{font:600 .8rem ui-monospace,Menlo,monospace;background:var(--soft);border:1px solid var(--line);border-bottom-width:2px;border-radius:6px;padding:2px 7px}

/* argument */
.toc-ch .ck{margin-left:auto;color:var(--green);display:none;flex:none;padding-top:3px}.toc-ch.seen .ck{display:inline-flex}.toc-ch .ck .ic{width:14px;height:14px;stroke-width:3}
.arg-main{min-width:0}
.arg{display:grid;grid-template-columns:290px minmax(0,1fr);gap:var(--s7);align-items:start}
.toc{position:sticky;top:calc(var(--bar) + var(--s4));max-height:calc(100vh - var(--bar) - var(--s6));overflow:auto;padding:var(--s4);overscroll-behavior:contain}
.toc-sum{display:none}.toc h2{font-size:.76rem;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin:0 var(--s2) var(--s3)}
.toc ol{list-style:none}.toc>div>ol>li{margin-bottom:2px}
.toc-ch{display:flex;gap:var(--s3);align-items:flex-start;padding:9px var(--s2);border-radius:10px;text-decoration:none;color:var(--ink);font-weight:600;font-size:.9rem;line-height:1.35}
.toc-ch:hover{background:var(--soft)}.toc-ch .num{width:26px;height:26px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:.8rem;font-weight:700;background:color-mix(in srgb,var(--a) 14%,var(--surface));color:var(--a)}
.toc-ch .num .ic{width:13px;height:13px;stroke-width:3}.toc-ch[aria-current=page]{background:color-mix(in srgb,var(--a) 11%,var(--surface))}.toc-ch[aria-current=page] .num{background:var(--a);color:var(--on-accent)}
.toc-steps{margin:2px 0 var(--s2) 13px;padding-left:var(--s3);border-left:2px solid color-mix(in srgb,var(--a) 35%,var(--line))}
.toc-steps a{display:flex;gap:var(--s2);padding:6px var(--s2);font-size:.84rem;line-height:1.35;color:var(--muted);text-decoration:none;border-radius:8px}.toc-steps a:hover{background:var(--soft);color:var(--ink)}
.toc-steps a b{font-variant-numeric:tabular-nums;color:var(--a);flex:none;font-weight:700}.toc-steps a[aria-current=true]{color:var(--ink);background:color-mix(in srgb,var(--a) 10%,var(--surface));font-weight:600}
.chead{border-left:6px solid var(--a);padding:var(--s1) 0 var(--s1) var(--s5);margin-bottom:var(--s5)}
.chead h1{font-size:clamp(1.7rem,3.2vw,2.35rem);margin:var(--s3) 0 var(--s4);max-width:24ch}.chead .row{display:flex;flex-wrap:wrap;gap:var(--s3);align-items:center}
.short{background:color-mix(in srgb,var(--a) 8%,var(--surface));border:1px solid color-mix(in srgb,var(--a) 30%,var(--line));border-radius:16px;padding:var(--s5) var(--s6);margin-bottom:var(--s6)}
.short h2{font-size:.78rem;text-transform:uppercase;letter-spacing:.1em;color:var(--a);margin-bottom:var(--s2)}.short p{font-size:1.18rem;line-height:1.55;margin:0 0 var(--s3);max-width:60ch;font-weight:500}.short .chip{margin-top:var(--s1)}
.steps{list-style:none;display:grid;gap:var(--s5)}
.step{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,300px);gap:var(--s6);padding:var(--s5) var(--s6);scroll-margin-top:calc(var(--bar) + var(--s4))}
.step-head{display:flex;gap:var(--s3);align-items:flex-start;margin-bottom:var(--s3)}.step-head h2{font-size:1.28rem;line-height:1.25}
.step-no{flex:none;min-width:44px;height:30px;padding:0 var(--s2);border-radius:8px;display:grid;place-items:center;font-size:.85rem;font-weight:700;font-variant-numeric:tabular-nums;background:color-mix(in srgb,var(--a) 14%,var(--surface));color:var(--a)}
.step p{font-size:1.02rem}.step .chips{margin-top:var(--s3)}.step .lbl{font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:var(--s4) 0 var(--s2)}
.thumb{display:block;width:100%;padding:0;border:0;background:none;text-align:left;cursor:zoom-in}.thumb .paper-card{aspect-ratio:16/9;transition:box-shadow .2s,transform .2s}.thumb:hover .paper-card{box-shadow:var(--shadow-lg);transform:translateY(-2px)}
.thumb small{display:flex;align-items:center;gap:6px;margin-top:var(--s2);font-size:.82rem;font-weight:600;color:var(--a)}
.figcard{display:flex;flex-direction:column;gap:var(--s3);justify-content:center;padding:var(--s5);text-decoration:none;color:var(--ink);background:color-mix(in srgb,var(--a) 8%,var(--surface));border:1px solid color-mix(in srgb,var(--a) 30%,var(--line));border-radius:var(--r);aspect-ratio:16/9;transition:box-shadow .2s,transform .2s}
.figcard:hover{box-shadow:var(--shadow);transform:translateY(-2px)}.figcard b{font-size:1rem;line-height:1.3}.figcard span{display:inline-flex;align-items:center;gap:6px;font-weight:600;font-size:.88rem;color:var(--a)}
.cfoot{margin-top:var(--s7);display:grid;gap:var(--s5)}.pn{display:grid;grid-template-columns:1fr 1fr;gap:var(--s4)}
.pn a{display:flex;flex-direction:column;gap:2px;padding:var(--s4) var(--s5);text-decoration:none;color:var(--ink)}.pn a:hover{box-shadow:var(--shadow);border-color:var(--a)}.pn a.next{text-align:right;align-items:flex-end;grid-column:2}
.pn small{font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--a)}.pn b{font-size:.98rem;line-height:1.3}
.picdlg{border:0;padding:0;background:transparent;max-width:min(1080px,96vw);width:100%;color:var(--ink);overflow:visible}.picdlg::backdrop{background:rgba(8,12,14,.66);backdrop-filter:blur(3px)}
.picdlg[open]{animation:fade .22s ease}.pic{background:var(--surface);border-radius:18px;box-shadow:var(--shadow-lg);padding:var(--s5);max-height:94vh;overflow:auto;display:grid;gap:var(--s4)}
.pic-top{display:flex;gap:var(--s3);align-items:center;justify-content:space-between}.pic-top h2{font-size:1.15rem}.pic{grid-auto-rows:max-content}.pic .stage{width:min(100%,calc(50vh * 16 / 9));margin:0 auto}
.pic-ctl{display:flex;gap:var(--s2);align-items:center;justify-content:center;flex-wrap:wrap}.pic-ctl .cnt{min-width:8em;text-align:center;font-weight:600;font-variant-numeric:tabular-nums}
.pic-note{border-top:1px solid var(--line);padding-top:var(--s4)}.pic-note p{font-size:1rem}.pic-note mark{background:color-mix(in srgb,var(--a) 22%,transparent);color:inherit;border-radius:4px;padding:1px 3px}
/* reading, research */
.intro{font-size:1.08rem;color:var(--muted);max-width:68ch;margin-bottom:var(--s5)}.callout{background:color-mix(in srgb,var(--a,var(--green)) 9%,var(--surface));border:1px solid color-mix(in srgb,var(--a,var(--green)) 30%,var(--line));border-left:6px solid var(--a,var(--green));border-radius:var(--r);padding:var(--s4) var(--s5);margin:0 0 var(--s6)}.callout p{margin:0;font-weight:500;max-width:72ch}
.routes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s4)}.route{padding:var(--s5)}.route-head{display:flex;justify-content:space-between;align-items:center;gap:var(--s3);margin-bottom:var(--s3)}.route h3{font-size:1.15rem}
.ticks{list-style:none;display:grid;gap:var(--s1)}.tick{display:flex;gap:var(--s3);align-items:flex-start;padding:var(--s2) var(--s2);border-radius:10px;cursor:pointer;line-height:1.5;font-size:.97rem}.tick:hover{background:var(--soft)}
.tick input{position:absolute;opacity:0}.tick .box{margin-top:2px}.tick input:checked~.box{background:var(--green);border-color:var(--green);color:var(--on-accent)}.tick input:checked~span:last-child{color:var(--muted);text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--muted) 50%,transparent)}
.tick input:focus-visible~.box{outline:3px solid var(--blue);outline-offset:2px}.note{font-size:.88rem;color:var(--muted);margin:var(--s4) 0 0}
.crit{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s5);align-items:start}.crit h3{font-size:1.15rem;margin-bottom:var(--s3)}.crit .callout{margin-bottom:var(--s3)}
.crit-items{list-style:none;display:grid;gap:var(--s2)}.crit-items li{padding:var(--s3) var(--s4);background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--a);border-radius:10px;font-size:.95rem;line-height:1.5}.crit-items b{font-weight:700}
.gcards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s4)}.gcard{display:flex;flex-direction:column;gap:var(--s2);padding:var(--s5);text-decoration:none;color:var(--ink)}.gcard:hover{box-shadow:var(--shadow);border-color:color-mix(in srgb,var(--a) 45%,var(--line))}.gcard b{font-size:1rem;line-height:1.3}.gcard span{font-size:.88rem;color:var(--muted)}.gcard em{margin-top:auto;font-style:normal;font-weight:600;font-size:.85rem;color:var(--a);display:inline-flex;gap:6px;align-items:center}
.rgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s4);align-items:stretch}.rcard{padding:var(--s5)}.rcard>h3{display:flex;gap:var(--s3);align-items:flex-start;font-size:1.15rem;line-height:1.3;margin-bottom:var(--s4)}
.rno{width:32px;height:32px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:.9rem;font-weight:700;background:color-mix(in srgb,var(--a) 14%,var(--surface));color:var(--a)}
.tr{background:color-mix(in srgb,var(--a) 9%,var(--surface));border:1px solid color-mix(in srgb,var(--a) 28%,var(--line));border-radius:12px;padding:var(--s4) var(--s4) var(--s2)}
.tr>h4,.paper-block>summary{font-size:.74rem;text-transform:uppercase;letter-spacing:.09em;font-weight:700;color:var(--a);margin:0 0 var(--s3)}.tr>h4 span{color:var(--muted);font-weight:600}
.tr p,.paper-block p{font-size:.97rem}.tr ul,.paper-block ul{padding-left:var(--s5);margin:0 0 var(--s3)}.tr li,.paper-block li{margin-bottom:var(--s2);font-size:.95rem;line-height:1.5}.tr ul.ticks{padding-left:0}
.paper-block{margin-top:var(--s3);border-top:1px solid var(--line);padding-top:var(--s3)}.paper-block>summary{cursor:pointer;margin:0;color:var(--muted)}.paper-block[open]>summary{margin-bottom:var(--s3)}
/* making */
.mhero{max-width:760px;margin-bottom:var(--s6)}.mhero h1{font-size:clamp(1.9rem,3.4vw,2.6rem);margin-bottom:var(--s4)}.mhero p{font-size:1.1rem}
.timeline2{list-style:none;position:relative;display:grid;gap:var(--s5);margin:0 0 var(--s6)}.timeline2 li{display:grid;grid-template-columns:156px minmax(0,1fr);gap:var(--s5);position:relative}
.timeline2 time{white-space:nowrap;text-align:right;padding-right:22px;font-weight:700;font-size:.88rem;color:var(--muted);padding-top:var(--s4)}.timeline2 .t-card{position:relative;padding:var(--s4) var(--s5)}.timeline2 .t-card::before{content:'';position:absolute;left:-30px;top:22px;width:12px;height:12px;border-radius:50%;background:var(--a);box-shadow:0 0 0 4px var(--bg)}
.timeline2 li::after{content:'';position:absolute;left:calc(156px + var(--s5) - 25px);top:34px;bottom:calc(-1 * var(--s5) - 22px);width:2px;background:var(--line)}.timeline2 li:last-child::after{display:none}
.t-card h3{font-size:1.05rem;margin-bottom:var(--s1)}.t-card p{margin:0;font-size:.97rem;color:var(--muted)}
.skills{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:var(--s4)}.skill{padding:var(--s5);display:flex;flex-direction:column;gap:var(--s2)}.skill code{font:700 .95rem ui-monospace,Menlo,monospace;color:var(--a);word-break:break-all}.skill p{margin:0;font-size:.93rem;color:var(--muted)}.skill .soon{font-size:.82rem;font-weight:600;color:var(--muted);margin-top:auto}.skill a{margin-top:auto;font-weight:600;font-size:.9rem;display:inline-flex;gap:6px;align-items:center}
@media(min-width:900px) and (max-width:1320px){.brand span{display:none}.nav a{padding:8px 11px;font-size:.86rem}.topbar-in{padding:0 var(--s4)}}
@media(min-width:900px) and (max-width:1060px){.nav a .ic{display:none}}
@media(max-width:1100px){.cmap{gap:var(--s5)}.tgrid{grid-template-columns:minmax(0,1fr) 300px}}
@media(max-width:899px){
 :root{--bar:56px}.menu-btn{display:inline-grid}.topbar-in{padding:0 var(--s4)}
 .nav{display:none;position:absolute;left:0;right:0;top:var(--bar);flex-direction:column;align-items:stretch;gap:var(--s1);padding:var(--s3) var(--s4) var(--s4);background:var(--surface);border-bottom:1px solid var(--line);box-shadow:var(--shadow-lg)}
 .nav.open{display:flex}.nav a{padding:12px var(--s4);font-size:1rem;border-radius:12px}.bar-end{margin-left:auto}
 .view{padding:var(--s5) var(--s4) var(--s6)}.hero{grid-template-columns:1fr;padding:var(--s6) var(--s5)}.hero-art{display:none}
 .vgrid,.split,.tgrid,.arg,.routes,.crit,.rgrid,.gcards,.step{grid-template-columns:minmax(0,1fr)}.flist,.detail{position:static}.tpanel{min-height:0;height:440px}.about{grid-template-columns:1fr}
 .arg{gap:var(--s5)}.toc{position:static;max-height:none;padding:0}.toc-sum{display:flex;align-items:center;justify-content:space-between;list-style:none;cursor:pointer;padding:var(--s3) var(--s4);font-weight:650}.toc-sum::-webkit-details-marker{display:none}
 .toc-body{padding:0 var(--s3) var(--s3)}.toc h2{display:none}.step{padding:var(--s4);gap:var(--s4)}.short{padding:var(--s4) var(--s5)}.short p{font-size:1.08rem}.pn{grid-template-columns:1fr}.pn a.next{grid-column:auto}
 .timeline2 li{grid-template-columns:1fr;gap:var(--s2)}.timeline2 time{text-align:left;padding:0}.timeline2 li::after,.timeline2 .t-card::before{display:none}
}
@media(max-width:700px){
 :root{font-size:18px}.cards,.qlist,.checks{grid-template-columns:1fr}.band{padding:var(--s4) var(--s5)}.hero{padding:var(--s5) var(--s4);border-radius:16px}.btn{width:100%}.cta .btn{flex:1 1 100%}.pic .btn,.chead .btn{width:auto}
 .viewer-frame{aspect-ratio:4/3}.xp{padding:var(--s4)}.pic{padding:var(--s4);border-radius:14px}.stage.wide{aspect-ratio:4/3}.chead{padding-left:var(--s4);border-left-width:5px}.cmap{grid-template-columns:1fr;gap:var(--s5);padding:var(--s4)}.cmap>svg{display:none}.mg+.mg{padding-left:0;border-left:0}
 .section{margin-top:var(--s6)}.tools{align-items:flex-start}.stat b{font-size:1.4rem}
}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
@media print{.topbar,.toc,.tools .seg2{display:none}.view[hidden]{display:none}.view{padding:0}}
`;

// Client app. Written with String.raw: no backticks and no dollar-brace sequences inside.
const appScript = String.raw`
(function(){
'use strict';
var D=JSON.parse(document.getElementById('companion-data').textContent),C=D.copy,NS='http://www.w3.org/2000/svg';
var ICONS={
home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
video:'<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
walkthrough:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
figures:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
terms:'<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="9" cy="18" r="2.5"/><path d="M8.3 6.4l7.3 1.2M7 8.4l1.5 7.1M16.7 10.2l-6 6"/>',
guides:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M9 8h6"/>',
about:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
moon:'<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>',
first:'<path d="M6 5v14M18 6l-8 6 8 6z"/>',prev:'<path d="M15 6l-6 6 6 6"/>',next:'<path d="M9 6l6 6-6 6"/>',last:'<path d="M18 5v14M6 6l8 6-8 6z"/>',
play:'<path d="M7 5l12 7-12 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',reset:'<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>',
ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',down:'<path d="M6 9l6 6 6-6"/>',search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
argument:'<path d="M4 5h4v4H4zM11 7h9M4 15h4v4H4zM11 17h9"/>',research:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',making:'<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'};
function icon(n){var s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('class','ic');s.setAttribute('aria-hidden','true');s.innerHTML=ICONS[n]||'';return s}
function add(e,c){if(c==null||c===false)return;if(Array.isArray(c)){c.forEach(function(x){add(e,x)})}else e.appendChild(typeof c==='object'?c:document.createTextNode(String(c)))}
function h(tag,p){var e=document.createElement(tag);p=p||{};for(var k in p){var v=p[k];if(v==null||v===false)continue;if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?'':v)}
for(var i=2;i<arguments.length;i++)add(e,arguments[i]);return e}
function $(s,r){return (r||document).querySelector(s)}
function fmt(t){t=Math.max(0,Math.floor(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')}
function T(s,v){return String(s).replace(/\{(\w+)\}/g,function(_,k){return v&&v[k]!=null?v[k]:''})}
function by(a,k){var o={};a.forEach(function(x){o[x[k]]=x});return o}
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- storage (never required) ---------- */
function sget(k){try{return localStorage.getItem(k)}catch(e){return null}}
function sset(k,v){try{localStorage.setItem(k,v)}catch(e){}}
var PK='companion:'+D.id+':progress';
var P={};try{P=JSON.parse(sget(PK))||{}}catch(e){P={}}
['chRead','chSeen','figs','terms','ticks'].forEach(function(k){if(!Array.isArray(P[k]))P[k]=[]});
function save(){sset(PK,JSON.stringify(P))}
function mark(k,v){if(v===undefined){if(P[k])return;P[k]=true}else{if(P[k].indexOf(v)>-1)return;P[k].push(v)}save();paintProgress();if(k==='terms')paintTerms();if(k==='chSeen'||k==='chRead')paintToc()}
function setTick(key,on){var i=P.ticks.indexOf(key);if(on&&i<0)P.ticks.push(key);if(!on&&i>-1)P.ticks.splice(i,1);save()}

/* ---------- data ---------- */
var chapters=D.chapters,screens=D.screens,sById=by(screens,'id'),cById=by(chapters,'id');
var ACC=['green','blue','orange','violet'];
var hasFig=D.figures.length>0,hasTerms=D.concepts.length>0,hasArg=!!D.argument,hasReading=!!D.reading,hasResearch=!!D.research,hasMaking=!!D.making;
var NCH=chapters.length;
function shown(s){if(!s.states)return [];var ks=s.states.slice();if(ks.length>1&&ks[0].labels===0)ks.shift();return ks}
function alink(chId,scId){return '#/argument/'+encodeURIComponent(chId)+(scId?'/'+encodeURIComponent(scId):'')}
function termsFor(scId){return D.concepts.filter(function(k){return (k.screens||[]).indexOf(scId)>-1})}
function pageChip(pages,extra){return pages?h('a',{class:'chip',href:D.doi,target:'_blank',rel:'noopener','aria-label':pages+' · '+C.sourceLinkLabel,text:pages}):null}
function para(arr){return (Array.isArray(arr)?arr:[arr]).filter(Boolean).map(function(t){return h('p',{text:t})})}
function lead(text){var i=text.indexOf('. ');if(i>0){var l=text.slice(0,i+1);if(l.split(/\s+/).length<6&&!/\b(p|pp|Fig|Figs|Table|Box|No|vs|al|approx|etc)\.$/i.test(l))return [h('b',{text:l}),' '+text.slice(i+2)]}return [text]}
function tickItem(key,content){var inp=h('input',{type:'checkbox'});inp.checked=P.ticks.indexOf(key)>-1;var li=h('li',{},h('label',{class:'tick'},inp,h('span',{class:'box'},icon('check')),h('span',{},content)));return {li:li,inp:inp,key:key}}

/* ---------- shell ---------- */
var app=$('#app'),views={},order=[];
function register(name,label,ic,view){views[name]=view;order.push({name:name,label:label,icon:ic})}
var nav=$('#nav'),menuBtn=$('#menu-btn'),live=$('#live'),main=$('#main');
function announce(t){live.textContent='';setTimeout(function(){live.textContent=t},30)}

/* theme */
var root=document.documentElement,themeBtn=$('#theme-btn');
function effective(){var a=root.getAttribute('data-theme');if(a)return a;return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}
function paintTheme(){var d=effective()==='dark';themeBtn.replaceChildren(icon(d?'sun':'moon'));themeBtn.setAttribute('aria-label',d?C.themeLight:C.themeDark);themeBtn.title=d?C.themeLight:C.themeDark}
var st=sget('companion:theme');if(st==='light'||st==='dark')root.setAttribute('data-theme',st);
themeBtn.addEventListener('click',function(){var n=effective()==='dark'?'light':'dark';root.setAttribute('data-theme',n);sset('companion:theme',n);paintTheme();if(views.terms&&views.terms.redraw)views.terms.redraw()});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',paintTheme);paintTheme();

/* ---------- Home ---------- */
var paintProgress=function(){},paintTerms=function(){},paintToc=function(){};
function buildHome(){
 var el=h('section',{class:'view',id:'view-home',hidden:true,'aria-labelledby':'home-h'});
 var cta=h('div',{class:'cta'},h('a',{class:'btn btn-primary',href:'#/video'},icon('video'),C.ctaWatch));
 if(hasArg)cta.appendChild(h('a',{class:'btn btn-blue',href:alink(chapters[0].id)},icon('argument'),C.ctaStep));
 if(hasFig)cta.appendChild(h('a',{class:'btn btn-outline',href:'#/figures/1'},icon('figures'),C.ctaFigures));
 el.appendChild(h('div',{class:'hero'},h('div',{},h('span',{class:'pill'},C.heroBadge),h('h1',{id:'home-h',text:D.title}),h('p',{class:'lead',text:C.heroLead}),
  h('p',{class:'cite'},D.citation+' ',h('a',{href:D.doi,target:'_blank',rel:'noopener',text:D.doi})),cta),
  h('div',{class:'paper-card hero-art'},h('img',{src:D.poster,alt:'',width:1920,height:1080}))));
 var cards=[{k:'video',t:C.cardVideo,d:T(C.descVideo,{duration:D.duration?fmt(D.duration):'',chapters:chapters.length}),href:'#/video',a:'green',show:true},
  {k:'argument',t:C.navArgument,d:T(C.descArgument,{chapters:NCH,screens:screens.length}),href:alink(chapters[0].id),a:'blue',show:hasArg},
  {k:'figures',t:C.cardFigures,d:T(C.descFigures,{n:D.figures.length}),href:'#/figures/1',a:'orange',show:hasFig},
  {k:'terms',t:C.cardTerms,d:T(C.descTerms,{n:D.concepts.length}),href:'#/terms',a:'violet',show:hasTerms},
  {k:'guides',t:C.navReading,d:C.descReading,href:'#/reading',a:'green',show:hasReading},
  {k:'research',t:C.navResearch,d:T(C.descResearch,{n:hasResearch?D.research.cards.length:0}),href:'#/research',a:'blue',show:hasResearch},
  {k:'making',t:C.navMaking,d:C.descMaking,href:'#/making',a:'orange',show:hasMaking}].filter(function(x){return x.show});
 el.appendChild(h('div',{class:'section'},h('div',{class:'cards'},cards.map(function(x){return h('a',{class:'card xp '+x.a,href:x.href},h('span',{class:'tile'},icon(x.k)),h('div',{class:'xp-body'},h('h3',{text:x.t}),h('p',{text:x.d})),h('span',{class:'go'},icon('arrow')))}))));
 var q=h('ol',{class:'qlist'});
 chapters.forEach(function(ch,i){var li=h('li',{class:ACC[i%4]},h('a',{class:'q-title',href:hasArg?alink(ch.id):'#/video',text:ch.title}));
  if(D.hasVideo&&ch.start!=null)li.appendChild(h('a',{class:'chip',href:'#/video?t='+ch.start,'aria-label':T(C.timeIn,{time:fmt(ch.start)})+' ('+ch.title+')'},fmt(ch.start)));q.appendChild(li)});
 el.appendChild(h('section',{class:'section','aria-labelledby':'q-h'},h('h2',{id:'q-h',text:C.questionsHeading}),q));
 var need=Math.min(4,NCH);
 var rows=[{k:'watched',t:function(){return C.progressWatched},ok:function(){return !!P.watched}}];
 if(hasArg)rows.push({k:'arg',t:function(){return T(C.progressArgument,{n:P.chRead.length,total:NCH})},ok:function(){return P.chRead.length>=need}});
 if(hasFig)rows.push({k:'fig',t:function(){return C.progressFigure},ok:function(){return P.figs.length>0}});
 if(hasTerms)rows.push({k:'term',t:function(){return C.progressTerm},ok:function(){return P.terms.length>0}});
 var meter=h('i'),count=h('span',{class:'ctl-count'}),ul=h('ul',{class:'checks'});
 rows.forEach(function(r){r.lab=h('span');r.el=h('li',{},h('span',{class:'box'},icon('check')),r.lab);ul.appendChild(r.el)});
 el.appendChild(h('section',{class:'section','aria-labelledby':'p-h'},h('div',{class:'panel prog'},h('div',{},h('h2',{id:'p-h',text:C.progressHeading}),h('p',{class:'lede',style:'margin:6px 0 0',text:C.progressNote})),
  h('div',{class:'prog-top'},h('div',{class:'meter',role:'progressbar','aria-valuemin':0,'aria-valuemax':rows.length},meter),count),ul,
  h('div',{},h('button',{class:'linkbtn',type:'button',onclick:function(){P={chRead:[],chSeen:[],figs:[],terms:[],ticks:[]};save();paintProgress();paintToc();paintTerms();document.dispatchEvent(new Event('companion:reset'))}},C.progressReset)))));
 paintProgress=function(){var n=0;rows.forEach(function(r){var ok=r.ok();if(ok)n++;r.el.classList.toggle('done',ok);r.lab.textContent=r.t()});meter.style.width=(n/rows.length*100)+'%';meter.parentNode.setAttribute('aria-valuenow',n);count.textContent=T(C.progressDone,{n:n,total:rows.length})};
 paintProgress();
 return el}

/* ---------- Video ---------- */
var video=null;
function seek(t,play){if(!video||!isFinite(t))return;var go=function(){video.currentTime=t;if(play){var p=video.play();if(p&&p.catch)p.catch(function(){})}};if(video.readyState>0)go();else{video.addEventListener('loadedmetadata',go,{once:true});}}
function buildVideo(){
 var el=h('section',{class:'view',id:'view-video',hidden:true,'aria-labelledby':'video-h'});
 el.appendChild(h('h1',{class:'page-title sr',id:'video-h',text:C.videoLabel}));
 if(!D.hasVideo){
  el.appendChild(h('div',{class:'withheld'},h('div',{class:'paper-card'},h('img',{src:D.poster,alt:D.posterAlt,width:1920,height:1080})),h('p',{class:'production',text:C.inProduction}),h('p',{class:'lede',text:C.timingNote})));
  return {el:el}}
 video=h('video',{id:'explainer-video',controls:true,preload:'metadata',poster:D.poster},h('source',{src:D.videoSrc,type:'video/mp4'}));
 if(D.captions)video.appendChild(h('track',{kind:'captions',src:D.captions,srclang:'en-GB',label:C.captionsLabel}));
 video.appendChild(h('a',{href:D.videoSrc,text:C.downloadVideo}));
 var total=D.duration||1;
 var tl=h('div',{class:'timeline',role:'group','aria-label':C.chapterTimeline}),head=h('i',{class:'playhead'});
 var segs=chapters.map(function(ch,i){var b=h('button',{class:'seg '+ACC[i%4],type:'button','aria-label':ch.title+', '+fmt(ch.start),title:ch.title,onclick:function(){seek(ch.start,true)}},h('b',{text:String(i+1)}));tl.appendChild(b);return b});
 tl.appendChild(head);
 function layout(){chapters.forEach(function(ch,i){var end=i+1<chapters.length?chapters[i+1].start:total;segs[i].style.left=(ch.start/total*100)+'%';segs[i].style.width=Math.max(0,(end-ch.start)/total*100)+'%'})}
 var rows=chapters.map(function(ch,i){return h('li',{},h('button',{type:'button',class:ACC[i%4],onclick:function(){seek(ch.start,true)},'aria-label':T(C.timeIn,{time:fmt(ch.start)})+': '+ch.title},h('i',{class:'dot'}),h('time',{text:fmt(ch.start)}),h('span',{text:ch.title})))});
 var left=h('div',{class:'vleft'},h('div',{class:'vwrap'},video),h('p',{class:'voice',text:D.syntheticVoice}),tl,h('h2',{class:'sr',text:C.chapterList}),h('ul',{class:'chlist'},rows));
 /* transcript */
 var lines=D.transcript,tbox=null,tlist,lineEls=[],follow=true,query='';
 var right=null;
 if(lines.length){
  var chOf=function(t){var k=0;chapters.forEach(function(ch,i){if(ch.start<=t+0.05)k=i});return k};
  tlist=h('div',{class:'tlist',id:'tlist'});var lastCh=-1,groups=[];
  lines.forEach(function(l,i){var k=chOf(l.start);if(k!==lastCh){var hd=h('h3',{class:'tch '+ACC[k%4],text:chapters[k].title});tlist.appendChild(hd);groups.push({head:hd,items:[]});lastCh=k}
   var tb=h('button',{type:'button',class:'tline','data-i':i,title:C.transcriptLine,onclick:function(){seek(l.start,true)}},h('time',{text:fmt(l.start)}),h('span',{text:l.text}));l.el=tb;l.span=tb.lastChild;lineEls.push(tb);tlist.appendChild(tb);groups[groups.length-1].items.push(l)});
  var empty=h('p',{class:'tempty',hidden:true,text:C.transcriptEmpty});tlist.appendChild(empty);
  var input=h('input',{type:'search',placeholder:C.searchTranscript,'aria-label':C.searchTranscript,autocomplete:'off'});
  var fol=h('input',{type:'checkbox',checked:true});
  function filter(){query=input.value.trim().toLowerCase();var any=false;groups.forEach(function(g){var vis=0;g.items.forEach(function(l){var m=!query||l.text.toLowerCase().indexOf(query)>-1;l.el.hidden=!m;if(m)vis++;
    if(!query)l.span.textContent=l.text;else if(m){var i=l.text.toLowerCase().indexOf(query);l.span.replaceChildren(l.text.slice(0,i),h('mark',{text:l.text.slice(i,i+query.length)}),l.text.slice(i+query.length))}});g.head.hidden=!vis;if(vis)any=true});empty.hidden=any}
  input.addEventListener('input',filter);
  fol.addEventListener('change',function(){follow=fol.checked;if(follow)curLine=-2,sync()});
  right=h('div',{class:'tpanel'},h('div',{class:'card tbox'},h('div',{class:'thead'},h('h2',{text:C.transcriptHeading}),h('div',{class:'trow'},h('label',{class:'search'},icon('search'),input),h('label',{class:'switch'},fol,h('i'),h('span',{text:C.followVideo})))),tlist))}
 el.appendChild(h('div',{class:'vgrid'},left,right));
 var curLine=-1,curCh=-1;
 function sync(){var t=video.currentTime||0;
  var ci=0;chapters.forEach(function(ch,i){if(ch.start<=t+0.05)ci=i});
  if(ci!==curCh){curCh=ci;segs.forEach(function(b,i){b.setAttribute('aria-current',String(i===ci))});$('ul.chlist',left).querySelectorAll('button').forEach(function(b,i){b.setAttribute('aria-current',String(i===ci))})}
  head.style.left=(Math.min(t,total)/total*100)+'%';
  if(lines.length){var li=-1;for(var i=0;i<lines.length;i++){if(lines[i].start<=t+0.05)li=i;else break}
   if(li!==curLine){var was=curLine;curLine=li;if(was>=0&&lineEls[was])lineEls[was].removeAttribute('aria-current');if(li>=0){var e=lineEls[li];e.setAttribute('aria-current','true');
    if(follow&&!query&&!e.hidden){var target=e.offsetTop-tlist.clientHeight/3;tlist.scrollTo({top:Math.max(0,target),behavior:reduce?'auto':'smooth'})}}}}
  if(t>3&&!P.watched)mark('watched')}
 ['timeupdate','seeked','play','loadedmetadata'].forEach(function(ev){video.addEventListener(ev,sync)});
 video.addEventListener('loadedmetadata',function(){if(isFinite(video.duration)&&video.duration>0){total=video.duration;layout()}});
 layout();sync();
 return {el:el,leave:function(){video.pause()},redraw:sync}}

/* ---------- Argument ---------- */
var dlg=null,dlgState={};
function buildDialog(){
 var img=[h('img',{class:'on',alt:'',width:1920,height:1080}),h('img',{alt:'',width:1920,height:1080})],front=0,token=0;
 var title=h('h2',{id:'pic-title'}),closeB=h('button',{type:'button',class:'icon-btn','aria-label':C.close,title:C.close},icon('close'));
 var stage=h('div',{class:'paper-card stage'},img),cnt=h('span',{class:'cnt','aria-live':'polite'});
 var bBack=h('button',{type:'button',class:'btn btn-outline btn-sm'},icon('prev'),C.back),bNext=h('button',{type:'button',class:'btn btn-outline btn-sm'},C.next,icon('next')),bReset=h('button',{type:'button',class:'btn btn-outline btn-sm'},icon('reset'),C.reset);
 var narr=h('div'),altP=h('p'),det=h('details',{class:'alt'},h('summary',{text:C.describeView}),altP);
 var box=h('div',{class:'pic'},h('div',{class:'pic-top'},title,closeB),stage,h('div',{class:'pic-ctl'},bBack,cnt,bNext,bReset),h('div',{class:'pic-note'},narr,det));
 var d=h('dialog',{class:'picdlg','aria-labelledby':'pic-title'},box);document.body.appendChild(d);
 function showImg(src,alt){var cur0=img[front];if(cur0.getAttribute('src')===src){cur0.alt=alt;return}var nx=img[1-front],my=++token;nx.alt=alt;
  var swap=function(){if(my!==token)return;nx.classList.add('on');cur0.classList.remove('on');front=1-front};nx.onload=swap;nx.onerror=swap;nx.src=src;if(nx.complete&&nx.naturalWidth)swap()}
 function mk(par,cue){var f=document.createDocumentFragment();if(cue){var i=par.toLowerCase().indexOf(cue.toLowerCase());if(i>-1){f.appendChild(document.createTextNode(par.slice(0,i)));f.appendChild(h('mark',{text:par.slice(i,i+cue.length)}));f.appendChild(document.createTextNode(par.slice(i+cue.length)));return f}}f.appendChild(document.createTextNode(par));return f}
 function paint(announceIt){var s=dlgState.sc,list=dlgState.list,n=dlgState.i,st=list[n];title.textContent=s.heading;showImg(st.src,st.alt);altP.textContent=st.alt;
  cnt.textContent=T(C.pictureOf,{n:n+1,m:list.length});bBack.disabled=n===0;bNext.disabled=n===list.length-1;
  narr.replaceChildren.apply(narr,s.narration.map(function(p){return h('p',{},mk(p,st.cue))}));if(announceIt)announce(cnt.textContent)}
 function go(n){dlgState.i=Math.max(0,Math.min(dlgState.list.length-1,n));paint(true)}
 bBack.addEventListener('click',function(){go(dlgState.i-1)});bNext.addEventListener('click',function(){go(dlgState.i+1)});bReset.addEventListener('click',function(){go(0)});
 closeB.addEventListener('click',function(){d.close()});
 d.addEventListener('click',function(e){if(e.target===d)d.close()});
 d.addEventListener('keydown',function(e){if(e.key==='Tab'){var f=[].filter.call(d.querySelectorAll('button:not([disabled]),summary,a[href],input,select'),function(x){return x.offsetParent!==null||x.tagName==='SUMMARY'});if(f.length){var first=f[0],last=f[f.length-1];if(e.shiftKey&&(document.activeElement===first||!d.contains(document.activeElement))){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||!d.contains(document.activeElement))){e.preventDefault();first.focus()}}return}
  if(e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowRight'){e.preventDefault();go(dlgState.i+1)}else if(e.key==='ArrowLeft'){e.preventDefault();go(dlgState.i-1)}else if(e.key==='Home'){e.preventDefault();go(0)}else if(e.key==='End'){e.preventDefault();go(dlgState.list.length-1)}});
 d.addEventListener('close',function(){document.documentElement.style.overflow='';var o=dlgState.opener;if(o&&document.contains(o))o.focus()});
 d.open_=function(sc,opener,ci){dlgState={sc:sc,list:shown(sc),i:0,opener:opener};box.className='pic '+ACC[ci%4];paint(false);d.showModal();document.documentElement.style.overflow='hidden'};
 return d}
function openPictures(sc,opener,ci){if(!dlg)dlg=buildDialog();dlg.open_(sc,opener,ci)}

var argCur=-1,argIO=[];
function buildArgument(){
 var el=h('section',{class:'view',id:'view-argument',hidden:true,'aria-labelledby':'arg-h'});
 var intro=D.argument.intro;
 var tocBody=h('div',{class:'toc-body'});tocBody.appendChild(h('h2',{text:C.contents}));
 var tocList=h('ol'),tocCh=[],tocSteps={};
 chapters.forEach(function(ch,i){var a=ACC[i%4];
  var link=h('a',{class:'toc-ch '+a,href:alink(ch.id),'data-ch':i},h('span',{class:'num',text:String(i+1)}),h('span',{text:ch.title}),h('span',{class:'ck','aria-label':C.conceptViewed},icon('check')));
  var ul=h('ol',{class:'toc-steps '+a,hidden:true});
  ch.screens.forEach(function(id,j){var sa=h('a',{href:alink(ch.id,id),'data-s':id,onclick:function(e){e.preventDefault();goStep(i,id)}},h('b',{text:(i+1)+'.'+(j+1)}),h('span',{text:sById[id].heading}));tocSteps[id]=sa;ul.appendChild(h('li',{},sa))});
  tocCh.push({a:link,ul:ul,li:h('li',{},link,ul)});tocList.appendChild(tocCh[i].li)});
 tocBody.appendChild(tocList);
 var sum=h('summary',{class:'toc-sum'},h('span',{text:C.contents}),icon('down'));
 var toc=h('details',{class:'card toc',open:true},sum,tocBody);
 var wide=matchMedia('(min-width:900px)');function tocMode(){toc.open=wide.matches}tocMode();wide.addEventListener('change',tocMode);
 var main=h('div',{class:'arg-main'}),curStep=null;
 el.appendChild(h('div',{class:'arg'},toc,main));
 paintToc=function(){tocCh.forEach(function(t,i){t.a.classList.toggle('seen',P.chSeen.indexOf(chapters[i].id)>-1);if(i===argCur){t.a.setAttribute('aria-current','page');t.ul.hidden=false}else{t.a.removeAttribute('aria-current');t.ul.hidden=true}});
  Object.keys(tocSteps).forEach(function(id){if(id===curStep)tocSteps[id].setAttribute('aria-current','true');else tocSteps[id].removeAttribute('aria-current')})};
 function setStep(id){if(id===curStep)return;curStep=id;paintToc();if(current==='argument'){var h2=alink(chapters[argCur].id,id);if(location.hash!==h2)history.replaceState(null,'',h2)}}
 function scrollStep(id,smooth){var e=document.getElementById('step-'+id);if(e)e.scrollIntoView({block:'start',behavior:smooth&&!reduce?'smooth':'auto'})}
 function goStep(ci,id){if(ci!==argCur){location.hash=alink(chapters[ci].id,id);return}scrollStep(id,true);setStep(id);if(!wide.matches)toc.open=false}
 function render(ci){
  argIO.forEach(function(o){o.disconnect()});argIO=[];argCur=ci;curStep=null;
  var ch=chapters[ci],a=ACC[ci%4],info=(D.argument.chapters||{})[ch.title]||{};
  main.className='arg-main '+a;main.replaceChildren();
  var head=h('header',{class:'chead'},h('span',{class:'pill'},C.part+' '+(ci+1)+' '+C.of+' '+NCH),h('h1',{id:'arg-h',text:ch.title}));
  var row=h('div',{class:'row'});if(D.hasVideo&&ch.start!=null)row.appendChild(h('a',{class:'btn btn-primary btn-sm',href:'#/video?t='+ch.start,'aria-label':C.watch+', '+fmt(ch.start)},icon('video'),C.watch+' · '+fmt(ch.start)));
  head.appendChild(row);main.appendChild(head);
  if(ci===0&&intro)main.appendChild(h('p',{class:'intro',text:intro}));
  if(info.summary)main.appendChild(h('section',{class:'short','aria-labelledby':'short-h'},h('h2',{id:'short-h',text:C.inShort}),h('p',{text:info.summary}),pageChip(info.pages||'')));
  var ol=h('ol',{class:'steps'}),partTerms=[];
  ch.screens.forEach(function(id,j){var sc=sById[id],tf=termsFor(id);tf.forEach(function(k){if(partTerms.indexOf(k)<0)partTerms.push(k)});
   var left=h('div',{},h('div',{class:'step-head'},h('span',{class:'step-no',text:(ci+1)+'.'+(j+1)}),h('h2',{text:sc.heading})),sc.narration.map(function(p){return h('p',{text:p})}),pageChip(sc.pages));
   if(tf.length){left.appendChild(h('div',{class:'lbl',text:C.termsInStep}));left.appendChild(h('div',{class:'chips'},tf.map(function(k){return h('a',{class:'chip',href:'#/terms/'+encodeURIComponent(k.id),text:k.term})})))}
   var right;
   if(sc.states){var st=shown(sc),fin=sc.states[sc.states.length-1];var tb=h('button',{type:'button',class:'thumb','aria-label':sc.heading+': '+C.viewPictures+' ('+T(C.picturesCount,{n:st.length})+')'},h('div',{class:'paper-card'},h('img',{src:fin.src,alt:'',loading:'lazy',width:1920,height:1080})),h('small',{},icon('eye'),C.viewPictures+' · '+T(C.picturesCount,{n:st.length})));
    tb.addEventListener('click',function(){openPictures(sc,tb,ci)});right=tb}
   else{var fg=sc.figure>=0?D.figures[sc.figure]:null;right=h('a',{class:'figcard',href:fg?'#/figures/'+(sc.figure+1):sc.widget,target:fg?null:'_blank',rel:fg?null:'noopener'},h('b',{text:fg?fg.title:sc.heading}),h('span',{},icon('figures'),C.exploreFigure,icon('arrow')))}
   ol.appendChild(h('li',{class:'card step',id:'step-'+id,'data-s':id},left,h('div',{},right)))});
  main.appendChild(ol);
  var foot=h('footer',{class:'cfoot'});
  if(partTerms.length)foot.appendChild(h('section',{},h('h2',{class:'lbl',style:'font-size:.74rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 8px',text:C.termsInPart}),h('div',{class:'chips'},partTerms.map(function(k){return h('a',{class:'chip',href:'#/terms/'+encodeURIComponent(k.id),text:k.term})}))));
  var pn=h('nav',{class:'pn','aria-label':C.chapters});
  if(ci>0)pn.appendChild(h('a',{class:'card prev '+ACC[(ci-1)%4],href:alink(chapters[ci-1].id)},h('small',{text:'← '+C.previousPart}),h('b',{text:chapters[ci-1].title})));
  if(ci<NCH-1)pn.appendChild(h('a',{class:'card next '+ACC[(ci+1)%4],href:alink(chapters[ci+1].id)},h('small',{text:C.nextPart+' →'}),h('b',{text:chapters[ci+1].title})));
  foot.appendChild(pn);main.appendChild(foot);
  if(window.IntersectionObserver){
   var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)setStep(e.target.dataset.s)})},{rootMargin:'-12% 0px -72% 0px'});
   [].forEach.call(ol.children,function(li){io.observe(li)});argIO.push(io);
   var last=ol.lastElementChild;if(last){var io2=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)mark('chRead',ch.id)})},{threshold:.35});io2.observe(last);argIO.push(io2)}}
  mark('chSeen',ch.id);paintToc()}
 return {el:el,enter:function(r){var id=r.seg[0],ci=-1;chapters.forEach(function(c,i){if(c.id===id)ci=i});
   if(ci<0)ci=argCur>=0?argCur:0;var sc=r.seg[1];var changed=ci!==argCur;if(changed){render(ci);if(!sc)window.scrollTo(0,0)}
   if(sc&&sById[sc]&&sById[sc].chapter===ci){requestAnimationFrame(function(){scrollStep(sc,false);setStep(sc)})}
   else if(!id||ci!==chapters.findIndex(function(c){return c.id===id})){history.replaceState(null,'',alink(chapters[ci].id))}
   if(!wide.matches)toc.open=false;paintToc()}}}

/* ---------- Figures ---------- */
function buildFigures(){
 var el=h('section',{class:'view',id:'view-figures',hidden:true,'aria-labelledby':'fig-h'});
 el.appendChild(h('h1',{class:'page-title',id:'fig-h',text:C.figuresHeading}));
 if((D.figuresIntro||[]).length)el.appendChild(h('div',{class:'intro'},D.figuresIntro.map(function(t){return h('p',{text:t})})));
 var list=h('ul',{class:'flist'}),items=D.figures.map(function(f,i){var a=h('a',{class:'card fitem orange',href:'#/figures/'+(i+1)},h('span',{class:'tile'},icon('figures')),h('div',{},h('h3',{text:f.title}),h('p',{text:f.summary})));list.appendChild(h('li',{},a));return a});
 var frame=h('iframe',{loading:'lazy',title:''}),ft=h('h2'),fs=h('p'),open=h('a',{class:'btn btn-outline btn-sm',target:'_blank',rel:'noopener'},icon('ext'),C.openFullScreen),
  pv=h('a',{class:'btn btn-outline btn-sm'},icon('prev'),C.previousFigure),nx=h('a',{class:'btn btn-outline btn-sm'},C.nextFigure,icon('next')),idx=-1;
 var viewer=h('div',{class:'card viewer orange'},h('div',{class:'paper-card viewer-frame'},frame),h('div',{class:'viewer-head'},h('div',{},ft,fs),open),h('div',{class:'pager'},pv,nx));
 el.appendChild(h('div',{class:'split'},list,viewer));
 return {el:el,enter:function(r){var n=Math.max(1,Math.min(D.figures.length,parseInt(r.seg[0],10)||1))-1,f=D.figures[n];
  if(n!==idx){idx=n;frame.src=f.href;frame.title=f.title;ft.textContent=f.title;fs.textContent=f.summary;open.href=f.href;
   items.forEach(function(a,i){if(i===n)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
   pv.href='#/figures/'+Math.max(1,n);nx.href='#/figures/'+Math.min(D.figures.length,n+2);pv.setAttribute('aria-disabled',String(n===0));nx.setAttribute('aria-disabled',String(n===D.figures.length-1));pv.style.opacity=n===0?.4:1;nx.style.opacity=n===D.figures.length-1?.4:1}
  mark('figs',n)}}}

/* ---------- Key terms ---------- */
function buildTerms(){
 var el=h('section',{class:'view',id:'view-terms',hidden:true,'aria-labelledby':'terms-h'});
 el.appendChild(h('h1',{class:'page-title',id:'terms-h',text:C.termsHeading}));el.appendChild(h('p',{class:'lede',text:C.conceptsIntro}));
 var mode='map',selId=null,byId=by(D.concepts,'id'),gi={};D.conceptGroups.forEach(function(g,i){gi[g.id]=i});
 var bMap=h('button',{type:'button','aria-pressed':'true',text:C.mapView}),bList=h('button',{type:'button','aria-pressed':'false',text:C.listView});
 var legend=h('div',{class:'legend'},h('span',{},h('i',{},icon('check')),C.conceptViewed),h('span',{},h('i'),C.conceptNotViewed));
 el.appendChild(h('div',{class:'tools'},h('div',{class:'seg2',role:'group'},bMap,bList),legend));
 var nodes={},cols=D.conceptGroups.map(function(g,i){var col=h('div',{class:'col '+ACC[i%4]},h('h3',{text:g.title}));D.concepts.filter(function(k){return k.group===g.id}).forEach(function(k){
   var b=h('button',{type:'button',class:'node '+ACC[i%4],onclick:function(){location.hash='#/terms/'+encodeURIComponent(k.id)}},h('span',{text:k.term}),icon('check'));nodes[k.id]=b;col.appendChild(b)});return col});
 var svg=document.createElementNS(NS,'svg'),edgeDefs=[],seen={};
 D.concepts.forEach(function(k){(k.related||[]).forEach(function(r){if(!byId[r])return;var key=[k.id,r].sort().join('|');if(seen[key])return;seen[key]=1;var p=document.createElementNS(NS,'path');p.setAttribute('class','edge');svg.appendChild(p);edgeDefs.push({a:k.id,b:r,p:p})})});
 var cmap=h('div',{class:'card cmap'},svg,cols),detail=h('div',{class:'card detail',id:'term-detail','aria-live':'polite'});
 var src=h('p',{class:'src',text:D.conceptsSource});
 var mapWrap=h('div',{},h('div',{class:'tgrid'},h('div',{},cmap,src),detail));
 var listEl=h('div',{class:'dl',hidden:true});
 el.appendChild(mapWrap);el.appendChild(listEl);
 function relChips(k,fn){return (k.related||[]).filter(function(r){return byId[r]}).map(function(r){return h('button',{type:'button',class:'chip '+ACC[gi[byId[r].group]%4],onclick:function(){fn(r)},text:byId[r].term})})}
 function walkLinks(k){var ids=(k.screens||[]).filter(function(i){return sById[i]});ids=hasArg?ids:[];return ids.length?h('ul',{class:'walklinks'},ids.map(function(i){return h('li',{},h('a',{href:alink(chapters[sById[i].chapter].id,i)},sById[i].heading))})):h('p',{class:'empty',text:C.conceptNotInVideo})}
 function fillDetail(){detail.replaceChildren();var k=byId[selId];if(!k){detail.appendChild(h('p',{class:'empty',text:C.selectTerm}));return}
  var a=ACC[gi[k.group]%4];detail.className='card detail '+a;
  detail.appendChild(h('span',{class:'pill'},D.conceptGroups[gi[k.group]].title));detail.appendChild(h('h3',{text:k.term}));detail.appendChild(h('p',{text:k.definition}));
  if(k.pages)detail.appendChild(h('a',{class:'chip',href:D.doi,target:'_blank',rel:'noopener','aria-label':C.pageRef+': '+k.pages},k.pages));
  var rc=relChips(k,function(r){location.hash='#/terms/'+encodeURIComponent(r)});if(rc.length){detail.appendChild(h('h4',{text:C.relatedTerms}));detail.appendChild(h('div',{class:'chips'},rc))}
  detail.appendChild(h('h4',{text:C.showInArgument}));detail.appendChild(walkLinks(k))}
 function buildList(){listEl.replaceChildren();D.conceptGroups.forEach(function(g,i){var dl=h('dl',{class:ACC[i%4]});D.concepts.filter(function(k){return k.group===g.id}).forEach(function(k){
   dl.appendChild(h('dt',{id:'term-'+k.id,text:k.term}));var dd=h('dd',{},h('p',{text:k.definition}),k.pages?h('span',{class:'chip'},k.pages):null);var rc=relChips(k,function(r){var e=document.getElementById('term-'+r);if(e){e.scrollIntoView({block:'center'});mark('terms',r)}});
   if(rc.length)dd.appendChild(h('div',{class:'chips',style:'margin-top:8px'},rc));dd.appendChild(walkLinks(k));dl.appendChild(dd)});
   listEl.appendChild(h('section',{class:ACC[i%4]},h('h3',{text:g.title}),dl))});listEl.appendChild(src.cloneNode(true))}
 function paint(){var rel={};if(selId){((byId[selId].related)||[]).forEach(function(r){rel[r]=1})}
  Object.keys(nodes).forEach(function(id){var b=nodes[id];b.classList.toggle('sel',id===selId);b.classList.toggle('rel',!!rel[id]);b.classList.toggle('viewed',P.terms.indexOf(id)>-1);b.setAttribute('aria-pressed',String(id===selId))});
  cmap.classList.toggle('focus',!!selId);edgeDefs.forEach(function(e){e.p.classList.toggle('on',selId&&(e.a===selId||e.b===selId))});fillDetail()}
 function draw(){if(el.hidden||mode!=='map')return;var W=cmap.clientWidth,H=cmap.clientHeight,box=cmap.getBoundingClientRect();svg.setAttribute('width',W);svg.setAttribute('height',H);svg.style.width=W+'px';svg.style.height=H+'px';
  edgeDefs.forEach(function(e){var A=nodes[e.a].getBoundingClientRect(),B=nodes[e.b].getBoundingClientRect();var ca=gi[byId[e.a].group],cb=gi[byId[e.b].group],d;
   var ay=A.top+A.height/2-box.top,by_=B.top+B.height/2-box.top;
   if(ca===cb){var x=A.left-box.left,avail=ca===0?x-8:46,dp=Math.min(Math.max(avail,14),10+Math.abs(by_-ay)*.18,32);d='M'+x+' '+ay+' C'+(x-dp*1.3)+' '+ay+' '+(x-dp*1.3)+' '+by_+' '+x+' '+by_}
   else{var L=ca<cb?A:B,R=ca<cb?B:A,ly=ca<cb?ay:by_,ry=ca<cb?by_:ay,x1=L.right-box.left,x2=R.left-box.left,g=Math.min(22,(x2-x1)/2);d='M'+x1+' '+ly+' C'+(x1+g)+' '+ly+' '+(x2-g)+' '+ry+' '+x2+' '+ry}
   e.p.setAttribute('d',d)})}
 function setMode(m){mode=m;bMap.setAttribute('aria-pressed',String(m==='map'));bList.setAttribute('aria-pressed',String(m==='list'));mapWrap.hidden=m!=='map';listEl.hidden=m!=='list';legend.hidden=false;if(m==='list')buildList();else requestAnimationFrame(draw)}
 bMap.addEventListener('click',function(){setMode('map')});bList.addEventListener('click',function(){setMode('list')});
 if(window.ResizeObserver)new ResizeObserver(function(){requestAnimationFrame(draw)}).observe(cmap);addEventListener('resize',draw);
 paintTerms=function(){paint()};
 var v={el:el,redraw:draw,enter:function(r){var id=r.seg[0];selId=id&&byId[id]?id:null;if(selId)mark('terms',selId);paint();requestAnimationFrame(draw);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(draw)}};
 return v}

/* ---------- Reading ---------- */
function buildReading(){
 var R=D.reading;
 var el=h('section',{class:'view',id:'view-reading',hidden:true,'aria-labelledby':'read-h'});
 el.appendChild(h('h1',{class:'page-title',id:'read-h',text:C.readingHeading}));
 if(R.intro)el.appendChild(h('p',{class:'intro',text:R.intro}));
 var counters=[];
 if((R.routes||[]).length){
  var grid=h('div',{class:'routes'});
  R.routes.forEach(function(rt,i){var a=ACC[i%4],ul=h('ul',{class:'ticks'}),cnt=h('span',{class:'chip','aria-live':'polite'}),items=[];
   (rt.items||[]).forEach(function(t,j){var it=tickItem('r'+i+'.'+j,t);items.push(it);it.inp.addEventListener('change',function(){setTick(it.key,it.inp.checked);upd()});ul.appendChild(it.li)});
   function upd(){cnt.textContent=T(C.nOfMRead,{n:items.filter(function(x){return x.inp.checked}).length,m:items.length})}upd();
   counters.push(function(){items.forEach(function(x){x.inp.checked=P.ticks.indexOf(x.key)>-1});upd()});
   grid.appendChild(h('div',{class:'card route '+a},h('div',{class:'route-head'},h('h3',{text:rt.title}),cnt),ul))});
  el.appendChild(h('section',{class:'section','aria-labelledby':'routes-h'},h('h2',{id:'routes-h',text:C.readingRoutes}),grid,para(R.routesNote).map(function(p){p.className='note';return p})));
 }
 if((R.critical||[]).length){
  var cg=h('div',{class:'crit'});
  R.critical.forEach(function(g,i){var a=ACC[(i+2)%4],ul=h('ul',{class:'crit-items'});(g.items||[]).forEach(function(t){ul.appendChild(h('li',{},lead(t)))});
   cg.appendChild(h('div',{class:a},h('h3',{text:g.title}),g.intro?h('div',{class:'callout'},h('p',{text:g.intro})):null,ul))});
  el.appendChild(h('section',{class:'section','aria-labelledby':'crit-h'},h('h2',{id:'crit-h',text:C.readCritically}),cg));
 }
 if(D.guides.length){var G=D.guideDownloads||{};
  el.appendChild(h('section',{class:'section','aria-labelledby':'guides-h'},h('h2',{id:'guides-h',text:C.fullGuides}),G.intro?h('p',{class:'intro',text:G.intro}):null,
   h('div',{class:'gcards'},D.guides.map(function(g,i){return h('a',{class:'card gcard '+ACC[i%4],href:g.href,target:'_blank',rel:'noopener'},h('b',{text:g.title}),h('span',{text:g.summary}),h('em',{},icon('ext'),C.openGuide))})),
   G.note?h('p',{class:'note',text:G.note}):null))}
 document.addEventListener('companion:reset',function(){counters.forEach(function(f){f()})});
 return {el:el}}

/* ---------- Your research ---------- */
function blocks(arr,tick,prefix){var out=[],ul=null,n=0;(arr||[]).forEach(function(b){
  if(b.type==='li'){if(!ul){ul=h('ul',{class:tick?'ticks':''});out.push(ul)}
   if(tick){var it=tickItem(prefix+'.'+(n++),b.text);it.inp.addEventListener('change',function(){setTick(it.key,it.inp.checked)});ul.appendChild(it.li);ticks.push(it)}else ul.appendChild(h('li',{text:b.text}))}
  else{ul=null;out.push(h('p',{text:b.text}))}});return out}
var ticks=[];
function buildResearch(){
 var X=D.research;
 var el=h('section',{class:'view',id:'view-research',hidden:true,'aria-labelledby':'res-h'});
 el.appendChild(h('h1',{class:'page-title',id:'res-h',text:C.researchHeading}));
 if(X.intro)el.appendChild(h('div',{class:'callout blue'},h('p',{text:X.intro})));
 var grid=h('div',{class:'rgrid'});
 (X.cards||[]).forEach(function(cd,i){var a=ACC[i%4],hd=cd.forYouHeading||'',sub=hd.indexOf(':')>-1?hd.slice(hd.indexOf(':')+1).trim():'',tickable=/checklist/i.test(hd+' '+cd.title);
  var tr=h('div',{class:'tr'},h('h4',{},X.translationLabel||C.researchHeading,sub?h('span',{text:' · '+sub}):null),blocks(cd.forYou,tickable,'c'+i));
  var pb=h('details',{class:'paper-block'},h('summary',{text:X.paperLabel||''}),blocks(cd.paper,false,'p'+i));
  grid.appendChild(h('article',{class:'card rcard '+a},h('h3',{},h('span',{class:'rno',text:String(i+1)}),h('span',{text:cd.title})),tr,pb))});
 el.appendChild(grid);
 document.addEventListener('companion:reset',function(){ticks.forEach(function(x){x.inp.checked=false})});
 return {el:el}}

/* ---------- How it was made ---------- */
function buildMaking(){
 var M=D.making,nStates=0;screens.forEach(function(s){nStates+=shown(s).length});
 var el=h('section',{class:'view',id:'view-making',hidden:true,'aria-labelledby':'mk-h'});
 el.appendChild(h('div',{class:'mhero'},h('h1',{id:'mk-h',text:C.makingHeading}),para(M.purpose)));
 if(M.agentNote)el.appendChild(h('div',{class:'callout orange'},h('div',{class:'lbl',style:'font-size:.76rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--a);margin-bottom:6px',text:C.madeWithAgent}),h('p',{text:M.agentNote})));
 if((M.steps||[]).length){var ol=h('ol',{class:'timeline2'});
  M.steps.forEach(function(s,i){ol.appendChild(h('li',{class:ACC[i%4]},h('time',{text:s.date||''}),h('div',{class:'card t-card'},h('h3',{text:s.title}),h('p',{text:s.text}))))});
  el.appendChild(h('section',{class:'section','aria-labelledby':'proc-h'},h('h2',{id:'proc-h',text:C.processHeading}),ol))}
 var stats=[];if(D.duration)stats.push([C.statVideo,fmt(D.duration)]);stats.push([C.statChapters,NCH],[C.statScreens,screens.length],[C.statPictures,nStates]);if(hasFig)stats.push([C.statFigures,D.figures.length]);if(hasTerms)stats.push([C.statTerms,D.concepts.length]);
 el.appendChild(h('section',{class:'section','aria-labelledby':'num-h'},h('h2',{id:'num-h',text:C.numbersHeading}),h('div',{class:'panel'},h('div',{class:'stats'},stats.map(function(s){return h('div',{class:'stat'},h('b',{text:String(s[1])}),h('span',{text:s[0]}))})))));
 if(D.skills.length){
  el.appendChild(h('section',{class:'section','aria-labelledby':'sk-h'},h('h2',{id:'sk-h',text:C.skillsHeading}),M.reuse?h('p',{class:'lead-note',style:'max-width:72ch;margin:0 0 var(--s4)',text:M.reuse}):null,h('div',{class:'skills'},D.skills.map(function(s,i){
   return h('div',{class:'card skill '+ACC[i%4]},h('code',{text:s.name}),h('p',{text:s.role}),s.public&&s.url?h('a',{href:s.url,target:'_blank',rel:'noopener'},C.viewSkill,icon('ext')):h('span',{class:'soon',text:C.publishingAfterReview}))}))))}
 var keys=[['← →',C.keyArrows],['Esc',C.keyEsc],['Tab',C.keyTab]];
 el.appendChild(h('div',{class:'about section'},
  h('div',{class:'panel green'},h('h2',{text:C.citationHeading}),h('p',{text:D.citation}),h('p',{},h('a',{href:D.doi,target:'_blank',rel:'noopener',text:D.doi}))),
  h('div',{class:'panel orange'},h('h2',{text:C.voiceHeading}),h('p',{text:D.syntheticVoice}),h('p',{style:'color:var(--muted);font-size:.9rem',text:C.builtOn+' '+D.built+' (content dated '+D.date+').'})),
  h('div',{class:'panel wide'},h('h2',{text:C.shortcutsHeading}),h('table',{class:'keys'},h('tbody',{},keys.map(function(k){return h('tr',{},h('td',{},k[0].split(' ').map(function(x,i){return [i?' ':'',h('kbd',{text:x})]})),h('td',{text:k[1]}))})))),));
 return {el:el}}

/* ---------- router ---------- */
var current=null;
function parse(){var raw=location.hash.replace(/^#\/?/,''),q='',i=raw.indexOf('?');if(i>-1){q=raw.slice(i+1);raw=raw.slice(0,i)}
 var seg=raw.split('/').filter(Boolean).map(function(x){try{return decodeURIComponent(x)}catch(e){return x}});return {view:seg[0]||'home',seg:seg.slice(1),q:new URLSearchParams(q)}}
function route(first){
 var r=parse();if(!views[r.view]){history.replaceState(null,'','#/');r={view:'home',seg:[],q:new URLSearchParams()}}
 var name=r.view,changed=name!==current;
 if(changed&&current&&views[current].leave)views[current].leave();
 order.forEach(function(o){views[o.name].el.hidden=o.name!==name});
 current=name;
 [].forEach.call(nav.querySelectorAll('a'),function(a){if(a.dataset.view===name)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 var v=views[name];if(v.enter)v.enter(r);
 if(name==='video'&&video&&r.q.has('t')){var t=parseFloat(r.q.get('t'));seek(t,true)}
 closeMenu();
 if(changed&&!first){window.scrollTo(0,0);main.focus({preventScroll:true})}}
function closeMenu(){nav.classList.remove('open');menuBtn.setAttribute('aria-expanded','false');menuBtn.replaceChildren(icon('menu'))}
menuBtn.addEventListener('click',function(){var o=nav.classList.toggle('open');menuBtn.setAttribute('aria-expanded',String(o));menuBtn.replaceChildren(icon(o?'close':'menu'))});
menuBtn.setAttribute('aria-label',C.menu);menuBtn.replaceChildren(icon('menu'));

register('home',C.navHome,'home',{el:buildHome()});
register('video',C.navVideo,'video',buildVideo());
if(hasArg)register('argument',C.navArgument,'argument',buildArgument());
if(hasFig)register('figures',C.navFigures,'figures',buildFigures());
if(hasTerms)register('terms',C.navConcepts,'terms',buildTerms());
if(hasReading)register('reading',C.navReading,'guides',buildReading());
if(hasResearch)register('research',C.navResearch,'research',buildResearch());
if(hasMaking)register('making',C.navMaking,'making',buildMaking());
order.forEach(function(o){app.appendChild(views[o.name].el);var href=o.name==='home'?'#/':'#/'+o.name;
 nav.appendChild(h('a',{href:href,'data-view':o.name},icon(o.icon),h('span',{text:o.label})))});
paintProgress();
addEventListener('hashchange',function(){route(false)});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menuBtn.focus()}});
route(true);
})();
`;

const navLabel = c.chapters || 'Sections';
const html = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${esc(c.description)}"><title>${esc(config.title)}</title><style>${css}</style></head><body>
<a class="skip" href="#main">${esc(c.skip)}</a>
<header class="topbar"><div class="topbar-in"><a class="brand" href="#/"><span class="brand-mark" aria-hidden="true"><svg class="ic" viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg></span><span>${esc(pageData.shortTitle)}</span></a><nav class="nav" id="nav" aria-label="${esc(navLabel)}"></nav><div class="bar-end"><button class="icon-btn" id="theme-btn" type="button" aria-label="${esc(c.theme)}"></button><button class="icon-btn menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="nav"></button></div></div></header>
<main id="main" tabindex="-1"><div id="app"></div></main>
<footer class="site-footer"><div>${pageData.footer.map(line => `<p>${esc(line)}</p>`).join('')}</div></footer>
<div id="live" class="sr" aria-live="polite" aria-atomic="true"></div>
<script type="application/json" id="companion-data">${js(pageData)}</script>
<script>${appScript}</script></body></html>
`;
save(path.join(out, 'index.html'), html);
save(path.join(out, 'build-info.json'), JSON.stringify({ title: config.title, outline: config.inputs?.outline || 'outline.md', screens: screens.map(s => ({ id: s.id, kind: s.kind, states: s.states?.length, pages: s.pages, start: s.start })), chapters: chapterData, video: hasVideo, timingManifest: matching?.file || null, warnings, font: 'System font stack; no redistributed fonts' }, null, 2) + '\n');
console.log(`${screens.length} screens in ${chapters.length} chapters; ${screens.filter(s => s.states).reduce((n, s) => n + s.states.length, 0)} figure states; video ${hasVideo ? 'ready' : 'in production'} -> ${path.join(out, 'index.html')}`);
