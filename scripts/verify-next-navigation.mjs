/* Real Chrome/Next.js parity test using Node's native CDP WebSocket; no extra deps. */
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'frontier-next-browser-'));
const chrome=process.env.CHROME_BIN||execFileSync('sh',['-c','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).trim();
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{stdio:'ignore'});
let browser,socket;const checks=[];
try{
 async function until(url){for(let i=0;i<100;i++){try{const r=await fetch(url);if(r.ok)return r;}catch{}await wait(100);}throw Error('Browser/server did not start: '+url);}
 await until('http://127.0.0.1:3100');browser=spawn(chrome,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--remote-debugging-port=9222','--user-data-dir='+tmp,'about:blank'],{stdio:'ignore'});
 const pages=await (await until('http://127.0.0.1:9222/json/list')).json();socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let id=0;const pending=new Map();socket.onmessage=event=>{const result=JSON.parse(event.data),entry=pending.get(result.id);if(entry){pending.delete(result.id);result.error?entry.reject(Error(JSON.stringify(result.error))):entry.resolve(result.result);}};
 const command=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await command('Page.enable');
 // The approved publication remains deterministic in regression, regardless of test day.
 const archive=JSON.parse(fs.readFileSync('src/data/briefing.generated.json')),edition=archive.editions.slice().sort((a,b)=>b.date.localeCompare(a.date))[0],reference=Date.parse(edition.generatedAt)+60000;
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`globalThis.Date=class extends Date{constructor(...args){super(...(args.length?args:[${reference}]));}static now(){return ${reference};}};`});
 await command('Page.navigate',{url:'http://127.0.0.1:3100/#view=briefing&date='+edition.date});await wait(1500);
 const result=await command('Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:`(async()=>{
 const checks=[],assert=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);},pause=(ms=220)=>new Promise(r=>setTimeout(r,ms));
 assert(innerWidth===390,'Next.js 390px viewport');assert(document.querySelectorAll('.view-filters button').length===2&&!document.querySelector('[data-view="Today"],[data-view="Latest"]'),'Next.js two-entry navigation');
 assert(document.querySelector('.brief-masthead h1').textContent.includes('${edition.date}'),'Next.js archive deep link selects published date');
 for(const language of ['zh','en'])for(const theme of ['light','dark']){
 document.querySelector('[data-language="'+language+'"]').click();await pause();document.querySelector('[data-theme="'+theme+'"]').click();await pause();assert(document.documentElement.lang===(language==='zh'?'zh-CN':'en')&&document.documentElement.dataset.theme===theme,'Next.js language/theme change');
 scrollTo(0,document.querySelectorAll('.brief-story')[2].offsetTop);await pause();assert(document.querySelector('.brief-toolbar').dataset.readerHidden==='true','Next.js downward reading hides toolbar');scrollBy(0,-24);await pause();assert(document.querySelector('.brief-toolbar').dataset.readerHidden==='false','Next.js upward scroll reveals toolbar');
 const menu=document.querySelector('[data-preference="language"]');menu.querySelector('summary').click();await pause();scrollBy(0,40);await pause();assert(document.querySelector('.brief-toolbar').dataset.readerHidden==='false','Next.js open menu locks toolbar');menu.querySelector('summary').click();
 document.querySelector('.view-filters [data-view="Long-term"]').click();await pause();assert(document.querySelector('.view-filters [aria-pressed=true]').dataset.view==='Long-term','Next.js switches to long-term');
 for(const p of document.querySelectorAll('.card .summary,.card .importance p,.trend-impact p'))assert(language==='zh'?/[\\u3400-\\u9fff]/.test(p.textContent):!/[\\u3400-\\u9fff]/.test(p.textContent),'Next.js localized trend prose');
 assert(document.documentElement.scrollWidth<=390&&document.body.scrollWidth<=390,'Next.js no mobile horizontal overflow');for(const a of document.querySelectorAll('.article-title-link,.article-source-link'))assert(/^https?:/.test(a.href)&&a.target==='_blank'&&a.rel==='noopener noreferrer','Next.js real original source links');
 document.querySelector('.view-filters [data-view="Daily Briefing"]').click();await pause();assert(document.querySelector('.brief-masthead h1').textContent.includes('${edition.date}'),'Next.js selected date survives view/language switches');
 }
 return checks;
})()`});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);checks.push(...result.result.value);
 // Browser emulation checks actual System change, rather than calling the provider directly.
 await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});await command('Runtime.evaluate',{expression:"document.querySelector('[data-theme=system]').click()"});await wait(200);
 let state=await command('Runtime.evaluate',{returnByValue:true,expression:'document.documentElement.dataset.theme'});if(state.result.value!=='dark')throw Error('System did not follow emulated dark');
 await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'},{name:'prefers-reduced-motion',value:'reduce'}]});await wait(200);state=await command('Runtime.evaluate',{returnByValue:true,expression:"[document.documentElement.dataset.theme,getComputedStyle(document.querySelector('.brief-toolbar')).transitionDuration]"});if(state.result.value[0]!=='light'||state.result.value[1]!=='0s')throw Error('System/reduced-motion did not react');checks.push('Actual OS theme change and reduced motion honored');
 fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/next-browser-result.json',JSON.stringify({passed:true,checks},null,2));console.log('Next.js mobile Chrome parity passed: '+checks.length+' assertions');
}catch(error){fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/next-browser-result.json',JSON.stringify({passed:false,error:error.message,checks},null,2));throw error;}
finally{socket?.close();browser?.kill();server.kill();await wait(100);fs.rmSync(tmp,{recursive:true,force:true});}
