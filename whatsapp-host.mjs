import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcodeTerminal from 'qrcode-terminal';
import qrcode from 'qrcode';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'node:dns';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

// Multi-tenant: set COMPANY_ID env var for business instances.
// Leave unset for the admin/legacy instance (admin queue uses company_id IS NULL).
const COMPANY_ID = process.env.COMPANY_ID || null;
const NEXT_APP_URL = (process.env.NEXT_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const DAEMON_SECRET = process.env.DAEMON_SECRET || 'levitate-daemon-secret';

const customDnsServers = (process.env.WHATSAPP_DNS_SERVERS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

if (customDnsServers.length > 0) {
  dns.setServers(customDnsServers);
  console.log('[DNS] Using custom DNS servers:', customDnsServers.join(', '));
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseHost = (() => {
  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return '';
  }
})();

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.error('\nERROR: Supabase URL is still set to a placeholder value.');
  console.error('ACTION REQUIRED: Update .env.local or remove the placeholder values so .env can win.\n');
  process.exit(1);
}

if (!supabaseKey || supabaseKey.includes('placeholder')) {
  console.error('\nERROR: Supabase key is still missing or placeholder.');
  console.error('ACTION REQUIRED: Add the real service role key to your local .env file.\n');
  process.exit(1);
}

if (!supabaseHost) {
  console.error('\nERROR: NEXT_PUBLIC_SUPABASE_URL is invalid.\n');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

const supabaseRestBase = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
const supabaseRestHeaders = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Prefer: 'return=minimal'
};

// Queue filter: business = by company_id, admin = where company_id IS NULL
const queueFilter = COMPANY_ID
  ? `company_id=eq.${encodeURIComponent(COMPANY_ID)}`
  : 'company_id=is.null';

console.log(`Starting WhatsApp Daemon [${COMPANY_ID ? `company: ${COMPANY_ID}` : 'ADMIN'}]`);

// Anti-ban settings (all configurable via env vars)
const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT || '200', 10);
const MIN_DELAY_MS = parseInt(process.env.MIN_DELAY_MS || '45000', 10);
const MAX_DELAY_MS = parseInt(process.env.MAX_DELAY_MS || '90000', 10);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '15000', 10);
const PING_INTERVAL_MS = 30 * 1000;
const DNS_RECHECK_MS = 5 * 60 * 1000;

let sentToday = 0;
let lastResetDate = new Date().toDateString();
let currentQR = '';
let isReady = false;
let pollingStarted = false;
let pollIntervalHandle = null;
let pingIntervalHandle = null;
let isRestartingClient = false;
let lastDnsCheckAt = 0;
let publicDnsFallbackApplied = false;
let isProcessing = false;
let queuePausedUntil = 0;

function randomDelay() {
  const ms = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)) + MIN_DELAY_MS;
  console.log(`[Delay] Waiting ${Math.round(ms / 1000)}s before next message (anti-ban)`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resetDailyCounterIfNeeded() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    sentToday = 0;
    lastResetDate = today;
    console.log('[Clock] New day — daily counter reset to 0');
  }
}

async function supabaseRequest(path, options = {}, attempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${supabaseRestBase}${path}`, {
        ...options,
        signal: controller.signal,
        headers: { ...supabaseRestHeaders, ...(options.headers || {}) }
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 120)}` : ''}`);
      }
      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const causeCode = error?.cause?.code ?? null;
      if (causeCode === 'ENOTFOUND') {
        tryPublicDnsFallback();
        queuePausedUntil = Date.now() + 5 * 60 * 1000;
        console.error(`[Queue] Supabase DNS lookup failed (attempt ${attempt}/${attempts}):`, message);
      } else {
        console.error(`[Queue] Supabase request failed (attempt ${attempt}/${attempts}):`, message);
      }
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

// Upsert into company_whatsapp_config (only used when COMPANY_ID is set)
async function upsertCompanyConfig(patch) {
  if (!COMPANY_ID) return;
  try {
    await supabaseRequest(
      '/company_whatsapp_config',
      {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ company_id: COMPANY_ID, ...patch })
      }
    );
  } catch (e) {
    console.error('[Supabase] company_whatsapp_config upsert failed:', e.message);
  }
}

// Mirror a sent outbound message to company_whatsapp_messages
async function mirrorOutbound(toNumber, message, campaignId) {
  if (!COMPANY_ID) return;
  try {
    await supabaseRequest(
      '/company_whatsapp_messages',
      {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          company_id: COMPANY_ID,
          direction: 'outbound',
          to_number: toNumber,
          from_number: null,
          message: message,
          campaign_id: campaignId || null,
          status: 'sent',
          is_ai_response: false,
          created_at: new Date().toISOString()
        })
      }
    );
  } catch (e) {
    console.error('[Supabase] Failed to mirror outbound message:', e.message);
  }
}

// Forward inbound message to Next.js for AI processing
async function forwardInbound(from, body) {
  try {
    const res = await fetch(`${NEXT_APP_URL}/api/whatsapp/inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-daemon-secret': DAEMON_SECRET,
      },
      body: JSON.stringify({
        company_id: COMPANY_ID,
        from,
        body,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(30000)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[Inbound] Next.js returned error:', res.status, text.slice(0, 100));
    }
  } catch (e) {
    console.error('[Inbound] Failed to forward to Next.js:', e.message);
  }
}

async function verifySupabaseHost() {
  try {
    await dns.promises.lookup(supabaseHost);
    return true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Queue] Supabase host lookup failed for ${supabaseHost}: ${errMsg}`);
    return false;
  }
}

function tryPublicDnsFallback() {
  if (customDnsServers.length > 0 || publicDnsFallbackApplied) return;
  try {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
    publicDnsFallbackApplied = true;
    console.warn('[DNS] ENOTFOUND detected. Switched to public DNS fallback: 1.1.1.1, 8.8.8.8');
  } catch (error) {
    console.error('[DNS] Failed to apply public DNS fallback:', error.message);
  }
}

function isRecoverableClientError(message) {
  const v = message.toLowerCase();
  return (
    v.includes('detached frame') ||
    v.includes('execution context was destroyed') ||
    v.includes('target closed') ||
    v.includes('session closed') ||
    v.includes('protocol error')
  );
}

async function restartClientSession(reason) {
  if (isRestartingClient) return;
  isRestartingClient = true;
  isReady = false;
  pollingStarted = false;
  queuePausedUntil = Date.now() + 5 * 60 * 1000;
  console.error(`[Recover] Restarting WhatsApp client: ${reason}`);
  try { await client.destroy(); } catch { /* ignore */ }
  try {
    await client.initialize();
  } catch (error) {
    console.error('[Recover] Reinitialize failed:', error.message);
  } finally {
    isRestartingClient = false;
  }
}

function safeMessageText(text) {
  let clean = text;
  try {
    const parsed = JSON.parse(text);
    clean = parsed.body || parsed.message || JSON.stringify(parsed);
  } catch { /* plain text */ }
  clean = clean.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu, '');
  return clean.trim();
}

async function fetchPendingMessage() {
  const response = await supabaseRequest(
    `/whatsapp_queue?select=*&status=eq.pending&${queueFilter}&order=created_at.asc&limit=1`,
    { method: 'GET' }
  );
  const messages = await response.json().catch(() => []);
  return Array.isArray(messages) ? messages : [];
}

async function updateQueueRow(id, payload) {
  await supabaseRequest(
    `/whatsapp_queue?id=eq.${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(payload) }
  );
}

async function pollQueue() {
  if (!isReady || isProcessing) return;
  if (Date.now() < queuePausedUntil) return;

  if (Date.now() - lastDnsCheckAt > DNS_RECHECK_MS) {
    lastDnsCheckAt = Date.now();
    const dnsOk = await verifySupabaseHost();
    if (!dnsOk) {
      queuePausedUntil = Date.now() + 5 * 60 * 1000;
      return;
    }
  }

  isProcessing = true;
  resetDailyCounterIfNeeded();

  if (sentToday >= DAILY_LIMIT) {
    console.log(`[Limit] Daily limit reached (${sentToday}/${DAILY_LIMIT}). Resuming tomorrow.`);
    isProcessing = false;
    return;
  }

  try {
    const messages = await fetchPendingMessage();
    if (!messages || messages.length === 0) { isProcessing = false; return; }

    const msg = messages[0];
    let shouldDelay = true;

    try {
      let targetNumber = String(msg.to_number ?? '').replace(/[^0-9]/g, '');
      if (targetNumber.startsWith('0') && targetNumber.length === 11) targetNumber = targetNumber.slice(1);
      if (targetNumber.length === 10) targetNumber = '91' + targetNumber;

      if (targetNumber.length < 11) {
        console.warn(`[Skip] Invalid number ${msg.to_number}, marking failed`);
        await updateQueueRow(msg.id, { status: 'failed', error: 'Invalid phone number (too short)', updated_at: new Date().toISOString() });
        shouldDelay = false;
        return;
      }

      if (targetNumber.length > 15) {
        console.warn(`[Skip] Invalid number ${msg.to_number}, marking failed (too long)`);
        await updateQueueRow(msg.id, { status: 'failed', error: 'Invalid phone number (too long)', updated_at: new Date().toISOString() });
        shouldDelay = false;
        return;
      }

      const numberId = await client.getNumberId(targetNumber);
      if (!numberId) {
        console.warn(`[Skip] ${targetNumber} is not registered on WhatsApp`);
        await updateQueueRow(msg.id, { status: 'failed', error: 'Not on WhatsApp', updated_at: new Date().toISOString() });
        shouldDelay = false;
        return;
      }

      const cleanMessage = safeMessageText(msg.message);
      console.log(`[Send] [${sentToday + 1}/${DAILY_LIMIT}] To ${targetNumber}: "${cleanMessage.substring(0, 50)}..."`);
      await client.sendMessage(numberId._serialized, cleanMessage);

      await updateQueueRow(msg.id, { status: 'sent', updated_at: new Date().toISOString() });
      sentToday++;
      console.log(`[Sent] OK (${sentToday}/${DAILY_LIMIT} today)`);

      // Mirror to conversation history
      await mirrorOutbound(targetNumber, cleanMessage, msg.campaign_id);

    } catch (sendErr) {
      const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);

      if (isRecoverableClientError(errMsg)) {
        await restartClientSession(errMsg);
        console.warn(`[Queue] Keeping message ${msg.id} as pending. Will retry after reconnect.`);
        shouldDelay = false;
        return;
      }

      console.error(`[Error] Failed to send to ${msg.to_number}:`, errMsg);
      await updateQueueRow(msg.id, { status: 'failed', error: errMsg.substring(0, 200), updated_at: new Date().toISOString() });
    }

    if (shouldDelay) await randomDelay();
  } catch (e) {
    console.error('[Error] Fatal polling error:', e);
    queuePausedUntil = Date.now() + 2 * 60 * 1000;
    console.log('[Queue] Pausing for 2 minutes before retrying.');
  } finally {
    isProcessing = false;
  }
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: COMPANY_ID ? `company-${COMPANY_ID}` : 'admin' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--safebrowsing-disable-auto-update',
    ]
  }
});

async function clearLocalSession() {
  const clientId = COMPANY_ID ? `company-${COMPANY_ID}` : 'admin';
  const sessionPath = `.wwebjs_auth/session-${clientId}`;
  try {
    const { rm } = await import('node:fs/promises');
    await rm(sessionPath, { recursive: true, force: true });
    console.log('[Auth] Stale session cleared:', sessionPath);
  } catch (e) {
    console.warn('[Auth] Could not clear session directory:', e.message);
  }
}

client.on('loading_screen', (percent, message) => {
  console.log(`[Loading] ${percent}% — ${message}`);
});

client.on('qr', async (qr) => {
  try {
    currentQR = await qrcode.toDataURL(qr);
  } catch (e) {
    console.error('[QR] Failed to convert QR to data URL:', e.message);
    return;
  }
  console.log('\n=== SCAN QR CODE WITH WHATSAPP ===');
  console.log('WhatsApp → Linked Devices → Link a Device\n');
  qrcodeTerminal.generate(qr, { small: true });
  console.log('QR also available at: http://localhost:3005/api/qr\n');
  await upsertCompanyConfig({ qr_code: currentQR, daemon_last_ping: new Date().toISOString() });
});

client.on('auth_failure', async (msg) => {
  console.error('[Auth] Authentication failure:', msg);
  isReady = false;
  currentQR = '';
  console.log('[Auth] Clearing stale session — a fresh QR will be generated...');
  await clearLocalSession();
  await new Promise(resolve => setTimeout(resolve, 3000));
  if (!isRestartingClient) {
    isRestartingClient = true;
    try {
      await client.initialize();
    } catch (err) {
      console.error('[Auth] Re-init after auth failure failed:', err.message);
    } finally {
      isRestartingClient = false;
    }
  }
});

client.on('ready', async () => {
  console.log('WhatsApp Client is READY! Polling starts now.');
  isReady = true;
  pollingStarted = true;
  currentQR = '';

  // Get connected phone number
  let phoneNumber = null;
  try {
    const info = client.info;
    phoneNumber = info?.wid?.user || null;
  } catch { /* ignore */ }

  await upsertCompanyConfig({
    qr_code: null,
    whatsapp_number: phoneNumber,
    daemon_last_ping: new Date().toISOString(),
    connected: true
  });

  if (!pollIntervalHandle) {
    pollIntervalHandle = setInterval(pollQueue, POLL_INTERVAL_MS);
  }

  // Start ping interval for business daemons
  if (COMPANY_ID && !pingIntervalHandle) {
    pingIntervalHandle = setInterval(async () => {
      try {
        await upsertCompanyConfig({ daemon_last_ping: new Date().toISOString() });
      } catch { /* ignore ping failures */ }
    }, PING_INTERVAL_MS);
  }
});

client.on('disconnected', async (reason) => {
  console.log('WhatsApp Client Disconnected:', reason);
  isReady = false;
  pollingStarted = false;

  if (pingIntervalHandle) {
    clearInterval(pingIntervalHandle);
    pingIntervalHandle = null;
  }

  // Null out daemon_last_ping and clear connected flag so dashboard shows offline
  await upsertCompanyConfig({ daemon_last_ping: null, qr_code: null, connected: false });
});

// Inbound message handler — forwards to Next.js for AI processing
client.on('message', async (msg) => {
  if (msg.fromMe) return;
  const from = msg.from.replace('@c.us', '');
  const body = msg.body;
  console.log(`[Inbound] From ${from}: "${body.substring(0, 80)}"`);
  await forwardInbound(from, body);
});

// ── Graceful shutdown ──────────────────────────────────────────────────────
async function gracefulShutdown(signal) {
  console.log(`\n[Shutdown] Received ${signal}. Cleaning up...`);
  if (pollIntervalHandle) { clearInterval(pollIntervalHandle); pollIntervalHandle = null; }
  if (pingIntervalHandle) { clearInterval(pingIntervalHandle); pingIntervalHandle = null; }
  isReady = false;
  try { await upsertCompanyConfig({ daemon_last_ping: null, connected: false }); } catch {}
  try { await client.destroy(); } catch {}
  console.log('[Shutdown] Done. Goodbye.');
  process.exit(0);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Safety: reset isProcessing if it gets stuck (should never happen, but guards against crashes)
setInterval(() => {
  if (isProcessing) {
    // If still processing after 5 minutes, force-clear (something went very wrong)
    isProcessing = false;
    console.warn('[Safety] isProcessing was stuck — force-cleared');
  }
}, 5 * 60 * 1000);

client.initialize().catch(err => {
  console.error('[Fatal] client.initialize() threw:', err.message);
  console.error('[Fatal] Hint: Ensure Chromium/Chrome is accessible and no other whatsapp-host instance is running.');
});

// Local API for admin dashboard (backward-compatible)
app.get('/api/status', (req, res) => {
  res.json({ ready: isReady, hasQR: !!currentQR, sentToday, dailyLimit: DAILY_LIMIT, companyId: COMPANY_ID });
});

app.get('/api/qr', (req, res) => {
  if (isReady) return res.status(400).json({ error: 'Already authenticated' });
  if (!currentQR) return res.status(404).json({ error: 'QR not generated yet' });
  res.json({ qr: currentQR });
});

// ── Pause / resume endpoints ───────────────────────────────────────────────
app.post('/api/pause', (req, res) => {
  const minutes = parseInt(req.body?.minutes || '5', 10);
  queuePausedUntil = Date.now() + minutes * 60 * 1000;
  res.json({ paused: true, resumesAt: new Date(queuePausedUntil).toISOString() });
});

app.post('/api/resume', (req, res) => {
  queuePausedUntil = 0;
  res.json({ resumed: true });
});

// Force-reset: destroy session + re-initialize (generates fresh QR)
app.post('/api/reset-session', async (req, res) => {
  console.log('[Reset] Manual session reset requested from admin panel');
  isReady = false;
  currentQR = '';
  if (pollIntervalHandle) { clearInterval(pollIntervalHandle); pollIntervalHandle = null; }
  if (pingIntervalHandle) { clearInterval(pingIntervalHandle); pingIntervalHandle = null; }
  try { await client.destroy(); } catch {}
  await clearLocalSession();
  console.log('[Reset] Reinitializing client for fresh QR...');
  setTimeout(() => {
    client.initialize().catch(err => console.error('[Reset] Reinit failed:', err.message));
  }, 1500);
  res.json({ success: true, message: 'Session reset — new QR will appear shortly' });
});

app.listen(3005, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Levitate WhatsApp Daemon  [${COMPANY_ID ? `company: ${COMPANY_ID}` : 'ADMIN'}]`);
  console.log(`  Local API: http://localhost:3005`);
  console.log(`  Daily limit: ${DAILY_LIMIT} msgs/day`);
  console.log(`  Delay: ${MIN_DELAY_MS / 1000}–${MAX_DELAY_MS / 1000}s between sends`);
  console.log(`  Poll: every ${POLL_INTERVAL_MS / 1000}s`);
  console.log('  Env overrides: DAILY_LIMIT, MIN_DELAY_MS, MAX_DELAY_MS, POLL_INTERVAL_MS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
