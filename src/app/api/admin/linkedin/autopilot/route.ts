import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateLinkedInContent, createLinkedInPost } from '@/lib/linkedin';
import { getServiceSupabase } from '@/lib/supabase';

const CRON_SECRET = process.env.CRON_SECRET || 'levitate_auto_secure_key_2026';

export async function GET(request: Request) {
    return handleRequest(request);
}

export async function POST(request: Request) {
    return handleRequest(request);
}

async function handleRequest(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');
        const supabase = getServiceSupabase();

        let accessToken;

        // 1. Cron/API Key Auth
        if (key === CRON_SECRET) {
            // Fetch token from settings (assuming we implement storage on login later, 
            // but for now let's just warn or try cookies if mistakenly called from browser with key)
            // Implementation Gaps: We need to store the User's LinkedIn Access Token in the DB 'settings' table when they login.
            // For now, if called via cron, it might fail if we don't have the token.
            // Let's check 'linkedin_access_token' in settings.
            const { data: tokenSetting } = await supabase.from('settings').select('value').eq('key', 'linkedin_access_token_latest').single();
            accessToken = tokenSetting?.value;
        } else {
            // 2. Browser Session Auth
            const cookieStore = await cookies();
            accessToken = cookieStore.get('linkedin_access_token')?.value;
        }

        if (!accessToken) {
            return NextResponse.json({ error: 'Not authenticated with LinkedIn (No Token Found)' }, { status: 401 });
        }

        // 1. Generate Content (Strict Mode: Tech News, No Emojis)
        const content = await generateLinkedInContent();

        // 2. Determine Author (Personal vs Company)
        // supabase instance already exists from auth check above, but getServiceSupabase returns a fresh client anyway.
        // Let's just reuse the variable name but not redeclare it if it was in scope, 
        // actually in the previous block it was inside the `if (key === CRON_SECRET)` block?
        // Ah, `const supabase = getServiceSupabase();` was at the top of handleRequest. 
        // So we just use `supabase`.

        const { data: setting } = await supabase.from('settings').select('value').eq('key', 'linkedin_target_urn').single();

        const targetUrn = setting?.value || undefined; // If empty/null, defaults to personal profile in lib

        // 3. Post
        const post = await createLinkedInPost(accessToken, content, undefined, targetUrn);

        return NextResponse.json({
            success: true,
            postUrl: `https://www.linkedin.com/feed/update/${post.id}`,
            mode: targetUrn ? 'Company Page' : 'Personal Profile'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
