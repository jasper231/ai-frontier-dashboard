const {validateBatch}=require('../core.cjs');
const {deduplicate,canonicalUrl}=require('../feeds/normalizer.cjs');
const {VERSION,validateAnalysis}=require('./contract.cjs');
const {PROMPT_VERSION,SYSTEM_PROMPT}=require('./prompt.cjs');
const {createProvider}=require('./providers.cjs');
const latest=(a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||b.importance-a.importance||a.id.localeCompare(b.id);
async function analyzeBatch(batch,{provider=createProvider(),rawRecords=[],timeoutMs=15000,maxCandidates=80}={}){
 validateBatch(batch);
 if(!Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>200||!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw new Error('Invalid analysis budget');
 const unique=deduplicate(batch.items),base={...batch,items:unique};
 const report={provider:provider.id,promptVersion:PROMPT_VERSION,status:'rules',inputCount:batch.items.length,ruleDuplicatesRemoved:batch.items.length-unique.length,candidateCount:0,analyzedCount:0,fallbackCount:unique.length,semanticDuplicatesRemoved:0,invalidCount:0};
 if(provider.kind==='rules'||!unique.length)return {batch:base,report};
 // Bound work without deleting the remaining stories; unselected items keep their rules.
 const candidates=[...unique].sort((a,b)=>b.importance-a.importance||latest(a,b)).slice(0,maxCandidates);
 report.candidateCount=candidates.length;
 const known=new Set(candidates.map(i=>i.id));
 const excerpts=new Map();for(const raw of rawRecords){try{excerpts.set(canonicalUrl(raw.sourceUrl),String(raw.content||'').slice(0,4000));}catch{/* Ignore malformed optional evidence. */}}
 const input=structuredClone({schemaVersion:VERSION,promptVersion:PROMPT_VERSION,systemPrompt:SYSTEM_PROMPT,asOf:batch.asOf,candidates:candidates.map(item=>({...item,excerpt:excerpts.get(canonicalUrl(item.sourceUrl))||item.summary}))});
 let timer;const controller=new AbortController();
 try{
  const response=await Promise.race([Promise.resolve().then(()=>provider.analyze(input,{signal:controller.signal})),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();const e=new Error('Analysis timeout');e.code='TIMEOUT';reject(e);},timeoutMs);})]);
  if(!response||response.schemaVersion!==VERSION||!Array.isArray(response.items)||response.items.length>candidates.length)throw new Error('Invalid analysis envelope');
  const accepted=new Map(),counts=new Map();for(const row of response.items)if(row&&known.has(row.id))counts.set(row.id,(counts.get(row.id)||0)+1);
  for(const row of response.items){try{if(counts.get(row?.id)!==1)throw new Error('Repeated output ID');const result=validateAnalysis(row,known);accepted.set(result.id,result);}catch{report.invalidCount++;}}
  if(!accepted.size){report.status='fallback';return {batch:base,report};}
  // Detect cycles before dropping any item. Cyclic or uncertain dedup claims keep originals.
  const removed=new Set();for(const row of accepted.values()){
   if(!row.duplicateOf||row.confidence<0.85)continue;
   let next=row,cycle=false;const seen=new Set();
   while(next?.duplicateOf){if(seen.has(next.id)){cycle=true;break;}seen.add(next.id);if(next.confidence<0.85)break;next=accepted.get(next.duplicateOf);}
   if(!cycle)removed.add(row.id);
  }
  const analyzedAt=new Date().toISOString();
  const items=unique.filter(item=>!removed.has(item.id)).map(item=>{
   const row=accepted.get(item.id);if(!row)return item;
   report.analyzedCount++;
   return {...item,summary:row.whatHappened,whyItMatters:row.whyItMatters,longTermImpact:row.longTermImpact,importance:row.importance,longTermImportance:row.longTermImportance,horizonYears:row.horizonYears,
    signalBrief:{title:row.title,happened:row.whatHappened,matters:row.whyItMatters,impact:row.longTermImpact},
    intelligence:{schemaVersion:VERSION,origin:provider.kind==='mock'?'mock':'ai',provider:provider.id,model:provider.model||null,promptVersion:PROMPT_VERSION,analyzedAt,opportunity:row.opportunity,risk:row.risk,credibility:row.credibility,confidence:row.confidence,evidenceIds:row.evidenceIds,relatedNewsIds:row.relatedNewsIds,duplicateOf:row.duplicateOf}};
  }).sort(latest);
  // Do not retain references to stories removed by semantic dedup; remap them to representatives.
  function retained(id){const seen=new Set();while(removed.has(id)&&!seen.has(id)){seen.add(id);id=accepted.get(id).duplicateOf;}return id;}
  for(const item of items)if(accepted.has(item.id)){for(const key of ['evidenceIds','relatedNewsIds'])item.intelligence[key]=[...new Set(item.intelligence[key].map(retained))].filter(id=>key==='evidenceIds'||id!==item.id);}
  report.semanticDuplicatesRemoved=removed.size;report.fallbackCount=items.length-report.analyzedCount;
  report.status=report.analyzedCount?(report.fallbackCount?'partial':provider.kind==='mock'?'mock':'analyzed'):'fallback';
  return {batch:validateBatch({...base,items}),report};
 }catch(error){
  // Never serialize provider error text: it may contain credentials, headers or raw responses.
  report.status='fallback';report.reason=['TIMEOUT','MISSING_API_KEY','OPENAI_NOT_IMPLEMENTED'].includes(error.code)?error.code:'PROVIDER_FAILED_OR_INVALID_OUTPUT';
  return {batch:base,report};
 }finally{clearTimeout(timer);controller.abort();}
}
module.exports={analyzeBatch};
