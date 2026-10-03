const { chromium } = require('/opt/codex/runtimes/cua/lib/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[];
 for(const width of [375,390,768,1440]){
 const page=await browser.newPage({viewport:{width,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///workspace/ai-frontier-dashboard/static-preview/index.html');
 const result=await page.evaluate(()=>({title:document.title,categories:document.querySelectorAll('section.category').length,cards:document.querySelectorAll('article.card').length,importance:document.querySelectorAll('.importance').length,overflow:document.documentElement.scrollWidth>innerWidth,columns:getComputedStyle(document.querySelector('.cards')).gridTemplateColumns}));
 await page.screenshot({path:`artifacts/dashboard-${width}.png`,fullPage:true});results.push({width,...result,errors});await page.close();
 }
 await browser.close();require('fs').writeFileSync('artifacts/preview-checks.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
 if(results.some(r=>r.overflow||r.cards!==15||r.categories!==5||r.errors.length))process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exit(1)});
