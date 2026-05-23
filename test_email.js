const fs = require('fs');
let envFile = null;
if (fs.existsSync('.env.local')) envFile = '.env.local';
else if (fs.existsSync('.env')) envFile = '.env';

if (envFile) {
    const lines = fs.readFileSync(envFile, 'utf8').split('\n');
    for (const line of lines) {
        if (line && line.includes('=') && !line.startsWith('#')) {
            const [key, ...rest] = line.split('=');
            process.env[key.trim()] = rest.join('=').trim().replace(/(^"|"$)/g, "");
        }
    }
}

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function send() {
    try {
        const toEmail = process.env.SMTP_USER || 'founder@levitatelabs.online';
        console.log(`Sending email as ${process.env.SMTP_USER} to ${toEmail}...`);
        
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"Levitate Labs" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: 'Levitate AI - Test Email',
            text: 'Hello Pushp, this is a test email sent from Levitate to verify the background email scheduling functionality.',
        });
        console.log("Email sent successfully!");
    } catch (e) {
        console.error("Email sending failed:", e.message);
    }
}
send();
