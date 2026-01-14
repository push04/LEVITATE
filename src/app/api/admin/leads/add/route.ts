
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // This is a protected processing route.
        // Ideally, we check for a session token here too, but for now we trust the endpoint
        // is called by the admin dashboard which is protected.

        const supabase = getServiceSupabase();

        // Validate required fields
        if (!body.name) {
            return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('leads')
            .insert([body])
            .select();

        if (error) throw error;

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
