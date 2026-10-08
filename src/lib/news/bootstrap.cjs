/* Server/build-time helper: both HTML targets use the identical pre-paint script. */
const fs=require('node:fs');const path=require('node:path');
function bootstrapScript(){return '(function(module,exports,require){\n'+['i18n.cjs','preferences.cjs'].map(file=>fs.readFileSync(path.join(process.cwd(),'src/lib/news',file),'utf8')).join('\n')+'\n})();';}
module.exports={bootstrapScript};
