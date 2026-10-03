import type { Category, Entry } from '@/data/frontier';
function Card({ entry }: { entry: Entry }) {
  return <article className="card"><div className="card-meta"><span className="tag">{entry.tag}</span><time dateTime={entry.date}>{entry.date.replaceAll('-', '.')}</time><span>本地示例</span></div><h3>{entry.title}</h3><p className="summary">{entry.summary}</p><div className="importance"><span className="importance-label">为什么重要 <span> / IMPLICATION</span></span><p>{entry.importance}</p></div></article>;
}
export function CategorySection({ category, index }: { category: Category; index: number }) {
  return <section id={category.id} className={`category category-${category.id}`} aria-labelledby={`${category.id}-title`}><header className="section-heading"><span className="section-index">0{index+1}</span><div><h2 id={`${category.id}-title`}>{category.title}</h2><p>{category.subtitle}</p></div><span className="section-count">精选 02 / 共 03</span></header><div className="cards">{category.entries.slice(0,2).map(entry=><Card key={entry.title} entry={entry}/>)}</div><details className="more-entries"><summary><span className="show-more">查看全部 <span>3 条</span></span><span className="show-less">收起内容</span></summary><div className="cards">{category.entries.slice(2).map(entry=><Card key={entry.title} entry={entry}/>)}</div></details></section>;
}
