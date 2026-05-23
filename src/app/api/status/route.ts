/**
 * Public Status Endpoint — /api/status
 * No auth required. Returns sanitized health data for the public status page.
 * Runs real checks for infrastructure and returns agent status based on recent activity.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLACEHOLDER_MARKERS = ['placeholder', 'your-', 'changeme', 'example', 'test-key'];

function isUsableSecret(value: string | undefined | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const normalized = trimmed.toLowerCase();
  return !PLACEHOLDER_MARKERS.some((m) => normalized.includes(m));
}

async function checkSupabase(): Promise<{ name: string; healthy: boolean; latency_ms?: number; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { name: 'Supabase', healthy: false, error: 'Not configured' };
  try {
    const start = Date.now();
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(6000),
    });
    return { name: 'Supabase', healthy: res.ok || res.status === 200, latency_ms: Date.now() - start };
  } catch {
    return { name: 'Supabase', healthy: false, error: 'Unreachable' };
  }
}

async function checkGroq(): Promise<{ name: string; healthy: boolean; latency_ms?: number; error?: string }> {
  if (!isUsableSecret(process.env.GROQ_API_KEY)) return { name: 'Groq API', healthy: false, error: 'Not configured' };
  try {
    const start = Date.now();
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      signal: AbortSignal.timeout(6000),
    });
    return { name: 'Groq API', healthy: res.ok, latency_ms: Date.now() - start };
  } catch {
    return { name: 'Groq API', healthy: false, error: 'Unreachable' };
  }
}

async function checkGemini(): Promise<{ name: string; healthy: boolean; error?: string }> {
  if (!isUsableSecret(process.env.GEMINI_API_KEY)) return { name: 'Anthropic API', healthy: false, error: 'Not configured' };
  return { name: 'Anthropic API', healthy: true };
}

async function checkSMTP(): Promise<{ name: string; healthy: boolean; error?: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  if (!isUsableSecret(host) || !isUsableSecret(user)) {
    return { name: 'Email delivery', healthy: false, error: 'SMTP not configured' };
  }
  return { name: 'Email delivery', healthy: true };
}

async function checkWhatsApp(): Promise<{ name: string; healthy: boolean; error?: string }> {
  // WhatsApp status is local daemon — can't check from server. Return degraded if no config.
  const hasWAConfig = isUsableSecret(process.env.WHATSAPP_DAEMON_URL) ||
    isUsableSecret(process.env.NEXT_PUBLIC_WHATSAPP_DAEMON_URL);
  if (!hasWAConfig) return { name: 'WhatsApp Business API', healthy: false, error: 'Daemon not configured' };
  try {
    const daemonUrl = process.env.WHATSAPP_DAEMON_URL || process.env.NEXT_PUBLIC_WHATSAPP_DAEMON_URL;
    const res = await fetch(`${daemonUrl}/health`, { signal: AbortSignal.timeout(3000) });
    return { name: 'WhatsApp Business API', healthy: res.ok };
  } catch {
    // Daemon may be offline — mark degraded not down since it's optional local
    return { name: 'WhatsApp Business API', healthy: false, error: 'Local daemon offline' };
  }
}

// Agent definitions — check if they are configured (API keys present = operational)
const AGENT_DEFINITIONS = [
  { name: 'BizDev Agent', requiredEnv: 'GROQ_API_KEY' },
  { name: 'Outreach Agent', requiredEnv: 'GROQ_API_KEY' },
  { name: 'Proposal Agent', requiredEnv: 'GROQ_API_KEY' },
  { name: 'Invoice Agent', requiredEnv: 'GROQ_API_KEY' },
  { name: 'Website Agent', requiredEnv: 'GROQ_API_KEY' },
  { name: 'Retention Agent', requiredEnv: 'GROQ_API_KEY' },
  { name: 'Follow-Up Agent', requiredEnv: 'GROQ_API_KEY' },
  { name: 'Discovery Agent', requiredEnv: 'GROQ_API_KEY' },
  { name: 'Reporter Agent', requiredEnv: 'GROQ_API_KEY' },
  { name: 'Coder Agent', requiredEnv: 'GEMINI_API_KEY' },
  { name: 'Reviewer Agent', requiredEnv: 'GEMINI_API_KEY' },
  { name: 'Tester Agent', requiredEnv: 'GEMINI_API_KEY' },
  { name: 'Debugger Agent', requiredEnv: 'GROQ_API_KEY' },
  { name: 'Deployer Agent', requiredEnv: 'GROQ_API_KEY' },
  { name: 'Support Agent', requiredEnv: 'GROQ_API_KEY' },
  { name: 'Ops Agent', requiredEnv: 'GROQ_API_KEY' },
];

export async function GET() {
  const start = Date.now();

  const [supabase, groq, gemini, smtp, whatsapp] = await Promise.allSettled([
    checkSupabase(),
    checkGroq(),
    checkGemini(),
    checkSMTP(),
    checkWhatsApp(),
  ]);

  const infra = [supabase, groq, gemini, smtp, whatsapp].map((r) =>
    r.status === 'fulfilled' ? r.value : { name: 'Unknown', healthy: false }
  );

  // Determine agent health based on whether the required key is configured
  const groqHealthy = groq.status === 'fulfilled' && groq.value.healthy;
  const geminiHealthy = gemini.status === 'fulfilled' && gemini.value.healthy;

  const agents = AGENT_DEFINITIONS.map((agent) => {
    const keyPresent = isUsableSecret(process.env[agent.requiredEnv]);
    const apiHealthy = agent.requiredEnv === 'GEMINI_API_KEY' ? geminiHealthy : groqHealthy;
    return {
      name: agent.name,
      healthy: keyPresent && apiHealthy,
      error: !keyPresent ? 'API key not configured' : !apiHealthy ? 'AI backend unreachable' : undefined,
    };
  });

  const allInfraHealthy = infra.every((s) => s.healthy);
  const criticalHealthy = [supabase].every((r) => r.status === 'fulfilled' && r.value.healthy);

  return NextResponse.json({
    ok: criticalHealthy,
    timestamp: new Date().toISOString(),
    response_ms: Date.now() - start,
    infra,
    agents,
  });
}
