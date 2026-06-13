'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X, Upload, FileSpreadsheet, ChevronRight, CheckCircle2,
  AlertTriangle, Download, Send, Zap, RefreshCw, TriangleAlert,
} from 'lucide-react';
import {
  parseFile,
  autoMapHeaders,
  LEAD_FIELDS,
  generateCsvTemplate,
  extractPhones,
  type ParsedFile,
} from '@/lib/import/fileParser';

// ─── Types ──────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'parsing' | 'mapping' | 'uploading' | 'done';

interface UploadProgress {
  processed: number;
  total: number;
  imported: number;
  skipped: number;
  failed: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  phones: string[];
}

export interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiEndpoint: string;
  extraPayload?: Record<string, unknown>;
  onSuccess?: (result: ImportResult) => void;
  // if provided, show WhatsApp automation option after import
  enableWhatsApp?: boolean;
  sourceLabel?: string;
}

const CHUNK_SIZE = 300;
const PREVIEW_ROWS = 8;
const MAX_FILE_MB = 200;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('en-IN');
}

function fileSizeMb(file: File) {
  return (file.size / 1024 / 1024).toFixed(1);
}

function mapRows(
  rows: Record<string, string>[],
  mapping: Record<string, string>
): Record<string, string>[] {
  return rows.map((row) => {
    const out: Record<string, string> = {};
    for (const [col, field] of Object.entries(mapping)) {
      if (field && row[col] !== undefined && row[col] !== '') {
        out[field] = row[col];
      }
    }
    return out;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
      background: color + '22', color, letterSpacing: '0.04em',
    }}>
      {label}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ height: 6, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.max(0, Math.min(100, value))}%`,
        background: 'linear-gradient(90deg,#16a34a,#4ade80)',
        borderRadius: 99, transition: 'width 0.3s ease',
      }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ImportModal({
  isOpen,
  onClose,
  apiEndpoint,
  extraPayload = {},
  onSuccess,
  enableWhatsApp = false,
  sourceLabel = 'csv_import',
}: ImportModalProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<UploadProgress>({ processed: 0, total: 0, imported: 0, skipped: 0, failed: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState('');

  // WhatsApp automation state
  const [waMessage, setWaMessage] = useState('');
  const [waLaunching, setWaLaunching] = useState(false);
  const [waResult, setWaResult] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    setPhase('idle');
    setParsed(null);
    setMapping({});
    setProgress({ processed: 0, total: 0, imported: 0, skipped: 0, failed: 0 });
    setResult(null);
    setParseError('');
    setWaMessage('');
    setWaLaunching(false);
    setWaResult(null);
    abortRef.current = false;
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // ── File handling ────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setParseError('');

    const sizeMb = file.size / 1024 / 1024;
    if (sizeMb > MAX_FILE_MB) {
      setParseError(`File is ${fileSizeMb(file)} MB — maximum is ${MAX_FILE_MB} MB. Split the file into smaller parts.`);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const supported = ['csv', 'xlsx', 'xls', 'tsv', 'ods'];
    if (!ext || !supported.includes(ext)) {
      setParseError(`Unsupported format ".${ext}". Upload a CSV or Excel file.`);
      return;
    }

    setPhase('parsing');
    try {
      const data = await parseFile(file);
      if (!data.headers.length) {
        setParseError('Could not detect any columns. Make sure the first row is a header row.');
        setPhase('idle');
        return;
      }
      setParsed(data);
      setMapping(autoMapHeaders(data.headers));
      setPhase('mapping');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file');
      setPhase('idle');
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Upload ───────────────────────────────────────────────────────────────
  const startUpload = useCallback(async () => {
    if (!parsed) return;
    abortRef.current = false;

    const mappedRows = mapRows(parsed.rows, mapping);
    const phones = extractPhones(parsed.rows, mapping);
    const total = mappedRows.length;

    setPhase('uploading');
    setProgress({ processed: 0, total, imported: 0, skipped: 0, failed: 0 });

    let imported = 0, skipped = 0, failed = 0;

    for (let i = 0; i < mappedRows.length; i += CHUNK_SIZE) {
      if (abortRef.current) break;

      const chunk = mappedRows.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leads: chunk, source: sourceLabel, ...extraPayload }),
          signal: AbortSignal.timeout(60_000),
        });
        const json = await res.json();
        if (json.success !== false) {
          imported += json.imported ?? chunk.length;
          skipped  += json.skipped  ?? 0;
          failed   += json.failed   ?? 0;
        } else {
          failed += chunk.length;
        }
      } catch {
        failed += chunk.length;
      }

      setProgress({
        processed: Math.min(i + CHUNK_SIZE, total),
        total, imported, skipped, failed,
      });
    }

    const finalResult = { imported, skipped, failed, phones };
    setResult(finalResult);
    setPhase('done');
    onSuccess?.(finalResult);
  }, [parsed, mapping, apiEndpoint, extraPayload, sourceLabel, onSuccess]);

  // ── WhatsApp automation ───────────────────────────────────────────────────
  const launchWhatsApp = useCallback(async () => {
    if (!result?.phones.length || !waMessage.trim()) return;
    setWaLaunching(true);
    try {
      // Create campaign
      const createRes = await fetch('/api/business/whatsapp/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Import blast — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
          custom_message: waMessage,
          target_type: 'manual',
          target_manual_numbers: result.phones,
        }),
      });
      const createData = await createRes.json();
      if (createData.error) throw new Error(createData.error);

      // Launch it
      const launchRes = await fetch('/api/business/whatsapp/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: createData.campaign.id }),
      });
      const launchData = await launchRes.json();
      if (launchData.error) throw new Error(launchData.error);

      setWaResult(`WhatsApp campaign queued for ${launchData.queued} contacts.`);
    } catch (err) {
      setWaResult(`Error: ${err instanceof Error ? err.message : 'Launch failed'}`);
    } finally {
      setWaLaunching(false);
    }
  }, [result, waMessage]);

  // ── Download template ────────────────────────────────────────────────────
  const downloadTemplate = useCallback(() => {
    const csv = generateCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'leads_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const pct = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;
  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const phoneCount = result?.phones.length ?? 0;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 740,
        maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
      }}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: '#F0FDF4',
            border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileSpreadsheet size={18} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Import contacts</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>CSV, XLSX, XLS — up to {MAX_FILE_MB} MB</div>
          </div>

          {/* Phase breadcrumb */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {(['idle', 'mapping', 'uploading', 'done'] as const).map((p, i) => {
              const labels: Record<string, string> = { idle: 'File', mapping: 'Map', uploading: 'Upload', done: 'Done' };
              const active = phase === p || (phase === 'parsing' && p === 'idle');
              const done = ['idle', 'parsing'].indexOf(phase) < 0 &&
                (['mapping', 'uploading', 'done'].indexOf(p) < ['mapping', 'uploading', 'done'].indexOf(phase));
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && <ChevronRight size={12} color="#D1D5DB" />}
                  <span style={{
                    fontSize: 11, fontWeight: active ? 700 : 500,
                    color: done ? '#16a34a' : active ? '#111' : '#9CA3AF',
                  }}>
                    {done ? <CheckCircle2 size={12} color="#16a34a" style={{ display: 'inline', verticalAlign: 'middle' }} /> : null}
                    {' '}{labels[p]}
                  </span>
                </div>
              );
            })}
          </div>

          <button onClick={handleClose} style={{
            padding: 6, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff',
            cursor: 'pointer', display: 'flex', marginLeft: 8,
          }}>
            <X size={15} color="#6B7280" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* ─── IDLE / DROP ZONE ─────────────────────────────────────── */}
          {(phase === 'idle' || phase === 'parsing') && (
            <div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #D1D5DB', borderRadius: 14, padding: '52px 24px',
                  textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s',
                  background: phase === 'parsing' ? '#F9FAFB' : '#fff',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#16a34a')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#D1D5DB')}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv,.ods"
                  style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                {phase === 'parsing' ? (
                  <>
                    <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#16a34a', borderRadius: '50%', margin: '0 auto 14px', animation: 'imp-spin 0.8s linear infinite' }} />
                    <style>{`@keyframes imp-spin{to{transform:rotate(360deg)}}`}</style>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#374151' }}>Reading file…</div>
                  </>
                ) : (
                  <>
                    <Upload size={40} color="#9CA3AF" style={{ margin: '0 auto 14px' }} />
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Drop your file here</div>
                    <div style={{ color: '#6B7280', fontSize: 13, marginBottom: 18 }}>
                      or click to browse — CSV, XLSX, XLS, ODS supported
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {['CSV', 'XLSX', 'XLS', 'ODS'].map(f => (
                        <span key={f} style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>.{f.toLowerCase()}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {parseError && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, color: '#DC2626', fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <TriangleAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  {parseError}
                </div>
              )}

              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                  Not sure about the format?
                </div>
                <button onClick={downloadTemplate}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#374151', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Download size={13} />Download template
                </button>
              </div>
            </div>
          )}

          {/* ─── MAPPING ──────────────────────────────────────────────── */}
          {phase === 'mapping' && parsed && (
            <div>
              {/* File summary */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10 }}>
                <FileSpreadsheet size={18} color="#16a34a" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{parsed.fileName}</span>
                  <span style={{ color: '#6B7280', fontSize: 13, marginLeft: 12 }}>
                    {fmt(parsed.rowCount)} rows · {parsed.headers.length} columns · {parsed.fileType.toUpperCase()}
                  </span>
                </div>
                <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Column mapping table */}
              <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Map columns</div>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{mappedCount} of {parsed.headers.length} mapped</span>
              </div>

              <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', width: '34%' }}>Your column</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', width: '32%' }}>Maps to</th>
                      <th style={{ padding: '10px 4px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.headers.map((header, i) => {
                      const sampleValues = parsed.rows.slice(0, PREVIEW_ROWS).map(r => r[header]).filter(Boolean);
                      const preview = sampleValues[0] || '—';
                      const isMapped = !!mapping[header];
                      const isImportant = LEAD_FIELDS.find(f => f.value === mapping[header])?.important;
                      return (
                        <tr key={header} style={{ borderBottom: i < parsed.headers.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: isMapped ? '#16a34a' : '#D1D5DB', flexShrink: 0 }} />
                              <code style={{ fontSize: 12, background: '#F3F4F6', padding: '2px 6px', borderRadius: 4 }}>{header}</code>
                              {isImportant && <Pill label="KEY" color="#7c3aed" />}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <select
                              value={mapping[header] ?? ''}
                              onChange={(e) => setMapping(m => ({ ...m, [header]: e.target.value }))}
                              style={{ padding: '5px 8px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', width: '100%' }}
                            >
                              {LEAD_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '10px 4px', color: '#9CA3AF', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {preview}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Data preview */}
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#374151' }}>
                Data preview <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(first {Math.min(PREVIEW_ROWS, parsed.rowCount)} rows)</span>
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 10, marginBottom: 4 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      {parsed.headers.map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: mapping[h] ? '#15803d' : '#9CA3AF', whiteSpace: 'nowrap', fontSize: 11 }}>
                          {mapping[h] ? LEAD_FIELDS.find(f => f.value === mapping[h])?.label ?? mapping[h] : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                      <tr key={i} style={{ borderBottom: i < Math.min(PREVIEW_ROWS, parsed.rowCount) - 1 ? '1px solid #F3F4F6' : 'none' }}>
                        {parsed.headers.map(h => (
                          <td key={h} style={{ padding: '7px 12px', color: row[h] ? '#111' : '#D1D5DB', whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row[h] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rowCount > PREVIEW_ROWS && (
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                  + {fmt(parsed.rowCount - PREVIEW_ROWS)} more rows not shown
                </div>
              )}
            </div>
          )}

          {/* ─── UPLOADING ────────────────────────────────────────────── */}
          {phase === 'uploading' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F0FDF4', border: '2px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <RefreshCw size={24} color="#16a34a" style={{ animation: 'imp-spin 1.2s linear infinite' }} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Importing contacts…</div>
                <div style={{ color: '#6B7280', fontSize: 13 }}>
                  {fmt(progress.processed)} of {fmt(progress.total)} rows processed
                </div>
              </div>
              <ProgressBar value={pct} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 20 }}>
                {[
                  { label: 'Imported', value: progress.imported, color: '#16a34a' },
                  { label: 'Skipped', value: progress.skipped, color: '#f59e0b' },
                  { label: 'Failed', value: progress.failed, color: '#DC2626' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', background: '#F9FAFB', borderRadius: 10, padding: '14px 10px' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{fmt(s.value)}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                Uploading in batches of {CHUNK_SIZE} · Duplicates skipped automatically
              </div>
            </div>
          )}

          {/* ─── DONE ─────────────────────────────────────────────────── */}
          {phase === 'done' && result && (
            <div>
              {/* Results */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F0FDF4', border: '2px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <CheckCircle2 size={28} color="#16a34a" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Import complete</div>
                <div style={{ color: '#6B7280', fontSize: 13 }}>
                  {fmt(result.imported + result.skipped + result.failed)} rows processed
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
                {[
                  { label: 'Imported', value: result.imported, color: '#16a34a', bg: '#F0FDF4', border: '#BBF7D0' },
                  { label: 'Skipped', value: result.skipped, color: '#d97706', bg: '#FFFBEB', border: '#FDE68A' },
                  { label: 'Failed', value: result.failed, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '18px 10px' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{fmt(s.value)}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: s.color, opacity: 0.75, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {result.skipped > 0 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 9, marginBottom: 20, fontSize: 12, color: '#92400e' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {fmt(result.skipped)} rows were skipped — likely duplicate emails already in the system.
                </div>
              )}

              {/* WhatsApp Automation */}
              {enableWhatsApp && phoneCount > 0 && (
                <div style={{ border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={16} color="#16a34a" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Launch WhatsApp campaign</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>
                        {fmt(phoneCount)} imported contacts have phone numbers
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    {waResult ? (
                      <div style={{
                        padding: '10px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                        background: waResult.startsWith('Error') ? '#FEF2F2' : '#F0FDF4',
                        color: waResult.startsWith('Error') ? '#DC2626' : '#15803d',
                        border: `1px solid ${waResult.startsWith('Error') ? '#FECACA' : '#BBF7D0'}`,
                      }}>
                        {waResult}
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={waMessage}
                          onChange={(e) => setWaMessage(e.target.value)}
                          placeholder={`Hi, we just updated our records. We would love to connect with you regarding your needs. — [Your Business]`}
                          rows={4}
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }}
                        />
                        <button
                          onClick={launchWhatsApp}
                          disabled={waLaunching || !waMessage.trim()}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                            borderRadius: 9, border: 'none', background: '#16a34a', color: '#fff',
                            fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                            opacity: (waLaunching || !waMessage.trim()) ? 0.55 : 1,
                          }}
                        >
                          <Send size={14} />
                          {waLaunching ? 'Launching…' : `Send to ${fmt(phoneCount)} contacts`}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {enableWhatsApp && phoneCount === 0 && (
                <div style={{ padding: '12px 16px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#6B7280' }}>
                  No phone numbers detected in the imported data — map the &quot;Phone&quot; column to enable WhatsApp automation.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {(phase === 'mapping' || phase === 'done') && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #E5E7EB', flexShrink: 0,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          }}>
            {phase === 'mapping' ? (
              <>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {fmt(parsed?.rowCount ?? 0)} rows will be uploaded in batches of {CHUNK_SIZE}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={reset}
                    style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Change file
                  </button>
                  <button
                    onClick={startUpload}
                    disabled={mappedCount === 0}
                    style={{
                      padding: '10px 24px', borderRadius: 9, border: 'none', background: '#16a34a',
                      color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                      opacity: mappedCount === 0 ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <Upload size={15} />
                    Import {fmt(parsed?.rowCount ?? 0)} rows
                  </button>
                </div>
              </>
            ) : (
              <>
                <button onClick={reset}
                  style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Import another file
                </button>
                <button onClick={handleClose}
                  style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: '#111', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Done
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
