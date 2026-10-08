const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {renderDashboard}=require('../src/lib/news/render.cjs');const {createView}=require('../src/lib/news/core.cjs');
const local=require('../src/data/news.local.json');const definitions=require('../src/data/categories.json');
test('last update displays snapshot time and fallback never pretends to be a successful refresh',()=>{
 const real={...local,isDemo:false,asOf:'2026-10-03T12:34:56Z'};
 assert.match(renderDashboard(createView(real,definitions,'Latest',real.asOf)),/最后更新：2026-10-03 20:34 北京时间（2026-10-03 12:34 UTC）/);
 assert.match(renderDashboard(createView(local,definitions,'Latest',local.asOf)),/最后更新：尚无真实更新 · 本地示例/);
});
test('Pages output is a complete offline page without absolute local assets',()=>{
 const html=fs.readFileSync('dist/index.html','utf8');assert.ok(fs.existsSync('dist/.nojekyll'));
 assert.equal(html,fs.readFileSync('static-preview/index.html','utf8'));
 assert.match(html,/<meta name="viewport" content="width=device-width, initial-scale=1">/);
 assert.ok(!/\b(?:src|href)=["']\/(?!\/)/.test(html));assert.ok(!html.includes('localhost'));assert.ok(!/fetch\(/.test(html));
 assert.ok(!/<script[^>]+src=/.test(html));assert.ok(!/<link[^>]+rel="stylesheet"/.test(html));
});

test('lastUpdated remains the last successful fetch after failures, not the latest attempt',()=>{
 const {refreshStatus}=require('../src/lib/news/refresh-status.cjs');
 const selected={mode:'generated',batch:{asOf:'2026-10-02T10:00:00Z'}};
 const failed=refreshStatus(selected,{asOf:'2026-10-03T20:00:00Z',publication:{written:false}});
 assert.equal(failed.lastUpdated,'2026-10-02T10:00:00Z');assert.equal(failed.lastAttempt,'2026-10-03T20:00:00Z');
 assert.equal(failed.lastRefreshStatus,'failed-using-last-good');
 const empty=refreshStatus({mode:'local-fallback',batch:local},{asOf:'2026-10-03T20:00:00Z',publication:{written:false}});assert.equal(empty.lastUpdated,null);
});

test('real cards and Top Signals have native official title and footer links in all views',()=>{
 const real={...local,isDemo:false,asOf:'2026-10-02T15:59:59Z',items:local.items.map((item,i)=>({...item,source:'Official Source',sourceUrl:`https://openai.com/news/article-${i}?a=1&b=2`}))};
 for(const view of ['Today','Latest','Long-term']){
  const model=createView(real,definitions,view,real.asOf),html=renderDashboard(model);
  const articles=[...html.matchAll(/<article class="(card|signal)" data-item-id="([^"]+)">([\s\S]*?)<\/article>/g)];
  assert.equal(articles.length,model.items.length+model.signals.length);
  for(const [,kind,id,markup] of articles){
   const item=real.items.find(item=>item.id===id),href=item.sourceUrl.replace(/&/g,'&amp;');
   assert.ok(markup.includes(`<h3><a class="article-title-link" href="${href}" target="_blank" rel="noopener noreferrer">`),kind+' title '+id);
   assert.ok(markup.includes(`<a class="article-source-link" href="${href}" target="_blank" rel="noopener noreferrer">Official Source · 查看原文 ↗</a>`));
  }
 }
});
test('missing, malformed, unsafe and demo URLs do not become clickable title or footer links',()=>{
 const model=createView({...local,isDemo:false},definitions,'Latest',local.asOf);
 for(const sourceUrl of [undefined,'','not a URL','javascript:alert(1)','data:text/html,test','/relative','https://user:pass@openai.com/news']){
  const item={...local.items[0],sourceUrl};
  const invalid={...model,signals:[item],categories:[{...definitions[0],entries:[item]}]};
  const html=renderDashboard(invalid);
  assert.ok(!html.includes('class="article-title-link"'));assert.ok(!html.includes('class="article-source-link"'));assert.ok(!html.includes('查看原文 ↗'));
 }
 const demo=renderDashboard(createView(local,definitions,'Latest',local.asOf));assert.ok(!demo.includes('class="article-title-link"'));
});

test('static generator embeds working real links and filtering preserves them without a server',async()=>{
 const vm=require('node:vm'),os=require('node:os'),path=require('node:path');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'frontier-real-link-test-'));
 try{
  for(const folder of ['src','scripts','public'])fs.cpSync(folder,path.join(tmp,folder),{recursive:true});
  const real={...local,isDemo:false,asOf:'2026-10-02T15:59:59Z',items:local.items.map((item,i)=>({...item,source:'Official Test',sourceUrl:`https://openai.com/news/official-${i}`}))};
  fs.writeFileSync(path.join(tmp,'src/data/news.generated.json'),JSON.stringify(real));
  const previous=process.cwd();process.chdir(tmp);
  try{await import('file://'+path.resolve(previous,'scripts/build-pages.mjs')+'?link-test');}finally{process.chdir(previous);}
  const html=fs.readFileSync(path.join(tmp,'dist/index.html'),'utf8');
  assert.ok(html.includes('data-view="Daily Briefing" aria-pressed="true"')); assert.ok(html.includes('https://openai.com/news/official-0'));
  const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];const json={};
  for(const script of scripts)if(script[1].includes('application/json'))json[/id="([^"]+)"/.exec(script[1])[1]]={textContent:script[2]};
  let handler;const root={innerHTML:'',addEventListener(name,fn){if(name==='click')handler=fn},querySelector(){return {focus(){}}}};
  class FixedDate extends Date{constructor(...args){super(...(args.length?args:[real.asOf]));}}
  const context={navigator:{language:'zh-CN'},URL,Date:FixedDate,module:{exports:{}},document:{getElementById(id){return id==='dashboard-root'?root:json[id]}}};vm.createContext(context);
  for(const script of scripts)if(!script[1].includes('application/json'))vm.runInContext(script[2],context);
  const rendered={};
  for(const view of ['Today','Latest','Long-term']){
   handler({target:{closest(){return {getAttribute(){return view}}}}});
   assert.equal(root.innerHTML,renderDashboard(createView(real,definitions,view,real.asOf)));
   assert.ok(root.innerHTML.includes(`data-view="${view}" aria-pressed="true"`));
   rendered[view]=root.innerHTML;
   assert.ok(root.innerHTML.includes('href="https://openai.com/news/official-0" target="_blank" rel="noopener noreferrer"'));
  }
  const signals=html=>[...html.matchAll(/<article class="signal" data-item-id="([^"]+)"/g)].map(m=>m[1]);
  const cards=html=>[...html.matchAll(/<article class="card" data-item-id="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(!cards(rendered.Today).includes('ai-2'));
  assert.ok(cards(rendered.Today).length<cards(rendered.Latest).length);
  assert.equal(cards(rendered.Latest)[0],'ai-1');
  assert.equal(cards(rendered['Long-term'])[0],'ai-3');
  assert.notDeepEqual(signals(rendered.Today),signals(rendered.Latest));
  assert.notDeepEqual(signals(rendered['Long-term']),signals(rendered.Latest));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
