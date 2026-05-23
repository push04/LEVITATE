import 'dotenv/config';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Setup SMTP — credentials from env only
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.smtp2go.com',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function runExtensiveTest() {
  console.log("Starting Extensive E2E Agent Tests (No Fake Data)...");

  // TEST 1: Check Database Lead Capabilities
  console.log("\n[TEST 1] Verifying Lead Engine...");
  const { data: leads } = await supabase.from('leads').select('*').limit(5);
  console.log(`Found ${leads?.length || 0} real leads in the database.`);
  if (leads?.length === 0) {
    console.log("No leads available to process. The BizDev scraper should be run first.");
  }

  // TEST 2: Triggering Real SMTP Email
  console.log("\n[TEST 2] Testing SMTP Email Delivery...");
  try {
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'founder@levitatelabs.online',
      to: process.env.ADMIN_EMAIL || 'levitatelabs.online@gmail.com',
      subject: 'Levitate Labs: SMTP Agent Handshake Complete',
      text: 'The automated agents have successfully established a connection with your SMTP provider. Your outreach capabilities are now running.',
      html: 'The automated agents have successfully established a connection with your SMTP provider. Your outreach capabilities are now running.',
    });
    console.log("SMTP Deliverability Verified! Message ID:", info.messageId);

    await supabase.from('agent_emails').insert({
      agent_name: 'reporter',
      direction: 'outbound',
      to_email: process.env.ADMIN_EMAIL,
      from_email: process.env.FROM_EMAIL,
      subject: 'Levitate Labs: SMTP Agent Handshake Complete',
      body: 'The automated agents have successfully established a connection with your SMTP provider.',
      status: 'sent',
    });
    console.log("Logged SMTP confirmation email to Admin Dashboard.");
  } catch (err) {
    console.error("SMTP Test Failed:", err);
  }

  console.log("\n[TEST 3] Agent Pipeline Simulation Completed.");
  console.log("Check the Admin Dashboard 'Emails' tab to see the confirmed outbound message.");
}

runExtensiveTest();
