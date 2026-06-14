'use client';

import { useState } from 'react';
import {
  MessageCircle, FileSpreadsheet, Bot, Zap, Download,
  ChevronDown, ChevronUp, CheckCircle2, ExternalLink,
  Sparkles, Users, RefreshCw, BookOpen, BarChart3,
} from 'lucide-react';

interface Step { text: string; code?: string }
interface Guide {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  steps: Step[];
}

const GUIDES: Guide[] = [
  {
    id: 'whatsapp-agent',
    icon: <MessageCircle size={20} color="white" />,
    title: 'WhatsApp Agent Setup',
    subtitle: 'Connect your WhatsApp number to send campaigns, drip sequences and auto-replies',
    color: '#22c55e',
    steps: [
      { text: 'Go to WhatsApp → Connect tab in your dashboard' },
      { text: 'Click "Generate Link Code" — an 8-character code appears (valid 10 min)' },
      { text: 'Download the Levitate WhatsApp Agent EXE and run it' },
      { text: 'In the app: choose Business mode, enter the link code and your dashboard URL', code: 'https://yoursite.netlify.app' },
      { text: 'Click "Link Agent" — the app connects to your account' },
      { text: 'Scan the QR code with your WhatsApp (⋮ → Linked Devices → Link a Device)' },
      { text: 'Green status = connected. Keep the app running in the system tray' },
      { text: 'Now go to Campaigns, create a campaign and click Launch — messages send automatically' },
    ],
  },
  {
    id: 'busy-sync',
    icon: <RefreshCw size={20} color="white" />,
    title: 'Busy Accounting Sync',
    subtitle: 'Auto-import all your Busy customers into the CRM every hour, hands-free',
    color: '#6366f1',
    steps: [
      { text: 'Go to Integrations → LEVITATE Agent (Busy Sync)' },
      { text: 'Go to API Keys and generate a new key — copy it' },
      { text: 'Click "Download One-Click Installer (.bat)" from the Integrations page' },
      { text: 'Double-click the .bat file and follow the prompts — paste your API key when asked' },
      { text: 'The installer auto-detects your Busy folder and sets up the sync agent' },
      { text: 'First sync runs immediately — check Leads to see your Busy customers appear' },
      { text: 'The agent runs in the background and syncs every hour automatically' },
    ],
  },
  {
    id: 'csv-import',
    icon: <FileSpreadsheet size={20} color="white" />,
    title: 'CSV / Excel Import',
    subtitle: 'Upload any spreadsheet — customer lists, leads, contacts from any source',
    color: '#f59e0b',
    steps: [
      { text: 'Go to Integrations → CSV / Excel Import tab' },
      { text: 'Click "Open Import Wizard" — supports CSV, XLS, XLSX up to 200 MB' },
      { text: 'Drop your file — column names are auto-detected and mapped to CRM fields' },
      { text: 'Review the column mapping — adjust if any column was wrongly detected' },
      { text: 'Click "Import" — rows are uploaded in 300-row chunks with a progress bar' },
      { text: 'After import: toggle "Launch WhatsApp Campaign" to message all imported contacts immediately' },
      { text: 'Tip: name your columns "Name", "Phone", "City" for best auto-detection' },
    ],
  },
  {
    id: 'ai-analyze',
    icon: <Sparkles size={20} color="white" />,
    title: 'AI Data Analyzer',
    subtitle: 'Upload any data file — AI reads it chunk by chunk and gives business insights',
    color: '#8b5cf6',
    steps: [
      { text: 'Go to AI Analyze in the sidebar' },
      { text: 'Upload a CSV or Excel file (customer data, sales data, any tabular data)' },
      { text: 'Optionally type a question: "Who are my top customers?" or "Identify data quality issues"' },
      { text: 'Click Analyze — AI processes 50 rows at a time to stay within rate limits' },
      { text: 'Live insights appear as each chunk finishes — watch patterns emerge in real time' },
      { text: 'Final analysis shows: Executive Summary, Key Findings, Recommendations, Data Quality' },
      { text: 'If your file has phone numbers: click "Launch WhatsApp Campaign" to message everyone with personalized messages' },
      { text: 'Export the analysis as a .txt report' },
    ],
  },
  {
    id: 'ai-assistant',
    icon: <Bot size={20} color="white" />,
    title: 'AI Business Assistant',
    subtitle: 'Ask anything about your CRM, leads, campaigns — get instant data-driven answers',
    color: '#2563eb',
    steps: [
      { text: 'Go to AI Assistant in the sidebar' },
      { text: 'The AI has live access to: your leads, their status, top cities, all campaigns and their stats' },
      { text: 'Ask questions like: "Who are my top 5 leads?", "How did my last campaign do?", "Which city has the most customers?"' },
      { text: 'Ask for help: "Draft a WhatsApp message for re-engagement" or "Give me a weekly action plan"' },
      { text: 'The AI can suggest which leads to contact first based on status and value' },
      { text: 'Conversation history is maintained — you can ask follow-up questions' },
    ],
  },
  {
    id: 'drip-sequences',
    icon: <Zap size={20} color="white" />,
    title: 'WhatsApp Drip Sequences',
    subtitle: 'Auto-send multi-step follow-ups over days — fully automated',
    color: '#22c55e',
    steps: [
      { text: 'Go to WhatsApp → Sequences tab' },
      { text: 'Click "New Sequence" — give it a name like "New Lead Nurture"' },
      { text: 'Add steps: Day 0 (welcome), Day 3 (follow-up), Day 7 (offer), Day 14 (final)' },
      { text: 'Use {{name}}, {{city}}, {{category}} in messages — replaced per contact automatically' },
      { text: 'Click Create Sequence' },
      { text: 'Click "Enroll" on the sequence — paste phone numbers (one per line)' },
      { text: 'Format: 9876543210 or 9876543210, Rahul Sharma (to include names)' },
      { text: 'All messages are pre-scheduled — your connected WhatsApp agent sends them at the right time' },
    ],
  },
  {
    id: 're-engage',
    icon: <Users size={20} color="white" />,
    title: 'Re-engagement Automation',
    subtitle: 'Find cold leads and launch an AI-drafted WhatsApp campaign in one click',
    color: '#d97706',
    steps: [
      { text: 'Go to WhatsApp → Re-engage tab' },
      { text: 'Set "Cold after X days" (default 30) — tune based on your sales cycle' },
      { text: 'Click "Find Cold Leads" — AI scans CRM for contacts not reached in that timeframe' },
      { text: 'Review the list of cold leads — see exactly how many days since last contact' },
      { text: 'AI auto-drafts a re-engagement message — review and edit it' },
      { text: 'Click the launch button — personalized messages queued to all cold leads' },
      { text: '{{name}} is automatically replaced with each customer\'s name' },
    ],
  },
  {
    id: 'campaigns',
    icon: <BarChart3 size={20} color="white" />,
    title: 'WhatsApp Campaigns',
    subtitle: 'Send bulk personalized messages with live delivery tracking',
    color: '#059669',
    steps: [
      { text: 'Go to WhatsApp → Campaigns tab' },
      { text: 'Click New Campaign — give it a name' },
      { text: 'Write your message — use {{name}}, {{city}} for personalization' },
      { text: 'Choose targeting: Manual (paste phone numbers) or Leads (from your CRM)' },
      { text: 'For manual: paste numbers one per line in the phone list box' },
      { text: 'Click Launch — messages are queued and your WhatsApp agent sends them with anti-ban delays' },
      { text: 'Watch Sent / Delivered / Reply counts update live on the campaign card' },
      { text: 'Tip: the agent enforces 45-90 second gaps between messages to protect your number' },
    ],
  },
];

function GuideCard({ guide }: { guide: Guide }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      background: 'white', border: `1px solid #E5E7EB`, borderRadius: 12,
      overflow: 'hidden', marginBottom: 10,
      transition: 'box-shadow 0.15s',
      boxShadow: open ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 10, background: guide.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {guide.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{guide.title}</p>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guide.subtitle}</p>
        </div>
        <div style={{ color: '#9CA3AF', flexShrink: 0 }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '16px 20px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {guide.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  background: `${guide.color}15`, border: `1px solid ${guide.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: guide.color,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{step.text}</p>
                  {step.code && (
                    <code style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px', background: '#F3F4F6', borderRadius: 5, fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>
                      {step.code}
                    </code>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [search, setSearch] = useState('');

  const filtered = GUIDES.filter(g =>
    !search || g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', maxWidth: 760, padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={18} color="#059669" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>How to Use LEVITATE</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Step-by-step guides for every feature. Click any guide to expand it.</p>
      </div>

      {/* Quick start banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: 14, padding: '20px 24px', marginBottom: 24, color: 'white', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Quick start checklist</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              'Import your contacts (CSV/Excel or Busy sync)',
              'Download & connect the WhatsApp Agent',
              'Launch your first campaign',
              'Set up a drip sequence for new leads',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                <CheckCircle2 size={13} color="#22c55e" style={{ flexShrink: 0 }} />
                {item}
              </div>
            ))}
          </div>
        </div>
        <a
          href="/business/dashboard/whatsapp"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#22c55e', color: '#0f172a', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
        >
          Go to WhatsApp <ExternalLink size={13} />
        </a>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search guides…"
          style={{ width: '100%', padding: '10px 14px 10px 40px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827', outline: 'none', boxSizing: 'border-box' }}
        />
        <BookOpen size={15} color="#9CA3AF" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
      </div>

      {/* Guides */}
      {filtered.map(g => <GuideCard key={g.id} guide={g} />)}

      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No guides match your search.</div>
      )}

      {/* Support footer */}
      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px', marginTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 2px' }}>Still stuck?</p>
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Use the AI Assistant — it can answer questions about your account, explain features, and suggest next steps.</p>
        </div>
        <a
          href="/business/dashboard/chat"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#6366f1', color: 'white', borderRadius: 9, padding: '9px 16px', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
        >
          <Bot size={13} /> Ask AI
        </a>
      </div>
    </div>
  );
}
