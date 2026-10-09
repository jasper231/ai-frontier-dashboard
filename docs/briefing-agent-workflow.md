# Frontier 简报：Codex Agent 工作流（schema v2）

RSS 提供候选事实线索；Radar 保留大量新闻。Briefing 是独立的、经过来源审核的双语编辑产物。代码不自动制造研究结论，也不调用收费 API。未生成当天版本时显示“今天的前沿简报尚未生成。”，Radar 正常运行。

## 生成今天的 Frontier 简报

1. 读取最新真实 `src/data/news.generated.json`，运行 `npm run briefing:prepare`；或在 Actions 手动运行 **Prepare Briefing inputs**。保留输出的 `saved-news-snapshot.json`、候选证据、schema 与任务文件。候选来自过去24小时，不截断为固定5条或10条；版本日期按北京时间，所有原始时间仍为UTC。
2. 评分只用于内部排序。主动选真正重要的事件，合并同一事件的多篇报道，不以相同关键词当作独立验证。没有重要事件就不发布，而不是补普通新闻。2条、6条、7条都允许。不要把已有规则 `whyItMatters` / `longTermImpact` 复制成编辑判断。
3. 查看真实原文，核对事实、发布日期、产品公告与已验证成果的差别。优先一手来源加独立来源；转载同一稿件不算独立确认。只有单一来源可以报道，但 `verification.independentlyConfirmed` 必须为false。软件校验只是出处绑定，不代表事实已被软件验证。
4. 可通过 `source-adapters.json` 的公共RSS或 lawful Agent enrichment 获取补充材料。不访问付费API，不绕过付费墙/反爬，不使用第三方镜像。补充来源需登记 adapterId、原始URL、publisher/type、publishedAt、reviewedAt、真实 excerpt，以及 `origin: agent-enrichment`。无法合法读取就明确保留单来源。
5. 写中文/English完整对应版。开头2–4句自然语言概括过去24小时的结构变化及关联。每条重点依次写：忠于事实的自然标题 → 已验证事实 → 原文来源 → 这是什么意思 → 可选具体假设例子 → 为什么重要 → 条件式3–10年观察 → 可选机会 → 可选风险 → 2–5个有解释的关键词 → 可选相关真实事件。先讲人话；专业缩写首次出现解释，不生成夸张标题、空洞的“值得关注”或重复模板。
6. `verifiedFacts` 的kind是confirmed；解释与因果分析是analysis；例子、长期判断、机会、风险和未来验证点是hypothesis。每段有known evidenceIds。`sources`紧跟事实，实际新闻ID/URL/UTC日期/摘要与保存的快照完全一致。relatedStoryIds指向证据集合中的其他真实新闻ID，不是虚构内部链接。单条story.sources引用完整来源对象。
7. 结尾写2–5个可观察的未来验证点（不是继续列新闻）；选一个今日关键词，给解释及为什么现在值得记住。长期框架可选，不强行套产业链。
8. 自行审核出处、事实/分析界限、中英文一致性、可读性、例子是否明确为假设、关键词说明，再填写human/agent provenance及两项review标记。不把未经核对的草稿设published。

## 导入与发布

```sh
node scripts/publish-briefing.cjs authored-edition.json artifacts/briefing-agent/saved-news-snapshot.json
npm run build:pages
npm run test:data
npm run test:feeds
npm run test:pages
npm run test:ai
npm run test:quality
npm run typecheck
npm run lint
npm run build
npm run build:pages
node scripts/create-browser-regression.mjs
```

import校验并原子更新 `src/data/briefing.generated.json`；失败不覆盖旧简报，也不改news快照。stories数组是经过编辑选择的集合；order是展示顺序，可用内部 importance/sourceQuality/longTermImportance 重新排序，前台绝不展示数字评分。没有固定配额，也不因后台分数自动冒充编辑审稿。

用户授权提交发布后，commit/push main，由现有Pages workflow构建、部署、线上verify-live。三小时RSS刷新保持原样，既不删除历史简报也不自动写简报。当天缺失/过期/损坏/尚未生成时回到真实空态，不使用旧新闻或规则段落补齐。

## App准备

briefing/core与render是无服务器纯数据/渲染模块，Next.js和独立Pages共用；读取归档与UI解耦。未来PWA/Capacitor可复用schema、来源接口、离线快照、主题/语言偏好和触摸布局。本轮不新增service worker、原生权限或App功能。

## 向后兼容的出版字段（仍为 schema v2）

- story.keyTakeaway 可选，沿用双语 narrative，kind 必须为 analysis，并保留 evidenceIds。缺失时不渲染空栏目。
- edition.coverageWindow 可选，只保存 start/end UTC ISO 时间；渲染时按 Asia/Shanghai 和当前语言生成标题下的低权重 metadata。
- 本期审核证据与日期精度说明见 docs/briefings/2026-10-09-evidence.json；新闻快照不因发布简报而更改。
