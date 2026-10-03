import signals from '@/data/top-signals.json';
export function TopSignals() {
  return <section className="top-signals" aria-labelledby="top-signals-title"><header className="signals-heading"><div><h2 id="top-signals-title">Top Signals</h2><p>今天最值得关注的 3 件事 · 示例精选</p></div><span className="signals-edition">03 / PRIORITY</span></header><div className="signals-grid">{signals.map(signal=><article className="signal" key={signal.title}><div className="signal-title"><h3>{signal.title}</h3><span className="signal-domain">{signal.domain}</span></div><dl><div><dt>What happened</dt><dd>{signal.happened}</dd></div><div><dt>Why it matters</dt><dd>{signal.matters}</dd></div><div className="signal-impact"><dt>Long-term impact</dt><dd>{signal.impact}</dd></div></dl></article>)}</div></section>;
}
