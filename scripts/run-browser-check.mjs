/* Run offline DOM checks with actual browser frames, not synthetic virtual time. */
import {spawn,execFileSync} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const [input,output,marker='browser-regression-result']=process.argv.slice(2);if(!input||!output)throw Error('Usage: run-browser-check.mjs input.html output.html result-id');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'frontier-dom-chrome-'));
const chrome=process.env.CHROME_BIN||execFileSync('sh',['-c','command -v google-chrome || command -v chromium'],{encoding:'utf8'}).trim();
const browser=spawn(chrome,['--headless','--window-size=430,950','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--remote-debugging-port=9223','--user-data-dir='+tmp,'about:blank'],{stdio:'ignore'});let socket;
try{
 let pages;for(let i=0;i<100;i++){try{pages=await(await fetch('http://127.0.0.1:9223/json/list')).json();break;}catch{await wait(100);}}if(!pages)throw Error('Chrome debugging endpoint did not start');
 socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let id=0;const pending=new Map();socket.onmessage=event=>{const message=JSON.parse(event.data),entry=pending.get(message.id);if(entry){pending.delete(message.id);if(message.error)entry.reject(Error(JSON.stringify(message.error)));else entry.resolve(message.result);}};
 const command=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await command('Page.enable');await command('Page.navigate',{url:'file://'+path.resolve(input)});
 let complete=false;for(let i=0;i<200;i++){await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const result=await command('Runtime.evaluate',{returnByValue:true,expression:`!!document.getElementById(${JSON.stringify(marker)})`});if(result.result?.value){complete=true;break;}await wait(100);}
 const dom=await command('Runtime.evaluate',{returnByValue:true,expression:'document.documentElement.outerHTML'});fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,dom.result.value);if(!complete)throw Error('Offline Chrome driver did not finish: '+marker);
 console.log('Captured actual Chrome DOM and scroll/animation frames: '+output);
}finally{socket?.close();browser.kill();await wait(300);fs.rmSync(tmp,{recursive:true,force:true,maxRetries:3,retryDelay:100});}
