'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import BusinessPortalLocked from '@/components/business/BusinessPortalLocked';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, Clock, CheckCircle2, XCircle,
  RefreshCw, X, Plus, Megaphone, FileText, Wifi, WifiOff,
  Activity, Users, ChevronRight, Trash2, Bot, Terminal,
  QrCode, Copy, ChevronDown, ChevronUp, MessageCircle, Repeat2, UserCheck, Upload,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Both tabs are only ever mounted once the user actually clicks into them —
// lazy-loading keeps their code out of the WhatsApp page's initial bundle.
const SequencesTab = dynamic(() => import('@/components/business/whatsapp/SequencesTab'), {
  loading: () => <div className="h-40 animate-pulse rounded-xl bg-gray-100" />,
});
const ReEngagementPanel = dynamic(() => import('@/components/business/whatsapp/ReEngagementPanel'), {
  loading: () => <div className="h-40 animate-pulse rounded-xl bg-gray-100" />,
});

// ─── Types ──────────────────────────────────────────────────────────────────
interface WaConfig {
  id?: string;
  connected: boolean;
  ai_agent_enabled: boolean;
  ai_agent_name: string;
  ai_agent_tone: string;
  ai_agent_system_prompt: string | null;
  ai_agent_faq: Array<{ q: string; a: string }>;
  ai_agent_escalation_keywords: string[];
  ai_agent_escalation_email: string | null;
  qr_code: string | null;
  daemon_last_ping: string | null;
  whatsapp_number: string | null;
}

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

interface ConvMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  from_number: string | null;
  to_number: string | null;
  message: string;
  is_ai_response: boolean;
  status: string;
  created_at: string;
}

interface Conversation {
  contact: string;
  messages: ConvMessage[];
  last_message: string;
  last_at: string;
  unread: number;
}

const TABS = ['Connect', 'Conversations', 'AI Agent', 'Send', 'Campaigns', 'Templates', 'Sequences', 'Re-engage'] as const;
type Tab = typeof TABS[number];

const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  draft:     '#9CA3AF',
  scheduled: '#818cf8',
  running:   '#f59e0b',
  completed: '#4ade80',
  failed:    '#f87171',
};

function isDaemonOnline(ping: string | null): boolean {
  if (!ping) return false;
  return Date.now() - new Date(ping).getTime() < 90_000; // 90s grace (daemon pings every 30s)
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const portal = useCompanyPortalState();
  const [tab, setTab] = useState<Tab>('Connect');
  const [config, setConfig] = useState<WaConfig | null>(null);
  const [companyId, setCompanyId] = useState<string>('');
  const [queue, setQueue] = useState<QueueMsg[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Send form
  const [sendNumber, setSendNumber] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendName, setSendName] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(null);

  // Campaign builder
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', custom_message: '', target_type: 'manual' as 'manual' | 'leads' | 'csv', target_manual_numbers: '' });
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  // CSV campaign upload
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawRows, setCsvRawRows] = useState<Record<string, string>[]>([]);
  const [csvPhoneCol, setCsvPhoneCol] = useState('');
  const [csvNameCol, setCsvNameCol] = useState('');
  const [csvParsing, setCsvParsing] = useState(false);
  const csvFileRef = useRef<HTMLInputElement | null>(null);

  // Template builder
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', body: '', category: 'outreach' });
  const [templateSaving, setTemplateSaving] = useState(false);

  // AI Agent form
  const [agentForm, setAgentForm] = useState({
    ai_agent_enabled: false,
    ai_agent_name: 'Assistant',
    ai_agent_tone: 'professional',
    ai_agent_system_prompt: '',
    ai_agent_faq: [] as Array<{ q: string; a: string }>,
    ai_agent_escalation_keywords: '',
    ai_agent_escalation_email: '',
  });
  const [agentSaving, setAgentSaving] = useState(false);
  const [agentSaved, setAgentSaved] = useState(false);

  // Connect tab
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stats = {
    pending: queue.filter(m => m.status === 'pending').length,
    sent:    queue.filter(m => m.status === 'sent').length,
    failed:  queue.filter(m => m.status === 'failed').length,
  };

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/business/whatsapp/config');
      const data = await res.json();
      setConfig(data.config ?? null);
      setCompanyId(data.company_id ?? '');
      if (data.config) {
        setAgentForm({
          ai_agent_enabled: data.config.ai_agent_enabled ?? false,
          ai_agent_name: data.config.ai_agent_name ?? 'Assistant',
          ai_agent_tone: data.config.ai_agent_tone ?? 'professional',
          ai_agent_system_prompt: data.config.ai_agent_system_prompt ?? '',
          ai_agent_faq: data.config.ai_agent_faq ?? [],
          ai_agent_escalation_keywords: (data.config.ai_agent_escalation_keywords ?? []).join(', '),
          ai_agent_escalation_email: data.config.ai_agent_escalation_email ?? '',
        });
      }
    } catch { /* silent */ }
  }, []);

  const loadQueueAndMore = useCallback(async () => {
    try {
      const [qRes, cRes, tRes, cvRes] = await Promise.all([
        fetch('/api/business/whatsapp/queue'),
        fetch('/api/business/whatsapp/campaigns'),
        fetch('/api/business/whatsapp/templates'),
        fetch('/api/business/whatsapp/conversations'),
      ]);
      const [qData, cData, tData, cvData] = await Promise.all([qRes.json(), cRes.json(), tRes.json(), cvRes.json()]);
      setQueue(qData.queue ?? []);
      setCampaigns(cData.campaigns ?? []);
      setTemplates(tData.templates ?? []);
      setConversations(cvData.conversations ?? []);
    } catch {
      setError('Failed to load data');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadConfig(), loadQueueAndMore()]);
      setLoading(false);
    };
    init();
  }, [loadConfig, loadQueueAndMore]);

  // Poll QR every 5s when on Connect tab and not connected
  useEffect(() => {
    if (tab !== 'Connect') {
      if (qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
      return;
    }
    if (config?.connected) return;
    qrPollRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') loadConfig();
    }, 5000);
    return () => { if (qrPollRef.current) clearInterval(qrPollRef.current); };
  }, [tab, config?.connected, loadConfig]);

  const handleSend = async () => {
    if (!sendNumber.trim() || !sendMessage.trim()) return;
    setSending(true); setSendResult(null);
    try {
      const res = await fetch('/api/business/whatsapp/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_number: sendNumber.trim(), message: sendMessage.trim(), contact_name: sendName.trim() || null }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSendResult('success'); setSendNumber(''); setSendMessage(''); setSendName('');
      loadQueueAndMore();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed'); setSendResult('error');
    } finally { setSending(false); }
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvParsing(true);
    setCsvHeaders([]);
    setCsvRawRows([]);
    try {
      const { parseFile } = await import('@/lib/import/fileParser');
      const parsed = await parseFile(file);
      const headers = parsed.headers.filter(h => h && !h.startsWith('__EMPTY'));
      setCsvHeaders(headers);
      setCsvRawRows(parsed.rows);
      const phoneRe = /phone|mobile|whatsapp|contact|cell|tel/i;
      const nameRe = /name|person|contact/i;
      const autoPhone = headers.find(h => phoneRe.test(h)) ?? '';
      const autoName = headers.find(h => nameRe.test(h) && !phoneRe.test(h)) ?? '';
      setCsvPhoneCol(autoPhone);
      setCsvNameCol(autoName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setCsvParsing(false);
      if (csvFileRef.current) csvFileRef.current.value = '';
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim() || !newCampaign.custom_message.trim()) return;
    setCampaignSaving(true);
    try {
      if (newCampaign.target_type === 'csv') {
        if (!csvPhoneCol || csvRawRows.length === 0) throw new Error('No contacts loaded from CSV');
        // Create campaign first
        const createRes = await fetch('/api/business/whatsapp/campaigns', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newCampaign.name, custom_message: newCampaign.custom_message, target_type: 'manual', target_manual_numbers: [] }),
        });
        const createData = await createRes.json();
        if (createData.error) throw new Error(createData.error);
        // Extract contacts from CSV
        const contactData = csvRawRows
          .map(row => ({ phone: row[csvPhoneCol] ?? '', name: csvNameCol ? (row[csvNameCol] ?? '') : '' }))
          .filter(c => c.phone);
        // Launch immediately with contact_data
        const launchRes = await fetch('/api/business/whatsapp/campaigns/launch', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign_id: createData.campaign.id, contact_data: contactData }),
        });
        const launchData = await launchRes.json();
        if (launchData.error) throw new Error(launchData.error);
        setCampaigns(prev => [{ ...createData.campaign, status: 'running', total_recipients: launchData.queued }, ...prev]);
      } else {
        const numbers = newCampaign.target_manual_numbers.split('\n').map(n => n.trim()).filter(Boolean);
        const res = await fetch('/api/business/whatsapp/campaigns', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newCampaign.name, custom_message: newCampaign.custom_message, target_type: newCampaign.target_type, target_manual_numbers: newCampaign.target_type === 'manual' ? numbers : [] }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setCampaigns(prev => [data.campaign, ...prev]);
      }
      setShowCampaignForm(false);
      setNewCampaign({ name: '', custom_message: '', target_type: 'manual', target_manual_numbers: '' });
      setCsvHeaders([]); setCsvRawRows([]); setCsvPhoneCol(''); setCsvNameCol('');
      loadQueueAndMore();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to create campaign'); }
    finally { setCampaignSaving(false); }
  };

  const handleLaunchCampaign = async (id: string) => {
    setLaunchingId(id);
    try {
      const res = await fetch('/api/business/whatsapp/campaigns/launch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      loadQueueAndMore();
    } catch (e) { setError(e instanceof Error ? e.message : 'Launch failed'); }
    finally { setLaunchingId(null); }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.body.trim()) return;
    setTemplateSaving(true);
    try {
      const vars = (newTemplate.body.match(/\{\{(\w+)\}\}/g) ?? []).map(v => v.replace(/[{}]/g, ''));
      const res = await fetch('/api/business/whatsapp/templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTemplate, variables: vars }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTemplates(prev => [data.template, ...prev]);
      setShowTemplateForm(false);
      setNewTemplate({ name: '', body: '', category: 'outreach' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to create template'); }
    finally { setTemplateSaving(false); }
  };

  const deleteTemplate = async (id: string) => {
    await fetch('/api/business/whatsapp/templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleSaveAgent = async () => {
    setAgentSaving(true); setAgentSaved(false);
    try {
      const keywords = agentForm.ai_agent_escalation_keywords.split(',').map(k => k.trim()).filter(Boolean);
      const res = await fetch('/api/business/whatsapp/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_agent_enabled: agentForm.ai_agent_enabled,
          ai_agent_name: agentForm.ai_agent_name,
          ai_agent_tone: agentForm.ai_agent_tone,
          ai_agent_system_prompt: agentForm.ai_agent_system_prompt,
          ai_agent_faq: agentForm.ai_agent_faq,
          ai_agent_escalation_keywords: keywords,
          ai_agent_escalation_email: agentForm.ai_agent_escalation_email || null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAgentSaved(true);
      setTimeout(() => setAgentSaved(false), 3000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save'); }
    finally { setAgentSaving(false); }
  };

  const addFaqRow = () => setAgentForm(p => ({ ...p, ai_agent_faq: [...p.ai_agent_faq, { q: '', a: '' }] }));
  const removeFaqRow = (i: number) => setAgentForm(p => ({ ...p, ai_agent_faq: p.ai_agent_faq.filter((_, idx) => idx !== i) }));
  const updateFaqRow = (i: number, field: 'q' | 'a', val: string) => setAgentForm(p => ({
    ...p, ai_agent_faq: p.ai_agent_faq.map((r, idx) => idx === i ? { ...r, [field]: val } : r)
  }));

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (!portal.loading && !portal.featureAccess.whatsapp) {
    return <BusinessPortalLocked title="WhatsApp Automation" description="Upgrade your plan to access WhatsApp campaigns, AI agent, and conversation inbox." />;
  }

  const daemonOnline = isDaemonOnline(config?.daemon_last_ping ?? null);
  const activeThread = conversations.find(c => c.contact === activeConv);

  const tabIcons: Record<Tab, React.ReactNode> = {
    Connect: <QrCode size={13} />,
    Conversations: <MessageCircle size={13} />,
    'AI Agent': <Bot size={13} />,
    Send: <Send size={13} />,
    Campaigns: <Megaphone size={13} />,
    Templates: <FileText size={13} />,
    Sequences: <Repeat2 size={13} />,
    'Re-engage': <UserCheck size={13} />,
  };

  // ─── LinkCodeGenerator ────────────────────────────────────────────────────
  function LinkCodeGenerator() {
    const [code, setCode] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);

    const generate = async () => {
      setGenerating(true);
      try {
        const res = await fetch('/api/business/whatsapp/link-code/generate', { method: 'POST' });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setCode(data.code);
        setExpiresAt(data.expires_at);
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed to generate code'); }
      finally { setGenerating(false); }
    };

    const copyCode = () => {
      if (!code) return;
      navigator.clipboard.writeText(code).then(() => { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); });
    };

    const minutesLeft = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60000)) : 0;

    if (code) {
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <code style={{ flex: 1, background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 9, padding: '14px 16px', fontSize: 24, fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.2em', color: '#111', textAlign: 'center' }}>
              {code}
            </code>
            <button onClick={copyCode}
              style={{ padding: '14px 16px', borderRadius: 9, border: '1px solid #D1D5DB', background: codeCopied ? '#F0FDF4' : '#fff', color: codeCopied ? '#15803d' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <Copy size={13} />
              {codeCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'wa-spin 2s linear infinite' }} />
            Expires in ~{minutesLeft} min · Enter this in the Levitate Agent app
            <button onClick={generate} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6366f1', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Regenerate
            </button>
          </div>
        </div>
      );
    }

    return (
      <button onClick={generate} disabled={generating}
        style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #E5E7EB', background: generating ? '#F9FAFB' : '#fff', color: '#111', fontWeight: 700, fontSize: 13, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
        {generating ? (
          <><div style={{ width: 14, height: 14, border: '2px solid #E5E7EB', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'wa-spin 0.8s linear infinite' }} />Generating…</>
        ) : (
          <><Plus size={14} />Generate Link Code</>
        )}
      </button>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`@keyframes wa-spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={18} color="#16a34a" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#111' }}>WhatsApp</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>Connect your number, run campaigns, and automate conversations with AI</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: config?.connected ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${config?.connected ? '#BBF7D0' : '#FECACA'}`, borderRadius: 99, padding: '4px 12px' }}>
              {config?.connected && daemonOnline ? <Wifi size={12} color="#16a34a" /> : <WifiOff size={12} color="#DC2626" />}
              <span style={{ fontSize: 12, fontWeight: 600, color: config?.connected && daemonOnline ? '#16a34a' : '#DC2626' }}>
                {!config ? 'Not connected' : config.connected && daemonOnline ? `Connected${config.whatsapp_number ? ` · +${config.whatsapp_number}` : ''}` : config.connected ? 'Daemon offline' : 'Not connected'}
              </span>
            </div>
            <button onClick={() => { loadConfig(); loadQueueAndMore(); }} style={{ padding: 6, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex' }}>
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
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#16a34a' : 'transparent'}`, color: tab === t ? '#15803d' : '#6B7280', fontWeight: tab === t ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            {tabIcons[t]}{t}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#9CA3AF' }}>
          <div style={{ width: 20, height: 20, border: '2px solid #E5E7EB', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'wa-spin 0.8s linear infinite' }} />
          Loading…
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ padding: '28px' }}>

            {/* ── CONNECT ─────────────────────────────────────────── */}
            {tab === 'Connect' && (
              <div style={{ maxWidth: 680 }}>
                {config?.connected && daemonOnline ? (
                  /* Connected state */
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14, padding: '28px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={24} color="#16a34a" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 17, color: '#166534' }}>WhatsApp connected</div>
                        <div style={{ fontSize: 13, color: '#15803d', marginTop: 2 }}>
                          {config.whatsapp_number ? `+${config.whatsapp_number}` : 'Number active'}
                          {' · '}Agent online
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.7 }}>
                      Your WhatsApp agent is running and connected. Messages from the Send tab and campaigns will be delivered via your connected number.
                      Keep the Levitate WhatsApp Agent app running in your system tray.
                    </div>
                  </div>
                ) : (
                  /* Not connected state — EXE-based flow */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* QR display (shows when agent is running but not yet scanned) */}
                    {config?.qr_code && (
                      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Scan this QR in WhatsApp</div>
                        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>Open WhatsApp → Linked Devices → Link a Device</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={config.qr_code} alt="WhatsApp QR Code" style={{ width: 200, height: 200, border: '2px solid #E5E7EB', borderRadius: 12, display: 'block', margin: '0 auto' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: '#6B7280', marginTop: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'wa-spin 2s linear infinite' }} />
                          QR refreshes automatically · Polling every 5 seconds
                        </div>
                      </div>
                    )}

                    {/* Step 1: Download */}
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '22px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#4f46e5' }}>1</div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Download the Levitate WhatsApp Agent</div>
                      </div>
                      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 14, lineHeight: 1.6 }}>
                        A small Windows desktop app (~90MB) that connects your WhatsApp to this dashboard.
                        It runs silently in your system tray — no Node.js or technical setup required.
                      </div>
                      <a
                        href="https://github.com/levitate-labs/levitate-agent/releases/latest/download/Levitate-WhatsApp-Agent-Setup.exe"
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, background: '#111827', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                        ↓ Download Agent (.exe)
                      </a>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Windows 10/11 · 64-bit · No Node.js required</div>
                    </div>

                    {/* Step 2: Link Code */}
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '22px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#4f46e5' }}>2</div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Generate a Link Code</div>
                      </div>
                      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 14, lineHeight: 1.6 }}>
                        Click below to get a one-time 8-character code. Open the Levitate Agent app and enter this code to link it to your account. Valid for 10 minutes.
                      </div>
                      <LinkCodeGenerator />
                    </div>

                    {/* Step 3: Scan QR */}
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '22px 24px', opacity: 0.7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#16a34a' }}>3</div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Scan QR in WhatsApp</div>
                      </div>
                      <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                        The agent will show a QR code. Open WhatsApp → <strong>⋮ Menu</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong> and scan it.
                        The QR will also sync to this page automatically.
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* ── CONVERSATIONS ────────────────────────────────────── */}
            {tab === 'Conversations' && (
              <div style={{ maxWidth: 960, display: 'flex', gap: 16, height: '70vh' }}>
                {/* Thread list */}
                <div style={{ width: 280, flexShrink: 0, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E7EB', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={14} color="#6B7280" />
                    Conversations
                    <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700, marginLeft: 'auto' }}>{conversations.length}</span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {conversations.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                        No conversations yet. Connect your WhatsApp and customers will appear here.
                      </div>
                    ) : conversations.map(conv => (
                      <button key={conv.contact} onClick={() => setActiveConv(conv.contact)}
                        style={{ width: '100%', padding: '12px 16px', background: activeConv === conv.contact ? '#F0FDF4' : 'none', border: 'none', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 700, color: '#374151' }}>
                            {conv.contact.slice(-2)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>+{conv.contact}</span>
                              {conv.unread > 0 && <span style={{ background: '#16a34a', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{conv.unread}</span>}
                            </div>
                            <div style={{ fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{conv.last_message}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message pane */}
                <div style={{ flex: 1, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {!activeThread ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: '#9CA3AF' }}>
                      <MessageCircle size={40} />
                      <div style={{ fontSize: 14 }}>Select a conversation to view messages</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                          {activeThread.contact.slice(-2)}
                        </div>
                        +{activeThread.contact}
                        <button onClick={() => { setSendNumber('+' + activeThread.contact); setTab('Send'); }}
                          style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 7, border: '1px solid #D1D5DB', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Send size={12} />Reply
                        </button>
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {activeThread.messages.map(msg => (
                          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                            <div style={{ maxWidth: '72%' }}>
                              <div style={{
                                padding: '10px 14px', borderRadius: msg.direction === 'outbound' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                                background: msg.direction === 'outbound' ? '#16a34a' : '#F3F4F6',
                                color: msg.direction === 'outbound' ? '#fff' : '#111',
                                fontSize: 13, lineHeight: 1.5,
                              }}>
                                {msg.message}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, justifyContent: msg.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                                {msg.is_ai_response && <span style={{ fontSize: 10, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 3 }}><Bot size={10} />AI</span>}
                                <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                                  {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── AI AGENT ────────────────────────────────────────── */}
            {tab === 'AI Agent' && (
              <div style={{ maxWidth: 660 }}>
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '28px 32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bot size={20} color="#6366f1" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>AI Agent configuration</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>Configure the Groq AI agent that auto-replies to customer messages</div>
                    </div>
                    {/* Enable toggle */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Enable AI</span>
                      <button onClick={() => setAgentForm(p => ({ ...p, ai_agent_enabled: !p.ai_agent_enabled }))}
                        style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: agentForm.ai_agent_enabled ? '#16a34a' : '#D1D5DB', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: agentForm.ai_agent_enabled ? 23 : 3, transition: 'left 0.2s' }} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20, opacity: agentForm.ai_agent_enabled ? 1 : 0.5, pointerEvents: agentForm.ai_agent_enabled ? 'auto' : 'none' }}>
                    {/* Agent Name */}
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent name</span>
                      <input value={agentForm.ai_agent_name} onChange={e => setAgentForm(p => ({ ...p, ai_agent_name: e.target.value }))}
                        placeholder="e.g. Aria"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                    </label>

                    {/* Tone */}
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tone</span>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        {(['professional', 'friendly', 'casual'] as const).map(tone => (
                          <button key={tone} onClick={() => setAgentForm(p => ({ ...p, ai_agent_tone: tone }))}
                            style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1.5px solid ${agentForm.ai_agent_tone === tone ? '#6366f1' : '#D1D5DB'}`, background: agentForm.ai_agent_tone === tone ? '#EEF2FF' : '#fff', color: agentForm.ai_agent_tone === tone ? '#4f46e5' : '#6B7280', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* System prompt */}
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System prompt</span>
                      <textarea value={agentForm.ai_agent_system_prompt} onChange={e => setAgentForm(p => ({ ...p, ai_agent_system_prompt: e.target.value }))}
                        placeholder="You are a helpful assistant for [business name]. You help customers with inquiries about our services…"
                        rows={5}
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
                    </label>

                    {/* FAQ */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>FAQ knowledge base</span>
                        <button onClick={addFaqRow}
                          style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #D1D5DB', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Plus size={12} />Add Q&amp;A
                        </button>
                      </div>
                      {agentForm.ai_agent_faq.length === 0 ? (
                        <div style={{ background: '#F9FAFB', border: '1px dashed #E5E7EB', borderRadius: 9, padding: '20px', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>
                          Add Q&amp;A pairs to help the AI answer common questions accurately
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {agentForm.ai_agent_faq.map((row, i) => (
                            <div key={i} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 9, padding: '12px 14px', display: 'flex', gap: 10 }}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <input value={row.q} onChange={e => updateFaqRow(i, 'q', e.target.value)}
                                  placeholder="Question" style={{ padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                                <textarea value={row.a} onChange={e => updateFaqRow(i, 'a', e.target.value)}
                                  placeholder="Answer" rows={2} style={{ padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                              </div>
                              <button onClick={() => removeFaqRow(i)} style={{ padding: 6, borderRadius: 7, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-start' }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Escalation */}
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Escalation keywords</span>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>Comma-separated. AI will transfer to human when these are detected.</span>
                      <input value={agentForm.ai_agent_escalation_keywords} onChange={e => setAgentForm(p => ({ ...p, ai_agent_escalation_keywords: e.target.value }))}
                        placeholder="refund, complaint, human, urgent"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Escalation email</span>
                      <input type="email" value={agentForm.ai_agent_escalation_email} onChange={e => setAgentForm(p => ({ ...p, ai_agent_escalation_email: e.target.value }))}
                        placeholder="support@yourcompany.com"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                    </label>
                  </div>

                  <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={handleSaveAgent} disabled={agentSaving}
                      style={{ padding: '11px 24px', borderRadius: 9, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', opacity: agentSaving ? 0.6 : 1 }}>
                      {agentSaving ? 'Saving…' : 'Save configuration'}
                    </button>
                    {agentSaved && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontSize: 13 }}>
                        <CheckCircle2 size={15} />Saved
                      </div>
                    )}
                  </div>
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
                      <div style={{ fontSize: 12, color: '#6B7280' }}>Queued via your connected number</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone number</span>
                      <input value={sendNumber} onChange={e => setSendNumber(e.target.value)} placeholder="+919999999999"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 14, fontFamily: 'monospace', outline: 'none' }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact name <span style={{ color: '#9CA3AF', fontWeight: 400, textTransform: 'none' }}>(optional)</span></span>
                      <input value={sendName} onChange={e => setSendName(e.target.value)} placeholder="John Doe"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message</span>
                      <textarea value={sendMessage} onChange={e => setSendMessage(e.target.value)} rows={5} placeholder="Type your message…"
                        style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                    </label>
                    {sendResult === 'success' && (
                      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={14} />Message queued successfully
                      </div>
                    )}
                    <button onClick={handleSend} disabled={sending || !sendNumber.trim() || !sendMessage.trim()}
                      style={{ padding: '12px 20px', borderRadius: 9, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: (sending || !sendNumber.trim() || !sendMessage.trim()) ? 0.55 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Send size={15} />{sending ? 'Queuing…' : 'Queue message'}
                    </button>
                  </div>
                </div>

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

                {/* Queue summary */}
                {queue.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Queue status</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[
                        { label: 'Pending', value: stats.pending, color: '#92400e', bg: '#FEF3C7' },
                        { label: 'Sent', value: stats.sent, color: '#166534', bg: '#F0FDF4' },
                        { label: 'Failed', value: stats.failed, color: '#991B1B', bg: '#FEF2F2' },
                      ].map(s => (
                        <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: s.color, opacity: 0.7 }}>{s.label}</div>
                        </div>
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
                          {[{ l: 'Recipients', v: c.total_recipients }, { l: 'Sent', v: c.sent_count }].map(s => (
                            <div key={s.l} style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: 800, fontSize: 17 }}>{s.v}</div>
                              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{s.l}</div>
                            </div>
                          ))}
                        </div>
                        <span style={{ background: CAMPAIGN_STATUS_COLORS[c.status] + '22', color: CAMPAIGN_STATUS_COLORS[c.status], borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize', flexShrink: 0 }}>
                          {c.status}
                        </span>
                        {c.status === 'draft' && (
                          <button onClick={() => handleLaunchCampaign(c.id)} disabled={launchingId === c.id}
                            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', opacity: launchingId === c.id ? 0.6 : 1 }}>
                            {launchingId === c.id ? 'Launching…' : 'Launch'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

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
                            <input value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))} placeholder="e.g. March follow-up"
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
                              {(['manual', 'leads', 'csv'] as const).map(t => (
                                <button key={t} onClick={() => setNewCampaign(p => ({ ...p, target_type: t }))}
                                  style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1.5px solid ${newCampaign.target_type === t ? '#16a34a' : '#D1D5DB'}`, background: newCampaign.target_type === t ? '#F0FDF4' : '#fff', color: newCampaign.target_type === t ? '#15803d' : '#6B7280', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {t === 'manual' ? 'Manual' : t === 'leads' ? 'CRM leads' : 'CSV / Excel'}
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
                          {newCampaign.target_type === 'csv' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {/* File upload */}
                              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px 16px', border: `2px dashed ${csvRawRows.length > 0 ? '#16a34a' : '#D1D5DB'}`, borderRadius: 10, cursor: 'pointer', background: csvRawRows.length > 0 ? '#F0FDF4' : '#FAFAFA' }}>
                                {csvParsing ? (
                                  <><div style={{ width: 18, height: 18, border: '2px solid #D1D5DB', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'wa-spin 0.8s linear infinite' }} /><span style={{ fontSize: 13, color: '#16a34a' }}>Parsing…</span></>
                                ) : csvRawRows.length > 0 ? (
                                  <><CheckCircle2 size={18} color="#16a34a" /><span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{csvRawRows.length.toLocaleString()} contacts loaded</span><span style={{ fontSize: 11, color: '#6B7280' }}>Click to replace file</span></>
                                ) : (
                                  <><Upload size={18} color="#9CA3AF" /><span style={{ fontSize: 13, color: '#9CA3AF' }}>Upload CSV or Excel file</span></>
                                )}
                                <input ref={csvFileRef} type="file" accept=".csv,.xlsx,.xls,.tsv" onChange={handleCsvFileChange} style={{ display: 'none' }} />
                              </label>
                              {/* Column selectors */}
                              {csvHeaders.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Phone column *</span>
                                    <select value={csvPhoneCol} onChange={e => setCsvPhoneCol(e.target.value)}
                                      style={{ padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                                      <option value="">— select —</option>
                                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                  </label>
                                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Name column</span>
                                    <select value={csvNameCol} onChange={e => setCsvNameCol(e.target.value)}
                                      style={{ padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                                      <option value="">— none —</option>
                                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                  </label>
                                </div>
                              )}
                              {csvPhoneCol && csvRawRows.length > 0 && (
                                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px' }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 6 }}>Preview (first 3)</div>
                                  {csvRawRows.slice(0, 3).map((row, i) => (
                                    <div key={i} style={{ fontSize: 12, color: '#374151', display: 'flex', gap: 8, marginBottom: 2 }}>
                                      <span style={{ fontFamily: 'monospace' }}>{row[csvPhoneCol] || '—'}</span>
                                      {csvNameCol && <span style={{ color: '#9CA3AF' }}>· {row[csvNameCol] || '—'}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button onClick={() => setShowCampaignForm(false)}
                            style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Cancel
                          </button>
                          <button onClick={handleCreateCampaign}
                            disabled={campaignSaving || !newCampaign.name.trim() || !newCampaign.custom_message.trim() || (newCampaign.target_type === 'csv' && (!csvPhoneCol || csvRawRows.length === 0))}
                            style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', opacity: (campaignSaving || !newCampaign.name.trim() || !newCampaign.custom_message.trim() || (newCampaign.target_type === 'csv' && (!csvPhoneCol || csvRawRows.length === 0))) ? 0.55 : 1 }}>
                            {campaignSaving ? 'Creating…' : newCampaign.target_type === 'csv' ? `Create & launch (${csvRawRows.length.toLocaleString()} contacts)` : 'Create campaign'}
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
                    <div style={{ color: '#6B7280', fontSize: 13 }}>Create reusable message templates to speed up campaigns</div>
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
                            <input value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Initial outreach"
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
                              placeholder="Hi, hope you are doing well…" rows={6}
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

            {tab === 'Sequences' && companyId && (
              <SequencesTab companyId={companyId} />
            )}

            {tab === 'Re-engage' && companyId && (
              <ReEngagementPanel companyId={companyId} />
            )}

          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
