const fs=require('node:fs');const path=require('node:path');const {choose}=require('./feeds/health.cjs');
function loadHealth(){let value;try{value=JSON.parse(fs.readFileSync(path.join(process.cwd(),'src/data/source-health.json'),'utf8'));}catch{}return choose(value);}
module.exports={loadHealth};
