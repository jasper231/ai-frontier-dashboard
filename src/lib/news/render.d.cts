import type { DashboardView } from './types';
import type { Preferences } from './preferences.cjs';
export function renderDashboard(view: DashboardView, preferences?: Partial<Preferences> & {briefing?: unknown;editionDate?:string}): string;
