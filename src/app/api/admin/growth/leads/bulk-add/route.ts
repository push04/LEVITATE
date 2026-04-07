import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { leads, campaign_id } = body;

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ success: false, error: 'No leads provided' }, { status: 400 });
        }

        const leadsToInsert = leads.map((lead: any) => {
            // Generate placeholder email if missing
            // Format: source_id@source.social (e.g. reddit_123@reddit.social)
            const email = lead.email || `${lead.source_id || Date.now()}@${lead.source ? lead.source.toLowerCase() : 'unknown'}.social`;

            return {
                campaign_id: campaign_id || null, // Allow null for "Unassigned"
                email: email,
                name: lead.name || email.split('@')[0],
                source: lead.source || 'Manual',
                status: 'pending',
                current_step: 1
            };
        });

        // Use upsert to avoid duplicates based on email? 
        // Or just insert and ignore errors? 
        // Ideally we check for duplicates. Supabase upsert on (email, campaign_id) might work if we had a constraint, 
        // but email is not unique globally, only maybe per campaign?
        // Actually unique per campaign is usually good.
        // Let's just try insert and return success.

        const { data, error } = await supabase
            .from('campaign_leads')
            .insert(leadsToInsert)
            .select();

        if (error) {
            console.error('Bulk Add Error:', error);
            // If duplicate key error, we might want to handle gracefully
            // But simple approach for now.
            throw error;
        }

        return NextResponse.json({ success: true, count: data.length, data });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
