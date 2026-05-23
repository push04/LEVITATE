import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'mail.smtp2go.com',
  port: 2525,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'levitatelabs',
    pass: 'pushpal2004',
  },
});

async function testSMTP() {
  console.log('Testing SMTP connection...');
  try {
    const info = await transporter.verify();
    console.log('SMTP Connection Successful:', info);
  } catch (err) {
    console.error('SMTP Error:', err.message);
  }
}

testSMTP();
