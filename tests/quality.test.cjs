const test=require('node:test'),assert=require('node:assert/strict');
const {assess,associate,enhanceBatch}=require('../src/lib/news/quality/rules.cjs');
const {normalize}=require('../src/lib/news/feeds/normalizer.cjs');
const {parseFeed}=require('../src/lib/news/feeds/parser.cjs');
const core=require('../src/lib/news/core.cjs');
const {renderDashboard}=require('../src/lib/news/render.cjs');
const local=require('../src/data/news.local.json'),definitions=require('../src/data/categories.json'),sources=require('../src/data/feed-sources.json');
const asOf='2026-10-04T12:00:00Z',source=sources.find(s=>s.id==='openai');
const raw=title=>({title,content:'Open source model architecture for reliable agent inference.',sourceUrl:'https://openai.com/test',publishedAt:'2026-10-04T08:00:00Z'});
test('explainable scoring rewards concrete developments, penalizes hype/events/preprints and does not keyword-stuff',()=>{
 const release=assess(raw('Introducing open-source agent inference architecture'),source,{asOf}),event=assess(raw('Join our AI webinar event'),source,{asOf});
 assert.ok(release.importance>event.importance);assert.ok(release.longTermImportance>event.longTermImportance);assert.equal(event.horizonYears,0);
 const paper=assess(raw('Introducing open-source agent inference architecture'),{name:'arXiv',sourceKind:'preprint'},{asOf});assert.ok(paper.importance<release.importance);assert.ok(paper.importance<=68);assert.match(paper.ruleAnalysis.sourceQuality.note,/预印本/);
 const a=assess(raw('AI breakthrough'),source,{asOf}),b=assess(raw('AI breakthrough breakthrough breakthrough'),source,{asOf});assert.equal(a.importance,b.importance);
 assert.equal(release.importance,Math.min(96,release.ruleAnalysis.scoring.reduce((n,r)=>n+r.points,0)));
 const older=assess({...raw('Introducing agent architecture'),publishedAt:'2026-09-01T08:00:00Z'},source,{asOf});assert.ok(older.importance<release.importance);
});
test('ordinary release patches rank below material/security releases and repository URLs are scoped',()=>{
 const repo=sources.find(s=>s.id==='mcp-sdk');
 const a=assess(raw('v1.2.3'),repo,{asOf}),b=assess(raw('v2.0.0'),repo,{asOf}),c=assess(raw('v1.2.3 critical security fix'),repo,{asOf});assert.ok(a.importance<b.importance);assert.ok(a.importance<c.importance);
 assert.throws(()=>normalize({...raw('v2.0.0'),sourceUrl:'https://github.com/attacker/repo/releases/tag/v2'},repo),/repository/);
 assert.equal(normalize({...raw('v2.0.0'),sourceUrl:'https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/v2'},repo,{asOf}).sourceUrl,'https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/v2');
 assert.equal(normalize({...raw('v2.0.0'),sourceUrl:'https://github.com/MODELCONTEXTPROTOCOL/TypeScript-SDK/releases/tag/v2'},repo,{asOf}).category,'agents');
 assert.throws(()=>normalize({...raw('v2.0.0'),sourceUrl:'https://github.com/modelcontextprotocol/typescript-sdk-evil/releases/tag/v2'},repo,{asOf}),/repository/);
 const mit=sources.find(s=>s.id==='mit-robotics');assert.throws(()=>normalize({...raw('Astronomy observation'),content:'Stars and galaxies',sourceUrl:'https://news.mit.edu/test'},mit,{asOf}),/topic scope/);assert.equal(normalize({...raw('Humanoid robotics research'),sourceUrl:'https://news.mit.edu/test'},mit,{asOf}).category,'robotics');
});
test('updated-only Atom dates are opt-in, explicit, and never silently presented as publication dates',()=>{
 const xml='<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>v2.0.0</title><link href="https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/v2"/><updated>2026-10-04T08:00:00Z</updated></entry></feed>';
 assert.equal(parseFeed(xml,'https://github.com').records.length,0);
 const row=parseFeed(xml,'https://github.com',{allowUpdatedAsPublished:true}).records[0];assert.equal(row.publishedAtBasis,'updated');
 const item=normalize(row,sources.find(s=>s.id==='mcp-sdk'),{asOf});assert.ok(item.tags.includes('来源更新时间'));assert.equal(item.ruleAnalysis.publishedAtBasis,'updated');
});
test('topic associations cross categories, expire after 14 days, do not merge news or claim corroboration',()=>{
 const a=normalize({...raw('Open-source agent inference architecture'),sourceUrl:'https://openai.com/a'},source,{asOf});
 const b=normalize({...raw('GPU inference throughput release'),sourceUrl:'https://openai.com/b'},source,{asOf});
 const unrelated=normalize({...raw('Stablecoin settlement protocol'),content:'Digital payment.',sourceUrl:'https://openai.com/c'},source,{asOf});
 const old={...b,id:'old',publishedAt:'2026-09-01T00:00:00Z'},before=JSON.stringify([a,b,unrelated,old]),result=associate([a,b,unrelated,old]);
 assert.equal(result.length,4);assert.equal(JSON.stringify([a,b,unrelated,old]),before);
 assert.ok(result[0].ruleAnalysis.relatedNews.some(r=>r.id===b.id&&r.relationship==='shared-topic'));assert.ok(!result[0].ruleAnalysis.relatedNews.some(r=>r.id==='old'||r.id===unrelated.id));
 const batch={...local,isDemo:false,asOf,items:result};const html=renderDashboard(core.createView(batch,definitions,'Latest',asOf));assert.ok(html.includes('主题关联'));assert.ok(html.includes('共享主题线索'));assert.ok(html.includes('href="https://openai.com/b"'));
});
const candidates=()=>Array.from({length:18},(_,n)=>({...local.items[n%15],id:'daily-'+n,title:'A distinct official development event number '+n,source:['A','B','C','D'][n%4],sourceUrl:'https://openai.com/daily-'+n,publishedAt:'2026-10-04T08:00:00Z',category:definitions[n%5].id,importance:96-n}));
test('Daily Briefing selects at most ten unique same-day qualifying stories with diversity and stable ties',()=>{
 const items=candidates(),before=JSON.stringify(items),brief=core.dailyBriefing(items,asOf);assert.equal(brief.length,10);assert.equal(new Set(brief.map(i=>i.id)).size,10);assert.ok(new Set(brief.map(i=>i.category)).size>=4);assert.ok(new Set(brief.map(i=>i.source)).size>=3);
 assert.equal(JSON.stringify(items),before);assert.deepEqual(core.dailyBriefing([...items].reverse(),asOf).map(i=>i.id),brief.map(i=>i.id));
 const duplicated=[...items,{...items[0],id:'tracked',sourceUrl:items[0].sourceUrl+'?utm_source=test'}];assert.deepEqual(core.dailyBriefing(duplicated,asOf).map(i=>i.id),brief.map(i=>i.id));
 const view=core.createView({...local,isDemo:false,asOf,items},definitions,'Daily Briefing',asOf);assert.equal(view.items.length,10);assert.ok(view.signals.every(i=>view.items.includes(i)));
 assert.ok(renderDashboard(view).includes('data-view="Daily Briefing" aria-pressed="true"'));
});
test('Daily Briefing handles fewer than five, empty UTC days, low scores, future dates and UTC offsets honestly',()=>{
 const items=candidates().slice(0,3);assert.equal(core.dailyBriefing(items,asOf).length,3);
 assert.equal(core.dailyBriefing(items,'2026-10-05T12:00:00Z').length,0);
 assert.equal(core.dailyBriefing(items.map(i=>({...i,importance:49})),asOf).length,0);
 assert.equal(core.dailyBriefing(items.map(i=>({...i,publishedAt:'2026-10-04T13:00:00Z'})),asOf).length,0);
 const edge={...items[0],publishedAt:'2026-10-05T00:30:00+02:00'};assert.equal(core.dailyBriefing([edge],'2026-10-04T23:59:59Z').length,1);
 const html=renderDashboard(core.createView({...local,isDemo:false,asOf,items},definitions,'Daily Briefing',asOf));assert.ok(html.includes('data-briefing-status="unpublished"'));
});
test('data-layer upgrades old official snapshots without changing timestamps, demos or AI analysis',()=>{
 const batch={...local,isDemo:false,items:[{...local.items[0],source:'OpenAI'}]},before=JSON.stringify(batch),upgraded=enhanceBatch(batch,sources);
 assert.equal(upgraded.asOf,batch.asOf);assert.equal(JSON.stringify(batch),before);assert.ok(upgraded.items[0].ruleAnalysis);assert.deepEqual(enhanceBatch(upgraded,sources),upgraded);
 assert.equal(enhanceBatch(local,sources),local);
 const ai={...batch,items:[{...batch.items[0],intelligence:{origin:'ai'},importance:99}]};assert.equal(enhanceBatch(ai,sources).items[0].importance,99);
});
test('expanded feeds are public HTTPS allowlisted sources; production uses rules without Secrets',()=>{
 const fs=require('node:fs');assert.ok(sources.filter(s=>s.enabled).length>=16);for(const s of sources.filter(s=>s.enabled)){assert.equal(new URL(s.url).protocol,'https:');assert.ok(s.hosts.length);}
 const workflow=fs.readFileSync('.github/workflows/refresh-news.yml','utf8');assert.ok(workflow.includes('AI_PROVIDER: rules'));assert.ok(!workflow.includes('secrets.'));
});
