
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { generateAIResponse, FREE_MODELS } from '@/lib/openrouter';
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

// Helper to determine if we are local or in production (Netlify/Vercel)
const isLocal = process.env.NODE_ENV === 'development';

export async function POST(request: Request) {
    try {
        const { city, category, limit = 5, requirePhone = false } = await request.json();

        if (!city || !category) {
            return NextResponse.json({ success: false, error: 'City and Category are required' }, { status: 400 });
        }

        // 1. SCRAPING STAGE
        let scrapedLeads: any[] = [];

        try {
            console.log(`Attempting Puppeteer Scrape for ${category} in ${city} (Limit: ${limit}, Require Phone: ${requirePhone})...`);
            scrapedLeads = await runPuppeteerScraper(city, category, limit, requirePhone);
        } catch (e) {
            console.error('Puppeteer crashed/failed:', e);
        }

        // 2. FALLBACK STAGE
        if (!scrapedLeads || scrapedLeads.length === 0) {
            console.log('Puppeteer yielded 0 results. Falling back to OpenStreetMap (Nominatim).');
            scrapedLeads = await fetchOSMData(city, category, limit);
        }

        // Filter for Phone Number if required
        if (requirePhone && scrapedLeads && scrapedLeads.length > 0) {
            const originalCount = scrapedLeads.length;
            scrapedLeads = scrapedLeads.filter(lead => lead.phone && lead.phone.length > 5);
            console.log(`Filtered for Phone Only: ${originalCount} -> ${scrapedLeads.length}`);
        }

        if (!scrapedLeads || scrapedLeads.length === 0) {
            return NextResponse.json({ success: false, error: 'Could not find any leads with valid phone numbers.' }, { status: 404 });
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
            raw_data: item
        }));
    } catch (e) {
        console.error('OSM Fallback Failed:', e);
        return [];
    }
}

async function runPuppeteerScraper(city: string, category: string, limit: number, requirePhone: boolean) {
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
            slowMo: isLocal ? 50 : 0,
        });

        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        page.setDefaultNavigationTimeout(isLocal ? 0 : 45000);

        const query = `${category} in ${city}`;

        // Trying Google "Places" list view via Search
        await page.goto(`https://www.google.com/search?tbm=lcl&q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2' });

        const results = await page.evaluate(async (maxItems) => {
            const items: any[] = [];
            const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

            const getItems = () => {
                // Extended selectors for better coverage
                let elements = Array.from(document.querySelectorAll('.VkpGBb, .Nv2PK'));

                const currentItems: any[] = [];

                elements.forEach((el) => {
                    const nameEl = el.querySelector('.dbg0pd span') || el.querySelector('.dbg0pd') || el.querySelector('.qBF1Pd') || el.querySelector('.hfpxzc');
                    const ratingEl = el.querySelector('.BTtC6e') || el.querySelector('.MW4etd');

                    // @ts-ignore
                    const detailsText = el.textContent || '';

                    // Regex for Indian Mobile Numbers (starts with 6-9, 10 digits) or generic (+91...)
                    // Improved Regex to catch split numbers e.g. 98123 45678
                    const mobileRegex = /(?:\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}/g;
                    const simpleMobile = /[6-9]\d{9}/g;
                    const genericPhoneRegex = /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

                    let phone = null;
                    const mMatches = detailsText.match(mobileRegex) || detailsText.match(simpleMobile);
                    if (mMatches) phone = mMatches[0];
                    else {
                        const pMatches = detailsText.match(genericPhoneRegex);
                        if (pMatches) phone = pMatches[0];
                    }

                    const links = Array.from(el.querySelectorAll('a'));
                    const websiteLink = links.find(a => a.textContent?.includes('Website'))?.getAttribute('href')
                        || links.find(a => a.href.includes('http') && !a.href.includes('google'))?.href;

                    // Clean name
                    const name = nameEl?.textContent?.split('\n')[0].trim() || 'Unknown Business';

                    currentItems.push({
                        business_name: name,
                        rating: ratingEl?.textContent || 'N/A',
                        phone: phone,
                        website: websiteLink,
                        address: 'Google Maps Search',
                        category: 'Scraped',
                        raw_data: { text: detailsText.substring(0, 500) } // Store less data
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

        // --- DEEP SCRAPING (Visit Websites) ---
        // If we have leads with websites, visit them (Limit 5 to prevent timeouts)
        // Candidates: No phone OR no email (if we add email later) - for now just website owners
        // Filter out if no website
        const deepScrapeCandidates = results.filter((r: any) => r.website).slice(0, 5);

        if (deepScrapeCandidates.length > 0) {
            console.log(`Deep Scraping ${deepScrapeCandidates.length} websites for Phone, Email & Tech Stack...`);

            for (const lead of deepScrapeCandidates) {
                try {
                    // Short timeout (10s)
                    await page.goto(lead.website, { waitUntil: 'domcontentloaded', timeout: 10000 });

                    const bodyText = await page.evaluate(() => document.body.innerText);
                    const htmlContent = await page.evaluate(() => document.documentElement.outerHTML);

                    // 1. Phone Extraction
                    if (!lead.phone) {
                        const mobileRegex = /(?:\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}/g;
                        const simpleMobile = /[6-9]\d{9}/g;
                        const genericPhoneRegex = /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

                        let foundPhone = null;
                        const mMatches = bodyText.match(mobileRegex) || bodyText.match(simpleMobile);
                        if (mMatches) foundPhone = mMatches[0];
                        else {
                            const pMatches = bodyText.match(genericPhoneRegex);
                            if (pMatches) foundPhone = pMatches[0];
                        }
                        if (foundPhone) lead.phone = foundPhone;
                    }

                    // 2. Email Extraction
                    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                    const emailMatches = bodyText.match(emailRegex);
                    if (emailMatches) {
                        lead.email = emailMatches[0]; // Take first found email
                        console.log(`Deep Scrape: Email found ${lead.email}`);
                    }

                    // 3. Tech Stack Detection
                    const techStack = [];
                    if (htmlContent.includes('wp-content')) techStack.push('WordPress');
                    if (htmlContent.includes('wix.com')) techStack.push('Wix');
                    if (htmlContent.includes('shopify.com')) techStack.push('Shopify');
                    if (htmlContent.includes('squarespace')) techStack.push('Squarespace');
                    if (htmlContent.includes('react')) techStack.push('React');

                    if (techStack.length > 0) {
                        lead.tech_stack = techStack.join(', ');
                        console.log(`Deep Scrape: Tech Stack ${lead.tech_stack}`);
                    }

                    if (!lead.raw_data) lead.raw_data = {};
                    lead.raw_data.deep_scraped = true;
                    lead.raw_data.tech_stack = lead.tech_stack;
                    lead.raw_data.email = lead.email;

                } catch (err) {
                    console.error(`Deep scrape failed for ${lead.business_name}:`, err);
                }
            }
        }
        // --------------------------------------

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

    // Simplify prompt input to avoid 400 Bad Request on large payloads and strange chars
    const simplifiedLeads = leadsForAI.map((l, i) => ({
        id: i,
        name: l.business_name,
        web: l.website ? 'Yes' : 'No',
        ph: l.phone ? 'Yes' : 'No',
        email: l.email ? 'Yes' : 'No',
        tech: l.tech_stack || 'Unknown',
        desc: (l.raw_data?.text || '').substring(0, 100).replace(/[^a-zA-Z0-9 ]/g, '') // Sanitize
    }));

    const prompt = `
    Role: Lead Quality Scorer.
    Context: Finding ${leads[0].category} in ${leads[0].city}.
    
    Data:
    ${JSON.stringify(simplifiedLeads)}

    Task: Rate 0-100.
    - +20 points if Tech Stack is found (means we can pitch migration/improvement).
    - +20 points if Email is found.
    - Low score if already has modern tech (e.g. React/Next.js) unless speed is slow.
    
    Return JSON Array: [{ "id": 0, "ai_score": 90 }]
    `;

    try {
        const aiResponse = await generateAIResponse([
            { role: 'system', content: 'Output JSON only.' },
            { role: 'user', content: prompt }
        ], FREE_MODELS.MOLMO_8B);

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
