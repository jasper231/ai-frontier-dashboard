import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const original=process.cwd();
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'frontier-browser-'));
try{
 for(const folder of ['src','scripts','public'])fs.cpSync(folder,path.join(tmp,folder),{recursive:true});
 const local=JSON.parse(fs.readFileSync('src/data/news.local.json','utf8'));
 const reference=Date.parse('2026-10-03T12:00:00Z');
 const indexes=[0,1,2,3,6,9,12],importance=[99,90,85,80,75,70,65],long=[65,40,100,96,93,90,88];
 const offsets=[2*86400000,60000,7*86400000,120000,180000,86400000,86400000];
 const batch={...local,isDemo:false,asOf:new Date(reference).toISOString(),items:indexes.map((index,i)=>({...local.items[index],source:'Official Regression Fixture',sourceUrl:`https://openai.com/news/browser-fixture-${i}`,publishedAt:new Date(reference-offsets[i]).toISOString(),importance:importance[i],longTermImportance:long[i],horizonYears:i===1?1:7}))};
 for(let i=0;i<8;i++)batch.items.push({...batch.items[6],id:'daily-'+i,title:'Distinct official daily development number '+i,category:['ai','agents','chips','robotics','crypto'][i%5],source:'Daily Source '+i%3,sourceUrl:'https://openai.com/news/browser-fixture-'+(i+7),publishedAt:new Date(reference-(i+4)*60000).toISOString(),importance:60,longTermImportance:60,horizonYears:5});
 fs.writeFileSync(path.join(tmp,'src/data/news.generated.json'),JSON.stringify(batch));
 process.chdir(tmp);await import('./build-pages.mjs?browser-regression');process.chdir(original);
 let html=fs.readFileSync(path.join(tmp,'dist/index.html'),'utf8');
 // Fix the clock in this isolated test only, so UTC day assertions stay deterministic.
 html=html.replace('<head>','<head><script>globalThis.Date=class extends Date{constructor(...args){super(...(args.length?args:['+reference+']));}static now(){return '+reference+';}};</script>');
 const mobileHtml=JSON.stringify(html).replace(/</g,'\\u003c');
 const driver=`(function(){function check(){const results=[];function assert(ok,label){if(!ok)throw new Error(label);results.push(label);}
  function state(){return {active:document.querySelector('[data-view][aria-pressed="true"]').getAttribute('data-view'),cards:Array.from(document.querySelectorAll('.category .card')).map(e=>e.getAttribute('data-item-id')),signals:Array.from(document.querySelectorAll('.signal')).map(e=>e.getAttribute('data-item-id'))};}
  function links(){document.querySelectorAll('article.card,article.signal').forEach(function(article){const title=article.querySelector('h3 a'),footer=article.querySelector('.article-source-link');assert(!!title&&!!footer,'title and footer exist');[title,footer].forEach(function(link){assert(link.href.startsWith('https://openai.com/news/browser-fixture-')&&link.target==='_blank'&&link.rel==='noopener noreferrer','native official href and new-tab attributes');});});}
  try{const initial=state();assert(initial.active==='Latest','default Latest');assert(initial.cards[0]==='ai-2','Latest orders AI by publication');links();
   document.querySelector('[data-view="Today"]').click();const today=state();assert(today.active==='Today','Today active state changes');assert(today.cards.length===11&&!today.cards.includes('ai-1'),'Today filters out older items');assert(JSON.stringify(today.signals)!==JSON.stringify(initial.signals),'Today Top Signals changes');links();
   document.querySelector('[data-view="Long-term"]').click();const long=state();assert(long.active==='Long-term','Long-term active state changes');assert(long.cards[0]==='ai-3','Long-term orders by impact score');assert(!long.cards.includes('ai-2'),'Long-term excludes short horizon');assert(long.signals[0]==='ai-3'&&JSON.stringify(long.signals)!==JSON.stringify(today.signals),'Long-term Top Signals changes');links();
   document.querySelector('[data-view="Daily Briefing"]').click();const daily=state();assert(daily.active==='Daily Briefing'&&daily.cards.length===10,'Daily Briefing selects ten same-day stories');assert(!daily.cards.includes('ai-1')&&daily.signals.every(id=>daily.cards.includes(id)),'Daily Briefing signals use selected same-day stories');links();
   document.querySelector('[data-view="Latest"]').click();assert(JSON.stringify(state())===JSON.stringify(initial),'Repeated clicks restore Latest');
   const iframe=document.createElement('iframe');iframe.style.cssText='width:390px;height:844px;border:0';iframe.onload=function(){try{const doc=iframe.contentDocument,win=iframe.contentWindow;assert(win.innerWidth===390,'Mobile viewport is 390 CSS pixels');assert(doc.documentElement.scrollWidth<=390&&doc.body.scrollWidth<=390,'Mobile body has no horizontal overflow');const cards=doc.querySelector('.cards');assert(win.getComputedStyle(cards).gridTemplateColumns.split(' ').length===1,'Mobile cards are single column');doc.querySelector('[data-view="Daily Briefing"]').click();assert(doc.querySelector('[data-view="Daily Briefing"]').getAttribute('aria-pressed')==='true','Mobile Daily Briefing click works');assert(doc.querySelectorAll('.category .card').length===10,'Mobile Daily Briefing has ten cards');assert(doc.querySelector('[data-view="Daily Briefing"]').getBoundingClientRect().height>=44,'Mobile filter tap target is at least 44px');assert(doc.documentElement.scrollWidth<=390,'Mobile Daily Briefing has no overflow');const pre=document.createElement('pre');pre.id='browser-regression-result';pre.textContent=JSON.stringify({passed:true,checks:results});document.body.append(pre);}catch(error){const pre=document.createElement('pre');pre.id='browser-regression-result';pre.textContent=JSON.stringify({passed:false,error:error.message});document.body.append(pre);}};iframe.srcdoc=${mobileHtml};document.body.append(iframe);
  }catch(error){const pre=document.createElement('pre');pre.id='browser-regression-result';pre.textContent=JSON.stringify({passed:false,error:error.message});document.body.append(pre);}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();})();`;
 html=html.replace('</body>','<script>'+driver+'</script></body>');
 fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/browser-regression.html',html);
 console.log('Generated real-DOM regression page from dist/index.html, no server required.');
}finally{process.chdir(original);fs.rmSync(tmp,{recursive:true,force:true});}
