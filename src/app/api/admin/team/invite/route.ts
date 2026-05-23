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
            .select('role, full_name')
            .eq('id', session.user.id)
            .single();

        if (!profile || !['super_admin', 'admin', 'manager'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { email, role, department_id, name } = body;

        if (!email || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Generate invite token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        // Insert invitation
        const { data, error } = await supabase
            .from('invitations')
            .insert({
                email,
                role,
                department_id,
                name: name || null, // Store name if provided
                invited_by: session.user.id,
                token,
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Send Email
        // Fetch department name for email
        let deptName = 'the team';
        if (department_id) {
            const { data: dept } = await supabase.from('departments').select('name').eq('id', department_id).single();
            if (dept) deptName = dept.name;
        }

        // Send Email with Premium Template
        // FORCE PRODUCTION URL: We always want invites to go to the live site, even when sent from local dev.
        const inviteLink = `https://levitatelabs.online/invite?token=${token}`;

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const htmlContent = getEmailTemplate({
            title: 'Welcome to Levitate Labs',
            recipientName: name || 'Future Teammate',
            message: `I'm excited to invite you to join our workspace at Levitate Labs.
            
            You've been invited to join the ${deptName} department. We've set up your account, and all you need to do is accept this invitation to set your password and get started.
            
            This link is valid for 7 days.`,
            ctaText: 'Accept Invitation',
            ctaLink: inviteLink,
            footerText: `Best Regards,\nHarsh & Pushpal,\nFounders, LevitateLabs`
        });

        const mailOptions = {
            from: process.env.SMTP_FROM ? `"Team LevitateLabs" <${process.env.SMTP_FROM.replace(/^.*<|>.*$/g, '')}>` : '"Team LevitateLabs" <noreply@levitate-os.com>',
            to: email,
            subject: 'Invitation to join Levitate Labs',
            html: htmlContent,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, link: inviteLink });
    } catch (error: unknown) {
        console.error('Invite error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
