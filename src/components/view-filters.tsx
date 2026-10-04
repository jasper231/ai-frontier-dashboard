'use client';
import { useState } from 'react';
export function ViewFilters() {
  const [selected, setSelected] = useState('Latest');
  return <div className="view-filters" role="group" aria-label="浏览视角（仅切换选中状态）">{['Today','Latest','Long-term','Daily Briefing'].map(label=><button type="button" key={label} aria-pressed={selected===label} onClick={()=>setSelected(label)}>{label}</button>)}</div>;
}
