/* Shared mobile scroll direction behavior, independent of React and data. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FrontierReadingControls=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function attach(root,env){
  let previous=env.scrollY||0,accumulated=0,hidden=false;
  const mobile=env.matchMedia?.('(max-width: 767px)')||{matches:false};
  const menuOpen=()=>!!root.querySelector('.preference-menu[open],.brief-archive[open]');
  function refresh(){const toolbar=root.querySelector('.brief-toolbar');if(toolbar?.dataset)toolbar.dataset.readerHidden=String(hidden&&mobile.matches&&!menuOpen()&&(env.scrollY||0)>120);}
  function probe(event){env.__frontierReadingProbe?.({event,y:env.scrollY,previous,hidden,mobile:mobile.matches,menu:menuOpen()});}
  function reveal(){probe('reveal');hidden=false;accumulated=0;refresh();}
  function scroll(){const y=Math.max(0,env.scrollY||0),delta=y-previous;previous=y;probe('scroll');
   if(!mobile.matches||y<=120||menuOpen()){reveal();return;}
   accumulated=Math.sign(delta)===Math.sign(accumulated)?accumulated+delta:delta;
   if(Math.abs(accumulated)>=8){hidden=accumulated>0;accumulated=0;refresh();}
  }
  const focus=event=>{if(event.target.closest?.('.brief-toolbar'))reveal();};
  const toggle=()=>{if(menuOpen())reveal();};
  env.addEventListener?.('scroll',scroll,{passive:true});root.addEventListener('focusin',focus);root.addEventListener('toggle',toggle,true);mobile.addEventListener?.('change',reveal);
  refresh();return {refresh,reveal,dispose(){env.removeEventListener?.('scroll',scroll);root.removeEventListener('focusin',focus);root.removeEventListener('toggle',toggle,true);mobile.removeEventListener?.('change',reveal);}};
 }
 return {attach};
});
