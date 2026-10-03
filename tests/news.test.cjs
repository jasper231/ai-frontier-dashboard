const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('../src/lib/news/core.cjs');
const {renderDashboard}=require('../src/lib/news/render.cjs');
const batch=require('../src/data/news.local.json');
const definitions=require('../src/data/categories.json');
test('snapshot has 15 validated records and five complete categories',()=>{
 assert.equal(core.validateBatch(batch),batch);
 for(const category of definitions)assert.equal(batch.items.filter(i=>i.category===category.id).length,3);
 for(const change of [{importance:101},{sourceUrl:'javascript:alert(1)'},{category:'unknown'},{publishedAt:'not a date'},{horizonYears:-1}])assert.throws(()=>core.validateBatch({...batch,items:[{...batch.items[0],...change}]}));
 assert.throws(()=>core.validateBatch({...batch,items:[batch.items[0],batch.items[0]]}));
});
test('Latest is chronological; Today is UTC snapshot day; Long-term uses 3–10 year horizon',()=>{
 const latest=core.createView(batch,definitions,'Latest',batch.asOf);
 assert.equal(latest.items.length,15);assert.equal(latest.featuredCount,10);
 assert.ok(latest.items.every((item,i)=>!i||Date.parse(latest.items[i-1].publishedAt)>=Date.parse(item.publishedAt)));
 const today=core.createView(batch,definitions,'Today',batch.asOf);assert.equal(today.items.length,3);assert.ok(today.items.every(i=>i.publishedAt.startsWith('2026-10-02')));
 const long=core.createView(batch,definitions,'Long-term',batch.asOf);assert.equal(long.items.length,10);assert.ok(long.items.every(i=>i.horizonYears>=3&&i.horizonYears<=10));
 const edge={...batch.items[0],publishedAt:'2026-10-03T00:30:00+02:00'};
 assert.equal(core.selectItems([edge],'Today',batch.asOf).length,1);
 assert.equal(core.selectItems([{...edge,publishedAt:'2026-10-04T00:00:00Z'}],'Latest',batch.asOf).length,0);
});
test('Top Signals come from all published records, ranked by importance, with deterministic ties',()=>{
 assert.deepEqual(core.createView(batch,definitions,'Latest',batch.asOf).signals.map(i=>i.id),['ai-1','chips-1','robotics-1']);
 assert.deepEqual(core.createView(batch,definitions,'Today',batch.asOf).signals.map(i=>i.id),['ai-1','chips-1','robotics-1']);
 const changed={...batch,items:batch.items.map(i=>i.id==='crypto-3'?{...i,importance:100}:i)};
 assert.equal(core.createView(changed,definitions,'Latest',batch.asOf).signals[0].id,'crypto-3');
 const ties=[{...batch.items[0],importance:90,id:'b'},{...batch.items[0],importance:90,id:'a'}];assert.equal(core.topSignals(ties)[0].id,'a');
 const before=JSON.stringify(batch);core.createView(batch,definitions,'Long-term',batch.asOf);assert.equal(JSON.stringify(batch),before);
});
test('empty views are handled, counts follow filters, external text is escaped',()=>{
 const empty=core.createView(batch,definitions,'Today','2026-10-03T23:59:59Z');
 assert.equal(empty.signals.length,3);assert.equal(empty.featuredCount,0);assert.equal(empty.categories.length,5);
 const html=renderDashboard(empty);assert.equal((html.match(/当前筛选暂无内容/g)||[]).length,5);assert.ok(!html.includes('<details'));
 const hostile={...batch,items:[{...batch.items[0],title:'<img src=x onerror=alert(1)>',source:'<script>',signalBrief:undefined}]};
 const escaped=renderDashboard(core.createView(hostile,definitions,'Latest',batch.asOf));assert.ok(!escaped.includes('<img src=x'));assert.ok(escaped.includes('&lt;img'));
});
test('standalone browser scripts perform real filter updates without network or npm',()=>{
 const html=fs.readFileSync('static-preview/index.html','utf8');
 const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
 const jsonScripts={};for(const s of scripts)if(s[1].includes('application/json'))jsonScripts[/id="([^"]+)"/.exec(s[1])[1]]={textContent:s[2]};
 let callback;let focused=false;
 const root={innerHTML:'',addEventListener(name,fn){callback=fn},querySelector(){return {focus(){focused=true}}}};
 const embedded=JSON.parse(jsonScripts['news-snapshot'].textContent);
 const embeddedDefinitions=JSON.parse(jsonScripts['category-definitions'].textContent);
 class FixedDate extends Date {constructor(...args){super(...(args.length?args:[embedded.asOf]));}}
 const context={URL,Date:FixedDate,document:{getElementById(id){return id==='dashboard-root'?root:jsonScripts[id]}}};
 vm.createContext(context);for(const s of scripts)if(!s[1].includes('application/json'))vm.runInContext(s[2],context);
 for(const view of ['Today','Long-term','Latest']){
  callback({target:{closest(){return {getAttribute(){return view}}}}});
  assert.equal(root.innerHTML,renderDashboard(core.createView(embedded,embeddedDefinitions,view,embedded.asOf)));
  assert.ok(root.innerHTML.includes(`data-view="${view}" aria-pressed="true"`));
 }
 assert.ok(focused);assert.match(html,/<meta name="viewport" content="width=device-width, initial-scale=1">/);
});

test('Long-term prioritizes impact score rather than generic importance',()=>{const model=core.createView(batch,definitions,'Long-term',batch.asOf);assert.ok(model.items.every((item,i)=>!i||model.items[i-1].longTermImportance>=item.longTermImportance));assert.equal(model.categories[0].entries[0].id,'ai-3');});
