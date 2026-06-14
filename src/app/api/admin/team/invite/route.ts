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
        const { email, role, department_id, name } = body;

        if (!email || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('invitations')
            .insert({
                email,
                role,
                department_id,
                name: name || null,
                invited_by: userId ?? null,
                token,
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        let deptName = 'the team';
        if (department_id) {
            const { data: dept } = await supabase.from('departments').select('name').eq('id', department_id).single();
            if (dept) deptName = dept.name;
        }

        const inviteLink = `https://levitatelabs.online/invite?token=${token}`;

        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });

            const htmlContent = getEmailTemplate({
                title: 'Welcome to Levitate Labs',
                recipientName: name || 'Future Teammate',
                message: `I'm excited to invite you to join our workspace at Levitate Labs.\n\nYou've been invited to join the ${deptName} department. This link is valid for 7 days.`,
                ctaText: 'Accept Invitation',
                ctaLink: inviteLink,
                footerText: `Best Regards,\nHarsh & Pushpal,\nFounders, LevitateLabs`
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM
                    ? `"Team LevitateLabs" <${process.env.SMTP_FROM.replace(/^.*<|>.*$/g, '')}>`
                    : '"Team LevitateLabs" <noreply@levitate-os.com>',
                to: email,
                subject: 'Invitation to join Levitate Labs',
                html: htmlContent,
            });
        }

        return NextResponse.json({ success: true, link: inviteLink });
    } catch (error: unknown) {
        console.error('Invite error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
    }
}
