const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const prefs=require('../src/lib/news/preferences.cjs'),i18n=require('../src/lib/news/i18n.cjs'),core=require('../src/lib/news/core.cjs'),renderer=require('../src/lib/news/render.cjs');
const batch=require('../src/data/news.local.json'),definitions=require('../src/data/categories.json');
function environment({language='en-US',languages,stored={},dark=false,blocked=false}={}){
 const values=new Map(Object.entries(stored)),events=new Map(),changes=new Set();
 const meta={content:'',setAttribute(_,value){this.content=value;}};
 const media={matches:dark,addEventListener(_,fn){changes.add(fn);},removeEventListener(_,fn){changes.delete(fn);}};
 const doc={documentElement:{dataset:{},lang:''},title:'',querySelector(){return meta;}};
 const env={document:doc,navigator:{language,languages},matchMedia(){return media;},localStorage:{getItem(key){if(blocked)throw Error('Storage blocked');return values.get(key)||null;},setItem(key,value){if(blocked)throw Error('Storage blocked');values.set(key,value);}},addEventListener(name,fn){events.set(name,fn);},removeEventListener(name){events.delete(name);}};
 return {env,values,meta,media,changeSystem(dark){media.matches=dark;for(const fn of changes)fn();},changeLanguage(language){env.navigator.language=language;events.get('languagechange')?.();},storage(key){events.get('storage')?.({key});}};
}
test('default System theme follows system changes; manual themes override and persist across initialization',()=>{
 const e=environment({dark:true}),c=prefs.initialize(e.env);
 assert.equal(c.snapshot().themePreference,'system');assert.equal(c.snapshot().theme,'dark');assert.equal(e.env.document.documentElement.dataset.theme,'dark');
 e.changeSystem(false);assert.equal(c.snapshot().theme,'light');
 c.setTheme('dark');e.changeSystem(false);assert.equal(c.snapshot().theme,'dark');assert.equal(e.values.get('frontier.theme'),'dark');
 c.dispose();const restored=prefs.initialize(e.env);assert.equal(restored.snapshot().theme,'dark');
 restored.setTheme('light');e.changeSystem(true);assert.equal(restored.snapshot().theme,'light');assert.equal(e.values.get('frontier.theme'),'light');
 restored.setTheme('system');assert.equal(restored.snapshot().theme,'dark');e.changeSystem(false);assert.equal(restored.snapshot().theme,'light');
});
test('Auto uses preferred browser language; manual language override persists and Auto can resume',()=>{
 for(const [language,expected] of [['zh-CN','zh'],['zh-TW','zh'],['en-US','en'],['fr-FR','en']])assert.equal(prefs.initialize(environment({language}).env).snapshot().language,expected);
 assert.equal(i18n.resolveLanguage('auto',{languages:['en-US','zh-CN'],language:'zh-CN'}),'en');
 const e=environment({language:'zh-CN'}),c=prefs.initialize(e.env);c.setLanguage('en');assert.equal(e.values.get('frontier.language'),'en');
 assert.equal(e.env.document.documentElement.lang,'en');assert.equal(e.env.document.title,i18n.dictionary('en').pageTitle);assert.equal(e.meta.content,i18n.dictionary('en').description);
 c.dispose();const fresh=prefs.initialize(e.env);assert.equal(fresh.snapshot().language,'en');fresh.setLanguage('auto');assert.equal(fresh.snapshot().language,'zh');e.changeLanguage('en-US');assert.equal(fresh.snapshot().language,'en');
 fresh.setLanguage('zh');e.changeLanguage('en-US');assert.equal(fresh.snapshot().language,'zh');
});
test('blocked storage, corrupted preferences and cross-tab updates fail safely',()=>{
 const blocked=prefs.initialize(environment({blocked:true}).env);assert.doesNotThrow(()=>{blocked.setTheme('dark');blocked.setLanguage('zh');});assert.equal(blocked.snapshot().theme,'dark');
 const e=environment({stored:{'frontier.theme':'invalid','frontier.language':'invalid'}}),c=prefs.initialize(e.env);assert.equal(c.snapshot().themePreference,'system');assert.equal(c.snapshot().languagePreference,'auto');
 e.values.set('frontier.theme','dark');e.values.set('frontier.language','zh');e.storage('frontier.theme');assert.equal(c.snapshot().theme,'dark');assert.equal(c.snapshot().language,'zh');
});
test('English UI has no fixed Chinese copy; news uses supplied bilingual fields or original text without translating',()=>{
 const empty=core.createView({...batch,items:[]},definitions,'Latest',batch.asOf);
 const english=renderer.renderDashboard(empty,{language:'en'});assert.ok(!/[\u3400-\u9fff]/.test(english));assert.match(english,/PERSONAL INTELLIGENCE/);assert.match(english,/Top Signals/);assert.match(english,/No stories in this view/);
 const localized={...batch.items[0],titleEn:'English title',summaryEn:'English summary',whyItMattersEn:'English analysis',longTermImpactEn:'English impact',titleZh:'中文标题'};
 assert.equal(i18n.content(localized,'title','en'),'English title');assert.equal(i18n.content(localized,'title','zh'),'中文标题');assert.equal(i18n.content(batch.items[0],'title','en'),batch.items[0].title);
 const html=renderer.renderDashboard(core.createView({...batch,isDemo:false,items:[localized]},definitions,'Latest',batch.asOf),{language:'en'});
 for(const text of ['English title','English summary','English analysis','English impact','Read original','What happened','Why it matters','Long-term impact'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes(localized.title));
 const hostile={...localized,titleEn:'<script>alert(1)</script>'};assert.ok(!renderer.renderDashboard(core.createView({...batch,items:[hostile]},definitions,'Latest',batch.asOf),{language:'en'}).includes('<script>alert'));
});
test('pre-paint bootstrap precedes CSS and body; generated static interaction changes language without losing the current view',()=>{
 const html=fs.readFileSync('dist/index.html','utf8');assert.ok(html.indexOf('id="frontier-preferences"')<html.indexOf('<style>'));assert.ok(html.indexOf('id="frontier-preferences"')<html.indexOf('<body>'));
 const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)],data={};for(const s of scripts)if(s[1].includes('application/json'))data[/id="([^"]+)"/.exec(s[1])[1]]={textContent:s[2]};
 const snapshot=JSON.parse(data['news-snapshot'].textContent);class FixedDate extends Date{constructor(...a){super(...(a.length?a:[snapshot.asOf]));}}
 let click;const root={innerHTML:'',addEventListener(name,fn){if(name==='click')click=fn;},querySelector(){return {focus(){}};}};
 const e=environment({language:'zh-CN'});e.env.document.getElementById=id=>id==='dashboard-root'?root:data[id];
 const context={...e.env,URL,URLSearchParams,Date:FixedDate,module:{exports:{}}};vm.createContext(context);
 for(const s of scripts)if(!s[1].includes('application/json'))vm.runInContext(s[2],context);
 const fire=(attr,value)=>click({target:{closest(selector){return selector.includes('button[')?{getAttribute(name){return name===attr?value:null;}}:null;}}});
 assert.equal(e.env.document.documentElement.lang,'zh-CN');assert.match(root.innerHTML,/AI &amp; 前沿简报/);
 for(const view of require('../src/lib/news/product.cjs').mainViews){fire('data-view',view);fire('data-language','en');assert.match(root.innerHTML,new RegExp('data-view="'+view+'" aria-pressed="true"'));assert.match(root.innerHTML,/PERSONAL FRONTIER INTELLIGENCE|AI &amp; Frontier Briefing/);assert.match(root.innerHTML,/Read original|No stories|Local sample|Frontier Briefing has not been generated/);fire('data-language','zh');assert.match(root.innerHTML,/个人前沿科技情报终端|AI &amp; 前沿简报/);}
 fire('data-theme','dark');assert.equal(e.env.document.documentElement.dataset.theme,'dark');assert.equal(e.values.get('frontier.theme'),'dark');
 fire('data-language','en');assert.equal(e.env.document.documentElement.lang,'en');assert.equal(e.values.get('frontier.language'),'en');assert.equal(e.env.document.documentElement.dataset.frontierPending,undefined);
});

test('both palettes maintain readable text contrast on main, card and signal backgrounds',()=>{
 const css=fs.readFileSync('src/app/globals.css','utf8');
 const rules=[css.match(/:root\{([^}]+)\}/)[1],css.match(/:root\[data-theme=dark\]\{([^}]+)\}/)[1]];
 const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
 for(const rule of rules){const vars=Object.fromEntries([...rule.matchAll(/--([\w-]+):(#[0-9a-f]{6})(?:;|$)/g)].map(m=>[m[1],m[2]]));for(const [text,bg] of [['text','bg'],['body-text','panel'],['muted','panel'],['text','signal-panel'],['selected-text','selected-bg']]){const a=luminance(vars[text]),b=luminance(vars[bg]);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,text+' on '+bg);}}
});
