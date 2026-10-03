import type { NewsBatch } from './types';
export function chooseSnapshot(generated: unknown, local: unknown): {batch:NewsBatch;mode:string;reason?:string};
