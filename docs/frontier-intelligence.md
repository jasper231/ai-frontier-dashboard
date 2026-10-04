# Frontier Intelligence Engine — phase one

The UI, RSS sources, existing NewsBatch schema version, article identity, Pages publishing and snapshot fallback remain intact. This phase adds the analysis architecture, not a live GPT service. Production remains in `rules` mode. No paid API call, model SDK, new dependency or actual key is used.

## Data flow

Official RSS/Atom → parser → official-host validation and rule normalization → URL/title dedup → `prepareSnapshot` → bounded batch `analyzeBatch` → provider → validate analysis → conservative semantic dedup → update existing analysis/scores → `news.generated.json` → existing Next.js/static renderer → Pages.

Top Signals continues using the existing importance fields. Accepted provider scores replace rule scores; Latest cards stay chronological, Today uses the current UTC day, Long-term filters 3–10 year horizons and ranks by `longTermImportance`. Top Signals is recalculated for each view. No special AI ranking is hard-coded into the UI.

## Files

- `src/lib/news/intelligence/providers.cjs`: uniform provider factory; rules, deterministic mock and disabled OpenAI adapter.
- `prompt.cjs`: versioned analyst instructions, evidence/uncertainty requirements and prompt-injection boundaries.
- `contract.cjs`: response validation, bounded text, scores, explicit evidence and known-ID relations.
- `engine.cjs`: batch context, candidate/time budgets, validation, partial fallback and semantic dedup.
- `src/lib/news/feeds/pipeline.cjs`: `prepareSnapshot` integration and last-good publication protection.
- `scripts/refresh-news.cjs`: orchestration; mock runs produce artifacts only.
- `src/lib/news/types.ts`: additive `intelligence` metadata and `FrontierAnalysisProvider` interface.
- `tests/intelligence.test.cjs`, `tests/fixtures/intelligence/analysis.mock.json`: independent mock outputs and integration/failure regression checks.

## Provider contract

`analyze(input, { signal })` returns `{ schemaVersion: 1, items: AnalysisRecord[] }`. Input includes candidate identity, official provenance, rule baseline and up to 4,000 characters of RSS excerpt, plus `asOf`, prompt version and system instructions. It is a batch contract so cross-story relations and duplicates can be assessed together. Feed content is untrusted evidence. The model does not fetch URLs or run tools.

Each output row has: `id`, short `title`, `whatHappened`, `whyItMatters`, `longTermImpact`, `importance`, `longTermImportance`, `horizonYears`, `opportunity`, `risk`, `credibility { score, sourceQuality, assessment }`, `confidence`, `evidenceIds`, `relatedNewsIds`, and optional `duplicateOf`.

Only valid known-ID rows are accepted. Source URL, article title, category, source, published timestamp, ID and tags are preserved from the RSS normalizer. Scores and short analysis populate the existing display fields and `signalBrief`. Optional `intelligence` stores opportunity/risk, credibility, references and provenance (`origin`, provider/model, prompt version, analyzedAt). These additional fields are deliberately not rendered in this UI-frozen phase.

Official-primary sources are primary evidence for announcements, not independent proof of product claims. Research preprints are not assumed peer-reviewed. Confidence and source quality are distinct from importance. Future model analysis should explicitly distinguish reported facts from conditional forecasts; schema validation cannot establish factual correctness.

## Dedup and fallbacks

Deterministic URL/title dedup always runs first. An AI duplicate claim can remove a record only when it cites a known retained counterpart and confidence is at least 0.85. Self-references, invented IDs and cycles cannot delete records. Relations/evidence referencing removed duplicates are remapped to retained representatives. Uncertain duplicate claims retain both records.

The default budget is 80 candidates, ranked by existing importance then publication time, 15 seconds total; up to 200 candidates/120 seconds can be configured in code. Unselected records remain in the snapshot with their rule analysis. Missing/invalid rows use their original rules; timeout, missing key, invalid response or provider failure falls back to the complete rule batch. Error text is not logged because external errors could contain credentials. Diagnostics count analyzed, fallback, invalid and removed records; mock provenance is explicit.

If every feed fails, publishing still leaves the last successful JSON intact; if none exists the renderer uses `news.local.json`. AI failures do not change the existing UI snapshot policy. Mock data cannot be published as real news, even if its batch is incorrectly marked `isDemo:false`.

## Phase-one verification

```sh
npm run build:pages
npm run test:data
npm run test:feeds
npm run test:pages
npm run test:ai
npm run typecheck
npm run lint
npm run news:mock
```

`news:mock` uses saved feed fixtures and writes `artifacts/news.fixture.generated.json` and `artifacts/feeds.fixture.report.json`. It never updates `news.generated.json`. The mock is deterministic test data, not GPT-generated analysis. Existing real-DOM Chrome tests and post-deploy verification continue to protect the final Pages HTML.

## Future OpenAI connection

Implement only the reserved OpenAI transport inside `providers.cjs` (or a separate server-side adapter it imports) using the contract above. Add a configured model, structured output, explicit token/cost limits and AbortSignal support. Use a small reviewed evaluation set before enabling it on all candidates. Do not place network requests or secrets in UI code.

The refresh workflow reserves `OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}` only on its server-side refresh step. In GitHub: repository → Settings → Secrets and variables → Actions → New repository secret → `OPENAI_API_KEY`. No secret is required now and none is passed to Pages/deploy steps or serialized into snapshots. Phase one has `AI_PROVIDER: rules`; changing it to `openai` today still falls back because the transport is intentionally unimplemented. Adding a Key alone does not activate GPT. Enable OpenAI only in a later explicitly authorized phase after implementing and testing the transport.
