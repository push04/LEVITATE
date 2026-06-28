'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Brain, Send, RefreshCw, Copy, Check, ExternalLink, Sparkles,
  TrendingUp, Users, MessageSquare, Database, BarChart3, Mail,
  Zap, Bot, ChevronDown, ChevronUp, IndianRupee, FileText,
  Crosshair, Activity, Rocket,
} from 'lucide-react';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
  actions?: Action[];
}

interface Action {
  type: 'navigate' | 'copy';
  label: string;
  href?: string;
  content?: string;
}

// ── Quick action groups ────────────────────────────────────────────────────────
const ACTION_GROUPS = [
  {
    label: 'Analytics',
    icon: BarChart3,
    color: '#6366f1',
    items: [
      "Give me today's full business summary",
      'Revenue breakdown for this month',
      'Lead funnel conversion analysis',
      'Which lead sources are performing best?',
      'Show me the agent performance report',
    ],
  },
  {
    label: 'Leads & CRM',
    icon: Users,
    color: '#059669',
    items: [
      'Who are the hottest leads right now?',
      'Which deals are stalled and need attention?',
      'Top 10 leads by estimated value',
      'City-wise opportunity breakdown',
      'Which leads haven\'t been contacted yet?',
    ],
  },
  {
    label: 'Content',
    icon: FileText,
    color: '#D97706',
    items: [
      'Write a cold email for my top lead',
      'Draft a WhatsApp broadcast for re-engagement',
      'Write a LinkedIn post for Levitate Labs',
      'Generate a blog post idea for Indian MSMEs',
      'Create a follow-up email sequence (3 steps)',
    ],
  },
  {
    label: 'WhatsApp',
    icon: MessageSquare,
    color: '#7C3AED',
    items: [
      'Analyze my WhatsApp campaign performance',
      'Suggest the best time to send WhatsApp blasts',
      'Write a WhatsApp intro message for cold leads',
      'How can I improve my reply rate?',
    ],
  },
  {
    label: 'Strategy',
    icon: Rocket,
    color: '#DC2626',
    items: [
      'What are the top 3 growth opportunities this week?',
      'Which industries should I target next?',
      'Pricing optimization advice',
      'How can I improve client retention?',
      'Platform health and churn risk analysis',
    ],
  },
];

// ── Data access list ───────────────────────────────────────────────────────────
const POWERS = [
  { icon: Users,        label: 'Admin CRM leads',         color: '#6366f1' },
  { icon: IndianRupee,  label: 'Revenue & invoices',       color: '#059669' },
  { icon: FileText,     label: 'Projects & pipeline',      color: '#0891B2' },
  { icon: Database,     label: 'AI lead database',         color: '#7C3AED' },
  { icon: MessageSquare, label: 'WhatsApp campaigns',      color: '#D97706' },
  { icon: TrendingUp,   label: 'Intake responses',         color: '#DC2626' },
  { icon: Crosshair,    label: 'Platform clients',         color: '#B08D57' },
  { icon: Mail,         label: 'Email drip sequences',     color: '#6B7280' },
  { icon: Activity,     label: 'Agent health & logs',      color: '#10B981' },
  { icon: Users,        label: 'Team members',             color: '#374151' },
];

const WELCOME = `Hello Pushpal. I'm the Levitate Admin AI — your command center.

I have **live access** to every corner of your business:
• **CRM**: all leads, scores, pipeline stages, estimated values
• **Revenue**: every invoice, payment, pending collection
• **Clients**: all platform companies and their subscription health
• **WhatsApp**: campaigns, queue, message analytics across all clients
• **AI Lead Database**: scored potential leads from scraping
• **Agents**: health, logs, errors, suspension status
• **Intake**: form responses, budgets, service interests

Ask me anything — analysis, content generation, strategy, reports. I can write complete cold emails, WhatsApp messages, LinkedIn posts, and full reports based on your actual data.

What do you need?`;

// ── Markdown-like formatter ────────────────────────────────────────────────────
function formatMsg(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#F3F4F6;padding:1px 5px;border-radius:4px;font-size:12px;font-family:monospace">$1</code>')
    .replace(/^#{1,3} (.+)$/gm, '<strong style="font-size:14px;display:block;margin:6px 0 2px">$1</strong>')
    .replace(/^[\*\-•] (.+)$/gm, '<span style="display:flex;gap:7px;margin:2px 0"><span style="color:#B08D57;font-weight:700;flex-shrink:0">•</span><span>$1</span></span>')
    .replace(/^(\d+)\. (.+)$/gm, '<span style="display:flex;gap:7px;margin:2px 0"><span style="color:#B08D57;font-weight:700;flex-shrink:0;min-width:16px">$1.</span><span>$2</span></span>')
    .replace(/══+.*?══+/g, m => `<span style="display:block;font-weight:700;font-size:11px;letter-spacing:0.08em;color:#6B7280;margin:10px 0 4px;text-transform:uppercase">${m.replace(/═+/g, '').trim()}</span>`)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} title="Copy message" style={{ padding: '3px 6px', borderRadius: 5, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B7280' }}>
      {copied ? <Check size={11} color="#059669" /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ActionChips({ actions, onCopy }: { actions: Action[]; onCopy: (content: string) => void }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  if (!actions?.length) return null;

  const handleCopy = (i: number, content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopiedIdx(i);
    setTimeout(() => setCopiedIdx(null), 2000);
    onCopy(content);
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
      {actions.map((a, i) => {
        if (a.type === 'navigate' && a.href) {
          return (
            <Link key={i} href={a.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, border: '1px solid #B08D57', background: '#FBF7EE', fontSize: 11, color: '#8a6d3f', textDecoration: 'none', fontWeight: 600 }}>
              <ExternalLink size={11} /> {a.label}
            </Link>
          );
        }
        if (a.type === 'copy' && a.content) {
          return (
            <button key={i} onClick={() => handleCopy(i, a.content!)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB', background: copiedIdx === i ? '#F0FDF4' : 'white', fontSize: 11, color: copiedIdx === i ? '#059669' : '#374151', cursor: 'pointer', fontWeight: 600 }}>
              {copiedIdx === i ? <Check size={11} /> : <Copy size={11} />}
              {copiedIdx === i ? 'Copied!' : a.label}
            </button>
          );
        }
        return null;
      })}
    </div>
  );
}

function QuickActionGroup({ group, onSelect }: { group: typeof ACTION_GROUPS[0]; onSelect: (q: string) => void }) {
  const [open, setOpen] = useState(false);
  const Icon = group.icon;
  return (
    <div style={{ marginBottom: 6 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', borderRadius: 8, border: '1px solid #F3F4F6', background: open ? '#F9FAFB' : 'white', cursor: 'pointer', textAlign: 'left' }}>
        <Icon size={12} color={group.color} />
        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#374151' }}>{group.label}</span>
        {open ? <ChevronUp size={11} color="#9CA3AF" /> : <ChevronDown size={11} color="#9CA3AF" />}
      </button>
      {open && (
        <div style={{ paddingLeft: 4, marginTop: 3 }}>
          {group.items.map(q => (
            <button key={q} onClick={() => onSelect(q)} style={{ width: '100%', textAlign: 'left', padding: '5px 8px 5px 18px', borderRadius: 6, border: 'none', background: 'transparent', fontSize: 11, color: '#6B7280', cursor: 'pointer', lineHeight: 1.4, display: 'block', transition: 'background 0.1s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLButtonElement).style.color = '#111827'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; }}>
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────
export default function AdminAIPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: WELCOME, ts: Date.now(), actions: [] },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;

    const userMsg: Msg = { role: 'user', content: q, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    const history = messages.slice(-14).map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/admin/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history }),
      });
      const data = await res.json() as { reply?: string; actions?: Action[]; error?: string };
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply!, ts: Date.now(), actions: data.actions ?? [] }]);
      } else {
        setError(data.error ?? 'AI unavailable');
      }
    } catch {
      setError('Network error — please retry');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading, messages]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const clear = () => setMessages([{ role: 'assistant', content: WELCOME, ts: Date.now(), actions: [] }]);

  const card: React.CSSProperties = {
    background: 'white', border: '1px solid #E5E7EB', borderRadius: 12,
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#B08D57,#8C6D3F)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(176,141,87,0.3)' }}>
            <Brain size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              Admin AI Command Center
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'linear-gradient(135deg,#B08D57,#8C6D3F)', color: 'white', letterSpacing: '0.05em' }}>LIVE DATA</span>
            </h1>
            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Full platform intelligence — CRM · Revenue · WhatsApp · Agents · Clients</p>
          </div>
        </div>
        <button onClick={clear} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>
          <RefreshCw size={12} /> New chat
        </button>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>

        {/* ── Left panel ─────────────────────────────────────────────── */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>

          {/* Data access */}
          <div style={{ ...card, padding: '12px 14px', flexShrink: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>AI has access to</p>
            {POWERS.map(({ icon: Icon, label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={12} color={color} />
                </div>
                <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.3 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div style={{ ...card, padding: '12px 14px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>Quick actions</p>
            {ACTION_GROUPS.map(g => (
              <QuickActionGroup key={g.label} group={g} onSelect={q => { send(q); }} />
            ))}
          </div>
        </div>

        {/* ── Chat area ──────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Messages */}
          <div style={{ ...card, flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: m.role === 'user' ? '#EEF2FF' : 'linear-gradient(135deg,#B08D57,#8C6D3F)',
                }}>
                  {m.role === 'user'
                    ? <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1' }}>P</span>
                    : <Bot size={16} color="white" />
                  }
                </div>

                {/* Bubble */}
                <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{
                    padding: '11px 15px',
                    borderRadius: m.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                    background: m.role === 'user' ? '#EEF2FF' : 'white',
                    border: m.role === 'user' ? '1px solid #C7D2FE' : '1px solid #F3F4F6',
                    fontSize: 13, color: '#111827', lineHeight: 1.65,
                  }}>
                    {m.role === 'assistant'
                      ? <span dangerouslySetInnerHTML={{ __html: formatMsg(m.content) }} />
                      : m.content
                    }
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 5, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                      {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Action chips + copy */}
                  {m.role === 'assistant' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                      <CopyButton text={m.content} />
                      {m.actions && m.actions.length > 0 && (
                        <ActionChips actions={m.actions} onCopy={() => {}} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#B08D57,#8C6D3F)' }}>
                  <Bot size={16} color="white" />
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '4px 12px 12px 12px', background: 'white', border: '1px solid #F3F4F6', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#B08D57', animation: `bounce 1.2s ease infinite ${i * 0.15}s` }} />
                  ))}
                  <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>Analyzing your data…</span>
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: '9px 14px', borderRadius: 9, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 12, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚠ {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggestion chips row */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, flexShrink: 0 }}>
            {[
              "Today's summary",
              'Hot leads',
              'Revenue this month',
              'WhatsApp stats',
              'Agent health',
              'Write cold email',
            ].map(q => (
              <button key={q} onClick={() => send(q)} style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid #E5E7EB', background: 'white', fontSize: 11, color: '#374151', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#B08D57'; (e.currentTarget as HTMLButtonElement).style.color = '#8a6d3f'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}>
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, border: '2px solid #E5E7EB', borderRadius: 13, background: 'white', display: 'flex', alignItems: 'flex-end', padding: '3px 4px 3px 14px', transition: 'border-color 0.15s' }}
                onFocusCapture={e => (e.currentTarget.style.borderColor = '#B08D57')}
                onBlurCapture={e => (e.currentTarget.style.borderColor = '#E5E7EB')}>
                <Sparkles size={14} color="#B08D57" style={{ marginBottom: 11, marginRight: 4, flexShrink: 0 }} />
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask anything — leads, revenue, campaigns, write emails, generate reports…"
                  rows={1}
                  style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', fontSize: 13, color: '#111827', fontFamily: 'Inter, sans-serif', padding: '9px 0', lineHeight: 1.5, maxHeight: 140, background: 'transparent' }}
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: 'none', flexShrink: 0, marginBottom: 4,
                    background: input.trim() && !loading ? 'linear-gradient(135deg,#B08D57,#8C6D3F)' : '#F3F4F6',
                    color: input.trim() && !loading ? 'white' : '#9CA3AF',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                  }}>
                  {loading
                    ? <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                    : <Send size={14} />
                  }
                </button>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 6 }}>
              Enter to send · Shift+Enter for new line · All data is live from Supabase
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
