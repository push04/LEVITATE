import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import { getServiceSupabase } from '@/lib/supabase'
import { queueBusinessLeadWhatsApp } from '@/lib/whatsapp/queue-business-lead'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production.' }, { status: 403 })
  }

  const { isAuthenticated } = await checkAdminAuth()
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getServiceSupabase()
  
  try {
    const { data: leads, error } = await supabase.from('leads').insert([
      { name: 'TechStart Solutions', email: 'contact@techstart.in', phone: '+919876543210', city: 'Mumbai', service_category: 'IT Services', status: 'New', source: 'google_maps' },
      { name: 'Green Leaf Restaurant', email: 'info@greenleaf.com', phone: '+919876543211', city: 'Delhi', service_category: 'Restaurant', status: 'New', source: 'google_maps' },
      { name: 'Fitness First Gym', email: 'hello@fitnessfirst.co', phone: '+919876543212', city: 'Bangalore', service_category: 'Fitness', status: 'New', source: 'google_maps' }
    ]).select()

    if (error) throw error

    for (const lead of leads ?? []) {
      await queueBusinessLeadWhatsApp(lead)
    }
    
    await supabase.from('agent_logs').insert([
      { agent_name: 'research', action: 'market_research', status: 'success', credits_earned: 9, output: { enriched: 3 } },
      { agent_name: 'outreach', action: 'cold_email', status: 'success', credits_earned: 15, output: { sent: 2 } },
      { agent_name: 'bizdev', action: 'lead_generation', status: 'success', credits_earned: 20, output: { found: 15 } }
    ])
    
    return NextResponse.json({ success: true, message: 'Test data seeded. Check /api/admin/status in 30 seconds.' })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
