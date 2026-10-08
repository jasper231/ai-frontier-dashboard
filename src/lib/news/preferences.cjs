/* Shared pre-paint initialization and preference lifecycle for Next.js and offline Pages. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./i18n.cjs'));
 else {if(root.document?.documentElement)root.document.documentElement.dataset.frontierPending='';root.FrontierPreferences=factory(root.FrontierI18n);root.FrontierPreferences.controller=root.FrontierPreferences.initialize(root);}
})(typeof globalThis!=='undefined'?globalThis:this,function(i18n){
 'use strict';
 const keys={theme:'frontier.theme',language:'frontier.language'};
 function initialize(env){
  const doc=env.document,listeners=new Set();
  const read=key=>{try{return env.localStorage?.getItem(key);}catch{return null;}};
  const write=(key,value)=>{try{env.localStorage?.setItem(key,value);}catch{/* Privacy/offline storage restrictions must not break the UI. */}};
  const validTheme=value=>['system','light','dark'].includes(value)?value:'system';
  const validLanguage=value=>['auto','zh','en'].includes(value)?value:'auto';
  let themePreference=validTheme(read(keys.theme)),languagePreference=validLanguage(read(keys.language));
  const media=env.matchMedia?.('(prefers-color-scheme: dark)');
  function snapshot(){return {themePreference,languagePreference,theme:themePreference==='system'?(media?.matches?'dark':'light'):themePreference,language:i18n.resolveLanguage(languagePreference,env.navigator)};}
  function apply(){
   const state=snapshot(),html=doc?.documentElement,copy=i18n.dictionary(state.language);
   if(html){html.dataset.theme=state.theme;html.dataset.themePreference=state.themePreference;html.dataset.languagePreference=state.languagePreference;html.lang=state.language==='zh'?'zh-CN':'en';}
   if(doc){doc.title=copy.pageTitle;const meta=doc.querySelector?.('meta[name="description"]');if(meta)meta.setAttribute('content',copy.description);}
   for(const listener of listeners)listener(state);return state;
  }
  function systemChanged(){if(themePreference==='system')apply();}
  function languageChanged(){if(languagePreference==='auto')apply();}
  function storageChanged(event){if(event.key===null||event.key===keys.theme||event.key===keys.language){themePreference=validTheme(read(keys.theme));languagePreference=validLanguage(read(keys.language));apply();}}
  if(media?.addEventListener)media.addEventListener('change',systemChanged);else media?.addListener?.(systemChanged);
  env.addEventListener?.('languagechange',languageChanged);env.addEventListener?.('storage',storageChanged);
  apply();
  return {snapshot,apply,setTheme(value){themePreference=validTheme(value);write(keys.theme,themePreference);return apply();},setLanguage(value){languagePreference=validLanguage(value);write(keys.language,languagePreference);return apply();},subscribe(listener){listeners.add(listener);return ()=>{listeners.delete(listener);};},ready(){if(doc?.documentElement)delete doc.documentElement.dataset.frontierPending;},dispose(){media?.removeEventListener?.('change',systemChanged);media?.removeListener?.(systemChanged);env.removeEventListener?.('languagechange',languageChanged);env.removeEventListener?.('storage',storageChanged);listeners.clear();}};
 }
 return {keys,initialize};
});
