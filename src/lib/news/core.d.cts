import type { NewsBatch, NewsItem, CategoryDefinition, DashboardView, View } from './types';
export function validateBatch(batch: unknown): NewsBatch;
export function selectItems(items: NewsItem[], view: View, asOf: string): NewsItem[];
export function topSignals(items: NewsItem[]): NewsItem[];
export function createView(batch: NewsBatch, definitions: CategoryDefinition[], view: View, referenceTime?: string): DashboardView;
export function signalText(item: NewsItem): {title:string;happened:string;matters:string;impact:string;domain:string};
export function formatDate(value: string): string;
