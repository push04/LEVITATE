import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const {
      qualificationMessages,
      selectedSlugs,
      recommendedSlugs,
      leadScore,
      leadTier,
      aiRecommendationReason,
      aiQualificationSummary,
      aiProposalSnippet,
      contactDetails,
      refToken,
    } = payload;

    if (!contactDetails?.businessName || !contactDetails?.email || !contactDetails?.contactName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('intake_submissions')
      .insert({
        business_name:             contactDetails.businessName.trim(),
        contact_name:              contactDetails.contactName.trim(),
        email:                     contactDetails.email.trim().toLowerCase(),
        phone:                     contactDetails.phone?.trim() || null,
        website:                   contactDetails.website?.trim() || null,
        referral:                  contactDetails.referral?.trim() || null,
        qualification_messages:    qualificationMessages ?? [],
        selected_service_slugs:    selectedSlugs ?? [],
        recommended_service_slugs: recommendedSlugs ?? [],
        ai_qualification_summary:  aiQualificationSummary || null,
        ai_proposal_snippet:       aiProposalSnippet || null,
        ai_lead_score:             leadScore ?? null,
        ai_lead_tier:              leadTier ?? null,
        ai_recommendation_reason:  aiRecommendationReason || null,
        ref_token:                 refToken || null,
        status:                    'new',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[intake/submit] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to save. ' + error.message }, { status: 500 });
    }

    // Best-effort: increment the link's submit count
    if (refToken) {
      const { data: link } = await supabase
        .from('intake_links')
        .select('submit_count')
        .eq('token', refToken)
        .maybeSingle();
      if (link) {
        await supabase
          .from('intake_links')
          .update({ submit_count: (link.submit_count ?? 0) + 1 })
          .eq('token', refToken);
      }
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[intake/submit]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
