'use client';
import { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  DEMO_LEADS, DEMO_AGENT_ACTIVITY, DEMO_MRR_TREND,
  DEMO_PIPELINE_COUNTS, DEMO_AGENT_CREDITS,
  type DemoLead, type DemoLeadStatus,
} from '@/lib/demoData';

type Tab = 'overview' | 'leads' | 'agents' | 'pipeline';

const GOLD = '#C8A96E';
const STAGES: DemoLeadStatus[] = ['Found', 'Contacted', 'Responded', 'Proposal Sent', 'Converted'];
const STAGE_COLORS: Record<DemoLeadStatus, string> = {
  Found: '#818cf8',
  Contacted: '#60a5fa',
  Responded: '#fbbf24',
  'Proposal Sent': '#fb923c',
  Converted: '#4ade80',
};
const CATEGORIES = ['all', 'Clinic', 'Restaurant', 'Coaching Centre', 'Real Estate', 'Gym', 'CA/Accountant'];
const AGENT_CREDITS = DEMO_AGENT_CREDITS as Record<string, number>;

function getWAThread(lead: DemoLead) {
  const threads: Record<string, { from: 'us' | 'them'; text: string; time: string }[]> = {
    Found: [],
    Contacted: [
      { from: 'us', text: `Hi! I'm reaching out from LEVITATE. We help ${lead.category.toLowerCase()}s like ${lead.businessName} get a professional website + more clients via WhatsApp outreach.`, time: '10:14 AM' },
    ],
    Responded: [
      { from: 'us', text: `Hi! I'm reaching out from LEVITATE. We help ${lead.category.toLowerCase()}s like ${lead.businessName} get a professional website + more clients via WhatsApp outreach.`, time: '10:14 AM' },
      { from: 'them', text: 'Haan bhai, website chahiye thi. Kitna cost hoga?', time: '11:02 AM' },
      { from: 'us', text: 'We start at ₹4,999 for a full site with booking form, gallery & WhatsApp button — live in 24 hours!', time: '11:15 AM' },
    ],
    'Proposal Sent': [
      { from: 'us', text: `Hi! I'm reaching out from LEVITATE. We help ${lead.category.toLowerCase()}s like ${lead.businessName} get a professional website + more clients.`, time: '10:14 AM' },
      { from: 'them', text: 'Haan, thoda details batao.', time: '11:02 AM' },
      { from: 'us', text: "We start at ₹4,999 for a full site — live in 24h. I've sent a full proposal to review 👆", time: '11:20 AM' },
      { from: 'them', text: 'Proposal dekha. Ek baar call kar sakte ho?', time: '2:30 PM' },
      { from: 'us', text: "Bilkul! I've shared a calendar link. Pick a slot that works 📅", time: '2:45 PM' },
    ],
    Converted: [
      { from: 'us', text: `Hi! I'm reaching out from LEVITATE. We help ${lead.category.toLowerCase()}s like ${lead.businessName} get a professional website + more clients.`, time: '10:14 AM' },
      { from: 'them', text: 'Haan bhai, website chahiye. Kitna time lagega?', time: '11:02 AM' },
      { from: 'us', text: 'Sirf 24 ghante! Payment ke baad immediately kaam shuru. ₹4,999 all-in.', time: '11:20 AM' },
      { from: 'them', text: "24 ghante mein pakka ho jayegi? OK let's do it.", time: '3:10 PM' },
      { from: 'us', text: 'Done! Payment link sent. Welcome to LEVITATE 🚀', time: '3:22 PM' },
      { from: 'them', text: 'Payment done ✓', time: '3:45 PM' },
    ],
  };
  return threads[lead.status] ?? [];
}

function useCountUp(target: number, duration = 1400) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const steps = 70;
    const delay = duration / steps;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setCount(Math.round((target * i) / steps));
      if (i >= steps) clearInterval(t);
    }, delay);
    return () => clearInterval(t);
  }, [target, duration]);
  return count;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1C1C26', border: '1px solid #C8A96E44', borderRadius: 8, padding: '8px 14px' }}>
      <div style={{ color: '#888', fontSize: 11 }}>{label}</div>
      <div style={{ color: GOLD, fontWeight: 700, fontSize: 16 }}>
        ₹{payload[0].value.toLocaleString('en-IN')}
      </div>
    </div>
  );
}

export default function DemoDashboardClient() {
  const [tab, setTab] = useState<Tab>('overview');
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [feed, setFeed] = useState(DEMO_AGENT_ACTIVITY.slice(0, 5));
  const [feedKey, setFeedKey] = useState(0);
  const [pipelineVisible, setPipelineVisible] = useState(false);
  const [nowStr, setNowStr] = useState('');

  const totalLeads = useCountUp(252);
  const mrr = useCountUp(420000);
  const sites = useCountUp(12);

  useEffect(() => {
    const t = setInterval(() => {
      setFeed(prev => {
        const pool = DEMO_AGENT_ACTIVITY;
        return [pool[Math.floor(Math.random() * pool.length)], ...prev.slice(0, 4)];
      });
      setFeedKey(k => k + 1);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const tick = () => setNowStr(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (tab === 'pipeline') {
      const t = setTimeout(() => setPipelineVisible(true), 80);
      return () => clearTimeout(t);
    } else {
      setPipelineVisible(false);
    }
  }, [tab]);

  const filteredLeads = DEMO_LEADS.filter(l =>
    (filterCat === 'all' || l.category === filterCat) &&
    (filterStatus === 'all' || l.status === filterStatus)
  );

  const agentTaskList = (name: string) =>
    DEMO_AGENT_ACTIVITY.filter(a => a.startsWith(name));

  const totalPipelineValue = DEMO_LEADS.reduce((s, l) => s + l.leadScore * 3500, 0);
  const avgAgentScore = Math.round(
    Object.values(DEMO_AGENT_CREDITS).reduce((a, b) => a + b, 0) /
    Object.values(DEMO_AGENT_CREDITS).length
  );

  return (
    <div style={{ minHeight: '100vh', background: '#08080F', color: '#E8E8F0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes slideDown { from { opacity:0; transform:translateY(-10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes liveGlow { 0%,100%{box-shadow:0 0 5px #22c55e88} 50%{box-shadow:0 0 12px #22c55ecc} }
        .demo-fade-in { animation: fadeIn 0.35s ease both }
        .demo-slide-down { animation: slideDown 0.3s ease both }
        .demo-fade-up { animation: fadeUp 0.4s ease both }
        .demo-card { background:#13131A; border:1px solid #2A2A38; border-radius:12px; transition:border-color 0.2s }
        .demo-card:hover { border-color:#C8A96E33 }
        .demo-live-dot { width:8px; height:8px; border-radius:50%; background:#22c55e; animation:liveGlow 2s ease-in-out infinite }
        .demo-tab { padding:8px 18px; border-radius:8px 8px 0 0; border:1px solid transparent; border-bottom:none; cursor:pointer; font-size:13px; font-weight:600; background:transparent; transition:all 0.2s; letter-spacing:0.3px }
        .demo-tab-active { background:#C8A96E11; border-color:#C8A96E44; color:#C8A96E }
        .demo-tab-inactive { color:#555 }
        .demo-tab-inactive:hover { color:#999; background:#ffffff08 }
        .demo-select { background:#1C1C26; color:#E8E8F0; border:1px solid #2A2A38; border-radius:8px; padding:6px 10px; font-size:13px; cursor:pointer }
        .demo-select:focus { outline:none; border-color:#C8A96E88 }
        .demo-agent-card { cursor:pointer; transition:all 0.18s }
        .demo-agent-card:hover { background:#1C1C26!important; border-color:#C8A96E44!important }
        .demo-agent-selected { border-color:#C8A96E!important; background:#1C1C26!important }
        .demo-lead-row { cursor:pointer; transition:background 0.15s }
        .demo-lead-row:hover { background:#1A1A24!important }
        .demo-action-btn { padding:8px 12px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.15s; border:1px solid }
        .demo-action-btn:hover { opacity:0.85; transform:translateY(-1px) }
        @media (max-width: 900px) {
          .demo-kpi-grid { grid-template-columns: repeat(2,1fr)!important }
          .demo-main-row { grid-template-columns: 1fr!important }
          .demo-agent-grid { grid-template-columns: repeat(2,1fr)!important }
          .demo-agent-layout { grid-template-columns: 1fr!important }
          .demo-stage-row { grid-template-columns: repeat(2,1fr)!important }
          .demo-leads-table { overflow-x:auto }
          .demo-lead-expand { grid-template-columns: 1fr!important }
        }
      `}</style>

      {/* ── Dashboard header ───────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #1C1C26', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: GOLD, fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px' }}>LEVITATE</span>
          <span style={{ color: '#2A2A38', fontSize: 16 }}>|</span>
          <span style={{ color: '#555', fontSize: 13 }}>Business Dashboard</span>
          <span style={{ background: '#C8A96E18', color: GOLD, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, letterSpacing: '0.8px', border: '1px solid #C8A96E33' }}>
            DEMO
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="demo-live-dot" />
            <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, letterSpacing: '0.8px' }}>LIVE</span>
          </div>
          <span style={{ fontSize: 12, color: '#444', fontVariantNumeric: 'tabular-nums' }}>{nowStr}</span>
        </div>
      </div>

      {/* ── Tab nav ────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #1C1C26', padding: '0 20px', display: 'flex', gap: 4, paddingTop: 12 }}>
        {(['overview', 'leads', 'agents', 'pipeline'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`demo-tab ${tab === t ? 'demo-tab-active' : 'demo-tab-inactive'}`}
            style={{ color: tab === t ? GOLD : undefined }}>
            {t === 'leads' ? `Leads (${DEMO_LEADS.length})`
              : t === 'agents' ? `Agents (${Object.keys(DEMO_AGENT_CREDITS).length})`
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: 24 }}>

        {/* ══ OVERVIEW ════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="demo-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* KPI cards */}
            <div className="demo-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
              {[
                { label: 'Total Leads', val: totalLeads.toLocaleString('en-IN'), prefix: '', sub: '+12 this week', color: '#818cf8' },
                { label: 'Monthly Revenue', val: mrr.toLocaleString('en-IN'), prefix: '₹', sub: 'Apr 2025', color: GOLD },
                { label: 'Conversion Rate', val: '2.4', prefix: '', suffix: '%', sub: '6 of 252 leads', color: '#4ade80' },
                { label: 'Sites Deployed', val: sites.toString(), prefix: '', sub: 'Goal: 16 this month', color: '#60a5fa' },
              ].map((kpi, i) => (
                <div key={kpi.label} className="demo-card demo-fade-up" style={{ padding: '18px 20px', animationDelay: `${i * 0.08}s` }}>
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{kpi.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: kpi.color, lineHeight: 1, marginBottom: 6, letterSpacing: '-1px' }}>
                    {kpi.prefix}{kpi.val}{'suffix' in kpi ? kpi.suffix : ''}
                  </div>
                  <div style={{ fontSize: 12, color: '#444' }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Chart + activity */}
            <div className="demo-main-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <div className="demo-card" style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Revenue Growth</div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Nov 2024 – Apr 2025</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#4ade80', background: '#4ade8011', padding: '4px 12px', borderRadius: 20, fontWeight: 600, border: '1px solid #4ade8033' }}>
                    ₹0 → ₹4.2L
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={DEMO_MRR_TREND} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GOLD} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={GOLD} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1C1C26" vertical={false} />
                    <XAxis dataKey="month" stroke="#333" tick={{ fill: '#555', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#333" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false}
                      tickFormatter={v => v === 0 ? '₹0' : `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="mrr" stroke={GOLD} strokeWidth={2.5}
                      fill="url(#mrrGrad)"
                      dot={{ fill: GOLD, r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: GOLD, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Live activity feed */}
              <div className="demo-card" style={{ padding: 20, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Agent Activity</div>
                  <div style={{ fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                    16 running
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {feed.map((activity, i) => (
                    <div key={`${feedKey}-${i}`}
                      className={i === 0 ? 'demo-slide-down' : ''}
                      style={{
                        padding: '10px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.4,
                        background: i === 0 ? '#C8A96E0D' : '#0A0A12',
                        border: `1px solid ${i === 0 ? '#C8A96E2A' : '#1A1A24'}`,
                        color: i === 0 ? '#C8C8D8' : '#555',
                        transition: 'all 0.3s',
                      }}>
                      <span style={{ marginRight: 6, fontSize: 8 }}>●</span>
                      {activity}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pipeline mini bars */}
            <div className="demo-card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>Pipeline Overview</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {STAGES.map(stage => {
                  const count = DEMO_PIPELINE_COUNTS[stage];
                  const pct = Math.round((count / DEMO_PIPELINE_COUNTS.Found) * 100);
                  return (
                    <div key={stage} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 40px', alignItems: 'center', gap: 14 }}>
                      <div style={{ fontSize: 12, color: '#777' }}>{stage}</div>
                      <div style={{ background: '#1A1A24', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', borderRadius: 6,
                          background: `linear-gradient(90deg, ${STAGE_COLORS[stage]}88, ${STAGE_COLORS[stage]})`,
                          transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1)',
                        }} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: STAGE_COLORS[stage], textAlign: 'right' }}>{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ LEADS ═══════════════════════════════════════════════════ */}
        {tab === 'leads' && (
          <div className="demo-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Filter bar */}
            <div className="demo-card" style={{ padding: '13px 18px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>FILTER</span>
              <select className="demo-select" value={filterCat} onChange={e => { setFilterCat(e.target.value); setExpandedLead(null); }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
              </select>
              <select className="demo-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setExpandedLead(null); }}>
                {(['all', ...STAGES] as string[]).map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}
              </select>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#444' }}>
                {filteredLeads.length} leads shown
              </span>
            </div>

            {/* Table */}
            <div className="demo-card demo-leads-table" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1C1C26' }}>
                    {['Business', 'City', 'Category', 'Score', 'Status', 'Phone', ''].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', color: '#444', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.flatMap((lead, rowIdx) => {
                    const isExp = expandedLead === lead.id;
                    const waThread = getWAThread(lead);
                    const scoreColor = lead.leadScore >= 8 ? '#4ade80' : lead.leadScore >= 6 ? GOLD : '#f87171';

                    const mainRow = (
                      <tr key={lead.id} className="demo-lead-row"
                        style={{ borderBottom: isExp ? 'none' : '1px solid #141420', background: isExp ? '#161620' : rowIdx % 2 === 0 ? 'transparent' : '#0C0C14' }}
                        onClick={() => setExpandedLead(isExp ? null : lead.id)}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#E0E0EC' }}>{lead.businessName}</td>
                        <td style={{ padding: '12px 16px', color: '#666' }}>{lead.city}</td>
                        <td style={{ padding: '12px 16px', color: '#666' }}>{lead.category}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%',
                              background: `conic-gradient(${scoreColor} ${lead.leadScore * 36}deg, #1C1C26 0)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <div style={{ width: 22, height: 22, borderRadius: '50%', background: isExp ? '#161620' : '#13131A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: scoreColor }}>
                                {lead.leadScore}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: STAGE_COLORS[lead.status] + '18',
                            color: STAGE_COLORS[lead.status],
                          }}>{lead.status}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#555', fontSize: 12 }}>{lead.phone}</td>
                        <td style={{ padding: '12px 16px', color: '#333', fontSize: 10, userSelect: 'none' }}>{isExp ? '▲' : '▼'}</td>
                      </tr>
                    );

                    if (!isExp) return [mainRow];

                    const expandRow = (
                      <tr key={`${lead.id}-exp`} style={{ borderBottom: '1px solid #1C1C26', background: '#0E0E18' }}>
                        <td colSpan={7} style={{ padding: '0 16px 20px' }}>
                          <div className="demo-slide-down demo-lead-expand" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 16 }}>
                            {/* Lead details */}
                            <div style={{ background: '#0A0A12', borderRadius: 10, padding: 18, border: '1px solid #1C1C26' }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Lead Details</div>
                              {[
                                ['ID', lead.id], ['Business', lead.businessName], ['City', lead.city],
                                ['Category', lead.category], ['Phone', lead.phone],
                                ['Score', `${lead.leadScore}/10`], ['Status', lead.status],
                              ].map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #141420', fontSize: 12 }}>
                                  <span style={{ color: '#444' }}>{k}</span>
                                  <span style={{ color: '#C8C8D8', fontWeight: 500 }}>{v}</span>
                                </div>
                              ))}
                              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                                <button className="demo-action-btn" style={{ flex: 1, background: '#C8A96E0D', borderColor: '#C8A96E55', color: GOLD }}>
                                  Send Proposal
                                </button>
                                <button className="demo-action-btn" style={{ flex: 1, background: '#4ade800D', borderColor: '#4ade8044', color: '#4ade80' }}>
                                  Mark Converted
                                </button>
                              </div>
                            </div>

                            {/* WhatsApp thread */}
                            <div style={{ background: '#0B1014', borderRadius: 10, padding: 18, border: '1px solid #1C2C34' }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                WhatsApp Thread
                                <span style={{ fontSize: 10, color: '#2A3A30', fontWeight: 400, background: '#1A2A1A', padding: '2px 6px', borderRadius: 4 }}>simulated</span>
                              </div>
                              {waThread.length === 0 ? (
                                <div style={{ color: '#2A3A2A', fontSize: 12, textAlign: 'center', padding: '24px 0', border: '1px dashed #1C2C1C', borderRadius: 8 }}>
                                  No messages yet — lead is in &quot;Found&quot; stage
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 230, overflowY: 'auto' }}>
                                  {waThread.map((msg, mi) => (
                                    <div key={mi} style={{ display: 'flex', justifyContent: msg.from === 'us' ? 'flex-end' : 'flex-start' }}>
                                      <div style={{
                                        maxWidth: '82%', padding: '8px 12px', fontSize: 12, lineHeight: 1.45, color: '#D8D8E8',
                                        borderRadius: msg.from === 'us' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                                        background: msg.from === 'us' ? '#054640' : '#1F2C34',
                                      }}>
                                        {msg.text}
                                        <div style={{ fontSize: 10, color: '#4A5A50', marginTop: 3, textAlign: 'right' }}>{msg.time}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );

                    return [mainRow, expandRow];
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ AGENTS ══════════════════════════════════════════════════ */}
        {tab === 'agents' && (
          <div className="demo-fade-in demo-agent-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: '#444', marginBottom: 14, letterSpacing: '0.3px' }}>Click any agent card to see their activity log</div>
              <div className="demo-agent-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {Object.entries(DEMO_AGENT_CREDITS).map(([name, score]) => {
                  const isSel = selectedAgent === name;
                  const taskCount = agentTaskList(name).length;
                  return (
                    <div key={name}
                      className={`demo-card demo-agent-card ${isSel ? 'demo-agent-selected' : ''}`}
                      style={{ padding: '14px 12px', borderColor: isSel ? GOLD : '#2A2A38' }}
                      onClick={() => setSelectedAgent(isSel ? null : name)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e88' }} />
                        <div style={{ fontSize: 9, color: '#444', fontWeight: 600 }}>{taskCount > 0 ? `${taskCount} tasks` : 'active'}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 9 }}>
                        <div style={{
                          width: 46, height: 46, borderRadius: '50%',
                          background: `conic-gradient(${GOLD} ${score * 3.6}deg, #1C1C26 0)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: isSel ? '#1C1C26' : '#13131A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: GOLD }}>
                            {score}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: isSel ? '#E8E8F0' : '#888', textAlign: 'center', lineHeight: 1.3 }}>{name}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {selectedAgent ? (
                <div className="demo-card demo-slide-down" style={{ padding: 20 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: GOLD, marginBottom: 3 }}>{selectedAgent}</div>
                  <div style={{ fontSize: 12, color: '#444', marginBottom: 14 }}>
                    Score: {AGENT_CREDITS[selectedAgent]}/100 · {agentTaskList(selectedAgent).length} logged tasks
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {agentTaskList(selectedAgent).length > 0
                      ? agentTaskList(selectedAgent).map((a, i) => (
                          <div key={i} style={{ padding: '9px 11px', borderRadius: 7, background: '#0A0A12', border: '1px solid #1A1A24', fontSize: 12, color: '#888', lineHeight: 1.4 }}>
                            <span style={{ color: '#333', marginRight: 6, fontSize: 8 }}>●</span>{a}
                          </div>
                        ))
                      : <div style={{ fontSize: 12, color: '#333', padding: '12px 0' }}>No specific logs for this agent in the demo dataset.</div>
                    }
                  </div>
                </div>
              ) : (
                <div className="demo-card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 13, color: '#333', textAlign: 'center', padding: '32px 0' }}>
                    ← Select an agent
                  </div>
                </div>
              )}

              <div className="demo-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: '#E8E8F0' }}>Fleet Overview</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Active Agents', val: '16', color: '#22c55e' },
                    { label: 'Avg Score', val: avgAgentScore.toString(), color: GOLD },
                    { label: 'Tasks Logged', val: '47', color: '#60a5fa' },
                    { label: 'Errors', val: '0', color: '#4ade80' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#0A0A12', borderRadius: 8, padding: '12px 14px', border: '1px solid #141420' }}>
                      <div style={{ fontSize: 10, color: '#444', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ PIPELINE ════════════════════════════════════════════════ */}
        {tab === 'pipeline' && (
          <div className="demo-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Funnel */}
            <div className="demo-card" style={{ padding: '24px 28px' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 22 }}>Sales Funnel</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {STAGES.map((stage, i) => {
                  const count = DEMO_PIPELINE_COUNTS[stage];
                  const prevCount = i > 0 ? DEMO_PIPELINE_COUNTS[STAGES[i - 1]] : count;
                  const convRate = i > 0 ? Math.round((count / prevCount) * 100) : 100;
                  const barPct = (count / DEMO_PIPELINE_COUNTS.Found) * 100;
                  return (
                    <div key={stage}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: STAGE_COLORS[stage], flexShrink: 0 }} />
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#E0E0EC' }}>{stage}</span>
                          {i > 0 && (
                            <span style={{ fontSize: 11, color: '#444', background: '#141420', padding: '2px 7px', borderRadius: 12 }}>
                              {convRate}% from prev
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 18, fontWeight: 700, color: STAGE_COLORS[stage] }}>{count}</span>
                      </div>
                      <div style={{ background: '#141420', borderRadius: 6, height: 22, overflow: 'hidden' }}>
                        <div style={{
                          width: pipelineVisible ? `${barPct}%` : '0%',
                          height: '100%', borderRadius: 6,
                          background: `linear-gradient(90deg, ${STAGE_COLORS[stage]}66, ${STAGE_COLORS[stage]})`,
                          transition: `width ${0.8 + i * 0.18}s cubic-bezier(0.4,0,0.2,1) ${i * 0.08}s`,
                          display: 'flex', alignItems: 'center', paddingRight: 10, justifyContent: 'flex-end',
                        }}>
                          {barPct > 22 && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.65)' }}>{Math.round(barPct)}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage cards */}
            <div className="demo-stage-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
              {STAGES.map(stage => (
                <div key={stage} className="demo-card" style={{ padding: '16px 18px', borderLeft: `3px solid ${STAGE_COLORS[stage]}` }}>
                  <div style={{ fontSize: 10, color: '#444', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stage}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: STAGE_COLORS[stage], lineHeight: 1, marginBottom: 4 }}>
                    {DEMO_PIPELINE_COUNTS[stage]}
                  </div>
                  <div style={{ fontSize: 11, color: '#444' }}>
                    {stage === 'Converted'
                      ? `₹${(DEMO_PIPELINE_COUNTS[stage] * 35000).toLocaleString('en-IN')} earned`
                      : `Est. ₹${(DEMO_PIPELINE_COUNTS[stage] * 35000).toLocaleString('en-IN')}`}
                  </div>
                </div>
              ))}
            </div>

            {/* Total value banner */}
            <div className="demo-card" style={{ padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #13131A, #1A1A0A)' }}>
              <div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total Pipeline Value · @ ₹35,000 avg deal</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: GOLD, letterSpacing: '-1px' }}>
                  ₹{totalPipelineValue.toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.6px' }}>End-to-end conversion</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#4ade80', letterSpacing: '-1px' }}>
                  {((DEMO_PIPELINE_COUNTS.Converted / DEMO_PIPELINE_COUNTS.Found) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
