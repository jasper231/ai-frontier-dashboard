const fs=require('node:fs');
const path=require('node:path');
const {parseFeed}=require('./parser.cjs');
const {normalize,deduplicate}=require('./normalizer.cjs');
const {validateBatch}=require('../core.cjs');
const {analyzeBatch}=require('../intelligence/engine.cjs');
const {associate}=require('../quality/rules.cjs');
async function collect(sources,fetcher,{isDemo=false,asOf=new Date().toISOString()}={}){
 const normalized=[],rawRecords=[],results=[];
 for(const source of sources){
  if(!source.enabled){results.push({id:source.id,status:'disabled',reason:source.reason});continue;}
  const started=Date.now();
  try{
   const xml=await fetcher(source);
   const parsed=parseFeed(xml,source.url,{allowUpdatedAsPublished:source.sourceKind==='release'});let valid=0,excludedCount=0,invalidCount=parsed.errors.length;const itemIds=[];const errors=[...parsed.errors];
   for(const raw of parsed.records){
    rawRecords.push({sourceId:source.id,...raw});
    try{const item=normalize(raw,source,{asOf});if(Date.parse(item.publishedAt)>Date.parse(asOf))throw new Error('Future publication date');if(isDemo){item.source+=' (测试样本)';item.tags.push('测试样本');}normalized.push(item);itemIds.push(item.id);valid++;}catch(error){if(error.message==='Outside configured frontier topic scope')excludedCount++;else invalidCount++;errors.push({title:raw.title,reason:error.message});}
   }
   results.push({id:source.id,status:isDemo?'fixture-tested':'fetched',format:parsed.format,rawCount:parsed.rawCount,parsedCount:parsed.parsedCount,normalizedCount:valid,itemIds:[...new Set(itemIds)],excludedCount,invalidCount,durationMs:Date.now()-started,latestPublishedAtBasis:parsed.records.filter(r=>Number.isFinite(Date.parse(r.publishedAt))&&Date.parse(r.publishedAt)<=Date.parse(asOf)).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))[0]?.publishedAtBasis||'published',latestPublishedAt:parsed.records.map(r=>Date.parse(r.publishedAt)).filter(t=>Number.isFinite(t)&&t<=Date.parse(asOf)).sort((a,b)=>b-a).map(t=>new Date(t).toISOString())[0]||null,errors});
  }catch(error){results.push({id:source.id,status:'failed',reason:error.message,code:error.code||null,httpStatus:error.httpStatus||null,durationMs:Date.now()-started});}
 }
 const items=deduplicate(normalized).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||b.importance-a.importance||a.id.localeCompare(b.id));
 const batch=validateBatch({schemaVersion:1,asOf,timeZone:'UTC',isDemo,items});
 const categories=Object.fromEntries(['ai','agents','chips','robotics','crypto'].map(c=>[c,items.filter(i=>i.category===c).length]));
 return {batch,rawRecords,report:{mode:isDemo?'fixtures':'live',asOf,sources:results,rawCount:results.reduce((n,s)=>n+(s.rawCount||0),0),normalizedCount:normalized.length,deduplicatedCount:items.length,duplicatesRemoved:normalized.length-items.length,categories}};
}
function atomicWrite(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(data,null,2)+'\n');fs.renameSync(temp,file);}
async function prepareSnapshot(result,options){
 const analysis=await analyzeBatch(result.batch,{...options,rawRecords:result.rawRecords});
 const items=associate(analysis.batch.items);
 return {...result,batch:{...analysis.batch,items},report:{...result.report,intelligence:analysis.report,themeRelations:items.reduce((n,i)=>n+(i.ruleAnalysis?.relatedNews.length||0),0),deduplicatedCount:items.length,duplicatesRemoved:result.report.normalizedCount-items.length,categories:Object.fromEntries(['ai','agents','chips','robotics','crypto'].map(category=>[category,items.filter(i=>i.category===category).length]))}};
}
function publishResult(result,file){
 if(result.batch.isDemo)throw new Error('Refuse to publish synthetic fixture data as real news');
 if(result.batch.items.some(item=>item.intelligence?.origin==='mock'))throw new Error('Refuse to publish mock analysis as real news');
 if(!result.batch.items.length)return {written:false,reason:'No valid articles; existing generated snapshot preserved'};
 validateBatch(result.batch);atomicWrite(file,result.batch);return {written:true};
}
module.exports={collect,prepareSnapshot,atomicWrite,publishResult};
