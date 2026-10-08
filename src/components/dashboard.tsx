'use client';
import { useEffect, useState, useRef } from 'react';
import { createView } from '@/lib/news/core.cjs';
import { renderDashboard } from '@/lib/news/render.cjs';
import { initialize, type Preferences, type PreferenceController } from '@/lib/news/preferences.cjs';
import type { BriefingArchive } from '@/lib/briefing/core.cjs';
import type { CategoryDefinition, NewsBatch, View } from '@/lib/news/types';
export function Dashboard({batch,definitions,briefing}: {batch: NewsBatch;definitions: CategoryDefinition[];briefing: BriefingArchive}){
 const [view,setView]=useState<View>('Latest'),[referenceTime,setReferenceTime]=useState(batch.asOf);
 const [preferences,setPreferences]=useState<Preferences>({themePreference:'system',languagePreference:'auto',theme:'light',language:'zh'});
 const controller=useRef<PreferenceController|null>(null),root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const env=window as typeof window & {FrontierPreferences?: {controller: PreferenceController}};
  const current=env.FrontierPreferences?.controller||initialize(window);controller.current=current;
  const unsubscribe=current.subscribe(state=>{setPreferences(state);setReferenceTime(new Date().toISOString());});
  // Apply the pre-paint snapshot outside the effect's synchronous body.
  queueMicrotask(()=>{current.apply();current.ready();});
  const element=root.current;
  const closeOther=(event: Event)=>{const target=event.target;if(target instanceof HTMLDetailsElement&&target.open&&target.matches('.preference-menu'))element?.querySelectorAll<HTMLDetailsElement>('.preference-menu[open]').forEach(menu=>{if(menu!==target)menu.open=false;});};
  element?.addEventListener('toggle',closeOther,true);
  return ()=>{unsubscribe();element?.removeEventListener('toggle',closeOther,true);};
 },[]);
 const model=createView(batch,definitions,view,referenceTime);
 return <div id="dashboard-root" ref={root} onClick={event=>{
  const target=event.target;if(!(target instanceof Element))return;
  const button=target.closest<HTMLButtonElement>('button[data-view],button[data-theme],button[data-language]');if(!button)return;
  const value=button.dataset.view;
  if(value==='Today'||value==='Latest'||value==='Long-term'||value==='Daily Briefing'){setReferenceTime(new Date().toISOString());setView(value);}
  else if(button.dataset.theme)controller.current?.setTheme(button.dataset.theme);
  else if(button.dataset.language)controller.current?.setLanguage(button.dataset.language);
 }} dangerouslySetInnerHTML={{__html:renderDashboard(model,{...preferences,briefing})}}/>;
}
