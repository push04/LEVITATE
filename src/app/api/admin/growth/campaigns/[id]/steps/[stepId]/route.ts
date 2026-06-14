import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function DELETE(_request: Request, props: { params: Promise<{ id: string; stepId: string }> }) {
    const { isAuthenticated } = await checkAdminAuth();
    if (!isAuthenticated) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const { id, stepId } = params;
    const supabase = getServiceSupabase();

    try {
        const { error } = await supabase
            .from('campaign_steps')
            .delete()
            .eq('id', stepId)
            .eq('campaign_id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
