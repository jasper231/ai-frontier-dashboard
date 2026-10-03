const fs=require('node:fs');
const html=fs.readFileSync('artifacts/live-browser-dom.html','utf8');
const match=/<pre id="live-verification-result">([\s\S]*?)<\/pre>/.exec(html);
if(!match)throw new Error('Production browser scripts did not produce a verification result');
const json=match[1].replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const result=JSON.parse(json);fs.writeFileSync('artifacts/live-browser-result.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
