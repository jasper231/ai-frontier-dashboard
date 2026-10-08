export interface Preferences {themePreference: 'system' | 'light' | 'dark'; languagePreference: 'auto' | 'zh' | 'en'; theme: 'light' | 'dark'; language: 'zh' | 'en'}
export interface PreferenceController {snapshot(): Preferences; apply(): Preferences; setTheme(value: string): Preferences; setLanguage(value: string): Preferences; subscribe(listener: (state: Preferences) => void): () => void; ready(): void; dispose(): void}
export const keys: {theme: string; language: string};
export function initialize(environment: Window & typeof globalThis): PreferenceController;
