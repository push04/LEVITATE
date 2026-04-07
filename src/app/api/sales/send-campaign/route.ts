import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Admin client to bypass RLS for fetching leads if needed, 
// though we usually use the auth context. 
// For sending, we might want to ensure we get all relevant recipients.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com', // Default fallback
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER, // sales@levitatelabs.online
        pass: process.env.SMTP_PASS,
    },
});

export async function POST(req: Request) {
    try {
        const { title, subject, body, targetAudience, userId } = await req.json();

        if (!title || !subject || !body || !targetAudience) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch Recipients
        let query = supabaseAdmin.from('leads').select('email, name');

        if (targetAudience === 'new_leads') {
            query = query.eq('status', 'New');
        } else if (targetAudience === 'contacted') {
            query = query.eq('status', 'Contacted');
        }
        // 'all' fetches everything (no filter)

        const { data: leads, error: leadsError } = await query;

        if (leadsError) throw leadsError;
        if (!leads || leads.length === 0) {
            return NextResponse.json({ error: 'No leads found for this audience' }, { status: 404 });
        }

        // Filter valid emails
        const validLeads = leads.filter(l => l.email && l.email.includes('@'));
        console.log(`Sending to ${validLeads.length} recipients...`);

        // 2. Insert Campaign Record (Draft/Sending)
        const { data: campaign, error: campaignError } = await supabaseAdmin
            .from('campaigns')
            .insert({
                title,
                subject,
                body,
                target_audience: targetAudience,
                status: 'sending',
                created_by: userId
            })
            .select()
            .single();

        if (campaignError) throw campaignError;

        // 3. Send Emails (Batching logic can be added for massive lists)
        let sentCount = 0;

        // For loop to send individually (better deliverability than one massive BCC for personalized "Hi [Name]")
        // Or usage of BCC for bulk if personalization isn't needed. 
        // Let's do individual for "High Quality" feel

        for (const lead of validLeads) {
            try {
                // Personalize content
                const personalizedBody = body.replace('{{name}}', lead.name || 'there');

                await transporter.sendMail({
                    from: '"Levitate Sales" <sales@levitatelabs.online>',
                    to: lead.email,
                    subject: subject,
                    text: personalizedBody, // Fallback
                    html: `<div style="font-family: sans-serif; white-space: pre-wrap;">${personalizedBody}</div>`
                });
                sentCount++;
            } catch (err) {
                console.error(`Failed to send to ${lead.email}`, err);
            }
        }

        // 4. Update Campaign Status
        await supabaseAdmin
            .from('campaigns')
            .update({
                status: 'sent',
                sent_count: sentCount
            })
            .eq('id', campaign.id);

        return NextResponse.json({ success: true, sent: sentCount });

    } catch (error: any) {
        console.error('Campaign Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
