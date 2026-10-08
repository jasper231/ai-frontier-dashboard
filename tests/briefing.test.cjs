const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const core=require('../src/lib/briefing/core.cjs'),news=require('../src/lib/news/core.cjs'),renderer=require('../src/lib/news/render.cjs');
const {editionFor}=require('./fixtures/briefing/factory.cjs'),{prepare}=require('../scripts/prepare-briefing.cjs'),{publish}=require('../scripts/publish-briefing.cjs');
const local=require('../src/data/news.local.json'),definitions=require('../src/data/categories.json');
const batch={...local,isDemo:false,asOf:'2026-10-02T15:59:59Z'},edition=editionFor(batch),archive={schemaVersion:1,editions:[edition]};
const copy=()=>JSON.parse(JSON.stringify(edition));
test('bilingual editorial contract requires evidence, non-repeated prose, 2–4 opening sentences, 1–5 stories and three checks',()=>{
 assert.equal(core.validateEdition(edition),edition);
 const mutations=[e=>e.executiveOpening.pop(),e=>e.watchNext.pop(),e=>e.stories[0].title.en='',e=>e.stories[0].yearView[0].kind='confirmed',e=>e.stories[0].confirmedFacts[0].evidenceIds=['unknown'],e=>e.stories[1].whyItMatters=e.stories[0].whyItMatters,e=>e.provenance.evidenceReviewed=false,e=>e.provenance.kind='synthetic',e=>e.stories[0].risks[0].text.zh='规则情景',e=>e.stories.push(...e.stories),e=>e.sources[0].sourceUrl='javascript:alert(1)'];
 for(const mutate of mutations){const e=copy();mutate(e);assert.throws(()=>core.validateEdition(e));}
});
test('Beijing day/UTC provenance are preserved; missing, malformed, stale and future reports never turn into news-template briefings',()=>{
 const original=JSON.stringify(batch);assert.equal(core.bindSources(edition,batch),edition);assert.equal(JSON.stringify(batch),original);
 assert.equal(core.selectEdition(archive,batch.asOf),edition);assert.equal(core.selectEdition(archive,'2026-10-02T16:00:00Z'),null);assert.equal(core.selectEdition(archive,'2026-10-02T15:00:00Z'),null);
 assert.deepEqual(core.chooseArchive({bad:true}),core.empty());assert.equal(core.selectEdition({bad:true},batch.asOf),null);
 const e=copy();e.sources[0].publishedAt='2026-10-01T12:00:00Z';assert.throws(()=>core.validateEdition(e),/same-day/);
 const changed=copy();changed.sources[0].sourceUrl='https://example.org/forged';assert.throws(()=>core.bindSources(changed,batch),/source does not match/);
});
test('Briefing renders narrative paragraphs in the same six-section order in Chinese/English; Latest stays a card feed',()=>{
 const model=news.createView(batch,definitions,'Daily Briefing',batch.asOf);
 for(const language of ['zh','en']){
  const html=renderer.renderDashboard(model,{language,briefing:archive});assert.match(html,/AI &amp; Frontier Briefing/);assert.ok(!html.includes('class="card"'));assert.ok(!html.includes('<dl>'));assert.ok(!html.includes('规则分析'));assert.ok(!html.includes('规则情景'));
  const fields=[...html.matchAll(/data-briefing-section="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(fields.slice(0,5),['confirmedFacts','whyItMatters','yearView','opportunities','risks']);
  assert.equal((html.match(/class="brief-story"/g)||[]).length,3);assert.match(html,/brief-cross-analysis/);assert.match(html,/brief-watch/);assert.match(html,/brief-keyword/);assert.match(html,/target="_blank" rel="noopener noreferrer"/);
  const empty=renderer.renderDashboard(model,{language,briefing:core.empty()});assert.match(empty,/data-briefing-status="unpublished"/);assert.ok(!empty.includes('data-briefing-section'));assert.ok(!empty.includes(batch.items[0].whyItMatters));
 }
 const latest=renderer.renderDashboard(news.createView(batch,definitions,'Latest',batch.asOf),{briefing:archive});assert.match(latest,/class="card"/);assert.ok(!latest.includes('class="brief-reading"'));
 const fewer=copy();fewer.stories=fewer.stories.slice(0,1);assert.equal(core.validateEdition(fewer).stories.length,1);
});
test('unsafe authored text is escaped; facts and sources never become injected HTML',()=>{
 const e=copy();e.stories[0].title.en='<img src=x onerror=alert(1)>';e.executiveOpening[0].text.en='<script>attack</script>';
 const html=renderer.renderDashboard(news.createView(batch,definitions,'Daily Briefing',batch.asOf),{language:'en',briefing:{schemaVersion:1,editions:[e]}});assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('<script>attack'));assert.match(html,/&lt;script&gt;/);
});
test('Agent preparation contains evidence and ranking hints, not generated editorial judgments; import failures preserve last good archive',()=>{
 const before=JSON.stringify(batch),input=prepare(batch,batch.asOf);assert.equal(input.candidates.length,3);assert.equal(input.date,'2026-10-02');assert.ok(input.sources.every(source=>!Object.hasOwn(source,'whyItMatters')));assert.ok(input.candidates.every(candidate=>!Object.hasOwn(candidate,'whyItMatters')));assert.equal(JSON.stringify(batch),before);assert.throws(()=>prepare(local,local.asOf),/Real source/);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'briefing-import-')),output=path.join(temp,'briefing.generated.json');
 try{publish(edition,batch,output);const good=fs.readFileSync(output,'utf8');const bad=copy();bad.watchNext=[];assert.throws(()=>publish(bad,batch,output));assert.equal(fs.readFileSync(output,'utf8'),good);assert.equal(JSON.stringify(batch),before);assert.ok(!fs.existsSync(output+'.tmp'));}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
