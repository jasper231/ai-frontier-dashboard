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
const driver=`(function(){function run(){const stages=[],preferenceChecks=[],choosePreference=${choosePreference.toString()},check=(ok,message)=>{if(!ok)throw Error(message);};
 try{const batch=JSON.parse(document.getElementById('news-snapshot').textContent),archive=JSON.parse(document.getElementById('briefing-snapshot').textContent),definitions=JSON.parse(document.getElementById('category-definitions').textContent),now=new Date().toISOString();
 function checkView(view){const active=document.querySelectorAll('.view-filters [aria-pressed=true]');check(active.length===1&&active[0].dataset.view===view,'Wrong active product view');check(!document.querySelector('[data-view="Today"],[data-view="Latest"]'),'Retired views still visible');
 if(view==='Daily Briefing'){const edition=FrontierBriefing.resolveEdition(archive,now);check(document.querySelector('[data-briefing-status]').dataset.briefingStatus===(edition?'published':'unpublished'),'Latest published edition mismatch');if(edition){check(document.querySelector('.brief-masthead h1').textContent.includes(edition.date),'Latest published date mismatch');check(document.querySelectorAll('.brief-story').length===edition.stories.length,'Editorial stories missing');document.querySelectorAll('.brief-story-sources a').forEach(a=>check(edition.sources.some(s=>s.url===a.getAttribute('href'))&&a.target==='_blank'&&a.rel==='noopener noreferrer','Briefing source link mismatch'));}stages.push({view,date:edition?.date,stories:edition?.stories.length||0});return;}
 const model=FrontierProduct.createModel(batch,definitions,view,now,archive);document.querySelectorAll('section.category').forEach(section=>check(JSON.stringify(Array.from(section.querySelectorAll('.card')).map(a=>a.dataset.itemId))===JSON.stringify(model.items.filter(i=>i.category===section.id).map(i=>i.id)),'Reviewed trends collection/order mismatch'));
 check(!document.querySelector('.signal'),'Duplicate raw signals in trends');document.querySelectorAll('.card').forEach(card=>{const item=model.items.find(i=>i.id===card.dataset.itemId);check(!!item,'Unbound trend item');for(const selector of ['.article-title-link','.article-source-link']){const a=card.querySelector(selector);check(a&&a.getAttribute('href')===item.sourceUrl&&a.target==='_blank'&&a.rel==='noopener noreferrer','Incorrect trend source URL');}});stages.push({view,cards:model.items.length});}
 checkView('Daily Briefing');for(const view of ['Long-term','Daily Briefing','Long-term']){document.querySelector('.view-filters [data-view="'+view+'"]').click();checkView(view);}
 const preferences=FrontierPreferences.controller,original=preferences.snapshot(),before=JSON.stringify(batch);
 for(const language of ['en','zh']){preferenceChecks.push(choosePreference(document,'language',language));check(document.documentElement.lang===(language==='zh'?'zh-CN':'en'),'Live language switch failed');const copy=FrontierI18n.dictionary(language);check(document.title===copy.pageTitle&&document.querySelector('meta[name=description]').content===copy.description,'Live metadata failed');check(document.querySelector('.intro p').textContent===copy.trendNote,'Trend explanatory UI not localized');checkView('Long-term');}
 for(const theme of ['light','dark','system']){preferenceChecks.push(choosePreference(document,'theme',theme));check(preferences.snapshot().themePreference===theme,'Live theme preference failed');if(theme!=='system')check(document.documentElement.dataset.theme===theme,'Live resolved theme failed');checkView('Long-term');}
 check(JSON.stringify(JSON.parse(document.getElementById('news-snapshot').textContent))===before,'Live interactions mutated news');preferences.setTheme(original.themePreference);preferences.setLanguage(original.languagePreference);
 const out=document.createElement('pre');out.id='live-verification-result';out.textContent=JSON.stringify({passed:true,stages,preferencesVerified:true,preferenceChecks});document.body.append(out);
 }catch(error){const out=document.createElement('pre');out.id='live-verification-result';out.textContent=JSON.stringify({passed:false,error:error.message,stages,preferenceChecks});document.body.append(out);}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0),{once:true});else setTimeout(run,0);})();`;
fs.writeFileSync('artifacts/live-browser-check.html',live.replace('</body>','<script>'+driver+'</script></body>'));
console.log(JSON.stringify(comparison,null,2));
