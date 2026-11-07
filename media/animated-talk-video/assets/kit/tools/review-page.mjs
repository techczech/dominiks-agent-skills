#!/usr/bin/env node
// Writes <project>/review/review.html (everything for review lives in <project>/review/, so `hyperframes check` sees only index.html): the live HyperFrames composition in <hyperframes-player>, with a scene rail and keyboard navigation.
// usage: node review-page.mjs <project-folder> [scenes.json] [--title "Page title"] [--player path/to/hyperframes-player.global.js]
//        node review-page.mjs serve <project-folder> [--port 4777]   (serves the page on 127.0.0.1 and saves review notes to <project>/feedback/; see tools/README.md)
// scenes.json: [{id, layout, start, end, settle?, title?}]; settle = when the incoming transition has ended (start + its duration): a jump to the scene lands there, so you never land mid-move. the default is <project>/scenes.json. Without a title, one is read from the scene's heading in index.html.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

if (process.argv[2] === 'serve') { const { serve } = await import('./review-serve.mjs'); serve(process.argv.slice(3)) }
else generate()

function generate() {

const argv = process.argv.slice(2)
const opt = (n) => { const i = argv.indexOf(n); if (i < 0) return null; return argv.splice(i, 2)[1] }
const titleOpt = opt('--title'), playerOpt = opt('--player')
const [projArg, scenesArg] = argv
if (!projArg) { console.error('usage: node review-page.mjs <project-folder> [scenes.json] [--title T] [--player file]'); process.exit(1) }
const proj = path.resolve(projArg)
const here = path.dirname(fileURLToPath(import.meta.url))
// The player JS ships inside the pinned hyperframes package. Looked for, in order: --player, $HYPERFRAMES_DIST (a dist folder),
// <project>/node_modules, node_modules above the project, every $NODE_PATH entry, the npx cache.
function findPlayer() {
  const rel = 'hyperframes/dist/hyperframes-player.global.js'
  const roots = []
  if (process.env.HYPERFRAMES_DIST) roots.push(path.join(process.env.HYPERFRAMES_DIST, 'hyperframes-player.global.js'))
  for (let d = proj; ; d = path.dirname(d)) { roots.push(path.join(d, 'node_modules', rel)); if (path.dirname(d) === d) break }
  for (const d of (process.env.NODE_PATH || '').split(path.delimiter).filter(Boolean)) roots.push(path.join(d, rel))
  const npx = path.join(process.env.HOME || '', '.npm', '_npx')
  if (fs.existsSync(npx)) for (const h of fs.readdirSync(npx)) roots.push(path.join(npx, h, 'node_modules', rel))
  return roots.find(p => fs.existsSync(p))
}
const playerSrc = playerOpt ? path.resolve(playerOpt) : findPlayer()
if (!playerSrc || !fs.existsSync(playerSrc)) { console.error('hyperframes player JS not found. Install the pin in the project (npm install --save-exact hyperframes@0.8.214), or pass --player <file> or set HYPERFRAMES_DIST.'); process.exit(1) }
const scenesFile = path.resolve(scenesArg || path.join(proj, 'scenes.json'))
if (!fs.existsSync(scenesFile)) { console.error('scene list not found: ' + scenesFile); process.exit(1) }
const html = fs.readFileSync(path.join(proj, 'index.html'), 'utf8')
const root = html.match(/data-composition-id="[^"]*"[^>]*data-duration="([\d.]+)"/)
const raw = JSON.parse(fs.readFileSync(scenesFile, 'utf8'))
const strip = (s) => s.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, '&').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim()
function headingOf(id) {
  const i = html.indexOf(`id="${id}"`); if (i < 0) return ''
  const seg = html.slice(i, i + 6000)
  const m = seg.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || seg.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || seg.match(/class="(?:body|ln)"[^>]*>([\s\S]*?)<\/div>/)
  return m ? strip(m[1]).slice(0, 70) : ''
}
const scenes = raw.map((s, i) => ({ n: i + 1, id: s.id, layout: s.layout || '', title: s.title || headingOf(s.id) || s.id, start: s.start, settle: s.settle ?? s.start, end: s.end }))
const total = root ? parseFloat(root[1]) : scenes[scenes.length - 1].end
const rev = path.join(proj, 'review'); fs.mkdirSync(rev, { recursive: true })
// Older versions wrote these into the project root, where hyperframes check reports multiple_root_compositions. Remove them.
for (const f of ['review.html', 'review-composition.html', 'hyperframes-player.global.js', 'hyperframe.runtime.iife.js', 'review-feedback.js', 'review-feedback-format.js']) fs.rmSync(path.join(proj, f), { force: true })
if (fs.existsSync(path.join(proj, 'feedback')) && !fs.existsSync(path.join(rev, 'feedback'))) fs.renameSync(path.join(proj, 'feedback'), path.join(rev, 'feedback'))
fs.copyFileSync(playerSrc, path.join(rev, 'hyperframes-player.global.js'))
// The player only injects the HyperFrames runtime from a CDN when the page has no \`window.__hf\`, and the shader-transitions library defines __hf,
// so the player never injects it and play() does nothing. We therefore write a copy of the composition with the runtime added as the last script.
const runtimeSrc = path.join(path.dirname(playerSrc), 'hyperframe.runtime.iife.js')
if (!fs.existsSync(runtimeSrc)) { console.error('runtime JS not found: ' + runtimeSrc); process.exit(1) }
fs.copyFileSync(runtimeSrc, path.join(rev, 'hyperframe.runtime.iife.js'))
// The copy lives one folder down, so project-relative URLs (fonts, icons, images, media) get a ../ prefix. Absolute, data:, #fragment URLs are left alone.
const up = (u) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(u) ? u : '../' + u
const relHtml = html.replace(/(\s(?:src|href|poster|data-src)=)(["'])([^"']*)\2/g, (m, a, q, u) => a + q + up(u) + q)
  .replace(/url\(\s*(["']?)([^"')]*)\1\s*\)/g, (m, q, u) => 'url(' + q + up(u) + q + ')')
const compHtml = relHtml.replace(/<\/body>/, '<script src="hyperframe.runtime.iife.js"></script>\n</body>')
fs.writeFileSync(path.join(rev, 'review-composition.html'), compHtml)
// Review notes: the page script and the shared formatter are copied beside the page; drafts are keyed by this hash, so a changed video warns.
fs.copyFileSync(path.join(here, 'review-feedback.js'), path.join(rev, 'review-feedback.js'))
fs.copyFileSync(path.join(here, 'review-feedback-format.cjs'), path.join(rev, 'review-feedback-format.js'))
const hash = crypto.createHash('sha256').update(compHtml).update(JSON.stringify(scenes)).digest('hex').slice(0, 12)
const toolRel = path.relative(proj, path.join(here, 'review-page.mjs')).split(path.sep).join('/')
const feedbackCfg = { project: path.basename(proj), hash, serveHint: 'node ' + toolRel + ' serve .' }
const pageTitle = titleOpt || 'Review: ' + path.basename(proj)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

const page = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><title>${esc(pageTitle)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
*{box-sizing:border-box}
body{margin:0;font:15px/1.4 -apple-system,"Helvetica Neue",Arial,sans-serif;color:#1d2330;background:#f4f5f7;height:100vh;display:flex;flex-direction:column}
header{padding:10px 18px;background:#fff;border-bottom:1px solid #dcdfe5;display:flex;justify-content:space-between;align-items:baseline}
header h1{font-size:16px;margin:0}header span{color:#667085;font-size:13px}
main{flex:1;min-height:0;display:grid;grid-template-columns:70% 30%}
.stage{padding:16px;display:flex;flex-direction:column;gap:12px;min-width:0}
.frame{position:relative;width:100%;aspect-ratio:16/9;background:#000;border:1px solid #cfd3da;border-radius:6px;overflow:hidden;max-height:calc(100vh - 190px);margin:0 auto}
#hit,#pins{position:absolute}#hit{cursor:crosshair;z-index:3}#pins{pointer-events:none;z-index:4}
.pin{position:absolute;transform:translate(-50%,-100%);min-width:26px;height:26px;padding:0 6px;border-radius:13px 13px 13px 2px;background:#d92d20;color:#fff;font:600 13px/26px -apple-system,Arial,sans-serif;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.45)}
.pin.draft{background:#1b6ef3}.pin.hover{outline:3px solid #fff}
hyperframes-player{display:block;width:100%;height:100%}
.bar{display:flex;align-items:center;gap:12px}
button{font:inherit;padding:6px 12px;border:1px solid #c3c8d1;background:#fff;border-radius:6px;cursor:pointer}
button:hover{background:#eef1f6}
button.primary{background:#1b6ef3;border-color:#1b6ef3;color:#fff}button.primary:hover{background:#1559c8}
button.link{border:0;background:none;padding:0 4px;color:#1b6ef3;font-size:12.5px}button.link:hover{text-decoration:underline;background:none}button.link.danger{color:#b42318}
textarea{font:inherit;width:100%;padding:6px 8px;border:1px solid #c3c8d1;border-radius:6px;resize:vertical}
textarea:focus{outline:2px solid #1b6ef3;outline-offset:-1px;border-color:#1b6ef3}
.fb{padding:12px 14px;border-bottom:1px solid #dcdfe5;background:#fafbfc;display:flex;flex-direction:column;gap:7px}
.fb-head{display:flex;justify-content:space-between;align-items:baseline}.fb-count{color:#667085;font-size:12.5px}
.fb-lab{font-size:12.5px;color:#344054}.fb-actions{display:flex;gap:8px;flex-wrap:wrap}
.fb-msg{font-size:13px;min-height:1em}.fb-msg.ok{color:#067647}.fb-msg.err{color:#b42318}
.fb-hint,.fb-file{color:#667085;font-size:12.5px}.fb-file code{background:#eef1f6;padding:0 3px;border-radius:3px;font-size:12px}
.fb-warn{background:#fffaeb;border:1px solid #fedf89;border-radius:6px;padding:8px;font-size:13px}
.fb-copy{height:120px;font:12px/1.35 ui-monospace,Menlo,monospace}
.notes{list-style:none;margin:0;padding:4px 14px 8px 54px;border-bottom:1px solid #eceef2;background:#fcfcfd}
.note{display:grid;grid-template-columns:24px 1fr auto;gap:6px;padding:5px 6px;border-radius:5px;cursor:pointer;align-items:start}
.note:hover{background:#fef3f2}.nn{display:inline-block;background:#d92d20;color:#fff;border-radius:10px;text-align:center;font-size:12px;line-height:20px;height:20px}
.nm{color:#667085;font-size:12px;font-variant-numeric:tabular-nums}.nt{white-space:pre-wrap;font-size:13.5px}
.draft{margin:6px 14px 10px 54px;padding:10px;border:1px solid #1b6ef3;border-radius:6px;background:#f5f8ff;display:flex;flex-direction:column;gap:6px}
.draft-head{font-weight:600;font-size:13px}.draft-pin{font-size:12.5px;color:#475467}.draft-actions{display:flex;gap:8px}
#time{font-variant-numeric:tabular-nums;color:#344054;min-width:130px;text-align:right}
.scrub{position:relative;flex:1;height:28px}
.scrub input{position:absolute;inset:0;width:100%;margin:0;background:transparent;z-index:2}
.ticks{position:absolute;left:0;right:0;top:50%;height:14px;transform:translateY(-50%);pointer-events:none}
.ticks i{position:absolute;top:0;width:2px;height:100%;background:#8a94a6}
.ticks i.on{background:#1b6ef3}
.hint{color:#667085;font-size:12.5px}
aside{border-left:1px solid #dcdfe5;background:#fff;overflow:auto}
.scene{display:grid;grid-template-columns:32px 1fr 56px;gap:8px;padding:9px 14px;border-bottom:1px solid #eceef2;cursor:pointer;align-items:baseline}
.scene:hover{background:#f4f6fa}
.scene.cur{background:#e6efff;box-shadow:inset 4px 0 0 #1b6ef3}
.scene b{color:#667085;font-weight:600}.scene .t{font-weight:600}.scene .l{display:block;color:#667085;font-size:12.5px;font-weight:400}.scene time{color:#344054;font-variant-numeric:tabular-nums;text-align:right}
</style></head><body>
<header><h1>${esc(pageTitle)}</h1><span id="status">Loading the composition…</span></header>
<main>
<section class="stage">
 <div class="frame"><hyperframes-player id="p" src="review-composition.html" width="1920" height="1080"></hyperframes-player><div id="hit" title="Click to add a note with a pin here"></div><div id="pins"></div></div>
 <div class="bar">
  <button id="prev" title="Previous scene (←)">&#9664;&#9664;</button>
  <button id="play" title="Play / pause (Space)">Play</button>
  <button id="next" title="Next scene (→)">&#9654;&#9654;</button>
  <div class="scrub"><div class="ticks" id="ticks"></div><input id="seek" type="range" min="0" max="${total}" step="0.01" value="0"></div>
  <span id="time">0:00.0 / 0:00.0</span>
  <button id="noteBtn" title="Add a note at this moment (N)">Note</button>
 </div>
 <div class="hint">Space play/pause &middot; ← → previous/next scene &middot; [ ] back/forward 1 s &middot; , . one frame &middot; link to a scene with #scene-N &middot; N note &middot; click the picture for a pinned note</div>
</section>
<aside id="rail"></aside>
</main>
<script src="hyperframes-player.global.js"></script>
<script src="review-feedback-format.js"></script>
<script>
const SCENES=${JSON.stringify(scenes)};
const FEEDBACK=${JSON.stringify(feedbackCfg)};
const FPS=30, EPS=0.02;
const p=document.getElementById('p'), seek=document.getElementById('seek'), rail=document.getElementById('rail');
const fmt=t=>{t=Math.max(0,t);const m=Math.floor(t/60);return m+':'+(t-m*60).toFixed(1).padStart(4,'0')};
let total=${total}; let cur=-1;
const ticks=document.getElementById('ticks');
SCENES.forEach(s=>{const i=document.createElement('i');i.style.left=(s.start/total*100)+'%';i.dataset.n=s.n;ticks.appendChild(i);
 const d=document.createElement('div');d.className='scene';d.dataset.n=s.n;
 d.innerHTML='<b>'+s.n+'</b><span class="t"></span><time>'+fmt(s.start)+'</time>';
 const t=d.querySelector('.t');t.textContent=s.title;const l=document.createElement('span');l.className='l';l.textContent=s.layout;t.appendChild(l);
 d.onclick=()=>goScene(s.n);rail.appendChild(d)});
const now=()=>p.currentTime||0;
function sceneAt(t){let k=0;SCENES.forEach((s,i)=>{if(t>=s.start-1e-6)k=i});return k}
function go(t){t=Math.min(Math.max(0,t),Math.max(0,total-1/FPS));p.seek(t);show(t)}
function goScene(n){n=Math.min(Math.max(1,n),SCENES.length);location.hash='scene-'+n;go(SCENES[n-1].settle)}   // land after the incoming transition has ended
function show(t){
 const k=sceneAt(t);
 if(k!==cur){cur=k;rail.querySelectorAll('.scene').forEach((e,i)=>{e.classList.toggle('cur',i===k);if(i===k)e.scrollIntoView({block:'nearest'})});
  ticks.querySelectorAll('i').forEach((e,i)=>e.classList.toggle('on',i===k));
  history.replaceState(null,'','#scene-'+(k+1))}
 seek.value=t;document.getElementById('time').textContent=fmt(t)+' / '+fmt(total);
}
function sync(){document.getElementById('play').textContent=p.paused?'Play':'Pause'}
function toggle(){p.paused?p.play():p.pause();setTimeout(sync,0)}
p.addEventListener('ready',()=>{if(p.duration>0)total=p.duration;seek.max=total;
 document.getElementById('status').textContent=SCENES.length+' scenes · '+fmt(total);
 const m=location.hash.match(/scene-(\\d+)/);if(m)goScene(+m[1]);else show(0);sync()});
p.addEventListener('timeupdate',()=>{show(now());sync()});
p.addEventListener('ended',sync);
seek.oninput=()=>go(+seek.value);
document.getElementById('play').onclick=toggle;
document.getElementById('prev').onclick=()=>step(-1);
document.getElementById('next').onclick=()=>step(1);
function step(d){const t=now();const k=sceneAt(t);
 if(d<0){goScene(t-SCENES[k].settle>0.5?k+1:k)}else goScene(k+2)}
addEventListener('hashchange',()=>{const m=location.hash.match(/scene-(\\d+)/);if(m){const n=+m[1];if(n-1!==cur)go(SCENES[Math.min(Math.max(1,n),SCENES.length)-1].settle)}});
addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;if(window.reviewTyping&&window.reviewTyping(e.target))return;if(e.target.tagName==='BUTTON'&&e.key===' ')e.preventDefault();
 const k={' ':()=>toggle(),ArrowLeft:()=>step(-1),ArrowRight:()=>step(1),'[':()=>go(now()-1),']':()=>go(now()+1),',':()=>{p.pause();go(now()-1/FPS)},'.':()=>{p.pause();go(now()+1/FPS)}}[e.key];
 if(k){e.preventDefault();k();if(document.activeElement&&document.activeElement.type==='range')document.activeElement.blur()}});
</script>
<script src="review-feedback.js"></script>
</body></html>
`
fs.writeFileSync(path.join(rev, 'review.html'), page)
console.log('wrote ' + path.join(rev, 'review.html') + ' (' + scenes.length + ' scenes, ' + total + ' s, composition ' + hash + ')')
}
