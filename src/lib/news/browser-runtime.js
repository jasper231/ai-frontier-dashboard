/* Browser-only entry point. Embedded into the self-contained static artifact. */
(function(){
 'use strict';
 function start(){
  const root=document.getElementById('dashboard-root');if(!root)return;
  const batch=JSON.parse(document.getElementById('news-snapshot').textContent),definitions=JSON.parse(document.getElementById('category-definitions').textContent);
  const preferences=globalThis.FrontierPreferences.controller;let selectedView='Latest';
  function render(){root.innerHTML=globalThis.FrontierRender.renderDashboard(globalThis.FrontierData.createView(batch,definitions,selectedView,new Date().toISOString()),preferences.snapshot());preferences.ready();}
  preferences.subscribe(render);
  root.addEventListener('click',function(event){
   const target=event.target&&event.target.nodeType===3?event.target.parentElement:event.target;
   const button=target&&typeof target.closest==='function'?target.closest('[data-view],[data-theme],[data-language]'):null;if(!button)return;
   const view=button.getAttribute('data-view');
   if(globalThis.FrontierData.views.includes(view)){selectedView=view;render();root.querySelector('[data-view="'+view+'"]')?.focus({preventScroll:true});return;}
   const theme=button.getAttribute('data-theme'),language=button.getAttribute('data-language');
   if(theme){preferences.setTheme(theme);root.querySelector('[data-preference="theme"] summary')?.focus({preventScroll:true});}
   else if(language){preferences.setLanguage(language);root.querySelector('[data-preference="language"] summary')?.focus({preventScroll:true});}
  });
  // Close the other compact menu when one opens; no overlay or animation.
  root.addEventListener('toggle',function(event){if(event.target.matches?.('.preference-menu[open]'))root.querySelectorAll('.preference-menu[open]').forEach(menu=>{if(menu!==event.target)menu.open=false;});},true);
  render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
