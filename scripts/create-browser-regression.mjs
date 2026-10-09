/* Test-only archive fixture in a temporary directory, never published as content. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {editionFor} from '../tests/fixtures/briefing/factory.cjs';
import {verifyProduct} from './browser-product-checks.cjs';
const cwd=process.cwd(),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'frontier-browser-'));
try{
 for(const folder of ['src','scripts','public'])fs.cpSync(folder,path.join(tmp,folder),{recursive:true});
 const local=JSON.parse(fs.readFileSync('src/data/news.local.json','utf8')),reference=Date.parse('2026-10-03T23:00:00Z');
 const batch={...local,isDemo:false,asOf:new Date(reference).toISOString(),items:local.items.map((item,i)=>({...item,source:'Official Regression Fixture',sourceUrl:'https://openai.com/news/browser-fixture-'+i,publishedAt:new Date(reference-(i+1)*60000).toISOString()}))};
 const older={...batch,asOf:new Date(reference-86400000).toISOString(),items:batch.items.map(item=>({...item,publishedAt:new Date(Date.parse(item.publishedAt)-86400000).toISOString()}))};
 const previous=editionFor(older,{count:2});previous.stories.forEach(s=>{s.title.zh+='（往期测试）';s.title.en+=' (previous fixture)';});
 fs.writeFileSync(path.join(tmp,'src/data/news.generated.json'),JSON.stringify(batch));fs.writeFileSync(path.join(tmp,'src/data/briefing.generated.json'),JSON.stringify({schemaVersion:2,editions:[previous,editionFor(batch)]}));
 process.chdir(tmp);await import('./build-pages.mjs?product-regression');process.chdir(cwd);
 let html=fs.readFileSync(path.join(tmp,'dist/index.html'),'utf8');
 const future=reference+2*86400000;
 html=html.replace('<head>',`<head><script>Object.defineProperty(navigator,'languages',{value:['zh-CN'],configurable:true});window.__readerEvents=[];window.__frontierReadingProbe=e=>window.__readerEvents.push(e);globalThis.Date=class extends Date{constructor(...args){super(...(args.length?args:[${future}]));}static now(){return ${future};}};</script>`);
 const driver=`(function(){async function run(){let result;try{const win=window,checks=await (${verifyProduct.toString()})(win);const p=win.FrontierPreferences.controller;Object.defineProperty(win.navigator,'languages',{value:['en-US'],configurable:true});win.dispatchEvent(new win.Event('languagechange'));if(p.snapshot().language!=='en')throw Error('Auto must follow en-US');p.setLanguage('zh');if(p.snapshot().language!=='zh')throw Error('Manual Chinese must override English');p.setLanguage('auto');if(p.snapshot().language!=='en')throw Error('Auto must resume browser language');checks.push('zh-CN Auto, en-US Auto, manual override and resume');result={passed:true,checks};}catch(error){result={passed:false,error:error.message,stack:error.stack};}const out=document.createElement('pre');out.id='browser-regression-result';out.textContent=JSON.stringify(result);document.body.append(out);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();})();`;
 fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/browser-regression.html',html.replace('</body>','<script>'+driver+'</script></body>'));
 console.log('Generated historical-archive and mobile product browser regression');
}finally{process.chdir(cwd);fs.rmSync(tmp,{recursive:true,force:true});}
