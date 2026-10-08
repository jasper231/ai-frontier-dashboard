# Theme and language preferences

Both Next.js and self-contained Pages use `i18n.cjs`, `preferences.cjs` and the same `render.cjs`.

- Theme defaults to `system`. `frontier.theme` in localStorage stores `system`, `light` or `dark`.
- Language defaults to `auto`. `frontier.language` stores `auto`, `zh` or `en`. Auto uses the first preferred browser language, falling back to `navigator.language`; Chinese locales resolve to Chinese, all others to English.
- System theme listens to `prefers-color-scheme: dark` changes. Auto language listens to `languagechange`. Storage events synchronize tabs. Invalid/blocked storage falls back safely.
- `bootstrap.cjs` embeds the dictionary and preference controller into the HTML head before CSS/body. It sets the resolved `data-theme`, HTML language, title and description before paint. The root waits until its UI language is rendered. Next.js reuses that controller after hydration; static Pages bundles its own pure JS renderer with no external runtime.
- Light and dark palettes live in CSS custom properties. Without JS, CSS media queries still follow the system.
- `titleZh/titleEn`, `summaryZh/summaryEn`, `whyItMattersZh/whyItMattersEn`, `longTermImpactZh/longTermImpactEn`, source/tags variants and localized `signalBrief` fields are optional read-only presentation inputs. Missing translations fall back to the stored original. No API, translation, generated news or ranking changes are introduced.

Run `npm run build:pages` before the data/Pages tests. `npm run test:pages` includes preference and offline browser-runtime tests. `scripts/create-browser-regression.mjs` generates real Chrome checks for media changes, language overrides, metadata, persisted choices across mobile document reloads and 390px layout.
