# GitHub Actions / Pages 配置

- `.github/workflows/refresh-news.yml`：workflow_dispatch + UTC `0 */3 * * *`；Node 24 和系统 curl；不安装 npm 依赖、不构建 Next runtime。
- `.github/workflows/deploy-pages.yml`：main push、手动、workflow_call；构建 `dist/`，通过官方 Pages artifact/deploy actions 发布。
- `scripts/build-pages.mjs`：生成内嵌数据/样式/脚本的 index.html 与 .nojekyll；兼容用户主页或 `/repo-name/` 项目 Pages，无需 basePath 配置。
- `src/data/news-status.json`：lastUpdated = 上次成功真实采集时间；lastAttempt = 本次尝试；成功/失败/回退状态独立记录。失败不能用尝试时间冒充更新时间。

真实数据写入 news.generated.json 前会解析、验证、分类、去重并按日期排序。单源失败继续其他源；全失败不覆盖旧真实文件。若从未成功，有效本地 JSON 提供 fallback。状态文件与有效数据通过 Git 提交到默认分支，不能仅依赖短期 Actions cache。

刷新任务直接调用 reusable Pages workflow 并传入提交 SHA，因为 GITHUB_TOKEN 推送通常不会触发另一个 push workflow。全局刷新串行，Pages 部署也串行；若发生 push 冲突，任务失败而不是 force push 覆盖别人的更改。

手机模式只要把 project-source.zip 上传根目录并用网页创建两个 workflow。首次任务解包并提交源码，但不尝试用 GITHUB_TOKEN 创建/修改 workflow 文件。不用 PAT，不用 GitHub CLI。

设置：公开个人仓库 main；Settings → Pages → Source = GitHub Actions；Actions 允许运行并可写 contents。Pages 使用 contents: read / pages: write / id-token: write，不需要自建 token。

在线官方 feed 端点仍待真实验证，某个端点失败会记录日志。定时任务可能被 GitHub 延迟或因长期不活跃暂停。原冻结版继续保留在 versions/v1-ui-final/。

本地验证：16 项测试通过，YAML 与脚本语法检查通过；没有请求 Cloud 网络，没有替用户创建远程仓库或实际发布 Pages。
