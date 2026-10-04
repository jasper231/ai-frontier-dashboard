/* Provider responses are untrusted. They may enrich analysis, never article identity. */
const VERSION=1;
const QUALITY=['official-primary','research-preprint','unknown'];
function text(value,name,max=1600){
 if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('Invalid '+name);
 return value.trim();
}
function score(value,name){if(!Number.isFinite(value)||value<0||value>100)throw new Error('Invalid '+name);return value;}
function ids(value,known,name,limit=8){
 if(!Array.isArray(value)||value.length>limit||new Set(value).size!==value.length||value.some(id=>!known.has(id)))throw new Error('Invalid '+name);
 return [...value];
}
function validateAnalysis(record,known){
 if(!record||!known.has(record.id))throw new Error('Unknown article');
 const evidenceIds=ids(record.evidenceIds,known,'evidence');
 if(!evidenceIds.includes(record.id))throw new Error('Missing own evidence');
 const relatedNewsIds=ids(record.relatedNewsIds,known,'relations');
 if(relatedNewsIds.includes(record.id)||relatedNewsIds.some(id=>!evidenceIds.includes(id)))throw new Error('Unsupported relation');
 if(!Number.isFinite(record.horizonYears)||record.horizonYears<3||record.horizonYears>10)throw new Error('Invalid impact horizon');
 if(!Number.isFinite(record.confidence)||record.confidence<0||record.confidence>1)throw new Error('Invalid confidence');
 if(!record.credibility||!QUALITY.includes(record.credibility.sourceQuality))throw new Error('Invalid source quality');
 const duplicateOf=record.duplicateOf??null;
 if(duplicateOf!==null&&(!known.has(duplicateOf)||duplicateOf===record.id||!evidenceIds.includes(duplicateOf)))throw new Error('Unsupported duplicate');
 return {id:record.id,title:text(record.title,'brief title',120),importance:score(record.importance,'importance'),longTermImportance:score(record.longTermImportance,'long-term score'),horizonYears:record.horizonYears,
  whatHappened:text(record.whatHappened,'what happened'),whyItMatters:text(record.whyItMatters,'why it matters'),longTermImpact:text(record.longTermImpact,'long-term impact'),opportunity:text(record.opportunity,'opportunity'),risk:text(record.risk,'risk'),
  credibility:{score:score(record.credibility.score,'credibility'),sourceQuality:record.credibility.sourceQuality,assessment:text(record.credibility.assessment,'source assessment',600)},confidence:record.confidence,relatedNewsIds,evidenceIds,duplicateOf};
}
module.exports={VERSION,validateAnalysis};
