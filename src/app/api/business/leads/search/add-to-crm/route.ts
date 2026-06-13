import { NextRequest, NextResponse } from 'next/server'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface ScrapedLeadInput {
  business_name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  city?: string | null
  category?: string | null
  ai_score?: number | null
  source?: string | null
  raw_data?: Record<string, unknown> | null
}

export async function POST(request: NextRequest) {
  try {
    const context = await getBusinessApiContext()
    if (!context.portal.companyId) {
      return NextResponse.json({ success: false, error: 'Business context missing' }, { status: 400 })
    }

    const body = await request.json() as { lead: ScrapedLeadInput }
    const lead = body.lead

    if (!lead?.business_name) {
      return NextResponse.json({ success: false, error: 'lead.business_name is required' }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Check if already in CRM (by business_name + company_id)
    const { data: existing } = await supabase
      .from('company_crm_leads')
      .select('id, name')
      .eq('company_id', context.portal.companyId)
      .eq('company_name', lead.business_name)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: true, data: existing, already_exists: true })
    }

    const score = lead.ai_score ?? 0
    const crmPayload = {
      company_id: context.portal.companyId,
      owner_user_id: context.userId,
      copied_from: 'lead_search',
      source_snapshot: lead,
      name: lead.business_name,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      whatsapp: lead.phone ?? null,
      company_name: lead.business_name,
      city: lead.city ?? null,
      service_category: lead.category ?? null,
      status: 'new',
      pipeline_stage: 'new',
      tags: [lead.source ?? 'lead_search'],
      notes: lead.address ?? null,
      estimated_value: 0,
      currency: 'INR',
      source_url: lead.website ?? null,
      priority: score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low',
    }

    const { data: crmLead, error } = await supabase
      .from('company_crm_leads')
      .insert(crmPayload)
      .select('id, name, city, service_category, status')
      .single()

    if (error || !crmLead) {
      throw error ?? new Error('Failed to insert into CRM')
    }

    await supabase.from('company_crm_lead_activity').insert({
      crm_lead_id: crmLead.id,
      company_id: context.portal.companyId,
      actor_user_id: context.userId,
      event_type: 'lead_copied',
      event_label: 'Lead added from lead search',
      payload: { source: lead.source ?? 'lead_search', city: lead.city, category: lead.category },
    })

    return NextResponse.json({ success: true, data: crmLead })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add to CRM'
    const status = message === 'Unauthorized' || message === 'Active subscription required' ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
