import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// GET — list all intake links
export async function GET() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('intake_links')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// POST — create a new intake link
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, companyWebsite, companyType, companyCity, adminNotes, createdBy } = body;

    const supabase = getServiceSupabase();
    let token = generateToken();

    // Ensure uniqueness (retry on collision — extremely rare)
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase.from('intake_links').select('id').eq('token', token).maybeSingle();
      if (!existing) break;
      token = generateToken();
      attempts++;
    }

    const { data, error } = await supabase
      .from('intake_links')
      .insert({
        token,
        company_name:    companyName?.trim() || null,
        company_website: companyWebsite?.trim() || null,
        company_type:    companyType?.trim() || null,
        company_city:    companyCity?.trim() || null,
        admin_notes:     adminNotes?.trim() || null,
        created_by:      createdBy || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE — remove an intake link
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('intake_links').delete().eq('token', token);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
