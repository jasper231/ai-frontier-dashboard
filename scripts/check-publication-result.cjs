const fs=require('node:fs');
const html=fs.readFileSync(process.argv[2]||'artifacts/publication-browser-dom.html','utf8');
const match=/<pre id="publication-verification-result">([\s\S]*?)<\/pre>/.exec(html);
if(!match)throw Error('Approved publication browser verification did not execute');
const report=JSON.parse(match[1].replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'));
if(!report.passed)throw Error(report.error);
console.log('Approved bilingual publication browser verification passed:',report.checks.length,'assertions');
