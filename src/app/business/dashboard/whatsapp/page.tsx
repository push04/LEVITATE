'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import BusinessPortalLocked from '@/components/business/BusinessPortalLocked';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, Clock, CheckCircle2, XCircle,
  RefreshCw, X, Plus, Megaphone, FileText, Wifi, WifiOff,
  RotateCcw, Activity, Users, ChevronRight, Trash2,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface QueueMsg {
  id: string;
  to_number: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string | null;
  contact_name?: string | null;
  campaign_id?: string | null;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  reply_count: number;
  custom_message: string | null;
  target_type: string;
  target_manual_numbers: string[];
  target_lead_ids: string[];
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  body: string;
  category: string;
  created_at: string;
}

const TABS = ['Overview', 'Send', 'Campaigns', 'Templates'] as const;
type Tab = typeof TABS[number];

const STATUS_PILL: Record<string, string> = {
  sent:    'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  failed:  'bg-red-50 text-red-700 border-red-200',
};

const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  draft:     '#9CA3AF',
  scheduled: '#818cf8',
  running:   '#f59e0b',
  completed: '#4ade80',
  failed:    '#f87171',
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const portal = useCompanyPortalState();
  const [tab, setTab] = useState<Tab>('Overview');
  const [queue, setQueue] = useState<QueueMsg[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [daemonOnline, setDaemonOnline] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  // Send form
  const [sendNumber, setSendNumber] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendName, setSendName] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(null);

  // Campaign builder
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '', custom_message: '',
    target_type: 'manual' as 'manual' | 'leads',
    target_manual_numbers: '',
  });
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  // Template builder
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', body: '', category: 'outreach' });
  const [templateSaving, setTemplateSaving] = useState(false);

  const stats = {
    pending: queue.filter(m => m.status === 'pending').length,
    sent:    queue.filter(m => m.status === 'sent').length,
    failed:  queue.filter(m => m.status === 'failed').length,
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, cRes, tRes] = await Promise.all([
        fetch('/api/business/whatsapp/queue'),
        fetch('/api/business/whatsapp/campaigns'),
        fetch('/api/business/whatsapp/templates'),
      ]);
      const [qData, cData, tData] = await Promise.all([qRes.json(), cRes.json(), tRes.json()]);
      setQueue(qData.queue ?? []);
      setCampaigns(cData.campaigns ?? []);
      setTemplates(tData.templates ?? []);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkDaemon = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3005/api/status', { signal: AbortSignal.timeout(3000) });
      setDaemonOnline(res.ok);
    } catch {
      setDaemonOnline(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    checkDaemon();
  }, [loadData, checkDaemon]);

  const handleSend = async () => {
    if (!sendNumber.trim() || !sendMessage.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/business/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_number: sendNumber.trim(), message: sendMessage.trim(), contact_name: sendName.trim() || null }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSendResult('success');
      setSendNumber('');
      setSendMessage('');
      setSendName('');
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
      setSendResult('error');
    } finally {
      setSending(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim() || !newCampaign.custom_message.trim()) return;
    setCampaignSaving(true);
    try {
      const numbers = newCampaign.target_manual_numbers.split('\n').map(n => n.trim()).filter(Boolean);
      const res = await fetch('/api/business/whatsapp/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCampaign.name,
          custom_message: newCampaign.custom_message,
          target_type: newCampaign.target_type,
          target_manual_numbers: newCampaign.target_type === 'manual' ? numbers : [],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCampaigns(prev => [data.campaign, ...prev]);
      setShowCampaignForm(false);
      setNewCampaign({ name: '', custom_message: '', target_type: 'manual', target_manual_numbers: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create campaign');
    } finally {
      setCampaignSaving(false);
    }
  };

  const handleLaunchCampaign = async (id: string) => {
    setLaunchingId(id);
    try {
      const res = await fetch('/api/business/whatsapp/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Launch failed');
    } finally {
      setLaunchingId(null);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.body.trim()) return;
    setTemplateSaving(true);
    try {
      const vars = (newTemplate.body.match(/\{\{(\w+)\}\}/g) ?? []).map(v => v.replace(/[{}]/g, ''));
      const res = await fetch('/api/business/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTemplate, variables: vars }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTemplates(prev => [data.template, ...prev]);
      setShowTemplateForm(false);
      setNewTemplate({ name: '', body: '', category: 'outreach' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create template');
    } finally {
      setTemplateSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    await fetch('/api/business/whatsapp/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  if (!portal.loading && !portal.featureAccess.whatsapp) {
    return <BusinessPortalLocked featureName="WhatsApp" />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={18} color="#16a34a" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#111' }}>WhatsApp Outreach</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>Campaigns and messaging via shared admin bridge</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: daemonOnline === null ? '#F9FAFB' : daemonOnline ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${daemonOnline ? '#BBF7D0' : daemonOnline === null ? '#E5E7EB' : '#FECACA'}`, borderRadius: 99, padding: '4px 12px' }}>
              {daemonOnline ? <Wifi size={12} color="#16a34a" /> : <WifiOff size={12} color={daemonOnline === null ? '#9CA3AF' : '#DC2626'} />}
              <span style={{ fontSize: 12, fontWeight: 600, color: daemonOnline ? '#16a34a' : daemonOnline === null ? '#9CA3AF' : '#DC2626' }}>
                {daemonOnline === null ? 'Checking…' : daemonOnline ? 'Bridge online' : 'Bridge offline'}
              </span>
            </div>
            <button onClick={() => { loadData(); checkDaemon(); }} style={{ padding: '6px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <RefreshCw size={14} color="#6B7280" />
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ margin: '12px 28px 0', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 28px', display: 'flex', gap: 0 }}>
        {TABS.map(t => {
          const icons: Record<Tab, React.ReactNode> = {
            Overview: <Activity size={13} />,
            Send: <Send size={13} />,
            Campaigns: <Megaphone size={13} />,
            Templates: <FileText size={13} />,
          };
          return (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '12px 18px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#16a34a' : 'transparent'}`, color: tab === t ? '#15803d' : '#6B7280', fontWeight: tab === t ? 700 : 500, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              {icons[t]}{t}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#9CA3AF' }}>
          <div style={{ width: 20, height: 20, border: '2px solid #E5E7EB', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'wa-spin 0.8s linear infinite' }} />
          <style>{`@keyframes wa-spin{to{transform:rotate(360deg)}}`}</style>
          Loading…
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ padding: '28px' }}>

            {/* ── OVERVIEW ────────────────────────────────────────── */}
            {tab === 'Overview' && (
              <div style={{ maxWidth: 860 }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
                  {[
                    { label: 'Pending', value: stats.pending, cls: '#92400e', bg: '#FEF3C7', border: '#FDE68A' },
                    { label: 'Sent',    value: stats.sent,    cls: '#166534', bg: '#F0FDF4', border: '#BBF7D0' },
                    { label: 'Failed',  value: stats.failed,  cls: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: s.cls, tabularNums: true } as React.CSSProperties}>{s.value}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: s.cls, opacity: 0.7, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Daemon status */}
                {!daemonOnline && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <WifiOff size={18} color="#D97706" style={{ marginTop: 1, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 4 }}>WhatsApp bridge is offline</div>
                        <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
                          Messages are queued and will be sent automatically when the admin starts the local daemon.
                          Contact your admin if urgent.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Queue list */}
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Your message queue</span>
                    <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{queue.length}</span>
                    <button onClick={loadData} style={{ marginLeft: 'auto', padding: 6, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex' }}>
                      <RefreshCw size={13} color="#6B7280" />
                    </button>
                  </div>
                  {queue.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                      No messages queued yet. Use the Send tab or launch a campaign.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                            {['Number', 'Contact', 'Message', 'Status', 'Queued'].map(h => (
                              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queue.map((m, i) => (
                            <tr key={m.id} style={{ borderBottom: i < queue.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                              <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12 }}>{m.to_number}</td>
                              <td style={{ padding: '10px 16px', color: '#374151' }}>{m.contact_name ?? '—'}</td>
                              <td style={{ padding: '10px 16px', color: '#6B7280', maxWidth: 240 }}>
                                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.message}>{m.message}</span>
                                {m.error && <span style={{ display: 'block', color: '#DC2626', fontSize: 11 }}>{m.error}</span>}
                              </td>
                              <td style={{ padding: '10px 16px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, border: '1px solid', ...(() => {
                                  const c: Record<string, { background: string; color: string; borderColor: string }> = {
                                    sent:    { background: '#F0FDF4', color: '#15803d', borderColor: '#BBF7D0' },
                                    pending: { background: '#FFFBEB', color: '#92400e', borderColor: '#FDE68A' },
                                    failed:  { background: '#FEF2F2', color: '#991b1b', borderColor: '#FECACA' },
                                  };
                                  return c[m.status] ?? c.pending;
                                })() }}>
                                  {m.status === 'sent' && <CheckCircle2 size={10} />}
                                  {m.status === 'pending' && <Clock size={10} />}
                                  {m.status === 'failed' && <XCircle size={10} />}
                                  {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                                </span>
                              </td>
                              <td style={{ padding: '10px 16px', color: '#9CA3AF', fontSize: 11, whiteSpace: 'nowrap' }}>
                                {new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SEND ────────────────────────────────────────────── */}
            {tab === 'Send' && (
              <div style={{ maxWidth: 520 }}>
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '24px 28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Send size={16} color="#16a34a" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>Send message</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>Queued via shared admin bridge</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone number</span>
                      <input value={sendNumber} onChange={e => setSendNumber(e.target.value)}
                        placeholder="+919999999999"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 14, fontFamily: 'monospace', outline: 'none' }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact name <span style={{ color: '#9CA3AF', fontWeight: 400, textTransform: 'none' }}>(optional)</span></span>
                      <input value={sendName} onChange={e => setSendName(e.target.value)}
                        placeholder="John Doe"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message</span>
                      <textarea value={sendMessage} onChange={e => setSendMessage(e.target.value)} rows={5}
                        placeholder="Type your message…"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                    </label>

                    {sendResult === 'success' && (
                      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={14} />
                        Message queued successfully
                      </div>
                    )}

                    <button onClick={handleSend} disabled={sending || !sendNumber.trim() || !sendMessage.trim()}
                      style={{ padding: '12px 20px', borderRadius: 9, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: (sending || !sendNumber.trim() || !sendMessage.trim()) ? 0.55 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Send size={15} />
                      {sending ? 'Queuing…' : 'Queue message'}
                    </button>
                  </div>
                </div>

                {/* Templates shortcut */}
                {templates.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Use a template</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {templates.map(t => (
                        <button key={t.id} onClick={() => setSendMessage(t.body)}
                          style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <FileText size={14} color="#6B7280" style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>{t.name}</div>
                            <div style={{ fontSize: 12, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.body}</div>
                          </div>
                          <ChevronRight size={14} color="#D1D5DB" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CAMPAIGNS ───────────────────────────────────────── */}
            {tab === 'Campaigns' && (
              <div style={{ maxWidth: 860 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#111' }}>Outreach campaigns</div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Send bulk WhatsApp messages to your contacts</div>
                  </div>
                  <button onClick={() => setShowCampaignForm(true)}
                    style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={14} />New campaign
                  </button>
                </div>

                {campaigns.length === 0 ? (
                  <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '60px 20px', textAlign: 'center' }}>
                    <Megaphone size={36} color="#D1D5DB" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No campaigns yet</div>
                    <div style={{ color: '#6B7280', fontSize: 13, marginBottom: 20 }}>Create a campaign to reach multiple contacts at once</div>
                    <button onClick={() => setShowCampaignForm(true)}
                      style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Create campaign
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {campaigns.map(c => (
                      <div key={c.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: CAMPAIGN_STATUS_COLORS[c.status] ?? '#9CA3AF', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                            {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            {' · '}
                            {c.target_type === 'manual' ? `${c.target_manual_numbers?.length ?? 0} numbers` : `${c.target_lead_ids?.length ?? 0} leads`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                          {[
                            { l: 'Recipients', v: c.total_recipients },
                            { l: 'Sent', v: c.sent_count },
                          ].map(s => (
                            <div key={s.l} style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: 800, fontSize: 17 }}>{s.v}</div>
                              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{s.l}</div>
                            </div>
                          ))}
                        </div>
                        <span style={{ background: CAMPAIGN_STATUS_COLORS[c.status] + '22', color: CAMPAIGN_STATUS_COLORS[c.status], borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize', flexShrink: 0 }}>
                          {c.status}
                        </span>
                        {(c.status === 'draft') && (
                          <button onClick={() => handleLaunchCampaign(c.id)} disabled={launchingId === c.id}
                            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', opacity: launchingId === c.id ? 0.6 : 1 }}>
                            {launchingId === c.id ? 'Launching…' : 'Launch'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Campaign form modal */}
                <AnimatePresence>
                  {showCampaignForm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ position: 'fixed', inset: 0, background: '#0006', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                      onClick={e => { if (e.target === e.currentTarget) setShowCampaignForm(false); }}>
                      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
                        style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 520, width: '100%', boxShadow: '0 20px 60px #0003' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>New campaign</h3>
                          <button onClick={() => setShowCampaignForm(false)} style={{ padding: 6, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex' }}>
                            <X size={14} color="#6B7280" />
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campaign name</span>
                            <input value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))}
                              placeholder="e.g. March follow-up"
                              style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message</span>
                            <span style={{ fontSize: 11, color: '#6B7280' }}>Use {'{{'} name {'}}'}, {'{{'} company {'}}'} as placeholders</span>
                            <textarea value={newCampaign.custom_message} onChange={e => setNewCampaign(p => ({ ...p, custom_message: e.target.value }))}
                              placeholder="Hi, this is from [your business]…" rows={5}
                              style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {(['manual', 'leads'] as const).map(t => (
                                <button key={t} onClick={() => setNewCampaign(p => ({ ...p, target_type: t }))}
                                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1.5px solid ${newCampaign.target_type === t ? '#16a34a' : '#D1D5DB'}`, background: newCampaign.target_type === t ? '#F0FDF4' : '#fff', color: newCampaign.target_type === t ? '#15803d' : '#6B7280', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {t === 'manual' ? 'Manual numbers' : 'CRM leads'}
                                </button>
                              ))}
                            </div>
                          </label>
                          {newCampaign.target_type === 'manual' && (
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone numbers <span style={{ color: '#9CA3AF', fontWeight: 400, textTransform: 'none' }}>(one per line, with country code)</span></span>
                              <textarea value={newCampaign.target_manual_numbers} onChange={e => setNewCampaign(p => ({ ...p, target_manual_numbers: e.target.value }))}
                                placeholder={"+919876543210\n+919012345678"} rows={4}
                                style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 13, fontFamily: 'monospace', outline: 'none', resize: 'vertical' }} />
                            </label>
                          )}
                        </div>
                        <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button onClick={() => setShowCampaignForm(false)}
                            style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Cancel
                          </button>
                          <button onClick={handleCreateCampaign} disabled={campaignSaving || !newCampaign.name.trim() || !newCampaign.custom_message.trim()}
                            style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', opacity: (campaignSaving || !newCampaign.name.trim() || !newCampaign.custom_message.trim()) ? 0.55 : 1 }}>
                            {campaignSaving ? 'Saving…' : 'Create campaign'}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── TEMPLATES ───────────────────────────────────────── */}
            {tab === 'Templates' && (
              <div style={{ maxWidth: 700 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Message templates</div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Reusable messages for campaigns and quick sends</div>
                  </div>
                  <button onClick={() => setShowTemplateForm(true)}
                    style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={14} />New template
                  </button>
                </div>

                {templates.length === 0 ? (
                  <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '48px 20px', textAlign: 'center' }}>
                    <FileText size={32} color="#D1D5DB" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No templates yet</div>
                    <div style={{ color: '#6B7280', fontSize: 13 }}>Create reusable message templates to speed up your campaigns</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {templates.map(t => (
                      <div key={t.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileText size={15} color="#6B7280" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</span>
                              <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{t.category}</span>
                            </div>
                            <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>{t.body}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => { setSendMessage(t.body); setTab('Send'); }}
                              style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                              Use
                            </button>
                            <button onClick={() => deleteTemplate(t.id)}
                              style={{ padding: 6, borderRadius: 7, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Template form modal */}
                <AnimatePresence>
                  {showTemplateForm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ position: 'fixed', inset: 0, background: '#0006', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                      onClick={e => { if (e.target === e.currentTarget) setShowTemplateForm(false); }}>
                      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
                        style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px #0003' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>New template</h3>
                          <button onClick={() => setShowTemplateForm(false)} style={{ padding: 6, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex' }}>
                            <X size={14} color="#6B7280" />
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
                            <input value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))}
                              placeholder="e.g. Initial outreach"
                              style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</span>
                            <select value={newTemplate.category} onChange={e => setNewTemplate(p => ({ ...p, category: e.target.value }))}
                              style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                              <option value="outreach">Outreach</option>
                              <option value="followup">Follow-up</option>
                              <option value="announcement">Announcement</option>
                            </select>
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message body</span>
                            <span style={{ fontSize: 11, color: '#6B7280' }}>Use {'{{'} name {'}}'}, {'{{'} company {'}}'} for dynamic variables</span>
                            <textarea value={newTemplate.body} onChange={e => setNewTemplate(p => ({ ...p, body: e.target.value }))}
                              placeholder="Hi, hope you're doing well…" rows={6}
                              style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                          </label>
                        </div>
                        <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button onClick={() => setShowTemplateForm(false)}
                            style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Cancel
                          </button>
                          <button onClick={handleCreateTemplate} disabled={templateSaving || !newTemplate.name.trim() || !newTemplate.body.trim()}
                            style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', opacity: (templateSaving || !newTemplate.name.trim() || !newTemplate.body.trim()) ? 0.55 : 1 }}>
                            {templateSaving ? 'Saving…' : 'Save template'}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
