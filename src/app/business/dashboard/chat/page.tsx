'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Bot, Sparkles, User, RefreshCw, BarChart3, Users, Zap } from 'lucide-react';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';
import BusinessPortalLocked from '@/components/business/BusinessPortalLocked';

interface Msg { role: 'user' | 'assistant'; content: string; ts: number }

const QUICK_QUESTIONS = [
  'Who are my top leads?',
  'How are my WhatsApp campaigns performing?',
  'Which city has most leads?',
  'What should I focus on today?',
  'Draft a WhatsApp message for follow-up',
  'How can I improve conversion rate?',
  'Who should I contact first?',
  'Give me a weekly action plan',
];

const WELCOME = `Hi! I'm your LEVITATE AI assistant. I have live access to your CRM, leads, and WhatsApp campaign data.

Ask me anything:
• **"Who are my top leads?"**
• **"How are my campaigns performing?"**
• **"Which customers should I follow up with?"**
• **"Draft a WhatsApp message for re-engagement"**

What would you like to know?`;

function formatMsg(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[\*\-] (.+)$/gm, '<span style="display:flex;gap:6px;margin:1px 0"><span style="color:#6366f1;font-weight:700">•</span><span>$1</span></span>')
    .replace(/\n/g, '<br/>');
}

export default function ChatPage() {
  const portal = useCompanyPortalState();
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: WELCOME, ts: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading || !portal.companyId) return;

    const userMsg: Msg = { role: 'user', content: q, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/business/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: portal.companyId, message: q, history }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply!, ts: Date.now() }]);
      } else {
        setError(data.error ?? 'AI unavailable');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const clear = () => setMessages([{ role: 'assistant', content: WELCOME, ts: Date.now() }]);

  const card: React.CSSProperties = { background: 'white', border: '1px solid #E5E7EB', borderRadius: 12 };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={18} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Business AI Assistant</h1>
            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Live access to your CRM, leads & campaigns</p>
          </div>
        </div>
        <button onClick={clear} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid #E5E7EB', background: 'white', fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>
          <RefreshCw size={12} /> New chat
        </button>
      </div>

      <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
        {/* Context panel */}
        <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...card, padding: '12px 14px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>AI has access to</p>
            {[
              { icon: Users, label: 'Your CRM leads', color: '#6366f1' },
              { icon: MessageCircle, label: 'WhatsApp campaigns', color: '#059669' },
              { icon: BarChart3, label: 'Campaign analytics', color: '#D97706' },
              { icon: Zap, label: 'Business profile', color: '#7C3AED' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <Icon size={13} color={color} />
                <span style={{ fontSize: 11, color: '#374151' }}>{label}</span>
              </div>
            ))}
          </div>

          <div style={{ ...card, padding: '12px 14px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>Try asking</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {QUICK_QUESTIONS.slice(0, 5).map(q => (
                <button key={q} onClick={() => send(q)} style={{ textAlign: 'left', padding: '5px 8px', borderRadius: 6, border: '1px solid #F3F4F6', background: '#FAFAFA', fontSize: 11, color: '#374151', cursor: 'pointer', lineHeight: 1.4 }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Messages */}
          <div style={{ ...card, flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                {/* Avatar */}
                <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.role === 'user' ? '#EEF2FF' : 'linear-gradient(135deg,#7c3aed,#2563eb)' }}>
                  {m.role === 'user'
                    ? <User size={15} color="#6366f1" />
                    : <Bot size={15} color="white" />
                  }
                </div>
                {/* Bubble */}
                <div style={{
                  maxWidth: '72%',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                  background: m.role === 'user' ? '#EEF2FF' : 'white',
                  border: m.role === 'user' ? '1px solid #C7D2FE' : '1px solid #F3F4F6',
                  fontSize: 13,
                  color: '#111827',
                  lineHeight: 1.6,
                }}>
                  {m.role === 'assistant'
                    ? <span dangerouslySetInnerHTML={{ __html: formatMsg(m.content) }} />
                    : m.content
                  }
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                    {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#7c3aed,#2563eb)' }}>
                  <Bot size={15} color="white" />
                </div>
                <div style={{ padding: '10px 16px', borderRadius: '4px 12px 12px 12px', background: 'white', border: '1px solid #F3F4F6', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: `bounce 1.2s ease infinite ${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 12, color: '#DC2626' }}>
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions row */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {QUICK_QUESTIONS.slice(5).map(q => (
              <button key={q} onClick={() => send(q)} style={{ padding: '4px 10px', borderRadius: 20, border: '1px solid #E5E7EB', background: 'white', fontSize: 11, color: '#374151', cursor: 'pointer' }}>
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, border: '2px solid #E5E7EB', borderRadius: 12, background: 'white', display: 'flex', alignItems: 'flex-end', padding: '2px 4px 2px 12px', transition: 'border-color 0.15s' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlur={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about your leads, campaigns, growth strategies…"
                rows={1}
                style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', fontSize: 13, color: '#111827', fontFamily: 'Inter, sans-serif', padding: '9px 0', lineHeight: 1.5, maxHeight: 120, background: 'transparent' }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: input.trim() && !loading ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : '#F3F4F6', color: input.trim() && !loading ? 'white' : '#9CA3AF', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 4, transition: 'all 0.15s' }}
              >
                {loading ? <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={14} />}
              </button>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 6 }}>Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
