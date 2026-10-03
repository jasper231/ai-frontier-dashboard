const fs=require('node:fs');
const path=require('node:path');
const sources=require('../src/data/feed-sources.json');
const {fetchFeed}=require('../src/lib/news/feeds/transport.cjs');
const {collect,atomicWrite,publishResult}=require('../src/lib/news/feeds/pipeline.cjs');
const {chooseSnapshot}=require('../src/lib/news/snapshot.cjs');
const {refreshStatus}=require('../src/lib/news/refresh-status.cjs');
const root=path.resolve(__dirname,'..');
async function main(){
 const fixtures=process.argv.includes('--fixtures');
 const offline=process.argv.includes('--offline');
 if(!fixtures&&!offline&&!process.argv.includes('--live'))throw new Error('Choose --live, --offline or --fixtures');
 let report,result,probedXml;
 if(fixtures){
  const manifest=require('../tests/fixtures/feeds/manifest.json');
  result=await collect(sources.filter(s=>manifest[s.id]),async s=>fs.readFileSync(path.join(root,'tests/fixtures/feeds',manifest[s.id]),'utf8'),{isDemo:true});
  atomicWrite(path.join(root,'artifacts/news.fixture.generated.json'),result.batch);
  atomicWrite(path.join(root,'artifacts/feeds.fixture.raw.json'),result.rawRecords);
  report={...result.report,publication:{written:false,reason:'Fixtures only; real generated snapshot untouched'}};
 }else{
  let problem=offline?'Execution sandbox cannot connect to inherited proxy:8080 (curl exit 7); no source requests made':null;
  if(!problem){
   // Exactly one probe. Global network failure stops the run instead of trying all hosts.
   try{probedXml=await fetchFeed(sources.find(s=>s.enabled).url);}catch(error){
    if(error.code===5||['EPERM','EACCES'].includes(error.code)||(String(error.message).toLowerCase().includes('proxy')&&[7,28,'ETIMEDOUT'].includes(error.code)))problem=error.message;
   }
  }
  if(problem){report={mode:'live',asOf:new Date().toISOString(),network:'blocked',reason:problem,sources:sources.map(s=>({id:s.id,status:s.enabled?'not-attempted':'disabled',reason:s.reason})),rawCount:0,normalizedCount:0,deduplicatedCount:0,duplicatesRemoved:0,categories:{ai:0,agents:0,chips:0,robotics:0,crypto:0},publication:{written:false,reason:'Existing generated and local snapshots untouched'}};}
  else{
   result=await collect(sources,s=>s.id===sources.find(x=>x.enabled).id&&probedXml!==undefined?Promise.resolve(probedXml):fetchFeed(s.url));
   report={...result.report,network:'requests-attempted',publication:publishResult(result,path.join(root,'src/data/news.generated.json'))};
   atomicWrite(path.join(root,'artifacts/feeds.live.raw.json'),result.rawRecords);
  }
 }
 let generated;try{generated=JSON.parse(fs.readFileSync(path.join(root,'src/data/news.generated.json'),'utf8'));}catch{}
 const selected=chooseSnapshot(generated,require('../src/data/news.local.json'));
 report.activeSnapshot={mode:selected.mode,itemCount:selected.batch.items.length,reason:selected.reason};
 if(!fixtures){
  const status=refreshStatus(selected,report);
  atomicWrite(path.join(root,'src/data/news-status.json'),status);
  report.lastUpdated=status.lastUpdated;
 }
 atomicWrite(path.join(root,'artifacts',fixtures?'feeds.fixture.report.json':'feeds.live.report.json'),report);
 console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
