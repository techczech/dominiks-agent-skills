#!/usr/bin/env node
/**
 * Gallery builder. CLI retained: build-journey.mjs <gallery.json>
 * [--videos folder] [--out site] [--media-base ../videos].
 * Input mode must be gallery. A session's videos use companion.mjs series mode.
 * Independent talk cards and their existing page links retain the gallery layout.
 */
import {readFileSync,writeFileSync,existsSync,mkdirSync,readdirSync,copyFileSync,cpSync,statSync,symlinkSync,utimesSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {Script} from 'node:vm';
import {playerCSS,playerScript} from './companion-player.mjs';
const argv=process.argv.slice(2),input=path.resolve(argv.shift()||'gallery.json');
const opts={};while(argv.length){const k=argv.shift();if(!['--videos','--out','--media-base'].includes(k)||!argv.length)throw Error('Invalid argument '+k);opts[k]=argv.shift()}
const base=path.dirname(input),videos=opts['--videos']?path.resolve(opts['--videos']):null,out=path.resolve(opts['--out']||path.join(base,'site'));
const read=p=>readFileSync(p,'utf8'),json=p=>JSON.parse(read(p)),save=(p,s)=>{mkdirSync(path.dirname(p),{recursive:true});writeFileSync(p,s)},copy=(a,b)=>{mkdirSync(path.dirname(b),{recursive:true});copyFileSync(a,b)},esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),embed=x=>JSON.stringify(x).replaceAll('<','\\u003c');
const source=input;
const D=json(source);if(D.mode!=='gallery'||!D.stops?.length)throw Error('Expected gallery mode and non-empty stops; session videos use companion.mjs series mode');
D.placeholder=source!==input||D.placeholder===true;
const seen=new Set(),scriptDir=path.dirname(fileURLToPath(import.meta.url));
// Reuse companion theme, DOM helpers and guarded storage verbatim; emitted pages are standalone.
const companion=read(path.join(scriptDir,'companion.mjs'));
let themeCSS=companion.slice(companion.indexOf(':root{color-scheme:'),companion.indexOf('/* home */'));
const look={paper:'#f4f2e9',ink:'#1e2925',muted:'#606d66',hairline:'#d9ded6',accents:{green:'#287454',blue:'#336b91',orange:'#a65f2e',red:'#aa3d37',violet:'#74549b'}};
themeCSS=themeCSS.replace(/\$\{([^}]+)\}/g,(_,expr)=>{if(expr==='font')return 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';if(expr.includes('violet'))return look.accents.violet;return expr.split('.').reduce((o,k)=>o?.[k],{look})||''});
const galleryPlayerScript=playerScript.replaceAll("'video-speeds'","'gallery-speeds-'+index").replaceAll("'video-shortcuts'","'gallery-shortcuts-'+index").replaceAll("'video-more'","'gallery-more-'+index");
const helpers=companion.slice(companion.indexOf('var ICONS='),companion.indexOf('var PK='));
const themeScript=companion.slice(companion.indexOf('var root=document.documentElement,themeBtn='),companion.indexOf('/* ---------- Home ---------- */'));
function duration(p){return Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',p],{encoding:'utf8'}).trim())}
function parseTime(t){return t.split(':').reduce((n,x)=>n*60+Number(x),0)}
function chaptersFor(folder){const f=path.join(folder,'chapters.txt');return existsSync(f)?read(f).split(/\r?\n/).flatMap(l=>{const m=l.match(/^(\d+:\d\d(?::\d\d)?)\s+(.+)$/);return m?[{start:parseTime(m[1]),title:m[2]}]:[]}):[]}
function makeCompanion(s,folder,mp4){
 const stage=path.join(base,'build',s.id);mkdirSync(stage,{recursive:true});
 // Source folders stay untouched. Preserve source mtimes: companion uses them to reject stale video.
 for(const name of ['kit','frames','assets','widgets','look.json','plan.json','scenes.json','cues.json','captions.vtt','chapters.txt']){
  const f=path.join(folder,name);if(existsSync(f))cpSync(f,path.join(stage,name),{recursive:true,preserveTimestamps:true});
 }
 let outline=read(path.join(folder,'outline.md'));
 if(!/^## /m.test(outline)){
  const authored=chaptersFor(folder),manifestFile=path.join(folder,'plan.json');
  if(authored.length&&existsSync(manifestFile)){
   const scenes=json(manifestFile).scenes.filter(sc=>Number.isFinite(sc.start)),headings=new Map();
   let previous=-1;
   for(const ch of authored){
    let nearest=0;scenes.forEach((sc,i)=>{if(Math.abs(sc.start-ch.start)<Math.abs(scenes[nearest].start-ch.start))nearest=i});
    if(Math.abs(scenes[nearest].start-ch.start)>1.1||nearest<=previous)throw Error('Authored chapter does not match measured scenes: '+s.id+' / '+ch.title);
    previous=nearest;headings.set(scenes[nearest].slideId||scenes[nearest].id,ch.title);
   }
   outline=outline.split('\n').flatMap(line=>{const id=line.match(/^### .*\bid=([^\s}]+)/)?.[1];return id&&headings.has(id)?['## '+headings.get(id),'',line]:[line]}).join('\n');
  }else outline='## '+s.title+'\n\n'+outline;
 }

 const op=path.join(stage,'outline.md');save(op,outline);const originalStat=statSync(path.join(folder,'outline.md'));utimesSync(op,originalStat.atime,originalStat.mtime);
 const vf=path.basename(mp4),link=path.join(stage,vf);if(!existsSync(link))symlinkSync(mp4,link);
 const config={title:s.title,shortTitle:s.title,date:s.date||D.meta?.date||'',citation:D.meta?.speaker||'',syntheticVoice:D.syntheticVoice||(D.footer||[]).find(line=>/^Synthetic voice:/i.test(line))||'',video:{file:vf,captions:'captions.vtt',burnedCaptions:true},inputs:{outline:'outline.md'},screens:{},argument:{intro:s.why||''},furtherStudy:[],footer:D.footer||[],copy:{heroBadge:'Talk companion',ctaStep:'Explore step by step',navArgument:'Explore',navHome:'Home',navVideo:'Video',navResearch:'Apply',researchHeading:'Try it',of:'of',watch:'Watch',back:'Back',describeView:'Describe this picture',chapters:'Sections',heroLead:s.why||s.question||'',ctaWatch:'Watch this talk',videoLabel:s.title,questionsHeading:'In this video',progressHeading:'Your progress',progressNote:'Saved in this browser.',transcriptHeading:'Transcript',searchTranscript:'Search transcript',followVideo:'Follow video',captionsLabel:'English',downloadVideo:'Download video'}};
 if(s.tryIt)config.research={intro:s.tryIt.doneWhen?'Done when: '+s.tryIt.doneWhen:'',translationLabel:'Prompt',paperLabel:s.why?'Why this matters':s.tryIt.doneWhen?'Done when':'Prompt',cards:[{title:'Try it',forYou:[{type:'p',text:s.tryIt.prompt}],paper:[{type:'p',text:s.why||s.tryIt.doneWhen||s.tryIt.prompt}]}]};
 save(path.join(stage,'companion.json'),JSON.stringify(config,null,2)+'\n');
 execFileSync(process.execPath,[path.join(scriptDir,'companion.mjs'),stage,'--out','page'],{stdio:['ignore','pipe','pipe']});
 const page=path.join(stage,'page'),target=path.join(out,'stops',s.id);
 const temporaryVideo=path.join(page,'media',vf);if(existsSync(temporaryVideo))unlinkSync(temporaryVideo);mkdirSync(target,{recursive:true});
 // Exclude the companion's temporary video copy. All published pages share one encode.
 for(const entry of readdirSync(page,{recursive:true,withFileTypes:true}))if(entry.isFile()&&!entry.name.endsWith('.mp4')){const full=path.join(entry.parentPath||entry.path,entry.name);copy(full,path.join(target,path.relative(page,full)))}
 let html=read(path.join(target,'index.html'));
 const dataRE=/(<script type="application\/json" id="companion-data">)([\s\S]*?)(<\/script>)/;
 html=html.replace(dataRE,(_,a,b,c)=>{const data=JSON.parse(b);if(!data.hasVideo)throw Error('Companion withheld current video for '+s.id);data.videoSrc='../../'+s.videoSrc;data.poster='../../'+s.thumbnailSrc;return a+embed(data)+c});
 // Neutral generated filenames also satisfy public-site inventories that exclude answer-label paths.
 let figureNumber=0;
 for(const f of readdirSync(path.join(page,'figures')).sort()){
  if(!f.endsWith('.svg'))continue;
  const name='figure-'+String(++figureNumber).padStart(4,'0')+'.svg';
  if(f===name)continue;
  copy(path.join(page,'figures',f),path.join(target,'figures',name));
  html=html.split('figures/'+f).join('figures/'+name);
  // Original generated figure is retained in the per-stop build folder.
  if(existsSync(path.join(target,'figures',f)))unlinkSync(path.join(target,'figures',f));
 }
 for(const f of readdirSync(path.join(target,'figures'))){if(/^figure-\d{4}\.svg$/.test(f)&&Number(f.slice(7,11))>figureNumber)unlinkSync(path.join(target,'figures',f));}
 save(path.join(target,'index.html'),html);return 'stops/'+s.id+'/index.html';
}
// Normalise every id before generating cross-stop links.
D.stops.forEach((s,i)=>{s.id??=String(i+1).padStart(2,'0');if(!/^[a-zA-Z0-9][\w-]*$/.test(s.id)||seen.has(s.id)||!s.title)throw Error('Invalid or duplicate stop '+s.id);seen.add(s.id)});
for(const s of D.stops){
 const folder=videos?path.join(videos,s.id):null;
 const mp4=s.video?path.resolve(base,s.video):folder?path.join(folder,s.id+'-web.mp4'):null;
 if(!mp4||!existsSync(mp4))throw Error('Missing MP4 for '+s.id);
 s.duration=typeof s.length==='number'?s.length:duration(mp4);s.lengthLabel=typeof s.length==='string'?s.length:Math.floor(Math.round(s.duration)/60)+':'+String(Math.round(s.duration)%60).padStart(2,'0');
 const thumb=s.thumbnail?path.resolve(base,s.thumbnail):folder?path.join(folder,'thumbnail.jpg'):null;
 if(opts['--media-base']){s.videoSrc=opts['--media-base']+'/'+s.id+'.mp4';if(thumb&&existsSync(thumb))s.thumbnailSrc=opts['--media-base']+'/'+s.id+'.jpg'}
 else{const f='media/'+s.id+'.mp4';copy(mp4,path.join(out,f));s.videoSrc=f;if(thumb&&existsSync(thumb)){s.thumbnailSrc='media/'+s.id+'.jpg';copy(thumb,path.join(out,s.thumbnailSrc))}}
 s.chapters=folder?chaptersFor(folder):[];
 // When source has no authored chapter list, use exact frame ids/times from its measured manifest.
 if(!s.chapters.length&&folder&&existsSync(path.join(folder,'plan.json'))){const p=json(path.join(folder,'plan.json'));s.chapters=p.scenes.filter(sc=>Number.isFinite(sc.start)).map(sc=>({start:sc.start,title:sc.slide?.title||sc.slideId}))}
 if(!s.chapters.length)s.chapters=[{start:0,title:s.title}];
 if(folder&&existsSync(path.join(folder,'outline.md')))s.page=makeCompanion(s,folder,mp4);
}
// Do not expose build-machine source paths in the generated document.
D.stops.forEach(s=>{delete s.video;delete s.thumbnail});
const css=themeCSS+playerCSS+`
.container{max-width:1240px;margin:auto;padding:32px 24px 64px}.hero{padding:44px;border:1px solid var(--line);border-radius:20px;background:radial-gradient(ellipse at top left,color-mix(in srgb,var(--green) 14%,transparent),transparent 75%),var(--surface)}.hero h1{max-width:25ch;font-size:clamp(2rem,4.2vw,3.4rem);margin:16px 0}.hero .lead{font-size:1.18rem;max-width:65ch}.meta{color:var(--muted);font-size:.9rem}.cta{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0 0}.intro{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin:32px 0}.path{list-style:none;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:32px 24px;position:relative}.path:before{content:'';position:absolute;left:0;right:0;top:32%;bottom:20%;border:2px solid var(--line);border-left:0;border-radius:0 32px 32px 0;z-index:0}.stop{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;min-width:0}.stop:hover{border-color:var(--green);box-shadow:var(--shadow)}.stop>a{display:block;color:inherit;text-decoration:none}.stop img{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;display:block}.stop .copy{padding:18px}.stop h3{font-size:1.15rem;margin:10px 0}.stop p{font-size:.9rem;color:var(--muted)}.stop .number{display:inline-flex;align-items:center;gap:8px;color:var(--green);font-weight:650;font-size:.8rem}.stop.done .number:after{content:'✓ Watched'}.section-title{margin:32px 0 20px}.player-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px}.player-main{min-width:0}.vwrap{aspect-ratio:16/9;background:#000;overflow:hidden}.vwrap video{width:100%;height:100%;display:block}.rail{list-style:none;display:grid;gap:8px;align-content:start}.rail a{display:flex;align-items:center;gap:12px;padding:8px;text-decoration:none;color:var(--ink);border-radius:10px;border:1px solid var(--line);background:var(--surface);font-size:.85rem;line-height:1.35}.rail img{width:90px;height:auto;aspect-ratio:16/9;border-radius:5px}.rail a[aria-current]{border:2px solid var(--green);background:var(--soft)}.rail .done a:after{content:'✓';color:var(--green)}.rail span{flex:1}.rail small{display:block;color:var(--muted);margin-bottom:4px}.player-heading{margin:12px 0 20px;font-size:clamp(1.5rem,3vw,2rem)}.stop-note{margin-top:24px}.try{margin:24px 0;padding:24px}.try blockquote{margin:12px 0;white-space:pre-wrap;overflow-wrap:anywhere}.links{display:flex;gap:16px;flex-wrap:wrap;margin-top:20px}.bridge{position:absolute;inset:0;background:var(--surface);overflow:auto;padding:28px;z-index:8}.bridge h2{font-size:clamp(1.3rem,2.4vw,1.8rem);margin:8px 0 12px}.bridge p{font-size:.95rem}.bridge .try{padding:16px;margin:16px 0}.bridge .try blockquote{font-size:.88rem}.bridge .cta{margin-top:16px;gap:8px}.bridge .btn{font-size:.85rem;min-height:38px;padding:8px 14px}.countdown{font-size:.82rem;color:var(--muted)}.gallery .path{grid-template-columns:repeat(2,minmax(0,1fr))}.gallery .path:before{display:none}.finish{max-width:760px;margin:32px auto}.finish h1{margin:16px 0}.topbar-in>a{color:var(--ink);text-decoration:none}.topbar-in .brand{flex:1}.site-footer .links{margin-bottom:16px}button,a{touch-action:manipulation}.bridge:focus{outline:3px solid var(--blue)}
@media(max-width:1000px){.player-layout{display:flex;flex-direction:column}.player-main{display:contents}.player-main>section:not([hidden]){display:contents}.player-main>section>.video-player{width:100%;order:0}.player-layout>nav{width:100%;order:1}.player-main>section>.stop-note{order:2}.path{grid-template-columns:repeat(2,minmax(0,1fr))}.player-layout{grid-template-columns:minmax(0,1fr)}.rail{grid-template-columns:repeat(2,minmax(0,1fr))}.bridge{padding:24px}}
@media(max-width:599px){.container{padding:24px 16px 48px}.hero{padding:24px}.hero h1{font-size:2rem}.intro{grid-template-columns:1fr;gap:0}.path,.gallery .path{grid-template-columns:1fr;gap:24px;padding-left:22px}.path:before{display:block;top:0;bottom:0;left:4px;right:auto;border:0;border-left:2px solid var(--line)}.gallery .path{padding:0}.rail{grid-template-columns:1fr}.rail img{width:86px}.topbar-in{padding:0 16px}.brand{font-size:.85rem}.bridge{position:relative;inset:auto;padding:20px;border-top:2px solid var(--green);max-height:none}.video-player:has(.bridge:not([hidden])) .vwrap>video,.video-player:has(.bridge:not([hidden])) .paused-play{display:none}.video-player:has(.bridge:not([hidden])) .vwrap{aspect-ratio:auto}.try{padding:20px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
`;
const runtime=String.raw`(function(){'use strict';var D=${embed(D)},NS='http://www.w3.org/2000/svg';${helpers}
var C={themeLight:'Switch to light theme',themeDark:'Switch to dark theme'},views={},live=$('#live');function announce(t){live.textContent=t}
${themeScript}
var app=$('#app'),current=-1,players=[],timer=null,bridgePaused=false,remaining=8,bridgeBox=null;
var key='gallery:'+D.title,progress={};try{progress=JSON.parse(sget(key))||{}}catch(e){}if(!Array.isArray(progress.done))progress.done=[];if(!progress.times||typeof progress.times!=='object')progress.times={};
function persist(){sset(key,JSON.stringify(progress));paintProgress()}
function num(i){return String(i+1).padStart(2,'0')}
function routeLink(i){return '#/'+('watch')+'/'+num(i)}
function stopLink(s,i){return s.page?s.page:routeLink(i)}
function picture(s){return s.thumbnailSrc?h('img',{src:s.thumbnailSrc,alt:'',width:1280,height:720,loading:'lazy'}):h('div',{class:'panel',text:s.title})}
function links(s){var list=h('div',{class:'links'});if(s.page)list.appendChild(h('a',{href:s.page,text:'Open the talk’s page'}));var slide=s.slides;if(slide){var url=slide;if(url)list.appendChild(h('a',{href:url,text:/^https?:/.test(slide)?'Slides':'Slides: '+slide}))}if(D.meta?.activities)list.appendChild(h('a',{href:D.meta.activities+(s.activity?.match(/^Activity (\d+)/)?.[1]?'#activity-'+s.activity.match(/^Activity (\d+)/)[1]:''),text:s.activity||'Workshop activities'}));return list}
function tryIt(s){if(!s.tryIt)return null;var quote=h('blockquote',{text:s.tryIt.prompt}),copy=h('button',{type:'button',class:'btn btn-outline btn-sm',text:'Copy prompt'});copy.onclick=function(){var done=function(){copy.textContent='Copied';announce('Prompt copied')};if(navigator.clipboard&&isSecureContext)navigator.clipboard.writeText(s.tryIt.prompt).then(done,function(){select()});else select();function select(){var range=document.createRange();range.selectNodeContents(quote);var sel=getSelection();sel.removeAllRanges();sel.addRange(range);try{if(document.execCommand('copy'))done();else{copy.textContent='Prompt selected — copy it';announce('Prompt selected; use your browser copy command')}}catch(e){copy.textContent='Prompt selected — copy it'}}};return h('section',{class:'card try'},h('h3',{text:'Try it'}),quote,copy,s.tryIt.doneWhen?h('p',{class:'meta',text:'Done when: '+s.tryIt.doneWhen}):null)}
var home=h('section',{class:'container '+D.mode,id:'gallery-home'}),start=h('a',{class:'btn btn-primary',href:routeLink(0),text:'Watch'}),resume=h('a',{class:'btn btn-outline',hidden:true,text:'Continue where you left off'}),progressLabel=h('p',{class:'meta'});
var hero=h('div',{class:'hero'},h('span',{class:'pill',text:D.subtitle|| ('Talk series')}),h('h1',{text:D.title}),D.promise?h('p',{class:'lead',text:D.promise}):null,D.meta?h('p',{class:'meta',text:[D.meta.speaker,D.meta.date,D.meta.place].filter(Boolean).join(' · ')}):null);
home.appendChild(hero);if(D.placeholder)home.appendChild(h('p',{class:'panel',text:'PLACEHOLDER BUILD — copy is still being prepared.'}));
if(D.intro?.length)home.appendChild(h('div',{class:'intro'},D.intro.map(function(t){return h('p',{text:t})})));home.appendChild(h('h2',{class:'section-title',text:'Explore the talks'}));
var pathList=h('ol',{class:'path'}),cards=[];D.stops.forEach(function(s,i){var card=h('li',{class:'stop'},h('a',{href:stopLink(s,i)},picture(s),h('div',{class:'copy'},h('span',{class:'number',text:('Talk ')+num(i)+' · '+s.lengthLabel}),h('h3',{text:s.title}),s.question?h('p',{text:s.question}):null,s.date?h('p',{text:s.date}):null)));if(D.mode==='gallery'&&s.slides)card.appendChild(h('div',{class:'copy'},h('a',{href:s.slides,text:'Slides'})));cards.push(card);pathList.appendChild(card)});home.appendChild(pathList);home.appendChild(h('div',{class:'section'},progressLabel,h('button',{type:'button',class:'linkbtn',text:'Reset progress',onclick:function(){progress={done:[],times:{}};persist()}})));app.appendChild(home);
var playView=h('section',{class:'container',hidden:true,id:'gallery-player'}),heading=h('h1',{class:'player-heading',tabindex:-1}),counter=h('p',{class:'meta'}),left=h('div',{class:'player-main'}),rail=h('ol',{class:'rail','aria-label':'Talks'}),railItems=[];playView.appendChild(h('a',{href:'#/',text:'← Back to '+('all talks')}));playView.appendChild(counter);playView.appendChild(heading);playView.appendChild(h('div',{class:'player-layout'},left,null));app.appendChild(playView);
D.stops.forEach(function(s,i){var a=h('a',{href:routeLink(i)},picture(s),h('span',{},h('small',{text:'Stop '+num(i)+' · '+s.lengthLabel}),s.title));railItems.push(a);rail.appendChild(h('li',{},a));players.push(makePlayer(s,i))});
function makePlayer(s,index){var D={duration:s.duration,captions:null,burnedCaptions:true},chapters=s.chapters,el=h('section',{hidden:true,'aria-label':s.title}),video=h('video',{playsinline:true,preload:'none',poster:s.thumbnailSrc},h('source',{src:s.videoSrc,type:'video/mp4'}));function seek(t,play){var go=function(){video.currentTime=t;if(play)video.play().catch(function(){})};if(video.readyState)go();else video.addEventListener('loadedmetadata',go,{once:true})}
${galleryPlayerScript}
video.defaultPlaybackRate=video.playbackRate;video.addEventListener('ratechange',function(){video.defaultPlaybackRate=video.playbackRate});
// These controls also expose every measured chapter through the shared seek bar.
var note=h('div',{class:'stop-note'},s.why?h('p',{text:s.why}):null,tryIt(s),links(s));el.appendChild(player);el.appendChild(note);left.appendChild(el);var savedAt=0;
video.addEventListener('timeupdate',function(){if(index!==current||Math.abs(video.currentTime-savedAt)<2)return;savedAt=video.currentTime;progress.times[s.id]=video.currentTime;persist()});
video.addEventListener('pause',function(){if(current===index&&!video.ended){progress.times[s.id]=video.currentTime;persist()}});
video.addEventListener('ended',function(){if(current!==index)return;if(progress.done.indexOf(s.id)<0)progress.done.push(s.id);progress.times[s.id]=0;persist();});return {el:el,video:video,seek:seek,picture:picture}}
function clearBridge(){if(timer)clearInterval(timer);timer=null;if(bridgeBox)bridgeBox.remove();bridgeBox=null;bridgePaused=false}
function go(i,autoplay){var hash=routeLink(i);if(location.hash!==hash){location.hash=hash;pendingPlay=autoplay}else enter(i,autoplay)}
function enter(i,autoplay){clearBridge();players.forEach(function(p,j){p.el.hidden=j!==i;if(j!==i)p.video.pause()});home.hidden=true;finish.hidden=true;playView.hidden=false;var changed=current!==i;current=i;progress.last=i;progress.started=true;persist();heading.textContent=D.stops[i].title;counter.textContent=('Talk ')+num(i)+' of '+D.stops.length+' · '+D.stops[i].lengthLabel;railItems.forEach(function(a,j){if(j===i)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current')});var p=players[i];if(changed){p.video.preload='metadata';p.video.load();if(progress.times[D.stops[i].id])p.seek(progress.times[D.stops[i].id],false);heading.focus({preventScroll:true});window.scrollTo(0,0)}if(autoplay)p.video.play().catch(function(){announce('Press Play to continue.')})}
var finish=h('section',{hidden:true});
function paintProgress(){cards.forEach(function(c,i){var done=progress.done.indexOf(D.stops[i].id)>-1;c.classList.toggle('done',done);if(railItems&&railItems[i])railItems[i].parentNode.classList.toggle('done',done)});progressLabel.textContent=progress.done.length+' of '+D.stops.length+' watched · progress stays in this browser';resume.hidden=!progress.started;resume.href=routeLink(Number.isInteger(progress.last)?progress.last:0)}
var pendingPlay=false;function route(){var match=location.hash.match(/^#\/(play|watch)\/(\d+)$/),i=match?Number(match[2])-1:-1;if(match&&i>=0&&i<players.length){enter(i,pendingPlay);pendingPlay=false;return}clearBridge();players.forEach(function(p){p.el.hidden=true;p.video.pause()});current=-1;home.hidden=false;finish.hidden=!home.hidden;playView.hidden=true;paintProgress()}
addEventListener('hashchange',route);route();})();`;
const html='<!doctype html>\n<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="'+esc(D.promise||D.title)+'"><title>'+esc(D.title)+'</title><style>'+css+'</style></head><body><a class="skip" href="#main">Skip to content</a><header class="topbar"><div class="topbar-in"><a class="brand" href="#/">'+esc('Talk series')+'</a><button class="icon-btn" id="theme-btn" type="button" aria-label="Switch theme"></button></div></header><main id="main" tabindex="-1"><div id="app"></div></main><footer class="site-footer"><div>'+(D.footer||[]).map(t=>'<p>'+esc(t)+'</p>').join('')+'</div></footer><div id="live" class="sr" aria-live="polite"></div><script>'+runtime+'</script></body></html>\n';
new Script(runtime); // Fail the build on invalid emitted browser JS.
save(path.join(out,'index.html'),html);
save(path.join(out,'build-info.json'),JSON.stringify({mode:D.mode,placeholder:D.placeholder,stops:D.stops.map(s=>({id:s.id,title:s.title,duration:s.duration,page:s.page})),source:path.basename(source)},null,2)+'\n');
console.log('Built '+D.mode+': '+D.stops.length+' stops -> '+out+(D.placeholder?' (PLACEHOLDER — do not deploy)':''));
