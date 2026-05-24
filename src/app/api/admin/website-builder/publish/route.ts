import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.businessName) return NextResponse.json({ success: false, error: 'businessName required' }, { status: 400 })

  const slug = (body.businessName as string)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50)

  const { data, error } = await supabase
    .from('published_sites')
    .upsert({
      user_id: user.id,
      slug,
      business_name: body.businessName,
      template_id: body.template ?? null,
      sections: body.sections ?? [],
      theme: body.theme ?? {},
      font: body.font ?? {},
      integrations: body.integrations ?? {},
      seo: body.seo ?? {},
      published_at: new Date().toISOString(),
    }, { onConflict: 'slug' })
    .select('slug')
    .single()

  if (error) {
    const uniqueSlug = `${slug}-${Date.now().toString(36)}`
    const { data: d2 } = await supabase
      .from('published_sites')
      .insert({
        user_id: user.id,
        slug: uniqueSlug,
        business_name: body.businessName,
        template_id: body.template ?? null,
        sections: body.sections ?? [],
        theme: body.theme ?? {},
        font: body.font ?? {},
        integrations: body.integrations ?? {},
        seo: body.seo ?? {},
        published_at: new Date().toISOString(),
      })
      .select('slug')
      .single()
    if (d2) return NextResponse.json({ success: true, url: `https://levitatelabs.online/sites/${d2.slug}`, slug: d2.slug })
    return NextResponse.json({ success: false, error: 'Publish failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, url: `https://levitatelabs.online/sites/${data.slug}`, slug: data.slug })
}
