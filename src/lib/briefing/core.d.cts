import type {NewsBatch} from '../news/types';
export interface BilingualText {zh:string;en:string}
export interface Narrative {text:BilingualText;evidenceIds:string[];kind:'confirmed'|'analysis'|'hypothesis'}
export interface BriefingSource {id:string;name:string;url:string;type:'official'|'news'|'research';publisher:string;title:string;publishedAt:string;excerpt:string;origin?:'snapshot'|'agent-enrichment';adapterId?:string;reviewedAt?:string}
export interface BriefingStory {id:string;order:number;category:'ai'|'agents'|'chips'|'robotics'|'crypto';title:BilingualText;keyTakeaway?:Narrative;newsIds:string[];verifiedFacts:Narrative[];sources:BriefingSource[];plainExplanation:Narrative;example?:Narrative|null;whyItMatters:Narrative[];longTermView:Narrative[];opportunities:Narrative[];risks:Narrative[];keywords:{term:BilingualText;explanation:BilingualText}[];relatedStoryIds:string[];verification:{independentlyConfirmed:boolean};crossAnalysis?:Narrative[];internalRanking?:{importance:number;sourceQuality:number;longTermImportance:number}}
export interface BriefingEdition {schemaVersion:2;status:'published';date:string;timeZone:'Asia/Shanghai';generatedAt:string;sourceSnapshotAt:string;coverageWindow?:{start:string;end:string};provenance:{kind:'human'|'agent';author:string;evidenceReviewed:true;bilingualReviewed:true};sources:BriefingSource[];executiveOpening:Narrative[];stories:BriefingStory[];watchNext:Narrative[];keyword:{term:BilingualText;explanation:Narrative;whyNow:Narrative};framework?:Narrative}
export interface BriefingArchive {schemaVersion:2;editions:BriefingEdition[]}
export function empty():BriefingArchive;
export function validateEdition(value:unknown):BriefingEdition;
export function validateArchive(value:unknown):BriefingArchive;
export function selectEdition(archive:unknown,asOf:string):BriefingEdition|null;
export function chooseArchive(generated:unknown,local?:unknown):BriefingArchive;
export function sourceUrl(value:unknown):string|null;
export function corroborated(story:BriefingStory):boolean;
export function sortStories(stories:BriefingStory[]):BriefingStory[];
export function rankStories(stories:BriefingStory[]):BriefingStory[];
export function bindSources(edition:BriefingEdition,batch:NewsBatch,registry?:{id:string;publisher:string;type:string;hosts:string[]}[]):BriefingEdition;

export function publishedEditions(archive:unknown,asOf:string):BriefingEdition[];
export function resolveEdition(archive:unknown,asOf:string,date?:string):BriefingEdition|null;
