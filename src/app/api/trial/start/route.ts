import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env';
import { getServiceSupabase } from '@/lib/supabase';
import { DEMO_AGENT_ACTIVITY, DEMO_LEADS } from '@/lib/demoData';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  companyName: z.string().trim().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json().catch(() => ({})));

    const cookieStore = await cookies();
    const authSupabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // handled by Next middleware + browser auth
        },
      },
    });

    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const service = getServiceSupabase();

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const { data: companyRow } = await service
      .from('companies')
      .select('id, name')
      .eq('owner_id', user.id)
      .maybeSingle();

    let companyId = companyRow?.id as string | undefined;

    if (!companyId) {
      const companyName = body.companyName || user.user_metadata?.company_name || 'Trial Workspace';
      const { data: created, error: createError } = await service
        .from('companies')
        .insert({
          owner_id: user.id,
          name: companyName,
          status: 'active',
          plan: 'trial',
          trial: true,
          trial_start: now.toISOString(),
          trial_end: trialEnd.toISOString(),
        })
        .select('id')
        .single();

      if (createError || !created?.id) {
        return NextResponse.json({ success: false, error: createError?.message || 'Unable to create workspace.' }, { status: 500 });
      }

      companyId = created.id as string;
    } else {
      await service
        .from('companies')
        .update({
          plan: 'trial',
          trial: true,
          trial_start: now.toISOString(),
          trial_end: trialEnd.toISOString(),
        })
        .eq('id', companyId);
    }

    // Seed demo leads for immediate “populated dashboard” feel.
    // NOTE: requires the `leads.company_id` column from migration `20260429_01_trial_workspaces.sql`.
    const leadsToInsert = DEMO_LEADS.map((lead) => ({
      name: lead.businessName,
      city: lead.city,
      business_type: lead.category,
      phone: lead.phone,
      status: lead.status,
      ai_score: lead.leadScore,
      source: 'trial_seed',
      company_id: companyId,
    }));

    await service.from('leads').insert(leadsToInsert);

    // Store agent activity in settings notes for now (avoids new tables until Section 5/14).
    await service.from('settings').upsert(
      {
        key: `trial_activity_seed:${companyId}`,
        value: JSON.stringify({ seeded_at: now.toISOString(), activity: DEMO_AGENT_ACTIVITY }),
      },
      { onConflict: 'key' }
    );

    return NextResponse.json({ success: true, companyId });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to start trial.' },
      { status: 400 }
    );
  }
}

