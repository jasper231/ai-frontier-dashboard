export type Entry = { title: string; date: string; summary: string; importance: string; tag: string };
export type Category = { id: string; title: string; subtitle: string; entries: Entry[] };
export const categories: Category[] = [
  { id: 'ai', title: 'AI', subtitle: '理解模型能力的边界与新的应用机会。', entries: [
    { title: '推理模型：从快速回答到深度思考', date: '2026-10-02', tag: '推理能力', summary: '模型通过更多推理步骤处理数学、代码与复杂规划任务。', importance: '评估模型时，准确率、响应时间和成本需要放在一起比较。' },
    { title: '多模态模型走向统一交互', date: '2026-10-01', tag: '多模态', summary: '文本、图像和语音在同一个工作流中协同，减少输入切换。', importance: '产品可以围绕真实场景设计交互，让输入方式更自然。' },
    { title: '小模型的本地部署机会', date: '2026-09-30', tag: '端侧 AI', summary: '量化和蒸馏让轻量模型在个人设备上执行特定任务。', importance: '本地处理有助于降低延迟，并让敏感数据保留在设备内。' },
  ] },
  { id: 'agents', title: 'Agents', subtitle: '关注智能体如何可靠地完成真实任务。', entries: [
    { title: '让智能体接入可验证的工具', date: '2026-10-02', tag: '工具调用', summary: '智能体通过结构化接口读取文件、执行任务并返回结果。', importance: '明确权限与结果验证，是把演示变成可靠工作流的关键。' },
    { title: '长任务需要记忆与检查点', date: '2026-10-01', tag: '任务规划', summary: '保存任务状态，让智能体能够中断、恢复和追踪进度。', importance: '可恢复的执行过程减少重复工作，也更容易定位失败原因。' },
    { title: '多智能体协作的边界', date: '2026-09-29', tag: '协作系统', summary: '不同智能体分工研究、执行和审查，并交换任务结果。', importance: '分工可能提升效率，但通信成本和责任划分同样需要评估。' },
  ] },
  { id: 'chips', title: 'GPU & Chips', subtitle: '从算力效率看 AI 基础设施的演进。', entries: [
    { title: '推理效率成为算力新指标', date: '2026-10-02', tag: '推理算力', summary: '部署侧更关注单位成本下的吞吐量、延迟和能耗。', importance: '选硬件需要结合实际模型的服务成本衡量整体收益。' },
    { title: '高带宽内存影响模型吞吐', date: '2026-09-30', tag: 'HBM', summary: '大模型的数据搬运速度可能成为系统性能瓶颈。', importance: '内存容量与带宽决定可部署模型规模和并发服务能力。' },
    { title: '互联技术决定集群扩展效率', date: '2026-09-28', tag: '高速互联', summary: '多卡训练与推理需要在节点间频繁交换数据。', importance: '扩容收益取决于通信效率，更多 GPU 不一定带来线性提升。' },
  ] },
  { id: 'robotics', title: 'Robotics', subtitle: '追踪智能从数字世界走向物理世界。', entries: [
    { title: '视觉语言动作模型连接感知与执行', date: '2026-10-01', tag: '具身智能', summary: '机器人把视觉输入与自然语言指令转换为动作计划。', importance: '通用指令理解有机会降低机器人适配新任务的成本。' },
    { title: '仿真训练如何迁移到真实世界', date: '2026-09-30', tag: '仿真训练', summary: '在仿真中训练策略，再通过真实测试校准行为。', importance: '缩小仿真与现实的差距，影响训练成本和部署可靠性。' },
    { title: '灵巧操作仍是落地难点', date: '2026-09-27', tag: '操作控制', summary: '抓取、装配和接触控制需要细致感知与即时反馈。', importance: '稳定完成重复任务，比单次成功的演示更能体现实用价值。' },
  ] },
  { id: 'crypto', title: 'Crypto', subtitle: '观察可信计算与价值流转的新基础设施。', entries: [
    { title: '零知识证明探索可验证计算', date: '2026-10-01', tag: 'ZK', summary: '证明系统尝试验证计算结果，而不公开全部原始数据。', importance: '隐私与可验证性可能同时满足，但证明成本仍需要衡量。' },
    { title: '稳定币支付关注结算体验', date: '2026-09-29', tag: '支付基础设施', summary: '链上支付研究更快结算、跨境流转与系统集成。', importance: '实际采用取决于费用、合规、资产风险和用户使用门槛。' },
    { title: '去中心化算力如何验证服务质量', date: '2026-09-26', tag: '计算网络', summary: '分布式算力市场尝试连接闲置资源与计算需求。', importance: '可靠性、数据保护和结果验证决定这些资源能否服务真实任务。' },
  ] },
];
