import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { validateSafeHttpUrl } from '@/lib/url-safety';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

// -- Auth guard: only admin/sales roles may trigger scraping --
async function getSessionRole() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    return profile?.role ?? null;
}

export async function POST(req: Request) {
    const role = await getSessionRole();
    if (!role || !['super_admin', 'admin', 'manager', 'sales'].includes(role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const encoder = new TextEncoder();

interface SearchResult {
    title: string;
    url: string;
    description: string;
}

// Helper to validate email
const isValidEmail = (email: string) => {
    if (!email || email.length > 80 || email.length < 5) return false;
    const lower = email.toLowerCase();
    const invalidPatterns = [
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.js', '.css', // Assets
        'sentry', 'noreply', 'no-reply', 'domain', 'example', 'hostmaster', // Placeholders
        'bootstrap', 'react', 'webpack', 'node_modules', 'polyfill', // Tech junk
        'wix', 'squarespace', 'godaddy', 'wordpress', // CMS defaults
        'booking.com', 'hotels.com', 'tripadvisor', // Aggregator emails
        'u00', '20%', '202', '3a', // Encoding artifacts
        'test', 'user', 'admin' // Generic
    ];
    return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email) &&
        !invalidPatterns.some(p => lower.includes(p));
};

// Helper to extract emails from text
const extractEmails = (text: string): string[] => {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const matches = text.match(emailRegex) || [];
    return [...new Set(matches.filter(isValidEmail))]; // Dedupe
};

// Helper to extract phone numbers
const extractPhones = (text: string): string[] => {
    const phoneRegex = /(?:\+?\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/g;
    const matches = text.match(phoneRegex) || [];
    return [...new Set(matches.filter(p => {
        const digits = p.replace(/\D/g, '');
        return digits.length >= 10 && !p.startsWith('202') && p.length < 20;
    }))];
};

// Random delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


    const stream = new ReadableStream({
        async start(controller) {
            const sendUpdate = (type: 'log' | 'progress' | 'result' | 'error' | 'done', data: any) => {
                const message = JSON.stringify({ type, data }) + '\n';
                controller.enqueue(encoder.encode(message));
            };

            sendUpdate('log', 'Connection established. Initializing Hunter Protocol v7.0 (Data Tsunami)...');
            sendUpdate('progress', 5);

            try {
                const { niche, location, deepScan } = await req.json();

                if (!niche || !location) {
                    sendUpdate('error', 'Niche and Location are required');
                    controller.close();
                    return;
                }

                // DATA TSUNAMI STRATEGY: 15+ Variations to force maximum results
                const modifiers = [
                    '', // Base
                    'contact',
                    'contact us',
                    'email address',
                    'phone number',
                    'about us',
                    'reviews',
                    'services',
                    'pricing',
                    'best',
                    'top rated',
                    'near me',
                    'official site',
                    'website',
                    'business'
                ];

                // Shuffle modifiers and cap probes to reduce abuse/DoS risk
                const selectedModifiers = modifiers.sort(() => 0.5 - Math.random()).slice(0, 8);

                const queries = selectedModifiers.map(mod => `${niche} ${location} ${mod}`.trim());
                // Add site specific
                queries.push(`site:.com ${niche} ${location}`);
                queries.push(`site:.net ${niche} ${location}`);

                sendUpdate('log', `Launching Tsunami Search (${queries.length} Parallel Probes)...`);
                sendUpdate('progress', 10);

                // 1. Discovery Phase
                let results: SearchResult[] = [];
                try {
                    const fetchResults = async (q: string) => {
                        try {
                            // Randomize User Agent specifically for each request
                            const agents = [
                                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
                                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
                            ];
                            const agent = agents[Math.floor(Math.random() * agents.length)];

                            // Staggered delay to avoid massive burst
                            await delay(Math.floor(Math.random() * 2000));

                            const res = await fetch(`https://html.duckduckgo.com/html?q=${encodeURIComponent(q)}`, {
                                headers: {
                                    'User-Agent': agent,
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                    'Referer': 'https://www.google.com/'
                                }
                            });
                            if (!res.ok) return [];
                            const html = await res.text();
                            const $ = cheerio.load(html);
                            const extracted: SearchResult[] = [];
                            $('.result__a').each((i: number, el: any) => {
                                const title = $(el).text();
                                let url = $(el).attr('href');
                                if (url) {
                                    if (url.startsWith('//duckduckgo.com/l/?')) {
                                        const searchParams = new URLSearchParams(url.split('?')[1]);
                                        if (searchParams.get('uddg')) url = searchParams.get('uddg')!;
                                    }
                                    url = decodeURIComponent(url);
                                    extracted.push({ title, url, description: 'Found via Web Search' });
                                }
                            });
                            return extracted;
                        } catch (e) { return []; }
                    };

                    // Run in batches of 5 to avoid complete network saturation
                    const batchSize = 5;
                    for (let i = 0; i < queries.length; i += batchSize) {
                        const batch = queries.slice(i, i + batchSize);
                        const batchResults = await Promise.all(batch.map(q => fetchResults(q)));
                        results.push(...batchResults.flat());
                        sendUpdate('log', `  ... Wave ${Math.ceil((i + 1) / 5)} collected ${batchResults.flat().length} items.`);
                    }

                    // Flatten and dedupe by URL
                    const uniqueUrls = new Set();
                    results = results.filter(r => {
                        const lowerUrl = r.url.toLowerCase();
                        if (!lowerUrl.startsWith('http')) return false;
                        if (uniqueUrls.has(r.url)) return false;
                        uniqueUrls.add(r.url);
                        return true;
                    });

                    sendUpdate('log', `Discovery complete. MASSIVE haul: ${results.length} raw candidates.`);

                } catch (err: any) {
                    sendUpdate('error', `Search failed: ${err.message}`);
                    controller.close();
                    return;
                }

                sendUpdate('progress', 20);

                if (results.length === 0) {
                    sendUpdate('log', 'No results found. Try broadening your search.');
                    sendUpdate('done', null);
                    controller.close();
                    return;
                }

                // Minimal Filtering mostly for pure aggregators
                const strictBlocklist = [
                    'tripadvisor.', 'yelp.', 'yellowpages.', 'booking.com', 'expedia.',
                    'trivago.', 'makemytrip.', 'goibibo.', 'justdial.', 'sulekha.',
                    'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com' // Socials (unless user wants them?) - User likely wants websites
                ];

                let potentialLeads = [];
                for (const r of results) {
                    const lowerUrl = r.url.toLowerCase();
                    if (strictBlocklist.some(d => lowerUrl.includes(d))) continue;
                    potentialLeads.push(r);
                }

                // Cap targets to reduce abuse/DoS risk
                potentialLeads = potentialLeads.slice(0, 30);

                sendUpdate('log', `Processing ${potentialLeads.length} prioritized targets.`);
                sendUpdate('progress', 30);

                // 2. Deep Scan
                if (deepScan) {
                    let completed = 0;
                    const total = potentialLeads.length;
                    const concurrency = 3; // keep bounded

                    for (let i = 0; i < potentialLeads.length; i += concurrency) {
                        const batch = potentialLeads.slice(i, i + concurrency);

                        await Promise.all(batch.map(async (r) => {
                            const lead = {
                                title: r.title,
                                url: r.url,
                                description: r.description,
                                source: 'DuckDuckGo',
                                email: null as string | null,
                                phone: null as string | null,
                                score: 60
                            };

                            try {
                                const validated = validateSafeHttpUrl(lead.url);
                                if (!validated.ok) {
                                    lead.score = 0;
                                } else {

                                const controller = new AbortController();
                                const timeoutId = setTimeout(() => controller.abort(), 8000);

                                const response = await fetch(validated.url, {
                                    signal: controller.signal,
                                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                                });
                                clearTimeout(timeoutId);

                                if (response.ok) {
                                    const html = await response.text();
                                    const emails = extractEmails(html);
                                    const phones = extractPhones(html);

                                    if (emails.length > 0) lead.email = emails[0];
                                    if (phones.length > 0) lead.phone = phones[0];

                                    const $ = cheerio.load(html);
                                    const ogName = $('meta[property="og:site_name"]').attr('content');
                                    if (ogName && ogName.length < 50) lead.title = ogName;

                                    if (lead.email) {
                                        lead.score += 40;
                                        sendUpdate('log', `  OK: ${lead.title.substring(0, 15)}... (Email found)`);
                                    } else {
                                        // Silent log for space
                                    }

                                }
                            }
                            } catch (err: any) { }

                            sendUpdate('result', lead);
                            completed++;
                            // Update progress less frequently to reduce jitter
                            if (completed % 5 === 0) sendUpdate('progress', 30 + Math.floor((completed / total) * 70));
                        }));
                    }

                } else {
                    for (const r of potentialLeads) {
                        sendUpdate('result', {
                            title: r.title,
                            url: r.url,
                            description: r.description,
                            source: 'DuckDuckGo',
                            email: null,
                            phone: null,
                            score: 60
                        });
                    }
                    sendUpdate('progress', 100);
                }

                sendUpdate('log', 'Tsunami complete.');
                sendUpdate('done', null);
                controller.close();

            } catch (err: any) {
                sendUpdate('error', `Internal Error: ${err.message}`);
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' }
    });
}
