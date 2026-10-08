/* Evidence-linked editorial contract. Never converts rule scores/templates into prose. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../news/core.cjs'));else root.FrontierBriefing=factory(root.FrontierData);})(typeof globalThis!=='undefined'?globalThis:this,function(news){
 'use strict';
 const empty=()=>({schemaVersion:1,editions:[]});
 const utc=value=>typeof value==='string'&&/Z$/.test(value)&&Number.isFinite(Date.parse(value));
 function validateEdition(e,{allowSynthetic=false}={}){
  const fail=message=>{throw new Error('Invalid briefing: '+message);};
  const bilingual=value=>{if(!value||!['zh','en'].every(lang=>typeof value[lang]==='string'&&value[lang].trim()))fail('both languages required');};
  if(!e||e.schemaVersion!==1||e.status!=='published'||e.timeZone!=='Asia/Shanghai'||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!utc(e.generatedAt)||!utc(e.sourceSnapshotAt)||news.shanghaiDay(e.generatedAt)!==e.date||Date.parse(e.sourceSnapshotAt)>Date.parse(e.generatedAt))fail('edition date/provenance time');
  if(!e.provenance||!['human','agent',...(allowSynthetic?['synthetic']:[])].includes(e.provenance.kind)||typeof e.provenance.author!=='string'||!e.provenance.author.trim()||e.provenance.evidenceReviewed!==true||e.provenance.bilingualReviewed!==true)fail('review provenance');
  if(!Array.isArray(e.sources)||!e.sources.length)fail('sources');
  const byId=new Map();
  for(const source of e.sources){
   if(!source||typeof source.id!=='string'||!source.id.trim()||byId.has(source.id)||!utc(source.publishedAt)||Date.parse(source.publishedAt)>Date.parse(e.generatedAt)||!['title','source','sourceUrl','excerpt'].every(k=>typeof source[k]==='string'&&source[k].trim()))fail('source record');
   let url;try{url=new URL(source.sourceUrl);}catch{fail('source URL');}if(!['http:','https:'].includes(url.protocol)||url.username||url.password)fail('source URL');
   byId.set(source.id,source);
  }
  function paragraph(p,kind){
   bilingual(p?.text);if(p.kind!==kind||!Array.isArray(p.evidenceIds)||!p.evidenceIds.length||new Set(p.evidenceIds).size!==p.evidenceIds.length||p.evidenceIds.some(id=>!byId.has(id)))fail('paragraph evidence/kind');
   for(const lang of ['zh','en'])if(/规则分析|规则情景/.test(p.text[lang]))fail('template copy');
  }
  const paragraphs=(values,kind)=>{if(!Array.isArray(values)||!values.length)fail('empty narrative section');values.forEach(p=>paragraph(p,kind));};
  if(!Array.isArray(e.executiveOpening)||e.executiveOpening.length<2||e.executiveOpening.length>4)fail('opening must contain 2–4 sentences');e.executiveOpening.forEach(p=>paragraph(p,'analysis'));
  if(!Array.isArray(e.stories)||!e.stories.length||e.stories.length>5)fail('1–5 editorial stories; never pad');
  const storyIds=new Set(),primaryIds=new Set();
  for(const story of e.stories){
   if(typeof story.id!=='string'||!story.id.trim()||storyIds.has(story.id))fail('duplicate story');storyIds.add(story.id);bilingual(story.title);
   if(!Array.isArray(story.newsIds)||!story.newsIds.length||new Set(story.newsIds).size!==story.newsIds.length||story.newsIds.some(id=>!byId.has(id)||primaryIds.has(id)||news.shanghaiDay(byId.get(id).publishedAt)!==e.date))fail('story must use distinct same-day sources');story.newsIds.forEach(id=>primaryIds.add(id));
   paragraphs(story.confirmedFacts,'confirmed');paragraphs(story.whyItMatters,'analysis');paragraphs(story.yearView,'hypothesis');paragraphs(story.opportunities,'hypothesis');paragraphs(story.risks,'hypothesis');
   if(story.crossAnalysis){paragraphs(story.crossAnalysis,'analysis');if(story.crossAnalysis.some(p=>p.evidenceIds.length<2||!p.evidenceIds.some(id=>story.newsIds.includes(id))||!p.evidenceIds.some(id=>!story.newsIds.includes(id))))fail('cross analysis requires multiple sources');}
  }
  const duplicateText=new Set();
  for(const story of e.stories)for(const field of ['whyItMatters','yearView','opportunities','risks'])for(const p of story[field])for(const lang of ['zh','en']){const key=lang+':'+p.text[lang].trim().replace(/\s+/g,' ');if(duplicateText.has(key))fail('repeated analysis template');duplicateText.add(key);}
  if(!Array.isArray(e.watchNext)||e.watchNext.length!==3)fail('exactly three validation points');e.watchNext.forEach(p=>paragraph(p,'hypothesis'));
  bilingual(e.keyword?.term);paragraph(e.keyword?.explanation,'analysis');
  if(e.framework)paragraph(e.framework,'analysis');
  return e;
 }
 function validateArchive(archive,options){if(!archive||archive.schemaVersion!==1||!Array.isArray(archive.editions))throw new Error('Invalid briefing archive');const days=new Set();for(const edition of archive.editions){validateEdition(edition,options);if(days.has(edition.date))throw new Error('Duplicate briefing date');days.add(edition.date);}return archive;}
 function selectEdition(archive,asOf){try{return validateArchive(archive).editions.find(e=>e.date===news.shanghaiDay(asOf)&&Date.parse(e.generatedAt)<=Date.parse(asOf))||null;}catch{return null;}}
 function chooseArchive(generated,local=empty()){try{return validateArchive(generated);}catch{try{return validateArchive(local);}catch{return empty();}}}
 function bindSources(edition,batch){news.validateBatch(batch);if(batch.isDemo)throw new Error('Cannot publish a real briefing from demo news');if(edition.sourceSnapshotAt!==batch.asOf)throw new Error('Briefing snapshot mismatch');const byId=new Map(batch.items.map(i=>[i.id,i]));for(const source of edition.sources){const item=byId.get(source.id);if(!item||['title','source','sourceUrl','publishedAt'].some(k=>source[k]!==item[k])||source.excerpt!==item.summary)throw new Error('Briefing source does not match original snapshot: '+source.id);}return edition;}
 return {empty,validateEdition,validateArchive,selectEdition,chooseArchive,bindSources};
});
