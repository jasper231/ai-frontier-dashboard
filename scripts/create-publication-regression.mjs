/* Verify actual standalone publication; no synthetic data enters this artifact. */
import fs from 'node:fs';
import vm from 'node:vm';
import {verifyProduct} from './browser-product-checks.cjs';
const input=process.argv[2]||'dist/index.html',output=process.argv[3]||'artifacts/publication-browser-check.html';
let html=fs.readFileSync(input,'utf8');
const embedded=/<script[^>]*id="briefing-snapshot"[^>]*>([\s\S]*?)<\/script>/.exec(html);
if(!embedded)throw Error('Standalone artifact is missing briefing data');
const latest=JSON.parse(embedded[1]).editions.filter(e=>e.status==='published').sort((a,b)=>b.date.localeCompare(a.date))[0];
if(!latest)throw Error('Actual artifact has no published edition to verify');
const reference=Date.parse(latest.generatedAt)+60000;
html=html.replace('<head>',`<head><script>window.__readerEvents=[];window.__frontierReadingProbe=e=>window.__readerEvents.push(e);globalThis.Date=class extends Date{constructor(...args){super(...(args.length?args:[${reference}]));}static now(){return ${reference};}};</script>`);
const driver=`(function(){async function run(){let result;try{result={passed:true,checks:await (${verifyProduct.toString()})(window)};}catch(error){result={passed:false,error:error.message,stack:error.stack};}const out=document.createElement('pre');out.id='publication-verification-result';out.textContent=JSON.stringify(result);document.body.append(out);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();})();`;
html=html.replace('</body>',`<script>${driver}</script></body>`);
for(const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(!script[1].includes('application/json'))new vm.Script(script[2]);
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync(output,html);console.log('Generated actual-publication product verification from '+input);
