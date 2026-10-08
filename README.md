# AI Frontier Dashboard

Next.js App Router + TypeScript 个人技术观察台，包含五个栏目、15 条本地中文示例。内容与日期用于展示，不是实时新闻。无需数据库、API Key、环境变量或远程字体。

## 运行

需要 Node.js 20.9+（推荐 24）。

```bash
npm ci
npm run dev
```

打开 http://localhost:3000。

## 检查

```bash
npm run lint
npm run typecheck
npm run build
```

静态导出目录为 `out/`，可直接托管。生产预览使用 `npx serve out`，静态导出模式不支持 `next start`。

## 结构

- `src/app/page.tsx`：首页与栏目导航
- `src/app/layout.tsx`：语言与 metadata
- `src/app/globals.css`：主题、响应式布局与无障碍焦点
- `src/components/category-section.tsx`：栏目与卡片组件
- `src/data/frontier.ts`：数据类型与 15 条示例
- `public/favicon.svg`：图标
- `next.config.ts`：静态导出
- `eslint.config.mjs`、`tsconfig.json`：检查配置

## 下一步

从 `src/data/frontier.ts` 替换为个人笔记；真实新闻可增加来源链接。确认内容后，将 `out/` 部署至静态托管服务。

## 无 npm 的静态备用版

直接打开 `static-preview/dashboard-standalone.html`（CSS 已内嵌），无需安装依赖。完整静态目录是 `static-preview/`。

```bash
python3 -m http.server 3000 --bind 0.0.0.0 --directory static-preview
```

在允许网络套接字的环境访问 http://localhost:3000。手机需要能访问该机器的网络地址或托管 URL，手机自己的 localhost 不会访问云环境。

`node scripts/create-static.mjs` 可以从现有 TypeScript 数据重新生成静态目录。`artifacts/verification.json` 记录本次实际验证范围。

本环境的限制：HTTP proxy 连接失败，npm 缓存为空，无预装 Next/React；HTTP 服务创建 socket 被沙箱拒绝；Chromium setsockopt 被沙箱拒绝。静态内容数量、日期字段、为什么重要字段、导航目标及生成脚本语法已验证。Next.js 构建和浏览器手机布局尚未验证。

## 第二阶段：统一数据层

当前入口使用 `src/data/news.local.json` 和共享 `src/lib/news/`；旧示例仍保留，UI 稳定版见 `versions/v1/`。运行 `node scripts/create-static.mjs` 生成带真实本地筛选的离线页面，运行 `node tests/news.test.cjs` 检查数据逻辑。详细结构与未来接入边界见 `docs/data-layer.md`。

## 第三阶段：官方 feed 采集

官方来源注册表：`src/data/feed-sources.json`。使用 `node scripts/refresh-news.cjs --live` 采集并生成真实 `news.generated.json`；网络受限时用 `--fixtures` 验证，不污染真实数据。provider 和离线生成器优先读有效真实生成快照，再回退 `news.local.json`。完整结果、错误处理与来源待验证状态见 `docs/official-feeds.md`。

## GitHub Actions + GitHub Pages

手机部署说明：`docs/github-pages-phone.md`。配置说明：`docs/github-actions-pages.md`。

每 3 小时运行官方 feed 刷新并保留最后成功快照，然后直接调用 Pages 部署；也支持 Actions 页手动运行。静态目录通过 `node scripts/build-pages.mjs` 生成到 `dist/`，不需要 npm 安装或 Next runtime。顶部使用既有次级信息样式显示最后成功更新时间。

## Frontier Briefing v2 / 新闻雷达

默认首页是独立双语长文简报；没有当天经审核的编辑产物时显示“今天的前沿简报尚未生成。”，可进入新闻雷达继续浏览今日/最新/长期趋势。`src/data/briefing.generated.json` 与新闻快照分开，重点数量不设固定配额、不显示评分。事实后立即列原文来源，解释、可选例子、分析与条件式长期观察依次展开。主题与语言偏好保持原有localStorage行为。

Codex入口见 [AGENTS.md](AGENTS.md)，实际生成步骤见 [docs/briefing-agent-workflow.md](docs/briefing-agent-workflow.md)，来源实测与限制见 [docs/source-adapters.md](docs/source-adapters.md)。本轮不生成正式简报、不接付费API或Secret；合成文稿只用于测试，不进入生产provider。

## 来源健康监控

目前65个启用公开Feed，逐源健康状态保存到`src/data/source-health.json`。网站页脚“来源健康”可查看失败、部分异常、停更和恢复记录；Actions同步输出warning及检查摘要。详见 [docs/source-health.md](docs/source-health.md)。不使用付费API，不绕过付费墙/反爬，不使用第三方镜像。
