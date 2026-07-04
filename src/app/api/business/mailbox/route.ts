import { NextRequest, NextResponse } from 'next/server'
import { businessApiErrorResponse, requireBusinessCompany } from '@/lib/business-intelligence-server'
import { getServiceSupabase } from '@/lib/supabase'
import { resolveCompanyMailboxInfo } from '@/lib/company-email'
import { sendEmail } from '@/lib/email/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  let companyId: string
  let hasBrandedEmail: boolean
  try {
    const { companyId: id, portal } = await requireBusinessCompany('mailbox')
    companyId = id
    hasBrandedEmail = portal.featureAccess.brandedEmail
  } catch (err) {
    return businessApiErrorResponse(err)
  }

  const supabase = getServiceSupabase()

  // Only surface the alias (which drives showing the Compose button) if the
  // plan actually includes brandedEmail — otherwise a Starter customer could
  // fill out a whole message and only find out it's blocked at send time.
  const [mailboxInfo, { data, error }] = await Promise.all([
    hasBrandedEmail ? resolveCompanyMailboxInfo(companyId) : Promise.resolve(null),
    supabase
      .from('company_emails')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  if (error) {
    // company_emails may not exist yet until the migration is applied — degrade
    // to an empty mailbox rather than a broken page.
    return NextResponse.json({ emails: [], alias: mailboxInfo?.alias ?? null })
  }

  return NextResponse.json({ emails: data ?? [], alias: mailboxInfo?.alias ?? null })
}

export async function POST(req: NextRequest) {
  let companyId: string
  try {
    ({ companyId } = await requireBusinessCompany('brandedEmail'))
  } catch (err) {
    return businessApiErrorResponse(err)
  }

  const body = await req.json().catch(() => ({}))
  const to = String(body.to || '').trim()
  const subject = String(body.subject || '').trim()
  const message = String(body.body || '').trim()

  if (!to || !subject || !message) {
    return NextResponse.json({ error: 'to, subject, and body are required' }, { status: 400 })
  }

  const mailboxInfo = await resolveCompanyMailboxInfo(companyId)
  if (!mailboxInfo) {
    return NextResponse.json({ error: 'Business email alias is not set up for this workspace yet' }, { status: 409 })
  }

  const sent = await sendEmail(to, subject, message, {
    fromName: mailboxInfo.companyName ?? undefined,
    fromAddress: mailboxInfo.alias,
    replyTo: mailboxInfo.alias,
  })

  if (!sent) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
  }

  const supabase = getServiceSupabase()
  const { error: logError } = await supabase.from('company_emails').insert({
    company_id: companyId,
    direction: 'outbound',
    from_email: mailboxInfo.alias,
    to_email: to,
    subject,
    body: message,
    status: 'sent',
  })
  if (logError) {
    console.error('[Business Mailbox] Failed to log outbound email:', logError.message)
  }

  return NextResponse.json({ success: true })
}
