import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import nodemailer from 'nodemailer';

function escapeHtml(text: string) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// Helper to replace variables — escapes lead data to prevent HTML injection
const personalize = (text: string, lead: Record<string, string>) => {
    return text
        .replace(/{name}/g, escapeHtml(lead.name || 'there'))
        .replace(/{email}/g, escapeHtml(lead.email || ''))
        .replace(/{company}/g, escapeHtml(lead.company || 'your company'));
};

export async function POST(_request: Request) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Validate SMTP config upfront
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return NextResponse.json({ success: false, error: 'SMTP configuration is missing' }, { status: 500 });
    }

    try {
        // 1. Setup Transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const supabase = getServiceSupabase();

        const senderEmail = process.env.SMTP_FROM || 'admin@levitatelabs.com';
        const senderName = 'Levitate Growth';

        // 2. Fetch Active Campaigns
        const { data: campaigns } = await supabase
            .from('campaigns')
            .select('*, campaign_steps(*)')
            .eq('status', 'active');

        if (!campaigns || campaigns.length === 0) {
            return NextResponse.json({ success: true, message: 'No active campaigns' });
        }

        let processedCount = 0;
        const BATCH_LIMIT = 50; // Prevent timeouts

        // 3. Process Each Campaign
        for (const campaign of campaigns) {
            if (processedCount >= BATCH_LIMIT) break;

            type Step = { step_order: number; day_offset: number; subject: string; body: string };
            const steps: Step[] = [...campaign.campaign_steps].sort((a, b) => a.step_order - b.step_order);
            if (steps.length === 0) continue;

            // A. Initial Emails (Pending Step 1)
            const { data: newLeads } = await supabase
                .from('campaign_leads')
                .select('*')
                .eq('campaign_id', campaign.id)
                .eq('status', 'pending')
                .eq('current_step', 1)
                .limit(BATCH_LIMIT - processedCount);

            if (newLeads) {
                const firstStep = steps[0];
                for (const lead of newLeads) {
                    if (processedCount >= BATCH_LIMIT) break;
                    try {
                        await sendCampaignEmail(supabase, transporter, lead, firstStep, senderEmail, senderName);
                        processedCount++;
                    } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : 'Send error';
                        console.error(`Failed to send to ${lead.email}:`, msg);
                        await supabase.from('campaign_leads').update({ status: 'failed', error_log: msg }).eq('id', lead.id);
                    }
                }
            }

            // B. Follow-ups
            if (processedCount >= BATCH_LIMIT) break;

            const { data: activeLeads } = await supabase
                .from('campaign_leads')
                .select('*')
                .eq('campaign_id', campaign.id)
                .eq('status', 'sent')
                .limit(BATCH_LIMIT - processedCount);

            if (activeLeads) {
                for (const lead of activeLeads) {
                    if (processedCount >= BATCH_LIMIT) break;

                    try {
                        const nextStep = steps.find((s) => s.step_order === lead.current_step + 1);

                        if (nextStep) {
                            const lastAction = new Date(lead.last_action_at);
                            const diffInDays = (Date.now() - lastAction.getTime()) / (1000 * 3600 * 24);

                            if (diffInDays >= (nextStep.day_offset || 0)) {
                                await sendCampaignEmail(supabase, transporter, lead, nextStep, senderEmail, senderName);
                                processedCount++;
                            }
                        } else {
                            await supabase.from('campaign_leads').update({ status: 'completed' }).eq('id', lead.id);
                        }
                    } catch (err: unknown) {
                        console.error(`Failed follow-up for ${lead.email}:`, err instanceof Error ? err.message : err);
                    }
                }
            }
        }

        return NextResponse.json({ success: true, processed: processedCount, message: processedCount >= BATCH_LIMIT ? 'Batch limit reached' : 'Queue cleared' });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Campaign Process Error:', message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

type Supabase = ReturnType<typeof getServiceSupabase>;
type Transporter = ReturnType<typeof nodemailer.createTransport>;

async function sendCampaignEmail(
    supabase: Supabase,
    transporter: Transporter,
    lead: Record<string, string>,
    step: { step_order: number; subject: string; body: string },
    fromEmail: string,
    fromName: string
) {
    const subject = personalize(step.subject || '', lead);
    const body = personalize(step.body || '', lead);

    await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: lead.email,
        subject,
        html: body,
    });

    await supabase.from('campaign_leads').update({
        status: 'sent',
        current_step: step.step_order,
        last_action_at: new Date().toISOString()
    }).eq('id', lead.id);

    await supabase.from('email_messages').insert({
        from_email: fromEmail,
        from_name: fromName,
        to_email: [lead.email],
        subject,
        body_html: body,
        body_text: body.replace(/<[^>]*>?/gm, ''),
        direction: 'outbound',
        is_read: true,
        created_at: new Date().toISOString()
    });

    await supabase.rpc('increment_campaign_sent', { campaign_id: lead.campaign_id });
}
