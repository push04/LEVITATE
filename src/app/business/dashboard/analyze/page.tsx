'use client';

import { useState, useRef } from 'react';
import {
  Upload, FileSpreadsheet, Sparkles, ChevronRight,
  X, Download, AlertCircle, CheckCircle2, BarChart3, MessageCircle, Send,
} from 'lucide-react';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import BusinessPortalLocked from '@/components/business/BusinessPortalLocked';
import { parseFile, extractPhones, type ParsedFile } from '@/lib/import/fileParser';

const CHUNK_SIZE = 50;
const CHUNK_DELAY_MS = 2000;
const MAX_RETRY = 3;

type Phase = 'idle' | 'ready' | 'analyzing' | 'done';

interface ChunkResult { chunkIndex: number; chunkSummary?: string; notableItems?: string[] }
interface FinalResult {
  executiveSummary: string;
  keyFindings: string[];
  recommendations: string[];
  dataQuality: string;
  metrics: { totalRows: number; columnsAnalyzed: number };
}

const SAMPLES = [
  'Who are my top customers?',
  'What are the most common cities?',
  'Identify data quality issues',
  'What revenue trends do you see?',
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function AnalyzePage() {
  const portal = useCompanyPortalState();
  const [phase, setPhase] = useState<Phase>('idle');
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parseError, setParseError] = useState('');
  const [question, setQuestion] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [chunks, setChunks] = useState<ChunkResult[]>([]);
  const [final, setFinal] = useState<FinalResult | null>(null);
  const [error, setError] = useState('');
  const abortRef = useRef(false);

  // WhatsApp campaign state
  const [waName, setWaName] = useState('');
  const [waMsg, setWaMsg] = useState('');
  const [waLaunching, setWaLaunching] = useState(false);
  const [waResult, setWaResult] = useState<{ queued: number } | null>(null);
  const [waError, setWaError] = useState('');

  if (portal.loading) return null;
  if (!portal.hasPaidAccess) return (
    <BusinessPortalLocked
      companyName={portal.companyName}
      subscriptionStatus={portal.subscriptionStatus}
      planName={portal.planName}
      billingCycle={portal.billingCycle}
      subdomainUrl={portal.workspaceUrl}
    />
  );

  const handleFile = async (f: File) => {
    setParseError(''); setParsedFile(null); setChunks([]); setFinal(null); setError('');
    setWaResult(null); setWaError('');
    setPhase('ready');
    try {
      const parsed = await parseFile(f);
      setParsedFile(parsed);
      // Auto-detect phone mapping for WA
      const phoneCol = parsed.headers.find(h => {
        const l = h.toLowerCase().trim();
        return ['phone', 'mobile', 'whatsapp', 'contact', 'tel', 'number'].some(k => l.includes(k));
      });
      const nameCol = parsed.headers.find(h => {
        const l = h.toLowerCase().trim();
        return ['name', 'customer', 'party', 'business', 'company'].some(k => l.includes(k));
      });
      const m: Record<string, string> = {};
      if (phoneCol) m[phoneCol] = 'phone';
      if (nameCol) m[nameCol] = 'business_name';
      setMapping(m);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Failed to parse file');
      setPhase('idle');
    }
  };

  const analyze = async () => {
    if (!parsedFile || !portal.companyId) return;
    abortRef.current = false;
    setPhase('analyzing'); setChunks([]); setFinal(null); setError('');

    const { rows, headers, fileName, rowCount } = parsedFile;
    const chunkList: Record<string, string>[][] = [];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) chunkList.push(rows.slice(i, i + CHUNK_SIZE));
    const total = chunkList.length;
    setProgress({ current: 0, total, status: 'Starting...' });

    let accumulated = '';

    for (let i = 0; i < total; i++) {
      if (abortRef.current) break;
      setProgress({ current: i + 1, total, status: `Analyzing chunk ${i + 1} of ${total}…` });

      let retries = 0;
      while (retries < MAX_RETRY) {
        try {
          const res = await fetch('/api/business/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              company_id: portal.companyId,
              fileName, headers,
              rows: chunkList[i],
              chunkIndex: i,
              totalChunks: total,
              totalRows: rowCount,
              userQuestion: question.trim() || undefined,
              previousInsights: accumulated || undefined,
            }),
          });

          if (res.status === 429) {
            const d = await res.json().catch(() => ({})) as { retryAfter?: number };
            const wait = ((d.retryAfter ?? 5) + retries * 5) * 1000;
            setProgress(p => ({ ...p, status: `Rate limit — waiting ${Math.round(wait / 1000)}s…` }));
            await sleep(wait);
            retries++;
            continue;
          }

          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json() as { insights: Record<string, unknown>; isFinal: boolean };

          if (data.isFinal) {
            setFinal(data.insights as unknown as FinalResult);
          } else {
            const r: ChunkResult = {
              chunkIndex: i,
              chunkSummary: data.insights.chunkSummary as string,
              notableItems: (data.insights.notableItems as string[]) ?? [],
            };
            setChunks(prev => [...prev, r]);
            if (r.chunkSummary) accumulated += `\nChunk ${i + 1}: ${r.chunkSummary}`;
          }
          break;
        } catch (e) {
          retries++;
          if (retries >= MAX_RETRY) {
            setError(`Failed on chunk ${i + 1}: ${e instanceof Error ? e.message : 'Unknown'}`);
            setPhase('done');
            return;
          }
          await sleep(3000 * retries);
        }
      }

      if (i < total - 1 && !abortRef.current) await sleep(CHUNK_DELAY_MS);
    }

    setProgress(p => ({ ...p, status: 'Done!' }));
    setPhase('done');
  };

  const reset = () => {
    abortRef.current = true;
    setPhase('idle'); setParsedFile(null); setChunks([]); setFinal(null);
    setError(''); setQuestion(''); setWaResult(null); setWaError('');
  };

  const exportTxt = () => {
    if (!final) return;
    const lines = [
      'AI ANALYSIS REPORT', `File: ${parsedFile?.fileName}`,
      `Date: ${new Date().toLocaleDateString()}`, `Rows: ${parsedFile?.rowCount}`, '',
      'EXECUTIVE SUMMARY', final.executiveSummary, '',
      'KEY FINDINGS', ...final.keyFindings.map((f, i) => `${i + 1}. ${f}`), '',
      'RECOMMENDATIONS', ...final.recommendations.map((r, i) => `${i + 1}. ${r}`), '',
      'DATA QUALITY', final.dataQuality,
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
    a.download = `analysis-${parsedFile?.fileName?.replace(/\.[^.]+$/, '')}.txt`;
    a.click();
  };

  // Build per-contact data array from parsed rows for personalized WhatsApp send
  const buildContactData = () => {
    if (!parsedFile) return [];
    const phones = extractPhones(parsedFile.rows, mapping);
    // Map each row that has a phone to {phone, variables}
    const phoneKey = Object.entries(mapping).find(([, v]) => v === 'phone')?.[0];
    const nameKey = Object.entries(mapping).find(([, v]) => v === 'business_name' || v === 'name')?.[0];
    const cityKey = parsedFile.headers.find(h => h.toLowerCase().includes('city'));
    const catKey = parsedFile.headers.find(h => h.toLowerCase().includes('category') || h.toLowerCase().includes('type'));

    const seen = new Set<string>();
    const contacts: Array<{ phone: string; name?: string; variables?: Record<string, string> }> = [];
    for (const row of parsedFile.rows) {
      const rawPhone = phoneKey ? row[phoneKey] : '';
      if (!rawPhone) continue;
      const digits = rawPhone.replace(/[^0-9]/g, '');
      const phone = digits.length === 10 ? `91${digits}` : digits;
      if (phone.length < 10 || seen.has(phone)) continue;
      seen.add(phone);
      contacts.push({
        phone,
        name: nameKey ? row[nameKey] : undefined,
        variables: {
          name: nameKey ? (row[nameKey] ?? '') : '',
          city: cityKey ? (row[cityKey] ?? '') : '',
          category: catKey ? (row[catKey] ?? '') : '',
        },
      });
    }
    return contacts;
  };

  const launchWhatsApp = async () => {
    if (!waMsg.trim() || !waName.trim() || !portal.companyId) return;
    setWaLaunching(true); setWaError('');

    const contacts = buildContactData();
    if (!contacts.length) {
      setWaError('No valid phone numbers found. Check that your file has a phone/mobile column.');
      setWaLaunching(false);
      return;
    }

    try {
      // Create campaign
      const createRes = await fetch('/api/business/whatsapp/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: waName,
          custom_message: waMsg,
          target_type: 'manual',
          target_manual_numbers: contacts.map(c => c.phone),
        }),
      });
      const createData = await createRes.json() as { campaign?: { id: string }; error?: string };
      if (!createData.campaign) throw new Error(createData.error ?? 'Failed to create campaign');

      // Launch with per-contact personalization
      const launchRes = await fetch('/api/business/whatsapp/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: createData.campaign.id,
          contact_data: contacts,
        }),
      });
      const launchData = await launchRes.json() as { success?: boolean; queued?: number; error?: string };
      if (!launchData.success) throw new Error(launchData.error ?? 'Launch failed');

      setWaResult({ queued: launchData.queued ?? contacts.length });
    } catch (e) {
      setWaError(e instanceof Error ? e.message : 'Launch failed');
    } finally {
      setWaLaunching(false);
    }
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const totalChunkCount = parsedFile ? Math.ceil(parsedFile.rowCount / CHUNK_SIZE) : 0;
  const estMin = Math.max(1, Math.ceil(totalChunkCount * 2.5 / 60));
  const extractedPhones = phase === 'done' && parsedFile ? extractPhones(parsedFile.rows, mapping).length : 0;

  const card: React.CSSProperties = { background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px' };

  return (
    <div style={{ padding: '0 0 80px', fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} color="white" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>AI Data Analyzer</h1>
          </div>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Upload any CSV or Excel → AI analyzes chunk by chunk → launch personalized WhatsApp campaign</p>
        </div>
        {phase !== 'idle' && (
          <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', fontSize: 13, color: '#6B7280', cursor: 'pointer' }}>
            <X size={13} /> Start over
          </button>
        )}
      </div>

      {/* ── IDLE ─────────────────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div style={{ maxWidth: 600 }}>
          <div
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onDragOver={e => e.preventDefault()}
            onClick={() => document.getElementById('ai-file-input')?.click()}
            style={{ border: '2px dashed #D1D5DB', borderRadius: 16, padding: '52px 24px', textAlign: 'center', cursor: 'pointer', background: '#FAFAFA' }}
          >
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Upload size={24} color="white" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Drop your file here</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 16px' }}>or click to browse · No size limit</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              {['CSV', 'XLS', 'XLSX'].map(f => (
                <span key={f} style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid #E5E7EB', background: 'white', fontSize: 12, fontWeight: 600, color: '#374151' }}>{f}</span>
              ))}
            </div>
            <input id="ai-file-input" type="file" accept=".csv,.xls,.xlsx" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
          {parseError && <p style={{ marginTop: 10, fontSize: 13, color: '#DC2626' }}>{parseError}</p>}
        </div>
      )}

      {/* ── READY ────────────────────────────────────────────────────────── */}
      {phase === 'ready' && parsedFile && (
        <div style={{ maxWidth: 620 }}>
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileSpreadsheet size={22} color="#059669" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parsedFile.fileName}</p>
              <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                {parsedFile.rowCount.toLocaleString()} rows · {parsedFile.headers.length} columns · {parsedFile.fileType.toUpperCase()} · ~{totalChunkCount} AI calls · ~{estMin} min
              </p>
            </div>
            <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={16} color="#9CA3AF" /></button>
          </div>

          <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Columns detected</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {parsedFile.headers.slice(0, 24).map(h => (
                <span key={h} style={{ padding: '3px 9px', borderRadius: 6, background: 'white', border: '1px solid #E5E7EB', fontSize: 12, color: '#374151' }}>{h}</span>
              ))}
              {parsedFile.headers.length > 24 && (
                <span style={{ padding: '3px 9px', borderRadius: 6, background: 'white', border: '1px solid #E5E7EB', fontSize: 12, color: '#9CA3AF' }}>+{parsedFile.headers.length - 24} more</span>
              )}
            </div>
          </div>

          <div style={{ ...card, marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
              What do you want to know? <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
            </label>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="e.g. Who are my top customers by balance? Which cities have the most leads?"
              rows={2}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#111827', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              {SAMPLES.map(q => (
                <button key={q} onClick={() => setQuestion(q)} style={{ padding: '3px 9px', borderRadius: 20, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>{q}</button>
              ))}
            </div>
          </div>

          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertCircle size={14} color="#3B82F6" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: '#1D4ED8', margin: 0, lineHeight: 1.6 }}>
              File is parsed in your browser. Each {CHUNK_SIZE}-row chunk = one fast API call (~3s). 2s gap between chunks keeps AI rate limits happy. After analysis, launch a personalized WhatsApp campaign directly.
            </p>
          </div>

          <button onClick={analyze} style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Sparkles size={17} /> Analyze with AI
          </button>
        </div>
      )}

      {/* ── ANALYZING ────────────────────────────────────────────────────── */}
      {phase === 'analyzing' && (
        <div style={{ maxWidth: 620 }}>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{progress.status}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1' }}>{pct}%</span>
            </div>
            <div style={{ height: 8, background: '#F3F4F6', borderRadius: 99 }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: `${pct}%`, transition: 'width 0.4s ease' }} />
            </div>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: '6px 0 0' }}>Chunk {progress.current}/{progress.total} · {parsedFile?.rowCount.toLocaleString()} rows total</p>
            <button onClick={() => { abortRef.current = true; setPhase('done'); }} style={{ marginTop: 8, fontSize: 12, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Stop</button>
          </div>

          {chunks.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Live insights</p>
              {[...chunks].reverse().slice(0, 4).map(r => (
                <div key={r.chunkIndex} style={{ ...card, marginBottom: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', margin: '0 0 4px', textTransform: 'uppercase' }}>Chunk {r.chunkIndex + 1}</p>
                  <p style={{ fontSize: 13, color: '#374151', margin: '0 0 6px' }}>{r.chunkSummary}</p>
                  {r.notableItems?.length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {r.notableItems.map((item, i) => (
                        <span key={i} style={{ fontSize: 11, color: '#6366f1', background: '#EEF2FF', borderRadius: 4, padding: '2px 7px' }}>{item}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DONE ─────────────────────────────────────────────────────────── */}
      {phase === 'done' && (
        <div style={{ maxWidth: 720 }}>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 10 }}>
              <AlertCircle size={15} color="#EF4444" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '11px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={15} color="#059669" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#059669', flex: 1 }}>
              {parsedFile?.rowCount.toLocaleString()} rows analyzed · {chunks.length + (final ? 1 : 0)} chunks
              {extractedPhones > 0 && ` · ${extractedPhones} phone numbers found`}
            </span>
            <button onClick={exportTxt} disabled={!final} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, border: '1px solid #BBF7D0', background: 'white', fontSize: 12, fontWeight: 600, color: '#059669', cursor: final ? 'pointer' : 'not-allowed', opacity: final ? 1 : 0.5 }}>
              <Download size={12} /> Export
            </button>
          </div>

          {final && (
            <>
              <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 14, padding: '20px 24px', marginBottom: 14, color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <Sparkles size={15} color="white" />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Executive Summary</span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0, color: 'rgba(255,255,255,0.95)' }}>{final.executiveSummary}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <BarChart3 size={13} color="#6366f1" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Key Findings</span>
                  </div>
                  {final.keyFindings.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 7 }}>
                      <span style={{ width: 17, height: 17, borderRadius: 4, background: '#EEF2FF', fontSize: 10, fontWeight: 700, color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <ChevronRight size={13} color="#059669" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recommendations</span>
                  </div>
                  {final.recommendations.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 7 }}>
                      <span style={{ width: 17, height: 17, borderRadius: 4, background: '#F0FDF4', fontSize: 10, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...card, marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 7px' }}>Data Quality</p>
                <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{final.dataQuality}</p>
              </div>

              {/* ── WhatsApp Campaign Panel ────────────────────────────────── */}
              <div style={{ background: 'white', border: '2px solid #22c55e', borderRadius: 14, padding: '20px 24px', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageCircle size={16} color="white" />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Launch WhatsApp Campaign</p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                      {extractedPhones > 0 ? `${extractedPhones} contacts with phone numbers found` : 'No phone numbers detected — add a phone/mobile column'}
                    </p>
                  </div>
                </div>

                {waResult ? (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>
                      {waResult.queued} personalized messages queued — your WhatsApp agent will send them shortly!
                    </span>
                  </div>
                ) : extractedPhones > 0 ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Campaign name</label>
                        <input
                          value={waName}
                          onChange={e => setWaName(e.target.value)}
                          placeholder={`Outreach from ${parsedFile?.fileName?.replace(/\.[^.]+$/, '') ?? 'data'}`}
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                          Personalization: <code style={{ fontWeight: 400, background: '#F3F4F6', padding: '0 4px', borderRadius: 3, fontSize: 11 }}>{'{{name}}'}</code>{' '}
                          <code style={{ fontWeight: 400, background: '#F3F4F6', padding: '0 4px', borderRadius: 3, fontSize: 11 }}>{'{{city}}'}</code>
                        </label>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>Auto-replaced per contact from your data</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Message</label>
                      <textarea
                        value={waMsg}
                        onChange={e => setWaMsg(e.target.value)}
                        rows={4}
                        placeholder={`Hi {{name}}, based on our analysis of your data, we'd like to offer you a special deal. Reply YES to learn more!`}
                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#111827', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
                      />
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>
                        {waMsg.length} chars · Variables <code>{'{{name}}'}</code> <code>{'{{city}}'}</code> <code>{'{{category}}'}</code> are replaced per contact
                      </p>
                    </div>
                    {waError && (
                      <p style={{ fontSize: 12, color: '#DC2626', margin: '0 0 10px' }}>{waError}</p>
                    )}
                    <button
                      onClick={launchWhatsApp}
                      disabled={waLaunching || !waMsg.trim()}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, border: 'none', background: '#22c55e', color: 'white', fontSize: 14, fontWeight: 700, cursor: waLaunching || !waMsg.trim() ? 'not-allowed' : 'pointer', opacity: waLaunching || !waMsg.trim() ? 0.6 : 1 }}
                    >
                      <Send size={15} />
                      {waLaunching ? 'Launching…' : `Send to ${extractedPhones} contacts`}
                    </button>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: '#9CA3AF', margin: '12px 0 0' }}>
                    Your file needs a <strong>phone</strong> or <strong>mobile</strong> column for WhatsApp campaigns.
                  </p>
                )}
              </div>
            </>
          )}

          {chunks.length > 0 && (
            <details style={{ ...card, overflow: 'hidden', padding: 0 }}>
              <summary style={{ padding: '13px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Chunk-by-chunk details ({chunks.length})
              </summary>
              <div style={{ borderTop: '1px solid #F3F4F6', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
                {chunks.map(r => (
                  <div key={r.chunkIndex} style={{ paddingBottom: 8, borderBottom: '1px solid #F9FAFB' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', margin: '0 0 3px', textTransform: 'uppercase' }}>Chunk {r.chunkIndex + 1}</p>
                    <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>{r.chunkSummary}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
