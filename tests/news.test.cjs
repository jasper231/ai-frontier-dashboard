const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('../src/lib/news/core.cjs');
const {renderDashboard}=require('../src/lib/news/render.cjs');
const batch=require('../src/data/news.local.json');
const definitions=require('../src/data/categories.json');
const shanghaiReference='2026-10-02T15:59:59Z';
test('snapshot has 15 validated records and five complete categories',()=>{
 assert.equal(core.validateBatch(batch),batch);
 for(const category of definitions)assert.equal(batch.items.filter(i=>i.category===category.id).length,3);
 for(const change of [{importance:101},{sourceUrl:'javascript:alert(1)'},{category:'unknown'},{publishedAt:'not a date'},{horizonYears:-1}])assert.throws(()=>core.validateBatch({...batch,items:[{...batch.items[0],...change}]}));
 assert.throws(()=>core.validateBatch({...batch,items:[batch.items[0],batch.items[0]]}));
});
test('Latest is chronological; Today is Shanghai natural day; Long-term uses 3–10 year horizon',()=>{
 const latest=core.createView(batch,definitions,'Latest',batch.asOf);
 assert.equal(latest.items.length,15);assert.equal(latest.featuredCount,10);
 assert.ok(latest.items.every((item,i)=>!i||Date.parse(latest.items[i-1].publishedAt)>=Date.parse(item.publishedAt)));
 const today=core.createView(batch,definitions,'Today',shanghaiReference);assert.equal(today.items.length,3);assert.ok(today.items.every(i=>i.publishedAt.startsWith('2026-10-02')));
 const long=core.createView(batch,definitions,'Long-term',batch.asOf);assert.equal(long.items.length,10);assert.ok(long.items.every(i=>i.horizonYears>=3&&i.horizonYears<=10));
 const edge={...batch.items[0],publishedAt:'2026-10-03T00:30:00+02:00'};
 assert.equal(core.selectItems([edge],'Today',batch.asOf).length,1);
 assert.equal(core.selectItems([{...edge,publishedAt:'2026-10-04T00:00:00Z'}],'Latest',batch.asOf).length,0);
});
test('Top Signals follow filtered records and view-specific priority, ranked by importance, with deterministic ties',()=>{
 assert.deepEqual(core.createView(batch,definitions,'Latest',batch.asOf).signals.map(i=>i.id),['ai-1','chips-1','robotics-1']);
 assert.deepEqual(core.createView(batch,definitions,'Today',shanghaiReference).signals.map(i=>i.id),['ai-1','chips-1','agents-1']);
 const changed={...batch,items:batch.items.map(i=>i.id==='crypto-3'?{...i,importance:100}:i)};
 assert.equal(core.createView(changed,definitions,'Latest',batch.asOf).signals[0].id,'crypto-3');
 const ties=[{...batch.items[0],importance:90,id:'b'},{...batch.items[0],importance:90,id:'a'}];assert.equal(core.topSignals(ties)[0].id,'a');
 const before=JSON.stringify(batch);core.createView(batch,definitions,'Long-term',batch.asOf);assert.equal(JSON.stringify(batch),before);
});
test('empty views are handled, counts follow filters, external text is escaped',()=>{
 const empty=core.createView(batch,definitions,'Today','2026-10-03T23:59:59Z');
 assert.equal(empty.signals.length,0);assert.equal(empty.featuredCount,0);assert.equal(empty.categories.length,5);
 const html=renderDashboard(empty);assert.equal((html.match(/当前筛选暂无内容/g)||[]).length,5);assert.ok(!html.includes('<details class="more-entries"'));
 const hostile={...batch,items:[{...batch.items[0],title:'<img src=x onerror=alert(1)>',source:'<script>',signalBrief:undefined}]};
 const escaped=renderDashboard(core.createView(hostile,definitions,'Latest',batch.asOf));assert.ok(!escaped.includes('<img src=x'));assert.ok(escaped.includes('&lt;img'));
});
test('standalone browser scripts perform real filter updates without network or npm',()=>{
 const html=fs.readFileSync('static-preview/index.html','utf8');
 const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
 const jsonScripts={};for(const s of scripts)if(s[1].includes('application/json'))jsonScripts[/id="([^"]+)"/.exec(s[1])[1]]={textContent:s[2]};
 let callback;let focused=false;
 const root={innerHTML:'',addEventListener(name,fn){if(name==='click')callback=fn},querySelector(){return {focus(){focused=true}}}};
 const embedded=JSON.parse(jsonScripts['news-snapshot'].textContent);
 const embeddedDefinitions=JSON.parse(jsonScripts['category-definitions'].textContent);
 class FixedDate extends Date {constructor(...args){super(...(args.length?args:[embedded.asOf]));}}
 const context={navigator:{language:'zh-CN'},URL,Date:FixedDate,document:{getElementById(id){return id==='dashboard-root'?root:jsonScripts[id]}}};
 vm.createContext(context);for(const s of scripts)if(!s[1].includes('application/json'))vm.runInContext(s[2],context);
 for(const view of ['Today','Long-term','Latest']){
  callback({target:{closest(){return {getAttribute(){return view}}}}});
  assert.equal(root.innerHTML,renderDashboard(core.createView(embedded,embeddedDefinitions,view,embedded.asOf),{sourceHealth:JSON.parse(jsonScripts['source-health-snapshot'].textContent)}));
  assert.ok(root.innerHTML.includes(`data-view="${view}" aria-pressed="true"`));
 }
 assert.ok(focused);assert.match(html,/<meta name="viewport" content="width=device-width, initial-scale=1">/);
});

test('Long-term prioritizes impact score rather than generic importance',()=>{const model=core.createView(batch,definitions,'Long-term',batch.asOf);assert.ok(model.items.every((item,i)=>!i||model.items[i-1].longTermImportance>=item.longTermImportance));assert.equal(model.categories[0].entries[0].id,'ai-3');});

test('Shanghai day crosses UTC dates at 16:00Z, independent of the host timezone',()=>{
 for(const [timestamp,day] of [
  ['2026-10-03T15:59:59Z','2026-10-03'],
  ['2026-10-03T16:00:00Z','2026-10-04'],
  ['2026-10-03T22:56:48Z','2026-10-04'],
  ['2026-10-04T15:59:59Z','2026-10-04'],
  ['2026-10-04T16:00:00Z','2026-10-05'],
  ['2026-12-31T22:56:48Z','2027-01-01'],
  ['2028-02-28T22:56:48Z','2028-02-29'],
  ['2026-10-04T00:56:48+02:00','2026-10-04']
 ])assert.equal(core.shanghaiDay(timestamp),day);
 const previous=process.env.TZ;
 try{for(const zone of ['UTC','America/Los_Angeles','Asia/Tokyo']){process.env.TZ=zone;assert.equal(core.shanghaiDay('2026-10-03T22:56:48Z'),'2026-10-04');}}
 finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
test('Today includes only the Beijing natural day and never mutates UTC timestamps or JSON',()=>{
 const timestamps=['2026-10-03T15:59:59Z','2026-10-03T16:00:00Z','2026-10-03T22:56:48Z','2026-10-04T07:59:59Z','2026-10-04T09:00:00Z'];
 const input={...batch,asOf:'2026-10-04T08:00:00Z',items:timestamps.map((publishedAt,i)=>({...batch.items[0],id:'edge-'+i,publishedAt,importance:80+i}))};
 const original=JSON.stringify(input),model=core.createView(input,definitions,'Today',input.asOf);
 assert.deepEqual(model.items.map(i=>i.id),['edge-3','edge-2','edge-1']);
 assert.deepEqual(model.signals.map(i=>i.id),['edge-3','edge-2','edge-1']);
 assert.equal(JSON.stringify(input),original);assert.equal(input.timeZone,'UTC');assert.equal(model.snapshotAt,input.asOf);
});
test('Daily Briefing uses the Beijing day, caps at ten, and never fills from yesterday',()=>{
 const asOf='2026-10-04T08:00:00Z';
 const candidates=Array.from({length:12},(_,i)=>({...batch.items[0],id:'brief-'+i,title:'Shanghai boundary story number '+i,source:'Source '+i,sourceUrl:'https://openai.com/news/shanghai-'+i,publishedAt:'2026-10-03T22:56:48Z',importance:80+i}));
 const old={...candidates[0],id:'old',sourceUrl:'https://openai.com/news/old',title:'Very important older story',publishedAt:'2026-10-03T15:59:59Z',importance:100};
 const future={...old,id:'future',publishedAt:'2026-10-04T09:00:00Z'};
 const low={...old,id:'low',publishedAt:'2026-10-03T22:56:48Z',importance:49};
 assert.equal(core.dailyBriefing([...candidates,old,future,low],asOf).length,10);
 assert.deepEqual(core.dailyBriefing([candidates[0],old,future,low],asOf).map(i=>i.id),['brief-0']);
 assert.equal(core.dailyBriefing([old],asOf).length,0);
 assert.equal(core.dailyBriefing(candidates,'2026-10-04T16:00:00Z').length,0);
 const model=core.createView({...batch,isDemo:false,asOf,items:[candidates[0],old]},definitions,'Daily Briefing',asOf);
 assert.equal(model.items.length,1);assert.deepEqual(model.signals.map(i=>i.id),['brief-0']);
 assert.match(renderDashboard(model),/data-briefing-status="unpublished"/);
});
test('timezone conversion does not change absolute Latest chronology or Long-term ranking',()=>{
 const items=[
  {...batch.items[0],id:'a',publishedAt:'2026-10-03T23:00:00Z',importance:99,longTermImportance:40},
  {...batch.items[0],id:'b',publishedAt:'2026-10-04T08:30:00+08:00',importance:50,longTermImportance:80},
  {...batch.items[0],id:'c',publishedAt:'2026-10-03T15:59:59Z',importance:70,longTermImportance:100}
 ];
 const reference='2026-10-04T08:00:00Z';
 assert.deepEqual(core.selectItems(items,'Latest',reference).map(i=>i.id),['b','a','c']);
 assert.deepEqual(core.selectItems(items,'Long-term',reference).map(i=>i.id),['c','b','a']);
 assert.deepEqual(core.selectItems(items,'Today',reference).map(i=>i.id),['a','b']);
});
test('last update formats Beijing first with original UTC retained as secondary time',()=>{
 assert.equal(core.formatUpdated('2026-10-04T09:32:00Z'),'2026-10-04 17:32 北京时间（2026-10-04 09:32 UTC）');
 assert.equal(core.formatUpdated('2026-10-03T22:56:48Z'),'2026-10-04 06:56 北京时间（2026-10-03 22:56 UTC）');
 assert.equal(core.formatUpdated('2026-10-03T16:00:00Z'),'2026-10-04 00:00 北京时间（2026-10-03 16:00 UTC）');
});
