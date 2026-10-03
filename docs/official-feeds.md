# 第三阶段：官方 RSS / Atom 获取层

## 本次实际结果

环境状态工具报告 HTTP policy 已 enforced，但执行沙箱的实际 curl 请求无法连接继承的 proxy:8080（curl exit 7）。请求未到 OpenAI；没有绕过代理，没有继续对其他域名重试，没有使用付费 API。

真实抓取：0；真实去重后：0；五个栏目真实数量均为 0。所有配置的 URL 均未在本环境在线验证，不能视为成功接入。Anthropic 尚无确认的稳定官方 feed，显式禁用，不编造地址、不使用第三方转制源。

保存的 fixture 是人工构造的 RSS / Atom / RDF 测试 XML，不是官方文章副本，不代表已发布的公告。6 份测试 feed 产生 10 条、去重后 8 条：AI 3 / Agents 1 / Chips 1 / Robotics 1 / Crypto 2。记录标题、URL 和来源明确标记测试；只输出 `artifacts/news.fixture.generated.json`，不得发布为真实 `news.generated.json`。

## 来源注册表

`src/data/feed-sources.json` 注册 OpenAI、Google AI、DeepMind、NVIDIA、Hugging Face、arXiv cs.AI / cs.RO、Ethereum、Coinbase、Circle 的官方域名和候选 feed URL。Anthropic 为等待官方 feed 的禁用项。来源限制通过允许的官方文章主机验证，不抓普通新闻站。

各 endpointStatus 为 unverified-network-blocked；这些地址是待在线核验的候选地址。网络可用后若 404/403、非 XML 或不含原始发布日期，会记录失败并跳过，不静默换用普通新闻站。arXiv 是官方论文分发源，论文是预印本，不据此声称已同行评审。

## 数据流与职责

```
feed-sources.json
  → transport.cjs（curl，继承代理/CA，限时、限量、禁止无限重试）
  → parser.cjs（无 npm 的 RSS / Atom / RSS 1.0 RDF XML 解析）
  → normalizer.cjs（官方 URL 验证、关键词/来源分类、标准结构）
  → deduplicate（规范 URL + 同日相同完整标题）
  → pipeline.cjs（单源隔离、记录错误、验证、原子写入）
  → src/data/news.generated.json
  → snapshot.cjs（真实快照优先，不可用则 local fallback）
  → provider.ts / create-static.mjs
  → 原 UI
```

不改变 NewsItem 或 NewsBatch 结构，也没有修改 CSS 或栏目/卡片展示。获取代码不进入 UI 或独立 HTML；HTML 只内嵌选中的静态 JSON 快照与既有筛选逻辑。

### 解析与日期

支持 RSS pubDate / dc:date、Atom published、命名空间、CDATA、XHTML 内容、alternate 链接和 xml:base。没有原始发布日期时跳过，不用 Atom updated 或抓取时间冒充发布时刻。绝对 sourceUrl 保留包括查询参数；相对链接转换为绝对链接。publishedAt 保留原始时间瞬间并统一 ISO UTC；原始 feed 日期字符串另存 `artifacts/feeds.live.raw.json`（测试则为 fixture.raw）。

禁止 DTD / 外部实体，XML 体积和层级有上限。HTML 摘要去标签和脚本；展示层仍转义所有外部文本。

### 去重

比较 URL 时去 fragment 和 utm / fbclid / gclid，存储的 sourceUrl 不变。稳定 ID 用规范 URL 哈希。同一 UTC 日期且规范化完整标题相同（至少 20 个字符）也去重，优先保留注册表中先出现的来源。不用模糊相似度合并；不是同一标题/日期的近似报道不会被误合并。

### 自动分类与分析

先匹配标题关键词，再匹配正文，再使用来源默认栏目。机器人、智能体、芯片、稳定币等关键词可使 NVIDIA / OpenAI 的条目进入其他栏目。

summary 来自 feed 原摘要，最长 320 字符；importance / longTermImportance / horizonYears 为透明的规则评分。whyItMatters / longTermImpact 明确写“规则分析 / 规则判断”，是栏目级启发式分析，不是 AI 阅读全文后的精确结论。未来可替换 normalizer/enricher，仍输出相同数据结构。

## 失败与 fallback

- 单 feed 超时、HTTP 失败、XML 失败：该源标为 failed，其他源继续。
- 单条字段/URL/日期无效：记录原因并跳过，该 feed 其他条目继续。
- 部分源成功：仅写本轮成功且通过校验的真实记录；不混入本地示例填充。
- 全部失败/没有有效条目：不覆盖已有生成文件。若原生成快照仍有效，继续使用旧真实快照。
- generated 文件缺失、JSON 损坏、结构不合格、空集合或 isDemo=true：回退 news.local.json。
- fixture 永远不能通过 publishResult 写到真实生成文件。

当前 news.generated.json 是合法空容器，说明没有真实抓取成果；它触发 local fallback，原 15 条示例不改写、不删除。provider 在运行时读取生成文件并捕获 JSON/IO 错误，避免缺文件导致构建导入失败。静态生成器使用同一个 snapshot 选择逻辑。

## 使用（在允许联网的环境）

```bash
node scripts/refresh-news.cjs --live
node scripts/create-static.mjs
```

第一次仅做一次公开源探测；代理/连接/超时的全局问题会立即停止，避免反复请求各来源。公开源 HTTP 或 XML 错误仍按单源处理。限时 12 秒、最大约 3 MB、无自动重试、最多 3 次 HTTPS 跳转。curl 保留继承的代理和 CA 设置。

离线验证：

```bash
node scripts/refresh-news.cjs --fixtures
node tests/feeds.test.cjs
node tests/news.test.cjs
```

`--offline` 是网络能力已确认受限时的显式停止路径，生成报告但不发请求、不改生成数据。联网报告在 `artifacts/feeds.live.report.json`，fixture 报告在 `artifacts/feeds.fixture.report.json`。刷新完成后重新生成 HTML，离线用户不需要服务器、npm 或 Node；不会自动在线刷新。

本次 7 项 feed 测试 + 6 项已有数据/交互测试通过。Next 构建、浏览器渲染与真实网络抓取没有验证，不据测试 feed 声称接入了真实官方公告。
