'use client'

import { useState, useEffect, useRef } from 'react'

type Lang = 'js' | 'python' | 'curl' | 'php'

const TABS: { id: Lang; label: string; color: string }[] = [
  { id: 'js', label: 'JavaScript', color: '#f7df1e' },
  { id: 'python', label: 'Python', color: '#3776ab' },
  { id: 'curl', label: 'cURL', color: '#88c0d0' },
  { id: 'php', label: 'PHP', color: '#8993be' },
]

const INSTALL_CODE: Record<Lang, string> = {
  js: `const BASE = 'https://levitatelabs.online/api/v1'
const KEY = process.env.LEVITATE_API_KEY

async function lv(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Authorization': \`Bearer \${KEY}\`,
      'Content-Type': 'application/json',
      ...opts.headers
    }
  })
  return res.json()
}`,
  python: `import os, requests

BASE = "https://levitatelabs.online/api/v1"
HEADERS = {"Authorization": f"Bearer {os.environ['LEVITATE_API_KEY']}"}

def lv_get(path, **params):
    return requests.get(BASE + path, headers=HEADERS, params=params).json()

def lv_post(path, **data):
    return requests.post(BASE + path, headers=HEADERS, json=data).json()`,
  curl: `export KEY="lv_your_key_here"
export BASE="https://levitatelabs.online/api/v1"

# Fetch leads
curl -s -H "Authorization: Bearer $KEY" \\
  "$BASE/leads?limit=10&status=New" | jq .`,
  php: `<?php
define('LV_BASE', 'https://levitatelabs.online/api/v1');
define('LV_KEY', $_ENV['LEVITATE_API_KEY']);

function lv(string $method, string $path, array $data = []): array {
  $ch = curl_init(LV_BASE . $path);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST  => strtoupper($method),
    CURLOPT_HTTPHEADER     => [
      'Authorization: Bearer ' . LV_KEY,
      'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS     => $data ? json_encode($data) : null,
  ]);
  return json_decode(curl_exec($ch), true);
}`,
}

const EXAMPLES: Record<Lang, Record<string, string>> = {
  js: {
    leads: `const { data } = await lv('/leads?limit=20&status=New')
data.leads.forEach(lead => {
  console.log(\`\${lead.business_name} — Score \${lead.ai_score}/10\`)
})`,
    outreach: `const res = await lv('/outreach', {
  method: 'POST',
  body: JSON.stringify({
    to: 'owner@restaurant.com',
    subject: 'Website for your restaurant?',
    body: 'Hi! We can have a full website live in 24h...',
    lead_id: 'uuid-of-lead'
  })
})
console.log(res.queued) // true`,
    webhook: `const res = await lv('/webhooks', {
  method: 'POST',
  body: JSON.stringify({
    url: 'https://yourdomain.com/hooks/levitate',
    events: ['lead.created', 'email.replied']
  })
})
// POST requests fire to your URL on each event`,
  },
  python: {
    leads: `result = lv_get('/leads', limit=20, status='New')
for lead in result['data']['leads']:
    print(f"{lead['business_name']} — Score {lead['ai_score']}/10")`,
    outreach: `result = lv_post('/outreach',
    to='owner@restaurant.com',
    subject='Website for your restaurant?',
    body='Hi! We can have a full website live in 24h...',
    lead_id='uuid-of-lead'
)`,
    webhook: `result = lv_post('/webhooks',
    url='https://yourdomain.com/hooks/levitate',
    events=['lead.created', 'email.replied']
)`,
  },
  curl: {
    leads: `curl -s -H "Authorization: Bearer $KEY" \\
  "$BASE/leads?limit=20&status=New" | jq .data.leads`,
    outreach: `curl -s -X POST -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to":"owner@biz.com","subject":"Website?","body":"Hi!"}' \\
  "$BASE/outreach" | jq .`,
    webhook: `curl -s -X POST -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://yourdomain.com/hook","events":["lead.created"]}' \\
  "$BASE/webhooks" | jq .`,
  },
  php: {
    leads: `$result = lv('GET', '/leads?limit=20&status=New');
foreach ($result['data']['leads'] as $lead) {
  echo "{$lead['business_name']} — Score: {$lead['ai_score']}/10\\n";
}`,
    outreach: `$result = lv('POST', '/outreach', [
  'to'      => 'owner@biz.com',
  'subject' => 'Website for your business?',
  'body'    => 'Hi! We can have a full site live in 24h...',
]);`,
    webhook: `$result = lv('POST', '/webhooks', [
  'url'    => 'https://yourdomain.com/hooks/levitate',
  'events' => ['lead.created', 'email.replied'],
]);`,
  },
}

const SECTIONS = ['quickstart', 'auth', 'leads', 'outreach', 'webhooks', 'errors'] as const
type Section = typeof SECTIONS[number]

const SECTION_LABELS: Record<Section, string> = {
  quickstart: 'Quick Start',
  auth: 'Authentication',
  leads: 'Leads API',
  outreach: 'Outreach API',
  webhooks: 'Webhooks',
  errors: 'Error Reference',
}

const WEBHOOK_EVENTS = [
  { event: 'lead.created', desc: 'New lead discovered and scored by AI' },
  { event: 'lead.status_changed', desc: 'Lead stage updated in pipeline' },
  { event: 'research.completed', desc: 'Market research batch finished' },
  { event: 'email.opened', desc: 'Outreach email opened by recipient' },
  { event: 'email.replied', desc: 'Recipient replied to an outreach email' },
]

const ERROR_CODES = [
  { code: 200, label: 'OK', desc: 'Request successful', ok: true },
  { code: 201, label: 'Created', desc: 'Resource created', ok: true },
  { code: 400, label: 'Bad Request', desc: 'Missing or invalid parameters', ok: false },
  { code: 401, label: 'Unauthorized', desc: 'API key missing or invalid', ok: false },
  { code: 403, label: 'Forbidden', desc: 'Your plan does not include this endpoint', ok: false },
  { code: 429, label: 'Rate Limited', desc: 'Monthly request quota exceeded', ok: false },
  { code: 500, label: 'Server Error', desc: 'Contact dev@levitatelabs.online', ok: false },
]

const TERMINAL_LINES = [
  { delay: 0, text: '$ curl -H "Authorization: Bearer lv_•••" \\', dim: false },
  { delay: 400, text: '    "https://levitatelabs.online/api/v1/leads?limit=3"', dim: true },
  { delay: 900, text: '', dim: false },
  { delay: 1000, text: '{', dim: false },
  { delay: 1100, text: '  "success": true,', dim: false },
  { delay: 1200, text: '  "data": {', dim: false },
  { delay: 1300, text: '    "total": 47,', dim: false },
  { delay: 1400, text: '    "leads": [', dim: false },
  { delay: 1500, text: '      { "business_name": "Shreeji Dental", "ai_score": 9.2, "city": "Vadodara" },', dim: false },
  { delay: 1650, text: '      { "business_name": "Surat Spice Kitchen", "ai_score": 8.1, "city": "Surat" },', dim: false },
  { delay: 1800, text: '      { "business_name": "Nadiad Coaching Hub", "ai_score": 7.8, "city": "Nadiad" }', dim: false },
  { delay: 1950, text: '    ]', dim: false },
  { delay: 2050, text: '  }', dim: false },
  { delay: 2150, text: '}', dim: false },
]

function useTerminalLines() {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const timers = TERMINAL_LINES.map((l, i) =>
      setTimeout(() => setShown(i + 1), l.delay + 300)
    )
    return () => timers.forEach(clearTimeout)
  }, [])
  return shown
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{ fontSize: 11, color: copied ? '#4ade80' : '#555', cursor: 'pointer', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4, transition: 'color 0.2s' }}>
      {copied ? '✓ Copied' : '⎘ Copy'}
    </button>
  )
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div style={{ borderRadius: 10, background: '#0A0A14', border: '1px solid #1E1E2E', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #1E1E2E', background: '#0D0D18' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28ca41' }} />
        </div>
        <span style={{ fontSize: 10, color: '#444', fontFamily: 'monospace' }}>{lang}</span>
        <CopyButton code={code} />
      </div>
      <pre style={{ margin: 0, padding: '16px 18px', fontSize: 13, color: '#C8C8D8', fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace", lineHeight: 1.65, overflowX: 'auto', whiteSpace: 'pre' }}>
        {code}
      </pre>
    </div>
  )
}

function EndpointBadge({ method }: { method: 'GET' | 'POST' }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
      background: method === 'GET' ? '#4ade8018' : '#60a5fa18',
      color: method === 'GET' ? '#4ade80' : '#60a5fa',
      border: `1px solid ${method === 'GET' ? '#4ade8033' : '#60a5fa33'}`,
      fontFamily: 'monospace',
    }}>
      {method}
    </span>
  )
}

export default function DevelopersPage() {
  const [lang, setLang] = useState<Lang>('js')
  const [active, setActive] = useState<Section>('quickstart')
  const shownLines = useTerminalLines()
  const sectionRefs = useRef<Record<Section, HTMLElement | null>>({} as Record<Section, HTMLElement | null>)

  function scrollTo(id: Section) {
    setActive(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06060C', color: '#E0E0EC', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap');
        @keyframes devBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes devFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes devOrb { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        .dev-fade { animation: devFadeIn 0.4s ease both }
        .dev-cursor { display:inline-block; width:2px; height:14px; background:#C8A96E; animation:devBlink 1s step-end infinite; vertical-align:middle; margin-left:2px }
        .dev-sidebar-btn { width:100%; text-align:left; padding:9px 14px; border-radius:8px; border:none; cursor:pointer; font-size:13px; font-weight:500; transition:all 0.18s; background:transparent; display:flex; align-items:center; gap:8px }
        .dev-sidebar-btn:hover { background:#141420; color:#E0E0EC }
        .dev-sidebar-active { background:#C8A96E14 !important; color:#C8A96E !important; }
        .dev-lang-btn { padding:7px 16px; border-radius:7px; border:none; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.18s }
        .dev-param { background:#0D0D18; border:1px solid #1A1A28; border-radius:8px; padding:12px 14px }
        .dev-section { scroll-margin-top:90px }
        a { text-decoration:none }
      `}</style>

      {/* Nav */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: '#06060CDD', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1A1A26', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: '#C8A96E', fontWeight: 800, fontSize: 17, letterSpacing: '-0.5px' }}>LEVITATE</a>
          <span style={{ color: '#2A2A38', fontSize: 18 }}>|</span>
          <span style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>Developer API</span>
          <span style={{ fontSize: 11, background: '#4ade8011', color: '#4ade80', border: '1px solid #4ade8033', padding: '2px 8px', borderRadius: 10, fontWeight: 700, letterSpacing: '0.4px' }}>v1</span>
        </div>
        <a href="mailto:dev@levitatelabs.online"
          style={{ fontSize: 12, color: '#C8A96E', border: '1px solid #C8A96E44', borderRadius: 8, padding: '7px 14px', transition: 'all 0.2s', fontWeight: 600 }}>
          Get API Key
        </a>
      </header>

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #141420' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #C8A96E08 0%, transparent 60%)', pointerEvents: 'none', animation: 'devOrb 8s ease-in-out infinite' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px 56px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div className="dev-fade">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#C8A96E0D', border: '1px solid #C8A96E2A', borderRadius: 20, padding: '5px 12px', marginBottom: 24, fontSize: 11, color: '#C8A96E', fontWeight: 700, letterSpacing: '0.6px' }}>
              REST API · No SDK Required
            </div>
            <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 18 }}>
              Build on<br />
              <span style={{ color: '#C8A96E' }}>LEVITATE API</span>
            </h1>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.65, marginBottom: 28, maxWidth: 420 }}>
              Access AI-enriched leads, trigger outreach, register webhooks, and automate your sales pipeline — all over HTTP.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ label: '99.9%', sub: 'uptime SLA' }, { label: '<120ms', sub: 'avg response' }, { label: '50+', sub: 'endpoints' }].map(s => (
                <div key={s.label} style={{ background: '#0D0D18', border: '1px solid #1A1A28', borderRadius: 10, padding: '10px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#C8A96E', letterSpacing: '-0.5px' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal */}
          <div style={{ borderRadius: 14, background: '#0A0A14', border: '1px solid #1E1E2E', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', borderBottom: '1px solid #1E1E2E', background: '#0D0D18' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28ca41' }} />
              <span style={{ fontSize: 11, color: '#333', marginLeft: 6, fontFamily: 'monospace' }}>terminal</span>
            </div>
            <div style={{ padding: '16px 18px', fontFamily: "'Fira Code', monospace", fontSize: 12, lineHeight: 1.7, minHeight: 280 }}>
              {TERMINAL_LINES.slice(0, shownLines).map((line, i) => (
                <div key={i} style={{ color: line.dim ? '#444' : line.text.startsWith('{') || line.text.startsWith('}') || line.text.startsWith('  ') ? '#C8C8D8' : '#C8A96E', whiteSpace: 'pre' }}>
                  {line.text}
                </div>
              ))}
              {shownLines < TERMINAL_LINES.length && <span className="dev-cursor" />}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 40 }}>

        {/* Sidebar */}
        <aside>
          <div style={{ position: 'sticky', top: 90 }}>
            <div style={{ fontSize: 10, color: '#444', fontWeight: 700, letterSpacing: '0.8px', marginBottom: 8, textTransform: 'uppercase', padding: '0 14px' }}>Reference</div>
            {SECTIONS.map(id => (
              <button key={id} onClick={() => scrollTo(id)}
                className={`dev-sidebar-btn ${active === id ? 'dev-sidebar-active' : ''}`}
                style={{ color: active === id ? '#C8A96E' : '#555' }}>
                {active === id && <div style={{ width: 3, height: 14, borderRadius: 2, background: '#C8A96E', flexShrink: 0 }} />}
                {SECTION_LABELS[id]}
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 56 }}>

          {/* Language picker */}
          <div style={{ display: 'flex', gap: 4, background: '#0D0D18', border: '1px solid #1A1A28', borderRadius: 10, padding: 4, width: 'fit-content' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setLang(t.id)} className="dev-lang-btn"
                style={{ background: lang === t.id ? '#1A1A28' : 'transparent', color: lang === t.id ? t.color : '#555', border: lang === t.id ? `1px solid #2A2A38` : '1px solid transparent' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Quick Start */}
          <section id="quickstart" ref={el => { sectionRefs.current.quickstart = el }} className="dev-section">
            <div style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: '0.8px', marginBottom: 8, textTransform: 'uppercase' }}>01</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>Quick Start</h2>
            <p style={{ fontSize: 15, color: '#666', marginBottom: 28, lineHeight: 1.6 }}>Make your first API call in under 2 minutes. No SDK, no package install needed.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                {
                  n: '1', title: 'Get your API key',
                  body: 'Contact your LEVITATE admin or email dev@levitatelabs.online. Keys look like: lv_live_abcd1234...',
                },
              ].map(step => (
                <div key={step.n} style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#C8A96E', color: '#0A0A10', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {step.n}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: '#E0E0EC' }}>{step.title}</div>
                    <p style={{ fontSize: 14, color: '#666', marginBottom: 10, lineHeight: 1.55 }}>{step.body}</p>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#C8A96E', color: '#0A0A10', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>2</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#E0E0EC' }}>Initialize the client</div>
                  <CodeBlock code={INSTALL_CODE[lang]} lang={lang} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#C8A96E', color: '#0A0A10', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>3</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#E0E0EC' }}>Fetch your first leads</div>
                  <CodeBlock code={EXAMPLES[lang].leads} lang={lang} />
                </div>
              </div>
            </div>
          </section>

          {/* Auth */}
          <section id="auth" ref={el => { sectionRefs.current.auth = el }} className="dev-section">
            <div style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: '0.8px', marginBottom: 8, textTransform: 'uppercase' }}>02</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>Authentication</h2>
            <p style={{ fontSize: 15, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>All requests require your API key as a Bearer token.</p>
            <div style={{ background: '#0D0D18', border: '1px solid #1A1A28', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8 }}>Header (recommended)</div>
                <CodeBlock code="Authorization: Bearer lv_live_your_key_here" lang="http" />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8 }}>Query param (less secure)</div>
                <CodeBlock code="GET /api/v1/leads?api_key=lv_live_your_key_here" lang="http" />
              </div>
            </div>
            <div style={{ marginTop: 14, background: '#f59e0b0D', border: '1px solid #f59e0b2A', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#f59e0b', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span>⚠️</span>
              <span>Never expose your API key in client-side code. Use environment variables and server-side requests only.</span>
            </div>
          </section>

          {/* Leads */}
          <section id="leads" ref={el => { sectionRefs.current.leads = el }} className="dev-section">
            <div style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: '0.8px', marginBottom: 8, textTransform: 'uppercase' }}>03</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>Leads API</h2>
            <p style={{ fontSize: 15, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>Access AI-enriched leads with scores, contact data, and pipeline status. Requires Starter plan+.</p>
            <div style={{ background: '#0D0D18', border: '1px solid #1A1A28', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <EndpointBadge method="GET" />
                <code style={{ fontSize: 13, color: '#C8C8D8', fontFamily: 'monospace' }}>/api/v1/leads</code>
              </div>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 1.55 }}>List leads sorted by AI score. Supports pagination and status filtering.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { param: 'limit', type: 'number', desc: 'Max results (1–100, default 20)' },
                  { param: 'offset', type: 'number', desc: 'Pagination offset (default 0)' },
                  { param: 'status', type: 'string', desc: 'New · Contacted · Follow Up · Closed' },
                ].map(p => (
                  <div key={p.param} className="dev-param">
                    <code style={{ fontSize: 11, color: '#C8A96E', fontFamily: 'monospace' }}>{p.param}</code>
                    <span style={{ fontSize: 10, color: '#444', marginLeft: 6 }}>{p.type}</span>
                    <p style={{ fontSize: 12, color: '#555', marginTop: 4, lineHeight: 1.4 }}>{p.desc}</p>
                  </div>
                ))}
              </div>
              <CodeBlock code={EXAMPLES[lang].leads} lang={lang} />
            </div>
          </section>

          {/* Outreach */}
          <section id="outreach" ref={el => { sectionRefs.current.outreach = el }} className="dev-section">
            <div style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: '0.8px', marginBottom: 8, textTransform: 'uppercase' }}>04</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>Outreach API</h2>
            <p style={{ fontSize: 15, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>Queue AI-drafted outreach emails. Requires Starter plan+.</p>
            <div style={{ background: '#0D0D18', border: '1px solid #1A1A28', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <EndpointBadge method="POST" />
                <code style={{ fontSize: 13, color: '#C8C8D8', fontFamily: 'monospace' }}>/api/v1/outreach</code>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { param: 'to', req: true, desc: 'Recipient email address' },
                  { param: 'subject', req: true, desc: 'Email subject line' },
                  { param: 'body', req: true, desc: 'Plain text message body' },
                  { param: 'lead_id', req: false, desc: 'Lead UUID to link this email' },
                ].map(p => (
                  <div key={p.param} className="dev-param">
                    <code style={{ fontSize: 11, color: '#C8A96E', fontFamily: 'monospace' }}>{p.param}</code>
                    <span style={{ fontSize: 10, marginLeft: 6, padding: '1px 5px', borderRadius: 4, background: p.req ? '#C8A96E22' : '#2A2A38', color: p.req ? '#C8A96E' : '#555' }}>
                      {p.req ? 'required' : 'optional'}
                    </span>
                    <p style={{ fontSize: 12, color: '#555', marginTop: 4, lineHeight: 1.4 }}>{p.desc}</p>
                  </div>
                ))}
              </div>
              <CodeBlock code={EXAMPLES[lang].outreach} lang={lang} />
            </div>
          </section>

          {/* Webhooks */}
          <section id="webhooks" ref={el => { sectionRefs.current.webhooks = el }} className="dev-section">
            <div style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: '0.8px', marginBottom: 8, textTransform: 'uppercase' }}>05</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>Webhooks</h2>
            <p style={{ fontSize: 15, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>Receive real-time POST requests for key events. Requires Starter plan+.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#0D0D18', border: '1px solid #1A1A28', borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Register a webhook</div>
                <CodeBlock code={EXAMPLES[lang].webhook} lang={lang} />
              </div>
              <div style={{ background: '#0D0D18', border: '1px solid #1A1A28', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #141420', fontSize: 13, fontWeight: 600, color: '#E0E0EC' }}>Available Events</div>
                {WEBHOOK_EVENTS.map((e, i) => (
                  <div key={e.event} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '11px 18px', borderBottom: i < WEBHOOK_EVENTS.length - 1 ? '1px solid #141420' : 'none' }}>
                    <code style={{ fontSize: 12, color: '#C8A96E', fontFamily: 'monospace', width: 180, flexShrink: 0 }}>{e.event}</code>
                    <span style={{ fontSize: 13, color: '#666' }}>{e.desc}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: '#0D0D18', border: '1px solid #1A1A28', borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Payload Shape</div>
                <CodeBlock code={`{\n  "event": "lead.created",\n  "timestamp": "2026-05-25T10:30:00Z",\n  "data": {\n    "id": "uuid",\n    "business_name": "Sharma Electronics",\n    "ai_score": 8.4,\n    "city": "Mumbai",\n    "status": "New"\n  }\n}`} lang="json" />
              </div>
            </div>
          </section>

          {/* Errors */}
          <section id="errors" ref={el => { sectionRefs.current.errors = el }} className="dev-section">
            <div style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: '0.8px', marginBottom: 8, textTransform: 'uppercase' }}>06</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>Error Reference</h2>
            <p style={{ fontSize: 15, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>All errors return a consistent JSON shape. Always check the <code style={{ color: '#C8A96E', fontFamily: 'monospace', fontSize: 13 }}>success</code> field first.</p>
            <div style={{ background: '#0D0D18', border: '1px solid #1A1A28', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              {ERROR_CODES.map((e, i) => (
                <div key={e.code} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < ERROR_CODES.length - 1 ? '1px solid #141420' : 'none' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', width: 36, color: e.ok ? '#4ade80' : e.code < 500 ? '#f59e0b' : '#f87171' }}>{e.code}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#888', width: 100 }}>{e.label}</span>
                  <span style={{ fontSize: 13, color: '#555' }}>{e.desc}</span>
                </div>
              ))}
            </div>
            <CodeBlock code={`// Error response shape
{
  "success": false,
  "error": "Plan does not include this endpoint",
  "timestamp": "2026-05-25T10:30:00Z"
}

// Always handle errors
const res = await lv('/leads')
if (!res.success) {
  console.error(res.error)
}`} lang="js" />
          </section>

        </main>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 200px"] { grid-template-columns: 1fr !important }
          aside { display: none !important }
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important }
          div[style*="grid-template-columns: repeat(3,1fr)"] { grid-template-columns: 1fr !important }
          div[style*="grid-template-columns: repeat(2,1fr)"] { grid-template-columns: 1fr !important }
          h1[style*="font-size: 44px"] { font-size: 32px !important }
        }
      `}</style>
    </div>
  )
}
