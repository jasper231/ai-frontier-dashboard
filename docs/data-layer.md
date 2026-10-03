# 第二阶段：本地快照与可替换数据层

## 版本与视觉

`versions/v1-ui-final/index.html` 是 UI 冻结时的原始独立页面，`versions/v1-ui-final/v1-ui-final.zip` 同时保存当时源码、示例数据与静态文件。v2 没有修改 `src/app/globals.css`，原 `src/data/frontier.ts`、`src/data/top-signals.json` 仍保留，但不再供当前页面读取。

## 活跃数据路径

```
RSS / 新闻 API / 网页抓取（未来）
  → SourceAdapter.fetch() 的 RawStory[]
  → StoryNormalizer.normalize() 的 NewsItem
  → NewsEnricher.enrich()（可选 AI 摘要与分析）
  → NewsProvider.load() 的 NewsBatch / 本地 JSON 快照
  → core.cjs 校验、筛选、排序、分栏、Top Signals
  → render.cjs 展示
  → Next.js 客户端 / 独立 HTML
```

当前只读取 `src/data/news.local.json`。没有外部 API、网络请求、密钥或数据库。`source` 是“本地示例”，`sourceUrl` 用 example.com 模拟 URL，不代表已抓取的真实新闻。离线示例来源不生成外链；未来非示例快照可呈现真实来源链接。

## 统一结构

`src/lib/news/types.ts` 是类型与未来接入接口定义。五个栏目统一使用以下记录：

| 字段 | 约束 / 用途 |
| --- | --- |
| id | 唯一、稳定字符串，用于去重和展示关联 |
| title | 原始条目标题 |
| category | ai / agents / chips / robotics / crypto |
| source | 来源名称 |
| sourceUrl | 绝对 HTTP(S) URL |
| publishedAt | 带时区的 ISO 时间，筛选与展示统一 UTC |
| summary | 发生了什么 |
| whyItMatters | 为什么重要 |
| longTermImpact | 长期影响判断 |
| tags | 字符串数组 |
| importance | 0–100 的编辑评分；本地模拟评分，非模型自动判定 |
| longTermImportance | 0–100 的长期影响评分，区别于近期重要性 importance |
| horizonYears | 影响周期，非发布时间；Long-term 选择 3–10（含端点） |
| signalBrief | 可选精简文案：title / happened / matters / impact，仍存于同一记录中 |

可选 signalBrief 延续冻结 UI 的简短文案，Top Signals 排名与内容关联不依赖它；没有 brief 时直接使用普通记录的 title、summary、whyItMatters、longTermImpact。不存在单独硬编码的活跃 Top Signals 列表。

快照容器：`schemaVersion: 1`、`asOf`、`timeZone: "UTC"`、`isDemo`、`items`。栏目名称和定位说明单独存于 `src/data/categories.json`。

## 筛选规则

- Today：打开或切换页面时的当天日期（UTC），按 importance 降序显示当天信息。
- Latest：全部已发布条目，按 publishedAt 降序。
- Long-term：3–10 年影响周期的条目，优先按 longTermImportance 降序，随后按 importance 与日期排序。
- 所有视图排除尚未到发布时间的条目。
- Top Signals：始终从全部已发布内容按 importance 降序选最多 3 条，不随栏目筛选变化；同分按发布时间降序，再按 id 排序。
- 栏目默认展示最多 2 条，剩余通过“查看全部”展开；计数随筛选更新。

asOf 记录数据快照时间，不再将它视为“今天”。界面以设备当前 UTC 日期计算 Today；纯数据函数支持显式注入 referenceTime，供确定性测试使用。本地记录日期仍保留原始日期，不为制造今日内容而改写；若当前日没有记录，Today 显示空状态，Top Signals 仍保留全局精选。

## 文件职责

- `src/data/news.local.json`：本地模拟内容数据。
- `src/lib/news/provider.ts`：Next.js 当前 NewsProvider 实现。
- `src/lib/news/core.cjs`：运行时校验、纯选择逻辑；兼容 Node 与离线浏览器。
- `src/lib/news/core.d.cts`：共享运行模块的 TypeScript 声明。
- `src/lib/news/render.cjs`：展示模板，只接收 view model，负责转义文本、渲染卡片和空状态；不抓取、不筛选、不排名。
- `src/components/dashboard.tsx`：Next.js 筛选状态与展示桥接。
- `scripts/create-static.mjs`：读取同一个 JSON，内嵌同一份 core / renderer 与数据，不使用 file:// fetch。
- `tests/news.test.cjs`：数据逻辑与离线交互验证。

原先的 category-section / top-signals / view-filters 组件作为 v1 参考保留，当前入口不引用它们。当前 Next.js 与静态 HTML 统一使用 render.cjs，防止两套展示实现漂移。

## 验证与离线生成

只需要已有 Node 即可开发生成，不需要 npm 依赖：

```bash
node scripts/create-static.mjs
node tests/news.test.cjs
```

生成后的 `static-preview/index.html` 双击即可运行，用户打开不需要 Node、npm 或服务器。数据、样式、图标与筛选代码已全部内嵌。

本轮 6 项测试通过：模型校验、日期/周期筛选、自动排序与非破坏性、空状态/文本转义、完整离线脚本的模拟 DOM 点击更新。覆盖 UTC 时区边界、未来时间、排名变化、同分排序与动态计数。未执行真实浏览器渲染；当前 Next.js 依赖尚未安装，所以没有声称通过 Next 构建、TypeScript 或 ESLint。

## 以后替换哪一层

替换“新闻采集 / 归一化 / 快照提供层”即可。RSS、API、抓取各自实现 SourceAdapter，再输出相同 NewsItem / NewsBatch。AI 摘要可实现 NewsEnricher。Next.js 更换 `provider.ts` 的 load 实现；离线模式让采集流程写入 `news.local.json` 后重新生成 HTML。筛选 core、展示 renderer、CSS、组件结构均不需要修改。

采集流程不在本轮实现。离线 HTML 是快照，不会自动在线刷新；要获得新内容，需要更新快照并重新生成文件。
