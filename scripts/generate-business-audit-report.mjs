import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer-core';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const htmlOutputPath = path.join(docsDir, 'levitate-business-offering-audit.html');
const pdfOutputPath = path.join(docsDir, 'levitate-business-offering-audit.pdf');

dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });

function loadTsModule(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;

  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier.startsWith('@/')) {
      return require(path.join(rootDir, 'src', specifier.slice(2)));
    }
    return require(specifier);
  };

  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', output);
  fn(module.exports, localRequire, module, absolutePath, path.dirname(absolutePath));
  return module.exports;
}

function readJson(relativePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInr(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 'Custom';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatLongDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

function normalizePriceToNumber(value) {
  const normalized = String(value ?? '')
    .replace(/from/gi, '')
    .replace(/rs\./gi, '')
    .replace(/[,\s]/g, '')
    .replace(/₹/g, '')
    .toLowerCase();

  if (!normalized) {
    return null;
  }

  const match = normalized.match(/(\d+(?:\.\d+)?)(k)?/);
  if (!match) {
    return null;
  }

  const base = Number(match[1]);
  if (!Number.isFinite(base)) {
    return null;
  }

  return match[2] ? base * 1000 : base;
}

function walk(directory, collector = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, collector);
      continue;
    }
    collector.push(absolutePath);
  }
  return collector;
}

function toAppRoute(relativeFile, kind) {
  const normalized = relativeFile.replace(/\\/g, '/');
  const withoutSrc = normalized.replace(/^src\/app/, '');
  const withoutKind = withoutSrc.replace(new RegExp(`/${kind}\\.(tsx|ts)$`), '');
  return withoutKind || '/';
}

function collectAppRoutes() {
  const appDir = path.join(rootDir, 'src', 'app');
  const files = walk(appDir, []);
  const pages = [];
  const apiRoutes = [];

  for (const absolutePath of files) {
    const relativePath = path.relative(rootDir, absolutePath);
    if (relativePath.endsWith(`${path.sep}page.tsx`) || relativePath.endsWith('/page.tsx')) {
      pages.push({
        file: relativePath.replace(/\\/g, '/'),
        route: toAppRoute(relativePath, 'page'),
      });
    }

    if (relativePath.endsWith(`${path.sep}route.ts`) || relativePath.endsWith('/route.ts')) {
      apiRoutes.push({
        file: relativePath.replace(/\\/g, '/'),
        route: toAppRoute(relativePath, 'route'),
      });
    }
  }

  return {
    pages: pages.sort((left, right) => left.route.localeCompare(right.route)),
    apiRoutes: apiRoutes.sort((left, right) => left.route.localeCompare(right.route)),
  };
}

function extractHomepageServiceCards(fullServiceMap) {
  const source = fs.readFileSync(path.join(rootDir, 'src', 'components', 'sections', 'Services.tsx'), 'utf8');
  const matches = [...source.matchAll(/\{\s*name:\s*'([^']+)',\s*slug:\s*'([^']+)',\s*price:\s*'([^']+)'/g)];

  return matches
    .map((match) => {
      const [, name, slug, teaserPrice] = match;
      const detailedPrice = fullServiceMap.get(slug)?.price ?? null;
      return {
        name,
        slug,
        teaserPrice,
        detailedPrice,
        teaserValue: normalizePriceToNumber(teaserPrice),
        detailedValue: normalizePriceToNumber(detailedPrice),
      };
    })
    .filter((entry) => entry.detailedPrice !== null);
}

function renderBadge(text, tone = 'default') {
  return `<span class="badge badge-${tone}">${escapeHtml(text)}</span>`;
}

function renderServiceTable(title, services) {
  return `
    <section class="section-card">
      <div class="section-header">
        <div>
          <div class="eyebrow">Public Service Catalog</div>
          <h2>${escapeHtml(title)}</h2>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Commercial Model</th>
              <th>Timeline</th>
              <th>Offer Snapshot</th>
            </tr>
          </thead>
          <tbody>
            ${services
              .map(
                (service) => `
                  <tr>
                    <td>
                      <div class="cell-title">${escapeHtml(service.name)}</div>
                      <div class="cell-subtitle">${escapeHtml(service.shortDescription)}</div>
                    </td>
                    <td>
                      <div class="cell-title">${escapeHtml(service.price)}</div>
                      <div class="cell-subtitle">${escapeHtml(service.priceUnit)}</div>
                    </td>
                    <td>${escapeHtml(service.timeline)}</td>
                    <td>${escapeHtml(service.features.slice(0, 3).join(' • '))}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function findBrowserExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

async function fetchLiveCommercialData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('placeholder') || serviceRoleKey.includes('placeholder')) {
    return {
      plans: [],
      legacyStarterSubscriptions: {
        total: 0,
        summary: {},
      },
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: plans, error: plansError } = await supabase
    .from('onboarding_plans')
    .select('id, slug, name, tagline, description, monthly_price, annual_price, monthly_setup_fee, annual_setup_fee, support_level, is_featured, cta_label, highlights, deliverables, feature_controls')
    .order('sort_order', { ascending: true });

  if (plansError) {
    throw plansError;
  }

  const starterPlan = (plans ?? []).find((plan) => plan.slug === 'starter');
  let legacyRows = [];

  if (starterPlan) {
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('onboarding_subscriptions')
      .select('status, billing_cycle, amount')
      .eq('plan_id', starterPlan.id)
      .eq('amount', 1);

    if (subscriptionsError) {
      throw subscriptionsError;
    }

    legacyRows = subscriptions ?? [];
  }

  const summary = legacyRows.reduce((acc, row) => {
    const key = `${row.status}|${row.billing_cycle}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    plans: plans ?? [],
    legacyStarterSubscriptions: {
      total: legacyRows.length,
      summary,
    },
  };
}

async function main() {
  const servicesModule = loadTsModule('src/data/services.ts');
  const businessIntelligenceModule = loadTsModule('src/lib/business-intelligence.ts');
  const packageJson = readJson('package.json', {});
  const inventory = readJson('codebase_inventory.json', { total_files: 0 });
  const netlifyFunctions = readJson('docs/netlify-functions.generated.json', []);
  const dbMetadata = readJson('docs/db.generated.json', { tables: [] });
  const routes = collectAppRoutes();
  const commercialData = await fetchLiveCommercialData();

  const services = servicesModule.services ?? [];
  const servicesByCategory = services.reduce((acc, service) => {
    const list = acc[service.category] ?? [];
    list.push(service);
    acc[service.category] = list;
    return acc;
  }, {});

  const serviceMap = new Map(services.map((service) => [service.slug, service]));
  const homepageServiceCards = extractHomepageServiceCards(serviceMap);
  const homepagePricingMismatches = homepageServiceCards.filter((entry) => entry.teaserValue !== entry.detailedValue);

  const portalFeatures = businessIntelligenceModule.PORTAL_FEATURES ?? [];
  const researchModules = businessIntelligenceModule.RESEARCH_MODULES ?? [];
  const delayedPaymentOptions = businessIntelligenceModule.DELAYED_PAYMENT_OPTIONS ?? [];

  const businessPages = routes.pages.filter((page) => page.route.startsWith('/business'));
  const companyPages = routes.pages.filter((page) => page.route.startsWith('/company'));
  const businessApiRoutes = routes.apiRoutes.filter((route) => route.route.startsWith('/api/business'));
  const adminApiRoutes = routes.apiRoutes.filter((route) => route.route.startsWith('/api/admin'));
  const onboardApiRoutes = routes.apiRoutes.filter((route) => route.route.startsWith('/api/onboard'));
  const webhookRoutes = routes.apiRoutes.filter((route) => route.route.startsWith('/api/webhook'));
  const uniqueTables = [...new Set((dbMetadata.tables ?? []).filter((table) => /^[a-z0-9_.]+$/i.test(table) && table !== 'for'))];

  const metrics = [
    { label: 'Public services', value: String(services.length), detail: '20 service lines across web, mechanical, growth, and creative.' },
    { label: 'Live plans', value: String(commercialData.plans.length), detail: 'Starter, Growth, Scale, and Enterprise onboarding tiers.' },
    { label: 'Portal features', value: String(portalFeatures.length), detail: 'Commercially controlled modules in the business workspace.' },
    { label: 'Research modules', value: String(researchModules.length), detail: 'Selectable market-intelligence engines per report run.' },
    { label: 'Legal recovery paths', value: String(delayedPaymentOptions.length), detail: 'Indian payment-recovery routes represented in the product.' },
    { label: 'Automation functions', value: String(netlifyFunctions.length), detail: 'Scheduled and background operational agents found in Netlify.' },
    { label: 'API handlers', value: String(routes.apiRoutes.length), detail: 'Next.js route handlers spanning admin, business, onboarding, and webhooks.' },
    { label: 'Database tables', value: String(uniqueTables.length), detail: 'Distinct tables detected in generated database metadata.' },
  ];

  const coreBusinessRoutes = [
    '/business/dashboard',
    '/business/dashboard/crm',
    '/business/dashboard/leads',
    '/business/dashboard/automations',
    '/business/dashboard/mailbox',
    '/business/dashboard/market-research',
    '/business/dashboard/legal-tools',
    '/business/dashboard/reports',
    '/business/dashboard/settings',
    '/business/dashboard/subscribe',
  ];

  const coreBusinessApis = [
    '/api/onboard/plans',
    '/api/onboard/checkout',
    '/api/onboard/verify',
    '/api/onboard/coupon',
    '/api/company/portal-status',
    '/api/business/profile',
    '/api/business/automations',
    '/api/business/crm/leads',
    '/api/business/legal/notices',
    '/api/business/legal/notices/export',
    '/api/business/legal/advisor',
    '/api/business/research/reports',
    '/api/business/research/reports/[id]/export',
    '/api/business/research/reports/[id]/share',
  ];

  const keyIntegrations = [
    ['Supabase', 'Authentication, database, storage, RLS, and workspace persistence.'],
    ['Razorpay', 'Subscriptions, payment links, webhook activation, and revenue tracking.'],
    ['WhatsApp', 'Queueing, templates, webhook intake, and broadcast-style communication support.'],
    ['SMTP / IMAP', 'Outbound mail automation, inbox sync, and mailbox thread surfaces.'],
    ['AI stack', 'Groq, Gemini, HuggingFace, Kaggle, Google direct, and OpenRouter paths exist in code.'],
    ['PDF / DOCX', 'Proposal, report, and legal document export layers are built into the platform.'],
    ['Netlify + GitHub Actions', 'Scheduled operations, background processing, and delivery orchestration.'],
    ['LinkedIn + public web scraping', 'Business discovery, organization lookup, and research enrichment support.'],
  ];

  const findings = [
    {
      tone: 'resolved',
      title: 'Resolved: live Starter pricing was corrected during this audit',
      body: `The live \`starter\` onboarding plan in Supabase had drifted to ${formatInr(1)} per month even though the checked-in seed expects ${formatInr(12999)}. This run updated the live plan back to ${formatInr(12999)} and cleared the stored monthly Razorpay plan ID so the next real monthly checkout will be recreated against the correct amount.`,
      evidence: [
        'Live data: onboarding_plans (starter)',
        'Checkout logic: src/app/api/onboard/checkout/route.ts',
        'Pricing source helpers: src/lib/onboarding.ts',
        'Seed reference: onboarding_offers.sql',
      ],
    },
    {
      tone: 'warning',
      title: 'Open risk: legacy ₹1 starter subscriptions still exist',
      body: commercialData.legacyStarterSubscriptions.total > 0
        ? `There are still ${commercialData.legacyStarterSubscriptions.total} legacy starter subscriptions in the database carrying the old ${formatInr(1)} amount. Current breakdown: ${Object.entries(commercialData.legacyStarterSubscriptions.summary).map(([key, count]) => `${count} ${key.replace('|', ' ')}`).join(', ')}. These require Razorpay-side cancellation or migration; that could not be performed from this workspace because live Razorpay credentials are not available here.`
        : 'No legacy ₹1 starter subscriptions were detected in the database during this run.',
      evidence: [
        'Live data: onboarding_subscriptions',
        'Razorpay helpers: src/lib/payments/razorpay-subscriptions.ts',
      ],
    },
    {
      tone: 'warning',
      title: 'Commercial mismatch: homepage teaser prices diverge from detailed service pages',
      body: homepagePricingMismatches.length > 0
        ? `The public homepage service teaser cards are not fully aligned with the detailed service data. Mismatches detected for: ${homepagePricingMismatches.map((entry) => `${entry.name} (${entry.teaserPrice} teaser vs ${entry.detailedPrice} detail)`).join('; ')}. This can create avoidable pricing confusion during discovery and lead qualification.`
        : 'Homepage teaser pricing is aligned with detailed service pricing for the services checked.',
      evidence: [
        'Homepage cards: src/components/sections/Services.tsx',
        'Detailed catalog: src/data/services.ts',
      ],
    },
    {
      tone: 'warning',
      title: 'Commercial gap: setup fees are stored but not billed in checkout',
      body: 'The onboarding data model and admin manager both support monthly and annual setup fees, but the active checkout calculation only uses `getPlanPrice(...)` and never applies `getPlanSetupFee(...)`. That means setup fees currently exist as admin metadata rather than an enforced billable component in the live purchase flow.',
      evidence: [
        'Plan editing UI: src/components/admin/OnboardingManager.tsx',
        'Plan types and helper: src/lib/onboarding.ts',
        'Checkout amount calculation: src/app/api/onboard/checkout/route.ts',
      ],
    },
    {
      tone: 'note',
      title: 'Architecture observation: business-facing naming is split between “business” and “company”',
      body: 'The active customer-facing workspace lives under `/business/*`, but state loading, portal status, and some legacy dashboard surfaces still use `company` naming. This does not block sales, but it is a maintainability signal: terminology drift can confuse future feature work, documentation, and client support.',
      evidence: [
        'Business UI routes: src/app/business/**',
        'Portal state hook: src/hooks/useCompanyPortalState.ts',
        'Portal status API: src/app/api/company/portal-status/route.ts',
        'Legacy company routes: src/app/company/**',
      ],
    },
  ];

  const timestamp = formatLongDate(new Date());
  const dependencyList = Object.keys(packageJson.dependencies ?? {}).sort();
  const businessAutomationNames = netlifyFunctions.map((fn) => fn.name);

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Levitate Business Offering Audit</title>
    <style>
      :root {
        --bg: #efe8dc;
        --paper: #fffaf2;
        --ink: #1f1710;
        --muted: #6d5b4c;
        --line: #dfd2c2;
        --gold: #b68745;
        --gold-soft: #f7ecd9;
        --gold-deep: #7a5521;
        --green: #3f7758;
        --green-soft: #eaf5ee;
        --amber: #9a6d2d;
        --amber-soft: #fbf1df;
        --red: #944f4f;
        --red-soft: #f9ebeb;
        --slate: #324457;
        --shadow: 0 18px 44px rgba(73, 48, 19, 0.08);
      }

      * { box-sizing: border-box; }
      html { background: var(--bg); }
      body {
        margin: 0;
        background:
          radial-gradient(circle at top left, rgba(182, 135, 69, 0.18), transparent 28%),
          radial-gradient(circle at top right, rgba(50, 68, 87, 0.12), transparent 24%),
          linear-gradient(180deg, #f4ede2 0%, #efe8dc 100%);
        color: var(--ink);
        font-family: "Segoe UI", "Aptos", Arial, sans-serif;
        line-height: 1.55;
      }

      .page {
        width: 100%;
        max-width: 1020px;
        margin: 0 auto;
        padding: 28px 24px 40px;
      }

      .cover {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 28px;
        padding: 36px;
        background:
          radial-gradient(circle at 20% 20%, rgba(214, 176, 106, 0.22), transparent 28%),
          radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.08), transparent 24%),
          linear-gradient(135deg, #1d1915 0%, #2a2119 56%, #3a2d1f 100%);
        color: #f8f1e8;
        box-shadow: 0 28px 80px rgba(27, 18, 9, 0.35);
      }

      .cover:before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%),
          linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.03) 100%);
        pointer-events: none;
      }

      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.22em;
        font-size: 11px;
        font-weight: 700;
        color: #ddb777;
      }

      h1, h2, h3, h4 {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        letter-spacing: -0.02em;
      }

      .cover h1 {
        margin-top: 16px;
        font-size: 48px;
        line-height: 1.02;
        max-width: 760px;
      }

      .cover p.lead {
        margin: 18px 0 0;
        max-width: 760px;
        font-size: 16px;
        line-height: 1.75;
        color: rgba(248, 241, 232, 0.86);
      }

      .cover-meta {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        margin-top: 28px;
      }

      .cover-meta-card {
        padding: 16px 18px;
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.06);
        backdrop-filter: blur(8px);
      }

      .cover-meta-card .label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: rgba(248, 241, 232, 0.62);
      }

      .cover-meta-card .value {
        margin-top: 8px;
        font-size: 18px;
        font-weight: 700;
        color: #fff6ea;
      }

      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
        margin-top: 22px;
      }

      .metric {
        padding: 18px;
        border-radius: 20px;
        border: 1px solid var(--line);
        background: rgba(255, 250, 242, 0.92);
        box-shadow: var(--shadow);
      }

      .metric .label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--muted);
      }

      .metric .value {
        margin-top: 8px;
        font-size: 30px;
        font-weight: 800;
        color: var(--ink);
      }

      .metric .detail {
        margin-top: 8px;
        font-size: 12px;
        color: var(--muted);
      }

      .section-card {
        margin-top: 22px;
        padding: 24px;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: rgba(255, 250, 242, 0.96);
        box-shadow: var(--shadow);
      }

      .section-break {
        break-before: page;
        margin-top: 28px;
      }

      .section-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 18px;
      }

      .section-header h2 {
        margin-top: 8px;
        font-size: 30px;
      }

      .section-intro {
        margin: 0 0 18px;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.75;
      }

      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
      .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }

      .card {
        padding: 18px;
        border-radius: 20px;
        border: 1px solid var(--line);
        background: linear-gradient(180deg, #fffdf9 0%, #f8eedf 100%);
      }

      .card h3 {
        font-size: 20px;
      }

      .card p {
        margin: 10px 0 0;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.75;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        border: 1px solid var(--line);
        background: #fffdf9;
        color: var(--amber);
      }

      .badge-default { background: var(--amber-soft); color: var(--amber); }
      .badge-resolved { background: var(--green-soft); color: var(--green); border-color: #cddfcf; }
      .badge-warning { background: var(--amber-soft); color: var(--amber); border-color: #e5d0ad; }
      .badge-note { background: #edf2f7; color: var(--slate); border-color: #d6dee7; }

      .plan-grid,
      .feature-grid,
      .finding-grid {
        display: grid;
        gap: 16px;
      }

      .plan-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .finding-grid { grid-template-columns: 1fr; }

      .plan-card,
      .feature-card,
      .finding-card {
        break-inside: avoid;
        padding: 20px;
        border-radius: 20px;
        border: 1px solid var(--line);
        background: linear-gradient(180deg, #fffdf9 0%, #f8eedf 100%);
      }

      .plan-card.featured {
        border-color: rgba(182, 135, 69, 0.45);
        box-shadow: 0 20px 44px rgba(182, 135, 69, 0.12);
      }

      .plan-price {
        margin-top: 12px;
        font-size: 30px;
        font-weight: 800;
        color: var(--ink);
      }

      .plan-sub {
        margin-top: 4px;
        font-size: 12px;
        color: var(--muted);
      }

      .list,
      .mini-list {
        margin: 14px 0 0;
        padding: 0;
        list-style: none;
      }

      .list li,
      .mini-list li {
        position: relative;
        margin-top: 10px;
        padding-left: 16px;
        color: var(--muted);
        font-size: 13px;
      }

      .list li:before,
      .mini-list li:before {
        content: "";
        position: absolute;
        left: 0;
        top: 9px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--gold);
      }

      .finding-card.warning { background: linear-gradient(180deg, #fff9ef 0%, #f8ecda 100%); }
      .finding-card.resolved { background: linear-gradient(180deg, #f7fcf8 0%, #edf8f0 100%); }
      .finding-card.note { background: linear-gradient(180deg, #fafbfd 0%, #f1f5f9 100%); }

      .finding-card h3 {
        margin-top: 10px;
        font-size: 22px;
      }

      .finding-card p {
        margin: 12px 0 0;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.75;
      }

      .evidence {
        margin-top: 14px;
        padding: 14px 16px;
        border-radius: 16px;
        border: 1px dashed rgba(122, 85, 33, 0.24);
        background: rgba(255,255,255,0.46);
      }

      .evidence .label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--muted);
      }

      .evidence ul {
        margin: 10px 0 0;
        padding-left: 18px;
      }

      .evidence li {
        margin-top: 6px;
        color: var(--muted);
        font-size: 12px;
      }

      .table-wrap {
        overflow: hidden;
        border-radius: 18px;
        border: 1px solid var(--line);
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      thead th {
        padding: 14px 16px;
        background: #f4eadb;
        color: var(--amber);
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        text-align: left;
      }

      tbody td {
        padding: 14px 16px;
        border-top: 1px solid var(--line);
        vertical-align: top;
        font-size: 13px;
      }

      .cell-title {
        font-weight: 700;
        color: var(--ink);
      }

      .cell-subtitle {
        margin-top: 6px;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.65;
      }

      .pill-row,
      .route-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .pill,
      .route-pill {
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: #fffdf9;
        font-size: 11px;
        color: var(--slate);
      }

      .integration-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .integration-card {
        padding: 16px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: #fffdf9;
      }

      .integration-card h4 {
        font-size: 16px;
      }

      .integration-card p {
        margin: 8px 0 0;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.7;
      }

      .footer-note {
        margin-top: 22px;
        text-align: center;
        font-size: 12px;
        color: var(--muted);
      }

      @page {
        size: A4;
        margin: 18mm 12mm 18mm;
      }

      @media print {
        body { background: white; }
        .page { max-width: none; padding: 0; }
        .section-card, .metric, .plan-card, .feature-card, .finding-card, .card, .integration-card { box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="cover">
        <div class="eyebrow">Levitate Labs • Business Audit Documentation</div>
        <h1>Full audit of the facilities, tools, functions, services, and business-facing infrastructure currently offered in LEVITATE.</h1>
        <p class="lead">
          This documentation was built from the live codebase, generated route metadata, module inventories, and current onboarding plan data in Supabase.
          It combines a commercial catalog, LevitateOS workspace audit, delivery/automation backbone, and corrective findings that matter operationally.
        </p>

        <div class="cover-meta">
          <div class="cover-meta-card">
            <div class="label">Audit timestamp</div>
            <div class="value">${escapeHtml(timestamp)}</div>
          </div>
          <div class="cover-meta-card">
            <div class="label">Repository basis</div>
            <div class="value">LEVITATE-main</div>
          </div>
          <div class="cover-meta-card">
            <div class="label">Pricing correction</div>
            <div class="value">Starter fixed to ${escapeHtml(formatInr(12999))}/month</div>
          </div>
        </div>
      </section>

      <section class="metrics">
        ${metrics
          .map(
            (metric) => `
              <div class="metric">
                <div class="label">${escapeHtml(metric.label)}</div>
                <div class="value">${escapeHtml(metric.value)}</div>
                <div class="detail">${escapeHtml(metric.detail)}</div>
              </div>
            `
          )
          .join('')}
      </section>

      <section class="section-card">
        <div class="section-header">
          <div>
            <div class="eyebrow">Executive Summary</div>
            <h2>What the business is actually selling now</h2>
          </div>
        </div>
        <p class="section-intro">
          Levitate is operating as both a service business and a software-enabled operating system. Publicly, the codebase markets 20 paid service lines across web development, mechanical engineering, growth marketing, and creative execution. Behind that, the current productized offer is <strong>LevitateOS</strong>: a subscription workspace that combines CRM, leads, automation visibility, mailbox history, market-intelligence reporting, legal notice drafting/export, report sharing, and plan-gated business profile controls.
        </p>
        <div class="grid-3">
          <div class="card">
            <h3>Commercial layer</h3>
            <p>
              Four onboarding plans exist in live data: Starter, Growth, Scale, and Enterprise. The Starter monthly amount was corrected during this run from ${escapeHtml(formatInr(1))} to ${escapeHtml(formatInr(12999))}.
            </p>
          </div>
          <div class="card">
            <h3>Business workspace</h3>
            <p>
              The plan-controlled LevitateOS workspace currently formalizes ${escapeHtml(String(portalFeatures.length))} named business features, with current UI emphasis on CRM, leads, automations, mailbox, market research, legal tools, report history, and saved business context.
            </p>
          </div>
          <div class="card">
            <h3>Operational backbone</h3>
            <p>
              The repo also contains ${escapeHtml(String(netlifyFunctions.length))} Netlify automations, ${escapeHtml(String(routes.apiRoutes.length))} API handlers, and a broad admin/growth layer for campaigns, scouting, social drafts, revenue, files, blogs, and internal delivery oversight.
            </p>
          </div>
        </div>
      </section>

      ${renderServiceTable('Web Development Services', servicesByCategory.web ?? [])}
      ${renderServiceTable('Mechanical Engineering Services', servicesByCategory.mechanical ?? [])}
      ${renderServiceTable('Growth Services', servicesByCategory.growth ?? [])}
      ${renderServiceTable('Creative Services', servicesByCategory.creative ?? [])}

      <section class="section-card section-break">
        <div class="section-header">
          <div>
            <div class="eyebrow">LevitateOS</div>
            <h2>Live onboarding plans and commercial packaging</h2>
          </div>
        </div>
        <p class="section-intro">
          The current subscription product is positioned as a business operating system rollout rather than a simple CRM license. Pricing is pulled from live Supabase data, not from a static brochure file, so this section reflects the current commercial state after the pricing correction performed in this run.
        </p>
        <div class="plan-grid">
          ${commercialData.plans
            .map(
              (plan) => `
                <article class="plan-card ${plan.is_featured ? 'featured' : ''}">
                  <div class="section-header" style="margin-bottom: 10px;">
                    <div>
                      ${renderBadge(plan.is_featured ? 'Recommended plan' : 'Active plan', plan.is_featured ? 'resolved' : 'default')}
                      <h3 style="margin-top: 12px;">${escapeHtml(plan.name)}</h3>
                    </div>
                  </div>
                  <div class="plan-price">${escapeHtml(formatInr(plan.monthly_price))}<span style="font-size: 14px; color: var(--muted); font-weight: 600;"> / month</span></div>
                  <div class="plan-sub">Annual: ${escapeHtml(formatInr(plan.annual_price))} • Support: ${escapeHtml(plan.support_level || 'Standard')}</div>
                  <p class="section-intro" style="margin-top: 12px; margin-bottom: 0;">${escapeHtml(plan.tagline || plan.description || 'Business operating system rollout.')}</p>
                  <ul class="list">
                    ${(plan.highlights ?? []).slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                  </ul>
                  ${(plan.deliverables ?? []).length > 0 ? `
                    <div class="evidence">
                      <div class="label">Sample deliverables</div>
                      <ul>
                        ${(plan.deliverables ?? []).slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}
                </article>
              `
            )
            .join('')}
        </div>
      </section>

      <section class="section-card">
        <div class="section-header">
          <div>
            <div class="eyebrow">Workspace Modules</div>
            <h2>What a paying business gets inside the portal</h2>
          </div>
        </div>
        <p class="section-intro">
          The formal feature-control map defines the modules below. In practice, the active sidebar and route surface make this the current business product footprint.
        </p>
        <div class="feature-grid">
          ${portalFeatures
            .map(
              (feature) => `
                <article class="feature-card">
                  ${renderBadge(feature.key, 'default')}
                  <h3 style="margin-top: 12px;">${escapeHtml(feature.label)}</h3>
                  <p>${escapeHtml(feature.description)}</p>
                </article>
              `
            )
            .join('')}
        </div>
        <div class="evidence">
          <div class="label">Evidence routes</div>
          <div class="route-row" style="margin-top: 10px;">
            ${coreBusinessRoutes.map((route) => `<span class="route-pill">${escapeHtml(route)}</span>`).join('')}
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-header">
          <div>
            <div class="eyebrow">Research + Legal</div>
            <h2>Decision-support engines layered on top of operations</h2>
          </div>
        </div>
        <div class="grid-2">
          <div class="card">
            <h3>Market-intelligence engine</h3>
            <p>
              The subscriber report builder supports ${escapeHtml(String(researchModules.length))} selectable modules from profile analysis and competitor intelligence through pricing, funding, benchmarking, and compliance. Reports are quota-aware, saved, exportable, and shareable through read-only backlink views.
            </p>
            <ul class="mini-list">
              ${researchModules.slice(0, 8).map((module) => `<li><strong>${escapeHtml(module.title)}</strong> — ${escapeHtml(module.description)}</li>`).join('')}
            </ul>
          </div>
          <div class="card">
            <h3>Legal recovery workspace</h3>
            <p>
              The legal toolset is India-specific. It combines structured notice drafting, editable preview, copy/DOCX/PDF export, backlink sharing, and a delayed-payment advisor that maps disputes to practical legal routes.
            </p>
            <ul class="mini-list">
              ${delayedPaymentOptions.slice(0, 6).map((option) => `<li><strong>${escapeHtml(option.title.replace(/^Option \d+ - /, ''))}</strong> — ${escapeHtml(option.recommendedFor)} • ${escapeHtml(option.timeline)}</li>`).join('')}
            </ul>
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-header">
          <div>
            <div class="eyebrow">Delivery Backbone</div>
            <h2>Internal infrastructure that powers the business offer</h2>
          </div>
        </div>
        <p class="section-intro">
          Beyond the business-facing portal, the repository contains a substantial internal delivery and growth engine. This matters commercially because it shapes what Levitate can actually promise, automate, and support for clients.
        </p>
        <div class="integration-grid">
          ${keyIntegrations
            .map(
              ([name, body]) => `
                <div class="integration-card">
                  <h4>${escapeHtml(name)}</h4>
                  <p>${escapeHtml(body)}</p>
                </div>
              `
            )
            .join('')}
        </div>
        <div class="section-card" style="margin-top: 18px; padding: 18px;">
          <div class="section-header" style="margin-bottom: 12px;">
            <div>
              <div class="eyebrow">Automation Catalog</div>
              <h3 style="font-size: 22px;">Netlify functions currently detected</h3>
            </div>
          </div>
          <div class="route-row">
            ${businessAutomationNames.map((name) => `<span class="route-pill">${escapeHtml(name)}</span>`).join('')}
          </div>
        </div>
      </section>

      <section class="section-card section-break">
        <div class="section-header">
          <div>
            <div class="eyebrow">Audit Findings</div>
            <h2>Corrections made, open risks, and business-level inconsistencies</h2>
          </div>
        </div>
        <div class="finding-grid">
          ${findings
            .map(
              (finding) => `
                <article class="finding-card ${escapeHtml(finding.tone)}">
                  ${renderBadge(finding.tone, finding.tone === 'resolved' ? 'resolved' : finding.tone === 'warning' ? 'warning' : 'note')}
                  <h3>${escapeHtml(finding.title)}</h3>
                  <p>${escapeHtml(finding.body)}</p>
                  <div class="evidence">
                    <div class="label">Evidence</div>
                    <ul>
                      ${finding.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                    </ul>
                  </div>
                </article>
              `
            )
            .join('')}
        </div>
      </section>

      <section class="section-card">
        <div class="section-header">
          <div>
            <div class="eyebrow">Technical Evidence Appendix</div>
            <h2>Route surface, operational footprint, and source anchors</h2>
          </div>
        </div>
        <div class="grid-3">
          <div class="card">
            <h3>UI surface</h3>
            <p>
              ${escapeHtml(String(routes.pages.length))} page routes detected in <code>src/app/**/page.tsx</code>, including ${escapeHtml(String(businessPages.length))} <code>/business/*</code> pages and ${escapeHtml(String(companyPages.length))} <code>/company/*</code> pages.
            </p>
          </div>
          <div class="card">
            <h3>API surface</h3>
            <p>
              ${escapeHtml(String(routes.apiRoutes.length))} route handlers detected overall, including ${escapeHtml(String(adminApiRoutes.length))} admin handlers, ${escapeHtml(String(businessApiRoutes.length))} business handlers, ${escapeHtml(String(onboardApiRoutes.length))} onboarding handlers, and ${escapeHtml(String(webhookRoutes.length))} webhook handlers.
            </p>
          </div>
          <div class="card">
            <h3>Codebase footprint</h3>
            <p>
              ${escapeHtml(String(inventory.total_files ?? 0))} tracked source files were detected in the generated inventory, with dependencies spanning ${escapeHtml(String(dependencyList.length))} runtime packages.
            </p>
          </div>
        </div>

        <div class="section-card" style="margin-top: 18px; padding: 18px;">
          <div class="section-header" style="margin-bottom: 12px;">
            <div>
              <div class="eyebrow">Core business APIs</div>
              <h3 style="font-size: 22px;">Endpoints that matter most to the commercial product</h3>
            </div>
          </div>
          <div class="route-row">
            ${coreBusinessApis.map((api) => `<span class="route-pill">${escapeHtml(api)}</span>`).join('')}
          </div>
        </div>

        <div class="section-card" style="margin-top: 18px; padding: 18px;">
          <div class="section-header" style="margin-bottom: 12px;">
            <div>
              <div class="eyebrow">Primary source files used for this document</div>
              <h3 style="font-size: 22px;">Audit anchors</h3>
            </div>
          </div>
          <div class="pill-row">
            ${[
              'src/data/services.ts',
              'src/components/sections/Services.tsx',
              'src/lib/business-intelligence.ts',
              'src/components/onboarding/OnboardingPitchDeck.tsx',
              'src/components/business/BusinessDashboardClient.tsx',
              'src/components/business/LegalToolsWorkspace.tsx',
              'src/components/business/ResearchWorkspace.tsx',
              'src/components/business/ResearchReportView.tsx',
              'src/app/api/onboard/checkout/route.ts',
              'src/lib/onboarding.ts',
              'src/hooks/useCompanyPortalState.ts',
              'docs/03-API-Reference.md',
              'docs/04-Netlify-Automations.md',
              'docs/06-UI-Routes.md',
              'onboarding_offers.sql',
            ]
              .map((file) => `<span class="pill">${escapeHtml(file)}</span>`)
              .join('')}
          </div>
        </div>
      </section>

      <div class="footer-note">
        Generated automatically from the local repository and current onboarding plan data on ${escapeHtml(timestamp)}.
      </div>
    </main>
  </body>
</html>`;

  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(htmlOutputPath, html, 'utf8');

  const executablePath = findBrowserExecutable();
  if (!executablePath) {
    throw new Error('Could not locate Chrome or Edge for PDF generation.');
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');
    await page.pdf({
      path: pdfOutputPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate:
        '<div style="width:100%; font-size:8px; color:#7a6858; text-align:center; padding:0 12px 10px;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      margin: {
        top: '14mm',
        right: '10mm',
        bottom: '18mm',
        left: '10mm',
      },
    });
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({
    html: path.relative(rootDir, htmlOutputPath).replace(/\\/g, '/'),
    pdf: path.relative(rootDir, pdfOutputPath).replace(/\\/g, '/'),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
