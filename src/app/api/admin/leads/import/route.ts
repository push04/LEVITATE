import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

interface LeadRow {
  business_name?: string
  name?: string
  email?: string
  phone?: string
  city?: string
  service_category?: string
  budget?: string
  notes?: string
  status?: string
  source?: string
  website_link?: string
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const leads: LeadRow[] = body?.leads
  const source: string = body?.source ?? 'csv_import'

  if (!Array.isArray(leads) || !leads.length) {
    return NextResponse.json({ error: 'leads array required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const VALID_STATUSES = ['New', 'Contacted', 'Follow Up', 'Closed']

  const rows = leads.map(l => ({
    business_name: l.business_name ?? l.name ?? 'Unknown',
    email: l.email?.trim().toLowerCase() || null,
    phone: l.phone?.trim() || null,
    city: l.city?.trim() || null,
    service_category: l.service_category?.trim() || null,
    budget: l.budget?.trim() || null,
    notes: l.notes?.trim() || null,
    status: VALID_STATUSES.includes(l.status ?? '') ? l.status : 'New',
    source,
    website_link: l.website_link?.trim() || null,
    created_at: new Date().toISOString(),
  }))

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  // Insert in batches of 50, using upsert-style to skip duplicates by email
  const BATCH = 50
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    // For rows with email, do upsert on email to skip exact duplicates
    const withEmail = batch.filter(r => r.email)
    const withoutEmail = batch.filter(r => !r.email)

    if (withEmail.length) {
      const { data, error } = await supabase
        .from('leads')
        .upsert(withEmail, { onConflict: 'email', ignoreDuplicates: true })
        .select('id')
      if (error) {
        errors.push(error.message)
      } else {
        imported += data?.length ?? 0
        skipped += withEmail.length - (data?.length ?? 0)
      }
    }

    if (withoutEmail.length) {
      const { data, error } = await supabase
        .from('leads')
        .insert(withoutEmail)
        .select('id')
      if (error) {
        errors.push(error.message)
      } else {
        imported += data?.length ?? 0
      }
    }
  }

  return NextResponse.json({
    success: true,
    total: leads.length,
    imported,
    skipped,
    failed: errors.length,
    errors: errors.slice(0, 5),
  })
}
