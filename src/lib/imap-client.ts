import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

export interface EmailMessage {
    id: string; // Message-ID
    seqno: number;
    from: string;
    fromName: string;
    to: string; // Just taking the first 'to' for simplicity in this MVP
    subject: string;
    text: string;
    html: string;
    date: Date;
    flags: string[];
}

const config = {
    imap: {
        user: process.env.IMAP_USER || '',
        password: process.env.IMAP_PASS || '',
        host: process.env.IMAP_HOST || '',
        port: parseInt(process.env.IMAP_PORT || '993'),
        tls: process.env.IMAP_TLS === 'true',
        tlsOptions: process.env.IMAP_ALLOW_INSECURE_TLS === 'true' ? { rejectUnauthorized: false } : undefined,
        authTimeout: 10000,
    },
};

export async function fetchRecentEmails(limit = 20): Promise<EmailMessage[]> {
    if (!config.imap.user || !config.imap.password || !config.imap.host) {
        console.error('IMAP configuration missing');
        return [];
    }

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // Fetch last 'limit' messages
        // We can search for UNSEEN or just fetch recent
        const searchCriteria = ['ALL']; // For MVP, let's fetch all (limit applies to fetching)
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''], // Empty string means full body
            markSeen: false,
            struct: true
        };

        // Get the total number of messages to calculate range
        // imap-simple doesn't expose total count easily in search, 
        // but it does return all UIDs for search. 
        // Let's rely on retrieving messages and then processing.
        // Optimization: '1:*' gives all. We can use logic to get last N.

        // Actually, imap-simple search returns Message objects with attributes.
        // Let's toggle to getting the last N messages by sequence number if possible.
        // Or just search ['ALL'] and slice the result. (Not efficient for huge inboxes, but fine for MVP)
        // Better: search [['SINCE', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]] // Last 7 days

        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 7); // Last 7 days

        const messages = await connection.search(['ALL', ['SINCE', sinceDate]], fetchOptions);

        // Process messages
        const parsedEmails: EmailMessage[] = [];

        // Reverse to get newest first, then slice
        const recentMessages = messages.reverse().slice(0, limit);

        for (const item of recentMessages) {
            const all = item.parts.find((part: any) => part.which === '');
            const id = item.attributes.date.toISOString() + item.attributes.uid;

            if (all) {
                const parsed = await simpleParser(all.body);

                parsedEmails.push({
                    id: parsed.messageId || id,
                    seqno: item.seqno,
                    from: parsed.from?.value[0]?.address || 'unknown',
                    fromName: parsed.from?.value[0]?.name || 'Unknown',
                    to: Array.isArray(parsed.to) ? parsed.to[0].address : (parsed.to as any)?.value?.[0]?.address || 'unknown',
                    subject: parsed.subject || '(No Subject)',
                    text: parsed.text || '',
                    html: parsed.html || parsed.textAsHtml || '',
                    date: parsed.date || new Date(),
                    flags: item.attributes.flags || []
                });
            }
        }

        connection.end();
        return parsedEmails;

    } catch (error) {
        console.error('IMAP Error:', error);
        return [];
    }
}
