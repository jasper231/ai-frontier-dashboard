export type CategoryId = 'ai' | 'agents' | 'chips' | 'robotics' | 'crypto';
export type View = 'Today' | 'Latest' | 'Long-term' | 'Daily Briefing';
export interface NewsItem {
  id: string; title: string; category: CategoryId; source: string; sourceUrl: string;
  publishedAt: string; summary: string; whyItMatters: string; longTermImpact: string;
  tags: string[]; importance: number; horizonYears: number; longTermImportance: number;
  titleZh?: string; titleEn?: string; summaryZh?: string; summaryEn?: string;
  whyItMattersZh?: string; whyItMattersEn?: string; longTermImpactZh?: string; longTermImpactEn?: string;
  sourceZh?: string; sourceEn?: string; tagsZh?: string[]; tagsEn?: string[];
  signalBrief?: { title: string; happened: string; matters: string; impact: string; titleZh?: string; titleEn?: string; happenedZh?: string; happenedEn?: string; mattersZh?: string; mattersEn?: string; impactZh?: string; impactEn?: string };
  intelligence?: StoryIntelligence;
  ruleAnalysis?: { version: string; scoring: {reason:string;points:number}[];
    themes: {id:string;label:string;evidence:'headline'|'excerpt'}[];
    sourceQuality: {kind:string;score:number;note:string;publisher?:string}; publishedAtBasis:'published'|'updated';
    relatedNews: {id:string;relationship:'shared-topic';themes:string[];differentSource:boolean}[] };
}
export interface NewsBatch { schemaVersion: 1; asOf: string; timeZone: 'UTC'; isDemo: boolean; items: NewsItem[] }
export interface CategoryDefinition { id: CategoryId; title: string; subtitle: string }
export interface CategoryView extends CategoryDefinition { entries: NewsItem[] }
export interface DashboardView { view: View; asOf: string; snapshotAt: string; isDemo: boolean; items: NewsItem[]; signals: NewsItem[]; categories: CategoryView[]; relatedItems: NewsItem[]; featuredCount: number }
export interface NewsProvider { load(): Promise<NewsBatch> }
/** Future RSS/API/scraping adapters parse external results into normalized records. */
export interface RawStory { source: string; sourceUrl: string; title: string; publishedAt: string; content: string }
export interface SourceAdapter { fetch(): Promise<RawStory[]> }
export interface StoryNormalizer { normalize(story: RawStory): Promise<NewsItem> }
/** Optional AI enrichment replaces summaries/analysis before publishing the snapshot. */
export interface NewsEnricher { enrich(item: NewsItem): Promise<NewsItem> }
/** Additive metadata; frozen UI continues reading the existing scores and text. */
export interface StoryIntelligence {
  schemaVersion: 1; origin: 'ai' | 'mock'; provider: string; model: string | null;
  promptVersion: string; analyzedAt: string; opportunity: string; risk: string;
  credibility: { score: number; sourceQuality: 'official-primary' | 'research-preprint' | 'unknown'; assessment: string };
  confidence: number; evidenceIds: string[]; relatedNewsIds: string[]; duplicateOf: string | null;
}
export interface AnalysisRecord {
  id: string; title: string; whatHappened: string; whyItMatters: string; longTermImpact: string;
  importance: number; longTermImportance: number; horizonYears: number; opportunity: string; risk: string;
  credibility: StoryIntelligence['credibility']; confidence: number; evidenceIds: string[];
  relatedNewsIds: string[]; duplicateOf: string | null;
}
export interface FrontierAnalysisProvider {
  id: string; kind: 'rules' | 'mock' | 'ai'; model?: string | null;
  analyze?(input: { schemaVersion: 1; promptVersion: string; systemPrompt: string; asOf: string;
    candidates: (NewsItem & { excerpt: string })[] }, options: { signal: AbortSignal }): Promise<{ schemaVersion: 1; items: AnalysisRecord[] }>;
}
