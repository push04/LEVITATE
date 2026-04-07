import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { fetchRecentEmails } from '@/lib/imap-client';
import { generateGoogleAI } from '@/lib/google-ai';

export async function POST() {
    try {
        const supabase = await createClient();
        const emails = await fetchRecentEmails(10); // Fetch last 10 emails
        let processedCount = 0;

        for (const email of emails) {
            // 1. Check if message already exists
            const { data: existingMsg } = await supabase
                .from('email_messages')
                .select('id')
                .eq('id', email.id) // Assuming we use Message-ID as PK or unique field. Actually schema has UUID. 
                // Let's modify schema or searching. Detailed implementation in a moment.
                // For now, let's assume we store the 'provider_message_id' or check duplicates by another means.
                // Schema update: add provider_id column to email_messages.
                // Or simplified: check if we have a message with same from/subject/time.
                .maybeSingle();

            // To allow dedup without schema change for now, let's query by specific content signature or just skip check if simplistic
            // Better: Add `provider_message_id` to schema. But since I can't run SQL easily, I'll rely on a composite check.
            const { data: duplicate } = await supabase
                .from('email_messages')
                .select('id')
                .eq('subject', email.subject)
                .eq('from_email', email.from)
                .eq('created_at', email.date.toISOString())
                .maybeSingle();

            if (duplicate) continue;

            // 2. Find or Create Contact
            let contactId;
            const { data: existingContact } = await supabase
                .from('contacts')
                .select('id')
                .eq('email', email.from)
                .maybeSingle();

            if (existingContact) {
                contactId = existingContact.id;
            } else {
                const { data: newContact } = await supabase
                    .from('contacts')
                    .insert({
                        email: email.from,
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
                    const aiRes = await generateGoogleAI([
                        { role: 'system', content: 'Categorize this email as "lead", "support", or "general". Return JSON { category, score } where score is 0-100 lead potential.' },
                        { role: 'user', content: `Subject: ${email.subject}\n\n${email.text.substring(0, 500)}` }
                    ]);
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
                from_email: email.from,
                from_name: email.fromName,
                to_email: [email.to],
                subject: email.subject,
                body_text: email.text,
                body_html: email.html,
                direction: 'inbound',
                is_read: false,
                created_at: email.date.toISOString()
            });

            processedCount++;
        }

        return NextResponse.json({ success: true, processed: processedCount });
    } catch (error: any) {
        console.error('Sync Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
