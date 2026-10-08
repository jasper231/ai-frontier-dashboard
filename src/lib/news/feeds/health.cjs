/* Pure persistent source health: failures never disable feeds or change news facts. */
const GOOD=new Set(['healthy','no-matches','empty']);
const WARN=new Set(['degraded','stale']);
const STATES=new Set([...GOOD,...WARN,'error','blocked','pending','disabled']);
const utc=value=>typeof value==='string'&&/Z$/.test(value)&&Number.isFinite(Date.parse(value));
function safeReason(value){return String(value||'').replace(/https?:\/\/[^\s<>"']+/g,value=>{try{const u=new URL(value);u.username='';u.password='';for(const key of [...u.searchParams.keys()])if(/key|token|secret|password|authorization/i.test(key))u.searchParams.set(key,'REDACTED');return u.href;}catch{return '[URL]';}}).replace(/[\r\n]/g,' ').slice(0,400);}
function empty(){return {schemaVersion:1,checkedAt:null,summary:{total:0,enabled:0,healthy:0,warnings:0,failed:0,blocked:0,pending:0,disabled:0},sources:[],events:[]};}
function validate(value){
 if(!value||value.schemaVersion!==1||!Array.isArray(value.sources)||!Array.isArray(value.events)||(value.checkedAt!==null&&!utc(value.checkedAt))||!value.summary)throw Error('Invalid source health report');const ids=new Set();
 for(const row of value.sources){if(!row||typeof row.id!=='string'||ids.has(row.id)||!STATES.has(row.status)||typeof row.enabled!=='boolean'||!['name','publisher','category'].every(k=>typeof row[k]==='string')||!['consecutiveFailures','totalChecks','totalFailures'].every(k=>Number.isInteger(row[k])&&row[k]>=0)||['checkedAt','lastAttemptAt','lastSuccessAt','lastFailureAt','lastContentChangedAt','lastPublishedAt','recoveredAt'].some(k=>row[k]!=null&&!utc(row[k])))throw Error('Invalid source health row');ids.add(row.id);}
 const expected={total:value.sources.length,enabled:value.sources.filter(r=>r.enabled).length,healthy:value.sources.filter(r=>GOOD.has(r.status)).length,warnings:value.sources.filter(r=>WARN.has(r.status)).length,failed:value.sources.filter(r=>r.status==='error').length,blocked:value.sources.filter(r=>r.status==='blocked').length,pending:value.sources.filter(r=>r.status==='pending').length,disabled:value.sources.filter(r=>r.status==='disabled').length};if(Object.entries(expected).some(([key,count])=>value.summary[key]!==count))throw Error('Invalid source health summary');return value;
}
function choose(value){try{return validate(value);}catch{return empty();}}
function update(previous,definitions,report){
 if(!utc(report.asOf))throw Error('Health check time must be UTC');previous=choose(previous);const checkedAt=report.asOf;
 if(previous.checkedAt&&Date.parse(previous.checkedAt)>=Date.parse(checkedAt))return previous;
 const previousRows=new Map(previous.sources.map(row=>[row.id,row])),attempts=new Map((report.sources||[]).map(row=>[row.id,row]));let events=[...previous.events];
 const rows=definitions.map(source=>{
  let old=previousRows.get(source.id);if(old?.url!==source.url)old=null;const attempt=attempts.get(source.id);
  const row={id:source.id,name:source.name,url:source.url,category:source.category,publisher:source.publisher||source.name,sourceKind:source.sourceKind||'official',enabled:source.enabled,staleAfterDays:source.staleAfterDays||((source.sourceKind==='release')?30:14),status:'pending',checkedAt,lastAttemptAt:old?.lastAttemptAt||null,lastSuccessAt:old?.lastSuccessAt||null,lastFailureAt:old?.lastFailureAt||null,lastContentChangedAt:old?.lastContentChangedAt||null,lastPublishedAt:old?.lastPublishedAt||null,lastPublishedAtBasis:old?.lastPublishedAtBasis||'published',consecutiveFailures:old?.consecutiveFailures||0,totalChecks:old?.totalChecks||0,totalFailures:old?.totalFailures||0,lastCount:old?.lastCount??null,lastRawCount:old?.lastRawCount??null,lastItemIds:old?.lastItemIds||[],itemIdsKnown:old?.itemIdsKnown||false,newItemCount:null,lastError:old?.lastError||null,reason:null,httpStatus:attempt?.httpStatus||null,durationMs:attempt?.durationMs??null,invalidCount:attempt?.invalidCount||0,excludedCount:attempt?.excludedCount||0};
  if(!source.enabled){row.status='disabled';row.reason=safeReason(source.reason||'Not enabled');}
  else if(!attempt||attempt.status==='not-attempted'){row.status=report.network==='blocked'?'blocked':'pending';row.reason=safeReason(report.reason||'No check recorded');if(attempt?.attempted){row.lastAttemptAt=checkedAt;row.totalChecks++;}}
  else{
   row.lastAttemptAt=checkedAt;row.totalChecks++;
   const broken=attempt.status==='failed'||(attempt.rawCount>0&&attempt.parsedCount===0)||(attempt.parsedCount>0&&attempt.normalizedCount===0&&attempt.invalidCount>0);
   if(broken){row.status='error';row.consecutiveFailures++;row.totalFailures++;row.lastFailureAt=checkedAt;row.reason=safeReason(attempt.reason||attempt.errors?.[0]?.reason||'No usable dated entries');row.lastError=row.reason;}
   else if(attempt.status==='fetched'){
    row.lastSuccessAt=checkedAt;row.consecutiveFailures=0;row.lastCount=attempt.normalizedCount||0;row.lastRawCount=attempt.rawCount||0;row.lastPublishedAt=attempt.latestPublishedAt||row.lastPublishedAt;if(attempt.latestPublishedAt)row.lastPublishedAtBasis=attempt.latestPublishedAtBasis||(source.sourceKind==='release'?'updated':'published');
    const ids=[...new Set(attempt.itemIds||[])];row.newItemCount=old?.itemIdsKnown&&Array.isArray(attempt.itemIds)?ids.filter(id=>!row.lastItemIds.includes(id)).length:null;if((!old?.lastSuccessAt&&ids.length)||row.newItemCount>0)row.lastContentChangedAt=checkedAt;if(Array.isArray(attempt.itemIds)){row.lastItemIds=ids;row.itemIdsKnown=true;}
    row.status=attempt.invalidCount>0?'degraded':attempt.rawCount===0?'empty':attempt.normalizedCount===0?'no-matches':'healthy';
    if(row.status==='degraded')row.reason=safeReason(attempt.errors?.find(e=>e.reason!=='Outside configured frontier topic scope')?.reason||'Some entries rejected');
    if(row.lastPublishedAt&&Date.parse(checkedAt)-Date.parse(row.lastPublishedAt)>row.staleAfterDays*86400000){row.status='stale';row.reason='Feed is reachable, but its latest original publication exceeds the configured freshness window';}
   }else{row.status='pending';row.reason='No production fetch result';}
  }
  if(row.status!==old?.status){events.push({id:source.id,at:checkedAt,from:old?.status||'pending',to:row.status,reason:row.reason});row.recoveredAt=GOOD.has(row.status)&&old&&['error','blocked','degraded','stale'].includes(old.status)?checkedAt:old?.recoveredAt||null;}else row.recoveredAt=old?.recoveredAt||null;
  return row;
 });
 const summary={total:rows.length,enabled:rows.filter(r=>r.enabled).length,healthy:rows.filter(r=>GOOD.has(r.status)).length,warnings:rows.filter(r=>WARN.has(r.status)).length,failed:rows.filter(r=>r.status==='error').length,blocked:rows.filter(r=>r.status==='blocked').length,pending:rows.filter(r=>r.status==='pending').length,disabled:rows.filter(r=>r.status==='disabled').length};
 return validate({schemaVersion:1,checkedAt,summary,sources:rows,events:events.slice(-250)});
}
module.exports={empty,validate,choose,update,safeReason};
