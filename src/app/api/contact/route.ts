import { NextRequest, NextResponse } from 'next/server';
import { getAnonSupabase } from '@/lib/supabase';
import { notifyFounder, sendLeadEmail } from '@/lib/email/client';

// Allowed MIME types for file upload
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const name = (formData.get('name') as string || '').trim();
        const email = (formData.get('email') as string || '').trim();
        const service_category = (formData.get('service_category') as string || '').trim();
        const budget = (formData.get('budget') as string || '').trim();
        const message = (formData.get('message') as string || '').trim();
        const file = formData.get('file') as File | null;

        // Validate required fields
        if (!name || !email || !budget || !message) {
            return NextResponse.json(
                { error: 'Name, email, budget and message are required' },
                { status: 400 }
            );
        }

        // Basic email format check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        // Validate file if present
        let fileUrl: string | null = null;
        const supabase = getAnonSupabase();

        if (file && file.size > 0) {
            if (file.size > MAX_FILE_BYTES) {
                return NextResponse.json({ error: 'File too large. Maximum 5 MB.' }, { status: 400 });
            }
            if (!ALLOWED_MIME.has(file.type)) {
                return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and PDF files are allowed.' }, { status: 400 });
            }

            const ext = file.type === 'application/pdf' ? 'pdf'
                      : file.type === 'image/png' ? 'png'
                      : file.type === 'image/webp' ? 'webp' : 'jpg';
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

            try {
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('client-assets')
                    .upload(fileName, file, { contentType: file.type });

                if (!uploadError && uploadData) {
                    // Use signed URL (private access) instead of public URL
                    const { data: signedData } = await supabase.storage
                        .from('client-assets')
                        .createSignedUrl(uploadData.path, 60 * 60 * 24 * 7); // 7 days
                    fileUrl = signedData?.signedUrl ?? null;
                }
            } catch { /* non-fatal */ }
        }

        // Insert lead using anon client — RLS must allow INSERT on leads for anon
        const { error } = await supabase
            .from('leads')
            .insert([{
                name,
                email,
                service_category,
                budget,
                message,
                file_url: fileUrl,
                status: 'New',
                source: 'organic',
            }]);

        if (error) {
            console.error('[Contact] DB insert error:', error.message);
            return NextResponse.json({ error: 'Unable to save your submission. Please try again.' }, { status: 500 });
        }

        // Notify founder (non-fatal)
        try {
            await Promise.all([
                notifyFounder(
                    `[NEW INBOUND LEAD] ${name} — ${budget}`,
                    `New contact form submission:\n\nName: ${name}\nEmail: ${email}\nBudget: ${budget}\nService: ${service_category || 'Not specified'}\n\nMessage:\n${message}\n\nView leads: https://levitatelabs.online/admin/dashboard/leads`
                ),
                sendLeadEmail(
                    email,
                    'We received your inquiry — Levitate Labs',
                    `Hi ${name},\n\nThank you for reaching out to Levitate Labs! We've received your message and our team will respond within 24 hours.\n\nBest regards,\nThe Levitate Labs Team\nlevitatelabs.online`
                )
            ]);
        } catch { /* non-fatal */ }

        return NextResponse.json({
            success: true,
            message: "Thank you! We'll get back to you within 24 hours.",
            data: { name }
        });

    } catch (error) {
        console.error('[Contact] Server error:', error);
        return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
    }
}

// GET is intentionally removed — no PII leak
