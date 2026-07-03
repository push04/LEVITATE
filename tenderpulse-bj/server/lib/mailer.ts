// The PC server never talks to an SMTP/email API directly — per your setup,
// actually sending email is the one job handed off to a small Netlify
// function (netlify/functions/send-tender-email.ts), reached over HTTPS.
// Point EMAIL_FUNCTION_URL at wherever that function is deployed
// (https://yoursite.netlify.app/.netlify/functions/send-tender-email), plus
// EMAIL_FUNCTION_SECRET as a shared-secret header so randoms can't hit it.
export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  attachment?: { filename: string; contentBase64: string; contentType: string };
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const url = process.env.EMAIL_FUNCTION_URL;
  if (!url) {
    console.log(`[mailer] EMAIL_FUNCTION_URL not set — would have emailed "${input.subject}" to ${input.to}`);
    return { ok: false, error: "EMAIL_FUNCTION_URL not configured" };
  }
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.EMAIL_FUNCTION_SECRET ? { "x-tenderpulse-secret": process.env.EMAIL_FUNCTION_SECRET } : {}),
      },
      body: JSON.stringify(input),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { ok: false, error: `HTTP ${resp.status}: ${text.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
