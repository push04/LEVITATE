import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import nodemailer from 'nodemailer';

// Helper to replace variables
const personalize = (text: string, lead: any) => {
    return text
        .replace(/{name}/g, lead.name || 'there')
        .replace(/{email}/g, lead.email)
        .replace(/{company}/g, lead.company || 'your company');
};

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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

            const steps = campaign.campaign_steps.sort((a: any, b: any) => a.step_order - b.step_order);
            if (steps.length === 0) continue;

            // A. Initial Emails (Pending Step 1)
            const { data: newLeads } = await supabase
                .from('campaign_leads')
                .select('*')
                .eq('campaign_id', campaign.id)
                .eq('status', 'pending')
                .eq('current_step', 1)
                .limit(BATCH_LIMIT - processedCount); // optimization

            if (newLeads) {
                const firstStep = steps[0];
                for (const lead of newLeads) {
                    if (processedCount >= BATCH_LIMIT) break;
                    try {
                        await sendCampaignEmail(supabase, transporter, lead, firstStep, senderEmail, senderName);
                        processedCount++;
                    } catch (err: any) {
                        console.error(`Failed to send to ${lead.email}:`, err);
                        await supabase.from('campaign_leads').update({ status: 'failed', error_log: err.message }).eq('id', lead.id);
                    }
                }
            }

            // B. Follow-ups (Sent Lead, check if Step + 1 exists and time passed)
            if (processedCount >= BATCH_LIMIT) break;

            const { data: activeLeads } = await supabase
                .from('campaign_leads')
                .select('*')
                .eq('campaign_id', campaign.id)
                .eq('status', 'sent')
                .limit(BATCH_LIMIT - processedCount); // Limit fetches too

            if (activeLeads) {
                for (const lead of activeLeads) {
                    if (processedCount >= BATCH_LIMIT) break;

                    try {
                        const nextStepIndex = steps.findIndex((s: any) => s.step_order === lead.current_step + 1);

                        if (nextStepIndex !== -1) {
                            const nextStep = steps[nextStepIndex];

                            // Check time delay
                            const lastAction = new Date(lead.last_action_at);
                            const now = new Date();
                            const diffInDays = (now.getTime() - lastAction.getTime()) / (1000 * 3600 * 24);

                            if (diffInDays >= (nextStep.day_offset || 0)) {
                                await sendCampaignEmail(supabase, transporter, lead, nextStep, senderEmail, senderName);
                                processedCount++;
                            }
                        } else {
                            // No more steps? Mark completed
                            await supabase.from('campaign_leads').update({ status: 'completed' }).eq('id', lead.id);
                        }
                    } catch (err: any) {
                        console.error(`Failed to process follow-up for ${lead.email}:`, err);
                        // Don't fail the lead entirely for a follow-up error? Or maybe yes.
                        // For now let's log it but keep status 'sent' so it retries, unless it's a hard error.
                        // Actually, if it's a transport error, retry is good. If data error, maybe not.
                        // Let's rely on next run for retry.
                    }
                }
            }
        }

        return NextResponse.json({ success: true, processed: processedCount, message: processedCount >= BATCH_LIMIT ? 'Batch limit reached' : 'Queue cleared' });

    } catch (error: any) {
        console.error('Campaign Process Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

async function sendCampaignEmail(supabase: any, transporter: any, lead: any, step: any, fromEmail: string, fromName: string) {
    const subject = personalize(step.subject || '', lead);
    const body = personalize(step.body || '', lead);

    // Send Mail
    await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: lead.email,
        subject: subject,
        html: body
    });

    // Update Lead
    await supabase.from('campaign_leads').update({
        status: 'sent',
        current_step: step.step_order,
        last_action_at: new Date().toISOString()
    }).eq('id', lead.id);

    // Log to Mailbox (email_messages table)
    // We create a fake thread or use existing if we tracked it?
    // For simplicity, strict "outbound" logging
    await supabase.from('email_messages').insert({
        from_email: fromEmail,
        from_name: fromName,
        to_email: [lead.email],
        subject: subject,
        body_html: body,
        body_text: body.replace(/<[^>]*>?/gm, ''),
        direction: 'outbound',
        is_read: true,
        created_at: new Date().toISOString()
        // thread_id: we should ideally link this to a thread for replies
    });

    // Update Stats
    await supabase.rpc('increment_campaign_sent', { campaign_id: lead.campaign_id });
}
