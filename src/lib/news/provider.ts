import fs from 'node:fs/promises';
import path from 'node:path';
import snapshot from '@/data/news.local.json';
import definitions from '@/data/categories.json';
import { validateBatch } from './core.cjs';
import { chooseSnapshot } from './snapshot.cjs';
import type { CategoryDefinition, NewsProvider } from './types';
export const localSnapshot = validateBatch(snapshot);
export const categoryDefinitions = definitions as CategoryDefinition[];
export const newsProvider: NewsProvider = { async load() {
  let generated: unknown;
  try { generated=JSON.parse(await fs.readFile(path.join(process.cwd(),'src/data/news.generated.json'),'utf8')); }
  catch { generated=undefined; }
  return chooseSnapshot(generated,localSnapshot).batch;
} };
export const localNewsProvider = newsProvider;
