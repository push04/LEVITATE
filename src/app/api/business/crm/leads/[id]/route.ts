import { NextResponse } from 'next/server'
import { getBusinessApiContext } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const CRM_LEAD_SELECT =
  'id, company_id, owner_user_id, source_lead_id, copied_from, source_snapshot, name, email, phone, whatsapp, company_name, title, city, service_category, status, pipeline_stage, tags, notes, estimated_value, quoted_price, negotiated_price, currency, source_url, priority, assigned_to, last_contacted_at, copied_at, created_at, updated_at'

function crmSchemaErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/company_crm_(pipeline_stages|leads|lead_activity)/i.test(message) || /PGRST205/i.test(message)) {
    return 'Company CRM schema is not installed on this project yet. Run add_business_growth_backlinks_coupons_and_crm.sql and refresh the dashboard.'
  }

  return message || 'Unable to update CRM lead'
}

function nullableString(value: unknown) {
  const next = String(value ?? '').trim()
  return next ? next : null
}

function nullableNumber(value: unknown) {
  if (value === '' || value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getBusinessApiContext('crm')
    if (!context.portal.companyId) {
      return NextResponse.json({ success: false, error: 'Business company context is missing' }, { status: 400 })
    }

    const { id } = await params
    const body = await request.json()
    const updates = {
      name: String(body.name ?? '').trim(),
      email: nullableString(body.email),
      phone: nullableString(body.phone),
      whatsapp: nullableString(body.whatsapp),
      company_name: nullableString(body.company_name),
      title: nullableString(body.title),
      city: nullableString(body.city),
      service_category: nullableString(body.service_category),
      status: String(body.status ?? 'new').trim() || 'new',
      pipeline_stage: String(body.pipeline_stage ?? 'new').trim() || 'new',
      tags: normalizeTags(body.tags),
      notes: nullableString(body.notes),
      estimated_value: Number(body.estimated_value ?? 0),
      quoted_price: nullableNumber(body.quoted_price),
      negotiated_price: nullableNumber(body.negotiated_price),
      currency: String(body.currency ?? 'INR').trim() || 'INR',
      source_url: nullableString(body.source_url),
      priority: nullableString(body.priority),
      updated_at: new Date().toISOString(),
    }

    if (!updates.name) {
      return NextResponse.json({ success: false, error: 'Lead name is required' }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('company_crm_leads')
      .update(updates)
      .eq('id', id)
      .eq('company_id', context.portal.companyId)
      .select(CRM_LEAD_SELECT)
      .single()

    if (error || !data) {
      throw error ?? new Error('Unable to update CRM lead')
    }

    await supabase.from('company_crm_lead_activity').insert({
      crm_lead_id: data.id,
      company_id: context.portal.companyId,
      actor_user_id: context.userId,
      event_type: 'lead_updated',
      event_label: 'CRM lead updated',
      payload: {
        status: data.status,
        pipeline_stage: data.pipeline_stage,
      },
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = crmSchemaErrorMessage(error)
    return NextResponse.json(
      { success: false, error: message },
      { status: message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getBusinessApiContext('crm')
    if (!context.portal.companyId) {
      return NextResponse.json({ success: false, error: 'Business company context is missing' }, { status: 400 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: 'CRM lead id is required' }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('company_crm_leads')
      .delete()
      .eq('id', id)
      .eq('company_id', context.portal.companyId)
      .select('id')
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data?.id) {
      await supabase.from('company_crm_lead_activity').insert({
        crm_lead_id: data.id,
        company_id: context.portal.companyId,
        actor_user_id: context.userId,
        event_type: 'lead_deleted',
        event_label: 'CRM lead deleted',
        payload: {},
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = crmSchemaErrorMessage(error)
    return NextResponse.json(
      { success: false, error: message },
      { status: message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
