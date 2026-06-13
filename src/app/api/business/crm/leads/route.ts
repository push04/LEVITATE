import { NextResponse } from 'next/server'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const CRM_LEAD_SELECT =
  'id, company_id, owner_user_id, source_lead_id, copied_from, source_snapshot, name, email, phone, whatsapp, company_name, title, city, service_category, status, pipeline_stage, tags, notes, estimated_value, quoted_price, negotiated_price, currency, source_url, priority, assigned_to, last_contacted_at, copied_at, created_at, updated_at'

const STAGE_SELECT = 'id, company_id, stage_key, label, color_token, sort_order, is_default, is_closed_stage'

const DEFAULT_STAGES = [
  { stage_key: 'new', label: 'New', color_token: 'status-new', sort_order: 1, is_default: true, is_closed_stage: false },
  { stage_key: 'contacted', label: 'Contacted', color_token: 'status-progress', sort_order: 2, is_default: true, is_closed_stage: false },
  { stage_key: 'proposal', label: 'Proposal Sent', color_token: 'gold-base', sort_order: 3, is_default: true, is_closed_stage: false },
  { stage_key: 'won', label: 'Won', color_token: 'status-closed', sort_order: 4, is_default: true, is_closed_stage: true },
  { stage_key: 'lost', label: 'Lost', color_token: 'status-warn', sort_order: 5, is_default: true, is_closed_stage: true },
] as const

function crmSchemaErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/company_crm_(pipeline_stages|leads|lead_activity)/i.test(message) || /PGRST205/i.test(message)) {
    return 'Company CRM schema is not installed on this project yet. Run add_business_growth_backlinks_coupons_and_crm.sql and refresh the dashboard.'
  }

  return message || 'Unable to load company CRM'
}

function normalizeLeadStatus(status: string | null) {
  const normalized = String(status ?? 'new').trim().toLowerCase()
  if (normalized === '[object object]') return 'new'
  if (normalized === 'closed' || normalized === 'won') return 'won'
  if (normalized === 'contacted' || normalized === 'follow up' || normalized === 'follow_up') return 'contacted'
  if (normalized === 'proposal_sent' || normalized === 'proposal') return 'proposal'
  if (normalized === 'lost') return 'lost'
  return 'new'
}

async function ensureDefaultStages(companyId: string) {
  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('company_crm_pipeline_stages')
    .select('id')
    .eq('company_id', companyId)
    .limit(1)

  if (error) {
    throw error
  }

  if ((data ?? []).length > 0) {
    return
  }

  const { error: insertError } = await supabase
    .from('company_crm_pipeline_stages')
    .insert(DEFAULT_STAGES.map((stage) => ({ company_id: companyId, ...stage })))

  if (insertError) {
    throw insertError
  }
}

export async function GET() {
  try {
    const context = await getBusinessApiContext('crm')
    if (!context.portal.companyId) {
      return NextResponse.json({ success: false, error: 'Business company context is missing' }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    await ensureDefaultStages(context.portal.companyId)

    const [leadsRes, stagesRes] = await Promise.all([
      supabase
        .from('company_crm_leads')
        .select(CRM_LEAD_SELECT)
        .eq('company_id', context.portal.companyId)
        .order('updated_at', { ascending: false }),
      supabase
        .from('company_crm_pipeline_stages')
        .select(STAGE_SELECT)
        .eq('company_id', context.portal.companyId)
        .order('sort_order', { ascending: true }),
    ])

    if (leadsRes.error) {
      throw leadsRes.error
    }

    if (stagesRes.error) {
      throw stagesRes.error
    }

    return NextResponse.json({
      success: true,
      data: {
        leads: leadsRes.data ?? [],
        stages: stagesRes.data ?? [],
      },
    })
  } catch (error) {
    const message = crmSchemaErrorMessage(error)
    return NextResponse.json(
      { success: false, error: message },
      { status: message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const context = await getBusinessApiContext('crm')
    if (!context.portal.companyId) {
      return NextResponse.json({ success: false, error: 'Business company context is missing' }, { status: 400 })
    }

    const body = await request.json()
    const sourceLeadId = String(body.sourceLeadId ?? '').trim()
    if (!sourceLeadId) {
      return NextResponse.json({ success: false, error: 'Lead selection is required' }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    await ensureDefaultStages(context.portal.companyId)

    const { data: existing } = await supabase
      .from('company_crm_leads')
      .select(CRM_LEAD_SELECT)
      .eq('company_id', context.portal.companyId)
      .eq('source_lead_id', sourceLeadId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: true, data: existing })
    }

    const { data: sourceLead, error: sourceError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', sourceLeadId)
      .maybeSingle()

    if (sourceError || !sourceLead) {
      return NextResponse.json({ success: false, error: 'Source lead not found' }, { status: 404 })
    }

    const crmLeadPayload = {
      company_id: context.portal.companyId,
      owner_user_id: context.userId,
      source_lead_id: sourceLead.id,
      copied_from: 'global_leads',
      source_snapshot: sourceLead,
      name: sourceLead.name,
      email: sourceLead.email,
      phone: sourceLead.phone,
      whatsapp: sourceLead.whatsapp ?? sourceLead.phone,
      company_name: sourceLead.business_name ?? null,
      title: null,
      city: sourceLead.city,
      service_category: sourceLead.service_category,
      status: normalizeLeadStatus(sourceLead.status),
      pipeline_stage: normalizeLeadStatus(sourceLead.status),
      tags: [sourceLead.source || 'global lead'],
      notes: sourceLead.notes || sourceLead.message || null,
      estimated_value: sourceLead.deal_value ?? 0,
      quoted_price: sourceLead.deal_value ?? null,
      negotiated_price: null,
      currency: 'INR',
      source_url: sourceLead.website_link ?? sourceLead.google_map_link ?? null,
      priority: (sourceLead.ai_score ?? 0) >= 75 ? 'high' : (sourceLead.ai_score ?? 0) >= 45 ? 'medium' : 'low',
    }

    const { data: crmLead, error: insertError } = await supabase
      .from('company_crm_leads')
      .insert(crmLeadPayload)
      .select(CRM_LEAD_SELECT)
      .single()

    if (insertError || !crmLead) {
      throw insertError ?? new Error('Unable to copy lead into CRM')
    }

    await supabase.from('company_crm_lead_activity').insert({
      crm_lead_id: crmLead.id,
      company_id: context.portal.companyId,
      actor_user_id: context.userId,
      event_type: 'lead_copied',
      event_label: 'Lead copied into business CRM',
      payload: {
        sourceLeadId: sourceLead.id,
        source: sourceLead.source ?? 'global',
      },
    })

    return NextResponse.json({ success: true, data: crmLead })
  } catch (error) {
    const message = crmSchemaErrorMessage(error)
    return NextResponse.json(
      { success: false, error: message },
      { status: message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
