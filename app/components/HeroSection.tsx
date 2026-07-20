'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, FileImage, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp, Zap, BarChart2, Clock } from 'lucide-react';

const BACKEND = 'https://capstone-ml-lqpp.onrender.com';

interface TopMatch {
  filename: string;
  split: string;
  labels: { authentic: number; counterfeit: number };
  similarity_score: number;
}

interface PredictResult {
  observation_id: string;
  verdict: 'authentic' | 'counterfeit';
  confidence: number;
  prob_authentic: number;
  prob_counterfeit: number;
  similarity_score: number;
  inference_ms: number;
  model_version: string;
  best_match_filename: string;
  top_5_matches: TopMatch[];
}

interface PendingCapture {
  id: string;
  fileName: string;
  preview: string;
  createdAt: string;
  reason: 'offline' | 'network-error';
}

const PENDING_CAPTURE_KEY = 'pharmacheck.pendingCaptures';

function loadPendingCaptures(): PendingCapture[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(PENDING_CAPTURE_KEY);
    return raw ? JSON.parse(raw) as PendingCapture[] : [];
  } catch {
    return [];
  }
}

function savePendingCapture(capture: PendingCapture) {
  if (typeof window === 'undefined') return;

  const current = loadPendingCaptures();
  const next = [capture, ...current].slice(0, 25);
  window.localStorage.setItem(PENDING_CAPTURE_KEY, JSON.stringify(next));
}

function shortName(filename: string) {
  return filename.replace(/\.rf\.[a-f0-9]+/, '').replace(/\.(jpg|png|jpeg)$/i, '');
}

export default function HeroSection() {
  const [dragOver, setDragOver]     = useState(false);
  const [status, setStatus]         = useState<'idle' | 'loading' | 'pending' | 'done' | 'error'>('idle');
  const [result, setResult]         = useState<PredictResult | null>(null);
  const [errorMsg, setErrorMsg]     = useState('');
  const [showMatches, setShowMatches] = useState(false);
  const [preview, setPreview]       = useState<string | null>(null);
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null);
  const [online, setOnline]         = useState(true);
  const fileRef                     = useRef<HTMLInputElement>(null);
  const lastFileRef                 = useRef<File | null>(null);

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

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    lastFileRef.current = file;

    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setStatus('loading');
    setResult(null);
    setShowMatches(false);
    setErrorMsg('');
    setPendingCapture(null);

    const queueCapture = (reason: PendingCapture['reason'], previewData: string) => {
      const pending = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        preview: previewData,
        createdAt: new Date().toISOString(),
        reason,
      } satisfies PendingCapture;

      savePendingCapture(pending);
      setPendingCapture(pending);
      setPreview(previewData);
      setStatus('pending');
    };

    try {
      if (!online || navigator.onLine === false) {
        const previewData = await new Promise<string>((resolve, reject) => {
          const offlineReader = new FileReader();
          offlineReader.onload = (e) => resolve(e.target?.result as string);
          offlineReader.onerror = () => reject(new Error('Unable to create offline preview'));
          offlineReader.readAsDataURL(file);
        });

        queueCapture('offline', previewData);
        return;
      }

      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`${BACKEND}/predict`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`API error ${res.status}: ${err}`);
      }

      const data: PredictResult = await res.json();
      setResult(data);
      setStatus('done');
    } catch (err) {
      const message = String(err);
      if (message.includes('Failed to fetch') || message.includes('fetch') || !navigator.onLine) {
        const previewData = await new Promise<string>((resolve, reject) => {
          const offlineReader = new FileReader();
          offlineReader.onload = (e) => resolve(e.target?.result as string);
          offlineReader.onerror = () => reject(new Error('Unable to create offline preview'));
          offlineReader.readAsDataURL(file);
        });

        queueCapture('network-error', previewData);
        return;
      }

      setErrorMsg(message);
      setStatus('error');
    }
  };

  const retryPendingCapture = () => {
    if (lastFileRef.current) {
      void handleFile(lastFileRef.current);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
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
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
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
                  {pendingCapture.preview && (
                    <img src={pendingCapture.preview} alt="pending preview" className="w-20 h-20 object-cover rounded-xl" />
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
                      ? 'Your scan was captured without a connection and will be ready to sync once you are back online.'
                      : 'The scan was captured, but the verification API could not be reached. It has been queued as pending.'}
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
                  {/* Preview thumbnail */}
                  {preview && (
                    <img src={preview} alt="scanned" className="w-20 h-20 object-cover rounded-xl" />
                  )}

                  {/* Verdict */}
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


                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    <span className="flex items-center gap-1">
                      <Zap size={11} />{result.inference_ms.toFixed(0)}ms
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart2 size={11} />{(result.similarity_score * 100).toFixed(2)}% similarity
                    </span>
                    <span>{result.model_version}</span>
                  </div>

                  {/* Top 5 matches toggle */}
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