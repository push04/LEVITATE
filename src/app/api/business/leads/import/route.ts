import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const BATCH_SIZE = 50;

interface LeadRow extends Record<string, string> {}

interface MappedLead {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  service_category?: string;
  budget?: string;
  notes?: string;
  status: string;
  company_id: string;
  source: string;
  created_at: string;
}

function mapLead(row: LeadRow, company_id: string): MappedLead {
  const name = row['business_name'] || row['name'] || undefined;

  return {
    ...(name !== undefined && { name }),
    ...(row['email'] && { email: row['email'] }),
    ...(row['phone'] && { phone: row['phone'] }),
    ...(row['city'] && { city: row['city'] }),
    ...(row['service_category'] && { service_category: row['service_category'] }),
    ...(row['budget'] && { budget: row['budget'] }),
    ...(row['notes'] && { notes: row['notes'] }),
    status: row['status'] || 'New',
    company_id,
    source: 'csv_import',
    created_at: new Date().toISOString(),
  };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leads, company_id } = body as { leads: LeadRow[]; company_id: string };

    if (!Array.isArray(leads) || !company_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: leads, company_id' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const total = leads.length;
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    const mappedLeads = leads.map((row) => mapLead(row, company_id));

    const withEmail = mappedLeads.filter((l) => l.email);
    const withoutEmail = mappedLeads.filter((l) => !l.email);

    // Process leads with email using upsert (ignore duplicates)
    const withEmailBatches = chunkArray(withEmail, BATCH_SIZE);
    for (const batch of withEmailBatches) {
      const { data, error } = await supabase
        .from('leads')
        .upsert(batch, { onConflict: 'email', ignoreDuplicates: true })
        .select('id');

      if (error) {
        failed += batch.length;
      } else {
        const insertedCount = data?.length ?? 0;
        imported += insertedCount;
        skipped += batch.length - insertedCount;
      }
    }

    // Process leads without email using plain insert
    const withoutEmailBatches = chunkArray(withoutEmail, BATCH_SIZE);
    for (const batch of withoutEmailBatches) {
      const { data, error } = await supabase
        .from('leads')
        .insert(batch)
        .select('id');

      if (error) {
        failed += batch.length;
      } else {
        imported += data?.length ?? 0;
      }
    }

    return NextResponse.json({ success: true, total, imported, skipped, failed });
  } catch (err) {
    console.error('[leads/import] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
