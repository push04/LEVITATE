import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { getEmailTemplate } from '@/lib/email-template';

export async function POST(request: Request) {
    try {
        const { isAuthenticated, userId } = await checkAdminAuth();
        if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { companyName, ownerName, ownerEmail, personalMessage } = body;

        if (!companyName || !ownerEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        const { data: company, error: companyError } = await supabase
            .from('companies')
            .insert({ name: companyName })
            .select()
            .single();

        if (companyError) throw companyError;

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { error: inviteError } = await supabase
            .from('invitations')
            .insert({
                email: ownerEmail,
                role: 'business',
                name: ownerName,
                company_id: company.id,
                invited_by: userId ?? null,
                token,
                expires_at: expiresAt.toISOString()
            });

        if (inviteError) throw inviteError;

        const inviteLink = `https://levitatelabs.online/invite?token=${token}`;

        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });

            const messageBody = personalMessage || `You have been exclusively invited to join Levitate Labs as a <strong>Company Partner</strong>.<br/><br/>We're excited to onboard <strong>${companyName}</strong> to our ecosystem.<br/><br/><em>This link is valid for 7 days.</em>`;

            const htmlContent = getEmailTemplate({
                title: 'Welcome to Levitate Labs',
                recipientName: ownerName || 'Partner',
                message: messageBody,
                ctaText: 'Accept Invitation',
                ctaLink: inviteLink,
                footerText: `Best Regards,\nHarsh & Pushpal,\nFounders, LevitateLabs`
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM
                    ? `"Team LevitateLabs" <${process.env.SMTP_FROM.replace(/^.*<|>.*$/g, '')}>`
                    : '"Team LevitateLabs" <noreply@levitate-os.com>',
                to: ownerEmail,
                subject: `Invitation to join Levitate Labs - ${companyName}`,
                html: htmlContent,
            });
        }

        return NextResponse.json({ success: true, link: inviteLink });
    } catch (error: unknown) {
        console.error('Invite company error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Invite company failed' }, { status: 500 });
    }
}
