'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, FileImage, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp, Zap, BarChart2, Clock } from 'lucide-react';

const BACKEND = 'https://capstone-ml-lqpp.onrender.com';

// ---------------------------------------------------------------------------
// Types — mirror app/models/prediction.py (MatchResult) exactly.
// Probabilities are nested, not flat, and several fields (best_match_labels,
// status, scope_note, best_match_split) exist on the real response that the
// old frontend type never accounted for.
// ---------------------------------------------------------------------------

interface ClassProbability {
  authentic: number;
  counterfeit: number;
}

interface TopMatch {
  filename: string;
  split: string;
  labels: { authentic: number; counterfeit: number };
  similarity_score: number;
}

interface MatchResult {
  observation_id: string;
  timestamp: string;
  query_filename: string;
  best_match_filename: string;
  best_match_split: string;
  best_match_labels: { authentic: number; counterfeit: number };
  similarity_score: number;
  top_5_matches: TopMatch[];
  verdict: 'authentic' | 'counterfeit' | null;
  confidence: number | null;
  probabilities: ClassProbability | null;
  inference_ms: number | null;
  status: 'completed' | 'pending';
  scope_note: string;
}

interface PendingCapture {
  id: string;
  fileName: string;
  base64: string; // full data URI — needed to actually replay the request later
  createdAt: string;
  reason: 'offline' | 'network-error';
}

const PENDING_CAPTURE_KEY = 'pharmacheck.pendingCaptures';

function loadPendingCaptures(): PendingCapture[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PENDING_CAPTURE_KEY);
    if (!raw) return [];
    const migrated = migratePendingCaptures(JSON.parse(raw));
    savePendingCaptures(migrated); // persist the migrated shape immediately
    return migrated;
  } catch {
    return [];
  }
}



function savePendingCaptures(list: PendingCapture[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PENDING_CAPTURE_KEY, JSON.stringify(list.slice(0, 25)));
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

function migratePendingCaptures(raw: unknown[]): PendingCapture[] {
  return raw
    .map((item) => {
      const c = item as Record<string, unknown>;
      const base64 = (c.base64 as string) ?? (c.preview as string);
      if (!base64) return null; // unrecoverable — drop it
      return {
        id: (c.id as string) ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: (c.fileName as string) ?? 'unknown',
        base64,
        createdAt: (c.createdAt as string) ?? new Date().toISOString(),
        reason: (c.reason as PendingCapture['reason']) ?? 'network-error',
      };
    })
    .filter((c): c is PendingCapture => c !== null);
}


function shortName(filename: string) {
  return filename.replace(/\.rf\.[a-f0-9]+/, '').replace(/\.(jpg|png|jpeg)$/i, '');
}

export default function HeroSection() {
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'pending' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showMatches, setShowMatches] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null);
  const [online, setOnline] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncOnlineState = () => setOnline(navigator.onLine);
    syncOnlineState();
    window.addEventListener('online', syncOnlineState);
    window.addEventListener('offline', syncOnlineState);
    return () => {
      window.removeEventListener('online', syncOnlineState);
      window.removeEventListener('offline', syncOnlineState);
    };
  }, []);

  // Auto-sync queued captures whenever connectivity returns.
  useEffect(() => {
    if (!online) return;
    const queued = loadPendingCaptures();
    if (queued.length === 0) return;

    (async () => {
      const remaining: PendingCapture[] = [];
      for (const capture of queued) {
        try {
          await submitBase64(capture.base64, capture.fileName, { silent: true });
        } catch {
          remaining.push(capture); // keep it queued if the retry itself fails
        }
      }
      savePendingCaptures(remaining);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const queueCapture = (reason: PendingCapture['reason'], fileName: string, base64: string) => {
    const capture: PendingCapture = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fileName,
      base64,
      createdAt: new Date().toISOString(),
      reason,
    };
    savePendingCaptures([capture, ...loadPendingCaptures()]);
    setPendingCapture(capture);
    setPreview(base64);
    setStatus('pending');
  };

  /**
   * Single call path for both the initial submit and any later retry —
   * this is the "same flow" fix: everything goes through /camera/predict
   * with a base64 payload, since that's the only format that can be
   * persisted to localStorage for offline queueing.
   */
  const submitBase64 = async (
    base64: string,
    fileName: string,
    opts: { silent?: boolean } = {},
  ) => {
    if (!opts.silent) {
      setStatus('loading');
      setResult(null);
      setShowMatches(false);
      setErrorMsg('');
      setPendingCapture(null);
      setPreview(base64);
    }

    if (!navigator.onLine) {
      queueCapture('offline', fileName, base64);
      return;
    }
     if (!base64) {
    // Fail loudly here instead of sending a request missing image_base64.
    if (opts.silent) throw new Error('Missing image data for queued capture');
    setErrorMsg('Something went wrong reading that image — please try again.');
    setStatus('error');
    return;
  }

    try {
      const res = await fetch(`${BACKEND}/camera/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          filename: fileName,
          offline_capture: false,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`API error ${res.status}: ${err}`);
      }

      const data: MatchResult = await res.json();
      setResult(data);
      setPreview(base64);
      setStatus('done');
    } catch (err) {
      if (opts.silent) throw err; // let the caller decide to re-queue

      const message = String(err);
      if (message.includes('fetch') || !navigator.onLine) {
        queueCapture('network-error', fileName, base64);
        return;
      }
      setErrorMsg(message);
      setStatus('error');
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const base64 = await readFileAsBase64(file);
    await submitBase64(base64, file.name);
  };

  const retryPendingCapture = () => {
    if (pendingCapture) {
      void submitBase64(pendingCapture.base64, pendingCapture.fileName);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const reset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatus('idle');
    setResult(null);
    setPreview(null);
    setPendingCapture(null);
    setShowMatches(false);
    setErrorMsg('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const isAuthentic = result?.verdict === 'authentic';

  return (
    <section
      id="scan"
      className="min-h-screen flex items-center"
      style={{ backgroundColor: 'var(--cream)', paddingTop: '4rem', paddingBottom: '5rem' }}
    >
      <div className="max-w-7xl mx-auto px-6 w-full">
        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* ── Left: copy ── */}
          <div>
            <p
              className="text-xs tracking-widest font-semibold mb-4"
              style={{ color: 'var(--terracotta)', letterSpacing: '0.15em' }}
            >
              PATIENT SAFETY FIRST
            </p>
            <h1
              style={{
                fontFamily: 'Sora, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
                color: 'var(--navy)',
                lineHeight: 1.12,
                marginBottom: '1.5rem',
              }}
            >
              Authenticate Medicine<br />
              <span style={{ color: 'var(--terracotta)' }}>Packaging</span> with AI.
            </h1>
            <p style={{ color: 'var(--slate)', fontSize: '1.05rem', maxWidth: '440px', lineHeight: 1.7, marginBottom: '2rem' }}>
              PharmaCheck uses MobileNetV3 CNN analysis to instantly verify pharmaceutical
              packaging — protecting patients in Kigali and beyond from counterfeit drugs.
            </p>

            <div
              className="inline-flex items-center gap-4 px-5 py-4 rounded-xl"
              style={{ backgroundColor: '#fff', border: '1px solid #E8EFF7', boxShadow: '0 1px 8px rgba(15,31,53,0.06)' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(192,98,42,0.1)' }}
              >
                <CheckCircle size={20} style={{ color: 'var(--terracotta)' }} />
              </div>
              <div>
                <p className="font-bold text-xl m-0" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--navy)' }}>
                  1,555+
                </p>
                <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>Packaging samples trained on</p>
              </div>
            </div>
          </div>

          {/* ── Right: scan zone ── */}
          <div className="flex flex-col gap-3">
            <div
              className={`upload-zone rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${dragOver ? 'scale-[1.02]' : ''}`}
              style={{
                border: `2px dashed ${dragOver ? 'var(--terracotta)' : 'rgba(192,98,42,0.35)'}`,
                backgroundColor: dragOver ? 'rgba(192,98,42,0.04)' : '#fff',
                padding: '2.5rem 2rem',
                minHeight: '300px',
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => (status === 'idle' || status === 'error') && fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) void handleFile(e.target.files[0]); }}
              />

              {/* IDLE */}
              {status === 'idle' && (
                <>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: 'rgba(192,98,42,0.08)' }}>
                    <Camera size={28} style={{ color: 'var(--terracotta)' }} />
                  </div>
                  <p className="font-semibold text-lg mb-1" style={{ color: 'var(--navy)', fontFamily: 'Sora, sans-serif' }}>
                    Capture or Upload
                  </p>
                  <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                    Click to capture or drag and drop medicine packaging
                  </p>
                  <button
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--navy)', color: '#fff' }}
                    onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                  >
                    <FileImage size={16} />
                    Select Image
                  </button>
                </>
              )}

              {/* LOADING */}
              {status === 'loading' && (
                <div className="flex flex-col items-center gap-4">
                  {preview && (
                    <img src={preview} alt="preview" className="w-24 h-24 object-cover rounded-xl mb-2 opacity-60" />
                  )}
                  <Loader2 size={36} className="animate-spin" style={{ color: 'var(--terracotta)' }} />
                  <p className="font-semibold" style={{ color: 'var(--navy)', fontFamily: 'Sora, sans-serif' }}>
                    Running MobileNetV3 inference…
                  </p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Sending to PharmaCheck API
                  </p>
                </div>
              )}

              {/* PENDING */}
              {status === 'pending' && pendingCapture && (
                <div className="flex flex-col items-center gap-3 w-full">
                  {pendingCapture.base64 && (
                    <img src={pendingCapture.base64} alt="pending preview" className="w-20 h-20 object-cover rounded-xl" />
                  )}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(14,165,233,0.08)', color: '#0EA5E9', border: '1px solid rgba(14,165,233,0.18)' }}>
                    <Clock size={14} />
                    <span className="text-xs font-semibold uppercase tracking-widest">Pending</span>
                  </div>
                  <p className="font-semibold text-lg m-0" style={{ color: 'var(--navy)', fontFamily: 'Sora, sans-serif' }}>
                    Photo saved offline
                  </p>
                  <p className="text-sm text-center px-4 m-0" style={{ color: 'var(--muted)' }}>
                    {pendingCapture.reason === 'offline'
                      ? 'Your scan was captured without a connection and will sync automatically once you are back online.'
                      : 'The scan was captured, but the verification API could not be reached. It will retry automatically, or you can retry now.'}
                  </p>
                  <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>
                    {pendingCapture.fileName}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      className="text-xs px-4 py-1.5 rounded-lg border"
                      style={{ borderColor: 'var(--muted)', color: 'var(--slate)', cursor: 'pointer', background: 'transparent' }}
                      onClick={retryPendingCapture}
                      disabled={!online}
                    >
                      {online ? 'Retry verification' : 'Reconnect to retry'}
                    </button>
                    <button
                      className="text-xs px-4 py-1.5 rounded-lg border"
                      style={{ borderColor: 'var(--muted)', color: 'var(--slate)', cursor: 'pointer', background: 'transparent' }}
                      onClick={reset}
                    >
                      Capture Another
                    </button>
                  </div>
                </div>
              )}

              {/* ERROR */}
              {status === 'error' && (
                <div className="flex flex-col items-center gap-3">
                  <AlertCircle size={40} style={{ color: '#EF4444' }} />
                  <p className="font-semibold" style={{ color: '#EF4444', fontFamily: 'Sora, sans-serif' }}>
                    Prediction Failed
                  </p>
                  <p className="text-xs px-4" style={{ color: 'var(--muted)' }}>{errorMsg}</p>
                  <button
                    className="mt-2 text-xs px-4 py-1.5 rounded-lg border"
                    style={{ borderColor: 'var(--muted)', color: 'var(--slate)', cursor: 'pointer', background: 'transparent' }}
                    onClick={reset}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* DONE */}
              {status === 'done' && result && (
                <div className="flex flex-col items-center gap-3 w-full" onClick={(e) => e.stopPropagation()}>
                  {preview && (
                    <img src={preview} alt="scanned" className="w-20 h-20 object-cover rounded-xl" />
                  )}

                  {isAuthentic
                    ? <CheckCircle size={40} style={{ color: '#22C55E' }} />
                    : <AlertCircle size={40} style={{ color: '#EF4444' }} />
                  }
                  <p
                    className="font-bold text-2xl m-0"
                    style={{ fontFamily: 'Sora, sans-serif', color: isAuthentic ? '#22C55E' : '#EF4444' }}
                  >
                    {isAuthentic ? 'Authentic' : 'Counterfeit Detected'}
                  </p>

                  {/* Meta row — reads from the nested `probabilities` /
                      `inference_ms` fields, matching the real MatchResult
                      shape rather than flat prob_authentic/prob_counterfeit */}
                  <div className="flex items-center gap-4 text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    {result.inference_ms != null && (
                      <span className="flex items-center gap-1">
                        <Zap size={11} />{result.inference_ms.toFixed(0)}ms
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <BarChart2 size={11} />{(result.similarity_score * 100).toFixed(2)}% similarity
                    </span>
                    {result.confidence != null && (
                      <span>{(result.confidence * 100).toFixed(1)}% confidence</span>
                    )}
                  </div>

                  {result.top_5_matches?.length > 0 && (
                    <div className="w-full mt-1">
                      <button
                        className="flex items-center gap-1 text-xs mx-auto"
                        style={{ color: 'var(--terracotta)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        onClick={() => setShowMatches(!showMatches)}
                      >
                        {showMatches ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {showMatches ? 'Hide' : 'Show'} Top 5 Matches
                      </button>

                      {showMatches && (
                        <div
                          className="mt-2 rounded-xl overflow-hidden text-left"
                          style={{ border: '1px solid #E8EFF7' }}
                        >
                          {result.top_5_matches.map((m, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between px-3 py-2 text-xs"
                              style={{
                                borderTop: i > 0 ? '1px solid #E8EFF7' : 'none',
                                backgroundColor: i === 0 ? 'rgba(192,98,42,0.04)' : '#fff',
                              }}
                            >
                              <span className="truncate" style={{ color: 'var(--navy)', maxWidth: '60%' }}>
                                {i === 0 && <span style={{ color: 'var(--terracotta)', fontWeight: 600 }}>★ </span>}
                                {shortName(m.filename)}
                              </span>
                              <div className="flex items-center gap-2">
                                <span style={{ color: m.labels.counterfeit ? '#EF4444' : '#22C55E' }}>
                                  {m.labels.counterfeit ? 'Counterfeit' : 'Authentic'}
                                </span>
                                <span style={{ color: 'var(--muted)' }}>
                                  {(m.similarity_score * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    className="mt-2 text-xs px-4 py-1.5 rounded-lg border"
                    style={{ borderColor: 'var(--muted)', color: 'var(--slate)', cursor: 'pointer', background: 'transparent' }}
                    onClick={reset}
                  >
                    Scan Another
                  </button>
                </div>
              )}
            </div>

            {/* Vigilance badge */}
            <div className="flex justify-end">
              <span
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                Vigilance Level: High
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}