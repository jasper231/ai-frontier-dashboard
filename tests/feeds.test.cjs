const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const {parseFeed}=require('../src/lib/news/feeds/parser.cjs');
const {normalize,deduplicate}=require('../src/lib/news/feeds/normalizer.cjs');
const {collect,publishResult}=require('../src/lib/news/feeds/pipeline.cjs');
const {chooseSnapshot}=require('../src/lib/news/snapshot.cjs');
const sources=require('../src/data/feed-sources.json');const manifest=require('./fixtures/feeds/manifest.json');const local=require('../src/data/news.local.json');
const fixture=s=>fs.readFileSync(path.join(__dirname,'fixtures/feeds',manifest[s.id]),'utf8');
test('RSS, Atom, RDF namespaces, CDATA, XHTML and alternate links parse',()=>{
 for(const source of sources.filter(s=>manifest[s.id])){
  const parsed=parseFeed(fixture(source),source.url);assert.equal(parsed.errors.length,0);assert.ok(parsed.records.length);
  assert.ok(parsed.records.every(r=>r.title&&r.sourceUrl&&r.publishedAt));
 }
 const hf=sources.find(s=>s.id==='huggingface'),rows=parseFeed(fixture(hf),hf.url).records;
 assert.equal(rows[1].sourceUrl,'https://huggingface.co/__fixture__/multimodal');assert.ok(!rows[1].content.includes('<p>'));
 const ar=sources.find(s=>s.id==='arxiv-ai');assert.ok(!parseFeed(fixture(ar),ar.url).records[0].content.includes('unsafe()'));
});
test('malformed XML, DTDs, missing original dates and invalid namespaces fail safely',()=>{
 assert.throws(()=>parseFeed('<rss><item></rss>','https://openai.com'));
 assert.throws(()=>parseFeed('<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>','https://openai.com'));
 assert.throws(()=>parseFeed('<html><body>403</body></html>','https://openai.com'));
 const parsed=parseFeed('<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Test</title><link href="https://openai.com/test"/><updated>2026-10-02T00:00:00Z</updated></entry></feed>','https://openai.com');
 assert.equal(parsed.records.length,0);assert.equal(parsed.errors.length,1);
});
test('normalization keeps original URL, date instant and source; classifies GPU, robots, agents and crypto',()=>{
 const source=sources.find(s=>s.id==='openai');
 const raw={title:'Introducing agent tool calling',sourceUrl:'https://openai.com/test?utm_source=feed',publishedAt:'Fri, 02 Oct 2026 08:00:00 GMT',content:'Test'};
 const item=normalize(raw,source);assert.equal(item.category,'agents');assert.equal(item.sourceUrl,raw.sourceUrl);assert.equal(item.publishedAt,'2026-10-02T08:00:00.000Z');assert.equal(item.source,'OpenAI');
 for(const [title,category] of [['GPU chip release','chips'],['Humanoid robotics research','robotics'],['USDC stablecoin settlement','crypto']])assert.equal(normalize({...raw,title},source).category,category);
 assert.throws(()=>normalize({...raw,sourceUrl:'https://openai.com.evil.test/post'},source));
 assert.throws(()=>normalize({...raw,publishedAt:'invalid'},source));
});
test('dedup removes tracking duplicates and exact headline same-day syndication',()=>{
 const source=sources.find(s=>s.id==='openai');const raw={title:'A long identical official announcement headline',sourceUrl:'https://openai.com/post',publishedAt:'2026-10-02T08:00:00Z',content:'Test'};
 const a=normalize(raw,source),b=normalize({...raw,sourceUrl:raw.sourceUrl+'?utm_source=test#anchor'},source),c=normalize({...raw,sourceUrl:'https://openai.com/syndicated'},source);
 assert.equal(deduplicate([a,b,c]).length,1);assert.equal(a.id,b.id);assert.equal(a.sourceUrl,raw.sourceUrl);
});
test('saved synthetic feeds run end to end: 10 raw, 8 unique across five categories',async()=>{
 const result=await collect(sources.filter(s=>manifest[s.id]),async s=>fixture(s),{isDemo:true,asOf:'2026-10-03T12:00:00Z'});
 assert.equal(result.report.rawCount,10);assert.equal(result.batch.items.length,8);assert.equal(result.report.duplicatesRemoved,2);
 assert.deepEqual(result.report.categories,{ai:3,agents:1,chips:1,robotics:1,crypto:2});
 assert.equal(result.rawRecords[0].publishedAt,'Fri, 02 Oct 2026 08:00:00 GMT');
 assert.throws(()=>publishResult(result,path.join(os.tmpdir(),'must-not-write-fixture.json')));
});
test('one feed failure and one invalid entry do not abort successful sources',async()=>{
 const result=await collect(sources.filter(s=>['openai','nvidia'].includes(s.id)),async s=>{
  if(s.id==='nvidia')throw new Error('timeout');
  return fixture(s).replace('</channel>','<item><title>Broken</title></item></channel>');
 },{asOf:'2026-10-03T12:00:00Z'});
 assert.equal(result.batch.items.length,2);assert.equal(result.report.sources[1].status,'failed');assert.equal(result.report.sources[0].errors.length,1);
});
test('all-feed failure preserves prior snapshot; snapshot policy handles malformed, empty and demo data',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'frontier-feeds-'));const file=path.join(dir,'generated.json');
 try{
  const good={...local,isDemo:false};fs.writeFileSync(file,JSON.stringify(good));const before=fs.readFileSync(file,'utf8');
  const failed=await collect(sources.filter(s=>s.enabled),async()=>{throw new Error('network blocked');});
  assert.equal(publishResult(failed,file).written,false);assert.equal(fs.readFileSync(file,'utf8'),before);
  assert.equal(chooseSnapshot(good,local).mode,'generated');
  for(const bad of [undefined,'malformed',{...good,items:[]},{...good,isDemo:true},{...good,items:[{...good.items[0],importance:999}]}])assert.equal(chooseSnapshot(bad,local).mode,'local-fallback');
  const result=await collect(sources.filter(s=>s.id==='openai'),async s=>fixture(s),{asOf:'2026-10-03T12:00:00Z'});
  assert.equal(publishResult(result,file).written,true);assert.equal(JSON.parse(fs.readFileSync(file)).items.length,2);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
