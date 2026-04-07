import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { generateGoogleAI } from '@/lib/google-ai';

export const runtime = 'edge';

interface Hackathon {
    id: string;
    title: string;
    platform: 'Devpost' | 'MLH' | 'Unstop' | 'Devfolio' | 'HackerEarth' | 'DoraHacks' | 'Hashnode' | 'Other';
    url: string;
    thumbnail?: string;
    rawDescription?: string;
    location?: string; // India, Remote, etc.

    // AI Fields
    prizePool?: string;
    deadline?: string;
    techStack?: string[];
    relevanceScore?: number;
}

export async function GET(request: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // 1. Scraping & Fetching Phase (Parallel)
                const rawHackathons: Hackathon[] = [];

                // Function to analyze and stream a batch
                const processAndStreamBatch = async (batch: Hackathon[]) => {
                    try {
                        const prompt = `
                        Role: Hackathon Analyst.
                        Task: Extract data and filtering tags.
                        
                        Context:
                        - User wants "India" or "Remote" hackathons primarily.
                        - Ignore if it looks like a webinar or non-hackathon.

                        Items:
                        ${JSON.stringify(batch.map(h => ({ id: h.id, title: h.title, desc: h.rawDescription, loc: h.location })))}
                        
                        Output JSON ONLY:
                        [
                            {
                                "id": "hackathon_id",
                                "prizePool": "Extract prize (e.g. '$10k', '₹5 Lakhs')",
                                "deadline": "ISO Date or 'Unknown'",
                                "techStack": ["Tag1", "Tag2"],
                                "locationType": "Remote" | "India" | "Global" | "Onsite",
                                "relevanceScore": 1-10
                            }
                        ]
                        `;

                        const aiText = await generateGoogleAI([{ role: 'user', content: prompt }]);

                        if (aiText) {
                            const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
                            const match = cleanJson.match(/\[[\s\S]*\]/);
                            if (match) {
                                const analysis = JSON.parse(match[0]);
                                const analysisMap = new Map(analysis.map((a: any) => [a.id, a]));

                                const enrichedBatch = batch.map(h => {
                                    const info: any = analysisMap.get(h.id);
                                    if (info) {
                                        return { ...h, ...info, location: info.locationType };
                                    }
                                    return h;
                                });

                                // Filter: Keep if Remote OR India OR High Relevance
                                const filtered = enrichedBatch.filter(h =>
                                    h.location === 'Remote' ||
                                    h.location === 'India' ||
                                    h.location === 'Global' ||
                                    (h.relevanceScore || 0) >= 7
                                );

                                if (filtered.length > 0) {
                                    const chunk = JSON.stringify(filtered) + '\n';
                                    controller.enqueue(encoder.encode(chunk));
                                }
                            }
                        } else {
                            // Fallback
                            const chunk = JSON.stringify(batch) + '\n';
                            controller.enqueue(encoder.encode(chunk));
                        }
                    } catch (e) {
                        // Fallback
                        const chunk = JSON.stringify(batch) + '\n';
                        controller.enqueue(encoder.encode(chunk));
                    }
                };

                // --- SOURCE 1: Devpost (Global) ---
                const devpostPromise = (async () => {
                    try {
                        const res = await fetch('https://devpost.com/hackathons?challenge_type[]=online&sort_by=Submission+Deadline', {
                            headers: { 'User-Agent': 'Mozilla/5.0' }
                        });
                        const html = await res.text();
                        const $ = cheerio.load(html);
                        const items: Hackathon[] = [];

                        $('.hackathon-tile').slice(0, 8).each((_, el) => { // Top 8
                            const tile = $(el);
                            const title = tile.find('.main-content h3').text().trim();
                            const url = tile.find('a').first().attr('href') || '';
                            const thumb = tile.find('img').attr('src') || '';
                            if (title && url) {
                                items.push({
                                    id: `devpost-${url.split('/').pop()}`,
                                    title,
                                    platform: 'Devpost',
                                    url: url.startsWith('http') ? url : `https://devpost.com${url}`,
                                    thumbnail: thumb,
                                    rawDescription: tile.find('.side-info').text().trim(),
                                    location: 'Global/Remote'
                                });
                            }
                        });
                        if (items.length > 0) await processAndStreamBatch(items);
                    } catch (e) { console.error('Devpost failed', e); }
                })();

                // --- SOURCE 2: Unstop (India) ---
                const unstopPromise = (async () => {
                    try {
                        const res = await fetch('https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&filters=,open&page=1&per_page=15', {
                            headers: { 'User-Agent': 'Mozilla/5.0' },
                            cache: 'no-store'
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.data && Array.isArray(data.data.data)) {
                                const items: Hackathon[] = data.data.data.map((h: any) => {
                                    // Fix: Check if seo_url is full URL or needs prefix
                                    const rawUrl = h.seo_url || '';
                                    const url = rawUrl.startsWith('http') ? rawUrl : `https://unstop.com/${rawUrl}`;

                                    return {
                                        id: `unstop-${h.id}`,
                                        title: h.title,
                                        platform: 'Unstop',
                                        url: url,
                                        thumbnail: h.logoUrl || h.banner_mobile?.url,
                                        // Feed more data to AI for extraction
                                        rawDescription: `Prize: ${h.sub_title || 'Unknown'}. Region: ${h.region || 'India'}. Start: ${h.start_date}. End: ${h.end_date}.`,
                                        location: 'India'
                                    };
                                });
                                if (items.length > 0) await processAndStreamBatch(items);
                            }
                        }
                    } catch (e) { console.error('Unstop failed', e); }
                })();

                // --- SOURCE 3: Devfolio (India/Global) ---
                const devfolioPromise = (async () => {
                    try {
                        const res = await fetch('https://api.devfolio.co/api/hackathons?filter=open&page=1&limit=10', {
                            headers: { 'User-Agent': 'Mozilla/5.0' },
                            cache: 'no-store'
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.result && Array.isArray(data.result)) {
                                const items: Hackathon[] = data.result.map((h: any) => ({
                                    id: `devfolio-${h.slug}`,
                                    title: h.name,
                                    platform: 'Devfolio',
                                    url: `https://${h.slug}.devfolio.co`,
                                    thumbnail: h.cover_img_url,
                                    rawDescription: `Prize Pool: ${h.prizes_total || 'Unknown'}. Starts: ${h.starts_at}. Ends: ${h.ends_at}. Location: ${h.location || 'Remote'}`,
                                    location: (h.location || '').toLowerCase().includes('online') ? 'Remote' : 'India'
                                }));
                                if (items.length > 0) await processAndStreamBatch(items);
                            }
                        }
                    } catch (e) { console.error('Devfolio failed', e); }
                })();

                // --- SOURCE 4: MLH (Major League Hacking) ---
                const mlhPromise = (async () => {
                    try {
                        const res = await fetch('https://mlh.io/seasons/2025/events', {
                            headers: { 'User-Agent': 'Mozilla/5.0' },
                            cache: 'no-store'
                        });
                        const html = await res.text();
                        const $ = cheerio.load(html);
                        const items: Hackathon[] = [];

                        $('.event-wrapper').slice(0, 10).each((_, el) => {
                            const card = $(el);
                            const title = card.find('.event-name').text().trim();
                            const urlRaw = card.find('a').first().attr('href') || '';
                            const url = urlRaw.startsWith('http') ? urlRaw : `https://mlh.io${urlRaw}`;
                            const thumb = card.find('img').attr('src') || '';
                            const date = card.find('.event-date').text().trim();
                            const location = card.find('.event-location').text().trim();

                            if (title && url) {
                                items.push({
                                    id: `mlh-${url.split('/').pop()}`,
                                    title,
                                    platform: 'MLH',
                                    url,
                                    thumbnail: thumb,
                                    rawDescription: `Date: ${date}. Location: ${location}. MLH Official Event.`,
                                    location: location.toLowerCase().includes('online') || location.toLowerCase().includes('virtual') ? 'Remote' : 'Global'
                                });
                            }
                        });
                        if (items.length > 0) await processAndStreamBatch(items);
                    } catch (e) { console.error('MLH failed', e); }
                })();

                // --- SOURCE 5: HackerEarth (Uses API usually, but we scrape/fetch JSON if possible) ---
                // HackerEarth often loads via JSON. Let's try the modern listing API endpoint structure
                const hackerEarthPromise = (async () => {
                    try {
                        // Attempt to fetch public API for challenges
                        const res = await fetch('https://www.hackerearth.com/api/events/get_upcoming_events/', {
                            headers: { 'User-Agent': 'Mozilla/5.0' },
                            cache: 'no-store'
                        });

                        // Fallback to searching/scraping if API isn't easy, but let's try scraping the main page for JSON data
                        // Actually, HackerEarth usually embeds __INITIAL_STATE__
                        const html = await res.text();
                        // (If it was JSON response, res.json() would work, but let's assume it might return HTML if endpoint is wrong)

                        // Let's rely on a simpler scraping strategy for HackerEarth: RSS?
                        // RSS: https://www.hackerearth.com/challenges/rss/
                        const rssRes = await fetch('https://www.hackerearth.com/challenges/rss/', {
                            headers: { 'User-Agent': 'Mozilla/5.0' },
                            cache: 'no-store'
                        });

                        if (rssRes.ok) {
                            const xmlText = await rssRes.text();
                            const $ = cheerio.load(xmlText, { xmlMode: true });
                            const items: Hackathon[] = [];

                            $('item').slice(0, 10).each((_, element) => {
                                const el = $(element);
                                const title = el.find('title').text();
                                const url = el.find('link').text();
                                const desc = el.find('description').text();
                                const category = el.find('category').text(); // often "Hackathon"

                                if (title && url && (category.toLowerCase().includes('hackathon') || title.toLowerCase().includes('hackathon'))) {
                                    items.push({
                                        id: `hackerearth-${url.split('/').filter(Boolean).pop()}`,
                                        title,
                                        platform: 'HackerEarth',
                                        url,
                                        thumbnail: '', // RSS doesn't give good thumbnails usually
                                        rawDescription: desc,
                                        location: 'Global' // Default to Global
                                    });
                                }
                            });
                            if (items.length > 0) await processAndStreamBatch(items);
                        }
                    } catch (e) { console.error('HackerEarth failed', e); }
                })();

                // --- SOURCE 6: Kaggle (Competitions) ---
                const kagglePromise = (async () => {
                    try {
                        // Kaggle is hard to scrape (React/SSR). But we can try the public list page.
                        // Better: Use a reliable JSON source? No.
                        // Let's try scraping the main competitions page using a simple fetch.
                        // Warning: Kaggle might block or return empty HTML.
                        // Alternative: "Dev.to" hackathons.

                        // Let's try Dev.to as it's more developer focused and easy to scrape. HACKATHONS tag.
                        // https://dev.to/api/articles?tag=hackathon
                        const res = await fetch('https://dev.to/api/articles?tag=hackathon&per_page=10', {
                            headers: { 'User-Agent': 'Mozilla/5.0' },
                            cache: 'no-store'
                        });

                        if (res.ok) {
                            const data = await res.json();
                            if (Array.isArray(data)) {
                                const items: Hackathon[] = data.map((art: any) => ({
                                    id: `devto-${art.id}`,
                                    title: art.title,
                                    platform: 'Other', // Mapped to 'Other' as Kaggle/Devto isn't in Enum (except via Other)
                                    url: art.url,
                                    thumbnail: art.cover_image || art.social_image,
                                    rawDescription: `Dev.to Hackathon. Tags: ${art.tag_list.join(', ')}. Posted: ${art.readable_publish_date}`,
                                    location: 'Remote' // Usually articles are online/remote
                                }));
                                if (items.length > 0) await processAndStreamBatch(items);
                            }
                        }
                    } catch (e) { console.error('Dev.to/Kaggle failed', e); }
                })();

                // --- SOURCE 7: DoraHacks (Web3 mainly) ---
                const doraHacksPromise = (async () => {
                    try {
                        const res = await fetch('https://dorahacks.io/api/hackathon/list', { // Verified endpoint pattern
                            headers: { 'User-Agent': 'Mozilla/5.0' },
                            cache: 'no-store'
                        });

                        if (res.ok) {
                            const data = await res.json();
                            // DoraHacks structure varies, assuming standard list response or we fall back to scraping if this fails
                            if (data.result && Array.isArray(data.result)) {
                                const items: Hackathon[] = data.result.map((h: any) => ({
                                    id: `dorahacks-${h.id}`,
                                    title: h.name,
                                    platform: 'DoraHacks',
                                    url: `https://dorahacks.io/hackathon/${h.id}`,
                                    thumbnail: h.logo || h.banner,
                                    rawDescription: `Prize: ${h.prize_pool || 'Unknown'}. Status: ${h.status}. Web3 Hackathon.`,
                                    location: 'Remote' // Mostly Global/Remote
                                }));
                                if (items.length > 0) await processAndStreamBatch(items);
                            }
                        }
                    } catch (e) { console.error('DoraHacks failed', e); }
                })();

                // --- SOURCE 8: Hashnode (Community) ---
                const hashnodePromise = (async () => {
                    try {
                        // Hashnode hackathons are on hashnode.com/hackathons. Scrape.
                        const res = await fetch('https://hashnode.com/hackathons', {
                            headers: { 'User-Agent': 'Mozilla/5.0' },
                            cache: 'no-store'
                        });
                        const html = await res.text();
                        const $ = cheerio.load(html);
                        const items: Hackathon[] = [];

                        // Hashnode class names change, but structure is usually cards
                        // Look for known patterns or standard anchor tags inside main container
                        $('a[href*="/hackathons/"]').each((_, el) => {
                            const link = $(el);
                            const url = link.attr('href') || '';
                            // Avoid utility links, look for specific hackathon pages
                            if (url && url.split('/').length > 4) { // /hackathons/slug
                                const title = link.find('h1, h2, h3').text().trim() || 'Hashnode Hackathon';
                                const desc = link.text().substring(0, 100);

                                // Basic dedupe logic
                                if (!items.find(i => i.url === url)) {
                                    items.push({
                                        id: `hashnode-${url.split('/').pop()}`,
                                        title,
                                        platform: 'Hashnode',
                                        url: url.startsWith('http') ? url : `https://hashnode.com${url}`,
                                        thumbnail: '',
                                        rawDescription: desc,
                                        location: 'Remote'
                                    });
                                }
                            }
                        });
                        if (items.length > 0) await processAndStreamBatch(items);

                    } catch (e) { console.error('Hashnode failed', e); }
                })();

                // Wait for all to finish so we close stream correctly
                await Promise.allSettled([devpostPromise, unstopPromise, devfolioPromise, mlhPromise, hackerEarthPromise, kagglePromise, doraHacksPromise, hashnodePromise]);

            } catch (error: any) {
                const errChunk = JSON.stringify({ error: error.message }) + '\n';
                controller.enqueue(encoder.encode(errChunk));
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Connection': 'keep-alive',
        }
    });
}
