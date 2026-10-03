/* Shared pure data logic: Node/Next.js and the offline browser use this exact file. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.FrontierData=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const categoryIds=['ai','agents','chips','robotics','crypto'];
  const views=['Today','Latest','Long-term'];
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
  function selectItems(items,view,asOf){
    if(!views.includes(view))throw new Error('Unknown view');
    const reference=Date.parse(asOf);if(!Number.isFinite(reference))throw new Error('Invalid reference time');
    const day=new Date(reference).toISOString().slice(0,10);
    const eligible=items.filter(item=>Date.parse(item.publishedAt)<=reference);
    if(view==='Today')return eligible.filter(item=>new Date(item.publishedAt).toISOString().slice(0,10)===day).sort(byImportance);
    if(view==='Long-term')return eligible.filter(item=>item.horizonYears>=3&&item.horizonYears<=10).sort((a,b)=>b.longTermImportance-a.longTermImportance||byImportance(a,b));
    return eligible.sort(byLatest);
  }
  function topSignals(items,view='Latest'){return [...items].sort(view==='Long-term'?(a,b)=>b.longTermImportance-a.longTermImportance||byImportance(a,b):byImportance).slice(0,3);}
  function createView(batch,definitions,view,referenceTime=new Date().toISOString()){
    validateBatch(batch);
    const items=selectItems(batch.items,view,referenceTime);
    const categories=definitions.map(c=>({...c,entries:items.filter(item=>item.category===c.id)}));
    return {view,asOf:referenceTime,snapshotAt:batch.asOf,isDemo:batch.isDemo,items,signals:topSignals(items,view),categories,featuredCount:categories.reduce((n,c)=>n+Math.min(2,c.entries.length),0)};
  }
  function signalText(item){return {title:item.signalBrief?.title||item.title,happened:item.signalBrief?.happened||item.summary,matters:item.signalBrief?.matters||item.whyItMatters,impact:item.signalBrief?.impact||item.longTermImpact,domain:item.category==='chips'?'Chips':item.category==='ai'?'AI':item.category[0].toUpperCase()+item.category.slice(1)};}
  function formatDate(value){return new Date(value).toISOString().slice(0,10).replace(/-/g,'.');}
  return {validateBatch,selectItems,topSignals,createView,signalText,formatDate};
});
