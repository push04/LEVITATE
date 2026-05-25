'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import BusinessPortalLocked from '@/components/business/BusinessPortalLocked';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface WaConfig {
  id?: string;
  connected: boolean;
  phone_number_id: string;
  verify_token: string;
  ai_agent_enabled: boolean;
  ai_agent_name: string;
  ai_agent_tone: 'professional' | 'friendly' | 'casual';
  ai_agent_system_prompt: string;
  ai_agent_faq: { q: string; a: string }[];
  ai_agent_escalation_keywords: string[];
  ai_agent_escalation_email: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  reply_count: number;
  created_at: string;
  scheduled_at: string | null;
}

interface Template {
  id: string;
  name: string;
  body: string;
  category: string;
  variables: string[];
  created_at: string;
}

interface WaMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  to_number: string | null;
  from_number: string | null;
  contact_name: string | null;
  message: string;
  status: string;
  is_ai_response: boolean;
  created_at: string;
}

const DEFAULT_CONFIG: WaConfig = {
  connected: false,
  phone_number_id: '',
  verify_token: '',
  ai_agent_enabled: false,
  ai_agent_name: 'Assistant',
  ai_agent_tone: 'professional',
  ai_agent_system_prompt: '',
  ai_agent_faq: [],
  ai_agent_escalation_keywords: [],
  ai_agent_escalation_email: '',
};

const TABS = ['Connect', 'Campaigns', 'AI Agent', 'Inbox'] as const;
type Tab = typeof TABS[number];

const STATUS_COLORS: Record<string, string> = {
  draft: '#888',
  scheduled: '#818cf8',
  running: '#f59e0b',
  completed: '#4ade80',
  failed: '#f87171',
};

// ─── Main ───────────────────────────────────────────────────────────────────────
export default function WhatsAppDashboard() {
  const portal = useCompanyPortalState();
  const [tab, setTab] = useState<Tab>('Connect');
  const [config, setConfig] = useState<WaConfig>(DEFAULT_CONFIG);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [inbox, setInbox] = useState<WaMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState('');

  // Campaign builder state
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', custom_message: '', target_type: 'manual' as 'manual' | 'leads', target_manual_numbers: '' });
  const [campaignSaving, setCampaignSaving] = useState(false);

  // Template builder
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', body: '', category: 'outreach' });
  const [templateSaving, setTemplateSaving] = useState(false);

  // AI Agent FAQ
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  // Access token (write-only, never shown)
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, camRes, tplRes, inbRes] = await Promise.all([
        fetch('/api/business/whatsapp/config'),
        fetch('/api/business/whatsapp/campaigns'),
        fetch('/api/business/whatsapp/templates'),
        fetch('/api/business/whatsapp/inbox'),
      ]);
      const [cfgData, camData, tplData, inbData] = await Promise.all([
        cfgRes.json(), camRes.json(), tplRes.json(), inbRes.json()
      ]);
      if (cfgData.config) setConfig({ ...DEFAULT_CONFIG, ...cfgData.config });
      setCampaigns(camData.campaigns ?? []);
      setTemplates(tplData.templates ?? []);
      setInbox(inbData.messages ?? []);
    } catch {
      setError('Failed to load WhatsApp data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function saveConfig() {
    setSaving(true);
    setSaveMsg('');
    try {
      const body: Record<string, unknown> = { ...config };
      if (accessToken) body.access_token = accessToken;
      if (appSecret) body.app_secret = appSecret;
      const res = await fetch('/api/business/whatsapp/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSaveMsg('Saved');
      setAccessToken('');
      setAppSecret('');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function createCampaign() {
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
      setShowCampaignBuilder(false);
      setNewCampaign({ name: '', custom_message: '', target_type: 'manual', target_manual_numbers: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create campaign');
    } finally {
      setCampaignSaving(false);
    }
  }

  async function createTemplate() {
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
      setShowTemplateBuilder(false);
      setNewTemplate({ name: '', body: '', category: 'outreach' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create template');
    } finally {
      setTemplateSaving(false);
    }
  }

  function addFaq() {
    if (!newFaqQ.trim() || !newFaqA.trim()) return;
    setConfig(prev => ({ ...prev, ai_agent_faq: [...prev.ai_agent_faq, { q: newFaqQ.trim(), a: newFaqA.trim() }] }));
    setNewFaqQ('');
    setNewFaqA('');
  }

  function removeFaq(i: number) {
    setConfig(prev => ({ ...prev, ai_agent_faq: prev.ai_agent_faq.filter((_, idx) => idx !== i) }));
  }

  const inboxConversations = (() => {
    const map = new Map<string, WaMessage[]>();
    for (const m of inbox) {
      const key = m.direction === 'inbound' ? (m.from_number ?? 'unknown') : (m.to_number ?? 'unknown');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).map(([number, msgs]) => ({
      number,
      name: msgs.find(m => m.contact_name)?.contact_name ?? number,
      lastMsg: msgs[0],
      unread: msgs.filter(m => m.direction === 'inbound').length,
    }));
  })();

  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);

  async function sendReply() {
    if (!selectedConvo || !replyText.trim()) return;
    setReplySending(true);
    try {
      await fetch('/api/business/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_number: selectedConvo, message: replyText.trim() }),
      });
      setReplyText('');
      await loadData();
    } catch {
      setError('Send failed');
    } finally {
      setReplySending(false);
    }
  }

  // ─── Guard ──────────────────────────────────────────────────────────────────
  if (!portal.loading && !portal.featureAccess.whatsapp) {
    return <BusinessPortalLocked featureName="WhatsApp" />;
  }

  const S: React.CSSProperties = { fontFamily: 'Inter, system-ui, sans-serif' };

  return (
    <div style={{ ...S, minHeight: '100vh', background: '#F9FAFB', color: '#111' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#25D366,#128C7E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 18 }}>💬</span>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111' }}>WhatsApp Automation</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>Outreach campaigns &amp; AI agent for your business</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: config.connected ? '#4ade80' : '#d1d5db' }} />
            <span style={{ fontSize: 12, color: config.connected ? '#16a34a' : '#9CA3AF', fontWeight: 600 }}>
              {config.connected ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ margin: '12px 28px 0', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: 13 }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 28px' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #25D366' : '2px solid transparent', color: tab === t ? '#15803d' : '#6B7280', fontWeight: tab === t ? 700 : 500, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
              {t === 'Connect' && '🔌 '}
              {t === 'Campaigns' && '📢 '}
              {t === 'AI Agent' && '🤖 '}
              {t === 'Inbox' && '💬 '}
              {t}
              {t === 'Inbox' && inboxConversations.filter(c => c.unread > 0).length > 0 && (
                <span style={{ marginLeft: 6, background: '#25D366', color: '#fff', borderRadius: '9999px', padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>
                  {inboxConversations.filter(c => c.unread > 0).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#9CA3AF' }}>
          <div style={{ width: 20, height: 20, border: '2px solid #E5E7EB', borderTopColor: '#25D366', borderRadius: '50%', animation: 'wa-spin 0.8s linear infinite' }} />
          <style>{`@keyframes wa-spin{to{transform:rotate(360deg)}}`}</style>
          Loading WhatsApp data…
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            style={{ padding: '28px' }}>

            {/* ── CONNECT TAB ─────────────────────────────────────────────── */}
            {tab === 'Connect' && (
              <div style={{ maxWidth: 700 }}>
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <span style={{ fontSize: 22 }}>🔌</span>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Meta Cloud API Connection</h2>
                    {config.connected && <span style={{ marginLeft: 'auto', background: '#DCFCE7', color: '#15803d', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>● Connected</span>}
                  </div>

                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
                    <strong>How to connect:</strong> Create a Meta Business app at developers.facebook.com → Add WhatsApp product → Copy your Phone Number ID and generate a permanent access token. Paste them below.
                  </div>

                  <div style={{ display: 'grid', gap: 16 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Phone Number ID</span>
                      <input value={config.phone_number_id} onChange={e => setConfig(p => ({ ...p, phone_number_id: e.target.value }))}
                        placeholder="1234567890123456"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', outline: 'none' }} />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Access Token <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(write-only — leave blank to keep existing)</span></span>
                      <input type="password" value={accessToken} onChange={e => setAccessToken(e.target.value)}
                        placeholder="EAAxxxxxxxxxxxxxxxx..."
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', outline: 'none' }} />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>App Secret <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(for webhook signature verification)</span></span>
                      <input type="password" value={appSecret} onChange={e => setAppSecret(e.target.value)}
                        placeholder="xxxxxxxxxxxxxxxx"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', outline: 'none' }} />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Webhook Verify Token</span>
                      <input value={config.verify_token} onChange={e => setConfig(p => ({ ...p, verify_token: e.target.value }))}
                        placeholder="my-secret-verify-token"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', outline: 'none' }} />
                      <span style={{ fontSize: 11, color: '#6B7280' }}>Add this as your Meta webhook verify token. Webhook URL: <code style={{ background: '#F3F4F6', padding: '1px 4px', borderRadius: 4 }}>{typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/webhook/whatsapp</code></span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <div onClick={() => setConfig(p => ({ ...p, connected: !p.connected }))}
                        style={{ width: 40, height: 22, borderRadius: 99, background: config.connected ? '#25D366' : '#D1D5DB', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: 2, left: config.connected ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px #0003', transition: 'left 0.2s' }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Mark as connected</span>
                    </label>
                  </div>

                  <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                    <button onClick={saveConfig} disabled={saving}
                      style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                      {saving ? 'Saving…' : 'Save Connection'}
                    </button>
                    {saveMsg && <span style={{ alignSelf: 'center', color: '#16a34a', fontSize: 13, fontWeight: 600 }}>✓ {saveMsg}</span>}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {[
                    { label: 'Campaigns', value: campaigns.length, icon: '📢' },
                    { label: 'Messages Sent', value: inbox.filter(m => m.direction === 'outbound').length, icon: '↗' },
                    { label: 'Inbound', value: inbox.filter(m => m.direction === 'inbound').length, icon: '↙' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px 20px' }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#111' }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CAMPAIGNS TAB ───────────────────────────────────────────── */}
            {tab === 'Campaigns' && (
              <div style={{ maxWidth: 900 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Outreach Campaigns</h2>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>Send bulk WhatsApp messages to your leads and contacts</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setShowTemplateBuilder(true)}
                      style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                      + Template
                    </button>
                    <button onClick={() => setShowCampaignBuilder(true)}
                      style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                      + New Campaign
                    </button>
                  </div>
                </div>

                {/* Templates row */}
                {templates.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message Templates</h3>
                    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                      {templates.map(t => (
                        <div key={t.id} style={{ minWidth: 220, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', background: '#F3F4F6', borderRadius: 99, padding: '2px 8px', textTransform: 'uppercase' }}>{t.category}</span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5, maxHeight: 52, overflow: 'hidden' }}>{t.body}</div>
                          {t.variables.length > 0 && (
                            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {t.variables.map(v => (
                                <span key={v} style={{ background: '#ECFDF5', color: '#059669', borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{'{{' + v + '}}'}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Campaigns list */}
                {campaigns.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📢</div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No campaigns yet</div>
                    <div style={{ color: '#6B7280', fontSize: 13, marginBottom: 20 }}>Create your first WhatsApp outreach campaign to reach your leads</div>
                    <button onClick={() => setShowCampaignBuilder(true)}
                      style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Create Campaign
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {campaigns.map(c => (
                      <div key={c.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[c.status] ?? '#888', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: '#6B7280' }}>
                            {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {c.scheduled_at && ` · Scheduled: ${new Date(c.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
                          {[
                            { label: 'Recipients', val: c.total_recipients },
                            { label: 'Sent', val: c.sent_count },
                            { label: 'Replies', val: c.reply_count },
                          ].map(s => (
                            <div key={s.label} style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: 800, fontSize: 18 }}>{s.val}</div>
                              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                        <span style={{ background: STATUS_COLORS[c.status] + '22', color: STATUS_COLORS[c.status], borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700, flexShrink: 0, textTransform: 'capitalize' }}>
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Campaign builder modal */}
                <AnimatePresence>
                  {showCampaignBuilder && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ position: 'fixed', inset: 0, background: '#0007', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                      onClick={e => { if (e.target === e.currentTarget) setShowCampaignBuilder(false); }}>
                      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                        style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 540, width: '100%', boxShadow: '0 20px 60px #0003' }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>New Campaign</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Campaign Name</span>
                            <input value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))}
                              placeholder="e.g. March Follow-up"
                              style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Message</span>
                            <span style={{ fontSize: 11, color: '#6B7280' }}>Use {'{{name}}'}, {'{{company}}'} as placeholders</span>
                            <textarea value={newCampaign.custom_message} onChange={e => setNewCampaign(p => ({ ...p, custom_message: e.target.value }))}
                              placeholder={"Hi {{name}}, this is from [Your Business]. We wanted to reach out..."}
                              rows={5}
                              style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Target</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {(['manual', 'leads'] as const).map(t => (
                                <button key={t} onClick={() => setNewCampaign(p => ({ ...p, target_type: t }))}
                                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1.5px solid ${newCampaign.target_type === t ? '#25D366' : '#D1D5DB'}`, background: newCampaign.target_type === t ? '#F0FDF4' : '#fff', color: newCampaign.target_type === t ? '#15803d' : '#6B7280', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                                  {t === 'manual' ? 'Manual Numbers' : 'CRM Leads'}
                                </button>
                              ))}
                            </div>
                          </label>
                          {newCampaign.target_type === 'manual' && (
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>Phone Numbers <span style={{ color: '#6B7280', fontWeight: 400 }}>(one per line, with country code)</span></span>
                              <textarea value={newCampaign.target_manual_numbers} onChange={e => setNewCampaign(p => ({ ...p, target_manual_numbers: e.target.value }))}
                                placeholder="+919876543210&#10;+919012345678"
                                rows={4}
                                style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, fontFamily: 'monospace', outline: 'none', resize: 'vertical' }} />
                            </label>
                          )}
                        </div>
                        <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button onClick={() => setShowCampaignBuilder(false)}
                            style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Cancel
                          </button>
                          <button onClick={createCampaign} disabled={campaignSaving || !newCampaign.name || !newCampaign.custom_message}
                            style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: (campaignSaving || !newCampaign.name || !newCampaign.custom_message) ? 0.6 : 1, fontFamily: 'inherit' }}>
                            {campaignSaving ? 'Creating…' : 'Create Campaign'}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Template builder modal */}
                <AnimatePresence>
                  {showTemplateBuilder && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ position: 'fixed', inset: 0, background: '#0007', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                      onClick={e => { if (e.target === e.currentTarget) setShowTemplateBuilder(false); }}>
                      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                        style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px #0003' }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>New Template</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Template Name</span>
                            <input value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))}
                              placeholder="e.g. Initial Outreach"
                              style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Category</span>
                            <select value={newTemplate.category} onChange={e => setNewTemplate(p => ({ ...p, category: e.target.value }))}
                              style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                              <option value="outreach">Outreach</option>
                              <option value="followup">Follow-up</option>
                              <option value="announcement">Announcement</option>
                            </select>
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Message Body</span>
                            <span style={{ fontSize: 11, color: '#6B7280' }}>Use {'{{name}}'}, {'{{company}}'} etc. as dynamic variables</span>
                            <textarea value={newTemplate.body} onChange={e => setNewTemplate(p => ({ ...p, body: e.target.value }))}
                              placeholder={"Hi {{name}}, hope you're doing well! ..."}
                              rows={6}
                              style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                          </label>
                        </div>
                        <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button onClick={() => setShowTemplateBuilder(false)}
                            style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Cancel
                          </button>
                          <button onClick={createTemplate} disabled={templateSaving || !newTemplate.name || !newTemplate.body}
                            style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: (templateSaving || !newTemplate.name || !newTemplate.body) ? 0.6 : 1, fontFamily: 'inherit' }}>
                            {templateSaving ? 'Saving…' : 'Save Template'}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── AI AGENT TAB ─────────────────────────────────────────────── */}
            {tab === 'AI Agent' && (
              <div style={{ maxWidth: 700 }}>
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <span style={{ fontSize: 22 }}>🤖</span>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>AI Responder</h2>
                    <div onClick={() => setConfig(p => ({ ...p, ai_agent_enabled: !p.ai_agent_enabled }))}
                      style={{ marginLeft: 'auto', width: 44, height: 24, borderRadius: 99, background: config.ai_agent_enabled ? '#25D366' : '#D1D5DB', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 3, left: config.ai_agent_enabled ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px #0003', transition: 'left 0.2s' }} />
                    </div>
                  </div>

                  {!config.ai_agent_enabled && (
                    <div style={{ background: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: 10, padding: '16px', marginBottom: 20, fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
                      Enable the AI agent to automatically respond to incoming WhatsApp messages
                    </div>
                  )}

                  <div style={{ display: 'grid', gap: 16, opacity: config.ai_agent_enabled ? 1 : 0.45, pointerEvents: config.ai_agent_enabled ? 'auto' : 'none' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Agent Name</span>
                      <input value={config.ai_agent_name} onChange={e => setConfig(p => ({ ...p, ai_agent_name: e.target.value }))}
                        placeholder="e.g. Priya, Alex, Support Bot"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Tone</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(['professional', 'friendly', 'casual'] as const).map(t => (
                          <button key={t} onClick={() => setConfig(p => ({ ...p, ai_agent_tone: t }))}
                            style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1.5px solid ${config.ai_agent_tone === t ? '#25D366' : '#D1D5DB'}`, background: config.ai_agent_tone === t ? '#F0FDF4' : '#fff', color: config.ai_agent_tone === t ? '#15803d' : '#6B7280', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>System Prompt</span>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>Describe your business, what the agent should and should not do</span>
                      <textarea value={config.ai_agent_system_prompt} onChange={e => setConfig(p => ({ ...p, ai_agent_system_prompt: e.target.value }))}
                        placeholder="You are an assistant for [Business Name]. Help customers with product enquiries, pricing, and appointments. Do not discuss competitors."
                        rows={5}
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                    </label>

                    {/* FAQ */}
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>FAQ / Quick Answers</span>
                      {config.ai_agent_faq.map((faq, i) => (
                        <div key={i} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', marginBottom: 8, position: 'relative' }}>
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{faq.q}</div>
                          <div style={{ fontSize: 13, color: '#6B7280' }}>{faq.a}</div>
                          <button onClick={() => removeFaq(i)}
                            style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16 }}>×</button>
                        </div>
                      ))}
                      <div style={{ background: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: 10, padding: '14px' }}>
                        <input value={newFaqQ} onChange={e => setNewFaqQ(e.target.value)}
                          placeholder="Question: e.g. What are your timings?"
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
                        <input value={newFaqA} onChange={e => setNewFaqA(e.target.value)}
                          placeholder="Answer: e.g. We're open 9am–9pm Mon–Sat"
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
                        <button onClick={addFaq} disabled={!newFaqQ.trim() || !newFaqA.trim()}
                          style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: '#25D366', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: (!newFaqQ.trim() || !newFaqA.trim()) ? 0.5 : 1, fontFamily: 'inherit' }}>
                          + Add FAQ
                        </button>
                      </div>
                    </div>

                    {/* Escalation */}
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Escalation Keywords</span>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>Comma-separated. When a message contains these, hand off to a human.</span>
                      <input
                        value={config.ai_agent_escalation_keywords.join(', ')}
                        onChange={e => setConfig(p => ({ ...p, ai_agent_escalation_keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) }))}
                        placeholder="complaint, refund, cancel, speak to agent"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Escalation Email</span>
                      <input type="email" value={config.ai_agent_escalation_email} onChange={e => setConfig(p => ({ ...p, ai_agent_escalation_email: e.target.value }))}
                        placeholder="you@yourbusiness.com"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                    </label>
                  </div>

                  <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                    <button onClick={saveConfig} disabled={saving}
                      style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                      {saving ? 'Saving…' : 'Save Agent Config'}
                    </button>
                    {saveMsg && <span style={{ alignSelf: 'center', color: '#16a34a', fontSize: 13, fontWeight: 600 }}>✓ {saveMsg}</span>}
                  </div>
                </div>

                {/* How it works */}
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '18px 22px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#15803d', marginBottom: 10 }}>🤖 How the AI Agent works</div>
                  {[
                    'Customer sends a WhatsApp message to your business number',
                    'LEVITATE receives it via your Meta webhook and passes it to the AI',
                    'AI responds using your system prompt, FAQ, and tone settings',
                    'If escalation keyword detected, you receive an email notification',
                    'All conversations are stored in your Inbox tab',
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13, color: '#166534' }}>
                      <span style={{ fontWeight: 700, minWidth: 20, color: '#25D366' }}>{i + 1}.</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── INBOX TAB ────────────────────────────────────────────────── */}
            {tab === 'Inbox' && (
              <div style={{ maxWidth: 900 }}>
                {inbox.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No messages yet</div>
                    <div style={{ color: '#6B7280', fontSize: 13 }}>Messages from your WhatsApp campaigns and AI agent conversations will appear here</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, height: 600 }}>
                    {/* Conversation list */}
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E7EB', fontWeight: 700, fontSize: 14 }}>Conversations</div>
                      <div style={{ flex: 1, overflowY: 'auto' }}>
                        {inboxConversations.map(c => (
                          <button key={c.number} onClick={() => setSelectedConvo(c.number)}
                            style={{ width: '100%', padding: '12px 16px', background: selectedConvo === c.number ? '#F0FDF4' : 'transparent', border: 'none', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.1s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#6B7280', flexShrink: 0 }}>
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                <div style={{ fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMsg.message}</div>
                              </div>
                              {c.unread > 0 && <span style={{ background: '#25D366', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{c.unread}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message thread */}
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      {!selectedConvo ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 14 }}>
                          Select a conversation
                        </div>
                      ) : (
                        <>
                          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', fontWeight: 700, fontSize: 14 }}>{selectedConvo}</div>
                          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {inbox.filter(m => m.to_number === selectedConvo || m.from_number === selectedConvo)
                              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                              .map(m => (
                                <div key={m.id} style={{ display: 'flex', justifyContent: m.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                                  <div style={{ maxWidth: '70%', background: m.direction === 'outbound' ? '#DCF8C6' : '#F3F4F6', borderRadius: m.direction === 'outbound' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '10px 14px' }}>
                                    <div style={{ fontSize: 14, color: '#111', lineHeight: 1.5 }}>{m.message}</div>
                                    <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4, textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                                      {m.is_ai_response && <span style={{ background: '#EDE9FE', color: '#7C3AED', borderRadius: 99, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>AI</span>}
                                      {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                          <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10 }}>
                            <input value={replyText} onChange={e => setReplyText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                              placeholder="Type a message…"
                              style={{ flex: 1, padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                            <button onClick={sendReply} disabled={replySending || !replyText.trim()}
                              style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: (replySending || !replyText.trim()) ? 0.6 : 1, fontFamily: 'inherit' }}>
                              {replySending ? '…' : 'Send'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
