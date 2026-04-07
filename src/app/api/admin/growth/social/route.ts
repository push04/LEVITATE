import { NextResponse } from 'next/server';
import { filterItemsWithAI } from '@/lib/ai-filter';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

// Force dynamic to prevent static caching issues
export const dynamic = 'force-dynamic';

interface SocialPost {
    id: string;
    title: string;
    text: string;
    link: string;
    author: string;
    platform: 'Reddit' | 'HackerNews' | 'Twitter';
    score: number;
    createdAt: string;
    intentScore: number;
}

export async function GET(request: Request) {
    console.log('[Social] API Request started');
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || 'hiring developer';
    const forceRefresh = searchParams.get('refresh') === 'true';

    // 1. If not refreshing, try to serve from DB first
    if (!forceRefresh) {
        // ... (existing DB logic)
        // Add log here
        console.log('[Social] Checking DB cache...');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: savedPosts } = await supabase
            .from('social_posts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (savedPosts && savedPosts.length > 0) {
            console.log(`[Social] Returning ${savedPosts.length} cached posts`);
            return new Response(JSON.stringify(savedPosts) + '\n', {
                headers: {
                    'Content-Type': 'application/x-ndjson',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'Surrogate-Control': 'no-store'
                }
            });
        }
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                console.log('[Social] Stream started');
                // Send a keep-alive (empty array) immediately to prevent buffering/timeout
                const keepAlive = '[]\n';
                controller.enqueue(encoder.encode(keepAlive));

                // Initialize Supabase Admin for DB writes
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );

                const posts: SocialPost[] = [];
                console.log('[Social] Fetching Reddit posts...');

                // 2. Reddit Search via RSS - Top subreddits only (to fit within 30s timeout)
                const subreddits = [
                    'forhire', 'hiring', 'freelance_forhire', 'startups',
                    'webdev', 'designjobs', 'entrepreneur', 'freelancers'
                ].sort(() => Math.random() - 0.5);

                const redditQuery = encodeURIComponent(`${query} self:yes`);

                // Helper to process a single subreddit via RSS
                const fetchSubredditRSS = async (sub: string): Promise<any[]> => {
                    try {
                        const controllerIdx = new AbortController();
                        const timeoutId = setTimeout(() => controllerIdx.abort(), 10000);

                        // Randomize User-Agent
                        const userAgents = [
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                        ];
                        const ua = userAgents[Math.floor(Math.random() * userAgents.length)];

                        // Use RSS endpoint
                        const rssUrl = `https://www.reddit.com/r/${sub}/search.rss?q=${redditQuery}&sort=new&t=month&restrict_sr=1`;

                        const res = await fetch(rssUrl, {
                            headers: {
                                'User-Agent': ua,
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                                'Accept-Language': 'en-US,en;q=0.5',
                                'Connection': 'keep-alive',
                            },
                            signal: controllerIdx.signal,
                            cache: 'no-store'
                        });
                        clearTimeout(timeoutId);

                        if (!res.ok) {
                            console.warn(`[Social] Subreddit ${sub} RSS returned ${res.status}`);
                            return [];
                        }

                        const xmlText = await res.text();
                        const $ = cheerio.load(xmlText, { xmlMode: true });
                        const items: any[] = [];

                        $('entry').each((_, el) => {
                            const entry = $(el);
                            const title = entry.find('title').text();
                            const link = entry.find('link').attr('href') || '';
                            const content = entry.find('content').text() || '';
                            const author = entry.find('author > name').text() || 'unknown';
                            const published = entry.find('published').text();
                            const id = entry.find('id').text();

                            // Basic HTML strip for content
                            const text = content.replace(/<[^>]*>?/gm, '').substring(0, 500);

                            items.push({
                                id: `reddit_${id}`, // Use GUID/ID
                                title,
                                text,
                                link,
                                author: author.replace('/u/', ''),
                                platform: 'Reddit',
                                score: 0, // RSS doesn't usually expose live score easily
                                createdAt: published || new Date().toISOString(),
                                intentScore: calculateIntentScore(title + ' ' + text)
                            });
                        });

                        console.log(`[Social] ${sub}: Found ${items.length} items`);
                        return items;

                    } catch (e: any) {
                        console.error(`[Social] Subreddit ${sub} failed: ${e.message}`);
                        return [];
                    }
                };

                // Fetch in parallel batches of 2 (fast but not too aggressive)
                console.log(`[Social] Fetching from ${subreddits.length} subreddits...`);
                const BATCH = 2;
                for (let i = 0; i < subreddits.length; i += BATCH) {
                    const batch = subreddits.slice(i, i + BATCH);
                    const results = await Promise.all(batch.map(sub => fetchSubredditRSS(sub)));
                    results.forEach(arr => posts.push(...arr));
                }

                console.log(`[Social] Total unique posts found: ${posts.length}`);

                // Sort by Intent Score
                posts.sort((a, b) => b.intentScore - a.intentScore);

                // 3. Process & Persist
                const BATCH_SIZE = 10;
                const PROCESS_LIMIT = 50; // top 50
                const topPosts = posts.slice(0, PROCESS_LIMIT);

                for (let i = 0; i < topPosts.length; i += BATCH_SIZE) {
                    const batch = topPosts.slice(i, i + BATCH_SIZE);
                    console.log(`[Social] Processing batch ${i / BATCH_SIZE + 1}...`);

                    try {
                        // AI Filter
                        const aiResults = await filterItemsWithAI(
                            batch.map(p => ({ id: p.id, text: p.title + ' ' + p.text })),
                            'social'
                        );

                        const aiMap = new Map(aiResults.map(r => [r.id, r]));

                        // Enhance batch with AI data
                        const processedBatch = batch.map(post => {
                            const aiRes = aiMap.get(post.id);
                            const isLead = aiRes?.isLead || post.intentScore >= 7; // Fallback
                            return { ...post, isLead };
                        }).filter(p => p.isLead); // Only keep leads

                        console.log(`[Social] Batch leads found: ${processedBatch.length}`);

                        if (processedBatch.length > 0) {
                            // Persist to DB
                            const { error } = await supabaseAdmin.from('social_posts').upsert(
                                processedBatch.map(p => ({
                                    id: p.id,
                                    title: p.title,
                                    text: p.text,
                                    link: p.link,
                                    author: p.author,
                                    platform: p.platform,
                                    score: p.score,
                                    intent_score: p.intentScore,
                                    is_lead: true
                                })), { onConflict: 'id' }
                            );

                            if (error) console.error('[Social] DB Upsert Error', error);

                            // Stream to client
                            const chunk = JSON.stringify(processedBatch) + '\n';
                            controller.enqueue(encoder.encode(chunk));
                        }
                    } catch (e) {
                        console.error('[Social] Batch processing error', e);
                    }
                }

            } catch (error: any) {
                console.error("[Social] Stream Fatal Error", error);
                const errChunk = JSON.stringify({ error: error.message }) + '\n';
                controller.enqueue(encoder.encode(errChunk));
            } finally {
                console.log('[Social] Stream closing');
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Connection': 'keep-alive',
        },
    });
}

function calculateIntentScore(text: string): number {
    const t = text.toLowerCase();
    let score = 0;

    // High Intent Keywords
    if (t.includes('hiring') || t.includes('looking for')) score += 5;
    if (t.includes('budget') || t.includes('rate') || t.includes('pay') || t.includes('salary')) score += 3;
    if (t.includes('urgent') || t.includes('asap') || t.includes('immediate')) score += 2;
    if (t.includes('developer') || t.includes('designer') || t.includes('engineer') || t.includes('co-founder')) score += 1;
    if (t.includes('who is hiring')) score += 5; // HN "Who is hiring" threads are gold

    // Negative Intent Keywords (Spam Filter)
    if (t.includes('hiring for free') || t.includes('unpaid') || t.includes('volunteer')) score -= 10;
    if (t.includes('how to') || t.includes('tutorial') || t.includes('guide to')) score -= 5;
    if (t.includes('course') || t.includes('bootcamp')) score -= 5;

    // Detect "For Hire" vs "Hiring"
    if (t.includes('[for hire]') || t.includes('(for hire)')) score -= 5;

    return Math.max(0, score);
}
