/* Explainable public-source heuristics. No model, credentials or network calls. */
const VERSION='public-quality-v1';
const topics=[
 {id:'inference-economics',label:'推理成本与效率',pattern:/\b(inference|serving|latency|quantization|tokens? per second|throughput)\b|推理|量化|吞吐/i,why:'推理成本、延迟与质量之间的取舍可能决定应用能否规模化，需用真实负载验证。',impact:'低成本、可用的推理服务可能成为 AI 应用基础设施。'},
 {id:'agent-execution',label:'可验证的智能体执行',pattern:/\b(agentic|agents?|tool[- ]calling|mcp|computer use|model context protocol)\b|智能体|工具调用/i,why:'工具执行的可靠性、权限边界和可审计性决定智能体能承担哪些任务。',impact:'可验证的任务执行可能改变软件和工作的组织方式。'},
 {id:'open-ecosystems',label:'开放模型与软件生态',pattern:/\b(open[- ]source|open[- ]weights|apache|rocm|interoperability)\b|开源|开放权重|互操作/i,why:'开放接口和可迁移性可能降低接入成本，但许可、维护和兼容性仍需评估。',impact:'开放生态与可迁移工具链可能影响技术扩散与供应商依赖。'},
 {id:'physical-automation',label:'具身智能与物理自动化',pattern:/\b(embodied|humanoids?|robot(?:s|ics|ic)?|manipulation|rclcpp)\b|具身|机器人/i,why:'物理任务的泛化、安全和可靠性需要在真实环境评估，演示不能直接代表部署能力。',impact:'安全可靠的物理任务自动化可能改变生产与服务流程。'},
 {id:'compute-supply',label:'算力与内存约束',pattern:/\b(gpus?|hbm|nvlink|semiconductors?|memory bandwidth|blackwell|accelerators?)\b|算力|芯片|内存带宽/i,why:'可获得的算力、内存带宽和能耗共同约束模型训练与部署，需区分规格与实测收益。',impact:'计算与能源供给可能持续约束 AI 的成本与规模。'},
 {id:'digital-settlement',label:'数字结算基础设施',pattern:/\b(stablecoins?|usdc|usdt|tokenization|settlement|payments?)\b|稳定币|结算|支付/i,why:'结算效率和覆盖范围可能变化，但合规、储备、兑付和对手方风险仍需评估。',impact:'可互操作的数字结算可能改变跨境资金与商业流程。'},
 {id:'protocol-trust',label:'可信与互操作协议',pattern:/\b(protocol|mainnet|consensus|ethereum|go-ethereum|standards?)\b|共识|主网|协议|标准/i,why:'协议变更可能影响兼容性、安全和迁移成本；公告本身不能证明已广泛采用。',impact:'可信、可互操作的协议可能塑造长期基础设施。'}
];
function themesFor(title,content=''){return topics.filter(t=>t.pattern.test(title+' '+content.slice(0,1800))).map(t=>({id:t.id,label:t.label,evidence:t.pattern.test(title)?'headline':'excerpt'}));}
function assess(raw,source,{category,asOf=new Date().toISOString()}={}){
 const title=raw.title,body=String(raw.content||'').slice(0,1800),text=title+' '+body;
 const kind=source.sourceKind||(/arxiv/i.test(source.name)?'preprint':'official');
 const themes=themesFor(title,body),breakdown=[{reason:'基础相关性',points:35}];
 const add=(condition,reason,points)=>{if(condition)breakdown.push({reason,points});};
 const release=/\b(releas(?:e|ed|ing)|launch(?:ed|es|ing)?|introduc(?:e|es|ed|ing)|available|mainnet|upgrade|deploy(?:ed|ment)?|rollout)\b/i.test(title)||kind==='release';
 const durable=/\b(infrastructure|standards?|protocol|architecture|open[- ]source|open[- ]weights|platform)\b/i.test(text);
 const capability=/\b(reasoning|multimodal|benchmark|vision[- ]language|training|efficiency|security|vulnerability)\b/i.test(title);
 const promotion=/\b(webinar|podcast|conference|event|interview|roundup|newsletter|award|sponsor|join us)\b/i.test(title);
 const patch=/\bv?\d+\.\d+\.[1-9]\d*\b/i.test(title)&&kind==='release';
 const security=/\b(security|vulnerability|critical|exploit|cve-\d+)\b/i.test(title);
 const age=(Date.parse(asOf)-Date.parse(raw.publishedAt))/86400000;
 add(themes.length>0,'可识别的前沿主题',8);add(release,'具体发布或部署事件',17);add(capability,'能力、安全或效率变化',11);add(durable,'架构、开放生态或协议影响',12);
 add(/\b\d+(?:\.\d+)?\s*(?:x|%|billion|million|tokens)\b|\d+%/i.test(text),'存在可核验的量化主张（未验证）',4);
 add(kind!=='preprint'&&kind!=='news','直接公开的一手来源',8);add(kind==='news','独立新闻报道（仍需核对原文）',4);add(kind==='preprint','未评审论文，不代表能力已获验证',-12);
 add(age>=0&&age<=1,'近一天的来源时间',6);add(age>1&&age<=7,'近一周的来源时间',3);
 add(promotion,'活动或推广类内容',-25);add(patch&&!security,'普通补丁版本',-18);add(security,'安全或关键漏洞变化',12);
 const importance=Math.max(0,Math.min(kind==='preprint'?68:96,breakdown.reduce((n,p)=>n+p.points,0)));
 const longTermImportance=Math.max(0,Math.min(95,35+(durable?23:0)+(themes.length?14:0)+(themes.length>1?8:0)+(capability?8:0)+(kind==='preprint'?-10:5)-(promotion?28:0)-(patch&&!security?15:0)));
 const primary=topics.find(t=>themes[0]?.id===t.id);
 const sourceQuality={kind,publisher:source.publisher||source.name,score:kind==='preprint'?55:kind==='research'?85:kind==='news'?83:90,note:kind==='preprint'?'公开预印本；尚未确认同行评审或独立复现。':kind==='news'?'新闻报道；与一手材料交叉核对，不能把转载或引用同一公告当作独立确认。':'来源可确认公告或代码发布；产品效果、采用规模与因果结论仍需独立验证。'};
 return {importance,longTermImportance,horizonYears:promotion?0:durable||themes.length>1?7:release||themes.length?5:1,
  whyItMatters:'规则分析：'+(primary?primary.why:'评估具体变化及其可验证证据，避免把宣传或单次结果等同于可部署能力。'),
  longTermImpact:'规则情景（3–10 年）：'+(primary?primary.impact:'是否形成长期影响取决于可复现效果与持续采用。'),
  ruleAnalysis:{version:VERSION,scoring:breakdown,themes,sourceQuality,publishedAtBasis:raw.publishedAtBasis||'published',relatedNews:[]},category};
}
function associate(items){
 const postings=new Map();for(const item of items)for(const theme of item.ruleAnalysis?.themes||[]){if(!postings.has(theme.id))postings.set(theme.id,[]);postings.get(theme.id).push(item);}
 return items.map(item=>{
  if(!item.ruleAnalysis)return item;
  const candidates=new Map();for(const theme of item.ruleAnalysis.themes)for(const other of postings.get(theme.id)||[]){
   if(other.id===item.id||Math.abs(Date.parse(other.publishedAt)-Date.parse(item.publishedAt))>14*86400000)continue;
   if(!candidates.has(other.id))candidates.set(other.id,{id:other.id,relationship:'shared-topic',themes:[],differentSource:other.source!==item.source});candidates.get(other.id).themes.push(theme.id);
  }
  const relatedNews=[...candidates.values()].sort((a,b)=>b.themes.length-a.themes.length||Number(b.differentSource)-Number(a.differentSource)||a.id.localeCompare(b.id)).slice(0,4);
  return {...item,ruleAnalysis:{...item.ruleAnalysis,relatedNews}};
 });
}
function enhanceBatch(batch,sources){
 if(batch.isDemo)return batch;
 const items=batch.items.map(item=>{
  if(item.intelligence||item.ruleAnalysis?.version===VERSION)return item;
  const source=sources.find(s=>s.name===item.source);if(!source)return item;
  const quality=assess({title:item.title,content:item.summary,publishedAt:item.publishedAt,publishedAtBasis:item.ruleAnalysis?.publishedAtBasis},source,{category:item.category,asOf:batch.asOf});
  return {...item,...quality,signalBrief:undefined};
 });
 return {...batch,items:associate(items)};
}
module.exports={assess,associate,themesFor,enhanceBatch,VERSION};
