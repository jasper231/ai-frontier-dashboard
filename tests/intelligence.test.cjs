const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {analyzeBatch}=require('../src/lib/news/intelligence/engine.cjs');
const {createProvider}=require('../src/lib/news/intelligence/providers.cjs');
const {createView,validateBatch}=require('../src/lib/news/core.cjs');
const {renderDashboard}=require('../src/lib/news/render.cjs');
const {collect,prepareSnapshot,publishResult}=require('../src/lib/news/feeds/pipeline.cjs');
const fixture=require('./fixtures/intelligence/analysis.mock.json');
const local=require('../src/data/news.local.json');
const definitions=require('../src/data/categories.json');
const batch={...local,items:local.items.filter(i=>fixture.items.some(r=>r.id===i.id))};
const mock=response=>createProvider({mode:'mock',mockResponse:response??fixture});

test('batch analysis changes actual scores and text, preserves all provenance, and links evidence',async()=>{
 const before=JSON.stringify(batch),{batch:result,report}=await analyzeBatch(batch,{provider:mock()});
 assert.equal(report.status,'mock');assert.equal(report.analyzedCount,4);assert.equal(report.fallbackCount,0);
 assert.equal(JSON.stringify(batch),before);validateBatch(result);
 for(const item of result.items){const original=batch.items.find(i=>i.id===item.id);
  for(const key of ['id','title','category','source','sourceUrl','publishedAt','tags'])assert.deepEqual(item[key],original[key]);
  assert.equal(item.intelligence.origin,'mock');assert.ok(item.intelligence.opportunity);assert.ok(item.intelligence.risk);assert.ok(item.intelligence.credibility.assessment);
 }
 assert.equal(createView(result,definitions,'Latest',batch.asOf).signals[0].id,'ai-2');
 assert.equal(createView(result,definitions,'Long-term',batch.asOf).signals[0].id,'agents-1');
 const today=createView(result,definitions,'Today',batch.asOf);assert.ok(today.signals.every(i=>i.publishedAt.slice(0,10)===batch.asOf.slice(0,10)));
 assert.deepEqual(result.items.find(i=>i.id==='agents-1').intelligence.relatedNewsIds,['ai-2','chips-1']);
 const html=renderDashboard(createView({...result,isDemo:false},definitions,'Latest',batch.asOf));
 assert.ok(html.includes('Mock：推理成本值得优先跟踪'));assert.ok(html.includes('article-title-link'));assert.ok(!html.includes('Mock：建设执行评测和权限控制')); // Metadata does not change frozen UI.
});
test('rules mode is backward compatible; candidate budget preserves unprocessed records',async()=>{
 assert.deepEqual((await analyzeBatch(batch)).batch,batch);
 const {batch:result,report}=await analyzeBatch(batch,{provider:createProvider({mode:'mock'}),maxCandidates:1});
 assert.equal(result.items.length,batch.items.length);assert.equal(report.analyzedCount,1);assert.equal(report.fallbackCount,3);assert.equal(report.status,'partial');
 await assert.rejects(analyzeBatch(batch,{maxCandidates:0}),/budget/);
});
test('provider errors, missing keys, unknown configuration, malformed envelopes and timeouts fall back without exposing secrets',async()=>{
 const providers=[createProvider({mode:'openai'}),createProvider({mode:'openai',apiKey:'secret-must-not-be-reported'}),createProvider({mode:'invalid'}),mock({schemaVersion:2,items:[]}),mock({schemaVersion:1,items:null}),{id:'failure',kind:'ai',async analyze(){throw new Error('secret-must-not-be-reported');}}];
 for(const provider of providers){const result=await analyzeBatch(batch,{provider});assert.equal(result.report.status,'fallback');assert.deepEqual(result.batch,batch);assert.ok(!JSON.stringify(result).includes('secret-must-not-be-reported'));}
 let signal;const result=await analyzeBatch(batch,{provider:{id:'hung',kind:'ai',analyze(input,options){signal=options.signal;return new Promise(()=>{});}},timeoutMs:5});
 assert.equal(result.report.reason,'TIMEOUT');assert.ok(signal.aborted);assert.deepEqual(result.batch,batch);
});
test('invalid or omitted rows fall back individually, unknown IDs and identity overrides cannot forge sources',async()=>{
 const response=structuredClone(fixture);response.items[0].importance=101;response.items[1].sourceUrl='https://evil.example/';response.items[2].relatedNewsIds=['invented'];response.items.pop();
 const result=await analyzeBatch(batch,{provider:mock(response)});assert.equal(result.report.status,'partial');assert.equal(result.report.analyzedCount,1);assert.equal(result.report.invalidCount,2);
 assert.equal(result.batch.items.find(i=>i.id==='ai-2').sourceUrl,batch.items.find(i=>i.id==='ai-2').sourceUrl);
 for(const id of ['ai-1','agents-1','chips-1'])assert.deepEqual(result.batch.items.find(i=>i.id===id),batch.items.find(i=>i.id===id));
 for(const field of ['confidence','horizonYears','risk','evidenceIds','credibility']){
  const row=structuredClone(fixture.items[0]);row[field]=null;
  const failed=await analyzeBatch(batch,{provider:mock({schemaVersion:1,items:[row]})});assert.equal(failed.report.analyzedCount,0);
 }
 const unknown=await analyzeBatch(batch,{provider:mock({schemaVersion:1,items:[{...fixture.items[0],id:'invented'}]})});assert.deepEqual(unknown.batch,batch);
 const repeated=await analyzeBatch(batch,{provider:mock({schemaVersion:1,items:[fixture.items[0],fixture.items[0]]})});assert.equal(repeated.report.analyzedCount,0);
});
test('semantic dedup keeps a representative and remaps relations; cycles and uncertain claims preserve originals',async()=>{
 const response=structuredClone(fixture);response.items[0].duplicateOf='ai-2';response.items[0].evidenceIds.push('ai-2');response.items[2].relatedNewsIds.push('ai-1');response.items[2].evidenceIds.push('ai-1');
 const result=await analyzeBatch(batch,{provider:mock(response)});assert.equal(result.report.semanticDuplicatesRemoved,1);assert.equal(result.batch.items.length,3);assert.ok(!result.batch.items.some(i=>i.id==='ai-1'));
 assert.ok(!result.batch.items.find(i=>i.id==='agents-1').intelligence.relatedNewsIds.includes('ai-1'));
 response.items[1].duplicateOf='ai-1';response.items[1].evidenceIds.push('ai-1');
 assert.equal((await analyzeBatch(batch,{provider:mock(response)})).batch.items.length,4);
 response.items[1].duplicateOf=null;response.items[0].confidence=0.6;
 assert.equal((await analyzeBatch(batch,{provider:mock(response)})).report.semanticDuplicatesRemoved,0);
});
test('rule URL dedup precedes AI, requests include bounded raw evidence and resist provider mutation',async()=>{
 const duplicated={...batch,items:[...batch.items,{...batch.items[0],id:'tracked-duplicate',sourceUrl:batch.items[0].sourceUrl+'?utm_source=test'}]};
 const before=JSON.stringify(duplicated);let seen;
 const provider={id:'injected-test',kind:'ai',model:'test',async analyze(input){seen=input;input.candidates[0].tags.push('mutated');return fixture;}};
 const result=await analyzeBatch(duplicated,{provider,rawRecords:[{sourceUrl:batch.items[0].sourceUrl,content:'X'.repeat(6000)}]});
 assert.equal(result.report.ruleDuplicatesRemoved,1);assert.equal(JSON.stringify(duplicated),before);
 assert.equal(seen.candidates.find(i=>i.id===batch.items[0].id).excerpt.length,4000);
 assert.match(seen.systemPrompt,/untrusted evidence/);assert.equal(result.batch.items[0].intelligence.origin,'ai');
});
test('fixture RSS flows through the analysis layer; all-feed failure never overwrites last good data',async()=>{
 const sources=require('../src/data/feed-sources.json'),manifest=require('./fixtures/feeds/manifest.json');
 const result=await collect(sources.filter(s=>manifest[s.id]),s=>fs.readFileSync(path.join(__dirname,'fixtures/feeds',manifest[s.id]),'utf8'),{isDemo:true});
 const analyzed=await prepareSnapshot(result,{provider:createProvider({mode:'mock'})});assert.equal(analyzed.report.intelligence.analyzedCount,8);assert.equal(analyzed.batch.items.length,8);assert.equal(analyzed.rawRecords.length,10);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'frontier-ai-'));try{
  const file=path.join(tmp,'news.generated.json');fs.writeFileSync(file,'LAST_GOOD');assert.throws(()=>publishResult(analyzed,file),/synthetic/);
  assert.throws(()=>publishResult({...analyzed,batch:{...analyzed.batch,isDemo:false}},file),/mock analysis/);
  const failed=await prepareSnapshot(await collect(sources,async()=>{throw new Error('feed unavailable');}),{provider:createProvider({mode:'mock'})});
  assert.equal(publishResult(failed,file).written,false);assert.equal(fs.readFileSync(file,'utf8'),'LAST_GOOD');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('mock CLI is artifact-only, OpenAI stub makes no network calls, and static build embeds analyzed fields',async()=>{
 const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'frontier-ai-pages-'));
 const realFile=path.join(root,'src/data/news.generated.json'),before=fs.readFileSync(realFile,'utf8');
 const report=await require('../scripts/refresh-news.cjs').main({argv:['--fixtures','--ai-mock'],env:{},log:false});assert.equal(report.intelligence.status,'mock');assert.equal(fs.readFileSync(realFile,'utf8'),before);
 const previousFetch=globalThis.fetch;globalThis.fetch=()=>{throw new Error('Unexpected external request');};try{const r=await analyzeBatch(batch,{provider:createProvider({mode:'openai',apiKey:'unused'})});assert.equal(r.report.reason,'OPENAI_NOT_IMPLEMENTED');}finally{globalThis.fetch=previousFetch;}
 try{
  for(const folder of ['src','scripts','public'])fs.cpSync(path.join(root,folder),path.join(tmp,folder),{recursive:true});
  const result=await analyzeBatch({...batch,isDemo:false},{provider:mock()});fs.writeFileSync(path.join(tmp,'src/data/news.generated.json'),JSON.stringify(result.batch));
  const cwd=process.cwd();process.chdir(tmp);try{await import('file://'+path.join(tmp,'scripts/build-pages.mjs')+'?ai-test');}finally{process.chdir(cwd);}
  const html=fs.readFileSync(path.join(tmp,'dist/index.html'),'utf8');assert.ok(html.includes('Mock：推理成本值得优先跟踪'));assert.ok(html.includes('"importance":98'));assert.ok(html.includes('article-source-link'));assert.ok(!html.includes('unused'));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
