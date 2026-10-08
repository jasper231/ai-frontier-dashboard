import fs from 'node:fs';
// Generation is dependency-free and embeds the selected snapshot, CSS, icon and scripts.
await import('./create-static.mjs');
fs.rmSync('dist',{recursive:true,force:true});
fs.mkdirSync('dist',{recursive:true});
fs.copyFileSync('static-preview/index.html','dist/index.html');
fs.writeFileSync('dist/.nojekyll','');
const {buildSourceHealth}=await import('./build-source-health.mjs');buildSourceHealth();
console.log('GitHub Pages output: dist/ (works at both / and /repository-name/).');
