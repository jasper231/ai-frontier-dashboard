import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {loadHealth} from '../src/lib/news/source-health-provider.cjs';
import healthRender from '../src/lib/news/source-health-render.cjs';
const {render}=healthRender;
import {bootstrapScript} from '../src/lib/news/bootstrap.cjs';
export function buildSourceHealth(){
const report=loadHealth(),json=JSON.stringify(report).replace(/</g,'\\u003c');
const css=fs.readFileSync('src/app/globals.css','utf8');
const renderer=fs.readFileSync('src/lib/news/source-health-render.cjs','utf8');
const runtime=`(function(){const preferences=globalThis.FrontierPreferences.controller,report=JSON.parse(document.getElementById('source-health-snapshot').textContent),root=document.getElementById('health-root');function draw(){const language=preferences.snapshot().language;root.innerHTML=globalThis.FrontierHealthRender.render(report,language);document.title=globalThis.FrontierI18n.dictionary(language).health.title;document.querySelector('meta[name="description"]').content=globalThis.FrontierI18n.dictionary(language).health.explanation;preferences.ready();}preferences.subscribe(draw);root.addEventListener('click',function(event){const button=event.target.closest('button[data-theme],button[data-language]');if(button?.dataset.theme)preferences.setTheme(button.dataset.theme);else if(button?.dataset.language)preferences.setLanguage(button.dataset.language);});draw();setInterval(draw,60000);})();`;
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>来源健康</title><meta name="description" content="Source feed health and freshness"><script>${bootstrapScript()}</script><style>${css}\nhtml[data-frontier-pending] #health-root{visibility:hidden}.health-page{max-width:900px;margin:auto;padding:20px 16px;overflow-wrap:anywhere}.health-header{margin-bottom:36px}.health-header h1{font-size:28px}.health-page p{font-size:15px;line-height:1.8;color:var(--body-text)}.health-row{padding:22px 0;border-bottom:1px solid var(--line)}.health-row header{display:flex;flex-wrap:wrap;align-items:center;gap:12px}.health-row h2{font-size:20px;margin:0}.health-row dl{display:grid;grid-template-columns:1fr 1fr;gap:12px}.health-row dl div{min-width:0}.health-row dt{color:var(--muted);font-size:13px}.health-row dd{margin:5px 0;font-size:14px}.health-page .health-warning{color:var(--accent);font-weight:600}.health-reason{font-size:14px}.health-page .preferences{margin:20px 0}.health-page footer{display:block;padding:24px 0}@media(max-width:420px){.health-row dl{grid-template-columns:1fr}}</style><noscript><style>html[data-frontier-pending] #health-root{visibility:visible}</style></noscript></head><body class="health-page"><div id="health-root">${render(report,'zh')}</div><script type="application/json" id="source-health-snapshot">${json}</script><script>(function(module,exports,require){${renderer}\n${runtime}})();</script></body></html>`;
for(const folder of ['static-preview','dist','public']){fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(folder+'/source-health.html',html);fs.writeFileSync(folder+'/source-health.json',JSON.stringify(report,null,2)+'\n');}
console.log('Built offline source-health.html and machine-readable status.');

}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)buildSourceHealth();
