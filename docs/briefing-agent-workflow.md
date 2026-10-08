# AI & Frontier Briefing editorial workflow

This workflow prepares inputs for a human or a future Codex Agent/model. It does not call an AI/translation API or automatically manufacture a briefing. Run GitHub Actions **Prepare Briefing inputs** manually and download its artifact, or run `npm run briefing:prepare` locally.

## Evidence before prose

Read `briefing-agent-input.json`, the JSON schema and the full original official pages. A feed headline/excerpt is a lead, not independent verification. Attribute issuer claims, flag preprints and updated-only dates, and distinguish announced products from demonstrated results. Do not reuse rule-generated implications as authored analysis. Candidate scores and topic links are hints, not evidence. Keep original news IDs, URLs, UTC timestamps and excerpts exactly as provided. Keep the source snapshot alongside the draft so later RSS refreshes do not silently change the evidence.

## Editorial task

Produce one bilingual edition, with identical section order and factual scope in Chinese and English. Translate only verified supplied content; do not infer missing facts during translation.

1. Write a **single executive opening of 2–4 sentences**: what changed structurally today, and which conclusions remain conditional. Store one sentence per element of `executiveOpening`.
2. Select **3–5 Top Stories** by material significance. Use fewer if fewer merit treatment; never pad. Group genuinely related announcements into one story if useful. Primary story sources must belong to the edition's Beijing natural day. Older sources can support cross-analysis, never fill today's stories.
3. For each story write a distinctive title, Confirmed facts, Why it matters, a **conditional 3–10 year view**, Opportunities and Risks. Write connected paragraphs with concrete triggers and limits. `confirmedFacts` uses `kind: confirmed`, causal interpretation uses `analysis`, and future outcomes use `hypothesis`. Never present forecasts as facts.
4. Where evidence connects stories, add `crossAnalysis` paragraphs within the relevant story, citing at least two sources. Shared terminology alone does not establish causation, corroboration or a market trend. Explain the mechanism or explicitly keep it a question.
5. Close with **exactly three observable validation points** (`watchNext`): what evidence would strengthen or weaken the thesis, not vague calls to watch developments. Add one new concept (`keyword`) with a sourced explanation. An optional concise `framework` can link domains when evidence supports it; do not force the machine-economy chain into every edition.

Every sentence/paragraph needs known `evidenceIds`. All six story sections must be written, not lists of database fields. Prohibit repeated generic boilerplate, “规则分析”, “规则情景”, empty “值得关注”, unsupported market sizes, invented opportunity/risk claims and filler introductions. Evidence citations are necessary but not sufficient to prove an inference.

## Review and import

Review sources, claims, uncertainty, usefulness, cross-story mechanisms and both languages before setting `status: published` and the provenance review flags. These flags document the author's declaration; software cannot certify factual truth or prose quality. Do not mark generated/unreviewed drafts as published. A future Agent may return a draft for review; this repository currently has no Agent execution or paid service.

Validate/import an authored edition against its exact saved source snapshot:

```sh
node scripts/publish-briefing.cjs authored-edition.json saved-news-snapshot.json
npm run build:pages
npm run test:pages
```

This writes only `briefing.generated.json`, preserves other edition dates, and atomically leaves the previous archive intact on failure. Include the authored archive in the reviewed repository change; the existing Pages build deploys it. The current source provider and three-hour refresh remain unchanged. Static and Next.js read the same validated archive. Missing, stale, malformed or synthetic production editions produce an honest unpublished state; no old stories or rule templates are used as replacements. JSON/schema validation checks structure, provenance binding and citations, not the truth of natural-language claims.
