import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getBusinessApiContext } from '@/lib/business-intelligence-server';

const BATCH_SIZE = 100;

interface LeadRow extends Record<string, string> {}

interface MappedLead {
  company_id: string;
  name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  service_category?: string;
  estimated_value?: string;
  notes?: string;
  status: string;
  created_at: string;
}

function mapLead(row: LeadRow, company_id: string): MappedLead {
  const name = row['name'] || row['business_name'] || row['customer_name'] || undefined;
  const company_name = row['company_name'] || row['business_name'] || row['firm'] || undefined;
  const phone = row['phone'] || row['mobile'] || row['contact'] || row['whatsapp'] || undefined;
  const estimated_value = row['estimated_value'] || row['budget'] || row['amount'] || row['value'] || undefined;

  return {
    company_id,
    ...(name !== undefined && { name }),
    ...(company_name !== undefined && { company_name }),
    ...(row['email'] && { email: row['email'] }),
    ...(phone && { phone, whatsapp: phone }),
    ...(row['city'] && { city: row['city'] }),
    ...(row['service_category'] && { service_category: row['service_category'] }),
    ...(estimated_value && { estimated_value }),
    ...(row['notes'] && { notes: row['notes'] }),
    status: row['status'] || 'New',
    created_at: new Date().toISOString(),
  };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export async function POST(req: NextRequest) {
  let ctx: Awaited<ReturnType<typeof getBusinessApiContext>>;
  try {
    ctx = await getBusinessApiContext();
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Active subscription required' || msg.includes('feature is not enabled')) {
      return NextResponse.json({ success: false, error: msg }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const company_id = ctx.portal.companyId;
  if (!company_id) return NextResponse.json({ success: false, error: 'No company found' }, { status: 404 });

  let leads: LeadRow[];
  try {
    const body = await req.json();
    leads = body.leads;
    if (!Array.isArray(leads)) throw new Error('leads must be array');
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const total = leads.length;
  let imported = 0, skipped = 0, failed = 0;

  const mappedLeads = leads.map(row => mapLead(row, company_id));
  const batches = chunkArray(mappedLeads, BATCH_SIZE);

  for (const batch of batches) {
    const { data, error } = await supabase
      .from('company_crm_leads')
      .insert(batch)
      .select('id');

    if (error) {
      console.error('[leads/import] batch error:', error.message);
      failed += batch.length;
    } else {
      imported += data?.length ?? 0;
    }
  }

  return NextResponse.json({ success: true, total, imported, skipped, failed });
}
