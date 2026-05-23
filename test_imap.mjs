import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

const config = {
  imap: {
    user: 'levitatelabs.online@gmail.com', // Assuming this is the Gmail based on previous data
    password: process.env.IMAP_PASS,         // Set via env only
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 5000,
  },
};

async function testImap() {
  console.log('Testing IMAP connection...');
  try {
    const connection = await imaps.connect(config);
    console.log('IMAP Connected successfully!');
    
    await connection.openBox('INBOX');
    console.log('Opened INBOX.');
    
    const searchCriteria = ['ALL'];
    const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], markSeen: false, struct: true };
    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`Found ${messages.length} messages.`);
    
    connection.end();
  } catch (err) {
    console.error('IMAP Test Failed:', err.message);
    if (err.message.includes('Invalid credentials')) {
      console.log('NOTE: Gmail requires an "App Password" if 2FA is enabled, or "Less secure apps" enabled if it is not.');
    }
  }
}

testImap();
