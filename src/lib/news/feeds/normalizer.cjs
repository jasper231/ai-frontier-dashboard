const {createHash}=require('node:crypto');
const core=require('../core.cjs');
const {assess}=require('../quality/rules.cjs');
const rules=[
 ['crypto',/\b(ethereum|stablecoin|usdc|usdt|blockchain|onchain|on-chain|coinbase|tokenization|defi)\b/i,'稳定币与可信基础设施', '结算与可信基础设施可能受影响。','3–10 年：数字结算与可信计算。'],
 ['robotics',/\b(robot(?:s|ics|ic)?|embodied|humanoid|manipulation|autonomous vehicles?)\b/i,'具身智能','物理任务自动化能力值得验证。','3–10 年：具身智能与机器人。'],
 ['agents',/\b(agents?|agentic|tool[- ]calling|mcp|computer use)\b/i,'智能体','任务自动化的可靠性值得关注。','3–10 年：可验证的任务自动化。'],
 ['chips',/\b(gpus?|chips?|semiconductors?|cuda|blackwell|hbm|accelerators?|nvlink)\b/i,'算力基础设施','计算成本与部署效率可能受影响。','3–10 年：高效算力与专用芯片。'],
 ['ai',/\b(ai|artificial intelligence|language models?|llms?|multimodal|reasoning|transformer|models?)\b/i,'AI 模型','模型能力与应用边界值得评估。','3–10 年：AI 应用与决策协作。']
];
function canonicalUrl(value){const u=new URL(value);u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(k))u.searchParams.delete(k);u.searchParams.sort();u.hostname=u.hostname.toLowerCase();u.pathname=u.pathname.replace(/\/$/,'')||'/';return u.toString();}
function normalize(raw,source,options={}){
 const url=new URL(raw.sourceUrl);
 if(!['http:','https:'].includes(url.protocol)||!source.hosts.some(h=>url.hostname===h||url.hostname.endsWith('.'+h)))throw new Error('Non-official article URL');
 if(url.username||url.password)throw new Error('Credentials in article URL');
 if(source.articlePathPrefix&&!url.pathname.startsWith(source.articlePathPrefix))throw new Error('Non-official repository path');
 const timestamp=Date.parse(raw.publishedAt);if(!Number.isFinite(timestamp))throw new Error('Invalid publication date');
 // Prefer the headline when classifying; body keyword matches are secondary.
 const rule=rules.find(r=>r[1].test(raw.title))||(source.sourceKind==='release'?rules.find(r=>r[0]===source.category):null)||rules.find(r=>r[1].test(raw.content))||rules.find(r=>r[0]===source.category);
 const category=rule[0],quality=assess(raw,source,{...options,category});
 const item={...quality,id:createHash('sha256').update(canonicalUrl(raw.sourceUrl)).digest('hex').slice(0,24),title:raw.title,category,source:source.name,sourceUrl:raw.sourceUrl,publishedAt:new Date(timestamp).toISOString(),summary:(raw.content||raw.title).slice(0,320),tags:[rule[2],quality.ruleAnalysis.sourceQuality.kind==='preprint'?'预印本':'官方来源',...(raw.publishedAtBasis==='updated'?['来源更新时间']:[])]};
 core.validateBatch({schemaVersion:1,asOf:new Date().toISOString(),timeZone:'UTC',isDemo:false,items:[item]});return item;
}
function deduplicate(items){const urls=new Set(),titles=new Set();const out=[];for(const item of items){const url=canonicalUrl(item.sourceUrl);const title=item.title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');const key=title.length>=20?title+'|'+item.publishedAt.slice(0,10):null;if(urls.has(url)||(key&&titles.has(key)))continue;urls.add(url);if(key)titles.add(key);out.push(item);}return out;}
module.exports={normalize,deduplicate,canonicalUrl};
