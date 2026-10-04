'use client';
import { useState } from 'react';
import { createView } from '@/lib/news/core.cjs';
import { renderDashboard } from '@/lib/news/render.cjs';
import type { CategoryDefinition, NewsBatch, View } from '@/lib/news/types';
export function Dashboard({ batch, definitions }: { batch: NewsBatch; definitions: CategoryDefinition[] }) {
  const [view,setView]=useState<View>('Latest');
  const [referenceTime,setReferenceTime]=useState(batch.asOf);
  const model=createView(batch,definitions,view,referenceTime);
  return <div onClick={event=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    const button=target.closest<HTMLButtonElement>('button[data-view]');
    const value=button?.dataset.view;
    if(value==='Today'||value==='Latest'||value==='Long-term'||value==='Daily Briefing'){setReferenceTime(new Date().toISOString());setView(value);}
  }} dangerouslySetInnerHTML={{__html:renderDashboard(model)}}/>;
}
