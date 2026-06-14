import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { filterItemsWithAI } from '@/lib/ai-filter';
import { checkAdminAuth } from '@/lib/auth';

// Node runtime is more stable for cheerio/scraping
// export const runtime = 'edge';

// Types for our unified job format
interface JobPost {
    id: string;
    title: string;
    description: string;
    link: string;
    pubDate: string;
    source: 'Upwork' | 'Freelancer' | 'WeWorkRemotely' | 'RemoteOK' | 'Guru' | 'PeoplePerHour' | 'Remotive' | 'WorkingNomads' | 'Jobspresso' | 'DailyRemote';
    budget?: string;
    skills?: string[];
    score?: number; // Added for internal sorting
}

const BUDGET_REGEX = /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;
const HOURLY_REGEX = /\$(\d+)\/hr/;

// Force dynamic behavior
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    console.log('[Scout] API Request started');
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || 'developer';
    const encodedQuery = encodeURIComponent(query);

    // Create a streaming response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                console.log('[Scout] Stream started');
                // Send a keep-alive (empty array) immediately to prevent buffering/timeout
                const keepAlive = '[]\n';
                controller.enqueue(encoder.encode(keepAlive));

                // 1. Fetch Phase (Fast)
                console.log('[Scout] Fetching RSS feeds...');
                const allJobs: JobPost[] = [];
                const seenLinks = new Set<string>();

                const sources = [
                    { url: `https://www.upwork.com/ab/feed/jobs/rss?q=${encodedQuery}`, name: 'Upwork' },
                    { url: `https://www.freelancer.com/rss.xml?keyword=${encodedQuery}`, name: 'Freelancer' },
                    { url: `https://weworkremotely.com/remote-jobs/search.rss?term=${encodedQuery}`, name: 'WeWorkRemotely' },
                    { url: `https://remoteok.com/rss?tags=${encodedQuery}`, name: 'RemoteOK' },
                    { url: `https://www.guru.com/rss/jobs/q/${encodedQuery}`, name: 'Guru' },
                    { url: `https://www.peopleperhour.com/job/feed/rss?q=${encodedQuery}`, name: 'PeoplePerHour' },
                    { url: `https://remotive.com/remote-jobs/feed`, name: 'Remotive' },
                    { url: `https://www.workingnomads.com/jobs/rss`, name: 'WorkingNomads' },
                    { url: `https://jobspresso.co/feed/`, name: 'Jobspresso' },
                    { url: `https://dailyremote.com/feed`, name: 'DailyRemote' }
                ] as const;

                const fetchResults = await Promise.allSettled(
                    sources.map(src => fetchAndParseRSS(src.url, src.name))
                );

                fetchResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        // console.log(`[Scout] Source ${sources[index].name} returned ${result.value.length} items`);
                        for (const job of result.value) {
                            const uniqueKey = job.link || `${job.source}-${job.title}`;
                            if (!seenLinks.has(uniqueKey)) {
                                seenLinks.add(uniqueKey);
                                allJobs.push(job);
                            }
                        }
                    } else {
                        console.error(`[Scout] Source ${sources[index].name} failed`, result.reason);
                    }
                });

                console.log(`[Scout] Total unique jobs found: ${allJobs.length}`);

                // 2. Sort & Basic Filter (Fast)
                allJobs.sort((a, b) => {
                    const scoreA = calculateJobScore(a, query);
                    const scoreB = calculateJobScore(b, query);
                    if (scoreA !== scoreB) return scoreB - scoreA;
                    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
                });

                const candidates = query === 'developer' ? allJobs : allJobs.filter(j =>
                    j.title.toLowerCase().includes(query.toLowerCase()) ||
                    j.description.toLowerCase().includes(query.toLowerCase())
                );

                console.log(`[Scout] Candidates after basic filter: ${candidates.length}`);

                // 3. Streaming AI Processing Phase
                // Process in batches
                const BATCH_SIZE = 10;
                const PROCESS_LIMIT = 60; // Process top 60 candidates (increased from 30)
                const topCandidates = candidates.slice(0, PROCESS_LIMIT);

                for (let i = 0; i < topCandidates.length; i += BATCH_SIZE) {
                    const batch = topCandidates.slice(i, i + BATCH_SIZE);
                    console.log(`[Scout] Processing batch ${i / BATCH_SIZE + 1}...`);

                    try {
                        const aiResults = await filterItemsWithAI(
                            batch.map(j => ({ id: j.id, text: j.title + ' ' + j.description })),
                            'job'
                        );

                        const aiMap = new Map(aiResults.map(r => [r.id, r]));

                        // Filter & Fallback Logic
                        const verifiedBatch = batch.filter(job => {
                            const res = aiMap.get(job.id);
                            if (res && res.isLead) return true;
                            // Fallback: If AI says no/fail, but Keyword Score is VERY high (Results in less false negatives)
                            if ((job.score || 0) >= 12) return true;
                            return false;
                        });

                        console.log(`[Scout] Batch verified: ${verifiedBatch.length} items`);

                        // Enqueue verified jobs
                        if (verifiedBatch.length > 0) {
                            const chunk = JSON.stringify(verifiedBatch) + '\n';
                            controller.enqueue(encoder.encode(chunk));
                        }

                    } catch (e) {
                        console.error("[Scout] Batch AI failed", e);
                        // Fallback processing for this batch
                        const fallbackBatch = batch.filter(j => (j.score || 0) >= 8);
                        if (fallbackBatch.length > 0) {
                            const chunk = JSON.stringify(fallbackBatch) + '\n';
                            controller.enqueue(encoder.encode(chunk));
                        }
                    }
                }

            } catch (error: any) {
                console.error("[Scout] Stream Fatal Error", error);
                const errChunk = JSON.stringify({ error: error.message }) + '\n';
                controller.enqueue(encoder.encode(errChunk));
            } finally {
                console.log('[Scout] Stream closing');
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}


function calculateJobScore(job: JobPost, query: string): number {
    let score = 0;
    const text = (job.title + ' ' + (job.description || '')).toLowerCase();
    const q = query.toLowerCase();

    // 1. Budget Presence
    if (job.budget) score += 10;

    // 2. Query Match (Title is more important)
    if (job.title.toLowerCase().includes(q)) score += 5;

    // 3. Keywords
    if (text.includes('urgent') || text.includes('immediate') || text.includes('asap')) score += 3;
    if (text.includes('long term') || text.includes('ongoing') || text.includes('contract')) score += 2;
    if (text.includes('senior') || text.includes('lead') || text.includes('architect')) score += 1;

    // 4. Source Tier (Subjective preference for quality)
    if (job.source === 'WeWorkRemotely' || job.source === 'RemoteOK') score += 2;

    // Save score to object for later usage
    job.score = score;

    return score;
}

async function fetchAndParseRSS(url: string, source: JobPost['source']): Promise<JobPost[]> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per source

        // Rotate UAs
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        ];
        const ua = userAgents[Math.floor(Math.random() * userAgents.length)];

        const res = await fetch(url, {
            headers: {
                'User-Agent': ua,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            signal: controller.signal,
            cache: 'no-store'
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            console.warn(`[Scout] Source ${source} returned ${res.status}`);
            return [];
        }

        const xmlText = await res.text();
        const $ = cheerio.load(xmlText, { xmlMode: true });
        const items: JobPost[] = [];

        $('item').each((_, element) => {
            const el = $(element);
            const title = el.find('title').text() || 'No Title';
            const link = el.find('link').text() || '';
            const description = el.find('description').text() || '';
            const pubDate = el.find('pubDate').text() || new Date().toISOString();
            const guid = el.find('guid').text() || link;

            // Basic description cleaning
            const cleanDesc = description.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();

            // Extract Budget
            let budget = undefined;
            const fullText = title + ' ' + cleanDesc;
            const budgetMatch = fullText.match(BUDGET_REGEX);
            const hourlyMatch = fullText.match(HOURLY_REGEX);

            if (hourlyMatch) {
                budget = `$${hourlyMatch[1]}/hr`;
            } else if (budgetMatch) {
                budget = budgetMatch[0];
            }

            items.push({
                id: guid,
                title,
                link,
                description: cleanDesc,
                pubDate,
                source,
                budget
            });
        });

        return items;
    } catch (e) {
        return [];
    }
}
