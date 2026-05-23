import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST() {
  const supabase = getServiceSupabase()

  try {
    const { data: projects } = await supabase
      .from('projects')
      .select('*, leads(email, name)')
      .eq('status', 'active')

    let chased = 0
    for (const project of projects ?? []) {
      const daysSinceInvoice = project.invoice_date 
        ? Math.floor((Date.now() - new Date(project.invoice_date).getTime()) / 86400000)
        : 0

      if (daysSinceInvoice >= 7 && project.status !== 'paid') {
        chased++
        await supabase.from('agent_logs').insert({
          agent_name: 'invoice',
          action: 'payment_reminder',
          input: { project_id: project.id, project_name: project.name },
          output: { days_since_invoice: daysSinceInvoice },
          status: 'success',
          credits_earned: 5
        })
      }
    }

    return NextResponse.json({ success: true, chased, active_projects: projects?.length ?? 0 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
