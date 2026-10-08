const test=require('node:test'),assert=require('node:assert/strict');
const {choosePreference}=require('../scripts/live-preferences.cjs');
function fixture({opens=true,missing=false,wrongTag=false}={}){
 let selected='system',rootClicked=false,summaryClicks=0;
 const html={tagName:'HTML',click(){rootClicked=true;}};
 const menu={open:false,querySelector(selector){
  if(selector==='summary')return {click(){summaryClicks++;menu.open=opens;}};
  if(missing)return null;
  const match=/^button\[data-(theme|language)="([^"]+)"\]$/.exec(selector);
  return match?{tagName:wrongTag?'HTML':'BUTTON',click(){selected=match[2];}}:html;
 }};
 const doc={querySelector(selector){return selector.startsWith('[data-preference=')?menu:html;}};
 return {doc,menu,state:()=>({selected,rootClicked,summaryClicks})};
}
test('live verification clicks the Light button even when html already has data-theme=light',()=>{
 const f=fixture();assert.deepEqual(choosePreference(f.doc,'theme','light'),{kind:'theme',value:'light',target:'BUTTON',menuOpened:true});
 assert.deepEqual(f.state(),{selected:'light',rootClicked:false,summaryClicks:1});
});
test('native language/theme menus open and repeated choices stay scoped to buttons',()=>{
 const f=fixture();for(const theme of ['light','dark','system']){f.menu.open=false;choosePreference(f.doc,'theme',theme);assert.equal(f.state().selected,theme);}
 for(const language of ['en','zh','auto']){f.menu.open=false;choosePreference(f.doc,'language',language);assert.equal(f.state().selected,language);}
 assert.equal(f.state().summaryClicks,6);assert.equal(f.state().rootClicked,false);
});
test('a broken menu or missing button fails verification instead of silently bypassing native interaction',()=>{
 assert.throws(()=>choosePreference(fixture({opens:false}).doc,'theme','light'),/menu did not open/);
 assert.throws(()=>choosePreference(fixture({missing:true}).doc,'theme','light'),/Missing native theme button/);
 assert.throws(()=>choosePreference(fixture({wrongTag:true}).doc,'theme','light'),/Missing native theme button/);
 assert.throws(()=>choosePreference(fixture().doc,'theme','unknown'),/Invalid verification preference/);
});
