
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { generateAIResponse, FREE_MODELS } from '@/lib/openrouter';
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

// Helper to determine if we are local or in production (Netlify/Vercel)
const isLocal = process.env.NODE_ENV === 'development';

export async function POST(request: Request) {
    try {
        const { city, category, limit = 5 } = await request.json();

        if (!city || !category) {
            return NextResponse.json({ success: false, error: 'City and Category are required' }, { status: 400 });
        }

        // 1. SCRAPING STAGE
        let scrapedLeads: any[] = [];

        try {
            console.log(`Attempting Puppeteer Scrape for ${category} in ${city}...`);
            scrapedLeads = await runPuppeteerScraper(city, category, limit);
        } catch (e) {
            console.error('Puppeteer crashed/failed:', e);
        }

        // 2. FALLBACK STAGE
        if (!scrapedLeads || scrapedLeads.length === 0) {
            console.log('Puppeteer yielded 0 results. Falling back to OpenStreetMap (Nominatim).');
            scrapedLeads = await fetchOSMData(city, category, limit);
        }

        if (!scrapedLeads || scrapedLeads.length === 0) {
            return NextResponse.json({ success: false, error: 'Could not find any leads even with fallback.' }, { status: 404 });
        }

        // 3. AI ENRICHMENT STAGE
        const enrichedLeads = await enrichLeadsWithAI(scrapedLeads);

        // 4. DATABASE SAVE STAGE
        const supabase = getServiceSupabase();

        // Insert into potential_leads
        const { data, error } = await supabase
            .from('potential_leads')
            .insert(enrichedLeads)
            .select();

        if (error) throw error;

        return NextResponse.json({ success: true, count: data.length, data });

    } catch (error: any) {
        console.error('Lead Gen Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// --- Helper Functions ---

async function fetchOSMData(city: string, category: string, limit: number) {
    try {
        const query = `${category} in ${city}`;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=${limit}&extratags=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'LevitateLabs-LeadGen/1.0 (admin@levitatelabs.com)'
            }
        });

        if (!response.ok) return [];
        const results = await response.json();

        return results.map((item: any) => ({
            business_name: item.name || item.display_name.split(',')[0],
            address: item.display_name,
            phone: item.extratags?.phone || item.extratags?.['contact:phone'] || null,
            website: item.extratags?.website || item.extratags?.['contact:website'] || null,
            city: city,
            category: category,
            raw_data: item // Changed from 'raw' to 'raw_data'
        }));
    } catch (e) {
        console.error('OSM Fallback Failed:', e);
        return [];
    }
}

async function runPuppeteerScraper(city: string, category: string, limit: number) {
    let browser = null;
    try {
        let executablePath: string | undefined = undefined;

        if (isLocal) {
            executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        } else {
            try {
                // @ts-ignore
                executablePath = await chromium.executablePath();
            } catch (e) {
                console.error("Failed to get chromium path:", e);
            }
        }

        browser = await puppeteer.launch({
            args: isLocal ? puppeteer.defaultArgs() : chromium.args,
            // @ts-ignore
            defaultViewport: isLocal ? null : chromium.defaultViewport,
            executablePath: executablePath || undefined,
            // @ts-ignore
            headless: isLocal ? false : chromium.headless,
            // Slow down Puppeteer locally so user can watch
            slowMo: isLocal ? 50 : 0,
        });

        const page = await browser.newPage();

        // Set User Agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Timeout: Local = Infinite, Prod = 45s
        page.setDefaultNavigationTimeout(isLocal ? 0 : 45000);

        const query = `${category} in ${city}`;

        // Trying Google "Places" list view via Search
        await page.goto(`https://www.google.com/search?tbm=lcl&q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2' });

        const results = await page.evaluate(async (maxItems) => {
            const items: any[] = [];
            const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

            const getItems = () => {
                const businessElements = document.querySelectorAll('.VkpGBb');
                const currentItems: any[] = [];

                businessElements.forEach((el) => {
                    const nameEl = el.querySelector('.dbg0pd span') || el.querySelector('.dbg0pd');
                    const ratingEl = el.querySelector('.BTtC6e');
                    const detailsText = el.innerText || '';

                    // Regex for Indian Mobile Numbers (starts with 6-9, 10 digits) or generic (+91...)
                    const mobileRegex = /(?:\+91[\-\s]?)?[6789]\d{9}/g;
                    const genericPhoneRegex = /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

                    const mobileMatches = detailsText.match(mobileRegex);
                    const phoneMatches = detailsText.match(genericPhoneRegex);

                    const phone = mobileMatches ? mobileMatches[0] : (phoneMatches ? phoneMatches[0] : null);

                    const links = Array.from(el.querySelectorAll('a'));
                    const websiteLink = links.find(a => a.textContent?.includes('Website'))?.getAttribute('href')
                        || links.find(a => a.href.includes('http') && !a.href.includes('google'))?.href;

                    currentItems.push({
                        business_name: nameEl?.textContent || 'Unknown Business',
                        rating: ratingEl?.textContent || 'N/A',
                        phone: phone,
                        website: websiteLink,
                        address: 'Google Search Result',
                        category: 'Scraped',
                        raw_data: { text: detailsText } // Changed from 'raw' to 'raw_data'
                    });
                });
                return currentItems;
            };

            // Auto-scroll loop
            let previousHeight = 0;
            let noNewDataCount = 0;

            // Loop until we have enough items or stuck
            while (items.length < maxItems && noNewDataCount < 3) {
                const currentBatch = getItems();

                for (const item of currentBatch) {
                    if (!items.find(existing => existing.business_name === item.business_name)) {
                        items.push(item);
                    }
                }

                if (items.length >= maxItems) break;

                window.scrollTo(0, document.body.scrollHeight);
                await delay(2000);

                const newHeight = document.body.scrollHeight;
                if (newHeight === previousHeight) {
                    noNewDataCount++;
                    const moreBtn = document.querySelector('[aria-label="More places"]');
                    if (moreBtn) (moreBtn as HTMLElement).click();
                } else {
                    noNewDataCount = 0;
                }
                previousHeight = newHeight;
            }

            return items.slice(0, maxItems);
        }, limit);

        return results.map(r => ({
            ...r,
            city,
            category
        }));

    } catch (error) {
        console.error('Puppeteer Scraping Failed:', error);
        // Fallback
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

async function enrichLeadsWithAI(leads: any[]) {
    if (leads.length === 0) return [];

    // Use OpenRouter to score these leads
    // Truncate leads list for AI to avoid token limits if necessary
    const leadsForAI = leads.slice(0, 10);

    const prompt = `
    You are a Lead Qualification Expert. Analyze these businesses found for the category: ${leads[0].category} in ${leads[0].city}.
    
    Leads:
    ${JSON.stringify(leadsForAI.map((l, i) => ({ id: i, name: l.business_name, website: l.website, phone: l.phone, details: l.raw_data })))}

    For each lead, assign a 'score' (0-100) based on:
    - Availability of Contact Info (Phone/Website)
    - Professionalism (implied by Name/Website)
    - Relevance

    Return valid JSON ARRAY only:
    [{ "id": 0, "ai_score": 85, "reason": "Good website and phone" }]
    `;

    try {
        const aiResponse = await generateAIResponse([
            { role: 'system', content: 'You are a JSON-only response bot.' },
            { role: 'user', content: prompt }
        ], FREE_MODELS.GEMINI_FLASH);

        // Clean JSON
        const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const scores = JSON.parse(cleanJson);

        return leads.map((lead, index) => {
            const scoreData = scores.find((s: any) => s.id === index);
            return {
                ...lead,
                ai_score: scoreData ? scoreData.ai_score : 50,
                status: 'pending'
            };
        });

    } catch (e) {
        console.error('AI Enrichment Failed:', e);
        // Fallback enrichment
        return leads.map(l => ({ ...l, ai_score: l.phone ? 70 : 40, status: 'pending' }));
    }
}
