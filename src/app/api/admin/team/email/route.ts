import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getEmailTemplate } from '@/lib/email-template';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Auth Check
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: requester } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (!requester || !['super_admin', 'admin', 'manager'].includes(requester.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { userId, subject, message, template } = body;

        // Fetch User Email
        const { data: targetUser } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single();
        if (!targetUser || !targetUser.email) {
            return NextResponse.json({ error: 'User email not found' }, { status: 404 });
        }

        // Configure Transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Templates
        // Generate Template
        const htmlContent = getEmailTemplate({
            title: template === 'announcement' ? 'Announcement' :
                template === 'warning' ? 'Action Required' : 'Message from Team',
            subtitle: template === 'announcement' ? 'Important Update' : undefined,
            recipientName: targetUser.full_name || 'Team Member',
            message: message,
            warning: template === 'warning'
        });

        // Determine Sender
        let from = process.env.SMTP_FROM || '"Levitate Admin" <noreply@levitate-os.com>';

        // Custom logic for Announcements from Super Admin
        if (template === 'announcement' && requester.role === 'super_admin') {
            const emailAddress = process.env.SMTP_FROM?.match(/<(.+)>/)?.[1] || process.env.SMTP_FROM;
            from = `"Announcement" <${emailAddress}>`;
        } else if (template === 'warning') {
            const emailAddress = process.env.SMTP_FROM?.match(/<(.+)>/)?.[1] || process.env.SMTP_FROM;
            from = `"Levitate Security" <${emailAddress}>`;
        }

        const mailOptions = {
            from,
            to: targetUser.email,
            subject: subject || (template === 'announcement' ? 'Important Announcement' : 'Message from Levitate Labs'),
            html: htmlContent,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Email User Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
