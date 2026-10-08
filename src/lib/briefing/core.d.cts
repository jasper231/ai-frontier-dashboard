import type { NewsBatch } from '../news/types';
export interface BilingualText {zh: string; en: string}
export interface Narrative {text: BilingualText; evidenceIds: string[]; kind: 'confirmed' | 'analysis' | 'hypothesis'}
export interface BriefingSource {id:string; title:string; source:string; sourceUrl:string; publishedAt:string; excerpt:string}
export interface BriefingStory {id:string; title:BilingualText; newsIds:string[]; confirmedFacts:Narrative[]; whyItMatters:Narrative[]; yearView:Narrative[]; opportunities:Narrative[]; risks:Narrative[]; crossAnalysis?:Narrative[]}
export interface BriefingEdition {schemaVersion:1; status:'published'; date:string; timeZone:'Asia/Shanghai'; generatedAt:string; sourceSnapshotAt:string; provenance:{kind:'human'|'agent';author:string;evidenceReviewed:true;bilingualReviewed:true};sources:BriefingSource[]; executiveOpening:Narrative[];stories:BriefingStory[];watchNext:Narrative[];keyword:{term:BilingualText;explanation:Narrative};framework?:Narrative}
export interface BriefingArchive {schemaVersion:1; editions:BriefingEdition[]}
export function empty():BriefingArchive;
export function validateEdition(value:unknown, options?:{allowSynthetic?:boolean}):BriefingEdition;
export function validateArchive(value:unknown, options?:{allowSynthetic?:boolean}):BriefingArchive;
export function selectEdition(archive:unknown, asOf:string):BriefingEdition|null;
export function chooseArchive(generated:unknown, local?:unknown):BriefingArchive;
export function bindSources(edition:BriefingEdition,batch:NewsBatch):BriefingEdition;
