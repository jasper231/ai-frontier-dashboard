/* Read-only verification of the downloaded production static artifact. */
const fs=require('node:fs');const crypto=require('node:crypto');
const {choosePreference}=require('./live-preferences.cjs');
const live=fs.readFileSync('artifacts/live-pages.html','utf8');
const expected=fs.readFileSync('dist/index.html','utf8');
const scripts=html=>[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
const executable=html=>scripts(html).filter(s=>!s[1].includes('application/json')).map(s=>s[2]).join('\n').trim();
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const data=scripts(live).find(s=>/id=["']news-snapshot["']/.test(s[1]));
if(!data)throw new Error('Production HTML has no embedded news snapshot');
const batch=JSON.parse(data[2]);

const styles=html=>[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n').trim();
const comparison={url:'https://jasper231.github.io/ai-frontier-dashboard/',capturedAt:new Date().toISOString(),liveHtmlHash:hash(live),expectedHtmlHash:hash(expected),wholeHtmlEqual:live===expected,executableScriptsEqual:executable(live)===executable(expected),liveScriptHash:hash(executable(live)),expectedScriptHash:hash(executable(expected)),liveItems:batch.items.length,stylesEqual:styles(live)===styles(expected),note:'Whole HTML may differ because news snapshots differ. Script equality compares executable code only.'};
fs.writeFileSync('artifacts/live-comparison.json',JSON.stringify(comparison,null,2));
if(!comparison.executableScriptsEqual||!comparison.stylesEqual)throw new Error('Production code/styles do not match this build');
if(/<script[^>]*\bsrc\s*=/.test(live))throw new Error('Production artifact uses external scripts; mirrored inline-only check cannot verify it');
const driver=`(function(){function run(){let stages=[],preferenceChecks=[];const choosePreference=${choosePreference.toString()};const fail=m=>{throw new Error(m)};const check=(ok,m)=>{if(!ok)fail(m);};
try{const batch=JSON.parse(document.getElementById('news-snapshot').textContent),now=Date.now(),day=new Date(now+8*3600000).toISOString().slice(0,10);const eligible=batch.items.filter(i=>Date.parse(i.publishedAt)<=now);
 const latest=(a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||b.importance-a.importance||a.id.localeCompare(b.id);
 const important=(a,b)=>b.importance-a.importance||latest(a,b);
 const long=(a,b)=>b.longTermImportance-a.longTermImportance||important(a,b);
 function checkView(view){const active=document.querySelectorAll('[data-view][aria-pressed="true"]');check(active.length===1&&active[0].getAttribute('data-view')===view,'Wrong active view after '+view);
  if(view==='Daily Briefing'){
   const archive=JSON.parse(document.getElementById('briefing-snapshot').textContent),edition=globalThis.FrontierBriefing.selectEdition(archive,new Date(now).toISOString());
   check(document.querySelectorAll('.category .card,article.signal').length===0,'Briefing still renders news cards');
   check(document.querySelector('[data-briefing-status]').getAttribute('data-briefing-status')===(edition?'published':'unpublished'),'Briefing publication state mismatch');
   if(edition){const ids=Array.from(document.querySelectorAll('.brief-story')).map(s=>s.getAttribute('data-story-id'));check(JSON.stringify(ids)===JSON.stringify(edition.stories.map(s=>s.id)),'Briefing editorial story selection differs');check(document.querySelectorAll('#brief-watch li').length===3,'Briefing validation points missing');check(!!document.querySelector('#brief-keyword'),'Briefing keyword missing');}
   stages.push({view,stories:edition?.stories.length||0,publicationState:edition?'published':'unpublished'});return;
  }
  let items=view==='Daily Briefing'?globalThis.FrontierData.dailyBriefing(eligible,new Date(now).toISOString()):view==='Today'?eligible.filter(i=>new Date(Date.parse(i.publishedAt)+8*3600000).toISOString().slice(0,10)===day).sort(important):view==='Long-term'?eligible.filter(i=>i.horizonYears>=3&&i.horizonYears<=10).sort(long):[...eligible].sort(latest);
  document.querySelectorAll('section.category').forEach(section=>{const wanted=items.filter(i=>i.category===section.id).map(i=>i.id),found=Array.from(section.querySelectorAll('article.card')).map(e=>e.getAttribute('data-item-id'));check(JSON.stringify(wanted)===JSON.stringify(found),'Wrong card collection/order: '+view+' / '+section.id);});
  const wantedSignals=[...items].sort(view==='Long-term'?long:important).slice(0,3).map(i=>i.id),foundSignals=Array.from(document.querySelectorAll('article.signal')).map(e=>e.getAttribute('data-item-id'));check(JSON.stringify(wantedSignals)===JSON.stringify(foundSignals),'Top Signals do not follow '+view);
  if(!batch.isDemo)document.querySelectorAll('article.card,article.signal').forEach(article=>{const item=batch.items.find(i=>i.id===article.getAttribute('data-item-id'));let valid=false;try{const url=new URL(item.sourceUrl);valid=/^https?:\\/\\//i.test(item.sourceUrl)&&!url.username&&!url.password;}catch{}const title=article.querySelector('h3 a'),footer=article.querySelector('.article-source-link');if(valid){check(!!title&&!!footer,'Missing title/footer external link');[title,footer].forEach(a=>check(a.getAttribute('href')===item.sourceUrl.trim()&&a.target==='_blank'&&a.rel==='noopener noreferrer','Incorrect official URL or new-tab attributes'));}else check(!title&&!footer,'Invalid URL is clickable');});
  stages.push({view,cards:items.length,signals:foundSignals});}
 if(!batch.isDemo){const beijing=new Date(Date.parse(batch.asOf)+8*3600000).toISOString().slice(0,16).replace('T',' ');const copy=globalThis.FrontierI18n.dictionary(document.documentElement.lang==='en'?'en':'zh');check(document.querySelector('.demo-note').textContent.startsWith(copy.updated+'：'+beijing+' '+copy.beijing),'Last update is not Beijing time first');}
 checkView('Latest');['Today','Long-term','Daily Briefing','Latest'].forEach(view=>{const button=document.querySelector('[data-view="'+view+'"]');check(!!button,'Missing view button');button.click();checkView(view);});
 const preferences=globalThis.FrontierPreferences.controller;
 const before=JSON.stringify(batch),original=preferences.snapshot();
 ['en','zh'].forEach(language=>{preferenceChecks.push(choosePreference(document,'language',language));check(document.documentElement.lang===(language==='zh'?'zh-CN':'en'),'Language change failed on production');const copy=globalThis.FrontierI18n.dictionary(language);check(document.title===copy.pageTitle&&document.querySelector('meta[name="description"]').content===copy.description,'Production metadata did not change');check(document.querySelector('.intro p').textContent===copy.tagline,'Production UI did not translate');Object.assign(preferenceChecks[preferenceChecks.length-1],{actualPreference:preferences.snapshot().languagePreference,resolvedLanguage:preferences.snapshot().language});checkView('Latest');});
 ['light','dark','system'].forEach(theme=>{preferenceChecks.push(choosePreference(document,'theme',theme));check(preferences.snapshot().themePreference===theme,'Production theme preference did not switch');if(theme!=='system')check(document.documentElement.dataset.theme===theme,'Production resolved theme mismatch');const actual=preferences.snapshot();Object.assign(preferenceChecks[preferenceChecks.length-1],{actualPreference:actual.themePreference,resolvedTheme:actual.theme});checkView('Latest');});
 check(JSON.stringify(JSON.parse(document.getElementById('news-snapshot').textContent))===before,'Preference changes modified news data');
 preferences.setTheme(original.themePreference);preferences.setLanguage(original.languagePreference);
 const out=document.createElement('pre');out.id='live-verification-result';out.textContent=JSON.stringify({passed:true,stages,preferencesVerified:true,preferenceChecks});document.body.append(out);
}catch(error){const out=document.createElement('pre');out.id='live-verification-result';out.textContent=JSON.stringify({passed:false,error:error.message,stages,preferenceChecks});document.body.append(out);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0),{once:true});else setTimeout(run,0);})();`;
fs.writeFileSync('artifacts/live-browser-check.html',live.replace('</body>','<script>'+driver+'</script></body>'));
console.log(JSON.stringify(comparison,null,2));
