/* Explicit local import of an authored edition. Validation failure preserves last good data. */
const fs=require('node:fs');const path=require('node:path');const core=require('../src/lib/briefing/core.cjs');
function publish(edition,batch,output='src/data/briefing.generated.json'){
 core.validateEdition(edition);core.bindSources(edition,batch);
 let previous=core.empty();if(fs.existsSync(output))previous=core.validateArchive(JSON.parse(fs.readFileSync(output,'utf8')));
 const archive={schemaVersion:1,editions:[...previous.editions.filter(e=>e.date!==edition.date),edition].sort((a,b)=>b.date.localeCompare(a.date))};core.validateArchive(archive);
 fs.mkdirSync(path.dirname(output),{recursive:true});const temp=output+'.tmp';try{fs.writeFileSync(temp,JSON.stringify(archive,null,2)+'\n');fs.renameSync(temp,output);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}return archive;
}
if(require.main===module){const input=process.argv[2];if(!input)throw new Error('Usage: node scripts/publish-briefing.cjs <authored-edition.json> [source-snapshot.json] [output.json]');publish(JSON.parse(fs.readFileSync(input,'utf8')),JSON.parse(fs.readFileSync(process.argv[3]||'src/data/news.generated.json','utf8')),process.argv[4]);console.log('Validated and imported authored briefing; news snapshot unchanged.');}
module.exports={publish};
