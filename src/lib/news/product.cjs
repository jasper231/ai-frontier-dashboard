/* Product views and reviewed trend content. Raw RSS records remain untouched. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.cjs'),require('../briefing/core.cjs'));else root.FrontierProduct=factory(root.FrontierData,root.FrontierBriefing);})(typeof globalThis!=='undefined'?globalThis:this,function(news,briefing){
 'use strict';
 const mainViews=['Daily Briefing','Long-term'];
 const fields=['title','summary','whyItMatters','longTermImpact'];
 const text=(paragraphs,lang)=>paragraphs.map(p=>p.text[lang]).join('\n\n');
 const completeZh=item=>fields.every(key=>typeof item[key+'Zh']==='string'&&/[\u3400-\u9fff]/.test(item[key+'Zh']))&&Array.isArray(item.tagsZh)&&item.tagsZh.length>0;
 function trends(batch,archive,asOf){
  const records=new Map(),urls=new Set(),raw=new Map(batch.items.map(item=>[item.id,item]));
  for(const edition of briefing.publishedEditions(archive,asOf))for(const story of briefing.sortStories(edition.stories)){
   const primary=edition.sources.find(s=>story.newsIds.includes(s.id));if(!primary||!briefing.sourceUrl(primary.url)||urls.has(primary.url))continue;
   const original=raw.get(primary.id),score=story.internalRanking;
   const item={...(original||{}),id:primary.id,category:story.category,source:primary.name,sourceUrl:primary.url,publishedAt:primary.publishedAt,title:primary.title,summary:primary.excerpt,whyItMatters:text(story.whyItMatters,'en'),longTermImpact:text(story.longTermView,'en'),tags:story.keywords.map(k=>k.term.en),importance:score?.importance||75,longTermImportance:score?.longTermImportance||75,horizonYears:7,trendReviewed:true};
   for(const lang of ['zh','en']){const suffix=lang==='zh'?'Zh':'En';Object.assign(item,{['title'+suffix]:story.title[lang],['summary'+suffix]:text(story.verifiedFacts,lang),['plainExplanation'+suffix]:story.plainExplanation.text[lang],['whyItMatters'+suffix]:text(story.whyItMatters,lang),['longTermImpact'+suffix]:text(story.longTermView,lang),['tags'+suffix]:story.keywords.map(k=>k.term[lang]),['trendKeywords'+suffix]:story.keywords.map(k=>k.term[lang]+(lang==='zh'?'（':' (')+k.explanation[lang]+(lang==='zh'?'）':')')),['source'+suffix]:(lang==='zh'?'来源｜':'Source | ')+primary.name});}
   item.signalBrief=undefined;records.set(item.id,item);urls.add(item.sourceUrl);
  }
  // A future editorial/translation adapter may supply these existing bilingual fields.
  // Incomplete English-only candidates stay in the underlying Radar data, not this reading view.
  for(const item of batch.items)if(!batch.isDemo&&!records.has(item.id)&&!urls.has(item.sourceUrl)&&completeZh(item)&&item.horizonYears>=3&&item.horizonYears<=10&&item.longTermImportance>=75&&briefing.sourceUrl(item.sourceUrl)){
   records.set(item.id,{...item,sourceZh:item.sourceZh||'来源｜'+item.source,plainExplanationZh:item.plainExplanationZh||item.summaryZh});urls.add(item.sourceUrl);
  }
  return [...records.values()].filter(i=>Date.parse(i.publishedAt)<=Date.parse(asOf));
 }
 function createModel(batch,definitions,view,asOf,archive){
  const selected=mainViews.includes(view)?view:'Daily Briefing';
  return news.createView(selected==='Long-term'?{...batch,items:trends(batch,archive,asOf)}:batch,definitions,selected,asOf);
 }
 function briefingStatus(archive,asOf,editionDate){
  const published=briefing.publishedEditions(archive,asOf),selected=briefing.resolveEdition(archive,asOf,editionDate);
  return {editionDate:selected?.date||null,latestDate:published[0]?.date||null,todayPublished:published.some(e=>e.date===news.shanghaiDay(asOf))};
 }
 function readLocation(location){const params=new URLSearchParams((location?.hash||'').slice(1));return {view:params.get('view')==='trends'?'Long-term':'Daily Briefing',editionDate:/^\d{4}-\d{2}-\d{2}$/.test(params.get('date')||'')?params.get('date'):undefined};}
 function writeLocation(env,view,editionDate){const params=new URLSearchParams({view:view==='Long-term'?'trends':'briefing'});if(editionDate)params.set('date',editionDate);const hash='#'+params.toString();try{if(env.location.hash!==hash)env.history.pushState(null,'',hash);}catch{/* restricted file/WebView history must not prevent reading */}}
 return {mainViews,trends,completeZh,createModel,briefingStatus,readLocation,writeLocation};
});
