import { useId, type CSSProperties } from "react";
import { effective, solveHistogram, summarize, time, type Solve } from "../lib/solves";

function Trend({ solves }: { solves: Solve[] }) {
  const gradient = useId();
  const values = solves.toReversed().map(effective);
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return <p className="chart-empty">Completed solves will appear here.</p>;
  const min = valid.reduce((min, value) => Math.min(min, value));
  const range = Math.max(1000, valid.reduce((max, value) => Math.max(max, value)) - min);
  const points = values.map((value, index) => Number.isFinite(value) ? {
    x: values.length === 1 ? 200 : 8 + index * 384 / (values.length - 1),
    y: 8 + (value - min) / range * 80,
  } : null);
  const path = points.map((point, index) => point ? `${points[index - 1] ? "L" : "M"}${point.x},${point.y}` : "").join(" ");
  return <div className="trend">
    <svg viewBox="0 0 400 96" preserveAspectRatio="none" role="img" aria-label="All session solves, oldest to newest. Faster times are higher."
      style={{ "--trend-gradient": `url(#${gradient})` } as CSSProperties}>
      <defs><linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1="8" x2="392" y1="0" y2="0">
        {[0, 1, 2, 3].map(stop => <stop key={stop} offset={stop / 3} stopColor={`var(--chroma-stop-${stop})`} />)}
      </linearGradient></defs>
      {[8, 48, 88].map(y => <line key={y} x1="0" x2="400" y1={y} y2={y} className="trend-grid" />)}
      <path d={path} pathLength={1} className="trend-line" />
      {points.map((point, index) => point && <circle key={index} cx={point.x} cy={point.y} r="3" className="trend-dot"><title>{time(values[index])}</title></circle>)}
    </svg>
  </div>;
}

function Distribution({ solves, median }: { solves: Solve[]; median: number | null }) {
  if (median === null) return <p className="chart-empty">Completed solves will appear here.</p>;
  const histogram = solveHistogram(solves, median);
  if (!histogram) return <p className="chart-empty">Completed solves will appear here.</p>;
  const { bins, first, end, hasLowerTail, hasUpperTail, medianPosition } = histogram;
  const peak = Math.max(...bins);

  return <div className="distribution">
    <p className="median-caption" title="The middle result, or the average of the two middle results for an even count.">Median <strong>{time(median)}</strong></p>
    <div className="histogram-plot">
      <ol className="histogram" aria-label="Distribution of completed solve times"
        style={{ "--histogram-gradient-size": `${bins.length * 100}%` } as CSSProperties}>
        {bins.map((total, index) => {
          const lower = first + index - Number(hasLowerTail);
          const range = hasLowerTail && index === 0 ? `Under ${first} s` :
            hasUpperTail && index === bins.length - 1 ? `${end} s and over` : `${lower} to under ${lower + 1} s`;
          const label = `${range}, ${total} ${total === 1 ? "solve" : "solves"}`;
          return <li key={index} title={label} aria-label={label} style={{ "--bar-height": `${total / peak * 100}%` } as CSSProperties}>
            <small className="histogram-count" aria-hidden="true">{total}</small>
            <span style={{
              "--histogram-gradient-position": `${index / Math.max(1, bins.length - 1) * 100}%`,
            } as CSSProperties} />
          </li>;
        })}
      </ol>
      <span className="median-marker" style={{ left: `${medianPosition}%` }} aria-hidden="true" />
    </div>
    <div className="chart-axis" aria-hidden="true">
      {bins.map((_, index) => <span key={index}>
        {hasLowerTail && index === 0 ? `<${first}` : `${first + index - Number(hasLowerTail)}+`}
      </span>)}
    </div>
  </div>;
}

function Metrics({ items }: { items: ReadonlyArray<readonly [string, string | number]> }) {
  return <dl className="stats-metrics">{items.map(([label, value]) => (
    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
  ))}</dl>;
}

export function SessionStats({ solves, stats }: { solves: Solve[]; stats: ReturnType<typeof summarize> }) {
  return <div className="stats-content">
    <section className="stats-section"><h3>Current</h3>
      <Metrics items={[["Ao5", time(stats.ao5)], ["Ao12", time(stats.ao12)], ["Mean", time(stats.mean)]]} />
      <Metrics items={[["Solves", solves.length], ["DNF", solves.filter(solve => solve.penalty === "DNF").length], ["+2", solves.filter(solve => solve.penalty === "+2").length]]} />
    </section>
    <section className="stats-section"><h3>Personal bests</h3>
      <Metrics items={[["Single", time(stats.best)], ["Ao5", time(stats.bestAo5?.value ?? null)], ["Ao12", time(stats.bestAo12)]]} />
      {stats.bestAo5 && <div className="best-breakdown">
        <h4>Best Ao5 solves</h4>
        <ol>{stats.bestAo5.entries.toReversed().map(({ value, excluded }, index) => (
          <li key={index} data-excluded={excluded}>
            {excluded ? <><span className="sr-only">Excluded </span>{time(value)}</> : time(value)}
          </li>
        ))}</ol>
      </div>}
    </section>
    <section className="stats-section">
      <h3>Time trend</h3>
      <Trend solves={solves} />
    </section>
    <section className="stats-section">
      <h3>Time distribution</h3>
      <Distribution solves={solves} median={stats.median} />
    </section>
  </div>;
}
