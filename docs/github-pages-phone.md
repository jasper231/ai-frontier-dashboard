# 只有手机：GitHub Actions + GitHub Pages 部署

全程使用 Safari / Chrome 的 GitHub 网页，不需要电脑、终端、npm、服务器、PAT 或 API Key。推荐新建公开仓库，默认分支为 main。GitHub 手机 App 的按钮不同，以下只针对手机浏览器网页。

## 先下载这 3 个文件

1. `project-source.zip`：完整项目，不要改名，不需要解压。
2. `refresh-news-workflow.txt`：刷新 workflow 的完整文本，后面复制粘贴。
3. `deploy-pages-workflow.txt`：部署 workflow 的完整文本，后面复制粘贴。

保存到手机“文件”或“下载”目录。若文件名出现 `(1)`，在手机文件管理器把项目 ZIP 重命名为 `project-source.zip`。GitHub 网页上传 ZIP 不会自动解压，所以项目已经专门加入 Actions 解包步骤。

## 第 1 步：创建仓库

1. 浏览器打开 https://github.com 并登录。
2. 打开 https://github.com/new（或者头像/菜单 → New repository）。
3. Repository name 填 `ai-frontier-dashboard`。
4. 选择 **Public**；勾选 **Add a README file**。
5. 点击 **Create repository**。
6. 在仓库 Code 页确认分支是 **main**。若不是，请在 Settings → General → Default branch 设置 main，或把部署 workflow 的 push 分支改为实际默认分支。

公开仓库适合免费的 Pages 网站；发布后的网页和源码均公开。不要把个人密钥放进项目。

## 第 2 步：设置 GitHub Pages

1. 仓库顶部菜单找到 **Settings**。手机横向菜单可左右滑动；也可能在 **… / More** 中。
2. 在 Settings 菜单点击 **Pages**。
3. **Build and deployment → Source** 下拉框选择 **GitHub Actions**。
4. 不要选择 Deploy from a branch，也不用选择 docs 或 gh-pages。

若手机网页没有完整设置入口：Safari 点地址栏页面菜单 → 请求桌面网站；Chrome 点右上角 ⋮ → 桌面版网站。

## 第 3 步：允许刷新任务保存数据

1. 在仓库 **Settings → Actions → General**。
2. **Actions permissions** 选择允许运行 Actions。个人仓库可选 **Allow all actions and reusable workflows**。
3. 滚动到 **Workflow permissions**，选择 **Read and write permissions**。
4. 点击该区域的 **Save**。

项目 workflow 明确请求 contents: write 来保存生成数据；部署只用 pages: write 和 id-token: write。不需要创建 PAT，不需要设置 Secrets。若组织策略禁止写入，必须由管理员允许；不应删除回写步骤来假装历史数据已保存。

## 第 4 步：上传完整 ZIP

1. 回到仓库顶部 **Code** 页。
2. 找到 **Add file → Upload files**。手机菜单折叠时可能显示在文件列表右上角 **…** 中；必要时开启桌面版网站。
3. 点击 **choose your files**，在手机文件/下载中选择 `project-source.zip`。
4. 等待上传完成，确认文件列表显示该名称。
5. 页面底部点击 **Commit changes**（或先点 Commit changes… 再确认），直接提交到 **main**。

不要只上传生成的 index.html，也不要把 ZIP 改成 .html。

## 第 5 步：创建 Pages 部署 workflow（先创建这个）

1. 手机打开下载的 `deploy-pages-workflow.txt`，复制里面**全部文本**。文件预览不支持选择时，用手机文字编辑器/备忘录打开，再全选复制。
2. GitHub 仓库 **Code → Add file → Create new file**。
3. **Name your file…** 填 `.github/workflows/deploy-pages.yml`。斜杠会自动创建文件夹。
4. 在正文编辑框粘贴刚才复制的完整 YAML。不要加 Markdown 的 ``` 标记。
5. 点击 **Commit changes…** → 选择直接提交 main → **Commit changes**。

这个提交会启动 Deploy GitHub Pages。第一次可能先发布 fallback 示例，这是预期行为。

## 第 6 步：创建刷新 workflow

1. 打开下载的 `refresh-news-workflow.txt`，复制**全部文本**。
2. GitHub **Code → Add file → Create new file**。
3. 文件名填 `.github/workflows/refresh-news.yml`。
4. 正文粘贴完整 YAML。
5. **Commit changes… → main → Commit changes**。

不能只上传 TXT：Actions 识别的是 `.github/workflows/` 中的 `.yml`。

## 第 7 步：手动运行一次真实抓取

1. 仓库顶部点击 **Actions**（手机上可能在 … / More 中）。
2. 在 workflow 列表选择 **Refresh official news**。
3. 点 **Run workflow** 下拉按钮。
4. Branch 选择 **main**。
5. 点击绿色 **Run workflow**。
6. 刷新 Actions 页面，点最新的一次 **Refresh official news**。
7. 等待 `refresh`、调用的 Pages `build`、`deploy` 全部变绿。通常几分钟；部分源失败不妨碍 fallback 部署。

第一次会从 ZIP 提取源文件，把可见源代码和生成数据提交到 main。不会通过机器人修改 `.github/workflows`（这两个 workflow 已由你在网页创建）。你无需解压 ZIP 或逐个上传源码。

## 第 8 步：打开手机网页

1. 回到 **Settings → Pages**。
2. 成功部署后会显示 **Your site is live at …**；点 **Visit site** 或网址。
3. 地址通常是 `https://你的用户名.github.io/ai-frontier-dashboard/`，以 GitHub 实际显示地址为准。
4. 顶部“最后更新”显示上次成功抓取的 UTC 时间。若从未抓到有效官方数据，会显示“尚无真实更新 · 本地示例”。
5. 成功后可在浏览器分享菜单中选择“添加到主屏幕”。

## 第 9 步：查看抓取是否真正成功

Actions → 最近的 Refresh official news → 点击 **refresh** job → 展开 **Fetch official feeds and preserve last successful snapshot**。

日志中的 rawCount / deduplicatedCount / categories 是真实采集统计。也可以在该运行页底部 **Artifacts** 下载 `feed-refresh-report-…`，或在 Code → src → data 查看 `news.generated.json` 和 `news-status.json`。

绿色 workflow 只代表构建/测试/部署成功，不保证每个源抓取成功。全失败仍部署保留的旧真实数据；从未成功则部署本地示例。failed-using-last-good / failed-using-local 会明确记录在状态文件。

## 后续自动运行

每 3 小时，UTC 00:00 / 03:00 / 06:00 / …，Actions 尝试刷新并部署。GitHub 的定时任务可能延迟，不是精确实时计时器。schedule 只在默认分支运行；公开仓库长期无活动可能被暂停，届时 Actions 页面通常出现 Enable workflow，可手动重新启用。

要立即刷新：Actions → Refresh official news → Run workflow。要只重新部署：Actions → Deploy GitHub Pages → Run workflow。

## 常见问题

- **找不到 Add file / Settings / Run workflow**：切到浏览器桌面版网站；确认登录的是仓库所有者账号。
- **找不到 workflow**：检查文件名、目录和 `.yml` 扩展名，且已提交 main；没有 ``` 包裹正文。
- **解包报错 project-source.zip 不存在**：检查 Code 根目录下的 ZIP 名称，重新上传正确文件名。ZIP 内文件应直接为 src/、scripts/、.github/ 等，不能多套一层总文件夹。
- **git push 403 / protected branch**：Settings → Actions → General 检查写权限；新建未保护的个人 main 分支最简单。已启用组织/分支限制时，让管理员允许机器人写入。
- **Pages deploy 报错**：确认 Settings → Pages → Source = GitHub Actions；确认网站环境 github-pages 允许 main。workflow 仍报错时查看失败步骤，不要反复点击刷新数据。
- **网页 404**：等待部署完成后，从 Settings → Pages 打开实际项目 URL，保留仓库名结尾路径。
- **网页还显示示例**：查看刷新报告。部分候选官方 feed 可能更改地址，需要修改 src/data/feed-sources.json，不需要改 UI。

本项目没有在你的 GitHub 账号上执行部署；本地已验证静态目录、脚本、测试、workflow YAML 和 shell 语法。首次 GitHub Actions 执行才会验证官方源可达性与仓库权限。
