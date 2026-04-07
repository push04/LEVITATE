const imaps = require('imap-simple');
require('dotenv').config({ path: '.env.local' });

const config = {
    imap: {
        user: process.env.IMAP_USER,
        password: process.env.IMAP_PASS,
        host: process.env.IMAP_HOST,
        port: parseInt(process.env.IMAP_PORT || '993'),
        tls: process.env.IMAP_TLS === 'true',
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
    },
};

async function testImap() {
    console.log('Testing IMAP connection...');
    console.log('User:', config.imap.user ? '***' : 'Missing');
    console.log('Host:', config.imap.host);

    try {
        const connection = await imaps.connect(config);
        console.log('Connected!');

        await connection.openBox('INBOX');
        console.log('Opened INBOX');

        const searchCriteria = ['ALL'];
        const fetchOptions = { bodies: ['HEADER'], markSeen: false };

        // Fetch last 5 messages
        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`Found ${messages.length} total messages in Inbox`);

        const recent = messages.slice(-5);

        recent.forEach(msg => {
            const subject = msg.parts[0].body.subject;
            const date = msg.attributes.date;
            console.log(`- [${date}] ${subject}`);
        });

        connection.end();
    } catch (error) {
        console.error('IMAP Failed:', error);
        console.error('Details:', JSON.stringify(error, null, 2));
    }
}

testImap();
