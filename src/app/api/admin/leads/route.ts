import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { checkAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export async function GET() {
    try {
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch leads' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
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
        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('leads')
            .insert([{
                ...body,
                created_at: new Date().toISOString(),
                status: 'New', // Default status
                source: 'manual_entry'
            }])
            .select()
            .single();

        if (error) throw error;

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
        const { id, status, deal_value } = await request.json();

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID and status are required' },
                { status: 400 }
            );
        }

        const updateData: any = {};
        if (status) {
            if (!['New', 'Contacted', 'Follow Up', 'Closed'].includes(status)) {
                return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
            }
            updateData.status = status;
        }
        if (deal_value !== undefined) updateData.deal_value = deal_value;

        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('leads')
            .update(updateData)
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
