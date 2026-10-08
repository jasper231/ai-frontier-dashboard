export type Language = 'zh' | 'en';
export function resolveLanguage(preference: string, navigator?: {language?: string; languages?: readonly string[]}): Language;
export function content(object: unknown, field: string, language: Language): string;
export function formatUpdated(value: string, language: Language): string;
export function dictionary(language: Language): {pageTitle: string; description: string};
