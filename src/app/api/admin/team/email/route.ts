import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { getEmailTemplate } from '@/lib/email-template';

export async function POST(request: Request) {
    try {
        const { isAuthenticated, role } = await checkAdminAuth();
        if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { userId, subject, message, template } = body;

        const supabase = getServiceSupabase();
        const { data: targetUser } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single();
        if (!targetUser || !targetUser.email) {
            return NextResponse.json({ error: 'User email not found' }, { status: 404 });
        }

        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return NextResponse.json({ error: 'SMTP not configured' }, { status: 500 });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });

        const htmlContent = getEmailTemplate({
            title: template === 'announcement' ? 'Announcement' :
                   template === 'warning' ? 'Action Required' : 'Message from Team',
            subtitle: template === 'announcement' ? 'Important Update' : undefined,
            recipientName: targetUser.full_name || 'Team Member',
            message,
            warning: template === 'warning'
        });

        const emailAddress = process.env.SMTP_FROM?.match(/<(.+)>/)?.[1] || process.env.SMTP_FROM;
        let from = process.env.SMTP_FROM || '"Levitate Admin" <noreply@levitate-os.com>';
        if (template === 'announcement' && role === 'super_admin') {
            from = `"Announcement" <${emailAddress}>`;
        } else if (template === 'warning') {
            from = `"Levitate Security" <${emailAddress}>`;
        }

        await transporter.sendMail({
            from,
            to: targetUser.email,
            subject: subject || (template === 'announcement' ? 'Important Announcement' : 'Message from Levitate Labs'),
            html: htmlContent,
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Email User Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
    }
}
