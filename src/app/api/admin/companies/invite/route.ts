import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getEmailTemplate } from '@/lib/email-template';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Check if user is admin
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { companyName, ownerName, ownerEmail, personalMessage } = body;

        if (!companyName || !ownerEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Create Company
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .insert({
                name: companyName,
                // owner_id will be set when they accept
            })
            .select()
            .single();

        if (companyError) throw companyError;

        // 2. Create Invitation
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const { error: inviteError } = await supabase
            .from('invitations')
            .insert({
                email: ownerEmail,
                role: 'business',
                name: ownerName,
                company_id: company.id,
                invited_by: session.user.id,
                token,
                expires_at: expiresAt.toISOString()
            });

        if (inviteError) throw inviteError;

        // 3. Send Email
        const inviteLink = `https://levitatelabs.online/invite?token=${token}`;

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Use personal message if provided, otherwise default
        const messageBody = personalMessage || `You have been exclusively invited to join Levitate Labs as a <strong>Company Partner</strong>.
            <br/><br/>
            We're excited to onboard <strong>${companyName}</strong> to our ecosystem. As a partner, you'll get access to our advanced project management and growth tools.
            <br/><br/>
            Please accept this invitation to set up your company profile and dashboard.
            <br/><br/>
            <em>This link is valid for 7 days.</em>`;

        const htmlContent = getEmailTemplate({
            title: 'Welcome to Levitate Labs',
            recipientName: ownerName || 'Partner',
            message: messageBody,
            ctaText: 'Accept Invitation',
            ctaLink: inviteLink,
            footerText: `Best Regards,\nHarsh & Pushpal,\nFounders, LevitateLabs`
        });

        await transporter.sendMail({
            from: process.env.SMTP_FROM ? `"Team LevitateLabs" <${process.env.SMTP_FROM.replace(/^.*<|>.*$/g, '')}>` : '"Team LevitateLabs" <noreply@levitate-os.com>',
            to: ownerEmail,
            subject: `Invitation to join Levitate Labs - ${companyName}`,
            html: htmlContent,
        });

        return NextResponse.json({ success: true, link: inviteLink });
    } catch (error: unknown) {
        console.error('Invite company error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Invite company failed' }, { status: 500 });
    }
}
