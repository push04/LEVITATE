import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import nodemailer from 'nodemailer';
import { getEmailTemplate } from '@/lib/email-template';

// Create a reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function POST(req: Request) {
    try {
        const supabase = await createClient(); // Use server client
        const { applicationId, department } = await req.json(); // Get department from body

        // 1. Get Application Details
        const { data: app, error: fetchError } = await supabase
            .from('career_applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (fetchError || !app) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 });
        }

        // 2. Update Status AND Department in DB
        const { error: updateError } = await supabase
            .from('career_applications')
            .update({
                status: 'hired',
                department: department || app.department // Update department if provided
            })
            .eq('id', applicationId);

        if (updateError) throw updateError;

        if (updateError) throw updateError;

        // 3. Generate Invite Token & Record
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Fetch Department (Optional - defaulting to null or specific if known, e.g. from app? No app doesn't have dept)
        // We'll just invite as 'employee' for now.
        const finalDepartment = department || app.department;

        await supabase
            .from('invitations')
            .insert({
                email: app.email,
                role: 'employee', // Default role
                name: app.full_name,
                token,
                expires_at: expiresAt.toISOString(),
                department: finalDepartment // Save department
            });

        const inviteLink = `https://levitatelabs.online/invite?token=${token}`;

        const htmlContent = getEmailTemplate({
            title: 'Welcome to the Family - Levitate Labs',
            recipientName: app.full_name.split(' ')[0],
            message: `We reviewed your interview${finalDepartment ? ` for the ${finalDepartment} track` : ''}. To keep it simple: We want you in the family.
            
            This isn't a job offer. It's an invitation to build, fail, learn, and succeed with us. As discussed, we operate on a 100% Transparency & Profit Share model.
            
            Next Steps:
            1. Click the button below to join the workspace.
            2. We'll schedule a quick "Vibe Check" call with the founders.
            3. You get access to our dashboard and start building.
            
            Let's make something incredible.`,
            ctaText: 'Join Workspace',
            ctaLink: inviteLink,
            footerText: `Best Regards,\nHarsh & Pushpal,\nFounders, LevitateLabs`
        });

        // 4. Send Email
        const mailOptions = {
            from: `"Team LevitateLabs" <${process.env.SMTP_FROM}>`,
            to: app.email,
            subject: "Welcome to the Family - Levitate Labs",
            html: htmlContent,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Approval Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
