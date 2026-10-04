import type { NewsBatch } from '../types';
export function enhanceBatch(batch: NewsBatch, sources: {name:string;category:string;sourceKind?:string}[]): NewsBatch;
