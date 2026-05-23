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
const htmlOutputPath = path.join(docsDir, 'levitate-business-pitch-deck.html');
const pdfOutputPath = path.join(docsDir, 'levitate-business-pitch-deck.pdf');

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

function formatDateLong(value = new Date()) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(value);
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
    } else {
      collector.push(absolutePath);
    }
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

function extractHomepageCards(serviceMap) {
  const source = fs.readFileSync(path.join(rootDir, 'src', 'components', 'sections', 'Services.tsx'), 'utf8');
  const matches = [...source.matchAll(/\{\s*name:\s*'([^']+)',\s*slug:\s*'([^']+)',\s*price:\s*'([^']+)'/g)];

  return matches
    .map((match) => {
      const [, name, slug, teaserPrice] = match;
      const detailed = serviceMap.get(slug);
      return {
        name,
        slug,
        teaserPrice,
        detailedPrice: detailed?.price ?? null,
        teaserValue: normalizePriceToNumber(teaserPrice),
        detailedValue: normalizePriceToNumber(detailed?.price ?? null),
      };
    })
    .filter((card) => card.detailedPrice !== null);
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
      legacyStarterSubscriptions: { total: 0, summary: {} },
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: plans, error: plansError } = await supabase
    .from('onboarding_plans')
    .select('id, slug, name, tagline, description, monthly_price, annual_price, monthly_setup_fee, annual_setup_fee, support_level, is_featured, highlights, deliverables, feature_controls')
    .order('sort_order', { ascending: true });

  if (plansError) {
    throw plansError;
  }

  const starterPlan = (plans ?? []).find((plan) => plan.slug === 'starter');
  let subscriptions = [];

  if (starterPlan) {
    const { data, error } = await supabase
      .from('onboarding_subscriptions')
      .select('status, billing_cycle, amount')
      .eq('plan_id', starterPlan.id)
      .eq('amount', 1);

    if (error) {
      throw error;
    }

    subscriptions = data ?? [];
  }

  const summary = subscriptions.reduce((acc, row) => {
    const key = `${row.status}|${row.billing_cycle}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    plans: plans ?? [],
    legacyStarterSubscriptions: {
      total: subscriptions.length,
      summary,
    },
  };
}

function categoryRange(services) {
  const values = services.map((service) => normalizePriceToNumber(service.price)).filter((value) => value != null);
  if (values.length === 0) {
    return 'Custom';
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? formatInr(min) : `${formatInr(min)} to ${formatInr(max)}`;
}

function compactServiceDescription(text) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= 90) {
    return normalized;
  }
  return `${normalized.slice(0, 87).trimEnd()}...`;
}

function renderMetric(label, value, note) {
  return `
    <div class="metric-card">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(value)}</div>
      <div class="metric-note">${escapeHtml(note)}</div>
    </div>
  `;
}

function renderBadge(text, tone = 'gold') {
  return `<span class="badge badge-${tone}">${escapeHtml(text)}</span>`;
}

function renderFeaturePill(text) {
  return `<span class="feature-pill">${escapeHtml(text)}</span>`;
}

function renderServiceSlide(categoryLabel, categoryNote, services, themeClass) {
  const count = services.length;
  const range = categoryRange(services);
  const averageFeatureCount = Math.round(services.reduce((sum, service) => sum + service.features.length, 0) / Math.max(count, 1));

  return `
    <div class="service-slide-layout">
      <div class="category-summary panel emphasize">
        ${renderBadge(categoryLabel, 'emerald')}
        <h3>${escapeHtml(categoryLabel)} Services</h3>
        <p>${escapeHtml(categoryNote)}</p>
        <div class="summary-stack">
          <div class="mini-metric">
            <div class="mini-label">Service lines</div>
            <div class="mini-value">${escapeHtml(String(count))}</div>
          </div>
          <div class="mini-metric">
            <div class="mini-label">Price band</div>
            <div class="mini-value">${escapeHtml(range)}</div>
          </div>
          <div class="mini-metric">
            <div class="mini-label">Avg. feature depth</div>
            <div class="mini-value">${escapeHtml(`${averageFeatureCount} core items`)}</div>
          </div>
        </div>
      </div>
      <div class="service-grid">
        ${services
          .map(
            (service) => `
              <div class="service-card panel">
                <div class="service-top">
                  <div>
                    <div class="service-name">${escapeHtml(service.name)}</div>
                    <div class="service-price">${escapeHtml(service.price)} <span>${escapeHtml(service.priceUnit)}</span></div>
                  </div>
                  ${renderBadge(service.timeline, 'slate')}
                </div>
                <p class="service-desc">${escapeHtml(compactServiceDescription(service.shortDescription))}</p>
                <div class="service-foot">
                  ${(service.features ?? []).slice(0, 3).map((item) => renderFeaturePill(item)).join('')}
                </div>
              </div>
            `
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderPlanCards(plans) {
  return plans
    .map(
      (plan) => `
        <div class="plan-card panel ${plan.is_featured ? 'highlight-plan' : ''}">
          <div class="plan-header">
            <div>
              ${renderBadge(plan.is_featured ? 'Featured' : 'Plan', plan.is_featured ? 'emerald' : 'gold')}
              <div class="plan-name">${escapeHtml(plan.name)}</div>
            </div>
            <div class="plan-support">${escapeHtml(plan.support_level || 'Standard')}</div>
          </div>
          <div class="plan-price-row">
            <div class="plan-price">${escapeHtml(formatInr(plan.monthly_price))}</div>
            <div class="plan-cycle">monthly</div>
          </div>
          <div class="plan-subline">Annual ${escapeHtml(formatInr(plan.annual_price))}</div>
          <p class="plan-copy">${escapeHtml(plan.tagline || plan.description || 'Business operating system rollout')}</p>
          <div class="plan-list">
            ${(plan.highlights ?? []).slice(0, 3).map((item) => `<div class="plan-item">${escapeHtml(item)}</div>`).join('')}
          </div>
        </div>
      `
    )
    .join('');
}

function renderFeatureCards(features) {
  return features
    .map(
      (feature) => `
        <div class="feature-card panel">
          ${renderBadge(feature.key, 'slate')}
          <div class="feature-title">${escapeHtml(feature.label)}</div>
          <p>${escapeHtml(feature.description)}</p>
        </div>
      `
    )
    .join('');
}

function renderModuleGroup(title, modules) {
  return `
    <div class="module-group panel">
      <div class="module-group-title">${escapeHtml(title)}</div>
      <div class="module-list">
        ${modules.map((module) => `<div class="module-item"><strong>${escapeHtml(module.title)}</strong><span>${escapeHtml(module.description)}</span></div>`).join('')}
      </div>
    </div>
  `;
}

function renderLegalRouteCards(routes) {
  return routes
    .map(
      (route) => `
        <div class="legal-route-card panel">
          <div class="legal-route-title">${escapeHtml(route.title.replace(/^Option \d+ - /, ''))}</div>
          <div class="legal-route-reco">${escapeHtml(route.recommendedFor)}</div>
          <div class="legal-route-time">${escapeHtml(route.timeline)}</div>
        </div>
      `
    )
    .join('');
}

function renderAutomationColumn(title, note, items) {
  return `
    <div class="automation-column panel">
      <div class="automation-title">${escapeHtml(title)}</div>
      <p>${escapeHtml(note)}</p>
      <div class="automation-list">
        ${items.map((item) => `<div class="automation-item">${escapeHtml(item)}</div>`).join('')}
      </div>
    </div>
  `;
}

function renderIntegrationCard(title, body) {
  return `
    <div class="integration-card panel">
      <div class="integration-title">${escapeHtml(title)}</div>
      <p>${escapeHtml(body)}</p>
    </div>
  `;
}

function renderFindingCard(tone, title, body, evidence) {
  return `
    <div class="finding-card panel ${escapeHtml(tone)}">
      ${renderBadge(tone === 'resolved' ? 'Fixed in this audit' : tone === 'warning' ? 'Needs action' : 'Observation', tone === 'resolved' ? 'emerald' : tone === 'warning' ? 'amber' : 'slate')}
      <div class="finding-title">${escapeHtml(title)}</div>
      <p>${escapeHtml(body)}</p>
      <div class="finding-evidence">
        ${evidence.map((item) => `<div class="evidence-item">${escapeHtml(item)}</div>`).join('')}
      </div>
    </div>
  `;
}

function renderActionCard(index, title, body) {
  return `
    <div class="action-card panel">
      <div class="action-index">0${index}</div>
      <div class="action-title">${escapeHtml(title)}</div>
      <p>${escapeHtml(body)}</p>
    </div>
  `;
}

function buildHtml({ slides, generatedAt }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Levitate Business Pitch Deck</title>
    <style>
      @page {
        size: 13.333in 7.5in;
        margin: 0;
      }

      * { box-sizing: border-box; }

      html, body {
        margin: 0;
        padding: 0;
        background:
          radial-gradient(circle at top left, rgba(184, 136, 69, 0.24), transparent 18%),
          linear-gradient(180deg, #efe6d8 0%, #e6dccc 100%);
        font-family: "Segoe UI", "Aptos", Arial, sans-serif;
      }

      body {
        padding: 18px 0 28px;
      }

      .deck {
        width: 13.333in;
        margin: 0 auto;
      }

      .slide {
        width: 13.333in;
        height: 7.5in;
        position: relative;
        overflow: hidden;
        margin: 0 auto 18px;
        break-after: page;
        page-break-after: always;
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 34px 90px rgba(39, 27, 12, 0.22);
      }

      .slide:last-child {
        margin-bottom: 0;
      }

      .slide.light {
        --bg: linear-gradient(135deg, #fff8ed 0%, #f6ecdf 62%, #eee2d0 100%);
        --panel: rgba(255, 252, 247, 0.88);
        --panel-strong: linear-gradient(180deg, #fffdf8 0%, #f8eee0 100%);
        --line: rgba(122, 89, 49, 0.18);
        --text: #1f1710;
        --muted: #6e5a47;
        --subtle: #8c7359;
        --accent: #b68745;
        --accent-soft: rgba(182, 135, 69, 0.12);
        --emerald: #42745a;
        --emerald-soft: rgba(66, 116, 90, 0.12);
        --amber: #9a6d2d;
        --amber-soft: rgba(154, 109, 45, 0.12);
        --slate: #405365;
        --slate-soft: rgba(64, 83, 101, 0.11);
      }

      .slide.dark {
        --bg:
          radial-gradient(circle at 18% 18%, rgba(214, 174, 106, 0.18), transparent 18%),
          linear-gradient(135deg, #15110e 0%, #241b14 56%, #31261c 100%);
        --panel: rgba(255, 255, 255, 0.06);
        --panel-strong: linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.05) 100%);
        --line: rgba(255, 255, 255, 0.14);
        --text: #fbf3e8;
        --muted: rgba(251, 243, 232, 0.78);
        --subtle: rgba(251, 243, 232, 0.58);
        --accent: #e2b25c;
        --accent-soft: rgba(226, 178, 92, 0.16);
        --emerald: #7ed0aa;
        --emerald-soft: rgba(126, 208, 170, 0.16);
        --amber: #f0c56f;
        --amber-soft: rgba(240, 197, 111, 0.16);
        --slate: #b7d1ee;
        --slate-soft: rgba(183, 209, 238, 0.16);
      }

      .slide.warm {
        --bg:
          radial-gradient(circle at 84% 12%, rgba(182, 135, 69, 0.14), transparent 20%),
          linear-gradient(135deg, #f8efdf 0%, #f2e5d1 58%, #e8d9c4 100%);
        --panel: rgba(255, 252, 246, 0.9);
        --panel-strong: linear-gradient(180deg, #fffdf8 0%, #f8ecdc 100%);
        --line: rgba(122, 89, 49, 0.16);
        --text: #201711;
        --muted: #6f5b48;
        --subtle: #8d7258;
        --accent: #b68745;
        --accent-soft: rgba(182, 135, 69, 0.12);
        --emerald: #4f7d64;
        --emerald-soft: rgba(79, 125, 100, 0.12);
        --amber: #9a6d2d;
        --amber-soft: rgba(154, 109, 45, 0.12);
        --slate: #405365;
        --slate-soft: rgba(64, 83, 101, 0.11);
      }

      .slide::before {
        content: "";
        position: absolute;
        inset: 0;
        background: var(--bg);
      }

      .slide-shell {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        padding: 0.34in 0.44in 0.32in;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .brand {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.24em;
        font-weight: 700;
        color: var(--accent);
      }

      .slide-number {
        font-size: 11px;
        font-weight: 700;
        color: var(--subtle);
      }

      .title-kicker {
        margin-top: 0.12in;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        color: var(--accent);
      }

      .title-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 24px;
        align-items: end;
        margin-top: 8px;
      }

      h1, h2, h3, h4 {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        letter-spacing: -0.03em;
        color: var(--text);
      }

      .slide-title {
        font-size: 38px;
        line-height: 0.98;
        max-width: 8.5in;
      }

      .slide-subtitle {
        margin-top: 10px;
        max-width: 8.7in;
        font-size: 13px;
        line-height: 1.66;
        color: var(--muted);
      }

      .slide-body {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        margin-top: 0.17in;
      }

      .deck-footer {
        margin-top: auto;
        padding-top: 10px;
        font-size: 10px;
        color: var(--subtle);
      }

      .panel {
        border: 1px solid var(--line);
        border-radius: 22px;
        background: var(--panel);
        backdrop-filter: blur(8px);
      }

      .emphasize {
        background: var(--panel-strong);
      }

      .badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        border: 1px solid transparent;
      }

      .badge-gold { color: var(--amber); background: var(--amber-soft); border-color: rgba(154,109,45,0.22); }
      .badge-emerald { color: var(--emerald); background: var(--emerald-soft); border-color: rgba(79,125,100,0.22); }
      .badge-amber { color: var(--amber); background: var(--amber-soft); border-color: rgba(154,109,45,0.22); }
      .badge-slate { color: var(--slate); background: var(--slate-soft); border-color: rgba(64,83,101,0.2); }

      .hero-grid,
      .two-col,
      .three-col,
      .four-col {
        display: grid;
        gap: 14px;
      }

      .hero-grid { grid-template-columns: 1.3fr 0.7fr; flex: 1; }
      .two-col { grid-template-columns: 1fr 1fr; }
      .three-col { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .four-col { grid-template-columns: repeat(4, minmax(0, 1fr)); }

      .cover-main {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
      }

      .cover-title {
        font-size: 58px;
        line-height: 0.94;
        max-width: 8.9in;
      }

      .cover-copy {
        margin-top: 14px;
        max-width: 8.1in;
        font-size: 15px;
        line-height: 1.74;
        color: var(--muted);
      }

      .cover-side {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .info-card {
        padding: 18px 18px 16px;
      }

      .info-label {
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--subtle);
      }

      .info-value {
        margin-top: 8px;
        font-size: 22px;
        font-weight: 700;
        color: var(--text);
        line-height: 1.3;
      }

      .metric-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .metric-card {
        padding: 18px;
        border-radius: 20px;
        border: 1px solid var(--line);
        background: var(--panel);
      }

      .metric-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--subtle);
      }

      .metric-value {
        margin-top: 8px;
        font-size: 34px;
        font-weight: 800;
        color: var(--text);
      }

      .metric-note {
        margin-top: 8px;
        font-size: 12px;
        line-height: 1.6;
        color: var(--muted);
      }

      .thesis-card {
        padding: 18px;
      }

      .thesis-card h3 {
        font-size: 24px;
        line-height: 1.02;
      }

      .thesis-card p {
        margin: 10px 0 0;
        font-size: 13px;
        line-height: 1.72;
        color: var(--muted);
      }

      .thesis-list {
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .thesis-item {
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--line);
        font-size: 12px;
        color: var(--muted);
      }

      .service-slide-layout {
        display: grid;
        grid-template-columns: 0.82fr 1.18fr;
        gap: 16px;
        height: 100%;
      }

      .category-summary {
        padding: 22px;
        display: flex;
        flex-direction: column;
      }

      .category-summary h3 {
        margin-top: 14px;
        font-size: 34px;
        line-height: 0.98;
      }

      .category-summary p {
        margin: 12px 0 0;
        font-size: 13px;
        line-height: 1.76;
        color: var(--muted);
      }

      .summary-stack {
        margin-top: auto;
        display: grid;
        gap: 10px;
      }

      .mini-metric {
        padding: 14px;
        border-radius: 16px;
        border: 1px solid var(--line);
        background: rgba(255,255,255,0.04);
      }

      .mini-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--subtle);
      }

      .mini-value {
        margin-top: 8px;
        font-size: 20px;
        font-weight: 700;
        color: var(--text);
      }

      .service-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        align-content: start;
      }

      .service-card {
        padding: 16px;
        min-height: 1.34in;
      }

      .service-top {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 10px;
      }

      .service-name {
        font-size: 18px;
        font-weight: 700;
        color: var(--text);
      }

      .service-price {
        margin-top: 6px;
        font-size: 16px;
        font-weight: 700;
        color: var(--accent);
      }

      .service-price span {
        font-size: 11px;
        font-weight: 600;
        color: var(--subtle);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .service-desc {
        margin: 12px 0 0;
        font-size: 12px;
        line-height: 1.65;
        color: var(--muted);
      }

      .service-foot {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 12px;
      }

      .feature-pill {
        padding: 6px 9px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255,255,255,0.04);
        font-size: 9px;
        line-height: 1;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--subtle);
      }

      .plan-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      .plan-card {
        padding: 14px;
        min-height: 3.52in;
      }

      .highlight-plan {
        box-shadow: 0 18px 44px rgba(182, 135, 69, 0.14);
        border-color: rgba(182, 135, 69, 0.3);
      }

      .plan-header {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 12px;
      }

      .plan-name {
        margin-top: 12px;
        font-size: 19px;
        font-weight: 700;
        color: var(--text);
      }

      .plan-support {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--subtle);
      }

      .plan-price-row {
        display: flex;
        align-items: end;
        gap: 8px;
        margin-top: 14px;
      }

      .plan-price {
        font-size: 26px;
        font-weight: 800;
        color: var(--text);
        line-height: 1;
      }

      .plan-cycle, .plan-subline {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: var(--subtle);
      }

      .plan-copy {
        margin: 10px 0 0;
        font-size: 11px;
        line-height: 1.62;
        color: var(--muted);
      }

      .plan-list {
        display: grid;
        gap: 7px;
        margin-top: 12px;
      }

      .plan-item {
        padding: 8px 10px;
        border-radius: 14px;
        border: 1px solid var(--line);
        font-size: 10px;
        line-height: 1.55;
        color: var(--muted);
      }

      .feature-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .feature-card {
        padding: 16px;
        min-height: 1.58in;
      }

      .feature-title {
        margin-top: 14px;
        font-size: 18px;
        font-weight: 700;
        color: var(--text);
      }

      .feature-card p {
        margin: 10px 0 0;
        font-size: 12px;
        line-height: 1.72;
        color: var(--muted);
      }

      .module-layout {
        display: grid;
        grid-template-columns: 1.18fr 0.82fr;
        gap: 16px;
        height: 100%;
      }

      .module-groups {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .module-group {
        padding: 16px;
        min-height: 2.1in;
      }

      .module-group-title {
        font-size: 17px;
        font-weight: 700;
        color: var(--text);
      }

      .module-list {
        display: grid;
        gap: 9px;
        margin-top: 12px;
      }

      .module-item {
        display: grid;
        gap: 4px;
      }

      .module-item strong {
        font-size: 12px;
        color: var(--text);
      }

      .module-item span {
        font-size: 11px;
        line-height: 1.55;
        color: var(--muted);
      }

      .stat-stack {
        display: grid;
        gap: 12px;
      }

      .stat-panel {
        padding: 16px;
      }

      .stat-panel h4 {
        font-size: 18px;
      }

      .stat-panel p {
        margin: 9px 0 0;
        font-size: 12px;
        line-height: 1.72;
        color: var(--muted);
      }

      .legal-layout {
        display: grid;
        grid-template-columns: 0.78fr 1.22fr;
        gap: 16px;
        height: 100%;
      }

      .process-stack {
        display: grid;
        gap: 10px;
      }

      .process-card {
        padding: 14px;
      }

      .process-step {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--subtle);
      }

      .process-title {
        margin-top: 8px;
        font-size: 18px;
        font-weight: 700;
        color: var(--text);
      }

      .process-copy {
        margin-top: 8px;
        font-size: 12px;
        line-height: 1.7;
        color: var(--muted);
      }

      .legal-routes-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .legal-route-card {
        padding: 14px;
        min-height: 1.34in;
      }

      .legal-route-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--text);
      }

      .legal-route-reco {
        margin-top: 8px;
        font-size: 11px;
        line-height: 1.55;
        color: var(--muted);
      }

      .legal-route-time {
        margin-top: 10px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--accent);
      }

      .automation-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .automation-column {
        padding: 16px;
      }

      .automation-title {
        font-size: 18px;
        font-weight: 700;
        color: var(--text);
      }

      .automation-column p {
        margin: 10px 0 0;
        font-size: 12px;
        line-height: 1.7;
        color: var(--muted);
      }

      .automation-list {
        display: grid;
        gap: 8px;
        margin-top: 14px;
      }

      .automation-item {
        padding: 9px 11px;
        border-radius: 14px;
        border: 1px solid var(--line);
        font-size: 11px;
        color: var(--muted);
      }

      .admin-strip {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }

      .admin-pill {
        padding: 8px 10px;
        border-radius: 999px;
        border: 1px solid var(--line);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--subtle);
      }

      .integration-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .integration-card {
        padding: 16px;
        min-height: 1.44in;
      }

      .integration-title {
        font-size: 17px;
        font-weight: 700;
        color: var(--text);
      }

      .integration-card p {
        margin: 10px 0 0;
        font-size: 11px;
        line-height: 1.68;
        color: var(--muted);
      }

      .finding-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .finding-card {
        padding: 16px;
      }

      .finding-card.resolved {
        background: linear-gradient(180deg, rgba(79,125,100,0.12) 0%, rgba(79,125,100,0.06) 100%);
      }

      .finding-card.warning {
        background: linear-gradient(180deg, rgba(154,109,45,0.12) 0%, rgba(154,109,45,0.05) 100%);
      }

      .finding-card.note {
        background: linear-gradient(180deg, rgba(64,83,101,0.1) 0%, rgba(64,83,101,0.04) 100%);
      }

      .finding-title {
        margin-top: 12px;
        font-size: 18px;
        font-weight: 700;
        color: var(--text);
      }

      .finding-card p {
        margin: 10px 0 0;
        font-size: 12px;
        line-height: 1.72;
        color: var(--muted);
      }

      .finding-evidence {
        display: grid;
        gap: 7px;
        margin-top: 12px;
      }

      .evidence-item {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--subtle);
      }

      .action-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .action-card {
        padding: 16px;
      }

      .action-index {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.18em;
        color: var(--accent);
      }

      .action-title {
        margin-top: 12px;
        font-size: 18px;
        font-weight: 700;
        color: var(--text);
      }

      .action-card p {
        margin: 10px 0 0;
        font-size: 12px;
        line-height: 1.72;
        color: var(--muted);
      }

      .path-box {
        padding: 18px;
      }

      .path-title {
        font-size: 18px;
        font-weight: 700;
        color: var(--text);
      }

      .path-list {
        display: grid;
        gap: 9px;
        margin-top: 12px;
      }

      .path-item {
        font-size: 12px;
        color: var(--muted);
        line-height: 1.65;
      }

      code.inline {
        padding: 3px 7px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255,255,255,0.05);
        font-family: "Cascadia Code", Consolas, monospace;
        font-size: 10px;
        color: var(--text);
      }

      @media print {
        html, body {
          background: white;
          padding: 0;
        }

        .deck {
          width: auto;
          margin: 0;
        }

        .slide {
          margin: 0;
          border: none;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="deck">
      ${slides.join('\n')}
    </main>
  </body>
</html>`;
}

function wrapSlide(index, total, theme, kicker, title, subtitle, body, footer) {
  return `
    <section class="slide ${theme}">
      <div class="slide-shell">
        <div class="topbar">
          <div class="brand">Levitate Labs • Business Pitch Deck</div>
          <div class="slide-number">${escapeHtml(String(index).padStart(2, '0'))} / ${escapeHtml(String(total).padStart(2, '0'))}</div>
        </div>
        <div class="title-kicker">${escapeHtml(kicker)}</div>
        <div class="title-row">
          <div>
            <h2 class="slide-title">${escapeHtml(title)}</h2>
            ${subtitle ? `<div class="slide-subtitle">${escapeHtml(subtitle)}</div>` : ''}
          </div>
        </div>
        <div class="slide-body">${body}</div>
        <div class="deck-footer">${footer ? escapeHtml(footer) : ''}</div>
      </div>
    </section>
  `;
}

async function main() {
  const shouldRenderPreviews = process.argv.includes('--previews') || process.argv.includes('--preview');
  const previewDir = path.join(docsDir, 'pitch-deck-previews');
  const servicesModule = loadTsModule('src/data/services.ts');
  const businessIntelligenceModule = loadTsModule('src/lib/business-intelligence.ts');
  const inventory = readJson('codebase_inventory.json', { total_files: 0 });
  const netlifyFunctions = readJson('docs/netlify-functions.generated.json', []);
  const dbMetadata = readJson('docs/db.generated.json', { tables: [] });
  const routes = collectAppRoutes();
  const commercial = await fetchLiveCommercialData();
  const generatedAt = new Date();
  const starterPlanLive = commercial.plans.find((plan) => plan.slug === 'starter') ?? null;
  const starterMonthlyLive = starterPlanLive?.monthly_price ?? 12999;
  const starterAnnualLive = starterPlanLive?.annual_price ?? 129990;

  const services = servicesModule.services ?? [];
  const serviceMap = new Map(services.map((service) => [service.slug, service]));
  const homepageCards = extractHomepageCards(serviceMap);
  const homepageMismatches = homepageCards.filter((card) => card.teaserValue !== card.detailedValue);
  const homepageCoverage = homepageCards.length;

  const servicesByCategory = services.reduce((acc, service) => {
    const list = acc[service.category] ?? [];
    list.push(service);
    acc[service.category] = list;
    return acc;
  }, {});

  const portalFeatures = businessIntelligenceModule.PORTAL_FEATURES ?? [];
  const researchModules = businessIntelligenceModule.RESEARCH_MODULES ?? [];
  const delayedPaymentOptions = businessIntelligenceModule.DELAYED_PAYMENT_OPTIONS ?? [];

  const uniqueTables = [...new Set((dbMetadata.tables ?? []).filter((table) => /^[a-z0-9_.]+$/i.test(table) && table !== 'for'))];
  const businessPages = routes.pages.filter((page) => page.route.startsWith('/business'));
  const businessApiRoutes = routes.apiRoutes.filter((route) => route.route.startsWith('/api/business'));
  const adminApiRoutes = routes.apiRoutes.filter((route) => route.route.startsWith('/api/admin'));
  const onboardingApiRoutes = routes.apiRoutes.filter((route) => route.route.startsWith('/api/onboard'));
  const webhookRoutes = routes.apiRoutes.filter((route) => route.route.startsWith('/api/webhook'));

  const researchGroups = [
    {
      title: 'Identity and competition',
      modules: researchModules.filter((module) => ['business_profile', 'competitor_intelligence', 'customer_personas'].includes(module.id)),
    },
    {
      title: 'Market and GTM',
      modules: researchModules.filter((module) => ['market_sizing', 'future_growth', 'pricing_intelligence', 'go_to_market'].includes(module.id)),
    },
    {
      title: 'Risk and environment',
      modules: researchModules.filter((module) => ['swot_analysis', 'pestle_analysis', 'risk_matrix', 'regulatory_landscape'].includes(module.id)),
    },
    {
      title: 'Strategic frontier',
      modules: researchModules.filter((module) => ['technology_landscape', 'funding_landscape', 'industry_benchmarking'].includes(module.id)),
    },
  ];

  const automationGroups = [
    {
      title: 'Acquire',
      note: 'Lead discovery, enrichment, outreach, and follow-up keep the top of funnel moving without manual spreadsheet work.',
      items: ['bizdev', 'research', 'outreach', 'followup', 'market-tracker'],
    },
    {
      title: 'Convert',
      note: 'Inbound email, discovery, proposals, payments, and onboarding routes connect interest to project activation.',
      items: ['email-reader', 'discovery-bg', 'proposal-bg', 'onboarding-bg', 'webhook flows'],
    },
    {
      title: 'Retain and govern',
      note: 'Revenue chasing, retention, reporting, heartbeat, and evaluator functions support continuity and oversight.',
      items: ['invoice-check', 'retention', 'reporter', 'supabase-heartbeat', 'agent-evaluator'],
    },
  ];

  const findings = [
    {
      tone: 'resolved',
      title: 'Starter onboarding price corrected in live data',
      body: `The live starter plan was corrected on ${formatDateLong(generatedAt)} from ${formatInr(1)} per month to ${formatInr(starterMonthlyLive)} per month, and the stale monthly Razorpay plan ID was cleared so new monthly checkouts recreate at the correct amount.`,
      evidence: ['Live Supabase plan row', 'onboarding_offers.sql', 'onboard checkout route'],
    },
    {
      tone: 'warning',
      title: 'Legacy test-price subscriptions still need operational cleanup',
      body: commercial.legacyStarterSubscriptions.total > 0
        ? `${commercial.legacyStarterSubscriptions.total} legacy starter subscriptions still show the old ${formatInr(1)} amount (${Object.entries(commercial.legacyStarterSubscriptions.summary).map(([key, count]) => `${count} ${key.replace('|', ' ')}`).join(', ')}). These need Razorpay-side cancellation or migration.`
        : `No legacy ${formatInr(1)} starter subscriptions were detected during this audit run.`,
      evidence: ['onboarding_subscriptions', 'Razorpay subscription helpers'],
    },
    {
      tone: 'warning',
      title: 'Public pricing communication is inconsistent',
      body: `${homepageMismatches.length} homepage teaser cards are out of sync with detailed service pricing, and only ${homepageCoverage} of the full ${services.length} service pages are surfaced in the homepage grid.`,
      evidence: ['src/components/sections/Services.tsx', 'src/data/services.ts'],
    },
    {
      tone: 'warning',
      title: 'Setup fees are configured but not actually charged',
      body: 'Admin tooling supports monthly and annual setup fees, but the live checkout amount only uses the recurring plan price and never applies the setup fee helper in the transaction calculation.',
      evidence: ['admin onboarding manager', 'src/lib/onboarding.ts', 'src/app/api/onboard/checkout/route.ts'],
    },
  ];

  const slidesContent = [
    {
      theme: 'dark',
      kicker: 'Levitate Labs',
      title: 'Business Offering Pitch Deck',
      subtitle: 'Audit-based: compiled from the codebase, generated routes, documented automations, and live onboarding pricing.',
      body: `
        <div class="hero-grid">
          <div class="cover-main">
            <div>
              <h1 class="cover-title">One platform for SMB execution: services, LevitateOS, research, legal recovery, and automation.</h1>
              <div class="cover-copy">
                Generated from the live codebase and current onboarding data to present a credible, sellable picture of everything Levitate provides to businesses (and what still needs tightening).
              </div>
            </div>
            <div class="metric-grid">
              ${renderMetric('Public services', String(services.length), '20 service lines across 4 commercial categories.')}
              ${renderMetric('Live plans', String(commercial.plans.length), 'Starter, Growth, Scale, and Enterprise tiers.')}
              ${renderMetric('Business modules', String(portalFeatures.length), 'Plan-gated LevitateOS features for paying businesses.')}
              ${renderMetric('Netlify automations', String(netlifyFunctions.length), 'Scheduled and background operational agents.')}
            </div>
          </div>
          <div class="cover-side">
            <div class="info-card panel">
              <div class="info-label">Generated</div>
              <div class="info-value">${escapeHtml(formatDateLong(generatedAt))}</div>
            </div>
            <div class="info-card panel">
              <div class="info-label">Repository basis</div>
              <div class="info-value">LEVITATE-main</div>
            </div>
            <div class="info-card panel">
              <div class="info-label">Starter monthly price</div>
              <div class="info-value">${escapeHtml(formatInr(starterMonthlyLive))}</div>
            </div>
            <div class="info-card panel">
              <div class="info-label">Primary outcome</div>
              <div class="info-value">Structured pitch-deck PDF with fixed page layout</div>
            </div>
          </div>
        </div>
      `,
      footer: 'Audit basis: local repository + current onboarding data + generated route and automation docs.',
    },
    {
      theme: 'light',
      kicker: 'The Problem',
      title: 'SMBs are forced to run growth, operations, and compliance across disconnected tools and vendors.',
      subtitle: 'When execution is fragmented, work becomes slower, harder to govern, and harder to repeat.',
      body: `
        <div class="two-col" style="flex: 1;">
          <div class="thesis-card panel emphasize">
            <h3>What breaks in the real world</h3>
            <p>Tool sprawl plus vendor handoffs create gaps in ownership, continuity, and measurable outcomes.</p>
            <div class="thesis-list">
              <div class="thesis-item">Delivery is one-off; learnings do not become reusable systems.</div>
              <div class="thesis-item">Leads and outreach split across inboxes, sheets, CRMs, and DMs.</div>
              <div class="thesis-item">Research becomes static PDFs instead of an operating memory.</div>
              <div class="thesis-item">Delayed payments escalate; recovery steps are unclear and slow.</div>
            </div>
          </div>
          <div class="thesis-card panel">
            <h3>What businesses ask for instead</h3>
            <p>A single operating surface that connects acquisition, delivery, reporting, and governance.</p>
            <div class="thesis-list">
              <div class="thesis-item">CRM + lead ops + mailbox visibility for continuity.</div>
              <div class="thesis-item">Automations that are visible, quota-controlled, and reportable.</div>
              <div class="thesis-item">Exportable research and legal documents (PDF/DOCX/share links).</div>
              <div class="thesis-item">Transparent pricing + plan-gated capability rollout.</div>
            </div>
          </div>
        </div>
      `,
      footer: 'Framing: this slide ties to what already exists in the codebase (portal, research, legal, automations).',
    },
    {
      theme: 'warm',
      kicker: 'Market Context (India)',
      title: 'India’s MSME base is massive, and it runs on execution speed.',
      subtitle: 'Official publications highlight the scale of the opportunity and the need for practical operating systems.',
      body: `
        <div class="metric-grid">
          ${renderMetric('Estimated MSMEs', '6.34 crore', '633.88 lakh enterprises (NSS 73rd round estimate, cited in MSME Annual Report 2023-24).')}
          ${renderMetric('Jobs supported', '11.10 crore', '1109.89 lakh employment (same NSS estimate).')}
          ${renderMetric('Export share', '45.73%', 'MSME share of India’s exports in 2023-24 (PIB).')}
          ${renderMetric('GVA share', '30.1%', 'MSME GVA share in GDP for 2022-23 (PIB).')}
        </div>
        <div class="three-col" style="margin-top: 14px;">
          <div class="stat-panel panel emphasize">
            ${renderBadge('Enterprise mix', 'emerald')}
            <h4 style="margin-top: 12px;">31% manufacturing</h4>
            <p>Share of MSME enterprises by activity (NSS estimate cited in MSME Annual Report 2023-24).</p>
          </div>
          <div class="stat-panel panel">
            <h4>36% trade</h4>
            <p>MSME enterprises are heavily represented in trading businesses, where operational discipline matters.</p>
          </div>
          <div class="stat-panel panel">
            <h4>33% other services</h4>
            <p>Services MSMEs need repeatable systems to convert leads, deliver, and collect reliably.</p>
          </div>
        </div>
      `,
      footer: 'Sources: MSME Annual Report 2023-24 (NSS 73rd round 2015-16); PIB press release 23 Dec 2024.',
    },
    {
      theme: 'light',
      kicker: 'Payment Delays',
      title: 'Delayed payments are a measurable, system-level MSME pain point.',
      subtitle: 'This is why LevitateOS includes a legal recovery workspace, not just sales dashboards.',
      body: `
        <div class="metric-grid">
          ${renderMetric('Samadhaan applications', '1.82 lakh', 'Applications filed from 30.10.2017 to 31.03.2024.')}
          ${renderMetric('Claim amount', '₹42,131 Cr', 'Amount filed: ₹42,130.89 crore (as of 31.03.2024).')}
          ${renderMetric('Disposed by MSEFC', '35,398', 'Disposed amount: ₹10,171.49 crore (as of 31.03.2024).')}
          ${renderMetric('Mutual settlements', '16,968', 'Settled amount: ₹2,205.29 crore (as of 31.03.2024).')}
        </div>
        <div class="two-col" style="margin-top: 14px;">
          <div class="thesis-card panel emphasize">
            <h3>Legal framework signal</h3>
            <p>Official guidance notes that payment beyond 45 days is treated as a delayed payment for MSME suppliers and disputes can be referred to facilitation councils.</p>
          </div>
          <div class="thesis-card panel">
            <h3>Product consequence</h3>
            <p>LevitateOS already implements structured legal intake, notice drafting, editable previews, exports, and route guidance for recovery paths.</p>
          </div>
        </div>
      `,
      footer: 'Source: MSME Annual Report 2023-24 (MSME Samadhaan stats as of 31.03.2024).',
    },
    {
      theme: 'light',
      kicker: 'Sources',
      title: 'External research sources used in this deck',
      subtitle: 'Official references for India MSME scale and delayed-payment context.',
      body: `
        <div class="two-col" style="flex: 1;">
          <div class="thesis-card panel emphasize">
            <h3>Ministry of MSME — Annual Report 2023-24</h3>
            <p>Used for MSME counts, employment, enterprise mix, and MSME Samadhaan payment-delay statistics.</p>
            <div class="thesis-list">
              <div class="thesis-item">NSS 73rd round enterprise & employment estimates (2015-16)</div>
              <div class="thesis-item">MSME Samadhaan applications, settlements, conversions, and disposals (as of 31.03.2024)</div>
              <div class="thesis-item">Delayed payment framing (beyond 45 days)</div>
            </div>
          </div>
          <div class="thesis-card panel">
            <h3>Press Information Bureau (PIB) — 23 Dec 2024</h3>
            <p>Used for MSME export share and MSME GVA share of GDP, plus export trend figures.</p>
            <div class="thesis-list">
              <div class="thesis-item">MSME export share (2023-24)</div>
              <div class="thesis-item">MSME GVA share in GDP (2022-23)</div>
              <div class="thesis-item">Export value and exporter count trend (FY21 to FY25)</div>
            </div>
          </div>
        </div>
      `,
      footer: 'All other capability counts are generated from this repository (services, portal, routes, automations, DB metadata).',
    },
    {
      theme: 'light',
      kicker: 'Solution Overview',
      title: 'Levitate bundles services, LevitateOS, and an internal delivery engine into one commercial system.',
      subtitle: 'This is an execution stack: public services + a subscriber workspace + operational automation that makes delivery repeatable.',
      body: `
        <div class="metric-grid">
          ${renderMetric('API handlers', String(routes.apiRoutes.length), `${adminApiRoutes.length} admin, ${businessApiRoutes.length} business, ${onboardingApiRoutes.length} onboarding, ${webhookRoutes.length} webhooks.`)}
          ${renderMetric('Business UI routes', String(businessPages.length), 'Subscriber-facing workspace routes under /business/*.')}
          ${renderMetric('Research modules', String(researchModules.length), 'Saved, shareable intelligence modules per report run.')}
          ${renderMetric('Database tables', String(uniqueTables.length), 'Distinct tables identified in generated DB metadata.')}
        </div>
        <div class="three-col" style="margin-top: 14px;">
          <div class="thesis-card panel">
            <h3>1. Public service catalog</h3>
            <p>20 billable service pages span web development, mechanical engineering, growth marketing, and creative execution.</p>
            <div class="thesis-list">
              <div class="thesis-item">Broad offer mix: custom builds, CAD, SEO, automation, brand, and content work.</div>
              <div class="thesis-item">Commercial models include fixed, starting, hourly, per-report, monthly, per-page, per-deck, and per-minute pricing.</div>
            </div>
          </div>
          <div class="thesis-card panel">
            <h3>2. LevitateOS subscription</h3>
            <p>The business portal is a productized workspace with CRM, lead ops, automation visibility, mailbox, research, legal, and reporting capabilities.</p>
            <div class="thesis-list">
              <div class="thesis-item">4 live plans in Supabase pricing data.</div>
              <div class="thesis-item">8 formal feature-control keys define plan-aware access.</div>
            </div>
          </div>
          <div class="thesis-card panel">
            <h3>3. Delivery and growth engine</h3>
            <p>The admin and automation layer covers lead generation, outreach, proposals, payments, onboarding, reporting, retention, and revenue oversight.</p>
            <div class="thesis-list">
              <div class="thesis-item">14 Netlify automations currently documented.</div>
              <div class="thesis-item">Admin routes include campaigns, scout, social drafts, revenue, files, logs, and blog tooling.</div>
            </div>
          </div>
        </div>
      `,
      footer: 'Positioning: a product-plus-services execution stack for Indian SMBs.',
    },
    {
      theme: 'dark',
      kicker: 'Positioning',
      title: 'Levitate replaces a fragmented stack with one operating system plus an execution studio.',
      subtitle: 'Most SMBs buy tools and still need people to run them. Levitate sells the system and the delivery layer together.',
      body: `
        <div class="two-col" style="flex: 1;">
          <div class="thesis-card panel">
            <h3>Typical SMB stack</h3>
            <p>Multiple vendors, multiple logins, inconsistent handoffs, and weak operating memory.</p>
            <div class="thesis-list">
              <div class="thesis-item">Website / landing pages vendor</div>
              <div class="thesis-item">CRM and pipeline tool</div>
              <div class="thesis-item">Automation / integrations tool</div>
              <div class="thesis-item">Ads + creative + content contractors</div>
              <div class="thesis-item">Research consultant / agency reports</div>
              <div class="thesis-item">Lawyer for recovery notices</div>
            </div>
          </div>
          <div class="thesis-card panel emphasize">
            <h3>Levitate bundle</h3>
            <p>One workspace, one data model, and deliverables that can be exported and shared.</p>
            <div class="thesis-list">
              <div class="thesis-item">20-service execution catalog (web, mechanical, growth, creative)</div>
              <div class="thesis-item">LevitateOS portal (CRM, leads, automations, mailbox, research, legal, reporting)</div>
              <div class="thesis-item">Research engine with saved reports and quotas</div>
              <div class="thesis-item">Legal recovery workspace with route guidance and exports</div>
              <div class="thesis-item">Automations + admin ops for acquisition, conversion, and retention</div>
            </div>
          </div>
        </div>
      `,
      footer: 'Composition derived from the public catalog, portal feature map, documented automations, and integrations present in this repo.',
    },
    {
      theme: 'dark',
      kicker: 'Appendix',
      title: 'Product inventory and audit evidence',
      subtitle: 'The next slides enumerate the current offer, the portal surface, the automation stack, and the most important commercial inconsistencies found.',
      body: `
        <div class="three-col" style="flex: 1;">
          <div class="thesis-card panel emphasize">
            <h3>Offer</h3>
            <p>Full service catalog breakdown with price bands, timelines, and feature depth.</p>
            <div class="thesis-list">
              <div class="thesis-item">Web Development (5)</div>
              <div class="thesis-item">Mechanical Engineering (5)</div>
              <div class="thesis-item">Growth (5)</div>
              <div class="thesis-item">Creative (5)</div>
            </div>
          </div>
          <div class="thesis-card panel">
            <h3>Product</h3>
            <p>Subscriber workspace modules, research modules, legal tooling, and plan-gated controls.</p>
            <div class="thesis-list">
              <div class="thesis-item">${portalFeatures.length} portal modules (plan-aware)</div>
              <div class="thesis-item">${researchModules.length} research modules</div>
              <div class="thesis-item">${delayedPaymentOptions.length} recovery routes</div>
            </div>
          </div>
          <div class="thesis-card panel">
            <h3>Operations</h3>
            <p>Automation + admin surfaces that make delivery repeatable and measurable.</p>
            <div class="thesis-list">
              <div class="thesis-item">${routes.apiRoutes.length} API handlers</div>
              <div class="thesis-item">${netlifyFunctions.length} documented Netlify automations</div>
              <div class="thesis-item">${uniqueTables.length} distinct DB tables in generated metadata</div>
            </div>
          </div>
        </div>
      `,
      footer: 'All counts are generated from this repository at build time for this deck.',
    },
    {
      theme: 'warm',
      kicker: 'Commercial Universe',
      title: 'What a business can buy from Levitate today.',
      subtitle: 'The public catalog is balanced at 5 services per category, but the homepage currently surfaces only part of the full offer.',
      body: `
        <div class="three-col">
          <div class="thesis-card panel emphasize">
            <h3>Catalog balance</h3>
            <p>The detailed service catalog contains 20 offerings split evenly across 4 categories: web, mechanical, growth, and creative.</p>
            <div class="thesis-list">
              <div class="thesis-item">5 web services</div>
              <div class="thesis-item">5 mechanical services</div>
              <div class="thesis-item">5 growth services</div>
              <div class="thesis-item">5 creative services</div>
            </div>
          </div>
          <div class="thesis-card panel">
            <h3>Homepage exposure gap</h3>
            <p>Only ${homepageCoverage} services are surfaced in the homepage services component, leaving ${services.length - homepageCoverage} detailed service pages without equivalent top-level homepage promotion.</p>
            <div class="thesis-list">
              <div class="thesis-item">Potential discovery loss for lower-visibility services.</div>
              <div class="thesis-item">Commercial messaging feels narrower than the actual catalog.</div>
            </div>
          </div>
          <div class="thesis-card panel">
            <h3>Pricing communication risk</h3>
            <p>${homepageMismatches.length} homepage teaser prices currently diverge from their detailed service-page prices, especially in creative services.</p>
            <div class="thesis-list">
              <div class="thesis-item">Graphic Design: teaser above detail page.</div>
              <div class="thesis-item">Brand Identity: teaser above detail page.</div>
              <div class="thesis-item">Video Editing: teaser above detail page.</div>
            </div>
          </div>
        </div>
        <div class="admin-strip" style="margin-top: 18px;">
          ${['Public marketing site', '20 detailed service pages', 'Onboarding funnel', 'Subscriber dashboard', 'Admin ops dashboard', 'Automated outreach + payment stack'].map((item) => `<div class="admin-pill">${escapeHtml(item)}</div>`).join('')}
        </div>
      `,
      footer: 'Source anchors: src/data/services.ts and src/components/sections/Services.tsx.',
    },
    {
      theme: 'light',
      kicker: 'Category 01',
      title: 'Web and product services',
      subtitle: 'Levitate’s web offer spans fast brochure builds through SaaS MVP delivery and commerce systems.',
      body: renderServiceSlide(
        'Web Development',
        'This category is the clearest bridge between one-off agency work and the longer-term LevitateOS subscription story.',
        servicesByCategory.web ?? [],
        'light'
      ),
      footer: 'Detailed service sources: static development, full stack app, CMS integration, ecommerce, SaaS MVP.',
    },
    {
      theme: 'warm',
      kicker: 'Category 02',
      title: 'Mechanical engineering services',
      subtitle: 'The codebase’s public offer is not purely software. It also sells CAD, drafting, rendering, simulation, and print-prep work.',
      body: renderServiceSlide(
        'Mechanical Engineering',
        'This is a differentiator in positioning: Levitate is not framed as a narrow SaaS shop and can speak to product and manufacturing workflows.',
        servicesByCategory.mechanical ?? [],
        'warm'
      ),
      footer: 'Detailed service sources: 2D drafting, 3D modeling, rendering, FEA simulation, STL preparation.',
    },
    {
      theme: 'light',
      kicker: 'Category 03',
      title: 'Growth and acquisition services',
      subtitle: 'Growth work connects directly to the internal automation and admin systems already present in the repo.',
      body: renderServiceSlide(
        'Growth',
        'These services are the strongest overlap between the public catalog and the productized operational tooling in LevitateOS.',
        servicesByCategory.growth ?? [],
        'light'
      ),
      footer: 'Detailed service sources: technical SEO, marketing automation, ads setup, social management, market research.',
    },
    {
      theme: 'warm',
      kicker: 'Category 04',
      title: 'Creative and brand services',
      subtitle: 'Creative services extend the offer into presentation, narrative, and content delivery layers that support client acquisition and investor-facing work.',
      body: renderServiceSlide(
        'Creative',
        'This category is commercially useful but currently carries the strongest teaser-price vs detail-price mismatches on the homepage.',
        servicesByCategory.creative ?? [],
        'warm'
      ),
      footer: 'Detailed service sources: graphic design, logo identity, copywriting, pitch decks, video editing.',
    },
    {
      theme: 'dark',
      kicker: 'LevitateOS Pricing',
      title: 'The subscription product is now commercially real, not test-priced.',
      subtitle: 'Live pricing was pulled from Supabase after the starter fix. The operational story is a business operating system rollout, not just a generic dashboard seat.',
      body: `
        <div class="plan-grid">
          ${renderPlanCards(commercial.plans)}
        </div>
        <div class="three-col" style="margin-top: 14px;">
          <div class="stat-panel panel">
            <h4>Starter fixed</h4>
            <p>Live starter monthly pricing now reads ${formatInr(starterMonthlyLive)}, and the old ${formatInr(1)} test amount is no longer attached to future monthly checkout creation.</p>
          </div>
          <div class="stat-panel panel">
            <h4>Product promise</h4>
            <p>The commercial story is CRM + lead ops + automation + research/legal tooling + branded workspace rollout.</p>
          </div>
          <div class="stat-panel panel">
            <h4>Commercial gap</h4>
            <p>Setup fees are configured in plan data but still not applied in the live checkout amount calculation.</p>
          </div>
        </div>
      `,
      footer: 'Live commercial source: onboarding_plans table plus checkout logic in src/app/api/onboard/checkout/route.ts.',
    },
    {
      theme: 'light',
      kicker: 'Workspace Surface',
      title: 'What paying businesses get inside the portal today',
      subtitle: 'The active sidebar and feature-control map define the current product footprint for subscribers.',
      body: `
        <div class="feature-grid">
          ${renderFeatureCards(portalFeatures)}
        </div>
        <div class="three-col" style="margin-top: 14px;">
          <div class="thesis-card panel">
            <h3>Business identity</h3>
            <p>Each paying business receives a branded workspace route and account-linked access rather than a generic admin login.</p>
          </div>
          <div class="thesis-card panel">
            <h3>Plan-aware control</h3>
            <p>The product already has a formal feature-access map, so commercial packaging can evolve without redesigning the whole workspace.</p>
          </div>
          <div class="thesis-card panel">
            <h3>Shared outputs</h3>
            <p>Reports and legal documents are not trapped inside the dashboard; they can be exported and shared through read-only links.</p>
          </div>
        </div>
      `,
      footer: 'Sidebar source: src/components/business/BusinessSidebar.tsx.',
    },
    {
      theme: 'warm',
      kicker: 'Research Engine',
      title: 'LevitateOS includes a genuine multi-module market-intelligence product.',
      subtitle: 'This is not a single prompt box. The report system stores business context, lets the user choose modules, tracks quota, saves outputs, and supports export/share flows.',
      body: `
        <div class="module-layout">
          <div class="module-groups">
            ${researchGroups.map((group) => renderModuleGroup(group.title, group.modules)).join('')}
          </div>
          <div class="stat-stack">
            <div class="stat-panel panel emphasize">
              ${renderBadge('Quota controlled', 'emerald')}
              <h4 style="margin-top: 12px;">${escapeHtml(String(businessIntelligenceModule.RESEARCH_DAILY_LIMIT ?? 5))} full report runs per day</h4>
              <p>The backend enforces a daily quota, which means the feature is designed as a governed subscriber resource rather than an unlimited free-form demo tool.</p>
            </div>
            <div class="stat-panel panel">
              <h4>Delivery shape and commercial use</h4>
              <p>Saved reports, share links, PDF/DOCX export, retry logic, and business-context persistence make this sellable as research, pricing, GTM, competitor, and strategy support for SMBs.</p>
            </div>
          </div>
        </div>
      `,
      footer: 'Primary sources: src/lib/business-intelligence.ts, ResearchWorkspace.tsx, ResearchReportView.tsx.',
    },
    {
      theme: 'light',
      kicker: 'Legal Product',
      title: 'The legal workspace is a real recovery tool for Indian business payment disputes.',
      subtitle: 'It combines structured intake, AI-assisted notice drafting, editable paper-style preview, export flows, and a route advisor grounded in Indian commercial recovery paths.',
      body: `
        <div class="legal-layout">
          <div class="process-stack">
            ${[
              ['01', 'Structured intake', 'Collects sender, recipient, contract, breach, amount, default period, and prior communication context before drafting.'],
              ['02', 'Draft generation', 'Creates a formal legal notice draft instead of forcing the business user into a blank-page workflow.'],
              ['03', 'Editable preview', 'The notice is presented section by section for direct refinement in a paper-style layout.'],
              ['04', 'Export and share', 'Supports copy, DOCX, PDF, and read-only backlink sharing for external circulation.'],
            ]
              .map(
                ([step, title, copy]) => `
                  <div class="process-card panel">
                    <div class="process-step">${step}</div>
                    <div class="process-title">${escapeHtml(title)}</div>
                    <div class="process-copy">${escapeHtml(copy)}</div>
                  </div>
                `
              )
              .join('')}
          </div>
          <div class="legal-routes-grid">
            ${renderLegalRouteCards(delayedPaymentOptions)}
          </div>
        </div>
      `,
      footer: 'Primary sources: LegalToolsWorkspace.tsx and business-intelligence delayed payment options.',
    },
    {
      theme: 'dark',
      kicker: 'Ops and Automation',
      title: 'The repo already contains an operator-grade internal system for acquisition, conversion, and retention.',
      subtitle: 'This matters because it defines what Levitate can deliver repeatedly, not just what the marketing copy claims.',
      body: `
        <div class="automation-grid">
          ${automationGroups.map((group) => renderAutomationColumn(group.title, group.note, group.items)).join('')}
        </div>
        <div class="thesis-card panel" style="margin-top: 14px;">
          <h3>Admin control rooms already exist</h3>
          <p>The admin dashboard already covers the major operator surfaces needed to manage growth, delivery, revenue, and subscriber setup from one internal console.</p>
          <div class="admin-strip">
            ${['Campaigns', 'Scout', 'Social', 'Mailbox', 'Revenue', 'Files', 'Team', 'Projects', 'Blogs', 'Plans', 'Coupons', 'Logs'].map((item) => `<div class="admin-pill">${escapeHtml(item)}</div>`).join('')}
          </div>
        </div>
      `,
      footer: 'Automation evidence: docs/04-Netlify-Automations.md and docs/netlify-functions.generated.json.',
    },
    {
      theme: 'warm',
      kicker: 'Architecture',
      title: 'Platform architecture and external integrations already support a product-plus-services business.',
      subtitle: 'The technical base is not experimental anymore. It includes the ingredients for onboarding, payments, storage, AI execution, communication, exports, and operational analytics.',
      body: `
        <div class="integration-grid">
          ${[
            ['Supabase', 'Authentication, database, storage, RLS, onboarding persistence, report storage, legal records, and business profile state.'],
            ['Razorpay', 'Subscription checkout, payment links, signature verification, webhook activation, and revenue event handling.'],
            ['WhatsApp', 'Client communication layer with templates, queueing, and webhook support.'],
            ['SMTP + IMAP', 'Email automation, sending, and inbox synchronization for mailbox visibility.'],
            ['AI providers', 'Groq, Gemini, HuggingFace, Google direct, Kaggle, and OpenRouter paths all exist in code.'],
            ['PDF + DOCX', 'Proposal, research report, and legal notice exports make the system deliverable-focused.'],
            ['Netlify + GitHub', 'Scheduled ops, background functions, deployment workflows, and coding/delivery automation.'],
            ['Public web data', 'Maps, scraping, LinkedIn, search, and enrichment logic support the growth and research story.'],
          ].map(([title, body]) => renderIntegrationCard(title, body)).join('')}
        </div>
        <div class="metric-grid" style="margin-top: 14px;">
          ${renderMetric('Total files', String(inventory.total_files ?? 0), 'Tracked in codebase_inventory.json.')}
          ${renderMetric('Business routes', String(businessPages.length), 'Subscriber-facing pages under /business/*.')}
          ${renderMetric('Admin APIs', String(adminApiRoutes.length), 'Operational APIs behind the internal dashboard.')}
          ${renderMetric('Webhook routes', String(webhookRoutes.length), 'GitHub, Razorpay, and WhatsApp callback surfaces.')}
        </div>
      `,
      footer: 'Primary technical anchors: package.json, generated API docs, automation docs, payment helpers, and Supabase integrations.',
    },
    {
      theme: 'light',
      kicker: 'Audit Findings',
      title: 'What was fixed, what is still risky, and what is commercially inconsistent',
      subtitle: 'These are the highest-signal findings from the audit, with one corrective action already executed in live pricing data.',
      body: `
        <div class="finding-grid">
          ${findings.map((finding) => renderFindingCard(finding.tone, finding.title, finding.body, finding.evidence)).join('')}
        </div>
      `,
      footer: 'Priority sequence: 1) legacy test-price subscription cleanup, 2) public pricing alignment, 3) setup-fee decision.',
    },
    {
      theme: 'dark',
      kicker: 'Recommended Next Actions',
      title: 'What to do next after this audit',
      subtitle: 'The pricing issue is fixed for new starter checkouts. The next moves are about commercial clarity, operational cleanup, and tighter product packaging.',
      body: `
        <div class="action-grid">
          ${[
            ['1', 'Clean up legacy test-price subscriptions', 'Use live Razorpay credentials to cancel or migrate the old starter test subscriptions that still exist as database records.'],
            ['2', 'Align public pricing everywhere', 'Bring homepage teaser prices and service exposure in line with the detailed service catalog so discovery messaging matches reality.'],
            ['3', 'Decide the setup-fee policy', 'Either bill setup fees explicitly in checkout or remove them from admin pricing so the commercial model is honest and simple.'],
            ['4', 'Tighten the product narrative', 'Unify business vs company naming and present LevitateOS consistently as a business operating system for Indian SMB execution.'],
          ].map(([index, title, body]) => renderActionCard(index, title, body)).join('')}
        </div>
        <div class="two-col" style="margin-top: 14px;">
          <div class="path-box panel emphasize">
            <div class="path-title">Final deliverables saved</div>
            <div class="path-list">
              <div class="path-item"><code class="inline">docs/levitate-business-pitch-deck.pdf</code></div>
              <div class="path-item"><code class="inline">docs/levitate-business-pitch-deck.html</code></div>
              <div class="path-item"><code class="inline">scripts/generate-business-pitch-deck.mjs</code></div>
            </div>
          </div>
          <div class="path-box panel">
            <div class="path-title">Pricing status at close</div>
            <div class="path-list">
              <div class="path-item">Starter monthly plan in live Supabase: <strong>${escapeHtml(formatInr(starterMonthlyLive))}</strong></div>
              <div class="path-item">Annual starter plan remains: <strong>${escapeHtml(formatInr(starterAnnualLive))}</strong></div>
              <div class="path-item">Monthly Razorpay plan ID for starter: <strong>cleared for regeneration</strong></div>
            </div>
          </div>
        </div>
      `,
      footer: `Generated on ${formatDateLong(generatedAt)} from the local repository and current onboarding data.`,
    },
  ];

  const totalSlides = slidesContent.length;
  const slides = slidesContent.map((slide, index) =>
    wrapSlide(index + 1, totalSlides, slide.theme, slide.kicker, slide.title, slide.subtitle, slide.body, slide.footer)
  );

  const html = buildHtml({ slides, generatedAt: formatDateLong(generatedAt) });
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
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');
    await page.pdf({
      path: pdfOutputPath,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    if (shouldRenderPreviews) {
      fs.mkdirSync(previewDir, { recursive: true });
      const slideElements = await page.$$('.slide');
      for (let index = 0; index < slideElements.length; index += 1) {
        const slideNumber = String(index + 1).padStart(2, '0');
        const outputPath = path.join(previewDir, `slide-${slideNumber}.png`);
        await slideElements[index].screenshot({ path: outputPath });
      }
    }
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({
    html: path.relative(rootDir, htmlOutputPath).replace(/\\/g, '/'),
    pdf: path.relative(rootDir, pdfOutputPath).replace(/\\/g, '/'),
    slides: totalSlides,
    previews: shouldRenderPreviews ? path.relative(rootDir, previewDir).replace(/\\/g, '/') : null,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
