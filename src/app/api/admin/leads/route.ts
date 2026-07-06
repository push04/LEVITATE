import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, fetchAllRows } from '@/lib/supabase';
import { checkAdminAuth } from '@/lib/auth';
import { queueBusinessLeadWhatsApp } from '@/lib/whatsapp/queue-business-lead';
import { LEAD_STATUSES } from '@/lib/lead-status';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
    const adminAuth = await checkAdminAuth(request);
    if (!adminAuth.isAuthenticated) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = getServiceSupabase();

        const data = await fetchAllRows((from, to) =>
            supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, to)
        );

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch leads' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const adminAuth = await checkAdminAuth(request);
        if (!adminAuth.isAuthenticated) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, email, phone, city, service_category, budget, message, source, status, deal_value, website_link, business_name } = body;
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('leads')
            .insert([{
                name,
                email,
                phone,
                city,
                service_category,
                budget,
                message,
                deal_value,
                website_link,
                business_name,
                created_at: new Date().toISOString(),
                status: status ?? 'New',
                source: source ?? 'manual_entry'
            }])
            .select()
            .single();

        if (error) throw error;

        await queueBusinessLeadWhatsApp(data);

        return NextResponse.json({ success: true, lead: data });
    } catch (error) {
        console.error('Create lead error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const adminAuth = await checkAdminAuth(request);
        if (!adminAuth.isAuthenticated) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const allowed = ['name', 'email', 'phone', 'city', 'service_category', 'budget', 'message', 'status', 'deal_value', 'notes', 'assigned_to', 'website_link', 'business_name'];
        const updates: Record<string, unknown> = {};
        for (const key of allowed) {
            if (key in body) updates[key] = (body as Record<string, unknown>)[key];
        }

        // Validate status if present
        if (updates.status && !(LEAD_STATUSES as readonly string[]).includes(updates.status as string)) {
            return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to update lead' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const adminAuth = await checkAdminAuth(request);
        if (!adminAuth.isAuthenticated) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getServiceSupabase();

        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to delete lead' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
