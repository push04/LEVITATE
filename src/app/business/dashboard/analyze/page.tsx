'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Upload, FileSpreadsheet, Sparkles, ChevronRight,
  X, Download, AlertCircle, CheckCircle2, BarChart3, MessageCircle, Send, Clock, Phone, MapPin,
} from 'lucide-react';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import BusinessPortalLocked from '@/components/business/BusinessPortalLocked';
import { parseFile, extractPhones, type ParsedFile } from '@/lib/import/fileParser';

type Phase = 'idle' | 'ready' | 'analyzing' | 'done';

interface AnalyzeStep { label: string; done: boolean }

interface NumericStat { min: number; max: number; mean: number; sum: number; count: number }

interface DataStats {
  validPhones: number;
  invalidPhones: number;
  duplicatePhones: number;
  topCities: [string, number][];
  topCategories: [string, number][];
  columnCompleteness: { column: string; filled: number; pct: number }[];
  columnTypes: Record<string, string>;
  numericStats: Record<string, NumericStat>;
  categoricalDistributions: Record<string, [string, number][]>;
  dateRange: { column: string; earliest: string; latest: string } | null;
}

interface FinalResult {
  executiveSummary: string;
  keyFindings: string[];
  recommendations: string[];
  dataQuality: string;
  metrics: { totalRows: number; columnsAnalyzed: number };
}

interface SavedAnalysis {
  id: string;
  file_name: string;
  total_rows: number;
  valid_phones: number;
  executive_summary: string | null;
  key_findings: string[];
  recommendations: string[];
  data_quality: string | null;
  user_question: string | null;
  created_at: string;
}

const SAMPLES = [
  'Who are my top customers?',
  'What are the most common cities?',
  'Identify data quality issues',
  'What revenue trends do you see?',
];


export default function AnalyzePage() {
  const portal = useCompanyPortalState();
  const [phase, setPhase] = useState<Phase>('idle');
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parseError, setParseError] = useState('');
  const [question, setQuestion] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [steps, setSteps] = useState<AnalyzeStep[]>([]);
  const [dataStats, setDataStats] = useState<DataStats | null>(null);
  const [final, setFinal] = useState<FinalResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const abortRef = useRef(false);

  const [waName, setWaName] = useState('');
  const [waMsg, setWaMsg] = useState('');
  const [waLaunching, setWaLaunching] = useState(false);
  const [waResult, setWaResult] = useState<{ queued: number } | null>(null);
  const [waError, setWaError] = useState('');

  useEffect(() => {
    if (!portal.companyId) return;
    fetch('/api/business/analyze')
      .then(r => r.json())
      .then((d: { analyses?: SavedAnalysis[] }) => { if (d.analyses) setHistory(d.analyses); })
      .catch(() => {});
  }, [portal.companyId]);

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
    setParseError(''); setParsedFile(null); setDataStats(null); setFinal(null); setError(''); setSavedId(null);
    setWaResult(null); setWaError('');
    setPhase('ready');
    try {
      const parsed = await parseFile(f);
      setParsedFile(parsed);
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

  const tick = () => new Promise<void>(r => setTimeout(r, 0));

  const analyze = async () => {
    if (!parsedFile || !portal.companyId) return;
    abortRef.current = false;
    setPhase('analyzing'); setFinal(null); setError(''); setSavedId(null);
    setSteps([
      { label: 'Parsing rows and columns', done: false },
      { label: 'Validating phone numbers', done: false },
      { label: 'Computing distributions and value stats', done: false },
      { label: 'Building representative sample', done: false },
      { label: 'AI generating insights', done: false },
    ]);

    const { rows, fileName, rowCount } = parsedFile;
    // Strip Excel artifact empty column headers before any processing
    const headers = parsedFile.headers.filter(h => h && h.trim() && !h.startsWith('__EMPTY') && !h.startsWith('_EMPTY'));
    const markDone = (i: number) => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, done: true } : s));
    const n = rows.length;

    setStatusMsg(`Processing ${rowCount.toLocaleString()} rows...`);
    await tick();
    markDone(0);

    // ── Step 2: phone validation ──────────────────────────────────────────
    setStatusMsg('Validating phone numbers...');
    await tick();

    const phoneCol = headers.find(h => /phone|mobile|whatsapp|contact|ph\b|cell/i.test(h));
    const cityCols = headers.filter(h => /city|location|district|area|region|place|town|zone|state|taluka|mandal|tehsil|village|pincode|pin\b/i.test(h));
    const catCols  = headers.filter(h => /category|type|industry|sector|service|segment|product|group|class/i.test(h));

    let validPhones = 0, invalidPhones = 0, duplicatePhones = 0;
    const phoneSeen = new Set<string>();
    for (const row of rows) {
      if (!phoneCol) break;
      const v = (row[phoneCol] ?? '').replace(/[\s\-\(\)\+]/g, '');
      if (!v) continue;
      const norm = v.startsWith('91') && v.length === 12 ? v.slice(2) : v;
      if (/^[6-9]\d{9}$/.test(norm)) {
        if (phoneSeen.has(norm)) duplicatePhones++;
        else { phoneSeen.add(norm); validPhones++; }
      } else { invalidPhones++; }
    }
    markDone(1);

    // ── Step 3: distributions + numeric + date stats ──────────────────────
    setStatusMsg('Computing distributions and statistics...');
    await tick();

    // Detect column type for each header
    const columnTypes: Record<string, string> = {};
    for (const h of headers) {
      const hl = h.toLowerCase();
      if (/phone|mobile|whatsapp|contact|tel|ph\b|cell/.test(hl))    columnTypes[h] = 'phone';
      else if (/city|location|district|area|state|region|place|town|zone|taluka|mandal|tehsil|village|pincode/.test(hl)) columnTypes[h] = 'city';
      else if (/category|type|industry|sector|service|segment|product|group|class/.test(hl)) columnTypes[h] = 'category';
      else if (/amount|balance|revenue|value|price|cost|total|sum|fee|charge/.test(hl)) columnTypes[h] = 'value';
      else if (/date|time|created|joined|when|dob|birth/.test(hl))   columnTypes[h] = 'date';
      else if (/name|company|business|firm|customer|client|party/.test(hl)) columnTypes[h] = 'name';
      else if (/email|mail/.test(hl))                                columnTypes[h] = 'email';
      else if (/status|stage|pipeline|state|flag/.test(hl))          columnTypes[h] = 'status';
      else                                                            columnTypes[h] = 'text';
    }

    const cityCount: Record<string, number> = {};
    const catCount:  Record<string, number> = {};
    const colFill:   Record<string, number> = {};
    // For unique-value detection (categorical stats)
    const colValues: Record<string, Map<string, number>> = {};
    // For numeric stats
    const colNums:   Record<string, number[]> = {};
    // For date stats
    const colDates:  Record<string, Date[]> = {};

    for (const h of headers) {
      colFill[h] = 0;
      const t = columnTypes[h];
      if (t === 'value') colNums[h] = [];
      if (t === 'date')  colDates[h] = [];
      if (['category', 'status', 'text'].includes(t)) colValues[h] = new Map();
    }

    for (const row of rows) {
      for (const h of headers) {
        const v = row[h]?.trim() ?? '';
        if (v) {
          colFill[h]++;
          const t = columnTypes[h];
          if (t === 'value') {
            const num = Number(v.replace(/[,₹$\s]/g, ''));
            if (!isNaN(num) && num > 0) colNums[h].push(num);
          }
          if (t === 'date') {
            const d = new Date(v);
            if (!isNaN(d.getTime())) colDates[h].push(d);
          }
          if (colValues[h]) {
            colValues[h].set(v, (colValues[h].get(v) ?? 0) + 1);
          }
        }
      }
      for (const col of cityCols) { const c = row[col]?.trim(); if (c) cityCount[c] = (cityCount[c] ?? 0) + 1; }
      for (const col of catCols)  { const c = row[col]?.trim(); if (c) catCount[c]  = (catCount[c]  ?? 0) + 1; }
    }

    // Numeric stats per value column
    const numericStats: Record<string, NumericStat> = {};
    for (const [h, nums] of Object.entries(colNums)) {
      if (!nums.length) continue;
      const sum = nums.reduce((a, b) => a + b, 0);
      numericStats[h] = {
        min: Math.min(...nums),
        max: Math.max(...nums),
        mean: Math.round(sum / nums.length),
        sum: Math.round(sum),
        count: nums.length,
      };
    }

    // Categorical distributions: columns with 2–30 unique values
    const categoricalDistributions: Record<string, [string, number][]> = {};
    for (const [h, valMap] of Object.entries(colValues)) {
      if (valMap.size >= 2 && valMap.size <= 30) {
        categoricalDistributions[h] = Array.from(valMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15) as [string, number][];
      }
    }

    // Date range: pick the date column with most entries
    let dateRange: DataStats['dateRange'] = null;
    for (const [h, dates] of Object.entries(colDates)) {
      if (dates.length < 2) continue;
      dates.sort((a, b) => a.getTime() - b.getTime());
      dateRange = {
        column: h,
        earliest: dates[0].toLocaleDateString('en-IN'),
        latest: dates[dates.length - 1].toLocaleDateString('en-IN'),
      };
      break;
    }

    const stats: DataStats = {
      validPhones, invalidPhones, duplicatePhones,
      topCities: Object.entries(cityCount).sort((a, b) => b[1] - a[1]).slice(0, 15) as [string, number][],
      topCategories: Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 10) as [string, number][],
      columnCompleteness: headers.map(h => ({ column: h, filled: colFill[h], pct: n > 0 ? Math.round(colFill[h] / n * 100) : 0 })),
      columnTypes,
      numericStats,
      categoricalDistributions,
      dateRange,
    };
    setDataStats(stats);
    markDone(2);

    // ── Step 4: stratified sample ─────────────────────────────────────────
    setStatusMsg('Building representative sample...');
    await tick();

    // Group rows by top city or category; pick 2 from each group (max 20 rows)
    const groupCol = cityCols[0] ?? catCols[0];
    let sampleRows: Record<string, string>[];

    if (groupCol) {
      const groups: Record<string, Record<string, string>[]> = {};
      for (const row of rows) {
        const g = row[groupCol]?.trim() || '__other__';
        if (!groups[g]) groups[g] = [];
        groups[g].push(row);
      }
      const topGroups = Object.entries(groups)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 10);
      sampleRows = [];
      for (const [, grpRows] of topGroups) {
        sampleRows.push(grpRows[0]);
        if (grpRows.length > 1) sampleRows.push(grpRows[Math.floor(grpRows.length / 2)]);
        if (sampleRows.length >= 20) break;
      }
      // Fill remaining slots from start
      if (sampleRows.length < 10) sampleRows.push(...rows.slice(0, 10 - sampleRows.length));
    } else {
      sampleRows = rows.slice(0, 20);
    }

    markDone(3);

    if (abortRef.current) { setPhase('done'); return; }

    // ── Step 5: single AI call ────────────────────────────────────────────
    setStatusMsg('AI generating insights — keep this tab open...');

    const doRequest = () => fetch('/api/business/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: portal.companyId,
        fileName,
        totalRows: rowCount,
        headers,
        stats,
        sampleRows,
        userQuestion: question.trim() || undefined,
      }),
    });

    try {
      let res = await doRequest();

      if (res.status === 429) {
        const d = await res.json().catch(() => ({})) as { retryAfter?: number };
        const wait = (d.retryAfter ?? 30) * 1000;
        setStatusMsg(`Rate limited. Retrying in ${Math.round(wait / 1000)}s...`);
        await new Promise(r => setTimeout(r, wait));
        if (abortRef.current) { setPhase('done'); return; }
        setStatusMsg('AI generating insights...');
        res = await doRequest();
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { insights: FinalResult; analysisId?: string };
      setFinal(data.insights);
      markDone(4);
      if (data.analysisId) {
        setSavedId(data.analysisId);
        fetch('/api/business/analyze')
          .then(r => r.json())
          .then((d: { analyses?: SavedAnalysis[] }) => { if (d.analyses) setHistory(d.analyses); })
          .catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed — please try again.');
    }

    setPhase('done');
  };

  const reset = () => {
    abortRef.current = true;
    setPhase('idle'); setParsedFile(null); setDataStats(null); setFinal(null);
    setError(''); setQuestion(''); setSavedId(null); setWaResult(null); setWaError(''); setSteps([]);
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

  const buildContactData = () => {
    if (!parsedFile) return [];
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
      setWaError('No valid phone numbers found. Check that your file has a phone or mobile column.');
      setWaLaunching(false);
      return;
    }

    try {
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

      const launchRes = await fetch('/api/business/whatsapp/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: createData.campaign.id, contact_data: contacts }),
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
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Upload any CSV or Excel file. AI analyzes your data instantly and generates actionable insights.</p>
        </div>
        {phase !== 'idle' && (
          <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', fontSize: 13, color: '#6B7280', cursor: 'pointer' }}>
            <X size={13} /> Start over
          </button>
        )}
      </div>

      {/* IDLE */}
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
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 16px' }}>or click to browse</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              {['CSV', 'XLS', 'XLSX'].map(f => (
                <span key={f} style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid #E5E7EB', background: 'white', fontSize: 12, fontWeight: 600, color: '#374151' }}>{f}</span>
              ))}
            </div>
            <input id="ai-file-input" type="file" accept=".csv,.xls,.xlsx" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
          {parseError && <p style={{ marginTop: 10, fontSize: 13, color: '#DC2626' }}>{parseError}</p>}

          {history.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={11} /> Recent Analyses
              </p>
              {history.slice(0, 5).map(a => (
                <div key={a.id} style={{ ...card, marginBottom: 8, cursor: 'pointer', padding: '12px 16px' }} onClick={() => setExpandedHistory(expandedHistory === a.id ? null : a.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{a.file_name}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                        {a.total_rows.toLocaleString()} rows · {a.valid_phones.toLocaleString()} phones · {new Date(a.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight size={14} color="#9CA3AF" style={{ transform: expandedHistory === a.id ? 'rotate(90deg)' : undefined, transition: 'transform 0.2s', flexShrink: 0 }} />
                  </div>
                  {expandedHistory === a.id && a.executive_summary && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                      <p style={{ fontSize: 12, color: '#374151', margin: '0 0 8px', lineHeight: 1.6 }}>{a.executive_summary}</p>
                      {a.key_findings?.slice(0, 3).map((f, i) => (
                        <p key={i} style={{ fontSize: 11, color: '#6B7280', margin: '0 0 3px' }}>{i + 1}. {f}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* READY */}
      {phase === 'ready' && parsedFile && (
        <div style={{ maxWidth: 620 }}>
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileSpreadsheet size={22} color="#059669" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parsedFile.fileName}</p>
              <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                {parsedFile.rowCount.toLocaleString()} rows · {parsedFile.headers.length} columns · {parsedFile.fileType.toUpperCase()}
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
              All statistics are computed instantly in your browser. One AI call generates the final report — works on any file size, no timeouts.
            </p>
          </div>

          <button onClick={analyze} style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Sparkles size={17} /> Analyze with AI
          </button>
        </div>
      )}

      {/* ANALYZING */}
      {phase === 'analyzing' && (
        <div style={{ maxWidth: 620 }}>
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 1px' }}>{statusMsg}</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{parsedFile?.fileName} · {parsedFile?.rowCount.toLocaleString()} rows</p>
              </div>
              <button onClick={() => { abortRef.current = true; setPhase('done'); }} style={{ fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Cancel</button>
            </div>

            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                {step.done
                  ? <CheckCircle2 size={14} color="#059669" />
                  : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #E5E7EB', flexShrink: 0 }} />
                }
                <span style={{ fontSize: 12, color: step.done ? '#059669' : '#9CA3AF', fontWeight: step.done ? 600 : 400 }}>{step.label}</span>
              </div>
            ))}

            <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 11, color: '#92400E' }}>
              Keep this tab open while AI processes your data. Results are saved automatically.
            </div>
          </div>

          {dataStats && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div style={{ ...card, textAlign: 'center', padding: '14px 12px' }}>
                  <Phone size={15} color="#6366f1" style={{ marginBottom: 4 }} />
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 2px' }}>{dataStats.validPhones.toLocaleString()}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Valid phones</p>
                </div>
                <div style={{ ...card, textAlign: 'center', padding: '14px 12px' }}>
                  <MapPin size={15} color="#6366f1" style={{ marginBottom: 4 }} />
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 2px' }}>{dataStats.topCities.length}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Cities found</p>
                </div>
                <div style={{ ...card, textAlign: 'center', padding: '14px 12px' }}>
                  <BarChart3 size={15} color="#6366f1" style={{ marginBottom: 4 }} />
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 2px' }}>{dataStats.topCategories.length}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Categories</p>
                </div>
              </div>

              {dataStats.topCities.length > 0 && (
                <div style={{ ...card }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Top cities</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {dataStats.topCities.slice(0, 10).map(([c, n]) => (
                      <span key={c} style={{ padding: '3px 9px', borderRadius: 6, background: '#EEF2FF', fontSize: 12, color: '#4F46E5', fontWeight: 500 }}>{c} ({n})</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* DONE */}
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
              {parsedFile?.rowCount.toLocaleString()} rows analyzed
              {dataStats && ` · ${dataStats.validPhones.toLocaleString()} valid phones`}
              {extractedPhones > 0 && ` · ${extractedPhones} contacts ready`}
              {savedId && ' · Saved to history'}
            </span>
            <button onClick={exportTxt} disabled={!final} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, border: '1px solid #BBF7D0', background: 'white', fontSize: 12, fontWeight: 600, color: '#059669', cursor: final ? 'pointer' : 'not-allowed', opacity: final ? 1 : 0.5 }}>
              <Download size={12} /> Export
            </button>
          </div>

          {dataStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
              <div style={{ ...card, textAlign: 'center', padding: '14px 12px' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#6366f1', margin: '0 0 2px' }}>{dataStats.validPhones.toLocaleString()}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Valid phones</p>
                {dataStats.duplicatePhones > 0 && <p style={{ fontSize: 10, color: '#F59E0B', margin: '2px 0 0' }}>{dataStats.duplicatePhones} duplicates removed</p>}
              </div>
              <div style={{ ...card, textAlign: 'center', padding: '14px 12px' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#6366f1', margin: '0 0 2px' }}>{dataStats.topCities.length}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Cities</p>
                {dataStats.topCities[0] && <p style={{ fontSize: 10, color: '#6B7280', margin: '2px 0 0' }}>Top: {dataStats.topCities[0][0]}</p>}
              </div>
              <div style={{ ...card, textAlign: 'center', padding: '14px 12px' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#6366f1', margin: '0 0 2px' }}>{dataStats.invalidPhones}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Invalid phones</p>
                <p style={{ fontSize: 10, color: '#6B7280', margin: '2px 0 0' }}>{dataStats.columnCompleteness.length} columns scanned</p>
              </div>
            </div>
          )}

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

              <div style={{ background: 'white', border: '2px solid #22c55e', borderRadius: 14, padding: '20px 24px', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageCircle size={16} color="white" />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Launch WhatsApp Campaign</p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                      {extractedPhones > 0 ? `${extractedPhones} contacts with phone numbers ready` : 'No phone numbers detected - add a phone or mobile column'}
                    </p>
                  </div>
                </div>

                {waResult ? (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={16} color="#059669" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>
                      {waResult.queued} personalized messages queued. Your WhatsApp agent will send them shortly.
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
                          Variables: <code style={{ fontWeight: 400, background: '#F3F4F6', padding: '0 4px', borderRadius: 3, fontSize: 11 }}>{'{{name}}'}</code>{' '}
                          <code style={{ fontWeight: 400, background: '#F3F4F6', padding: '0 4px', borderRadius: 3, fontSize: 11 }}>{'{{city}}'}</code>
                        </label>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>Auto-replaced per contact</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Message</label>
                      <textarea
                        value={waMsg}
                        onChange={e => setWaMsg(e.target.value)}
                        rows={4}
                        placeholder={`Hi {{name}}, we have a special offer for you. Reply YES to learn more.`}
                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#111827', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
                      />
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>
                        {waMsg.length} chars
                      </p>
                    </div>
                    {waError && <p style={{ fontSize: 12, color: '#DC2626', margin: '0 0 10px' }}>{waError}</p>}
                    <button
                      onClick={launchWhatsApp}
                      disabled={waLaunching || !waMsg.trim()}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, border: 'none', background: '#22c55e', color: 'white', fontSize: 14, fontWeight: 700, cursor: waLaunching || !waMsg.trim() ? 'not-allowed' : 'pointer', opacity: waLaunching || !waMsg.trim() ? 0.6 : 1 }}
                    >
                      <Send size={15} />
                      {waLaunching ? 'Launching...' : `Send to ${extractedPhones} contacts`}
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
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
