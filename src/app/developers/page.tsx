'use client'

import { useState } from 'react'
import { Copy, CheckCircle, ChevronDown, ChevronRight, Code, Zap, Globe, Lock, Webhook, Terminal } from 'lucide-react'

type Lang = 'js' | 'python' | 'curl' | 'php'

const TABS: { id: Lang; label: string }[] = [
  { id: 'js', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'curl', label: 'cURL' },
  { id: 'php', label: 'PHP' },
]

const INSTALL_CODE: Record<Lang, string> = {
  js: `// No SDK needed — plain fetch
const BASE = 'https://levitatelabs.online/api/v1'
const KEY = process.env.LEVITATE_API_KEY

async function levitateFetch(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Authorization': \`Bearer \${KEY}\`, 'Content-Type': 'application/json', ...opts.headers }
  })
  return res.json()
}`,

  python: `import os, requests

BASE = "https://levitatelabs.online/api/v1"
HEADERS = {"Authorization": f"Bearer {os.environ['LEVITATE_API_KEY']}"}

def levitate_get(path, params=None):
    return requests.get(BASE + path, headers=HEADERS, params=params).json()

def levitate_post(path, data):
    return requests.post(BASE + path, headers=HEADERS, json=data).json()`,

  curl: `# Set your API key
export LEVITATE_KEY="lv_your_key_here"
export BASE="https://levitatelabs.online/api/v1"

# Fetch leads
curl -H "Authorization: Bearer $LEVITATE_KEY" \\
  "$BASE/leads?limit=10&status=New"`,

  php: `<?php
define('LEVITATE_BASE', 'https://levitatelabs.online/api/v1');
define('LEVITATE_KEY', $_ENV['LEVITATE_API_KEY']);

function levitate_request($method, $path, $data = null) {
  $ch = curl_init(LEVITATE_BASE . $path);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . LEVITATE_KEY, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS     => $data ? json_encode($data) : null,
  ]);
  return json_decode(curl_exec($ch), true);
}`,
}

const EXAMPLES: Record<Lang, Record<string, string>> = {
  js: {
    leads: `const { data } = await levitateFetch('/leads?limit=20&status=New')
data.leads.forEach(lead => {
  console.log(\`\${lead.business_name} — Score: \${lead.ai_score}/10\`)
})`,
    outreach: `const res = await levitateFetch('/outreach', {
  method: 'POST',
  body: JSON.stringify({
    to: 'owner@business.com',
    subject: 'Partnership Opportunity',
    body: 'Hi! We would love to connect...',
    lead_id: 'uuid-of-lead'
  })
})`,
    webhook: `const res = await levitateFetch('/webhooks', {
  method: 'POST',
  body: JSON.stringify({
    url: 'https://yourdomain.com/webhooks/levitate',
    events: ['lead.created', 'email.replied']
  })
})
// Now you'll get POST requests to your URL on these events`,
  },
  python: {
    leads: `result = levitate_get('/leads', {'limit': 20, 'status': 'New'})
for lead in result['data']['leads']:
    print(f"{lead['business_name']} — Score: {lead['ai_score']}/10")`,
    outreach: `result = levitate_post('/outreach', {
    'to': 'owner@business.com',
    'subject': 'Partnership Opportunity',
    'body': 'Hi! We would love to connect...',
    'lead_id': 'uuid-of-lead'
})`,
    webhook: `result = levitate_post('/webhooks', {
    'url': 'https://yourdomain.com/webhooks/levitate',
    'events': ['lead.created', 'email.replied']
})`,
  },
  curl: {
    leads: `curl -H "Authorization: Bearer $LEVITATE_KEY" \\
  "$BASE/leads?limit=20&status=New"`,
    outreach: `curl -X POST -H "Authorization: Bearer $LEVITATE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to":"owner@biz.com","subject":"Hi","body":"Partnership?"}' \\
  "$BASE/outreach"`,
    webhook: `curl -X POST -H "Authorization: Bearer $LEVITATE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://yourdomain.com/hook","events":["lead.created"]}' \\
  "$BASE/webhooks"`,
  },
  php: {
    leads: `$result = levitate_request('GET', '/leads?limit=20&status=New');
foreach ($result['data']['leads'] as $lead) {
  echo "{$lead['business_name']} — Score: {$lead['ai_score']}/10\\n";
}`,
    outreach: `$result = levitate_request('POST', '/outreach', [
  'to'      => 'owner@business.com',
  'subject' => 'Partnership Opportunity',
  'body'    => 'Hi! We would love to connect...',
]);`,
    webhook: `$result = levitate_request('POST', '/webhooks', [
  'url'    => 'https://yourdomain.com/webhooks/levitate',
  'events' => ['lead.created', 'email.replied']
]);`,
  },
}

const SECTIONS = [
  { id: 'quickstart', label: 'Quick Start', icon: Zap },
  { id: 'auth', label: 'Authentication', icon: Lock },
  { id: 'leads', label: 'Leads API', icon: Globe },
  { id: 'outreach', label: 'Outreach API', icon: Terminal },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'errors', label: 'Error Handling', icon: Code },
]

const WEBHOOK_EVENTS = [
  { event: 'lead.created', desc: 'New lead discovered by AI agent' },
  { event: 'lead.status_changed', desc: 'Lead moved to a new pipeline stage' },
  { event: 'research.completed', desc: 'Market research run has finished' },
  { event: 'email.opened', desc: 'Outreach email was opened by recipient' },
  { event: 'email.replied', desc: 'Recipient replied to an outreach email' },
]

const ERROR_CODES = [
  { code: 200, label: 'OK', desc: 'Request successful' },
  { code: 201, label: 'Created', desc: 'Resource created successfully' },
  { code: 202, label: 'Accepted', desc: 'Request queued for processing' },
  { code: 400, label: 'Bad Request', desc: 'Missing or invalid parameters' },
  { code: 401, label: 'Unauthorized', desc: 'Missing or invalid API key' },
  { code: 403, label: 'Forbidden', desc: 'Plan does not include this endpoint' },
  { code: 429, label: 'Rate Limited', desc: 'Monthly request limit exceeded' },
  { code: 500, label: 'Server Error', desc: 'Contact support@levitatelabs.online' },
]

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative group rounded-xl bg-gray-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <span className="text-xs text-gray-500 font-mono">{lang}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5 text-xs"
        >
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-sm text-gray-200 font-mono overflow-x-auto leading-relaxed">{code}</pre>
    </div>
  )
}

export default function DevelopersPage() {
  const [lang, setLang] = useState<Lang>('js')
  const [active, setActive] = useState('quickstart')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[15px] font-bold text-gray-900">
              Levitate<span className="font-light text-gray-400">OS</span>
            </a>
            <span className="text-gray-300">·</span>
            <span className="text-[13px] text-gray-500 font-medium">Developer Docs</span>
          </div>
          <a
            href="mailto:dev@levitatelabs.online"
            className="text-xs rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >
            Get API Key
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex gap-8">
        {/* Sidebar nav */}
        <aside className="hidden lg:block w-52 shrink-0">
          <nav className="sticky top-24 space-y-0.5">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors ${
                  active === s.id ? 'bg-[#f5ede0] text-[#7a5f2a]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <s.icon className={`w-4 h-4 ${active === s.id ? 'text-[#B08D57]' : 'text-gray-400'}`} />
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-12">
          {/* Language picker */}
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setLang(t.id)}
                className={`px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${lang === t.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Quick Start */}
          <section id="quickstart">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quick Start</h2>
            <p className="text-gray-500 mb-6">Make your first API call in under 2 minutes. No SDK required.</p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#B08D57] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-2">Get your API key from the admin portal</p>
                  <p className="text-sm text-gray-500">Contact your LevitateOS admin or email dev@levitatelabs.online</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#B08D57] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-2">Initialize the client</p>
                  <CodeBlock code={INSTALL_CODE[lang]} lang={lang} />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#B08D57] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-2">Fetch your first leads</p>
                  <CodeBlock code={EXAMPLES[lang].leads} lang={lang} />
                </div>
              </div>
            </div>
          </section>

          {/* Authentication */}
          <section id="auth">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication</h2>
            <p className="text-gray-500 mb-6">All API requests must include your API key as a Bearer token in the Authorization header.</p>
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Header (recommended)</p>
                <CodeBlock code={`Authorization: Bearer lv_your_api_key_here`} lang="http" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Query parameter (less secure)</p>
                <CodeBlock code={`GET /api/v1/leads?api_key=lv_your_api_key_here`} lang="http" />
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Never expose your API key in client-side code. Use environment variables and server-side requests.
            </div>
          </section>

          {/* Leads */}
          <section id="leads">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Leads API</h2>
            <p className="text-gray-500 mb-6">Access AI-enriched leads with scores, contact info, and pipeline status. Requires Starter plan+.</p>
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold px-2 py-1 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">GET</span>
                  <code className="font-mono text-sm text-gray-700">/api/v1/leads</code>
                </div>
                <p className="text-sm text-gray-500 mb-4">List leads sorted by AI score. Supports pagination and status filtering.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  {[
                    { param: 'limit', type: 'number', desc: 'Max results (1–100, default 20)' },
                    { param: 'offset', type: 'number', desc: 'Pagination offset (default 0)' },
                    { param: 'status', type: 'string', desc: 'Filter: New, Contacted, Follow Up, Closed' },
                  ].map(p => (
                    <div key={p.param} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
                      <code className="text-xs font-mono text-[#B08D57]">{p.param}</code>
                      <span className="text-[10px] text-gray-400 ml-2">{p.type}</span>
                      <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
                    </div>
                  ))}
                </div>
                <CodeBlock code={EXAMPLES[lang].leads} lang={lang} />
              </div>
            </div>
          </section>

          {/* Outreach */}
          <section id="outreach">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Outreach API</h2>
            <p className="text-gray-500 mb-6">Queue personalized outreach emails via the AI agent. Requires Starter plan+.</p>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold px-2 py-1 rounded border bg-blue-50 text-blue-700 border-blue-200">POST</span>
                <code className="font-mono text-sm text-gray-700">/api/v1/outreach</code>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {[
                  { param: 'to', req: true, desc: 'Recipient email address' },
                  { param: 'subject', req: true, desc: 'Email subject line' },
                  { param: 'body', req: true, desc: 'Plain text email body' },
                  { param: 'lead_id', req: false, desc: 'Optional lead UUID to link the email' },
                ].map(p => (
                  <div key={p.param} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
                    <code className="text-xs font-mono text-[#B08D57]">{p.param}</code>
                    <span className="text-[10px] ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{p.req ? 'required' : 'optional'}</span>
                    <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
                  </div>
                ))}
              </div>
              <CodeBlock code={EXAMPLES[lang].outreach} lang={lang} />
            </div>
          </section>

          {/* Webhooks */}
          <section id="webhooks">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Webhooks</h2>
            <p className="text-gray-500 mb-6">Receive real-time event notifications to your server. Requires Starter plan+.</p>
            <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
              <CodeBlock code={EXAMPLES[lang].webhook} lang={lang} />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <p className="px-5 py-3 text-sm font-semibold text-gray-900 border-b border-gray-100">Available Events</p>
              <div className="divide-y divide-gray-100">
                {WEBHOOK_EVENTS.map(e => (
                  <div key={e.event} className="flex items-center gap-4 px-5 py-3">
                    <code className="text-xs font-mono text-[#B08D57] w-44 shrink-0">{e.event}</code>
                    <span className="text-sm text-gray-500">{e.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm font-semibold text-gray-900 mb-3">Webhook Payload Shape</p>
              <CodeBlock code={`{
  "event": "lead.created",
  "timestamp": "2026-05-23T10:30:00Z",
  "data": {
    "id": "uuid",
    "business_name": "Sharma Electronics",
    "ai_score": 8.4,
    "city": "Mumbai",
    "status": "New"
  }
}`} lang="json" />
            </div>
          </section>

          {/* Errors */}
          <section id="errors">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Handling</h2>
            <p className="text-gray-500 mb-6">All errors return a consistent JSON shape. Check the success field first.</p>
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-4">
              <div className="divide-y divide-gray-100">
                {ERROR_CODES.map(e => (
                  <div key={e.code} className="flex items-center gap-4 px-5 py-3">
                    <span className={`text-xs font-bold tabular-nums w-10 ${e.code < 300 ? 'text-emerald-600' : e.code < 500 ? 'text-amber-600' : 'text-red-600'}`}>{e.code}</span>
                    <span className="text-xs font-semibold text-gray-700 w-24">{e.label}</span>
                    <span className="text-sm text-gray-500">{e.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <CodeBlock code={`// Error response shape
{
  "success": false,
  "error": "Plan does not include this endpoint",
  "timestamp": "2026-05-23T10:30:00Z"
}

// Handle errors
const res = await levitateFetch('/research')
if (!res.success) {
  console.error(res.error) // "Research API requires Pro plan or above"
}`} lang="js" />
          </section>
        </main>
      </div>
    </div>
  )
}
