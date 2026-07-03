'use client';

import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  CheckCircle, AlertCircle, BarChart2, Clock, Zap,
  Download, RefreshCw, TrendingUp, Shield, FileJson, FileText, Calendar
} from 'lucide-react';

const BACKEND = 'https://capstone-ml-lqpp.onrender.com';

interface Stats {
  total_scans: number;
  authentic_count: number;
  counterfeit_count: number;
  authentic_rate_pct: number;
  counterfeit_rate_pct: number;
  avg_confidence: number;
  avg_inference_ms: number;
  avg_similarity_score: number;
  model_version: string;
  [key: string]: unknown;
}

interface HistoryItem {
  observation_id: string;
  timestamp: string;
  verdict: 'authentic' | 'counterfeit';
  confidence: number;
  inference_ms: number;
  similarity_score: number;
  model_version: string;
}

interface DayBucket {
  label: string;       // e.g. "Jun 24"
  authentic: number;
  counterfeit: number;
  total: number;
}

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

/** Group history items into daily buckets, last N days */
function buildDailyBuckets(history: HistoryItem[], days = 14): DayBucket[] {
  const map: Record<string, DayBucket> = {};
  const now = Date.now();

  // Initialise all days in the window so we show empty days too
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    map[key] = { label, authentic: 0, counterfeit: 0, total: 0 };
  }

  for (const item of history) {
    const key = item.timestamp?.slice(0, 10);
    if (key && map[key]) {
      map[key][item.verdict]++;
      map[key].total++;
    }
  }

  return Object.values(map);
}

/** Tiny inline SVG bar chart */
function ScanTrendChart({ buckets }: { buckets: DayBucket[] }) {
  const W = 560;
  const H = 180;
  const PAD = { top: 12, right: 8, bottom: 40, left: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...buckets.map(b => b.total), 1);
  const barW = chartW / buckets.length;
  const innerBar = Math.max(barW * 0.55, 4);
  const gap = (barW - innerBar) / 2;

  // Y-axis tick count
  const ticks = [0, Math.ceil(maxVal / 2), maxVal];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-label="Daily scan trend chart"
    >
      {/* Y-axis gridlines + labels */}
      {ticks.map(t => {
        const y = PAD.top + chartH - (t / maxVal) * chartH;
        return (
          <g key={t}>
            <line
              x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
              stroke="#E8EFF7" strokeWidth={1}
            />
            <text
              x={PAD.left - 6} y={y + 4}
              textAnchor="end"
              fontSize={10}
              fill="#94A3B8"
            >
              {t}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {buckets.map((b, i) => {
        const x = PAD.left + i * barW + gap;
        const authH = (b.authentic / maxVal) * chartH;
        const cfH = (b.counterfeit / maxVal) * chartH;

        return (
          <g key={b.label}>
            {/* Authentic (bottom segment, green) */}
            {b.authentic > 0 && (
              <rect
                x={x}
                y={PAD.top + chartH - authH - cfH}
                width={innerBar}
                height={authH}
                rx={2}
                fill="#22C55E"
                opacity={0.85}
              />
            )}
            {/* Counterfeit (top segment, red) */}
            {b.counterfeit > 0 && (
              <rect
                x={x}
                y={PAD.top + chartH - cfH}
                width={innerBar}
                height={cfH}
                rx={2}
                fill="#EF4444"
                opacity={0.85}
              />
            )}
            {/* Empty day placeholder */}
            {b.total === 0 && (
              <rect
                x={x}
                y={PAD.top + chartH - 3}
                width={innerBar}
                height={3}
                rx={1}
                fill="#E8EFF7"
              />
            )}
            {/* X-axis label — show every other label to avoid crowding */}
            {i % 2 === 0 && (
              <text
                x={x + innerBar / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize={9}
                fill="#94A3B8"
              >
                {b.label}
              </text>
            )}
          </g>
        );
      })}

      {/* X-axis baseline */}
      <line
        x1={PAD.left} y1={PAD.top + chartH}
        x2={PAD.left + chartW} y2={PAD.top + chartH}
        stroke="#CBD5E1" strokeWidth={1}
      />
    </svg>
  );
}

export default function StatsPage() {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState<'all' | 'authentic' | 'counterfeit'>('all');

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, historyRes] = await Promise.all([
        fetch(`${BACKEND}/stats`),
        fetch(`${BACKEND}/history`),
      ]);

      if (!statsRes.ok) throw new Error(`/stats returned ${statsRes.status}`);
      if (!historyRes.ok) throw new Error(`/history returned ${historyRes.status}`);

      const statsData = await statsRes.json();
      const historyData = await historyRes.json();

      setStats(statsData);
      const items = Array.isArray(historyData)
        ? historyData
        : historyData.data ?? historyData.history ?? [];
      setHistory(items);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = history.filter(h =>
    filter === 'all' ? true : h.verdict === filter
  );

  const dailyBuckets = buildDailyBuckets(history, 14);

  // Peak day
  const peakDay = dailyBuckets.reduce(
    (best, b) => (b.total > best.total ? b : best),
    dailyBuckets[0] ?? { label: '—', total: 0, authentic: 0, counterfeit: 0 }
  );

  // Scans in last 7 days
  const last7 = dailyBuckets.slice(-7).reduce((s, b) => s + b.total, 0);

  const handleExport = (format: 'csv' | 'json') => {
    window.open(`${BACKEND}/export/${format}`, '_blank');
  };

  const normRate = (val: number) => val > 1 ? val : val * 100;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--cream)' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <div>
            <p className="text-xs tracking-widest font-semibold mb-2"
              style={{ color: 'var(--terracotta)', letterSpacing: '0.15em' }}>
              ANALYTICS DASHBOARD
            </p>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800,
              fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: 'var(--navy)', margin: 0 }}>
              Verification Statistics
            </h1>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#fff', border: '1px solid #E8EFF7', color: 'var(--navy)' }}
            >
              <FileText size={15} /> Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#fff', border: '1px solid #E8EFF7', color: 'var(--navy)' }}
            >
              <FileJson size={15} /> Export JSON
            </button>
            <button
              onClick={fetchAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--navy)', color: '#fff' }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl px-5 py-4 mb-8 text-sm"
            style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl p-6 animate-pulse"
                style={{ backgroundColor: '#fff', height: '100px', border: '1px solid #E8EFF7' }} />
            ))}
          </div>
        )}

        {/* Stat cards */}
        {stats && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            {[
              {
                label: 'Total Scans',
                value: stats.total_scans,
                icon: BarChart2,
                colour: 'var(--terracotta)',
                bg: 'rgba(192,98,42,0.08)',
              },
              {
                label: 'Authentic',
                value: stats.authentic_count,
                sub: `${normRate(stats.authentic_rate_pct).toFixed(1)}%`,
                icon: CheckCircle,
                colour: '#22C55E',
                bg: 'rgba(34,197,94,0.08)',
              },
              {
                label: 'Counterfeit',
                value: stats.counterfeit_count,
                sub: `${normRate(stats.counterfeit_rate_pct).toFixed(1)}%`,
                icon: AlertCircle,
                colour: '#EF4444',
                bg: 'rgba(239,68,68,0.08)',
              },
              {
                label: 'Avg Confidence',
                value: `${(stats.avg_confidence * 100).toFixed(1)}%`,
                icon: TrendingUp,
                colour: '#6366F1',
                bg: 'rgba(99,102,241,0.08)',
              },
              {
                label: 'Avg Inference',
                value: `${stats.avg_inference_ms?.toFixed(0) ?? '—'}ms`,
                icon: Zap,
                colour: '#F59E0B',
                bg: 'rgba(245,158,11,0.08)',
              },
              {
                label: 'Avg Similarity',
                value: `${(stats.avg_similarity_score * 100).toFixed(1)}%`,
                icon: Shield,
                colour: '#0EA5E9',
                bg: 'rgba(14,165,233,0.08)',
              },
              {
                label: 'Model',
                value: stats.model_version ?? 'pharmacheck_mobilenetv3',
                icon: Shield,
                colour: 'var(--navy)',
                bg: 'rgba(15,31,53,0.06)',
                small: true,
              },
              {
                label: 'Export',
                value: 'CSV / JSON',
                icon: Download,
                colour: 'var(--terracotta)',
                bg: 'rgba(192,98,42,0.06)',
                action: () => handleExport('csv'),
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-2xl p-5 flex flex-col gap-3 transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: '#fff', border: '1px solid #E8EFF7',
                    boxShadow: '0 1px 8px rgba(15,31,53,0.05)', cursor: card.action ? 'pointer' : 'default' }}
                  onClick={card.action}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: card.bg }}>
                    <Icon size={18} style={{ color: card.colour }} />
                  </div>
                  <div>
                    <p className="m-0 font-bold"
                      style={{ fontFamily: 'Sora, sans-serif',
                        fontSize: card.small ? '0.85rem' : '1.5rem',
                        color: card.colour, lineHeight: 1.2 }}>
                      {String(card.value)}
                    </p>
                    {card.sub && (
                      <p className="m-0 text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{card.sub} of total</p>
                    )}
                    <p className="m-0 text-xs mt-1" style={{ color: 'var(--muted)' }}>{card.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Trend chart + Verdict breakdown split */}
        <div className="grid md:grid-cols-2 gap-8 mb-10">

          {/* Scans Over Time */}
          <div className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: '#fff', border: '1px solid #E8EFF7', boxShadow: '0 1px 8px rgba(15,31,53,0.05)' }}>
            <div className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid #E8EFF7' }}>
              <div className="flex items-center gap-2">
                <Calendar size={15} style={{ color: 'var(--navy)' }} />
                <p className="m-0 font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--navy)' }}>
                  Scans Over Time
                </p>
              </div>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>last 14 days</span>
            </div>

            <div className="px-6 pt-5 pb-2">
              {loading ? (
                <div className="animate-pulse rounded-xl" style={{ height: '180px', backgroundColor: 'var(--cream)' }} />
              ) : (
                <ScanTrendChart buckets={dailyBuckets} />
              )}
            </div>

            {/* Legend + quick stats */}
            <div className="px-6 pb-5">
              <div className="flex gap-5 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#22C55E' }} />
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>Authentic</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#EF4444' }} />
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>Counterfeit</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--cream)' }}>
                  <p className="m-0 font-bold text-lg"
                    style={{ fontFamily: 'Sora, sans-serif', color: 'var(--navy)' }}>
                    {last7}
                  </p>
                  <p className="m-0 text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Scans last 7 days</p>
                </div>
                <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--cream)' }}>
                  <p className="m-0 font-bold text-lg"
                    style={{ fontFamily: 'Sora, sans-serif', color: 'var(--navy)' }}>
                    {peakDay.label}
                  </p>
                  <p className="m-0 text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    Peak day ({peakDay.total} scan{peakDay.total !== 1 ? 's' : ''})
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Verdict breakdown */}
          <div className="rounded-2xl p-6"
            style={{ backgroundColor: '#fff', border: '1px solid #E8EFF7', boxShadow: '0 1px 8px rgba(15,31,53,0.05)' }}>
            <p className="m-0 font-semibold mb-5" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--navy)' }}>
              Verdict Breakdown
            </p>
            {stats && (
              <>
                {/* Two-segment bar */}
                <div className="rounded-full overflow-hidden mb-4 flex"
                  style={{ height: '12px', backgroundColor: '#E8EFF7' }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${normRate(stats.authentic_rate_pct)}%`, backgroundColor: '#22C55E' }}
                  />
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${normRate(stats.counterfeit_rate_pct)}%`, backgroundColor: '#EF4444' }}
                  />
                </div>
                <div className="flex gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#22C55E' }} />
                    <span className="text-sm" style={{ color: 'var(--slate)' }}>
                      Authentic — {stats.authentic_count} ({normRate(stats.authentic_rate_pct).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#EF4444' }} />
                    <span className="text-sm" style={{ color: 'var(--slate)' }}>
                      Counterfeit — {stats.counterfeit_count} ({normRate(stats.counterfeit_rate_pct).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Detection Rate', value: `${normRate(stats.counterfeit_rate_pct).toFixed(1)}%`, colour: '#EF4444' },
                    { label: 'Avg Confidence', value: `${(stats.avg_confidence * 100).toFixed(1)}%`, colour: '#6366F1' },
                    { label: 'Avg Similarity', value: `${(stats.avg_similarity_score * 100).toFixed(1)}%`, colour: '#0EA5E9' },
                    { label: 'Avg Speed', value: `${stats.avg_inference_ms?.toFixed(0) ?? '—'}ms`, colour: '#F59E0B' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-4"
                      style={{ backgroundColor: 'var(--cream)' }}>
                      <p className="m-0 font-bold text-xl" style={{ fontFamily: 'Sora, sans-serif', color: s.colour }}>
                        {s.value}
                      </p>
                      <p className="m-0 text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            {loading && <div className="animate-pulse rounded-xl" style={{ height: '200px', backgroundColor: 'var(--cream)' }} />}
          </div>
        </div>

        {/* History table */}
        <div className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#fff', border: '1px solid #E8EFF7', boxShadow: '0 1px 8px rgba(15,31,53,0.05)' }}>
          <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
            style={{ borderBottom: '1px solid #E8EFF7' }}>
            <p className="m-0 font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--navy)' }}>
              Scan History
              <span className="ml-2 text-sm font-normal" style={{ color: 'var(--muted)' }}>
                ({filtered.length} records)
              </span>
            </p>
            <div className="flex gap-2">
              {(['all', 'authentic', 'counterfeit'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors"
                  style={{
                    backgroundColor: filter === f ? 'var(--navy)' : 'var(--cream)',
                    color: filter === f ? '#fff' : 'var(--slate)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--cream)' }}>
                  {['Verdict', 'Confidence', 'Similarity', 'Speed', 'Time'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                      style={{ color: 'var(--muted)', whiteSpace: 'nowrap', borderBottom: '1px solid #E8EFF7' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>
                      No records found
                    </td>
                  </tr>
                )}
                {filtered.map((item, i) => (
                  <tr
                    key={item.observation_id ?? i}
                    style={{ borderBottom: '1px solid #F0F4F9' }}
                    className="hover:bg-[#FAFBFF] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className="flex items-center gap-1.5 text-xs font-semibold capitalize w-fit px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: item.verdict === 'authentic' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          color: item.verdict === 'authentic' ? '#22C55E' : '#EF4444',
                        }}
                      >
                        {item.verdict === 'authentic'
                          ? <CheckCircle size={11} />
                          : <AlertCircle size={11} />}
                        {item.verdict}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--slate)' }}>
                      {(item.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--slate)' }}>
                      {(item.similarity_score * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--slate)' }}>
                      <span className="flex items-center gap-1">
                        <Zap size={11} style={{ color: '#F59E0B' }} />
                        {item.inference_ms?.toFixed(0)}ms
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {timeAgo(item.timestamp)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}