# 来源覆盖与健康监控

2026-10-08 在 GitHub runner 对23个现有启用源和52个新增候选进行公开URL检查。新增候选成功后再读取一次验证可重复访问，失败不无限重试、不更换伪装身份、不绕过限制。42个新增Feed通过两次检查，当前共65个启用源、78个登记来源。此为当前实测可用，不承诺未来永不失效。

新增范围：NVIDIA Developer、Google Research、Azure、Meta Engineering、Amazon Science、AWS Compute、Apple ML、Arm、Cloudflare、Berkeley BAIR、Nature Machine Intelligence / Electronics、arXiv cs.CL/cs.CV/cs.MA/stat.ML、The Robot Report、IEEE Spectrum、MIT Technology Review，以及NYT/FT/WSJ/Bloomberg的出版商自有公开科技RSS。主流媒体RSS仅提供公开标题/摘要和真实原文链接，不授予付费全文访问，也不视为事件已经被多方确认。

官方项目发布Feed覆盖vLLM、PyTorch、Transformers、Ollama、llama.cpp、LangChain、LangGraph、LlamaIndex、AutoGen、OpenAI Agents SDK、Anthropic SDK、MCP Python、TensorRT-LLM、Isaac ROS、Reth、Agave、Lighthouse、Mistral SDK。GitHub来源限定官方项目路径；release-only Atom的updated时间按已有规则明确标记，不伪装成原始发布日期。普通补丁仍受原有规则降权，不为简报凑数。

无法启用的候选包括返回410/404的Microsoft AI、IBM Research、AMD ROCm blog、Boston Dynamics、Paxos，返回非接受XML的Intel、Chainlink、PayPal，解析超时的CMU以及降级到HTTP的Robotics Business Review。登记但未启用；不放宽HTTPS、DTD或出处边界。原有Coinbase 403和Circle 404仍启用并显示失败，下次定时刷新继续检查。IEEE Spectrum能稳定提供12条允许域内内容，跨出版商链接被拒绝并显示部分异常。完整证据：`source-probe-2026-10-08.json`。

## 状态与保存

- `src/data/source-health.json`：持久健康状态，与news快照分开，每3小时正常刷新时写入并提交Git。包含最近尝试/成功/失败/内容变化/原始发布、连续失败、累计检查/失败、有效条目、技术错误、恢复时间和最多250条状态变化。
- `feeds/health.cjs`：纯状态转换，fixtures不污染生产记录；同一或旧检查不会重复累计。URL改变会重置来源身份，避免把新端点误当成旧端点恢复。
- healthy / no-matches / empty：可访问、暂无相关主题或暂时空Feed，均区别于抓取失败。
- degraded：部分条目不符合日期/原文URL规则；其他条目继续使用。
- stale：仍可抓取，但最新条目超过配置预期周期，默认公告14天、软件release30天，可逐源配置。它是观察提示，不等于Feed损坏。
- error：HTTP、超时、XML解析、缺失原始日期等失败；保留上次成功时间，不永久禁用。
- blocked：检查环境无法访问网络，未实际请求的域名不虚增请求/服务器失败计数。
- disabled / pending：明确未启用或尚未检查，不冒充正常。

Actions每次生成`GITHUB_STEP_SUMMARY`、warning annotations和诊断artifact。Dashboard页脚可进入双语来源健康页；`source-health.html` / `source-health.json` 随Pages发布。页面超过9小时没有新检查时提示检查Actions，能够发现刷新任务本身停跑。

单源失败不阻断其他来源；全部失败时news.generated.json保持最后成功版本、没有历史真实数据时使用news.local.json。健康记录仍更新，让回退可见。健康不是事实核验、也不是证明新闻重要；Briefing仍要求人工/Agent审核。没有邮件/Slack服务、付费API或新增Secret。
