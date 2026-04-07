import { notifyFounder } from './src/lib/email/client';

async function main() {
    process.env.NODE_ENV = 'development';
    // Trying to load from .env.local manually if running outside nextjs
    try {
        const fs = require('fs');
        const dotenv = require('dotenv');
        if (fs.existsSync('.env.local')) {
            const envConfig = dotenv.parse(fs.readFileSync('.env.local'))
            for (const k in envConfig) {
                process.env[k] = envConfig[k]
            }
        } else if (fs.existsSync('.env')) {
            const envConfig = dotenv.parse(fs.readFileSync('.env'))
            for (const k in envConfig) {
                process.env[k] = envConfig[k]
            }
        }
    } catch(e) {}

    console.log("Loaded SMTP Host:", process.env.SMTP_HOST);
    console.log("Sending test email using notifyFounder...");
    const success = await notifyFounder("Test Email from AI Agent", "Hello! This is a test email sent from the Levitate framework to verify that the email functionality is working correctly.");
    
    if (success) {
        console.log("Email executed successfully (it might take a moment to arrive).");
    } else {
        console.log("Failed to send email. Check your SMTP configuration.");
    }
}

main().catch(console.error);
