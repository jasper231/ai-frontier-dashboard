/* Read-only official-feed probe: no snapshot writes and no credentials. */
const fs=require('node:fs');
const path=require('node:path');
const sources=require('../src/data/feed-sources.json');
const {fetchFeed}=require('../src/lib/news/feeds/transport.cjs');
const {collect}=require('../src/lib/news/feeds/pipeline.cjs');
async function main(){
 const pending=sources.filter(s=>s.enabled&&s.endpointStatus==='pending-runner-verification');
 const result=await collect(pending,s=>fetchFeed(s.url));
 const report={checkedAt:new Date().toISOString(),sources:result.report.sources.map(s=>({id:s.id,status:s.status,count:s.normalizedCount||0,rawCount:s.rawCount||0,errors:(s.errors||[]).slice(0,2),reason:s.reason})),validArticles:result.batch.items.length};
 fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync(path.join('artifacts','public-source-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
