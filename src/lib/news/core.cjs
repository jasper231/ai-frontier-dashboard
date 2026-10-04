/* Shared pure data logic: Node/Next.js and the offline browser use this exact file. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FrontierData=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const categoryIds=['ai','agents','chips','robotics','crypto'];
  const views=['Today','Latest','Long-term','Daily Briefing'];
  // Display-day conversion only; stored timestamps and chronological ranking stay UTC.
  const shanghaiFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  function shanghaiParts(value){
    return Object.fromEntries(shanghaiFormatter.formatToParts(new Date(value)).map(part=>[part.type,part.value]));
  }
  function shanghaiDay(value){const p=shanghaiParts(value);return `${p.year}-${p.month}-${p.day}`;}
  function formatUpdated(value){
    const p=shanghaiParts(value),utc=new Date(value).toISOString().slice(0,16).replace('T',' ');
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} 北京时间（${utc} UTC）`;
  }
  function validateBatch(batch){
    if(!batch||batch.schemaVersion!==1||!Array.isArray(batch.items)||!Number.isFinite(Date.parse(batch.asOf))||batch.timeZone!=='UTC'||typeof batch.isDemo!=='boolean')throw new Error('Invalid news batch');
    const ids=new Set();
    for(const item of batch.items){
      for(const field of ['id','title','source','sourceUrl','publishedAt','summary','whyItMatters','longTermImpact'])if(typeof item[field]!=='string'||!item[field].trim())throw new Error('Missing '+field);
      if(ids.has(item.id))throw new Error('Duplicate id: '+item.id);ids.add(item.id);
      if(!categoryIds.includes(item.category))throw new Error('Invalid category');
      if(!/^https?:\/\//i.test(item.sourceUrl))throw new Error('Invalid source URL');
      try{new URL(item.sourceUrl);}catch{throw new Error('Invalid source URL');}
      if(!/(Z|[+-]\d{2}:\d{2})$/.test(item.publishedAt)||!Number.isFinite(Date.parse(item.publishedAt)))throw new Error('Invalid publication timestamp');
      if(!Array.isArray(item.tags)||!item.tags.every(t=>typeof t==='string'&&t.trim()))throw new Error('Invalid tags');
      if(!Number.isFinite(item.importance)||item.importance<0||item.importance>100)throw new Error('Invalid importance');
      if(!Number.isFinite(item.longTermImportance)||item.longTermImportance<0||item.longTermImportance>100)throw new Error('Invalid long-term importance');
      if(!Number.isFinite(item.horizonYears)||item.horizonYears<0)throw new Error('Invalid horizon');
      if(item.signalBrief){for(const field of ['title','happened','matters','impact'])if(typeof item.signalBrief[field]!=='string'||!item.signalBrief[field].trim())throw new Error('Invalid signal brief');}
    }
    return batch;
  }
  function byLatest(a,b){return Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||b.importance-a.importance||a.id.localeCompare(b.id);}
  function byImportance(a,b){return b.importance-a.importance||byLatest(a,b);}
  function dailyBriefing(items,asOf){
    const reference=Date.parse(asOf);if(!Number.isFinite(reference))throw new Error('Invalid reference time');
    const day=shanghaiDay(reference),urls=new Set(),titles=new Set();
    const pool=[...items].filter(i=>Date.parse(i.publishedAt)<=reference&&shanghaiDay(i.publishedAt)===day&&i.importance>=50).sort(byImportance).filter(item=>{
      const url=new URL(item.sourceUrl);url.hash='';for(const key of [...url.searchParams.keys()])if(/^utm_|^(gclid|fbclid)$/i.test(key))url.searchParams.delete(key);url.searchParams.sort();url.pathname=url.pathname.replace(/\/$/,'')||'/';
      const identity=url.toString(),title=item.title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
      if(urls.has(identity)||(title.length>=20&&titles.has(title)))return false;urls.add(identity);if(title.length>=20)titles.add(title);return true;
    });
    const selected=[],sourceCounts=new Map(),categoryCounts=new Map(),themeCounts=new Map();
    const publisher=item=>item.ruleAnalysis?.sourceQuality.publisher||item.source;
    const merit=item=>item.importance-(sourceCounts.get(publisher(item))||0)*8-(categoryCounts.get(item.category)||0)*4-(item.ruleAnalysis?.themes||[]).reduce((n,t)=>n+(themeCounts.get(t.id)||0)*5,0);
    while(pool.length&&selected.length<10){
      pool.sort((a,b)=>merit(b)-merit(a)||byImportance(a,b));const item=pool.shift();selected.push(item);
      sourceCounts.set(publisher(item),(sourceCounts.get(publisher(item))||0)+1);categoryCounts.set(item.category,(categoryCounts.get(item.category)||0)+1);
      for(const theme of item.ruleAnalysis?.themes||[])themeCounts.set(theme.id,(themeCounts.get(theme.id)||0)+1);
    }
    return selected;
  }
  function selectItems(items,view,asOf){
    if(!views.includes(view))throw new Error('Unknown view');
    const reference=Date.parse(asOf);if(!Number.isFinite(reference))throw new Error('Invalid reference time');
    const day=shanghaiDay(reference);
    const eligible=items.filter(item=>Date.parse(item.publishedAt)<=reference);
    if(view==='Daily Briefing')return dailyBriefing(eligible,asOf);
    if(view==='Today')return eligible.filter(item=>shanghaiDay(item.publishedAt)===day).sort(byImportance);
    if(view==='Long-term')return eligible.filter(item=>item.horizonYears>=3&&item.horizonYears<=10).sort((a,b)=>b.longTermImportance-a.longTermImportance||byImportance(a,b));
    return eligible.sort(byLatest);
  }
  function topSignals(items,view='Latest'){return [...items].sort(view==='Long-term'?(a,b)=>b.longTermImportance-a.longTermImportance||byImportance(a,b):byImportance).slice(0,3);}
  function createView(batch,definitions,view,referenceTime=new Date().toISOString()){
    validateBatch(batch);
    const items=selectItems(batch.items,view,referenceTime);
    const categories=definitions.map(c=>({...c,entries:items.filter(item=>item.category===c.id)}));
    return {view,asOf:referenceTime,snapshotAt:batch.asOf,isDemo:batch.isDemo,items,relatedItems:batch.items,signals:topSignals(items,view),categories,featuredCount:categories.reduce((n,c)=>n+Math.min(2,c.entries.length),0)};
  }
  function signalText(item){return {title:item.signalBrief?.title||item.title,happened:item.signalBrief?.happened||item.summary,matters:item.signalBrief?.matters||item.whyItMatters,impact:item.signalBrief?.impact||item.longTermImpact,domain:item.category==='chips'?'Chips':item.category==='ai'?'AI':item.category[0].toUpperCase()+item.category.slice(1)};}
  function formatDate(value){return new Date(value).toISOString().slice(0,10).replace(/-/g,'.');}
  return {validateBatch,selectItems,topSignals,createView,dailyBriefing,signalText,formatDate,shanghaiDay,formatUpdated,views};
});
