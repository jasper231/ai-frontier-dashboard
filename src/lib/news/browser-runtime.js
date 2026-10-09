/* Offline product navigation, archive dates and preferences. No server or React. */
(function(){
 'use strict';
 function start(){
  const root=document.getElementById('dashboard-root');if(!root)return;
  const batch=JSON.parse(document.getElementById('news-snapshot').textContent),definitions=JSON.parse(document.getElementById('category-definitions').textContent),briefing=JSON.parse(document.getElementById('briefing-snapshot').textContent);
  const product=globalThis.FrontierProduct,preferences=globalThis.FrontierPreferences.controller;
  let {view:selectedView,editionDate}=product.readLocation(globalThis.location);
  const reading=globalThis.FrontierReadingControls.attach(root,globalThis);
  function render(){root.innerHTML=globalThis.FrontierRender.renderDashboard(product.createModel(batch,definitions,selectedView,new Date().toISOString(),briefing),{...preferences.snapshot(),briefing,editionDate});preferences.ready();reading.refresh();}
  function navigate(view,date){selectedView=view;editionDate=date;reading.reveal();product.writeLocation(globalThis,view,date);render();root.querySelector('.view-filters [aria-pressed="true"]')?.focus({preventScroll:true});}
  preferences.subscribe(render);
  root.addEventListener('click',function(event){
   const target=event.target&&event.target.nodeType===3?event.target.parentElement:event.target;if(!target?.closest)return;
   const edition=target.closest('[data-edition-date]');if(edition){event.preventDefault();navigate('Daily Briefing',edition.getAttribute('data-edition-date'));return;}
   const button=target.closest('button[data-view],button[data-theme],button[data-language]');if(!button){if(target.closest('a[href^="#"]'))reading.reveal();return;}
   const view=button.getAttribute('data-view');if(product.mainViews.includes(view)){navigate(view,editionDate);return;}
   const theme=button.getAttribute('data-theme'),language=button.getAttribute('data-language');
   if(theme){preferences.setTheme(theme);root.querySelector('[data-preference="theme"] summary')?.focus({preventScroll:true});}
   else if(language){preferences.setLanguage(language);root.querySelector('[data-preference="language"] summary')?.focus({preventScroll:true});}
  });
  root.addEventListener('toggle',function(event){if(event.target.matches?.('.preference-menu[open]'))root.querySelectorAll('.preference-menu[open]').forEach(menu=>{if(menu!==event.target)menu.open=false;});},true);
  const restore=()=>{if(globalThis.location.hash&&!globalThis.location.hash.startsWith('#view='))return;const state=product.readLocation(globalThis.location);selectedView=state.view;editionDate=state.editionDate;reading.reveal();render();};
  globalThis.addEventListener?.('popstate',restore);globalThis.addEventListener?.('hashchange',restore);render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
