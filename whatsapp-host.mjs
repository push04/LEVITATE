import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcodeTerminal from 'qrcode-terminal';
import qrcode from 'qrcode';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'node:dns';

// Load the real .env first, then allow .env.local to add extra local-only values.
// This keeps the real Supabase credentials from being masked by placeholder data.
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

// Optional override for environments where default DNS is unreliable.
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
  console.error('This daemon needs the real database URL and service role key from your local .env file.');
  console.error('ACTION REQUIRED: Update .env.local or remove the placeholder values so .env can win.\n');
  process.exit(1);
}

if (!supabaseKey || supabaseKey.includes('placeholder')) {
  console.error('\nERROR: Supabase key is still missing or placeholder.');
  console.error('ACTION REQUIRED: Add the real service role key to your local .env file.\n');
  process.exit(1);
}

if (!supabaseHost) {
  console.error('\nERROR: NEXT_PUBLIC_SUPABASE_URL is invalid.');
  console.error('ACTION REQUIRED: Set a valid Supabase URL (example: https://<project>.supabase.co).\n');
  process.exit(1);
}

const app = express();
app.use(cors());

const supabaseRestBase = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
const supabaseRestHeaders = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Prefer: 'return=minimal'
};

// Anti-ban settings
const DAILY_LIMIT = 20; // absolute max messages per day
const MIN_DELAY_MS = 45 * 1000; // 45 seconds minimum between messages
const MAX_DELAY_MS = 90 * 1000; // 90 seconds maximum between messages
const POLL_INTERVAL_MS = 15 * 1000; // check the queue every 15 seconds

let sentToday = 0;
let lastResetDate = new Date().toDateString();

function randomDelay() {
  const ms = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)) + MIN_DELAY_MS;
  console.log(`[Delay] Waiting ${Math.round(ms / 1000)} seconds before next message (anti-ban)`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resetDailyCounterIfNeeded() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    sentToday = 0;
    lastResetDate = today;
    console.log('[Clock] New day - daily WhatsApp counter reset to 0');
  }
}

let currentQR = '';
let isReady = false;
let pollingStarted = false;
let pollIntervalHandle = null;
let isRestartingClient = false;
let lastDnsCheckAt = 0;
const DNS_RECHECK_MS = 5 * 60 * 1000;
let publicDnsFallbackApplied = false;

console.log('Starting Local WhatsApp Server...');
console.log(`Anti-ban: Max ${DAILY_LIMIT} messages/day, ${MIN_DELAY_MS / 1000}-${MAX_DELAY_MS / 1000} sec delay between sends`);

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', async (qr) => {
  currentQR = await qrcode.toDataURL(qr);
  console.log('Scan this QR code with your WhatsApp:');
  qrcodeTerminal.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp Client is READY! Polling starts now.');
  isReady = true;
  pollingStarted = true;
  currentQR = '';

  if (!pollIntervalHandle) {
    pollIntervalHandle = setInterval(pollQueue, POLL_INTERVAL_MS);
  }
});

client.on('disconnected', (reason) => {
  console.log('WhatsApp Client Disconnected:', reason);
  isReady = false;
  pollingStarted = false;
});

client.initialize();

// API routes for the admin dashboard.
app.get('/api/status', (req, res) => {
  res.json({ ready: isReady, hasQR: !!currentQR, sentToday, dailyLimit: DAILY_LIMIT });
});

app.get('/api/qr', (req, res) => {
  if (isReady) return res.status(400).json({ error: 'Already authenticated' });
  if (!currentQR) return res.status(404).json({ error: 'QR not generated yet' });
  res.json({ qr: currentQR });
});

let isProcessing = false;
let queuePausedUntil = 0;

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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[DNS] Failed to apply public DNS fallback:', errMsg);
  }
}

function isRecoverableClientError(message) {
  const value = message.toLowerCase();
  return (
    value.includes('detached frame') ||
    value.includes('execution context was destroyed') ||
    value.includes('target closed') ||
    value.includes('session closed') ||
    value.includes('protocol error')
  );
}

async function restartClientSession(reason) {
  if (isRestartingClient) return;

  isRestartingClient = true;
  isReady = false;
  pollingStarted = false;
  queuePausedUntil = Date.now() + 5 * 60 * 1000;

  console.error(`[Recover] Restarting WhatsApp client: ${reason}`);

  try {
    await client.destroy();
  } catch {
    // Ignore destroy errors.
  }

  try {
    await client.initialize();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[Recover] Reinitialize failed:', errMsg);
  } finally {
    isRestartingClient = false;
  }
}

function safeMessageText(text) {
  let clean = text;
  try {
    const parsed = JSON.parse(text);
    clean = parsed.body || parsed.message || JSON.stringify(parsed);
  } catch {
    // plain text, use as-is
  }

  clean = clean.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu, '');
  return clean.trim();
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
        headers: {
          ...supabaseRestHeaders,
          ...(options.headers || {})
        }
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
      const causeCode = error && typeof error === 'object' && 'cause' in error && error.cause && typeof error.cause === 'object' && 'code' in error.cause ? error.cause.code : null;
      if (causeCode === 'ENOTFOUND') {
        tryPublicDnsFallback();
        queuePausedUntil = Date.now() + 5 * 60 * 1000;
        console.error(`[Queue] Supabase DNS lookup failed (attempt ${attempt}/${attempts}):`, message);
      } else {
        console.error(`[Queue] Supabase request failed (attempt ${attempt}/${attempts}):`, message);
      }

      if (attempt < attempts) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fetchPendingMessage() {
  const response = await supabaseRequest(
    '/whatsapp_queue?select=*&status=eq.pending&order=created_at.asc&limit=1',
    { method: 'GET' }
  );

  const messages = await response.json().catch(() => []);
  return Array.isArray(messages) ? messages : [];
}

async function updateQueueRow(id, payload) {
  await supabaseRequest(
    `/whatsapp_queue?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }
  );
}

async function pollQueue() {
  if (!isReady || isProcessing) return;

  if (Date.now() < queuePausedUntil) {
    return;
  }

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

    if (!messages || messages.length === 0) {
      isProcessing = false;
      return;
    }
    const msg = messages[0];
    let shouldDelay = true;

    try {
      let targetNumber = String(msg.to_number ?? '').replace(/[^0-9]/g, '');
      if (targetNumber.startsWith('0') && targetNumber.length === 11) {
        targetNumber = targetNumber.slice(1);
      }
      if (targetNumber.length === 10) targetNumber = '91' + targetNumber;

      if (targetNumber.length < 11) {
        console.warn(`[Skip] Invalid number ${msg.to_number}, marking failed`);
        await updateQueueRow(msg.id, {
          status: 'failed',
          error: 'Invalid phone number (too short)',
          updated_at: new Date().toISOString()
        });
        shouldDelay = false;
        return;
      }

      if (targetNumber.length > 15) {
        console.warn(`[Skip] Invalid number ${msg.to_number}, marking failed (too long).`);
        await updateQueueRow(msg.id, {
          status: 'failed',
          error: 'Invalid phone number (too long)',
          updated_at: new Date().toISOString()
        });
        shouldDelay = false;
        return;
      }

      const numberId = await client.getNumberId(targetNumber);
      if (!numberId) {
        console.warn(`[Skip] ${targetNumber} is not registered on WhatsApp.`);
        await updateQueueRow(msg.id, {
          status: 'failed',
          error: 'Not on WhatsApp',
          updated_at: new Date().toISOString()
        });
        shouldDelay = false;
        return;
      }

      const cleanMessage = safeMessageText(msg.message);

      console.log(`[Send] [${sentToday + 1}/${DAILY_LIMIT}] To ${targetNumber}: "${cleanMessage.substring(0, 50)}..."`);
      await client.sendMessage(numberId._serialized, cleanMessage);

      await updateQueueRow(msg.id, {
        status: 'sent',
        updated_at: new Date().toISOString()
      });

      sentToday++;
      console.log(`[Sent] OK (${sentToday}/${DAILY_LIMIT} today)`);
    } catch (sendErr) {
      const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);

      if (isRecoverableClientError(errMsg)) {
        await restartClientSession(errMsg);
        console.warn(`[Queue] Keeping message ${msg.id} as pending. It will retry after reconnect.`);
        shouldDelay = false;
        return;
      }

      console.error(`[Error] Failed to send to ${msg.to_number}:`, errMsg);
      await updateQueueRow(msg.id, {
        status: 'failed',
        error: errMsg.substring(0, 200),
        updated_at: new Date().toISOString()
      });
    }

    if (shouldDelay) {
      await randomDelay();
    }
  } catch (e) {
    console.error('[Error] Fatal polling error:', e);
    queuePausedUntil = Date.now() + 2 * 60 * 1000;
    console.log('[Queue] Pausing queue polling for 2 minutes before retrying.');
  } finally {
    isProcessing = false;
  }
}

app.listen(3005, () => {
  console.log('Local API Server running on http://localhost:3005');
});
