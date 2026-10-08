import type { DashboardView } from './types';
import type { Preferences } from './preferences.cjs';
export function renderDashboard(view: DashboardView, preferences?: Partial<Preferences> & {briefing?: unknown;sourceHealth?: {summary:{warnings:number;failed:number;blocked:number}}}): string;
