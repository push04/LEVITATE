import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { getEmailTemplate } from '@/lib/email-template';

// Use a direct Supabase client with Service Role Key for Admin operations
// We need this to write to 'password_resets' if RLS blocks public, 
// and potentially to check users without RLS.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // 1. Check if user exists (Optional, but good UX/Security balance)
        // We can skip this if we want to prevent enumeration, but for internal apps, better to check.
        const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
        const user = users?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (!user) {
            // Fake success to prevent enumeration
            return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
        }

        // 2. Generate Token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now

        // 3. Save to DB
        const { error: dbError } = await supabaseAdmin
            .from('password_resets')
            .insert({
                email: email.toLowerCase(),
                token,
                expires_at: expiresAt.toISOString(),
                used: false
            });

        if (dbError) {
            console.error('DB Error:', dbError);
            return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
        }

        // 4. Send Email
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false // Fix for self-signed certs
            }
        });

        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Levitate Support" <support@levitatelabs.com>',
            to: email,
            subject: 'Reset Your Password - Levitate Labs',
            html: getEmailTemplate({
                title: 'Password Reset Request',
                recipientName: 'User',
                message: `You requested a password reset for your Levitate Labs account.
                
                Click the button below to reset your password.
                
                <em>This link is valid for 1 hour.</em>`,
                ctaText: 'Reset Password',
                ctaLink: resetLink,
                footerText: 'If you didn\'t request this, you can ignore this email.\nTeam Levitate Labs',
                warning: true
            })
        });

        return NextResponse.json({ success: true, message: 'Reset link sent' });

    } catch (error: any) {
        console.error('Forgot Password Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
