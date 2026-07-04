import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase';
import { fetchRecentEmails } from '@/lib/imap-client';
import { callAI } from '@/lib/ai/router';
import { checkAdminAuth } from '@/lib/auth';
import { parseCompanyEmailAlias, resolveCompanyByWorkspaceSlug } from '@/lib/company-email';
import { sendEmail } from '@/lib/email/client';

export async function POST() {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const supabase = await createClient();
        const emails = await fetchRecentEmails(10); // Fetch last 10 emails
        let processedCount = 0;

        for (const email of emails) {
            const inboundFrom = String(email.from || '').toLowerCase().trim();

            // Business email alias routing: mail addressed to
            // business.<workspace-slug>@levitatelabs.online belongs to that
            // company's own mailbox — file it there and stop. It must NOT also
            // become a "lead" in Levitate's own internal admin CRM/agent_emails
            // below (wrong data, and wastes an AI categorization call per email).
            const workspaceSlug = parseCompanyEmailAlias(String(email.to || ''));
            if (workspaceSlug) {
                const companyInfo = await resolveCompanyByWorkspaceSlug(workspaceSlug);
                if (companyInfo) {
                    const serviceSupabase = getServiceSupabase();
                    const { data: duplicateCompanyEmail } = await serviceSupabase
                        .from('company_emails')
                        .select('id')
                        .eq('company_id', companyInfo.companyId)
                        .eq('subject', email.subject)
                        .eq('from_email', inboundFrom)
                        .eq('created_at', email.date.toISOString())
                        .maybeSingle();

                    if (!duplicateCompanyEmail) {
                        const { error: companyEmailError } = await serviceSupabase.from('company_emails').insert({
                            company_id: companyInfo.companyId,
                            direction: 'inbound',
                            from_email: inboundFrom,
                            to_email: email.to,
                            subject: email.subject,
                            body: email.text,
                            status: 'received',
                            created_at: email.date.toISOString(),
                        });
                        if (companyEmailError) {
                            console.error('[Mailbox Sync] Failed to file company_emails row:', companyEmailError.message);
                        }

                        // Redirect a copy straight to the business owner's own inbox
                        // so they see it immediately without needing to open the dashboard.
                        if (companyInfo.ownerEmail) {
                            await sendEmail(
                                companyInfo.ownerEmail,
                                `[${companyInfo.alias}] ${email.subject}`,
                                `Forwarded message sent to your business email (${companyInfo.alias})\nFrom: ${inboundFrom}\n\n${email.text}`
                            );
                        }
                        processedCount++;
                    }
                    continue;
                }
            }

            // To allow dedup without schema change for now, let's query by specific content signature or just skip check if simplistic
            // Better: Add `provider_message_id` to schema. But since I can't run SQL easily, I'll rely on a composite check.
            const { data: duplicate } = await supabase
                .from('email_messages')
                .select('id')
                .eq('subject', email.subject)
                .eq('from_email', inboundFrom)
                .eq('created_at', email.date.toISOString())
                .maybeSingle();

            if (duplicate) continue;

            // 2. Find or Create Contact
            let contactId;
            const { data: existingContact } = await supabase
                .from('contacts')
                .select('id')
                .eq('email', inboundFrom)
                .maybeSingle();

            if (existingContact) {
                contactId = existingContact.id;
            } else {
                const { data: newContact } = await supabase
                    .from('contacts')
                    .insert({
                        email: inboundFrom,
                        full_name: email.fromName,
                        status: 'new'
                    })
                    .select()
                    .single();
                contactId = newContact?.id;
            }

            // 3. Find or Create Thread
            // Group by Subject (removing Re/Fwd)
            const cleanSubject = email.subject.replace(/^(Re|Fwd): /i, '').trim();
            let threadId;

            const { data: existingThread } = await supabase
                .from('email_threads')
                .select('id')
                .eq('contact_id', contactId)
                .ilike('subject', `%${cleanSubject}%`)
                .maybeSingle();

            if (existingThread) {
                threadId = existingThread.id;
                // Update last_message_at
                await supabase
                    .from('email_threads')
                    .update({
                        last_message_at: email.date.toISOString(),
                        snippet: email.text.substring(0, 100)
                    })
                    .eq('id', threadId);
            } else {
                // AI Categorization
                let category = 'general';
                let aiScore = 0;
                try {
                    const aiRes = await callAI(
                        'Categorize this email as "lead", "support", or "general". Return JSON { category, score } where score is 0-100 lead potential. Reply with JSON only.',
                        `Subject: ${email.subject}\n\n${email.text.substring(0, 500)}`,
                        120, 'mailbox'
                    );
                    if (aiRes) {
                        const parsed = JSON.parse(aiRes.replace(/```json|```/g, ''));
                        category = parsed.category || 'general';
                        aiScore = parsed.score || 0;
                    }
                } catch (e) { console.error('AI Error', e); }

                const { data: newThread } = await supabase
                    .from('email_threads')
                    .insert({
                        subject: cleanSubject, // Use original or clean?
                        snippet: email.text.substring(0, 100),
                        last_message_at: email.date.toISOString(),
                        contact_id: contactId,
                        category,
                        status: 'inbox'
                    })
                    .select()
                    .single();
                threadId = newThread?.id;

                // Update contact score if lead
                if (aiScore > 0) {
                    await supabase.from('contacts').update({ ai_score: aiScore }).eq('id', contactId);
                }
            }

            // 4. Create Message
            await supabase.from('email_messages').insert({
                thread_id: threadId,
                from_email: inboundFrom,
                from_name: email.fromName,
                to_email: [email.to],
                subject: email.subject,
                body_text: email.text,
                body_html: email.html,
                direction: 'inbound',
                is_read: false,
                created_at: email.date.toISOString()
            });

            // Note: ensure incoming emails are visible to agents in the Automations dashboard.
            await supabase.from('agent_emails').insert({
                agent_name: 'inbound_bot',
                direction: 'inbound',
                to_email: email.to,
                from_email: inboundFrom,
                subject: email.subject,
                body: email.text,
                status: 'received',
                created_at: email.date.toISOString()
            });

            await supabase
                .from('agent_emails')
                .update({ status: 'replied' })
                .eq('direction', 'outbound')
                .eq('to_email', inboundFrom)
                .in('status', ['queued', 'sent', 'accepted', 'opened']);

            processedCount++;
        }

        return NextResponse.json({ success: true, processed: processedCount });
    } catch (error: any) {
        console.error('Sync Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
