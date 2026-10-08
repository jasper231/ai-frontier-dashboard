const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const health=require('../src/lib/news/feeds/health.cjs'),{collect}=require('../src/lib/news/feeds/pipeline.cjs'),{main}=require('../scripts/refresh-news.cjs');
const source={id:'official',name:'Official',url:'https://openai.com/news/rss.xml',hosts:['openai.com'],category:'ai',publisher:'OpenAI',sourceKind:'official',enabled:true,staleAfterDays:14};
const now='2026-10-08T10:00:00Z',next='2026-10-08T13:00:00Z';
const good={id:source.id,status:'fetched',rawCount:3,parsedCount:3,normalizedCount:2,invalidCount:0,excludedCount:1,latestPublishedAt:'2026-10-08T09:00:00Z',itemIds:['one','two']};
const update=(previous,sources=[source],rows=[good],asOf=now,other={})=>health.update(previous,sources,{asOf,sources:rows,...other});
test('per-source failures are durable and recover without disabling feeds or changing prior success',()=>{
 const initial=update(health.empty());const failure={id:source.id,status:'failed',reason:'HTTP 403',code:22,httpStatus:403};const broken=update(initial,[source],[failure],next);assert.equal(broken.sources[0].status,'error');assert.equal(broken.sources[0].lastSuccessAt,now);assert.equal(broken.sources[0].consecutiveFailures,1);assert.equal(broken.sources[0].httpStatus,403);assert.equal(broken.sources[0].enabled,true);
 const again=update(broken,[source],[failure],'2026-10-08T16:00:00Z');assert.equal(again.sources[0].consecutiveFailures,2);const recovered=update(again,[source],[good],'2026-10-08T19:00:00Z');assert.equal(recovered.sources[0].status,'healthy');assert.equal(recovered.sources[0].consecutiveFailures,0);assert.equal(recovered.sources[0].totalFailures,2);assert.equal(recovered.sources[0].recoveredAt,'2026-10-08T19:00:00Z');assert.ok(recovered.events.some(e=>e.from==='error'&&e.to==='healthy'));
 assert.equal(update(recovered,[source],[failure],'2026-10-08T19:00:00Z'),recovered);assert.equal(update(recovered,[source],[failure],now),recovered);
});
test('empty feeds and topic exclusions are healthy; missing dates, partial rejection and stale publications remain visible',()=>{
 assert.equal(update(health.empty(),[source],[{...good,rawCount:0,parsedCount:0,normalizedCount:0,itemIds:[],latestPublishedAt:null}]).sources[0].status,'empty');
 assert.equal(update(health.empty(),[source],[{...good,normalizedCount:0,excludedCount:3}]).sources[0].status,'no-matches');
 assert.equal(update(health.empty(),[source],[{...good,parsedCount:0,normalizedCount:0,invalidCount:3,errors:[{reason:'Missing original dates'}]}]).sources[0].status,'error');
 assert.equal(update(health.empty(),[source],[{...good,invalidCount:1,errors:[{reason:'Malformed item'}]}]).sources[0].status,'degraded');
 const stale=update(health.empty(),[source],[{...good,latestPublishedAt:'2026-09-01T09:00:00Z'}]);assert.equal(stale.sources[0].status,'stale');assert.equal(stale.sources[0].lastSuccessAt,now);
});
test('global network blocking does not fabricate per-host attempts or remote failure counts; source URL changes reset identity',()=>{
 const initial=update(health.empty());const blocked=update(initial,[source],[{id:source.id,status:'not-attempted'}],next,{network:'blocked',reason:'Proxy unreachable'});assert.equal(blocked.sources[0].status,'blocked');assert.equal(blocked.sources[0].totalChecks,1);assert.equal(blocked.sources[0].totalFailures,0);assert.equal(blocked.sources[0].lastAttemptAt,now);
 const changed=update(initial,[{...source,url:'https://openai.com/new.xml'}],[{id:source.id,status:'failed',reason:'404'}],next);assert.equal(changed.sources[0].lastSuccessAt,null);assert.equal(changed.sources[0].totalChecks,1);
 const disabled=update(initial,[{...source,enabled:false,reason:'No verified public feed'}],[],next);assert.equal(disabled.sources[0].status,'disabled');assert.equal(disabled.sources[0].lastSuccessAt,now);
});
test('new item counts are based on observed IDs; bad status input falls back and diagnostics redact credentials',()=>{
 const initial=update(health.empty());const changed=update(initial,[source],[{...good,itemIds:['one','two','three']}],next);assert.equal(changed.sources[0].newItemCount,1);assert.equal(changed.sources[0].lastContentChangedAt,next);
 for(const malformed of [{bad:true},{...initial,summary:{enabled:999}},{...initial,sources:[{...initial.sources[0],lastSuccessAt:'bad'}]}])assert.deepEqual(health.choose(malformed),health.empty());
 const reason=health.safeReason('Error https://user:password@openai.com/feed?api_key=secret&token=abc');assert.ok(!reason.includes('password'));assert.ok(!reason.includes('secret'));assert.ok(!reason.includes('abc'));
});
test('collector exposes parse rejection versus expected topic exclusion and transport diagnostics',async()=>{
 const result=await collect([source,{...source,id:'timeout',url:'https://openai.com/timeout'}],async s=>{if(s.id==='timeout'){const e=new Error('403 Forbidden');e.code=22;e.httpStatus=403;throw e;}return '<rss><channel><item><title>AI model release</title><link>https://openai.com/test</link><pubDate>Thu, 08 Oct 2026 09:00:00 GMT</pubDate></item><item><title>Missing date</title></item></channel></rss>';},{asOf:now});
 assert.equal(result.report.sources[0].parsedCount,1);assert.equal(result.report.sources[0].invalidCount,1);assert.equal(result.report.sources[0].itemIds.length,1);assert.equal(result.report.sources[1].httpStatus,403);assert.equal(update(health.empty(),[source],result.report.sources).sources[0].status,'degraded');
});
test('all-feed failure and global blocking keep last-good news while persisting health; fixtures never overwrite production health',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'frontier-health-'));try{
 fs.mkdirSync(path.join(tmp,'src/data'),{recursive:true});const snapshot={...require('../src/data/news.local.json'),isDemo:false},newsFile=path.join(tmp,'src/data/news.generated.json');fs.writeFileSync(newsFile,JSON.stringify(snapshot));const before=fs.readFileSync(newsFile,'utf8');
 const report=await main({argv:['--live'],env:{AI_PROVIDER:'rules'},sourceDefinitions:[source],rootDir:tmp,asOf:now,log:false,fetcher:async()=>{throw new Error('404');}});assert.equal(report.publication.written,false);assert.equal(fs.readFileSync(newsFile,'utf8'),before);const data=JSON.parse(fs.readFileSync(path.join(tmp,'src/data/source-health.json')));assert.equal(data.sources[0].status,'error');
 const blocked=await main({argv:['--live'],env:{AI_PROVIDER:'rules'},sourceDefinitions:[source],rootDir:tmp,asOf:next,log:false,fetcher:async()=>{const error=new Error('Failed to connect to proxy');error.code=7;throw error;}});assert.equal(blocked.sourceHealth.blocked,1);assert.equal(fs.readFileSync(newsFile,'utf8'),before);
 const production=fs.readFileSync('src/data/source-health.json','utf8');await main({argv:['--fixtures'],env:{AI_PROVIDER:'rules'},log:false});assert.equal(fs.readFileSync('src/data/source-health.json','utf8'),production);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('health view is bilingual, escaped, flags overdue checks, and builds as standalone mobile HTML',()=>{
 const {render}=require('../src/lib/news/source-health-render.cjs');const report=update(health.empty(),[source],[{id:source.id,status:'failed',reason:'<script>bad</script>'}]);const zh=render(report,'zh','2026-10-09T10:00:00Z'),en=render(report,'en',now);assert.match(zh,/超过 9 小时/);assert.match(zh,/抓取或解析失败/);assert.match(en,/Fetch or parser failure/);assert.ok(!zh.includes('<script>bad'));assert.match(zh,/&lt;script&gt;/);
 const html=fs.readFileSync('dist/source-health.html','utf8');assert.match(html,/width=device-width, initial-scale=1/);assert.ok(!/<script[^>]+src=/.test(html));assert.ok(!/<link[^>]+stylesheet/.test(html));for(const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(!script[1].includes('application/json'))new vm.Script(script[2]);assert.ok(fs.existsSync('dist/source-health.json'));
 const {summary}=require('../scripts/source-health-summary.cjs');assert.match(summary(report),/official|Official/);assert.match(summary(report),/error/);
});
