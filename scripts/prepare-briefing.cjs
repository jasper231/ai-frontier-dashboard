/* Prepare editorial inputs only. Does not generate analysis, fetch URLs or call a model. */
const fs=require('node:fs');const path=require('node:path');const news=require('../src/lib/news/core.cjs');
function prepare(batch,asOf=new Date().toISOString()){
 news.validateBatch(batch);if(batch.isDemo)throw new Error('Real source snapshot required for an editorial briefing');
 const candidates=news.dailyBriefing(batch.items,asOf),ids=new Set(candidates.map(i=>i.id));
 for(const item of candidates)for(const relation of item.ruleAnalysis?.relatedNews||[])ids.add(relation.id);
 const source=item=>({id:item.id,title:item.title,source:item.source,sourceUrl:item.sourceUrl,publishedAt:item.publishedAt,excerpt:item.summary});
 return {schemaVersion:1,date:news.shanghaiDay(asOf),timeZone:'Asia/Shanghai',preparedAt:asOf,sourceSnapshotAt:batch.asOf,sources:batch.items.filter(i=>ids.has(i.id)).map(source),candidates:candidates.map(i=>({newsId:i.id,category:i.category,importance:i.importance,publishedAtBasis:i.ruleAnalysis?.publishedAtBasis||'published',excerptOrigin:i.intelligence?'derived-summary':'feed-excerpt-or-headline',topicLinks:(i.ruleAnalysis?.relatedNews||[]).map(r=>r.id)})),limitations:['Feed excerpts may be incomplete or promotional; verify full official pages before claiming confirmed facts.','Importance and shared-topic links are candidate-selection hints, not research conclusions.','Do not reuse existing rule-generated whyItMatters/longTermImpact as editorial prose.']};
}
if(require.main===module){const output=process.argv[2]||'artifacts/briefing-agent';fs.mkdirSync(output,{recursive:true});const batch=JSON.parse(fs.readFileSync('src/data/news.generated.json','utf8'));fs.copyFileSync('src/data/news.generated.json',path.join(output,'saved-news-snapshot.json'));fs.writeFileSync(path.join(output,'briefing-agent-input.json'),JSON.stringify(prepare(batch),null,2));fs.copyFileSync('src/data/briefing.schema.json',path.join(output,'briefing.schema.json'));fs.copyFileSync('docs/briefing-agent-workflow.md',path.join(output,'briefing-agent-task.md'));console.log('Prepared sourced editorial inputs; no analysis or API calls generated.');}
module.exports={prepare};
