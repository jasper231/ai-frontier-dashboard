const fs=require('node:fs');const path=require('node:path');const core=require('./core.cjs');
function loadArchive(){const read=file=>{try{return JSON.parse(fs.readFileSync(path.join(process.cwd(),'src/data',file),'utf8'));}catch{return undefined;}};return core.chooseArchive(read('briefing.generated.json'),read('briefing.local.json'));}
module.exports={loadArchive};
