
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

        // 1. SCRAPING STAGE (Puppeteer)
        const scrapedLeads = await runPuppeteerScraper(city, category, limit);

        // 2. AI ENRICHMENT STAGE
        const enrichedLeads = await enrichLeadsWithAI(scrapedLeads);

        // 3. DATABASE SAVE STAGE
        const supabase = getServiceSupabase();

        // We only save unique ones or update existing? For now, insert all to potential_leads
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

async function runPuppeteerScraper(city: string, category: string, limit: number) {
    let browser = null;
    try {
        // Launch Puppeteer
        // If local, we need a local chrome executable path. 
        // If on cloud, we use chrome-aws-lambda or @sparticuz/chromium

        let executablePath = await chromium.executablePath;

        if (isLocal) {
            executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        } else {
            //@ts-ignore
            executablePath = await chromium.executablePath();
        }

        browser = await puppeteer.launch({
            args: isLocal ? puppeteer.defaultArgs() : chromium.args,
            //@ts-ignore
            defaultViewport: chromium.defaultViewport,
            executablePath: executablePath!,
            //@ts-ignore
            headless: chromium.headless === 'true' || chromium.headless === true,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // Set User Agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        const query = `${category} in ${city}`;
        // Go to Google Maps (approximate URL logic)
        // Note: Direct Google Maps scraping is hard due to dynamic classes. 
        // We will try a simpler query on Google Search "Maps" tab logic if possible, 
        // OR search on a directory site if Maps fails.
        // Let's try Google Search directly which lists businesses in "Places"

        await page.goto(`https://www.google.com/search?tbm=lcl&q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2' });

        // Simple selector logic for Google "Local Pack" / Maps List
        // Note: These class names change often. This is a best-effort robust selector strategy.
        const results = await page.evaluate((maxItems) => {
            const items = [];

            // Try different selector patterns used by Google
            const businessElements = document.querySelectorAll('.VkpGBb'); // Common class for business card in list

            for (const el of businessElements) {
                if (items.length >= maxItems) break;

                const nameEl = el.querySelector('.dbg0pd span') || el.querySelector('.dbg0pd');
                const ratingEl = el.querySelector('.BTtC6e');
                // Address/Phone often in sub-divs
                const detailsText = el.textContent || '';

                // Parse phone (naive regex)
                const phoneMatch = detailsText.match(/(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
                const phone = phoneMatch ? phoneMatch[0] : null;

                // Website? Often inside an 'a' tag with 'Website' text
                const links = Array.from(el.querySelectorAll('a'));
                const websiteLink = links.find(a => a.textContent?.includes('Website'))?.getAttribute('href')
                    || links.find(a => a.href.includes('http') && !a.href.includes('google'))?.href;

                items.push({
                    business_name: nameEl?.textContent || 'Unknown Business',
                    rating: ratingEl?.textContent || 'N/A',
                    phone: phone,
                    website: websiteLink,
                    address: 'See details', // Hard to extract clean address from list view
                    category: 'Scraped',
                    raw: detailsText
                });
            }
            return items;
        }, limit);

        return results.map(r => ({
            ...r,
            city,
            category
        }));

    } catch (error) {
        console.error('Puppeteer Scraping Failed:', error);
        // Fallback or rethrow
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

async function enrichLeadsWithAI(leads: any[]) {
    if (leads.length === 0) return [];

    // Use OpenRouter to score these leads
    const prompt = `
    You are a Lead Qualification Expert. Analyze these businesses found for the category: ${leads[0].category} in ${leads[0].city}.
    
    Leads:
    ${JSON.stringify(leads.map((l, i) => ({ id: i, name: l.business_name, website: l.website, phone: l.phone, details: l.raw })))}

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
        ], FREE_MODELS.GEMINI_FLASH); // Use Flash for speed

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
        return leads.map(l => ({ ...l, ai_score: l.phone ? 60 : 40, status: 'pending' }));
    }
}
