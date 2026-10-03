export type CategoryId = 'ai' | 'agents' | 'chips' | 'robotics' | 'crypto';
export type View = 'Today' | 'Latest' | 'Long-term';
export interface NewsItem {
  id: string; title: string; category: CategoryId; source: string; sourceUrl: string;
  publishedAt: string; summary: string; whyItMatters: string; longTermImpact: string;
  tags: string[]; importance: number; horizonYears: number; longTermImportance: number;
  signalBrief?: { title: string; happened: string; matters: string; impact: string };
}
export interface NewsBatch { schemaVersion: 1; asOf: string; timeZone: 'UTC'; isDemo: boolean; items: NewsItem[] }
export interface CategoryDefinition { id: CategoryId; title: string; subtitle: string }
export interface CategoryView extends CategoryDefinition { entries: NewsItem[] }
export interface DashboardView { view: View; asOf: string; snapshotAt: string; isDemo: boolean; items: NewsItem[]; signals: NewsItem[]; categories: CategoryView[]; featuredCount: number }
export interface NewsProvider { load(): Promise<NewsBatch> }
/** Future RSS/API/scraping adapters parse external results into normalized records. */
export interface RawStory { source: string; sourceUrl: string; title: string; publishedAt: string; content: string }
export interface SourceAdapter { fetch(): Promise<RawStory[]> }
export interface StoryNormalizer { normalize(story: RawStory): Promise<NewsItem> }
/** Optional AI enrichment replaces summaries/analysis before publishing the snapshot. */
export interface NewsEnricher { enrich(item: NewsItem): Promise<NewsItem> }
