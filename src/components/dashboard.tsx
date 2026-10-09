'use client';
import { useEffect, useState, useRef } from 'react';
import { createModel, readLocation, writeLocation, mainViews } from '@/lib/news/product.cjs';
import { attach, type ReadingControls } from '@/lib/news/reading-controls.cjs';
import { renderDashboard } from '@/lib/news/render.cjs';
import { initialize, type Preferences, type PreferenceController } from '@/lib/news/preferences.cjs';
import type { BriefingArchive } from '@/lib/briefing/core.cjs';
import type { CategoryDefinition, NewsBatch, View } from '@/lib/news/types';
export function Dashboard({batch,definitions,briefing,asOf}: {batch: NewsBatch;definitions: CategoryDefinition[];briefing: BriefingArchive;asOf:string}){
 const [view,setView]=useState<View>('Daily Briefing'),[referenceTime,setReferenceTime]=useState(asOf);
 const [preferences,setPreferences]=useState<Preferences>({themePreference:'system',languagePreference:'auto',theme:'light',language:'zh'});
 const [editionDate,setEditionDate]=useState<string|undefined>();
 const reading=useRef<ReadingControls|null>(null);
 const controller=useRef<PreferenceController|null>(null),root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const env=window as typeof window & {FrontierPreferences?: {controller: PreferenceController}};
  const current=env.FrontierPreferences?.controller||initialize(window);controller.current=current;
  const unsubscribe=current.subscribe(state=>{setPreferences(state);setReferenceTime(new Date().toISOString());});
  // Apply the pre-paint snapshot outside the effect's synchronous body.
  queueMicrotask(()=>{current.apply();current.ready();});
  const element=root.current;
  if(element)reading.current=attach(element,window);
  const restore=()=>{if(window.location.hash&&!window.location.hash.startsWith('#view='))return;const state=readLocation(window.location);setView(state.view);setEditionDate(state.editionDate);reading.current?.reveal();};
  queueMicrotask(restore);window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);
  const closeOther=(event: Event)=>{const target=event.target;if(target instanceof HTMLDetailsElement&&target.open&&target.matches('.preference-menu'))element?.querySelectorAll<HTMLDetailsElement>('.preference-menu[open]').forEach(menu=>{if(menu!==target)menu.open=false;});};
  element?.addEventListener('toggle',closeOther,true);
  return ()=>{unsubscribe();reading.current?.dispose();element?.removeEventListener('toggle',closeOther,true);window.removeEventListener('popstate',restore);window.removeEventListener('hashchange',restore);};
 },[]);
 useEffect(()=>{reading.current?.refresh();},[view,preferences,referenceTime,editionDate]);
 const model=createModel(batch,definitions,view,referenceTime,briefing);
 const navigate=(nextView:View,date?:string)=>{setReferenceTime(new Date().toISOString());setView(nextView);setEditionDate(date);reading.current?.reveal();writeLocation(window,nextView,date);};
 return <div id="dashboard-root" ref={root} onClick={event=>{
  const target=event.target;if(!(target instanceof Element))return;
  const dateLink=target.closest<HTMLElement>('[data-edition-date]');
  if(dateLink){event.preventDefault();navigate('Daily Briefing',dateLink.dataset.editionDate);return;}
  if(target.closest('a[href^="#"]'))reading.current?.reveal();
  const button=target.closest<HTMLButtonElement>('button[data-view],button[data-theme],button[data-language]');if(!button)return;
  const value=button.dataset.view;
  if(value&&mainViews.includes(value as View)){navigate(value as View,editionDate);}
  else if(button.dataset.theme)controller.current?.setTheme(button.dataset.theme);
  else if(button.dataset.language)controller.current?.setLanguage(button.dataset.language);
 }} dangerouslySetInnerHTML={{__html:renderDashboard(model,{...preferences,briefing,editionDate})}}/>;
}
