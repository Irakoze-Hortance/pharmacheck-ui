import {DayBucket,ChartFilter} from '@/lib/types/types';

export function ScanTrendChart({
  buckets,
  chartFilter,
}: {
  buckets: DayBucket[];
  chartFilter: ChartFilter;
}) {
  const W = 560;
  const H = 190;
  const PAD = { top: 12, right: 8, bottom: 44, left: 34 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Which value to use for height based on filter
  const getValue = (b: DayBucket) => {
    if (chartFilter === 'authentic') return b.authentic;
    if (chartFilter === 'counterfeit') return b.counterfeit;
    return b.total;
  };

  const maxVal = Math.max(...buckets.map(getValue), 1);
  const ticks = [0, Math.ceil(maxVal / 2), maxVal];
  const barW = chartW / buckets.length;
  const innerBar = Math.max(barW * 0.55, 5);
  const gap = (barW - innerBar) / 2;

  const AUTH_COLOR = '#22C55E';
  const CF_COLOR   = '#EF4444';
  const BOTH_COLOR = 'var(--navy)';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-label="Daily scan trend"
    >
      {/* Gridlines + Y labels */}
      {ticks.map(t => {
        const y = PAD.top + chartH - (t / maxVal) * chartH;
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
              stroke="#E8EFF7" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#94A3B8">{t}</text>
          </g>
        );
      })}

      {/* Bars */}
      {buckets.map((b, i) => {
        const x = PAD.left + i * barW + gap;

        if (chartFilter === 'authentic') {
          const bh = (b.authentic / maxVal) * chartH;
          return (
            <g key={b.key}>
              {b.authentic > 0
                ? <rect x={x} y={PAD.top + chartH - bh} width={innerBar} height={bh} rx={2} fill={AUTH_COLOR} opacity={0.85} />
                : <rect x={x} y={PAD.top + chartH - 3} width={innerBar} height={3} rx={1} fill="#E8EFF7" />}
              {i % 2 === 0 && (
                <text x={x + innerBar / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="#94A3B8">{b.label}</text>
              )}
            </g>
          );
        }

        if (chartFilter === 'counterfeit') {
          const bh = (b.counterfeit / maxVal) * chartH;
          return (
            <g key={b.key}>
              {b.counterfeit > 0
                ? <rect x={x} y={PAD.top + chartH - bh} width={innerBar} height={bh} rx={2} fill={CF_COLOR} opacity={0.85} />
                : <rect x={x} y={PAD.top + chartH - 3} width={innerBar} height={3} rx={1} fill="#E8EFF7" />}
              {i % 2 === 0 && (
                <text x={x + innerBar / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="#94A3B8">{b.label}</text>
              )}
            </g>
          );
        }

        // all — stacked
        const authH = (b.authentic / maxVal) * chartH;
        const cfH   = (b.counterfeit / maxVal) * chartH;
        return (
          <g key={b.key}>
            {b.authentic > 0 && (
              <rect x={x} y={PAD.top + chartH - authH - cfH}
                width={innerBar} height={authH} rx={2} fill={AUTH_COLOR} opacity={0.85} />
            )}
            {b.counterfeit > 0 && (
              <rect x={x} y={PAD.top + chartH - cfH}
                width={innerBar} height={cfH} rx={2} fill={CF_COLOR} opacity={0.85} />
            )}
            {b.total === 0 && (
              <rect x={x} y={PAD.top + chartH - 3} width={innerBar} height={3} rx={1} fill="#E8EFF7" />
            )}
            {i % 2 === 0 && (
              <text x={x + innerBar / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="#94A3B8">{b.label}</text>
            )}
          </g>
        );
      })}

      {/* Baseline */}
      <line x1={PAD.left} y1={PAD.top + chartH} x2={PAD.left + chartW} y2={PAD.top + chartH}
        stroke="#CBD5E1" strokeWidth={1} />
    </svg>
  );
}