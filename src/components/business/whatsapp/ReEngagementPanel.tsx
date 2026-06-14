'use client';

import { useState } from 'react';
import { RefreshCw, MessageCircle, Users, CheckCircle2, AlertCircle } from 'lucide-react';

interface ColdLead {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  service_category: string | null;
  last_contacted_at: string | null;
}

export default function ReEngagementPanel({ companyId }: { companyId: string }) {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ leads: ColdLead[]; total: number; draftMessage: string } | null>(null);
  const [message, setMessage] = useState('');
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState<{ queued: number } | null>(null);
  const [error, setError] = useState('');

  const find = async () => {
    setLoading(true); setData(null); setResult(null); setError('');
    try {
      const res = await fetch(`/api/business/leads/cold?days=${days}`);
      const d = await res.json() as typeof data;
      setData(d);
      setMessage(d?.draftMessage ?? '');
    } catch { setError('Failed to fetch cold leads'); } finally { setLoading(false); }
  };

  const launch = async () => {
    if (!message.trim() || !data?.total) return;
    setLaunching(true); setError('');
    try {
      const res = await fetch('/api/business/leads/cold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, message, campaign_name: `Re-engage ${days}d cold — ${new Date().toLocaleDateString('en-IN')}` }),
      });
      const d = await res.json() as { queued?: number; error?: string };
      if (d.error) throw new Error(d.error);
      setResult({ queued: d.queued ?? 0 });
    } catch (e) { setError(e instanceof Error ? e.message : 'Launch failed'); } finally { setLaunching(false); }
  };

  const card: React.CSSProperties = { background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px' };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', maxWidth: 680 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 3px' }}>Re-engagement Automation</h2>
        <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>AI finds cold leads and drafts a personalized re-engagement WhatsApp message</p>
      </div>

      {/* Config */}
      <div style={{ ...card, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Cold after</label>
          <input
            type="number" min={7} max={365} value={days}
            onChange={e => setDays(parseInt(e.target.value, 10) || 30)}
            style={{ width: 64, padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, outline: 'none' }}
          />
          <span style={{ fontSize: 13, color: '#6B7280' }}>days without contact</span>
        </div>
        <button
          onClick={find}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Users size={13} />}
          {loading ? 'Scanning…' : 'Find Cold Leads'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={13} color="#EF4444" />
          <span style={{ fontSize: 12, color: '#DC2626' }}>{error}</span>
        </div>
      )}

      {data && (
        <>
          {/* Stats */}
          <div style={{ background: data.total > 0 ? '#FFF7ED' : '#F0FDF4', border: `1px solid ${data.total > 0 ? '#FED7AA' : '#BBF7D0'}`, borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={14} color={data.total > 0 ? '#D97706' : '#059669'} />
            <span style={{ fontSize: 13, fontWeight: 600, color: data.total > 0 ? '#92400E' : '#059669' }}>
              {data.total > 0
                ? `${data.total} leads haven't been contacted in ${days}+ days`
                : `All leads contacted within ${days} days — no re-engagement needed`}
            </span>
          </div>

          {data.total > 0 && !result && (
            <>
              {/* Preview leads */}
              <div style={{ ...card, marginBottom: 14, maxHeight: 200, overflowY: 'auto' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Cold leads preview</p>
                {data.leads.slice(0, 10).map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280' }}>{l.name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                        {l.city ?? ''}{l.city && l.service_category ? ' · ' : ''}{l.service_category ?? ''}
                        {l.last_contacted_at
                          ? ` · Last: ${Math.floor((Date.now() - new Date(l.last_contacted_at).getTime()) / 86_400_000)}d ago`
                          : ' · Never contacted'}
                      </p>
                    </div>
                  </div>
                ))}
                {data.leads.length > 10 && <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>…and {data.leads.length - 10} more</p>}
              </div>

              {/* AI-drafted message */}
              <div style={{ ...card, marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  AI-drafted message <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(edit before sending)</span>
                </p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#111827', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>
                  {'{{name}}'} is replaced per contact · {message.length} chars
                </p>
              </div>

              <button
                onClick={launch}
                disabled={launching || !message.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 10, border: 'none', background: '#22c55e', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: launching ? 0.6 : 1 }}
              >
                <MessageCircle size={15} />
                {launching ? 'Launching…' : `Re-engage ${data.total} contacts`}
              </button>
            </>
          )}

          {result && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={16} color="#059669" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>
                {result.queued} personalized messages queued! Your WhatsApp agent will send them shortly.
              </span>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
