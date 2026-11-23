// Series assembly reuses the single-video compiler, including its timing/staleness gates.
import {readFileSync,writeFileSync,mkdirSync,existsSync,cpSync,rmSync,mkdtempSync,statSync,utimesSync,copyFileSync,readdirSync,renameSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {playerScript} from './companion-player.mjs';
const read=p=>readFileSync(p,'utf8'),json=p=>JSON.parse(read(p));
const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const encode=x=>JSON.stringify(x).replaceAll('<','\\u003c');
const acc=['green','blue','orange','violet'];
// Copy only an explicitly linked document and its local dependency graph.
function copyStudy(source,base,dest,seen=new Set()){
 if(seen.has(source))return;seen.add(source);
 const rel=path.relative(base,source);if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('Study dependency escapes base');
 const target=path.join(dest,rel);mkdirSync(path.dirname(target),{recursive:true});copyFileSync(source,target);
 if(!/\.(html?|css|svg)$/i.test(source))return;
 for(const m of read(source).matchAll(/(?:\b(?:href|src|poster)\s*=\s*["']([^"']+)["']|\burl\(\s*["']([^"']+)["']\s*\))/gi)){
  const ref=(m[1]||m[2]).replaceAll('&amp;','&');if(/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(ref))continue;
  const clean=decodeURIComponent(ref.split(/[?#]/)[0]);if(!clean||!path.extname(clean))continue;copyStudy(path.resolve(path.dirname(source),clean),base,dest,seen);
 }
}
export async function buildSeries({root,out,config,mediaBase}) {
 const parts=config.argument?.parts,videos=config.series?.videos;
 if(!parts?.length||!videos?.length)throw Error('Series requires videos and argument.parts');
 const ids=new Set();for(const v of videos){if(!/^[a-zA-Z0-9][\w-]*$/.test(v.id)||ids.has(v.id))throw Error('Invalid or duplicate video id');ids.add(v.id)}
 const partIds=new Set();for(const p of parts){if(!p.id||partIds.has(p.id))throw Error('Missing or duplicate part id');partIds.add(p.id);if(p.video&&!ids.has(p.video))throw Error('Unknown part video: '+p.video)}
 for(const v of videos)if(parts.filter(p=>p.video===v.id).length!==1)throw Error('Each video must belong to exactly one part: '+v.id);
 mkdirSync(out,{recursive:true});const scratch=mkdtempSync(path.join(out,'.series-build-'));let template,data;const compiled=[];
 try{
 for(const v of videos){
  const source=path.resolve(root,v.dir),stage=path.join(scratch,v.id);mkdirSync(stage);
  for(const n of ['kit','frames','assets','widgets','look.json','plan.json','scenes.json','cues.json','captions.vtt','chapters.txt'])if(existsSync(path.join(source,n)))cpSync(path.join(source,n),path.join(stage,n),{recursive:true,preserveTimestamps:true});
  const supplied=existsSync(path.join(source,'companion.json'))?json(path.join(source,'companion.json')):{};
  const outlineName=supplied.inputs?.outline||'outline.md',op=path.join(source,outlineName);let outline=read(op);const hasSections=/^## /m.test(outline),hasAuthoredChapters=existsSync(path.join(source,'chapters.txt'))&&read(path.join(source,'chapters.txt')).trim().length>0;
  const title=v.title||parts.find(p=>p.video===v.id).title;
  // Script-generated workshop outlines have only ### headings. Derive sections from
  // their measured chapter list, preserving the original screen IDs and mtimes.
  if(!/^## /m.test(outline)){
   const hints=existsSync(path.join(source,'chapters.txt'))?read(path.join(source,'chapters.txt')).split(/\r?\n/).flatMap(l=>{const m=l.match(/^(\d+:\d\d(?::\d\d)?)\s+(.+)$/);return m?[{start:m[1].split(':').reduce((n,x)=>n*60+Number(x),0),title:m[2]}]:[]}):[];
   const manifest=['plan.json','scenes.json'].find(n=>existsSync(path.join(source,n))),raw=manifest?json(path.join(source,manifest)):[];
   const scenes=(Array.isArray(raw)?raw:raw.scenes||[]).filter(s=>Number.isFinite(s.start));const headings=new Map();let prev=-1;
   for(const h of hints){let i=0;scenes.forEach((s,j)=>{if(Math.abs(s.start-h.start)<Math.abs(scenes[i].start-h.start))i=j});if(!scenes.length||Math.abs(scenes[i].start-h.start)>1.1||i<=prev)throw Error('Chapter timing mismatch: '+v.id);prev=i;headings.set(scenes[i].slideId||scenes[i].id,h.title)}
   outline=outline.split('\n').flatMap(l=>{const id=l.match(/^### .*\bid=([^\s}]+)/)?.[1];return id&&headings.has(id)?['## '+headings.get(id),'',l]:[l]}).join('\n');
   if(!/^## /m.test(outline))outline='## '+title+'\n\n'+outline;
  }
  writeFileSync(path.join(stage,'outline.md'),outline);const st=statSync(op);utimesSync(path.join(stage,'outline.md'),st.atime,st.mtime);
  const vf=supplied.video?.file||v.id+'-web.mp4';cpSync(path.join(source,vf),path.join(stage,path.basename(vf)),{preserveTimestamps:true});
  const input={...supplied,title,video:{...supplied.video,file:path.basename(vf)},inputs:{...supplied.inputs,outline:'outline.md'},screens:supplied.screens||{},furtherStudy:[],argument:{intro:''},footer:[],copy:config.copy||{}};
  writeFileSync(path.join(stage,'companion.json'),JSON.stringify(input));
  execFileSync(process.execPath,[path.join(scriptDir,'companion.mjs'),stage,'--out','page'],{stdio:['ignore','pipe','pipe']});
  const page=path.join(stage,'page'),html=read(path.join(page,'index.html'));
  const d=JSON.parse(html.match(/<script type="application\/json" id="companion-data">([\s\S]*?)<\/script>/)[1]);
  if(!template){template=html;data=d}
  const dest=path.join(out,'videos',v.id);mkdirSync(dest,{recursive:true});
  // No child HTML apps or duplicate MP4s: copy just the figures and widget dependencies.
  for(const n of ['figures','widgets'])if(existsSync(path.join(page,n))){rmSync(path.join(dest,n),{recursive:true,force:true});cpSync(path.join(page,n),path.join(dest,n),{recursive:true});}
  const figureNames=new Map();const figuresDir=path.join(dest,'figures');if(existsSync(figuresDir))readdirSync(figuresDir).sort().forEach((file,i)=>{const name='figure-'+String(i+1).padStart(4,'0')+path.extname(file);renameSync(path.join(figuresDir,file),path.join(figuresDir,name));figureNames.set('figures/'+file,'figures/'+name)});
  const prefix='videos/'+v.id+'/';
  for(const s of d.screens){s.id=v.id+'/'+s.id;s.video=v.id;if(s.states)for(const state of s.states)state.src=prefix+(figureNames.get(state.src)||state.src);if(s.widget)s.widget=prefix+s.widget}
  for(const ch of d.chapters){if(!hasSections&&!hasAuthoredChapters)ch.tick=false;ch.id=v.id+'/'+ch.id;ch.screens=ch.screens.map(id=>v.id+'/'+id)}
  d.id=v.id;d.title=title;
  const thumb=path.join(source,'thumbnail.jpg');if(!existsSync(thumb))throw Error('Missing title thumbnail: '+v.id);
  if(mediaBase){d.videoSrc=d.hasVideo?mediaBase+'/'+v.id+'.mp4':null;d.poster=mediaBase+'/'+v.id+'.jpg'}
  else{mkdirSync(path.join(out,'media'),{recursive:true});if(d.hasVideo)copyFileSync(path.join(source,vf),path.join(out,'media',v.id+'.mp4'));copyFileSync(thumb,path.join(out,'media',v.id+'.jpg'));d.videoSrc=d.hasVideo?'media/'+v.id+'.mp4':null;d.poster='media/'+v.id+'.jpg'}
  compiled.push(d);
 }
 const ordered=parts.filter(p=>p.video).map(p=>compiled.find(v=>v.id===p.video));
 const screens=compiled.flatMap(v=>v.screens);const chapters=parts.map((p,i)=>({id:p.id,title:p.title,accent:acc[i%4],start:null,video:p.video||null,screens:p.video?compiled.find(v=>v.id===p.video).screens.map(s=>s.id):[]}));
 chapters.forEach((ch,i)=>ch.screens.forEach(id=>{screens.find(s=>s.id===id).chapter=i}));
 const c={navHome:'Home',navVideo:'Video',navConcepts:'Key terms',navFigures:'Infographics',navResearch:'Apply',skip:'Skip to content',heroBadge:'',heroLead:'',ctaWatch:'Watch',ctaStep:'Key points',navArgument:'Key points',progressArgument:'Key points read ({n} of {total})',showInArgument:'Where the key points use it',ctaFigures:'Explore the infographics',questionsHeading:'Questions',progressHeading:'Your progress',progressNote:'Saved in this browser.',videoLabel:'Video',inProduction:'Video in production',timingNote:'Timing is awaiting verification.',transcriptHeading:'Transcript',searchTranscript:'Search transcript',followVideo:'Follow video',captionsLabel:'English',downloadVideo:'Download video',watchMoment:'Watch this moment',describeView:'Describe this view',listView:'List view',mapView:'Map view',...data.copy,...config.copy};
 c.cardVideo=c.navVideo;c.descVideo=config.copy?.descVideo||'{duration} · '+videos.length+' videos, with searchable transcripts';c.descReading=config.copy?.descReading||config.copy?.furtherIntro||c.descReading;
 if(c.furtherStudy)c.fullGuides=c.furtherStudy;
 // The session owns all prose. Only generic interface labels have defaults.
 Object.assign(c,{navHome:c.navHome||'Home',navVideo:c.navVideo||'Video',navConcepts:c.navConcepts||'Key terms',navResearch:c.navResearch||'Apply',navFigures:'Infographics',figuresHeading:'Infographics',cardFigures:'Infographics',heroBadge:c.heroBadge||'',ctaWatch:c.ctaWatch||'Watch',ctaStep:c.ctaStep||'Key points',heroLead:c.heroLead||c.description||'',questionsHeading:c.questionsHeading||'Questions',of:c.of||'of',watch:c.watch||'Watch',back:c.back||'Back',watchMoment:c.watchMoment||'Watch this moment'});
 const study=[];for(const link of config.furtherStudy||[]){const base=path.resolve(root,link.base||'.'),dest=link.destination||'study';if(path.isAbsolute(dest)||dest.split('/').includes('..'))throw Error('Invalid study destination');const src=path.resolve(base,link.file);if(!src.startsWith(base+path.sep))throw Error('Study source escapes base');copyStudy(src,base,path.join(out,dest));study.push({...link,href:dest+'/'+link.file})}
 data={...data,...config,id:config.title.toLowerCase().replace(/[^a-z0-9]+/g,'-'),copy:c,date:config.date||'',syntheticVoice:config.syntheticVoice||'',shortTitle:config.shortTitle||config.title,citation:config.citation||'',slidesUrl:config.series.slidesUrl||'',series:ordered,chapters,screens,hasVideo:ordered.some(v=>v.hasVideo),duration:ordered.reduce((n,v)=>n+(v.duration||0),0),poster:ordered[0].poster,videoSrc:null,transcript:[],concepts:config.concepts||[],conceptGroups:config.conceptGroups||[],reading:config.reading||((config.links||[]).length?{intro:config.copy?.furtherIntro||''}:null),guides:study.filter(s=>s.kind!=='figure').concat((config.links||[]).map(l=>({title:l.title,summary:l.summary||'',href:l.url}))),figures:study.filter(s=>s.kind==='figure'),footer:(config.footer||[]).map(line=>line.replace('{date}',config.date||'')),argument:{...config.argument,chapters:Object.fromEntries(parts.map(p=>[p.title,p]))}};
 // Reuse the app and style from the same single-video build. Changes below apply
 // only to this series document; single-video output remains byte-for-byte stable.
 let runtime=template.match(/<script>([\s\S]*?)<\/script>/)[1];
 const change=(a,b)=>{if(!runtime.includes(a))throw Error('Companion template changed: '+a.slice(0,60));runtime=runtime.replace(a,b)};
 change('function buildVideo(){','function buildSingleVideo(D,chapters){\n var video=null; function seek(t,play){seekElement(video,t,play)}');
 change('return {el:el,leave:function(){video.pause()},redraw:sync}', 'return {el:el,video:video,leave:function(){video.pause()},redraw:sync}');
 change('/* ---------- Argument ---------- */',seriesVideoRuntime+'\n/* ---------- Argument ---------- */');
 change('var ch=chapters[ci],a=ACC[ci%4],info=',"main.querySelectorAll('video').forEach(function(v){v.pause()});main.querySelectorAll('.part-player').forEach(function(p){if(p.dispose)p.dispose()}); var ch=chapters[ci],a=ACC[ci%4],info=");
 change("  var ol=h('ol',{class:'steps'}),partTerms=[];", "  if(ch.video){var vd=D.series.find(function(v){return v.id===ch.video});main.appendChild(partPlayer(vd,main));}\n  var ol=h('ol',{class:'steps'}),partTerms=D.concepts.filter(function(k){return (k.parts||[]).indexOf(ch.id)>-1});");
 change("   if(tf.length){left.appendChild", "   if(sc.start!=null&&ch.video){left.appendChild(h('button',{class:'btn btn-outline btn-sm',type:'button',text:C.watchMoment,onclick:function(){var v=main.querySelector('video');seekElement(v,sc.start,true);v.scrollIntoView({block:'center'})}}));}\n   if(tf.length){left.appendChild");
 change("  var pn=h('nav',{class:'pn'", "  if(info.tryIt)foot.appendChild(tryCard(info.tryIt));if(info.slides&&D.slidesUrl)foot.appendChild(h('p',{},h('a',{href:D.slidesUrl,target:'_blank',rel:'noopener',text:(C.slidesLabel||'Slides')+': '+info.slides})));if(info.activity){var act=(D.links||[]).find(function(l){return /activities/.test(l.url||'')});var number=info.activity.match(/^Activity (\\d+)/);foot.appendChild(h('p',{},act?h('a',{'aria-label':(C.activityLabel||'Activity')+': '+info.activity,href:act.url+(number?'#activity-'+number[1]:''),text:info.activity}):info.activity));}\n  var pn=h('nav',{class:'pn'");
 change("return {el:el,enter:function(r){var id=r.seg[0],ci=-1;", "return {el:el,leave:function(){main.querySelectorAll('video').forEach(function(v){v.pause()})},enter:function(r){var id=r.seg[0],ci=-1;");
 change("  if(D.hasVideo&&ch.start!=null)li.appendChild", "  if(ch.video){var vd=D.series.find(function(v){return v.id===ch.video});li.prepend(h('img',{src:vd.poster,alt:'',width:160,height:90,style:'max-width:100%;height:auto;border-radius:8px'}));li.appendChild(h('span',{class:'chip',text:fmt(vd.duration)}));}\n  if(D.hasVideo&&ch.start!=null)li.appendChild");
 change("h('p',{class:'lead',text:C.heroLead}),","h('p',{class:'lead',text:C.heroLead}),C.heroPrompt?tryCard({prompt:C.heroPrompt,heading:C.heroPromptHeading}):null,");
 change("function walkLinks(k){var ids=", "function walkLinks(k){var pl=(k.parts||[]).filter(function(id){return cById[id]}).map(function(id){return h('li',{},h('a',{href:alink(id),text:cById[id].title}))});var ids=");
 change("return ids.length?h('ul',{class:'walklinks'},ids.map", "return ids.length||pl.length?h('ul',{class:'walklinks'},pl,ids.map");
 
 // Scope keyboard handling to visible, connected players (part players are replaced).
 runtime=runtime.replaceAll('chapters.forEach(function(ch){track.appendChild','chapters.filter(function(ch){return ch.tick!==false}).forEach(function(ch){track.appendChild');
 runtime=runtime.replace("tl.appendChild(head);","tl.appendChild(head);if(!chapters.some(function(ch){return ch.tick!==false}))tl.hidden=true;");
 runtime=runtime.replaceAll('if(el.hidden)return;',"if(!el.isConnected||el.closest('[hidden]'))return;");
 new Script(runtime);
 let html=template.replace(/<script type="application\/json" id="companion-data">[\s\S]*?<\/script>/,()=>'<script type="application/json" id="companion-data">'+encode(data)+'</script>').replace(/<script>[\s\S]*?<\/script>/,()=>'<script>'+runtime+'</script>');
 html=html.replace(/(<a class="brand"[\s\S]*?<\/svg><\/span><span>)[\s\S]*?(<\/span><\/a>)/,(_,a,b)=>a+(config.shortTitle||config.title).replaceAll('&','&amp;').replaceAll('<','&lt;')+b);
 html=html.replace(/<title>[\s\S]*?<\/title>/,'<title>'+config.title.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</title>');
 if(config.agentGuide){
  const g=config.agentGuide,name=g.file||'agents.md',esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  writeFileSync(path.join(out,name),agentGuideMarkdown(config,ordered,g,root));
  html=html.replace('</head>','<link rel="alternate" type="text/markdown" href="'+esc(name)+'" title="Plain-text guide for AI agents"></head>');
  html=html.replace(/<body([^>]*)>/,(m)=>m+'<p hidden data-agent-note>'+esc(g.note||'For AI agents: a plain-text version of this page is at '+name+'.')+' <a href="'+esc(name)+'">'+esc(name)+'</a></p>');
 }
 writeFileSync(path.join(out,'index.html'),html);
 writeFileSync(path.join(out,'build-info.json'),JSON.stringify({mode:'series',placeholder:config.placeholder===true,videos:ordered.map(v=>({id:v.id,hasVideo:v.hasVideo,duration:v.duration})),parts:chapters.length},null,2)+'\n');
 console.log('Built series: '+ordered.length+' videos, '+parts.length+' parts -> '+out);
 }finally{rmSync(scratch,{recursive:true,force:true})}
}
// The plain-text guide: a hand-written preamble, then the key points generated from the parts.
function agentGuideMarkdown(config,ordered,g,root){
 const base=(g.baseUrl||'').replace(/\/?$/,'/'),pre=g.preamble?read(path.resolve(root,g.preamble)).trim()+'\n\n':'',byId=Object.fromEntries(ordered.map(v=>[v.id,v]));
 const lines=[pre+'## '+(config.copy?.navArgument||'Key points')+'\n'];
 config.argument.parts.forEach((p,i)=>{
  lines.push('### '+(i+1)+'. '+p.title+'\n',p.summary+'\n');
  if(p.video){const v=byId[p.video];lines.push('- Video: '+(v?.title||p.video)+(v?.duration?' ('+Math.round(v.duration/60)+' min)':'')+', '+base+'#/video/'+p.video)}
  lines.push('- On the page: '+base+'#/argument/'+p.id);
  if(p.activity)lines.push('- Exercise: '+p.activity);
  if(p.tryIt)lines.push('\nTry it:\n\n```prompt\n'+p.tryIt.prompt+'\n```\n\nYou will know it worked when '+p.tryIt.doneWhen.replace(/^./,c=>c.toLowerCase()));
  lines.push('');
 });
 return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim()+'\n';
}
const seriesVideoRuntime=String.raw`
function seekElement(video,t,play){if(!video||!Number.isFinite(t))return;function go(){video.currentTime=Math.max(0,t);if(play)video.play().catch(function(){})}if(video.readyState)go();else video.addEventListener('loadedmetadata',go,{once:true})}
function buildVideo(){
 var el=h('section',{class:'view',id:'view-series-video',hidden:true}),strip=h('div',{class:'series-strip',style:'display:flex;gap:12px;overflow:auto;margin-bottom:24px'}),body=h('div'),selected=-1,cache={};
 el.appendChild(strip);el.appendChild(body);
 D.series.forEach(function(v){strip.appendChild(h('a',{href:'#/video/'+v.id,style:'flex:0 0 150px;text-decoration:none'},h('img',{src:v.poster,alt:'',width:150,height:84,style:'border-radius:8px'}),h('span',{text:v.title})))});
 function select(i){if(i===selected)return;Object.values(cache).forEach(function(v){v.el.hidden=true;if(v.leave)v.leave()});selected=i;
  var d=D.series[i];if(!cache[i]){var v=buildSingleVideo(d,d.chapters);v.el.removeAttribute('id');v.el.className='series-video-item';var names={};v.el.querySelectorAll('[id]').forEach(function(e){names[e.id]='series-'+i+'-'+e.id;e.id=names[e.id]});[v.el].concat(Array.from(v.el.querySelectorAll('[aria-controls],[aria-labelledby]'))).forEach(function(e){['aria-controls','aria-labelledby'].forEach(function(a){var value=e.getAttribute(a);if(value)e.setAttribute(a,value.split(' ').map(function(id){return names[id]||id}).join(' '))})});cache[i]=v;body.appendChild(v.el);
   if(v.video)v.video.addEventListener('ended',function(){if(!v.el.querySelector('.next-video')&&D.series[i+1])v.el.appendChild(h('a',{class:'btn btn-primary next-video',href:'#/video/'+D.series[i+1].id,text:(C.nextVideo||'Next video')+': '+D.series[i+1].title}))});}
  cache[i].el.hidden=false;video=cache[i].video||null;[].forEach.call(strip.children,function(a,j){a.setAttribute('aria-current',String(j===i))});}
 return {el:el,enter:function(r){var i=D.series.findIndex(function(v){return v.id===r.seg[0]});select(i<0?0:i)},leave:function(){Object.values(cache).forEach(function(v){v.el.hidden=true;if(v.leave)v.leave()});selected=-1}};
}
function partPlayer(D,container){var chapters=D.chapters,el=h('section',{class:'part-player'}),video=h('video',{playsinline:true,preload:'metadata',poster:D.poster,src:D.videoSrc}),seek=function(t,p){seekElement(video,t,p)};
 var lifecycle=new AbortController();el.dispose=function(){lifecycle.abort()};function listen(target,event,fn){target.addEventListener(event,fn,{signal:lifecycle.signal})}
 if(!D.hasVideo)return h('p',{text:C.videoWithheld});
 if(D.captions&&!D.burnedCaptions)video.appendChild(h('track',{kind:'captions',src:D.captions,srclang:'en',label:'English'}));
 PLAYER
 // Associate popovers uniquely across the main and embedded players.
 ['video-speeds','video-shortcuts','video-more'].forEach(function(id){var n=player.querySelector('#'+id);if(n){n.id='part-'+D.id+'-'+id;player.querySelectorAll('[aria-controls="'+id+'"]').forEach(function(b){b.setAttribute('aria-controls',n.id)})}});
 el.appendChild(player);return el;
}
function tryCard(t){var quote=h('blockquote',{text:t.prompt,style:'white-space:pre-wrap;overflow-wrap:anywhere'}),b=h('button',{class:'btn btn-outline btn-sm',type:'button',text:C.copyPrompt||'Copy prompt',onclick:function(){function fallback(){var r=document.createRange();r.selectNodeContents(quote);getSelection().removeAllRanges();getSelection().addRange(r);b.textContent=document.execCommand('copy')?'Copied':'Select and copy prompt'}if(navigator.clipboard&&isSecureContext)navigator.clipboard.writeText(t.prompt).then(function(){b.textContent='Copied'},fallback);else fallback()}});return h('section',{class:'card',style:'padding:24px;margin:24px 0'},h('h2',{text:t.heading||C.tryIt||'Try it'}),quote,b,t.doneWhen?h('h3',{text:C.doneWhen||"You’ll know it worked when"}):null,t.doneWhen?h('p',{text:t.doneWhen}):null)}
`.replace('PLAYER',playerScript.replaceAll("document.addEventListener(","listen(document,").replaceAll("compact.addEventListener(","listen(compact,"));
