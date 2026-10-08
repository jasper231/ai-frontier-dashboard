/* Read-only bounded publisher-owned feed verification. No snapshots or paid calls. */
const fs=require('node:fs');const {fetchFeed}=require('../src/lib/news/feeds/transport.cjs');const {collect}=require('../src/lib/news/feeds/pipeline.cjs');
async function main(){
 const sources=[...require('../src/data/feed-sources.json').filter(s=>s.enabled),...require('../src/data/feed-candidates.json')];
 const rows=new Array(sources.length);let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{for(;;){const index=cursor++;if(index>=sources.length)return;const source=sources[index];const result=await collect([source],s=>fetchFeed(s.url));rows[index]={...result.report.sources[0],url:source.url};}}));
 const candidates=rows.filter(r=>require('../src/data/feed-candidates.json').some(s=>s.id===r.id));
 const successes=candidates.filter(r=>r.status==='fetched'&&(r.parsedCount>0||r.rawCount===0));
 // Second successful read checks repeatability; do not retry failures or bypass access controls.
 for(let i=0;i<successes.length;i+=4)await Promise.all(successes.slice(i,i+4).map(async row=>{const source=sources.find(s=>s.id===row.id);const result=await collect([source],s=>fetchFeed(s.url));row.confirmation=result.report.sources[0];}));
 const report={checkedAt:new Date().toISOString(),sources:rows};fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/source-probe.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={main};
