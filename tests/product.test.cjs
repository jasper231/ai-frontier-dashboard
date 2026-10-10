const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const product=require('../src/lib/news/product.cjs'),brief=require('../src/lib/briefing/core.cjs'),renderer=require('../src/lib/news/render.cjs');
const batch=require('../src/data/news.generated.json'),archive=require('../src/data/briefing.generated.json'),definitions=require('../src/data/categories.json');
const now='2026-10-11T02:00:00Z';
test('only two visible views; default remains latest reviewed edition after publication day',()=>{
 assert.deepEqual(product.mainViews,['Daily Briefing','Long-term']);
 const model=product.createModel(batch,definitions,'Daily Briefing',now,archive),html=renderer.renderDashboard(model,{briefing:archive});
 assert.doesNotMatch(html,/data-view="(?:Today|Latest)"/);assert.match(html,/data-view="Daily Briefing" aria-pressed="true"/);
 assert.match(html,/｜2026-10-09/);assert.match(html,/往期简报/);assert.match(html,/data-edition-date="2026-10-09"/);
 assert.equal(brief.resolveEdition(archive,now).date,'2026-10-09');
 assert.equal(brief.resolveEdition(archive,now,'2026-10-09').stories,archive.editions[0].stories);
 assert.equal(brief.resolveEdition(archive,'2026-10-08T00:00:00Z'),null);
});
test('publishing October 10 appends history; October 8 and 9 narratives and evidence stay identical',()=>{
 const {publish}=require('../scripts/publish-briefing.cjs'),{editionFor}=require('./fixtures/briefing/factory.cjs');
 const local=require('../src/data/news.local.json'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'frontier-archive-')),file=path.join(tmp,'archive.json');
 try{const saved=new Map();for(const day of ['08','09','10']){const fixture={...local,isDemo:false,asOf:`2026-10-${day}T02:00:00Z`,items:local.items.map((i,n)=>({...i,publishedAt:`2026-10-${day}T01:${String(n).padStart(2,'0')}:00Z`}))};
 const edition=editionFor(fixture);const next=publish(edition,fixture,file);saved.set(edition.date,JSON.stringify(next.editions.find(e=>e.date===edition.date)));
 for(const [date,original] of saved)assert.equal(JSON.stringify(brief.resolveEdition(next,now,date)),original);
 }const all=JSON.parse(fs.readFileSync(file));assert.equal(all.editions.length,3);assert.equal(brief.resolveEdition(all,now).date,'2026-10-10');assert.equal(brief.resolveEdition(all,now,'2026-10-08').date,'2026-10-08');}
 finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('reviewed bilingual trend overlays explain facts without mutating raw news or approved prose',()=>{
 const raw=JSON.stringify(batch),approved=JSON.stringify(archive),items=product.trends(batch,archive,now);
 assert.equal(items.length,3);assert.ok(items.every(product.completeZh));
 for(const item of items){const story=archive.editions.flatMap(e=>e.stories).find(s=>s.newsIds.includes(item.id));assert.equal(item.titleZh,story.title.zh);assert.equal(item.titleEn,story.title.en);assert.equal(item.plainExplanationZh,story.plainExplanation.text.zh);assert.equal(item.longTermImpactZh,story.longTermView.map(p=>p.text.zh).join('\n\n'));assert.ok(story.sources.some(s=>s.url===item.sourceUrl));}
 for(const language of ['zh','en']){const html=renderer.renderDashboard(product.createModel(batch,definitions,'Long-term',now,archive),{language,briefing:archive});assert.doesNotMatch(html,/data-view="(?:Today|Latest)"/);assert.match(html,language==='zh'?/这是什么意思/:/What this means/);assert.match(html,language==='zh'?/关键词/:/Keywords/);for(const item of items)assert.ok(html.includes('href="'+item.sourceUrl+'"'));}
 assert.equal(JSON.stringify(batch),raw);assert.equal(JSON.stringify(archive),approved);
 const fallback=product.createModel({...batch,isDemo:true},definitions,'Long-term',now,archive);assert.equal(fallback.isDemo,true);assert.match(renderer.renderDashboard(fallback,{briefing:archive}),/尚无真实更新/);assert.match(renderer.renderDashboard(fallback,{briefing:archive}),/class="article-title-link"/);
 const englishOnly={...batch,items:[{...batch.items[0],titleZh:undefined}]};assert.deepEqual(product.trends(englishOnly,brief.empty(),now),[]);
 const localized={...batch.items[0],titleZh:'芯片的新变化',summaryZh:'已确认的中文事实',whyItMattersZh:'具体变化机制',longTermImpactZh:'如果成本下降，则可能出现新的部署方式',tagsZh:['本地计算'],horizonYears:5,longTermImportance:85};
 assert.equal(product.trends({...batch,items:[localized]},brief.empty(),now).length,1);assert.equal(product.trends({...batch,items:[{...localized,summaryZh:'English only'}]},brief.empty(),now).length,0);
});
test('view/date deep links round-trip without requiring server routing',()=>{
 assert.deepEqual(product.readLocation({hash:'#view=briefing&date=2026-10-09'}),{view:'Daily Briefing',editionDate:'2026-10-09'});
 const env={location:{hash:''},history:{pushState(a,b,hash){env.location.hash=hash;}}};product.writeLocation(env,'Long-term','2026-10-09');assert.deepEqual(product.readLocation(env.location),{view:'Long-term',editionDate:'2026-10-09'});
 assert.equal(product.readLocation({hash:'#view=Latest&date=invalid'}).view,'Daily Briefing');assert.doesNotThrow(()=>product.writeLocation({location:{hash:''},history:{pushState(){throw Error('blocked');}}},'Long-term'));
});
test('mobile scroll threshold, reverse reveal, menu lock, focus, top reset and cleanup',()=>{
 const listeners=new Map(),toolbar={dataset:{}},state={open:false};
 const root={querySelector(selector){return selector==='.brief-toolbar'?toolbar:state.open?{}:null;},addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name){listeners.delete(name);}};
 const env={scrollY:0,matchMedia(){return {matches:true,addEventListener(){},removeEventListener(){}};},addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name){listeners.delete(name);}};
 const reader=require('../src/lib/news/reading-controls.cjs').attach(root,env),scroll=y=>{env.scrollY=y;listeners.get('scroll')();};
 scroll(1000);assert.equal(toolbar.dataset.readerHidden,'true');scroll(999);scroll(1001);scroll(998);assert.equal(toolbar.dataset.readerHidden,'true');scroll(988);assert.equal(toolbar.dataset.readerHidden,'false');
 state.open=true;scroll(1500);assert.equal(toolbar.dataset.readerHidden,'false');state.open=false;scroll(1510);assert.equal(toolbar.dataset.readerHidden,'true');
 listeners.get('focusin')({target:{closest(){return {};}}});assert.equal(toolbar.dataset.readerHidden,'false');scroll(5);assert.equal(toolbar.dataset.readerHidden,'false');reader.dispose();assert.equal(listeners.size,0);
 const css=fs.readFileSync('src/app/globals.css','utf8');assert.match(css,/transition: transform 180ms/);assert.match(css,/prefers-reduced-motion: reduce\) \{ \.brief-toolbar \{ transition: none/);
});

test('Radar refresh and published Briefing dates remain independent across Shanghai midnight',()=>{
 const fresh={...batch,isDemo:false,asOf:'2026-10-09T22:08:58Z'},asOf='2026-10-10T15:00:00Z';
 const render=(view,at=asOf,a=archive,date)=>renderer.renderDashboard(product.createModel(fresh,definitions,view,at,a),{briefing:a,editionDate:date});
 const briefingHtml=render('Daily Briefing'),radarHtml=render('Long-term');
 assert.match(briefingHtml,/本期简报：2026-10-09/);assert.match(briefingHtml,/今日简报尚未发布，当前显示上一期：2026-10-09/);
 assert.match(briefingHtml,/data-briefing-coverage/);assert.doesNotMatch(briefingHtml,/data-radar-updated|新闻雷达更新|最后更新/);
 assert.match(radarHtml,/新闻雷达更新：2026-10-10 06:08 北京时间/);assert.doesNotMatch(radarHtml,/本期简报|data-briefing-pending/);
 // 16:00 UTC starts the next Shanghai day; refresh time is not publication time.
 assert.equal(product.briefingStatus(archive,'2026-10-09T15:59:59Z').todayPublished,true);
 assert.equal(product.briefingStatus(archive,'2026-10-09T16:00:00Z').todayPublished,false);
 assert.doesNotMatch(render('Daily Briefing','2026-10-09T15:59:59Z'),/data-briefing-pending/);
 const next={...archive.editions[0],date:'2026-10-10',generatedAt:new Date(Date.parse(archive.editions[0].generatedAt)+86400000).toISOString(),sources:archive.editions[0].sources.map(s=>({...s,publishedAt:new Date(Date.parse(s.publishedAt)+86400000).toISOString()}))},both={...archive,editions:[...archive.editions,next]};
 assert.match(render('Daily Briefing',asOf,both),/本期简报：2026-10-10/);assert.doesNotMatch(render('Daily Briefing',asOf,both),/data-briefing-pending/);
 const historical=render('Daily Briefing',asOf,both,'2026-10-09');assert.match(historical,/本期简报：2026-10-09/);assert.doesNotMatch(historical,/data-briefing-pending/);
 const english=renderer.renderDashboard(product.createModel(fresh,definitions,'Daily Briefing',asOf,archive),{briefing:archive,language:'en'});assert.match(english,/Briefing edition: 2026-10-09/);assert.match(english,/Today’s briefing has not been published/);
});
