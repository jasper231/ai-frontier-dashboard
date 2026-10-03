import fs from 'node:fs';
import core from '../src/lib/news/core.cjs';
import renderer from '../src/lib/news/render.cjs';
import snapshots from '../src/lib/news/snapshot.cjs';
const local=JSON.parse(fs.readFileSync('src/data/news.local.json','utf8'));
let generated;
try { generated=JSON.parse(fs.readFileSync('src/data/news.generated.json','utf8')); } catch {}
const selection=snapshots.chooseSnapshot(generated,local);
const batch=selection.batch;
console.log('Snapshot: '+selection.mode+(selection.reason?' ('+selection.reason+')':''));
const definitions=JSON.parse(fs.readFileSync('src/data/categories.json','utf8'));
const css=fs.readFileSync('src/app/globals.css','utf8');
const icon='data:image/svg+xml;base64,'+fs.readFileSync('public/favicon.svg').toString('base64');
const json=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const browserInteraction=`(function(){
  const batch=JSON.parse(document.getElementById('news-snapshot').textContent);
  const definitions=JSON.parse(document.getElementById('category-definitions').textContent);
  const root=document.getElementById('dashboard-root');
  root.innerHTML=FrontierRender.renderDashboard(FrontierData.createView(batch,definitions,'Latest',new Date().toISOString()));
  root.addEventListener('click',function(event){
    const button=event.target.closest('button[data-view]');if(!button)return;
    const view=button.getAttribute('data-view');
    root.innerHTML=FrontierRender.renderDashboard(FrontierData.createView(batch,definitions,view,new Date().toISOString()));
    root.querySelector('button[data-view="'+view+'"]').focus({preventScroll:true});
  });
})();`;
const coreScript=fs.readFileSync('src/lib/news/core.cjs','utf8');
const renderScript=fs.readFileSync('src/lib/news/render.cjs','utf8');
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="个人前沿科技情报终端，关注技术变化及其影响。"><title>AI Frontier — 个人前沿科技情报终端</title><link rel="icon" href="${icon}"><style>${css}</style></head><body><div id="dashboard-root">${renderer.renderDashboard(core.createView(batch,definitions,'Latest',batch.asOf))}</div><script type="application/json" id="news-snapshot">${json(batch)}</script><script type="application/json" id="category-definitions">${json(definitions)}</script><script>${coreScript}</script><script>${renderScript}</script><script>${browserInteraction}</script></body></html>`;
fs.mkdirSync('static-preview',{recursive:true});
for(const name of ['index.html','dashboard-standalone.html'])fs.writeFileSync('static-preview/'+name,html);
fs.writeFileSync('static-preview/styles.css',css);
fs.copyFileSync('public/favicon.svg','static-preview/favicon.svg');
console.log('Generated standalone HTML: shared data selectors, real offline filters, automatic Top Signals.');
