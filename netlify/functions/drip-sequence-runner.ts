import { Handler } from '@netlify/functions';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

interface DripSequence {
  id: string;
  business_id: string;
  contact_email: string;
  contact_name: string;
  business_name: string;
  business_category: string;
  city: string;
  current_step: number;
  status: string;
  next_send_at: string;
  variables: Record<string, string>;
}

interface EmailLog {
  sequence_id: string;
  step: number;
  subject: string;
  sent_at: string;
  status: string;
  message_id?: string;
}

async function supabaseRequest(path: string, options: RequestInit = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers,
    },
  });
  return response;
}

export const handler: Handler = async (event, context) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && event.headers['x-cron-secret'] !== cronSecret) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  try {
    const now = new Date().toISOString();

    const sequencesResponse = await supabaseRequest(
      `/drip_sequences?status=eq.active&next_send_at=lte.${encodeURIComponent(now)}&select=*`
    );

    if (!sequencesResponse.ok) {
      throw new Error(`Failed to fetch sequences: ${sequencesResponse.statusText}`);
    }

    const sequences: DripSequence[] = await sequencesResponse.json();

    const results = [];

    for (const sequence of sequences) {
      try {
        const nextStep = sequence.current_step + 1;

        if (nextStep > 7) {
          await supabaseRequest(`/drip_sequences?id=eq.${sequence.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'completed', updated_at: now }),
          });
          continue;
        }

        const template = getDripTemplate(nextStep);
        if (!template) {
          continue;
        }

        const variables = {
          contact_name: sequence.contact_name,
          business_name: sequence.business_name,
          business_category: sequence.business_category,
          city: sequence.city,
          sender_name: process.env.SENDER_NAME || 'The Automation Team',
          trial_link: `${process.env.APP_URL}/trial?sequence=${sequence.id}`,
          unsubscribe_link: `${process.env.APP_URL}/api/drip/unsubscribe?token=${generateUnsubscribeToken(sequence.id)}`,
          similar_business_name: sequence.variables?.similar_business_name || 'A similar business',
          ...sequence.variables,
        };

        const subject = renderTemplate(template.subject, variables);
        const body = renderTemplate(template.body, variables);

        const emailResult = await resend.emails.send({
          from: process.env.FROM_EMAIL || 'noreply@yourapp.com',
          to: [sequence.contact_email],
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              ${body.replace(/\n/g, '<br/>')}
              <br/><br/>
              <div style="font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
                <a href="${variables.unsubscribe_link}" style="color: #666;">Unsubscribe</a>
              </div>
            </div>
          `,
        });

        const emailLog: EmailLog = {
          sequence_id: sequence.id,
          step: nextStep,
          subject,
          sent_at: now,
          status: 'sent',
          message_id: emailResult.data?.id,
        };

        await supabaseRequest(`/drip_email_logs`, {
          method: 'POST',
          body: JSON.stringify(emailLog),
        });

        const nextSendAt = new Date();
        nextSendAt.setDate(nextSendAt.getDate() + 2);

        await supabaseRequest(`/drip_sequences?id=eq.${sequence.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            current_step: nextStep,
            next_send_at: nextSendAt.toISOString(),
            updated_at: now,
          }),
        });

        results.push({
          sequence_id: sequence.id,
          step: nextStep,
          status: 'sent',
        });

      } catch (error) {
        console.error(`Error processing sequence ${sequence.id}:`, error);
        results.push({
          sequence_id: sequence.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        processed: sequences.length,
        results,
      }),
    };

  } catch (error) {
    console.error('Drip sequence runner error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    };
  }
};

function getDripTemplate(step: number) {
  const templates: Record<number, { subject: string; body: string }> = {
    1: {
      subject: "Noticed something about {business_name}",
      body: `Hi {contact_name},

I was looking at {business_name}'s online presence and noticed something interesting.

Most {business_category} businesses in {city} are missing a key digital opportunity that could be bringing them 10-15 new leads per month.

I'd love to share what I found — are you open to a brief conversation about it?

Best,
{sender_name}`
    },
    2: {
      subject: "What happened after we helped a {business_category} in {city}",
      body: `Hi {contact_name},

Last month, we started working with a {business_category} in {city} that was facing the exact same challenge as {business_name}.

Here's what happened in just 3 weeks:
- They automated their lead follow-up process
- Response time dropped from 4 hours to 2 minutes
- They booked 12 new consultations in the first month

The same approach could work for {business_name}. Want to see how?

Best,
{sender_name}`
    },
    3: {
      subject: "How the automation actually works",
      body: `Hi {contact_name},

I know automation can sound complicated, so let me break down exactly how it works for businesses like {business_name}:

Day 1: We set up the intake form and connect it to your CRM
Day 2: Automated follow-up sequences go live
Day 3: First leads start flowing through the system
Day 4-7: You adjust messaging based on initial responses
Day 8+: System runs on autopilot, you just show up for appointments

No technical expertise required — we handle everything.

Want to see a demo?

Best,
{sender_name}`
    },
    4: {
      subject: "14-day trial — no payment required",
      body: `Hi {contact_name},

I'd like to invite {business_name} to try our automation system for 14 days — completely free.

No credit card required. No commitment. Just results.

Here's what you get:
- Full access to our lead automation platform
- Done-for-you setup (we handle the technical stuff)
- Personal onboarding call
- Daily support via email

After 14 days, if you're not seeing value, just walk away. No hard feelings.

Ready to start? Click here to begin your trial: {trial_link}

Best,
{sender_name}`
    },
    5: {
      subject: "What's one new client worth to you?",
      body: `Hi {contact_name},

Quick math for {business_category} businesses:

Average client value: $2,000
Your close rate: ~30%
Leads needed per new client: ~3

Our system typically generates 10-15 qualified leads/month for businesses like {business_name}.

That's 3-5 new clients per month = $6,000-$10,000 in additional revenue.

Our system costs a fraction of that — and the first 14 days are free.

Still thinking it over? Reply with your questions.

Best,
{sender_name}`
    },
    6: {
      subject: "{similar_business_name} in {city} saw this in 30 days",
      body: `Hi {contact_name},

Remember {similar_business_name} in {city}? The {business_category} we helped last month?

Here are their 30-day results:
- 47 new leads generated
- 18 booked appointments
- 6 new clients signed
- $12,000 in new revenue

{business_name} could see similar results — your market is actually even better positioned.

The 14-day trial is still available: {trial_link}

Best,
{sender_name}`
    },
    7: {
      subject: "Last message from me",
      body: `Hi {contact_name},

I've shared what our system can do for {business_name}, and I want to respect your time and inbox.

This will be my last email (for now).

If you ever want to revisit the 14-day free trial, just reply to this email or visit: {trial_link}

Wishing {business_name} continued success either way.

Best,
{sender_name}`
    }
  };

  return templates[step] || null;
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] || match;
  });
}

function generateUnsubscribeToken(sequenceId: string): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { sequenceId, action: 'unsubscribe' },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '30d' }
  );
}
