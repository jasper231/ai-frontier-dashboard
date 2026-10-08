/* UI copy and optional story-language selection. No fetching or translation. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FrontierI18n=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const dictionaries={
  zh:{pageTitle:'AI Frontier — 个人前沿科技情报终端',description:'个人前沿科技情报终端，关注 AI、智能体、芯片、机器人与加密技术的变化及其长期影响。',
   personal:'个人情报',edition:'本地快照',skip:'跳转到内容',domains:'观察领域 / 05',navigation:'栏目导航',sidebar:'独立观察。<br>持续形成判断。',eyebrow:'个人前沿科技情报终端',tagline:'追踪重要变化。理解它们为何重要。',viewLabel:'浏览视角',
   views:{Today:'今日',Latest:'最新', 'Long-term':'长期趋势','Daily Briefing':'每日简报'},signals:'重要信号',priority:'优先关注',signalCaption:(view,n,demo)=>(view==='Today'||view==='Daily Briefing'?'当天':view==='Long-term'?'长期':'最近')+'最值得关注的 '+n+' 件事'+(demo?' · 示例精选':''),
   happened:'发生了什么',matters:'为什么重要',impact:'长期影响',implication:'影响分析',readOriginal:'查看原文',related:n=>'主题关联 · '+n,relatedNote:'共享主题线索，供交叉阅读。',showAll:'查看全部',collapse:'收起内容',entries:n=>n+' 条',emptyContent:'当前筛选暂无内容。',emptySignals:'当前筛选暂无信号。',updated:'最后更新',noUpdate:'尚无真实更新 · 本地示例',beijing:'北京时间',briefingCount:n=>' · 每日简报：'+n+' 条当天精选'+(n<5?'（当天合格内容不足 5 条，不补旧闻）':''),
   fieldNotes:'详细浏览',fieldCount:n=>'05 领域 · '+n+' 条精选',sectionCount:(featured,total)=>'精选 '+String(featured).padStart(2,'0')+' / 共 '+String(total).padStart(2,'0'),footer:'独立观察，持续思考。',demoFooter:'本地示例内容与日期 · 非实时新闻',realFooter:'本地新闻快照',
   language:'语言',languageZh:'中文',theme:'主题',auto:'自动',system:'跟随系统',light:'浅色',dark:'深色',badge:'中',
   categories:{ai:['AI','理解模型能力的边界与新的应用机会。'],agents:['Agents','关注智能体如何可靠地完成真实任务。'],chips:['GPU & Chips','从算力效率看 AI 基础设施的演进。'],robotics:['Robotics','追踪智能从数字世界走向物理世界。'],crypto:['Crypto','观察可信计算与价值流转的新基础设施。']},domainsShort:{ai:'AI',agents:'Agents',chips:'Chips',robotics:'Robotics',crypto:'Crypto'}},
  en:{pageTitle:'AI Frontier — Personal Frontier Intelligence',description:'Personal intelligence on AI, agents, chips, robotics and crypto: track important developments and their long-term implications.',
   personal:'PERSONAL INTELLIGENCE',edition:'LOCAL EDITION',skip:'Skip to content',domains:'OBSERVATION AREAS / 05',navigation:'Categories',sidebar:'Independent observation.<br>Develop your perspective.',eyebrow:'PERSONAL FRONTIER INTELLIGENCE',tagline:'Track what matters. Understand why it matters.',viewLabel:'Browse perspectives',
   views:{Today:'Today',Latest:'Latest','Long-term':'Long-term','Daily Briefing':'Daily Briefing'},signals:'Top Signals',priority:'PRIORITY',signalCaption:(view,n,demo)=>(view==='Today'||view==='Daily Briefing'?"Today's":view==='Long-term'?'Long-term':'Latest')+' '+n+' signals to watch'+(demo?' · Sample selection':''),
   happened:'What happened',matters:'Why it matters',impact:'Long-term impact',implication:'IMPLICATION',readOriginal:'Read original',related:n=>'Related topics · '+n,relatedNote:'Shared themes for cross-reading.',showAll:'View all',collapse:'Show less',entries:n=>n+' stories',emptyContent:'No stories in this view.',emptySignals:'No signals in this view.',updated:'Last updated',noUpdate:'No live update yet · Local sample',beijing:'Beijing time',briefingCount:n=>' · Daily Briefing: '+n+' stories today'+(n<5?' (fewer than 5 eligible today; no older stories added)':''),
   fieldNotes:'FIELD NOTES',fieldCount:n=>'05 areas · '+n+' featured',sectionCount:(featured,total)=>'Featured '+String(featured).padStart(2,'0')+' / Total '+String(total).padStart(2,'0'),footer:'Independent observation. Keep thinking.',demoFooter:'Local sample content and dates · Not live news',realFooter:'Local news snapshot',
   language:'Language',languageZh:'Chinese',theme:'Theme',auto:'Auto',system:'System',light:'Light',dark:'Dark',badge:'EN',
   categories:{ai:['AI','Explore model capabilities and emerging applications.'],agents:['Agents','Follow agents that reliably complete real tasks.'],chips:['GPU & Chips','Track compute efficiency and the evolution of AI infrastructure.'],robotics:['Robotics','Follow intelligence moving from digital to physical worlds.'],crypto:['Crypto','Explore infrastructure for trust and value transfer.']},domainsShort:{ai:'AI',agents:'Agents',chips:'Chips',robotics:'Robotics',crypto:'Crypto'}}
 };
 function dictionary(language){return dictionaries[language==='en'?'en':'zh'];}
 function resolveLanguage(preference,navigator){
  if(preference==='zh'||preference==='en')return preference;
  const preferred=navigator?.languages?.[0]||navigator?.language||'en';return /^zh(?:-|$)/i.test(preferred)?'zh':'en';
 }
 function content(object,field,language){const localized=object?.[field+(language==='en'?'En':'Zh')];return typeof localized==='string'&&localized.trim()?localized:typeof object?.[field]==='string'?object[field]:'';}
 function signalContent(item,field,briefField,language){
  const suffix=language==='en'?'En':'Zh';
  for(const value of [item.signalBrief?.[briefField+suffix],item[field+suffix],item.signalBrief?.[briefField],content(item,field,language)])if(typeof value==='string'&&value.trim())return value;
  return '';
 }
 function formatUpdated(value,language){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} ${dictionary(language).beijing}（${new Date(value).toISOString().slice(0,16).replace('T',' ')} UTC）`.replace('（',language==='en'?' (':'（').replace('）',language==='en'?')':'）');
 }
 return {dictionary,resolveLanguage,content,signalContent,formatUpdated};
});
