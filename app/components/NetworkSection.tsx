'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Wifi, WifiOff, Clock, Zap } from 'lucide-react';

interface TopMatch {
  filename: string;
  split: string;
  labels: { authentic: number; counterfeit: number };
  similarity_score: number;
}

interface FeedItem {
  _id?: string;
  observation_id: string;
  timestamp: string | Date;
  query_filename: string;
  best_match_filename: string;
  verdict: 'authentic' | 'counterfeit';
  confidence: number;
  prob_authentic: number;
  prob_counterfeit: number;
  similarity_score: number;
  inference_ms: number;
  model_version: string;
  inspector_id: string;
  top_5_matches: TopMatch[];
}

function timeAgo(date: string | Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function shortFilename(name: string): string {
  return name.replace(/\.rf\.[a-f0-9]+/, '').replace(/\.(jpg|png|jpeg)$/i, '');
}

const VERDICT_STYLE = {
  authentic:   { icon: '#22C55E', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.2)'  },
  counterfeit: { icon: '#EF4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)'  },
};

const FEED_LIMIT = 4;

export default function NetworkSection() {
  const [feed, setFeed]           = useState<FeedItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [ticking, setTicking]     = useState(0);
  const esRef                     = useRef<EventSource | null>(null);

  // Re-render timestamps every 30s
  useEffect(() => {
    const id = setInterval(() => setTicking(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const connect = () => {
    esRef.current?.close();
    setError(null);

    const es = new EventSource('/api/verifications/stream');
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === 'initial') {
          setFeed(msg.data ?? []);
        }

        if (msg.type === 'change' && msg.data) {
          setFeed(prev => {
            const without = prev.filter(v => v.observation_id !== msg.data.observation_id);
            return [msg.data, ...without].slice(0, 20);
          });
        }

        if (msg.type === 'error') {
          setError(msg.message ?? 'Stream error');
          setConnected(false);
        }
      } catch { /* ignore malformed frames */ }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      setTimeout(connect, 5_000);
    };
  };

  useEffect(() => {
    connect();
    return () => esRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sort by most recent timestamp, then cap at FEED_LIMIT for display
  const recentFeed = [...feed]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, FEED_LIMIT);

  const totalScans       = feed.length;
  const counterfeitCount = feed.filter(f => f.verdict === 'counterfeit').length;
  const authenticCount   = feed.filter(f => f.verdict === 'authentic').length;
  const avgInference     = feed.length
    ? Math.round(feed.reduce((s, f) => s + f.inference_ms, 0) / feed.length)
    : 0;

  return (
    <section
      id="network"
      style={{ backgroundColor: 'var(--navy)', paddingTop: '5rem', paddingBottom: '5rem' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-14 items-start">

          {/* ── Left: copy + live stats ── */}
          <div>
            <p
              className="text-xs tracking-widest font-semibold mb-4"
              style={{ color: 'var(--terracotta-light)', letterSpacing: '0.15em' }}
            >
              RWANDA VERIFICATION NETWORK
            </p>
            <h2
              className="font-display font-bold mb-5"
              style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
                color: '#fff',
                lineHeight: 1.2,
              }}
            >
              Counterfeit intelligence,<br />built for Kigali.
            </h2>
            <p style={{ color: 'var(--muted)', lineHeight: 1.8, maxWidth: '400px' }}>
              PharmaCheck logs every MobileNetV3 inspection event to a Hyperledger Fabric
              audit trail — giving Rwanda FDA regulators a real-time view of counterfeit
              threats across Bumbogo and Kimironko sub-sectors.
            </p>

            {/* Live session counters derived from real feed data */}
            <div className="grid grid-cols-2 gap-5 mt-10">
              {[
                { value: totalScans.toString(),      label: 'Scans This Session',   colour: 'var(--terracotta-light)' },
                { value: authenticCount.toString(),  label: 'Authentic Verified',   colour: '#22C55E' },
                { value: counterfeitCount.toString(),label: 'Counterfeits Detected', colour: '#EF4444' },
                { value: avgInference ? `${avgInference}ms` : '—', label: 'Avg Inference Time', colour: 'var(--terracotta-light)' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p
                    className="font-display font-bold mb-1 m-0"
                    style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.6rem', color: stat.colour }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-xs mt-4" style={{ color: 'var(--muted)' }}>
              Model: <span style={{ color: 'var(--text-light)' }}>pharmacheck_mobilenetv3</span>
              {' · '}Powered by MongoDB Change Streams
            </p>
          </div>

          {/* ── Right: live feed card ── */}
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: 'var(--navy-card)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: connected ? '#22C55E' : '#EF4444' }}
                />
                <span className="font-semibold" style={{ color: '#fff', fontFamily: 'Sora, sans-serif' }}>
                  Live Verification Feed
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: connected ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: connected ? '#22C55E' : '#EF4444',
                  }}
                >
                  {connected ? 'LIVE' : 'Reconnecting…'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {connected
                  ? <Wifi size={14} style={{ color: '#22C55E' }} />
                  : <WifiOff size={14} style={{ color: '#EF4444' }} />}
                <button
                  onClick={connect}
                  title="Reconnect"
                  aria-label="Reconnect"
                  style={{ color: 'var(--muted)', cursor: 'pointer', background: 'transparent', border: 'none', padding: '4px' }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div
                className="flex items-start gap-2 rounded-xl px-4 py-3 mb-4 text-xs"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>MongoDB not reachable — check your connection string. Auto-retrying in 5s.</span>
              </div>
            )}

            {/* Empty state */}
            {recentFeed.length === 0 && !error && (
              <div className="text-center py-10" style={{ color: 'var(--muted)' }}>
                <RefreshCw size={22} className="animate-spin mx-auto mb-3" style={{ color: 'var(--terracotta-light)' }} />
                <p className="text-sm">Waiting for verification events…</p>
              </div>
            )}

            {/* Feed rows — capped at FEED_LIMIT most recent */}
            <div className="flex flex-col gap-2">
              {recentFeed.map((item, i) => {
                const style  = VERDICT_STYLE[item.verdict];
                const isOpen = expanded === item.observation_id;

                return (
                  <div
                    key={item.observation_id ?? i}
                    className="feed-item rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${style.border}`, backgroundColor: style.bg }}
                  >
                    {/* Row summary */}
                    <button
                      onClick={() => setExpanded(isOpen ? null : item.observation_id)}
                      className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.verdict === 'authentic'
                          ? <CheckCircle size={16} style={{ color: style.icon, flexShrink: 0 }} />
                          : <AlertCircle size={16} style={{ color: style.icon, flexShrink: 0 }} />
                        }
                        <div className="min-w-0">
                          <p className="text-sm font-medium m-0 truncate" style={{ color: 'var(--text-light)' }}>
                            {shortFilename(item.query_filename)}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs capitalize font-semibold" style={{ color: style.icon }}>
                              {item.verdict}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--muted)' }}>
                              {(item.confidence * 100)}% confidence
                            </span>
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                              <Zap size={10} />{item.inference_ms}ms
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }} suppressHydrationWarning>
                          <Clock size={10} />{ticking >= 0 && timeAgo(item.timestamp)}
                        </span>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          Inspector {item.inspector_id}
                        </span>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div
                        className="px-4 pb-4 text-xs flex flex-col gap-2"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            ['Observation ID',   item.observation_id],
                            ['Model',            item.model_version],
                            ['Prob Authentic',   `${(item.prob_authentic * 100)}%`],
                            ['Prob Counterfeit', `${(item.prob_counterfeit * 100)}%`],
                            ['Similarity Score', item.similarity_score],
                            ['Best Match Split', item.best_match_filename ? item.best_match_filename.split('.rf.')[0] : '—'],
                          ].map(([label, val]) => (
                            <div key={label}>
                              <p className="m-0" style={{ color: 'var(--muted)' }}>{label}</p>
                              <p className="m-0 font-medium truncate" style={{ color: 'var(--text-light)' }}>{val}</p>
                            </div>
                          ))}
                        </div>

                        {item.top_5_matches?.length > 0 && (
                          <div className="mt-2">
                            <p className="m-0 mb-1" style={{ color: 'var(--muted)' }}>Top 5 Matches</p>
                            {item.top_5_matches.map((m, j) => (
                              <div
                                key={j}
                                className="flex justify-between items-center py-1"
                                style={{ borderTop: j > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                              >
                                <span className="truncate" style={{ color: 'var(--text-light)', maxWidth: '65%' }}>
                                  {shortFilename(m.filename)}
                                </span>
                                <span style={{ color: 'var(--muted)' }}>
                                  {(m.similarity_score * 100)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {feed.length > 0
                  ? `Showing ${recentFeed.length} of ${feed.length} event${feed.length !== 1 ? 's' : ''}`
                  : 'No data yet'}
              </span>
              <a
                href="/stats"
                className="py-1.5 px-4 rounded-xl text-xs font-medium hover:bg-white/10 transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-light)', display: 'inline-block', textDecoration: 'none' }}
              >
                View All Stats
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}