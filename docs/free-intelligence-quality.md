# Public-source intelligence and Daily Briefing

Production uses `AI_PROVIDER: rules`. This phase changes no AI provider interface, does not call OpenAI or a paid service, and removes the unused Secret binding from the refresh workflow.

## Explainable scoring

`src/lib/news/quality/rules.cjs` scores concrete release/deployment events, capability or security changes, infrastructure/open standards, source type and freshness. Promotions/events and routine patch versions are penalized. Preprints have lower evidence weight and a capped importance score; source authenticity does not imply a claim has been independently verified. Repeating a keyword does not increase its weight.

Each normalized item records `ruleAnalysis.scoring` with reasons/points, `sourceQuality`, themes and timestamp basis. Implications and conditional 3–10 year scenarios depend on the detected theme. These are heuristics, not GPT analysis or investment advice. The system cannot establish truth from a headline or short feed excerpt.

`enhanceBatch` also upgrades older official snapshots at the data-provider/static-build boundary, preserving their actual refresh time and article provenance. Demo and AI/mock analyses are left intact. RSS refreshes persist the new rule metadata into `news.generated.json` normally; the last-good/local fallback policy remains unchanged. Source/rule configuration pushes also trigger the existing refresh workflow, in addition to the retained three-hour schedule; generated-data-only commits do not match that push filter.

## Shared themes

Associations use specific themes such as inference economics, agent execution, open ecosystems, physical automation, compute constraints and digital settlement. Items can link across categories within 14 days, with at most four data-layer links and three displayed links per card. Different publishers/topics improve browsing diversity; they are not treated as independent corroboration or proof of a partnership. The card's collapsed “主题关联” provides native official-source links without changing the five-section layout.

## Daily Briefing

The fourth existing-toolbar filter uses the current UTC day. It excludes future timestamps, duplicate URLs/headlines and items with importance below 50. It chooses up to ten items greedily by importance with soft penalties for repeated publishers, categories and themes. With five or more qualifying stories it selects 5–10; with fewer it shows the actual number and explains the shortfall. It never silently fills with yesterday's news. Published and explicitly labeled release-feed update events qualify by their supplied timestamp.

Top Signals are recomputed from the selected briefing. Latest, Today and Long-term keep their existing semantics. Next.js and offline HTML share selectors and renderer. Mobile filters wrap into two rows with 44px targets; the body stays single-column and has no horizontal overflow.

## Public source expansion

Seven candidate feeds: Microsoft Research, GitHub AI Engineering, MIT Robotics, arXiv cs.LG, the official MCP TypeScript SDK, AMD ROCm and Ethereum Geth release feeds. Official GitHub repo feeds are restricted by both host and repository release-path prefix. GitHub release Atom often supplies `updated` instead of `published`; only explicitly configured release feeds may use that timestamp, with `publishedAtBasis: updated` and the visible “来源更新时间” tag. Other feeds continue rejecting records without original publication dates.

`scripts/check-public-sources.cjs` performs read-only endpoint/parse/normalization probes and saves `artifacts/public-source-check.json`. Source configuration records verification results. On 2026-10-04 the runner normalized 10 Microsoft Research, 10 MCP SDK, 10 Geth and 2 MIT robotics stories. arXiv cs.LG had a valid empty feed. ROCm release links required GitHub repository-name case normalization, covered by the repository-scope regression tests. GitHub blog topic/root responses were not accepted as safe feed XML and the source is disabled; the DTD guard was not weakened. MIT uses its official general RSS with a robotics topic filter after the topic RSS returned 404. A failed feed remains isolated and cannot erase the last successful snapshot. No keys or logins are used.

## Verification

`npm run test:quality` adds scoring, source scope, timestamp honesty, topic association, UTC edges, briefing dedup/diversity and immutable data-upgrade checks. Existing data/feed/AI/Pages tests remain. Chrome tests click all four filters and also load the generated artifact in a 390px iframe to check mobile width, single-column cards, tap targets and Daily Briefing. Post-deploy checks compare production runtime/styles and click all four views against the downloaded Pages HTML.
