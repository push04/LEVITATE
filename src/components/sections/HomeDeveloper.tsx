'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useReveal } from '@/hooks/useReveal';
import s from '@/styles/home.module.css';

const CODE_TABS = [
  {
    id: 'js',
    label: 'JS Embed',
    lang: 'JavaScript',
    dot: '#27C93F',
    code: `import { LeadWidget } from '@levitate/sdk'

LeadWidget.init({
  token: 'lv_live_ab3f...',
  businessId: 'biz_xk9',
  theme: 'auto',
  position: 'bottom-right',
  onCapture: (lead) => {
    console.log(lead.score, lead.phone)
  }
})`,
  },
  {
    id: 'curl',
    label: 'cURL Fetch',
    lang: 'cURL',
    dot: '#8B949E',
    code: `curl https://levitatelabs.online/api/v1/leads \\
  -H "Authorization: Bearer lv_live_ab3f..." \\
  -G \\
  --data-urlencode "limit=20" \\
  --data-urlencode "status=hot"

# Response: {
#   "success": true,
#   "data": {
#     "leads": [...],
#     "total": 142
#   }
# }`,
  },
  {
    id: 'python',
    label: 'Python Analytics',
    lang: 'Python',
    dot: '#58A6FF',
    code: `import requests

res = requests.get(
  "https://levitatelabs.online/api/v1/analytics",
  headers={"Authorization": "Bearer lv_live_ab3f..."},
  params={"period": "30d", "metric": "pipeline_value"}
)

data = res.json()
print(f"Pipeline: ₹{data['value']:,}")
print(f"Conversion: {data['rate']:.1f}%")`,
  },
];

const FEATURES = [
  {
    title: 'Serverless-Native',
    body: 'Vercel Edge-ready. Sub-50ms globally. No infra to manage.',
    svg: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="#C9A96E" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M10 2v11M3 7l7 4 7-4" stroke="#C9A96E" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Secure by Default',
    body: 'SHA-256 hashed keys. Rotate anytime. Rate-limited per plan.',
    svg: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="9" width="12" height="9" rx="2" stroke="#C9A96E" strokeWidth="1.4" />
        <path d="M7 9V6a3 3 0 016 0v3" stroke="#C9A96E" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="10" cy="13.5" r="1.2" fill="#C9A96E" />
      </svg>
    ),
  },
  {
    title: 'Webhooks & Events',
    body: 'Real-time push on lead capture, payment, or status change.',
    svg: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 10a7 7 0 1014 0 7 7 0 00-14 0" stroke="#C9A96E" strokeWidth="1.4" />
        <path d="M10 6v4l3 2" stroke="#C9A96E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Usage Dashboard',
    body: 'Live call counts, error logs, and quota inside your dashboard.',
    svg: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="12" width="3" height="5" rx="1" fill="#C9A96E" opacity="0.5" />
        <rect x="8.5" y="8" width="3" height="9" rx="1" fill="#C9A96E" opacity="0.7" />
        <rect x="14" y="4" width="3" height="13" rx="1" fill="#C9A96E" />
      </svg>
    ),
  },
  {
    title: 'Drop-in Widget',
    body: 'One script tag embeds a fully-branded lead form on any site.',
    svg: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="12" rx="2" stroke="#C9A96E" strokeWidth="1.4" />
        <path d="M6 8h8M6 11h5" stroke="#C9A96E" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'AI-Enriched Data',
    body: 'Every lead includes a quality score + company intel automatically.',
    svg: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="#C9A96E" strokeWidth="1.4" />
        <path d="M7 10l2 2 4-4" stroke="#C9A96E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const TIERS = [
  {
    name: 'Starter',
    price: 'Free',
    sub: 'forever',
    limit: '500 calls/mo',
    features: ['Lead capture widget', 'REST API access', 'Webhook support', 'Basic analytics', '1 API key'],
    cta: 'Get API Key',
    href: '/business/dashboard/api-keys',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '₹999',
    sub: '/month',
    limit: '10,000 calls/mo',
    features: ['Everything in Starter', 'CRM sync', 'Priority queue', 'Custom domain widget', '5 API keys', 'Postman collection'],
    cta: 'Start Building',
    href: '/business/dashboard/api-keys',
    highlight: true,
  },
  {
    name: 'Scale',
    price: '₹4,999',
    sub: '/month',
    limit: 'Unlimited calls',
    features: ['Everything in Growth', 'White-label embed', 'Dedicated infra', '99.9% SLA', 'Custom AI agents', 'Direct Slack support'],
    cta: 'Contact Sales',
    href: 'mailto:levitatelabs.online@gmail.com',
    highlight: false,
  },
];

const METRICS = [
  { prefix: '', value: 2.4, suffix: 'M+', label: 'API calls served', decimals: 1 },
  { prefix: '< ', value: 50, suffix: 'ms', label: 'avg latency', decimals: 0 },
  { prefix: '', value: 99.97, suffix: '%', label: 'uptime', decimals: 2 },
  { prefix: '₹', value: 0, suffix: '', label: 'infra cost to you', decimals: 0 },
];

function syntaxHighlight(code: string): React.ReactNode {
  const lines = code.split('\n');
  return lines.map((line, li) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    const pushColored = (text: string, color: string) => {
      parts.push(<span key={key++} style={{ color }}>{text}</span>);
    };

    const commentMatch = remaining.match(/^(.*?)(#.*)$/);
    if (commentMatch) {
      remaining = commentMatch[1];
      const comment = commentMatch[2];
      const beforeComment = remaining;
      remaining = '';
      processTokens(beforeComment, parts, pushColored, key);
      key = parts.length;
      pushColored(comment, 'rgba(139,148,158,0.8)');
    } else {
      processTokens(remaining, parts, pushColored, key);
    }

    return (
      <span key={li}>
        <span style={{ color: 'rgba(255,255,255,0.18)', userSelect: 'none', marginRight: 16, fontSize: 11, display: 'inline-block', width: 20, textAlign: 'right' }}>
          {li + 1}
        </span>
        {parts}
        {'\n'}
      </span>
    );
  });
}

function processTokens(
  text: string,
  parts: React.ReactNode[],
  pushColored: (t: string, c: string) => void,
  startKey: number
) {
  const tokens = text.split(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\b(?:import|from|const|let|await|fetch|return|print|def|params|headers)\b|\b\d+(?:\.\d+)?\b)/g);
  let k = startKey;
  tokens.forEach((tok, i) => {
    if (!tok) return;
    if (i % 2 === 1) {
      if (/^['"]/.test(tok)) pushColored(tok, '#98C379');
      else if (/^\d/.test(tok)) pushColored(tok, '#E5C07B');
      else pushColored(tok, '#C678DD');
    } else {
      parts.push(<span key={k++} style={{ color: 'rgba(232,228,220,0.85)' }}>{tok}</span>);
    }
  });
}

function CodeTerminal() {
  const [activeTab, setActiveTab] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [charIdx, setCharIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDisplayed('');
    setCharIdx(0);
  }, [activeTab]);

  useEffect(() => {
    const full = CODE_TABS[activeTab].code;
    if (charIdx < full.length) {
      timerRef.current = setTimeout(() => {
        setDisplayed(full.slice(0, charIdx + 1));
        setCharIdx(c => c + 1);
      }, 14);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [activeTab, charIdx]);

  return (
    <div style={{
      background: '#0A0C10',
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 0 60px rgba(176,141,87,0.08), 0 32px 80px rgba(0,0,0,0.5)',
    }}>
      <div style={{ background: '#161B22', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#FF5F57', '#FFBD2E', '#27C93F'].map(c => (
            <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c, opacity: 0.85 }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {CODE_TABS.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: activeTab === i ? 'rgba(201,169,110,0.12)' : 'transparent',
                border: activeTab === i ? '1px solid rgba(201,169,110,0.28)' : '1px solid transparent',
                color: activeTab === i ? '#C9A96E' : 'rgba(255,255,255,0.38)',
                padding: '4px 12px', borderRadius: 6, fontSize: 12, fontFamily: 'Inter, sans-serif',
                fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: tab.dot, display: 'inline-block', flexShrink: 0 }} />
              {tab.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace' }}>{CODE_TABS[activeTab].lang}</span>
      </div>

      <div style={{ padding: '20px 24px', minHeight: 240 }}>
        <pre style={{
          margin: 0,
          fontFamily: '"IBM Plex Mono", "Fira Code", "Cascadia Code", monospace',
          fontSize: 13,
          lineHeight: 1.75,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {syntaxHighlight(displayed)}
          <span style={{ display: 'inline-block', width: 2, height: '1em', background: '#C9A96E', verticalAlign: 'text-bottom', borderRadius: 1, animation: 'devCursorBlink 1s step-start infinite' }} />
        </pre>
      </div>

      <div style={{ padding: '10px 24px 14px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace' }}>levitatelabs.online/api/v1</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#27C93F', display: 'inline-block', animation: 'devPulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, color: 'rgba(39,201,63,0.7)', fontFamily: 'Inter, sans-serif' }}>API Online</span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'Inter, sans-serif' }}>12ms</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'Inter, sans-serif' }}>IN region</span>
        </div>
      </div>
    </div>
  );
}

function MetricCounter({ metric, trigger }: { metric: typeof METRICS[0]; trigger: boolean }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!trigger) return;
    const start = performance.now();
    const duration = 1800;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((metric.value * ease).toFixed(metric.decimals)));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [trigger, metric]);

  return (
    <div style={{
      flex: '1 1 160px',
      padding: '20px 24px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'Instrument Serif, serif',
        fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
        fontWeight: 400,
        color: '#C9A96E',
        lineHeight: 1,
        marginBottom: 6,
      }}>
        {metric.prefix}{count.toFixed(metric.decimals)}{metric.suffix}
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.03em' }}>
        {metric.label}
      </div>
    </div>
  );
}

export default function HomeDeveloper() {
  const head = useReveal();
  const terminal = useReveal(0.08);
  const features = useReveal(0.08);
  const metrics = useReveal(0.2);
  const pricing = useReveal(0.08);
  const cta = useReveal(0.1);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [hoveredTier, setHoveredTier] = useState<number | null>(null);

  return (
    <section
      id="developers"
      style={{ background: '#0D1117', position: 'relative', overflow: 'hidden', padding: 'clamp(80px,10vw,140px) 0' }}
    >
      <style>{`
        @keyframes devCursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes devPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes devOrbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(24px,-18px) scale(1.04)} 66%{transform:translate(-12px,28px) scale(0.97)} }
        @keyframes devOrbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-20px,20px) scale(1.06)} 66%{transform:translate(16px,-24px) scale(0.95)} }
        @keyframes devOrbFloat3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(12px,16px) scale(1.03)} }
        @keyframes devShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes devGridDrift { 0%{transform:perspective(800px) rotateX(6deg) translateY(0)} 100%{transform:perspective(800px) rotateX(6deg) translateY(-40px)} }
      `}</style>

      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        transform: 'perspective(900px) rotateX(6deg)',
        transformOrigin: 'top center',
        animation: 'devGridDrift 20s linear infinite',
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.06) 60%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.06) 60%, transparent 100%)',
      }} />

      <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.09) 0%, transparent 65%)', animation: 'devOrbFloat1 9s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-15%', left: '-8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(88,166,255,0.05) 0%, transparent 65%)', animation: 'devOrbFloat2 11s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '40%', left: '45%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.04) 0%, transparent 65%)', animation: 'devOrbFloat3 7s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />

      <div className={s.container} style={{ position: 'relative', zIndex: 1 }}>

        <div
          ref={head.ref}
          style={{
            textAlign: 'center',
            marginBottom: 'clamp(48px,7vw,80px)',
            opacity: head.visible ? 1 : 0,
            transform: head.visible ? 'translateY(0)' : 'translateY(32px)',
            transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: '#C9A96E', display: 'inline-block', marginBottom: 20,
            background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)',
            borderRadius: 20, padding: '5px 14px',
          }}>
            For Developers & Agencies
          </span>

          <h2 style={{
            fontFamily: 'Instrument Serif, serif',
            fontSize: 'clamp(2.4rem, 5.5vw, 4.5rem)',
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: '0 auto 24px',
            maxWidth: 720,
            backgroundImage: 'linear-gradient(135deg, #C9A96E 0%, #ffffff 55%, #C9A96E 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            backgroundSize: '200% auto',
            animation: 'devShimmer 6s linear infinite',
          }}>
            Your platform. Our intelligence.
          </h2>

          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 'clamp(1rem, 1.5vw, 1.125rem)',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.7,
            maxWidth: 580,
            margin: '0 auto',
          }}>
            Embed AI-powered lead capture, CRM, and analytics directly in your client&apos;s website — one API key, zero infrastructure.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,0.85fr)',
          gap: 'clamp(24px,4vw,56px)',
          alignItems: 'start',
          marginBottom: 'clamp(48px,7vw,80px)',
        }}>
          <div
            ref={terminal.ref}
            style={{
              opacity: terminal.visible ? 1 : 0,
              transform: terminal.visible ? 'translateY(0)' : 'translateY(40px)',
              transition: 'opacity 0.8s ease 0.1s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s',
            }}
          >
            <CodeTerminal />
          </div>

          <div
            ref={features.ref}
            style={{
              opacity: features.visible ? 1 : 0,
              transform: features.visible ? 'translateY(0)' : 'translateY(40px)',
              transition: 'opacity 0.8s ease 0.2s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {FEATURES.map((f, i) => (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredFeature(i)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  style={{
                    background: '#161B22',
                    border: `1px solid ${hoveredFeature === i ? 'rgba(176,141,87,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 12,
                    padding: '18px 16px',
                    cursor: 'default',
                    transition: 'border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease',
                    boxShadow: hoveredFeature === i ? '0 0 24px rgba(176,141,87,0.1)' : 'none',
                    transform: hoveredFeature === i ? 'translateY(-2px)' : 'none',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, marginBottom: 12,
                    background: 'linear-gradient(135deg, rgba(201,169,110,0.15), rgba(140,109,63,0.08))',
                    border: '1px solid rgba(201,169,110,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {f.svg}
                  </div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', margin: '0 0 6px' }}>{f.title}</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55, margin: 0 }}>{f.body}</p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, padding: '14px 18px', background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#C9A96E,#8C6D3F)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V8l-4-6z" /><path d="M12 2v6h6" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#C9A96E', margin: '0 0 2px' }}>Full API Documentation</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(201,169,110,0.5)', margin: 0 }}>OpenAPI spec + Postman collection ready to import</p>
              </div>
              <a href="/developers" style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#C9A96E', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', opacity: 0.85 }}>
                Docs →
              </a>
            </div>
          </div>
        </div>

        <div
          ref={metrics.ref}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 'clamp(48px,7vw,80px)',
            opacity: metrics.visible ? 1 : 0,
            transform: metrics.visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
          }}
        >
          {METRICS.map(m => (
            <MetricCounter key={m.label} metric={m} trigger={metrics.visible} />
          ))}
        </div>

        <div
          ref={pricing.ref}
          style={{
            marginBottom: 'clamp(48px,7vw,80px)',
            opacity: pricing.visible ? 1 : 0,
            transform: pricing.visible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A96E' }}>API Access Plans</span>
            <p style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(1.4rem,2.5vw,2rem)', color: 'rgba(255,255,255,0.88)', margin: '10px 0 0', fontWeight: 400 }}>
              Start free. Scale when you&apos;re ready.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {TIERS.map((tier, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredTier(i)}
                onMouseLeave={() => setHoveredTier(null)}
                style={{
                  borderRadius: 16,
                  padding: tier.highlight ? '2px' : '0',
                  background: tier.highlight
                    ? 'linear-gradient(135deg, #C9A96E, #8C6D3F, #C9A96E)'
                    : 'transparent',
                  backgroundSize: tier.highlight ? '200% 200%' : undefined,
                  animation: tier.highlight ? 'devShimmer 3s linear infinite' : undefined,
                  transform: hoveredTier === i ? 'translateY(-4px)' : 'none',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  boxShadow: tier.highlight
                    ? `0 0 40px rgba(201,169,110,${hoveredTier === i ? '0.22' : '0.1'}), 0 16px 48px rgba(0,0,0,0.4)`
                    : hoveredTier === i ? '0 16px 40px rgba(0,0,0,0.3)' : 'none',
                  position: 'relative',
                }}
              >
                <div style={{
                  background: tier.highlight ? '#0D1117' : '#161B22',
                  borderRadius: tier.highlight ? 14 : 16,
                  padding: '28px 24px',
                  border: tier.highlight ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  height: '100%',
                  boxSizing: 'border-box',
                }}>
                  {tier.highlight && (
                    <div style={{
                      position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #C9A96E, #8C6D3F)',
                      color: 'white', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                      padding: '5px 14px', borderRadius: 20, fontFamily: 'Inter, sans-serif',
                      textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>
                      Most Popular
                    </div>
                  )}

                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: tier.highlight ? '#C9A96E' : 'rgba(255,255,255,0.4)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>{tier.name}</p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: '2.1rem', fontWeight: 400, color: 'rgba(255,255,255,0.92)', lineHeight: 1 }}>{tier.price}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>{tier.sub}</span>
                  </div>

                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: tier.highlight ? 'rgba(201,169,110,0.7)' : 'rgba(255,255,255,0.3)', marginBottom: 24, fontWeight: 500 }}>{tier.limit}</p>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, marginBottom: 24 }}>
                    {tier.features.map((f, fi) => (
                      <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6.5" fill={tier.highlight ? 'rgba(201,169,110,0.15)' : 'rgba(255,255,255,0.05)'} />
                          <path d="M5 8l2 2 4-4" stroke={tier.highlight ? '#C9A96E' : 'rgba(255,255,255,0.4)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  <a
                    href={tier.href}
                    style={{
                      display: 'block', textAlign: 'center', padding: '11px 0', borderRadius: 10,
                      fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                      background: tier.highlight ? 'linear-gradient(135deg, #C9A96E, #8C6D3F)' : 'transparent',
                      color: tier.highlight ? 'white' : 'rgba(255,255,255,0.65)',
                      border: tier.highlight ? 'none' : '1px solid rgba(255,255,255,0.15)',
                      transition: 'opacity 0.2s ease, border-color 0.2s ease',
                    }}
                  >
                    {tier.cta}
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 20, textAlign: 'center' }}>
            All plans include HTTPS, JWT-compatible tokens, and India-region hosting.
          </p>
        </div>

        <motion.div
          ref={cta.ref}
          initial={{ opacity: 0, y: 24 }}
          animate={cta.visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 20,
            background: 'rgba(201,169,110,0.06)',
            border: '1px solid rgba(201,169,110,0.2)',
            borderRadius: 16, padding: '28px 36px',
          }}
        >
          <div>
            <p style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(1.2rem,2vw,1.5rem)', color: 'rgba(255,255,255,0.9)', margin: '0 0 6px', fontWeight: 400 }}>
              Ready to start building?
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Get your first API key in under 60 seconds. No credit card required.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <a
              href="/business/dashboard/api-keys"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #C9A96E, #8C6D3F)',
                color: 'white', fontFamily: 'Inter, sans-serif', fontSize: 14,
                fontWeight: 600, padding: '12px 24px', borderRadius: 10, textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(176,141,87,0.25)',
                transition: 'opacity 0.2s ease',
              }}
            >
              Start building for free
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a
              href="/developers"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter, sans-serif', fontSize: 14,
                fontWeight: 500, textDecoration: 'none',
                padding: '12px 20px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                transition: 'border-color 0.2s ease, color 0.2s ease',
              }}
            >
              Read the docs
            </a>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
