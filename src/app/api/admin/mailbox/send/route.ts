import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        let { threadId, to, subject, body, replyToMessageId, fromEmail, fromName } = await request.json();

        // 1. Send via SMTP
        // Use custom From address if provided, otherwise fallback to env
        const senderEmail = fromEmail || process.env.SMTP_FROM;
        const senderName = fromName || 'Levitate Labs';

        // 2. Handle New Thread Creation if threadId is missing
        if (!threadId) {
            // Find or Create Contact
            let contactId;
            const { data: existingContact } = await supabase
                .from('contacts')
                .select('id')
                .eq('email', to)
                .maybeSingle();

            if (existingContact) {
                contactId = existingContact.id;
            } else {
                const { data: newContact } = await supabase
                    .from('contacts')
                    .insert({
                        email: to,
                        full_name: to.split('@')[0], // Fallback name
                        status: 'new'
                    })
                    .select()
                    .single();
                contactId = newContact?.id;
            }

            // Create Thread
            const { data: newThread } = await supabase
                .from('email_threads')
                .insert({
                    subject: subject,
                    snippet: body.substring(0, 100),
                    last_message_at: new Date().toISOString(),
                    contact_id: contactId,
                    category: 'general',
                    status: 'active'
                })
                .select()
                .single();

            if (!newThread) throw new Error("Failed to create thread");
            threadId = newThread.id;
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"${senderName}" <${senderEmail}>`,
            to,
            subject,
            html: body,
            inReplyTo: replyToMessageId, // Message-ID of the email we are replying to
            references: replyToMessageId
        });

        // 3. Save to Database
        await supabase.from('email_messages').insert({
            thread_id: threadId,
            from_email: senderEmail,
            from_name: senderName,
            to_email: [to],
            subject,
            body_text: body.replace(/<[^>]*>?/gm, ''), // Strip HTML for text version
            body_html: body,
            direction: 'outbound',
            is_read: true,
            created_at: new Date().toISOString()
        });

        // Update thread status
        await supabase.from('email_threads').update({
            last_message_at: new Date().toISOString(),
            status: 'active',
            snippet: body.substring(0, 100)
        }).eq('id', threadId);

        return NextResponse.json({ success: true, messageId: info.messageId, threadId });
    } catch (error: any) {
        console.error('Send Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
