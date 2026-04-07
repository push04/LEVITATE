
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { generateAIResponse, FREE_MODELS } from '@/lib/openrouter';
import { search } from 'duck-duck-scrape';

// Helper to delay for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
    try {
        const { city, category, limit = 5 } = await request.json();

        if (!city || !category) {
            return NextResponse.json({ success: false, error: 'City and Category are required' }, { status: 400 });
        }

        // 1. DISCOVERY STAGE: Get Real Entities from OpenStreetMap
        console.log(`Step 1: Discovering '${category}' in '${city}' via OSM...`);
        const discoveryResults = await fetchOSMData(city, category, 20); // Fetch more than limit to filter later

        if (discoveryResults.length === 0) {
            // Fallback: If OSM fails, we could try a direct DDG search for a list, 
            // but for "Structured/Real" leads, starting with a map entity is best.
            return NextResponse.json({ success: false, error: 'No businesses found in this location via Maps. Try a broader city name.' }, { status: 404 });
        }

        console.log(`Found ${discoveryResults.length} candidates. Processing top ${limit}...`);

        // 2. ENRICHMENT STAGE: Search & AI Analyze
        const processedLeads = [];
        const candidates = discoveryResults.slice(0, limit);

        for (const candidate of candidates) {
            try {
                // Rate limit respect
                await delay(1000);

                // A. Search for more details
                console.log(`Searching details for: ${candidate.business_name}...`);
                const searchResults = await searchDuckDuckGo(`${candidate.business_name} ${city} contact email website`);

                // B. AI Synthesis
                console.log(`AI Analysis for: ${candidate.business_name}...`);
                const enrichedData = await analyzeWithAI(candidate, searchResults);

                if (enrichedData) {
                    processedLeads.push(enrichedData);
                }
            } catch (err) {
                console.error(`Failed to process ${candidate.business_name}:`, err);
                // Push raw candidate as fallback if AI fails
                processedLeads.push({
                    ...candidate,
                    ai_score: 10,
                    status: 'pending',
                    raw_data: { error: 'Enrichment failed' }
                });
            }
        }

        // 3. DATABASE SAVE STAGE
        if (processedLeads.length > 0) {
            const supabase = getServiceSupabase();
            const { data, error } = await supabase
                .from('potential_leads')
                .insert(processedLeads)
                .select();

            if (error) throw error;
            return NextResponse.json({ success: true, count: data.length, data });
        }

        return NextResponse.json({ success: false, error: 'No leads could be processed successfully.' });

    } catch (error: any) {
        console.error('Lead Gen Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// --- Helpers ---

async function fetchOSMData(city: string, category: string, limit: number) {
    try {
        const query = `${category} in ${city}`;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=${limit}&extratags=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'LevitateLabs-LeadGen/2.0 (admin@levitatelabs.com)'
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
            raw_data: item // Keep raw for debugging
        }));
    } catch (e) {
        console.error('OSM Search Failed:', e);
        return [];
    }
}

async function searchDuckDuckGo(query: string) {
    try {
        const results = await search(query, {
            safeSearch: 0, // Moderate
            locale: 'en-IN', // Bias towards India as per user context
        });

        // Return top 5 textual snippets
        if (results.noResults) return [];

        return results.results.slice(0, 5).map((r: any) => ({
            title: r.title,
            description: r.description,
            url: r.url
        }));
    } catch (e) {
        console.error('DDG Search Failed:', e);
        return [];
    }
}

async function analyzeWithAI(candidate: any, searchSnippets: any[]) {
    const prompt = `
    Role: Lead Data Extractor & Analyst.
    Task: Consolidate information for a business lead using Map Data and Search Results.
    
    Business: ${candidate.business_name}
    City: ${candidate.city}
    Category: ${candidate.category}
    Map Data: Phone=${candidate.phone || 'N/A'}, Website=${candidate.website || 'N/A'}, Address=${candidate.address}
    
    Search Results:
    ${JSON.stringify(searchSnippets)}

    Instructions:
    1. Extract/Confirm the OFFICIAL Website (look for official domain).
    2. Extract/Confirm Phone Numbers (look for Indian landlines/mobiles in snippets).
    3. Extract/Confirm Email Address (look for @domain or contact pages).
    4. Extract Tech Stack hints (e.g. mention of WordPress, React, Shopify in snippets).
    5. Rate 'Lead Quality' (0-100): High if phone+email+website found. Low if closed or no info.

    Output JSON ONLY:
    {
        "business_name": "Corrected Name",
        "phone": "Best Phone or null",
        "email": "Best Email or null",
        "website": "Best Website URL or null",
        "tech_stack": "e.g. WordPress, React or Unknown",
        "ai_score": 85,
        "notes": "Short summary of what was found"
    }
    `;

    try {
        const response = await generateAIResponse([
            { role: 'system', content: 'You are a JSON-only data extraction engine.' },
            { role: 'user', content: prompt }
        ], FREE_MODELS.GEMINI_FLASH_2); // Use fast/smart model

        // Clean JSON
        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const extracted = JSON.parse(cleanJson);

        return {
            id: undefined, // Let DB generate
            business_name: extracted.business_name || candidate.business_name,
            phone: extracted.phone || candidate.phone,
            website: extracted.website || candidate.website,
            city: candidate.city,
            category: candidate.category,
            ai_score: extracted.ai_score || 50,
            status: 'pending',
            created_at: new Date().toISOString(),
            raw_data: {
                email: extracted.email,
                tech_stack: extracted.tech_stack,
                notes: extracted.notes,
                sources: searchSnippets.map(s => s.url).slice(0, 3)
            }
        };

    } catch (e) {
        console.error('AI Analysis Failed:', e);
        // Return basic candidate if AI dies
        return {
            ...candidate,
            ai_score: 30,
            status: 'pending',
            raw_data: { error: 'AI Parsing Failed' }
        };
    }
}
