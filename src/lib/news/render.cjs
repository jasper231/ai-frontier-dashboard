/* Presentation only. Receives a view model; performs no fetching, filtering or ranking. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.cjs'));else root.FrontierRender=factory(root.FrontierData);})(typeof globalThis!=='undefined'?globalThis:this,function(core){
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function articleUrl(item,isDemo){
    if(isDemo||typeof item.sourceUrl!=='string')return null;
    const value=item.sourceUrl.trim();if(!/^https?:\/\//i.test(value))return null;
    try{const url=new URL(value);if(!url.hostname||url.username||url.password)return null;return value;}catch{return null;}
  }
  function titleLink(item,title,isDemo){
    const href=articleUrl(item,isDemo);
    return href?`<a class="article-title-link" href="${escape(href)}" target="_blank" rel="noopener noreferrer">${escape(title)}</a>`:escape(title);
  }
  function sourceLink(item,isDemo){
    const href=articleUrl(item,isDemo);
    return href?`<a class="article-source-link" href="${escape(href)}" target="_blank" rel="noopener noreferrer">${escape(item.source)} · 查看原文 ↗</a>`:'';
  }
  function renderRelated(item,isDemo,byId){
    const links=(item.ruleAnalysis?.relatedNews||[]).map(relation=>byId?.get(relation.id)).filter(other=>other&&articleUrl(other,isDemo)).slice(0,3);
    return links.length?`<details class="topic-relations"><summary>主题关联 · ${links.length} 条</summary><p>共享主题线索，供交叉阅读。</p><ul>${links.map(other=>`<li><a href="${escape(articleUrl(other,isDemo))}" target="_blank" rel="noopener noreferrer">${escape(other.title)} ↗</a><time>${core.formatDate(other.publishedAt)}</time></li>`).join('')}</ul></details>`:'';
  }
  function renderCard(item,isDemo,byId){
    const source=escape(item.source);
    return `<article class="card" data-item-id="${escape(item.id)}"><div class="card-meta"><span class="tag">${escape(item.tags.join(' · '))}</span><time datetime="${escape(item.publishedAt)}">${core.formatDate(item.publishedAt)}</time><span>${source}</span></div><h3>${titleLink(item,item.title,isDemo)}</h3><p class="summary">${escape(item.summary)}</p><div class="importance"><span class="importance-label">为什么重要 <span> / IMPLICATION</span></span><p>${escape(item.whyItMatters)}</p></div>${sourceLink(item,isDemo)}${renderRelated(item,isDemo,byId)}</article>`;
  }
  function renderSection(category,index,isDemo,byId){
    const total=category.entries.length,featured=Math.min(2,total);
    return `<section id="${category.id}" class="category category-${category.id}" aria-labelledby="${category.id}-title"><header class="section-heading"><span class="section-index">0${index+1}</span><div><h2 id="${category.id}-title">${escape(category.title)}</h2><p>${escape(category.subtitle)}</p></div><span class="section-count">精选 ${String(featured).padStart(2,'0')} / 共 ${String(total).padStart(2,'0')}</span></header>${total?`<div class="cards">${category.entries.slice(0,2).map(e=>renderCard(e,isDemo,byId)).join('')}</div>`:'<p class="summary">当前筛选暂无内容。</p>'}${total>2?`<details class="more-entries"><summary><span class="show-more">查看全部 <span>${total} 条</span></span><span class="show-less">收起内容</span></summary><div class="cards">${category.entries.slice(2).map(e=>renderCard(e,isDemo,byId)).join('')}</div></details>`:''}</section>`;
  }
  function renderSignals(vm){
    
    return `<section class="top-signals" aria-labelledby="top-signals-title"><header class="signals-heading"><div><h2 id="top-signals-title">Top Signals</h2><p>${(vm.view==='Today'||vm.view==='Daily Briefing')?'当天':vm.view==='Long-term'?'长期':'最近'}最值得关注的 ${vm.signals.length} 件事${vm.isDemo?' · 示例精选':''}</p></div><span class="signals-edition">${String(vm.signals.length).padStart(2,'0')} / PRIORITY</span></header><div class="signals-grid">${vm.signals.map(item=>{const s=core.signalText(item);return `<article class="signal" data-item-id="${escape(item.id)}"><div class="signal-title"><h3>${titleLink(item,s.title,vm.isDemo)}</h3><span class="signal-domain">${escape(s.domain)}</span></div><dl><div><dt>What happened</dt><dd>${escape(s.happened)}</dd></div><div><dt>Why it matters</dt><dd>${escape(s.matters)}</dd></div><div class="signal-impact"><dt>Long-term impact</dt><dd>${escape(s.impact)}</dd></div></dl>${sourceLink(item,vm.isDemo)}</article>`;}).join('')||'<p class="summary">当前筛选暂无信号。</p>'}</div></section>`;
  }
  function renderDashboard(vm){
    const byId=new Map((vm.relatedItems||vm.items).map(item=>[item.id,item]));
    const editionNote=vm.view==='Daily Briefing'?` · Daily Briefing：${vm.items.length} 条当天精选${vm.items.length<5?'（当天合格内容不足 5 条，不补旧闻）':''}`:'';
    const note=vm.isDemo?'最后更新：尚无真实更新 · 本地示例':`最后更新：${new Date(vm.snapshotAt).toISOString().slice(0,16).replace('T',' ')} UTC`;
    return `<a class="skip-link" href="#main">跳转到内容</a><header class="topbar"><a class="brand" href="#">FRONTIER <span>/ PERSONAL INTELLIGENCE</span></a><span class="edition">LOCAL EDITION</span></header><div class="shell"><aside class="sidebar"><div class="nav-label">观察领域 / 05</div><nav aria-label="栏目导航">${vm.categories.map((c,i)=>`<a href="#${c.id}"><span class="nav-index">0${i+1}</span>${escape(c.title)}</a>`).join('')}</nav><p class="sidebar-note">独立观察。<br>持续形成判断。</p></aside><main id="main"><div class="intro"><div class="eyebrow">个人前沿科技情报终端</div><h1>AI Frontier</h1><p>Track what matters. Understand why it matters.</p></div><div class="brief-toolbar"><div class="view-filters" role="group" aria-label="浏览视角">${core.views.map(label=>`<button type="button" data-view="${label}" aria-pressed="${vm.view===label}">${label}</button>`).join('')}</div><span class="demo-note">${note}${editionNote}</span></div>${renderSignals(vm)}<div class="feed-title"><span>FIELD NOTES / 详细浏览</span><span>05 领域 · ${vm.featuredCount} 条精选</span></div>${vm.categories.map((c,i)=>renderSection(c,i,vm.isDemo,byId)).join('')}<footer><span>FRONTIER / 独立观察，持续思考。</span><span>${vm.isDemo?'本地示例内容与日期 · 非实时新闻':'本地新闻快照'}</span></footer></main></div>`;
  }
  return {renderDashboard};
});
