// The one thing that runs on Netlify instead of your PC: actually dispatching
// email. Everything else (data, filtering, exports, client CRUD) is served
// locally by server/index.ts — this function's only job is to accept a
// {to, subject, html, attachment?} payload from that local server and send
// it via Brevo's transactional email API, so nothing on the public internet
// needs your Brevo credentials except this one small function.
//
// Deploy: `netlify deploy` from this folder (or drop this file into an
// existing Netlify site's netlify/functions/).
// Env vars needed on the Netlify site: BREVO_API_KEY, EMAIL_FUNCTION_SECRET,
// EMAIL_FROM / EMAIL_FROM_NAME (defaults to alerts@levitatelabs.online).
import type { Handler } from "@netlify/functions";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const secret = process.env.EMAIL_FUNCTION_SECRET;
  if (secret && event.headers["x-tenderpulse-secret"] !== secret) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "BREVO_API_KEY not configured" }) };
  }

  let payload: {
    to?: string;
    subject?: string;
    html?: string;
    attachment?: { filename: string; contentBase64: string; contentType: string };
  };
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid JSON body" }) };
  }

  const { to, subject, html, attachment } = payload;
  if (!to || !subject || !html) {
    return { statusCode: 400, body: JSON.stringify({ error: "to, subject, html are required" }) };
  }

  try {
    const resp = await fetch(BREVO_SEND_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: process.env.EMAIL_FROM_NAME || "TenderPulse BJ",
          email: process.env.EMAIL_FROM || "alerts@levitatelabs.online",
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        attachment: attachment
          ? [{ name: attachment.filename, content: attachment.contentBase64 }]
          : undefined,
      }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: data.message || `Brevo HTTP ${resp.status}` }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, id: data.messageId }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: (err as Error).message }) };
  }
};
