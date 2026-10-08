const fs=require('node:fs');
const path=require('node:path');
const configuredSources=require('../src/data/feed-sources.json');
const health=require('../src/lib/news/feeds/health.cjs');
const {fetchFeed}=require('../src/lib/news/feeds/transport.cjs');
const {collect,prepareSnapshot,atomicWrite,publishResult}=require('../src/lib/news/feeds/pipeline.cjs');
const {createProvider}=require('../src/lib/news/intelligence/providers.cjs');
const {chooseSnapshot}=require('../src/lib/news/snapshot.cjs');
const {refreshStatus}=require('../src/lib/news/refresh-status.cjs');
const projectRoot=path.resolve(__dirname,'..');
async function main({argv=process.argv.slice(2),env=process.env,log=true,rootDir=projectRoot,sourceDefinitions=configuredSources,fetcher=fetchFeed,asOf=new Date().toISOString()}={}){
 const root=rootDir,sources=sourceDefinitions;
 const fixtures=argv.includes('--fixtures');
 const offline=argv.includes('--offline');
 if(!fixtures&&!offline&&!argv.includes('--live'))throw new Error('Choose --live, --offline or --fixtures');
 // Mock output is for artifacts/tests only; never publish fake AI analysis as real news.
 const mode=argv.includes('--ai-mock')?'mock':env.AI_PROVIDER||'rules';
 const requested=createProvider({mode,apiKey:env.OPENAI_API_KEY});
 const provider=requested.kind==='mock'&&!fixtures?createProvider():requested;
 let report,result,probedXml,probedId,probedError,prefetchMs=0;
 if(fixtures){
  const manifest=require('../tests/fixtures/feeds/manifest.json');
  result=await collect(sources.filter(s=>manifest[s.id]),async s=>fs.readFileSync(path.join(root,'tests/fixtures/feeds',manifest[s.id]),'utf8'),{isDemo:true});
  result=await prepareSnapshot(result,{provider});
  atomicWrite(path.join(root,'artifacts/news.fixture.generated.json'),result.batch);
  atomicWrite(path.join(root,'artifacts/feeds.fixture.raw.json'),result.rawRecords);
  report={...result.report,publication:{written:false,reason:'Fixtures only; real generated snapshot untouched'}};
 }else{
  let problem=offline?'Execution sandbox cannot connect to inherited proxy:8080 (curl exit 7); no source requests made':null;
  if(!problem){
   // Exactly one probe. Global network failure stops the run instead of trying all hosts.
   try{const first=sources.find(s=>s.enabled);if(first){probedId=first.id;const started=Date.now();probedXml=await fetcher(first.url);prefetchMs=Date.now()-started;}else problem='No enabled feeds';}catch(error){
    probedError=error;
    if(error.code===5||['EPERM','EACCES'].includes(error.code)||(String(error.message).toLowerCase().includes('proxy')&&[7,28,'ETIMEDOUT'].includes(error.code)))problem=error.message;
   }
  }
  if(problem){report={mode:'live',asOf:asOf,network:'blocked',reason:problem,sources:sources.map(s=>({id:s.id,status:s.enabled?'not-attempted':'disabled',attempted:s.id===probedId,reason:s.reason})),rawCount:0,normalizedCount:0,deduplicatedCount:0,duplicatesRemoved:0,categories:{ai:0,agents:0,chips:0,robotics:0,crypto:0},publication:{written:false,reason:'Existing generated and local snapshots untouched'}};}
  else{
   result=await collect(sources,s=>s.id===probedId&&probedError?Promise.reject(probedError):s.id===probedId&&probedXml!==undefined?Promise.resolve(probedXml):fetcher(s.url),{asOf});
   if(prefetchMs)result.report.sources.find(s=>s.id===probedId).durationMs+=prefetchMs;
   result=await prepareSnapshot(result,{provider});
   report={...result.report,network:'requests-attempted',publication:publishResult(result,path.join(root,'src/data/news.generated.json'))};
   atomicWrite(path.join(root,'artifacts/feeds.live.raw.json'),result.rawRecords);
  }
 }
 let generated;try{generated=JSON.parse(fs.readFileSync(path.join(root,'src/data/news.generated.json'),'utf8'));}catch{}
 const selected=chooseSnapshot(generated,require('../src/data/news.local.json'));
 report.activeSnapshot={mode:selected.mode,itemCount:selected.batch.items.length,reason:selected.reason};
 if(!fixtures){
  let previousHealth;try{previousHealth=JSON.parse(fs.readFileSync(path.join(root,'src/data/source-health.json'),'utf8'));}catch{}
  const sourceHealth=health.update(previousHealth,sources,report);
  atomicWrite(path.join(root,'src/data/source-health.json'),sourceHealth);
  report.sourceHealth=sourceHealth.summary;
  const status=refreshStatus(selected,report);
  atomicWrite(path.join(root,'src/data/news-status.json'),status);
  report.lastUpdated=status.lastUpdated;
 }
 if(requested.kind==='mock'&&!fixtures)report.intelligence={status:'rules',reason:'Mock publication blocked'};
 atomicWrite(path.join(root,'artifacts',fixtures?'feeds.fixture.report.json':'feeds.live.report.json'),report);
 if(log)console.log(JSON.stringify(report,null,2));
 return report;
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={main};
