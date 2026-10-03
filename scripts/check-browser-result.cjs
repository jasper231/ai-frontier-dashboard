const fs=require('node:fs');
const html=fs.readFileSync('artifacts/browser-regression-dom.html','utf8');
const match=/<pre id="browser-regression-result">([\s\S]*?)<\/pre>/.exec(html);
if(!match)throw new Error('Browser scripts did not execute: no DOM regression result');
const text=match[1].replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const report=JSON.parse(text);if(!report.passed)throw new Error(report.error);
console.log('Real browser DOM regression passed:',report.checks.length,'assertions');
