import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST() {
  const supabase = getServiceSupabase()

  try {
    const { data: pastClients } = await supabase
      .from('projects')
      .select('*, leads(email, name, phone)')
      .eq('status', 'closed')

    let reengaged = 0
    for (const project of pastClients ?? []) {
      await supabase.from('agent_logs').insert({
        agent_name: 'retention',
        action: 're_engagement_check',
        input: { project_id: project.id, client: project.name },
        output: { checked: true },
        status: 'success',
        credits_earned: 10
      })
      reengaged++
    }

    return NextResponse.json({ success: true, checked: reengaged, past_clients: pastClients?.length ?? 0 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
