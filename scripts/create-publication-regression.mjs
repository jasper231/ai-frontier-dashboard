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
html=html.replace('<head>',`<head><script>globalThis.Date=class extends Date{constructor(...args){super(...(args.length?args:[${reference}]));}static now(){return ${reference};}};</script>`);
const mobile=JSON.stringify(html.replace('<head>','<head><base href="about:srcdoc">')).replace(/</g,'\\u003c');
const driver=`(function(){const frame=document.createElement('iframe');frame.style.cssText='width:390px;height:844px;border:0';frame.onload=async()=>{let result;try{result={passed:true,checks:await (${verifyProduct.toString()})(frame.contentWindow)};}catch(error){result={passed:false,error:error.message,stack:error.stack};}const out=document.createElement('pre');out.id='publication-verification-result';out.textContent=JSON.stringify(result);document.body.append(out);};frame.srcdoc=${mobile};document.body.append(frame);})();`;
html=html.replace('</body>',`<script>${driver}</script></body>`);
for(const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(!script[1].includes('application/json'))new vm.Script(script[2]);
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync(output,html);console.log('Generated actual-publication product verification from '+input);
