import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let queuedLogId: string | null = null;

  try {
    supabase = await createClient();
    let { threadId, to, subject, body, replyToMessageId, fromEmail, fromName } = await request.json();

    const toAddress = String(to || '').replace(/.*</, '').replace(/>.*/, '').trim().toLowerCase();
    const cleanSubject = String(subject || '').trim();
    const bodyHtml = String(body || '');

    if (!toAddress) {
      throw new Error('Recipient email is required');
    }
    if (!cleanSubject) {
      throw new Error('Subject is required');
    }

    const senderEmail = (fromEmail || process.env.SMTP_FROM || process.env.SMTP_USER || '');
    // F-009: Strip CRLF from all header-injectable fields
    const stripCRLF = (s: string) => s.replace(/[\r\n]/g, '');
    const senderName = stripCRLF(fromName || 'Levitate Labs').substring(0, 100);
    const safeSenderEmail = stripCRLF(senderEmail);
    // Only allow sending from levitatelabs.online / levitatelabs.com domains
    const allowedDomains = ['levitatelabs.online', 'levitatelabs.com'];
    const emailDomain = safeSenderEmail.split('@')[1]?.toLowerCase();
    if (!emailDomain || !allowedDomains.includes(emailDomain)) {
      throw new Error('Sender email domain not permitted');
    }
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://levitatelabs.online').replace(/\/$/, '');

    if (!safeSenderEmail) {
      throw new Error('SMTP sender email is not configured');
    }

    if (!threadId) {
      let contactId;
      const { data: existingContact } = await supabase.from('contacts').select('id').eq('email', toAddress).maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            email: toAddress,
            full_name: toAddress.split('@')[0],
            status: 'new',
          })
          .select()
          .single();
        contactId = newContact?.id;
      }

      const { data: newThread } = await supabase
        .from('email_threads')
        .insert({
          subject: cleanSubject,
          snippet: bodyHtml.substring(0, 100),
          last_message_at: new Date().toISOString(),
          contact_id: contactId,
          category: 'general',
          status: 'active',
        })
        .select()
        .single();

      if (!newThread) throw new Error('Failed to create thread');
      threadId = newThread.id;
    }

    const { data: queuedLog, error: queuedLogError } = await supabase
      .from('agent_emails')
      .insert({
        agent_name: 'human_agent',
        from_email: safeSenderEmail,
        to_email: toAddress,
        subject: cleanSubject,
        body: bodyHtml,
        direction: 'outbound',
        status: 'queued',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (queuedLogError || !queuedLog?.id) {
      throw new Error(queuedLogError?.message || 'Failed to queue outbound email log');
    }

    queuedLogId = queuedLog.id;

    const trackingPixel = `<img src="${appUrl}/api/admin/mailbox/open?message=${encodeURIComponent(queuedLogId ?? '')}" width="1" height="1" style="display:none;" alt="" />`;
    const trackedHtml = `${bodyHtml}${trackingPixel}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: parseInt(process.env.SMTP_PORT || '587') === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"${senderName}" <${safeSenderEmail}>`,
      to: toAddress,
      subject: cleanSubject,
      html: trackedHtml,
      text: bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      inReplyTo: replyToMessageId,
      references: replyToMessageId,
    });

    await supabase
      .from('agent_emails')
      .update({
        status: (info.accepted?.length ?? 0) > 0 ? 'accepted' : 'sent',
        body: bodyHtml,
      })
      .eq('id', queuedLogId);

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    if (supabase && queuedLogId) {
      await supabase.from('agent_emails').update({ status: 'failed' }).eq('id', queuedLogId);
    }

    console.error('Send Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

