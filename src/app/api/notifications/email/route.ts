import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import { checkAdminAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const auth = await checkAdminAuth(request);
    if (!auth.isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { to, subject, html } = await request.json();

        if (!to || !subject || !html) {
            return NextResponse.json({ error: 'Missing required fields: to, subject, html' }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Use a consistent "System" sender or generic name
        const senderName = 'Levitate Labs Notification';
        const senderEmail = process.env.SMTP_FROM || 'admin@levitatelabs.online';

        const info = await transporter.sendMail({
            from: `"${senderName}" <${senderEmail}>`,
            to,
            subject,
            html,
        });

        console.log('Email sent:', info.messageId);

        return NextResponse.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
        console.error('Email Send Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
