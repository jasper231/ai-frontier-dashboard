const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const core=require('../src/lib/briefing/core.cjs'),news=require('../src/lib/news/core.cjs'),renderer=require('../src/lib/news/render.cjs');
const {editionFor}=require('./fixtures/briefing/factory.cjs'),{prepare}=require('../scripts/prepare-briefing.cjs'),{publish}=require('../scripts/publish-briefing.cjs');
const local=require('../src/data/news.local.json'),definitions=require('../src/data/categories.json');
const batch={...local,isDemo:false,asOf:'2026-10-02T15:59:59Z'},edition=editionFor(batch),archive={schemaVersion:2,editions:[edition]};
const copy=()=>JSON.parse(JSON.stringify(edition));
test('bilingual editorial contract requires evidence, non-repeated prose, 2–4 opening sentences, variable selected events and 2–5 checks',()=>{
 assert.equal(core.validateEdition(edition),edition);
 const mutations=[e=>e.executiveOpening.pop(),e=>e.watchNext=[],e=>e.stories[0].title.en='',e=>e.stories[0].longTermView[0].kind='confirmed',e=>e.stories[0].verifiedFacts[0].evidenceIds=['unknown'],e=>e.stories[1].whyItMatters=e.stories[0].whyItMatters,e=>e.provenance.evidenceReviewed=false,e=>e.provenance.kind='synthetic',e=>e.stories[0].risks[0].text.zh='规则情景',e=>e.stories.push(...e.stories),e=>e.sources[0].url='javascript:alert(1)'];
 for(const mutate of mutations){const e=copy();mutate(e);assert.throws(()=>core.validateEdition(e));}
});
test('Beijing day/UTC provenance are preserved; missing, malformed, stale and future reports never turn into news-template briefings',()=>{
 const original=JSON.stringify(batch);assert.equal(core.bindSources(edition,batch),edition);assert.equal(JSON.stringify(batch),original);
 assert.equal(core.selectEdition(archive,batch.asOf),edition);assert.equal(core.selectEdition(archive,'2026-10-02T16:00:00Z'),null);assert.equal(core.selectEdition(archive,'2026-10-02T15:00:00Z'),null);
 assert.deepEqual(core.chooseArchive({bad:true}),core.empty());assert.equal(core.selectEdition({bad:true},batch.asOf),null);
 const e=copy();e.sources[0].publishedAt='2026-10-01T12:00:00Z';assert.throws(()=>core.validateEdition(e),/past-24-hour/);
 const changed=copy();changed.sources[0].url='https://example.org/forged';assert.throws(()=>core.bindSources(changed,batch),/source does not match/);
});
test('Briefing renders narrative paragraphs in the clear narrative reading order in Chinese/English; Latest stays a card feed',()=>{
 const model=news.createView(batch,definitions,'Daily Briefing',batch.asOf);
 for(const language of ['zh','en']){
  const html=renderer.renderDashboard(model,{language,briefing:archive});assert.match(html,language==='zh'?/AI &amp; 前沿简报/:/AI &amp; Frontier Briefing/);assert.ok(!html.includes('class="card"'));assert.ok(!html.includes('<dl>'));assert.ok(!html.includes('规则分析'));assert.ok(!html.includes('规则情景'));
  const fields=[...html.matchAll(/data-briefing-section="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(fields.slice(0,8),['verifiedFacts','sources','plainExplanation','example','whyItMatters','longTermView','opportunities','risks']);
  assert.equal((html.match(/class="brief-story"/g)||[]).length,3);assert.match(html,/brief-cross-analysis/);assert.match(html,/brief-watch/);assert.match(html,/brief-keyword/);assert.match(html,/target="_blank" rel="noopener noreferrer"/);
  const empty=renderer.renderDashboard(model,{language,briefing:core.empty()});assert.match(empty,/data-briefing-status="unpublished"/);assert.ok(!empty.includes('data-briefing-section'));assert.ok(!empty.includes(batch.items[0].whyItMatters));
 }
 const latest=renderer.renderDashboard(news.createView(batch,definitions,'Latest',batch.asOf),{briefing:archive});assert.match(latest,/class="card"/);assert.ok(!latest.includes('class="brief-reading"'));
 const fewer=copy();fewer.stories=fewer.stories.slice(0,1);assert.equal(core.validateEdition(fewer).stories.length,1);
});
test('unsafe authored text is escaped; facts and sources never become injected HTML',()=>{
 const e=copy();e.stories[0].title.en='<img src=x onerror=alert(1)>';e.executiveOpening[0].text.en='<script>attack</script>';
 const html=renderer.renderDashboard(news.createView(batch,definitions,'Daily Briefing',batch.asOf),{language:'en',briefing:{schemaVersion:2,editions:[e]}});assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('<script>attack'));assert.match(html,/&lt;script&gt;/);
});
test('Agent preparation contains evidence and ranking hints, not generated editorial judgments; import failures preserve last good archive',()=>{
 const before=JSON.stringify(batch),input=prepare(batch,batch.asOf);assert.equal(input.candidates.length,3);assert.equal(input.date,'2026-10-02');assert.ok(input.sources.every(source=>!Object.hasOwn(source,'whyItMatters')));assert.ok(input.candidates.every(candidate=>!Object.hasOwn(candidate,'whyItMatters')));assert.equal(JSON.stringify(batch),before);assert.throws(()=>prepare(local,local.asOf),/Real source/);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'briefing-import-')),output=path.join(temp,'briefing.generated.json');
 try{publish(edition,batch,output);const good=fs.readFileSync(output,'utf8');const bad=copy();bad.watchNext=[];assert.throws(()=>publish(bad,batch,output));assert.equal(fs.readFileSync(output,'utf8'),good);assert.equal(JSON.stringify(batch),before);assert.ok(!fs.existsSync(output+'.tmp'));}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('highlight selection has no fixed quota, keeps internal ordering private and omits empty optional sections',()=>{
 const many={...batch,items:batch.items.map((i,n)=>({...i,publishedAt:new Date(Date.parse(batch.asOf)-(n+1)*60000).toISOString()}))};
 for(const count of [2,7]){const e=editionFor(many,{count});core.validateEdition(e);const html=renderer.renderDashboard(news.createView(many,definitions,'Daily Briefing',many.asOf),{briefing:{schemaVersion:2,editions:[e]}});assert.equal((html.match(/class="brief-story"/g)||[]).length,count);}
 const e=copy();e.stories=e.stories.slice(0,1);delete e.stories[0].example;e.stories[0].opportunities=[];e.stories[0].risks=[];e.stories[0].relatedStoryIds=[];e.stories[0].internalRanking={importance:96,sourceQuality:90,longTermImportance:88};core.validateEdition(e);
 const html=require('../src/lib/briefing/render.cjs').renderBriefing({schemaVersion:2,editions:[e]},batch.asOf,'zh');for(const field of ['example','opportunities','risks','relatedStoryIds'])assert.ok(!html.includes('data-briefing-section="'+field+'"'));assert.ok(!/96|\/100|★|%/.test(html));
 const ranked=core.rankStories([{...e.stories[0],id:'low',order:1,internalRanking:{importance:30,sourceQuality:70,longTermImportance:40}},{...e.stories[0],id:'high',order:2}]);assert.equal(ranked[0].id,'high');assert.equal(ranked[0].order,1);
});
test('source links are defensive; independent confirmation needs reviewed distinct publishers; technical acronyms are explained',()=>{
 const render=require('../src/lib/briefing/render.cjs');for(const url of ['javascript:alert(1)','/relative','https://user:pass@example.org','not-url'])assert.ok(!render.sourceLink({name:'Test',type:'news',url},'zh').includes('<a'));
 assert.match(render.sourceLink({name:'Test',type:'official',url:'https://openai.com/news/real?a=1&b=2'},'zh'),/href="https:\/\/openai.com\/news\/real\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer"/);
 const e=copy(),story=e.stories[0];story.verification.independentlyConfirmed=true;assert.throws(()=>core.validateEdition(e),/independent confirmation/);
 const independent={...e.sources[0],id:'independent',name:'TechCrunch',url:'https://techcrunch.com/2026/10/02/test',publisher:'TechCrunch',type:'news',origin:'agent-enrichment',adapterId:'techcrunch',reviewedAt:batch.asOf};e.sources.push(independent);story.sources.push(independent);core.validateEdition(e);core.bindSources(e,batch,require('../src/lib/news/sources.cjs').registry);assert.ok(core.corroborated(story));
 independent.publisher=story.sources[0].publisher;assert.throws(()=>core.validateEdition(e),/independent confirmation/);independent.publisher='TechCrunch';
 story.plainExplanation.text.zh='MCP 帮助模型连接工具。';story.plainExplanation.text.en='MCP connects models to tools.';assert.throws(()=>core.validateEdition(e),/explain professional acronym/);story.keywords[0]={term:{zh:'MCP',en:'MCP'},explanation:{zh:'让 AI 与外部工具连接的一种标准',en:'a standard connecting AI to external tools'}};core.validateEdition(e);
 const zh=render.renderBriefing({schemaVersion:2,editions:[e]},batch.asOf,'zh');assert.match(zh,/MCP（让 AI 与外部工具连接的一种标准）/);assert.ok(!/Top Stories|Top Signals|What happened|Why it matters|Long-term impact|FIELD NOTES|PRIORITY/.test(zh));
 const en=render.renderBriefing({schemaVersion:2,editions:[e]},batch.asOf,'en');for(const label of ['Verified facts','Original sources','What this means','A concrete example','Why it matters','3–10 year view','Opportunities','Risks','Keywords','Related events','What to watch next'])assert.ok(en.includes(label));assert.ok(!/已验证事实|今日重点|原文来源|为什么重要/.test(en));
});
test('rolling 24-hour candidate window includes previous Beijing day and never truncates to ten',()=>{
 const asOf='2026-10-03T17:00:00Z',many={...batch,asOf,items:batch.items.map((i,n)=>({...i,publishedAt:new Date(Date.parse(asOf)-(n+1)*60000).toISOString()}))};many.items[0].publishedAt='2026-10-03T15:30:00Z';const input=prepare(many,asOf);assert.equal(input.candidates.length,15);assert.equal(input.noFixedQuota,true);assert.equal(input.date,'2026-10-04');assert.ok(input.candidates.some(c=>c.newsId===many.items[0].id));const e=editionFor(many,{count:7});e.stories[0].newsIds=[many.items[0].id];e.stories[0].sources=[input.sources.find(s=>s.id===many.items[0].id)];e.stories[0].verifiedFacts[0].evidenceIds=[many.items[0].id];e.sources.push(e.stories[0].sources[0]);assert.equal(core.validateEdition(e),e);
});
