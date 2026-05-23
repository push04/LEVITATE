import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function DELETE(request: Request, props: { params: Promise<{ id: string, stepId: string }> }) {
    const params = await props.params;
    const { id, stepId } = params;
    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { error } = await supabase
            .from('campaign_steps')
            .delete()
            .eq('id', stepId)
            .eq('campaign_id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
